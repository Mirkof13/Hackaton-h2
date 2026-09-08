/**
 * PROYECTO: Modelo 3D y Transformaciones Matriciales Afines
 * EQUIPO DE TRABAJO:
 * - Yuri Jesús: Modelado 3D (geometría poligonal, vértices, aristas e hilos)
 * - Mirkof Guzmán: Movimiento y Transformaciones (traslación, rotación, escala)
 * - Diego Paredes: Reflejos (reflejo especular en suelo, matrices de reflexión)
 * - Maide Aviza: Sombras y Matrices (matriz 4x4, sombreado Lambert/Phong, sombra proyectada)
 */

import { Injectable, computed, signal } from '@angular/core';
import { mat4 } from 'gl-matrix';

const DEG2RAD = Math.PI / 180;

@Injectable({ providedIn: 'root' })
export class TransformService {
  // -------------------------------------------------------------------------
  // MÓDULO: MOVIMIENTO Y TRANSFORMACIONES (Responsable: Mirkof Guzmán)
  // -------------------------------------------------------------------------

  // Traslación 3D en el espacio (X, Y, Z)
  readonly tx = signal<number>(0);
  readonly ty = signal<number>(0);
  readonly tz = signal<number>(0);

  // Escala uniforme
  readonly scale = signal<number>(1);

  // Rotaciones de Euler 3D (grados)
  readonly rotationXDeg = signal<number>(25); // Inclinación inicial
  readonly rotationYDeg = signal<number>(35); // Giro lateral inicial
  readonly rotationZDeg = signal<number>(0);  // Giro en el plano

  // -------------------------------------------------------------------------
  // MÓDULO: REFLEJOS (Responsable: Diego Paredes)
  // -------------------------------------------------------------------------
  readonly flipH = signal<boolean>(false); // Reflexión en eje X (Horizontal)
  readonly flipV = signal<boolean>(false); // Reflexión en eje Y (Vertical)
  readonly flipZ = signal<boolean>(false); // Reflexión en eje Z (Profundidad)
  readonly showFloorReflection = signal<boolean>(true); // Reflejo en suelo

  // -------------------------------------------------------------------------
  // MÓDULO: MODELADO Y ANÁLISIS GEOMÉTRICO (Responsable: Yuri Jesús)
  // -------------------------------------------------------------------------
  readonly showWireframe = signal<boolean>(true); // Aristas / Hilos 3D
  readonly showVertices = signal<boolean>(true);  // Nodos / Vértices 3D
  readonly showAxes = signal<boolean>(true);      // Ejes cartesianos 3D
  readonly autoRotate = signal<boolean>(false);   // Auto-rotación para demo

  // -------------------------------------------------------------------------
  // MÓDULO: SOMBRAS Y MATRICES (Responsable: Maide Aviza)
  // -------------------------------------------------------------------------
  readonly showShadow = signal<boolean>(true);    // Sombra de contacto en suelo

  /**
   * Cálculo de la matriz de modelo 4x4 mediante glMatrix:
   * M = Traslación(X,Y,Z) * RotZ * RotY * RotX * Escala(Sx,Sy,Sz) * Reflexión
   */
  readonly matrix4 = computed<mat4>(() => {
    const m = mat4.create();

    // 1. Traslación 3D
    mat4.translate(m, m, [this.tx(), this.ty(), this.tz()]);

    // 2. Rotaciones compuestas en orden Z * Y * X
    mat4.rotateZ(m, m, this.rotationZDeg() * DEG2RAD);
    mat4.rotateY(m, m, this.rotationYDeg() * DEG2RAD);
    mat4.rotateX(m, m, this.rotationXDeg() * DEG2RAD);

    // 3. Escala y Reflexiones (signo negativo = reflexión sobre el eje correspondiente)
    const sx = this.scale() * (this.flipH() ? -1 : 1);
    const sy = this.scale() * (this.flipV() ? -1 : 1);
    const sz = this.scale() * (this.flipZ() ? -1 : 1);
    mat4.scale(m, m, [sx, sy, sz]);

    return m;
  });

  /**
   * Proyección 2D para compatibilidad
   */
  readonly matrix2d = computed<[number, number, number, number, number, number]>(() => {
    const m = this.matrix4();
    return [m[0], m[1], m[4], m[5], m[12], m[13]];
  });

  /**
   * Formateo textual estructurado de la matriz 4x4
   */
  readonly matrixRows = computed(() => {
    const m = this.matrix4();
    const f = (n: number) => (Math.abs(n) < 0.0001 ? '0.00' : n.toFixed(2)).padStart(7);
    return {
      r0: `[ ${f(m[0])} ${f(m[4])} ${f(m[8])}  ${f(m[12])} ]`,
      r1: `[ ${f(m[1])} ${f(m[5])} ${f(m[9])}  ${f(m[13])} ]`,
      r2: `[ ${f(m[2])} ${f(m[6])} ${f(m[10])} ${f(m[14])} ]`,
      r3: `[ ${f(m[3])} ${f(m[7])} ${f(m[11])} ${f(m[15])} ]`,
    };
  });

  readonly matrixText = computed(() => {
    const r = this.matrixRows();
    return `${r.r0}\n${r.r1}\n${r.r2}\n${r.r3}`;
  });

  reset(): void {
    this.tx.set(0);
    this.ty.set(0);
    this.tz.set(0);
    this.scale.set(1);
    this.rotationXDeg.set(25);
    this.rotationYDeg.set(35);
    this.rotationZDeg.set(0);
    this.flipH.set(false);
    this.flipV.set(false);
    this.flipZ.set(false);
    this.autoRotate.set(false);
  }

  setIsometricView(): void {
    this.rotationXDeg.set(30);
    this.rotationYDeg.set(45);
    this.rotationZDeg.set(0);
  }

  setTopView(): void {
    this.rotationXDeg.set(90);
    this.rotationYDeg.set(0);
    this.rotationZDeg.set(0);
  }

  setFrontView(): void {
    this.rotationXDeg.set(0);
    this.rotationYDeg.set(0);
    this.rotationZDeg.set(0);
  }

  setSideView(): void {
    this.rotationXDeg.set(0);
    this.rotationYDeg.set(90);
    this.rotationZDeg.set(0);
  }
}
