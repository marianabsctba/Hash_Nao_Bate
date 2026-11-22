// Sons sintetizados na hora (nada de arquivo de áudio).
let ctx: AudioContext | null = null;
function ac(): AudioContext | null {
  try {
    if (!ctx) ctx = new AudioContext();
    if (ctx.state === 'suspended') void ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}
function bip(freq: number, dur: number, tipo: OscillatorType = 'sine', vol = 0.06, atraso = 0) {
  const a = ac();
  if (!a) return;
  const o = a.createOscillator();
  const g = a.createGain();
  o.type = tipo;
  o.frequency.value = freq;
  const t = a.currentTime + atraso;
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(vol, t + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(a.destination);
  o.start(t);
  o.stop(t + dur + 0.02);
}
export const clique = () => bip(900, 0.04, 'square', 0.02);
export const ok = () => { bip(660, 0.12); bip(990, 0.16, 'sine', 0.05, 0.08); };
export const erro = () => { bip(220, 0.18, 'sawtooth', 0.04); bip(160, 0.22, 'sawtooth', 0.04, 0.1); };
export const zap = () => { bip(1320, 0.05, 'sine', 0.04); bip(1760, 0.07, 'sine', 0.03, 0.06); };
export const fala = () => bip(440, 0.06, 'triangle', 0.03);
export function foto() {
  const a = ac();
  if (!a) return;
  const n = a.createBufferSource();
  const b = a.createBuffer(1, a.sampleRate * 0.08, a.sampleRate);
  const d = b.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length);
  n.buffer = b;
  const g = a.createGain();
  g.gain.value = 0.08;
  n.connect(g).connect(a.destination);
  n.start();
}
