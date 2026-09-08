import { Component, signal } from '@angular/core';
import { Figura } from './figura/figura';

@Component({
  imports: [Figura],
  selector: 'app-root',
  styleUrl: './app.css',
  templateUrl: './app.html',
})
export class App {
  protected readonly title = signal('Hackathon: transformaciones con matrices');
}
