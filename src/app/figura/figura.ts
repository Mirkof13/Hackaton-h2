/**
 * PROYECTO: Modelo 3D y Transformaciones Matriciales Afines
 * EQUIPO DE TRABAJO:
 * - Yuri Jesús: Modelado 3D (geometría poligonal, vértices, aristas e hilos)
 * - Mirkof Guzmán: Movimiento y Transformaciones (traslación, rotación, escala)
 * - Diego Paredes: Reflejos (reflejo especular en suelo, matrices de reflexión)
 * - Maide Aviza: Sombras y Matrices (matriz 4x4, sombreado Lambert/Phong, sombra proyectada)
 */

import { Component, computed, inject, effect, OnDestroy } from '@angular/core';
import { mat4, vec3, mat3 } from 'gl-matrix';
import type { Context } from 'konva/lib/Context';
import type { ShapeConfig } from 'konva/lib/Shape';
import type { StageConfig } from 'konva/lib/Stage';
import { CoreShapeComponent, StageComponent } from 'ng2-konva';
import { Controles } from '../controles/controles';
import { TransformService } from '../transform.service';

const STAGE_WIDTH = 680;
const STAGE_HEIGHT = 460;
const FLOOR_Y = -85; // Altura del plano suelo para reflejo y sombra

export type Punto3D = readonly [number, number, number];

export interface Cara3D {
  readonly puntos: readonly Punto3D[];
  readonly normal: Punto3D;
  readonly colorBase: string;
  readonly tipoCara?: 'superior_roja' | 'superior_azul' | 'otra';
}

// ---------------------------------------------------------------------------
// 1. MODELADO 3D (Responsable: Yuri Jesús)
// ---------------------------------------------------------------------------

function calcularNormalCara(p0: Punto3D, p1: Punto3D, p2: Punto3D): Punto3D {
  const v1 = vec3.fromValues(p1[0] - p0[0], p1[1] - p0[1], p1[2] - p0[2]);
  const v2 = vec3.fromValues(p2[0] - p0[0], p2[1] - p0[1], p2[2] - p0[2]);
  const n = vec3.create();
  vec3.cross(n, v1, v2);
  vec3.normalize(n, n);
  return [n[0], n[1], n[2]];
}

function crearBloqueBiselado(
  xIzqInf: number,
  xIzqSup: number,
  xDerInf: number,
  xDerSup: number,
  yMin: number,
  yMax: number,
  zMin: number,
  zMax: number,
  color: string,
  tipoSuperior?: 'superior_roja' | 'superior_azul'
): Cara3D[] {
  // 8 vértices del poliedro en coordenadas locales 3D
  const p000: Punto3D = [xIzqInf, yMin, zMin]; // 0: Izq-Inf-Frente
  const p100: Punto3D = [xDerInf, yMin, zMin]; // 1: Der-Inf-Frente
  const p101: Punto3D = [xDerInf, yMin, zMax]; // 2: Der-Inf-Atrás
  const p001: Punto3D = [xIzqInf, yMin, zMax]; // 3: Izq-Inf-Atrás

  const p010: Punto3D = [xIzqSup, yMax, zMin]; // 4: Izq-Sup-Frente
  const p110: Punto3D = [xDerSup, yMax, zMin]; // 5: Der-Sup-Frente
  const p111: Punto3D = [xDerSup, yMax, zMax]; // 6: Der-Sup-Atrás
  const p011: Punto3D = [xIzqSup, yMax, zMax]; // 7: Izq-Sup-Atrás

  const carasDef: { puntos: Punto3D[]; color: string; tipo?: 'superior_roja' | 'superior_azul' }[] = [
    // Cara Inferior (-Y)
    { puntos: [p000, p001, p101, p100], color },
    // Cara Superior (+Y)
    { puntos: [p010, p110, p111, p011], color, tipo: tipoSuperior },
    // Cara Frontal (-Z)
    { puntos: [p000, p100, p110, p010], color },
    // Cara Posterior (+Z)
    { puntos: [p101, p001, p011, p111], color },
    // Extremo Izquierdo (Cuña roja)
    { puntos: [p001, p000, p010, p011], color },
    // Extremo Derecho (Cuña azul)
    { puntos: [p100, p101, p111, p110], color },
  ];

  return carasDef.map((c) => ({
    puntos: c.puntos,
    normal: calcularNormalCara(c.puntos[0], c.puntos[1], c.puntos[2]),
    colorBase: c.color,
    tipoCara: c.tipo || 'otra',
  }));
}

