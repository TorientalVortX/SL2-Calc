export type SoundType = 'click' | 'hover';

class SoundManager {
  private ctx: AudioContext | null = null;
  private enabled = true;

  init(enabled: boolean) {
    this.enabled = enabled;
    if (!this.ctx && typeof window !== 'undefined') {
      try {
        this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      } catch {}
    }
  }

  setEnabled(enabled: boolean) {
    this.enabled = enabled;
  }

  play(type: SoundType) {
    if (!this.enabled) return;
    if (!this.ctx) return;
    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'square';
      const now = this.ctx.currentTime;
      if (type === 'click') {
        osc.frequency.setValueAtTime(520, now);
        gain.gain.setValueAtTime(0.03, now);
      } else {
        osc.frequency.setValueAtTime(760, now);
        gain.gain.setValueAtTime(0.02, now);
      }
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      setTimeout(() => {
        try { osc.stop(); } catch {}
      }, type === 'click' ? 90 : 60);
    } catch {}
  }
}

export const soundManager = new SoundManager();
