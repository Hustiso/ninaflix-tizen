// ═══════════════════════════════════════════
// Ninaflix — Nuvio Provider Bridge
// ═══════════════════════════════════════════
//
// Auto-detects streaming provider servers:
//   1. Ninaflix Bridge (self-hosted or public)
//   2. Local nuvio-providers server
//   3. Falls back to Stremio addons only
//

const NinaflixNuvio = {
  // Known bridge endpoints — checked at boot
  SERVERS: [
    // Deno Deploy (live)
    'https://ninaflix-tizen-62-wskp6gvf1fcn.hustiso.deno.net',
    // Deno Deploy (custom domain fallback)
    'https://ninaflix-bridge.deno.dev',
    // Vercel (if deployed)
    'https://ninaflix-bridge.vercel.app',
    // Render (if deployed)
    'https://ninaflix-bridge.onrender.com',
    // Local development
    'http://localhost:3000',
    'http://localhost:8000',
    'http://127.0.0.1:3000'
  ],

  activeServer: null,
  providers: [],

  async init() {
    // Check all known servers in parallel with short timeouts
    const checks = this.SERVERS.map(url =>
      fetch(url + '/manifest.json', {
        signal: AbortSignal.timeout(3000)
      })
        .then(res => res.ok ? res.json().then(data => ({ url, data })) : null)
        .catch(() => null)
    );

    const results = await Promise.all(checks);
    const found = results.find(Boolean);

    if (found) {
      this.activeServer = found.url;
      this.providers = found.data.scrapers || found.data.providers || [];
      console.log(`[Nuvio] Connected: ${found.url} (${this.providers.length} providers)`);
      Ninaflix.toast(`Streaming: ${this.providers.length} providers online`);
    } else {
      console.log('[Nuvio] No bridge found — using Stremio addons only');
    }
  },

  isConnected() {
    return !!this.activeServer;
  },

  async fetchStreams(type, imdbId, season, episode) {
    if (!this.activeServer) return [];

    let url = `${this.activeServer}/stream/${type}/${imdbId}`;
    if (season && episode) {
      url += `:${season}:${episode}`;
    }
    url += '.json';

    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
      if (!res.ok) return [];
      const data = await res.json();
      return (data.streams || []).map(s => ({
        ...s,
        _addonId: 'bridge',
        _provider: s.name || s.provider || 'bridge'
      }));
    } catch {
      return [];
    }
  },

  async fetchAllStreams(type, imdbId, season, episode) {
    return this.fetchStreams(type, imdbId, season, episode);
  },

  getProviderList() {
    return this.providers.map(p => ({
      name: p.name,
      id: p.id,
      types: p.supportedTypes || p.types || []
    }));
  }
};
