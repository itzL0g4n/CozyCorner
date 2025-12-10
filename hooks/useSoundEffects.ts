
import { useState, useRef, useEffect, useCallback } from 'react';
import { SOUND_ASSETS } from '../constants';

type SoundKey = 'glass' | 'on' | 'off' | 'hover' | 'chime' | keyof typeof SOUND_ASSETS;

export const useSoundEffects = () => {
  const [isMuted, setIsMuted] = useState(false);
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioBuffersRef = useRef<Record<string, AudioBuffer>>({});
  const activeSourcesRef = useRef<Record<string, AudioBufferSourceNode>>({}); 
  const gainNodeRef = useRef<GainNode | null>(null);

  // Initialize and Load Immediately on Mount
  useEffect(() => {
    const init = async () => {
        // Create context immediately (it will be in 'suspended' state)
        const Ctx = window.AudioContext || (window as any).webkitAudioContext;
        if (!Ctx) return;

        const ctx = new Ctx();
        audioContextRef.current = ctx;
        
        const mainGain = ctx.createGain();
        mainGain.connect(ctx.destination);
        gainNodeRef.current = mainGain;

        // Load all assets in background
        for (const [key, url] of Object.entries(SOUND_ASSETS)) {
            try {
                const response = await fetch(url, { mode: 'cors' });
                const arrayBuffer = await response.arrayBuffer();
                // Decode can happen even if context is suspended
                const audioBuffer = await ctx.decodeAudioData(arrayBuffer);
                audioBuffersRef.current[key] = audioBuffer;
            } catch (error) {
                console.warn(`Failed to load sound ${key}:`, error);
            }
        }
    };

    init();

    return () => {
        audioContextRef.current?.close();
    };
  }, []);

  // Call this on user interaction to unlock audio
  const initAudio = useCallback(() => {
     if (audioContextRef.current?.state === 'suspended') {
         audioContextRef.current.resume().catch(e => console.error("Audio resume failed", e));
     }
  }, []);

  // Synthesizer for UI sounds (No fetch needed, always ready)
  const playSynthSound = useCallback((type: 'glass' | 'on' | 'off' | 'hover' | 'chime') => {
    if (!audioContextRef.current || isMuted) return;
    const ctx = audioContextRef.current;
    
    // Ensure we are running
    if (ctx.state === 'suspended') ctx.resume();

    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.connect(gain);
    gain.connect(gainNodeRef.current || ctx.destination);

    if (type === 'glass') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(800, t);
      osc.frequency.exponentialRampToValueAtTime(1200, t + 0.05);
      gain.gain.setValueAtTime(0.3, t); // Lower volume
      gain.gain.exponentialRampToValueAtTime(0.01, t + 0.1);
      osc.start(t);
      osc.stop(t + 0.1);
    } 
    else if (type === 'on') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(400, t);
      osc.frequency.linearRampToValueAtTime(600, t + 0.1);
      gain.gain.setValueAtTime(0.1, t);
      gain.gain.linearRampToValueAtTime(0, t + 0.1);
      osc.start(t);
      osc.stop(t + 0.1);
    }
    else if (type === 'off') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(400, t);
      osc.frequency.linearRampToValueAtTime(200, t + 0.1);
      gain.gain.setValueAtTime(0.1, t);
      gain.gain.linearRampToValueAtTime(0, t + 0.1);
      osc.start(t);
      osc.stop(t + 0.1);
    }
    else if (type === 'hover') {
       osc.type = 'triangle';
       osc.frequency.setValueAtTime(300, t);
       gain.gain.setValueAtTime(0.02, t);
       gain.gain.exponentialRampToValueAtTime(0.001, t + 0.03);
       osc.start(t);
       osc.stop(t + 0.03);
    }
    else if (type === 'chime') {
        const freqs = [523.25, 659.25, 783.99]; // C Major
        freqs.forEach((f, i) => {
            const o = ctx.createOscillator();
            const g = ctx.createGain();
            o.connect(g);
            g.connect(gainNodeRef.current || ctx.destination);
            o.type = 'sine';
            o.frequency.value = f;
            g.gain.setValueAtTime(0.05, t);
            g.gain.exponentialRampToValueAtTime(0.001, t + 1.5 + (i * 0.1));
            o.start(t);
            o.stop(t + 2);
        });
    }
  }, [isMuted]);

  const playSound = useCallback((key: SoundKey) => {
    // Ensure audio is unlocked
    initAudio(); 
    
    if (isMuted) return;

    // UI Sounds -> Synth
    if (['glass', 'on', 'off', 'hover', 'chime'].includes(key as string)) {
        playSynthSound(key as any);
        return;
    }

    // Buffered Assets
    const buffer = audioBuffersRef.current[key];
    if (buffer && audioContextRef.current) {
        const source = audioContextRef.current.createBufferSource();
        source.buffer = buffer;
        source.connect(gainNodeRef.current || audioContextRef.current.destination);
        source.start();
    } else {
        // Silent fail or loading
        // console.log(`Sound ${key} not ready yet.`);
    }
  }, [isMuted, playSynthSound, initAudio]);

  const playLoop = useCallback((key: string) => {
      initAudio();
      if (isMuted || !audioContextRef.current) return;
      
      // Don't start if already playing
      if (activeSourcesRef.current[key]) return;

      const buffer = audioBuffersRef.current[key];
      if (buffer) {
          const source = audioContextRef.current.createBufferSource();
          source.buffer = buffer;
          source.loop = true;
          source.connect(gainNodeRef.current || audioContextRef.current.destination);
          source.start();
          activeSourcesRef.current[key] = source;
      }
  }, [isMuted, initAudio]);

  const stopLoop = useCallback((key: string) => {
      const source = activeSourcesRef.current[key];
      if (source) {
          try {
            source.stop();
            source.disconnect();
          } catch(e) {
              // Ignore if already stopped
          }
          delete activeSourcesRef.current[key];
      }
  }, []);

  const toggleMute = useCallback(() => {
    setIsMuted(prev => !prev);
  }, []);

  return { playSound, playLoop, stopLoop, isMuted, toggleMute, initAudio };
};
