
import React, { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, MicOff, Monitor, Maximize2, Minimize2 } from 'lucide-react';
import { User } from '../types';

interface VideoGridProps {
  users: User[];
  focusedUserId: string | null;
  onFocusUser: (id: string | null) => void;
}

interface VideoCardProps {
  user: User;
  index?: number;
  onClick?: () => void;
  isFocused?: boolean;
  minimal?: boolean; // For filmstrip view
}

const VideoCard: React.FC<VideoCardProps> = ({ 
    user, 
    index = 0, 
    onClick, 
    isFocused, 
    minimal
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);

  // Attach stream to video element when available
  useEffect(() => {
    if (user.stream && videoRef.current) {
      videoRef.current.srcObject = user.stream;
    }
  }, [user.stream]); // Removed user.isVideoOff dependency to prevent re-attaching stream needlessly

  // Only mirror if it's the local user AND NOT a screen share
  const shouldMirror = user.isLocal && !user.isScreenShare;
  
  // Organic shapes only for grid mode, not minimal/filmstrip
  const randomRadii = [
    "24px 24px 24px 24px",
    "32px 20px 32px 20px", 
    "20px 32px 20px 32px",
    "28px 28px 28px 28px"
  ];
  const startIndex = index % randomRadii.length;
  const radiiSequence = minimal || isFocused ? ["16px"] : [
    ...randomRadii.slice(startIndex),
    ...randomRadii.slice(0, startIndex),
    randomRadii[startIndex]
  ];

  return (
    <div 
        className={`relative flex flex-col items-center justify-center ${minimal ? 'w-48 aspect-video flex-shrink-0' : 'w-full h-full'}`}
    >
      <motion.div
        className={`
          relative w-full h-full flex items-center justify-center group
          ${isFocused ? 'bg-transparent' : `${user.color} bg-opacity-20 backdrop-blur-md shadow-lg`}
        `}
        animate={{
          borderRadius: radiiSequence,
        }}
        transition={{
          duration: isFocused || minimal ? 0 : 8 + index,
          repeat: isFocused || minimal ? 0 : Infinity,
          ease: "easeInOut",
        }}
        whileHover={{ scale: isFocused ? 1 : 1.02 }}
        onClick={onClick}
      >
        {/* VIDEO/AVATAR LAYER (Masked) */}
        <motion.div 
            className={`absolute inset-0 overflow-hidden z-10 ${isFocused ? '' : 'border-2 border-white/70'}`}
            animate={{ borderRadius: radiiSequence }}
            transition={{
                duration: isFocused || minimal ? 0 : 8 + index,
                repeat: isFocused || minimal ? 0 : Infinity,
                ease: "easeInOut",
            }}
        >
            <div className={`relative w-full h-full flex items-center justify-center ${isFocused ? 'bg-transparent' : 'bg-black/5'}`}>
                {/* 
                   ALWAYS render video if stream exists to ensure AUDIO plays.
                   Use CSS to hide it if video is off. 
                */}
                {user.stream && (
                    <video
                        ref={videoRef}
                        autoPlay
                        playsInline
                        muted={user.isLocal} // Mute self
                        className={`w-full h-full ${shouldMirror ? 'transform scale-x-[-1]' : ''} ${user.isScreenShare || isFocused ? 'object-contain' : 'object-cover'} ${user.isVideoOff ? 'opacity-0 absolute pointer-events-none' : ''}`}
                    />
                )}
                
                {/* Fallback Avatar UI (Visible if no stream OR video is off) */}
                {(!user.stream || user.isVideoOff) && (
                    <div className="absolute inset-0 flex items-center justify-center bg-transparent z-20">
                        <img 
                            src={user.avatarUrl} 
                            alt={user.name} 
                            className={`w-full h-full ${isFocused ? 'object-contain' : 'object-cover'} opacity-90 transition-opacity duration-300 group-hover:opacity-100`} 
                        />
                        <div className={`absolute inset-0 ${isFocused ? '' : 'bg-gradient-to-t from-black/20 to-transparent'}`} />
                    </div>
                )}
            </div>

             {/* Hover Overlay for Focus/Unfocus Controls */}
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100 pointer-events-none z-30">
                {isFocused ? (
                    <div className="bg-white/20 p-3 rounded-full text-white backdrop-blur-sm cursor-pointer hover:bg-white/30 transition-colors">
                        <Minimize2 size={24} />
                    </div>
                ) : (
                    <div className="bg-white/30 p-2 rounded-full text-white backdrop-blur-sm cursor-pointer hover:bg-white/40 transition-colors">
                        <Maximize2 size={20} />
                    </div>
                )}
            </div>
            
            {/* Mic Visualizer Ring (Active Speaker) - Simple Green Line */}
            {user.isSpeaking && !user.isMuted && (
            <div
                className="absolute inset-0 border-4 border-green-500 rounded-[inherit] pointer-events-none z-40 transition-opacity duration-200"
            />
            )}
        </motion.div>
        
        {/* Status Badges */}
        <div className={`absolute left-3 flex items-center gap-2 ${minimal ? 'bottom-2' : 'bottom-3'} z-40 pointer-events-none`}>
           <div className="bg-white/80 backdrop-blur-sm px-2 py-0.5 md:px-3 md:py-1 rounded-full text-xs font-bold text-slate-700 shadow-sm flex items-center gap-1.5">
             {user.isScreenShare ? (
               <Monitor size={10} className="text-blue-500" />
             ) : (
               user.isMuted ? <MicOff size={10} className="text-red-400" /> : <Mic size={10} className="text-green-500" />
             )}
             <span className="truncate max-w-[100px]">{user.name} {user.isLocal && !user.isScreenShare && "(You)"}</span>
           </div>
        </div>

      </motion.div>
    </div>
  );
};

