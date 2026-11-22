// O shell da estação pericial: tokenização, pipes, redirecionamento, glob e os utilitários de sempre.
import { andar, achar, arq, bytesDe, gravar, normalizarCaminho, tamanho, textoDe } from './vfs';
import type { Arquivo, No, Pasta } from './vfs';
import { md5, sha1, sha256 } from './hash';

export interface Dispositivo {
  id: string;
  dev: string;
  rotulo: string;
  lacre?: string;
  tipo: 'disco' | 'android' | 'ios' | 'iot' | 'veiculo';
  tamanho: string;
  semente: number;
  /** se preenchido, o volume está criptografado e não monta (mensagem do erro) */
  cifrado?: string;
  /** o que aparece ao montar a imagem */
  conteudo?: () => Pasta;
  /** arquivos apagados que só a carga por assinatura (carving) devolve */
  apagados?: { nome: string; arquivo: () => Arquivo }[];
  extracoes?: Partial<Record<'logica' | 'fs' | 'fisica', () => Pasta>>;
  motivoSemExtracao?: Partial<Record<'logica' | 'fs' | 'fisica', string>>;
  info?: string[];
}

export interface Ctx {
  raiz: Pasta;
  cwd: string;
  usuario: string;
  host: string;
  dispositivos: Dispositivo[];
  bloqueador: boolean;
  flags: Set<string>;
  evento: (nome: string, dados?: Record<string, unknown>) => void;
  historico: string[];
}

export type Comando = (args: string[], entrada: string | null, ctx: Ctx) => string;
export interface Manual {
  resumo: string;
  uso: string;
  exemplos?: string[];
  nota?: string;
}

export const COMANDOS: Record<string, { fn: Comando; man: Manual }> = {};
export function registrar(nome: string, man: Manual, fn: Comando) {
  COMANDOS[nome] = { fn, man };
}

// cores ANSI que a tela do terminal entende
export const cor = {
  verm: (s: string) => `\x1b[31m${s}\x1b[0m`,
  verde: (s: string) => `\x1b[32m${s}\x1b[0m`,
  amar: (s: string) => `\x1b[33m${s}\x1b[0m`,
  azul: (s: string) => `\x1b[34m${s}\x1b[0m`,
  rosa: (s: string) => `\x1b[35m${s}\x1b[0m`,
  ciano: (s: string) => `\x1b[36m${s}\x1b[0m`,
  neg: (s: string) => `\x1b[1m${s}\x1b[0m`,
  cinza: (s: string) => `\x1b[90m${s}\x1b[0m`,
};

export const SOMENTE_LEITURA = ['/evidencias', '/mnt', '/casos'];
export const HOME = '/home/perito';

// ---------- utilidades ----------
export function caminho(ctx: Ctx, p: string): string {
  if (p === '~') return HOME;
  if (p.startsWith('~/')) p = HOME + p.slice(1);
  return normalizarCaminho(ctx.cwd, p);
}
export function pegarNo(ctx: Ctx, p: string): No {
  const no = achar(ctx.raiz, caminho(ctx, p));
  if (!no) throw new Error(`${p}: Arquivo ou diretório inexistente`);
  return no;
}
export function pegarArq(ctx: Ctx, p: string): Arquivo {
  const no = pegarNo(ctx, p);
  if (no.tipo === 'pasta') throw new Error(`${p}: É um diretório`);
  return no;
}
const dec = new TextDecoder('utf-8', { fatal: false });
export function ehBinario(b: Uint8Array): boolean {
  const n = Math.min(b.length, 2048);
  for (let i = 0; i < n; i++) if (b[i] === 0) return true;
  return false;
}
/** Conteúdo como texto: arquivo binário vira bytes com lixo trocado por ponto, como num cat corajoso. */
export function lerTexto(ctx: Ctx, p: string, permitirBinario = true): string {
  const a = pegarArq(ctx, p);
  const t = textoDe(a);
  if (t !== null) return t;
  const b = bytesDe(a);
  if (!permitirBinario) throw new Error(`${p}: arquivo binário`);
  return Array.from(b.slice(0, 4096), (x) => (x >= 32 && x < 127) || x === 10 ? String.fromCharCode(x) : x === 0 ? '' : '·').join('');
}
function entradaOuArquivos(args: string[], entrada: string | null, ctx: Ctx): { nome: string; txt: string }[] {
  if (!args.length) {
    if (entrada === null) throw new Error('faltou o arquivo (ou um pipe com entrada)');
    return [{ nome: '(entrada)', txt: entrada }];
  }
  return args.map((a) => ({ nome: a, txt: a === '-' && entrada !== null ? entrada : lerTexto(ctx, a) }));
}
function opcoes(args: string[], comValor: string[] = []): { flags: Set<string>; valores: Record<string, string>; resto: string[] } {
  const flags = new Set<string>();
  const valores: Record<string, string> = {};
  const resto: string[] = [];
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a.startsWith('--') && a.length > 2) {
      const [k, v] = a.slice(2).split('=');
      if (v !== undefined) valores[k] = v;
      else if (comValor.includes('--' + k)) valores[k] = args[++i] ?? '';
      else flags.add(k);
    } else if (a.startsWith('-') && a.length > 1 && !/^-\d/.test(a)) {
      const corpo = a.slice(1);
      if (comValor.includes('-' + corpo[0])) {
        valores[corpo[0]] = corpo.length > 1 ? corpo.slice(1) : args[++i] ?? '';
      } else for (const c of corpo) flags.add(c);
    } else resto.push(a);
  }
  return { flags, valores, resto };
}
export { opcoes };

