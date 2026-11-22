// Sistema de arquivos de mentirinha, mas com bytes de verdade onde importa.
import { Rng } from './rng';

export type Celula = string | number | null;
export interface Tabela {
  colunas: string[];
  linhas: Celula[][];
}
export interface Pacote {
  t: Date;
  src: string;
  dst: string;
  sport: number;
  dport: number;
  proto: 'TCP' | 'UDP' | 'ICMP';
  app?: 'DNS' | 'HTTP' | 'TLS' | 'FTP' | 'SMB' | 'NTP' | 'SSH';
  info: string;
  dados?: string;
  fluxo?: number;
}
export interface Processo {
  pid: number;
  ppid: number;
  nome: string;
  inicio: Date;
  cmd: string;
  usuario?: string;
  injetado?: boolean;
}
export interface Conexao {
  pid: number;
  proto: string;
  local: string;
  remoto: string;
  estado: string;
}
export interface RegMft {
  entrada: number;
  caminho: string;
  tamanho: number;
  si: [Date, Date, Date, Date]; // $STANDARD_INFORMATION: criado, modificado, mft modificado, acesso
  fn: [Date, Date, Date, Date]; // $FILE_NAME
  apagado?: boolean;
}
export type Especial =
  | { tipo: 'sqlite'; tabelas: Record<string, Tabela> }
  | { tipo: 'hive'; nome: string; chaves: Record<string, Record<string, string>>; escrita: Record<string, Date> }
  | { tipo: 'pcap'; pacotes: Pacote[] }
  | { tipo: 'mem'; perfil: string; capturada: Date; processos: Processo[]; conexoes: Conexao[]; ruido: string[] }
  | { tipo: 'mft'; registros: RegMft[] }
  | { tipo: 'prefetch'; exe: string; hashPf: string; execucoes: number; ultimas: Date[]; arquivos: string[] }
  | { tipo: 'jpeg'; exif: Record<string, string>; legenda: string }
  | { tipo: 'lnk'; alvo: string; criado: Date; modificado: Date; volume: string; serialVolume: string; maquina: string }
  | { tipo: 'evtx'; canal: string; eventos: { t: Date; id: number; nivel: string; dados: Record<string, string> }[] }
  | { tipo: 'wtmp'; entradas: { usuario: string; tty: string; origem: string; inicio: Date; fim: Date | null }[] }
  | { tipo: 'binario'; magia: number[]; texto: string[]; meta?: Record<string, string>; decodificado?: string; formato?: string };

export interface Arquivo {
  tipo: 'arq';
  texto?: string | (() => string);
  especial?: Especial;
  tam?: number;
  mtime?: Date;
  apagado?: boolean;
  _cache?: Uint8Array;
}
export interface Pasta {
  tipo: 'pasta';
  filhos: Record<string, No>;
  mtime?: Date;
}
export type No = Arquivo | Pasta;

export const pasta = (filhos: Record<string, No> = {}): Pasta => ({ tipo: 'pasta', filhos });
export const arq = (texto: string | (() => string), mtime?: Date): Arquivo => ({ tipo: 'arq', texto, mtime });
export const esp = (especial: Especial, extra: Partial<Arquivo> = {}): Arquivo => ({ tipo: 'arq', especial, ...extra });

const enc = new TextEncoder();

export function textoDe(a: Arquivo): string | null {
  if (a.texto === undefined) return null;
  return typeof a.texto === 'function' ? (a.texto = a.texto()) : a.texto;
}

