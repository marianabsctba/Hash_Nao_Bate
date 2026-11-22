// Conversões de carimbo de tempo que todo perito precisa saber de cor (ou pelo menos saber converter).
// Tudo em BigInt quando passa de 2^53, porque FILETIME não cabe em número de JavaScript sem perder precisão.

const EPOCA_FILETIME = 11644473600n; // segundos entre 1601-01-01 e 1970-01-01
const EPOCA_MAC = 978307200; // segundos entre 1970-01-01 e 2001-01-01 (Mac Absolute Time / Cocoa)
const EPOCA_WEBKIT = 11644473600n; // WebKit/Chrome: microssegundos desde 1601-01-01

/** Data UTC a partir de "AAAA-MM-DD HH:MM:SS" no fuso indicado (horas, ex.: -3 para Brasília). */
export function data(txt: string, fuso = -3): Date {
  const m = txt.match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})(?::(\d{2}))?/);
  if (!m) throw new Error('data inválida: ' + txt);
  const ms = Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +(m[6] ?? 0));
  return new Date(ms - fuso * 3600_000);
}

export const unix = (d: Date) => Math.floor(d.getTime() / 1000);
export const unixMs = (d: Date) => d.getTime();
export const filetime = (d: Date) => (BigInt(d.getTime()) * 10000n) + EPOCA_FILETIME * 10_000_000n;
export const webkit = (d: Date) => BigInt(d.getTime()) * 1000n + EPOCA_WEBKIT * 1_000_000n;
export const mac = (d: Date) => Math.floor(d.getTime() / 1000) - EPOCA_MAC;
export const macNs = (d: Date) => BigInt(mac(d)) * 1_000_000_000n;

export const deFiletime = (v: bigint) => new Date(Number((v - EPOCA_FILETIME * 10_000_000n) / 10000n));
export const deWebkit = (v: bigint) => new Date(Number((v - EPOCA_WEBKIT * 1_000_000n) / 1000n));
export const deMac = (v: number) => new Date((v + EPOCA_MAC) * 1000);
export const deUnix = (v: number) => new Date(v * 1000);

const p2 = (n: number) => String(n).padStart(2, '0');

/** Formata no fuso pedido: "2026-03-14 22:41:07". */
export function fmt(d: Date, fuso = 0, seg = true): string {
  const x = new Date(d.getTime() + fuso * 3600_000);
  const s = `${x.getUTCFullYear()}-${p2(x.getUTCMonth() + 1)}-${p2(x.getUTCDate())} ${p2(x.getUTCHours())}:${p2(x.getUTCMinutes())}`;
  return seg ? `${s}:${p2(x.getUTCSeconds())}` : s;
}
export const fmtUtc = (d: Date) => fmt(d) + ' UTC';
export const fmtBr = (d: Date) => fmt(d, -3) + ' (UTC-3)';
export const iso = (d: Date) => d.toISOString().replace('.000', '');

/** Inteiro de 64 bits em little-endian como "aa bb cc ...". */
export function le64(v: bigint): string {
  const b: string[] = [];
  for (let i = 0; i < 8; i++) {
    b.push(Number((v >> BigInt(i * 8)) & 0xffn).toString(16).padStart(2, '0'));
  }
  return b.join(' ');
}
export function le32(v: number): string {
  const b: string[] = [];
  for (let i = 0; i < 4; i++) b.push(((v >>> (i * 8)) & 0xff).toString(16).padStart(2, '0'));
  return b.join(' ');
}

/** Lê bytes hex soltos (com ou sem espaço) como inteiro little-endian. */
export function lerLE(hex: string): bigint {
  const limpo = hex.replace(/0x/gi, '').replace(/[^0-9a-f]/gi, '');
  let v = 0n;
  for (let i = limpo.length - 2; i >= 0; i -= 2) v = (v << 8n) | BigInt(parseInt(limpo.slice(i, i + 2), 16));
  return v;
}

/** Normaliza o que a pessoa digitou para "AAAA-MM-DD HH:MM" (aceita dd/mm/aaaa também). */
export function normalizarHora(txt: string): string | null {
  const t = txt.trim();
  let m = t.match(/(\d{4})-(\d{1,2})-(\d{1,2})[ T,]+(\d{1,2})[:h](\d{2})/i);
  if (m) return `${m[1]}-${p2(+m[2])}-${p2(+m[3])} ${p2(+m[4])}:${m[5]}`;
  m = t.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})[ ,às]+(\d{1,2})[:h](\d{2})/i);
  if (m) return `${m[3]}-${p2(+m[2])}-${p2(+m[1])} ${p2(+m[4])}:${m[5]}`;
  return null;
}

export const rot13 = (s: string) =>
  s.replace(/[a-z]/gi, (c) => {
    const b = c <= 'Z' ? 65 : 97;
    return String.fromCharCode(((c.charCodeAt(0) - b + 13) % 26) + b);
  });

/** Graus decimais para "25°25'44.6"S". */
export function dms(dec: number, lat: boolean): string {
  const h = dec < 0 ? (lat ? 'S' : 'W') : lat ? 'N' : 'E';
  const a = Math.abs(dec);
  const g = Math.floor(a);
  const mi = Math.floor((a - g) * 60);
  const s = ((a - g) * 60 - mi) * 60;
  return `${g}°${mi}'${s.toFixed(1)}"${h}`;
}
