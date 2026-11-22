// O terminal na tela: prompt, histórico (setas), completar com Tab e cores ANSI.
import { COMANDOS, executarLinha, caminho } from '../motor/shell';
import type { Ctx } from '../motor/shell';
import { achar } from '../motor/vfs';

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
export function ansiHtml(s: string): string {
  const cores: Record<string, string> = { '31': 't-verm', '32': 't-verde', '33': 't-amar', '34': 't-azul', '35': 't-rosa', '36': 't-ciano', '1': 't-neg', '90': 't-cinza' };
  let out = '';
  let aberto = 0;
  for (const parte of s.split(/(\x1b\[[0-9;]*m)/)) {
    const m = parte.match(/^\x1b\[([0-9;]*)m$/);
    if (m) {
      if (m[1] === '0' || m[1] === '') { out += '</span>'.repeat(aberto); aberto = 0; }
      else { out += `<span class="${cores[m[1]] ?? ''}">`; aberto++; }
    } else out += esc(parte);
  }
  return out + '</span>'.repeat(aberto);
}

export interface Terminal {
  el: HTMLElement;
  escrever: (s: string) => void;
  rodar: (linha: string) => void;
  focar: () => void;
}

export function criarTerminal(ctx: Ctx, aoRodar?: (linha: string) => void): Terminal {
  const el = document.createElement('div');
  el.className = 'terminal';
  const saida = document.createElement('div');
  saida.className = 'term-saida';
  const linhaEl = document.createElement('div');
  linhaEl.className = 'term-linha';
  const prompt = document.createElement('span');
  prompt.className = 'term-prompt';
  const input = document.createElement('input');
  input.className = 'term-input';
  input.spellcheck = false;
  input.autocomplete = 'off';
  input.setAttribute('autocapitalize', 'off');
  input.setAttribute('aria-label', 'Linha de comando');
  linhaEl.append(prompt, input);
  el.append(saida, linhaEl);
  const atualizarPrompt = () => {
    const dir = ctx.cwd.replace(/^\/home\/perito/, '~') || '/';
    prompt.innerHTML = `<span class="t-verde">${ctx.usuario}@${ctx.host}</span>:<span class="t-azul">${esc(dir)}</span>$ `;
  };
  atualizarPrompt();
  const escrever = (s: string) => {
    const d = document.createElement('div');
    d.className = 'term-bloco';
    d.innerHTML = ansiHtml(s);
    saida.append(d);
    // não deixa a tela crescer para sempre
    while (saida.childElementCount > 600) saida.firstElementChild?.remove();
    el.scrollTop = el.scrollHeight;
  };
  let hist: string[] = [];
  let pos = 0;
  const rodar = (linha: string) => {
    escrever(prompt.textContent + linha);
    const r = executarLinha(linha, ctx);
    if (r === '\x00LIMPAR') saida.innerHTML = '';
    else if (r) escrever(r);
    atualizarPrompt();
    if (linha.trim()) hist.push(linha);
    hist = hist.slice(-200);
    pos = hist.length;
    aoRodar?.(linha);
    el.scrollTop = el.scrollHeight;
  };
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      const v = input.value;
      input.value = '';
      rodar(v);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (pos > 0) input.value = hist[--pos] ?? '';
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (pos < hist.length) input.value = hist[++pos] ?? '';
    } else if (e.key === 'Tab') {
      e.preventDefault();
      completar();
    } else if (e.key === 'l' && e.ctrlKey) {
      e.preventDefault();
      saida.innerHTML = '';
    } else if (e.key === 'c' && e.ctrlKey && !input.selectionStart && !getSelection()?.toString()) {
      escrever(prompt.textContent + input.value + '^C');
      input.value = '';
    }
  });
  function completar() {
    const v = input.value;
    const partes = v.split(/\s+/);
    const ult = partes[partes.length - 1];
    let opcoes: string[];
    if (partes.length === 1) opcoes = Object.keys(COMANDOS).filter((c) => c.startsWith(ult));
    else {
      const idx = ult.lastIndexOf('/');
      const dir = idx >= 0 ? ult.slice(0, idx) || '/' : '.';
      const pref = ult.slice(idx + 1);
      const no = achar(ctx.raiz, caminho(ctx, dir));
      if (!no || no.tipo !== 'pasta') return;
      opcoes = Object.entries(no.filhos).filter(([n, f]) => n.startsWith(pref) && !(f.tipo === 'arq' && f.apagado)).map(([n, f]) => (idx >= 0 ? ult.slice(0, idx + 1) : '') + n + (f.tipo === 'pasta' ? '/' : ''));
    }
    if (opcoes.length === 1) {
      partes[partes.length - 1] = opcoes[0].replace(/ /g, '\\ ');
      input.value = partes.join(' ') + (opcoes[0].endsWith('/') ? '' : ' ');
    } else if (opcoes.length > 1) {
      let comum = opcoes[0];
      for (const o of opcoes) while (!o.startsWith(comum)) comum = comum.slice(0, -1);
      if (comum.length > ult.length) {
        partes[partes.length - 1] = comum;
        input.value = partes.join(' ');
      } else escrever(opcoes.map((o) => o.split('/').filter(Boolean).pop() + (o.endsWith('/') ? '/' : '')).join('  '));
    }
  }
  el.addEventListener('click', () => { if (!getSelection()?.toString()) input.focus(); });
  return { el, escrever, rodar, focar: () => input.focus() };
}
