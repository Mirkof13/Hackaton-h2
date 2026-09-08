import { Injectable, computed, signal } from '@angular/core';
import { mat4 } from 'gl-matrix';

const DEG2RAD = Math.PI / 180;

@Injectable({ providedIn: 'root' })
export class TransformService {
  // Traslación en el plano de pantalla (ejes X, Y).
  readonly tx = signal(0);
  readonly ty = signal(0);

  // Escala uniforme del objeto en el espacio 3D.
  readonly scale = signal(1);

  // Rotaciones reales en 3D (grados) sobre cada eje.
  readonly rotationZDeg = signal(0); // giro "de reloj" en el propio plano
  readonly rotationYDeg = signal(0); // giro izquierda/derecha (como una puerta)
  readonly rotationXDeg = signal(0); // giro arriba/abajo (como un volante)

  // Reflexión (espejo) sobre cada eje.
  readonly flipH = signal(false);
  readonly flipV = signal(false);

  /** Matriz de modelo 4x4 (traslación * rotaciones XYZ * escala/reflexión), en 3D real. */
  readonly matrix4 = computed(() => {
    const m = mat4.create();
    mat4.translate(m, m, [this.tx(), this.ty(), 0]);
    mat4.rotateZ(m, m, this.rotationZDeg() * DEG2RAD);
    mat4.rotateY(m, m, this.rotationYDeg() * DEG2RAD);
    mat4.rotateX(m, m, this.rotationXDeg() * DEG2RAD);
    const sx = this.scale() * (this.flipH() ? -1 : 1);
    const sy = this.scale() * (this.flipV() ? -1 : 1);
    mat4.scale(m, m, [sx, sy, 1]);
    return m;
  });

  /**
   * Proyección ortográfica de la matriz 4x4 sobre el canvas 2D:
   * se toman las columnas X e Y de la matriz de modelo (se descarta Z).
   * Esto es lo que Konva usa para pintar: [a, b, c, d, e, f] = context.transform(...).
   */
  readonly matrix2d = computed<[number, number, number, number, number, number]>(() => {
    const m = this.matrix4();
    return [m[0], m[1], m[4], m[5], m[12], m[13]];
  });

  readonly matrixText = computed(() => {
    const m = this.matrix4();
    const f = (n: number) => n.toFixed(2).padStart(7);
    const row = (i: number) => `[ ${f(m[i])} ${f(m[i + 4])} ${f(m[i + 8])} ${f(m[i + 12])} ]`;
    return [row(0), row(1), row(2), row(3)].join('\n');
  });

  reset(): void {
    this.tx.set(0);
    this.ty.set(0);
    this.scale.set(1);
    this.rotationZDeg.set(0);
    this.rotationYDeg.set(0);
    this.rotationXDeg.set(0);
    this.flipH.set(false);
    this.flipV.set(false);
  }
}
