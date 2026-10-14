/**
 * ============================================================================
 * PROCEDURAL SOUND ENGINE & MILITARY AMBIENCE (WEB AUDIO API)
 * Crisp minimalist gunshot snaps, heavy cannon booms, suppression ear-ringing,
 * and procedural marching war drum rhythms - Zero external audio files!
 * ============================================================================
 */
class SoundEngine {
    constructor() {
        this.ctx = null;
        this.enabled = true;
        this.musicEnabled = false;
        this.drumInterval = null;
        this.drumStep = 0;
    }

    init() {
        if (!this.ctx) {
            const AudioCtx = window.AudioContext || window.webkitAudioContext;
            if (AudioCtx) {
                this.ctx = new AudioCtx();
            }
        }
        if (this.ctx && this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
    }

    playClick() {
        if (!this.enabled) return;
        this.init();
        if (!this.ctx) return;
        try {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(520, this.ctx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(180, this.ctx.currentTime + 0.045);
            gain.gain.setValueAtTime(0.12, this.ctx.currentTime);
            gain.gain.linearRampToValueAtTime(0.01, this.ctx.currentTime + 0.045);
            osc.connect(gain);
            gain.connect(this.ctx.destination);
            osc.start();
            osc.stop(this.ctx.currentTime + 0.05);
        } catch (e) {}
    }

    playShot(weaponType = 'rifle') {
        if (!this.enabled) return;
        this.init();
        if (!this.ctx) return;
        try {
            const now = this.ctx.currentTime;
            const duration = weaponType === 'tank' ? 0.22 : (weaponType === 'hmg' ? 0.06 : 0.07);
            const bufferSize = Math.floor(this.ctx.sampleRate * duration);
            const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
            const data = buffer.getChannelData(0);
            for (let i = 0; i < bufferSize; i++) {
                data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.28));
            }
            const noise = this.ctx.createBufferSource();
            noise.buffer = buffer;

            const filter = this.ctx.createBiquadFilter();
            filter.type = weaponType === 'tank' ? 'lowpass' : 'bandpass';

            if (weaponType === 'tank') {
                filter.frequency.setValueAtTime(280, now);
            } else if (weaponType === 'sniper') {
                filter.frequency.value = 900;
            } else if (weaponType === 'hmg') {
                filter.frequency.value = 750;
            } else if (weaponType === 'smg' || weaponType === 'assault') {
                filter.frequency.value = 1600;
            } else {
                filter.frequency.value = 1200;
            }

            const gain = this.ctx.createGain();
            const vol = weaponType === 'tank' ? 0.35 : (weaponType === 'sniper' ? 0.16 : (weaponType === 'hmg' ? 0.14 : 0.08));
            gain.gain.setValueAtTime(vol, now);
            gain.gain.exponentialRampToValueAtTime(0.005, now + duration);

            noise.connect(filter);
            filter.connect(gain);
            gain.connect(this.ctx.destination);
            noise.start(now);
        } catch (e) {}
    }

    playExplosion(scale = 1.0) {
        if (!this.enabled) return;
        this.init();
        if (!this.ctx) return;
        try {
            const now = this.ctx.currentTime;
            const duration = 0.45 * scale;
            const bufferSize = Math.floor(this.ctx.sampleRate * duration);
            const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
            const data = buffer.getChannelData(0);
            for (let i = 0; i < bufferSize; i++) {
                data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.35));
            }
            const noise = this.ctx.createBufferSource();
            noise.buffer = buffer;

            const filter = this.ctx.createBiquadFilter();
            filter.type = 'lowpass';
            filter.frequency.setValueAtTime(360, now);
            filter.frequency.linearRampToValueAtTime(70, now + duration);

            const gain = this.ctx.createGain();
            gain.gain.setValueAtTime(0.35 * Math.min(1.5, scale), now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + duration);

