import { describe, it, expect } from 'vitest';
import { executar } from '../src/motor/sql';

const tb = {
  messages: {
    colunas: ['_id', 'key_remote_jid', 'data', 'timestamp', 'from_me'],
    linhas: [[1, 'a@s', 'oi', 1773538867000, 0], [2, 'b@s', 'pague', 1773538900000, 0], [3, 'a@s', 'bom dia', 1773539000000, 1]],
  },
  jid: { colunas: ['raw_string', 'nome'], linhas: [['a@s', 'Tia'], ['b@s', 'Golpista']] },
};
describe('sql', () => {
  it('filtra e converte data', () => {
    const r = executar(tb, "SELECT datetime(timestamp/1000,'unixepoch','-3 hours') AS h, data FROM messages WHERE data LIKE '%PAG%'");
    expect(r.linhas).toEqual([['2026-03-14 22:41:40', 'pague']]);
  });
  it('join, group e order', () => {
    const r = executar(tb, 'SELECT j.nome, count(*) AS n FROM messages m JOIN jid j ON m.key_remote_jid = j.raw_string GROUP BY j.nome ORDER BY n DESC');
    expect(r.linhas).toEqual([['Tia', 2], ['Golpista', 1]]);
  });
  it('count distinct', () => {
    expect(executar(tb, 'SELECT count(DISTINCT key_remote_jid) FROM messages').linhas).toEqual([[2]]);
    expect(executar(tb, 'SELECT count(key_remote_jid) FROM messages').linhas).toEqual([[3]]);
  });
  it('nome da coluna sem alias fica legível', () => {
    const r = executar(tb, "select datetime(timestamp/1000,'unixepoch') from messages limit 1");
    expect(r.colunas[0]).toBe("datetime(timestamp/1000,'unixepoch')");
  });
});