export function hexdump(b: Uint8Array, inicio = 0, max = 512): string {
  const out: string[] = [];
  const fim = Math.min(b.length, inicio + max);
  for (let o = inicio; o < fim; o += 16) {
    const fatia = b.slice(o, Math.min(o + 16, fim));
    const hex = Array.from(fatia, (x) => x.toString(16).padStart(2, '0'));
    const grupos: string[] = [];
    for (let i = 0; i < 16; i += 2) grupos.push((hex[i] ?? '  ') + (hex[i + 1] ?? '  '));
    const asc = Array.from(fatia, (x) => (x >= 32 && x < 127 ? String.fromCharCode(x) : '.')).join('');
    out.push(`${o.toString(16).padStart(8, '0')}: ${grupos.join(' ')}  ${asc}`);
  }
  return out.join('\n');
}

export function tipoArquivo(a: Arquivo): string {
  const e = a.especial;
  if (e?.tipo === 'binario' && e.formato) return e.formato;
  const b = bytesDe(a);
  const ini = dec.decode(b.slice(0, 16));
  if (ini.startsWith('SQLite format 3')) return 'SQLite 3.x database, last written using SQLite version 3039002';
  if (ini.startsWith('regf')) return 'MS Windows registry file, NT/2000 or above';
  if (b[0] === 0xd4 && b[1] === 0xc3) return 'pcap capture file, microsecond ts (little-endian) - version 2.4 (Ethernet, capture length 65535)';
  if (ini.startsWith('PAGEDU64')) return 'MS Windows 64bit crash dump, full dump';
  if (b[0] === 0xff && b[1] === 0xd8) return 'JPEG image data, Exif standard: [TIFF image data, big-endian]';
  if (b[0] === 0x4c && b[4] === 0x01 && b[5] === 0x14) return 'MS Windows shortcut, Item id list present, Points to a file or directory, Has Relative path';
  if (ini.startsWith('ElfFile')) return 'MS Windows Vista Event Log, 3 chunks (no. 2 in use), next record no. 1234';
  if (ini.startsWith('MAM')) return 'MS Windows 10+ Prefetch, compressed (Xpress Huffman)';
  if (ini.startsWith('FILE0')) return 'data';
  if (ini.startsWith('EVF')) return 'EWF/Expert Witness image file format';
  if (ini.startsWith('%PDF')) return 'PDF document, version 1.7';
  if (ini.startsWith('PK')) return 'Zip archive data, at least v2.0 to extract';
  if (ini.startsWith('\x7fELF')) return 'ELF 64-bit LSB pie executable, x86-64, dynamically linked, stripped';
  if (ini.startsWith('MZ')) return 'PE32+ executable (GUI) x86-64, for MS Windows';
  if (e?.tipo === 'wtmp') return 'data';
  if (ehBinario(b)) return 'data';
  const t = textoDe(a) ?? '';
  const tt = t.trimStart();
  if (tt.startsWith('{') || tt.startsWith('[')) return 'JSON text data';
  if (/^[^\n]*,[^\n]*,/.test(t)) return 'CSV text';
  if (/[^\x00-\x7f]/.test(t)) return 'UTF-8 Unicode text';
  return t.length ? 'ASCII text' : 'empty';
}