function construirMallaPelikan(): Cara3D[] {
  // Proporciones fieles de la goma Pelikan BR40
  const SLANT = 15; // Inclinación en cuña en los extremos
  const X_IZQ_BASE = -115;
  const X_DIV = 22; // Divisoria: 65% rojo (lápiz) y 35% azul (tinta)
  const X_DER_BASE = 95;

  const Y_INF = -14;
  const Y_FRANJA_INF = -2.5;
  const Y_FRANJA_SUP = 2.5;
  const Y_SUP = 14;

  const Z_MIN = -34;
  const Z_MAX = 34;

  const ROJO = '#d93829';
  const CREMA = '#f6eedb';
  const AZUL = '#28539e';

  const xIzq = (y: number) => X_IZQ_BASE + ((y - Y_INF) / (Y_SUP - Y_INF)) * SLANT;
  const xDer = (y: number) => X_DER_BASE + ((y - Y_INF) / (Y_SUP - Y_INF)) * SLANT;

  return [
    // Capa Inferior Roja
    ...crearBloqueBiselado(
      xIzq(Y_INF), xIzq(Y_FRANJA_INF),
      X_DIV, X_DIV,
      Y_INF, Y_FRANJA_INF,
      Z_MIN, Z_MAX,
      ROJO
    ),
    // Capa Inferior Azul
    ...crearBloqueBiselado(
      X_DIV, X_DIV,
      xDer(Y_INF), xDer(Y_FRANJA_INF),
      Y_INF, Y_FRANJA_INF,
      Z_MIN, Z_MAX,
      AZUL
    ),
    // Faja Central Crema (Lado Rojo)
    ...crearBloqueBiselado(
      xIzq(Y_FRANJA_INF), xIzq(Y_FRANJA_SUP),
      X_DIV, X_DIV,
      Y_FRANJA_INF, Y_FRANJA_SUP,
      Z_MIN, Z_MAX,
      CREMA
    ),
    // Faja Central Crema (Lado Azul)
    ...crearBloqueBiselado(
      X_DIV, X_DIV,
      xDer(Y_FRANJA_INF), xDer(Y_FRANJA_SUP),
      Y_FRANJA_INF, Y_FRANJA_SUP,
      Z_MIN, Z_MAX,
      CREMA
    ),
    // Capa Superior Roja (con serigrafía Pelikan y lápiz)
    ...crearBloqueBiselado(
      xIzq(Y_FRANJA_SUP), xIzq(Y_SUP),
      X_DIV, X_DIV,
      Y_FRANJA_SUP, Y_SUP,
      Z_MIN, Z_MAX,
      ROJO,
      'superior_roja'
    ),
    // Capa Superior Azul (con icono de pluma estilográfica)
    ...crearBloqueBiselado(
      X_DIV, X_DIV,
      xDer(Y_FRANJA_SUP), xDer(Y_SUP),
      Y_FRANJA_SUP, Y_SUP,
      Z_MIN, Z_MAX,
      AZUL,
      'superior_azul'
    ),
  ];
}

const MALLA_PELIKAN = construirMallaPelikan();

