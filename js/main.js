// ═══════════════════════════════════════════
// Ninaflix — Main Bootstrap
// ═══════════════════════════════════════════

const Ninaflix = {
  version: '1.0.0',
  ready: false,
  state: {
    screen: 'home',
    addons: [],
    catalog: [],
    playing: false
  }
};

// Boot sequence
document.addEventListener('DOMContentLoaded', async () => {
  console.log('[Ninaflix] Booting v' + Ninaflix.version);

  // Init modules
  await NinaflixStorage.init();
  await NinaflixAddons.load();
  NinaflixUI.init();
  NinaflixSplash.start();

  Ninaflix.ready = true;
  console.log('[Ninaflix] Ready');
});

window.Ninaflix = Ninaflix;
