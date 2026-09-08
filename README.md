# Hackathon Transformaciones 3D - Computación Gráfica

Proyecto interactivo desarrollado en **Angular**, **Konva (ng2-konva)** y **gl-matrix** para la simulación y manipulación en tiempo real de un modelo geométrico 3D (goma Pelikan BR40) mediante matrices de transformación y proyección en perspectiva.

---

## 👥 Módulos y Autores

### 1. Modelo 3D y Renderizado Geométrico
- **Autor / Responsable**: **Yuri Jesús**
- **Componente**: `FiguraComponent` (`src/app/figura/`)
- **Descripción detallada**:
  - Modelado geométrico tridimensional de la goma Pelikan BR40 compuesto por bloques poligonales (secciones roja, crema y azul).
  - Definición de topología de vértices 3D y generación de caras quads.
  - Implementación de cámara sintética con matriz de vista (`lookAt`) y matriz de proyección en perspectiva (`perspective`) utilizando `gl-matrix`.
  - Algoritmo de proyección a coordenadas de pantalla (NDC a Canvas 2D) y ordenamiento de profundidad de caras (*Painter's Algorithm*) para correcta oclusión visual en el lienzo Konva.

### 2. Movimientos, Transformaciones Afines y Controles
- **Autor / Responsable**: **Mirkof Guzmán**
- **Componentes**: `TransformService` (`src/app/transform.service.ts`) y `ControlesComponent` (`src/app/controles/`)
- **Descripción detallada**:
  - Sistema de señales reactivas (Angular Signals) para el estado de transformaciones en tiempo real.
  - Construcción y composición matemática de matrices afines $4\times 4$:
    - **Traslación**: Desplazamiento dinámico en los ejes $X$, $Y$ y $Z$.
    - **Rotación 3D**: Rotación en ángulos de Euler independientes sobre los ejes $X$, $Y$ y $Z$.
    - **Escalado**: Escala uniforme y factores de deformación.
    - **Reflexión (Flip)**: Inversión en sentido horizontal y vertical.
  - Interfaz gráfica interactiva de controles con sliders, toggles y función de reseteo a coordenadas base.

---

## 🚀 Ejecución en Desarrollo

Para iniciar el servidor local de desarrollo:

```bash
ng serve
```

Navega a `http://localhost:4200/` en tu navegador.

## 📦 Compilación

Para compilar el proyecto en producción:

```bash
ng build
```

