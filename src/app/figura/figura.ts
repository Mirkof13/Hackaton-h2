import { Component, computed, inject, signal } from '@angular/core';
import type { Context } from 'konva/lib/Context';
import type { ShapeConfig } from 'konva/lib/Shape';
import type { StageConfig } from 'konva/lib/Stage';
import { CoreShapeComponent, StageComponent } from 'ng2-konva';
import { Controles } from '../controles/controles';
import { TransformService } from '../transform.service';

const STAGE_WIDTH = 640;
const STAGE_HEIGHT = 440;
const CENTER_X = STAGE_WIDTH / 2;
const CENTER_Y = STAGE_HEIGHT / 2;

// Figura base: la goma Pelikan BR40, tamaño dibujado centrado en el origen
// (misma proporción 4:3 que la foto original de 640x480).
const FIGURE_WIDTH = 220;
const FIGURE_HEIGHT = 165;

@Component({
  imports: [StageComponent, CoreShapeComponent, Controles],
  selector: 'app-figura',
  styleUrl: './figura.css',
  templateUrl: './figura.html',
})
export class Figura {
  protected readonly transform = inject(TransformService);

  private readonly imagenLista = signal(false);
  private readonly imagen = new Image();

  constructor() {
    this.imagen.onload = () => this.imagenLista.set(true);
    this.imagen.src = 'assets/goma.jpg';
  }

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
      ctx.moveTo(0, CENTER_Y);
      ctx.lineTo(STAGE_WIDTH, CENTER_Y);
      ctx.moveTo(CENTER_X, 0);
      ctx.lineTo(CENTER_X, STAGE_HEIGHT);
      ctx.stroke();
      ctx.restore();
    },
  };

  protected readonly configFigura = computed<ShapeConfig>(() => {
    const m = this.transform.matrix2d();
    const lista = this.imagenLista();
    const img = this.imagen;
    return {
      listening: false,
      sceneFunc: (ctx: Context) => {
        if (!lista) return;
        ctx.save();
        ctx.translate(CENTER_X, CENTER_Y);
        ctx.transform(m[0], m[1], m[2], m[3], m[4], m[5]);
        ctx.drawImage(img, -FIGURE_WIDTH / 2, -FIGURE_HEIGHT / 2, FIGURE_WIDTH, FIGURE_HEIGHT);
        ctx.restore();
      },
    };
  });
}
