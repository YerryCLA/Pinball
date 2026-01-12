/**
 * AudioManager - Procedural Retro Sound System for Pinball
 * All sounds generated using Web Audio API oscillators and noise
 * No external audio files required
 */
class AudioManager {
    constructor() {
        this.audioContext = null;
        this.enabled = true;
        this.volume = 0.3;
        this.masterGain = null;
    }

    /**
     * Initialize AudioContext - must be called on user interaction
     * (browser security requirement)
     */
    init() {
        if (this.audioContext) return;

        this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        this.masterGain = this.audioContext.createGain();
        this.masterGain.gain.value = this.volume;
        this.masterGain.connect(this.audioContext.destination);

        // Resume context if suspended (autoplay policy)
        if (this.audioContext.state === 'suspended') {
            this.audioContext.resume();
        }
    }

    /**
     * Create an oscillator with envelope
     * @param {string} type - 'sine', 'square', 'sawtooth', 'triangle'
     * @param {number} frequency - frequency in Hz
     * @param {number} duration - duration in seconds
     * @param {object} envelope - {attack, decay, sustain, release}
     * @returns {object} - {oscillator, gainNode}
     */
    createOscillator(type, frequency, duration, envelope = {}) {
        if (!this.audioContext || !this.enabled) return null;

        const {
            attack = 0.01,
            decay = 0.1,
            sustain = 0.3,
            release = 0.1
        } = envelope;

        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();

        oscillator.type = type;
        oscillator.frequency.value = frequency;

        // Connect oscillator -> gain -> master
        oscillator.connect(gainNode);
        gainNode.connect(this.masterGain);

        const now = this.audioContext.currentTime;

        // ADSR envelope
        gainNode.gain.setValueAtTime(0, now);
        gainNode.gain.linearRampToValueAtTime(1, now + attack);
        gainNode.gain.linearRampToValueAtTime(sustain, now + attack + decay);
        gainNode.gain.setValueAtTime(sustain, now + duration - release);
        gainNode.gain.linearRampToValueAtTime(0, now + duration);

        oscillator.start(now);
        oscillator.stop(now + duration);

        return { oscillator, gainNode };
    }

    /**
     * Create white noise for mechanical/impact sounds
     * @param {number} duration - duration in seconds
     * @returns {object} - {noiseSource, gainNode}
     */
    createNoise(duration) {
        if (!this.audioContext || !this.enabled) return null;

        // Create buffer with white noise
        const bufferSize = this.audioContext.sampleRate * duration;
        const buffer = this.audioContext.createBuffer(1, bufferSize, this.audioContext.sampleRate);
        const data = buffer.getChannelData(0);

        for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1;
        }

        const noiseSource = this.audioContext.createBufferSource();
        noiseSource.buffer = buffer;

        const gainNode = this.audioContext.createGain();
        noiseSource.connect(gainNode);
        gainNode.connect(this.masterGain);

