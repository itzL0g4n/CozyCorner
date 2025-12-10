
import { LucideIcon } from 'lucide-react';

export type DeskItemType = 'note' | 'plant' | 'coffee' | 'pet';

export interface DeskItem {
  id: string;
  type: DeskItemType;
  x: number; // percentage 0-100
  y: number; // percentage 0-100
  data?: any; // text for note, state for pet, etc.
}

export interface User {
  id: string;
  name: string;
  avatarUrl: string;
  isSpeaking: boolean;
  isMuted: boolean;
  isVideoOff?: boolean;
  isScreenShare?: boolean;
  color: string;
  stream?: MediaStream;
  isLocal?: boolean;
  deskItems?: DeskItem[]; // Interactive items on their feed
}

export interface DockItem {
  id: string;
  label: string;
  icon: LucideIcon;
  action: () => void;
  isActive?: boolean;
  badge?: boolean | number;
}

export interface Decoration {
  id: string;
  emoji: string;
  x: number;
  y: number;
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

export interface RoomMessage {
  id: string;
  senderId: string;
  senderName: string;
  text: string;
  timestamp: number;
  isSystem?: boolean;
}

// --- Whiteboard Types ---

export type WhiteboardTool = 
  | 'select' 
  | 'pen' 
  | 'eraser' 
  | 'rect' 
  | 'circle' 
  | 'line' 
  | 'arrow' 
  | 'text';

export interface WhiteboardElement {
  id: string;
  type: 'path' | 'rect' | 'circle' | 'line' | 'arrow' | 'text';
  x: number;
  y: number;
  width?: number;
  height?: number;
  stroke: string;
  strokeWidth: number;
  fill?: string;
  points?: { x: number; y: number }[]; // For paths
  text?: string;
  rotation: number;
  fontSize?: number;
}

export interface WhiteboardAction {
  type: 'ADD' | 'UPDATE' | 'DELETE' | 'SYNC';
  data?: WhiteboardElement | WhiteboardElement[];
  elementId?: string;
}
