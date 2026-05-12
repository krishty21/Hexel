# Hexel Codebase Graph

This graph reflects the current Hexel project: a Vite + React + TypeScript creative canvas app powered by Zustand and a single full-screen 2D render engine.

## Module Dependency Graph

```mermaid
flowchart TD
  indexHtml[index.html] --> indexTsx[src/index.tsx]
  indexTsx --> app[src/App.tsx]
  indexTsx --> css[src/index.css]

  app --> store[src/store.ts]
  app --> canvas[src/components/HexCanvas.tsx]
  app --> imageImporter[src/components/ImageImportModal.tsx]
  app --> modes[src/components/ModeSelector.tsx]
  app --> toolbar[src/components/Toolbar.tsx]
  app --> audio[Web Audio API]

  canvas --> store
  canvas --> canvasApi[Canvas 2D API]
  canvas --> audioAnalyser[AnalyserNode data]

  imageImporter --> store
  imageImporter --> browserImage[Local image file + crop canvas]

  modes --> store
  modes --> framer[framer-motion]
  modes --> icons[lucide-react]

  toolbar --> store
  toolbar --> framer
  toolbar --> icons

  store --> zustand[zustand]
```

## Runtime Flow

```mermaid
flowchart LR
  user[User] --> modeSelector[ModeSelector]
  user --> toolbar[Toolbar]
  user --> canvasEvents[Canvas pointer / wheel / key events]
  user --> audioUpload[Audio file upload]
  user --> imageUpload[Image upload]

  modeSelector -->|setActiveMode or choose Image Forge| store[Zustand store]
  toolbar -->|materials, hover element, reflections, rotation step, image upload| store
  canvasEvents -->|paintHex / eraseHex| store
  audioUpload -->|create AudioContext + AnalyserNode| app[App]
  imageUpload --> imageImporter
  imageImporter -->|deep colored block grid| store

  app -->|audioAnalyser prop| canvas[HexCanvas]
  store -->|mode, grid, tools| canvas
  canvas -->|requestAnimationFrame| screen[Full-screen hex grid]
```

## HexCanvas Engine

```mermaid
flowchart TD
  frame[requestAnimationFrame] --> readState[Read Zustand state]
  readState --> audio{Audio active?}
  audio -->|yes| analyse[Adaptive frequency + waveform beat detection]
  audio -->|no| geometry
  analyse --> geometry[Generate visible board hexes from precomputed giant hex world]

  geometry --> sort[Sort by screen Y]
  sort --> lod{Zoomed out?}
  lod -->|yes| cheap[Low-detail fills, reduced shadows and strokes]
  lod -->|no| detailed[Detailed gradients, actors, block sides]
  cheap --> mode{activeMode}
  detailed --> mode

  mode -->|sculpt| sculpt[Draw stacked isometric blocks]
  mode -->|hover hex| hoverHex[Symmetric color wake under cursor]
  mode -->|hover flower| flower[Animated flowers on hexes]
  mode -->|hover stickman| stickman[Animated stick figures]
  mode -->|type| type[Random grid glyphs + explode waves]
  mode -->|audio| pulse[Beat waves, spectrum color, particles]

  sculpt --> particles[Draw particles]
  hoverHex --> particles
  flower --> particles
  stickman --> particles
  type --> particles
  pulse --> particles
  particles --> frame
```

## Store Data Model

```mermaid
classDiagram
  class AppState {
    Mode activeMode
    MaterialType sculptMaterial
    Record materialColors
    boolean reflectionsEnabled
    number sculptRotationStep
    Record grid
    HoverElement hoverElement
    setActiveMode(mode)
    setSculptMaterial(mat)
    setMaterialColor(mat, color)
    setReflectionsEnabled(enabled)
    setSculptRotationStep(degrees)
    paintHex(id, q, r)
    eraseHex(id)
    setImageGrid(cells)
    clearGrid()
    setHoverElement(el)
  }

  class HexData {
    string id
    number q
    number r
    HexLayer[] layers
  }

  class HexLayer {
    MaterialType material
    string color
  }

  AppState "1" --> "*" HexData
  HexData "1" --> "*" HexLayer
```

## Feature Mindmap

```mermaid
mindmap
  root((Hexel))
    Sculpt
      Persistent grid layers
      Materials
        Chrome
        Glass
        Plasma selected-color shade cycling
        Chameleon full-spectrum cycling
        Eraser
      Reflections
      Single-block placement
      Hold right-click rotate and keep placing
      Cursor keeps painting through rotation
    Image Forge
      Top-level menu card
      Local image upload
      Crop selector for large images
      Deep relief block stacks
      Brighter richer pixels become taller
    Hover Garden
      Hex mode
        Symmetric color choices
        Shorter trails
        Ripple height lift
      Flowers
      Improved stickmen
    Type Waves
      Random hex glyph placement
      Space or Enter explosion
      Unique wave colors
    Audio Pulse
      Adaptive beat threshold
      Frequency rings
      Waveform RMS
      Particles
      Cycling color palette
    World
      Giant hex-shaped board
      Low-detail render path while zoomed out
```
