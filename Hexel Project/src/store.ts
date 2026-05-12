import { create } from 'zustand';

export type Mode = 'menu' | 'sculpt' | 'hover' | 'type' | 'audio';
export type MaterialType =
'chrome' |
'glass' |
'plasma' |
'chameleon' |
'eraser';
export type HoverElement = 'hex' | 'flower' | 'stickman';

export interface HexLayer {
  material: MaterialType;
  color: string;
}

export interface HexData {
  id: string;
  q: number; // Axial coordinates
  r: number;
  layers: HexLayer[];
}

interface AppState {
  activeMode: Mode;
  setActiveMode: (mode: Mode) => void;

  // Sculpt Mode State
  sculptMaterial: MaterialType;
  setSculptMaterial: (mat: MaterialType) => void;
  materialColors: Record<MaterialType, string>;
  setMaterialColor: (mat: MaterialType, color: string) => void;
  reflectionsEnabled: boolean;
  setReflectionsEnabled: (enabled: boolean) => void;
  sculptRotationStep: number;
  setSculptRotationStep: (degrees: number) => void;
  grid: Record<string, HexData>;
  paintHex: (id: string, q: number, r: number) => void;
  eraseHex: (id: string) => void;
  setImageGrid: (cells: { id: string; q: number; r: number; color: string; height: number }[]) => void;
  clearGrid: () => void;

  // Hover Mode State
  hoverElement: HoverElement;
  setHoverElement: (el: HoverElement) => void;
}

export const useStore = create<AppState>((set, get) => ({
  activeMode: 'menu',
  setActiveMode: (mode) => set({ activeMode: mode }),

  sculptMaterial: 'chrome',
  setSculptMaterial: (mat) => set({ sculptMaterial: mat }),
  materialColors: {
    chrome: '#3b82f6',
    glass: '#06b6d4',
    plasma: '#f97316',
    chameleon: '#ffffff', // Auto-cycles, color ignored
    eraser: '#000000'
  },
  setMaterialColor: (mat, color) =>
  set((state) => ({
    materialColors: { ...state.materialColors, [mat]: color }
  })),
  reflectionsEnabled: false,
  setReflectionsEnabled: (enabled) => set({ reflectionsEnabled: enabled }),
  sculptRotationStep: 30,
  setSculptRotationStep: (degrees) => set({ sculptRotationStep: Math.max(5, Math.min(degrees, 90)) }),

  grid: {},
  paintHex: (id, q, r) => {
    const state = get();
    if (state.sculptMaterial === 'eraser') {
      set((current) => {
        const hex = current.grid[id];
        if (!hex || hex.layers.length === 0) return current;
        return {
          grid: {
            ...current.grid,
            [id]: { ...hex, layers: hex.layers.slice(0, -1) }
          }
        };
      });
      return;
    }

    set((state) => {
      const hex = state.grid[id] || { id, q, r, layers: [] };
      if (hex.layers.length >= 5) return state;

      return {
        grid: {
          ...state.grid,
          [id]: {
            ...hex,
            layers: [
              ...hex.layers,
              {
                material: state.sculptMaterial,
                color: state.materialColors[state.sculptMaterial]
              }
            ]
          }
        }
      };
    });
  },
  eraseHex: (id) => {
    set((state) => {
      const hex = state.grid[id];
      if (!hex || hex.layers.length === 0) return state;

      const newLayers = [...hex.layers];
      newLayers.pop(); // Remove top layer

      return {
        grid: {
          ...state.grid,
          [id]: { ...hex, layers: newLayers }
        }
      };
    });
  },
  setImageGrid: (cells) =>
    set({
      activeMode: 'sculpt',
      grid: Object.fromEntries(
        cells.map((cell) => [
          cell.id,
          {
            id: cell.id,
            q: cell.q,
            r: cell.r,
            layers: [
              ...Array.from({ length: cell.height }, () => ({
                material: 'chrome' as MaterialType,
                color: cell.color
              }))
            ]
          }
        ])
      )
    }),
  clearGrid: () => set({ grid: {} }),

  hoverElement: 'hex',
  setHoverElement: (el) => set({ hoverElement: el })
}));
