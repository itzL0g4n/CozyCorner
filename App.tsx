
import React, { useState, useEffect } from 'react';
import { BackgroundWrapper } from './components/BackgroundWrapper';
import { VideoGrid } from './components/VideoGrid';
import { ControlDock } from './components/ControlDock';
import { FloatyDecorations } from './components/FloatyDecorations';
import { PomodoroTimer } from './components/PomodoroTimer';
import { MusicPlayer } from './components/MusicPlayer';
import { StudyBuddy } from './components/StudyBuddy';
import { ItemPalette } from './components/ItemPalette';
import { DraggableDeskItem } from './components/DeskItems';
import { MOCK_USERS } from './constants';
import { User, DeskItem, DeskItemType } from './types';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, ArrowRight, Loader2, Sparkles, Plus } from 'lucide-react';

const App: React.FC = () => {
  const [connected, setConnected] = useState(false);
  const [showMusic, setShowMusic] = useState(false);
  const [showStudyBuddy, setShowStudyBuddy] = useState(false);
  const [showTimer, setShowTimer] = useState(true);
  const [showDecorations, setShowDecorations] = useState(false);
  
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

  // Layout State
  const [focusedUserId, setFocusedUserId] = useState<string | null>(null);

  // On Mount: Check for Room ID in URL
  useEffect(() => {
    // Wrap in try-catch as accessing window.location in some frames might be restricted
    try {
      const params = new URLSearchParams(window.location.search);
      const roomParam = params.get('room');
      if (roomParam) {
        setRoomId(roomParam);
      }
    } catch (e) {
      console.warn("Could not read URL parameters", e);
    }
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
      microphone = audioContext.createMediaStreamSource(localStream);
      microphone.connect(analyser);

      analyser.fftSize = 256;
      const dataArray = new Uint8Array(analyser.frequencyBinCount);

      const checkAudioLevel = () => {
        if (!isMicOn) {
          if (wasSpeaking) {
             wasSpeaking = false;
             setUsers(prev => prev.map(u => u.isLocal && !u.isScreenShare ? { ...u, isSpeaking: false } : u));
          }
          animationFrameId = requestAnimationFrame(checkAudioLevel);
          return;
        }

        if (analyser) {
          analyser.getByteFrequencyData(dataArray);
          
          // Calculate average volume
          let sum = 0;
          for (let i = 0; i < dataArray.length; i++) {
            sum += dataArray[i];
          }
          const average = sum / dataArray.length;
          
          // Threshold for "speaking" - Increased to 25 to reduce background noise sensitivity
          const isSpeaking = average > 25; 

          if (isSpeaking !== wasSpeaking) {
            wasSpeaking = isSpeaking;
            setUsers(prev => prev.map(u => u.isLocal && !u.isScreenShare ? { ...u, isSpeaking } : u));
          }
        }
        
        animationFrameId = requestAnimationFrame(checkAudioLevel);
      };

      checkAudioLevel();

    } catch (err) {
      console.error("Error initializing audio context:", err);
    }

    return () => {
      cancelAnimationFrame(animationFrameId);
      if (microphone) microphone.disconnect();
      if (audioContext && audioContext.state !== 'closed') audioContext.close();
    };
  }, [localStream, isMicOn, connected]);


  // Handle Join Room
  const handleConnect = async (e: React.FormEvent) => {
    e.preventDefault();
    if(!roomId.trim() || !userName.trim()) return;

    setIsLoading(true);
    setError('');

    try {
      // 1. Get Camera/Mic Permissions
      // We request them here. If it fails, we catch the error below.
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true
      });

      setLocalStream(stream);

      // 2. Create the "Me" user
      const localUser: User = {
        id: 'local-user',
        name: userName,
        avatarUrl: `https://api.dicebear.com/7.x/notionists/svg?seed=${userName}`, // Generate avatar from name
        isSpeaking: false,
        isMuted: false,
        isVideoOff: false,
        color: 'bg-purple-200',
        stream: stream,
        isLocal: true,
        deskItems: [] // Start empty
      };

      // 3. Merge with mock users (Now empty, so just me)
      setUsers([localUser, ...MOCK_USERS]);
      setConnected(true);
      
      // 4. Update URL so users can share it
      // Wrap in try-catch because pushState fails in blob/iframe sandboxes
      try {
        const newUrl = new URL(window.location.href);
        newUrl.searchParams.set('room', roomId);
        window.history.pushState({}, '', newUrl);
      } catch (urlError) {
        console.warn("Could not update URL (likely due to sandbox environment):", urlError);
      }
      
      // Auto open music for vibes
      setTimeout(() => setShowMusic(true), 1000);

    } catch (err: any) {
      console.error("Error accessing media devices:", err);
      // More specific error messages
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setError("Camera/Microphone access denied. Please allow permissions to join.");
      } else if (err.name === 'NotFoundError') {
        setError("No camera or microphone found on this device.");
      } else {
        setError("Could not start video. Please check your settings.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const createNewRoom = () => {
    // Generate a cute random room ID
    const adjectives = ['cozy', 'chill', 'dreamy', 'soft', 'quiet', 'warm'];
    const nouns = ['nook', 'cafe', 'cloud', 'corner', 'study', 'loft'];
    const randomAdjective = adjectives[Math.floor(Math.random() * adjectives.length)];
    const randomNoun = nouns[Math.floor(Math.random() * nouns.length)];
    const randomNum = Math.floor(Math.random() * 1000);
    
    setRoomId(`${randomAdjective}-${randomNoun}-${randomNum}`);
  };

  const handleLeave = () => {
    // Stop all tracks
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
  };

  const toggleMic = () => {
    if (localStream) {
      const audioTrack = localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMicOn(audioTrack.enabled);
        
        // Update local user state in the grid
        setUsers(prev => prev.map(u => 
          u.isLocal && !u.isScreenShare ? { ...u, isMuted: !audioTrack.enabled } : u
        ));
      }
    }
  };

  const toggleCamera = () => {
    if (localStream) {
      const videoTrack = localStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsCameraOn(videoTrack.enabled);

        // Update local user state so grid shows avatar instead of black screen
        setUsers(prev => prev.map(u => 
          u.isLocal && !u.isScreenShare ? { ...u, isVideoOff: !videoTrack.enabled } : u
        ));
      }
    }
  };

  // Stop screen sharing helper
  const stopScreenShare = () => {
    if (screenStream) {
      screenStream.getTracks().forEach(track => track.stop());
    }
    setScreenStream(null);
    setIsScreenSharing(false);
    
    // Remove screen share user from grid
    setUsers(prev => prev.filter(u => u.id !== 'local-screen'));
    
    // If we were focused on the screen share, unfocus
    if (focusedUserId === 'local-screen') {
      setFocusedUserId(null);
    }
  };

  const handleScreenShare = async () => {
    if (isScreenSharing) {
      stopScreenShare();
    } else {
      try {
        // @ts-ignore - getDisplayMedia exists
        const stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: false });
        
        setScreenStream(stream);
        setIsScreenSharing(true);

        // Detect if user stops sharing via the browser native UI
        stream.getVideoTracks()[0].onended = () => {
          stopScreenShare();
        };

        const screenUser: User = {
          id: 'local-screen',
          name: `${userName}'s Screen`,
          avatarUrl: '', // Not used for screen share
          isSpeaking: false,
          isMuted: true,
          isVideoOff: false,
          isScreenShare: true,
          color: 'bg-blue-100',
          stream: stream,
          isLocal: true
        };

        setUsers(prev => [...prev, screenUser]);
        
        // Auto-focus the new screen share
        setFocusedUserId('local-screen');
        
      } catch (err: any) {
        console.error("Error sharing screen:", err);
        // Don't show alert if user simply cancelled the dialog
        if (err.name !== 'NotAllowedError') {
             alert("Unable to share screen. This feature may not be supported in this environment.");
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
          id: Date.now().toString(),
          type,
          x: 40 + (Math.random() * 20), // Center-ish random screen coords
          y: 40 + (Math.random() * 20),
          data: initialData
      };

      setUsers(prev => prev.map(u => {
          if (u.isLocal && !u.isScreenShare) {
              return { ...u, deskItems: [...(u.deskItems || []), newItem] };
          }
          return u;
      }));
  };

  const handleUpdateDeskItem = (userId: string, itemId: string, data: any) => {
      // Only allow updating if it's the local user
      setUsers(prev => prev.map(u => {
          if (u.id === userId && u.isLocal) {
              return {
                  ...u,
                  deskItems: u.deskItems?.map(item => item.id === itemId ? { ...item, data } : item)
              };
          }
          return u;
      }));
  };

  const handleRemoveDeskItem = (userId: string, itemId: string) => {
     setUsers(prev => prev.map(u => {
          if (u.id === userId && u.isLocal) {
              return {
                  ...u,
                  deskItems: u.deskItems?.filter(item => item.id !== itemId)
              };
          }
          return u;
     }));
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
             {/* Decorative blob behind form */}
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
                          placeholder="e.g. chill-beats"
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
                <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                {roomId || "Lofi Room"}
             </h2>

             {/* Divider */}
             <div className="w-px h-4 bg-slate-400/50" />

             {/* User Count */}
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

        {/* Ambient Decorations */}
        <FloatyDecorations />

        {/* Global Desk Items Layer - Renders above video but below modals/dock */}
        <div className="absolute inset-0 z-20 pointer-events-none overflow-hidden">
             <AnimatePresence>
                {users.flatMap(user => 
                   (user.deskItems || []).map(item => (
                       <DraggableDeskItem
                          key={item.id}
                          item={item}
                          // Only allow editing own items (excluding screen shares)
                          isEditable={!!user.isLocal && !user.isScreenShare}
                          // Since items are global, containerRef is undefined to allow full screen dragging
                          containerRef={undefined} 
                          onUpdate={(id, data) => handleUpdateDeskItem(user.id, id, data)}
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
        
        {/* Item Palette */}
        <AnimatePresence>
            {showDecorations && (
                <ItemPalette 
                    onClose={() => setShowDecorations(false)}
                    onSelect={handleAddDeskItem}
                />
            )}
        </AnimatePresence>

        {/* Main Content Area */}
        <div className={`flex-1 flex flex-col relative z-10 overflow-hidden transition-all duration-500 ${focusedUserId ? 'pt-14 pb-0' : 'pt-20 pb-32'}`}>
          <VideoGrid 
            users={users} 
            focusedUserId={focusedUserId}
            onFocusUser={setFocusedUserId}
          />
        </div>

        {/* Bottom Dock */}
        <ControlDock 
            onLeave={handleLeave} 
            toggleMusic={() => setShowMusic(!showMusic)}
            toggleStudyBuddy={() => setShowStudyBuddy(!showStudyBuddy)}
            toggleTimer={() => setShowTimer(!showTimer)}
            toggleDecorations={() => setShowDecorations(!showDecorations)}
            isMusicOpen={showMusic}
            isStudyBuddyOpen={showStudyBuddy}
            isTimerOpen={showTimer}
            isDecorationsOpen={showDecorations}
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
