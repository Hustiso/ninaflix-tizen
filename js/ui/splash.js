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
        // Fallback: play on first interaction
        const retry = () => {
          this.laugh.currentTime = 0;
          this.laugh.play().catch(() => {});
          document.removeEventListener('keydown', retry);
          document.removeEventListener('click', retry);
        };
        document.addEventListener('keydown', retry, { once: true });
        document.addEventListener('click', retry, { once: true });
        console.log('[Ninaflix] Autoplay blocked, will play on first interaction');
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
