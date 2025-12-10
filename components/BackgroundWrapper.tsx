
import React from 'react';
import { motion } from 'framer-motion';

export const BackgroundWrapper: React.FC<{ children: React.ReactNode; isDarkMode?: boolean }> = ({ children, isDarkMode }) => {
  const lightGradients = [
    'linear-gradient(45deg, #fce7f3 0%, #e0e7ff 50%, #d1fae5 100%)',
    'linear-gradient(45deg, #d1fae5 0%, #fce7f3 50%, #e0e7ff 100%)',
    'linear-gradient(45deg, #e0e7ff 0%, #d1fae5 50%, #fce7f3 100%)',
  ];

  const darkGradients = [
    'linear-gradient(45deg, #0f172a 0%, #1e1b4b 50%, #312e81 100%)',
    'linear-gradient(45deg, #312e81 0%, #4c1d95 50%, #1e1b4b 100%)',
    'linear-gradient(45deg, #1e1b4b 0%, #0f172a 50%, #312e81 100%)',
  ];

  return (
    <div className={`relative w-full h-full min-h-screen overflow-hidden ${isDarkMode ? 'bg-slate-900' : 'bg-white'}`}>
      {/* Animated Gradient Layer */}
      <motion.div
        className="absolute inset-0 z-0 opacity-60"
        animate={{
          background: isDarkMode ? darkGradients : lightGradients,
        }}
        transition={{
          duration: 20,
          repeat: Infinity,
          ease: "linear",
          repeatType: "reverse"
        }}
      />
      
      {/* Mesh/Blur Overlay for softness */}
      <div className={`absolute inset-0 z-0 backdrop-blur-3xl ${isDarkMode ? 'bg-black/40' : 'bg-white/30'}`} />

      {/* Content */}
      <div className="relative z-10 w-full h-full">
        {children}
      </div>
    </div>
  );
};
