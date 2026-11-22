// Gerador pseudoaleatório com semente: o mesmo caso sempre gera os mesmos artefatos.
export class Rng {
  private s: number;
  constructor(semente: number) {
    this.s = semente >>> 0 || 1;
  }
  prox(): number {
    // mulberry32
    let t = (this.s = (this.s + 0x6d2b79f5) >>> 0);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  int(min: number, max: number): number {
    return min + Math.floor(this.prox() * (max - min + 1));
  }
  pick<T>(lista: readonly T[]): T {
    return lista[Math.floor(this.prox() * lista.length)];
  }
  chance(p: number): boolean {
    return this.prox() < p;
  }
  hex(n: number): string {
    let s = '';
    for (let i = 0; i < n; i++) s += '0123456789abcdef'[this.int(0, 15)];
    return s;
  }
  embaralhar<T>(lista: T[]): T[] {
    for (let i = lista.length - 1; i > 0; i--) {
      const j = Math.floor(this.prox() * (i + 1));
      [lista[i], lista[j]] = [lista[j], lista[i]];
    }
    return lista;
  }
}
