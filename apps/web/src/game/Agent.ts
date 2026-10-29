import * as Phaser from 'phaser';
import { FRAMES } from './art/characters';
import { TILE, type Office, type Seat } from './office';
import { findPath, type Tile } from './pathfinding';

const SPEED = 2 * TILE; // px per second, ~2 tiles/s as in the spec
const TAG_DEPTH = 10_000;

type Mode = { kind: 'idle'; until: number } | { kind: 'walking'; path: Tile[]; seat?: Seat } | { kind: 'seated'; seat: Seat; until: number };

export const tileCenter = (t: Tile) => ({ x: t.x * TILE + 8, y: t.y * TILE + 14 });

/** One crew member in the world: sprite, shadow, name tag and a tiny wander/sit behaviour. */
export class Agent {
  readonly sprite: Phaser.GameObjects.Sprite;
  readonly tag: Phaser.GameObjects.Image;
  private readonly shadow: Phaser.GameObjects.Ellipse;
  private mode: Mode = { kind: 'idle', until: 0 };
  private tile: Tile;

  constructor(
    private readonly scene: Phaser.Scene,
    readonly name: string,
    private readonly sheet: string,
    tagKey: string,
    private readonly office: Office,
    private readonly occupied: Set<string>,
    private readonly random: () => number,
    start: Tile,
    private readonly roams: boolean,
  ) {
    const p = tileCenter(start);
    this.tile = start;
    this.shadow = scene.add.ellipse(p.x, p.y, 11, 4, 0x0f0d11, 0.22).setDepth(2);
    this.sprite = scene.add.sprite(p.x, p.y, sheet, FRAMES.down[0]).setOrigin(0.5, 1);
    this.sprite.setInteractive({ useHandCursor: true }).on('pointerdown', () => window.dispatchEvent(new CustomEvent('crossing:agent', { detail: name })));
    this.tag = scene.add.image(p.x, p.y - 26, tagKey).setDepth(TAG_DEPTH);
  }

  sit(seat: Seat): void {
    this.occupied.add(seat.id);
    this.tile = seat.tile;
    this.mode = { kind: 'seated', seat, until: this.roams ? this.scene.time.now + 8000 + this.random() * 8000 : Infinity };
    this.sprite.setPosition(seat.x, seat.y).setDepth(seat.depth).setFlipX(false);
    this.shadow.setVisible(false);
    if (seat.kind === 'desk') this.sprite.play({ key: `${this.sheet}-type`, startFrame: Math.floor(this.random() * 2) });
    else this.sprite.stop().setFrame(FRAMES.sofa[0]);
  }

  update(time: number, delta: number): void {
    const m = this.mode;
    if (m.kind === 'seated' && time >= m.until) this.standUp(m.seat);
    else if (m.kind === 'idle' && time >= m.until && this.roams) this.chooseNext();
    else if (m.kind === 'walking') this.step(m, delta);
    this.tag.setPosition(Math.round(this.sprite.x), Math.round(this.sprite.y - (this.mode.kind === 'seated' ? 26 : 28)));
    this.shadow.setPosition(this.sprite.x, this.sprite.y - 1);
  }

  private standUp(seat: Seat): void {
    this.occupied.delete(seat.id);
    const p = tileCenter(seat.tile);
    this.sprite.stop().setPosition(p.x, p.y).setFrame(FRAMES.down[0]).setDepth(p.y);
    this.shadow.setVisible(true);
    this.mode = { kind: 'idle', until: this.scene.time.now + 600 };
  }

  private chooseNext(): void {
    const free = this.office.seats.filter((s) => !this.occupied.has(s.id));
    const seat = this.random() < 0.35 ? free[Math.floor(this.random() * free.length)] : undefined;
    const target = seat?.tile ?? this.office.waypoints[Math.floor(this.random() * this.office.waypoints.length)]!;
    const path = findPath(this.office.grid, this.tile, target);
    if (!path) {
      this.mode = { kind: 'idle', until: this.scene.time.now + 1000 };
      return;
    }
    if (seat) this.occupied.add(seat.id);
    this.mode = seat ? { kind: 'walking', path, seat } : { kind: 'walking', path };
  }

  private step(m: Extract<Mode, { kind: 'walking' }>, delta: number): void {
    const next = m.path[0];
    if (!next) {
      if (m.seat) {
        this.occupied.delete(m.seat.id);
        this.sit(m.seat);
      } else {
        this.sprite.stop();
        this.mode = { kind: 'idle', until: this.scene.time.now + 1500 + this.random() * 3500 };
      }
      return;
    }
    const goal = tileCenter(next);
    const dx = goal.x - this.sprite.x;
    const dy = goal.y - this.sprite.y;
    const dist = Math.hypot(dx, dy);
    const travel = (SPEED * delta) / 1000;
    const dir = Math.abs(dx) > Math.abs(dy) ? 'side' : dy < 0 ? 'up' : 'down';
    this.sprite.setFlipX(dir === 'side' && dx > 0);
    this.sprite.play(`${this.sheet}-walk-${dir}`, true);
    if (dist <= travel) {
      this.sprite.setPosition(goal.x, goal.y);
      this.tile = next;
      m.path.shift();
      if (m.path.length === 0) {
        const facing = dir === 'side' ? FRAMES.side[0] : dir === 'up' ? FRAMES.up[0] : FRAMES.down[0];
        this.sprite.stop().setFrame(facing);
      }
    } else this.sprite.setPosition(this.sprite.x + (dx / dist) * travel, this.sprite.y + (dy / dist) * travel);
    this.sprite.setDepth(this.sprite.y);
  }
}
