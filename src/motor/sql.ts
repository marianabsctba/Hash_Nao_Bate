// Um SQLite de bolso: SELECT com WHERE, JOIN, GROUP BY, ORDER BY, LIMIT e as funções de data
// que o perito usa de verdade (datetime com unixepoch e modificadores).
import type { Celula, Tabela } from './vfs';

type Tok = { t: 'id' | 'num' | 'str' | 'op'; v: string };

function tokenizar(sql: string): Tok[] {
  const out: Tok[] = [];
  let i = 0;
  while (i < sql.length) {
    const c = sql[i];
    if (/\s/.test(c)) { i++; continue; }
    if (c === "'" || c === '"') {
      let s = '';
      i++;
      while (i < sql.length) {
        if (sql[i] === c && sql[i + 1] === c) { s += c; i += 2; continue; }
        if (sql[i] === c) break;
        s += sql[i++];
      }
      i++;
      out.push({ t: c === "'" ? 'str' : 'id', v: s });
      continue;
    }
    if (/[0-9]/.test(c) || (c === '.' && /[0-9]/.test(sql[i + 1] ?? ''))) {
      const m = sql.slice(i).match(/^[0-9]*\.?[0-9]+(e[+-]?\d+)?/i)!;
      out.push({ t: 'num', v: m[0] });
      i += m[0].length;
      continue;
    }
    if (/[A-Za-z_]/.test(c)) {
      const m = sql.slice(i).match(/^[A-Za-z_][\w]*(\.[A-Za-z_*][\w]*)?/)!;
      out.push({ t: 'id', v: m[0] });
      i += m[0].length;
      continue;
    }
    const dois = sql.slice(i, i + 2);
    if (['<=', '>=', '<>', '!=', '==', '||'].includes(dois)) { out.push({ t: 'op', v: dois }); i += 2; continue; }
    if ('=<>+-*/%(),;'.includes(c)) { out.push({ t: 'op', v: c }); i++; continue; }
    throw new Error(`Error: near "${c}": syntax error`);
  }
  return out;
}

type Expr =
  | { k: 'lit'; v: Celula }
  | { k: 'col'; nome: string }
  | { k: 'estrela' }
  | { k: 'bin'; op: string; a: Expr; b: Expr }
  | { k: 'un'; op: string; a: Expr }
  | { k: 'fn'; nome: string; args: Expr[]; estrela?: boolean }
  | { k: 'in'; a: Expr; lista: Expr[]; nao: boolean }
  | { k: 'nulo'; a: Expr; nao: boolean };

interface Select {
  distinct: boolean;
  campos: { e: Expr; alias?: string; texto: string }[];
  de: { tabela: string; alias?: string };
  joins: { tabela: string; alias?: string; on: Expr; left: boolean }[];
  where?: Expr;
  group: Expr[];
  order: { e: Expr; desc: boolean }[];
  limit?: number;
  offset?: number;
}

const FIM_CAMPO = ['FROM', 'WHERE', 'ORDER', 'GROUP', 'LIMIT', 'JOIN', 'LEFT', 'INNER', 'ON'];

