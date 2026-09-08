import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Figura } from './figura';

describe('Figura', () => {
  let component: Figura;
  let fixture: ComponentFixture<Figura>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Figura],
    }).compileComponents();

    fixture = TestBed.createComponent(Figura);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
