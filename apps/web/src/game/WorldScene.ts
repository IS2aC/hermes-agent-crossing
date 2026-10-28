import * as Phaser from 'phaser';
import { generateLayout } from './layout';

const TILE = 16;
export class WorldScene extends Phaser.Scene {
  private follow = false;
  private zoomLevel = 2;
  private agents: Phaser.GameObjects.Container[] = [];
  private roomPoints: Phaser.Math.Vector2[] = [];
  private teamColor = 0x30f5ff;
  constructor() { super('world'); }
  create() {
    const rooms = generateLayout(2026); const g = this.add.graphics();
    rooms.forEach((room, i) => {
      const x = room.x * TILE; const y = room.y * TILE; const w = room.width * TILE; const h = room.height * TILE;
      this.roomPoints.push(new Phaser.Math.Vector2(x + w / 2, y + h / 2));
      g.fillStyle(0xdbb3a0); g.fillRect(x, y, w, h); g.fillStyle(0x73451d); g.fillRect(x, y, w, 5); g.fillStyle(0xc8804c); g.fillRect(x + 3, y + 28, w - 6, h - 32);
      // Tiled-like checker floor and room walls, rendered on integer pixels.
      for (let tx = 0; tx < 16; tx++) for (let ty = 2; ty < 12; ty++) if ((tx + ty) % 2 === 0) { g.fillStyle(0xf8cfa8, .32); g.fillRect(x + tx * TILE, y + ty * TILE, TILE, TILE); }
      g.lineStyle(2, 0x1e2952, 1); g.strokeRect(x, y, w, h); g.fillStyle(0x1e2952); g.fillRoundedRect(x + 8, y + 8, w - 16, 17, 2); g.fillStyle(0xffffff); g.fillRect(x + 14, y + 13, Math.min(w - 28, room.name.length * 4), 2);
      if (room.kind === 'team_open_space_2' || room.kind === 'team_open_space_4' || room.kind === 'team_open_space_6' || room.kind === 'team_open_space_8') { g.lineStyle(3, room.color, 1); g.strokeRect(x + 7, y + 30, w - 14, h - 38); g.fillStyle(room.color); g.fillRect(x + 25, y + 30, 105, 3); }
      // desks, seats, monitors, plants; deliberately simple original placeholders.
      for (let d = 0; d < (i === 3 ? 4 : 2); d++) { const dx = x + 32 + (d % 2) * 96; const dy = y + 65 + Math.floor(d / 2) * 54; g.fillStyle(0x73451d); g.fillRect(dx, dy, 39, 22); g.fillStyle(0x0a71b7); g.fillRect(dx + 7, dy + 3, 18, 10); g.fillStyle(0x38633b); g.fillRect(x + w - 25 - d * 8, y + h - 25, 10, 13); }
      if (room.kind === 'kanban_room') { g.fillStyle(0x1e2952); g.fillRect(x + 65, y + 42, 120, 48); for (let k = 0; k < 3; k++) { g.fillStyle([0xf79b39, 0x30f5ff, 0x74b100][k]!); g.fillRect(x + 75 + k * 35, y + 51, 25, 29); } }
      if (room.kind === 'server_room') { for (let r = 0; r < 3; r++) { g.fillStyle(0x2a2a39); g.fillRect(x + 35 + r * 55, y + 47, 35, 75); g.fillStyle(r % 2 ? 0x30f5ff : 0x74b100); g.fillRect(x + 42 + r * 55, y + 55, 5, 5); } }
      if (room.kind === 'coffee_corner') { g.fillStyle(0x73451d); g.fillRect(x + 60, y + 55, 55, 34); g.fillStyle(0xffffff); g.fillRect(x + 70, y + 45, 13, 14); }
    });
    const names = ['Mira', 'Atlas', 'Nova', 'Quinn', 'Echo', 'Sage'];
    names.forEach((name, i) => { const p = this.roomPoints[i === 5 ? 2 : 3]!; const x = p.x - 42 + (i % 3) * 38; const y = p.y + Math.floor(i / 3) * 27;
      const sprite = this.add.container(x, y); const body = this.add.graphics(); body.fillStyle([0x1e2952, 0xf79b39, 0x38633b, 0x443467, 0x0a71b7, 0x73451d][i]!); body.fillRect(-6, -9, 12, 14); body.fillStyle(0xd4cec0); body.fillRect(-5, -17, 10, 9); body.fillStyle(0x0f0d11); body.fillRect(-3, -13, 2, 2); body.fillRect(2, -13, 2, 2); sprite.add(body);
      const label = this.add.text(-24, -32, name, { fontFamily: 'monospace', fontSize: '8px', color: '#1e2952', backgroundColor: '#ffffffcc', padding: { x: 2, y: 1 } }).setOrigin(0.5); sprite.add(label); sprite.setSize(24, 34).setInteractive(); sprite.on('pointerdown', () => window.dispatchEvent(new CustomEvent('crossing:agent', { detail: name }))); this.agents.push(sprite);
    });
    this.cameras.main.setBounds(-24, -24, 3 * 18 * TILE + 24, 3 * 14 * TILE + 24); this.cameras.main.centerOn(this.roomPoints[0]!.x, this.roomPoints[0]!.y); this.cameras.main.setZoom(this.zoomLevel);
    this.input.on('wheel', (_p: unknown, _o: unknown, _dx: number, dy: number) => this.setZoom(this.zoomLevel + (dy < 0 ? 1 : -1)));
    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => { if (p.rightButtonDown() || p.middleButtonDown()) this.input.setDefaultCursor('grabbing'); });
    this.input.on('pointermove', (p: Phaser.Input.Pointer) => { if (p.isDown) { this.cameras.main.scrollX -= p.velocity.x / this.zoomLevel; this.cameras.main.scrollY -= p.velocity.y / this.zoomLevel; } });
    this.input.keyboard?.on('keydown', (e: KeyboardEvent) => { const cam = this.cameras.main; const step = 32 / this.zoomLevel; if (e.key === 'g' || e.key === 'G') this.follow = false; if (e.key === 'f' || e.key === 'F') this.follow = true; if (e.key === '+' || e.key === '=') this.setZoom(this.zoomLevel + 1); if (e.key === '-') this.setZoom(this.zoomLevel - 1); if (e.key === 'ArrowLeft' || e.key.toLowerCase() === 'a') cam.scrollX -= step; if (e.key === 'ArrowRight' || e.key.toLowerCase() === 'd') cam.scrollX += step; if (e.key === 'ArrowUp' || e.key.toLowerCase() === 'w') cam.scrollY -= step; if (e.key === 'ArrowDown' || e.key.toLowerCase() === 's') cam.scrollY += step; if (/^[1-7]$/.test(e.key)) { const p = this.roomPoints[Number(e.key) - 1]; if (p) cam.centerOn(p.x, p.y); } if (e.key.toLowerCase() === 'k') window.dispatchEvent(new CustomEvent('crossing:kanban')); });
    this.addMiniMap();
  }
  private setZoom(level: number) { this.zoomLevel = Phaser.Math.Clamp(Math.round(level), 1, 4); this.cameras.main.setZoom(this.zoomLevel); }
  update() { if (this.follow && this.agents[0]) this.cameras.main.centerOn(this.agents[0].x, this.agents[0].y); }
  private addMiniMap() { const mini = this.cameras.add(0, 0, 150, 100).setZoom(.075).setName('minimap'); mini.setBackgroundColor('#1e2952'); mini.startFollow(this.cameras.main, false, 1, 1); this.add.rectangle(0, 0, 1900, 1200, 0x000000, 0).setScrollFactor(0).setDepth(1000); }
}
