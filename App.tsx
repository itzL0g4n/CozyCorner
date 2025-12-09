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
import { User, DeskItem, DeskItemType, WhiteboardElement, WhiteboardAction } from './types';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, ArrowRight, Loader2, Sparkles, RefreshCw, Wifi } from 'lucide-react';
import { io, Socket } from 'socket.io-client';

// Standard Google STUN servers are sufficient for most connections
const RTC_CONFIG = {
  iceServers: [
    { urls: ['stun:stun1.l.google.com:19302', 'stun:stun2.l.google.com:19302'] },
  ]
};

// Helper to strip non-serializable data
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
  
  const [roomId, setRoomId] = useState('');
  const [userName, setUserName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  
  // --- Data State ---
  const [users, setUsers] = useState<User[]>([]);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [screenStream, setScreenStream] = useState<MediaStream | null>(null);
  
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
  
  // Sync refs
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

      // Add local tracks
      stream.getTracks().forEach(track => pc.addTrack(track, stream));
      
      // Also add screen tracks if they exist
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
             
             // Check if this is a secondary stream (Screen Share)
             // We can differentiate by checking if we already have a main stream for this user
             const existingUser = userIndex !== -1 ? prev[userIndex] : null;
             
             // If existing user already has a DIFFERENT stream ID, this must be their screen
             if (existingUser && existingUser.stream && existingUser.stream.id !== remoteStream.id) {
                 const screenId = `${targetSocketId}-screen`;
                 // Check if screen user already exists
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

             // Otherwise it's the main camera stream (or first stream)
             if (userIndex !== -1) {
                 const newUsers = [...prev];
                 newUsers[userIndex] = { ...newUsers[userIndex], stream: remoteStream };
                 return newUsers;
             }
             
             // If we don't know the user yet (race condition), create placeholder
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
        // 1. Get Local Stream
        let stream = localStream;
        if (!stream) {
             stream = await navigator.mediaDevices.getUserMedia({
                video: { height: 480, frameRate: 24 },
                audio: { echoCancellation: true, noiseSuppression: true }
            });
            setLocalStream(stream);
        }

        // 2. Connect Socket
        const socket = io(); // Connects to same host/port
        socketRef.current = socket;

        // 3. Setup Socket Events
        socket.on('connect', () => {
            console.log("Connected to signal server", socket.id);
            
            // Initial Local User
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
            
            // Join Room
            socket.emit('join-room', roomId, serializeUser(me));
        });

        // Existing users in room (Received upon joining)
        socket.on('all-users', async (existingPeers: { socketId: string }[]) => {
            console.log("Existing peers:", existingPeers);
            // Initiate connections (I am the caller)
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

        // New user joined (I am the callee)
        socket.on('user-connected', (data: { socketId: string, user: User }) => {
            console.log("User joined:", data.socketId);
            setUsers(prev => {
                if (prev.find(u => u.id === data.socketId)) return prev;
                return [...prev, { ...data.user, id: data.socketId, isLocal: false }];
            });
            
            // Send my latest state to them so they have my name/avatar immediately
            const me = usersRef.current.find(u => u.isLocal && !u.isScreenShare);
            if (me) {
                 socket.emit('state-update', { roomId, updates: serializeUser(me) });
            }
        });

        // User disconnected
        socket.on('user-disconnected', (socketId: string) => {
            console.log("User disconnected:", socketId);
            if (peersRef.current[socketId]) {
                peersRef.current[socketId].close();
                delete peersRef.current[socketId];
            }
            setUsers(prev => prev.filter(u => u.id !== socketId && u.id !== `${socketId}-screen`));
        });

        // WebRTC Signaling
        socket.on('signal', async (data: { sender: string, signal: any }) => {
            const { sender, signal } = data;
            
            // Get or Create PC (Callee side creates on offer)
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

        // State Updates
        socket.on('state-update', (data: { socketId: string, updates: Partial<User> }) => {
            setUsers(prev => {
                const idx = prev.findIndex(u => u.id === data.socketId);
                if (idx !== -1) {
                    const newUsers = [...prev];
                    newUsers[idx] = { ...newUsers[idx], ...data.updates };
                    return newUsers;
                }
                // If we get update for unknown user (race condition), add them
                // We might assume they are connecting
                return prev; 
            });
        });

        // Whiteboard Updates
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

        // Update URL safely
        try {
            const newUrl = new URL(window.location.href);
            newUrl.searchParams.set('room', roomId);
            window.history.pushState({}, '', newUrl);
        } catch (e) {
            console.warn("Could not update URL history (likely running in sandbox):", e);
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

  const handleWhiteboardAction = (action: WhiteboardAction) => {
      // Local update
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

      // Broadcast
      if (socketRef.current) {
          socketRef.current.emit('whiteboard-action', { roomId, action });
      }
  };

  const handleScreenShare = async () => {
      if (isScreenSharing) {
          // Stop
          if (screenStream) {
              screenStream.getTracks().forEach(t => t.stop());
              // Remove track from all peers
              Object.values(peersRef.current).forEach((pc: RTCPeerConnection) => {
                  const senders = pc.getSenders();
                  const screenSender = senders.find(s => s.track?.kind === 'video' && s.track.label.includes('screen')); // Rough heuristic or keep track refs
                  // Actually, just renegotiate is hardest part of raw WebRTC
                  // For simplicity: We won't remove tracks from PC dynamically without renegotiation which is complex.
                  // We will just stop sending data and inform peers to remove user.
              });
          }
          setScreenStream(null);
          setIsScreenSharing(false);
          setUsers(prev => prev.filter(u => u.id !== `${socketRef.current?.id}-screen`));
          broadcastUpdate({}); // Trigger refresh
          // NOTE: Proper track removal + renegotiation is complex. 
          // A full refresh might be needed for perfect cleanup in mesh, 
          // but visually removing the user is usually enough for MVP.
          alert("Screen share stopped. Note: Peers may need to refresh if artifacts persist.");

      } else {
          // Start
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

              // Add tracks to existing connections
              // Note: This requires renegotiation (onnegotiationneeded)
              // For a simple implementation, we might just add tracks and hope browser handles it 
              // or trigger a manual re-offer.
              Object.values(peersRef.current).forEach(async (pc: RTCPeerConnection) => {
                  stream.getTracks().forEach(track => pc.addTrack(track, stream));
                  // Trigger renegotiation
                  const offer = await pc.createOffer();
                  await pc.setLocalDescription(offer);
                  // Find socketId for this PC
                  const targetId = Object.keys(peersRef.current).find(key => peersRef.current[key] === pc);
                  if (targetId) {
                      socketRef.current?.emit('signal', { target: targetId, signal: { type: 'offer', sdp: offer } });
                  }
              });

              stream.getVideoTracks()[0].onended = () => {
                  // Handle system stop button
                   setScreenStream(null);
                   setIsScreenSharing(false);
                   setUsers(prev => prev.filter(u => u.id !== `${socketRef.current?.id}-screen`));
              };

          } catch (err: any) {
              if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
                 // User cancelled, do nothing
                 console.log("Screen share cancelled by user");
                 return;
              }
              console.error(err);
              alert("Failed to start screen share: " + err.message);
          }
      }
  };

  // --- Standard Event Handlers (Mic, Camera, etc) ---
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
      window.location.reload(); // Cleanest way to reset WebRTC state
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

  // Desk Item Logic placeholders (mapped to state updates)
  const handleAddDeskItem = (type: DeskItemType) => {
       const newItem: DeskItem = {
          id: crypto.randomUUID(), type, x: 50, y: 50, data: '' 
       };
       // Add some default data based on type
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
                                  <button type="button" onClick={createNewRoom} className="px-3 bg-white/60 rounded-2xl hover:bg-white text-purple-600"><Sparkles size={20}/></button>
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
        {/* Top Bar */}
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

        {/* Main Stage */}
        <div className={`flex-1 flex flex-col relative z-10 overflow-hidden transition-all duration-500 ${focusedUserId || showWhiteboard ? 'pt-14 pb-0' : 'pt-20 pb-32'}`}>
          <VideoGrid 
            users={users} 
            focusedUserId={focusedUserId}
            onFocusUser={(id) => { if (id) setShowWhiteboard(false); setFocusedUserId(id); }}
            customStage={showWhiteboard ? (
                <Whiteboard elements={whiteboardElements} onUpdate={handleWhiteboardAction} currentUser={socketRef.current?.id || ''} />
            ) : undefined}
          />
        </div>

        <ControlDock 
            onLeave={handleLeave} 
            toggleMusic={() => setShowMusic(!showMusic)}
            toggleStudyBuddy={() => setShowStudyBuddy(!showStudyBuddy)}
            toggleTimer={() => setShowTimer(!showTimer)}
            toggleDecorations={() => setShowDecorations(!showDecorations)}
            toggleWhiteboard={() => { setShowWhiteboard(!showWhiteboard); setFocusedUserId(null); }}
            isMusicOpen={showMusic}
            isStudyBuddyOpen={showStudyBuddy}
            isTimerOpen={showTimer}
            isDecorationsOpen={showDecorations}
            isWhiteboardOpen={showWhiteboard}
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