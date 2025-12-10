
import React, { useState, useEffect, useRef } from 'react';
import { BackgroundWrapper } from './components/BackgroundWrapper';
import { VideoGrid } from './components/VideoGrid';
import { ControlDock } from './components/ControlDock';
import { FloatyDecorations } from './components/FloatyDecorations';
import { PomodoroTimer } from './components/PomodoroTimer';
import { MusicPlayer } from './components/MusicPlayer';
import { StudyBuddy } from './components/StudyBuddy';
import { ItemPalette } from './components/ItemPalette';
import { DraggableDeskItem } from './components/DeskItems';
import { Whiteboard } from './components/Whiteboard';
import { ChatPanel } from './components/ChatPanel';
import { User, DeskItem, DeskItemType, WhiteboardElement, WhiteboardAction, RoomMessage } from './types';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, ArrowRight, Loader2, Sparkles, RefreshCw, Wifi } from 'lucide-react';
import { io, Socket } from 'socket.io-client';

// Standard Google STUN servers are sufficient for most connections
const RTC_CONFIG = {
  iceServers: [
    { urls: ['stun:stun1.l.google.com:19302', 'stun:stun2.l.google.com:19302'] },
  ]
};

const serializeUser = (user: User): Omit<User, 'stream'> => {
  const { stream, ...rest } = user;
  return rest;
};

