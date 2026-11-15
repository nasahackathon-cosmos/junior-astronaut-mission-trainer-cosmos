/**
 * COSMOS Procedural Space Ambient Music & Audio Engine
 * Generates an inspiring, cinematic NASA-style ambient space soundtrack
 * entirely via the Web Audio API with zero external audio assets.
 */
export class CosmosAudioEngine {
  constructor() {
    this.ctx = null;
    this.masterGain = null;
    this.padGain = null;
    this.chimeGain = null;
    this.droneGain = null;
    this.isPlaying = false;
    this.isMuted = false;
    this.currentScene = 'title'; // 'title', 'hangar', 'travel', 'cabin', 'surface'
    this.activeNodes = [];
    this.chimeTimer = null;
    this.chordStep = 0;
    this.chords = [
      // Cinematic space chord progressions (frequencies in Hz)
      [55, 110, 164.81, 220, 277.18, 329.63], // A maj7 / space wonder
      [65.41, 130.81, 196.00, 261.63, 311.13, 392.00], // C maj9 / discovery
      [49.00, 98.00, 146.83, 196.00, 246.94, 293.66], // G maj7 / planetary approach
      [43.65, 87.31, 130.81, 174.61, 220.00, 261.63]  // F maj7 / cosmic vastness
    ];
    this.pentatonic = [220, 246.94, 277.18, 329.63, 369.99, 440, 493.88, 554.37, 659.25, 739.99];

    // Auto-resume on first user gesture
    this.setupUserGestureListener();
  }

  setupUserGestureListener() {
    const unlock = () => {
      if (this.ctx && this.ctx.state === 'suspended') {
        this.ctx.resume();
      }
      document.removeEventListener('pointerdown', unlock);
      document.removeEventListener('keydown', unlock);
    };
    document.addEventListener('pointerdown', unlock, { once: true });
    document.addEventListener('keydown', unlock, { once: true });
  }

