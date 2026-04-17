// ═══════════════════════════════════════════
// Ninaflix — Tizen AVPlay Wrapper
// ═══════════════════════════════════════════

const NinaflixPlayer = {
  avplay: null,
  isPlaying: false,
  currentStream: null,
  rankedStreams: [],       // full ranked list for fallback
  currentStreamIndex: -1,  // index in ranked list
  subtitleInterval: null,  // timer for subtitle rendering

  init() {
    this.avplay = window.webapis && window.webapis.avplay;
    if (this.avplay) {
      console.log('[Player] AVPlay available');
    } else {
      console.log('[Player] AVPlay not available, using HTML5 fallback');
    }
  },

  async play(stream, title, rankedStreams) {
    this.currentStream = stream;
    this.isPlaying = true;
    if (rankedStreams) {
      this.rankedStreams = rankedStreams;
      this.currentStreamIndex = rankedStreams.findIndex(s => s.url === stream.url);
    }

    if (this.avplay) {
      await this.playAVPlay(stream.url, title);
    } else {
      await this.playHTML5(stream.url);
    }

    // Start subtitle rendering
    this.startSubtitleTick();
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
      // Fallback to HTML5
      try {
        this.avplay.close();
      } catch { /* ignore */ }
      await this.playHTML5(url);
    }
  },

  async playHTML5(url) {
    // Remove existing player
    const existing = document.getElementById('html5-player');
    if (existing) existing.remove();

    const v = document.createElement('video');
    v.id = 'html5-player';
    v.style.cssText = 'position:fixed;inset:0;z-index:9000;width:100%;height:100%;background:#000;';
    v.setAttribute('controls', '');
    v.src = url;
    document.body.appendChild(v);

    v.addEventListener('timeupdate', () => {
      this.onTimeUpdate(Math.floor(v.currentTime * 1000));
      NinaflixHUD.updateProgress(Math.floor(v.currentTime * 1000), Math.floor(v.duration * 1000));
    });
    v.addEventListener('ended', () => this.onEnded());
    v.addEventListener('error', () => this.onError({ message: 'HTML5 playback error' }));

    v.play().catch(e => {
      console.error('[Player] HTML5 error:', e);
      this.onError({ message: e.message });
    });
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
    this.stopSubtitleTick();
    if (this.avplay) {
      try { this.avplay.stop(); } catch { /* ignore */ }
      try { this.avplay.close(); } catch { /* ignore */ }
    }
    const v = document.getElementById('html5-player');
    if (v) { v.pause(); v.src = ''; v.remove(); }
    this.isPlaying = false;
    this.currentStream = null;
    this.rankedStreams = [];
    this.currentStreamIndex = -1;
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
    NinaflixHUD.updateProgress(time, this.getDuration());
    // Save continue watching progress
    if (this.currentStream && Ninaflix.state.currentItem) {
      NinaflixStorage.setProgress(Ninaflix.state.currentItem.id, {
        imdbId: Ninaflix.state.currentItem.id,
        title: Ninaflix.state.currentItem.meta?.title || Ninaflix.state.currentItem.meta?.name || '',
        position: time,
        duration: this.getDuration(),
        type: Ninaflix.state.currentItem.type || 'movie'
      });
    }
  },

  onEnded() {
    console.log('[Player] Stream ended');
    this.stopSubtitleTick();
    this.isPlaying = false;

    // Auto-play next episode if enabled
    const settings = NinaflixStorage.getSettings();
    if (settings.autoplay_next && Ninaflix.state.currentItem?.type === 'tv') {
      Ninaflix.toast('Auto-play next episode...');
      // TODO: implement next episode logic
    }
  },

  onError(err) {
    console.error('[Player] Error:', err);
    this.stopSubtitleTick();
    Ninaflix.toast('Stream error — trying next source...');

    // Try next stream in ranked list
    this.tryNextStream();
  },

  tryNextStream() {
    if (this.rankedStreams.length === 0) {
      Ninaflix.toast('No more streams available');
      this.stop();
      NinaflixHUD.hide();
      return;
    }

    // Find next available stream
    let nextIdx = this.currentStreamIndex + 1;
    if (nextIdx >= this.rankedStreams.length) {
      Ninaflix.toast('All streams exhausted');
      this.stop();
      NinaflixHUD.hide();
      return;
    }

    const nextStream = this.rankedStreams[nextIdx];
    this.currentStreamIndex = nextIdx;
    console.log(`[Player] Trying fallback: ${nextStream._quality || '?'} from ${nextStream._provider || '?'}`);
    Ninaflix.toast(`Trying: ${nextStream._quality || 'stream'}...`);

    // Play next
    this.currentStream = nextStream;
    this.isPlaying = true;
    if (this.avplay) {
      try { this.avplay.stop(); this.avplay.close(); } catch { /* ignore */ }
      this.playAVPlay(nextStream.url, Ninaflix.state.currentItem?.meta?.title || 'Unknown');
    } else {
      const v = document.getElementById('html5-player');
      if (v) { v.pause(); v.src = ''; }
      this.playHTML5(nextStream.url);
    }
    this.startSubtitleTick();
  },

  getPosition() {
    if (this.avplay) return this.avplay.getCurrentTime();
    const v = document.getElementById('html5-player');
    return v ? v.currentTime * 1000 : 0;
  },

  getDuration() {
    if (this.avplay) return this.avplay.getDuration();
    const v = document.getElementById('html5-player');
    return v ? (v.duration || 0) * 1000 : 0;
  },

  // Subtitle rendering tick
  startSubtitleTick() {
    this.stopSubtitleTick();
    if (!NinaflixSubs.enabled || NinaflixSubs.currentSubs.length === 0) return;

    this.subtitleInterval = setInterval(() => {
      if (!this.isPlaying) return;
      const time = this.getPosition();
      const sub = NinaflixSubs.findCurrent(NinaflixSubs.currentSubs, time);
      NinaflixHUD.updateSubtitle(sub ? sub.text : '');
    }, 200);
  },

  stopSubtitleTick() {
    if (this.subtitleInterval) {
      clearInterval(this.subtitleInterval);
      this.subtitleInterval = null;
    }
  }
};
