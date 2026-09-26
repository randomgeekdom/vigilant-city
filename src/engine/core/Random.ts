export class Random {
  private _s: number;

  constructor(seed: number) {
    this._s = seed >>> 0;
    if (this._s === 0) this._s = 0x9e3779b9;
  }

  get state(): number {
    return this._s;
  }

  set state(v: number) {
    this._s = v >>> 0;
  }

  next(): number {
    this._s = (this._s * 1664525 + 1013904223) >>> 0;
    return this._s / 4294967296;
  }

  int(minInclusive: number, maxInclusive: number): number {
    return minInclusive + Math.floor(this.next() * (maxInclusive - minInclusive + 1));
  }

  pick<T>(arr: readonly T[]): T {
    if (arr.length === 0) throw new Error('pick on empty array');
    return arr[Math.floor(this.next() * arr.length)] ?? arr[0]!;
  }

  weighted<T>(items: readonly { item: T; weight: number }[]): T {
    const total = items.reduce((sum, it) => sum + it.weight, 0);
    if (total <= 0) throw new Error('weighted with non-positive total');
    let r = this.next() * total;
    for (const it of items) {
      r -= it.weight;
      if (r <= 0) return it.item;
    }
    return items[items.length - 1]!.item;
  }

  chance(p: number): boolean {
    return this.next() < p;
  }

  gauss(mean: number, spread: number): number {
    const u = Math.max(this.next(), Number.EPSILON);
    const v = this.next();
    return mean + spread * Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  }

  shuffle<T>(arr: readonly T[]): T[] {
    const out = [...arr];
    for (let i = out.length - 1; i > 0; i--) {
      const j = Math.floor(this.next() * (i + 1));
      const a = out[i]!;
      const b = out[j]!;
      out[i] = b;
      out[j] = a;
    }
    return out;
  }
}