/** Bytes do arquivo. Formatos especiais viram um binário plausível: assinatura certa e strings no meio do lixo. */
export function bytesDe(a: Arquivo): Uint8Array {
  if (a._cache) return a._cache;
  const t = textoDe(a);
  if (t !== null) return (a._cache = enc.encode(t));
  const e = a.especial!;
  const partes: string[] = [];
  let magia: number[] = [];
  switch (e.tipo) {
    case 'sqlite':
      magia = [...enc.encode('SQLite format 3'), 0, 0x10, 0, 1, 1, 0, 0x40, 0x20, 0x20];
      for (const [nome, tb] of Object.entries(e.tabelas)) {
        partes.push(`CREATE TABLE ${nome} (${tb.colunas.join(', ')})`);
        for (const l of tb.linhas) partes.push(l.filter((c) => c !== null).join('\u0001'));
      }
      break;
    case 'hive':
      magia = [...enc.encode('regf'), 0x2a, 0x1c, 0, 0, 0x2a, 0x1c, 0, 0];
      partes.push('hbin');
      for (const [k, vals] of Object.entries(e.chaves)) {
        partes.push('nk ' + k.split('\\').pop());
        for (const [n, v] of Object.entries(vals)) partes.push('vk ' + n, v);
      }
      break;
    case 'pcap':
      magia = [0xd4, 0xc3, 0xb2, 0xa1, 2, 0, 4, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0xff, 0xff, 0, 0, 1, 0, 0, 0];
      for (const p of e.pacotes) partes.push(p.info, p.dados ?? '');
      break;
    case 'mem':
      magia = [...enc.encode('PAGEDU64'), 0, 0, 0, 0];
      for (const p of e.processos) partes.push(p.nome, p.cmd);
      for (const c of e.conexoes) partes.push(c.remoto);
      partes.push(...e.ruido);
      break;
    case 'mft':
      for (const r of e.registros) partes.push('FILE0', r.caminho.split('\\').pop()!);
      magia = [...enc.encode('FILE0'), 0x03, 0, 0, 0, 0, 0, 0, 0, 0];
      break;
    case 'prefetch':
      magia = [...enc.encode('MAM'), 0x04];
      partes.push(e.exe, ...e.arquivos);
      break;
    case 'jpeg':
      magia = [0xff, 0xd8, 0xff, 0xe1, 0x1c, 0x45, ...enc.encode('Exif'), 0, 0, 0x4d, 0x4d, 0, 0x2a];
      partes.push(...Object.values(e.exif));
      break;
    case 'lnk':
      magia = [0x4c, 0, 0, 0, 0x01, 0x14, 0x02, 0, 0, 0, 0, 0, 0xc0, 0, 0, 0, 0, 0, 0, 0x46];
      partes.push(e.alvo, e.volume, e.maquina);
      break;
    case 'evtx':
      magia = [...enc.encode('ElfFile'), 0];
      for (const ev of e.eventos) partes.push(...Object.values(ev.dados));
      break;
    case 'wtmp':
      magia = [7, 0, 0, 0];
      for (const w of e.entradas) partes.push(w.usuario, w.tty, w.origem);
      break;
    case 'binario':
      magia = e.magia;
      partes.push(...e.texto);
      if (e.meta) partes.push(...Object.values(e.meta));
      break;
  }
  // lixo determinístico entre as strings, para o `strings` ter o que filtrar
  const r = new Rng(magia.reduce((s, x) => s * 31 + x, 7) + partes.length);
  const saida: number[] = [...magia];
  for (const p of partes) {
    const n = r.int(4, 24);
    for (let i = 0; i < n; i++) saida.push(r.chance(0.5) ? 0 : r.int(1, 255) & (r.chance(0.6) ? 0x1f : 0xff));
    saida.push(...enc.encode(p));
  }
  if (e.tipo === 'jpeg') saida.push(0xff, 0xd9);
  return (a._cache = new Uint8Array(saida));
}

export function tamanho(a: Arquivo): number {
  return a.tam ?? bytesDe(a).length;
}

export function normalizarCaminho(cwd: string, p: string): string {
  const base = p.startsWith('/') ? [] : cwd.split('/').filter(Boolean);
  for (const parte of p.split('/')) {
    if (!parte || parte === '.') continue;
    if (parte === '..') base.pop();
    else base.push(parte);
  }
  return '/' + base.join('/');
}

export function achar(raiz: Pasta, caminho: string): No | null {
  let no: No = raiz;
  for (const parte of caminho.split('/').filter(Boolean)) {
    if (no.tipo !== 'pasta') return null;
    const prox: No | undefined = no.filhos[parte];
    if (!prox) return null;
    no = prox;
  }
  return no;
}

export function gravar(raiz: Pasta, caminho: string, no: No): void {
  const partes = caminho.split('/').filter(Boolean);
  const nome = partes.pop()!;
  let p = raiz;
  for (const parte of partes) {
    let f = p.filhos[parte];
    if (!f) f = p.filhos[parte] = pasta();
    if (f.tipo !== 'pasta') throw new Error(`${parte}: não é diretório`);
    p = f;
  }
  p.filhos[nome] = no;
}

/** Percorre a árvore devolvendo [caminho, nó]. */
export function* andar(no: No, caminho = ''): Generator<[string, No]> {
  yield [caminho || '/', no];
  if (no.tipo === 'pasta') for (const [n, f] of Object.entries(no.filhos)) yield* andar(f, `${caminho}/${n}`);
}