// Extracción de vértices únicos (para visualización de Vértices)
function obtenerVerticesUnicos(malla: Cara3D[]): Punto3D[] {
  const mapa = new Map<string, Punto3D>();
  for (const c of malla) {
    for (const p of c.puntos) {
      const k = `${p[0].toFixed(1)}_${p[1].toFixed(1)}_${p[2].toFixed(1)}`;
      if (!mapa.has(k)) mapa.set(k, p);
    }
  }
  return Array.from(mapa.values());
}

const VERTICES_UNICOS = obtenerVerticesUnicos(MALLA_PELIKAN);

// Extracción de aristas únicas (para visualización de Hilos)
function obtenerAristasUnicas(malla: Cara3D[]): [Punto3D, Punto3D][] {
  const mapa = new Map<string, [Punto3D, Punto3D]>();
  for (const c of malla) {
    for (let i = 0; i < c.puntos.length; i++) {
      const pA = c.puntos[i];
      const pB = c.puntos[(i + 1) % c.puntos.length];
      const kA = `${pA[0].toFixed(1)},${pA[1].toFixed(1)},${pA[2].toFixed(1)}`;
      const kB = `${pB[0].toFixed(1)},${pB[1].toFixed(1)},${pB[2].toFixed(1)}`;
      const key = kA < kB ? `${kA}|${kB}` : `${kB}|${kA}`;
      if (!mapa.has(key)) mapa.set(key, [pA, pB]);
    }
  }
  return Array.from(mapa.values());
}

const ARISTAS_UNICAS = obtenerAristasUnicas(MALLA_PELIKAN);

// ---------------------------------------------------------------------------
// 2. MATRICES, CÁMARA Y PERSPECTIVA (Responsable: Maide Aviza)
// ---------------------------------------------------------------------------
const VISTA = mat4.lookAt(mat4.create(), [0, 45, 430], [0, 0, 0], [0, 1, 0]);
const PROYECCION = mat4.perspective(
  mat4.create(),
  (42 * Math.PI) / 180,
  STAGE_WIDTH / STAGE_HEIGHT,
  10,
  2000
);
const VISTA_PROYECCION = mat4.multiply(mat4.create(), PROYECCION, VISTA);

// Vector de luz direccional en el espacio de mundo
const LUZ_DIR = vec3.fromValues(0.4, 0.85, 0.55);
vec3.normalize(LUZ_DIR, LUZ_DIR);

interface CaraProyectada {
  readonly pantalla: readonly [number, number][];
  readonly profundidad: number;
  readonly colorFinal: string;
  readonly normalMundo: Punto3D;
  readonly tipoCara: 'superior_roja' | 'superior_azul' | 'otra';
  readonly puntosMundo: Punto3D[];
  readonly puntosOriginales: readonly Punto3D[];
}

@Component({
  imports: [StageComponent, CoreShapeComponent, Controles],
  selector: 'app-figura',
  styleUrl: './figura.css',
  templateUrl: './figura.html',
})
export class Figura implements OnDestroy {
  protected readonly transform = inject(TransformService);
  private animFrameId: number | null = null;

  protected readonly configStage: Partial<StageConfig> = {
    width: STAGE_WIDTH,
    height: STAGE_HEIGHT,
  };

  constructor() {
    effect(() => {
      if (this.transform.autoRotate()) {
        this.iniciarAutoRotacion();
      } else {
        this.detenerAutoRotacion();
      }
    });
  }

  ngOnDestroy(): void {
    this.detenerAutoRotacion();
  }

  private iniciarAutoRotacion(): void {
    this.detenerAutoRotacion();
    const bucle = () => {
      if (!this.transform.autoRotate()) return;
      this.transform.rotationYDeg.update((v) => (v + 0.8) % 360);
      this.transform.rotationXDeg.update((v) => (v + 0.25) % 360);
      this.animFrameId = requestAnimationFrame(bucle);
    };
    this.animFrameId = requestAnimationFrame(bucle);
  }

