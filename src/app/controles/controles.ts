/**
 * PROYECTO: Modelo 3D y Transformaciones Matriciales Afines
 * EQUIPO DE TRABAJO:
 * - Yuri Jesús: Modelado 3D (geometría poligonal, vértices, aristas e hilos)
 * - Mirkof Guzmán: Movimiento y Transformaciones (traslación, rotación, escala)
 * - Diego Paredes: Reflejos (reflejo especular en suelo, matrices de reflexión)
 * - Maide Aviza: Sombras y Matrices (matriz 4x4, sombreado Lambert/Phong, sombra proyectada)
 */

import { Component, inject } from '@angular/core';
import { TransformService } from '../transform.service';

@Component({
  imports: [],
  selector: 'app-controles',
  styleUrl: './controles.css',
  templateUrl: './controles.html',
})
export class Controles {
  protected readonly transform = inject(TransformService);

  // Mirkof Guzmán: Movimiento y Transformaciones
  protected onTx(event: Event): void {
    this.transform.tx.set(Number((event.target as HTMLInputElement).value));
  }

  protected onTy(event: Event): void {
    this.transform.ty.set(Number((event.target as HTMLInputElement).value));
  }

  protected onTz(event: Event): void {
    this.transform.tz.set(Number((event.target as HTMLInputElement).value));
  }

  protected onScale(event: Event): void {
    this.transform.scale.set(Number((event.target as HTMLInputElement).value));
  }

  protected onRotationX(event: Event): void {
    this.transform.rotationXDeg.set(Number((event.target as HTMLInputElement).value));
  }

  protected onRotationY(event: Event): void {
    this.transform.rotationYDeg.set(Number((event.target as HTMLInputElement).value));
  }

  protected onRotationZ(event: Event): void {
    this.transform.rotationZDeg.set(Number((event.target as HTMLInputElement).value));
  }

  // Diego Paredes: Reflejos
  protected toggleFlipH(): void {
    this.transform.flipH.update((v) => !v);
  }

  protected toggleFlipV(): void {
    this.transform.flipV.update((v) => !v);
  }

  protected toggleFlipZ(): void {
    this.transform.flipZ.update((v) => !v);
  }

  protected toggleFloorReflection(): void {
    this.transform.showFloorReflection.update((v) => !v);
  }

  // Yuri Jesús: Modelado y Geometría 3D
  protected toggleWireframe(): void {
    this.transform.showWireframe.update((v) => !v);
  }

  protected toggleVertices(): void {
    this.transform.showVertices.update((v) => !v);
  }

  protected toggleAutoRotate(): void {
    this.transform.autoRotate.update((v) => !v);
  }

  protected setIsometric(): void {
    this.transform.setIsometricView();
  }

  protected setTop(): void {
    this.transform.setTopView();
  }

  protected setFront(): void {
    this.transform.setFrontView();
  }

  protected setSide(): void {
    this.transform.setSideView();
  }

  // Maide Aviza: Sombras y Matrices
  protected toggleShadow(): void {
    this.transform.showShadow.update((v) => !v);
  }

  protected reset(): void {
    this.transform.reset();
  }
}