export const VideoGrid: React.FC<VideoGridProps> = ({ 
    users, 
    focusedUserId, 
    onFocusUser
}) => {
  const focusedUser = users.find(u => u.id === focusedUserId);
  const otherUsers = users.filter(u => u.id !== focusedUserId);

  // If we have a focused user, we switch to "Stage" layout (Discord-like)
  if (focusedUser) {
    return (
      <div className="w-full h-full flex flex-col p-2 md:p-4 gap-2">
        {/* Main Stage (Focused Video) */}
        <div className="flex-1 min-h-0 w-full flex justify-center items-center relative">
            <motion.div 
                // Full width/height container.
                className="w-full h-full rounded-2xl mx-auto flex items-center justify-center bg-transparent" 
                layoutId={`video-${focusedUser.id}`}
            >
                <VideoCard 
                    user={focusedUser} 
                    isFocused={true} 
                    onClick={() => onFocusUser(null)} // Click to unfocus
                />
            </motion.div>
        </div>

        {/* Filmstrip (Other Participants) */}
        {otherUsers.length > 0 && (
            <div className="h-28 w-full flex-shrink-0 z-20">
                <div className="flex items-center gap-4 overflow-x-auto h-full px-4 pb-2 custom-scrollbar justify-center md:justify-start">
                    {otherUsers.map((user) => (
                        <motion.div 
                            key={user.id} 
                            layoutId={`video-${user.id}`}
                        >
                            <VideoCard 
                                user={user} 
                                minimal={true}
                                onClick={() => onFocusUser(user.id)} // Swap focus
                            />
                        </motion.div>
                    ))}
                </div>
            </div>
        )}
      </div>
    );
  }

  // Standard Grid Layout
  return (
    <div className="w-full h-full p-6 md:p-10 overflow-y-auto custom-scrollbar">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 md:gap-8 max-w-[1600px] mx-auto">
        {users.map((user, idx) => (
          <motion.div
            key={user.id}
            layoutId={`video-${user.id}`}
            className="aspect-video"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.1, duration: 0.5 }}
          >
            <VideoCard 
                user={user} 
                index={idx} 
                onClick={() => onFocusUser(user.id)} // Click to focus
            />
          </motion.div>
        ))}
      </div>
    </div>
  );
};
