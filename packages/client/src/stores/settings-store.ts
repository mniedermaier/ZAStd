import { create } from 'zustand';

type GraphicsQuality = 'low' | 'med' | 'high';

export interface Blueprint {
  id: string;
  name: string;
  towers: Array<{ relX: number; relY: number; towerType: string }>;
}

interface SettingsStore {
  masterVolume: number;
  sfxVolume: number;
  musicVolume: number;
  colorblindMode: boolean;
  showHelp: boolean;
  isPaused: boolean;
  gameSpeed: number;
  graphicsQuality: GraphicsQuality;
  screenShake: boolean;
  blueprints: Blueprint[];
  blueprintQueue: Array<{ relX: number; relY: number; towerType: string }> | null;

  setMasterVolume: (v: number) => void;
  setSfxVolume: (v: number) => void;
  setMusicVolume: (v: number) => void;
  setColorblindMode: (on: boolean) => void;
  setShowHelp: (on: boolean) => void;
  setIsPaused: (paused: boolean) => void;
  togglePause: () => void;
  setGameSpeed: (speed: number) => void;
  setGraphicsQuality: (q: GraphicsQuality) => void;
  setScreenShake: (on: boolean) => void;
  saveBlueprint: (name: string, towers: Array<{ relX: number; relY: number; towerType: string }>) => void;
  deleteBlueprint: (id: string) => void;
  loadBlueprint: (id: string) => void;
  clearBlueprintQueue: () => void;
  popBlueprintQueue: () => { relX: number; relY: number; towerType: string } | null;
}

function loadNumber(key: string, fallback: number): number {
  try {
    const v = localStorage.getItem(key);
    return v !== null ? Number(v) : fallback;
  } catch { return fallback; }
}

function loadBool(key: string, fallback: boolean): boolean {
  try {
    const v = localStorage.getItem(key);
    return v !== null ? v === 'true' : fallback;
  } catch { return fallback; }
}

function loadString(key: string, fallback: string): string {
  try {
    const v = localStorage.getItem(key);
    return v !== null ? v : fallback;
  } catch { return fallback; }
}

function persist(key: string, value: number | boolean | string) {
  try { localStorage.setItem(key, String(value)); } catch {}
}

function loadBlueprints(): Blueprint[] {
  try {
    const raw = localStorage.getItem('zastd:blueprints');
    if (raw) return JSON.parse(raw);
  } catch {}
  return [];
}

function saveBlueprints(blueprints: Blueprint[]) {
  try { localStorage.setItem('zastd:blueprints', JSON.stringify(blueprints)); } catch {}
}

// Colorblind-safe palette: replaces red/green distinctions with blue/orange
export const CB_COLORS = {
  // Governor colors (normal → colorblind-safe)
  fire:    { normal: '#ff4444', cb: '#e69f00' },  // red → orange
  ice:     { normal: '#44bbff', cb: '#56b4e9' },  // blue → sky blue
  thunder: { normal: '#ffee00', cb: '#f0e442' },  // yellow → yellow
  poison:  { normal: '#44ff44', cb: '#009e73' },  // green → teal
  death:   { normal: '#aa44ff', cb: '#cc79a7' },  // purple → pink
  nature:  { normal: '#88ff44', cb: '#0072b2' },  // lime → dark blue
  arcane:  { normal: '#ff44ff', cb: '#d55e00' },  // magenta → vermillion
  holy:    { normal: '#ffffff', cb: '#ffffff' },  // white → white
  // Game elements
  enemyGround: { normal: '#cc4444', cb: '#e69f00' },
  enemyFlying: { normal: '#44ddff', cb: '#56b4e9' },
  lives:       { normal: '#44ff88', cb: '#009e73' },
  livesLow:    { normal: '#ff4466', cb: '#d55e00' },
  gold:        { normal: '#ffdd44', cb: '#f0e442' },
  physical:    { normal: '#ffaa88', cb: '#e69f00' },
  magic:       { normal: '#cc88ff', cb: '#56b4e9' },
};

export function getCBColor(key: keyof typeof CB_COLORS, colorblind: boolean): string {
  return colorblind ? CB_COLORS[key].cb : CB_COLORS[key].normal;
}

export const useSettingsStore = create<SettingsStore>((set, get) => ({
  masterVolume: loadNumber('settings:masterVolume', 0.7),
  sfxVolume: loadNumber('settings:sfxVolume', 0.8),
  musicVolume: loadNumber('settings:musicVolume', 0.4),
  colorblindMode: loadBool('settings:colorblindMode', false),
  showHelp: false,
  isPaused: false,
  gameSpeed: loadNumber('settings:gameSpeed', 1),
  graphicsQuality: loadString('settings:graphicsQuality', 'high') as GraphicsQuality,
  screenShake: loadBool('settings:screenShake', true),
  blueprints: loadBlueprints(),
  blueprintQueue: null,

  setMasterVolume: (v) => { persist('settings:masterVolume', v); set({ masterVolume: v }); },
  setSfxVolume: (v) => { persist('settings:sfxVolume', v); set({ sfxVolume: v }); },
  setMusicVolume: (v) => { persist('settings:musicVolume', v); set({ musicVolume: v }); },
  setColorblindMode: (on) => { persist('settings:colorblindMode', on); set({ colorblindMode: on }); },
  setShowHelp: (on) => set({ showHelp: on }),
  setIsPaused: (paused) => set({ isPaused: paused }),
  togglePause: () => set((s) => ({ isPaused: !s.isPaused })),
  setGameSpeed: (speed) => { persist('settings:gameSpeed', speed); set({ gameSpeed: speed }); },
  setGraphicsQuality: (q) => { persist('settings:graphicsQuality', q); set({ graphicsQuality: q }); },
  setScreenShake: (on) => { persist('settings:screenShake', on); set({ screenShake: on }); },
  saveBlueprint: (name, towers) => {
    const bp: Blueprint = { id: crypto.randomUUID(), name, towers };
    const updated = [...get().blueprints, bp];
    saveBlueprints(updated);
    set({ blueprints: updated });
  },
  deleteBlueprint: (id) => {
    const updated = get().blueprints.filter(b => b.id !== id);
    saveBlueprints(updated);
    set({ blueprints: updated });
  },
  loadBlueprint: (id) => {
    const bp = get().blueprints.find(b => b.id === id);
    if (bp) set({ blueprintQueue: [...bp.towers] });
  },
  clearBlueprintQueue: () => set({ blueprintQueue: null }),
  popBlueprintQueue: () => {
    const queue = get().blueprintQueue;
    if (!queue || queue.length === 0) {
      set({ blueprintQueue: null });
      return null;
    }
    const [next, ...rest] = queue;
    set({ blueprintQueue: rest.length > 0 ? rest : null });
    return next;
  },
}));