class Parser {
  i = 0;
  constructor(private toks: Tok[]) {}
  ver(n = 0): Tok | undefined { return this.toks[this.i + n]; }
  kw(...ws: string[]) {
    const t = this.ver();
    return !!t && t.t === 'id' && ws.includes(t.v.toUpperCase());
  }
  erro(esperado: string): never {
    throw new Error(`Error: near "${this.ver()?.v ?? 'fim'}": syntax error (esperava ${esperado})`);
  }
  pegarKw(w: string) { if (!this.kw(w)) this.erro(w); this.i++; }
  op(v: string) { const t = this.ver(); return !!t && t.t === 'op' && t.v === v; }
  pegarOp(v: string) { if (!this.op(v)) this.erro(v); this.i++; }
  virgula() { if (this.op(',')) { this.i++; return true; } return false; }
  select(): Select {
    this.pegarKw('SELECT');
    let distinct = false;
    if (this.kw('DISTINCT')) { this.i++; distinct = true; }
    const campos: Select['campos'] = [];
    do {
      const ini = this.i;
      const e = this.expr();
      const fimExpr = this.i;
      let alias: string | undefined;
      if (this.kw('AS')) { this.i++; alias = this.ver()!.v; this.i++; }
      else if (this.ver()?.t === 'id' && !this.kw(...FIM_CAMPO)) { alias = this.ver()!.v; this.i++; }
      const texto = this.toks.slice(ini, fimExpr).map((t) => (t.t === 'str' ? `'${t.v}'` : t.v)).join(' ')
        .replace(/ \( /g, '(').replace(/\( /g, '(').replace(/ \)/g, ')').replace(/ , /g, ',').replace(/ \/ /g, '/');
      campos.push({ e, alias, texto });
    } while (this.virgula());
    this.pegarKw('FROM');
    const de = this.fonteTabela();
    const joins: Select['joins'] = [];
    while (this.kw('JOIN', 'INNER', 'LEFT')) {
      let left = false;
      if (this.kw('LEFT')) { left = true; this.i++; if (this.kw('OUTER')) this.i++; }
      if (this.kw('INNER')) this.i++;
      this.pegarKw('JOIN');
      const f = this.fonteTabela();
      this.pegarKw('ON');
      joins.push({ ...f, on: this.expr(), left });
    }
    let where: Expr | undefined;
    if (this.kw('WHERE')) { this.i++; where = this.expr(); }
    const group: Expr[] = [];
    if (this.kw('GROUP')) {
      this.i++;
      this.pegarKw('BY');
      do group.push(this.expr()); while (this.virgula());
    }
    const order: Select['order'] = [];
    if (this.kw('ORDER')) {
      this.i++;
      this.pegarKw('BY');
      do {
        const e = this.expr();
        let desc = false;
        if (this.kw('DESC')) { desc = true; this.i++; } else if (this.kw('ASC')) this.i++;
        order.push({ e, desc });
      } while (this.virgula());
    }
    let limit: number | undefined;
    let offset: number | undefined;
    if (this.kw('LIMIT')) {
      this.i++;
      limit = Number(this.ver()?.v);
      this.i++;
      if (this.kw('OFFSET')) { this.i++; offset = Number(this.ver()?.v); this.i++; }
    }
    if (this.op(';')) this.i++;
    if (this.i < this.toks.length) throw new Error(`Error: near "${this.ver()!.v}": syntax error`);
    return { distinct, campos, de, joins, where, group, order, limit, offset };
  }
  fonteTabela() {
    const t = this.ver();
    if (!t || t.t !== 'id') this.erro('nome da tabela');
    const tabela = t.v;
    this.i++;
    let alias: string | undefined;
    if (this.kw('AS')) this.i++;
    if (this.ver()?.t === 'id' && !this.kw('WHERE', 'JOIN', 'LEFT', 'INNER', 'ON', 'ORDER', 'GROUP', 'LIMIT')) { alias = this.ver()!.v; this.i++; }
    return { tabela, alias };
  }
  expr(): Expr { return this.ou(); }
  ou(): Expr {
    let a = this.e();
    while (this.kw('OR')) { this.i++; a = { k: 'bin', op: 'OR', a, b: this.e() }; }
    return a;
  }
  e(): Expr {
    let a = this.nao();
    while (this.kw('AND')) { this.i++; a = { k: 'bin', op: 'AND', a, b: this.nao() }; }
    return a;
  }
  nao(): Expr {
    if (this.kw('NOT')) { this.i++; return { k: 'un', op: 'NOT', a: this.nao() }; }
    return this.comp();
  }
  comp(): Expr {
    const a = this.soma();
    if (this.kw('IS')) {
      this.i++;
      let nao = false;
      if (this.kw('NOT')) { this.i++; nao = true; }
      this.pegarKw('NULL');
      return { k: 'nulo', a, nao };
    }
    let nao = false;
    if (this.kw('NOT') && ['IN', 'LIKE', 'BETWEEN', 'GLOB'].includes((this.ver(1)?.v ?? '').toUpperCase())) { nao = true; this.i++; }
    if (this.kw('IN')) {
      this.i++;
      this.pegarOp('(');
      const lista: Expr[] = [];
      do lista.push(this.expr()); while (this.virgula());
      this.pegarOp(')');
      return { k: 'in', a, lista, nao };
    }
    if (this.kw('LIKE', 'GLOB')) {
      const op = this.ver()!.v.toUpperCase();
      this.i++;
      const r: Expr = { k: 'bin', op, a, b: this.soma() };
      return nao ? { k: 'un', op: 'NOT', a: r } : r;
    }
    if (this.kw('BETWEEN')) {
      this.i++;
      const lo = this.soma();
      this.pegarKw('AND');
      const hi = this.soma();
      const r: Expr = { k: 'bin', op: 'AND', a: { k: 'bin', op: '>=', a, b: lo }, b: { k: 'bin', op: '<=', a, b: hi } };
      return nao ? { k: 'un', op: 'NOT', a: r } : r;
    }
    for (const op of ['=', '==', '!=', '<>', '<', '>', '<=', '>=']) {
      if (this.op(op)) { this.i++; return { k: 'bin', op, a, b: this.soma() }; }
    }
    return a;
  }
  soma(): Expr {
    let a = this.mult();
    while (this.op('+') || this.op('-') || this.op('||')) { const op = this.ver()!.v; this.i++; a = { k: 'bin', op, a, b: this.mult() }; }
    return a;
  }
  mult(): Expr {
    let a = this.unario();
    while (this.op('*') || this.op('/') || this.op('%')) { const op = this.ver()!.v; this.i++; a = { k: 'bin', op, a, b: this.unario() }; }
    return a;
  }
  unario(): Expr {
    if (this.op('-')) { this.i++; return { k: 'un', op: '-', a: this.unario() }; }
    return this.prim();
  }
  prim(): Expr {
    const t = this.ver();
    if (!t) throw new Error('Error: incomplete input');
    if (t.t === 'num') { this.i++; return { k: 'lit', v: Number(t.v) }; }
    if (t.t === 'str') { this.i++; return { k: 'lit', v: t.v }; }
    if (this.op('*')) { this.i++; return { k: 'estrela' }; }
    if (this.op('(')) { this.i++; const e = this.expr(); this.pegarOp(')'); return e; }
    if (t.t === 'id') {
      this.i++;
      if (t.v.toUpperCase() === 'NULL') return { k: 'lit', v: null };
      if (t.v.endsWith('.*')) return { k: 'estrela' };
      if (this.op('(')) {
        this.i++;
        const args: Expr[] = [];
        let estrela = false;
        if (this.op('*')) { this.i++; estrela = true; }
        else if (!this.op(')')) {
          if (this.kw('DISTINCT')) this.i++;
          do {
            args.push(this.expr());
            if (this.kw('AS')) { this.i++; this.i++; } // CAST(x AS INTEGER)
          } while (this.virgula());
        }
        this.pegarOp(')');
        return { k: 'fn', nome: t.v.toLowerCase(), args, estrela };
      }
      return { k: 'col', nome: t.v };
    }
    throw new Error(`Error: near "${t.v}": syntax error`);
  }
}

type Linha = Map<string, Celula>;
const AGREG = new Set(['count', 'sum', 'min', 'max', 'avg', 'group_concat', 'total']);

function temAgreg(e: Expr): boolean {
  if (e.k === 'fn') return AGREG.has(e.nome) || e.args.some(temAgreg);
  if (e.k === 'bin') return temAgreg(e.a) || temAgreg(e.b);
  if (e.k === 'un' || e.k === 'nulo') return temAgreg(e.a);
  return false;
}

const p2 = (n: number) => String(n).padStart(2, '0');
function fmtData(ms: number, tipo: string): string {
  const d = new Date(ms);
  if (isNaN(d.getTime())) return '';
  const dt = `${d.getUTCFullYear()}-${p2(d.getUTCMonth() + 1)}-${p2(d.getUTCDate())}`;
  const hr = `${p2(d.getUTCHours())}:${p2(d.getUTCMinutes())}:${p2(d.getUTCSeconds())}`;
  return tipo === 'date' ? dt : tipo === 'time' ? hr : `${dt} ${hr}`;
}

function funcaoData(tipo: string, args: Celula[]): Celula {
  if (args[0] === null || args[0] === undefined) return null;
  let ms: number;
  const v = args[0];
  const mods = args.slice(1).map((m) => String(m).toLowerCase().trim());
  if (typeof v === 'number' || /^-?\d+(\.\d+)?$/.test(String(v))) {
    const n = Number(v);
    if (mods.includes('unixepoch')) ms = n * 1000;
    else ms = (n - 2440587.5) * 86400000; // dia juliano, como o SQLite faz
  } else if (String(v).toLowerCase() === 'now') ms = Date.UTC(2026, 10, 22, 14, 0, 0);
  else {
    const m = String(v).match(/^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2})(?::(\d{2}))?)?/);
    if (!m) return null;
    ms = Date.UTC(+m[1], +m[2] - 1, +m[3], +(m[4] ?? 0), +(m[5] ?? 0), +(m[6] ?? 0));
  }
  for (const m of mods) {
    const r = m.match(/^([+-]?\d+(?:\.\d+)?)\s*(second|minute|hour|day)s?$/);
    if (r) ms += Number(r[1]) * { second: 1e3, minute: 6e4, hour: 36e5, day: 864e5 }[r[2] as 'second'];
    else if (m === 'localtime') ms -= 3 * 36e5; // a estação do laboratório está em Brasília (UTC-3)
    else if (m === 'utc' || m === 'unixepoch') continue;
    else return null;
  }
  return fmtData(Math.floor(ms / 1000) * 1000, tipo);
}

