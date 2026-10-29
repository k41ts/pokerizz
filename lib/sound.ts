"use client";

import type { SkinId } from "./skins";

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
let echo: DelayNode | null = null;
let hall: ConvolverNode | null = null;
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

/** Stereo impulse of decaying noise: a large, dark room. */
function hallImpulse(ac: AudioContext, seconds: number): AudioBuffer {
  const length = Math.floor(ac.sampleRate * seconds);
  const buffer = ac.createBuffer(2, length, ac.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const data = buffer.getChannelData(ch);
    for (let i = 0; i < length; i++) data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, 2.6);
  }
  return buffer;
}

/** Soft-clipping curve; adds harmonics so low notes still read on small speakers. */
function driveCurve(amount: number): Float32Array<ArrayBuffer> {
  const n = 1024;
  const curve = new Float32Array(new ArrayBuffer(n * 4));
  for (let i = 0; i < n; i++) {
    const x = (i / (n - 1)) * 2 - 1;
    curve[i] = ((1 + amount) * x) / (1 + amount * Math.abs(x));
  }
  return curve;
}

function audio(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return null;
    ctx = new Ctor();
    master = ctx.createGain();
    master.gain.value = 0.75;
    const comp = ctx.createDynamicsCompressor();
    master.connect(comp).connect(ctx.destination);
    // A short feedback delay some skins send their sounds through.
    echo = ctx.createDelay(1);
    echo.delayTime.value = 0.22;
    const feedback = ctx.createGain();
    feedback.gain.value = 0.38;
    echo.connect(feedback).connect(echo);
    echo.connect(master);
    hall = ctx.createConvolver();
    hall.buffer = hallImpulse(ctx, 3.2);
    const hallLevel = ctx.createGain();
    hallLevel.gain.value = 0.9;
    hall.connect(hallLevel).connect(master);
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
  /** Lowpass cutoff, optionally sweeping to `lowTo`. */
  low?: number;
  lowTo?: number;
  detune?: number;
  /** Also send through the echo bus. */
  wet?: boolean;
}

function tone(ac: AudioContext, { freq, to, type = "sine", start = 0, dur, vol = 0.3, attack = 0.005, low, lowTo, detune, wet }: ToneOpts) {
  const t = ac.currentTime + start;
  const osc = ac.createOscillator();
  const gain = ac.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t);
  if (detune) osc.detune.value = detune;
  if (to) osc.frequency.exponentialRampToValueAtTime(to, t + dur);
  gain.gain.setValueAtTime(0.0001, t);
  gain.gain.exponentialRampToValueAtTime(vol, t + attack);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  let source: AudioNode = osc;
  if (low) {
    const lp = ac.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.setValueAtTime(low, t);
    if (lowTo) lp.frequency.exponentialRampToValueAtTime(lowTo, t + dur);
    source = osc.connect(lp);
  }
  source.connect(gain).connect(master!);
  if (wet && echo) gain.connect(echo);
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
  wet?: boolean;
  /** Fade in instead of out, like a reversed sound. */
  swell?: boolean;
}

function noise(ac: AudioContext, { start = 0, dur, vol = 0.3, filter = "bandpass", freq, to, q = 1, wet, swell }: NoiseOpts) {
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
  if (swell) {
    gain.gain.exponentialRampToValueAtTime(vol, t + dur * 0.9);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  } else {
    gain.gain.exponentialRampToValueAtTime(vol, t + 0.004);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  }
  src.connect(bq).connect(gain).connect(master!);
  if (wet && echo) gain.connect(echo);
  src.start(t, Math.random() * 0.5);
  src.stop(t + dur + 0.02);
}

/* ---------- Cinematic blocks (used by Void) ---------- */

function toHall(node: AudioNode, amount: number) {
  if (!hall || !ctx) return;
  const send = ctx.createGain();
  send.gain.value = amount;
  node.connect(send).connect(hall);
}