function globParaRe(g: string): RegExp {
  return new RegExp('^' + g.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*').replace(/\?/g, '.') + '$', 'i');
}

// ---------- tokenização ----------
interface Tok { v: string; aspas: boolean }
function tokenizar(linha: string): Tok[][] {
  const pipes: Tok[][] = [[]];
  let atual = '';
  let aspas: string | null = null;
  let teveAspas = false;
  let tem = false;
  const fecha = () => {
    if (tem) pipes[pipes.length - 1].push({ v: atual, aspas: teveAspas });
    atual = '';
    tem = false;
    teveAspas = false;
  };
  for (let i = 0; i < linha.length; i++) {
    const c = linha[i];
    if (aspas) {
      if (c === aspas) aspas = null;
      else if (c === '\\' && aspas === '"' && (linha[i + 1] === '"' || linha[i + 1] === '\\')) atual += linha[++i];
      else atual += c;
      continue;
    }
    if (c === "'" || c === '"') { aspas = c; teveAspas = true; tem = true; continue; }
    if (c === '\\' && i + 1 < linha.length) { atual += linha[++i]; tem = true; continue; }
    if (/\s/.test(c)) { fecha(); continue; }
    if (c === '|') { fecha(); pipes.push([]); continue; }
    if (c === '>') {
      fecha();
      if (linha[i + 1] === '>') { pipes[pipes.length - 1].push({ v: '>>', aspas: false }); i++; }
      else pipes[pipes.length - 1].push({ v: '>', aspas: false });
      continue;
    }
    atual += c;
    tem = true;
  }
  if (aspas) throw new Error('aspas sem fechar');
  fecha();
  return pipes;
}

function expandir(t: Tok, ctx: Ctx): string[] {
  if (t.aspas || !/[*?]/.test(t.v) || t.v.startsWith('-')) return [t.v];
  const idx = t.v.lastIndexOf('/');
  const dir = idx >= 0 ? t.v.slice(0, idx) || '/' : '.';
  const pad = t.v.slice(idx + 1);
  const no = achar(ctx.raiz, caminho(ctx, dir));
  if (!no || no.tipo !== 'pasta') return [t.v];
  const re = globParaRe(pad);
  const nomes = Object.keys(no.filhos).filter((n) => re.test(n) && !(no.filhos[n].tipo === 'arq' && (no.filhos[n] as Arquivo).apagado)).sort();
  if (!nomes.length) return [t.v];
  return nomes.map((n) => (idx >= 0 ? `${t.v.slice(0, idx + 1)}${n}` : n));
}

export function podeGravar(p: string): boolean {
  return !SOMENTE_LEITURA.some((r) => p === r || p.startsWith(r + '/'));
}

/** Executa uma linha de comando completa. Devolve o texto de saída (com cores ANSI). */
export function executarLinha(linha: string, ctx: Ctx): string {
  const limpa = linha.trim();
  if (!limpa || limpa.startsWith('#')) return '';
  ctx.historico.push(limpa);
  let pipes: Tok[][];
  try {
    pipes = tokenizar(limpa);
  } catch (e) {
    return cor.verm('bash: ' + (e as Error).message);
  }
  let entrada: string | null = null;
  for (let i = 0; i < pipes.length; i++) {
    let toks = pipes[i];
    let destino: { p: string; anexar: boolean } | null = null;
    const r = toks.findIndex((t) => !t.aspas && (t.v === '>' || t.v === '>>'));
    if (r >= 0) {
      const alvo = toks[r + 1];
      if (!alvo) return cor.verm('bash: erro de sintaxe perto de token inesperado `newline\'');
      destino = { p: caminho(ctx, alvo.v), anexar: toks[r].v === '>>' };
      toks = toks.slice(0, r);
    }
    if (!toks.length) return cor.verm('bash: erro de sintaxe perto de `|\'');
    const nome = toks[0].v;
    const args = toks.slice(1).flatMap((t) => expandir(t, ctx));
    const cmd = COMANDOS[nome];
    ctx.evento('comando', { nome, args, linha: limpa });
    if (!cmd) {
      const sugest = sugestao(nome);
      return cor.verm(`${nome}: comando não encontrado`) + (sugest ? `\n${cor.cinza(sugest)}` : '');
    }
    let saida: string;
    try {
      saida = cmd.fn(args, entrada, ctx);
    } catch (e) {
      return cor.verm((e as Error).message.startsWith(nome) ? (e as Error).message : `${nome}: ${(e as Error).message}`);
    }
    if (destino) {
      if (!podeGravar(destino.p)) return cor.verm(`bash: ${destino.p}: Sistema de arquivos somente leitura`);
      const pai = achar(ctx.raiz, destino.p.replace(/\/[^/]*$/, '') || '/');
      if (!pai || pai.tipo !== 'pasta') return cor.verm(`bash: ${destino.p}: Arquivo ou diretório inexistente`);
      const limpo = saida.replace(/\x1b\[[0-9;]*m/g, '');
      const ant = achar(ctx.raiz, destino.p);
      const base = destino.anexar && ant && ant.tipo === 'arq' ? (textoDe(ant) ?? '') : '';
      gravar(ctx.raiz, destino.p, arq(base + limpo + (limpo.endsWith('\n') || !limpo ? '' : '\n')));
      saida = '';
    }
    entrada = saida.replace(/\x1b\[[0-9;]*m/g, '');
    if (i === pipes.length - 1) return saida;
  }
  return '';
}

function sugestao(nome: string): string | null {
  const dicas: Record<string, string> = {
    dir: 'Isto aqui é Linux. Use ls.',
    cls: 'Isto aqui é Linux. Use clear.',
    type: 'Isto aqui é Linux. Use cat.',
    sudo: 'Você já é perita(o). Poder demais não é bom para ninguém.',
    vim: 'Editar evidência? Nem pensar. Leia com less, cat ou head.',
    nano: 'Editar evidência? Nem pensar.',
    less: 'Use head, tail ou grep. O less tirou férias.',
  };
  return dicas[nome.toLowerCase()] ?? 'Digite help para ver os comandos ou man <comando> para o manual.';
}

// ---------- comandos básicos ----------
registrar('help', { resumo: 'lista os comandos', uso: 'help' }, () => {
  const linhas = Object.entries(COMANDOS).sort(([a], [b]) => a.localeCompare(b)).map(([n, c]) => `  ${cor.ciano(n.padEnd(12))} ${c.man.resumo}`);
  return `${cor.neg('Comandos da estação pericial')} (use ${cor.amar('man <comando>')} para o manual)\n${linhas.join('\n')}\n\nTambém valem pipes (|), redirecionamento (> e >>) e curingas (*).`;
});

registrar('man', { resumo: 'manual de um comando', uso: 'man <comando>' }, (args) => {
  const c = COMANDOS[args[0]];
  if (!args[0]) throw new Error('Qual manual você quer? Exemplo: man grep');
  if (!c) throw new Error(`Não há entrada de manual para ${args[0]}`);
  const m = c.man;
  let s = `${cor.neg(args[0].toUpperCase())}  ${m.resumo}\n\n${cor.amar('USO')}\n  ${m.uso}`;
  if (m.exemplos?.length) s += `\n\n${cor.amar('EXEMPLOS')}\n${m.exemplos.map((e) => '  ' + e).join('\n')}`;
  if (m.nota) s += `\n\n${cor.amar('NOTA')}\n  ${m.nota}`;
  return s;
});

registrar('pwd', { resumo: 'mostra o diretório atual', uso: 'pwd' }, (_a, _e, ctx) => ctx.cwd);
registrar('whoami', { resumo: 'quem é você (filosoficamente, perito)', uso: 'whoami' }, (_a, _e, ctx) => ctx.usuario);
registrar('hostname', { resumo: 'nome da estação', uso: 'hostname' }, (_a, _e, ctx) => ctx.host);
registrar('date', { resumo: 'data e hora da estação (UTC)', uso: 'date' }, () => 'Sun Nov 22 14:00:00 UTC 2026');
registrar('clear', { resumo: 'limpa a tela', uso: 'clear' }, () => '\x00LIMPAR');
registrar('history', { resumo: 'comandos já digitados', uso: 'history' }, (_a, _e, ctx) => ctx.historico.map((h, i) => `${String(i + 1).padStart(5)}  ${h}`).join('\n'));
registrar('echo', { resumo: 'repete o texto', uso: 'echo <texto>' }, (args) => args.filter((a) => a !== '-n' && a !== '-e').join(' '));

registrar('cd', { resumo: 'muda de diretório', uso: 'cd <diretório>', exemplos: ['cd /evidencias', 'cd ..', 'cd ~'] }, (args, _e, ctx) => {
  const alvo = caminho(ctx, args[0] ?? '~');
  const no = achar(ctx.raiz, alvo);
  if (!no) throw new Error(`${args[0]}: Arquivo ou diretório inexistente`);
  if (no.tipo !== 'pasta') throw new Error(`${args[0]}: Não é um diretório`);
  ctx.cwd = alvo;
  return '';
});

const tamH = (n: number) => (n < 1024 ? `${n}` : n < 1048576 ? `${(n / 1024).toFixed(1)}K` : n < 1073741824 ? `${(n / 1048576).toFixed(1)}M` : `${(n / 1073741824).toFixed(1)}G`);
const dataLs = (d?: Date) => {
  if (!d) return 'Nov 22 13:58';
  const m = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][d.getUTCMonth()];
  return `${m} ${String(d.getUTCDate()).padStart(2)} ${d.getUTCFullYear() === 2026 ? `${String(d.getUTCHours()).padStart(2, '0')}:${String(d.getUTCMinutes()).padStart(2, '0')}` : ` ${d.getUTCFullYear()}`}`;
};
registrar('ls', { resumo: 'lista arquivos', uso: 'ls [-l] [-a] [-h] [caminho...]', exemplos: ['ls -lh /evidencias', 'ls *.db'], nota: 'Arquivos apagados não aparecem no ls. Para eles existem a tabela MFT e a carga por assinatura (formiga).' }, (args, _e, ctx) => {
  const o = opcoes(args);
  const alvos = o.resto.length ? o.resto : ['.'];
  const blocos: string[] = [];
  for (const alvo of alvos) {
    const no = pegarNo(ctx, alvo);
    const itens: [string, No][] = no.tipo === 'pasta' ? Object.entries(no.filhos).filter(([n, f]) => (o.flags.has('a') || !n.startsWith('.')) && !(f.tipo === 'arq' && f.apagado)).sort(([a], [b]) => a.localeCompare(b)) : [[alvo, no]];
    const fmtNome = (n: string, f: No) => {
      const q = /\s/.test(n) ? `'${n}'` : n;
      return f.tipo === 'pasta' ? cor.azul(q) : q;
    };
    let s: string;
    if (o.flags.has('l')) {
      s = `total ${itens.length}\n` + itens.map(([n, f]) => {
        const t = f.tipo === 'pasta' ? 4096 : tamanho(f);
        return `${f.tipo === 'pasta' ? 'dr-xr-xr-x' : '-r--r--r--'} 1 perito perito ${(o.flags.has('h') ? tamH(t) : String(t)).padStart(9)} ${dataLs(f.mtime)} ${fmtNome(n, f)}`;
      }).join('\n');
    } else s = itens.map(([n, f]) => fmtNome(n, f)).join('  ');
    blocos.push(alvos.length > 1 ? `${alvo}:\n${s}` : s);
  }
  return blocos.join('\n\n');
});

registrar('tree', { resumo: 'árvore de diretórios', uso: 'tree [-L nível] [caminho]', exemplos: ['tree -L 2 /mnt/LACRE-0001'] }, (args, _e, ctx) => {
  const o = opcoes(args, ['-L']);
  const max = Number(o.valores.L ?? 3);
  const raiz = o.resto[0] ?? '.';
  const no = pegarNo(ctx, raiz);
  const out: string[] = [cor.azul(raiz)];
  let pastas = 0;
  let arqs = 0;
  const rec = (n: No, pref: string, nivel: number) => {
    if (n.tipo !== 'pasta' || nivel > max) return;
    const ents = Object.entries(n.filhos).filter(([, f]) => !(f.tipo === 'arq' && f.apagado)).sort(([a], [b]) => a.localeCompare(b));
    const lim = ents.length > 60 ? 60 : ents.length;
    ents.slice(0, lim).forEach(([nome, f], i) => {
      const ult = i === lim - 1 && ents.length <= 60;
      out.push(`${pref}${ult ? '└── ' : '├── '}${f.tipo === 'pasta' ? cor.azul(nome) : nome}`);
      if (f.tipo === 'pasta') { pastas++; rec(f, pref + (ult ? '    ' : '│   '), nivel + 1); } else arqs++;
    });
    if (ents.length > 60) out.push(`${pref}└── ${cor.cinza(`(+${ents.length - 60} itens)`)}`);
  };
  rec(no, '', 1);
  out.push(`\n${pastas} diretórios, ${arqs} arquivos`);
  return out.join('\n');
});

registrar('cat', { resumo: 'mostra o conteúdo', uso: 'cat <arquivo...>', nota: 'Em arquivo binário, cat mostra lixo. Prefira strings, xxd ou a ferramenta certa para o formato.' }, (args, entrada, ctx) => {
  if (!args.length && entrada !== null) return entrada;
  return args.map((a) => {
    const arqv = pegarArq(ctx, a);
    const t = textoDe(arqv);
    if (t !== null) return t;
    return cor.cinza('[conteúdo binário, mostrando os primeiros 4 KB do jeito que dá]\n') + lerTexto(ctx, a);
  }).join('\n');
});

function cortarLinhas(args: string[], entrada: string | null, ctx: Ctx, cauda: boolean): string {
  let n = 10;
  const resto: string[] = [];
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '-n') n = Number(args[++i]);
    else if (/^-n\d+$/.test(args[i])) n = Number(args[i].slice(2));
    else if (/^-\d+$/.test(args[i])) n = Number(args[i].slice(1));
    else resto.push(args[i]);
  }
  return entradaOuArquivos(resto, entrada, ctx).map(({ txt }) => {
    const ls = txt.replace(/\n$/, '').split('\n');
    return (cauda ? ls.slice(-n) : ls.slice(0, n)).join('\n');
  }).join('\n');
}
registrar('head', { resumo: 'primeiras linhas', uso: 'head [-n N] [arquivo]', exemplos: ['head -n 20 auth.log', 'sort x | head -5'] }, (a, e, c) => cortarLinhas(a, e, c, false));
registrar('tail', { resumo: 'últimas linhas', uso: 'tail [-n N] [arquivo]' }, (a, e, c) => cortarLinhas(a, e, c, true));

