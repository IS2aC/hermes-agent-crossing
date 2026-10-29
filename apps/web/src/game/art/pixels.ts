/** Hex colour '#rrggbb'. */
export type Color = string;

/**
 * Tiny pixel buffer used to author placeholder art in code.
 * Kept free of DOM/Phaser so every sprite can be unit-tested and rebuilt deterministically.
 */
export class PixelCanvas {
  readonly data: Array<Color | null>;

  constructor(readonly width: number, readonly height: number) {
    this.data = new Array<Color | null>(width * height).fill(null);
  }

  get(x: number, y: number): Color | null {
    if (x < 0 || y < 0 || x >= this.width || y >= this.height) return null;
    return this.data[y * this.width + x] ?? null;
  }

  set(x: number, y: number, color: Color | null): this {
    if (x < 0 || y < 0 || x >= this.width || y >= this.height) return this;
    this.data[Math.floor(y) * this.width + Math.floor(x)] = color;
    return this;
  }

  rect(x: number, y: number, w: number, h: number, color: Color | null): this {
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) this.set(x + i, y + j, color);
    return this;
  }

  /** Rectangle with its four corner pixels knocked out, the classic pixel-art rounded box. */
  roundRect(x: number, y: number, w: number, h: number, color: Color): this {
    this.rect(x + 1, y, w - 2, h, color);
    this.rect(x, y + 1, 1, h - 2, color);
    this.rect(x + w - 1, y + 1, 1, h - 2, color);
    return this;
  }

  ellipse(cx: number, cy: number, rx: number, ry: number, color: Color): this {
    for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++)
      for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
        const dx = (x + 0.5 - cx) / rx;
        const dy = (y + 0.5 - cy) / ry;
        if (dx * dx + dy * dy <= 1) this.set(x, y, color);
      }
    return this;
  }

  /** Copies the opaque pixels of `src` at (dx, dy). */
  blit(src: PixelCanvas, dx: number, dy: number, flipX = false): this {
    for (let y = 0; y < src.height; y++)
      for (let x = 0; x < src.width; x++) {
        const c = src.get(flipX ? src.width - 1 - x : x, y);
        if (c) this.set(dx + x, dy + y, c);
      }
    return this;
  }

  /** Paints every empty pixel that touches an opaque one (4-neighbourhood). */
  outline(color: Color): this {
    const edge: number[] = [];
    for (let y = 0; y < this.height; y++)
      for (let x = 0; x < this.width; x++)
        if (!this.get(x, y) && (this.get(x - 1, y) || this.get(x + 1, y) || this.get(x, y - 1) || this.get(x, y + 1))) edge.push(y * this.width + x);
    for (const i of edge) this.data[i] = color;
    return this;
  }

  /** Recolours every opaque pixel matching `predicate` (used for shading passes). */
  map(fn: (color: Color, x: number, y: number) => Color): this {
    for (let y = 0; y < this.height; y++)
      for (let x = 0; x < this.width; x++) {
        const c = this.get(x, y);
        if (c) this.set(x, y, fn(c, x, y));
      }
    return this;
  }
}

/** Scales an RGB colour towards black (k < 1) or white (k > 1). */
export function shade(color: Color, k: number): Color {
  const n = Number.parseInt(color.slice(1, 7), 16);
  const channel = (v: number) => Math.round(k <= 1 ? v * k : v + (255 - v) * (k - 1));
  const r = channel((n >> 16) & 255);
  const g = channel((n >> 8) & 255);
  const b = channel(n & 255);
  return `#${((1 << 24) | (Math.min(255, r) << 16) | (Math.min(255, g) << 8) | Math.min(255, b)).toString(16).slice(1)}`;
}

/** Linear blend of two colours, t=0 gives `a`. */
export function mix(a: Color, b: Color, t: number): Color {
  const ca = Number.parseInt(a.slice(1, 7), 16);
  const cb = Number.parseInt(b.slice(1, 7), 16);
  const ch = (s: number) => Math.round(((ca >> s) & 255) * (1 - t) + ((cb >> s) & 255) * t);
  return `#${((1 << 24) | (ch(16) << 16) | (ch(8) << 8) | ch(0)).toString(16).slice(1)}`;
}

/** Deterministic PRNG so generated art is identical on every load. */
export function rng(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 4294967296;
  };
}
