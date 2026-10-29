import { drawText, textWidth } from './font';
import { P } from './palette';
import { PixelCanvas, mix, rng, shade, type Color } from './pixels';

const OUTLINE = P.slate;
const FLOOR = mix(P.floorLight, P.cream, 0.55);

export function floorTile(variant: number): PixelCanvas {
  const c = new PixelCanvas(16, 16).rect(0, 0, 16, 16, FLOOR);
  const r = rng(variant + 11);
  for (let row = 0; row < 4; row++) {
    const y = row * 4;
    c.rect(0, y + 3, 16, 1, shade(FLOOR, 0.93));
    if ((row + variant) % 2 === 0) c.rect((row * 5 + variant * 3) % 16, y, 1, 3, shade(FLOOR, 0.93));
    for (let k = 0; k < 3; k++) c.set(Math.floor(r() * 16), y + Math.floor(r() * 3), shade(FLOOR, r() > 0.5 ? 0.97 : 1.04));
  }
  return c;
}

function skyline(c: PixelCanvas, x: number, y: number, w: number, h: number, seed: number): void {
  for (let j = 0; j < h; j++) c.rect(x, y + j, w, 1, shade(P.sky, 1 + (j / h) * 0.45));
  const r = rng(seed);
  for (const [tint, minH, maxH] of [[shade(P.periwinkle, 1.35), 0.35, 0.75], [shade(P.periwinkle, 0.95), 0.2, 0.55]] as const) {
    let bx = x - Math.floor(r() * 4);
    while (bx < x + w) {
      const bw = 4 + Math.floor(r() * 6);
      const bh = Math.floor(h * (minH + r() * (maxH - minH)));
      for (let i = 0; i < bw; i++) for (let j = 0; j < bh; j++) if (bx + i >= x && bx + i < x + w) c.set(bx + i, y + h - 1 - j, tint);
      for (let wy = y + h - bh + 2; wy < y + h - 1; wy += 3)
        for (let wx = bx + 1; wx < bx + bw - 1; wx += 2) if (wx >= x && wx < x + w && r() > 0.55) c.set(wx, wy, P.butter);
      bx += bw + Math.floor(r() * 2);
    }
  }
  for (let i = 0; i < h; i++) {
    c.set(x + 3 + Math.floor(i / 2), y + i, shade(P.white, 1)).set(x + 4 + Math.floor(i / 2), y + i, shade(P.sky, 1.6));
  }
}

/** Back wall for the whole office width; `windows` are [startTile, endTile) spans with city views. */
export function wallStrip(widthTiles: number, windows: Array<[number, number]>): PixelCanvas {
  const w = widthTiles * 16;
  const c = new PixelCanvas(w, 48).rect(0, 0, w, 48, P.navy);
  c.rect(0, 0, w, 3, shade(P.navy, 0.6));
  for (let x = 0; x < w; x += 16) c.rect(x, 3, 1, 41, shade(P.navy, 0.9));
  for (const [from, to] of windows) {
    const x = from * 16 + 2;
    const ww = (to - from) * 16 - 4;
    c.rect(x - 2, 5, ww + 4, 39, P.slate);
    skyline(c, x, 7, ww, 35, from * 31);
    for (let m = x + 15; m < x + ww - 4; m += 16) c.rect(m, 7, 2, 35, P.slate);
    c.rect(x - 2, 42, ww + 4, 2, P.lightGrey);
  }
  c.rect(0, 44, w, 1, P.wood).rect(0, 45, w, 3, P.darkWood);
  return c;
}

export function mascot(): PixelCanvas {
  const c = new PixelCanvas(18, 18);
  c.roundRect(2, 3, 12, 10, P.white).rect(2, 11, 12, 2, P.cream);
  c.roundRect(4, 5, 8, 6, P.navy).rect(5, 7, 2, 2, P.neonCyan).rect(9, 7, 2, 2, P.neonCyan);
  c.rect(1, 6, 1, 4, P.lightGrey).rect(14, 6, 1, 4, P.lightGrey);
  c.rect(11, 1, 3, 2, P.honey).rect(13, 0, 3, 2, P.orange).rect(12, 3, 2, 1, P.honey).set(16, 1, P.orange);
  c.roundRect(5, 13, 6, 4, P.white).rect(5, 16, 6, 1, P.cream).set(7, 14, P.neonCyan);
  return c.outline(P.ink);
}

