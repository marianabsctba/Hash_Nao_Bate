// jq de bolso: o suficiente para destrinchar log de nuvem em JSON sem chorar.
// Suporta caminhos, .[], |, vírgula, select, comparações, and/or/not, objetos, arrays,
// length, keys, map, contains, test, startswith, endswith, ascii_downcase, tostring, tonumber,
// sort_by, group_by, unique, first, last, todate, fromdate, @csv, @tsv.
type J = unknown;
type No =
  | { k: 'id' }
  | { k: 'campo'; de: No; nome: string; opcional?: boolean }
  | { k: 'indice'; de: No; i: No }
  | { k: 'iter'; de: No }
  | { k: 'lit'; v: J }
  | { k: 'pipe'; a: No; b: No }
  | { k: 'virg'; a: No; b: No }
  | { k: 'bin'; op: string; a: No; b: No }
  | { k: 'fn'; nome: string; args: No[] }
  | { k: 'obj'; pares: [No | string, No][] }
  | { k: 'arr'; e: No | null }
  | { k: 'fmt'; nome: string };

function tokens(s: string): string[] {
  const out: string[] = [];
  let i = 0;
  while (i < s.length) {
    const c = s[i];
    if (/\s/.test(c)) { i++; continue; }
    if (c === '"') {
      let j = i + 1;
      let v = '';
      while (j < s.length && s[j] !== '"') { if (s[j] === '\\') { v += s[j + 1]; j += 2; continue; } v += s[j++]; }
      out.push('"' + v);
      i = j + 1;
      continue;
    }
    const dois = s.slice(i, i + 2);
    if (['==', '!=', '<=', '>=', '//', '..'].includes(dois)) { out.push(dois); i += 2; continue; }
    if (/[0-9]/.test(c)) { const m = s.slice(i).match(/^\d+(\.\d+)?/)!; out.push('#' + m[0]); i += m[0].length; continue; }
    if (/[A-Za-z_@$]/.test(c)) { const m = s.slice(i).match(/^[@$]?[A-Za-z_][\w]*/)!; out.push(m[0]); i += m[0].length; continue; }
    if ('.|,()[]{}:<>+-*/?'.includes(c)) { out.push(c); i++; continue; }
    throw new Error(`jq: error: caractere inesperado '${c}'`);
  }
  return out;
}

