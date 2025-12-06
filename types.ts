import { LucideIcon } from 'lucide-react';

export interface User {
  id: string;
  name: string;
  avatarUrl: string;
  isSpeaking: boolean;
  isMuted: boolean;
  isVideoOff?: boolean; // Track if camera is toggled off
  isScreenShare?: boolean; // Track if this is a screen share feed
  color: string;
  stream?: MediaStream; // The real video/audio stream
  isLocal?: boolean;    // Is this the current user?
}

export interface DockItem {
  id: string;
  label: string;
  icon: LucideIcon;
  action: () => void;
  isActive?: boolean;
}

export interface Decoration {
  id: string;
  emoji: string;
  x: number; // percentage
  y: number; // percentage
  scale: number;
  delay: number;
}

export interface Track {
  id: string;
  title: string;
  artist: string;
  url: string;
  duration: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  sources?: { title: string; uri: string }[];
  timestamp: number;
}