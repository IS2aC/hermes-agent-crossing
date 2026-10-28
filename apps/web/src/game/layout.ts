export type RoomKind = 'hall' | 'private_office' | 'open_space_general' | 'team_open_space_2' | 'team_open_space_4' | 'team_open_space_6' | 'team_open_space_8' | 'kanban_room' | 'coffee_corner' | 'server_room';
export interface Room { id: string; name: string; kind: RoomKind; x: number; y: number; width: number; height: number; color: number; }
const palette = [0x30f5ff, 0xf896c5, 0x6b82e4, 0xfd7a61, 0xdcb9f4, 0x9cc7c7, 0xb2727d, 0xffeeac];
export function seeded(seed: number): () => number { let state = seed >>> 0; return () => { state = (state * 1664525 + 1013904223) >>> 0; return state / 4294967296; }; }
export function generateLayout(seed = 7): Room[] {
  const random = seeded(seed);
  const specs: Array<[string, string, RoomKind]> = [
    ['hall', 'HALL / RECEPTION', 'hall'], ['private-office', 'PRIVATE OFFICE', 'private_office'],
    ['general', 'GENERAL OPEN SPACE', 'open_space_general'], ['team-dev', 'TEAM DEV', 'team_open_space_4'],
    ['kanban', 'KANBAN ROOM', 'kanban_room'], ['coffee', 'COFFEE CORNER', 'coffee_corner'], ['servers', 'SERVER ROOM', 'server_room'],
  ];
  return specs.map(([id, name, kind], index) => ({ id, name, kind, x: (index % 3) * 18, y: Math.floor(index / 3) * 14, width: 16, height: 12, color: palette[Math.floor(random() * palette.length)]! }));
}
export function prefab(kind: RoomKind) {
  const floor: number[] = []; for (let i = 0; i < 192; i++) floor.push(1);
  return { type: 'map', version: '1.10', tiledversion: '1.10.2', orientation: 'orthogonal', renderorder: 'right-down', width: 16, height: 12, tilewidth: 16, tileheight: 16, infinite: false, layers: [{ id: 1, name: 'floor', type: 'tilelayer', width: 16, height: 12, data: floor }, { id: 2, name: 'objects', type: 'objectgroup', objects: [{ id: 1, name: kind, type: 'room', x: 0, y: 0, width: 256, height: 192 }] }], tilesets: [] };
}
