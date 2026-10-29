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

/* ---------- Clean cinematic blocks for Void: no noise, no distortion ---------- */

function toHall(node: AudioNode, amount: number) {
  if (!hall || !ctx) return;
  const send = ctx.createGain();
  send.gain.value = amount;
  node.connect(send).connect(hall);
}

/** One voice with an envelope, optional lowpass, and a send to the hall. */
function layer(
  ac: AudioContext,
  o: { freq: number; to?: number; type?: OscillatorType; start?: number; attack?: number; dur: number; vol: number; detune?: number; low?: number; hallSend?: number },
) {
  const t = ac.currentTime + (o.start ?? 0);
  const osc = ac.createOscillator();
  osc.type = o.type ?? "sine";
  osc.frequency.setValueAtTime(o.freq, t);
  if (o.to) osc.frequency.exponentialRampToValueAtTime(o.to, t + Math.min(o.dur, 0.25));
  if (o.detune) osc.detune.value = o.detune;
  const g = ac.createGain();
  const attack = o.attack ?? 0.004;
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(o.vol, t + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t + o.dur);
  let src: AudioNode = osc;
  if (o.low) {
    const lp = ac.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.value = o.low;
    lp.Q.value = 0.7;
    src = osc.connect(lp);
  }
  src.connect(g).connect(master!);
  if (o.hallSend) toHall(g, o.hallSend);
  osc.start(t);
  osc.stop(t + o.dur + 0.05);
}

/** Timpani: a pitch that settles, with a soft overtone. */
function timpani(ac: AudioContext, f: number, start = 0, vol = 0.5) {
  layer(ac, { freq: f * 1.4, to: f, start, dur: 1.1, vol, hallSend: 0.5 });
  layer(ac, { freq: f * 2.02, start, dur: 0.35, vol: vol * 0.35, type: "triangle", hallSend: 0.3 });
}

/** Low strings: pairs of gently detuned saws, rounded off by a lowpass. */
function strings(ac: AudioContext, freqs: number[], start = 0, dur = 1.5, vol = 0.07) {
  for (const f of freqs) {
    for (const d of [-7, 7]) layer(ac, { freq: f, type: "sawtooth", detune: d, start, attack: 0.18, dur, vol, low: 1300, hallSend: 0.6 });
  }
}

/** Bell: the partials of a struck bell, each fading at its own pace. */
function bell(ac: AudioContext, f: number, start = 0, vol = 0.12) {
  layer(ac, { freq: f, start, dur: 1.8, vol, hallSend: 0.6 });
  layer(ac, { freq: f * 2, start, dur: 1.1, vol: vol * 0.5, hallSend: 0.4 });
  layer(ac, { freq: f * 2.76, start, dur: 0.7, vol: vol * 0.35 });
  layer(ac, { freq: f * 5.4, start, dur: 0.3, vol: vol * 0.15 });
}





/** Soft choir pad: stacked sines and triangles, slow in, slow out. */
function choirPad(ac: AudioContext, freqs: number[], start = 0, dur = 2, vol = 0.06) {
  for (const f of freqs) {
    for (const d of [-6, 6]) layer(ac, { freq: f, type: "triangle", detune: d, start, attack: Math.min(0.5, dur * 0.35), dur, vol, hallSend: 0.8 });
    layer(ac, { freq: f * 2, start, attack: Math.min(0.5, dur * 0.35), dur, vol: vol * 0.4, hallSend: 0.8 });
  }
}

const A_MIN = [220, 261.63, 329.63];
const F_MAJ = [174.61, 220, 261.63];
const E_MAJ = [164.81, 207.65, 246.94];

/** Void: a dark orchestra (timpani, low strings, bells, choir). */
const VOID_VOICE: Voice = {
  select: (ac) => layer(ac, { freq: 440, type: "triangle", dur: 0.25, vol: 0.2, hallSend: 0.3 }),
  deselect: (ac) => layer(ac, { freq: 330, type: "triangle", dur: 0.2, vol: 0.16 }),
  deal: (ac) => layer(ac, { freq: 1320, dur: 0.05, vol: 0.06 }),
  discard: (ac) => {
    layer(ac, { freq: 330, to: 220, type: "triangle", dur: 0.3, vol: 0.18 });
    timpani(ac, 98, 0.15, 0.3);
  },
  play: (ac) => {
    timpani(ac, 65.4, 0, 0.6);
    strings(ac, [110, 164.81, 220], 0, 1.4, 0.07);
    bell(ac, 440, 0.05, 0.08);
  },
  flip: (ac) => layer(ac, { freq: 392, type: "triangle", dur: 0.18, vol: 0.18, hallSend: 0.3 }),
  chip: (ac, step) => bell(ac, note(440, MINOR[Math.min(step, MINOR.length - 1)]), 0, 0.13),
  stamp: (ac) => timpani(ac, 82.4, 0, 0.55),
  combo: (ac, step) => {
    if (step >= 5) {
      [0, 0.12, 0.24, 0.36].forEach((t, i) => timpani(ac, 55, t, 0.3 + i * 0.08));
      strings(ac, A_MIN.map((f) => f / 2).concat(A_MIN), 0.4, 2.2, 0.06);
      choirPad(ac, A_MIN, 0.4, 2.4, 0.06);
      return;
    }
    strings(ac, A_MIN, 0, 1, 0.06);
    bell(ac, 880, 0, 0.08);
  },
  joker: (ac) => choirPad(ac, [293.66, 349.23, 440], 0, 1.4, 0.07),
  win: (ac) => {
    timpani(ac, 55, 0, 0.6);
    strings(ac, A_MIN, 0, 1.1, 0.07);
    strings(ac, F_MAJ, 1.0, 1.1, 0.07);
    strings(ac, E_MAJ, 2.0, 1.6, 0.07);
    timpani(ac, 41.2, 2.0, 0.55);
    [880, 1046.5, 1318.5, 1760].forEach((f, i) => bell(ac, f, 0.2 + i * 0.25, 0.07));
    choirPad(ac, A_MIN, 0.3, 3.2, 0.05);
  },
};

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
  void: VOID_VOICE,
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
