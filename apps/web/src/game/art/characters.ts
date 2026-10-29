import { P } from './palette';
import { PixelCanvas, shade, type Color } from './pixels';

export const CHAR_W = 16;
export const CHAR_H = 24;

export type HairStyle = 'short' | 'long' | 'bun' | 'curly' | 'cap';

export interface Look {
  skin: Color;
  hair: Color;
  hairStyle: HairStyle;
  shirt: Color;
  pants: Color;
  shoes: Color;
  glasses?: boolean;
  /** Cap colour, only used with hairStyle 'cap'. */
  hat?: Color;
}

/** Frame indices inside a character sheet. Right-facing frames are the left ones flipped. */
export const FRAMES = {
  down: [0, 1, 2],
  up: [3, 4, 5],
  side: [6, 7, 8],
  type: [9, 10],
  sofa: [11],
} as const;
export const FRAME_COUNT = 12;

type Facing = 'down' | 'up' | 'side';
type Step = 0 | 1 | 2;

function hairFront(c: PixelCanvas, l: Look, dy: number): void {
  const h = l.hairStyle === 'cap' ? (l.hat ?? P.navy) : l.hair;
  if (l.hairStyle === 'curly') {
    c.ellipse(8, 4.5 + dy, 5.5, 4, h);
    c.rect(4, 7 + dy, 1, 1, h).rect(11, 7 + dy, 1, 1, h);
    return;
  }
  c.rect(5, 1 + dy, 6, 1, h).rect(4, 2 + dy, 8, 3, h);
  c.rect(4, 5 + dy, 1, 2, h).rect(11, 5 + dy, 1, 2, h).rect(5, 5 + dy, 2, 1, h).rect(10, 5 + dy, 1, 1, h);
  if (l.hairStyle === 'long') c.rect(3, 5 + dy, 2, 8, l.hair).rect(11, 5 + dy, 2, 8, l.hair);
  if (l.hairStyle === 'bun') c.roundRect(6, -1 + dy, 4, 3, l.hair);
  if (l.hairStyle === 'cap') c.rect(4, 5 + dy, 8, 1, shade(h, 0.7)).rect(5, 5 + dy, 2, 1, shade(h, 0.7));
}

function hairBack(c: PixelCanvas, l: Look, dy: number): void {
  const h = l.hairStyle === 'cap' ? (l.hat ?? P.navy) : l.hair;
  if (l.hairStyle === 'curly') c.ellipse(8, 5 + dy, 5.5, 5, h);
  else c.roundRect(4, 1 + dy, 8, 9, h);
  if (l.hairStyle === 'cap') c.rect(4, 7 + dy, 8, 3, l.hair).rect(6, 6 + dy, 4, 1, P.white);
  if (l.hairStyle === 'long') c.rect(4, 9 + dy, 8, 4, l.hair);
  if (l.hairStyle === 'bun') c.roundRect(6, -1 + dy, 4, 3, shade(l.hair, 0.85));
}

function headFront(c: PixelCanvas, l: Look, dy: number): void {
  c.roundRect(4, 3 + dy, 8, 8, l.skin);
  c.set(3, 7 + dy, l.skin).set(12, 7 + dy, l.skin);
  hairFront(c, l, dy);
  c.rect(6, 7 + dy, 1, 2, P.ink).rect(9, 7 + dy, 1, 2, P.ink).set(6, 7 + dy, P.white).set(9, 7 + dy, P.white);
  if (l.glasses) {
    c.rect(5, 7 + dy, 3, 1, P.ink).rect(8, 7 + dy, 3, 1, P.ink).set(6, 8 + dy, P.ink).set(9, 8 + dy, P.ink);
    c.set(6, 7 + dy, P.sky).set(9, 7 + dy, P.sky);
  }
}

function headBack(c: PixelCanvas, l: Look, dy: number): void {
  c.rect(6, 10 + dy, 4, 1, shade(l.skin, 0.85));
  if (l.hairStyle !== 'long') c.set(3, 7 + dy, l.skin).set(12, 7 + dy, l.skin);
  hairBack(c, l, dy);
}

function headSide(c: PixelCanvas, l: Look): void {
  c.roundRect(4, 3, 8, 8, l.skin);
  c.set(3, 8, l.skin);
  const h = l.hairStyle === 'cap' ? (l.hat ?? P.navy) : l.hair;
  if (l.hairStyle === 'curly') c.ellipse(9, 4.5, 4.5, 4, h);
  else c.rect(5, 1, 6, 1, h).rect(4, 2, 8, 3, h).rect(9, 5, 3, 4, h);
  if (l.hairStyle === 'long') c.rect(9, 5, 4, 8, l.hair);
  if (l.hairStyle === 'bun') c.roundRect(9, 0, 4, 3, l.hair);
  if (l.hairStyle === 'cap') c.rect(2, 4, 4, 1, shade(h, 0.7)).rect(9, 5, 3, 3, l.hair);
  c.set(9, 7, shade(l.skin, 0.85));
  c.rect(5, 7, 1, 2, P.ink).set(5, 7, P.white);
  if (l.glasses) c.rect(4, 7, 3, 1, P.ink).set(7, 7, P.ink);
}

