// ═══════════════════════════════════════════
// Ninaflix — Local Storage Service
// ═══════════════════════════════════════════

const NinaflixStorage = {
  PREFIX: 'ninaflix_',

  async init() {
    console.log('[Storage] Initialized');
    // Migrate old keys if needed
    this.migrate();
  },

  get(key, defaultVal = null) {
    try {
      const raw = localStorage.getItem(this.PREFIX + key);
      return raw ? JSON.parse(raw) : defaultVal;
    } catch { return defaultVal; }
  },

  set(key, value) {
    try {
      localStorage.setItem(this.PREFIX + key, JSON.stringify(value));
      return true;
    } catch { return false; }
  },

  remove(key) {
    localStorage.removeItem(this.PREFIX + key);
  },

  // Provider health database
  getProviderHealth() {
    return this.get('provider_health', { providers: {}, last_updated: 0 });
  },

  updateProviderHealth(domain, success) {
    const db = this.getProviderHealth();
    if (!db.providers[domain]) {
      db.providers[domain] = { success: 0, fail: 0, blocked: false, trust_score: 0.5 };
    }
    const p = db.providers[domain];
    if (success) { p.success++; } else { p.fail++; }
    p.trust_score = p.success / (p.success + p.fail + 1);
    if (p.fail >= 3 && p.success === 0) p.blocked = true;
    db.last_updated = Date.now();
    this.set('provider_health', db);
  },

  // Continue watching
  getProgress(imdbId) {
    return this.get('progress_' + imdbId, null);
  },

  setProgress(imdbId, data) {
    this.set('progress_' + imdbId, { ...data, updated: Date.now() });
  },

  // Favorites
  getFavorites() {
    return this.get('favorites', []);
  },

  toggleFavorite(imdbId) {
    const favs = this.getFavorites();
    const idx = favs.indexOf(imdbId);
    if (idx >= 0) favs.splice(idx, 1);
    else favs.push(imdbId);
    this.set('favorites', favs);
    return favs.includes(imdbId);
  },

  // Settings
  getSettings() {
    return this.get('settings', {
      quality: 'auto', // auto, 4k, 1080p, 720p
      subtitles: 'en', // language code
      subtitle_size: 'auto',
      autoplay_next: true,
      kids_mode: false
    });
  },

  migrate() {
    // Future migration logic
  }
};
