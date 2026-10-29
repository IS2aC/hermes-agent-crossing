import * as Phaser from 'phaser';
import { Agent } from './Agent';
import { nameTag, zoneSign } from './art/furniture';
import { rng } from './art/pixels';
import { addTexture, registerCharacter, registerOfficeArt } from './art/textures';
import { DEMO_CREW } from './crew';
import { MAP_H, MAP_W, TILE, WALL_ROWS, WINDOWS, buildOffice, type Office } from './office';

const WORLD_W = MAP_W * TILE;
const WORLD_H = MAP_H * TILE;
const MINIMAP_W = 144;

export class WorldScene extends Phaser.Scene {
  private follow = false;
  private zoomLevel = 2;
  private agents: Agent[] = [];
  private hotspots: Phaser.Math.Vector2[] = [];
  private office!: Office;
  private minimap?: Phaser.Cameras.Scene2D.Camera;

  constructor() { super('world'); }

  create() {
    this.office = buildOffice();
    registerOfficeArt(this);
    this.add.image(0, 0, 'office-base').setOrigin(0).setDepth(-10);
    this.drawLight();

    for (const zone of this.office.zones) {
      const [zx, zy, zw, zh] = zone.area;
      this.add.rectangle(zx * TILE, zy * TILE, zw * TILE, zh * TILE, zone.accent, 0.06).setOrigin(0).setStrokeStyle(1, zone.accent, 0.55).setDepth(-5);
      addTexture(this, `sign-${zone.id}`, zoneSign(zone.label, `#${zone.accent.toString(16).padStart(6, '0')}`));
      this.add.image(zone.sign.x, zone.sign.y, `sign-${zone.id}`).setOrigin(0).setDepth(9_000);
      this.hotspots.push(new Phaser.Math.Vector2((zx + zw / 2) * TILE, (zy + zh / 2) * TILE));
    }
    this.hotspots.push(new Phaser.Math.Vector2(256, 130), new Phaser.Math.Vector2(256, 270), new Phaser.Math.Vector2(400, 70));

    for (const prop of this.office.props) {
      const image = this.add.image(prop.x, prop.y, prop.texture).setOrigin(0);
      image.setDepth(prop.depth ?? prop.y + image.height);
    }

    const occupied = new Set<string>();
    const random = rng(2026);
    DEMO_CREW.forEach((member, i) => {
      const sheet = registerCharacter(this, member.name.toLowerCase(), member.look);
      const tagKey = `tag-${member.name.toLowerCase()}`;
      addTexture(this, tagKey, nameTag(member.name, member.accent));
      const seat = this.office.seats.find((s) => s.id === member.seat);
      const start = seat?.tile ?? this.office.waypoints[i % this.office.waypoints.length]!;
      const agent = new Agent(this, member.name, sheet, tagKey, this.office, occupied, random, start, !seat);
      if (seat) agent.sit(seat);
      this.agents.push(agent);
    });

    const cam = this.cameras.main;
    cam.setBounds(0, 0, WORLD_W, WORLD_H).setRoundPixels(true);
    this.setZoom(this.fitZoom());
    cam.centerOn(WORLD_W / 2, 0);
    this.bindInput();
    this.addMiniMap();
    this.scale.on('resize', () => this.placeMiniMap());
  }

  update(time: number, delta: number) {
    for (const agent of this.agents) agent.update(time, delta);
    if (this.follow && this.agents[0]) this.cameras.main.centerOn(this.agents[0].sprite.x, this.agents[0].sprite.y);
  }

  /** Window light falling on the floor, and a soft spot on the reception island. */
  private drawLight() {
    const g = this.add.graphics().setDepth(-4);
    g.fillStyle(0xffffff, 0.1);
    for (const [from, to] of WINDOWS) {
      const x0 = from * TILE + 4;
      const x1 = to * TILE - 4;
      g.fillPoints([new Phaser.Math.Vector2(x0, WALL_ROWS * TILE), new Phaser.Math.Vector2(x1, WALL_ROWS * TILE), new Phaser.Math.Vector2(x1 + 40, WALL_ROWS * TILE + 70), new Phaser.Math.Vector2(x0 + 40, WALL_ROWS * TILE + 70)], true);
    }
    g.fillStyle(0xfff3d6, 0.35).fillEllipse(256, 136, 128, 52);
  }

  private fitZoom(): number {
    const ratio = Math.min(this.scale.width / WORLD_W, this.scale.height / WORLD_H);
    return Phaser.Math.Clamp(Math.ceil(ratio), 2, 4);
  }

  private setZoom(level: number) {
    this.zoomLevel = Phaser.Math.Clamp(Math.round(level), 1, 4);
    this.cameras.main.setZoom(this.zoomLevel);
  }

  private bindInput() {
    this.input.on('wheel', (_p: unknown, _o: unknown, _dx: number, dy: number) => this.setZoom(this.zoomLevel + (dy < 0 ? 1 : -1)));
    this.input.on('pointermove', (p: Phaser.Input.Pointer) => {
      if (!p.isDown) return;
      this.follow = false;
      this.cameras.main.scrollX -= (p.x - p.prevPosition.x) / this.zoomLevel;
      this.cameras.main.scrollY -= (p.y - p.prevPosition.y) / this.zoomLevel;
    });
    this.input.keyboard?.on('keydown', (e: KeyboardEvent) => {
      const cam = this.cameras.main;
      const step = 32 / this.zoomLevel;
      const k = e.key.toLowerCase();
      if (k === 'g') this.follow = false;
      if (k === 'f') this.follow = true;
      if (k === '+' || k === '=') this.setZoom(this.zoomLevel + 1);
      if (k === '-') this.setZoom(this.zoomLevel - 1);
      if (k === 'arrowleft' || k === 'a') cam.scrollX -= step;
      if (k === 'arrowright' || k === 'd') cam.scrollX += step;
      if (k === 'arrowup' || k === 'w') cam.scrollY -= step;
      if (k === 'arrowdown' || k === 's') cam.scrollY += step;
      if (/^[1-9]$/.test(k)) {
        const p = this.hotspots[Number(k) - 1];
        if (p) cam.centerOn(p.x, p.y);
      }
      if (k === 'k') window.dispatchEvent(new CustomEvent('crossing:kanban'));
    });
  }

  private addMiniMap() {
    const zoom = MINIMAP_W / WORLD_W;
    this.minimap = this.cameras.add(0, 0, MINIMAP_W, Math.round(WORLD_H * zoom)).setZoom(zoom).setName('minimap');
    this.minimap.setBackgroundColor('#1e2952').centerOn(WORLD_W / 2, WORLD_H / 2);
    this.minimap.ignore(this.agents.map((a) => a.tag));
    this.placeMiniMap();
  }

  private placeMiniMap() {
    this.minimap?.setPosition(18, this.scale.height - this.minimap.height - 62);
  }
}
