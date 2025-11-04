'use client';

import * as Tone from 'tone';

class SoundManager {
  private synth: Tone.Synth | null = null;
  private reverb: Tone.Reverb | null = null;
  private volume: Tone.Volume | null = null;
  private player: Tone.Player | null = null;
  private isInitialized = false;
  private isMuted = true; // Start muted by default

  async initialize() {
    if (this.isInitialized) return;

    try {
      await Tone.start();

      // Create reverb effect
      this.reverb = new Tone.Reverb({
        decay: 2.5,
        wet: 0.3,
      }).toDestination();

      // Create volume control
      this.volume = new Tone.Volume(-10).connect(this.reverb);

      // Create synth
      this.synth = new Tone.Synth({
        oscillator: { type: 'sine' },
        envelope: {
          attack: 0.005,
          decay: 0.1,
          sustain: 0.3,
          release: 1,
        },
      }).connect(this.volume);

      this.isInitialized = true;
      console.log('🔊 Sound system initialized');
    } catch (error) {
      console.error('Failed to initialize sound:', error);
    }
  }

  // Alias for initialize
  async init() {
    return this.initialize();
  }

  // Transaction sounds - different pitches based on price
  playTransactionSound(price: number) {
    if (!this.isInitialized || this.isMuted || !this.synth) return;

    // Map price to frequency (higher price = higher pitch)
    const frequency = 200 + Math.min(price * 100, 600);
    this.synth.triggerAttackRelease(frequency, '0.1');
  }

  // Agent activation sound
  playAgentSound() {
    if (!this.isInitialized || this.isMuted || !this.synth) return;
    this.synth.triggerAttackRelease('C5', '0.2');
  }

  // Completion sound
  playCompletionSound() {
    if (!this.isInitialized || this.isMuted || !this.synth) return;
    this.synth.triggerAttackRelease('E5', '0.1');
    setTimeout(() => this.synth?.triggerAttackRelease('G5', '0.15'), 100);
  }

  // Success chord
  playSuccessChord() {
    if (!this.isInitialized || this.isMuted || !this.synth) return;
    const notes = ['C5', 'E5', 'G5'];
    notes.forEach((note, i) => {
      setTimeout(() => this.synth?.triggerAttackRelease(note, '0.3'), i * 50);
    });
  }

  // UI interaction sounds
  playClick() {
    if (!this.isInitialized || this.isMuted || !this.synth) return;
    this.synth.triggerAttackRelease('C6', '0.05');
  }

  playHover() {
    if (!this.isInitialized || this.isMuted || !this.synth) return;
    this.synth.triggerAttackRelease('G5', '0.03');
  }

  // Marketplace sounds
  playServiceHover() {
    if (!this.isInitialized || this.isMuted || !this.synth) return;
    this.synth.triggerAttackRelease('A5', '0.08');
  }

  playServiceClick() {
    if (!this.isInitialized || this.isMuted || !this.synth) return;
    this.synth.triggerAttackRelease('E6', '0.1');
  }

  playFilterChange() {
    if (!this.isInitialized || this.isMuted || !this.synth) return;
    this.synth.triggerAttackRelease('D5', '0.06');
  }

  playBeamPulse() {
    if (!this.isInitialized || this.isMuted || !this.synth) return;
    this.synth.triggerAttackRelease('C4', '0.3', undefined, 0.1);
  }

  // Volume control
  setVolume(db: number) {
    if (this.volume) {
      this.volume.volume.value = db;
    }
  }

  // Mute/unmute
  toggleMute() {
    this.isMuted = !this.isMuted;
    if (this.volume) {
      this.volume.mute = this.isMuted;
    }
    return this.isMuted;
  }

  getMuted() {
    return this.isMuted;
  }
}

// Singleton instance
export const soundManager = new SoundManager();
