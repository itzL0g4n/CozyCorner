
import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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

  // Auto-scroll to bottom on new message
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen && inputRef.current) {
        // Small delay to allow animation to start
        setTimeout(() => inputRef.current?.focus(), 100);
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
          className="fixed top-24 bottom-28 right-4 z-40 w-80 md:w-96 flex flex-col bg-white/80 backdrop-blur-xl rounded-3xl border border-white/60 shadow-2xl overflow-hidden"
          initial={{ x: 400, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: 400, opacity: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-indigo-50/50 bg-white/40">
            <div className="flex items-center gap-2 text-slate-700">
              <div className="p-2 bg-indigo-100 rounded-xl text-indigo-600">
                  <MessageSquare size={18} />
              </div>
              <h3 className="font-bold font-display text-lg">Room Chat</h3>
            </div>
            <button 
              onClick={onClose}
              className="p-2 hover:bg-slate-100/50 rounded-full text-slate-400 hover:text-slate-600 transition-colors"
            >
              <X size={20} />
            </button>
          </div>

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar bg-white/20">
            {messages.length === 0 && (
                <div className="h-full flex flex-col items-center justify-center text-slate-400 gap-2 opacity-60">
                    <MessageSquare size={40} strokeWidth={1.5} />
                    <p className="text-sm font-medium">No messages yet</p>
                    <p className="text-xs">Say hello to the room! 👋</p>
                </div>
            )}
            
            {messages.map((msg, index) => {
              const isMe = msg.senderId === currentUserId;
              const isSystem = msg.isSystem;
              
              // Check if previous message was same sender to group visually
              const isSequence = index > 0 && messages[index-1].senderId === msg.senderId && !isSystem && !messages[index-1].isSystem;

              if (isSystem) {
                  return (
                      <div key={msg.id} className="flex justify-center my-2">
                          <span className="bg-slate-100/80 text-slate-500 text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-full shadow-sm border border-white">
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
                    <span className="text-[10px] font-bold text-slate-500 ml-2 mb-1">
                      {msg.senderName}
                    </span>
                  )}
                  
                  <div 
                    className={`
                      max-w-[85%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed shadow-sm break-words
                      ${isMe 
                        ? 'bg-indigo-500 text-white rounded-tr-sm' 
                        : 'bg-white text-slate-700 border border-white/80 rounded-tl-sm'
                      }
                    `}
                  >
                    {msg.text}
                  </div>
                  
                  <span className={`text-[10px] text-slate-400 mt-1 ${isMe ? 'mr-1' : 'ml-1'}`}>
                     {formatTime(msg.timestamp)}
                  </span>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <form onSubmit={handleSend} className="p-3 bg-white/60 border-t border-white/50">
            <div className="flex items-center gap-2 bg-slate-50 px-2 py-2 rounded-2xl border border-slate-200 focus-within:border-indigo-300 focus-within:ring-2 focus-within:ring-indigo-100 transition-all shadow-inner">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Type a message..."
                className="flex-1 bg-transparent px-2 outline-none text-sm text-slate-700 placeholder:text-slate-400"
              />
              <button
                type="submit"
                disabled={!input.trim()}
                className="p-2 bg-indigo-500 hover:bg-indigo-600 text-white rounded-xl transition-all disabled:opacity-50 disabled:scale-95 active:scale-95 shadow-md shadow-indigo-200"
              >
                <Send size={16} />
              </button>
            </div>
          </form>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
