// Robô perito: joga cada caso pelo terminal e confere se os quesitos são respondíveis com o que as ferramentas mostram.
import { describe, it, expect } from 'vitest';
import { CASOS } from '../src/casos';
import { montarCtx } from '../src/motor/lab';
import { executarLinha } from '../src/motor/shell';
import { conferir } from '../src/motor/estado';
import { SOLUCOES } from './solucoes';
import { MISSOES } from '../src/casos/missoes';

const semCor = (s: string) => s.replace(/\x1b\[[0-9;]*m/g, '');

describe('casos', () => {
  for (const c of CASOS) {
    it(`${c.id} ${c.titulo}: estrutura válida`, () => {
      const ids = new Set<string>();
      for (const it2 of c.cena.itens) {
        expect(ids.has(it2.id), `id repetido ${it2.id}`).toBe(false);
        ids.add(it2.id);
      }
      expect(c.quesitos.length).toBeGreaterThan(0);
      for (const q of c.quesitos) expect(q.respostas.length).toBeGreaterThan(0);
      expect(c.metodologia.some((m) => m.certo)).toBe(true);
      const m = MISSOES[c.id];
      expect(m, `caso ${c.id} sem dossiê de missão`).toBeTruthy();
      expect(m.passos.length).toBeGreaterThan(2);
      expect(JSON.stringify(m)).not.toMatch(/[–—]/);
      // texto sem travessão
      expect(JSON.stringify(c)).not.toMatch(/[–—]/);
    });
    const sol = SOLUCOES[c.id];
    if (!sol) continue;
    it(`${c.id} ${c.titulo}: solução pelo terminal`, () => {
      const lacres: Record<string, string> = {};
      sol.coletados.forEach((id, i) => (lacres[id] = `PCI-TESTE-${i}`));
      const ctx = montarCtx(c, new Set(sol.flags ?? []), lacres, sol.coletados);
      let tudo = '';
      for (const cmd of sol.comandos) {
        const s = semCor(executarLinha(cmd, ctx));
        expect(s, `comando falhou: ${cmd}\n${s}`).not.toMatch(/comando não encontrado|Arquivo ou diretório inexistente|syntax error|não parece ser|Error:|jq: error/);
        tudo += s + '\n';
      }
      for (const q of c.quesitos) {
        const r = sol.respostas[q.id];
        expect(r, `sem resposta para ${q.id}`).toBeTruthy();
        expect(conferir(q, r), `resposta ${q.id} não confere: ${r}`).toBe(true);
        const procura = sol.evidencia?.[q.id] ?? r;
        expect(tudo.toLowerCase(), `${q.id}: "${procura}" não aparece na saída das ferramentas`).toContain(procura.toLowerCase());
      }
    });
  }
});