registrar('grep', {
  resumo: 'procura padrão (expressão regular)',
  uso: 'grep [-i] [-v] [-c] [-n] [-o] [-E] [-a] [-r] [-l] [-A N] padrão [arquivo...]',
  exemplos: ['grep -i senha notas.txt', 'grep -c "Failed password" auth.log', 'grep -E "([0-9]{1,3}\\.){3}[0-9]{1,3}" -o log.txt | sort | uniq -c', 'grep -a -i "http" memoria.raw', 'grep -r -l pix /mnt/LACRE-0002'],
  nota: 'Em arquivo binário, o grep só avisa que achou. Use -a para tratar como texto (ou strings antes).',
}, (args, entrada, ctx) => {
  const o = opcoes(args, ['-A', '-B', '-e', '-m']);
  const padrao = o.valores.e ?? o.resto.shift();
  if (padrao === undefined) throw new Error('uso: grep [OPÇÕES] PADRÃO [ARQUIVO...]');
  let fonte = padrao;
  if (!o.flags.has('E') && !o.flags.has('P')) fonte = padrao.replace(/\\\|/g, '\u0000').replace(/[|+?(){}]/g, '\\$&').replace(/\u0000/g, '|');
  if (o.flags.has('F')) fonte = padrao.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  let re: RegExp;
  try {
    re = new RegExp(fonte, o.flags.has('i') ? 'i' : '');
  } catch {
    throw new Error(`expressão regular inválida: ${padrao}`);
  }
  const reG = new RegExp(re.source, re.flags + 'g');
  let alvos = o.resto;
  if (o.flags.has('r') || o.flags.has('R')) {
    alvos = alvos.length ? alvos : ['.'];
    alvos = alvos.flatMap((a) => {
      const no = pegarNo(ctx, a);
      if (no.tipo === 'arq') return [a];
      return [...andar(no, caminho(ctx, a) === '/' ? '' : caminho(ctx, a))].filter(([, n]) => n.tipo === 'arq' && !(n as Arquivo).apagado).map(([p]) => p);
    });
  }
  const multi = alvos.length > 1;
  const A = Number(o.valores.A ?? 0);
  const m = o.valores.m ? Number(o.valores.m) : Infinity;
  const fontes: { nome: string; txt: string; bin: boolean }[] = alvos.length
    ? alvos.map((a) => {
        const arqv = pegarArq(ctx, a);
        const t = textoDe(arqv);
        if (t !== null) return { nome: a, txt: t, bin: false };
        const b = bytesDe(arqv);
        const txt = Array.from(b, (x) => (x >= 32 && x < 127) || x === 10 || x === 9 ? String.fromCharCode(x) : x >= 0xc0 ? '\u00bf' : '\n').join('');
        return { nome: a, txt: dec.decode(b).length && !ehBinario(b) ? dec.decode(b) : txt, bin: ehBinario(b) };
      })
    : [{ nome: '(entrada)', txt: entrada ?? '', bin: false }];
  const out: string[] = [];
  for (const f of fontes) {
    const linhas = f.txt.split('\n');
    const casadas: number[] = [];
    linhas.forEach((l, i) => { if (re.test(l) !== o.flags.has('v') && casadas.length < m) casadas.push(i); });
    if (f.bin && !o.flags.has('a') && !o.flags.has('c') && !o.flags.has('l')) {
      if (casadas.length) out.push(`grep: ${f.nome}: arquivo binário corresponde`);
      continue;
    }
    if (o.flags.has('l')) { if (casadas.length) out.push(f.nome); continue; }
    if (o.flags.has('c')) { out.push(multi ? `${f.nome}:${casadas.length}` : String(casadas.length)); continue; }
    const pref = (i: number) => (multi ? cor.rosa(f.nome) + ':' : '') + (o.flags.has('n') ? cor.verde(String(i + 1)) + ':' : '');
    for (const i of casadas) {
      if (o.flags.has('o') && !o.flags.has('v')) {
        for (const mm of linhas[i].matchAll(reG)) out.push(pref(i) + cor.verm(mm[0]));
      } else {
        out.push(pref(i) + (o.flags.has('v') ? linhas[i] : linhas[i].replace(reG, (x) => cor.verm(x))));
        for (let k = 1; k <= A && i + k < linhas.length; k++) out.push(pref(i + k) + linhas[i + k]);
        if (A) out.push('--');
      }
    }
  }
  return out.join('\n');
});