export function wallBanner(): PixelCanvas {
  const c = new PixelCanvas(140, 40).rect(0, 0, 140, 40, shade(P.navy, 0.72));
  c.rect(0, 0, 140, 1, P.steel).rect(0, 39, 140, 1, P.steel);
  c.blit(mascot(), 6, 11);
  drawText(c, 'HERMES-AGENT-', 30, 13, P.white);
  drawText(c, 'CROSSING', 30, 22, shade(P.orange, 0.7));
  drawText(c, 'CROSSING', 30, 21, P.orange);
  c.rect(87, 8, 1, 24, P.steel);
  ['AGENTS', 'TOOLS', 'AUTOMATION', 'TOGETHER'].forEach((word, i) => drawText(c, word, 92, 9 + i * 6, P.cream));
  return c;
}

export function plantWall(width: number): PixelCanvas {
  const c = new PixelCanvas(width, 40).rect(0, 0, width, 40, P.deepGreen);
  const r = rng(width);
  for (let i = 0; i < width * 2.2; i++) {
    const tint = [P.sage, P.leaf, P.lightLeaf, shade(P.deepGreen, 1.4)][Math.floor(r() * 4)]!;
    c.ellipse(r() * width, r() * 40, 1.5 + r() * 2, 1 + r() * 1.5, tint);
  }
  ['OPEN AGENTS', 'BETTER', 'WORKFLOWS'].forEach((line, i) => {
    const x = Math.floor((width - textWidth(line)) / 2);
    const y = 4 + i * 8;
    c.rect(x - 2, y - 1, textWidth(line) + 4, 7, shade(P.deepGreen, 0.55));
    drawText(c, line, x, y, P.neonCyan);
  });
  return c;
}

export function whiteboard(title: string): PixelCanvas {
  const c = new PixelCanvas(48, 34);
  c.rect(0, 0, 48, 30, P.steel).rect(2, 2, 44, 26, P.white).rect(2, 27, 44, 1, P.cream);
  drawText(c, title, 4, 4, P.ink);
  const notes = [P.honey, P.pink, P.mint, P.orange, P.lilac, P.butter];
  const r = rng(title.length);
  for (let col = 0; col < 6; col++)
    for (let row = 0; row < 3; row++) if (r() > 0.25) c.rect(4 + col * 7, 12 + row * 5, 5, 4, notes[(col + row * 2) % notes.length]!);
  c.rect(5, 30, 2, 4, P.steel).rect(41, 30, 2, 4, P.steel).rect(2, 28, 44, 2, P.lightGrey);
  return c.outline(OUTLINE);
}

export function desk(withMug: boolean): PixelCanvas {
  const c = new PixelCanvas(32, 20);
  c.rect(0, 0, 32, 12, P.wood).rect(0, 0, 32, 1, shade(P.wood, 1.2));
  c.rect(0, 12, 32, 6, P.darkWood).rect(0, 12, 32, 1, shade(P.darkWood, 0.8));
  c.rect(20, 14, 10, 1, shade(P.darkWood, 1.3));
  c.rect(1, 18, 2, 2, P.slate).rect(29, 18, 2, 2, P.slate);
  c.rect(10, 8, 12, 3, P.lightGrey).rect(10, 8, 12, 1, P.cream);
  for (let k = 11; k < 21; k += 2) c.set(k, 9, P.steel);
  if (withMug) c.rect(25, 6, 3, 3, P.white).set(28, 7, P.white).set(26, 6, shade(P.darkWood, 0.6));
  return c.outline(OUTLINE);
}

export type ScreenMode = 'code' | 'chart' | 'off' | 'alert';

export function monitor(mode: ScreenMode, seed = 1): PixelCanvas {
  const c = new PixelCanvas(14, 13);
  c.rect(0, 0, 14, 10, P.ink).rect(6, 10, 2, 2, P.slate).rect(4, 12, 6, 1, P.slate);
  const screen = mode === 'off' ? P.slate : mode === 'alert' ? shade(P.red, 0.55) : P.darkTeal;
  c.rect(1, 1, 12, 8, screen);
  const r = rng(seed);
  if (mode === 'code')
    for (let line = 0; line < 4; line++) {
      const indent = Math.floor(r() * 3);
      const len = 3 + Math.floor(r() * (8 - indent));
      c.rect(2 + indent, 2 + line * 2, len, 1, [P.neonCyan, P.lavender, P.honey, P.white][Math.floor(r() * 4)]!);
    }
  if (mode === 'chart') {
    c.rect(2, 2, 4, 4, P.coral).rect(4, 2, 2, 2, P.honey).rect(2, 4, 2, 2, P.neonCyan);
    for (let k = 0; k < 5; k++) c.rect(7 + k, 7 - Math.floor(r() * 5), 1, 1, P.lightLeaf).set(7 + k, 8, P.mint);
  }
  if (mode === 'alert') c.rect(6, 2, 2, 4, P.white).rect(6, 7, 2, 1, P.white);
  c.set(1, 1, shade(screen, 1.5));
  return c;
}

