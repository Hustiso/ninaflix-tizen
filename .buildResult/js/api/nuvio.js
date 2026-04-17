// ═══════════════════════════════════════════
// Ninaflix — Streaming Bridge Client
// ═══════════════════════════════════════════
//
// Auto-detects local bridge server on LAN.
// Bridge runs on user's PC: cd bridge && start-bridge.bat
//

const NinaflixNuvio = {
  // Checked at boot — local bridge first
  SERVERS: [
    'http://localhost:3000',
    'http://127.0.0.1:3000'
  ],

  activeServer: null,
  providers: [],

  async init() {
    // Parallel check all known servers
    const checks = this.SERVERS.map(url =>
      fetch(url + '/manifest.json', { signal: AbortSignal.timeout(2000) })
        .then(res => res.ok ? res.json().then(data => ({ url, data })) : null)
        .catch(() => null)
    );

    const results = await Promise.all(checks);
    const found = results.find(Boolean);

    if (found) {
      this.activeServer = found.url;
      this.providers = found.data.scrapers || found.data.providers || [];
      console.log(`[Bridge] Connected: ${found.url} (${this.providers.length} providers)`);
      Ninaflix.toast(`Bridge: ${this.providers.length} providers online`);
    } else {
      console.log('[Bridge] No local bridge found');
    }
  },

  isConnected() {
    return !!this.activeServer;
  },

  async fetchStreams(type, imdbId, season, episode) {
    if (!this.activeServer) return [];

    let url = `${this.activeServer}/stream/${type}/${imdbId}`;
    if (season && episode) url += `:${season}:${episode}`;
    url += '.json';

    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(15000) });
      if (!res.ok) return [];
      const data = await res.json();
      return (data.streams || []).map(s => ({
        ...s,
        _addonId: 'bridge',
        _provider: s.name || 'bridge'
      }));
    } catch {
      return [];
    }
  },

  async fetchAllStreams(type, imdbId, season, episode) {
    return this.fetchStreams(type, imdbId, season, episode);
  }
};
