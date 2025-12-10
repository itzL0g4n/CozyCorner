
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  MessageSquare, Music, Sparkles, LayoutGrid, PenTool, Coffee
} from 'lucide-react';
import { DockItem } from '../types';

interface SideControlsProps {
  toggleMusic: () => void;
  toggleStudyBuddy: () => void;
  toggleTimer: () => void;
  toggleDecorations: () => void;
  toggleWhiteboard: () => void;
  toggleChat: () => void;
  
  isMusicOpen: boolean;
  isStudyBuddyOpen: boolean;
  isTimerOpen: boolean;
  isDecorationsOpen: boolean;
  isWhiteboardOpen: boolean;
  isChatOpen: boolean;
  
  unreadMessages: boolean;
}

export const SideControls: React.FC<SideControlsProps> = ({
  toggleMusic,
  toggleStudyBuddy,
  toggleTimer,
  toggleDecorations,
  toggleWhiteboard,
  toggleChat,
  isMusicOpen,
  isStudyBuddyOpen,
  isTimerOpen,
  isDecorationsOpen,
  isWhiteboardOpen,
  isChatOpen,
  unreadMessages,
}) => {
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const items: DockItem[] = [
    { 
      id: 'pomodoro', 
      label: isTimerOpen ? 'Hide Timer' : 'Focus Timer', 
      icon: Coffee, 
      action: toggleTimer,
      isActive: isTimerOpen
    },
    { 
      id: 'music',
      label: 'Lofi Player',
      icon: Music,
      action: toggleMusic,
      isActive: isMusicOpen
    },
    { 
      id: 'decorate',
      label: isDecorationsOpen ? 'Close Desk' : 'Decorate Desk',
      icon: LayoutGrid,
      action: toggleDecorations,
      isActive: isDecorationsOpen
    },
    { 
      id: 'whiteboard',
      label: isWhiteboardOpen ? 'Close Board' : 'Whiteboard',
      icon: PenTool,
      action: toggleWhiteboard,
      isActive: isWhiteboardOpen
    },
    { 
      id: 'study',
      label: 'Study Buddy',
      icon: Sparkles,
      action: toggleStudyBuddy,
      isActive: isStudyBuddyOpen
    },
    { 
      id: 'chat',
      label: isChatOpen ? 'Close Chat' : 'Room Chat',
      icon: MessageSquare,
      action: toggleChat,
      isActive: isChatOpen,
      badge: unreadMessages
    },
  ];

  return (
    <div className="fixed bottom-8 right-6 flex flex-col items-end z-50 pointer-events-none">
      <motion.div 
        className="pointer-events-auto flex items-center gap-2 md:gap-3 px-4 py-3 bg-white/40 dark:bg-slate-900/60 backdrop-blur-xl border border-white/60 dark:border-slate-700/60 rounded-3xl shadow-xl shadow-purple-500/10 dark:shadow-indigo-900/20"
        initial={{ x: 100, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ type: "spring", stiffness: 200, damping: 20, delay: 0.1 }}
      >
        {items.map((item) => (
          <motion.button
            key={item.id}
            className={`relative group flex items-center justify-center w-10 h-10 md:w-12 md:h-12 rounded-xl transition-colors
              bg-white/50 hover:bg-white/80 dark:bg-slate-800/50 dark:hover:bg-slate-700/80 text-slate-700 dark:text-slate-200
              ${item.isActive ? 'bg-purple-100 text-purple-700 ring-2 ring-purple-200 dark:bg-indigo-900/50 dark:text-indigo-300 dark:ring-indigo-700' : ''}
            `}
            onClick={item.action}
            onHoverStart={() => setHoveredId(item.id)}
            onHoverEnd={() => setHoveredId(null)}
            whileHover={{ 
              scale: 1.15, 
              y: -5,
              transition: { type: "spring", stiffness: 400, damping: 10 }
            }}
            whileTap={{ scale: 0.9 }}
          >
            <item.icon size={20} strokeWidth={2.5} />
            
            {/* Tooltip */}
            <AnimatePresence>
              {hoveredId === item.id && (
                <motion.div
                  className="absolute -top-10 text-xs font-bold text-slate-600 dark:text-slate-200 bg-white/90 dark:bg-slate-800/90 px-3 py-1.5 rounded-lg shadow-sm whitespace-nowrap backdrop-blur-sm"
                  initial={{ opacity: 0, y: 10, scale: 0.8 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 5, scale: 0.8 }}
                >
                  {item.label}
                </motion.div>
              )}
            </AnimatePresence>
            
            {/* Active Indicator Dot */}
            {item.isActive && (
              <div className="absolute -bottom-1 w-1 h-1 rounded-full bg-slate-600/50 dark:bg-slate-300/50" />
            )}

            {/* Unread Badge */}
            {item.badge && (
              <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border-2 border-white dark:border-slate-900 animate-pulse" />
            )}
          </motion.button>
        ))}
      </motion.div>
    </div>
  );
};
