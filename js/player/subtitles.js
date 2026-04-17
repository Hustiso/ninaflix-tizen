// ═══════════════════════════════════════════
// Ninaflix — Auto-Subtitle Engine
// ═══════════════════════════════════════════

const NinaflixSubs = {
  OPENSUBTITLES: 'https://api.opensubtitles.com/api/v1',
  OPENSUBTITLES_KEY: 'RPFZdVkRkJWjPK8DeExTGBTStkddrUrG',
  LANG: 'en', // Default English
  cache: {},
  currentSubs: [],
  currentOffset: 0,
  enabled: true,

  // Fetch subtitles for content
  async fetch(imdbId, type, season, episode) {
    const cacheKey = `${imdbId}_${season || ''}_${episode || ''}`;
    if (this.cache[cacheKey]) return this.cache[cacheKey];

    let subs = [];

    // Layer 1: Check embedded (handled by AVPlay)
    // This is checked at playback time, not fetch time

    // Layer 2: OpenSubtitles by IMDB ID
    subs = await this.fetchOpenSubtitles(imdbId, type, season, episode);

    // Layer 3: Backup sources if needed
    if (subs.length === 0) {
      subs = await this.fetchBackup(imdbId, type, season, episode);
    }

    // Filter English only (or user preference)
    const settings = NinaflixStorage.getSettings();
    const lang = settings.subtitles || 'en';
    subs = subs.filter(s => s.lang === lang || s.language === lang);

    // Sort by download count (most popular = most likely correct)
    subs.sort((a, b) => (b.downloads || 0) - (a.downloads || 0));

    this.cache[cacheKey] = subs;
    return subs;
  },

  async fetchOpenSubtitles(imdbId, type, season, episode) {
    try {
      const params = new URLSearchParams({
        imdb_id: imdbId.replace('tt', ''),
        languages: this.LANG
      });
      if (season) params.set('season_number', season);
      if (episode) params.set('episode_number', episode);

      const res = await fetch(`${this.OPENSUBTITLES}/subtitles?${params}`, {
        headers: {
          'Api-Key': this.OPENSUBTITLES_KEY || NinaflixStorage.getSettings().opensubtitles_key || '',
          'User-Agent': 'Ninaflix v1.0.0'
        }
      });
      if (!res.ok) return [];
      const data = await res.json();
      return (data.data || []).map(s => ({
        id: s.attributes.subtitle_id,
        lang: s.attributes.language,
        downloads: s.attributes.download_count,
        ratings: s.attributes.ratings,
        fps: s.attributes.fps,
        upload_date: s.attributes.upload_date,
        files: s.attributes.files || [],
        url: s.attributes.url,
        source: 'opensubtitles'
      }));
    } catch { return []; }
  },

  async fetchBackup(imdbId, type, season, episode) {
    // Parallel fetch from multiple backup sources
    const results = await Promise.allSettled([
      this.fetchSubDL(imdbId, type, season, episode),
      this.fetchYIFY(imdbId)
    ]);
    return results.flatMap(r => r.status === 'fulfilled' ? r.value : []);
  },

  async fetchSubDL(imdbId, type, season, episode) {
    try {
      const res = await fetch(`https://api.subdl.com/auto?imdb_id=${imdbId}&languages=${this.LANG}`);
      if (!res.ok) return [];
      const data = await res.json();
      return (data.subs || []).map(s => ({
        lang: s.lang,
        url: s.url,
        downloads: 0,
        source: 'subdl'
      }));
    } catch { return []; }
  },

  async fetchYIFY(imdbId) {
    try {
      const res = await fetch(`https://yts-subs.com/api/episode?imdb=${imdbId}`);
      if (!res.ok) return [];
      const data = await res.json();
      return (data.subs || []).filter(s => s.lang === 'English').map(s => ({
        lang: 'en',
        url: s.url,
        downloads: s.rating || 0,
        source: 'yify'
      }));
    } catch { return []; }
  },

  // Download and parse subtitle file
  async download(sub) {
    const cacheKey = `sub_${sub.id || sub.url}`;
    const cached = NinaflixStorage.get(cacheKey);
    if (cached) return cached;

    try {
      const res = await fetch(sub.url || sub.download_link);
      if (!res.ok) return null;
      const text = await res.text();
      const parsed = this.parse(text);
      
      // Cache for 30 days
      NinaflixStorage.set(cacheKey, parsed);
      return parsed;
    } catch { return null; }
  },

  // Multi-format parser
  parse(text) {
    // Detect format
    if (text.trim().startsWith('WEBVTT')) return this.parseVTT(text);
    if (text.includes('[Script Info]')) return this.parseASS(text);
    if (text.match(/^\{(\d+)\}\{(\d+)\}/m)) return this.parseSUB(text);
    return this.parseSRT(text); // Default SRT
  },

  parseSRT(text) {
    const subs = [];
    const blocks = text.trim().replace(/\r\n/g, '\n').split(/\n\n+/);
    for (const block of blocks) {
      const lines = block.split('\n');
      if (lines.length < 3) continue;
      const timeMatch = lines[1].match(/(\d{2}):(\d{2}):(\d{2})[,.](\d{3})\s*-->\s*(\d{2}):(\d{2}):(\d{2})[,.](\d{3})/);
      if (!timeMatch) continue;
      const start = this.timeToMs(timeMatch[1], timeMatch[2], timeMatch[3], timeMatch[4]);
      const end = this.timeToMs(timeMatch[5], timeMatch[6], timeMatch[7], timeMatch[8]);
      const text = lines.slice(2).join('\n').replace(/<[^>]+>/g, '');
      if (text.trim()) subs.push({ start, end, text: text.trim() });
    }
    return this.sanitize(subs);
  },

  parseVTT(text) {
    const subs = [];
    const lines = text.split('\n');
    let i = 0;
    while (i < lines.length) {
      const timeMatch = lines[i].match(/(\d{2}):(\d{2}):(\d{2})[.](\d{3})\s*-->\s*(\d{2}):(\d{2}):(\d{2})[.](\d{3})/);
      if (timeMatch) {
        const start = this.timeToMs(timeMatch[1], timeMatch[2], timeMatch[3], timeMatch[4]);
        const end = this.timeToMs(timeMatch[5], timeMatch[6], timeMatch[7], timeMatch[8]);
        i++;
        let text = '';
        while (i < lines.length && lines[i].trim() !== '' && !lines[i].includes('-->')) {
          text += lines[i] + '\n';
          i++;
        }
        text = text.replace(/<[^>]+>/g, '').trim();
        if (text) subs.push({ start, end, text });
      }
      i++;
    }
    return this.sanitize(subs);
  },

  parseASS(text) {
    const subs = [];
    const lines = text.split('\n');
    let formatFields = [];
    for (const line of lines) {
      if (line.startsWith('Format:')) {
        formatFields = line.replace('Format:', '').split(',').map(f => f.trim().toLowerCase());
      }
      if (line.startsWith('Dialogue:')) {
        const parts = line.replace('Dialogue:', '').split(',');
        if (formatFields.length === 0) continue;
        const startIdx = formatFields.indexOf('start');
        const endIdx = formatFields.indexOf('end');
        const textIdx = formatFields.indexOf('text');
        if (startIdx < 0 || endIdx < 0 || textIdx < 0) continue;
        const start = this.parseASSTime(parts[startIdx]);
        const end = this.parseASSTime(parts[endIdx]);
        const text = parts.slice(textIdx).join(',')
          .replace(/\{[^}]+\}/g, '') // Strip ASS tags
          .replace(/\\N/g, '\n')
          .trim();
        if (text) subs.push({ start, end, text });
      }
    }
    return this.sanitize(subs);
  },

  parseSUB(text) {
    const subs = [];
    const regex = /\{(\d+)\}\{(\d+)\}(.+)/g;
    let match;
    while ((match = regex.exec(text)) !== null) {
      const fps = 23.976; // Default, could detect
      const start = Math.round(parseInt(match[1]) * 1000 / fps);
      const end = Math.round(parseInt(match[2]) * 1000 / fps);
      const text = match[3].replace(/\|/g, '\n').trim();
      if (text) subs.push({ start, end, text });
    }
    return this.sanitize(subs);
  },

  parseASSTime(str) {
    const m = str.trim().match(/(\d+):(\d{2}):(\d{2})[.](\d{2})/);
    if (!m) return 0;
    return parseInt(m[1]) * 3600000 + parseInt(m[2]) * 60000 + parseInt(m[3]) * 1000 + parseInt(m[4]) * 10;
  },

  timeToMs(h, m, s, ms) {
    return parseInt(h) * 3600000 + parseInt(m) * 60000 + parseInt(s) * 1000 + parseInt(ms);
  },

  // Sanitize: fix bad timestamps, overlaps, etc
  sanitize(subs) {
    if (subs.length === 0) return subs;
    return subs.filter(s => {
      if (s.start < 0) s.start = 0;
      if (s.end <= s.start) s.end = s.start + 500;
      if (s.end - s.start > 10000) s.end = s.start + 10000;
      return s.text.length > 0 && s.end > s.start;
    }).sort((a, b) => a.start - b.start);
  },

  // Auto-sync: calculate offset from duration
  autoSync(subs, videoDurationMs) {
    if (subs.length === 0 || !videoDurationMs) return subs;
    const lastSub = subs[subs.length - 1];
    const subDuration = lastSub.end;
    const offset = videoDurationMs - subDuration;
    if (Math.abs(offset) > 500 && Math.abs(offset) < 30000) {
      console.log(`[Subs] Auto-sync offset: ${offset}ms`);
      this.currentOffset = offset;
      return subs.map(s => ({ ...s, start: s.start + offset, end: s.end + offset }));
    }
    return subs;
  },

  // Find current subtitle at given time (binary search)
  findCurrent(subs, timeMs) {
    let lo = 0, hi = subs.length - 1;
    while (lo <= hi) {
      const mid = (lo + hi) >> 1;
      const s = subs[mid];
      if (timeMs >= s.start && timeMs <= s.end) return s;
      if (timeMs < s.end) hi = mid - 1;
      else lo = mid + 1;
    }
    return null;
  },

  // Adjust timing
  adjustOffset(ms) {
    this.currentOffset += ms;
    this.currentSubs = this.currentSubs.map(s => ({
      ...s, start: s.start + ms, end: s.end + ms
    }));
    console.log(`[Subs] Offset adjusted: ${this.currentOffset}ms`);
  },

  resetOffset() {
    this.currentOffset = 0;
  },

  toggle() {
    this.enabled = !this.enabled;
    return this.enabled;
  }
};
