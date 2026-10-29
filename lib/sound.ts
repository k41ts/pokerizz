"use client";

/**
 * All sound effects are synthesized with Web Audio, so there are no audio files.
 * The context is created on the first sound, which always follows a user gesture.
 */

export type Sfx =
  | "select"
  | "deselect"
  | "deal"
  | "discard"
  | "play"
  | "flip"
  | "chip"
  | "stamp"
  | "hit"
  | "block"
  | "heal"
  | "joker"
  | "win"
  | "lose"
  | "click"
  | "connect"
  | "combo";

const MUTE_KEY = "kartuduel:muted";

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let noiseBuffer: AudioBuffer | null = null;
let muted = readMuted();
const listeners = new Set<(muted: boolean) => void>();

function readMuted(): boolean {
  try {
    return typeof window !== "undefined" && window.localStorage.getItem(MUTE_KEY) === "1";
  } catch {
    return false;
  }
}

export function isMuted() {
  return muted;
}

export function setMuted(value: boolean) {
  muted = value;
  try {
    window.localStorage.setItem(MUTE_KEY, value ? "1" : "0");
  } catch {
    // Private mode: the setting just won't persist.
  }
  listeners.forEach((fn) => fn(value));
}

export function onMuteChange(fn: (muted: boolean) => void) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

function audio(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return null;
    ctx = new Ctor();
    master = ctx.createGain();
    master.gain.value = 0.5;
    const comp = ctx.createDynamicsCompressor();
    master.connect(comp).connect(ctx.destination);
    noiseBuffer = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  }
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
}

interface ToneOpts {
  freq: number;
  to?: number;
  type?: OscillatorType;
  start?: number;
  dur: number;
  vol?: number;
  attack?: number;
}

function tone(ac: AudioContext, { freq, to, type = "sine", start = 0, dur, vol = 0.3, attack = 0.005 }: ToneOpts) {
  const t = ac.currentTime + start;
  const osc = ac.createOscillator();
  const gain = ac.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t);
  if (to) osc.frequency.exponentialRampToValueAtTime(to, t + dur);
  gain.gain.setValueAtTime(0.0001, t);
  gain.gain.exponentialRampToValueAtTime(vol, t + attack);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  osc.connect(gain).connect(master!);
  osc.start(t);
  osc.stop(t + dur + 0.02);
}

interface NoiseOpts {
  start?: number;
  dur: number;
  vol?: number;
  filter?: BiquadFilterType;
  freq: number;
  to?: number;
  q?: number;
}

function noise(ac: AudioContext, { start = 0, dur, vol = 0.3, filter = "bandpass", freq, to, q = 1 }: NoiseOpts) {
  const t = ac.currentTime + start;
  const src = ac.createBufferSource();
  src.buffer = noiseBuffer;
  const bq = ac.createBiquadFilter();
  bq.type = filter;
  bq.Q.value = q;
  bq.frequency.setValueAtTime(freq, t);
  if (to) bq.frequency.exponentialRampToValueAtTime(to, t + dur);
  const gain = ac.createGain();
  gain.gain.setValueAtTime(0.0001, t);
  gain.gain.exponentialRampToValueAtTime(vol, t + 0.004);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  src.connect(bq).connect(gain).connect(master!);
  src.start(t, Math.random() * 0.5);
  src.stop(t + dur + 0.02);
}

const lastPlayed = new Map<Sfx, number>();

