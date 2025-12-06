
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
import { Users, ArrowRight, Loader2, Sparkles } from 'lucide-react';
import { joinRoom, selfId } from 'trystero/torrent';

// Robust ICE Servers (STUN) for NAT Traversal
const RTC_CONFIG = {
  iceServers: [
    { urls: ['stun:stun.l.google.com:19302'] },
    { urls: ['stun:global.stun.twilio.com:3478'] },
    { urls: ['stun:stun1.l.google.com:19302'] },
    { urls: ['stun:stun2.l.google.com:19302'] }
  ]
};

// Simplified, High-Uptime Trackers to prevent partitioning
const TRACKER_URLS = [
  'wss://tracker.webtorrent.io',
  'wss://tracker.openwebtorrent.com',
  'wss://tracker.btorrent.xyz',
];

// Helper to strip non-serializable data (streams) before broadcasting
const serializeUser = (user: User): Omit<User, 'stream'> => {
  const { stream, ...rest } = user;
  return rest;
};

const App: React.FC = () => {
  const [connected, setConnected] = useState(false);
  const [showMusic, setShowMusic] = useState(false);
  const [showStudyBuddy, setShowStudyBuddy] = useState(false);
  const [showTimer, setShowTimer] = useState(true);
  const [showDecorations, setShowDecorations] = useState(false);
  const [showWhiteboard, setShowWhiteboard] = useState(false); // New
  
  // Logic State
  const [roomId, setRoomId] = useState('');
  const [userName, setUserName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Media State
  const [users, setUsers] = useState<User[]>([]);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [isMicOn, setIsMicOn] = useState(true);
  const [isCameraOn, setIsCameraOn] = useState(true);
  
  // Screen Share State
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [screenStream, setScreenStream] = useState<MediaStream | null>(null);

  // Whiteboard State
  const [whiteboardElements, setWhiteboardElements] = useState<WhiteboardElement[]>([]);

  // Layout State
  const [focusedUserId, setFocusedUserId] = useState<string | null>(null);

  // WebRTC Refs
  const roomRef = useRef<any>(null);
  const sendUpdateRef = useRef<any>(null);
  const sendWhiteboardRef = useRef<any>(null); // New
  const usersRef = useRef<User[]>([]);
  const screenStreamRef = useRef<MediaStream | null>(null);
  const heartbeatRef = useRef<any>(null);
  const pendingLeavesRef = useRef<Map<string, any>>(new Map());

  // Keep ref synced with state for event listeners
  useEffect(() => {
    usersRef.current = users;
  }, [users]);

  useEffect(() => {
    screenStreamRef.current = screenStream;
  }, [screenStream]);

  // On Mount: Check for Room ID in URL
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const roomParam = params.get('room');
      if (roomParam) {
        setRoomId(roomParam);
      }
    } catch (e) {
      console.warn("Could not read URL parameters", e);
    }
    
    return () => {
        if (heartbeatRef.current) clearInterval(heartbeatRef.current);
    };
  }, []);

  // Audio Level Detection for Visualizer
  useEffect(() => {
    if (!localStream || !connected) return;

    let audioContext: AudioContext | null = null;
    let microphone: MediaStreamAudioSourceNode | null = null;
    let analyser: AnalyserNode | null = null;
    let animationFrameId: number;
    let wasSpeaking = false;

    try {
      audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      analyser = audioContext.createAnalyser();
      
      // Ensure local stream has audio tracks before connecting
      if (localStream.getAudioTracks().length > 0) {
        microphone = audioContext.createMediaStreamSource(localStream);
        microphone.connect(analyser);

        analyser.fftSize = 256;
        const dataArray = new Uint8Array(analyser.frequencyBinCount);

        const checkAudioLevel = () => {
          if (!isMicOn) {
            if (wasSpeaking) {
               wasSpeaking = false;
               setUsers(prev => prev.map(u => u.isLocal && !u.isScreenShare ? { ...u, isSpeaking: false } : u));
               broadcastUpdate({ isSpeaking: false });
            }
            animationFrameId = requestAnimationFrame(checkAudioLevel);
            return;
          }

          if (analyser) {
            analyser.getByteFrequencyData(dataArray);
            
            let sum = 0;
            for (let i = 0; i < dataArray.length; i++) {
              sum += dataArray[i];
            }
            const average = sum / dataArray.length;
            const isSpeaking = average > 25; 

            if (isSpeaking !== wasSpeaking) {
              wasSpeaking = isSpeaking;
              setUsers(prev => prev.map(u => u.isLocal && !u.isScreenShare ? { ...u, isSpeaking } : u));
              broadcastUpdate({ isSpeaking });
            }
          }
          
          animationFrameId = requestAnimationFrame(checkAudioLevel);
        };

        checkAudioLevel();
      }

    } catch (err) {
      console.error("Error initializing audio context:", err);
    }

    return () => {
      cancelAnimationFrame(animationFrameId);
      if (microphone) microphone.disconnect();
      if (audioContext && audioContext.state !== 'closed') audioContext.close();
    };
  }, [localStream, isMicOn, connected]);

  const broadcastUpdate = (changes: Partial<User>) => {
      if (sendUpdateRef.current) {
          const me = usersRef.current.find(u => u.isLocal && !u.isScreenShare);
          if (me) {
              const updatedMe = { ...me, ...changes };
              const payload = {
                  user: serializeUser(updatedMe),
                  screenStreamId: screenStreamRef.current ? screenStreamRef.current.id : null,
                  cameraStreamId: localStream ? localStream.id : null,
                  timestamp: Date.now()
              };
              sendUpdateRef.current(payload);
          }
      }
  };

  const handleWhiteboardAction = (action: WhiteboardAction) => {
      // 1. Update Local State
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

      // 2. Broadcast to Peers
      if (sendWhiteboardRef.current) {
          sendWhiteboardRef.current(action);
      }
  };

  const handleConnect = async (e: React.FormEvent) => {
    e.preventDefault();
    if(!roomId.trim() || !userName.trim()) return;

    setIsLoading(true);
    setError('');

    let stream: MediaStream | null = null;

    try {
      // 1. Get Media Stream
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { height: 360, frameRate: 24 }, // Lower res for better mesh stability
          audio: { echoCancellation: true, noiseSuppression: true }
        });
        setLocalStream(stream);
      } catch (mediaErr: any) {
        console.error("Media Error:", mediaErr);
        if (mediaErr.name === 'NotAllowedError' || mediaErr.name === 'PermissionDeniedError') {
           throw new Error("Camera/Microphone permissions are required to join.");
        }
        throw new Error(`Could not access camera: ${mediaErr.message || 'Unknown error'}`);
      }

      // 2. Initialize Trystero
      const room = joinRoom({ 
          appId: 'cozy-corner-live-v1',
          rtcConfig: RTC_CONFIG,
          trackerUrls: TRACKER_URLS
      } as any, roomId);
      
      roomRef.current = room;

      const [sendUpdate, getUpdate] = room.makeAction<any>('presence');
      sendUpdateRef.current = sendUpdate;
      
      const [sendWhiteboard, getWhiteboard] = room.makeAction<any>('whiteboard');
      sendWhiteboardRef.current = sendWhiteboard;

      // 3. Add Stream Immediately (Broadcast to all)
      room.addStream(stream);

      const localUser: User = {
        id: selfId, 
        name: userName,
        avatarUrl: `https://api.dicebear.com/7.x/notionists/svg?seed=${userName}`,
        isSpeaking: false,
        isMuted: false,
        isVideoOff: false,
        color: 'bg-purple-200',
        stream: stream,
        isLocal: true,
        deskItems: []
      };

      setUsers([localUser]);
      setConnected(true);

      // Start Heartbeat
      heartbeatRef.current = setInterval(() => {
         broadcastUpdate({}); 
      }, 3000); // Send presence every 3 seconds

      // 4. Update URL
      try {
        const newUrl = new URL(window.location.href);
        newUrl.searchParams.set('room', roomId);
        window.history.pushState({}, '', newUrl);
      } catch (urlError) {
        console.warn("Could not update URL:", urlError);
      }
      
      setTimeout(() => setShowMusic(true), 1000);

      // --- Trystero Event Listeners ---

      // A. Handle incoming state updates (Presence)
      getUpdate((payload, peerId) => {
          // If this peer was pending leave, cancel it (they are back/stable)
          if (pendingLeavesRef.current.has(peerId)) {
              clearTimeout(pendingLeavesRef.current.get(peerId)!);
              pendingLeavesRef.current.delete(peerId);
          }

          setUsers(prev => {
              const existingUserIndex = prev.findIndex(u => u.id === peerId);
              const incomingUser = payload.user;

              if (existingUserIndex !== -1) {
                  // Update existing
                  const newUsers = [...prev];
                  newUsers[existingUserIndex] = {
                      ...newUsers[existingUserIndex],
                      ...incomingUser,
                      isLocal: false,
                      // CRITICAL: Preserve the stream!
                      stream: newUsers[existingUserIndex].stream
                  };
                  
                  // Handle Screen Share Phantom
                  const screenId = `${peerId}-screen`;
                  const hasScreen = !!payload.screenStreamId;
                  const existingScreenIndex = prev.findIndex(u => u.id === screenId);

                  if (hasScreen && existingScreenIndex === -1) {
                      newUsers.push({
                          id: screenId,
                          name: `${incomingUser.name}'s Screen`,
                          avatarUrl: '',
                          isSpeaking: false,
                          isMuted: true,
                          isVideoOff: false,
                          isScreenShare: true,
                          color: 'bg-blue-100',
                          isLocal: false
                      });
                  } else if (!hasScreen && existingScreenIndex !== -1) {
                      newUsers.splice(existingScreenIndex, 1);
                  }

                  return newUsers;
              } else {
                  // New User Found via Data
                  return [...prev, { ...incomingUser, id: peerId, isLocal: false }];
              }
          });
      });

      // B. Handle Whiteboard Actions
      getWhiteboard((data, peerId) => {
          const action = data as WhiteboardAction;
          console.log("Whiteboard Action from", peerId, action);
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

      // C. Handle Peer Joining (Handshake)
      room.onPeerJoin((peerId: string) => {
          console.log("Peer joined:", peerId);
          
          // CRITICAL: Force add stream to THIS specific peer.
          // This ensures if they missed the initial broadcast, they get it now.
          if (stream) {
            console.log("Offering local stream to:", peerId);
            room.addStream(stream, peerId);
          }

          if (screenStreamRef.current) {
             console.log("Offering screen stream to:", peerId);
             room.addStream(screenStreamRef.current, peerId);
          }
          
          // Send immediate presence to this peer
          setTimeout(() => broadcastUpdate({}), 500);

          // SYNC Whiteboard to new peer
          // (Simple strategy: Host or everyone sends SYNC. 
          // Since we don't have a designated host, everyone sends it. 
          // The peer will just render the latest received).
          setTimeout(() => {
              if (sendWhiteboardRef.current) {
                   // We don't have targeted send in this wrapper easily, so we broadcast.
                   // Ideally we'd filter, but broadcasting SYNC is okay for small rooms.
                   sendWhiteboardRef.current({ type: 'SYNC', data: whiteboardElements });
              }
          }, 1000);
      });

      // D. Handle Peer Leaving (Debounced)
      room.onPeerLeave((peerId: string) => {
          console.log("Peer left signal:", peerId);
          
          // Don't remove immediately, wait 5s to see if it's just a flicker
          const timeoutId = setTimeout(() => {
             console.log("Peer actually removed:", peerId);
             setUsers(prev => prev.filter(u => u.id !== peerId && u.id !== `${peerId}-screen`));
             pendingLeavesRef.current.delete(peerId);
          }, 5000);

          pendingLeavesRef.current.set(peerId, timeoutId);
      });

      // E. Handle Incoming Streams
      room.onPeerStream((remoteStream: MediaStream, peerId: string) => {
          console.log("Received stream from:", peerId, remoteStream.id);
          
          setUsers(prev => {
              const userIndex = prev.findIndex(u => u.id === peerId);
              
              if (userIndex === -1) {
                   // If we get stream before presence data, create a temporary placeholder
                   return [...prev, {
                      id: peerId,
                      name: 'Connecting...',
                      avatarUrl: `https://api.dicebear.com/7.x/notionists/svg?seed=${peerId}`,
                      isSpeaking: false,
                      isMuted: false,
                      isVideoOff: false,
                      color: 'bg-gray-200',
                      stream: remoteStream,
                      isLocal: false
                   }];
              }

              const user = prev[userIndex];
              
              if (!user.stream || user.stream.id === remoteStream.id) {
                  const newUsers = [...prev];
                  newUsers[userIndex] = { ...user, stream: remoteStream };
                  return newUsers;
              }
              
              // Check if it's likely a screen share (secondary stream)
              const screenId = `${peerId}-screen`;
              const screenIndex = prev.findIndex(u => u.id === screenId);
              
              if (screenIndex !== -1) {
                  const newUsers = [...prev];
                  newUsers[screenIndex] = { ...newUsers[screenIndex], stream: remoteStream };
                  return newUsers;
              } else {
                  // New Screen Share Stream found
                   return [...prev, {
                      id: screenId,
                      name: `${user.name}'s Screen`,
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
          });
      });

    } catch (err: any) {
      console.error("Connection Error:", err);
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
        setLocalStream(null);
      }
      
      let errorMessage = "Connection failed. Please check your network.";
      if (err?.message) errorMessage = err.message;
      else if (typeof err === 'string') errorMessage = err;
      
      setError(errorMessage);
      setIsLoading(false);
    }
  };

  const createNewRoom = () => {
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    setRoomId(code);
  };

  const handleLeave = () => {
    if (heartbeatRef.current) clearInterval(heartbeatRef.current);
    pendingLeavesRef.current.forEach(timeout => clearTimeout(timeout));
    pendingLeavesRef.current.clear();

    if (roomRef.current) {
        roomRef.current.leave();
    }
    if (localStream) {
      localStream.getTracks().forEach(track => track.stop());
    }
    if (screenStream) {
      screenStream.getTracks().forEach(track => track.stop());
    }
    
    setLocalStream(null);
    setScreenStream(null);
    setConnected(false);
    setShowMusic(false);
    setShowStudyBuddy(false);
    setUsers([]);
    setIsMicOn(true);
    setIsCameraOn(true);
    setIsScreenSharing(false);
    setFocusedUserId(null);
    setShowDecorations(false);
    setShowWhiteboard(false);
    setWhiteboardElements([]);
    setIsLoading(false);
    
    const newUrl = new URL(window.location.href);
    newUrl.searchParams.delete('room');
    window.history.pushState({}, '', newUrl);
  };

  const toggleMic = () => {
    if (localStream) {
      const audioTrack = localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMicOn(audioTrack.enabled);
        
        setUsers(prev => prev.map(u => 
          u.isLocal && !u.isScreenShare ? { ...u, isMuted: !audioTrack.enabled } : u
        ));
        broadcastUpdate({ isMuted: !audioTrack.enabled });
      }
    }
  };

  const toggleCamera = () => {
    if (localStream) {
      const videoTrack = localStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsCameraOn(videoTrack.enabled);

        setUsers(prev => prev.map(u => 
          u.isLocal && !u.isScreenShare ? { ...u, isVideoOff: !videoTrack.enabled } : u
        ));
        broadcastUpdate({ isVideoOff: !videoTrack.enabled });
      }
    }
  };

  const stopScreenShare = () => {
    if (screenStream) {
      screenStream.getTracks().forEach(track => track.stop());
      if (roomRef.current) {
          roomRef.current.removeStream(screenStream);
      }
    }
    setScreenStream(null);
    setIsScreenSharing(false);
    
    setUsers(prev => prev.filter(u => u.id !== `${selfId}-screen`));
    
    if (focusedUserId === `${selfId}-screen`) {
      setFocusedUserId(null);
    }
    
    // Broadcast update that screen is gone
    broadcastUpdate({});
  };

  const handleScreenShare = async () => {
    if (isScreenSharing) {
      stopScreenShare();
    } else {
      try {
        // @ts-ignore
        const stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: false });
        
        setScreenStream(stream);
        setIsScreenSharing(true);

        stream.getVideoTracks()[0].onended = () => {
          stopScreenShare();
        };
        
        if (roomRef.current) {
            roomRef.current.addStream(stream);
        }

        const screenUser: User = {
          id: `${selfId}-screen`,
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
        setShowWhiteboard(false); // Close whiteboard if sharing screen
        
        // Broadcast update with new screen stream ID
        if (sendUpdateRef.current) {
             const me = usersRef.current.find(u => u.isLocal && !u.isScreenShare);
             if (me) {
                 const payload = {
                     user: serializeUser(me),
                     cameraStreamId: localStream?.id,
                     screenStreamId: stream.id,
                     timestamp: Date.now()
                 };
                 sendUpdateRef.current(payload);
             }
        }
        
      } catch (err: any) {
        console.error("Error sharing screen:", err);
        if (err.name !== 'NotAllowedError') {
             alert("Unable to share screen.");
        }
      }
    }
  };

  // --- Desk Item Logic ---

  const handleAddDeskItem = (type: DeskItemType) => {
      let initialData: any = '';
      
      if (type === 'plant') {
        const variants = [
          "https://media.tenor.com/m38BFcQuk0gAAAAi/plant.gif",
          "https://media.tenor.com/xnqIJK2U_oAAAAAi/manidhaya.gif",
          "https://i.pinimg.com/originals/d1/ba/af/d1baaf55865461e4fd5079ae7d80863f.gif"
        ];
        initialData = variants[Math.floor(Math.random() * variants.length)];
      } else if (type === 'coffee') {
        const variants = [
            "https://i.pinimg.com/originals/33/a5/d5/33a5d563b09c60db33a18a6be523c8a6.gif",
            "https://i.pinimg.com/originals/f0/4b/a9/f04ba908d1744c429505ac5239c35e63.gif",
            "https://i.pinimg.com/originals/e9/26/16/e9261611196ebd98b2d76ab0627699a0.gif"
        ];
        initialData = variants[Math.floor(Math.random() * variants.length)];
      } else if (type === 'pet') {
         const variants = [
            "https://media.tenor.com/1YELlhf9ORsAAAAi/waal-boyss-nabilaa.gif",
            "https://i.pinimg.com/originals/e0/71/d5/e071d539ee95b7dcd5c15bee8d0653ad.gif",
            "https://i.pinimg.com/originals/04/86/9e/04869e09851353129379e535502d87e4.gif"
         ];
         initialData = variants[Math.floor(Math.random() * variants.length)];
      }

      const newItem: DeskItem = {
          id: crypto.randomUUID(), 
          type,
          x: 40 + (Math.random() * 20), 
          y: 40 + (Math.random() * 20),
          data: initialData
      };

      setUsers(prev => {
          const userIndex = prev.findIndex(u => u.isLocal && !u.isScreenShare);
          if (userIndex === -1) return prev;
          
          const me = prev[userIndex];
          const newDeskItems = [...(me.deskItems || []), newItem];
          const newUser = { ...me, deskItems: newDeskItems };
          
          const newUsers = [...prev];
          newUsers[userIndex] = newUser;
          
          broadcastUpdate({ deskItems: newDeskItems });
          
          return newUsers;
      });
  };

  const handleUpdateDeskItem = (userId: string, itemId: string, updates: Partial<DeskItem>) => {
      setUsers(prev => {
          const userIndex = prev.findIndex(u => u.id === userId && u.isLocal);
          if (userIndex === -1) return prev;

          const me = prev[userIndex];
          const newDeskItems = me.deskItems?.map(item => 
              item.id === itemId ? { ...item, ...updates } : item
          ) || [];

          const newUser = { ...me, deskItems: newDeskItems };
          const newUsers = [...prev];
          newUsers[userIndex] = newUser;

          broadcastUpdate({ deskItems: newDeskItems });
          
          return newUsers;
      });
  };

  const handleRemoveDeskItem = (userId: string, itemId: string) => {
     setUsers(prev => {
          const userIndex = prev.findIndex(u => u.id === userId && u.isLocal);
          if (userIndex === -1) return prev;

          const me = prev[userIndex];
          const newDeskItems = me.deskItems?.filter(item => item.id !== itemId) || [];

          const newUser = { ...me, deskItems: newDeskItems };
          const newUsers = [...prev];
          newUsers[userIndex] = newUser;
          
          broadcastUpdate({ deskItems: newDeskItems });
          
          return newUsers;
     });
  };

  const toggleWhiteboard = () => {
      if (showWhiteboard) {
          setShowWhiteboard(false);
          setFocusedUserId(null);
      } else {
          setShowWhiteboard(true);
          setFocusedUserId(null); // Clear focus to allow custom stage to take over
          if (isScreenSharing) {
              stopScreenShare();
          }
      }
  };

  // Login Screen
  if (!connected) {
    return (
      <BackgroundWrapper>
        <div className="flex flex-col items-center justify-center h-screen w-full p-4 relative z-20">
          <FloatyDecorations />
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="w-full max-w-md bg-white/40 backdrop-blur-xl p-8 md:p-10 rounded-[2.5rem] shadow-2xl border border-white/60 relative overflow-hidden"
          >
             <div className="absolute -top-20 -right-20 w-40 h-40 bg-purple-300 rounded-full blur-3xl opacity-30" />
             <div className="absolute -bottom-20 -left-20 w-40 h-40 bg-pink-300 rounded-full blur-3xl opacity-30" />

            <div className="relative z-10">
              <div className="text-center mb-8">
                <h1 className="text-4xl md:text-5xl font-display font-bold text-slate-700 mb-2 tracking-tight">
                  Cozy<span className="text-purple-500">Corner</span>
                </h1>
                <p className="text-slate-600 font-medium">
                  A soft space to dream together.
                </p>
              </div>

              <form onSubmit={handleConnect} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-sm font-bold text-slate-500 ml-2">Display Name</label>
                  <input 
                    type="text" 
                    value={userName}
                    onChange={(e) => setUserName(e.target.value)}
                    placeholder="e.g. Luna"
                    className="w-full bg-white/50 border border-white focus:border-purple-300 focus:ring-4 focus:ring-purple-100 rounded-2xl px-5 py-3 outline-none text-slate-700 placeholder:text-slate-400 transition-all font-bold"
                  />
                </div>
                
                <div className="space-y-1">
                   <div className="flex justify-between items-center ml-2">
                       <label className="text-sm font-bold text-slate-500">Room ID</label>
                   </div>
                   <div className="relative">
                       <input 
                          type="text" 
                          value={roomId}
                          onChange={(e) => setRoomId(e.target.value)}
                          placeholder="e.g. 123456"
                          className="w-full bg-white/50 border border-white focus:border-purple-300 focus:ring-4 focus:ring-purple-100 rounded-2xl px-5 py-3 outline-none text-slate-700 placeholder:text-slate-400 transition-all font-bold pr-10"
                        />
                   </div>
                </div>

                <div className="flex justify-end">
                     <button 
                        type="button" 
                        onClick={createNewRoom}
                        className="text-xs font-bold text-purple-600 hover:text-purple-800 flex items-center gap-1 transition-colors"
                     >
                        <Sparkles size={12} />
                        Create a new space
                     </button>
                </div>

                {error && (
                  <div className="bg-red-50 text-red-500 text-sm p-3 rounded-xl font-bold">
                    {error}
                  </div>
                )}

                <motion.button
                  type="submit"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  disabled={isLoading}
                  className="w-full bg-slate-800 text-white px-8 py-4 rounded-2xl font-bold text-lg shadow-lg hover:shadow-xl hover:bg-slate-700 transition-all flex items-center justify-center gap-2 mt-4"
                >
                  {isLoading ? (
                    <Loader2 className="animate-spin" />
                  ) : (
                    <>
                      Join Room <ArrowRight size={20} />
                    </>
                  )}
                </motion.button>
              </form>
            </div>
          </motion.div>
        </div>
      </BackgroundWrapper>
    );
  }

  // Active Room
  return (
    <BackgroundWrapper>
      <div className="relative h-screen w-full flex flex-col overflow-hidden">
        {/* Top Bar / Timer */}
        <AnimatePresence>
            {showTimer && <PomodoroTimer />}
        </AnimatePresence>
        
        {/* Room Title */}
        <div className="absolute top-6 right-6 md:left-1/2 md:-translate-x-1/2 md:right-auto z-40 bg-white/30 backdrop-blur-sm px-5 py-2 rounded-full border border-white/40 shadow-sm flex items-center gap-4 transition-all hover:bg-white/50">
             <h2 className="text-slate-700 font-bold flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${connected ? 'bg-green-400 animate-pulse' : 'bg-yellow-400'}`} />
                {roomId || "Lofi Room"}
             </h2>

             <div className="w-px h-4 bg-slate-400/50" />

             <div className="flex items-center gap-1.5 text-slate-600 font-bold text-sm" title="Users online">
                <Users size={14} className="text-slate-500" />
                <motion.span 
                  key={users.length}
                  initial={{ y: -5, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ type: "spring", stiffness: 300, damping: 20 }}
                >
                  {users.length}
                </motion.span>
             </div>
        </div>

        <FloatyDecorations />

        {/* Global Desk Items Layer */}
        <div className="absolute inset-0 z-20 pointer-events-none overflow-hidden">
             <AnimatePresence>
                {users.flatMap(user => 
                   (user.deskItems || []).map(item => (
                       <DraggableDeskItem
                          key={item.id} // IMPORTANT: Stable Key!
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

        {/* Floating Widgets */}
        <AnimatePresence>
            {showMusic && <MusicPlayer onClose={() => setShowMusic(false)} />}
        </AnimatePresence>
        <AnimatePresence>
            {showStudyBuddy && <StudyBuddy onClose={() => setShowStudyBuddy(false)} />}
        </AnimatePresence>
        
        <AnimatePresence>
            {showDecorations && (
                <ItemPalette 
                    onClose={() => setShowDecorations(false)}
                    onSelect={handleAddDeskItem}
                />
            )}
        </AnimatePresence>

        {/* Main Content Area */}
        <div className={`flex-1 flex flex-col relative z-10 overflow-hidden transition-all duration-500 ${focusedUserId || showWhiteboard ? 'pt-14 pb-0' : 'pt-20 pb-32'}`}>
          <VideoGrid 
            users={users} 
            focusedUserId={focusedUserId}
            onFocusUser={(id) => {
                if (id) setShowWhiteboard(false);
                setFocusedUserId(id);
            }}
            customStage={showWhiteboard ? (
                <Whiteboard 
                    elements={whiteboardElements} 
                    onUpdate={handleWhiteboardAction} 
                    currentUser={selfId}
                />
            ) : undefined}
          />
        </div>

        {/* Bottom Dock */}
        <ControlDock 
            onLeave={handleLeave} 
            toggleMusic={() => setShowMusic(!showMusic)}
            toggleStudyBuddy={() => setShowStudyBuddy(!showStudyBuddy)}
            toggleTimer={() => setShowTimer(!showTimer)}
            toggleDecorations={() => setShowDecorations(!showDecorations)}
            toggleWhiteboard={toggleWhiteboard}
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
