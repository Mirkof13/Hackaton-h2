import { AfterViewInit, Component, ElementRef, OnDestroy, ViewChild } from '@angular/core';
import Konva from 'konva';
import { mat4, vec3 } from 'gl-matrix';

interface Face3D {
  points: vec3[];
  color: string;
  shade: number;
  normal: vec3;
  centroid: vec3;
  isTop: boolean;
  node?: Konva.Line;
}

@Component({
  imports: [],
  selector: 'app-figura',
  styleUrl: './figura.css',
  templateUrl: './figura.html',
})
export class Figura implements AfterViewInit, OnDestroy {
  @ViewChild('canvas', { static: true })
  private readonly canvas!: ElementRef<HTMLDivElement>;

  private stage?: Konva.Stage;
  private layer?: Konva.Layer;
  private groundShadow?: Konva.Ellipse;
  private textShape?: Konva.Shape;
  private resizeObserver?: ResizeObserver;

  // --- dimensiones del borrador (unidades arbitrarias) ---
  private readonly L = 3.4;
  private readonly W = 1.0;
  private readonly H = 0.85;
  private readonly bevelW = 0.22;
  private readonly bevelH = 0.22;
  private readonly split = 0.56 * this.L; // frontera rojo/azul

  private faces: Face3D[] = [];
  private topCorners!: { p0: vec3; p1: vec3; p2: vec3 };

  // --- cámara orbital (esférica alrededor del objeto) ---
  private theta = 0.55;
  private phi = 0.48;
  private radius = 9.5;
  private readonly target = vec3.fromValues(0, 0, this.H * 0.55);
  private readonly up = vec3.fromValues(0, 0, 1);
  private readonly lightDir = vec3.normalize(vec3.create(), vec3.fromValues(0.35, -0.55, 0.82));

  private dragging = false;
  private lastX = 0;
  private lastY = 0;
  private textTransform = { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 };

  ngAfterViewInit(): void {
    this.buildGeometry();
    this.initStage();
    this.render();
  }

  ngOnDestroy(): void {
    this.resizeObserver?.disconnect();
    this.stage?.destroy();
  }

  // ------------------------------------------------------------------
  // Geometría 3D (vértices + normales + iluminación precalculada)
  // ------------------------------------------------------------------
  private buildGeometry(): void {
    const { L, W, H, bevelW, bevelH, split } = this;
    const v = (x: number, y: number, z: number) => vec3.fromValues(x, y, z);
    const interior = v(0, 0, H * 0.4);

    const red = '#d8261f';
    const blue = '#1a63c9';
    const cream = '#f1ead2';
    const sole = '#7a1814';

    const yFront = -W;
    const yBevelBack = -W + bevelW;
    const zBevelTop = H - bevelH;

    const face = (pts: vec3[], color: string): Face3D => {
      const e1 = vec3.subtract(vec3.create(), pts[1], pts[0]);
      const e2 = vec3.subtract(vec3.create(), pts[2], pts[0]);
      const normal = vec3.normalize(vec3.create(), vec3.cross(vec3.create(), e1, e2));
      const centroid = pts.reduce((acc, p) => vec3.add(acc, acc, p), vec3.create());
      vec3.scale(centroid, centroid, 1 / pts.length);
      const outward = vec3.subtract(vec3.create(), centroid, interior);
      let ordered = pts;
      if (vec3.dot(normal, outward) < 0) {
        ordered = [...pts].reverse();
        vec3.scale(normal, normal, -1);
      }
      const lambert = Math.max(vec3.dot(normal, this.lightDir), 0);
      const isTop = ordered.every((p) => Math.abs(p[2] - H) < 1e-6);
      return { points: ordered, color, normal, centroid, shade: 0.42 + 0.58 * lambert, isTop };
    };

    const longFace = (y: number, z0: number, z1: number, cA: string, cB: string): Face3D[] => [
      face([v(-L, y, z0), v(split, y, z0), v(split, y, z1), v(-L, y, z1)], cA),
      face([v(split, y, z0), v(L, y, z0), v(L, y, z1), v(split, y, z1)], cB),
    ];

    // cara frontal (debajo del bisel)
    this.faces.push(...longFace(yFront, 0, zBevelTop, red, blue));
    // bisel (franja crema, sin dividir)
    this.faces.push(face([
      v(-L, yFront, zBevelTop), v(L, yFront, zBevelTop),
      v(L, yBevelBack, H), v(-L, yBevelBack, H),
    ], cream));
    // cara superior
    this.faces.push(face([v(-L, yBevelBack, H), v(split, yBevelBack, H), v(split, W, H), v(-L, W, H)], red));
    this.faces.push(face([v(split, yBevelBack, H), v(L, yBevelBack, H), v(L, W, H), v(split, W, H)], blue));
    // cara trasera (sin bisel)
    this.faces.push(...longFace(W, 0, H, red, blue));
    // base
    this.faces.push(face([v(-L, yFront, 0), v(L, yFront, 0), v(L, W, 0), v(-L, W, 0)], sole));
    // tapas de los extremos (perfil con bisel)
    this.faces.push(face([
      v(-L, yFront, 0), v(-L, yFront, zBevelTop), v(-L, yBevelBack, H), v(-L, W, H), v(-L, W, 0),
    ], red));
    this.faces.push(face([
      v(L, yFront, 0), v(L, W, 0), v(L, W, H), v(L, yBevelBack, H), v(L, yFront, zBevelTop),
    ], blue));

    this.topCorners = {
      p0: v(-L, yBevelBack, H),
      p1: v(L, yBevelBack, H),
      p2: v(-L, W, H),
    };
  }

