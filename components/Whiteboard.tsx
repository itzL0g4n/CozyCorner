
import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Pencil, Eraser, MousePointer2, Square, Circle, Minus, ArrowRight, Type, 
  Undo, Redo, Trash2, Check, Download
} from 'lucide-react';
import { WhiteboardElement, WhiteboardTool } from '../types';

interface WhiteboardProps {
  elements: WhiteboardElement[];
  onUpdate: (action: { type: 'ADD' | 'UPDATE' | 'DELETE' | 'SYNC'; data?: any; elementId?: string }) => void;
  currentUser: string;
}

const COLORS = ['#1e293b', '#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6', '#a855f7', '#ec4899'];
const STROKES = [2, 4, 8, 12];

export const Whiteboard: React.FC<WhiteboardProps> = ({ elements, onUpdate, currentUser }) => {
  const [tool, setTool] = useState<WhiteboardTool>('pen');
  const [color, setColor] = useState('#1e293b');
  const [strokeWidth, setStrokeWidth] = useState(4);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  
  // Local state for interactions
  const [currentElement, setCurrentElement] = useState<WhiteboardElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [dragOffset, setDragOffset] = useState<{ x: number, y: number } | null>(null);
  
  // Text Editing
  const [editingTextId, setEditingTextId] = useState<string | null>(null);
  const [textInput, setTextInput] = useState('');
  
  // Undo/Redo
  const [history, setHistory] = useState<WhiteboardElement[][]>([]);
  const [redoStack, setRedoStack] = useState<WhiteboardElement[][]>([]);

  const svgRef = useRef<SVGSVGElement>(null);
  const textAreaRef = useRef<HTMLTextAreaElement>(null);

  const getCoords = (e: React.PointerEvent) => {
    if (!svgRef.current) return { x: 0, y: 0 };
    const rect = svgRef.current.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };
  };

  const saveHistory = () => {
    setHistory(prev => [...prev.slice(-19), elements]); 
    setRedoStack([]);
  };

  const handleUndo = () => {
    if (history.length === 0) return;
    const previousState = history[history.length - 1];
    setRedoStack(prev => [elements, ...prev]);
    setHistory(prev => prev.slice(0, -1));
    onUpdate({ type: 'SYNC', data: previousState });
  };

  const handleRedo = () => {
    if (redoStack.length === 0) return;
    const nextState = redoStack[0];
    setRedoStack(prev => prev.slice(1));
    setHistory(prev => [...prev, elements]);
    onUpdate({ type: 'SYNC', data: nextState });
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    if (editingTextId) return;

    (e.target as Element).setPointerCapture(e.pointerId);

    const { x, y } = getCoords(e);

    if (tool === 'select') {
        setSelectedId(null);
        return;
    }

    if (tool === 'eraser') return;

    saveHistory();
    setIsDrawing(true);
    const id = crypto.randomUUID();
    let newEl: WhiteboardElement | null = null;

    if (tool === 'pen') {
      newEl = {
        id, type: 'path', x, y, stroke: color, strokeWidth, rotation: 0,
        points: [{ x, y }]
      };
    } else if (tool === 'text') {
       newEl = {
         id, type: 'text', x, y, stroke: color, strokeWidth: 1, rotation: 0, text: '', fontSize: 24
       };
       onUpdate({ type: 'ADD', data: newEl });
       setEditingTextId(id);
       setTextInput(''); 
       setSelectedId(id);
       setIsDrawing(false); 
       return;
    } else {
      newEl = {
        id, type: tool as any, x, y, width: 0, height: 0, stroke: color, strokeWidth, fill: 'transparent', rotation: 0
      };
    }

    if (newEl) setCurrentElement(newEl);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    const { x, y } = getCoords(e);

    if (tool === 'select' && dragOffset && selectedId) {
        const el = elements.find(e => e.id === selectedId);
        if (el) {
            onUpdate({ 
                type: 'UPDATE', 
                data: { ...el, x: x - dragOffset.x, y: y - dragOffset.y } 
            });
        }
        return;
    }

    if (!isDrawing || !currentElement) return;

    if (currentElement.type === 'path') {
      setCurrentElement(prev => ({
        ...prev!,
        points: [...(prev!.points || []), { x, y }]
      }));
    } else {
      setCurrentElement(prev => ({
        ...prev!,
        width: x - prev!.x,
        height: y - prev!.y
      }));
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    (e.target as Element).releasePointerCapture(e.pointerId);

    if (tool === 'select' && dragOffset) {
        setDragOffset(null);
        return;
    }

    if (!isDrawing) return;
    setIsDrawing(false);

    if (currentElement) {
        let finalElement = { ...currentElement };

        if (['rect', 'circle'].includes(finalElement.type)) {
            if ((finalElement.width || 0) < 0) {
                finalElement.x += finalElement.width!;
                finalElement.width = Math.abs(finalElement.width!);
            }
            if ((finalElement.height || 0) < 0) {
                finalElement.y += finalElement.height!;
                finalElement.height = Math.abs(finalElement.height!);
            }
        }
        
        if (finalElement.type !== 'path' && finalElement.type !== 'text') {
             if (Math.abs(finalElement.width || 0) < 5 && Math.abs(finalElement.height || 0) < 5) {
                 setCurrentElement(null);
                 return;
             }
        } else if (finalElement.type === 'path') {
             if ((finalElement.points?.length || 0) < 2) {
                 setCurrentElement(null);
                 return;
             }
        }
        
        onUpdate({ type: 'ADD', data: finalElement });
        setCurrentElement(null);
    }
  };

  const handleElementPointerDown = (e: React.PointerEvent, el: WhiteboardElement) => {
      e.stopPropagation(); 
      (e.target as Element).setPointerCapture(e.pointerId);

      if (tool === 'eraser') {
          saveHistory();
          onUpdate({ type: 'DELETE', elementId: el.id });
          return;
      }

      if (tool === 'select') {
          setSelectedId(el.id);
          const { x, y } = getCoords(e);
          setDragOffset({ x: x - el.x, y: y - el.y });
      }
  };

  const handleTextUpdate = () => {
    if (editingTextId) {
        if (textInput.trim()) {
            saveHistory();
            const el = elements.find(e => e.id === editingTextId);
            if (el) {
                onUpdate({ type: 'UPDATE', data: { ...el, text: textInput } });
            }
        } else {
             onUpdate({ type: 'DELETE', elementId: editingTextId });
        }
        setEditingTextId(null);
        setTextInput('');
    }
  };
  
  const deleteSelected = () => {
      if (selectedId) {
          saveHistory();
          onUpdate({ type: 'DELETE', elementId: selectedId });
          setSelectedId(null);
      }
  };

  const renderPath = (points: {x:number, y:number}[]) => {
      if (!points.length) return '';
      return `M ${points[0].x} ${points[0].y} ` + points.slice(1).map(p => `L ${p.x} ${p.y}`).join(' ');
  };

  const renderElement = (el: WhiteboardElement, isPreview = false) => {
      const isSelected = selectedId === el.id && !isPreview;
      const shouldCaptureEvents = tool === 'select' || tool === 'eraser';

      const commonProps = {
          stroke: el.stroke,
          strokeWidth: el.strokeWidth,
          fill: el.fill || 'transparent',
          style: { 
             transformBox: 'fill-box', 
             transformOrigin: 'center',
             transform: `rotate(${el.rotation}deg)`,
          } as any 
      };

      let content;

      switch(el.type) {
          case 'path':
              content = <path d={renderPath(el.points || [])} fill="none" {...commonProps} strokeLinecap="round" strokeLinejoin="round" />;
              break;
          case 'rect':
              content = <rect x={el.x} y={el.y} width={el.width} height={el.height} rx={4} {...commonProps} />;
              break;
          case 'circle':
              const cx = el.x + (el.width || 0) / 2;
              const cy = el.y + (el.height || 0) / 2;
              const rx = Math.abs((el.width || 0) / 2);
              const ry = Math.abs((el.height || 0) / 2);
              content = <ellipse cx={cx} cy={cy} rx={rx} ry={ry} {...commonProps} />;
              break;
          case 'line':
              content = <line x1={el.x} y1={el.y} x2={el.x + (el.width || 0)} y2={el.y + (el.height || 0)} {...commonProps} />;
              break;
          case 'arrow':
              const markerId = `url(#arrowhead-${el.stroke.replace('#', '')})`;
              content = (
                  <g>
                    <line 
                        x1={el.x} 
                        y1={el.y} 
                        x2={el.x + (el.width || 0)} 
                        y2={el.y + (el.height || 0)} 
                        {...commonProps} 
                        markerEnd={markerId} 
                    />
                  </g>
              );
              break;
          case 'text':
              content = (
                  <text 
                    x={el.x} 
                    y={el.y} 
                    fill={el.stroke} 
                    fontSize={el.fontSize || 24} 
                    fontFamily="Quicksand, sans-serif" 
                    fontWeight="bold"
                    style={{ 
                        transformBox: 'fill-box', 
                        transformOrigin: 'center', 
                        transform: `rotate(${el.rotation}deg)`, 
                        userSelect: 'none', 
                    }}
                    dominantBaseline="hanging"
                  >
                      {el.text || <tspan fill="#ccc" fontStyle="italic">Empty...</tspan>}
                  </text>
              );
              break;
          default:
              return null;
      }
      
      let selX = el.x;
      let selY = el.y;
      let selW = el.width || 0;
      let selH = el.height || 0;

      if (['line', 'arrow'].includes(el.type)) {
          if (selW < 0) { selX += selW; selW = Math.abs(selW); }
          if (selH < 0) { selY += selH; selH = Math.abs(selH); }
      }

      return (
          <g 
             key={el.id} 
             onPointerDown={(e) => handleElementPointerDown(e, el)}
             className="group"
             style={{ 
                pointerEvents: isPreview ? 'none' : (shouldCaptureEvents ? 'visiblePainted' : 'none'),
                cursor: tool === 'select' ? 'move' : tool === 'eraser' ? 'crosshair' : 'default'
             } as any}
          >
              {(el.type === 'path' || el.type === 'line' || el.type === 'arrow') && (
                  <path d={el.type === 'path' ? renderPath(el.points || []) : `M${el.x},${el.y} L${el.x + (el.width||0)},${el.y + (el.height||0)}`} 
                        stroke="transparent" strokeWidth={Math.max(10, el.strokeWidth + 10)} fill="none" 
                  />
              )}
              
              {content}
              
              {isSelected && (
                  <rect 
                    x={el.type === 'path' ? 0 : selX - 4} 
                    y={el.type === 'path' ? 0 : selY - 4} 
                    width={el.type === 'path' ? 0 : selW + 8} 
                    height={el.type === 'path' ? 0 : selH + 8} 
                    fill="none" 
                    stroke="#3b82f6" 
                    strokeWidth={1} 
                    strokeDasharray="4 2" 
                    pointerEvents="none"
                  />
              )}
          </g>
      );
  };

  return (
    <div className="flex w-full h-full bg-slate-50 relative rounded-xl overflow-hidden shadow-inner border border-slate-200">
      
      <motion.div 
        className="absolute left-4 top-4 md:top-1/2 md:-translate-y-1/2 flex flex-col gap-2 bg-white/95 backdrop-blur-md p-2.5 rounded-2xl shadow-xl z-20 border border-slate-100 max-h-[80%] overflow-y-auto custom-scrollbar"
        initial={{ x: -50, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
      >
         <div className="grid grid-cols-2 gap-1.5 w-max">
            {[
              { id: 'select', icon: MousePointer2, label: 'Select' },
              { id: 'pen', icon: Pencil, label: 'Pen' },
              { id: 'eraser', icon: Eraser, label: 'Eraser' },
              { id: 'text', icon: Type, label: 'Text' },
              { id: 'rect', icon: Square, label: 'Rect' },
              { id: 'circle', icon: Circle, label: 'Circle' },
              { id: 'line', icon: Minus, label: 'Line' },
              { id: 'arrow', icon: ArrowRight, label: 'Arrow' },
            ].map((t) => (
                <button
                    key={t.id}
                    onClick={() => {
                        setTool(t.id as WhiteboardTool);
                        setSelectedId(null);
                    }}
                    title={t.label}
                    className={`p-2.5 rounded-xl transition-all flex items-center justify-center ${tool === t.id ? 'bg-indigo-100 text-indigo-600 ring-2 ring-indigo-200' : 'text-slate-500 hover:bg-slate-100'}`}
                >
                    <t.icon size={20} />
                </button>
            ))}
         </div>
         
         <div className="h-px bg-slate-200 my-1 w-full" />
         
         <div className="flex gap-1 justify-between px-1">
            <button onClick={handleUndo} disabled={history.length === 0} className="p-2 text-slate-500 hover:text-slate-700 disabled:opacity-30 rounded-lg hover:bg-slate-100 flex-1 flex justify-center">
                <Undo size={18} />
            </button>
            <button onClick={handleRedo} disabled={redoStack.length === 0} className="p-2 text-slate-500 hover:text-slate-700 disabled:opacity-30 rounded-lg hover:bg-slate-100 flex-1 flex justify-center">
                <Redo size={18} />
            </button>
         </div>
         
         <div className="h-px bg-slate-200 my-1 w-full" />

         <button 
            onClick={deleteSelected} 
            disabled={!selectedId}
            className="w-full p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg disabled:opacity-30 transition-colors flex items-center justify-center gap-2"
         >
             <Trash2 size={18} />
         </button>
      </motion.div>

      <motion.div 
         className="absolute top-4 left-1/2 -translate-x-1/2 flex items-center gap-3 bg-white/95 backdrop-blur-md px-4 py-2.5 rounded-2xl shadow-xl z-20 border border-slate-100 overflow-x-auto max-w-[90vw]"
         initial={{ y: -50, opacity: 0 }}
         animate={{ y: 0, opacity: 1 }}
      >
          <div className="flex items-center gap-1.5">
              {COLORS.map(c => (
                  <button
                    key={c}
                    onClick={() => {
                        setColor(c);
                        if (selectedId) {
                            const el = elements.find(e => e.id === selectedId);
                            if (el) {
                                saveHistory();
                                onUpdate({ type: 'UPDATE', data: { ...el, stroke: c, fill: el.type === 'text' ? undefined : 'transparent' } });
                            }
                        }
                    }}
                    className={`w-5 h-5 md:w-6 md:h-6 rounded-full border-2 transition-transform ${color === c ? 'border-indigo-400 scale-110 shadow-sm' : 'border-transparent hover:scale-110'}`}
                    style={{ backgroundColor: c }}
                  />
              ))}
          </div>
          
          <div className="w-px h-6 bg-slate-200 mx-1" />
          
          <div className="flex items-center gap-2">
              {STROKES.map(s => (
                  <button
                    key={s}
                    onClick={() => {
                        setStrokeWidth(s);
                        if (selectedId) {
                            const el = elements.find(e => e.id === selectedId);
                            if (el) {
                                saveHistory();
                                onUpdate({ type: 'UPDATE', data: { ...el, strokeWidth: s } });
                            }
                        }
                    }}
                    className={`rounded-full bg-slate-800 transition-opacity ${strokeWidth === s ? 'opacity-100' : 'opacity-20 hover:opacity-60'}`}
                    style={{ width: s + 4, height: s + 4 }}
                  />
              ))}
          </div>
      </motion.div>

      <svg
        ref={svgRef}
        className="w-full h-full touch-none cursor-crosshair"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
      >
        <defs>
            {COLORS.map(c => (
                <marker 
                    key={c} 
                    id={`arrowhead-${c.replace('#', '')}`} 
                    markerWidth="10" 
                    markerHeight="7" 
                    refX="9" 
                    refY="3.5" 
                    orient="auto"
                >
                    <polygon points="0 0, 10 3.5, 0 7" fill={c} />
                </marker>
            ))}
        </defs>
        
        {elements.map(el => renderElement(el))}
        
        {currentElement && (
            <g className="opacity-60 pointer-events-none">
                {renderElement(currentElement, true)}
            </g>
        )}
      </svg>
      
      <AnimatePresence>
          {editingTextId && (
              <motion.div 
                 className="absolute inset-0 z-30 bg-black/10 flex items-center justify-center backdrop-blur-[2px]"
                 initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                 onPointerDown={(e) => e.stopPropagation()} 
              >
                  <div className="bg-white p-4 rounded-xl shadow-2xl flex flex-col gap-2 w-72">
                      <label className="text-xs font-bold text-slate-500 uppercase">Edit Text</label>
                      <textarea
                        ref={textAreaRef}
                        value={textInput}
                        onChange={(e) => setTextInput(e.target.value)}
                        placeholder="Type something..."
                        className="w-full h-24 p-3 bg-slate-50 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-indigo-200 resize-none font-display font-bold text-slate-700 text-lg placeholder:text-slate-300"
                        autoFocus
                      />
                      <div className="flex justify-end gap-2">
                           <button onClick={() => { setEditingTextId(null); onUpdate({ type: 'DELETE', elementId: editingTextId }); }} className="p-2 text-slate-400 hover:text-slate-600 font-bold text-sm">Cancel</button>
                           <button onClick={handleTextUpdate} className="bg-indigo-500 hover:bg-indigo-600 text-white px-4 py-2 rounded-xl font-bold flex items-center gap-1 shadow-lg shadow-indigo-200 transition-all active:scale-95">
                               <Check size={16} /> Done
                           </button>
                      </div>
                  </div>
              </motion.div>
          )}
      </AnimatePresence>
    </div>
  );
};