function comoNum(v: Celula): number {
  if (v === null) return NaN;
  return typeof v === 'number' ? v : Number(v) || 0;
}

function like(txt: string, pad: string): boolean {
  const re = '^' + pad.replace(/[.+^${}()|[\]\\?*]/g, '\\$&').replace(/%/g, '.*').replace(/_/g, '.') + '$';
  return new RegExp(re, 'is').test(txt);
}

function cmp(a: Celula, b: Celula): number {
  if (a === null && b === null) return 0;
  if (a === null) return -1;
  if (b === null) return 1;
  if (typeof a === 'number' && typeof b === 'number') return a - b;
  if (typeof a === 'number' && /^-?\d+(\.\d+)?$/.test(String(b))) return a - Number(b);
  if (typeof b === 'number' && /^-?\d+(\.\d+)?$/.test(String(a))) return Number(a) - b;
  return String(a) < String(b) ? -1 : String(a) > String(b) ? 1 : 0;
}

function avaliar(e: Expr, l: Linha, grupo?: Linha[]): Celula {
  switch (e.k) {
    case 'lit': return e.v;
    case 'estrela': return null;
    case 'col': {
      if (l.has(e.nome)) return l.get(e.nome)!;
      const lower = e.nome.toLowerCase();
      for (const [k, v] of l) if (k.toLowerCase() === lower) return v;
      throw new Error(`Error: no such column: ${e.nome}`);
    }
    case 'nulo': { const v = avaliar(e.a, l, grupo) === null; return (e.nao ? !v : v) ? 1 : 0; }
    case 'in': {
      const v = avaliar(e.a, l, grupo);
      const r = e.lista.some((x) => cmp(v, avaliar(x, l, grupo)) === 0);
      return (e.nao ? !r : r) ? 1 : 0;
    }
    case 'un': {
      const v = avaliar(e.a, l, grupo);
      if (e.op === 'NOT') return v ? 0 : 1;
      return v === null ? null : -comoNum(v);
    }
    case 'bin': {
      if (e.op === 'AND') return avaliar(e.a, l, grupo) && avaliar(e.b, l, grupo) ? 1 : 0;
      if (e.op === 'OR') return avaliar(e.a, l, grupo) || avaliar(e.b, l, grupo) ? 1 : 0;
      const a = avaliar(e.a, l, grupo);
      const b = avaliar(e.b, l, grupo);
      switch (e.op) {
        case '||': return a === null || b === null ? null : String(a) + String(b);
        case 'LIKE': return a !== null && b !== null && like(String(a), String(b)) ? 1 : 0;
        case 'GLOB': {
          if (a === null || b === null) return 0;
          const re = '^' + String(b).replace(/[.+^${}()|\\]/g, '\\$&').replace(/\*/g, '.*').replace(/\?/g, '.') + '$';
          return new RegExp(re, 's').test(String(a)) ? 1 : 0;
        }
        case '=': case '==': return a === null || b === null ? null : cmp(a, b) === 0 ? 1 : 0;
        case '!=': case '<>': return a === null || b === null ? null : cmp(a, b) !== 0 ? 1 : 0;
        case '<': return cmp(a, b) < 0 ? 1 : 0;
        case '>': return cmp(a, b) > 0 ? 1 : 0;
        case '<=': return cmp(a, b) <= 0 ? 1 : 0;
        case '>=': return cmp(a, b) >= 0 ? 1 : 0;
      }
      if (a === null || b === null) return null;
      const x = comoNum(a);
      const y = comoNum(b);
      const inteiros = Number.isInteger(x) && Number.isInteger(y);
      switch (e.op) {
        case '+': return x + y;
        case '-': return x - y;
        case '*': return x * y;
        case '/': return y === 0 ? null : inteiros ? Math.trunc(x / y) : x / y;
        case '%': return y === 0 ? null : x % y;
      }
      return null;
    }
    case 'fn': {
      if (AGREG.has(e.nome) && grupo) {
        if (e.nome === 'count' && e.estrela) return grupo.length;
        const vals = grupo.map((g) => avaliar(e.args[0], g)).filter((v) => v !== null);
        switch (e.nome) {
          case 'count': return vals.length;
          case 'sum': case 'total': return vals.reduce((s: number, v) => s + comoNum(v), 0);
          case 'avg': return vals.length ? vals.reduce((s: number, v) => s + comoNum(v), 0) / vals.length : null;
          case 'min': return vals.reduce((m: Celula, v) => (m === null || cmp(v, m) < 0 ? v : m), null);
          case 'max': return vals.reduce((m: Celula, v) => (m === null || cmp(v, m) > 0 ? v : m), null);
          case 'group_concat': return vals.join(',');
        }
      }
      const args = e.args.map((x) => avaliar(x, l, grupo));
      switch (e.nome) {
        case 'datetime': case 'date': case 'time': return funcaoData(e.nome, args);
        case 'strftime': {
          const r = funcaoData('datetime', args.slice(1));
          if (r === null) return null;
          if (String(args[0]) === '%s') return Math.floor(Date.parse(String(r).replace(' ', 'T') + 'Z') / 1000);
          return r;
        }
        case 'length': return args[0] === null ? null : String(args[0]).length;
        case 'upper': return args[0] === null ? null : String(args[0]).toUpperCase();
        case 'lower': return args[0] === null ? null : String(args[0]).toLowerCase();
        case 'substr': case 'substring': return args[0] === null ? null : String(args[0]).substr(comoNum(args[1]) - 1, args[2] === undefined ? undefined : comoNum(args[2]));
        case 'abs': return Math.abs(comoNum(args[0]));
        case 'round': return Number(comoNum(args[0]).toFixed(args[1] === undefined ? 0 : comoNum(args[1])));
        case 'coalesce': case 'ifnull': return args.find((a) => a !== null) ?? null;
        case 'replace': return args[0] === null ? null : String(args[0]).split(String(args[1])).join(String(args[2]));
        case 'hex': return args[0] === null ? '' : Array.from(new TextEncoder().encode(String(args[0])), (b) => b.toString(16).padStart(2, '0').toUpperCase()).join('');
        case 'typeof': return args[0] === null ? 'null' : typeof args[0] === 'number' ? (Number.isInteger(args[0]) ? 'integer' : 'real') : 'text';
        case 'cast': return args[0] === null ? null : Math.trunc(comoNum(args[0]));
        case 'instr': return args[0] === null ? null : String(args[0]).indexOf(String(args[1])) + 1;
        case 'trim': return args[0] === null ? null : String(args[0]).trim();
      }
      throw new Error(`Error: no such function: ${e.nome}`);
    }
  }
}

