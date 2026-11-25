// Áudio procedural (Web Audio API): sem arquivos de som.
let ctx = null;
let muted = false;

// O navegador só libera áudio após um gesto do usuário; chamado a cada entrada.
export function ensureAudio() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (AC) ctx = new AC();
  }
  if (ctx && ctx.state === "suspended") ctx.resume();
}

function playTone(freq, endFreq, duration, type = "sine", vol = 0.12, delay = 0) {
  if (muted) return;
  ensureAudio();
  if (!ctx) return;
  const now = ctx.currentTime + delay;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, now);
  if (endFreq !== freq) osc.frequency.exponentialRampToValueAtTime(endFreq, now + duration);
  gain.gain.setValueAtTime(vol, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(now);
  osc.stop(now + duration);
}

export const sfx = {
  jump: () => playTone(260, 520, 0.14, "triangle", 0.11),
  seed: () => {
    playTone(587.33, 587.33, 0.09, "sine", 0.12, 0);
    playTone(880, 880, 0.16, "sine", 0.12, 0.07);
  },
  hit: () => playTone(190, 75, 0.25, "sawtooth", 0.12),
  win: () => {
    [523.25, 659.25, 783.99, 1046.5].forEach((note, i) => playTone(note, note, 0.18, "triangle", 0.12, i * 0.09));
  },
};

export const isMuted = () => muted;

export function toggleMute() {
  muted = !muted;
  if (!muted) sfx.jump();
  return muted;
}
