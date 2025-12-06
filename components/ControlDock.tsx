
import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Mic, MicOff, Video, VideoOff, Monitor, MonitorOff, Coffee, PhoneOff, Music, Sparkles, LayoutGrid, PenTool
} from 'lucide-react';
import { DockItem } from '../types';

interface ControlDockProps {
  onLeave: () => void;
  toggleMusic: () => void;
  toggleStudyBuddy: () => void;
  toggleTimer: () => void;
  toggleDecorations: () => void;
  toggleWhiteboard: () => void; // New
  
  isMusicOpen: boolean;
  isStudyBuddyOpen: boolean;
  isTimerOpen: boolean;
  isDecorationsOpen: boolean;
  isWhiteboardOpen: boolean; // New
  
  // Media Controls
  isMicOn: boolean;
  isCameraOn: boolean;
  isScreenSharing: boolean;
  onToggleMic: () => void;
  onToggleCamera: () => void;
  onToggleScreenShare: () => void;
}

export const ControlDock: React.FC<ControlDockProps> = ({ 
  onLeave, 
  toggleMusic, 
  toggleStudyBuddy,
  toggleTimer,
  toggleDecorations,
  toggleWhiteboard,
  isMusicOpen,
  isStudyBuddyOpen,
  isTimerOpen,
  isDecorationsOpen,
  isWhiteboardOpen,
  isMicOn,
  isCameraOn,
  isScreenSharing,
  onToggleMic,
  onToggleCamera,
  onToggleScreenShare
}) => {
  const [hoveredId, setHoveredId] = React.useState<string | null>(null);

  const dockItems: DockItem[] = [
    { 
      id: 'mic', 
      label: isMicOn ? 'Mute' : 'Unmute', 
      icon: isMicOn ? Mic : MicOff,
      action: onToggleMic,
      isActive: !isMicOn
    },
    { 
      id: 'camera', 
      label: isCameraOn ? 'Stop Video' : 'Start Video', 
      icon: isCameraOn ? Video : VideoOff,
      action: onToggleCamera,
      isActive: !isCameraOn
    },
    { 
      id: 'whiteboard',
      label: isWhiteboardOpen ? 'Close Board' : 'Whiteboard',
      icon: PenTool,
      action: toggleWhiteboard,
      isActive: isWhiteboardOpen
    },
    { 
      id: 'music',
      label: 'Lofi Player',
      icon: Music,
      action: toggleMusic,
      isActive: isMusicOpen
    },
    { 
      id: 'study',
      label: 'Study Buddy',
      icon: Sparkles,
      action: toggleStudyBuddy,
      isActive: isStudyBuddyOpen
    },
    { 
      id: 'decorate',
      label: isDecorationsOpen ? 'Close Desk' : 'Decorate Desk',
      icon: LayoutGrid, // Icon for items/grid
      action: toggleDecorations,
      isActive: isDecorationsOpen
    },
    { 
      id: 'share', 
      label: isScreenSharing ? 'Stop Sharing' : 'Share Screen', 
      icon: isScreenSharing ? MonitorOff : Monitor, 
      action: onToggleScreenShare,
      isActive: isScreenSharing
    },
    { 
      id: 'pomodoro', 
      label: isTimerOpen ? 'Hide Timer' : 'Focus Timer', 
      icon: Coffee, 
      action: toggleTimer,
      isActive: isTimerOpen
    },
    { 
      id: 'leave', 
      label: 'Leave', 
      icon: PhoneOff, 
      action: onLeave,
    },
  ];

  return (
    <div className="fixed bottom-8 left-0 right-0 flex justify-center items-end z-50 pointer-events-none">
      <motion.div 
        className="pointer-events-auto flex items-center gap-3 px-6 py-4 bg-white/40 backdrop-blur-xl border border-white/60 rounded-3xl shadow-xl shadow-purple-500/10"
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: "spring", stiffness: 200, damping: 20 }}
      >
        {dockItems.map((item) => {
          const isLeave = item.id === 'leave';
          const isOffState = (item.id === 'mic' && !isMicOn) || (item.id === 'camera' && !isCameraOn);
          
          return (
            <motion.button
              key={item.id}
              className={`relative group flex items-center justify-center w-12 h-12 md:w-14 md:h-14 rounded-2xl transition-colors
                ${isLeave ? 'bg-red-100 hover:bg-red-200 text-red-600' : 'bg-white/50 hover:bg-white/80 text-slate-700'}
                ${item.isActive && !isLeave ? 'bg-purple-100 text-purple-700 ring-2 ring-purple-200' : ''}
                ${isOffState ? 'bg-red-50 text-red-500 ring-2 ring-red-100' : ''}
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
              <item.icon size={22} strokeWidth={2.5} />
              
              {/* Tooltip */}
              <AnimatePresence>
                {hoveredId === item.id && (
                  <motion.div
                    className="absolute -top-10 text-xs font-bold text-slate-600 bg-white/90 px-3 py-1.5 rounded-lg shadow-sm whitespace-nowrap backdrop-blur-sm"
                    initial={{ opacity: 0, y: 10, scale: 0.8 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 5, scale: 0.8 }}
                  >
                    {item.label}
                  </motion.div>
                )}
              </AnimatePresence>
              
              {/* Active Indicator Dot */}
              {item.isActive && !isLeave && (
                <div className="absolute -bottom-1 w-1.5 h-1.5 rounded-full bg-slate-600/50" />
              )}
            </motion.button>
          );
        })}
      </motion.div>
    </div>
  );
};