registrar('wc', { resumo: 'conta linhas, palavras e bytes', uso: 'wc [-l] [-w] [-c] [arquivo]', exemplos: ['grep -c x arq', 'cat arq | wc -l'] }, (args, entrada, ctx) => {
  const o = opcoes(args);
  return entradaOuArquivos(o.resto, entrada, ctx).map(({ nome, txt }) => {
    const l = txt ? txt.split('\n').length - (txt.endsWith('\n') ? 1 : 0) : 0;
    const w = txt.split(/\s+/).filter(Boolean).length;
    const c = new TextEncoder().encode(txt).length;
    const sufixo = nome === '(entrada)' ? '' : ' ' + nome;
    if (o.flags.has('l')) return `${l}${sufixo}`;
    if (o.flags.has('w')) return `${w}${sufixo}`;
    if (o.flags.has('c')) return `${c}${sufixo}`;
    return `${String(l).padStart(7)} ${String(w).padStart(7)} ${String(c).padStart(7)}${sufixo}`;
  }).join('\n');
});

registrar('sort', { resumo: 'ordena linhas', uso: 'sort [-n] [-r] [-u] [-t sep] [-k campo] [arquivo]', exemplos: ['sort -nr', 'sort -t, -k3'] }, (args, entrada, ctx) => {
  const o = opcoes(args, ['-t', '-k']);
  const txt = entradaOuArquivos(o.resto, entrada, ctx).map((x) => x.txt.replace(/\n$/, '')).join('\n');
  let ls = txt.split('\n').filter((l, i, arr) => l !== '' || i < arr.length - 1);
  const k = o.valores.k ? Number(o.valores.k.split(',')[0]) : 0;
  const chave = (l: string) => (k ? (o.valores.t ? l.split(o.valores.t) : l.trim().split(/\s+/))[k - 1] ?? '' : l);
  const num = o.flags.has('n') || o.flags.has('g');
  ls.sort((a, b) => {
    const x = chave(a);
    const y = chave(b);
    const r = num ? (parseFloat(x) || 0) - (parseFloat(y) || 0) : x < y ? -1 : x > y ? 1 : 0;
    return r;
  });
  if (o.flags.has('r')) ls.reverse();
  if (o.flags.has('u')) ls = ls.filter((l, i) => i === 0 || l !== ls[i - 1]);
  return ls.join('\n');
});

