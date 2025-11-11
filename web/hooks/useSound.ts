import { useCallback, useRef, useState } from 'react';

export type SoundType =
  | 'messageSent'
  | 'messageReceived'
  | 'serviceComplete'
  | 'serviceError'
  | 'notification'
  | 'success';

interface SoundConfig {
  enabled: boolean;
  volume: number; // 0.0 to 1.0
}

export function useSound() {
  const audioContextRef = useRef<AudioContext | null>(null);
  const [config, setConfig] = useState<SoundConfig>({
    enabled: true,
    volume: 0.3,
  });

  // Initialize AudioContext on first use (requires user interaction)
  const initAudioContext = useCallback(() => {
    if (!audioContextRef.current && typeof window !== 'undefined') {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    return audioContextRef.current;
  }, []);

  // Play a tone with specified frequency and duration
  const playTone = useCallback((frequency: number, duration: number, type: OscillatorType = 'sine') => {
    if (!config.enabled) return;

    const audioContext = initAudioContext();
    if (!audioContext) return;

    try {
      // Create oscillator for tone generation
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      // Configure oscillator
      oscillator.type = type;
      oscillator.frequency.value = frequency;

      // Configure gain (volume) with fade out
      gainNode.gain.setValueAtTime(config.volume, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + duration);

      // Play the tone
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + duration);
    } catch (err) {
      console.warn('Failed to play sound:', err);
    }
  }, [config.enabled, config.volume, initAudioContext]);

  // Play a chord (multiple frequencies simultaneously)
  const playChord = useCallback((frequencies: number[], duration: number) => {
    frequencies.forEach((freq) => playTone(freq, duration, 'sine'));
  }, [playTone]);

  // Predefined sound effects
  const play = useCallback((soundType: SoundType) => {
    switch (soundType) {
      case 'messageSent':
        // Ascending tone: C5 -> E5 (sending message)
        playTone(523, 0.08);
        setTimeout(() => playTone(659, 0.08), 60);
        break;

      case 'messageReceived':
        // Descending tone: G5 -> D5 (receiving message)
        playTone(784, 0.08);
        setTimeout(() => playTone(587, 0.12), 60);
        break;

      case 'serviceComplete':
        // Success chord: C5 + E5 + G5 (major triad)
        playChord([523, 659, 784], 0.2);
        break;

      case 'serviceError':
        // Error tone: Low C3 with vibrato
        playTone(131, 0.3, 'square');
        break;

      case 'notification':
        // Single pleasant tone: A5
        playTone(880, 0.15);
        break;

      case 'success':
        // Quick ascending arpeggio: C5 -> E5 -> G5
        playTone(523, 0.08);
        setTimeout(() => playTone(659, 0.08), 50);
        setTimeout(() => playTone(784, 0.12), 100);
        break;

      default:
        break;
    }
  }, [playTone, playChord]);

  // Toggle sound on/off
  const toggleSound = useCallback(() => {
    setConfig((prev) => ({ ...prev, enabled: !prev.enabled }));
  }, []);

  // Set volume (0.0 to 1.0)
  const setVolume = useCallback((volume: number) => {
    setConfig((prev) => ({ ...prev, volume: Math.max(0, Math.min(1, volume)) }));
  }, []);

  return {
    play,
    enabled: config.enabled,
    volume: config.volume,
    toggleSound,
    setVolume,
  };
}
