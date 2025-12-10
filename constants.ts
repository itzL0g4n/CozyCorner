
import { User, Decoration, Track } from './types';

export const MOCK_USERS: User[] = [];

export const FLOATING_DECORATIONS: Decoration[] = [
  { id: 'd1', emoji: '☁️', x: 10, y: 15, scale: 1.2, delay: 0 },
  { id: 'd2', emoji: '🌸', x: 85, y: 20, scale: 0.8, delay: 2 },
  { id: 'd3', emoji: '✨', x: 20, y: 80, scale: 0.6, delay: 1 },
  { id: 'd4', emoji: '☕', x: 75, y: 75, scale: 0.9, delay: 3 },
  { id: 'd5', emoji: '💤', x: 90, y: 10, scale: 0.5, delay: 4 },
];

// SoundCloud Track URL
export const SOUNDCLOUD_TRACK_URL = 'https://soundcloud.com/lofi_girl/4-am-studysession';

// Legacy playlist (kept for type compatibility if needed, but unused)
export const PLAYLIST: Track[] = [];

export const SOUND_ASSETS = {
  // UI & Controls (Handled by Synth, keys kept for reference/fallback if needed)
  // glass: 'SYNTH',
  // on: 'SYNTH',
  // off: 'SYNTH',
  // chime: 'SYNTH',
  
  // Room Events (Wikimedia Commons - Reliable)
  join: 'https://upload.wikimedia.org/wikipedia/commons/6/64/Doorbell_monotone.ogg',
  leave: 'https://upload.wikimedia.org/wikipedia/commons/5/5c/Whoosh_sound_effect.ogg',
  
  // Desk Items
  water: 'https://upload.wikimedia.org/wikipedia/commons/6/6c/Pouring_water.ogg',
  cat: 'https://upload.wikimedia.org/wikipedia/commons/b/b3/Kitten_meowing.ogg',
  coffee: 'https://upload.wikimedia.org/wikipedia/commons/a/a5/Ceramic_cup_set_down.ogg', // Close enough to sip/clink
  paper: 'https://upload.wikimedia.org/wikipedia/commons/e/e3/Paper_turning_page.ogg',
  
  // Tools
  pencil: 'https://upload.wikimedia.org/wikipedia/commons/a/a2/Pencil_writing_on_paper.ogg'
};
