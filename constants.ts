import { User, Decoration, Track } from './types';

export const MOCK_USERS: User[] = [];

export const FLOATING_DECORATIONS: Decoration[] = [
  { id: 'd1', emoji: '☁️', x: 10, y: 15, scale: 1.2, delay: 0 },
  { id: 'd2', emoji: '🌸', x: 85, y: 20, scale: 0.8, delay: 2 },
  { id: 'd3', emoji: '✨', x: 20, y: 80, scale: 0.6, delay: 1 },
  { id: 'd4', emoji: '☕', x: 75, y: 75, scale: 0.9, delay: 3 },
  { id: 'd5', emoji: '💤', x: 90, y: 10, scale: 0.5, delay: 4 },
];

// Using reliable audio sources for demo
export const PLAYLIST: Track[] = [
  {
    id: 't1',
    title: 'Acoustic Breeze',
    artist: 'Benjamin Tissot',
    url: 'https://www.bensound.com/bensound-music/bensound-acousticbreeze.mp3',
    duration: '2:37'
  },
  {
    id: 't2',
    title: 'Sunny',
    artist: 'Benjamin Tissot',
    url: 'https://www.bensound.com/bensound-music/bensound-sunny.mp3',
    duration: '2:20'
  },
  {
    id: 't3',
    title: 'Going Higher',
    artist: 'Benjamin Tissot',
    url: 'https://www.bensound.com/bensound-music/bensound-goinghigher.mp3',
    duration: '4:04'
  },
  {
    id: 't4',
    title: 'Sweet',
    artist: 'Benjamin Tissot',
    url: 'https://www.bensound.com/bensound-music/bensound-sweet.mp3',
    duration: '5:07'
  }
];