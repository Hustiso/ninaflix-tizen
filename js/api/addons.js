// ═══════════════════════════════════════════
// Ninaflix — Stremio Addon Client
// ═══════════════════════════════════════════

const NinaflixAddons = {
  DEFAULT_ADDONS: [
    'https://v3-cinemeta.strem.io/catalog/movie/top.json',
    'https://v3-cinemeta.strem.io/catalog/series/top.json'
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
    // Stremio addon manifest is at {baseUrl}/manifest.json
    const manifestUrl = baseUrl.replace(/\/catalog\/.*/, '/manifest.json');
    try {
      const res = await fetch(manifestUrl);
      if (!res.ok) return null;
      const data = await res.json();
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
