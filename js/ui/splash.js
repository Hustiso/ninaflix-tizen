// ═══════════════════════════════════════════
// Ninaflix — Splash Screen Controller
// ═══════════════════════════════════════════

const NinaflixSplash = {
  laugh: null,

  start() {
    this.laugh = document.getElementById('laugh');
    // Auto-play laugh + splash on Tizen (no click needed)
    this.playLaugh();
    this.showSplash();

    setTimeout(() => {
      this.hideSplash();
      setTimeout(() => {
        document.getElementById('app').classList.add('show');
        document.getElementById('splash').style.display = 'none';
      }, 800);
    }, 3200);
  },

  playLaugh() {
    if (this.laugh) {
      this.laugh.volume = 0.8;
      this.laugh.currentTime = 0;
      this.laugh.play().catch(() => {
        // Browser blocked autoplay — on Tizen this won't happen
        console.log('[Ninaflix] Autoplay blocked, will retry on interaction');
      });
    }
  },

  showSplash() {
    document.getElementById('splash').classList.remove('out');
  },

  hideSplash() {
    document.getElementById('splash').classList.add('out');
  }
};
