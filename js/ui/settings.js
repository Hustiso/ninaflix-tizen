// ═══════════════════════════════════════════
// Ninaflix — Settings Screen
// ═══════════════════════════════════════════

const NinaflixSettings = {
  overlay: null,

  init() {
    this.createOverlay();
  },

  createOverlay() {
    const el = document.createElement('div');
    el.id = 'settings-overlay';
    el.style.cssText = `
      position:fixed;inset:0;z-index:8500;display:none;
      background:rgba(8,8,8,.97);backdrop-filter:blur(20px);
      overflow-y:auto;padding:80px 48px 48px;
    `;
    el.innerHTML = `
      <div style="max-width:700px;margin:0 auto;">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:32px;">
          <h1 style="font-size:28px;font-weight:800;">Settings</h1>
          <button id="settings-close" style="
            background:rgba(255,255,255,.1);border:1px solid rgba(255,255,255,.06);
            color:#fff;padding:8px 20px;border-radius:var(--r);cursor:pointer;
            font-family:'Poppins',sans-serif;font-size:14px;
          ">Done</button>
        </div>

        <!-- Playback -->
        <div class="settings-section">
          <h2 style="font-size:16px;font-weight:600;color:var(--co);margin-bottom:16px;letter-spacing:.5px;">PLAYBACK</h2>
          <div class="settings-row">
            <span>Video Quality</span>
            <select id="set-quality" class="settings-select">
              <option value="auto">Auto (Recommended)</option>
              <option value="4k">4K Ultra HD</option>
              <option value="1080p">1080p Full HD</option>
              <option value="720p">720p HD</option>
            </select>
          </div>
          <div class="settings-row">
            <span>Auto-play Next Episode</span>
            <label class="toggle"><input type="checkbox" id="set-autoplay" checked><span class="toggle-slider"></span></label>
          </div>
        </div>

        <!-- Subtitles -->
        <div class="settings-section">
          <h2 style="font-size:16px;font-weight:600;color:var(--co);margin-bottom:16px;letter-spacing:.5px;">SUBTITLES</h2>
          <div class="settings-row">
            <span>Default Language</span>
            <select id="set-sub-lang" class="settings-select">
              <option value="en">English</option>
              <option value="es">Spanish</option>
              <option value="fr">French</option>
              <option value="de">German</option>
              <option value="pt">Portuguese</option>
              <option value="ja">Japanese</option>
              <option value="ko">Korean</option>
              <option value="zh">Chinese</option>
              <option value="off">Off</option>
            </select>
          </div>
          <div class="settings-row">
            <span>Subtitle Size</span>
            <select id="set-sub-size" class="settings-select">
              <option value="auto">Auto</option>
              <option value="small">Small</option>
              <option value="medium">Medium</option>
              <option value="large">Large</option>
            </select>
          </div>
          <div class="settings-row">
            <span>OpenSubtitles API Key</span>
            <span style="color:var(--gn);font-size:12px;">Pre-configured</span>
          </div>
        </div>

        <!-- Integrations -->
        <div class="settings-section">
          <h2 style="font-size:16px;font-weight:600;color:var(--co);margin-bottom:16px;letter-spacing:.5px;">INTEGRATIONS</h2>
          <div class="settings-row">
            <span>TMDB Metadata</span>
            <span style="color:var(--gn);font-size:12px;">Pre-configured</span>
          </div>
          <div class="settings-row">
            <span>Trakt Sync</span>
            <button id="set-trakt-btn" class="btn btn-info" style="padding:8px 16px;font-size:12px;">
              Connect (Optional)
            </button>
          </div>
        </div>

        <!-- Addons -->
        <div class="settings-section">
          <h2 style="font-size:16px;font-weight:600;color:var(--co);margin-bottom:16px;letter-spacing:.5px;">ADDONS</h2>
          <div id="settings-addon-list" style="margin-bottom:16px;"></div>
          <div style="display:flex;gap:8px;">
            <input type="text" id="set-addon-url" placeholder="Paste addon URL..." style="
              flex:1;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.06);
              color:#fff;padding:8px 12px;border-radius:var(--rs);font-family:'Poppins',sans-serif;font-size:13px;
            ">
            <button id="set-addon-add" class="btn btn-info" style="padding:8px 16px;font-size:12px;">Add</button>
          </div>
        </div>

        <!-- Kids Mode -->
        <div class="settings-section">
          <h2 style="font-size:16px;font-weight:600;color:var(--co);margin-bottom:16px;letter-spacing:.5px;">KIDS MODE</h2>
          <div class="settings-row">
            <span>Enable Kids Mode</span>
            <label class="toggle"><input type="checkbox" id="set-kids"><span class="toggle-slider"></span></label>
          </div>
          <div class="settings-row" id="kids-pin-row" style="display:none;">
            <span>PIN Code</span>
            <input type="password" id="set-kids-pin" maxlength="4" placeholder="4 digits" style="
              background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.06);
              color:#fff;padding:8px 12px;border-radius:var(--rs);font-family:'Poppins',sans-serif;
              font-size:13px;width:80px;text-align:center;letter-spacing:8px;
            ">
          </div>
        </div>

        <!-- About -->
        <div class="settings-section">
          <h2 style="font-size:16px;font-weight:600;color:var(--co);margin-bottom:16px;letter-spacing:.5px;">ABOUT</h2>
          <div style="text-align:center;padding:24px;">
            <img src="assets/nina.png" style="width:60px;opacity:.3;margin-bottom:12px;" alt="">
            <div style="font-size:14px;font-weight:600;">Ninaflix</div>
            <div style="font-size:12px;color:var(--t3);margin-top:4px;">Version 1.0.0 • Tizen Edition</div>
            <div style="font-size:11px;color:var(--t3);margin-top:8px;">made with ♥</div>
          </div>
        </div>
      </div>

      <style>
        .settings-section { margin-bottom: 32px; }
        .settings-row {
          display:flex;align-items:center;justify-content:space-between;
          padding:14px 0;border-bottom:1px solid rgba(255,255,255,.04);
          font-size:14px;
        }
        .settings-select {
          background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.06);
          color:#fff;padding:6px 12px;border-radius:var(--rs);
          font-family:'Poppins',sans-serif;font-size:13px;
        }
        .toggle { position:relative;display:inline-block;width:44px;height:24px; }
        .toggle input { opacity:0;width:0;height:0; }
        .toggle-slider {
          position:absolute;inset:0;background:rgba(255,255,255,.1);
          border-radius:24px;cursor:pointer;transition:.3s;
        }
        .toggle-slider::before {
          content:'';position:absolute;width:18px;height:18px;
          left:3px;bottom:3px;background:#fff;border-radius:50%;transition:.3s;
        }
        .toggle input:checked + .toggle-slider { background:var(--co); }
        .toggle input:checked + .toggle-slider::before { transform:translateX(20px); }
      </style>
    `;
    document.body.appendChild(el);
    this.overlay = el;

    document.getElementById('settings-close').onclick = () => this.close();
    document.getElementById('set-kids').onchange = (e) => {
      document.getElementById('kids-pin-row').style.display = e.target.checked ? 'flex' : 'none';
    };
    document.getElementById('set-addon-add').onclick = () => this.addAddon();
    document.getElementById('set-addon-url').addEventListener('keydown', (e) => {
      if (e.key === 'Enter') this.addAddon();
    });
    document.getElementById('set-trakt-btn').onclick = () => this.connectTrakt();
  },

  async addAddon() {
    const input = document.getElementById('set-addon-url');
    const url = (input.value || '').trim();
    if (!url) return;
    try {
      const manifest = await NinaflixAddons.add(url);
      if (manifest) {
        Ninaflix.toast('Added: ' + (manifest.name || manifest.id));
        input.value = '';
        this.loadCurrent();
      } else {
        Ninaflix.toast('Invalid addon URL');
      }
    } catch (e) {
      Ninaflix.toast('Failed to add addon');
    }
  },

  async connectTrakt() {
    if (!NinaflixTrakt.CLIENT_ID) {
      Ninaflix.toast('Set Trakt Client ID first');
      return;
    }
    try {
      Ninaflix.toast('Requesting Trakt code...');
      const code = await NinaflixTrakt.requestCode();
      if (code && code.user_code) {
        Ninaflix.toast(`Go to ${code.verification_url} and enter: ${code.user_code}`, 10000);
        await NinaflixTrakt.pollToken(code.device_code, code.interval || 5);
        Ninaflix.toast('Trakt connected!');
      }
    } catch (e) {
      Ninaflix.toast('Trakt connection failed');
    }
  },

  open() {
    this.overlay.style.display = 'block';
    this.loadCurrent();
  },

  close() {
    this.save();
    this.overlay.style.display = 'none';
  },

  loadCurrent() {
    const s = NinaflixStorage.getSettings();
    document.getElementById('set-quality').value = s.quality || 'auto';
    document.getElementById('set-sub-lang').value = s.subtitles || 'en';
    document.getElementById('set-sub-size').value = s.subtitle_size || 'auto';
    document.getElementById('set-autoplay').checked = s.autoplay_next !== false;
    document.getElementById('set-kids').checked = s.kids_mode || false;

    // Load addons
    const addons = NinaflixAddons.getInstalled();
    document.getElementById('settings-addon-list').innerHTML = addons.map(a => `
      <div style="display:flex;align-items:center;justify-content:space-between;padding:8px 0;font-size:13px;">
        <span>${a.name || a.id}</span>
        <button onclick="NinaflixAddons.remove('${a.id}');NinaflixSettings.loadCurrent();" style="
          background:none;border:none;color:var(--co);cursor:pointer;font-size:12px;
        ">Remove</button>
      </div>
    `).join('');
  },

  save() {
    const settings = {
      quality: document.getElementById('set-quality').value,
      subtitles: document.getElementById('set-sub-lang').value,
      subtitle_size: document.getElementById('set-sub-size').value,
      autoplay_next: document.getElementById('set-autoplay').checked,
      kids_mode: document.getElementById('set-kids').checked,
      ...(NinaflixStorage.getSettings()) // preserve other fields
    };
    NinaflixStorage.set('settings', settings);
  }
};
