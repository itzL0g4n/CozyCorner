
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Droplets, Heart } from 'lucide-react';
import { DeskItem } from '../types';

interface DeskItemProps {
  item: DeskItem;
  isEditable: boolean; // Only local user can drag/edit
  onUpdate: (id: string, data: any) => void;
  onRemove: (id: string) => void;
  containerRef?: React.RefObject<HTMLDivElement>; // Optional now
}

// --- Specific Item Components ---

const StickyNote: React.FC<{ data: any; onChange: (val: string) => void }> = ({ data, onChange }) => (
  <div className="w-32 h-32 bg-yellow-200 rounded-bl-xl shadow-lg p-2 transform rotate-1 flex flex-col group hover:scale-105 transition-transform">
    <div className="w-full h-4 bg-yellow-300/50 mb-1" /> {/* Tape/Sticky area */}
    <textarea
      className="flex-1 w-full bg-transparent resize-none outline-none text-slate-800 font-handwriting text-sm leading-tight placeholder:text-slate-500/50 cursor-text"
      placeholder="To-do..."
      value={data || ''}
      onChange={(e) => onChange(e.target.value)}
      onMouseDown={(e) => e.stopPropagation()} // Allow clicking textarea without dragging immediately
    />
  </div>
);

const PottedPlant: React.FC<{ variantUrl?: string }> = ({ variantUrl }) => {
  const [watered, setWatered] = useState(false);
  
  const handleWater = () => {
    setWatered(true);
    setTimeout(() => setWatered(false), 2000);
  };

  return (
    <div className="relative group cursor-pointer" onClick={handleWater}>
       <div className="w-24 h-24 filter drop-shadow-md transition-transform active:scale-95 hover:-translate-y-2">
         <img 
            src={variantUrl || "https://media.tenor.com/m38BFcQuk0gAAAAi/plant.gif"} 
            alt="Plant" 
            className="w-full h-full object-contain pointer-events-none"
         />
       </div>
       {watered && (
         <motion.div 
            className="absolute -top-4 left-1/2 -translate-x-1/2 text-blue-400 z-50"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: -20 }}
            exit={{ opacity: 0 }}
         >
           <Droplets size={24} fill="currentColor" />
         </motion.div>
       )}
    </div>
  );
};

const CoffeeCup: React.FC<{ variantUrl?: string }> = ({ variantUrl }) => (
  <div className="relative group cursor-pointer">
    <div className="w-20 h-20 filter drop-shadow-md transition-transform hover:-translate-y-1">
        <img 
            src={variantUrl || "https://i.pinimg.com/originals/33/a5/d5/33a5d563b09c60db33a18a6be523c8a6.gif"} 
            alt="Coffee"
            className="w-full h-full object-contain pointer-events-none"
        />
    </div>
  </div>
);

const PetCompanion: React.FC<{ variantUrl?: string }> = ({ variantUrl }) => {
  const [isJumping, setIsJumping] = useState(false);
  
  const interact = () => {
    if (!isJumping) {
        setIsJumping(true);
        setTimeout(() => setIsJumping(false), 1000);
    }
  };

  return (
    <div className="relative cursor-pointer" onClick={interact}>
      <motion.div 
        className="w-20 h-20 filter drop-shadow-lg"
        animate={isJumping ? { y: -20, rotate: [0, -10, 10, 0], scale: 1.2 } : { y: [0, 2, 0], scale: [1, 1.05, 1] }}
        transition={isJumping ? { duration: 0.5 } : { duration: 3, repeat: Infinity, ease: "easeInOut" }}
      >
        <img 
            src={variantUrl || "https://media.tenor.com/1YELlhf9ORsAAAAi/waal-boyss-nabilaa.gif"} 
            alt="Cute Cat" 
            className="w-full h-full object-contain pointer-events-none" 
        />
      </motion.div>
      <AnimatePresence>
        {isJumping && (
            <>
                <motion.div 
                    className="absolute -top-6 right-0 text-pink-500 z-50"
                    initial={{ scale: 0, opacity: 0, y: 0 }}
                    animate={{ scale: 1.5, opacity: 1, y: -20, rotate: 15 }}
                    exit={{ opacity: 0 }}
                >
                    <Heart size={24} fill="currentColor" />
                </motion.div>
                 <motion.div 
                    className="absolute -top-4 -left-4 text-pink-400 z-50"
                    initial={{ scale: 0, opacity: 0, y: 0 }}
                    animate={{ scale: 1, opacity: 1, y: -15, rotate: -15 }}
                    exit={{ opacity: 0 }}
                    transition={{ delay: 0.1 }}
                >
                    <Heart size={16} fill="currentColor" />
                </motion.div>
            </>
        )}
       </AnimatePresence>
    </div>
  );
};

// --- Main Wrapper ---

export const DraggableDeskItem: React.FC<DeskItemProps> = ({ 
  item, 
  isEditable, 
  onUpdate, 
  onRemove, 
  containerRef 
}) => {
  // We use this state to ensure hover detection works even if parent has odd z-indexes
  const [isHovered, setIsHovered] = useState(false);

  return (
    <motion.div
      drag={isEditable} // Only enable drag if allowed
      dragConstraints={containerRef} // Pass undefined to allow free movement
      dragElastic={0.2}
      dragMomentum={false}
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ scale: 0, opacity: 0 }}
      className="absolute z-50 pointer-events-auto"
      style={{ 
        left: `${item.x}%`, 
        top: `${item.y}%`,
        touchAction: 'none' // Important for drag
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      // IMPORTANT: Stop propagation to prevent clicking through to the video card (which triggers focus mode)
      onClick={(e) => e.stopPropagation()}
      onPointerDown={(e) => e.stopPropagation()}
      whileHover={{ scale: 1.1, zIndex: 100 }}
      whileDrag={{ scale: 1.15, zIndex: 100, cursor: 'grabbing' }}
    >
      {/* Visual Cursor Indicator */}
      <div className={`transition-all ${isEditable ? 'cursor-grab active:cursor-grabbing' : 'cursor-default'}`}>
          {/* Delete Button (Visible on Hover + Editable) */}
          <AnimatePresence>
            {isEditable && isHovered && (
                <motion.button 
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    onClick={(e) => {
                        e.stopPropagation();
                        onRemove(item.id);
                    }}
                    className="absolute -top-3 -right-3 bg-red-500 hover:bg-red-600 text-white rounded-full p-1.5 shadow-md z-50 flex items-center justify-center border-2 border-white"
                >
                    <X size={12} strokeWidth={3} />
                </motion.button>
            )}
          </AnimatePresence>

          {/* Render Content */}
          {item.type === 'note' && (
            <StickyNote data={item.data} onChange={(txt) => onUpdate(item.id, txt)} />
          )}
          {item.type === 'plant' && <PottedPlant variantUrl={item.data} />}
          {item.type === 'coffee' && <CoffeeCup variantUrl={item.data} />}
          {item.type === 'pet' && <PetCompanion variantUrl={item.data} />}
      </div>
    </motion.div>
  );
};
