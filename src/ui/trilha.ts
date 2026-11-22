// Trilha sonora por fase, com troca suave. Músicas CC0 e CC-BY do OpenGameArt (créditos no README e na tela de créditos).
const BASE = `${import.meta.env.BASE_URL}som/`;
export type Faixa = 'capa' | 'chamado' | 'cena' | 'custodia' | 'lab' | 'tensao' | 'audiencia' | 'fim';
const ARQ: Record<Faixa, string> = {
  capa: 'capa.mp3', chamado: 'chamado.ogg', cena: 'cena.mp3', custodia: 'custodia.ogg', lab: 'lab.mp3', tensao: 'tensao.mp3', audiencia: 'audiencia.mp3', fim: 'fim.mp3',
};
const VOL: Record<Faixa, number> = { capa: 0.5, chamado: 0.35, cena: 0.32, custodia: 0.3, lab: 0.22, tensao: 0.3, audiencia: 0.35, fim: 0.4 };

let atual: { faixa: Faixa; el: HTMLAudioElement } | null = null;
let mudo = (() => { try { return localStorage.getItem('hnb.mudo') === '1'; } catch { return false; } })();
let pendente: Faixa | null = null;

function fade(el: HTMLAudioElement, alvo: number, ms: number, fim?: () => void) {
  const ini = el.volume;
  const t0 = performance.now();
  const passo = () => {
    const k = Math.min(1, (performance.now() - t0) / ms);
    el.volume = Math.max(0, Math.min(1, ini + (alvo - ini) * k));
    if (k < 1) requestAnimationFrame(passo);
    else fim?.();
  };
  passo();
}

export function tocar(f: Faixa) {
  if (atual?.faixa === f) return;
  pendente = f;
  if (mudo) return;
  const velho = atual;
  const el = new Audio(BASE + ARQ[f] + `?v=${__VERSAO__}`);
  el.loop = true;
  el.volume = 0;
  atual = { faixa: f, el };
  // navegador só toca depois de um clique; se recusar, tenta de novo no próximo
  el.play().then(() => fade(el, VOL[f], 1500)).catch(() => { atual = velho?.faixa === f ? velho : null; });
  if (velho) fade(velho.el, 0, 1200, () => velho.el.pause());
}

addEventListener('pointerdown', () => { if (pendente && !mudo && (!atual || atual.el.paused)) { const f = pendente; atual = null; tocar(f); } });

export function alternarMudo(): boolean {
  mudo = !mudo;
  try { localStorage.setItem('hnb.mudo', mudo ? '1' : '0'); } catch { /* sem armazenamento */ }
  if (mudo && atual) { atual.el.pause(); atual = null; }
  else if (!mudo && pendente) tocar(pendente);
  return mudo;
}
export const estaMudo = () => mudo;