  // ------------------------------------------------------------------
  // Escena Konva
  // ------------------------------------------------------------------
  private initStage(): void {
    const container = this.canvas.nativeElement;
    container.style.touchAction = 'none';

    const width = Math.min(container.clientWidth || 900, 1000);
    const height = Math.round(width * 0.56);

    this.stage = new Konva.Stage({ container, width, height });
    this.layer = new Konva.Layer();
    this.stage.add(this.layer);

    this.groundShadow = new Konva.Ellipse({
      x: width / 2, y: height * 0.86, radiusX: width * 0.34, radiusY: height * 0.07,
      fill: 'rgba(35, 25, 18, 0.22)',
    });
    this.layer.add(this.groundShadow);

    for (const f of this.faces) {
      f.node = new Konva.Line({
        closed: true,
        strokeWidth: 1,
        stroke: 'rgba(20, 10, 8, 0.18)',
      });
      this.layer.add(f.node);
    }

    this.textShape = new Konva.Shape({
      sceneFunc: (ctx) => {
        const native = (ctx as unknown as { _context: CanvasRenderingContext2D })._context;
        native.save();
        const t = this.textTransform;
        native.transform(t.a, t.b, t.c, t.d, t.e, t.f);
        this.drawTopArtwork(native);
        native.restore();
      },
    });
    this.layer.add(this.textShape);

    this.stage.on('pointerdown', (e) => {
      this.dragging = true;
      this.lastX = e.evt.clientX;
      this.lastY = e.evt.clientY;
    });
    this.stage.on('pointermove', (e) => {
      if (!this.dragging) return;
      const dx = e.evt.clientX - this.lastX;
      const dy = e.evt.clientY - this.lastY;
      this.lastX = e.evt.clientX;
      this.lastY = e.evt.clientY;
      this.theta += dx * 0.008;
      this.phi = Math.min(1.25, Math.max(0.12, this.phi - dy * 0.008));
      this.render();
    });
    this.stage.on('pointerup pointerleave pointercancel', () => (this.dragging = false));

    container.addEventListener(
      'wheel',
      (e) => {
        e.preventDefault();
        this.radius = Math.min(15, Math.max(5.5, this.radius + e.deltaY * 0.01));
        this.render();
      },
      { passive: false },
    );

    this.resizeObserver = new ResizeObserver(() => {
      const w = Math.min(container.clientWidth || 900, 1000);
      const h = Math.round(w * 0.56);
      this.stage?.size({ width: w, height: h });
      this.groundShadow?.setAttrs({ x: w / 2, y: h * 0.86, radiusX: w * 0.34, radiusY: h * 0.07 });
      this.render();
    });
    this.resizeObserver.observe(container);
  }

