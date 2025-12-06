import React from 'react';
import { motion } from 'framer-motion';

export const BackgroundWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <div className="relative w-full h-full min-h-screen overflow-hidden bg-white">
      {/* Animated Gradient Layer */}
      <motion.div
        className="absolute inset-0 z-0 opacity-60"
        animate={{
          background: [
            'linear-gradient(45deg, #fce7f3 0%, #e0e7ff 50%, #d1fae5 100%)',
            'linear-gradient(45deg, #d1fae5 0%, #fce7f3 50%, #e0e7ff 100%)',
            'linear-gradient(45deg, #e0e7ff 0%, #d1fae5 50%, #fce7f3 100%)',
          ],
        }}
        transition={{
          duration: 20,
          repeat: Infinity,
          ease: "linear",
          repeatType: "reverse"
        }}
      />
      
      {/* Mesh/Blur Overlay for softness */}
      <div className="absolute inset-0 z-0 backdrop-blur-3xl bg-white/30" />

      {/* Content */}
      <div className="relative z-10 w-full h-full">
        {children}
      </div>
    </div>
  );
};