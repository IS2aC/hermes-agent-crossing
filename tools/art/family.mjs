// La famille : chaque personnage est le Master avec une palette et des calques.
import { MASTER_PALETTE } from './character.mjs'

const TIE = {
  down: ['............', '............', '.....AA.....', '.....AA.....', '......A.....'],
}

const BADGE = {
  down: ['............', '............', '.......A....'],
  right: ['............', '............', '.......A....'],
}

const LONG_HAIR = {
  down: [
    '............', '............', '............', '............',
    '............', '.OH......HO.', '.OH......HO.', '.OH......HO.',
    '.OH......HO.', '.Oh......hO.', '..O......O..',
  ],
  up: [
    '............', '............', '............', '............',
    '............', '............', '............', '............',
    '............', '..OHHHHHHO..', '..OhhhhhhO..',
  ],
  right: [
    '............', '............', '............', '............',
    '............', '............', '............', '............',
    '............', '..OHHSSSSO..', '..OhhO......',
  ],
}

const VISOR = {
  down: [
    '............', '............', '............', '............',
    '............', '............', '..GGGGGGGG..', '............',
  ],
  right: [
    '............', '............', '............', '............',
    '............', '............', '.....GGGGGG.', '............',
  ],
}

const GLASSES = {
  down: [
    '............', '............', '............', '............',
    '............', '..GGG..GGG..', '..GEG..GEG..', '...G....G...',
  ],
  right: [
    '............', '............', '............', '............',
    '............', '.....GGGGO..', '.....G.EG...', '......GG....',
  ],
}

const CAP = {
  down: [
    '...OOOOOO...', '..OAAAAAAO..', '.OAAAAAAAAO.', '.OAAAAAAAAO.',
    '.OaaaaaaaaO.', '..OOOOOOOO..',
  ],
  up: ['...OOOOOO...', '..OAAAAAAO..', '.OAAAAAAAAO.', '.OAAAAAAAAO.', '.OaaaaaaaaO.'],
  right: [
    '...OOOOOO...', '..OAAAAAAO..', '.OAAAAAAAAO.', '.OAAAAAAAAO.',
    '.OaaaaaaaaaO', '.....OOOOOO.',
  ],
}

const SPIKES = {
  grid: ['...O..O..O..', '..OHOOHOOHO.', '..OHHHHHHHO.'],
  dy: -2,
}

const HEADPHONES = {
  down: [
    '............', '............', '..aaaaaaaa..', '............',
    '............', '.AA......AA.', '.AA......AA.', '.AA......AA.',
  ],
  up: [
    '............', '............', '..aaaaaaaa..', '............',
    '............', '.AA......AA.', '.AA......AA.', '.AA......AA.',
  ],
  right: [
    '............', '............', '....aa......', '....aa......',
    '....aa......', '...AAA......', '...AAA......', '...AAA......',
  ],
}

const BUN = {
  grid: ['....OOOO....', '...OHHHHO...', '...OHlHHO...'],
  dy: -2,
}

const COAT_HEM = {
  down: ['...OTTTTO...', '...OttttO...', '....OOOO....'],
  up: ['...OTTTTO...', '...OttttO...', '....OOOO....'],
  right: ['....OTTTO...', '....OtttO...', '.....OOO....'],
}

export const FAMILY = {
  jarvis: {
    palette: { H: '#3b3440', h: '#2f2936', l: '#574e5e', T: '#2f4470', t: '#233457', A: '#e0b84c', P: '#2a3350', p: '#202842', B: '#3a3038' },
    overlays: { torso: TIE },
  },
  veilleur: {
    palette: { H: '#5c4a6e', h: '#463757', l: '#7a6690', T: '#2f5d50', t: '#23483e', A: '#4d8a78', P: '#2e3d3b', p: '#22302e', B: '#3b3a36', G: '#48d6c4' },
    overlays: { head: { down: [...LONG_HAIR.down], up: LONG_HAIR.up, right: LONG_HAIR.right }, visor: VISOR },
  },
  'data-analyst': {
    palette: { H: '#2f2b33', h: '#242127', l: '#4c4653', S: '#c98f6b', s: '#a97353', T: '#6c4bb0', t: '#533a8c', A: '#b49be0', P: '#3f3a54', p: '#312d42', B: '#2f2b33', G: '#e8e6ef' },
    overlays: { head: GLASSES },
  },
  devops: {
    palette: { H: '#8c4a2f', h: '#6f3a25', l: '#a7624a', T: '#d97a2b', t: '#b05f1f', A: '#2f6f9e', a: '#23567c', P: '#47505f', p: '#39404d', B: '#5b4032' },
    overlays: { head: CAP },
  },
  developer: {
    palette: { H: '#c9a14a', h: '#a3803a', l: '#e0bd6a', S: '#e8b48e', s: '#c9926d', T: '#5a9e5a', t: '#467d46', A: '#3a3f4f', a: '#2a2e3a', P: '#39506f', p: '#2d3f58', B: '#e4e4e8' },
    overlays: { spikes: { down: SPIKES, up: SPIKES, right: SPIKES }, phones: HEADPHONES },
  },
  researcher: {
    palette: { H: '#a34b3a', h: '#853c2e', l: '#c26a57', S: '#8d5a3f', s: '#724630', T: '#eef0f4', t: '#c9cdd6', A: '#8fb9d9', P: '#4d5a7a', p: '#3c4661', B: '#4b3f3a' },
    overlays: { bun: { down: BUN, up: BUN, right: BUN }, legs: COAT_HEM },
  },
  security: {
    palette: { H: '#23212a', h: '#1a1820', l: '#3a3744', T: '#34343f', t: '#26262f', A: '#d0453f', P: '#26262f', p: '#1c1c24', B: '#17171d' },
    overlays: { torso: BADGE },
  },
}

export function familyMember(id) {
  const member = FAMILY[id]
  return {
    palette: { ...MASTER_PALETTE, ...member.palette },
    overlays: member.overlays,
  }
}
