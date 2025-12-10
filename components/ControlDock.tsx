
import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Mic, MicOff, Video, VideoOff, Monitor, MonitorOff, PhoneOff
} from 'lucide-react';
import { DockItem } from '../types';

interface ControlDockProps {
  onLeave: () => void;
  
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
  isMicOn,
  isCameraOn,
  isScreenSharing,
  onToggleMic,
  onToggleCamera,
  onToggleScreenShare,
}) => {
  const [hoveredId, setHoveredId] = React.useState<string | null>(null);

  const handleDockAction = (action: () => void) => {
      action();
  };

  const dockItems: DockItem[] = [
    { 
      id: 'mic', 
      label: isMicOn ? 'Mute' : 'Unmute', 
      icon: isMicOn ? Mic : MicOff,
      action: () => handleDockAction(onToggleMic),
      isActive: !isMicOn
    },
    { 
      id: 'camera', 
      label: isCameraOn ? 'Stop Video' : 'Start Video', 
      icon: isCameraOn ? Video : VideoOff,
      action: () => handleDockAction(onToggleCamera),
      isActive: !isCameraOn
    },
    { 
      id: 'share', 
      label: isScreenSharing ? 'Stop Sharing' : 'Share Screen', 
      icon: isScreenSharing ? MonitorOff : Monitor, 
      action: () => handleDockAction(onToggleScreenShare),
      isActive: isScreenSharing
    },
    { 
      id: 'leave', 
      label: 'Leave', 
      icon: PhoneOff, 
      action: () => handleDockAction(onLeave),
    },
  ];

  return (
    <div className="fixed bottom-8 left-0 right-0 flex justify-center items-end z-50 pointer-events-none">
      <motion.div 
        className="pointer-events-auto flex items-center gap-2 md:gap-4 px-6 py-4 bg-white/40 dark:bg-slate-900/60 backdrop-blur-xl border border-white/60 dark:border-slate-700/60 rounded-3xl shadow-xl shadow-purple-500/10 dark:shadow-indigo-900/20"
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
              className={`relative group flex items-center justify-center w-12 h-12 md:w-16 md:h-16 rounded-2xl transition-colors
                ${isLeave ? 'bg-red-100 hover:bg-red-200 text-red-600 dark:bg-red-900/50 dark:text-red-300' : 'bg-white/50 hover:bg-white/80 dark:bg-slate-800/50 dark:hover:bg-slate-700/80 text-slate-700 dark:text-slate-200'}
                ${item.isActive && !isLeave ? 'bg-purple-100 text-purple-700 ring-2 ring-purple-200 dark:bg-indigo-900/50 dark:text-indigo-300 dark:ring-indigo-700' : ''}
                ${isOffState ? 'bg-red-50 text-red-500 ring-2 ring-red-100 dark:bg-red-900/20 dark:text-red-400 dark:ring-red-900/40' : ''}
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
              <item.icon size={24} strokeWidth={2.5} />
              
              {/* Tooltip */}
              <AnimatePresence>
                {hoveredId === item.id && (
                  <motion.div
                    className="absolute -top-12 text-xs font-bold text-slate-600 dark:text-slate-200 bg-white/90 dark:bg-slate-800/90 px-3 py-1.5 rounded-lg shadow-sm whitespace-nowrap backdrop-blur-sm"
                    initial={{ opacity: 0, y: 10, scale: 0.8 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 5, scale: 0.8 }}
                  >
                    {item.label}
                  </motion.div>
                )}
              </AnimatePresence>
              
              {/* Active Indicator Dot (Bottom) */}
              {item.isActive && !isLeave && (
                <div className="absolute -bottom-1.5 w-1.5 h-1.5 rounded-full bg-slate-600/50 dark:bg-slate-300/50" />
              )}
            </motion.button>
          );
        })}
      </motion.div>
    </div>
  );
};
