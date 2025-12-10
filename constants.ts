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

export const SOUND_ASSETS: Record<string, string> = {
    // Add sound assets here if needed. Example:
    // 'rain': 'https://example.com/rain.mp3',
};