export interface Resultado {
  colunas: string[];
  linhas: Celula[][];
}

export function executar(tabelas: Record<string, Tabela>, sql: string): Resultado {
  const s = new Parser(tokenizar(sql)).select();
  const pegarTabela = (n: string) => {
    const t = Object.entries(tabelas).find(([k]) => k.toLowerCase() === n.toLowerCase());
    if (!t) throw new Error(`Error: no such table: ${n}`);
    return t[1];
  };
  const linhaDe = (t: Tabela, nome: string, alias: string | undefined, valores: Celula[] | null): [string, Celula][] =>
    t.colunas.flatMap((c, i) => {
      const v = valores ? valores[i] ?? null : null;
      return [[c, v], [`${alias ?? nome}.${c}`, v]] as [string, Celula][];
    });
  const t0 = pegarTabela(s.de.tabela);
  let linhas: Linha[] = t0.linhas.map((v) => new Map(linhaDe(t0, s.de.tabela, s.de.alias, v)));
  const colsEstrela: string[] = [...t0.colunas];
  for (const j of s.joins) {
    const tj = pegarTabela(j.tabela);
    colsEstrela.push(...tj.colunas);
    const novas: Linha[] = [];
    for (const l of linhas) {
      let achou = false;
      for (const v of tj.linhas) {
        const m = new Map(l);
        for (const [k, x] of linhaDe(tj, j.tabela, j.alias, v)) if (!m.has(k) || k.includes('.')) m.set(k, x);
        if (avaliar(j.on, m)) { novas.push(m); achou = true; }
      }
      if (!achou && j.left) {
        const m = new Map(l);
        for (const [k, x] of linhaDe(tj, j.tabela, j.alias, null)) if (!m.has(k) || k.includes('.')) m.set(k, x);
        novas.push(m);
      }
    }
    linhas = novas;
  }
  if (s.where) linhas = linhas.filter((l) => avaliar(s.where!, l));
  const agregado = s.group.length > 0 || s.campos.some((c) => temAgreg(c.e));
  const colunas: string[] = [];
  for (const c of s.campos) {
    if (c.e.k === 'estrela') colunas.push(...colsEstrela);
    else colunas.push(c.alias ?? c.texto);
  }
  let saida: { vals: Celula[]; ctx: Linha; grupo?: Linha[] }[] = [];
  const projetar = (l: Linha, grupo?: Linha[]) => {
    const vals: Celula[] = [];
    for (const c of s.campos) {
      if (c.e.k === 'estrela') vals.push(...colsEstrela.map((n) => l.get(n) ?? null));
      else vals.push(avaliar(c.e, l, grupo));
    }
    const ctx = new Map(l);
    s.campos.forEach((c, i) => { if (c.alias) ctx.set(c.alias, vals[i]); });
    return { vals, ctx, grupo };
  };
  if (agregado) {
    const grupos = new Map<string, Linha[]>();
    for (const l of linhas) {
      const chave = JSON.stringify(s.group.map((g) => avaliar(g, l)));
      if (!grupos.has(chave)) grupos.set(chave, []);
      grupos.get(chave)!.push(l);
    }
    if (grupos.size === 0 && s.group.length === 0) grupos.set('[]', []);
    for (const g of grupos.values()) saida.push(projetar(g[0] ?? new Map(), g));
  } else saida = linhas.map((l) => projetar(l));
  if (s.order.length) {
    saida.sort((x, y) => {
      for (const o of s.order) {
        let a: Celula;
        let b: Celula;
        if (o.e.k === 'lit' && typeof o.e.v === 'number') { a = x.vals[o.e.v - 1]; b = y.vals[o.e.v - 1]; }
        else { a = avaliar(o.e, x.ctx, x.grupo); b = avaliar(o.e, y.ctx, y.grupo); }
        const c = cmp(a, b);
        if (c) return o.desc ? -c : c;
      }
      return 0;
    });
  }
  let res = saida.map((x) => x.vals);
  if (s.distinct) {
    const vistos = new Set<string>();
    res = res.filter((r) => { const k = JSON.stringify(r); if (vistos.has(k)) return false; vistos.add(k); return true; });
  }
  if (s.offset) res = res.slice(s.offset);
  if (s.limit !== undefined && s.limit >= 0) res = res.slice(0, s.limit);
  return { colunas, linhas: res };
}

export function formatar(r: Resultado, modo: 'list' | 'column' | 'csv', cabecalho: boolean): string {
  const txt = (v: Celula) => (v === null ? '' : typeof v === 'number' && !Number.isInteger(v) ? String(Number(v.toFixed(6))) : String(v));
  if (modo === 'column') {
    const larg = r.colunas.map((c, i) => Math.min(70, Math.max(c.length, ...r.linhas.map((l) => txt(l[i]).length))));
    const lin = (vals: string[]) => vals.map((v, i) => v.padEnd(larg[i])).join('  ').trimEnd();
    const out: string[] = [];
    if (cabecalho) { out.push(lin(r.colunas)); out.push(larg.map((n) => '-'.repeat(n)).join('  ')); }
    for (const l of r.linhas) out.push(lin(l.map(txt)));
    return out.join('\n');
  }
  const sep = modo === 'csv' ? ',' : '|';
  const esc = (s: string) => (modo === 'csv' && /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s);
  const out: string[] = [];
  if (cabecalho) out.push(r.colunas.map(esc).join(sep));
  for (const l of r.linhas) out.push(l.map((v) => esc(txt(v))).join(sep));
  return out.join('\n');
}
