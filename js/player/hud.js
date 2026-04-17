// ═══════════════════════════════════════════
// Ninaflix — Player HUD & Controls
// ═══════════════════════════════════════════

const NinaflixHUD = {
  visible: false,
  hideTimer: null,
  subtitleEl: null,
  controlsEl: null,

  init() {
    this.createOverlay();
    this.bindKeys();
  },

  createOverlay() {
    // Create player overlay container
    const overlay = document.createElement('div');
    overlay.id = 'player-overlay';
    overlay.style.cssText = `
      position:fixed;inset:0;z-index:9500;display:none;
      background:rgba(0,0,0,.3);
    `;
    overlay.innerHTML = `
      <!-- Title bar -->
      <div id="hud-title" style="
        position:absolute;top:0;left:0;right:0;padding:20px 48px;
        background:linear-gradient(180deg,rgba(0,0,0,.7),transparent);
        display:flex;justify-content:space-between;align-items:center;
      ">
        <h3 id="hud-title-text" style="font-size:18px;font-weight:600;"></h3>
        <span id="hud-quality" style="
          font-size:11px;font-weight:600;color:var(--t3);
          background:rgba(255,255,255,.1);padding:4px 10px;border-radius:4px;
        "></span>
      </div>

      <!-- Subtitle display -->
      <div id="hud-subtitle" style="
        position:absolute;bottom:12%;left:10%;right:10%;
        text-align:center;font-size:28px;font-weight:500;
        color:#fff;text-shadow:0 2px 8px rgba(0,0,0,.8),0 0 20px rgba(0,0,0,.5);
        line-height:1.4;
      "></div>

      <!-- Bottom controls -->
      <div id="hud-controls" style="
        position:absolute;bottom:0;left:0;right:0;padding:20px 48px;
        background:linear-gradient(0deg,rgba(0,0,0,.8),transparent);
      ">
        <!-- Progress bar -->
        <div id="hud-progress" style="
          width:100%;height:4px;background:rgba(255,255,255,.2);
          border-radius:2px;margin-bottom:16px;cursor:pointer;position:relative;
        ">
          <div id="hud-progress-fill" style="
            height:100%;width:0%;background:var(--co);border-radius:2px;
            transition:width .3s;
          "></div>
          <div id="hud-progress-buffer" style="
            position:absolute;top:0;left:0;height:100%;width:0%;
            background:rgba(255,255,255,.1);border-radius:2px;
          "></div>
        </div>

        <!-- Controls row -->
        <div style="display:flex;align-items:center;justify-content:space-between;">
          <div style="display:flex;align-items:center;gap:24px;">
            <button class="hud-btn" id="hud-prev" style="font-size:20px;background:none;border:none;color:#fff;cursor:pointer;opacity:.8;">⏮</button>
            <button class="hud-btn" id="hud-play" style="font-size:28px;background:none;border:none;color:#fff;cursor:pointer;">⏸</button>
            <button class="hud-btn" id="hud-next" style="font-size:20px;background:none;border:none;color:#fff;cursor:pointer;opacity:.8;">⏭</button>
            <span id="hud-time" style="font-size:13px;color:var(--t2);font-weight:500;font-variant-numeric:tabular-nums;">
              00:00:00 / 00:00:00
            </span>
          </div>
          <div style="display:flex;align-items:center;gap:20px;">
            <button class="hud-btn" id="hud-audio" style="font-size:18px;background:none;border:none;color:#fff;cursor:pointer;opacity:.8;" title="Audio">🔊</button>
            <button class="hud-btn" id="hud-cc" style="font-size:18px;background:none;border:none;color:#fff;cursor:pointer;opacity:.8;" title="Subtitles">CC</button>
            <button class="hud-btn" id="hud-quality-btn" style="font-size:18px;background:none;border:none;color:#fff;cursor:pointer;opacity:.8;" title="Quality">⊡</button>
          </div>
        </div>
      </div>

      <!-- Episode panel (for series) -->
      <div id="hud-episodes" style="
        position:absolute;right:0;top:0;bottom:0;width:320px;
        background:rgba(10,10,10,.95);backdrop-filter:blur(12px);
        transform:translateX(100%);transition:transform .3s;
        overflow-y:auto;padding:20px;
      ">
        <h3 style="font-size:16px;font-weight:600;margin-bottom:16px;">Episodes</h3>
        <div id="hud-episode-list"></div>
      </div>
    `;
    document.body.appendChild(overlay);
    this.overlay = overlay;
    this.subtitleEl = document.getElementById('hud-subtitle');
    this.controlsEl = document.getElementById('hud-controls');

    // Bind control buttons
    document.getElementById('hud-play').onclick = () => this.togglePlayPause();
    document.getElementById('hud-cc').onclick = () => this.toggleSubs();
    document.getElementById('hud-prev').onclick = () => NinaflixPlayer.seek(NinaflixPlayer.getPosition() - 10000);
    document.getElementById('hud-next').onclick = () => NinaflixPlayer.seek(NinaflixPlayer.getPosition() + 30000);
  },

  show(stream, title) {
    this.overlay.style.display = 'block';
    document.getElementById('hud-title-text').textContent = title || '';
    document.getElementById('hud-quality').textContent = stream._quality || 'Auto';
    this.visible = true;
    this.startHideTimer();
  },

  hide() {
    if (!this.visible) return;
    this.overlay.style.display = 'none';
    this.visible = false;
  },

  toggle() {
    if (this.visible) this.hide();
    else {
      this.visible = true;
      this.overlay.style.display = 'block';
      this.startHideTimer();
    }
  },

  startHideTimer() {
    clearTimeout(this.hideTimer);
    this.hideTimer = setTimeout(() => {
      if (NinaflixPlayer.isPlaying) {
        this.controlsEl.style.opacity = '0';
        this.controlsEl.style.transition = 'opacity .3s';
        document.getElementById('hud-title').style.opacity = '0';
      }
    }, 4000);
  },

  showControls() {
    this.controlsEl.style.opacity = '1';
    document.getElementById('hud-title').style.opacity = '1';
    this.startHideTimer();
  },

  updateProgress(currentMs, durationMs) {
    const pct = durationMs > 0 ? (currentMs / durationMs * 100) : 0;
    document.getElementById('hud-progress-fill').style.width = pct + '%';
    document.getElementById('hud-time').textContent =
      this.fmtTime(currentMs) + ' / ' + this.fmtTime(durationMs);
  },

  updateSubtitle(text) {
    if (this.subtitleEl) {
      this.subtitleEl.textContent = text || '';
    }
  },

  togglePlayPause() {
    const btn = document.getElementById('hud-play');
    if (NinaflixPlayer.isPlaying) {
      NinaflixPlayer.pause();
      btn.textContent = '▶';
    } else {
      NinaflixPlayer.resume();
      btn.textContent = '⏸';
    }
    this.showControls();
  },

  toggleSubs() {
    const enabled = NinaflixSubs.toggle();
    const btn = document.getElementById('hud-cc');
    btn.style.opacity = enabled ? '1' : '.4';
    if (!enabled) this.updateSubtitle('');
  },

  bindKeys() {
    document.addEventListener('keydown', (e) => {
      if (!NinaflixPlayer.isPlaying) return;
      this.showControls();
      switch (e.key) {
        case 'ArrowLeft': NinaflixPlayer.seek(NinaflixPlayer.getPosition() - 10000); break;
        case 'ArrowRight': NinaflixPlayer.seek(NinaflixPlayer.getPosition() + 30000); break;
        case 'ArrowUp': NinaflixSubs.adjustOffset(250); break;
        case 'ArrowDown': NinaflixSubs.adjustOffset(-250); break;
        case 'Enter': this.togglePlayPause(); break;
        case 'Backspace': NinaflixPlayer.stop(); this.hide(); break;
      }
    });
  },

  fmtTime(ms) {
    const s = Math.floor(ms / 1000);
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    return `${h.toString().padStart(2,'0')}:${m.toString().padStart(2,'0')}:${sec.toString().padStart(2,'0')}`;
  },

  destroy() {
    if (this.overlay) this.overlay.remove();
    clearTimeout(this.hideTimer);
  }
};
