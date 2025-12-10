
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
  // UI & Controls
  glass: 'https://assets.mixkit.co/sfx/preview/mixkit-software-interface-start-2574.mp3', // Soft glass tap
  on: 'https://assets.mixkit.co/sfx/preview/mixkit-sci-fi-click-900.mp3', // High pitch bloop
  off: 'https://assets.mixkit.co/sfx/preview/mixkit-click-error-1110.mp3', // Low pitch bloop
  hover: 'https://assets.mixkit.co/sfx/preview/mixkit-plastic-bubble-click-1124.mp3', // Subtle hover bubble

  // Notifications
  chime: 'https://assets.mixkit.co/sfx/preview/mixkit-positive-notification-951.mp3',
  
  // Room Events
  join: 'https://assets.mixkit.co/sfx/preview/mixkit-doorbell-single-press-333.mp3',
  leave: 'https://assets.mixkit.co/sfx/preview/mixkit-fast-rocket-whoosh-1714.mp3',
  
  // Desk Items
  water: 'https://assets.mixkit.co/sfx/preview/mixkit-liquid-spill-2182.mp3', // Splash
  cat: 'https://assets.mixkit.co/sfx/preview/mixkit-sweet-kitty-meow-93.mp3',
  coffee: 'https://assets.mixkit.co/sfx/preview/mixkit-ceramics-clink-1188.mp3',
  paper: 'https://assets.mixkit.co/sfx/preview/mixkit-paper-slide-1530.mp3',
  
  // Tools
  pencil: 'https://assets.mixkit.co/sfx/preview/mixkit-writing-on-paper-1647.mp3'
};
