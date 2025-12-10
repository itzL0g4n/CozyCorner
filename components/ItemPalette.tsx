
import React from 'react';
import { motion } from 'framer-motion';
import { StickyNote, Coffee, Cat, Flower2, X } from 'lucide-react';
import { DeskItemType } from '../types';

interface ItemPaletteProps {
  onSelect: (type: DeskItemType) => void;
  onClose: () => void;
}

export const ItemPalette: React.FC<ItemPaletteProps> = ({ onSelect, onClose }) => {
  const items: { type: DeskItemType; label: string; icon: any; color: string }[] = [
    { type: 'note', label: 'Sticky Note', icon: StickyNote, color: 'bg-yellow-100 text-yellow-600 dark:bg-yellow-900/50 dark:text-yellow-300' },
    { type: 'plant', label: 'Plant', icon: Flower2, color: 'bg-green-100 text-green-600 dark:bg-green-900/50 dark:text-green-300' },
    { type: 'coffee', label: 'Coffee', icon: Coffee, color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300' },
    { type: 'pet', label: 'Pet Cat', icon: Cat, color: 'bg-orange-100 text-orange-600 dark:bg-orange-900/50 dark:text-orange-300' },
  ];

  return (
    <motion.div
      className="fixed bottom-28 left-1/2 -translate-x-1/2 z-50 bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/60 dark:border-slate-700/60 p-4"
      initial={{ y: 50, opacity: 0, scale: 0.9 }}
      animate={{ y: 0, opacity: 1, scale: 1 }}
      exit={{ y: 50, opacity: 0, scale: 0.9 }}
    >
        <div className="flex items-center gap-2 mb-3 px-1">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Add to Desk</span>
            <div className="flex-1" />
            <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                <X size={14} />
            </button>
        </div>

        <div className="flex gap-4">
            {items.map((item) => (
                <button
                    key={item.type}
                    onClick={() => onSelect(item.type)}
                    className="flex flex-col items-center gap-2 group"
                >
                    <div className={`w-14 h-14 rounded-xl flex items-center justify-center shadow-sm transition-all group-hover:scale-110 group-active:scale-95 ${item.color}`}>
                        <item.icon size={24} />
                    </div>
                    <span className="text-xs font-bold text-slate-600 dark:text-slate-300">{item.label}</span>
                </button>
            ))}
        </div>
    </motion.div>
  );
};
