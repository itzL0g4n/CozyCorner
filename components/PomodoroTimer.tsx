import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Pause, RotateCcw } from 'lucide-react';

const WORK_TIME = 25 * 60; // 25 minutes

export const PomodoroTimer: React.FC = () => {
  const [timeLeft, setTimeLeft] = useState(WORK_TIME);
  const [isActive, setIsActive] = useState(false);
  const intervalRef = useRef<number | null>(null);

  useEffect(() => {
    if (isActive && timeLeft > 0) {
      intervalRef.current = window.setInterval(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
    } else if (timeLeft === 0) {
      setIsActive(false);
      if (intervalRef.current) clearInterval(intervalRef.current);
      // Optional: Play alarm sound here
    }

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isActive, timeLeft]);

  const toggleTimer = () => {
    setIsActive(!isActive);
  };

  const resetTimer = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent toggling when clicking reset
    setIsActive(false);
    setTimeLeft(WORK_TIME);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const progress = ((WORK_TIME - timeLeft) / WORK_TIME) * 100;

  return (
    <motion.div 
      className="absolute top-6 left-6 z-40 flex flex-col items-center gap-2 group"
      initial={{ x: -50, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: -50, opacity: 0 }}
    >
      <motion.div
        className={`relative flex items-center gap-3 bg-white/30 backdrop-blur-md px-4 py-2 rounded-2xl border border-white/50 shadow-sm text-slate-700 cursor-pointer overflow-hidden transition-colors ${isActive ? 'bg-white/50' : 'hover:bg-white/40'}`}
        onClick={toggleTimer}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        {/* Progress Background */}
        <div 
            className="absolute left-0 top-0 bottom-0 bg-green-400/20 transition-all duration-1000 ease-linear pointer-events-none"
            style={{ width: `${100 - progress}%` }} // Inverted to show remaining time visually
        />

        <div className="relative z-10 flex items-center gap-3">
          <div className="w-5 h-5 flex items-center justify-center">
             {isActive ? <Pause size={18} className="text-slate-600" /> : <Play size={18} className="text-slate-600 ml-0.5" />}
          </div>
          
          <span className="font-display font-bold text-lg tracking-wide w-14 text-center">
            {formatTime(timeLeft)}
          </span>
          
          <span className="text-xs uppercase tracking-wider opacity-60 font-bold ml-1 hidden sm:inline-block">
            {isActive ? 'Focusing' : 'Ready'}
          </span>
        </div>

        {/* Reset Button (Visible on Hover/Pause) */}
        <AnimatePresence>
            {!isActive && timeLeft !== WORK_TIME && (
                <motion.button
                    initial={{ width: 0, opacity: 0, marginLeft: 0 }}
                    animate={{ width: 'auto', opacity: 1, marginLeft: 8 }}
                    exit={{ width: 0, opacity: 0, marginLeft: 0 }}
                    onClick={resetTimer}
                    className="relative z-10 p-1 hover:bg-white/50 rounded-full text-slate-500 hover:text-slate-700 transition-colors"
                >
                    <RotateCcw size={14} />
                </motion.button>
            )}
        </AnimatePresence>
      </motion.div>
    </motion.div>
  );
};
