/**
 * MÓDULO: Panel Interactivo de Controles de Movimiento y Transformación
 * AUTOR: Mirkof Guzmán
 * DESCRIPCIÓN: Componente interactivo para manipular en tiempo real traslaciones,
 * rotaciones en 3 ejes, escalado, reflexiones y reseteo del modelo 3D.
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

  protected onTx(event: Event): void {
    this.transform.tx.set(Number((event.target as HTMLInputElement).value));
  }

  protected onTy(event: Event): void {
    this.transform.ty.set(Number((event.target as HTMLInputElement).value));
  }

  protected onScale(event: Event): void {
    this.transform.scale.set(Number((event.target as HTMLInputElement).value));
  }

  protected onRotationZ(event: Event): void {
    this.transform.rotationZDeg.set(Number((event.target as HTMLInputElement).value));
  }

  protected onRotationY(event: Event): void {
    this.transform.rotationYDeg.set(Number((event.target as HTMLInputElement).value));
  }

  protected onRotationX(event: Event): void {
    this.transform.rotationXDeg.set(Number((event.target as HTMLInputElement).value));
  }

  protected toggleFlipH(): void {
    this.transform.flipH.update((v) => !v);
  }

  protected toggleFlipV(): void {
    this.transform.flipV.update((v) => !v);
  }

  protected reset(): void {
    this.transform.reset();
  }
}
