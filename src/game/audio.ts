/** Jemné zvuky přes WebAudio — syntéza místo souborů (kromě Karlova hýkání).
 *  Kontext se odemkne až prvním gestem, ztlumení se pamatuje. */
import brayUrl from "../assets/audio/karel-hykani.mp3?url";

type Cue = "dice" | "step" | "card" | "gain" | "deliver" | "heart" | "thunder" | "rain" | "season" | "bray" | "click" | "fail" | "win";

const KEY = "nz.mute";
let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let muted = (() => {
  try {
    return localStorage.getItem(KEY) === "1";
  } catch {
    return false;
  }
})();
let bray: HTMLAudioElement | null = null;

function ac(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    const C = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!C) return null;
    ctx = new C();
    master = ctx.createGain();
    master.gain.value = muted ? 0 : 0.55;
    master.connect(ctx.destination);
  }
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
}

export const isMuted = () => muted;
export function setMuted(v: boolean) {
  muted = v;
  try {
    localStorage.setItem(KEY, v ? "1" : "0");
  } catch {
    /* úložiště nemusí být dostupné */
  }
  if (master) master.gain.value = v ? 0 : 0.55;
}

function tone(freq: number, dur: number, type: OscillatorType = "sine", vol = 0.2, at = 0, slide?: number) {
  const c = ac();
  if (!c || !master) return;
  const t0 = c.currentTime + at;
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t0);
  if (slide) o.frequency.exponentialRampToValueAtTime(slide, t0 + dur);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(vol, t0 + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  o.connect(g).connect(master);
  o.start(t0);
  o.stop(t0 + dur + 0.02);
}

function noise(dur: number, vol = 0.2, at = 0, filter = 1800, q = 0.7) {
  const c = ac();
  if (!c || !master) return;
  const t0 = c.currentTime + at;
  const len = Math.max(1, Math.floor(c.sampleRate * dur));
  const buf = c.createBuffer(1, len, c.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
  const src = c.createBufferSource();
  src.buffer = buf;
  const f = c.createBiquadFilter();
  f.type = "bandpass";
  f.frequency.value = filter;
  f.Q.value = q;
  const g = c.createGain();
  g.gain.value = vol;
  src.connect(f).connect(g).connect(master);
  src.start(t0);
}

export function play(cue: Cue) {
  if (muted) return;
  switch (cue) {
    case "dice":
      for (let i = 0; i < 6; i++) noise(0.05, 0.25, i * 0.06 + Math.random() * 0.02, 2600 + Math.random() * 1500, 2);
      break;
    case "step":
      tone(220, 0.08, "triangle", 0.12, 0, 160);
      break;
    case "card":
      noise(0.18, 0.18, 0, 4200, 0.5);
      break;
    case "gain":
      tone(660, 0.12, "sine", 0.14);
      tone(990, 0.14, "sine", 0.1, 0.06);
      break;
    case "deliver":
      [523, 659, 784].forEach((f, i) => tone(f, 0.22, "triangle", 0.14, i * 0.08));
      break;
    case "heart":
      tone(880, 0.1, "sine", 0.1);
      tone(1175, 0.16, "sine", 0.08, 0.07);
      break;
    case "thunder":
      noise(1.6, 0.5, 0, 120, 0.4);
      noise(0.9, 0.3, 0.25, 80, 0.3);
      break;
    case "rain":
      for (let i = 0; i < 18; i++) noise(0.03, 0.06, i * 0.07, 5000, 3);
      break;
    case "season":
      [392, 523, 659, 784].forEach((f, i) => tone(f, 0.4, "sine", 0.1, i * 0.12));
      break;
    case "click":
      tone(1200, 0.03, "square", 0.04);
      break;
    case "fail":
      tone(330, 0.18, "triangle", 0.1, 0, 220);
      break;
    case "win":
      [523, 659, 784, 1046].forEach((f, i) => tone(f, 0.5, "triangle", 0.12, i * 0.14));
      break;
    case "bray":
      try {
        bray ??= new Audio(brayUrl);
        bray.volume = 0.7;
        bray.currentTime = 0;
        void bray.play();
      } catch {
        /* přehrávání může prohlížeč odmítnout */
      }
      break;
  }
}

/** Odemknutí zvuku prvním dotykem (iOS/Chrome autoplay). */
export function unlockAudioOnce() {
  const h = () => {
    ac();
    window.removeEventListener("pointerdown", h);
  };
  window.addEventListener("pointerdown", h);
}
