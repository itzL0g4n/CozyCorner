
import { useState, useRef, useEffect, useCallback } from 'react';
import { SOUND_ASSETS } from '../constants';

type SoundKey = 'glass' | 'on' | 'off' | 'hover' | 'chime' | keyof typeof SOUND_ASSETS;

export const useSoundEffects = () => {
  const [isMuted, setIsMuted] = useState(false);
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioBuffersRef = useRef<Record<string, AudioBuffer>>({});
  const activeSourcesRef = useRef<Record<string, AudioBufferSourceNode>>({}); // For loops
  const gainNodeRef = useRef<GainNode | null>(null);

  // Initialize Audio Context
  const initAudio = useCallback(() => {
    if (!audioContextRef.current) {
      const Ctx = window.AudioContext || (window as any).webkitAudioContext;
      if (Ctx) {
        audioContextRef.current = new Ctx();
        gainNodeRef.current = audioContextRef.current.createGain();
        gainNodeRef.current.connect(audioContextRef.current.destination);
        
        // Load assets once context is created
        loadAssets();
      }
    }
    if (audioContextRef.current?.state === 'suspended') {
      audioContextRef.current.resume();
    }
  }, []);

  const loadAssets = async () => {
    if (!audioContextRef.current) return;
    
    // Iterate over constants and fetch them
    for (const [key, url] of Object.entries(SOUND_ASSETS)) {
        try {
            const response = await fetch(url);
            const arrayBuffer = await response.arrayBuffer();
            const audioBuffer = await audioContextRef.current.decodeAudioData(arrayBuffer);
            audioBuffersRef.current[key] = audioBuffer;
            console.log(`Loaded sound: ${key}`);
        } catch (error) {
            console.warn(`Failed to load sound ${key}:`, error);
        }
    }
  };

  // Synthesizer for UI sounds
  const playSynthSound = useCallback((type: 'glass' | 'on' | 'off' | 'hover' | 'chime') => {
    if (!audioContextRef.current || isMuted) return;
    const ctx = audioContextRef.current;
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.connect(gain);
    gain.connect(gainNodeRef.current || ctx.destination);

    if (type === 'glass') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(800, t);
      osc.frequency.exponentialRampToValueAtTime(1200, t + 0.05);
      gain.gain.setValueAtTime(0.5, t);
      gain.gain.exponentialRampToValueAtTime(0.01, t + 0.1);
      osc.start(t);
      osc.stop(t + 0.1);
    } 
    else if (type === 'on') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(400, t);
      osc.frequency.linearRampToValueAtTime(600, t + 0.1);
      gain.gain.setValueAtTime(0.2, t);
      gain.gain.linearRampToValueAtTime(0, t + 0.1);
      osc.start(t);
      osc.stop(t + 0.1);
    }
    else if (type === 'off') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(400, t);
      osc.frequency.linearRampToValueAtTime(200, t + 0.1);
      gain.gain.setValueAtTime(0.2, t);
      gain.gain.linearRampToValueAtTime(0, t + 0.1);
      osc.start(t);
      osc.stop(t + 0.1);
    }
    else if (type === 'hover') {
       osc.type = 'triangle';
       osc.frequency.setValueAtTime(300, t);
       gain.gain.setValueAtTime(0.05, t);
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
            g.gain.setValueAtTime(0.1, t);
            g.gain.exponentialRampToValueAtTime(0.001, t + 1.5 + (i * 0.1));
            o.start(t);
            o.stop(t + 2);
        });
    }
  }, [isMuted]);

  const playSound = useCallback((key: SoundKey) => {
    initAudio(); // Ensure context is ready
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
        // Fallback or still loading
        console.log(`Sound ${key} not ready or missing.`);
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
          source.stop();
          source.disconnect();
          delete activeSourcesRef.current[key];
      }
  }, []);

  const toggleMute = useCallback(() => {
    setIsMuted(prev => !prev);
  }, []);

  // Preload on mount if possible
  useEffect(() => {
      // Try to init context if user has interacted before (optional optimization)
      if (window.AudioContext || (window as any).webkitAudioContext) {
          initAudio();
      }
  }, [initAudio]);

  return { playSound, playLoop, stopLoop, isMuted, toggleMute, initAudio };
};