class P {
  i = 0;
  constructor(private t: string[]) {}
  ver() { return this.t[this.i]; }
  pegar(v?: string) {
    const x = this.t[this.i++];
    if (v !== undefined && x !== v) throw new Error(`jq: error: esperava '${v}' e veio '${x ?? 'fim'}'`);
    return x;
  }
  tudo(): No { const n = this.pipe(); if (this.i < this.t.length) throw new Error(`jq: error: sobrou '${this.ver()}'`); return n; }
  pipe(): No { let a = this.virg(); while (this.ver() === '|') { this.i++; a = { k: 'pipe', a, b: this.virg() }; } return a; }
  virg(): No { let a = this.alt(); while (this.ver() === ',') { this.i++; a = { k: 'virg', a, b: this.alt() }; } return a; }
  alt(): No { let a = this.ou(); while (this.ver() === '//') { this.i++; a = { k: 'bin', op: '//', a, b: this.ou() }; } return a; }
  ou(): No { let a = this.e(); while (this.ver() === 'or') { this.i++; a = { k: 'bin', op: 'or', a, b: this.e() }; } return a; }
  e(): No { let a = this.cmp(); while (this.ver() === 'and') { this.i++; a = { k: 'bin', op: 'and', a, b: this.cmp() }; } return a; }
  cmp(): No {
    const a = this.soma();
    if (['==', '!=', '<', '>', '<=', '>='].includes(this.ver())) { const op = this.pegar(); return { k: 'bin', op, a, b: this.soma() }; }
    return a;
  }
  soma(): No {
    let a = this.pos();
    while (['+', '-', '*', '/'].includes(this.ver())) { const op = this.pegar(); a = { k: 'bin', op, a, b: this.pos() }; }
    return a;
  }
  pos(): No {
    let n = this.prim();
    for (;;) {
      if (this.ver() === '.' && /^[A-Za-z_]/.test(this.t[this.i + 1] ?? '')) { this.i++; n = { k: 'campo', de: n, nome: this.pegar() }; }
      else if (this.ver() === '.' && (this.t[this.i + 1] ?? '').startsWith('"')) { this.i++; n = { k: 'campo', de: n, nome: this.pegar().slice(1) }; }
      else if (this.ver() === '[' || (this.ver() === '.' && this.t[this.i + 1] === '[')) {
        if (this.ver() === '.') this.i++;
        this.i++;
        if (this.ver() === ']') { this.i++; n = { k: 'iter', de: n }; }
        else { const ix = this.pipe(); this.pegar(']'); n = { k: 'indice', de: n, i: ix }; }
      } else if (this.ver() === '?') { this.i++; }
      else break;
    }
    return n;
  }
  prim(): No {
    const t = this.ver();
    if (t === undefined) throw new Error('jq: error: filtro incompleto');
    if (t === '.') {
      this.i++;
      const prox = this.ver();
      if (prox && /^[A-Za-z_]/.test(prox) && !['and', 'or'].includes(prox)) return { k: 'campo', de: { k: 'id' }, nome: this.pegar() };
      if (prox && prox.startsWith('"')) return { k: 'campo', de: { k: 'id' }, nome: this.pegar().slice(1) };
      if (prox === '[') {
        this.i++;
        if (this.ver() === ']') { this.i++; return { k: 'iter', de: { k: 'id' } }; }
        const ix = this.pipe();
        this.pegar(']');
        return { k: 'indice', de: { k: 'id' }, i: ix };
      }
      return { k: 'id' };
    }
    if (t.startsWith('"')) { this.i++; return { k: 'lit', v: t.slice(1) }; }
    if (t.startsWith('#')) { this.i++; return { k: 'lit', v: Number(t.slice(1)) }; }
    if (t === '(') { this.i++; const n = this.pipe(); this.pegar(')'); return n; }
    if (t === '[') { this.i++; if (this.ver() === ']') { this.i++; return { k: 'arr', e: null }; } const e = this.pipe(); this.pegar(']'); return { k: 'arr', e }; }
    if (t === '{') {
      this.i++;
      const pares: [No | string, No][] = [];
      while (this.ver() !== '}') {
        const ch = this.pegar();
        const nome = ch.startsWith('"') ? ch.slice(1) : ch;
        if (this.ver() === ':') { this.i++; pares.push([nome, this.alt()]); }
        else pares.push([nome, { k: 'campo', de: { k: 'id' }, nome }]);
        if (this.ver() === ',') this.i++;
      }
      this.i++;
      return { k: 'obj', pares };
    }
    if (t === '-') { this.i++; const n = this.prim(); return { k: 'bin', op: '-', a: { k: 'lit', v: 0 }, b: n }; }
    if (t.startsWith('@')) { this.i++; return { k: 'fmt', nome: t }; }
    if (t === 'true' || t === 'false' || t === 'null') { this.i++; return { k: 'lit', v: t === 'null' ? null : t === 'true' }; }
    if (/^[A-Za-z_]/.test(t)) {
      this.i++;
      const args: No[] = [];
      if (this.ver() === '(') {
        this.i++;
        args.push(this.pipe());
        while (this.ver() === ';') { this.i++; args.push(this.pipe()); }
        this.pegar(')');
      }
      return { k: 'fn', nome: t, args };
    }
    throw new Error(`jq: error: não entendi '${t}'`);
  }
}

const verdade = (v: J) => v !== null && v !== false && v !== undefined;
function comparar(a: J, b: J): number {
  if (typeof a === 'number' && typeof b === 'number') return a - b;
  const sa = JSON.stringify(a);
  const sb = JSON.stringify(b);
  return sa < sb ? -1 : sa > sb ? 1 : 0;
}

