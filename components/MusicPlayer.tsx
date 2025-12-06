
import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Power, Volume2, X } from 'lucide-react';
import { SOUNDCLOUD_TRACK_URL } from '../constants';

interface MusicPlayerProps {
  onClose: () => void;
}

declare global {
  interface Window {
    SC: any;
  }
}

export const MusicPlayer: React.FC<MusicPlayerProps> = ({ onClose }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(50);
  const [isReady, setIsReady] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const widgetRef = useRef<any>(null);

  // Load SoundCloud Widget Script
  useEffect(() => {
    const scriptId = 'soundcloud-widget-script';
    if (!document.getElementById(scriptId)) {
      const script = document.createElement('script');
      script.id = scriptId;
      script.src = 'https://w.soundcloud.com/player/api.js';
      script.onload = initializeWidget;
      document.body.appendChild(script);
    } else if (window.SC) {
      initializeWidget();
    } else {
        // Script exists but SC global not yet ready, poll for it
        const interval = setInterval(() => {
            if (window.SC) {
                clearInterval(interval);
                initializeWidget();
            }
        }, 100);
        return () => clearInterval(interval);
    }
  }, []);

  const initializeWidget = () => {
    if (!iframeRef.current || !window.SC) return;

    try {
        const widget = window.SC.Widget(iframeRef.current);
        widgetRef.current = widget;

        widget.bind(window.SC.Widget.Events.READY, () => {
          setIsReady(true);
          widget.setVolume(volume);
        });

        widget.bind(window.SC.Widget.Events.PLAY, () => {
          setIsPlaying(true);
        });

        widget.bind(window.SC.Widget.Events.PAUSE, () => {
          setIsPlaying(false);
        });
        
        widget.bind(window.SC.Widget.Events.FINISH, () => {
            setIsPlaying(false);
        });

    } catch (e) {
        console.error("Error initializing SoundCloud widget", e);
    }
  };

  const togglePlay = () => {
    if (!widgetRef.current || !isReady) return;
    widgetRef.current.toggle();
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVol = parseInt(e.target.value);
    setVolume(newVol);
    if (widgetRef.current && isReady) {
      widgetRef.current.setVolume(newVol);
    }
  };

  // Enable auto_play=flase
  const embedUrl = `https://w.soundcloud.com/player/?url=${encodeURIComponent(SOUNDCLOUD_TRACK_URL)}&color=%23ff5500&auto_play=false&hide_related=true&show_comments=false&show_user=true&show_reposts=false&show_teaser=false&visual=true`;

  return (
    <motion.div
      className="fixed top-24 right-4 md:right-8 z-30"
      initial={{ scale: 0.8, opacity: 0, y: -20, rotateX: 20 }}
      animate={{ scale: 1, opacity: 1, y: 0, rotateX: 0 }}
      exit={{ scale: 0.8, opacity: 0, y: -20, rotateX: 20 }}
      transition={{ type: "spring", stiffness: 300, damping: 25 }}
      drag
      dragMomentum={false}
    >
      {/* TV Housing - Compact (w-56) */}
      <div className="relative bg-slate-800 p-2.5 rounded-2xl shadow-2xl border-b-4 border-r-4 border-slate-900 w-56 flex flex-col gap-2 cursor-move">
        
        {/* Antennae */}
        <div className="absolute -top-8 left-1/2 -translate-x-1/2 w-16 h-8 pointer-events-none -z-10">
            <div className="absolute bottom-0 left-0 w-0.5 h-10 bg-slate-400 origin-bottom -rotate-[30deg]" />
            <div className="absolute bottom-0 right-0 w-0.5 h-10 bg-slate-400 origin-bottom rotate-[25deg]" />
            <div className={`absolute -top-1 -left-5 w-1.5 h-1.5 bg-red-500 rounded-full shadow-[0_0_8px_rgba(239,68,68,0.8)] ${isPlaying ? 'animate-pulse' : ''}`} />
        </div>

        {/* Screen Container */}
        <div className="relative w-full aspect-video bg-black rounded-md overflow-hidden shadow-[inset_0_0_15px_rgba(0,0,0,1)] border-2 border-slate-700 group">
           {/* Screen Gloss/Reflection */}
           <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/5 to-transparent z-20 pointer-events-none" />
           
           {/* Scanlines Effect */}
           <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] z-10 bg-[length:100%_2px,3px_100%] pointer-events-none opacity-30" />

           {/* The Player */}
           <div className="w-full h-full relative z-0 bg-slate-900">
             <iframe
                ref={iframeRef}
                src={embedUrl}
                width="100%"
                height="100%"
                scrolling="no"
                frameBorder="no"
                allow="autoplay"
                title="SoundCloud Player"
                className="w-full h-full"
             />
             
             {/* Static overlay when off or loading */}
             {!isReady && (
                 <div className="absolute inset-0 bg-slate-900 flex items-center justify-center z-30">
                    <span className="text-slate-500 font-mono text-[8px] tracking-widest animate-pulse">TUNING...</span>
                 </div>
             )}
           </div>
        </div>

        {/* Control Panel */}
        <div className="bg-slate-700/50 rounded-lg p-2 flex items-center justify-between border-t border-white/10 cursor-auto">
             
             {/* Volume Knob Area */}
             <div 
                className="flex items-center gap-2 flex-1 px-1"
                onPointerDownCapture={(e) => e.stopPropagation()} // Prevent drag starting from slider
             >
                <Volume2 size={14} className="text-slate-400 flex-shrink-0" />
                <div className="flex-1 relative h-6 flex items-center group cursor-pointer">
                    {/* Visual Track Background */}
                    <div className="absolute inset-x-0 h-1.5 bg-slate-900 rounded-full overflow-hidden shadow-inner">
                        {/* Fill - No duration for instant response */}
                         <div 
                            className="h-full bg-orange-500 rounded-full" 
                            style={{ width: `${volume}%` }} 
                        />
                    </div>
                    
                    {/* Invisible Range Input - Large Hit Area */}
                    <input 
                        type="range"
                        min="0"
                        max="100"
                        value={volume}
                        onChange={handleVolumeChange}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10 m-0"
                        aria-label="Volume"
                    />
                </div>
             </div>

             <div className="w-px h-4 bg-slate-600 mx-1" />

             {/* Power / Toggle */}
             <div 
                className="flex items-center gap-1.5"
                onPointerDownCapture={(e) => e.stopPropagation()} // Prevent drag starting from buttons
             >
                 <button 
                    onClick={togglePlay}
                    disabled={!isReady}
                    className={`w-6 h-6 rounded-full flex items-center justify-center shadow-lg border border-slate-600 transition-all active:scale-95 ${isPlaying ? 'bg-orange-500/20 text-orange-400 shadow-[0_0_10px_rgba(251,146,60,0.3)]' : 'bg-slate-800 text-slate-500'}`}
                 >
                    <Power size={10} />
                 </button>

                 <button 
                    onClick={onClose}
                    className="w-5 h-5 rounded-full bg-red-500/10 text-red-400 flex items-center justify-center hover:bg-red-500 hover:text-white transition-colors border border-red-500/30"
                 >
                    <X size={10} />
                 </button>
             </div>
        </div>
      </div>
    </motion.div>
  );
};