  init() {
    if (this.ctx) return;
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AudioContext();

      // Master output
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(0.24, this.ctx.currentTime);

      // Limiter / soft compressor for smooth warm dynamics
      this.compressor = this.ctx.createDynamicsCompressor();
      this.compressor.threshold.setValueAtTime(-18, this.ctx.currentTime);
      this.compressor.knee.setValueAtTime(24, this.ctx.currentTime);
      this.compressor.ratio.setValueAtTime(4, this.ctx.currentTime);
      this.compressor.attack.setValueAtTime(0.02, this.ctx.currentTime);
      this.compressor.release.setValueAtTime(0.3, this.ctx.currentTime);

      this.masterGain.connect(this.compressor);
      this.compressor.connect(this.ctx.destination);

      // Low-pass filter for warm analog space synth tone
      this.filter = this.ctx.createBiquadFilter();
      this.filter.type = 'lowpass';
      this.filter.frequency.setValueAtTime(680, this.ctx.currentTime);
      this.filter.Q.setValueAtTime(1.8, this.ctx.currentTime);
      this.filter.connect(this.masterGain);

      // Sub-buses
      this.padGain = this.ctx.createGain();
      this.padGain.gain.setValueAtTime(0.65, this.ctx.currentTime);
      this.padGain.connect(this.filter);

      this.droneGain = this.ctx.createGain();
      this.droneGain.gain.setValueAtTime(0.45, this.ctx.currentTime);
      this.droneGain.connect(this.filter);

      this.chimeGain = this.ctx.createGain();
      this.chimeGain.gain.setValueAtTime(0.35, this.ctx.currentTime);
      this.chimeGain.connect(this.masterGain);

    } catch (e) {
      console.warn('Web Audio not available:', e);
    }
  }

  start() {
    this.init();
    if (!this.ctx) return;
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    if (this.isPlaying) return;
    this.isPlaying = true;

    this.startSubDrone();
    this.startAmbientPads();
    this.startCelestialChimes();
  }

  stop() {
    this.isPlaying = false;
    clearTimeout(this.chimeTimer);
    clearTimeout(this.chordTimer);
    for (const node of this.activeNodes) {
      try { node.stop(); } catch(e){}
    }
    this.activeNodes = [];
  }

  toggle() {
    if (this.isPlaying && !this.isMuted) {
      this.setMuted(true);
      return false;
    } else {
      if (!this.isPlaying) this.start();
      this.setMuted(false);
      return true;
    }
  }

  setMuted(muted) {
    this.isMuted = Boolean(muted);
    if (!this.masterGain || !this.ctx) return;
    const target = this.isMuted ? 0.0001 : 0.24;
    this.masterGain.gain.exponentialRampToValueAtTime(target, this.ctx.currentTime + 0.4);
  }

  startSubDrone() {
    if (!this.ctx || !this.isPlaying) return;
    // Low frequency cosmic rumble (36Hz sub-oscillator)
    const osc = this.ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(36.7, this.ctx.currentTime);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.28, this.ctx.currentTime);

    osc.connect(gain);
    gain.connect(this.droneGain);
    osc.start();
    this.activeNodes.push(osc);
  }

  startAmbientPads() {
    if (!this.ctx || !this.isPlaying) return;

    const playChord = () => {
      if (!this.isPlaying) return;
      const chord = this.chords[this.chordStep % this.chords.length];
      this.chordStep++;

      const now = this.ctx.currentTime;
      const duration = 8.5; // Chord swells over 8.5 seconds

      chord.forEach((freq, idx) => {
        // Dual detuned oscillators for lush stereo space chorus
        const osc1 = this.ctx.createOscillator();
        const osc2 = this.ctx.createOscillator();
        osc1.type = idx < 2 ? 'triangle' : 'sine';
        osc2.type = 'sine';

        // Detune by 2-5 cents
        osc1.frequency.setValueAtTime(freq * 1.002, now);
        osc2.frequency.setValueAtTime(freq * 0.998, now);

        const noteGain = this.ctx.createGain();
        const baseVolume = 0.09 / chord.length;

        // Attack - Sustain - Release envelope
        noteGain.gain.setValueAtTime(0.0001, now);
        noteGain.gain.exponentialRampToValueAtTime(baseVolume, now + 2.4);
        noteGain.gain.setValueAtTime(baseVolume, now + duration - 2.8);
        noteGain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

        osc1.connect(noteGain);
        osc2.connect(noteGain);
        noteGain.connect(this.padGain);

        osc1.start(now);
        osc2.start(now);
        osc1.stop(now + duration);
        osc2.stop(now + duration);
      });

      this.chordTimer = setTimeout(playChord, (duration - 1.8) * 1000);
    };

    playChord();
  }

  startCelestialChimes() {
    if (!this.ctx || !this.isPlaying) return;

    const playChime = () => {
      if (!this.isPlaying) return;
      const now = this.ctx.currentTime;

      // Random high celestial note
      const freq = this.pentatonic[Math.floor(Math.random() * this.pentatonic.length)];
      const osc = this.ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq * (Math.random() > 0.5 ? 2 : 1), now);

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.exponentialRampToValueAtTime(0.045, now + 0.08);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 2.2);

      osc.connect(gain);
      gain.connect(this.chimeGain);

      osc.start(now);
      osc.stop(now + 2.3);

      const nextDelay = 1800 + Math.random() * 3200;
      this.chimeTimer = setTimeout(playChime, nextDelay);
    };

    this.chimeTimer = setTimeout(playChime, 2500);
  }

  setScene(sceneName) {
    this.currentScene = sceneName;
    if (!this.filter || !this.ctx) return;
    const now = this.ctx.currentTime;

    // Adapt filter cutoff and tone depending on scene
    switch (sceneName) {
      case 'surface':
        // Vast, resonant, wind-like atmospheric filter
        this.filter.frequency.exponentialRampToValueAtTime(420, now + 1.5);
        this.masterGain.gain.exponentialRampToValueAtTime(this.isMuted ? 0.0001 : 0.22, now + 1.0);
        break;
      case 'cabin':
        // Warm interior cockpit hum
        this.filter.frequency.exponentialRampToValueAtTime(850, now + 1.5);
        this.masterGain.gain.exponentialRampToValueAtTime(this.isMuted ? 0.0001 : 0.26, now + 1.0);
        break;
      case 'travel':
        // Higher energy cosmic flight
        this.filter.frequency.exponentialRampToValueAtTime(1200, now + 1.5);
        this.masterGain.gain.exponentialRampToValueAtTime(this.isMuted ? 0.0001 : 0.28, now + 1.0);
        break;
      default:
        // Title / Earth facility
        this.filter.frequency.exponentialRampToValueAtTime(680, now + 1.5);
        this.masterGain.gain.exponentialRampToValueAtTime(this.isMuted ? 0.0001 : 0.24, now + 1.0);
        break;
    }
  }
}

// Global singleton instance
export const cosmosAudio = new CosmosAudioEngine();
window.cosmosAudio = cosmosAudio;
