/**
 * Процедурный звук на Web Audio API — без внешних аудиофайлов.
 */
let ctx: AudioContext | null = null;
let enabled = true;

export const setSoundEnabled = (v: boolean) => {
  enabled = v;
};

const getCtx = (): AudioContext | null => {
  if (!enabled) return null;
  try {
    if (!ctx) {
      const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
    }
    if (ctx.state === 'suspended') void ctx.resume();
    return ctx;
  } catch {
    return null;
  }
};

interface ToneOpts {
  freq: number;
  to?: number;
  type?: OscillatorType;
  dur: number;
  vol?: number;
  delay?: number;
}

const tone = ({ freq, to, type = 'sine', dur, vol = 0.08, delay = 0 }: ToneOpts) => {
  const c = getCtx();
  if (!c) return;
  const t = c.currentTime + delay;
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t);
  if (to) osc.frequency.exponentialRampToValueAtTime(to, t + dur);
  gain.gain.setValueAtTime(0.0001, t);
  gain.gain.exponentialRampToValueAtTime(vol, t + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  osc.connect(gain).connect(c.destination);
  osc.start(t);
  osc.stop(t + dur + 0.02);
};

const noiseClick = (vol = 0.05) => {
  const c = getCtx();
  if (!c) return;
  const len = Math.floor(c.sampleRate * 0.02);
  const buf = c.createBuffer(1, len, c.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 4);
  const src = c.createBufferSource();
  const filter = c.createBiquadFilter();
  const gain = c.createGain();
  filter.type = 'highpass';
  filter.frequency.value = 1800 + Math.random() * 1200;
  gain.gain.value = vol;
  src.buffer = buf;
  src.connect(filter).connect(gain).connect(c.destination);
  src.start();
};

export const sound = {
  /** тихий клик клавиши */
  click: () => noiseClick(0.06),
  /** новый входящий тикет */
  incoming: () => {
    tone({ freq: 880, dur: 0.09, type: 'square', vol: 0.03 });
    tone({ freq: 1320, dur: 0.12, type: 'square', vol: 0.03, delay: 0.1 });
  },
  /** правильное решение */
  success: () => {
    tone({ freq: 523, dur: 0.12, type: 'triangle', vol: 0.07 });
    tone({ freq: 659, dur: 0.12, type: 'triangle', vol: 0.07, delay: 0.08 });
    tone({ freq: 988, dur: 0.22, type: 'triangle', vol: 0.06, delay: 0.16 });
  },
  /** ошибка — низкий гудок */
  error: () => {
    tone({ freq: 140, to: 90, dur: 0.45, type: 'sawtooth', vol: 0.07 });
    tone({ freq: 146, to: 94, dur: 0.45, type: 'square', vol: 0.03 });
  },
  /** предупреждение (истекает таймер) */
  warn: () => tone({ freq: 620, dur: 0.07, type: 'square', vol: 0.025 }),
  /** эскалация */
  escalate: () => {
    tone({ freq: 440, to: 880, dur: 0.25, type: 'triangle', vol: 0.06 });
  },
  /** старт смены */
  boot: () => {
    tone({ freq: 220, to: 440, dur: 0.4, type: 'sine', vol: 0.06 });
    tone({ freq: 660, dur: 0.2, type: 'triangle', vol: 0.05, delay: 0.35 });
  },
};
