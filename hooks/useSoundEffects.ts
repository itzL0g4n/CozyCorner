import { useState, useRef, useEffect, useCallback } from 'react';
import { SOUND_ASSETS } from '../constants';

type SoundKey = keyof typeof SOUND_ASSETS;

export const useSoundEffects = () => {
  const [isMuted, setIsMuted] = useState(false);
  const audioRefs = useRef<Record<string, HTMLAudioElement>>({});

  useEffect(() => {
    // Preload sounds
    Object.entries(SOUND_ASSETS).forEach(([key, url]) => {
      const audio = new Audio(url);
      audio.volume = 0.4; // Default volume
      audioRefs.current[key] = audio;
    });
  }, []);

  const playSound = useCallback((key: SoundKey) => {
    if (isMuted) return;
    
    const audio = audioRefs.current[key];
    if (audio) {
      // Reset time to allow rapid re-playing
      audio.currentTime = 0;
      // Randomize pitch slightly for organic feel
      // Note: playbackRate changes pitch and speed. 
      // For UI sounds, slight variation makes it less repetitive.
      // audio.playbackRate = 0.95 + Math.random() * 0.1; 
      
      audio.play().catch(e => {
        // Auto-play policies might block this if not triggered by user interaction
        console.warn("Sound play prevented:", e);
      });
    }
  }, [isMuted]);

  const toggleMute = useCallback(() => {
    setIsMuted(prev => !prev);
  }, []);

  return { playSound, isMuted, toggleMute };
};