registrar('uniq', { resumo: 'junta linhas repetidas consecutivas', uso: 'uniq [-c] [arquivo]', exemplos: ['sort ips.txt | uniq -c | sort -nr | head'], nota: 'O uniq só junta repetidas que estão lado a lado. Por isso quase sempre vem depois de um sort.' }, (args, entrada, ctx) => {
  const o = opcoes(args);
  const ls = entradaOuArquivos(o.resto, entrada, ctx)[0].txt.replace(/\n$/, '').split('\n');
  const out: [string, number][] = [];
  for (const l of ls) {
    if (out.length && out[out.length - 1][0] === l) out[out.length - 1][1]++;
    else out.push([l, 1]);
  }
  return out.filter(([, n]) => !o.flags.has('d') || n > 1).map(([l, n]) => (o.flags.has('c') ? `${String(n).padStart(7)} ${l}` : l)).join('\n');
});

registrar('cut', { resumo: 'recorta colunas', uso: 'cut -d <sep> -f <campos> [arquivo]', exemplos: ['cut -d, -f2,5 timeline.csv', 'cut -d" " -f1 access.log'] }, (args, entrada, ctx) => {
  const o = opcoes(args, ['-d', '-f', '-c']);
  const sep = o.valores.d ?? '\t';
  const campos = (o.valores.f ?? o.valores.c ?? '1').split(',').flatMap((x) => {
    const [a, b] = x.split('-');
    if (b === undefined) return [Number(a)];
    const fim = b === '' ? 99 : Number(b);
    return Array.from({ length: fim - Number(a || 1) + 1 }, (_, i) => Number(a || 1) + i);
  });
  return entradaOuArquivos(o.resto, entrada, ctx)[0].txt.replace(/\n$/, '').split('\n').map((l) => {
    if (o.valores.c) return campos.map((c) => l[c - 1] ?? '').join('');
    const partes = l.split(sep);
    if (partes.length === 1) return l;
    return campos.map((c) => partes[c - 1]).filter((x) => x !== undefined).join(sep);
  }).join('\n');
});