const App: React.FC = () => {
  // --- UI State ---
  const [connected, setConnected] = useState(false);
  const [showMusic, setShowMusic] = useState(false);
  const [showStudyBuddy, setShowStudyBuddy] = useState(false);
  const [showTimer, setShowTimer] = useState(false);
  const [showDecorations, setShowDecorations] = useState(false);
  const [showWhiteboard, setShowWhiteboard] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [unreadMessages, setUnreadMessages] = useState(false);
  
  const [roomId, setRoomId] = useState('');
  const [userName, setUserName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  
  // --- Data State ---
  const [users, setUsers] = useState<User[]>([]);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [screenStream, setScreenStream] = useState<MediaStream | null>(null);
  const [roomMessages, setRoomMessages] = useState<RoomMessage[]>([]);
  
  const [isMicOn, setIsMicOn] = useState(true);
  const [isCameraOn, setIsCameraOn] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  
  const [whiteboardElements, setWhiteboardElements] = useState<WhiteboardElement[]>([]);
  const [focusedUserId, setFocusedUserId] = useState<string | null>(null);

  // --- Refs ---
  const socketRef = useRef<Socket | null>(null);
  const peersRef = useRef<{ [socketId: string]: RTCPeerConnection }>({});
  const usersRef = useRef<User[]>([]);
  const localStreamRef = useRef<MediaStream | null>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);
  
  useEffect(() => { usersRef.current = users; }, [users]);
  useEffect(() => { localStreamRef.current = localStream; }, [localStream]);
  useEffect(() => { screenStreamRef.current = screenStream; }, [screenStream]);

  // Handle URL Params
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const roomParam = params.get('room');
    if (roomParam) setRoomId(roomParam);
  }, []);

  // --- WebRTC Logic ---

  const createPeerConnection = (targetSocketId: string, socket: Socket, stream: MediaStream) => {
      const pc = new RTCPeerConnection(RTC_CONFIG);

      stream.getTracks().forEach(track => pc.addTrack(track, stream));
      
      if (screenStreamRef.current) {
          screenStreamRef.current.getTracks().forEach(track => pc.addTrack(track, screenStreamRef.current!));
      }

      pc.onicecandidate = (event) => {
          if (event.candidate) {
              socket.emit('signal', {
                  target: targetSocketId,
                  signal: { type: 'candidate', candidate: event.candidate }
              });
          }
      };

      pc.ontrack = (event) => {
          console.log("Received track from:", targetSocketId, event.streams[0].id);
          const remoteStream = event.streams[0];
          
          setUsers(prev => {
             const userIndex = prev.findIndex(u => u.id === targetSocketId);
             const existingUser = userIndex !== -1 ? prev[userIndex] : null;
             
             if (existingUser && existingUser.stream && existingUser.stream.id !== remoteStream.id) {
                 const screenId = `${targetSocketId}-screen`;
                 if (prev.find(u => u.id === screenId)) return prev;

                 return [...prev, {
                     id: screenId,
                     name: `${existingUser.name}'s Screen`,
                     avatarUrl: '',
                     isSpeaking: false,
                     isMuted: true,
                     isVideoOff: false,
                     isScreenShare: true,
                     color: 'bg-blue-100',
                     stream: remoteStream,
                     isLocal: false
                 }];
             }

             if (userIndex !== -1) {
                 const newUsers = [...prev];
                 newUsers[userIndex] = { ...newUsers[userIndex], stream: remoteStream };
                 return newUsers;
             }
             
             return [...prev, {
                 id: targetSocketId,
                 name: 'Connecting...',
                 avatarUrl: '',
                 isSpeaking: false,
                 isMuted: false,
                 isVideoOff: false,
                 color: 'bg-gray-200',
                 stream: remoteStream,
                 isLocal: false
             }];
          });
      };

      peersRef.current[targetSocketId] = pc;
      return pc;
  };

  const handleConnect = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!roomId.trim() || !userName.trim()) return;

    setIsLoading(true);
    setError('');

    try {
        let stream = localStream;
        if (!stream) {
             stream = await navigator.mediaDevices.getUserMedia({
                video: { height: 480, frameRate: 24 },
                audio: { echoCancellation: true, noiseSuppression: true }
            });
            setLocalStream(stream);
        }

        const socket = io();
        socketRef.current = socket;

        socket.on('connect', () => {
            console.log("Connected to signal server", socket.id);
            
            const me: User = {
                id: socket.id!,
                name: userName,
                avatarUrl: `https://api.dicebear.com/7.x/notionists/svg?seed=${userName}`,
                isSpeaking: false,
                isMuted: false,
                isVideoOff: false,
                color: 'bg-purple-200',
                stream: stream!,
                isLocal: true,
                deskItems: []
            };
            setUsers([me]);
            setConnected(true);
            
            setRoomMessages([{
                id: 'welcome',
                senderId: 'system',
                senderName: 'System',
                text: `You joined room ${roomId}`,
                timestamp: Date.now(),
                isSystem: true
            }]);
            
            socket.emit('join-room', roomId, serializeUser(me));
        });

        socket.on('all-users', async (existingPeers: { socketId: string }[]) => {
            existingPeers.forEach(async (peer) => {
                const pc = createPeerConnection(peer.socketId, socket, stream!);
                const offer = await pc.createOffer();
                await pc.setLocalDescription(offer);
                socket.emit('signal', {
                    target: peer.socketId,
                    signal: { type: 'offer', sdp: offer }
                });
            });
        });

        socket.on('user-connected', (data: { socketId: string, user: User }) => {
            setUsers(prev => {
                if (prev.find(u => u.id === data.socketId)) return prev;
                return [...prev, { ...data.user, id: data.socketId, isLocal: false }];
            });
            
            setRoomMessages(prev => [...prev, {
                id: Date.now().toString() + Math.random(),
                senderId: 'system',
                senderName: 'System',
                text: `${data.user.name || 'Someone'} joined the room`,
                timestamp: Date.now(),
                isSystem: true
            }]);
            
            const me = usersRef.current.find(u => u.isLocal && !u.isScreenShare);
            if (me) {
                 socket.emit('state-update', { roomId, updates: serializeUser(me) });
            }
        });

        socket.on('user-disconnected', (socketId: string) => {
            if (peersRef.current[socketId]) {
                peersRef.current[socketId].close();
                delete peersRef.current[socketId];
            }
            
            const user = usersRef.current.find(u => u.id === socketId);
            if (user) {
                setRoomMessages(prev => [...prev, {
                    id: Date.now().toString() + Math.random(),
                    senderId: 'system',
                    senderName: 'System',
                    text: `${user.name} left the room`,
                    timestamp: Date.now(),
                    isSystem: true
                }]);
            }

            setUsers(prev => prev.filter(u => u.id !== socketId && u.id !== `${socketId}-screen`));
        });

        socket.on('signal', async (data: { sender: string, signal: any }) => {
            const { sender, signal } = data;
            
            let pc = peersRef.current[sender];
            if (!pc && signal.type === 'offer') {
                pc = createPeerConnection(sender, socket, stream!);
            }
            
            if (!pc) return;

            if (signal.type === 'offer') {
                await pc.setRemoteDescription(new RTCSessionDescription(signal.sdp));
                const answer = await pc.createAnswer();
                await pc.setLocalDescription(answer);
                socket.emit('signal', {
                    target: sender,
                    signal: { type: 'answer', sdp: answer }
                });
            } else if (signal.type === 'answer') {
                await pc.setRemoteDescription(new RTCSessionDescription(signal.sdp));
            } else if (signal.type === 'candidate') {
                await pc.addIceCandidate(new RTCIceCandidate(signal.candidate));
            }
        });

        socket.on('state-update', (data: { socketId: string, updates: Partial<User> }) => {
            setUsers(prev => {
                const idx = prev.findIndex(u => u.id === data.socketId);
                if (idx !== -1) {
                    const newUsers = [...prev];
                    newUsers[idx] = { ...newUsers[idx], ...data.updates };
                    return newUsers;
                }
                return prev; 
            });
        });

        socket.on('whiteboard-action', (data: { socketId: string, action: WhiteboardAction }) => {
             const action = data.action;
             if (action.type === 'ADD') {
                setWhiteboardElements(prev => [...prev, action.data as WhiteboardElement]);
            } else if (action.type === 'UPDATE') {
                const updatedEl = action.data as WhiteboardElement;
                setWhiteboardElements(prev => prev.map(el => el.id === updatedEl.id ? updatedEl : el));
            } else if (action.type === 'DELETE') {
                setWhiteboardElements(prev => prev.filter(el => el.id !== action.elementId));
            } else if (action.type === 'SYNC') {
                setWhiteboardElements(action.data as WhiteboardElement[]);
            }
        });

        socket.on('chat-message', (message: RoomMessage) => {
             setRoomMessages(prev => [...prev, message]);
             setShowChat(prev => {
                 if (!prev) {
                    setUnreadMessages(true);
                 }
                 return prev;
             });
        });

        try {
            const newUrl = new URL(window.location.href);
            newUrl.searchParams.set('room', roomId);
            window.history.pushState({}, '', newUrl);
        } catch (e) {
            console.warn("Could not update URL history:", e);
        }

    } catch (err: any) {
        console.error("Connection Error:", err);
        setError("Failed to connect to server. Please try again.");
        setIsLoading(false);
    }
  };

  const broadcastUpdate = (updates: Partial<User>) => {
      if (socketRef.current) {
          socketRef.current.emit('state-update', { roomId, updates });
      }
  };

  // --- Features ---
  
  const handleSendMessage = (text: string) => {
      if (!socketRef.current) return;
      
      const newMessage: RoomMessage = {
          id: crypto.randomUUID(),
          senderId: socketRef.current.id!,
          senderName: userName,
          text,
          timestamp: Date.now()
      };
      
      setRoomMessages(prev => [...prev, newMessage]);
      socketRef.current.emit('chat-message', { roomId, message: newMessage });
  };
  
  const toggleChat = () => {
      setShowChat(!showChat);
      if (!showChat) setUnreadMessages(false);
  };

  const handleWhiteboardAction = (action: WhiteboardAction) => {
      if (action.type === 'ADD') {
          setWhiteboardElements(prev => [...prev, action.data as WhiteboardElement]);
      } else if (action.type === 'UPDATE') {
          const updatedEl = action.data as WhiteboardElement;
          setWhiteboardElements(prev => prev.map(el => el.id === updatedEl.id ? updatedEl : el));
      } else if (action.type === 'DELETE') {
          setWhiteboardElements(prev => prev.filter(el => el.id !== action.elementId));
      } else if (action.type === 'SYNC') {
          setWhiteboardElements(action.data as WhiteboardElement[]);
      }

      if (socketRef.current) {
          socketRef.current.emit('whiteboard-action', { roomId, action });
      }
  };

  const handleScreenShare = async () => {
      if (isScreenSharing) {
          if (screenStream) {
              screenStream.getTracks().forEach(t => t.stop());
              Object.values(peersRef.current).forEach((pc: RTCPeerConnection) => {
              });
          }
          setScreenStream(null);
          setIsScreenSharing(false);
          setUsers(prev => prev.filter(u => u.id !== `${socketRef.current?.id}-screen`));
          broadcastUpdate({}); 
          alert("Screen share stopped.");

      } else {
          try {
              // @ts-ignore
              const stream = await navigator.mediaDevices.getDisplayMedia({
                   video: true,
                   audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false }
              });
              
              setScreenStream(stream);
              setIsScreenSharing(true);
              
              const screenUser: User = {
                  id: `${socketRef.current?.id}-screen`,
                  name: `${userName}'s Screen`,
                  avatarUrl: '',
                  isSpeaking: false,
                  isMuted: true,
                  isVideoOff: false,
                  isScreenShare: true,
                  color: 'bg-blue-100',
                  stream: stream,
                  isLocal: true
              };
              setUsers(prev => [...prev, screenUser]);
              setFocusedUserId(screenUser.id);
              setShowWhiteboard(false);

              Object.values(peersRef.current).forEach(async (pc: RTCPeerConnection) => {
                  stream.getTracks().forEach(track => pc.addTrack(track, stream));
                  const offer = await pc.createOffer();
                  await pc.setLocalDescription(offer);
                  const targetId = Object.keys(peersRef.current).find(key => peersRef.current[key] === pc);
                  if (targetId) {
                      socketRef.current?.emit('signal', { target: targetId, signal: { type: 'offer', sdp: offer } });
                  }
              });

              stream.getVideoTracks()[0].onended = () => {
                   setScreenStream(null);
                   setIsScreenSharing(false);
                   setUsers(prev => prev.filter(u => u.id !== `${socketRef.current?.id}-screen`));
              };

          } catch (err: any) {
              if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
                 console.log("Screen share cancelled by user");
                 return;
              }
              console.error(err);
              alert("Failed to start screen share: " + err.message);
          }
      }
  };

  // --- Standard Event Handlers ---
  const toggleMic = () => {
      if (localStream) {
          const track = localStream.getAudioTracks()[0];
          track.enabled = !track.enabled;
          setIsMicOn(track.enabled);
          setUsers(prev => prev.map(u => u.isLocal && !u.isScreenShare ? { ...u, isMuted: !track.enabled } : u));
          broadcastUpdate({ isMuted: !track.enabled });
      }
  };
  
  const toggleCamera = () => {
      if (localStream) {
          const track = localStream.getVideoTracks()[0];
          track.enabled = !track.enabled;
          setIsCameraOn(track.enabled);
          setUsers(prev => prev.map(u => u.isLocal && !u.isScreenShare ? { ...u, isVideoOff: !track.enabled } : u));
          broadcastUpdate({ isVideoOff: !track.enabled });
      }
  };

  const handleLeave = () => {
      if (socketRef.current) socketRef.current.disconnect();
      if (localStream) localStream.getTracks().forEach(t => t.stop());
      if (screenStream) screenStream.getTracks().forEach(t => t.stop());
      Object.values(peersRef.current).forEach((pc: RTCPeerConnection) => pc.close());
      peersRef.current = {};
      setConnected(false);
      setUsers([]);
      setRoomId('');
      window.location.reload();
  };

  const createNewRoom = () => {
      setRoomId(Math.floor(100000 + Math.random() * 900000).toString());
  };
  
  // Audio Visualizer Logic
  useEffect(() => {
    if (!localStream || !connected) return;
    let audioContext: AudioContext;
    let analyser: AnalyserNode;
    let microphone: MediaStreamAudioSourceNode;
    let animationFrame: number;
    let wasSpeaking = false;

    try {
        audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        analyser = audioContext.createAnalyser();
        analyser.fftSize = 256;
        const dataArray = new Uint8Array(analyser.frequencyBinCount);

        if (localStream.getAudioTracks().length > 0) {
            microphone = audioContext.createMediaStreamSource(localStream);
            microphone.connect(analyser);
            
            const loop = () => {
                if (!isMicOn) {
                    if (wasSpeaking) {
                        wasSpeaking = false;
                        broadcastUpdate({ isSpeaking: false });
                        setUsers(prev => prev.map(u => u.isLocal && !u.isScreenShare ? {...u, isSpeaking: false} : u));
                    }
                    animationFrame = requestAnimationFrame(loop);
                    return;
                }
                analyser.getByteFrequencyData(dataArray);
                const avg = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
                const isSpeaking = avg > 20;
                
                if (isSpeaking !== wasSpeaking) {
                    wasSpeaking = isSpeaking;
                    broadcastUpdate({ isSpeaking });
                    setUsers(prev => prev.map(u => u.isLocal && !u.isScreenShare ? {...u, isSpeaking} : u));
                }
                animationFrame = requestAnimationFrame(loop);
            };
            loop();
        }
    } catch(e) { console.error(e); }
    return () => { cancelAnimationFrame(animationFrame); audioContext?.close(); };
  }, [localStream, connected, isMicOn]);

  const handleAddDeskItem = (type: DeskItemType) => {
       const newItem: DeskItem = {
          id: crypto.randomUUID(), type, x: 50, y: 50, data: '' 
       };
       if (type === 'plant') newItem.data = "https://media.tenor.com/m38BFcQuk0gAAAAi/plant.gif";
       if (type === 'coffee') newItem.data = "https://i.pinimg.com/originals/33/a5/d5/33a5d563b09c60db33a18a6be523c8a6.gif";
       if (type === 'pet') newItem.data = "https://media.tenor.com/1YELlhf9ORsAAAAi/waal-boyss-nabilaa.gif";

       setUsers(prev => {
           const idx = prev.findIndex(u => u.isLocal && !u.isScreenShare);
           if (idx === -1) return prev;
           const user = prev[idx];
           const newItems = [...(user.deskItems || []), newItem];
           broadcastUpdate({ deskItems: newItems });
           const newUsers = [...prev];
           newUsers[idx] = { ...user, deskItems: newItems };
           return newUsers;
       });
  };
  
  const handleUpdateDeskItem = (userId: string, itemId: string, update: Partial<DeskItem>) => {
       setUsers(prev => {
           const idx = prev.findIndex(u => u.id === userId && u.isLocal);
           if (idx === -1) return prev;
           const user = prev[idx];
           const newItems = user.deskItems?.map(i => i.id === itemId ? {...i, ...update} : i) || [];
           broadcastUpdate({ deskItems: newItems });
           const newUsers = [...prev];
           newUsers[idx] = { ...user, deskItems: newItems };
           return newUsers;
       });
  };

  const handleRemoveDeskItem = (userId: string, itemId: string) => {
       setUsers(prev => {
           const idx = prev.findIndex(u => u.id === userId && u.isLocal);
           if (idx === -1) return prev;
           const user = prev[idx];
           const newItems = user.deskItems?.filter(i => i.id !== itemId) || [];
           broadcastUpdate({ deskItems: newItems });
           const newUsers = [...prev];
           newUsers[idx] = { ...user, deskItems: newItems };
           return newUsers;
       });
  };

  if (!connected) {
      return (
          <BackgroundWrapper>
              <div className="flex flex-col items-center justify-center h-screen w-full p-4 relative z-20">
                  <FloatyDecorations />
                  <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white/40 backdrop-blur-xl p-8 rounded-[2.5rem] shadow-2xl border border-white/60 w-full max-w-md">
                      <h1 className="text-4xl font-display font-bold text-slate-700 mb-2 text-center">CozyCorner</h1>
                      <p className="text-center text-slate-600 mb-8 font-medium">A soft space to dream together.</p>
                      
                      <form onSubmit={handleConnect} className="space-y-4">
                          <div>
                              <label className="text-xs font-bold text-slate-500 uppercase ml-2">Display Name</label>
                              <input type="text" value={userName} onChange={e => setUserName(e.target.value)} placeholder="Luna" className="w-full px-5 py-3 rounded-2xl bg-white/60 border border-white focus:ring-2 focus:ring-purple-200 outline-none font-bold text-slate-700" />
                          </div>
                          <div>
                              <label className="text-xs font-bold text-slate-500 uppercase ml-2">Room ID</label>
                              <div className="flex gap-2">
                                  <input type="text" value={roomId} onChange={e => setRoomId(e.target.value)} placeholder="123456" className="w-full px-5 py-3 rounded-2xl bg-white/60 border border-white focus:ring-2 focus:ring-purple-200 outline-none font-bold text-slate-700" />
                                  <button type="button" onClick={() => { createNewRoom(); }} className="px-3 bg-white/60 rounded-2xl hover:bg-white text-purple-600"><Sparkles size={20}/></button>
                              </div>
                          </div>
                          {error && <div className="text-red-500 font-bold text-sm text-center bg-red-50 p-2 rounded-lg">{error}</div>}
                          <button type="submit" disabled={isLoading} className="w-full bg-slate-800 text-white py-4 rounded-2xl font-bold shadow-lg hover:bg-slate-700 transition-all flex justify-center items-center gap-2">
                              {isLoading ? <Loader2 className="animate-spin" /> : <>Join Room <ArrowRight size={20} /></>}
                          </button>
                      </form>
                  </motion.div>
              </div>
          </BackgroundWrapper>
      );
  }

  return (
    <BackgroundWrapper>
      <div className="relative h-screen w-full flex flex-col overflow-hidden">
        <AnimatePresence>{showTimer && <PomodoroTimer />}</AnimatePresence>
        <div className="absolute top-6 right-6 md:left-1/2 md:-translate-x-1/2 md:right-auto z-40 bg-white/30 backdrop-blur-sm px-5 py-2 rounded-full border border-white/40 shadow-sm flex items-center gap-4">
             <h2 className="text-slate-700 font-bold flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                Room: {roomId}
             </h2>
             <div className="w-px h-4 bg-slate-400/50" />
             <div className="flex items-center gap-1.5 text-slate-600 font-bold text-sm">
                <Users size={14} /> {users.length}
             </div>
        </div>

        <FloatyDecorations />

        {/* Desk Items */}
        <div className="absolute inset-0 z-20 pointer-events-none overflow-hidden">
             <AnimatePresence>
                {users.flatMap(user => 
                   (user.deskItems || []).map(item => (
                       <DraggableDeskItem
                          key={item.id}
                          item={item}
                          ownerName={user.name}
                          isEditable={!!user.isLocal && !user.isScreenShare}
                          onUpdate={(id, updates) => handleUpdateDeskItem(user.id, id, updates)}
                          onRemove={(id) => handleRemoveDeskItem(user.id, id)}
                       />
                   ))
                )}
             </AnimatePresence>
        </div>

        {/* Widgets */}
        <AnimatePresence>{showMusic && <MusicPlayer onClose={() => setShowMusic(false)} />}</AnimatePresence>
        <AnimatePresence>{showStudyBuddy && <StudyBuddy onClose={() => setShowStudyBuddy(false)} />}</AnimatePresence>
        <AnimatePresence>
            {showDecorations && <ItemPalette onClose={() => setShowDecorations(false)} onSelect={handleAddDeskItem} />}
        </AnimatePresence>
        
        {/* Main Content Area (Row) */}
        <div className="flex-1 flex flex-row relative z-10 overflow-hidden">
            {/* Video Grid / Main Stage */}
            <div className={`flex-1 flex flex-col relative overflow-hidden transition-all duration-500 ${focusedUserId || showWhiteboard ? 'pt-14 pb-0' : 'pt-20 pb-32'}`}>
              <VideoGrid 
                users={users} 
                focusedUserId={focusedUserId}
                onFocusUser={(id) => { if (id) setShowWhiteboard(false); setFocusedUserId(id); }}
                customStage={showWhiteboard ? (
                    <Whiteboard 
                        elements={whiteboardElements} 
                        onUpdate={handleWhiteboardAction} 
                        currentUser={socketRef.current?.id || ''} 
                    />
                ) : undefined}
              />
            </div>

            {/* Side Chat Panel */}
            <ChatPanel 
                isOpen={showChat}
                onClose={() => setShowChat(false)}
                messages={roomMessages}
                onSendMessage={handleSendMessage}
                currentUserId={socketRef.current?.id || ''}
            />
        </div>

        <ControlDock 
            onLeave={handleLeave} 
            toggleMusic={() => setShowMusic(!showMusic)}
            toggleStudyBuddy={() => setShowStudyBuddy(!showStudyBuddy)}
            toggleTimer={() => setShowTimer(!showTimer)}
            toggleDecorations={() => setShowDecorations(!showDecorations)}
            toggleWhiteboard={() => { setShowWhiteboard(!showWhiteboard); setFocusedUserId(null); }}
            toggleChat={toggleChat}
            isMusicOpen={showMusic}
            isStudyBuddyOpen={showStudyBuddy}
            isTimerOpen={showTimer}
            isDecorationsOpen={showDecorations}
            isWhiteboardOpen={showWhiteboard}
            isChatOpen={showChat}
            unreadMessages={unreadMessages}
            isMicOn={isMicOn}
            isCameraOn={isCameraOn}
            isScreenSharing={isScreenSharing}
            onToggleMic={toggleMic}
            onToggleCamera={toggleCamera}
            onToggleScreenShare={handleScreenShare}
        />
      </div>
    </BackgroundWrapper>
  );
};

export default App;
