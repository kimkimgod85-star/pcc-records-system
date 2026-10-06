const SOUND_KEY = 'pcc-admin-alert-sound';
const SOUND_EVENT = 'pcc-admin-alert-sound-changed';

type AudioContextClass = typeof AudioContext;
let context: AudioContext | null = null;

function getContext() {
  if (context) return context;
  const Ctor: AudioContextClass | undefined =
    window.AudioContext || (window as unknown as { webkitAudioContext?: AudioContextClass }).webkitAudioContext;
  if (!Ctor) return null;
  context = new Ctor();
  return context;
}

/** Browsers keep audio muted until the user interacts with the page once. */
export function unlockChime() {
  const ctx = getContext();
  if (ctx && ctx.state === 'suspended') void ctx.resume();
}

export function isAlertSoundOn() {
  try {
    return localStorage.getItem(SOUND_KEY) !== 'off';
  } catch {
    return true;
  }
}

export function setAlertSound(on: boolean) {
  try {
    localStorage.setItem(SOUND_KEY, on ? 'on' : 'off');
  } catch {
    /* ignore */
  }
  window.dispatchEvent(new Event(SOUND_EVENT));
}

export function onAlertSoundChange(listener: () => void) {
  window.addEventListener(SOUND_EVENT, listener);
  return () => window.removeEventListener(SOUND_EVENT, listener);
}

/** One bell strike: a fundamental plus softer overtones, fading out like a struck chime. */
function bell(ctx: AudioContext, frequency: number, start: number, duration: number, volume: number) {
  const envelope = ctx.createGain();
  envelope.gain.setValueAtTime(0.0001, start);
  envelope.gain.exponentialRampToValueAtTime(volume, start + 0.012);
  envelope.gain.exponentialRampToValueAtTime(0.0001, start + duration);
  envelope.connect(ctx.destination);

  const partials: [number, number][] = [[1, 1], [2, 0.32], [2.76, 0.14], [5.4, 0.05]];
  partials.forEach(([ratio, level]) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = frequency * ratio;
    gain.gain.value = level;
    osc.connect(gain).connect(envelope);
    osc.start(start);
    osc.stop(start + duration + 0.05);
  });
}

/** Three-tone office announcement chime (ding-ding-dong), synthesized so no audio file is needed. */
export function playOfficeChime(force = false) {
  if (!force && !isAlertSoundOn()) return;
  const ctx = getContext();
  if (!ctx) return;
  if (ctx.state === 'suspended') void ctx.resume();
  const t = ctx.currentTime + 0.03;
  bell(ctx, 1046.5, t, 1.1, 0.22);
  bell(ctx, 830.6, t + 0.32, 1.3, 0.2);
  bell(ctx, 659.3, t + 0.64, 2.0, 0.22);
}
