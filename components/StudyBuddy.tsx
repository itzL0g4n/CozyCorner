
import React, { useState, useRef, useEffect } from 'react';
import { motion, useDragControls } from 'framer-motion';
import { Send, Sparkles, X, ExternalLink, Bot, User as UserIcon } from 'lucide-react';
import { GoogleGenAI } from "@google/genai";
import { ChatMessage } from '../types';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';

interface StudyBuddyProps {
  onClose: () => void;
}

export const StudyBuddy: React.FC<StudyBuddyProps> = ({ onClose }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'model',
      text: "Hi! I'm your study buddy. Need help finding resources, quick facts, or study tips? Just ask! 📚✨",
      timestamp: Date.now()
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const dragControls = useDragControls();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      text: input,
      timestamp: Date.now()
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const model = 'gemini-2.5-flash';
      
      const response = await ai.models.generateContent({
        model: model,
        contents: input,
        config: {
            tools: [{ googleSearch: {} }],
            systemInstruction: "You are a helpful, encouraging, and cozy study companion. Format your answers nicely using Markdown. Use bolding for key terms, lists for steps, and LaTeX for math equations (wrapped in $ for inline, $$ for block). Keep answers concise and friendly."
        }
      });

      const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
      const sources = groundingChunks
        ?.map((chunk: any) => chunk.web ? { title: chunk.web.title, uri: chunk.web.uri } : null)
        .filter((item: any) => item !== null);

      const modelMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'model',
        text: response.text || "I couldn't find an answer for that, sorry! 😓",
        sources: sources,
        timestamp: Date.now()
      };

      setMessages(prev => [...prev, modelMsg]);
    } catch (error) {
      console.error(error);
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        role: 'model',
        text: "Oops, I had a little trouble thinking. Try again? 🤕",
        timestamp: Date.now()
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <motion.div
      className="fixed bottom-28 right-6 md:right-10 z-30 w-80 md:w-96 h-[500px] bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl rounded-3xl border border-white/80 dark:border-slate-700/60 shadow-2xl flex flex-col overflow-hidden"
      initial={{ scale: 0.8, opacity: 0, y: 20 }}
      animate={{ scale: 1, opacity: 1, y: 0 }}
      exit={{ scale: 0.8, opacity: 0, y: 20 }}
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
                    <Sparkles size={16} className="text-indigo-500 dark:text-indigo-400" />
                </div>
                <div>
                    <h3 className="font-bold text-indigo-900 dark:text-indigo-100 text-sm">Study Buddy</h3>
                    <div className="flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-green-400" />
                        <span className="text-[10px] uppercase font-bold text-indigo-400">Online</span>
                    </div>
                </div>
            </div>
            <button 
                onClick={onClose} 
                className="p-1 hover:bg-white/50 dark:hover:bg-slate-700/50 rounded-full transition-colors text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 pointer-events-auto"
                onPointerDown={(e) => e.stopPropagation()} // Prevent dragging when clicking close
            >
                <X size={18} />
            </button>
        </div>

        {/* Chat Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar bg-white/30 dark:bg-black/20">
            {messages.map((msg) => {
                const isUser = msg.role === 'user';
                return (
                    <div key={msg.id} className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
                        <div className={`flex gap-2 max-w-[90%] ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
                            {/* Avatar */}
                            <div className={`w-6 h-6 rounded-full flex-shrink-0 flex items-center justify-center mt-1 ${isUser ? 'bg-pink-200' : 'bg-indigo-200'}`}>
                                {isUser ? <UserIcon size={12} className="text-pink-700" /> : <Bot size={12} className="text-indigo-700" />}
                            </div>
                            
                            {/* Bubble */}
                            <div className={`p-3 rounded-2xl text-sm leading-relaxed overflow-hidden ${
                                isUser 
                                ? 'bg-pink-100 text-pink-900 rounded-tr-none' 
                                : 'bg-white dark:bg-slate-800 border border-indigo-50 dark:border-slate-700 text-slate-700 dark:text-slate-200 rounded-tl-none shadow-sm'
                            }`}>
                                <div className="markdown-content">
                                    <ReactMarkdown
                                        remarkPlugins={[remarkGfm, remarkMath]}
                                        rehypePlugins={[rehypeKatex]}
                                        components={{
                                            p: ({node, ...props}) => <p className="mb-2 last:mb-0" {...props} />,
                                            ul: ({node, ...props}) => <ul className="list-disc list-outside ml-4 mb-2" {...props} />,
                                            ol: ({node, ...props}) => <ol className="list-decimal list-outside ml-4 mb-2" {...props} />,
                                            li: ({node, ...props}) => <li className="mb-1" {...props} />,
                                            h1: ({node, ...props}) => <h1 className="text-lg font-bold mb-2 text-indigo-900 dark:text-indigo-200" {...props} />,
                                            h2: ({node, ...props}) => <h2 className="text-base font-bold mb-2 text-indigo-800 dark:text-indigo-300" {...props} />,
                                            h3: ({node, ...props}) => <h3 className="text-sm font-bold mb-1 text-indigo-700 dark:text-indigo-400" {...props} />,
                                            strong: ({node, ...props}) => <strong className="font-bold text-indigo-900 dark:text-indigo-200" {...props} />,
                                            code: ({node, inline, className, children, ...props}: any) => {
                                                return inline ? (
                                                    <code className="bg-indigo-50 dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 px-1 py-0.5 rounded text-xs font-mono border border-indigo-100 dark:border-slate-700" {...props}>{children}</code>
                                                ) : (
                                                    <div className="bg-slate-800 text-slate-200 p-3 rounded-lg my-2 overflow-x-auto text-xs font-mono shadow-inner">
                                                        <code {...props}>{children}</code>
                                                    </div>
                                                )
                                            },
                                            blockquote: ({node, ...props}) => <blockquote className="border-l-4 border-indigo-200 dark:border-slate-600 pl-3 italic text-slate-500 dark:text-slate-400 my-2" {...props} />,
                                            a: ({node, ...props}) => <a className="text-indigo-500 hover:underline hover:text-indigo-700 dark:text-indigo-400" target="_blank" rel="noopener noreferrer" {...props} />,
                                            table: ({node, ...props}) => <div className="overflow-x-auto my-2"><table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700 border border-slate-200 dark:border-slate-700 rounded-lg" {...props} /></div>,
                                            th: ({node, ...props}) => <th className="px-3 py-2 bg-slate-50 dark:bg-slate-900 text-left text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider border-b border-slate-200 dark:border-slate-700" {...props} />,
                                            td: ({node, ...props}) => <td className="px-3 py-2 whitespace-nowrap text-sm text-slate-600 dark:text-slate-300 border-b border-slate-100 dark:border-slate-700" {...props} />,
                                        }}
                                    >
                                        {msg.text}
                                    </ReactMarkdown>
                                </div>
                                
                                {/* Sources / Grounding */}
                                {msg.sources && msg.sources.length > 0 && (
                                    <div className="mt-3 pt-2 border-t border-slate-100 dark:border-slate-700">
                                        <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 mb-1 uppercase tracking-wider">Sources</p>
                                        <div className="flex flex-col gap-1">
                                            {msg.sources.slice(0, 3).map((source, idx) => (
                                                <a 
                                                    key={idx}
                                                    href={source.uri}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="flex items-center gap-1.5 text-xs text-indigo-500 dark:text-indigo-400 hover:underline truncate"
                                                >
                                                    <ExternalLink size={10} />
                                                    <span className="truncate">{source.title}</span>
                                                </a>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                );
            })}
            {isLoading && (
                 <div className="flex justify-start">
                    <div className="flex gap-2 max-w-[90%]">
                        <div className="w-6 h-6 rounded-full bg-indigo-200 flex-shrink-0 flex items-center justify-center mt-1">
                            <Bot size={12} className="text-indigo-700" />
                        </div>
                        <div className="bg-white dark:bg-slate-800 border border-indigo-50 dark:border-slate-700 px-4 py-3 rounded-2xl rounded-tl-none shadow-sm flex gap-1">
                            <motion.div className="w-1.5 h-1.5 bg-indigo-300 rounded-full" animate={{ y: [0, -5, 0] }} transition={{ duration: 0.6, repeat: Infinity, delay: 0 }} />
                            <motion.div className="w-1.5 h-1.5 bg-indigo-300 rounded-full" animate={{ y: [0, -5, 0] }} transition={{ duration: 0.6, repeat: Infinity, delay: 0.2 }} />
                            <motion.div className="w-1.5 h-1.5 bg-indigo-300 rounded-full" animate={{ y: [0, -5, 0] }} transition={{ duration: 0.6, repeat: Infinity, delay: 0.4 }} />
                        </div>
                    </div>
                 </div>
            )}
            <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="p-3 bg-white dark:bg-slate-800 border-t border-indigo-50 dark:border-slate-700">
            <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-900 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 focus-within:border-indigo-300 focus-within:ring-2 focus-within:ring-indigo-100 transition-all">
                <input 
                    type="text" 
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                    placeholder="Ask for study tips..."
                    className="flex-1 bg-transparent outline-none text-sm text-slate-700 dark:text-slate-200 placeholder:text-slate-400"
                />
                <button 
                    onClick={handleSend}
                    disabled={!input.trim() || isLoading}
                    className="p-1.5 bg-indigo-500 hover:bg-indigo-600 active:scale-95 text-white rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    <Send size={14} />
                </button>
            </div>
        </div>
    </motion.div>
  );
};