            noise.connect(filter);
            filter.connect(gain);
            gain.connect(this.ctx.destination);
            noise.start(now);
        } catch (e) {}
    }

    playWhistle() {
        if (!this.enabled) return;
        this.init();
        if (!this.ctx) return;
        try {
            const now = this.ctx.currentTime;
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(2400, now);
            osc.frequency.setValueAtTime(2650, now + 0.08);
            osc.frequency.setValueAtTime(2350, now + 0.16);
            gain.gain.setValueAtTime(0.08, now);
            gain.gain.exponentialRampToValueAtTime(0.005, now + 0.28);
            osc.connect(gain);
            gain.connect(this.ctx.destination);
            osc.start(now);
            osc.stop(now + 0.29);
        } catch (e) {}
    }

    playSuppressionSting() {
        if (!this.enabled) return;
        this.init();
        if (!this.ctx) return;
        try {
            const now = this.ctx.currentTime;
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(160, now);
            osc.frequency.exponentialRampToValueAtTime(60, now + 0.3);
            gain.gain.setValueAtTime(0.08, now);
            gain.gain.exponentialRampToValueAtTime(0.002, now + 0.3);
            osc.connect(gain);
            gain.connect(this.ctx.destination);
            osc.start(now);
            osc.stop(now + 0.32);
        } catch (e) {}
    }

    // --- Procedural Military Drum March Ambience ---
    toggleWarDrums() {
        this.musicEnabled = !this.musicEnabled;
        if (this.musicEnabled) {
            this.startWarDrums();
        } else {
            this.stopWarDrums();
        }
        return this.musicEnabled;
    }

    startWarDrums() {
        if (this.drumInterval) return;
        this.init();
        const tempoMs = 240; // ~125 BPM march rhythm

        this.drumInterval = setInterval(() => {
            if (!this.musicEnabled || !this.enabled || !this.ctx) return;
            this.drumStep = (this.drumStep + 1) % 8;

            // Pattern: 1: Heavy Bass, 3: Snare tap, 5: Heavy Bass, 7: Fast double snare
            if (this.drumStep === 0 || this.drumStep === 4) {
                this._playBassDrum();
            } else if (this.drumStep === 2 || this.drumStep === 6) {
                this._playSnareDrum(false);
            } else if (this.drumStep === 7) {
                this._playSnareDrum(true);
            }
        }, tempoMs);
    }

    stopWarDrums() {
        if (this.drumInterval) {
            clearInterval(this.drumInterval);
            this.drumInterval = null;
        }
    }

    _playBassDrum() {
        try {
            const now = this.ctx.currentTime;
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(110, now);
            osc.frequency.exponentialRampToValueAtTime(38, now + 0.14);
            gain.gain.setValueAtTime(0.12, now);
            gain.gain.exponentialRampToValueAtTime(0.005, now + 0.16);
            osc.connect(gain);
            gain.connect(this.ctx.destination);
            osc.start(now);
            osc.stop(now + 0.17);
        } catch (e) {}
    }

    _playSnareDrum(light = false) {
        try {
            const now = this.ctx.currentTime;
            const bufferSize = Math.floor(this.ctx.sampleRate * 0.08);
            const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
            const data = buffer.getChannelData(0);
            for (let i = 0; i < bufferSize; i++) {
                data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.4));
            }
            const noise = this.ctx.createBufferSource();
            noise.buffer = buffer;

            const filter = this.ctx.createBiquadFilter();
            filter.type = 'highpass';
            filter.frequency.value = 1400;

            const gain = this.ctx.createGain();
            gain.gain.setValueAtTime(light ? 0.03 : 0.06, now);
            gain.gain.exponentialRampToValueAtTime(0.002, now + 0.08);

            noise.connect(filter);
            filter.connect(gain);
            gain.connect(this.ctx.destination);
            noise.start(now);
        } catch (e) {}
    }
}

const sound = new SoundEngine();
window.SoundEngine = SoundEngine;
window.sound = sound;