  private detenerAutoRotacion(): void {
    if (this.animFrameId !== null) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }
  }

  // -------------------------------------------------------------------------
  // 3. ILUMINACIÓN Y SOMBREADO LAMBERT/PHONG (Responsable: Maide Aviza)
  // -------------------------------------------------------------------------
  private calcularSombreado(colorHex: string, normalMundo: vec3): string {
    const dot = Math.max(0, vec3.dot(normalMundo, LUZ_DIR));
    // Factor de iluminación: 55% ambiente + 45% difusión para mantener colores vivos y nítidos
    const factorLuz = Math.min(1.25, Math.max(0.35, 0.55 + 0.45 * dot));

    const r = parseInt(colorHex.slice(1, 3), 16);
    const g = parseInt(colorHex.slice(3, 5), 16);
    const b = parseInt(colorHex.slice(5, 7), 16);

    const rFinal = Math.min(255, Math.round(r * factorLuz));
    const gFinal = Math.min(255, Math.round(g * factorLuz));
    const bFinal = Math.min(255, Math.round(b * factorLuz));

    return `rgb(${rFinal}, ${gFinal}, ${bFinal})`;
  }

  private proyectarCaras(matrizModelo: mat4): CaraProyectada[] {
    const matrizFinal = mat4.multiply(mat4.create(), VISTA_PROYECCION, matrizModelo);

    const matrizNormal = mat3.create();
    mat3.fromMat4(matrizNormal, matrizModelo);
    mat3.invert(matrizNormal, matrizNormal);
    mat3.transpose(matrizNormal, matrizNormal);

    return MALLA_PELIKAN.map((cara) => {
      const nLocal = vec3.fromValues(...cara.normal);
      const nMundo = vec3.create();
      vec3.transformMat3(nMundo, nLocal, matrizNormal);
      vec3.normalize(nMundo, nMundo);

      const puntosPantalla: [number, number][] = [];
      const puntosMundo: Punto3D[] = [];
      let sumaZ = 0;

      for (const p of cara.puntos) {
        const pVec = vec3.fromValues(...p);
        const pM = vec3.create();
        vec3.transformMat4(pM, pVec, matrizModelo);
        puntosMundo.push([pM[0], pM[1], pM[2]]);

        const ndc = vec3.create();
        vec3.transformMat4(ndc, pVec, matrizFinal);
        const x = (ndc[0] * 0.5 + 0.5) * STAGE_WIDTH;
        const y = (1 - (ndc[1] * 0.5 + 0.5)) * STAGE_HEIGHT;
        puntosPantalla.push([x, y]);
        sumaZ += ndc[2];
      }

      const profundidad = sumaZ / cara.puntos.length;
      const colorFinal = this.calcularSombreado(cara.colorBase, nMundo);

      return {
        pantalla: puntosPantalla,
        profundidad,
        colorFinal,
        normalMundo: [nMundo[0], nMundo[1], nMundo[2]],
        tipoCara: cara.tipoCara || 'otra',
        puntosMundo,
        puntosOriginales: cara.puntos,
      };
    });
  }

  private proyectarPuntoMundo(p: Punto3D): [number, number] {
    const ndc = vec3.create();
    vec3.transformMat4(ndc, p as unknown as vec3, VISTA_PROYECCION);
    return [
      (ndc[0] * 0.5 + 0.5) * STAGE_WIDTH,
      (1 - (ndc[1] * 0.5 + 0.5)) * STAGE_HEIGHT,
    ];
  }

  // -------------------------------------------------------------------------
  // CUADRÍCULA Y EJES CARTESIANOS 3D
  // -------------------------------------------------------------------------
  protected readonly configEjes = computed<ShapeConfig>(() => {
    this.transform.showAxes();

    return {
      listening: false,
      sceneFunc: (ctx: Context) => {
        ctx.save();

        // 1. Cuadrícula Suelo en Y = FLOOR_Y
        ctx.strokeStyle = '#e2e8f0';
        ctx.lineWidth = 1;
        const GRID = 260;
        const STEP = 52;
        for (let x = -GRID; x <= GRID; x += STEP) {
          const p1 = this.proyectarPuntoMundo([x, FLOOR_Y, -GRID]);
          const p2 = this.proyectarPuntoMundo([x, FLOOR_Y, GRID]);
          ctx.beginPath();
          ctx.moveTo(p1[0], p1[1]);
          ctx.lineTo(p2[0], p2[1]);
          ctx.stroke();
        }
        for (let z = -GRID; z <= GRID; z += STEP) {
          const p1 = this.proyectarPuntoMundo([-GRID, FLOOR_Y, z]);
          const p2 = this.proyectarPuntoMundo([GRID, FLOOR_Y, z]);
          ctx.beginPath();
          ctx.moveTo(p1[0], p1[1]);
          ctx.lineTo(p2[0], p2[1]);
          ctx.stroke();
        }

        // 2. Ejes 3D en el origen
        if (this.transform.showAxes()) {
          const origen = this.proyectarPuntoMundo([0, 0, 0]);
          const ejeX = this.proyectarPuntoMundo([160, 0, 0]);
          const ejeY = this.proyectarPuntoMundo([0, 140, 0]);
          const ejeZ = this.proyectarPuntoMundo([0, 0, 160]);

          // Eje X (Rojo)
          ctx.strokeStyle = '#dc2626';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(origen[0], origen[1]);
          ctx.lineTo(ejeX[0], ejeX[1]);
          ctx.stroke();
          ctx.fillStyle = '#dc2626';
          ctx.font = 'bold 11px sans-serif';
          ctx.fillText('+X (Ancho)', ejeX[0] + 6, ejeX[1] + 4);

          // Eje Y (Verde)
          ctx.strokeStyle = '#16a34a';
          ctx.beginPath();
          ctx.moveTo(origen[0], origen[1]);
          ctx.lineTo(ejeY[0], ejeY[1]);
          ctx.stroke();
          ctx.fillStyle = '#16a34a';
          ctx.fillText('+Y (Alto)', ejeY[0] - 15, ejeY[1] - 6);

          // Eje Z (Azul)
          ctx.strokeStyle = '#2563eb';
          ctx.beginPath();
          ctx.moveTo(origen[0], origen[1]);
          ctx.lineTo(ejeZ[0], ejeZ[1]);
          ctx.stroke();
          ctx.fillStyle = '#2563eb';
          ctx.fillText('+Z (Profundidad)', ejeZ[0] + 6, ejeZ[1] + 6);
        }

        ctx.restore();
      },
    };
  });

  // -------------------------------------------------------------------------
  // 4. RENDERIZADO DEL MODELO 3D Y REFLEJOS (Responsables: Yuri, Diego, Maide)
  // -------------------------------------------------------------------------
  protected readonly configFigura = computed<ShapeConfig>(() => {
    const modelo = this.transform.matrix4();
    const matrizFinal = mat4.multiply(mat4.create(), VISTA_PROYECCION, modelo);

    // Caras ordenadas por profundidad (Algoritmo del Pintor)
    const carasPrincipales = this.proyectarCaras(modelo)
      .sort((a, b) => b.profundidad - a.profundidad);

    // 4.1 REFLEJO ESPECULAR EN SUELO (Responsable: Diego Paredes)
    let carasReflejo: CaraProyectada[] = [];
    if (this.transform.showFloorReflection()) {
      const matrizReflejo = mat4.create();
      mat4.translate(matrizReflejo, matrizReflejo, [0, FLOOR_Y, 0]);
      mat4.scale(matrizReflejo, matrizReflejo, [1, -1, 1]);
      mat4.translate(matrizReflejo, matrizReflejo, [0, -FLOOR_Y, 0]);
      mat4.multiply(matrizReflejo, matrizReflejo, modelo);

      carasReflejo = this.proyectarCaras(matrizReflejo)
        .sort((a, b) => b.profundidad - a.profundidad);
    }

    // 4.2 HILOS Y VÉRTICES (Responsable: Yuri Jesús)
    const showHilos = this.transform.showWireframe();
    const showVertices = this.transform.showVertices();

    const verticesPantalla = VERTICES_UNICOS.map((v) => {
      const ndc = vec3.create();
      vec3.transformMat4(ndc, v as unknown as vec3, matrizFinal);
      return {
        x: (ndc[0] * 0.5 + 0.5) * STAGE_WIDTH,
        y: (1 - (ndc[1] * 0.5 + 0.5)) * STAGE_HEIGHT,
        z: ndc[2],
      };
    });

    const aristasPantalla = ARISTAS_UNICAS.map(([vA, vB]) => {
      const ndcA = vec3.create();
      const ndcB = vec3.create();
      vec3.transformMat4(ndcA, vA as unknown as vec3, matrizFinal);
      vec3.transformMat4(ndcB, vB as unknown as vec3, matrizFinal);
      return {
        p1: [
          (ndcA[0] * 0.5 + 0.5) * STAGE_WIDTH,
          (1 - (ndcA[1] * 0.5 + 0.5)) * STAGE_HEIGHT,
        ] as [number, number],
        p2: [
          (ndcB[0] * 0.5 + 0.5) * STAGE_WIDTH,
          (1 - (ndcB[1] * 0.5 + 0.5)) * STAGE_HEIGHT,
        ] as [number, number],
      };
    });

    return {
      listening: false,
      sceneFunc: (ctx: Context) => {
        ctx.save();

        // -------------------------------------------------------------------
        // A. SOMBRA DINÁMICA DE CONTACTO EN EL SUELO (Responsable: Maide Aviza)
        // -------------------------------------------------------------------
        if (this.transform.showShadow()) {
          const escala = Math.abs(this.transform.scale());
          const posX = this.transform.tx();
          const posZ = this.transform.tz();
          const posY = this.transform.ty();

          const centroSombra = this.proyectarPuntoMundo([posX, FLOOR_Y + 1, posZ]);
          // La sombra se atenúa y expande conforme el objeto sube en el eje Y
          const factorAltura = Math.max(0.3, Math.min(1.5, 1 - (posY / 300)));
          const radioX = Math.max(20, 115 * escala * factorAltura);
          const radioY = Math.max(8, 40 * escala * factorAltura);

          ctx.save();
          ctx.beginPath();
          ctx.ellipse(centroSombra[0], centroSombra[1], radioX, radioY, 0, 0, Math.PI * 2);
          const grad = ctx.createRadialGradient(
            centroSombra[0], centroSombra[1], 0,
            centroSombra[0], centroSombra[1], radioX
          );
          grad.addColorStop(0, 'rgba(15, 23, 42, 0.40)');
          grad.addColorStop(0.5, 'rgba(30, 41, 59, 0.18)');
          grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
          ctx.fillStyle = grad;
          ctx.fill();
          ctx.restore();
        }

        // -------------------------------------------------------------------
        // B. REFLEJO 3D EN EL SUELO (Responsable: Diego Paredes)
        // -------------------------------------------------------------------
        if (this.transform.showFloorReflection() && carasReflejo.length > 0) {
          ctx.save();
          ctx.globalAlpha = 0.28;
          for (const c of carasReflejo) {
            ctx.beginPath();
            const [p0, ...resto] = c.pantalla;
            ctx.moveTo(p0[0], p0[1]);
            for (const [x, y] of resto) {
              ctx.lineTo(x, y);
            }
            ctx.closePath();
            ctx.fillStyle = c.colorFinal;
            ctx.fill();
          }
          ctx.restore();
        }

        // -------------------------------------------------------------------
        // C. CUERPO SÓLIDO 3D DE LA GOMA (Responsables: Yuri Jesús, Maide Aviza)
        // -------------------------------------------------------------------
        for (const c of carasPrincipales) {
          ctx.beginPath();
          const [p0, ...resto] = c.pantalla;
          ctx.moveTo(p0[0], p0[1]);
          for (const [x, y] of resto) {
            ctx.lineTo(x, y);
          }
          ctx.closePath();
          ctx.fillStyle = c.colorFinal;
          ctx.fill();
          ctx.strokeStyle = 'rgba(15, 23, 42, 0.35)';
          ctx.lineWidth = 1;
          ctx.stroke();

          // -----------------------------------------------------------------
          // D. SERIGRAFÍA Y LETRAS 100% PEGADAS A LA GOMA (Mapeo Paramétrico)
          // -----------------------------------------------------------------
          // Solo se dibuja si la cara es superior y la normal apunta hacia la cámara
          if ((c.tipoCara === 'superior_roja' || c.tipoCara === 'superior_azul') && c.normalMundo[1] > -0.05) {
            this.dibujarSerigrafia3D(ctx, c, matrizFinal);
          }
        }

        // -------------------------------------------------------------------
        // E. MODO HILOS (Aristas 3D / Wireframe) (Responsable: Yuri Jesús)
        // -------------------------------------------------------------------
        if (showHilos) {
          ctx.save();
          ctx.strokeStyle = '#06b6d4';
          ctx.lineWidth = 1.3;
          ctx.globalAlpha = 0.85;
          for (const a of aristasPantalla) {
            ctx.beginPath();
            ctx.moveTo(a.p1[0], a.p1[1]);
            ctx.lineTo(a.p2[0], a.p2[1]);
            ctx.stroke();
          }
          ctx.restore();
        }

        // -------------------------------------------------------------------
        // F. MODO VÉRTICES (Nodos 3D) (Responsable: Yuri Jesús)
        // -------------------------------------------------------------------
        if (showVertices) {
          ctx.save();
          for (const v of verticesPantalla) {
            ctx.beginPath();
            ctx.arc(v.x, v.y, 3.2, 0, Math.PI * 2);
            ctx.fillStyle = '#eab308';
            ctx.fill();
            ctx.strokeStyle = '#1e293b';
            ctx.lineWidth = 0.8;
            ctx.stroke();
          }
          ctx.restore();
        }

        ctx.restore();
      },
    };
  });

  /**
   * DIBUJO DE SERIGRAFÍA Y MARCA PELIKAN BR 40 MEDIANTE PROYECCIÓN 3D EXACTA
   * Cada trazo, texto e icono se proyecta mediante la matriz de transformación
   * garantizando que esté 100% pegado a la superficie al rotar, escalar o reflejar.
   */
  private dibujarSerigrafia3D(
    ctx: Context,
    cara: CaraProyectada,
    matrizFinal: mat4
  ): void {
    ctx.save();
    ctx.fillStyle = '#18181b';
    ctx.strokeStyle = '#18181b';
    ctx.lineWidth = 1.5;

    // Función de proyección para cualquier coordenada (X, Z) en la superficie superior Y = 14.05
    const proyectarUV = (x: number, z: number): [number, number] => {
      const p = vec3.fromValues(x, 14.1, z);
      const ndc = vec3.create();
      vec3.transformMat4(ndc, p, matrizFinal);
      return [
        (ndc[0] * 0.5 + 0.5) * STAGE_WIDTH,
        (1 - (ndc[1] * 0.5 + 0.5)) * STAGE_HEIGHT,
      ];
    };

    if (cara.tipoCara === 'superior_roja') {
      // 1. ÍCONO DE LÁPIZ (Lado rojo izquierdo)
      const pRec1 = proyectarUV(-88, -14);
      const pRec2 = proyectarUV(-68, -14);
      const pRec3 = proyectarUV(-68, 14);
      const pRec4 = proyectarUV(-88, 14);

      ctx.beginPath();
      ctx.moveTo(pRec1[0], pRec1[1]);
      ctx.lineTo(pRec2[0], pRec2[1]);
      ctx.lineTo(pRec3[0], pRec3[1]);
      ctx.lineTo(pRec4[0], pRec4[1]);
      ctx.closePath();
      ctx.stroke();

      // Punta de lápiz interior
      const pPunta = proyectarUV(-78, -10);
      const pBaseIzq = proyectarUV(-84, 9);
      const pBaseDer = proyectarUV(-72, 9);
      ctx.beginPath();
      ctx.moveTo(pPunta[0], pPunta[1]);
      ctx.lineTo(pBaseIzq[0], pBaseIzq[1]);
      ctx.lineTo(pBaseDer[0], pBaseDer[1]);
      ctx.closePath();
      ctx.fill();

      // 2. TEXTO "Pelikan" (Centro de la sección roja)
      const pTxtIni = proyectarUV(-48, 1);
      const pTxtFin = proyectarUV(-10, 1);
      const dx = pTxtFin[0] - pTxtIni[0];
      const dy = pTxtFin[1] - pTxtIni[1];
      const dist = Math.hypot(dx, dy);
      const angulo = Math.atan2(dy, dx);

      if (dist > 14) {
        ctx.save();
        ctx.translate(pTxtIni[0], pTxtIni[1]);
        ctx.rotate(angulo);
        const tamFuente = Math.max(8, Math.min(22, dist * 0.36));
        ctx.font = `italic bold ${tamFuente}px 'Trebuchet MS', Arial, sans-serif`;
        ctx.fillText('Pelikan', 0, 0);

        // Logo del Pelícano en círculo
        ctx.beginPath();
        ctx.arc(dist + 8, -tamFuente * 0.28, tamFuente * 0.42, 0, Math.PI * 2);
        ctx.lineWidth = 1.2;
        ctx.stroke();
        ctx.restore();
      }

      // 3. TEXTO "BR 40"
      const pBRIni = proyectarUV(-48, 18);
      const pBRFin = proyectarUV(-18, 18);
      const dxBR = pBRFin[0] - pBRIni[0];
      const dyBR = pBRFin[1] - pBRIni[1];
      const distBR = Math.hypot(dxBR, dyBR);
      const anguloBR = Math.atan2(dyBR, dxBR);

      if (distBR > 10) {
        ctx.save();
        ctx.translate(pBRIni[0], pBRIni[1]);
        ctx.rotate(anguloBR);
        const tamBR = Math.max(7, Math.min(18, distBR * 0.32));
        ctx.font = `bold ${tamBR}px sans-serif`;
        ctx.fillText('BR 40', 0, 0);
        ctx.restore();
      }
    } else if (cara.tipoCara === 'superior_azul') {
      // 4. ÍCONO DE PLUMA ESTILOGRÁFICA (Lado azul derecho)
      const pPen1 = proyectarUV(44, -14);
      const pPen2 = proyectarUV(70, -14);
      const pPen3 = proyectarUV(70, 14);
      const pPen4 = proyectarUV(44, 14);

      ctx.beginPath();
      ctx.moveTo(pPen1[0], pPen1[1]);
      ctx.lineTo(pPen2[0], pPen2[1]);
      ctx.lineTo(pPen3[0], pPen3[1]);
      ctx.lineTo(pPen4[0], pPen4[1]);
      ctx.closePath();
      ctx.stroke();

      // Plumilla interior
      const pNibTip = proyectarUV(57, 10);
      const pNibL = proyectarUV(49, -8);
      const pNibR = proyectarUV(65, -8);
      ctx.beginPath();
      ctx.moveTo(pNibTip[0], pNibTip[1]);
      ctx.lineTo(pNibL[0], pNibL[1]);
      ctx.lineTo(pNibR[0], pNibR[1]);
      ctx.closePath();
      ctx.fill();
    }

    ctx.restore();
  }
}
