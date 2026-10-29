import type { Look } from './art/characters';
import { P } from './art/palette';

export interface CrewMember {
  name: string;
  role: string;
  look: Look;
  accent: string;
  /** Seat id to start at; wanderers roam between waypoints and free seats instead. */
  seat?: string;
}

// Demo crew until the Status Engine feeds real Hermes profiles into the world (phase 6).
export const DEMO_CREW: CrewMember[] = [
  { name: 'Mira', role: 'Director', accent: P.orange, look: { skin: P.wood, hair: P.ink, hairStyle: 'long', shirt: P.white, pants: P.navy, shoes: P.slate } },
  { name: 'Atlas', role: 'Engineering', accent: P.neonCyan, seat: 'dev-0', look: { skin: P.darkWood, hair: P.ink, hairStyle: 'curly', shirt: P.periwinkle, pants: P.slate, shoes: P.white, glasses: true } },
  { name: 'Nova', role: 'Design', accent: P.neonCyan, seat: 'dev-3', look: { skin: P.floor, hair: P.orange, hairStyle: 'bun', shirt: P.pink, pants: P.navy, shoes: P.white } },
  { name: 'Quinn', role: 'Quality', accent: P.neonCyan, seat: 'dev-5', look: { skin: P.umber, hair: P.ink, hairStyle: 'cap', hat: P.coral, shirt: P.mint, pants: P.slate, shoes: P.white } },
  { name: 'Echo', role: 'Research', accent: P.lavender, seat: 'data-1', look: { skin: P.wood, hair: P.darkWood, hairStyle: 'short', shirt: P.lavender, pants: P.navy, shoes: P.slate, glasses: true } },
  { name: 'Sage', role: 'Operations', accent: P.lightLeaf, look: { skin: P.darkWood, hair: P.ink, hairStyle: 'short', shirt: P.leaf, pants: P.darkWood, shoes: P.white } },
];