export function chair(): PixelCanvas {
  const c = new PixelCanvas(14, 15);
  c.roundRect(1, 0, 12, 8, P.slate).rect(2, 1, 10, 1, P.steel).rect(1, 7, 12, 1, shade(P.slate, 0.8));
  c.rect(6, 8, 2, 3, P.ink).rect(2, 11, 10, 1, P.ink);
  c.set(2, 12, P.ink).set(6, 12, P.ink).set(11, 12, P.ink);
  return c.outline(P.ink);
}

export function plant(kind: 'small' | 'tall', seed: number): PixelCanvas {
  const tall = kind === 'tall';
  const w = tall ? 22 : 16;
  const h = tall ? 34 : 24;
  const c = new PixelCanvas(w, h);
  const potTop = h - 9;
  const pot = tall ? P.coral : P.white;
  c.rect(4, potTop, w - 8, 8, pot).rect(5, potTop + 8, w - 10, 1, shade(pot, 0.8)).rect(3, potTop, w - 6, 2, shade(pot, 0.9));
  c.rect(w - 6, potTop + 2, 2, 6, shade(pot, 0.85));
  const r = rng(seed);
  const leaves = tall ? 22 : 12;
  for (let i = 0; i < leaves; i++) {
    const cx = w / 2 + (r() - 0.5) * (w - 6);
    const cy = 3 + r() * (potTop - 3);
    const tint = [P.sage, P.leaf, P.leaf, P.lightLeaf][Math.floor(r() * 4)]!;
    c.ellipse(cx, cy, 2 + r() * (tall ? 3 : 2), 1.5 + r() * 1.5, tint);
  }
  c.map((col, x, y) => (y < potTop && (col === P.leaf || col === P.lightLeaf) && x > w / 2 + 2 ? shade(col, 0.8) : col));
  return c.outline(shade(P.deepGreen, 0.8));
}

export function receptionCounter(): PixelCanvas {
  const c = new PixelCanvas(84, 30);
  c.roundRect(0, 0, 84, 8, P.cream).rect(1, 0, 82, 1, P.white);
  c.rect(0, 8, 84, 20, P.navy).rect(0, 8, 84, 1, shade(P.navy, 0.7)).rect(0, 27, 84, 1, shade(P.navy, 0.7));
  const logo = mascot();
  c.blit(logo, 6, 9);
  drawText(c, 'HERMES-AGENT-', 27, 12, P.white);
  drawText(c, 'CROSSING', 27, 19, P.orange);
  c.rect(4, 28, 76, 2, shade(P.navy, 0.5));
  return c.outline(OUTLINE);
}

export function sofa(): PixelCanvas {
  const c = new PixelCanvas(64, 26);
  const fabric = P.cream;
  c.roundRect(4, 0, 56, 12, fabric).rect(5, 1, 54, 1, shade(fabric, 1.15));
  c.rect(23, 2, 1, 9, shade(fabric, 0.85)).rect(41, 2, 1, 9, shade(fabric, 0.85));
  c.rect(4, 12, 56, 8, shade(fabric, 1.08)).rect(4, 19, 56, 1, shade(fabric, 0.85));
  c.roundRect(0, 4, 6, 18, shade(fabric, 0.92)).roundRect(58, 4, 6, 18, shade(fabric, 0.92));
  c.rect(4, 20, 56, 3, shade(fabric, 0.8));
  c.rect(3, 23, 2, 2, P.darkWood).rect(59, 23, 2, 2, P.darkWood);
  return c.outline(OUTLINE);
}

export function coffeeTable(): PixelCanvas {
  const c = new PixelCanvas(36, 18);
  c.roundRect(0, 0, 36, 11, P.wood).rect(1, 0, 34, 1, shade(P.wood, 1.2));
  c.rect(1, 11, 34, 4, P.darkWood).rect(3, 15, 2, 3, P.darkWood).rect(31, 15, 2, 3, P.darkWood);
  c.rect(5, 3, 9, 6, P.periwinkle).rect(5, 3, 9, 1, P.white).rect(6, 5, 7, 1, P.white);
  c.rect(26, 4, 3, 3, P.white).set(27, 4, shade(P.darkWood, 0.6));
  c.ellipse(20, 3, 3, 2, P.leaf).rect(18, 4, 4, 3, P.coral);
  return c.outline(OUTLINE);
}

