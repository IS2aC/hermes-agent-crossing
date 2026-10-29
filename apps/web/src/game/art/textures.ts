import * as Phaser from 'phaser';
import { CHAR_H, CHAR_W, FRAME_COUNT, FRAMES, characterSheet, type Look } from './characters';
import { PROP_TEXTURES, officeBase } from './manifest';
import type { PixelCanvas } from './pixels';

export function toCanvas(pc: PixelCanvas): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = pc.width;
  canvas.height = pc.height;
  const ctx = canvas.getContext('2d')!;
  const image = ctx.createImageData(pc.width, pc.height);
  pc.data.forEach((color, i) => {
    if (!color) return;
    const n = Number.parseInt(color.slice(1, 7), 16);
    image.data.set([(n >> 16) & 255, (n >> 8) & 255, n & 255, 255], i * 4);
  });
  ctx.putImageData(image, 0, 0);
  return canvas;
}

export function addTexture(scene: Phaser.Scene, key: string, pc: PixelCanvas): void {
  if (!scene.textures.exists(key)) scene.textures.addCanvas(key, toCanvas(pc));
}

export function registerOfficeArt(scene: Phaser.Scene): void {
  addTexture(scene, 'office-base', officeBase());
  for (const [key, make] of Object.entries(PROP_TEXTURES)) addTexture(scene, key, make());
}

/** Registers `char-<id>` with numbered frames and its walk/type animations. */
export function registerCharacter(scene: Phaser.Scene, id: string, look: Look): string {
  const key = `char-${id}`;
  if (scene.textures.exists(key)) return key;
  const texture = scene.textures.addCanvas(key, toCanvas(characterSheet(look)))!;
  for (let i = 0; i < FRAME_COUNT; i++) texture.add(i, 0, i * CHAR_W, 0, CHAR_W, CHAR_H);
  const anim = (name: string, frames: readonly number[], frameRate: number) =>
    scene.anims.create({ key: `${key}-${name}`, frames: frames.map((frame) => ({ key, frame })), frameRate, repeat: -1 });
  anim('walk-down', [FRAMES.down[1], FRAMES.down[0], FRAMES.down[2], FRAMES.down[0]], 8);
  anim('walk-up', [FRAMES.up[1], FRAMES.up[0], FRAMES.up[2], FRAMES.up[0]], 8);
  anim('walk-side', [FRAMES.side[1], FRAMES.side[0], FRAMES.side[2], FRAMES.side[0]], 8);
  anim('type', FRAMES.type, 5);
  return key;
}
