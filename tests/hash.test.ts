import { describe, it, expect } from 'vitest';
import { sha256, sha1, md5 } from '../src/motor/hash';
import * as T from '../src/motor/tempo';

const enc = (s: string) => new TextEncoder().encode(s);
describe('hash', () => {
  it('bate com vetores conhecidos', () => {
    expect(sha256(enc('abc'))).toBe('ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
    expect(sha1(enc('abc'))).toBe('a9993e364706816aba3e25717850c26c9cd0d89d');
    expect(md5(enc('abc'))).toBe('900150983cd24fb0d6963f7d28e17f72');
    expect(md5(enc(''))).toBe('d41d8cd98f00b204e9800998ecf8427e');
    expect(sha256(enc('a'.repeat(1000)))).toBe('41edece42d63e8d9bf515a9ba6932e1c20cbc9f5a5d134645adb5db1b9737ea3');
  });
});
describe('tempo', () => {
  it('converte ida e volta', () => {
    const d = T.data('2026-03-14 22:41:07');
    expect(T.fmt(d)).toBe('2026-03-15 01:41:07');
    expect(T.fmt(T.deFiletime(T.filetime(d)))).toBe('2026-03-15 01:41:07');
    expect(T.fmt(T.deWebkit(T.webkit(d)))).toBe('2026-03-15 01:41:07');
    expect(T.fmt(T.deMac(T.mac(d)))).toBe('2026-03-15 01:41:07');
    expect(T.lerLE(T.le64(T.filetime(d)))).toBe(T.filetime(d));
    expect(T.normalizarHora('14/03/2026 às 22:41')).toBe('2026-03-14 22:41');
    expect(T.rot13('P:\\Hfref')).toBe('C:\\Users');
  });
});