/** Trailer "braam": stacked, detuned, overdriven saws with a filter that blooms then closes. */
function braam(ac: AudioContext, root: number, start = 0, dur = 1.4, vol = 0.22) {
  const t = ac.currentTime + start;
  const drive = ac.createWaveShaper();
  drive.curve = driveCurve(14);
  const lp = ac.createBiquadFilter();
  lp.type = "lowpass";
  lp.Q.value = 3;
  lp.frequency.setValueAtTime(180, t);
  lp.frequency.exponentialRampToValueAtTime(2600, t + 0.14);
  lp.frequency.exponentialRampToValueAtTime(260, t + dur);
  const gain = ac.createGain();
  gain.gain.setValueAtTime(0.0001, t);
  gain.gain.exponentialRampToValueAtTime(vol, t + 0.05);
  gain.gain.exponentialRampToValueAtTime(vol * 0.6, t + dur * 0.5);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  for (const mult of [1, 1.5, 2, 3]) {
    for (const det of [-14, 0, 14]) {
      const osc = ac.createOscillator();
      osc.type = "sawtooth";
      osc.frequency.value = root * mult;
      osc.detune.value = det;
      osc.connect(drive);
      osc.start(t);
      osc.stop(t + dur + 0.05);
    }
  }
  drive.connect(lp).connect(gain).connect(master!);
  toHall(gain, 0.6);
  tone(ac, { freq: root / 2, type: "sine", dur, vol: vol * 1.6, start, attack: 0.02 });
}

/** A heavy hit: falling sub, crunchy body, and a burst of air. */
function impact(ac: AudioContext, start = 0, vol = 0.5) {
  tone(ac, { freq: 160, to: 36, type: "sine", dur: 0.9, vol, start, attack: 0.002 });
  tone(ac, { freq: 320, to: 80, type: "triangle", dur: 0.35, vol: vol * 0.6, start, attack: 0.002 });
  noise(ac, { dur: 0.7, vol: vol * 0.8, filter: "lowpass", freq: 3500, to: 120, start });
  if (ctx && hall) {
    const g = ac.createGain();
    g.gain.value = 0;
    const t = ac.currentTime + start;
    const src = ac.createBufferSource();
    src.buffer = noiseBuffer;
    const bp = ac.createBiquadFilter();
    bp.type = "lowpass";
    bp.frequency.value = 1800;
    g.gain.setValueAtTime(vol * 0.5, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.25);
    src.connect(bp).connect(g);
    toHall(g, 1);
    src.start(t);
    src.stop(t + 0.3);
  }
}

/** Rising tension: hiss and a pitch that climb into the next hit. */
function riser(ac: AudioContext, dur: number, start = 0, vol = 0.3) {
  noise(ac, { dur, vol, freq: 400, to: 6000, q: 0.8, swell: true, start });
  const t = ac.currentTime + start;
  const osc = ac.createOscillator();
  osc.type = "sawtooth";
  osc.frequency.setValueAtTime(110, t);
  osc.frequency.exponentialRampToValueAtTime(880, t + dur);
  const lp = ac.createBiquadFilter();
  lp.type = "lowpass";
  lp.frequency.setValueAtTime(300, t);
  lp.frequency.exponentialRampToValueAtTime(4000, t + dur);
  const g = ac.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol * 0.35, t + dur * 0.95);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur + 0.02);
  osc.connect(lp).connect(g).connect(master!);
  toHall(g, 0.4);
  osc.start(t);
  osc.stop(t + dur + 0.05);
}

/** Dark "aah" choir: detuned saws through vowel formants, swelling in and out. */
function choir(ac: AudioContext, freqs: number[], start = 0, dur = 2, vol = 0.12) {
  const t = ac.currentTime + start;
  const out = ac.createGain();
  out.gain.setValueAtTime(0.0001, t);
  out.gain.exponentialRampToValueAtTime(vol, t + Math.min(0.5, dur * 0.4));
  out.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  const f1 = ac.createBiquadFilter();
  f1.type = "bandpass";
  f1.frequency.value = 750;
  f1.Q.value = 3;
  const f2 = ac.createBiquadFilter();
  f2.type = "bandpass";
  f2.frequency.value = 1150;
  f2.Q.value = 4;
  const mix = ac.createGain();
  mix.gain.value = 3;
  for (const f of freqs) {
    for (const det of [-10, 0, 10]) {
      const osc = ac.createOscillator();
      osc.type = "sawtooth";
      osc.frequency.value = f;
      osc.detune.value = det;
      osc.connect(f1);
      osc.connect(f2);
      osc.start(t);
      osc.stop(t + dur + 0.05);
    }
  }
  f1.connect(mix);
  f2.connect(mix);
  mix.connect(out).connect(master!);
  toHall(out, 0.9);
}

/* ---------- Skin voices: each skin swaps in its own take on the card sounds ---------- */

type Voice = Partial<Record<Sfx, (ac: AudioContext, step: number) => void>>;

const note = (base: number, semis: number) => base * Math.pow(2, semis / 12);
/** Pentatonic in a Japanese mode, for Sakura. */
const PENTA = [587.33, 698.46, 783.99, 880, 1046.5, 1174.66, 1396.91, 1567.98, 1760, 2093];
/** Natural minor, for Void. */
const MINOR = [0, 2, 3, 5, 7, 8, 10, 12, 14, 15, 17];