function torsoFront(c: PixelCanvas, l: Look, dy: number, collar: boolean): void {
  c.rect(4, 11 + dy, 8, 5, l.shirt);
  c.rect(4, 11 + dy, 1, 5, shade(l.shirt, 0.85)).rect(11, 11 + dy, 1, 5, shade(l.shirt, 0.85));
  if (collar) c.rect(7, 11 + dy, 2, 1, l.skin);
  c.rect(3, 11 + dy, 1, 4, shade(l.shirt, 0.78)).rect(12, 11 + dy, 1, 4, shade(l.shirt, 0.78));
  c.set(3, 15 + dy, l.skin).set(12, 15 + dy, l.skin);
}

function legsFront(c: PixelCanvas, l: Look, step: Step): void {
  c.rect(4, 16, 8, 1, shade(l.pants, 0.8)).rect(5, 17, 6, 1, l.pants);
  const leftLift = step === 1 ? 1 : 0;
  const rightLift = step === 2 ? 1 : 0;
  c.rect(5, 18, 3, 4 - leftLift, l.pants).rect(5, 22 - leftLift, 3, 1, l.shoes);
  c.rect(8, 18, 3, 4 - rightLift, shade(l.pants, 0.88)).rect(8, 22 - rightLift, 3, 1, l.shoes);
}

function legsSide(c: PixelCanvas, l: Look, step: Step): void {
  c.rect(5, 16, 6, 1, shade(l.pants, 0.8));
  if (step === 0) {
    c.rect(6, 17, 4, 5, l.pants).rect(5, 22, 5, 1, l.shoes);
    return;
  }
  const [front, back] = step === 1 ? [4, 8] : [6, 7];
  c.rect(back, 17, 3, 4, shade(l.pants, 0.82)).rect(back, 21, 3, 1, l.shoes);
  c.rect(front, 17, 3, 5, l.pants).rect(front - 1, 22, 4, 1, l.shoes);
}

function frame(l: Look, facing: Facing, step: Step): PixelCanvas {
  const c = new PixelCanvas(CHAR_W, CHAR_H);
  if (facing === 'side') {
    legsSide(c, l, step);
    c.rect(5, 11, 6, 5, l.shirt).rect(10, 11, 1, 5, shade(l.shirt, 0.85));
    const armX = step === 1 ? 5 : step === 2 ? 8 : 7;
    c.rect(armX, 11, 2, 4, shade(l.shirt, 0.78)).rect(armX, 15, 2, 1, l.skin);
    headSide(c, l);
  } else {
    legsFront(c, l, step);
    torsoFront(c, l, 0, facing === 'down');
    if (facing === 'down') headFront(c, l, 0);
    else headBack(c, l, 0);
  }
  return c.outline(P.ink);
}

/** Seated from behind, facing a desk; the two frames alternate the elbows. */
function typing(l: Look, beat: 0 | 1): PixelCanvas {
  const c = new PixelCanvas(CHAR_W, CHAR_H);
  const dy = 3;
  c.rect(4, 19, 8, 3, l.pants);
  c.rect(4, 14, 8, 5, l.shirt).rect(4, 14, 1, 5, shade(l.shirt, 0.85)).rect(11, 14, 1, 5, shade(l.shirt, 0.85));
  const arm = shade(l.shirt, 0.78);
  c.rect(3, 14, 1, beat === 0 ? 4 : 3, arm).rect(12, 14, 1, beat === 0 ? 3 : 4, arm);
  headBack(c, l, dy);
  return c.outline(P.ink);
}

/** Seated facing the viewer with a laptop on the lap (sofa, lounge). */
function sofa(l: Look): PixelCanvas {
  const c = new PixelCanvas(CHAR_W, CHAR_H);
  const dy = 2;
  c.rect(5, 19, 3, 3, l.pants).rect(8, 19, 3, 3, shade(l.pants, 0.88));
  c.rect(5, 22, 3, 1, l.shoes).rect(8, 22, 3, 1, l.shoes);
  torsoFront(c, l, dy, true);
  c.rect(3, 16, 10, 3, P.lightGrey).rect(3, 16, 10, 1, P.cream).set(8, 17, P.neonCyan);
  c.set(3, 18, l.skin).set(12, 18, l.skin);
  headFront(c, l, dy);
  return c.outline(P.ink);
}

/** All frames of one character laid out horizontally, see FRAMES. */
export function characterSheet(l: Look): PixelCanvas {
  const frames = [
    frame(l, 'down', 0), frame(l, 'down', 1), frame(l, 'down', 2),
    frame(l, 'up', 0), frame(l, 'up', 1), frame(l, 'up', 2),
    frame(l, 'side', 0), frame(l, 'side', 1), frame(l, 'side', 2),
    typing(l, 0), typing(l, 1), sofa(l),
  ];
  const sheet = new PixelCanvas(CHAR_W * FRAME_COUNT, CHAR_H);
  frames.forEach((f, i) => sheet.blit(f, i * CHAR_W, 0));
  return sheet;
}
