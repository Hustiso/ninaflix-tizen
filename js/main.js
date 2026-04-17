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

window.Ninaflix = Ninaflix;
