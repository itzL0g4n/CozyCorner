
import React from 'react';
import { motion } from 'framer-motion';

export const BackgroundWrapper: React.FC<{ children: React.ReactNode; isDarkMode?: boolean }> = ({ children, isDarkMode }) => {
  
  // Configuration for the moving blobs
  const blobs = [
    { 
      // Blob 1: Top Left - Pink/Indigo
      colors: isDarkMode ? ['#312e81', '#4338ca', '#312e81'] : ['#fce7f3', '#fbcfe8', '#fce7f3'],
      initial: { x: '-20%', y: '-20%', scale: 1 },
      animate: { x: ['-20%', '0%', '-25%'], y: ['-20%', '-5%', '-25%'], scale: [1, 1.2, 0.9] },
      transition: { duration: 15, repeat: Infinity, repeatType: "reverse", ease: "easeInOut" }
    },
    { 
      // Blob 2: Top Right - Lavender/Purple
      colors: isDarkMode ? ['#4c1d95', '#581c87', '#4c1d95'] : ['#e0e7ff', '#c7d2fe', '#e0e7ff'],
      initial: { x: '80%', y: '-10%', scale: 1.2 },
      animate: { x: ['80%', '60%', '85%'], y: ['-10%', '10%', '-15%'], scale: [1.2, 1, 1.3] },
      transition: { duration: 18, repeat: Infinity, repeatType: "reverse", ease: "easeInOut" }
    },
    { 
      // Blob 3: Bottom Left - Mint/Blue
      colors: isDarkMode ? ['#1e3a8a', '#1e40af', '#1e3a8a'] : ['#d1fae5', '#a7f3d0', '#d1fae5'],
      initial: { x: '-10%', y: '80%', scale: 0.9 },
      animate: { x: ['-10%', '10%', '-15%'], y: ['80%', '60%', '85%'], scale: [0.9, 1.1, 0.8] },
      transition: { duration: 20, repeat: Infinity, repeatType: "reverse", ease: "easeInOut" }
    },
    { 
      // Blob 4: Bottom Right - Cream/Slate
      colors: isDarkMode ? ['#0f172a', '#1e293b', '#0f172a'] : ['#fef3c7', '#fde68a', '#fef3c7'],
      initial: { x: '70%', y: '70%', scale: 1.1 },
      animate: { x: ['70%', '50%', '75%'], y: ['70%', '80%', '60%'], scale: [1.1, 0.9, 1.2] },
      transition: { duration: 22, repeat: Infinity, repeatType: "reverse", ease: "easeInOut" }
    },
  ];

  return (
    <div className={`relative w-full h-full min-h-screen overflow-hidden transition-colors duration-700 ${isDarkMode ? 'bg-slate-950' : 'bg-slate-50'}`}>
      
      {/* Moving Blobs Layer */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        {blobs.map((blob, i) => (
           <motion.div
             key={i}
             className="absolute rounded-full mix-blend-multiply filter blur-3xl opacity-70 dark:opacity-40 dark:mix-blend-normal"
             style={{ 
                 width: '50vw', 
                 height: '50vw',
                 left: 0,
                 top: 0,
             }}
             initial={blob.initial}
             animate={{
                ...blob.animate,
                backgroundColor: blob.colors
             }}
             // @ts-ignore
             transition={blob.transition}
           />
        ))}
      </div>

      {/* Noise Texture Overlay for Lo-Fi feel */}
      <div className="absolute inset-0 z-0 opacity-[0.04] pointer-events-none mix-blend-overlay" 
           style={{ 
               backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")` 
           }} 
      />
      
      {/* Glass Overlay for blending and softening */}
      <div className={`absolute inset-0 z-0 backdrop-blur-[60px] pointer-events-none ${isDarkMode ? 'bg-black/20' : 'bg-white/40'}`} />

      {/* Content */}
      <div className="relative z-10 w-full h-full">
        {children}
      </div>
    </div>
  );
};