function av(n: No, x: J): J[] {
  switch (n.k) {
    case 'id': return [x];
    case 'lit': return [n.v];
    case 'campo':
      return av(n.de, x).map((o) => {
        if (o === null || o === undefined) return null;
        if (typeof o !== 'object' || Array.isArray(o)) throw new Error(`jq: error: não dá para indexar ${Array.isArray(o) ? 'array' : typeof o} com "${n.nome}"`);
        return (o as Record<string, J>)[n.nome] ?? null;
      });
    case 'indice':
      return av(n.de, x).flatMap((o) => av(n.i, x).map((i) => {
        if (o === null) return null;
        if (Array.isArray(o) && typeof i === 'number') return o[i < 0 ? o.length + i : i] ?? null;
        if (typeof o === 'object' && typeof i === 'string') return (o as Record<string, J>)[i] ?? null;
        throw new Error('jq: error: índice inválido');
      }));
    case 'iter':
      return av(n.de, x).flatMap((o) => {
        if (Array.isArray(o)) return o;
        if (o && typeof o === 'object') return Object.values(o);
        throw new Error(`jq: error: não dá para iterar sobre ${o === null ? 'null' : typeof o}`);
      });
    case 'pipe': return av(n.a, x).flatMap((y) => av(n.b, y));
    case 'virg': return [...av(n.a, x), ...av(n.b, x)];
    case 'arr': return [n.e ? av(n.e, x) : []];
    case 'obj': {
      let res: Record<string, J>[] = [{}];
      for (const [k, v] of n.pares) {
        const chave = typeof k === 'string' ? k : String(av(k, x)[0]);
        const vals = av(v, x);
        res = res.flatMap((r) => vals.map((val) => ({ ...r, [chave]: val })));
      }
      return res;
    }
    case 'fmt': {
      const esc = (v: J) => (typeof v === 'string' ? v : v === null ? '' : JSON.stringify(v));
      if (!Array.isArray(x)) throw new Error(`jq: error: ${n.nome} precisa de array`);
      if (n.nome === '@csv') return [x.map((v) => (typeof v === 'string' ? `"${v.replace(/"/g, '""')}"` : esc(v))).join(',')];
      if (n.nome === '@tsv') return [x.map(esc).join('\t')];
      throw new Error(`jq: error: formato ${n.nome} não suportado`);
    }
    case 'bin': {
      if (n.op === 'and') return [av(n.a, x).every(verdade) && av(n.b, x).every(verdade)];
      if (n.op === 'or') return [av(n.a, x).some(verdade) || av(n.b, x).some(verdade)];
      if (n.op === '//') { const a = av(n.a, x).filter(verdade); return a.length ? a : av(n.b, x); }
      const out: J[] = [];
      for (const a of av(n.a, x)) for (const b of av(n.b, x)) {
        switch (n.op) {
          case '==': out.push(comparar(a, b) === 0); break;
          case '!=': out.push(comparar(a, b) !== 0); break;
          case '<': out.push(comparar(a, b) < 0); break;
          case '>': out.push(comparar(a, b) > 0); break;
          case '<=': out.push(comparar(a, b) <= 0); break;
          case '>=': out.push(comparar(a, b) >= 0); break;
          case '+': out.push(typeof a === 'number' && typeof b === 'number' ? a + b : a === null ? b : b === null ? a : Array.isArray(a) && Array.isArray(b) ? [...a, ...b] : String(a) + String(b)); break;
          case '-': out.push((a as number) - (b as number)); break;
          case '*': out.push((a as number) * (b as number)); break;
          case '/': out.push(typeof a === 'string' ? a.split(String(b)) : (a as number) / (b as number)); break;
        }
      }
      return out;
    }
    case 'fn': {
      const arg = (i: number) => av(n.args[i], x)[0];
      switch (n.nome) {
        case 'select': return av(n.args[0], x).some(verdade) ? [x] : [];
        case 'length': return [x === null ? 0 : typeof x === 'string' || Array.isArray(x) ? x.length : typeof x === 'object' ? Object.keys(x as object).length : Math.abs(x as number)];
        case 'keys': return [Object.keys(x as object).sort()];
        case 'map': return [(x as J[]).flatMap((y) => av(n.args[0], y))];
        case 'contains': {
          const b = arg(0);
          if (typeof x === 'string') return [x.includes(String(b))];
          return [JSON.stringify(x).includes(JSON.stringify(b).replace(/^[[{]|[\]}]$/g, ''))];
        }
        case 'test': return [new RegExp(String(arg(0)), n.args[1] ? String(arg(1)) : '').test(String(x))];
        case 'startswith': return [String(x).startsWith(String(arg(0)))];
        case 'endswith': return [String(x).endsWith(String(arg(0)))];
        case 'ascii_downcase': return [String(x).toLowerCase()];
        case 'ascii_upcase': return [String(x).toUpperCase()];
        case 'tostring': return [typeof x === 'string' ? x : JSON.stringify(x)];
        case 'tonumber': return [Number(x)];
        case 'not': return [!verdade(x)];
        case 'empty': return [];
        case 'first': return n.args.length ? av(n.args[0], x).slice(0, 1) : [(x as J[])[0] ?? null];
        case 'last': return [(x as J[])[(x as J[]).length - 1] ?? null];
        case 'add': return [(x as J[]).reduce((s: J, v) => (s === null ? v : typeof s === 'number' ? s + (v as number) : String(s) + String(v)), null)];
        case 'unique': return [Array.from(new Map((x as J[]).map((v) => [JSON.stringify(v), v])).values()).sort(comparar)];
        case 'sort': return [[...(x as J[])].sort(comparar)];
        case 'sort_by': return [[...(x as J[])].sort((a, b) => comparar(av(n.args[0], a)[0], av(n.args[0], b)[0]))];
        case 'group_by': {
          const g = new Map<string, J[]>();
          for (const v of x as J[]) { const k = JSON.stringify(av(n.args[0], v)[0]); if (!g.has(k)) g.set(k, []); g.get(k)!.push(v); }
          return [[...g.entries()].sort((a, b) => (a[0] < b[0] ? -1 : 1)).map((e) => e[1])];
        }
        case 'todate': return [new Date((x as number) * 1000).toISOString().replace('.000', '')];
        case 'fromdate': case 'fromdateiso8601': return [Math.floor(Date.parse(String(x)) / 1000)];
        case 'split': return [String(x).split(String(arg(0)))];
        case 'join': return [(x as J[]).map((v) => (v === null ? '' : String(v))).join(String(arg(0)))];
        case 'ltrimstr': { const p = String(arg(0)); return [String(x).startsWith(p) ? String(x).slice(p.length) : x]; }
        case 'values': return x === null ? [] : [x];
        case 'type': return [x === null ? 'null' : Array.isArray(x) ? 'array' : typeof x];
      }
      throw new Error(`jq: error: ${n.nome}/${n.args.length} não está definido`);
    }
  }
}

export function jq(filtro: string, entrada: string, cru: boolean, compacto: boolean): string {
  const no = new P(tokens(filtro)).tudo();
  // aceita JSON único ou JSON Lines (um objeto por linha)
  let docs: J[];
  try {
    docs = [JSON.parse(entrada)];
  } catch {
    docs = entrada.split('\n').filter((l) => l.trim()).map((l, i) => {
      try { return JSON.parse(l); } catch { throw new Error(`jq: error (at <stdin>:${i + 1}): JSON inválido`); }
    });
  }
  const out: string[] = [];
  for (const d of docs) {
    for (const v of av(no, d)) {
      if (cru && typeof v === 'string') out.push(v);
      else out.push(compacto ? JSON.stringify(v) : JSON.stringify(v, null, 2));
    }
  }
  return out.join('\n');
}
