import { create } from 'zustand';

interface SettingsStore {
  masterVolume: number;
  sfxVolume: number;
  musicVolume: number;
  colorblindMode: boolean;
  showHelp: boolean;
  isPaused: boolean;

  setMasterVolume: (v: number) => void;
  setSfxVolume: (v: number) => void;
  setMusicVolume: (v: number) => void;
  setColorblindMode: (on: boolean) => void;
  setShowHelp: (on: boolean) => void;
  setIsPaused: (paused: boolean) => void;
  togglePause: () => void;
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

function persist(key: string, value: number | boolean) {
  try { localStorage.setItem(key, String(value)); } catch {}
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

export const useSettingsStore = create<SettingsStore>((set) => ({
  masterVolume: loadNumber('settings:masterVolume', 0.7),
  sfxVolume: loadNumber('settings:sfxVolume', 0.8),
  musicVolume: loadNumber('settings:musicVolume', 0.4),
  colorblindMode: loadBool('settings:colorblindMode', false),
  showHelp: false,
  isPaused: false,

  setMasterVolume: (v) => { persist('settings:masterVolume', v); set({ masterVolume: v }); },
  setSfxVolume: (v) => { persist('settings:sfxVolume', v); set({ sfxVolume: v }); },
  setMusicVolume: (v) => { persist('settings:musicVolume', v); set({ musicVolume: v }); },
  setColorblindMode: (on) => { persist('settings:colorblindMode', on); set({ colorblindMode: on }); },
  setShowHelp: (on) => set({ showHelp: on }),
  setIsPaused: (paused) => set({ isPaused: paused }),
  togglePause: () => set((s) => ({ isPaused: !s.isPaused })),
}));
