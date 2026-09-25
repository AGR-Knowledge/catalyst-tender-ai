/**
 * Deterministic randomness for the generated history (plan 017 §3.3): a
 * mulberry32 stream seeded from a string, so every load gives the same data.
 * Nothing here reads the clock or `Math.random()`.
 */

/** A 32-bit hash of a string (FNV-1a). */
export function hash32(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

export interface Rng {
  /** [0, 1). */
  next(): number;
  /** An integer in [lo, hi]. */
  int(lo: number, hi: number): number;
  /** A number in [lo, hi). */
  range(lo: number, hi: number): number;
  pick<T>(xs: readonly T[]): T;
  /** Picks by weight: [[value, weight], …]. */
  weighted<T>(xs: readonly (readonly [T, number])[]): T;
  chance(p: number): boolean;
}

export function rngOf(seed: string): Rng {
  let a = hash32(seed);
  const next = () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const rng: Rng = {
    next,
    int: (lo, hi) => lo + Math.floor(next() * (hi - lo + 1)),
    range: (lo, hi) => lo + next() * (hi - lo),
    pick: (xs) => xs[Math.floor(next() * xs.length)],
    weighted: (xs) => {
      const total = xs.reduce((s, [, w]) => s + w, 0);
      let r = next() * total;
      for (const [v, w] of xs) {
        r -= w;
        if (r < 0) return v;
      }
      return xs[xs.length - 1][0];
    },
    chance: (p) => next() < p,
  };
  return rng;
}
