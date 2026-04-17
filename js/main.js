// ═══════════════════════════════════════════
// Ninaflix — Main Bootstrap (Full)
// ═══════════════════════════════════════════

const Ninaflix = {
  version: '1.0.0',
  ready: false,
  state: {
    screen: 'home',
    addons: [],
    catalog: [],
    playing: false,
    currentItem: null
  }
};

// Boot sequence
document.addEventListener('DOMContentLoaded', async () => {
  console.log('[Ninaflix] Booting v' + Ninaflix.version);

  // Register Tizen remote keys
  Ninaflix.registerRemoteKeys();

  // Core services
  await NinaflixStorage.init();

  // Load settings
  const settings = NinaflixStorage.getSettings();

  // Init TMDB if key available
  if (settings.tmdb_key) {
    NinaflixTMDB.init(settings.tmdb_key);
  }

  // Init Trakt
  NinaflixTrakt.init();

  // Init Kids Mode
  NinaflixKids.init();

  // Load addons
  await NinaflixAddons.load();

  // Init auto-play engine
  await NinaflixAutoPlay.init();

  // Init UI modules
  NinaflixUI.init();
  NinaflixDetail.init();
  NinaflixSettings.init();
  NinaflixSearch.init();
  NinaflixHUD.init();
  NinaflixPlayer.init();

  // Start splash
  NinaflixSplash.start();

  Ninaflix.ready = true;
  console.log('[Ninaflix] Ready — ' + Object.keys(NinaflixAddons.manifestCache).length + ' addons loaded');
});

// Tizen remote key registration
Ninaflix.registerRemoteKeys = function () {
  const keys = [
    'MediaPlay', 'MediaPause', 'MediaPlayPause',
    'MediaFastForward', 'MediaRewind',
    'MediaStop', 'MediaTrackPrevious', 'MediaTrackNext',
    'ColorF0Red', 'ColorF1Green', 'ColorF2Yellow', 'ColorF3Blue'
  ];
  if (window.tizen && window.tizen.tvinputdevice) {
    keys.forEach(key => {
      try { tizen.tvinputdevice.registerKey(key); } catch (e) { /* key may not exist on all models */ }
    });
    console.log('[Ninaflix] Remote keys registered');
  } else {
    console.log('[Ninaflix] Not Tizen — keyboard fallback active');
  }
};

// Global toast system
Ninaflix.toast = function (msg, duration = 3000) {
  let el = document.getElementById('nina-toast');
  if (!el) {
    el = document.createElement('div');
    el.id = 'nina-toast';
    el.style.cssText = `
      position:fixed;bottom:80px;left:50%;transform:translateX(-50%);z-index:99999;
      background:rgba(20,20,20,.95);color:#fff;padding:12px 28px;border-radius:10px;
      font-size:14px;font-family:'Poppins',sans-serif;pointer-events:none;
      opacity:0;transition:opacity .3s;backdrop-filter:blur(12px);
      border:1px solid rgba(255,255,255,.06);
    `;
    document.body.appendChild(el);
  }
  el.textContent = msg;
  el.style.opacity = '1';
  clearTimeout(el._timer);
  el._timer = setTimeout(() => { el.style.opacity = '0'; }, duration);
};

window.Ninaflix = Ninaflix;
