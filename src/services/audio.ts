// Audio System
const SOUND_URLS = {
  splash: "https://actions.google.com/sounds/v1/cartoon/pop.ogg",
  monkey: "https://actions.google.com/sounds/v1/animals/monkey_screech.ogg",
  funny_fail: "https://actions.google.com/sounds/v1/cartoon/slide_whistle.ogg",
  win: "https://actions.google.com/sounds/v1/cartoon/clown_horn.ogg",
  pop: "https://actions.google.com/sounds/v1/cartoon/pop.ogg"
};

class AudioService {
  private ctx: AudioContext | null = null;
  private buffers: Record<string, AudioBuffer> = {};
  private enabled = false;

  init() {
    if (this.ctx) return;
    this.ctx = new (globalThis.AudioContext || (globalThis as any).webkitAudioContext)();
    this.enabled = true;
    this.preload();
  }

  private async preload() {
    if (!this.ctx) return;
    for (const [key, url] of Object.entries(SOUND_URLS)) {
      try {
        const res = await fetch(url);
        const arrayBuffer = await res.arrayBuffer();
        const audioBuffer = await this.ctx.decodeAudioData(arrayBuffer);
        this.buffers[key] = audioBuffer;
      } catch (e) {
        console.error(`Failed to load sound ${key}`, e);
      }
    }
  }

  play(key: keyof typeof SOUND_URLS, volume = 0.5) {
    if (!this.enabled || !this.ctx || !this.buffers[key]) return;

    const source = this.ctx.createBufferSource();
    source.buffer = this.buffers[key];
    const gain = this.ctx.createGain();
    gain.gain.value = volume;
    source.connect(gain);
    gain.connect(this.ctx.destination);
    source.start(0);
  }

  playSynth(type: 'hit' | 'wall') {
    if (!this.enabled || !this.ctx) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    if (type === 'hit') {
      osc.frequency.setValueAtTime(200, t);
      osc.frequency.exponentialRampToValueAtTime(600, t + 0.1);
      gain.gain.setValueAtTime(0.3, t);
      gain.gain.linearRampToValueAtTime(0, t + 0.1);
      osc.start(t);
      osc.stop(t + 0.1);
    } else {
      osc.type = 'square';
      osc.frequency.setValueAtTime(150, t);
      osc.frequency.exponentialRampToValueAtTime(50, t + 0.1);
      gain.gain.setValueAtTime(0.2, t);
      gain.gain.exponentialRampToValueAtTime(0.01, t + 0.1);
      osc.start(t);
      osc.stop(t + 0.1);
    }
  }
}

export const audio = new AudioService();
