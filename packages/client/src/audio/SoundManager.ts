import { useSettingsStore } from '../stores/settings-store';

let ctx: AudioContext | null = null;

function getCtx(): AudioContext {
  if (!ctx) ctx = new AudioContext();
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

function vol(): { master: number; sfx: number; music: number } {
  const s = useSettingsStore.getState();
  return { master: s.masterVolume, sfx: s.sfxVolume, music: s.musicVolume };
}

function sfxGain(): number {
  const v = vol();
  return v.master * v.sfx;
}

function musicGain(): number {
  const v = vol();
  return v.master * v.music;
}

// --- Utility: play a tone ---

function playTone(
  freq: number,
  duration: number,
  type: OscillatorType = 'sine',
  gainVal = 0.3,
  detune = 0,
) {
  const g = sfxGain();
  if (g < 0.01) return;
  const c = getCtx();
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  osc.detune.value = detune;
  gain.gain.setValueAtTime(gainVal * g, c.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + duration);
  osc.connect(gain);
  gain.connect(c.destination);
  osc.start();
  osc.stop(c.currentTime + duration);
}

function playNoise(duration: number, gainVal = 0.15) {
  const g = sfxGain();
  if (g < 0.01) return;
  const c = getCtx();
  const bufferSize = c.sampleRate * duration;
  const buffer = c.createBuffer(1, bufferSize, c.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) data[i] = (Math.random() * 2 - 1);
  const source = c.createBufferSource();
  source.buffer = buffer;
  const gain = c.createGain();
  gain.gain.setValueAtTime(gainVal * g, c.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + duration);
  source.connect(gain);
  gain.connect(c.destination);
  source.start();
}

// --- Public Sound Effects ---

export function playPlaceTower() {
  playTone(440, 0.12, 'square', 0.15);
  playTone(660, 0.1, 'square', 0.12);
}

export function playTowerAttack() {
  playTone(200 + Math.random() * 100, 0.08, 'sawtooth', 0.1);
}

export function playUpgradeTower() {
  playTone(440, 0.1, 'sine', 0.2);
  setTimeout(() => playTone(550, 0.1, 'sine', 0.2), 80);
  setTimeout(() => playTone(660, 0.15, 'sine', 0.25), 160);
}

export function playSellTower() {
  playTone(500, 0.1, 'triangle', 0.15);
  setTimeout(() => playTone(350, 0.15, 'triangle', 0.12), 80);
}

export function playEnemyDeath() {
  playNoise(0.12, 0.08);
  playTone(300, 0.08, 'square', 0.06);
}

export function playWaveStart() {
  playTone(330, 0.15, 'sine', 0.2);
  setTimeout(() => playTone(440, 0.15, 'sine', 0.25), 120);
  setTimeout(() => playTone(550, 0.2, 'sine', 0.3), 240);
}

export function playWaveComplete() {
  playTone(440, 0.15, 'sine', 0.2);
  setTimeout(() => playTone(550, 0.15, 'sine', 0.2), 100);
  setTimeout(() => playTone(660, 0.15, 'sine', 0.25), 200);
  setTimeout(() => playTone(880, 0.3, 'sine', 0.3), 300);
}

export function playVictory() {
  const notes = [523, 659, 784, 1047];
  notes.forEach((n, i) => {
    setTimeout(() => playTone(n, 0.3, 'sine', 0.25), i * 150);
  });
}

export function playDefeat() {
  const notes = [440, 370, 330, 262];
  notes.forEach((n, i) => {
    setTimeout(() => playTone(n, 0.4, 'sine', 0.2), i * 200);
  });
}

export function playUIClick() {
  playTone(800, 0.05, 'sine', 0.1);
}

// --- Ambient Background Music ---

let musicInterval: ReturnType<typeof setInterval> | null = null;
let musicPlaying = false;

const AMBIENT_NOTES = [130.8, 164.8, 196.0, 220.0, 261.6, 329.6];

export function startMusic() {
  if (musicPlaying) return;
  musicPlaying = true;

  const playAmbientNote = () => {
    const g = musicGain();
    if (g < 0.01) return;
    const c = getCtx();
    const freq = AMBIENT_NOTES[Math.floor(Math.random() * AMBIENT_NOTES.length)];
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = 'sine';
    osc.frequency.value = freq;
    const noteGain = (0.06 + Math.random() * 0.04) * g;
    gain.gain.setValueAtTime(0, c.currentTime);
    gain.gain.linearRampToValueAtTime(noteGain, c.currentTime + 0.5);
    gain.gain.linearRampToValueAtTime(0, c.currentTime + 3);
    osc.connect(gain);
    gain.connect(c.destination);
    osc.start();
    osc.stop(c.currentTime + 3);
  };

  // Play a note every 1.5-3 seconds
  const scheduleNext = () => {
    if (!musicPlaying) return;
    playAmbientNote();
    musicInterval = setTimeout(scheduleNext, 1500 + Math.random() * 1500) as any;
  };
  scheduleNext();
}

export function stopMusic() {
  musicPlaying = false;
  if (musicInterval) {
    clearTimeout(musicInterval);
    musicInterval = null;
  }
}

// --- Ability Sounds (per governor) ---

export function playAbilityFire() {
  playTone(120, 0.3, 'sawtooth', 0.15);
  playNoise(0.15, 0.12);
}

export function playAbilityIce() {
  playTone(1200, 0.15, 'sine', 0.12);
  setTimeout(() => playTone(800, 0.15, 'sine', 0.12), 80);
  setTimeout(() => playTone(600, 0.2, 'sine', 0.12), 160);
}

export function playAbilityThunder() {
  playNoise(0.1, 0.15);
  setTimeout(() => playTone(1400, 0.08, 'sine', 0.15), 50);
}

export function playAbilityPoison() {
  playTone(150, 0.2, 'triangle', 0.1);
  setTimeout(() => playTone(180, 0.2, 'triangle', 0.1), 100);
  setTimeout(() => playTone(160, 0.2, 'triangle', 0.1), 200);
}

export function playAbilityDeath() {
  playTone(400, 0.4, 'sawtooth', 0.12);
  setTimeout(() => playTone(250, 0.3, 'sawtooth', 0.1), 100);
  setTimeout(() => playTone(150, 0.3, 'sawtooth', 0.08), 200);
}

export function playAbilityNature() {
  playTone(330, 0.2, 'sine', 0.12);
  setTimeout(() => playTone(440, 0.2, 'sine', 0.12), 80);
  setTimeout(() => playTone(550, 0.25, 'sine', 0.15), 160);
}

export function playAbilityArcane() {
  playTone(600, 0.3, 'sine', 0.12, 50);
  setTimeout(() => playTone(600, 0.3, 'sine', 0.12, -50), 100);
}

export function playAbilityHoly() {
  playTone(523, 0.2, 'sine', 0.08);
  setTimeout(() => playTone(659, 0.2, 'sine', 0.08), 80);
  setTimeout(() => playTone(784, 0.2, 'sine', 0.08), 160);
  setTimeout(() => playTone(1047, 0.3, 'sine', 0.1), 240);
}

// --- Ping Sounds ---

export function playPingAlert() {
  playTone(880, 0.08, 'square', 0.12);
  setTimeout(() => playTone(880, 0.08, 'square', 0.12), 120);
}

export function playPingHere() {
  playTone(660, 0.12, 'sine', 0.12);
}

export function playPingHelp() {
  playTone(440, 0.08, 'triangle', 0.12);
  setTimeout(() => playTone(440, 0.08, 'triangle', 0.12), 100);
  setTimeout(() => playTone(440, 0.08, 'triangle', 0.12), 200);
}

// --- Synergy Sound ---

export function playSynergyActivation() {
  playTone(660, 0.12, 'sine', 0.1);
  setTimeout(() => playTone(880, 0.12, 'sine', 0.1), 80);
  setTimeout(() => playTone(1100, 0.15, 'sine', 0.12), 160);
}

// Initialize audio context on first user interaction
export function initAudio() {
  const handler = () => {
    getCtx();
    document.removeEventListener('click', handler);
    document.removeEventListener('keydown', handler);
  };
  document.addEventListener('click', handler);
  document.addEventListener('keydown', handler);
}