const pluck = (ac: AudioContext, f: number, start = 0, vol = 0.18) => {
  tone(ac, { freq: f, type: "triangle", dur: 0.55, vol, attack: 0.003, start });
  tone(ac, { freq: f * 2, type: "sine", dur: 0.25, vol: vol * 0.35, attack: 0.003, start });
};
const clink = (ac: AudioContext, f: number, start = 0, vol = 0.15) => {
  tone(ac, { freq: f, type: "sine", dur: 0.35, vol, attack: 0.002, start });
  tone(ac, { freq: f * 2.76, type: "sine", dur: 0.18, vol: vol * 0.5, attack: 0.002, start });
};
const saw = (ac: AudioContext, f: number, dur: number, vol: number, start = 0, low = 5000) => {
  tone(ac, { freq: f, type: "sawtooth", dur, vol, start, low, lowTo: 1400, detune: -9 });
  tone(ac, { freq: f, type: "sawtooth", dur, vol, start, low, lowTo: 1400, detune: 9 });
};
const chip8 = (ac: AudioContext, f: number, start = 0, dur = 0.07, vol = 0.11) =>
  tone(ac, { freq: f, type: "square", dur, vol, start, attack: 0.001 });

const VOICES: Record<SkinId, Voice> = {
  classic: {},
  blueprint: {
    select: (ac) => {
      chip8(ac, 1500, 0, 0.03);
      chip8(ac, 2200, 0.03, 0.03);
    },
    deselect: (ac) => chip8(ac, 1100, 0, 0.04),
    deal: (ac) => noise(ac, { dur: 0.03, vol: 0.16, filter: "highpass", freq: 5000 }),
    discard: (ac) => [880, 660, 440].forEach((f, i) => chip8(ac, f, i * 0.04, 0.04)),
    play: (ac) => {
      noise(ac, { dur: 0.16, vol: 0.3, freq: 1200, q: 8 });
      chip8(ac, 220, 0, 0.12, 0.1);
      chip8(ac, 330, 0.05, 0.1, 0.08);
    },
    flip: (ac) => {
      chip8(ac, 1800, 0, 0.02, 0.05);
      noise(ac, { dur: 0.02, vol: 0.12, filter: "highpass", freq: 4000 });
    },
    chip: (ac, step) => chip8(ac, note(880, Math.min(step, 14))),
    stamp: (ac) => {
      chip8(ac, 110, 0, 0.1, 0.12);
      noise(ac, { dur: 0.08, vol: 0.25, filter: "lowpass", freq: 900 });
    },
    combo: (ac, step) =>
      [523, 659, 784, 1047, 1319, 1568].slice(0, 2 + Math.ceil(step * 0.6)).forEach((f, i) => chip8(ac, f, i * 0.06, 0.08)),
    joker: (ac) => [784, 988, 1175, 1568].forEach((f, i) => chip8(ac, f, i * 0.05, 0.06)),
    win: (ac) => {
      [523, 523, 784, 1047, 988, 1047].forEach((f, i) => chip8(ac, f, i * 0.12, i === 5 ? 0.5 : 0.1, 0.08));
      tone(ac, { freq: 131, type: "triangle", dur: 0.9, vol: 0.15, start: 0.6 });
    },
  },
  sakura: {
    select: (ac) => pluck(ac, 1567.98, 0, 0.15),
    deselect: (ac) => pluck(ac, 1174.66, 0, 0.12),
    deal: (ac) => noise(ac, { dur: 0.12, vol: 0.08, freq: 3000, q: 0.5 }),
    discard: (ac) => noise(ac, { dur: 0.35, vol: 0.12, freq: 2500, to: 600, q: 0.4 }),
    play: (ac) => {
      noise(ac, { dur: 0.45, vol: 0.14, freq: 800, to: 2600, q: 0.6 });
      [2349, 3136, 2637].forEach((f, i) => tone(ac, { freq: f, type: "sine", dur: 0.6, vol: 0.05, start: 0.08 + i * 0.07 }));
    },
    flip: (ac) => pluck(ac, 2093, 0, 0.06),
    chip: (ac, step) => pluck(ac, PENTA[Math.min(step, PENTA.length - 1)], 0, 0.11),
    stamp: (ac) => {
      tone(ac, { freq: 90, to: 55, type: "sine", dur: 0.35, vol: 0.5 });
      noise(ac, { dur: 0.12, vol: 0.25, filter: "lowpass", freq: 600 });
    },
    combo: (ac, step) => PENTA.slice(0, 3 + step).forEach((f, i) => pluck(ac, f, i * 0.07, 0.1)),
    joker: (ac) => [1174.66, 1396.91, 1760, 2093].forEach((f, i) => pluck(ac, f, i * 0.06, 0.08)),
    win: (ac) => {
      [587.33, 698.46, 880, 1046.5, 880, 1174.66].forEach((f, i) => pluck(ac, f, i * 0.16, 0.14));
      tone(ac, { freq: 146.83, type: "sine", dur: 1.4, vol: 0.18, start: 0.8 });
    },
  },
  neon: {
    select: (ac) => {
      tone(ac, { freq: 700, to: 2100, type: "square", dur: 0.07, vol: 0.12 });
      tone(ac, { freq: 2100, type: "sine", dur: 0.06, vol: 0.08, start: 0.05 });
    },
    deselect: (ac) => tone(ac, { freq: 2100, to: 700, type: "square", dur: 0.07, vol: 0.1 }),
    deal: (ac) => tone(ac, { freq: 3200, to: 1600, type: "square", dur: 0.03, vol: 0.06 }),
    discard: (ac) => tone(ac, { freq: 1600, to: 200, type: "sawtooth", dur: 0.25, vol: 0.16, low: 6000, lowTo: 600 }),
    play: (ac) => {
      tone(ac, { freq: 1800, to: 300, type: "square", dur: 0.15, vol: 0.14 });
      tone(ac, { freq: 220, to: 55, type: "sawtooth", dur: 0.35, vol: 0.3, low: 2500, lowTo: 400 });
      noise(ac, { dur: 0.12, vol: 0.28, filter: "highpass", freq: 3000 });
    },
    flip: (ac) => tone(ac, { freq: 2600, to: 1300, type: "square", dur: 0.05, vol: 0.09 }),
    chip: (ac, step) => {
      const f = note(440, Math.min(step, 14) + 12);
      saw(ac, f, 0.16, 0.1);
      tone(ac, { freq: f, type: "square", dur: 0.08, vol: 0.05 });
    },
    stamp: (ac) => {
      saw(ac, 220, 0.18, 0.16, 0, 3000);
      noise(ac, { dur: 0.1, vol: 0.22, freq: 1500, q: 1 });
    },
    combo: (ac, step) => {
      [0, 4, 7, 11].forEach((s) => saw(ac, note(523.25, s + (step >= 5 ? 12 : 0)), 0.55, 0.09));
      [0, 4, 7, 12, 16].slice(0, 2 + Math.ceil(step * 0.4)).forEach((s, i) =>
        tone(ac, { freq: note(1046.5, s), type: "square", dur: 0.08, vol: 0.06, start: 0.1 + i * 0.06 }),
      );
      if (step >= 5) tone(ac, { freq: 110, to: 55, type: "sawtooth", dur: 0.6, vol: 0.25, low: 1200 });
    },
    joker: (ac) => [0, 7, 12, 19].forEach((s, i) => saw(ac, note(523.25, s), 0.2, 0.08, i * 0.05)),
    win: (ac) => {
      [0, 4, 7, 12, 7, 4, 7, 12, 16].forEach((s, i) => saw(ac, note(523.25, s), 0.14, 0.09, i * 0.1));
      [0, 4, 7].forEach((s) => saw(ac, note(261.63, s), 1.4, 0.08, 0.9, 3000));
      noise(ac, { dur: 0.15, vol: 0.25, filter: "highpass", freq: 3000, start: 0.9 });
    },
  },
  gold: {
    select: (ac) => clink(ac, 2093, 0, 0.13),
    deselect: (ac) => clink(ac, 1568, 0, 0.1),
    deal: (ac) => clink(ac, 3136, 0, 0.06),
    discard: (ac) => [2637, 2093, 1568].forEach((f, i) => clink(ac, f, i * 0.05, 0.05)),
    play: (ac) => {
      for (let i = 0; i < 7; i++) clink(ac, 2000 + Math.random() * 2000, i * 0.035, 0.05);
      noise(ac, { dur: 0.25, vol: 0.12, filter: "highpass", freq: 3000 });
    },
    flip: (ac) => clink(ac, 2637, 0, 0.05),
    chip: (ac, step) => clink(ac, note(1046.5, Math.min(step, 14)), 0, 0.08),
    stamp: (ac) => clink(ac, 523.25, 0, 0.14),
    combo: (ac, step) =>
      [523.25, 659.25, 783.99, 1046.5, 1318.5, 1568].slice(0, 2 + Math.ceil(step * 0.6)).forEach((f, i) => clink(ac, f, i * 0.07, 0.1)),
    joker: (ac) => [1568, 2093, 2637, 3136].forEach((f, i) => clink(ac, f, i * 0.05, 0.06)),
    win: (ac) => {
      [392, 523.25, 659.25, 783.99, 659.25, 783.99].forEach((f, i) =>
        tone(ac, { freq: f, type: "sawtooth", dur: i === 5 ? 0.7 : 0.18, vol: 0.08, start: i * 0.14, low: 2200 }),
      );
      for (let i = 0; i < 8; i++) clink(ac, 2000 + Math.random() * 2500, 0.9 + i * 0.06, 0.05);
    },
  },
  void: {
    select: (ac) => {
      tone(ac, { freq: 196, to: 147, type: "triangle", dur: 0.18, vol: 0.28 });
      noise(ac, { dur: 0.05, vol: 0.18, filter: "highpass", freq: 3000 });
      tone(ac, { freq: 587, type: "sine", dur: 0.25, vol: 0.06, wet: true });
    },
    deselect: (ac) => tone(ac, { freq: 147, to: 110, type: "triangle", dur: 0.16, vol: 0.24 }),
    deal: (ac) => noise(ac, { dur: 0.14, vol: 0.22, filter: "lowpass", freq: 1400, to: 300 }),
    discard: (ac) => {
      riser(ac, 0.3, 0, 0.22);
      tone(ac, { freq: 120, to: 50, type: "sine", dur: 0.4, vol: 0.45, start: 0.3 });
    },
    play: (ac) => {
      riser(ac, 0.32, 0, 0.32);
      impact(ac, 0.32, 0.55);
      braam(ac, 55, 0.32, 1.3, 0.2);
    },
    flip: (ac) => {
      tone(ac, { freq: 110, to: 70, type: "sine", dur: 0.3, vol: 0.4 });
      tone(ac, { freq: 1760, type: "sine", dur: 0.4, vol: 0.04, wet: true });
    },
    chip: (ac, step) => {
      const f = note(220, MINOR[Math.min(step, MINOR.length - 1)]);
      tone(ac, { freq: f, type: "triangle", dur: 0.6, vol: 0.2, wet: true });
      tone(ac, { freq: f * 2.01, type: "sine", dur: 0.4, vol: 0.08 });
      tone(ac, { freq: 70, type: "sine", dur: 0.2, vol: 0.3 });
    },
    stamp: (ac) => {
      impact(ac, 0, 0.45);
      braam(ac, 65.4, 0, 0.8, 0.16);
    },
    combo: (ac, step) => {
      if (step >= 5) {
        riser(ac, 0.5, 0, 0.32);
        impact(ac, 0.5, 0.6);
        braam(ac, 49, 0.5, 2.2, 0.24);
        choir(ac, [220, 261.63, 329.63], 0.5, 2.4, 0.14);
        return;
      }
      choir(ac, [220, 261.63, 329.63].slice(0, 2 + Math.min(step, 1)), 0, 1.2, 0.11);
      tone(ac, { freq: 82, to: 41, type: "sine", dur: 0.6, vol: 0.4 });
    },
    joker: (ac) => {
      choir(ac, [293.66, 349.23, 440], 0, 1.4, 0.12);
      tone(ac, { freq: 1174.66, type: "sine", dur: 1, vol: 0.05, wet: true, start: 0.2 });
    },
    win: (ac) => {
      riser(ac, 0.7, 0, 0.32);
      impact(ac, 0.7, 0.6);
      braam(ac, 55, 0.7, 1.4, 0.22);
      braam(ac, 43.65, 1.9, 2, 0.22);
      choir(ac, [220, 261.63, 329.63, 440], 0.8, 3.2, 0.14);
    },
  },
};

let voice: SkinId = "classic";

/** The skin whose voice plays by default: your own. */
export function setSoundSkin(id: string) {
  voice = (id in VOICES ? id : "classic") as SkinId;
}

const lastPlayed = new Map<Sfx, number>();

/** `step` raises the pitch for counted sounds (scoring chips). `skin` overrides whose voice plays. */
export function play(sfx: Sfx, step = 0, skin?: string) {
  if (muted) return;
  const ac = audio();
  if (!ac) return;

  // Many cards dealt at once shouldn't stack into a roar.
  const now = performance.now();
  if (sfx === "deal" && now - (lastPlayed.get(sfx) ?? 0) < 45) return;
  lastPlayed.set(sfx, now);

  const custom = VOICES[(skin && skin in VOICES ? skin : voice) as SkinId][sfx];
  if (custom) {
    custom(ac, step);
    return;
  }

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
