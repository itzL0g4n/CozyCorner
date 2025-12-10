
import { useState, useRef, useEffect, useCallback } from 'react';
import { SOUND_ASSETS } from '../constants';

type SoundKey = 'glass' | 'on' | 'off' | 'hover' | 'chime' | keyof typeof SOUND_ASSETS;

export const useSoundEffects = () => {
  const [isMuted, setIsMuted] = useState(false);
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioBuffersRef = useRef<Record<string, AudioBuffer>>({});
  const gainNodeRef = useRef<GainNode | null>(null);

  // Initialize Audio Context (lazy load on first interaction usually)
  const initAudio = useCallback(() => {
    if (!audioContextRef.current) {
      const Ctx = window.AudioContext || (window as any).webkitAudioContext;
      if (Ctx) {
        audioContextRef.current = new Ctx();
        gainNodeRef.current = audioContextRef.current.createGain();
        gainNodeRef.current.connect(audioContextRef.current.destination);
      }
    }
    if (audioContextRef.current?.state === 'suspended') {
      audioContextRef.current.resume();
    }
  }, []);

  // Preload file-based assets
  useEffect(() => {
    const loadSounds = async () => {
        if (!window.AudioContext && !(window as any).webkitAudioContext) return;
        
        // We create a temp context just to decode if the main one isn't ready, 
        // or just wait for init. Let's try to load when init happens or just keep URLs for Audio elements?
        // Actually, mixing AudioContext synth and HTML5 Audio elements is fine.
        // Let's stick to HTML5 Audio for the files (cat, water) as they are easier to handle for long samples,
        // and Web Audio Synth for UI.
    };
    loadSounds();
  }, []);

  // Synthesizer Functions
  const playSynthSound = useCallback((type: 'glass' | 'on' | 'off' | 'hover' | 'chime') => {
    if (!audioContextRef.current || isMuted) return;
    const ctx = audioContextRef.current;
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.connect(gain);
    gain.connect(gainNodeRef.current || ctx.destination);

    if (type === 'glass') {
      // Glass Knock: High pitch sine, very short decay
      osc.type = 'sine';
      osc.frequency.setValueAtTime(800, t);
      osc.frequency.exponentialRampToValueAtTime(1200, t + 0.05);
      gain.gain.setValueAtTime(0.5, t);
      gain.gain.exponentialRampToValueAtTime(0.01, t + 0.1);
      osc.start(t);
      osc.stop(t + 0.1);
    } 
    else if (type === 'on') {
      // High Bloop: Slide Up
      osc.type = 'sine';
      osc.frequency.setValueAtTime(400, t);
      osc.frequency.linearRampToValueAtTime(600, t + 0.1);
      gain.gain.setValueAtTime(0.2, t);
      gain.gain.linearRampToValueAtTime(0, t + 0.1);
      osc.start(t);
      osc.stop(t + 0.1);
    }
    else if (type === 'off') {
      // Low Bloop: Slide Down
      osc.type = 'sine';
      osc.frequency.setValueAtTime(400, t);
      osc.frequency.linearRampToValueAtTime(200, t + 0.1);
      gain.gain.setValueAtTime(0.2, t);
      gain.gain.linearRampToValueAtTime(0, t + 0.1);
      osc.start(t);
      osc.stop(t + 0.1);
    }
    else if (type === 'hover') {
       // Subtle Pop
       osc.type = 'triangle';
       osc.frequency.setValueAtTime(300, t);
       gain.gain.setValueAtTime(0.05, t);
       gain.gain.exponentialRampToValueAtTime(0.001, t + 0.03);
       osc.start(t);
       osc.stop(t + 0.03);
    }
    else if (type === 'chime') {
        // Major Triad
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
        return; // Early return as we handled it manually
    }
  }, [isMuted]);

  const playSound = useCallback((key: SoundKey) => {
    // Ensure context is running (browser policy)
    initAudio();
    if (isMuted) return;

    // UI Sounds -> Synth
    if (['glass', 'on', 'off', 'hover', 'chime'].includes(key as string)) {
        playSynthSound(key as any);
        return;
    }

    // Asset Sounds -> HTML5 Audio
    const url = SOUND_ASSETS[key as keyof typeof SOUND_ASSETS];
    if (url) {
        const audio = new Audio(url);
        audio.volume = 0.5;
        audio.play().catch(e => console.warn("Audio play failed", e));
    }
  }, [isMuted, playSynthSound, initAudio]);

  const toggleMute = useCallback(() => {
    setIsMuted(prev => !prev);
  }, []);

  return { playSound, isMuted, toggleMute, initAudio };
};
