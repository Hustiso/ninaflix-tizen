// ═══════════════════════════════════════════
// Ninaflix — Nuvio Provider Bridge
// ═══════════════════════════════════════════
//
// Connects to a local nuvio-providers server
// to fetch streams from nuvio scrapers.
//
// Setup:
//   1. git clone https://github.com/tapframe/nuvio-providers
//   2. cd nuvio-providers && npm install
//   3. npm run serve (runs on port 3000)
//   4. Ninaflix auto-detects on LAN
//

const NinaflixNuvio = {
  // Auto-detect nuvio server on common addresses
  SERVERS: [
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    'http://192.168.1.5:3000',
    'http://192.168.1.100:3000',
    'http://10.0.0.5:3000'
  ],

  activeServer: null,
  providers: [],

  async init() {
    // Try to find a running nuvio server
    for (const url of this.SERVERS) {
      try {
        const res = await fetch(url + '/manifest.json', {
          signal: AbortSignal.timeout(2000)
        });
        if (res.ok) {
          const data = await res.json();
          this.activeServer = url;
          this.providers = data.scrapers || [];
          console.log(`[Nuvio] Connected: ${url} (${this.providers.length} providers)`);
          Ninaflix.toast(`Nuvio: ${this.providers.length} providers online`);
          return;
        }
      } catch { /* skip */ }
    }
    console.log('[Nuvio] No local server found — using Stremio addons only');
  },

  isConnected() {
    return !!this.activeServer;
  },

  async fetchStreams(type, imdbId, season, episode) {
    if (!this.activeServer) return [];

    // Nuvio server stream endpoint
    let url = `${this.activeServer}/stream/${type}/${imdbId}`;
    if (type === 'series' && season && episode) {
      url += `:${season}:${episode}`;
    }
    url += '.json';

    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
      if (!res.ok) return [];
      const data = await res.json();
      return (data.streams || []).map(s => ({
        ...s,
        _addonId: 'nuvio',
        _provider: s.provider || 'nuvio'
      }));
    } catch {
      return [];
    }
  },

  async fetchAllStreams(type, imdbId, season, episode) {
    if (!this.activeServer) return [];

    // Query each enabled provider individually for best results
    const results = [];
    const enabled = this.providers.filter(p => p.enabled !== false);

    const promises = enabled.map(async (provider) => {
      try {
        let url = `${this.activeServer}/stream/${provider.id}/${type}/${imdbId}`;
        if (type === 'series' && season && episode) {
          url += `:${season}:${episode}`;
        }
        url += '.json';

        const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
        if (!res.ok) return [];
        const data = await res.json();
        return (data.streams || []).map(s => ({
          ...s,
          _addonId: 'nuvio',
          _provider: provider.name || provider.id
        }));
      } catch {
        return [];
      }
    });

    const settled = await Promise.allSettled(promises);
    for (const r of settled) {
      if (r.status === 'fulfilled') results.push(...r.value);
    }

    return results;
  },

  getProviderList() {
    return this.providers.map(p => ({
      name: p.name,
      id: p.id,
      enabled: p.enabled !== false,
      types: p.supportedTypes || []
    }));
  }
};
