import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Pause, SkipForward, SkipBack, Volume2, Music as MusicIcon, ListMusic } from 'lucide-react';
import { PLAYLIST } from '../constants';

interface MusicPlayerProps {
  onClose: () => void;
}

export const MusicPlayer: React.FC<MusicPlayerProps> = ({ onClose }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTrackIndex, setCurrentTrackIndex] = useState(0);
  const [volume, setVolume] = useState(0.5);
  const [showPlaylist, setShowPlaylist] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const currentTrack = PLAYLIST[currentTrackIndex];

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume;
    }
  }, [volume]);

  useEffect(() => {
    if (isPlaying) {
      audioRef.current?.play().catch(e => console.error("Playback error", e));
    } else {
      audioRef.current?.pause();
    }
  }, [isPlaying, currentTrackIndex]);

  const handlePlayPause = () => {
    setIsPlaying(!isPlaying);
  };

  const handleNext = () => {
    setCurrentTrackIndex((prev) => (prev + 1) % PLAYLIST.length);
  };

  const handlePrev = () => {
    setCurrentTrackIndex((prev) => (prev - 1 + PLAYLIST.length) % PLAYLIST.length);
  };

  const handleTrackSelect = (index: number) => {
    setCurrentTrackIndex(index);
    setIsPlaying(true);
  };

  return (
    <motion.div
      className="fixed top-20 right-6 md:right-10 z-30 w-72 bg-white/70 backdrop-blur-xl rounded-3xl border border-white/80 shadow-xl overflow-hidden"
      initial={{ scale: 0.8, opacity: 0, y: -20 }}
      animate={{ scale: 1, opacity: 1, y: 0 }}
      exit={{ scale: 0.8, opacity: 0, y: -20 }}
      transition={{ type: "spring", stiffness: 300, damping: 25 }}
    >
      <audio
        ref={audioRef}
        src={currentTrack.url}
        onEnded={handleNext}
      />

      {/* Header / Vinyl Visual */}
      <div className="p-4 flex flex-col items-center justify-center relative bg-gradient-to-br from-indigo-50 to-pink-50">
        <motion.div
          className="w-32 h-32 rounded-full bg-slate-800 border-4 border-white/50 shadow-lg flex items-center justify-center relative overflow-hidden"
          animate={{ rotate: isPlaying ? 360 : 0 }}
          transition={{ duration: 8, ease: "linear", repeat: Infinity }}
        >
          {/* Vinyl Grooves */}
          <div className="absolute inset-2 rounded-full border border-slate-700/50" />
          <div className="absolute inset-6 rounded-full border border-slate-700/50" />
          <div className="absolute inset-10 rounded-full border border-slate-700/50" />
          
          {/* Center Label */}
          <div className="w-12 h-12 bg-pink-300 rounded-full border-2 border-white flex items-center justify-center">
             <MusicIcon size={16} className="text-white opacity-80" />
          </div>
        </motion.div>
        
        {/* Floating notes */}
        {isPlaying && (
           <div className="absolute inset-0 overflow-hidden pointer-events-none">
             {[...Array(3)].map((_, i) => (
                <motion.div
                    key={i}
                    className="absolute text-pink-400"
                    initial={{ opacity: 0, y: 80, x: 50 + (i * 20) }}
                    animate={{ opacity: [0, 1, 0], y: -20, x: 50 + (i * 20) + (Math.random() * 20 - 10) }}
                    transition={{ duration: 2, repeat: Infinity, delay: i * 0.8 }}
                >
                    ♪
                </motion.div>
             ))}
           </div>
        )}
      </div>

      {/* Track Info */}
      <div className="px-5 py-2 text-center">
        <h3 className="font-display font-bold text-slate-800 text-lg truncate">{currentTrack.title}</h3>
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest">{currentTrack.artist}</p>
      </div>

      {/* Controls */}
      <div className="px-4 pb-4">
        {/* Progress bar mock */}
        <div className="w-full h-1 bg-slate-200 rounded-full mb-4 overflow-hidden">
            <motion.div 
                className="h-full bg-pink-400"
                initial={{ width: "0%" }}
                animate={{ width: isPlaying ? "100%" : "0%" }}
                transition={{ duration: 180, ease: "linear" }}
                key={currentTrackIndex} // Reset on track change
            />
        </div>

        <div className="flex items-center justify-between mb-4">
            <button onClick={handlePrev} className="text-slate-500 hover:text-slate-800 transition-colors">
                <SkipBack size={20} fill="currentColor" />
            </button>
            <button 
                onClick={handlePlayPause} 
                className="w-12 h-12 rounded-full bg-slate-800 text-white flex items-center justify-center shadow-lg hover:scale-105 active:scale-95 transition-all"
            >
                {isPlaying ? <Pause size={20} fill="currentColor" /> : <Play size={22} fill="currentColor" className="ml-1" />}
            </button>
            <button onClick={handleNext} className="text-slate-500 hover:text-slate-800 transition-colors">
                <SkipForward size={20} fill="currentColor" />
            </button>
        </div>

        {/* Volume & Playlist Toggle */}
        <div className="flex items-center gap-3">
             <Volume2 size={16} className="text-slate-400" />
             <input 
                type="range" 
                min="0" 
                max="1" 
                step="0.01" 
                value={volume} 
                onChange={(e) => setVolume(parseFloat(e.target.value))}
                className="flex-1 h-1.5 bg-slate-200 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:bg-pink-400 [&::-webkit-slider-thumb]:rounded-full"
             />
             <button 
                onClick={() => setShowPlaylist(!showPlaylist)}
                className={`p-1.5 rounded-lg transition-colors ${showPlaylist ? 'bg-pink-100 text-pink-500' : 'text-slate-400 hover:text-slate-600'}`}
             >
                 <ListMusic size={18} />
             </button>
        </div>
      </div>

      {/* Playlist Drawer */}
      <AnimatePresence>
        {showPlaylist && (
            <motion.div
                className="bg-white/90 backdrop-blur-xl absolute inset-0 z-20 flex flex-col"
                initial={{ y: "100%" }}
                animate={{ y: 0 }}
                exit={{ y: "100%" }}
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
            >
                <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                    <h4 className="font-bold text-slate-700">Playlist</h4>
                    <button onClick={() => setShowPlaylist(false)} className="text-slate-400 hover:text-slate-600">Close</button>
                </div>
                <div className="flex-1 overflow-y-auto p-2 space-y-1 custom-scrollbar">
                    {PLAYLIST.map((track, idx) => (
                        <button
                            key={track.id}
                            onClick={() => handleTrackSelect(idx)}
                            className={`w-full text-left p-3 rounded-xl flex items-center justify-between group transition-colors ${currentTrackIndex === idx ? 'bg-pink-50' : 'hover:bg-slate-50'}`}
                        >
                            <div className="flex items-center gap-3 overflow-hidden">
                                <span className={`text-xs font-bold w-4 ${currentTrackIndex === idx ? 'text-pink-500' : 'text-slate-300'}`}>{idx + 1}</span>
                                <div className="truncate">
                                    <div className={`font-bold text-sm ${currentTrackIndex === idx ? 'text-slate-800' : 'text-slate-600'}`}>{track.title}</div>
                                    <div className="text-xs text-slate-400">{track.artist}</div>
                                </div>
                            </div>
                            {currentTrackIndex === idx && isPlaying && (
                                <div className="flex gap-0.5 items-end h-3">
                                    <motion.div className="w-0.5 bg-pink-400" animate={{ height: [4, 12, 6] }} transition={{ repeat: Infinity, duration: 0.5 }} />
                                    <motion.div className="w-0.5 bg-pink-400" animate={{ height: [8, 4, 10] }} transition={{ repeat: Infinity, duration: 0.6 }} />
                                    <motion.div className="w-0.5 bg-pink-400" animate={{ height: [6, 10, 4] }} transition={{ repeat: Infinity, duration: 0.4 }} />
                                </div>
                            )}
                        </button>
                    ))}
                </div>
            </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};