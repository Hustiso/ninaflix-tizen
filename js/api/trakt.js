// ═══════════════════════════════════════════
// Ninaflix — Trakt Integration
// ═══════════════════════════════════════════

const NinaflixTrakt = {
  BASE: 'https://api.trakt.tv',
  CLIENT_ID: '', // Set by user in settings
  CLIENT_SECRET: '',
  token: null,

  init() {
    this.token = NinaflixStorage.get('trakt_token', null);
    const settings = NinaflixStorage.getSettings();
    this.CLIENT_ID = settings.trakt_client_id || '';
    console.log('[Trakt] ' + (this.token ? 'Authenticated' : 'Not connected'));
  },

  get headers() {
    return {
      'Content-Type': 'application/json',
      'trakt-api-version': '2',
      'trakt-api-key': this.CLIENT_ID,
      ...(this.token ? { 'Authorization': `Bearer ${this.token.access_token}` } : {})
    };
  },

  // Device auth flow (TV-friendly)
  async requestCode() {
    const res = await fetch(`${this.BASE}/oauth/device/code`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ client_id: this.CLIENT_ID })
    });
    return res.json();
    // Returns: { device_code, user_code, verification_url, expires_in, interval }
  },

  async pollToken(deviceCode, interval = 5) {
    return new Promise((resolve, reject) => {
      const poll = setInterval(async () => {
        try {
          const res = await fetch(`${this.BASE}/oauth/device/token`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              code: deviceCode,
              client_id: this.CLIENT_ID,
              client_secret: this.CLIENT_SECRET
            })
          });
          if (res.ok) {
            const data = await res.json();
            this.token = data;
            NinaflixStorage.set('trakt_token', data);
            clearInterval(poll);
            resolve(data);
          }
          // 400 = pending, keep polling
        } catch (e) {
          clearInterval(poll);
          reject(e);
        }
      }, interval * 1000);

      // Timeout after 10 minutes
      setTimeout(() => { clearInterval(poll); reject(new Error('Timeout')); }, 600000);
    });
  },

  isConnected() {
    return !!this.token;
  },

  // Scrobble
  async scrobble(action, type, imdbId, progress) {
    if (!this.token) return;
    const body = { progress };
    body[type] = { ids: { imdb: imdbId } };
    await fetch(`${this.BASE}/scrobble/${action}`, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify(body)
    });
  },

  async scrobbleStart(type, imdbId) { return this.scrobble('start', type, imdbId, 0); },
  async scrobblePause(type, imdbId, progress) { return this.scrobble('pause', type, imdbId, progress); },
  async scrobbleStop(type, imdbId, progress) { return this.scrobble('stop', type, imdbId, progress); },

  // Watch history
  async addToHistory(type, imdbId, watchedAt) {
    if (!this.token) return;
    const body = [{ ids: { imdb: imdbId }, watched_at: watchedAt || new Date().toISOString() }];
    await fetch(`${this.BASE}/sync/history/${type}s`, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify(body)
    });
  },

  // Lists
  async getWatchlist() {
    if (!this.token) return [];
    try {
      const res = await fetch(`${this.BASE}/sync/watchlist`, { headers: this.headers });
      if (!res.ok) return [];
      return res.json();
    } catch { return []; }
  },

  // User stats
  async getUserStats() {
    if (!this.token) return null;
    try {
      const res = await fetch(`${this.BASE}/users/me/stats`, { headers: this.headers });
      if (!res.ok) return null;
      return res.json();
    } catch { return null; }
  }
};
