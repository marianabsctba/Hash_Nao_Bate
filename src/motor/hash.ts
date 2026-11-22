// SHA-256, SHA-1 e MD5 síncronos (o terminal do jogo não espera Promise).
const hexb = (b: Uint8Array) => Array.from(b, (x) => x.toString(16).padStart(2, '0')).join('');

const K256 = new Uint32Array([
  0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5, 0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3,
  0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174, 0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
  0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967, 0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13,
  0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85, 0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
  0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3, 0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208,
  0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
]);

function preparar(msg: Uint8Array, bigEndian: boolean): Uint8Array {
  const n = msg.length;
  const tam = (((n + 9 + 63) >> 6) << 6);
  const b = new Uint8Array(tam);
  b.set(msg);
  b[n] = 0x80;
  const bits = BigInt(n) * 8n;
  for (let i = 0; i < 8; i++) {
    const byte = Number((bits >> BigInt(8 * i)) & 0xffn);
    if (bigEndian) b[tam - 1 - i] = byte;
    else b[tam - 8 + i] = byte;
  }
  return b;
}

export function sha256(msg: Uint8Array): string {
  const b = preparar(msg, true);
  const h = new Uint32Array([0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19]);
  const w = new Uint32Array(64);
  const dv = new DataView(b.buffer);
  const r = (x: number, n: number) => (x >>> n) | (x << (32 - n));
  for (let o = 0; o < b.length; o += 64) {
    for (let i = 0; i < 16; i++) w[i] = dv.getUint32(o + i * 4);
    for (let i = 16; i < 64; i++) {
      const s0 = r(w[i - 15], 7) ^ r(w[i - 15], 18) ^ (w[i - 15] >>> 3);
      const s1 = r(w[i - 2], 17) ^ r(w[i - 2], 19) ^ (w[i - 2] >>> 10);
      w[i] = (w[i - 16] + s0 + w[i - 7] + s1) | 0;
    }
    let [a, bb, c, d, e, f, g, hh] = h;
    for (let i = 0; i < 64; i++) {
      const t1 = (hh + (r(e, 6) ^ r(e, 11) ^ r(e, 25)) + ((e & f) ^ (~e & g)) + K256[i] + w[i]) | 0;
      const t2 = ((r(a, 2) ^ r(a, 13) ^ r(a, 22)) + ((a & bb) ^ (a & c) ^ (bb & c))) | 0;
      hh = g; g = f; f = e; e = (d + t1) | 0; d = c; c = bb; bb = a; a = (t1 + t2) | 0;
    }
    h[0] += a; h[1] += bb; h[2] += c; h[3] += d; h[4] += e; h[5] += f; h[6] += g; h[7] += hh;
  }
  const out = new Uint8Array(32);
  const dvo = new DataView(out.buffer);
  h.forEach((v, i) => dvo.setUint32(i * 4, v));
  return hexb(out);
}

export function sha1(msg: Uint8Array): string {
  const b = preparar(msg, true);
  const h = new Uint32Array([0x67452301, 0xefcdab89, 0x98badcfe, 0x10325476, 0xc3d2e1f0]);
  const w = new Uint32Array(80);
  const dv = new DataView(b.buffer);
  const rl = (x: number, n: number) => (x << n) | (x >>> (32 - n));
  for (let o = 0; o < b.length; o += 64) {
    for (let i = 0; i < 16; i++) w[i] = dv.getUint32(o + i * 4);
    for (let i = 16; i < 80; i++) w[i] = rl(w[i - 3] ^ w[i - 8] ^ w[i - 14] ^ w[i - 16], 1);
    let [a, bb, c, d, e] = h;
    for (let i = 0; i < 80; i++) {
      const [f, k] = i < 20 ? [(bb & c) | (~bb & d), 0x5a827999] : i < 40 ? [bb ^ c ^ d, 0x6ed9eba1] : i < 60 ? [(bb & c) | (bb & d) | (c & d), 0x8f1bbcdc] : [bb ^ c ^ d, 0xca62c1d6];
      const t = (rl(a, 5) + f + e + k + w[i]) | 0;
      e = d; d = c; c = rl(bb, 30); bb = a; a = t;
    }
    h[0] += a; h[1] += bb; h[2] += c; h[3] += d; h[4] += e;
  }
  const out = new Uint8Array(20);
  const dvo = new DataView(out.buffer);
  h.forEach((v, i) => dvo.setUint32(i * 4, v));
  return hexb(out);
}

const S_MD5 = [7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22, 5, 9, 14, 20, 5, 9, 14, 20, 5, 9, 14, 20, 5, 9, 14, 20, 4, 11, 16, 23, 4, 11, 16, 23, 4, 11, 16, 23, 4, 11, 16, 23, 6, 10, 15, 21, 6, 10, 15, 21, 6, 10, 15, 21, 6, 10, 15, 21];
const K_MD5 = Array.from({ length: 64 }, (_, i) => Math.floor(Math.abs(Math.sin(i + 1)) * 2 ** 32) >>> 0);

export function md5(msg: Uint8Array): string {
  const b = preparar(msg, false);
  const h = new Uint32Array([0x67452301, 0xefcdab89, 0x98badcfe, 0x10325476]);
  const dv = new DataView(b.buffer);
  const m = new Uint32Array(16);
  const rl = (x: number, n: number) => (x << n) | (x >>> (32 - n));
  for (let o = 0; o < b.length; o += 64) {
    for (let i = 0; i < 16; i++) m[i] = dv.getUint32(o + i * 4, true);
    let [a, bb, c, d] = h;
    for (let i = 0; i < 64; i++) {
      let f: number;
      let g: number;
      if (i < 16) { f = (bb & c) | (~bb & d); g = i; }
      else if (i < 32) { f = (d & bb) | (~d & c); g = (5 * i + 1) % 16; }
      else if (i < 48) { f = bb ^ c ^ d; g = (3 * i + 5) % 16; }
      else { f = c ^ (bb | ~d); g = (7 * i) % 16; }
      const t = d;
      d = c;
      c = bb;
      bb = (bb + rl((a + f + K_MD5[i] + m[g]) | 0, S_MD5[i])) | 0;
      a = t;
    }
    h[0] += a; h[1] += bb; h[2] += c; h[3] += d;
  }
  const out = new Uint8Array(16);
  const dvo = new DataView(out.buffer);
  h.forEach((v, i) => dvo.setUint32(i * 4, v, true));
  return hexb(out);
}
