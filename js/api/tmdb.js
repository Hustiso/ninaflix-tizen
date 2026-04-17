// ═══════════════════════════════════════════
// Ninaflix — TMDB Metadata Service
// ═══════════════════════════════════════════

const NinaflixTMDB = {
  BASE: 'https://api.themoviedb.org/3',
  IMG: 'https://image.tmdb.org/t/p',
  // API key — replace with your own or use env
  KEY: '',

  cache: {},

  init(apiKey) {
    this.KEY = apiKey || '';
    console.log('[TMDB] ' + (this.KEY ? 'Configured' : 'No API key'));
  },

  async search(query, type = 'multi') {
    if (!this.KEY) return [];
    const url = `${this.BASE}/search/${type}?api_key=${this.KEY}&query=${encodeURIComponent(query)}`;
    try {
      const res = await fetch(url);
      if (!res.ok) return [];
      const data = await res.json();
      return data.results || [];
    } catch { return []; }
  },

  async getDetails(tmdbId, type = 'movie') {
    const key = `${type}_${tmdbId}`;
    if (this.cache[key]) return this.cache[key];

    if (!this.KEY) return null;
    const url = `${this.BASE}/${type}/${tmdbId}?api_key=${this.KEY}&append_to_response=credits,videos,external_ids`;
    try {
      const res = await fetch(url);
      if (!res.ok) return null;
      const data = await res.json();
      this.cache[key] = data;
      return data;
    } catch { return null; }
  },

  async getEpisodes(tvId, seasonNum) {
    if (!this.KEY) return [];
    const url = `${this.BASE}/tv/${tvId}/season/${seasonNum}?api_key=${this.KEY}`;
    try {
      const res = await fetch(url);
      if (!res.ok) return [];
      const data = await res.json();
      return data.episodes || [];
    } catch { return []; }
  },

  async imdbToTmdb(imdbId) {
    if (!this.KEY) return null;
    const url = `${this.BASE}/find/${imdbId}?api_key=${this.KEY}&external_source=imdb_id`;
    try {
      const res = await fetch(url);
      if (!res.ok) return null;
      const data = await res.json();
      const movie = data.movie_results?.[0];
      const tv = data.tv_results?.[0];
      if (movie) return { id: movie.id, type: 'movie', ...movie };
      if (tv) return { id: tv.id, type: 'tv', ...tv };
      return null;
    } catch { return null; }
  },

  img(path, size = 'w500') {
    if (!path) return '';
    return `${this.IMG}/${size}${path}`;
  },

  backdrop(path) {
    return this.img(path, 'w1280');
  },

  poster(path) {
    return this.img(path, 'w342');
  }
};
