import { Component, computed, inject } from '@angular/core';
import { mat4, vec3 } from 'gl-matrix';
import type { Context } from 'konva/lib/Context';
import type { ShapeConfig } from 'konva/lib/Shape';
import type { StageConfig } from 'konva/lib/Stage';
import { CoreShapeComponent, StageComponent } from 'ng2-konva';
import { Controles } from '../controles/controles';
import { TransformService } from '../transform.service';

const STAGE_WIDTH = 640;
const STAGE_HEIGHT = 440;

type Punto3D = readonly [number, number, number];
interface CaraMalla {
  readonly puntos: readonly Punto3D[];
  readonly color: string;
}

/** Las 6 caras (quads) de una caja rectangular, en coordenadas locales. */
function caraCaja(
  xmin: number,
  xmax: number,
  ymin: number,
  ymax: number,
  zmin: number,
  zmax: number,
  color: string,
): CaraMalla[] {
  const p000: Punto3D = [xmin, ymin, zmin];
  const p100: Punto3D = [xmax, ymin, zmin];
  const p110: Punto3D = [xmax, ymax, zmin];
  const p010: Punto3D = [xmin, ymax, zmin];
  const p001: Punto3D = [xmin, ymin, zmax];
  const p101: Punto3D = [xmax, ymin, zmax];
  const p111: Punto3D = [xmax, ymax, zmax];
  const p011: Punto3D = [xmin, ymax, zmax];
  return [
    { puntos: [p000, p100, p110, p010], color }, // inferior
    { puntos: [p001, p101, p111, p011], color }, // superior
    { puntos: [p000, p100, p101, p001], color }, // frente
    { puntos: [p010, p110, p111, p011], color }, // atrás
    { puntos: [p000, p010, p011, p001], color }, // izquierda
    { puntos: [p100, p110, p111, p101], color }, // derecha
  ];
}

// Modelo 3D de la goma Pelikan BR40: tres bloques (rojo, franja crema, azul)
// con vértices reales, igual que la foto de referencia.
const ANCHO = 35;
const ALTO = 13;
const MALLA: readonly CaraMalla[] = [
  ...caraCaja(-110, -6, -ANCHO, ANCHO, -ALTO, ALTO, '#cc4630'),
  ...caraCaja(-6, 6, -ANCHO, ANCHO, -ALTO, ALTO, '#ecdfc0'),
  ...caraCaja(6, 110, -ANCHO, ANCHO, -ALTO, ALTO, '#33538e'),
];

// Cámara y proyección en perspectiva (fijas): son las que convierten el
// mundo 3D en píxeles del canvas 2D. La única matriz que el usuario
// controla es la del objeto (ver TransformService).
const VISTA = mat4.lookAt(mat4.create(), [0, 0, 420], [0, 0, 0], [0, 1, 0]);
const PROYECCION = mat4.perspective(
  mat4.create(),
  (45 * Math.PI) / 180,
  STAGE_WIDTH / STAGE_HEIGHT,
  10,
  2000,
);
const VISTA_PROYECCION = mat4.multiply(mat4.create(), PROYECCION, VISTA);

interface CaraProyectada {
  readonly pantalla: readonly (readonly [number, number])[];
  readonly profundidad: number;
  readonly color: string;
}

@Component({
  imports: [StageComponent, CoreShapeComponent, Controles],
  selector: 'app-figura',
  styleUrl: './figura.css',
  templateUrl: './figura.html',
})
export class Figura {
  protected readonly transform = inject(TransformService);

  protected readonly configStage: Partial<StageConfig> = {
    width: STAGE_WIDTH,
    height: STAGE_HEIGHT,
  };

  protected readonly configEjes: ShapeConfig = {
    listening: false,
    sceneFunc: (ctx: Context) => {
      ctx.save();
      ctx.strokeStyle = '#c9c2d9';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, STAGE_HEIGHT / 2);
      ctx.lineTo(STAGE_WIDTH, STAGE_HEIGHT / 2);
      ctx.moveTo(STAGE_WIDTH / 2, 0);
      ctx.lineTo(STAGE_WIDTH / 2, STAGE_HEIGHT);
      ctx.stroke();
      ctx.restore();
    },
  };

  /** Proyecta cada vértice de la malla 3D con la matriz de modelo actual. */
  private proyectarCaras(): CaraProyectada[] {
    const modelo = this.transform.matrix4();
    const matrizFinal = mat4.multiply(mat4.create(), VISTA_PROYECCION, modelo);

    return MALLA.map((cara) => {
      const pantalla = cara.puntos.map((punto) => {
        const ndc = vec3.create();
        vec3.transformMat4(ndc, punto as unknown as vec3, matrizFinal);
        const x = (ndc[0] * 0.5 + 0.5) * STAGE_WIDTH;
        const y = (1 - (ndc[1] * 0.5 + 0.5)) * STAGE_HEIGHT;
        return { x, y, z: ndc[2] };
      });
      const profundidad = pantalla.reduce((acc, p) => acc + p.z, 0) / pantalla.length;
      return {
        pantalla: pantalla.map((p) => [p.x, p.y] as const),
        profundidad,
        color: cara.color,
      };
    });
  }

  protected readonly configFigura = computed<ShapeConfig>(() => {
    // Se lee la señal para que este computed se recalcule con cada cambio.
    this.transform.matrix4();
    const caras = this.proyectarCaras().sort((a, b) => b.profundidad - a.profundidad);

    return {
      listening: false,
      sceneFunc: (ctx: Context) => {
        ctx.save();
        for (const cara of caras) {
          ctx.beginPath();
          const [primero, ...resto] = cara.pantalla;
          ctx.moveTo(primero[0], primero[1]);
          for (const [x, y] of resto) {
            ctx.lineTo(x, y);
          }
          ctx.closePath();
          ctx.fillStyle = cara.color;
          ctx.fill();
          ctx.strokeStyle = 'rgba(20, 20, 30, 0.35)';
          ctx.lineWidth = 1;
          ctx.stroke();
        }
        ctx.restore();
      },
    };
  });
}