/** `step` raises the pitch for counted sounds (scoring chips). */
export function play(sfx: Sfx, step = 0) {
  if (muted) return;
  const ac = audio();
  if (!ac) return;

  // Many cards dealt at once shouldn't stack into a roar.
  const now = performance.now();
  if (sfx === "deal" && now - (lastPlayed.get(sfx) ?? 0) < 45) return;
  lastPlayed.set(sfx, now);

  switch (sfx) {
    case "select":
      tone(ac, { freq: 880, to: 1320, type: "triangle", dur: 0.07, vol: 0.18 });
      break;
    case "deselect":
      tone(ac, { freq: 990, to: 600, type: "triangle", dur: 0.07, vol: 0.14 });
      break;
    case "deal":
      noise(ac, { dur: 0.09, vol: 0.22, freq: 2500, to: 5000, q: 0.8 });
      break;
    case "discard":
      noise(ac, { dur: 0.22, vol: 0.25, freq: 6000, to: 900, q: 0.7 });
      tone(ac, { freq: 300, to: 120, type: "sawtooth", dur: 0.18, vol: 0.06 });
      break;
    case "play":
      noise(ac, { dur: 0.18, vol: 0.35, filter: "lowpass", freq: 1800, to: 300 });
      tone(ac, { freq: 140, to: 55, type: "sine", dur: 0.22, vol: 0.5 });
      break;
    case "flip":
      noise(ac, { dur: 0.06, vol: 0.25, freq: 3500, q: 2 });
      tone(ac, { freq: 1600, type: "square", dur: 0.03, vol: 0.05, start: 0.02 });
      break;
    case "chip": {
      const f = 520 * Math.pow(2, Math.min(step, 14) / 12);
      tone(ac, { freq: f, type: "square", dur: 0.08, vol: 0.09 });
      tone(ac, { freq: f * 2, type: "sine", dur: 0.12, vol: 0.12 });
      break;
    }
    case "stamp":
      tone(ac, { freq: 220, to: 110, type: "square", dur: 0.12, vol: 0.12 });
      noise(ac, { dur: 0.1, vol: 0.3, filter: "lowpass", freq: 1200 });
      break;
    case "hit":
      tone(ac, { freq: 180, to: 40, type: "sawtooth", dur: 0.45, vol: 0.35 });
      tone(ac, { freq: 90, to: 30, type: "sine", dur: 0.5, vol: 0.6 });
      noise(ac, { dur: 0.35, vol: 0.45, filter: "lowpass", freq: 3000, to: 200 });
      break;
    case "block":
      tone(ac, { freq: 1200, to: 800, type: "triangle", dur: 0.25, vol: 0.15 });
      tone(ac, { freq: 1800, type: "sine", dur: 0.3, vol: 0.08, start: 0.02 });
      break;
    case "heal":
      [660, 880, 1100].forEach((f, i) => tone(ac, { freq: f, type: "sine", dur: 0.18, vol: 0.14, start: i * 0.07 }));
      break;
    case "joker":
      [523, 659, 784, 1047, 1319].forEach((f, i) =>
        tone(ac, { freq: f, type: "triangle", dur: 0.25, vol: 0.12, start: i * 0.05 }),
      );
      break;
    case "win":
      [523, 659, 784, 1047].forEach((f, i) =>
        tone(ac, { freq: f, type: "square", dur: i === 3 ? 0.6 : 0.16, vol: 0.1, start: i * 0.13 }),
      );
      tone(ac, { freq: 131, type: "triangle", dur: 0.9, vol: 0.2, start: 0.39 });
      break;
    case "lose":
      [392, 349, 311, 262].forEach((f, i) =>
        tone(ac, { freq: f, type: "triangle", dur: i === 3 ? 0.7 : 0.22, vol: 0.14, start: i * 0.2 }),
      );
      break;
    case "click":
      tone(ac, { freq: 1400, type: "square", dur: 0.025, vol: 0.06 });
      break;
    case "combo": {
      // Longer, higher fanfare for stronger hands (step = hand rank 1..8).
      const notes = [523, 659, 784, 1047, 1319, 1568, 2093];
      const n = Math.min(notes.length, 2 + Math.ceil(step * 0.7));
      notes.slice(0, n).forEach((f, i) => tone(ac, { freq: f, type: step >= 5 ? "sawtooth" : "triangle", dur: 0.18, vol: 0.09, start: i * 0.06 }));
      if (step >= 5) {
        tone(ac, { freq: 131, to: 262, type: "square", dur: 0.6, vol: 0.12 });
        noise(ac, { dur: 0.5, vol: 0.2, freq: 4000, to: 800, q: 0.6 });
      }
      break;
    }
    case "connect":
      tone(ac, { freq: 660, type: "sine", dur: 0.12, vol: 0.15 });
      tone(ac, { freq: 990, type: "sine", dur: 0.2, vol: 0.15, start: 0.1 });
      break;
  }
}