export function rug(w: number, h: number): PixelCanvas {
  const c = new PixelCanvas(w, h);
  c.ellipse(w / 2, h / 2, w / 2, h / 2, shade(P.periwinkle, 0.85));
  c.ellipse(w / 2, h / 2, w / 2 - 3, h / 2 - 3, P.periwinkle);
  c.ellipse(w / 2, h / 2, w / 2 - 8, h / 2 - 7, shade(P.mint, 1.1));
  c.ellipse(w / 2, h / 2, w / 2 - 11, h / 2 - 10, P.mint);
  return c;
}

export function cat(): PixelCanvas {
  const c = new PixelCanvas(16, 10);
  c.ellipse(8, 6, 6, 3.5, P.orange).ellipse(4, 4, 3, 2.5, P.orange);
  c.set(2, 1, P.orange).set(5, 1, P.orange).set(2, 2, P.orange).set(5, 2, P.orange);
  c.rect(7, 4, 1, 4, shade(P.orange, 0.8)).rect(10, 4, 1, 4, shade(P.orange, 0.8));
  c.rect(10, 8, 5, 1, P.white).set(3, 4, P.ink).set(5, 4, P.ink).set(4, 5, P.pink);
  return c.outline(P.ink);
}

export function bookshelf(): PixelCanvas {
  const c = new PixelCanvas(26, 42);
  c.rect(0, 0, 26, 42, P.darkWood).rect(0, 0, 26, 2, shade(P.darkWood, 1.3));
  const books: Color[] = [P.coral, P.periwinkle, P.honey, P.mint, P.lilac, P.sage, P.pink, P.navy];
  const r = rng(5);
  for (let shelf = 0; shelf < 4; shelf++) {
    const y = 3 + shelf * 10;
    c.rect(2, y, 22, 8, shade(P.darkWood, 0.6)).rect(2, y + 8, 22, 1, P.wood);
    let x = 3;
    while (x < 22) {
      const bw = 1 + Math.floor(r() * 2);
      const bh = 5 + Math.floor(r() * 3);
      if (r() > 0.12) c.rect(x, y + 8 - bh, bw, bh, books[Math.floor(r() * books.length)]!);
      x += bw;
    }
  }
  return c.outline(OUTLINE);
}

export function coffeeCounter(): PixelCanvas {
  const c = new PixelCanvas(36, 34);
  c.rect(0, 12, 36, 6, P.cream).rect(0, 12, 36, 1, P.white);
  c.rect(0, 18, 36, 14, P.wood).rect(17, 18, 1, 14, P.darkWood).rect(14, 23, 2, 3, P.darkWood).rect(20, 23, 2, 3, P.darkWood);
  c.rect(3, 0, 13, 15, P.slate).rect(5, 2, 9, 4, P.ink).rect(6, 3, 3, 1, P.neonCyan).set(12, 3, P.lightLeaf);
  c.rect(7, 8, 5, 1, P.steel).rect(8, 11, 3, 3, P.white);
  for (let k = 0; k < 3; k++) c.rect(21 + k * 5, 9, 3, 3, [P.white, P.coral, P.periwinkle][k]!);
  return c.outline(OUTLINE);
}

/** Hanging zone sign: navy plate with a team-coloured badge and the zone name. */
export function zoneSign(text: string, accent: Color): PixelCanvas {
  const tw = textWidth(text);
  const c = new PixelCanvas(tw + 22, 13);
  c.roundRect(0, 0, tw + 22, 13, P.navy).rect(1, 1, tw + 20, 1, shade(P.navy, 1.4));
  c.roundRect(4, 3, 7, 7, accent).rect(6, 5, 3, 3, P.navy).set(7, 6, accent);
  drawText(c, text, 15, 4, P.white);
  return c.outline(P.ink);
}

export function nameTag(text: string, accent: Color): PixelCanvas {
  const tw = textWidth(text);
  const c = new PixelCanvas(tw + 6, 9);
  c.roundRect(0, 0, tw + 6, 9, shade(P.navy, 0.9)).rect(1, 8, tw + 4, 1, accent);
  drawText(c, text, 3, 2, P.white);
  return c;
}