registrar('awk', { resumo: 'imprime colunas (versão de bolso)', uso: "awk [-F sep] '{print $N, $M}' [arquivo]", exemplos: ["awk '{print $1}' access.log", "awk -F, '{print $3}' dados.csv"], nota: 'Só o {print ...} e condição simples ($3 > 100 ou /texto/). O resto do awk é poesia que fica para outro dia.' }, (args, entrada, ctx) => {
  const o = opcoes(args, ['-F']);
  const prog = o.resto.shift() ?? '';
  const m = prog.match(/^\s*(?:(\/[^/]*\/|\$\d+\s*(?:==|!=|>=|<=|>|<)\s*\S+)\s*)?\{\s*print\s*(.*?)\s*\}\s*$/);
  if (!m) throw new Error("só entendo '{print $1, $2}' (com condição opcional)");
  const cond = m[1];
  const exprs = m[2] ? m[2].split(',').map((s) => s.trim()) : ['$0'];
  const sep = o.valores.F;
  return entradaOuArquivos(o.resto, entrada, ctx)[0].txt.replace(/\n$/, '').split('\n').flatMap((l) => {
    const f = sep ? l.split(sep === '\\t' ? '\t' : sep) : l.trim().split(/\s+/);
    const campo = (e: string) => (e === '$0' ? l : e === 'NF' ? String(f.length) : e.startsWith('$') ? f[Number(e.slice(1)) - 1] ?? '' : e.replace(/^"|"$/g, ''));
    if (cond) {
      if (cond.startsWith('/')) { if (!new RegExp(cond.slice(1, -1)).test(l)) return []; }
      else {
        const c = cond.match(/^\$(\d+)\s*(==|!=|>=|<=|>|<)\s*"?([^"]*)"?$/)!;
        const v = f[Number(c[1]) - 1] ?? '';
        const alvo = c[3];
        const num = !isNaN(Number(v)) && !isNaN(Number(alvo));
        const a: number | string = num ? Number(v) : v;
        const b: number | string = num ? Number(alvo) : alvo;
        const ok = { '==': a === b, '!=': a !== b, '>=': a >= b, '<=': a <= b, '>': a > b, '<': a < b }[c[2] as '=='];
        if (!ok) return [];
      }
    }
    return [exprs.map(campo).join(' ')];
  }).join('\n');
});

registrar('tr', { resumo: 'troca ou apaga caracteres', uso: "tr [-d] 'de' 'para'", exemplos: ["echo 'P:\\Hfref' | tr 'A-Za-z' 'N-ZA-Mn-za-m'   (ROT13 na unha)", "tr -d '\\r'"] }, (args, entrada) => {
  const o = opcoes(args);
  const exp = (s: string) => s.replace(/\\r/g, '\r').replace(/\\n/g, '\n').replace(/\\t/g, '\t').replace(/(.)-(.)/g, (_, a: string, b: string) => {
    let r = '';
    for (let c = a.charCodeAt(0); c <= b.charCodeAt(0); c++) r += String.fromCharCode(c);
    return r;
  });
  const txt = entrada ?? '';
  const de = exp(o.resto[0] ?? '');
  if (o.flags.has('d')) return [...txt].filter((c) => !de.includes(c)).join('');
  const para = exp(o.resto[1] ?? '');
  return [...txt].map((c) => { const i = de.indexOf(c); return i < 0 ? c : para[Math.min(i, para.length - 1)]; }).join('');
});

registrar('strings', { resumo: 'extrai texto legível de binário', uso: 'strings [-n mínimo] <arquivo>', exemplos: ['strings memoria.raw | grep -i http', 'strings -n 8 arquivo.bin | head'] }, (args, entrada, ctx) => {
  const o = opcoes(args, ['-n']);
  const min = Number(o.valores.n ?? 4);
  const b = o.resto.length ? bytesDe(pegarArq(ctx, o.resto[0])) : new TextEncoder().encode(entrada ?? '');
  const out: string[] = [];
  let atual: number[] = [];
  const fecha = () => {
    if (atual.length >= min) out.push(dec.decode(new Uint8Array(atual)));
    atual = [];
  };
  for (let i = 0; i < b.length; i++) {
    const x = b[i];
    if ((x >= 32 && x < 127) || x === 9) atual.push(x);
    else if (x >= 0xc2 && x <= 0xf4 && i + 1 < b.length && b[i + 1] >= 0x80 && b[i + 1] < 0xc0) { atual.push(x, b[++i]); }
    else fecha();
  }
  fecha();
  return out.join('\n');
});

registrar('xxd', { resumo: 'despejo hexadecimal', uso: 'xxd [-s início] [-l tamanho] <arquivo>', exemplos: ['xxd -l 32 imagem.jpg', 'xxd -s 0x40 -l 16 arquivo'], nota: 'Os primeiros bytes (assinatura, "magic number") dizem o tipo real do arquivo, não importa a extensão.' }, (args, entrada, ctx) => {
  const o = opcoes(args, ['-s', '-l']);
  const b = o.resto.length ? bytesDe(pegarArq(ctx, o.resto[0])) : new TextEncoder().encode(entrada ?? '');
  const ini = o.valores.s ? Number(o.valores.s) : 0;
  const len = o.valores.l ? Number(o.valores.l) : 512;
  let s = hexdump(b, ini, len);
  if (!o.valores.l && b.length - ini > 512) s += `\n${cor.cinza(`... (${b.length - ini - 512} bytes omitidos, use -l para ver mais)`)}`;
  return s;
});

registrar('file', { resumo: 'identifica o tipo pelo conteúdo (assinatura)', uso: 'file <arquivo...>', exemplos: ['file *', 'file foto_praia.jpg'] }, (args, _e, ctx) => args.map((a) => {
  const no = pegarNo(ctx, a);
  return `${a}: ${no.tipo === 'pasta' ? 'directory' : tipoArquivo(no)}`;
}).join('\n'));

