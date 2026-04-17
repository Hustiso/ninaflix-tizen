// ═══════════════════════════════════════════
// Ninaflix — Stremio Addon Client
// ═══════════════════════════════════════════

const NinaflixAddons = {
  DEFAULT_ADDONS: [
    'https://v3-cinemeta.strem.io/catalog/movie/top.json',
    'https://v3-cinemeta.strem.io/catalog/series/top.json',
    'https://cinemeta-live.strem.io/addon/com.stremio.cinemeta/manifest.json',
    'https://opensubtitles-v3.strem.io/addon/manifest.json',
    'https://addon.seedr.io/manifest.json',
    'https://stremio-jackett.hybrid.up/reset/manifest.json',
    'https://94c8cb9f702d-tv-addon.baby-beamup.club/manifest.json',
    'https://5a5d7e0a5f118-stremio-netflix-catalog.baby-beamup.club/manifest.json'
  ],

  manifestCache: {},

  async load() {
    const saved = NinaflixStorage.get('addons', []);
    const addons = saved.length > 0 ? saved : this.DEFAULT_ADDONS;
    console.log('[Addons] Loading ' + addons.length + ' addons');

    for (const url of addons) {
      try {
        const manifest = await this.fetchManifest(url);
        if (manifest) {
          this.manifestCache[manifest.id] = manifest;
        }
      } catch (e) {
        console.warn('[Addons] Failed to load: ' + url);
      }
    }
  },

  async fetchManifest(baseUrl) {
    // Stremio addon manifest can be at {baseUrl}/manifest.json
    // Or the URL might already point to a catalog endpoint
    let manifestUrl;
    if (baseUrl.includes('/manifest.json')) {
      manifestUrl = baseUrl;
    } else if (baseUrl.includes('/catalog/')) {
      manifestUrl = baseUrl.replace(/\/catalog\/.*/, '/manifest.json');
    } else {
      // Base URL — append manifest.json
      manifestUrl = baseUrl.replace(/\/+$/, '') + '/manifest.json';
    }
    try {
      const res = await fetch(manifestUrl);
      if (!res.ok) return null;
      const data = await res.json();
      // Ensure url field is set for stream/catalog fetching
      if (!data.url) {
        // Derive base URL from the addon URL
        data.url = manifestUrl.replace(/\/manifest\.json$/, '');
      }
      return data;
    } catch { return null; }
  },

  async fetchCatalog(addonId, type, catalogId, extra = {}) {
    const manifest = this.manifestCache[addonId];
    if (!manifest) return [];

    // Build catalog URL
    let url = manifest.url || '';
    const extraStr = Object.entries(extra).map(([k,v]) => `${k}=${v}`).join('&');
    const catalogUrl = `${url}/catalog/${type}/${catalogId}.json${extraStr ? '?' + extraStr : ''}`;

    try {
      const res = await fetch(catalogUrl);
      if (!res.ok) return [];
      const data = await res.json();
      return data.metas || [];
    } catch { return []; }
  },

  async fetchMeta(addonId, type, imdbId) {
    const manifest = this.manifestCache[addonId];
    if (!manifest) return null;

    const url = (manifest.url || '') + `/meta/${type}/${imdbId}.json`;
    try {
      const res = await fetch(url);
      if (!res.ok) return null;
      const data = await res.json();
      return data.meta || null;
    } catch { return null; }
  },

  async fetchStreams(addonId, type, imdbId) {
    const manifest = this.manifestCache[addonId];
    if (!manifest) return [];

    const url = (manifest.url || '') + `/stream/${type}/${imdbId}.json`;
    try {
      const res = await fetch(url);
      if (!res.ok) return [];
      const data = await res.json();
      return data.streams || [];
    } catch { return []; }
  },

  async fetchAllStreams(type, imdbId) {
    const allStreams = [];
    for (const id of Object.keys(this.manifestCache)) {
      const streams = await this.fetchStreams(id, type, imdbId);
      for (const s of streams) {
        s._addonId = id;
        allStreams.push(s);
      }
    }
    return allStreams;
  },

  getInstalled() {
    return Object.values(this.manifestCache);
  },

  async add(addonUrl) {
    const manifest = await this.fetchManifest(addonUrl);
    if (!manifest) throw new Error('Invalid addon');
    this.manifestCache[manifest.id] = manifest;
    const saved = NinaflixStorage.get('addons', []);
    if (!saved.includes(addonUrl)) {
      saved.push(addonUrl);
      NinaflixStorage.set('addons', saved);
    }
    return manifest;
  },

  remove(addonId) {
    delete this.manifestCache[addonId];
    // Rebuild saved list
    const saved = Object.values(this.manifestCache).map(m => m.url || '');
    NinaflixStorage.set('addons', saved.filter(Boolean));
  }
};
