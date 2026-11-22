// A estagiária não pode mandar ninguém para o lugar errado: cada comando de ajuda roda e mostra a resposta.
import { describe, it, expect } from 'vitest';
import { CASOS } from '../src/casos';
import { AJUDAS } from '../src/casos/ajudas';
import { montarCtx } from '../src/motor/lab';
import { executarLinha } from '../src/motor/shell';
import { SOLUCOES } from './solucoes';

const semCor = (s: string) => s.replace(/\x1b\[[0-9;]*m/g, '');

describe('ajudas', () => {
  for (const c of CASOS) {
    it(`${c.id}: toda ajuda leva à resposta`, () => {
      const sol = SOLUCOES[c.id];
      const aj = AJUDAS[c.id];
      expect(aj, `caso ${c.id} sem ajudas`).toBeTruthy();
      for (const q of c.quesitos) {
        const a = aj[q.id];
        expect(a, `${c.id} ${q.id} sem ajuda`).toBeTruthy();
        expect(JSON.stringify(a)).not.toMatch(/[–—]/);
        if (!a.comandos.length) continue;
        // cada quesito começa de uma estação nova, como quem pede ajuda logo de cara
        const lacres: Record<string, string> = {};
        sol.coletados.forEach((id, i) => (lacres[id] = `PCI-TESTE-${i}`));
        const ctx = montarCtx(c, new Set(sol.flags ?? []), lacres, sol.coletados);
        let tudo = '';
        for (const bruto of a.comandos) {
          const ev = ctx.raiz.filhos.evidencias;
          const nomes = ev && ev.tipo === 'pasta' ? Object.keys(ev.filhos) : [];
          const cmd = bruto.split('{FS}').join(nomes.find((n) => n.endsWith('_fs')) ?? 'X').split('{VEIC}').join(nomes.find((n) => n.endsWith('_veiculo')) ?? 'X');
          const s = semCor(executarLinha(cmd, ctx));
          expect(s, `${c.id} ${q.id} comando falhou: ${cmd}\n${s.slice(0, 300)}`).not.toMatch(/comando não encontrado|Arquivo ou diretório inexistente|syntax error|não parece ser|Error:|jq: error|indisponível/);
          tudo += s + '\n';
        }
        const procura = sol.evidencia?.[q.id] ?? sol.respostas[q.id];
        expect(tudo.toLowerCase(), `${c.id} ${q.id}: "${procura}" não aparece com a ajuda`).toContain(procura.toLowerCase());
      }
    });
  }
});