        return { noiseSource, gainNode };
    }

    /**
     * Flipper sound - short mechanical click/snap
     */
    playFlipperSound() {
        if (!this.audioContext || !this.enabled) return;

        const duration = 0.06;
        const now = this.audioContext.currentTime;

        // Sharp click using square wave with fast decay
        const osc = this.createOscillator('square', 150, duration, {
            attack: 0.001,
            decay: 0.02,
            sustain: 0.1,
            release: 0.03
        });

        // Add a bit of noise for mechanical feel
        const noise = this.createNoise(0.03);
        if (noise) {
            noise.gainNode.gain.setValueAtTime(0.3, now);
            noise.gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.03);
            noise.noiseSource.start(now);
            noise.noiseSource.stop(now + 0.03);
        }

        // Pitch bend down for the snap
        if (osc) {
            osc.oscillator.frequency.setValueAtTime(200, now);
            osc.oscillator.frequency.exponentialRampToValueAtTime(80, now + duration);
        }
    }

    /**
     * Bumper sound - punchy electronic boop with pitch variation
     */
    playBumperSound() {
        if (!this.audioContext || !this.enabled) return;

        const duration = 0.15;
        const now = this.audioContext.currentTime;

        // Random pitch variation for variety
        const baseFreq = 300 + Math.random() * 200;

        // Main tone - square wave for that retro punch
        const osc1 = this.createOscillator('square', baseFreq, duration, {
            attack: 0.001,
            decay: 0.05,
            sustain: 0.2,
            release: 0.08
        });

        // Sub tone for body
        const osc2 = this.createOscillator('triangle', baseFreq / 2, duration, {
            attack: 0.001,
            decay: 0.08,
            sustain: 0.1,
            release: 0.05
        });

        // Pitch bend for that bouncy feel
        if (osc1) {
            osc1.oscillator.frequency.setValueAtTime(baseFreq * 1.5, now);
            osc1.oscillator.frequency.exponentialRampToValueAtTime(baseFreq * 0.5, now + duration);
        }

        if (osc2) {
            osc2.gainNode.gain.value = 0.5;
        }
    }

    /**
     * Slingshot sound - sharp ping
     */
    playSlingshotSound() {
        if (!this.audioContext || !this.enabled) return;

        const duration = 0.1;
        const now = this.audioContext.currentTime;

        // High ping with triangle wave
        const osc = this.createOscillator('triangle', 800, duration, {
            attack: 0.001,
            decay: 0.03,
            sustain: 0.15,
            release: 0.06
        });

        if (osc) {
            // Sharp attack then quick drop
            osc.oscillator.frequency.setValueAtTime(1200, now);
            osc.oscillator.frequency.exponentialRampToValueAtTime(600, now + 0.05);
            osc.oscillator.frequency.exponentialRampToValueAtTime(400, now + duration);
        }

        // Add short noise burst
        const noise = this.createNoise(0.02);
        if (noise) {
            // Filter the noise for higher frequencies
            const filter = this.audioContext.createBiquadFilter();
            filter.type = 'highpass';
            filter.frequency.value = 2000;

            noise.noiseSource.disconnect();
            noise.noiseSource.connect(filter);
            filter.connect(noise.gainNode);

            noise.gainNode.gain.setValueAtTime(0.2, now);
            noise.gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.02);
            noise.noiseSource.start(now);
            noise.noiseSource.stop(now + 0.02);
        }
    }

    /**
     * Target sound - ascending chime
     */
    playTargetSound() {
        if (!this.audioContext || !this.enabled) return;

        const now = this.audioContext.currentTime;
        const notes = [523, 659, 784]; // C5, E5, G5 - major chord ascending

        notes.forEach((freq, i) => {
            const startTime = i * 0.05;
            const osc = this.audioContext.createOscillator();
            const gain = this.audioContext.createGain();

            osc.type = 'sine';
            osc.frequency.value = freq;

            osc.connect(gain);
            gain.connect(this.masterGain);

            const start = now + startTime;
            gain.gain.setValueAtTime(0, start);
            gain.gain.linearRampToValueAtTime(0.4, start + 0.01);
            gain.gain.exponentialRampToValueAtTime(0.01, start + 0.2);

            osc.start(start);
            osc.stop(start + 0.2);
        });
    }

    /**
     * Launch sound - whoosh/spring release
     */
    playLaunchSound() {
        if (!this.audioContext || !this.enabled) return;

        const duration = 0.3;
        const now = this.audioContext.currentTime;

        // Rising tone for the spring
        const osc = this.createOscillator('sawtooth', 100, duration, {
            attack: 0.01,
            decay: 0.1,
            sustain: 0.3,
            release: 0.15
        });

        if (osc) {
            // Dramatic pitch rise
            osc.oscillator.frequency.setValueAtTime(80, now);
            osc.oscillator.frequency.exponentialRampToValueAtTime(400, now + 0.1);
            osc.oscillator.frequency.exponentialRampToValueAtTime(200, now + duration);
        }

        // Noise whoosh
        const noise = this.createNoise(duration);
        if (noise) {
            const filter = this.audioContext.createBiquadFilter();
            filter.type = 'bandpass';
            filter.frequency.value = 1000;
            filter.Q.value = 2;

            noise.noiseSource.disconnect();
            noise.noiseSource.connect(filter);
            filter.connect(noise.gainNode);

            // Sweep the filter for whoosh effect
            filter.frequency.setValueAtTime(500, now);
            filter.frequency.exponentialRampToValueAtTime(3000, now + 0.15);
            filter.frequency.exponentialRampToValueAtTime(1000, now + duration);

            noise.gainNode.gain.setValueAtTime(0.3, now);
            noise.gainNode.gain.linearRampToValueAtTime(0.5, now + 0.1);
            noise.gainNode.gain.exponentialRampToValueAtTime(0.01, now + duration);

            noise.noiseSource.start(now);
            noise.noiseSource.stop(now + duration);
        }
    }

    /**
     * Score sound - quick blip for points
     */
    playScoreSound() {
        if (!this.audioContext || !this.enabled) return;

        const duration = 0.08;
        const now = this.audioContext.currentTime;

        // Quick high blip
        const osc = this.createOscillator('square', 880, duration, {
            attack: 0.005,
            decay: 0.03,
            sustain: 0.2,
            release: 0.04
        });

        if (osc) {
            osc.gainNode.gain.value = 0.25; // Quieter since this plays often
            osc.oscillator.frequency.setValueAtTime(1000, now);
            osc.oscillator.frequency.exponentialRampToValueAtTime(800, now + duration);
        }
    }

    /**
     * Ball lost sound - descending sad tone
     */
    playBallLostSound() {
        if (!this.audioContext || !this.enabled) return;

        const now = this.audioContext.currentTime;
        const duration = 0.6;

        // Sad descending tones
        const osc1 = this.audioContext.createOscillator();
        const osc2 = this.audioContext.createOscillator();
        const gain1 = this.audioContext.createGain();
        const gain2 = this.audioContext.createGain();

        osc1.type = 'triangle';
        osc2.type = 'sine';

        osc1.connect(gain1);
        osc2.connect(gain2);
        gain1.connect(this.masterGain);
        gain2.connect(this.masterGain);

        // Descending pitch
        osc1.frequency.setValueAtTime(400, now);
        osc1.frequency.exponentialRampToValueAtTime(100, now + duration);

        osc2.frequency.setValueAtTime(300, now);
        osc2.frequency.exponentialRampToValueAtTime(75, now + duration);

        // Envelope
        gain1.gain.setValueAtTime(0.4, now);
        gain1.gain.exponentialRampToValueAtTime(0.01, now + duration);

        gain2.gain.setValueAtTime(0.3, now);
        gain2.gain.exponentialRampToValueAtTime(0.01, now + duration);

        osc1.start(now);
        osc2.start(now);
        osc1.stop(now + duration);
        osc2.stop(now + duration);
    }

    /**
     * Game over sound - dramatic descending sequence
     */
    playGameOverSound() {
        if (!this.audioContext || !this.enabled) return;

        const now = this.audioContext.currentTime;
        // Descending minor notes for dramatic effect
        const notes = [392, 349, 330, 294, 262, 196]; // G4, F4, E4, D4, C4, G3

        notes.forEach((freq, i) => {
            const startTime = i * 0.15;

            const osc = this.audioContext.createOscillator();
            const gain = this.audioContext.createGain();

            osc.type = i < 3 ? 'square' : 'sawtooth';
            osc.frequency.value = freq;

            osc.connect(gain);
            gain.connect(this.masterGain);

            const start = now + startTime;
            const noteDuration = i === notes.length - 1 ? 0.5 : 0.15;

            gain.gain.setValueAtTime(0, start);
            gain.gain.linearRampToValueAtTime(0.35, start + 0.01);
            gain.gain.setValueAtTime(0.35, start + noteDuration - 0.05);
            gain.gain.exponentialRampToValueAtTime(0.01, start + noteDuration);

            // Slight vibrato on last note
            if (i === notes.length - 1) {
                const lfo = this.audioContext.createOscillator();
                const lfoGain = this.audioContext.createGain();
                lfo.frequency.value = 6;
                lfoGain.gain.value = 5;
                lfo.connect(lfoGain);
                lfoGain.connect(osc.frequency);
                lfo.start(start);
                lfo.stop(start + noteDuration);
            }

            osc.start(start);
            osc.stop(start + noteDuration);
        });
    }

    /**
     * Start sound - upbeat ascending fanfare
     */
    playStartSound() {
        if (!this.audioContext || !this.enabled) return;

        const now = this.audioContext.currentTime;
        // Ascending major arpeggio - C major
        const notes = [262, 330, 392, 523, 659, 784]; // C4, E4, G4, C5, E5, G5

        notes.forEach((freq, i) => {
            const startTime = i * 0.08;

            const osc = this.audioContext.createOscillator();
            const gain = this.audioContext.createGain();

            osc.type = 'square';
            osc.frequency.value = freq;

            osc.connect(gain);
            gain.connect(this.masterGain);

            const start = now + startTime;
            const noteDuration = i === notes.length - 1 ? 0.3 : 0.1;

            gain.gain.setValueAtTime(0, start);
            gain.gain.linearRampToValueAtTime(0.3, start + 0.01);
            gain.gain.exponentialRampToValueAtTime(0.01, start + noteDuration);

            osc.start(start);
            osc.stop(start + noteDuration);
        });

        // Final chord
        const chordStart = now + 0.5;
        [523, 659, 784].forEach(freq => {
            const osc = this.audioContext.createOscillator();
            const gain = this.audioContext.createGain();

            osc.type = 'triangle';
            osc.frequency.value = freq;

            osc.connect(gain);
            gain.connect(this.masterGain);

            gain.gain.setValueAtTime(0, chordStart);
            gain.gain.linearRampToValueAtTime(0.25, chordStart + 0.02);
            gain.gain.exponentialRampToValueAtTime(0.01, chordStart + 0.4);

            osc.start(chordStart);
            osc.stop(chordStart + 0.4);
        });
    }

    /**
     * Multiplier sound - special ascending arpeggio
     */
    playMultiplierSound() {
        if (!this.audioContext || !this.enabled) return;

        const now = this.audioContext.currentTime;
        // Fast ascending pentatonic scale
        const notes = [440, 523, 659, 784, 880, 1047, 1319]; // A4 up

        notes.forEach((freq, i) => {
            const startTime = i * 0.04;

            const osc = this.audioContext.createOscillator();
            const gain = this.audioContext.createGain();

            // Alternate between square and saw for shimmer
            osc.type = i % 2 === 0 ? 'square' : 'sawtooth';
            osc.frequency.value = freq;

            osc.connect(gain);
            gain.connect(this.masterGain);

            const start = now + startTime;

            gain.gain.setValueAtTime(0, start);
            gain.gain.linearRampToValueAtTime(0.25, start + 0.005);
            gain.gain.exponentialRampToValueAtTime(0.01, start + 0.15);

            osc.start(start);
            osc.stop(start + 0.15);
        });

        // Sparkle effect with high frequency noise burst
        const sparkleStart = now + 0.25;
        const noise = this.createNoise(0.1);
        if (noise) {
            const filter = this.audioContext.createBiquadFilter();
            filter.type = 'highpass';
            filter.frequency.value = 4000;

            noise.noiseSource.disconnect();
            noise.noiseSource.connect(filter);
            filter.connect(noise.gainNode);

            noise.gainNode.gain.setValueAtTime(0.15, sparkleStart);
            noise.gainNode.gain.exponentialRampToValueAtTime(0.01, sparkleStart + 0.1);

            noise.noiseSource.start(sparkleStart);
            noise.noiseSource.stop(sparkleStart + 0.1);
        }
    }

    /**
     * Set master volume level
     * @param {number} level - volume from 0 to 1
     */
    setVolume(level) {
        this.volume = Math.max(0, Math.min(1, level));
        if (this.masterGain) {
            this.masterGain.gain.value = this.volume;
        }
    }

    /**
     * Toggle audio on/off
     * @returns {boolean} - new enabled state
     */
    toggle() {
        this.enabled = !this.enabled;
        return this.enabled;
    }

    /**
     * Check if audio is initialized
     * @returns {boolean}
     */
    isInitialized() {
        return this.audioContext !== null;
    }

    /**
     * Get current audio state
     * @returns {object}
     */
    getState() {
        return {
            initialized: this.isInitialized(),
            enabled: this.enabled,
            volume: this.volume,
            contextState: this.audioContext ? this.audioContext.state : 'not created'
        };
    }
}

// Global audio instance
const Audio = new AudioManager();
