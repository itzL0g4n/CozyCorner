import React from 'react';
import { motion } from 'framer-motion';
import { FLOATING_DECORATIONS } from '../constants';

export const FloatyDecorations: React.FC = () => {
  return (
    <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
      {FLOATING_DECORATIONS.map((item) => (
        <motion.div
          key={item.id}
          className="absolute text-4xl select-none opacity-60"
          style={{
            left: `${item.x}%`,
            top: `${item.y}%`,
          }}
          initial={{ y: 0, opacity: 0 }}
          animate={{
            y: [-20, 20, -20],
            rotate: [-10, 10, -10],
            opacity: [0.4, 0.7, 0.4]
          }}
          transition={{
            duration: 8,
            delay: item.delay,
            repeat: Infinity,
            ease: "easeInOut"
          }}
          whileHover={{ scale: 1.5, rotate: 0 }}
        >
          <span style={{ fontSize: `${item.scale * 3}rem` }}>{item.emoji}</span>
        </motion.div>
      ))}
    </div>
  );
};