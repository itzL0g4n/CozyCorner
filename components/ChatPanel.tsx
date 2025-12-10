
import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence, useDragControls } from 'framer-motion';
import { Send, X, MessageSquare } from 'lucide-react';
import { RoomMessage } from '../types';

interface ChatPanelProps {
  isOpen: boolean;
  onClose: () => void;
  messages: RoomMessage[];
  onSendMessage: (text: string) => void;
  currentUserId: string;
}

export const ChatPanel: React.FC<ChatPanelProps> = ({ 
  isOpen, 
  onClose, 
  messages, 
  onSendMessage, 
  currentUserId 
}) => {
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const dragControls = useDragControls();

  // Auto-scroll to bottom on new message
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen && inputRef.current) {
        setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [isOpen]);

  const handleSend = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!input.trim()) return;
    
    onSendMessage(input.trim());
    setInput('');
  };

  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed bottom-28 right-24 z-40 w-80 md:w-96 h-[500px] bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl rounded-3xl border border-white/60 dark:border-slate-700/60 shadow-2xl flex flex-col overflow-hidden"
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          transition={{ type: "spring", stiffness: 300, damping: 25 }}
          drag
          dragListener={false}
          dragMomentum={false}
          dragControls={dragControls}
        >
            {/* Header - Drag Handle */}
            <div 
                className="p-4 border-b border-indigo-100 dark:border-slate-700/50 flex items-center justify-between bg-indigo-50/50 dark:bg-slate-800/50 cursor-move touch-none"
                onPointerDown={(e) => dragControls.start(e)}
            >
                <div className="flex items-center gap-2 pointer-events-none">
                    <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center">
                        <MessageSquare size={16} className="text-indigo-500 dark:text-indigo-400" />
                    </div>
                    <div>
                        <h3 className="font-bold text-indigo-900 dark:text-indigo-100 text-sm">Room Chat</h3>
                        <div className="flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-green-400" />
                            <span className="text-[10px] uppercase font-bold text-indigo-400">Live</span>
                        </div>
                    </div>
                </div>
                <button 
                    onClick={onClose} 
                    className="p-1 hover:bg-white/50 dark:hover:bg-slate-700/50 rounded-full transition-colors text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 pointer-events-auto"
                    onPointerDown={(e) => e.stopPropagation()}
                >
                    <X size={18} />
                </button>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar bg-white/30 dark:bg-black/20">
            {messages.length === 0 && (
                <div className="h-full flex flex-col items-center justify-center text-slate-400 dark:text-slate-500 gap-2 opacity-60">
                    <MessageSquare size={40} strokeWidth={1.5} />
                    <p className="text-sm font-medium">No messages yet</p>
                    <p className="text-xs">Say hello to the room! 👋</p>
                </div>
            )}
            
            {messages.map((msg, index) => {
                const isMe = msg.senderId === currentUserId;
                const isSystem = msg.isSystem;
                const isSequence = index > 0 && messages[index-1].senderId === msg.senderId && !isSystem && !messages[index-1].isSystem;

                if (isSystem) {
                    return (
                        <div key={msg.id} className="flex justify-center my-2">
                            <span className="bg-slate-100/80 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-full shadow-sm border border-white dark:border-slate-700">
                                {msg.text}
                            </span>
                        </div>
                    );
                }

                return (
                <div 
                    key={msg.id} 
                    className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
                >
                    {!isMe && !isSequence && (
                    <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 ml-2 mb-1">
                        {msg.senderName}
                    </span>
                    )}
                    
                    <div 
                    className={`
                        max-w-[90%] px-3 py-2 rounded-xl text-sm leading-relaxed shadow-sm break-words
                        ${isMe 
                        ? 'bg-indigo-500 text-white rounded-tr-sm' 
                        : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-indigo-50 dark:border-slate-700 rounded-tl-sm'
                        }
                    `}
                    >
                    {msg.text}
                    </div>
                    
                    <span className={`text-[10px] text-slate-400 dark:text-slate-500 mt-0.5 ${isMe ? 'mr-1' : 'ml-1'}`}>
                    {formatTime(msg.timestamp)}
                    </span>
                </div>
                );
            })}
            <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <form onSubmit={handleSend} className="p-3 bg-white/50 dark:bg-slate-900/50 border-t border-indigo-50 dark:border-slate-700">
            <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-900 px-2 py-2 rounded-xl border border-slate-200 dark:border-slate-700 focus-within:border-indigo-300 dark:focus-within:border-indigo-600 focus-within:ring-2 focus-within:ring-indigo-100 dark:focus-within:ring-indigo-900 transition-all shadow-sm">
                <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Type a message..."
                className="flex-1 bg-transparent px-2 outline-none text-sm text-slate-700 dark:text-slate-200 placeholder:text-slate-400 dark:placeholder:text-slate-500"
                />
                <button
                type="submit"
                disabled={!input.trim()}
                className="p-1.5 bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg transition-all disabled:opacity-50 disabled:scale-95 active:scale-95 shadow-md shadow-indigo-200 dark:shadow-none"
                >
                <Send size={14} />
                </button>
            </div>
            </form>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
