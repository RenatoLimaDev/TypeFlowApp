let audioCtx: AudioContext | null = null;
let soundEnabled = true;

export function initAudio(): void {
  if (!audioCtx) audioCtx = new AudioContext();
  if (audioCtx.state === "suspended") audioCtx.resume();
}

export function setSoundEnabled(val: boolean): void {
  soundEnabled = val;
}

export function isSoundEnabled(): boolean {
  return soundEnabled;
}

function getCtx(): AudioContext | null {
  if (!audioCtx) return null;
  if (audioCtx.state === "suspended") audioCtx.resume();
  return audioCtx;
}

interface ToneOpts {
  freq?: number;
  freq2?: number | null;
  type?: OscillatorType;
  attack?: number;
  decay?: number;
  sustain?: number;
  release?: number;
  volume?: number;
  filter?: number | null;
}

function tone(opts: ToneOpts = {}): void {
  if (!soundEnabled) return;
  const ctx = getCtx();
  if (!ctx) return;

  const {
    freq = 440, freq2 = null, type = "sine",
    attack = 0.002, decay = 0.06, sustain = 0,
    release = 0.04, volume = 0.18, filter = null,
  } = opts;

  const now = ctx.currentTime;
  const g = ctx.createGain();
  g.gain.setValueAtTime(0, now);
  g.gain.linearRampToValueAtTime(volume, now + attack);
  g.gain.linearRampToValueAtTime(sustain * volume, now + attack + decay);
  g.gain.linearRampToValueAtTime(0, now + attack + decay + release);

  const dest = filter
    ? (() => { const f = ctx.createBiquadFilter(); f.type = "lowpass"; f.frequency.value = filter; f.connect(ctx.destination); return f; })()
    : ctx.destination;
  g.connect(dest);

  const osc = ctx.createOscillator();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, now);
  if (freq2) osc.frequency.linearRampToValueAtTime(freq2, now + attack + decay);
  osc.connect(g);
  osc.start(now);
  osc.stop(now + attack + decay + release + 0.01);
}

interface NoiseOpts {
  dur?: number;
  vol?: number;
  freq?: number;
}

function noise(opts: NoiseOpts = {}): void {
  if (!soundEnabled) return;
  const ctx = getCtx();
  if (!ctx) return;

  const { dur = 0.018, vol = 0.07, freq = 3000 } = opts;
  const now = ctx.currentTime;
  const buf = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * dur), ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;

  const src = ctx.createBufferSource();
  src.buffer = buf;
  const flt = ctx.createBiquadFilter();
  flt.type = "bandpass";
  flt.frequency.value = freq;
  flt.Q.value = 0.8;
  const g = ctx.createGain();
  g.gain.setValueAtTime(vol, now);
  g.gain.exponentialRampToValueAtTime(0.0001, now + dur);
  src.connect(flt); flt.connect(g); g.connect(ctx.destination);
  src.start(now); src.stop(now + dur);
}

export const sounds = {
  key(): void {
    const v = (Math.random() - 0.5) * 40;
    tone({ freq: 520 + v, type: "triangle", attack: 0.001, decay: 0.028, release: 0.02, volume: 0.12, filter: 4200 });
    noise({ dur: 0.012, vol: 0.055, freq: 3800 + v });
  },
  backspace(): void {
    tone({ freq: 320, type: "triangle", attack: 0.001, decay: 0.035, release: 0.025, volume: 0.10, filter: 2800 });
    noise({ dur: 0.014, vol: 0.04, freq: 2200 });
  },
  enter(): void {
    tone({ freq: 280, freq2: 180, type: "triangle", attack: 0.002, decay: 0.07, release: 0.06, volume: 0.20, filter: 3000 });
    noise({ dur: 0.022, vol: 0.09, freq: 1800 });
  },
  commit(): void {
    [0, 60, 120].forEach((delay, i) =>
      setTimeout(() => tone({ freq: [440, 554, 659][i], type: "sine", attack: 0.005, decay: 0.12, sustain: 0.1, release: 0.18, volume: 0.10 }), delay)
    );
  },
  toggle(on: boolean): void {
    tone({ freq: on ? 660 : 330, type: "sine", attack: 0.005, decay: 0.08, release: 0.06, volume: 0.15 });
  },
};
