import * as Phaser from 'phaser';
import { generateLayout } from './layout';
import { AGENT_PALETTE, idleDestination, parseAgentSnapshot, WALK_SPEED, type AgentSnapshot, type AgentState } from './agents';

const TILE = 16;
export class WorldScene extends Phaser.Scene {
  private follow = false;
  private zoomLevel = 2;
  private agents: Phaser.GameObjects.Container[] = [];
  private agentRecords: Array<{ sprite: Phaser.GameObjects.Container; data: AgentSnapshot; stateIcon: Phaser.GameObjects.Text; target: Phaser.Math.Vector2 | undefined; idleAt: number; phase: number }> = [];
  private blockedTiles = new Set<string>();
  private statusText?: Phaser.GameObjects.Text;
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
      const middleX = Math.floor(room.width / 2), middleY = Math.floor(room.height / 2);
      for (let tx = 0; tx < room.width; tx++) for (let ty = 0; ty < room.height; ty++) {
        const boundary = tx === 0 || ty === 0 || tx === room.width - 1 || ty === room.height - 1;
        const doorway = (tx === middleX && (ty === 0 || ty === room.height - 1)) || (ty === middleY && (tx === 0 || tx === room.width - 1));
        if (boundary && !doorway) this.blockedTiles.add(`${room.x + tx},${room.y + ty}`);
      }
      if (room.kind === 'coffee_corner') { g.fillStyle(0x73451d); g.fillRect(x + 60, y + 55, 55, 34); g.fillStyle(0xffffff); g.fillRect(x + 70, y + 45, 13, 14); }
    });
    const names = ['Mira', 'Atlas', 'Nova', 'Quinn', 'Echo', 'Sage'];
    const states: AgentState[] = ['working', 'thinking', 'idle', 'meeting', 'blocked', 'waiting_approval'];
    names.forEach((name, i) => { const p = this.roomPoints[i === 5 ? 2 : 3]!; const x = p.x - 42 + (i % 3) * 38; const y = p.y + Math.floor(i / 3) * 27;
      const sprite = this.add.container(x, y); const body = this.add.graphics(); body.fillStyle([0x1e2952, 0xf79b39, 0x38633b, 0x443467, 0x0a71b7, 0x73451d][i]!); body.fillRect(-6, -9, 12, 14); body.fillStyle(0xd4cec0); body.fillRect(-5, -17, 10, 9); body.fillStyle(0x0f0d11); body.fillRect(-3, -13, 2, 2); body.fillRect(2, -13, 2, 2); sprite.add(body);
      const label = this.add.text(-24, -32, name, { fontFamily: 'monospace', fontSize: '8px', color: '#1e2952', backgroundColor: '#ffffffcc', padding: { x: 2, y: 1 } }).setOrigin(0.5); sprite.add(label);
      const state: AgentState = states[i]!; const data: AgentSnapshot = { id: name.toLowerCase(), name, state };
      const icon = this.add.text(9, -21, this.iconFor(state), { fontSize: '10px', color: '#ffffff', backgroundColor: '#344d43', padding: { x: 2, y: 1 } }).setOrigin(0.5).setVisible(state === 'blocked' || state === 'waiting_approval' || state === 'down'); sprite.add(icon);
      sprite.setSize(24, 34).setInteractive({ useHandCursor: true }); sprite.on('pointerdown', () => window.dispatchEvent(new CustomEvent('crossing:agent', { detail: data })));
      if (state === 'down') this.makeDown(sprite, body, icon);
      this.agents.push(sprite); this.agentRecords.push({ sprite, data, stateIcon: icon, target: undefined, idleAt: this.time.now + 1500 + i * 350, phase: i });
    });
    this.statusText = this.add.text(0, 0, '', { fontFamily: 'monospace', fontSize: '8px', color: '#ffffff', backgroundColor: '#202820cc', padding: { x: 4, y: 3 }, wordWrap: { width: 190 } }).setDepth(2000).setVisible(false);
    this.input.on('gameobjectover', (_pointer: unknown, object: Phaser.GameObjects.GameObject) => { const record = this.agentRecords.find((agent) => agent.sprite === object || agent.sprite.list.includes(object)); if (record && this.statusText) { this.statusText.setText(`${record.data.name} · ${record.data.state}`); this.statusText.setPosition(record.sprite.x + 12, record.sprite.y - 38).setVisible(true); } });
    this.input.on('gameobjectout', () => this.statusText?.setVisible(false));
    this.cameras.main.setBounds(-24, -24, 3 * 18 * TILE + 24, 3 * 14 * TILE + 24); this.cameras.main.centerOn(this.roomPoints[0]!.x, this.roomPoints[0]!.y); this.cameras.main.setZoom(this.zoomLevel);
    this.input.on('wheel', (_p: unknown, _o: unknown, _dx: number, dy: number) => this.setZoom(this.zoomLevel + (dy < 0 ? 1 : -1)));
    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => { if (p.rightButtonDown() || p.middleButtonDown()) this.input.setDefaultCursor('grabbing'); });
    this.input.on('pointermove', (p: Phaser.Input.Pointer) => { if (p.isDown) { this.cameras.main.scrollX -= p.velocity.x / this.zoomLevel; this.cameras.main.scrollY -= p.velocity.y / this.zoomLevel; } });
    this.input.keyboard?.on('keydown', (e: KeyboardEvent) => { const cam = this.cameras.main; const step = 32 / this.zoomLevel; if (e.key === 'g' || e.key === 'G') this.follow = false; if (e.key === 'f' || e.key === 'F') this.follow = true; if (e.key === '+' || e.key === '=') this.setZoom(this.zoomLevel + 1); if (e.key === '-') this.setZoom(this.zoomLevel - 1); if (e.key === 'ArrowLeft' || e.key.toLowerCase() === 'a') cam.scrollX -= step; if (e.key === 'ArrowRight' || e.key.toLowerCase() === 'd') cam.scrollX += step; if (e.key === 'ArrowUp' || e.key.toLowerCase() === 'w') cam.scrollY -= step; if (e.key === 'ArrowDown' || e.key.toLowerCase() === 's') cam.scrollY += step; if (/^[1-7]$/.test(e.key)) { const p = this.roomPoints[Number(e.key) - 1]; if (p) cam.centerOn(p.x, p.y); } if (e.key.toLowerCase() === 'k') window.dispatchEvent(new CustomEvent('crossing:kanban')); });
    this.addMiniMap();
    window.addEventListener('crossing:snapshot', this.onSnapshot);
  }
  private onSnapshot = (event: Event) => this.setAgentSnapshots(parseAgentSnapshot((event as CustomEvent<unknown>).detail));
  setAgentSnapshots(agents: AgentSnapshot[]): void {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    agents.forEach((data) => {
      let record = this.agentRecords.find((agent) => agent.data.id === data.id);
      if (!record) {
        const i = this.agentRecords.length; const point = this.roomPoints[3] ?? this.roomPoints[0]!;
        const sprite = this.add.container(point.x - 32 + (i % 4) * 22, point.y + Math.floor(i / 4) * 24); const body = this.add.graphics();
        body.fillStyle([0x1e2952, 0xf79b39, 0x38633b, 0x443467, 0x0a71b7, 0x73451d][i % 6]!); body.fillRect(-6, -9, 12, 14); body.fillStyle(0xd4cec0); body.fillRect(-5, -17, 10, 9); body.fillStyle(0x0f0d11); body.fillRect(-3, -13, 2, 2); body.fillRect(2, -13, 2, 2); sprite.add(body);
        const label = this.add.text(-24, -32, data.name, { fontFamily: 'monospace', fontSize: '8px', color: '#1e2952', backgroundColor: '#ffffffcc', padding: { x: 2, y: 1 } }).setOrigin(.5); sprite.add(label);
        const icon = this.add.text(9, -21, '', { fontSize: '10px', color: '#fff', backgroundColor: '#344d43', padding: { x: 2, y: 1 } }).setOrigin(.5); sprite.add(icon);
        sprite.setSize(24, 34).setInteractive({ useHandCursor: true }); sprite.on('pointerdown', () => window.dispatchEvent(new CustomEvent('crossing:agent', { detail: record?.data ?? data })));
        record = { sprite, data, stateIcon: icon, target: undefined, idleAt: this.time.now + 1000, phase: i }; this.agentRecords.push(record); this.agents.push(sprite);
      }
      const enteringDown = record.data.state !== 'down' && data.state === 'down';
      record.data = data; record.target = undefined; record.stateIcon.setText(this.iconFor(data.state)).setVisible(['blocked','waiting_approval','down'].includes(data.state));
      record.sprite.setAlpha(data.state === 'degraded' ? .6 : 1);
      const body = record.sprite.list.find((child): child is Phaser.GameObjects.Graphics => child instanceof Phaser.GameObjects.Graphics);
      if (body) { body.clear(); body.fillStyle(AGENT_PALETTE[this.agentRecords.indexOf(record) % AGENT_PALETTE.length]!); if (data.state === 'down') { body.fillRoundedRect(-11,-4,22,9,3); body.fillCircle(-10,0,4); } else { body.fillRect(-6,-9,12,14); body.fillStyle(0xd4cec0); body.fillRect(-5,-17,10,9); body.fillStyle(0x0f0d11); body.fillRect(-3,-13,2,2); body.fillRect(2,-13,2,2); if (!reduced && ['working','thinking','meeting'].includes(data.state)) body.fillStyle(0xd4cec0).fillRect(-8,-7,3,5); } }
      if (enteringDown && this.statusText) this.statusText.setText(`${data.name} · Agent inactif. ${data.name} ne répond plus.`);
    });
  }
  private iconFor(state: AgentSnapshot['state']): string { return ({ blocked: '!', waiting_approval: '?', down: '✕', degraded: '⚠', thinking: '…', meeting: '●', working: '▸', idle: '·' })[state]; }
  private makeDown(sprite: Phaser.GameObjects.Container, body: Phaser.GameObjects.Graphics, icon: Phaser.GameObjects.Text): void {
    body.clear().fillStyle(0x1e2952).fillRoundedRect(-11,-4,22,9,3).fillCircle(-10,0,4); icon.setText('✕').setVisible(true);
    const label = sprite.list.find((child) => child instanceof Phaser.GameObjects.Text && child !== icon) as Phaser.GameObjects.Text | undefined;
    if (label) label.setText(`${label.text} · DOWN`);
  }
  private findPath(start: Phaser.Math.Vector2, goal: Phaser.Math.Vector2): Phaser.Math.Vector2[] {
    const toTile = (p: Phaser.Math.Vector2) => ({ x: Math.round(p.x / TILE), y: Math.round(p.y / TILE) });
    const a = toTile(start), b = toTile(goal), key = (x: number,y: number) => `${x},${y}`;
    const open = [{ x: a.x, y: a.y, g: 0, f: Math.abs(a.x-b.x)+Math.abs(a.y-b.y) }]; const came = new Map<string,string>(); const cost = new Map([[key(a.x,a.y),0]]); const closed = new Set<string>();
    while (open.length) { open.sort((m,n) => m.f-n.f); const current = open.shift()!; const ck=key(current.x,current.y); if (current.x===b.x && current.y===b.y) { const path: Phaser.Math.Vector2[]=[]; let k=ck; while (came.has(k)) { const [x,y]=k.split(',').map(Number); path.unshift(new Phaser.Math.Vector2(x!*TILE,y!*TILE)); k=came.get(k)!; } return path; } closed.add(ck);
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) { const x=current.x+dx,y=current.y+dy,nk=key(x,y); if (closed.has(nk)||this.blockedTiles.has(nk)||x<0||y<0||x>=54||y>=42) continue; const g=current.g+1; if (g>=(cost.get(nk)??Infinity)) continue; came.set(nk,ck); cost.set(nk,g); open.push({x,y,g,f:g+Math.abs(x-b.x)+Math.abs(y-b.y)}); }
    } return [];
  }
  private nextDestination(record: typeof this.agentRecords[number]): void {
    const destination = idleDestination(Math.random, this.roomPoints); const point = this.roomPoints[destination];
    if (point) record.target = new Phaser.Math.Vector2(point.x + Phaser.Math.Between(-24,24), point.y + Phaser.Math.Between(-18,18));
  }
  private setZoom(level: number) { this.zoomLevel = Phaser.Math.Clamp(Math.round(level), 1, 4); this.cameras.main.setZoom(this.zoomLevel); }
  update(_time: number, delta: number) {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    for (const record of this.agentRecords) {
      const { sprite, data } = record;
      if (data.state !== 'idle' || reduced || this.time.now < record.idleAt || !record.target) { if (data.state === 'idle' && !reduced && this.time.now >= record.idleAt) this.nextDestination(record); }
      else { const path = this.findPath(new Phaser.Math.Vector2(sprite.x,sprite.y),record.target); const next=path[0]; if (!next) { record.target=undefined; record.idleAt=this.time.now+1200; continue; } const vx=next.x-sprite.x,vy=next.y-sprite.y,dist=Math.hypot(vx,vy),step=WALK_SPEED*delta/1000; sprite.x += vx/dist*Math.min(step,dist); sprite.y += vy/dist*Math.min(step,dist); if (dist<step+1) { record.target=undefined; record.idleAt=this.time.now+Phaser.Math.Between(1200,3500); } }
      if (!reduced && ['working','thinking','meeting'].includes(data.state)) sprite.y += Math.sin(this.time.now/190+record.phase)*.035;
    }
    if (this.follow && this.agents[0]) this.cameras.main.centerOn(this.agents[0].x, this.agents[0].y);
  }
  private addMiniMap() { const mini = this.cameras.add(0, 0, 150, 100).setZoom(.075).setName('minimap'); mini.setBackgroundColor('#1e2952'); mini.startFollow(this.cameras.main, false, 1, 1); this.add.rectangle(0, 0, 1900, 1200, 0x000000, 0).setScrollFactor(0).setDepth(1000); }
}
