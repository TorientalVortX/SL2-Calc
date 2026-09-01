/**
 * Menu sound effects, synthesised rather than shipped.
 *
 * Four short cues, built from oscillators and a decaying gain envelope, so the
 * app carries no audio assets and works offline. The context is created on the
 * first cue rather than at import: browsers refuse to start one before a user
 * gesture, and a suspended context created eagerly would stay suspended.
 */

export type Cue = 'move' | 'select' | 'confirm' | 'back' | 'deny' | 'sigil';

interface Voice {
  /** Start and end frequency in Hz; equal values hold a steady tone. */
  from: number;
  to: number;
  duration: number;
  gain: number;
  type: OscillatorType;
  /** Seconds to wait before this voice sounds, for two-part cues. */
  delay?: number;
}

const CUES: Record<Cue, Voice[]> = {
  move: [{ from: 1320, to: 1320, duration: 0.05, gain: 0.05, type: 'triangle' }],
  select: [
    { from: 880, to: 1320, duration: 0.07, gain: 0.07, type: 'triangle' },
    { from: 1760, to: 1760, duration: 0.09, gain: 0.03, type: 'sine', delay: 0.03 },
  ],
  confirm: [
    { from: 660, to: 990, duration: 0.1, gain: 0.07, type: 'triangle' },
    { from: 1320, to: 1980, duration: 0.16, gain: 0.04, type: 'sine', delay: 0.05 },
  ],
  back: [{ from: 520, to: 330, duration: 0.11, gain: 0.06, type: 'triangle' }],
  deny: [{ from: 220, to: 180, duration: 0.16, gain: 0.07, type: 'sawtooth' }],
  // The intro's crest landing: a root, its fifth and its octave, struck together
  // and left to ring. Long enough to carry the title reveal that follows it.
  sigil: [
    { from: 392, to: 392, duration: 1.8, gain: 0.09, type: 'triangle' },
    { from: 587.33, to: 587.33, duration: 1.6, gain: 0.06, type: 'sine', delay: 0.02 },
    { from: 784, to: 784, duration: 2.2, gain: 0.05, type: 'sine', delay: 0.05 },
    { from: 1174.66, to: 1174.66, duration: 1.4, gain: 0.025, type: 'sine', delay: 0.09 },
  ],
};

/** Where the on/off preference lives. Owned here so nothing else has to know. */
export const AUDIO_PREFS_KEY = 'sl2:aether:prefs:v1';

let context: AudioContext | null = null;
let master: GainNode | null = null;

/*
 * Read at module load rather than waiting to be told.
 *
 * The intro plays its swell from a child effect, which React runs *before* the
 * parent effect that would otherwise have pushed the stored preference down,
 * so a returning visitor with sound on got a silent overture.
 */
let enabled = (() => {
  try {
    return JSON.parse(localStorage.getItem(AUDIO_PREFS_KEY) ?? '{}').sound === true;
  } catch {
    return false;
  }
})();

function ensureContext(): AudioContext | null {
  if (context) return context;
  const Constructor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Constructor) return null;
  try {
    context = new Constructor();
    master = context.createGain();
    master.gain.value = 0.5;
    master.connect(context.destination);
    return context;
  } catch {
    // No audio device, or the browser refused the context. Silence is a fine
    // outcome for decorative sound; nothing else in the app depends on it.
    return null;
  }
}

export function setAudioEnabled(value: boolean): void {
  enabled = value;
  if (value) void ensureContext()?.resume();
}

export function isAudioEnabled(): boolean {
  return enabled;
}

/**
 * The intro's rising pad: two slightly detuned voices under a slow low-pass
 * sweep, so the swell brightens as the swarm gathers rather than just getting
 * louder.
 *
 * Returns a stop function. Nothing else in the app holds a note open, so the
 * caller owns the lifetime; an intro that is skipped has to be able to cut it.
 */
export function playSwell(duration: number): () => void {
  if (!enabled) return () => undefined;
  const ctx = ensureContext();
  if (!ctx || !master) return () => undefined;
  if (ctx.state === 'suspended') void ctx.resume();

  const now = ctx.currentTime;
  const gain = ctx.createGain();
  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(220, now);
  filter.frequency.linearRampToValueAtTime(2400, now + duration * 0.85);
  filter.Q.value = 0.8;

  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(0.075, now + duration * 0.8);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + duration + 0.6);

  const voices = [98, 98.6, 146.83].map((frequency, index) => {
    const oscillator = ctx.createOscillator();
    oscillator.type = index === 2 ? 'triangle' : 'sawtooth';
    oscillator.frequency.setValueAtTime(frequency, now);
    oscillator.connect(filter);
    oscillator.start(now);
    oscillator.stop(now + duration + 0.8);
    return oscillator;
  });

  filter.connect(gain);
  gain.connect(master);

  return () => {
    const stopAt = ctx.currentTime;
    gain.gain.cancelScheduledValues(stopAt);
    gain.gain.setValueAtTime(Math.max(gain.gain.value, 0.0001), stopAt);
    gain.gain.exponentialRampToValueAtTime(0.0001, stopAt + 0.35);
    for (const oscillator of voices) oscillator.stop(stopAt + 0.4);
  };
}

export function play(cue: Cue): void {
  if (!enabled) return;
  const ctx = ensureContext();
  if (!ctx || !master) return;
  if (ctx.state === 'suspended') void ctx.resume();

  const now = ctx.currentTime;
  for (const voice of CUES[cue]) {
    const start = now + (voice.delay ?? 0);
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();
    oscillator.type = voice.type;
    oscillator.frequency.setValueAtTime(voice.from, start);
    if (voice.to !== voice.from) oscillator.frequency.exponentialRampToValueAtTime(voice.to, start + voice.duration);
    // A 1ms attack keeps the click off the front of the envelope.
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(voice.gain, start + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + voice.duration);
    oscillator.connect(gain);
    gain.connect(master);
    oscillator.start(start);
    oscillator.stop(start + voice.duration + 0.02);
  }
}