  // ------------------------------------------------------------------
  // Pipeline de render: modelo -> vista -> proyección -> pantalla
  // ------------------------------------------------------------------
  private render(): void {
    if (!this.stage) return;
    const width = this.stage.width();
    const height = this.stage.height();

    const eye = vec3.fromValues(
      this.target[0] + this.radius * Math.cos(this.phi) * Math.sin(this.theta),
      this.target[1] - this.radius * Math.cos(this.phi) * Math.cos(this.theta),
      this.target[2] + this.radius * Math.sin(this.phi),
    );

    const view = mat4.lookAt(mat4.create(), eye, this.target, this.up);
    const proj = mat4.perspective(mat4.create(), (32 * Math.PI) / 180, width / height, 1, 30);
    const vp = mat4.multiply(mat4.create(), proj, view);

    const project = (p: vec3) => {
      const out = vec3.create();
      vec3.transformMat4(out, p, vp); // gl-matrix ya hace la división de perspectiva
      return { x: (out[0] * 0.5 + 0.5) * width, y: (1 - (out[1] * 0.5 + 0.5)) * height };
    };

    let topVisible = false;
    for (const f of this.faces) {
      const toEye = vec3.normalize(vec3.create(), vec3.subtract(vec3.create(), eye, f.centroid));
      const visible = vec3.dot(f.normal, toEye) > 0.02; // back-face culling (objeto convexo)
      f.node!.visible(visible);
      if (!visible) continue;
      if (f.isTop) topVisible = true;

      const pts: number[] = [];
      for (const p of f.points) {
        const s = project(p);
        pts.push(s.x, s.y);
      }
      f.node!.points(pts);
      f.node!.fill(this.shadeColor(f.color, f.shade));
    }

    const { p0, p1, p2 } = this.topCorners;
    const s0 = project(p0), s1 = project(p1), s2 = project(p2);
    const dx = p1[0] - p0[0];
    const dy = p2[1] - p0[1];
    const a = (s1.x - s0.x) / dx;
    const b = (s1.y - s0.y) / dx;
    const c = (s2.x - s0.x) / dy;
    const d = (s2.y - s0.y) / dy;
    this.textTransform = {
      a, b, c, d,
      e: s0.x - a * p0[0] - c * p0[1],
      f: s0.y - b * p0[0] - d * p0[1],
    };
    this.textShape?.visible(topVisible);

    this.layer?.batchDraw();
  }

  private drawTopArtwork(ctx: CanvasRenderingContext2D): void {
    const { L, W, bevelW, split } = this;
    const midY = (-W + bevelW + W) / 2;

    ctx.fillStyle = '#241413';
    ctx.textBaseline = 'middle';
    ctx.font = 'italic 700 0.62px Georgia, serif';
    ctx.save();
    ctx.translate(-L * 0.32, midY - 0.28);
    ctx.rotate(-0.03);
    ctx.fillText('Pelikan', 0, 0);
    ctx.restore();

    ctx.font = '700 0.5px Arial, sans-serif';
    ctx.save();
    ctx.translate(-L * 0.05, midY + 0.32);
    ctx.rotate(-0.02);
    ctx.fillText('B R  4 0', 0, 0);
    ctx.restore();

    const icon = (cx: number, color: string) => {
      ctx.save();
      ctx.translate(cx, midY);
      ctx.rotate(-0.12);
      ctx.strokeStyle = color;
      ctx.lineWidth = 0.045;
      ctx.beginPath();
      ctx.rect(-0.26, -0.22, 0.52, 0.44);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(-0.14, 0.16);
      ctx.lineTo(-0.14, -0.1);
      ctx.lineTo(0.14, -0.1);
      ctx.lineTo(0.14, 0.16);
      ctx.stroke();
      ctx.restore();
    };
    icon(-L * 0.78, '#241413');
    icon(split + 0.42, '#0d2748');
  }

  private shadeColor(hex: string, factor: number): string {
    const n = parseInt(hex.replace('#', ''), 16);
    const r = Math.min(255, Math.round(((n >> 16) & 255) * factor));
    const g = Math.min(255, Math.round(((n >> 8) & 255) * factor));
    const b = Math.min(255, Math.round((n & 255) * factor));
    return `rgb(${r}, ${g}, ${b})`;
  }
}