for (const [nome, fn] of [['sha256sum', sha256], ['sha1sum', sha1], ['md5sum', md5]] as const) {
  registrar(nome, { resumo: `calcula o ${nome.replace('sum', '').toUpperCase()}`, uso: `${nome} <arquivo...>`, exemplos: [`${nome} /evidencias/*.E01`], nota: 'Hash é a impressão digital do arquivo. Mudou um bit, mudou tudo. É ele que prova que a evidência é a mesma do lacre até o laudo.' }, (args, entrada, ctx) => {
    if (!args.length) return `${fn(new TextEncoder().encode(entrada ?? ''))}  -`;
    return args.map((a) => `${fn(bytesDe(pegarArq(ctx, a)))}  ${a}`).join('\n');
  });
}

registrar('base64', { resumo: 'codifica ou decodifica base64', uso: 'base64 [-d] [arquivo]', exemplos: ["echo 'c2VuaGExMjM=' | base64 -d"] }, (args, entrada, ctx) => {
  const o = opcoes(args);
  const txt = o.resto.length ? lerTexto(ctx, o.resto[0]) : entrada ?? '';
  if (o.flags.has('d')) {
    try {
      const limpo = txt.replace(/\s/g, '').replace(/-/g, '+').replace(/_/g, '/');
      const pad = limpo + '='.repeat((4 - (limpo.length % 4)) % 4);
      const bin = atob(pad);
      return dec.decode(Uint8Array.from(bin, (c) => c.charCodeAt(0)));
    } catch {
      throw new Error('entrada inválida');
    }
  }
  return btoa(String.fromCharCode(...new TextEncoder().encode(txt)));
});

registrar('find', { resumo: 'procura arquivos por nome', uso: 'find <dir> [-name padrão] [-iname padrão] [-type f|d]', exemplos: ['find /mnt -name "*.db"', 'find . -iname "*whats*"'] }, (args, _e, ctx) => {
  const dir = args[0] && !args[0].startsWith('-') ? args[0] : '.';
  const o = opcoes(args.slice(dir === args[0] ? 1 : 0), ['--name', '--iname', '--type']);
  // find usa opção com um traço só e palavra inteira
  let nome: RegExp | null = null;
  let tipo: string | null = null;
  const lista = args.slice(dir === args[0] ? 1 : 0);
  for (let i = 0; i < lista.length; i++) {
    if (lista[i] === '-name' || lista[i] === '-iname') nome = globParaRe(lista[++i]);
    else if (lista[i] === '-type') tipo = lista[++i];
  }
  void o;
  const base = caminho(ctx, dir);
  const no = pegarNo(ctx, dir);
  const pref = dir === '.' ? '.' : dir.replace(/\/$/, '');
  return [...andar(no, '')].filter(([p, n]) => {
    if (n.tipo === 'arq' && n.apagado) return false;
    if (tipo === 'f' && n.tipo !== 'arq') return false;
    if (tipo === 'd' && n.tipo !== 'pasta') return false;
    if (nome && !nome.test(p.split('/').pop() ?? '')) return false;
    return true;
  }).map(([p]) => (p === '/' ? pref : pref + p)).join('\n') || (void base, '');
});

registrar('stat', { resumo: 'metadados do arquivo', uso: 'stat <arquivo>' }, (args, _e, ctx) => args.map((a) => {
  const no = pegarNo(ctx, a);
  const t = no.tipo === 'pasta' ? 4096 : tamanho(no);
  const d = no.mtime ? no.mtime.toISOString().replace('T', ' ').replace('.000Z', '.000000000 +0000') : '2026-11-22 13:58:00.000000000 +0000';
  return `  File: ${a}\n  Size: ${t}\tBlocks: ${Math.ceil(t / 512)}\t${no.tipo === 'pasta' ? 'directory' : 'regular file'}\nAccess: (0444/-r--r--r--)  Uid: (1000/perito)\nModify: ${d}\nChange: 2026-11-22 13:58:00.000000000 +0000\n Birth: -`;
}).join('\n'));

registrar('rm', { resumo: 'apaga arquivo (só na sua pasta de trabalho)', uso: 'rm <arquivo>' }, (args, _e, ctx) => {
  for (const a of args.filter((x) => !x.startsWith('-'))) {
    const p = caminho(ctx, a);
    if (!podeGravar(p)) throw new Error(`não foi possível remover '${a}': Sistema de arquivos somente leitura. E ainda bem: apagar evidência tem outro nome no Código Penal.`);
    const pai = achar(ctx.raiz, p.replace(/\/[^/]*$/, '') || '/');
    const nome = p.split('/').pop()!;
    if (!pai || pai.tipo !== 'pasta' || !pai.filhos[nome]) throw new Error(`não foi possível remover '${a}': Arquivo ou diretório inexistente`);
    delete pai.filhos[nome];
  }
  return '';
});

registrar('mkdir', { resumo: 'cria diretório (na sua pasta de trabalho)', uso: 'mkdir <dir>' }, (args, _e, ctx) => {
  for (const a of args.filter((x) => !x.startsWith('-'))) {
    const p = caminho(ctx, a);
    if (!podeGravar(p)) throw new Error(`não foi possível criar '${a}': Sistema de arquivos somente leitura`);
    if (!achar(ctx.raiz, p)) gravar(ctx.raiz, p, { tipo: 'pasta', filhos: {} });
  }
  return '';
});
