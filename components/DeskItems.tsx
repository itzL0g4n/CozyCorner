
import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Droplets, Heart } from 'lucide-react';
import { DeskItem } from '../types';

interface DeskItemProps {
  item: DeskItem;
  ownerName?: string;
  isEditable: boolean;
  onUpdate: (id: string, updates: Partial<DeskItem>) => void;
  onRemove: (id: string) => void;
  containerRef?: React.RefObject<HTMLDivElement>;
  playSound: (key: any) => void;
}

// --- Specific Item Components ---

const StickyNote: React.FC<{ data: any; onChange: (val: string) => void; ownerName?: string; playSound: (k: any) => void }> = ({ data, onChange, ownerName, playSound }) => (
  <div 
    className="w-32 h-32 bg-yellow-200 rounded-bl-xl shadow-lg p-2 transform rotate-1 flex flex-col group hover:scale-105 transition-transform relative"
    onMouseEnter={() => playSound('paper')}
  >
    <div className="w-full h-4 bg-yellow-300/50 mb-1 flex-shrink-0" />
    <textarea
      className="flex-1 w-full bg-transparent resize-none outline-none text-slate-800 font-handwriting text-sm leading-tight placeholder:text-slate-500/50 cursor-text"
      placeholder="To-do..."
      value={data || ''}
      onChange={(e) => onChange(e.target.value)}
      onPointerDown={(e) => e.stopPropagation()} 
      onMouseDown={(e) => e.stopPropagation()}
    />
  </div>
);

const PottedPlant: React.FC<{ variantUrl?: string; ownerName?: string; playSound: (k: any) => void }> = ({ variantUrl, ownerName, playSound }) => {
  const [watered, setWatered] = useState(false);
  
  const handleWater = () => {
    playSound('water');
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

const CoffeeCup: React.FC<{ variantUrl?: string; ownerName?: string; playSound: (k: any) => void }> = ({ variantUrl, ownerName, playSound }) => (
  <div className="relative group cursor-pointer" onClick={() => playSound('coffee')}>
    <div className="w-20 h-20 filter drop-shadow-md transition-transform hover:-translate-y-1">
        <img 
            src={variantUrl || "https://i.pinimg.com/originals/33/a5/d5/33a5d563b09c60db33a18a6be523c8a6.gif"} 
            alt="Coffee"
            className="w-full h-full object-contain pointer-events-none"
        />
    </div>
  </div>
);

const PetCompanion: React.FC<{ variantUrl?: string; ownerName?: string; playSound: (k: any) => void }> = ({ variantUrl, ownerName, playSound }) => {
  const [isJumping, setIsJumping] = useState(false);
  
  const interact = () => {
    if (!isJumping) {
        playSound('cat');
        setIsJumping(true);
        setTimeout(() => setIsJumping(false), 1000);
    }
  };

  return (
    <div className="relative cursor-pointer group" onClick={interact}>
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
  ownerName,
  isEditable, 
  onUpdate, 
  onRemove, 
  containerRef,
  playSound
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const [isSelected, setIsSelected] = useState(false);
  const elementRef = useRef<HTMLDivElement>(null);

  // Click Outside to Deselect
  useEffect(() => {
    if (!isSelected) return;

    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      if (elementRef.current && !elementRef.current.contains(event.target as Node)) {
        setIsSelected(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [isSelected]);

  const handleDragEnd = (event: any, info: any) => {
    if (elementRef.current) {
        const rect = elementRef.current.getBoundingClientRect();
        
        // Convert to percentage of window
        const xPct = (rect.left / window.innerWidth) * 100;
        const yPct = (rect.top / window.innerHeight) * 100;
        
        // Clamp values 
        const clampedX = Math.max(0, Math.min(90, xPct));
        const clampedY = Math.max(0, Math.min(90, yPct));

        onUpdate(item.id, { x: clampedX, y: clampedY });
        playSound('glass'); // sound when placing item
    }
  };

  const handleInteraction = () => {
      if (isEditable) {
          setIsSelected(true);
      }
  };

  const animationProps = isEditable 
    ? { scale: 1, opacity: 1 }
    : { scale: 1, opacity: 1, left: `${item.x}%`, top: `${item.y}%` };

  return (
    <motion.div
      ref={elementRef}
      drag={isEditable} 
      dragMomentum={false}
      dragElastic={0}
      onDragEnd={handleDragEnd}
      initial={{ scale: 0, opacity: 0, left: `${item.x}%`, top: `${item.y}%` }}
      animate={animationProps}
      transition={{ 
         left: { type: "spring", stiffness: 50, damping: 20 },
         top: { type: "spring", stiffness: 50, damping: 20 },
         scale: { duration: 0.2 }
      }}
      exit={{ scale: 0, opacity: 0 }}
      className={`absolute z-50 pointer-events-auto select-none touch-none ${isSelected ? 'z-[60]' : ''}`}
      style={{ 
        left: `${item.x}%`, 
        top: `${item.y}%`,
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={(e) => {
          e.stopPropagation();
          handleInteraction();
      }}
      whileHover={{ scale: 1.05, zIndex: 100 }}
      whileDrag={{ scale: 1.1, zIndex: 100, cursor: 'grabbing' }}
    >
      <div className={`transition-all relative flex flex-col items-center ${isEditable ? 'cursor-grab active:cursor-grabbing' : 'cursor-default'}`}>
          
          {isSelected && isEditable && (
              <div className="absolute -inset-4 border-2 border-dashed border-purple-300 rounded-full animate-spin-slow opacity-50 pointer-events-none" />
          )}

          <AnimatePresence>
            {isEditable && (isHovered || isSelected) && (
                <motion.button 
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    onClick={(e) => {
                        e.stopPropagation();
                        playSound('off');
                        onRemove(item.id);
                    }}
                    className="absolute -top-3 -right-3 bg-red-500 hover:bg-red-600 text-white rounded-full p-2 shadow-lg z-[100] flex items-center justify-center border-2 border-white cursor-pointer transition-transform hover:scale-110 active:scale-90"
                    title="Remove item"
                >
                    <X size={14} strokeWidth={3} />
                </motion.button>
            )}
          </AnimatePresence>

          {item.type === 'note' && (
            <StickyNote 
                data={item.data} 
                onChange={(txt) => onUpdate(item.id, { data: txt })} 
                ownerName={ownerName}
                playSound={playSound}
            />
          )}
          {item.type === 'plant' && <PottedPlant variantUrl={item.data} ownerName={ownerName} playSound={playSound} />}
          {item.type === 'coffee' && <CoffeeCup variantUrl={item.data} ownerName={ownerName} playSound={playSound} />}
          {item.type === 'pet' && <PetCompanion variantUrl={item.data} ownerName={ownerName} playSound={playSound} />}

          {ownerName && (
             <div className="mt-2 bg-white/80 backdrop-blur-md px-2 py-0.5 rounded-full text-[10px] font-bold text-slate-600 shadow-sm border border-white/50 pointer-events-none select-none whitespace-nowrap">
                {ownerName}
             </div>
          )}
      </div>
    </motion.div>
  );
};
