// ═══════════════════════════════════════════
// Ninaflix — Tizen AVPlay Wrapper
// ═══════════════════════════════════════════

const NinaflixPlayer = {
  avplay: null,
  isPlaying: false,
  currentStream: null,

  init() {
    this.avplay = window.webapis && window.webapis.avplay;
    if (this.avplay) {
      console.log('[Player] AVPlay available');
    } else {
      console.log('[Player] AVPlay not available, using HTML5 fallback');
    }
  },

  async play(stream, title) {
    this.currentStream = stream;
    this.isPlaying = true;

    if (this.avplay) {
      await this.playAVPlay(stream.url, title);
    } else {
      await this.playHTML5(stream.url);
    }
  },

  async playAVPlay(url, title) {
    try {
      this.avplay.open(url);
      this.avplay.setDisplayRect(0, 0, window.innerWidth, window.innerHeight);
      this.avplay.setListener({
        oncurrentplaytime: (time) => this.onTimeUpdate(time),
        onstreamcompleted: () => this.onEnded(),
        onerror: (err) => this.onError(err)
      });
      this.avplay.prepare();
      this.avplay.play();
      console.log('[Player] AVPlay playing: ' + title);
    } catch (e) {
      console.error('[Player] AVPlay error:', e);
      this.playHTML5(url); // Fallback
    }
  },

  async playHTML5(url) {
    const video = document.getElementById('html5-player');
    if (!video) {
      // Create video element
      const v = document.createElement('video');
      v.id = 'html5-player';
      v.style.cssText = 'position:fixed;inset:0;z-index:9000;width:100%;height:100%;background:#000;';
      v.setAttribute('controls', '');
      document.body.appendChild(v);
    }
    const v = document.getElementById('html5-player');
    v.src = url;
    v.play().catch(e => console.error('[Player] HTML5 error:', e));
  },

  pause() {
    if (this.avplay) this.avplay.pause();
    else {
      const v = document.getElementById('html5-player');
      if (v) v.pause();
    }
    this.isPlaying = false;
  },

  resume() {
    if (this.avplay) this.avplay.play();
    else {
      const v = document.getElementById('html5-player');
      if (v) v.play();
    }
    this.isPlaying = true;
  },

  stop() {
    if (this.avplay) {
      this.avplay.stop();
      this.avplay.close();
    }
    const v = document.getElementById('html5-player');
    if (v) { v.pause(); v.src = ''; v.remove(); }
    this.isPlaying = false;
    this.currentStream = null;
  },

  seek(ms) {
    if (this.avplay) this.avplay.seekTo(ms);
    else {
      const v = document.getElementById('html5-player');
      if (v) v.currentTime = ms / 1000;
    }
  },

  onTimeUpdate(time) {
    // Update progress UI
    // Save continue watching progress
  },

  onEnded() {
    console.log('[Player] Stream ended');
    this.isPlaying = false;
    // Auto-play next episode logic
  },

  onError(err) {
    console.error('[Player] Error:', err);
    // Try next stream in ranked list
  },

  getPosition() {
    if (this.avplay) return this.avplay.getCurrentTime();
    const v = document.getElementById('html5-player');
    return v ? v.currentTime * 1000 : 0;
  },

  getDuration() {
    if (this.avplay) return this.avplay.getDuration();
    const v = document.getElementById('html5-player');
    return v ? v.duration * 1000 : 0;
  }
};
