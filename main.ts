// ═══════════════════════════════════════════
// Ninaflix Bridge — Deno Deploy Entry Point
// ═══════════════════════════════════════════
// Direct streaming links, no torrents, no deps

const providers = [
  {
    id: 'vidsrc', name: 'VidSrc', types: ['movie', 'tv'],
    async getStreams(type, imdbId, season, episode) {
      try {
        const url = type === 'movie'
          ? `https://vidsrc.to/embed/movie/${imdbId}`
          : `https://vidsrc.to/embed/tv/${imdbId}/${season}/${episode}`;
        const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0', 'Referer': 'https://vidsrc.to/' } });
        if (!res.ok) return [];
        const html = await res.text();
        const sources = [];
        for (const m of html.matchAll(/(https?:\/\/[^\s"'<>]+\.m3u8[^\s"'<>]*)/g)) {
          sources.push({ name: 'VidSrc', title: 'HLS Stream', url: m[1] });
        }
        return sources;
      } catch { return []; }
    }
  },
  {
    id: 'autoembed', name: 'AutoEmbed', types: ['movie', 'tv'],
    async getStreams(type, imdbId, season, episode) {
      try {
        const url = type === 'movie'
          ? `https://autoembed.co/embed/movie/${imdbId}`
          : `https://autoembed.co/embed/tv/${imdbId}/${season}/${episode}`;
        const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
        if (!res.ok) return [];
        const html = await res.text();
        const sources = [];
        for (const m of html.matchAll(/(https?:\/\/[^\s"'<>]+\.m3u8[^\s"'<>]*)/g)) {
          sources.push({ name: 'AutoEmbed', title: 'HLS', url: m[1] });
        }
        for (const m of html.matchAll(/(https?:\/\/[^\s"'<>]+\.mp4[^\s"'<>]*)/g)) {
          sources.push({ name: 'AutoEmbed', title: 'MP4', url: m[1] });
        }
        return sources;
      } catch { return []; }
    }
  },
  {
    id: 'multiembed', name: 'MultiEmbed', types: ['movie', 'tv'],
    async getStreams(type, imdbId, season, episode) {
      try {
        const url = type === 'movie'
          ? `https://multiembed.mov/?video_id=${imdbId}`
          : `https://multiembed.mov/?video_id=${imdbId}&s=${season}&e=${episode}`;
        const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
        if (!res.ok) return [];
        const html = await res.text();
        const sources = [];
        for (const m of html.matchAll(/(https?:\/\/[^\s"'<>]+\.m3u8[^\s"'<>]*)/g)) {
          sources.push({ name: 'MultiEmbed', title: 'Direct', url: m[1] });
        }
        return sources;
      } catch { return []; }
    }
  }
];

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': '*',
  'Content-Type': 'application/json'
};

Deno.serve({ port: 8000 }, async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 200, headers: cors });

  const url = new URL(req.url);
  const path = url.pathname;

  // Health
  if (path === '/' || path === '/manifest.json') {
    return new Response(JSON.stringify({
      id: 'ninaflix-bridge',
      name: 'Ninaflix Bridge',
      version: '1.0.0',
      description: 'Direct streaming links — no torrents',
      resources: ['stream'],
      types: ['movie', 'tv'],
      providers: providers.map(p => ({ id: p.id, name: p.name, types: p.types }))
    }), { headers: cors });
  }

  // Stream
  const m = path.match(/^\/stream\/(movie|tv)\/(.+)\.json$/);
  if (m) {
    const type = m[1];
    let id = m[2], season, episode;
    if (id.includes(':')) { const p = id.split(':'); id = p[0]; season = +p[1]; episode = +p[2]; }

    const results = await Promise.allSettled(providers.map(p => p.getStreams(type, id, season, episode)));
    const all = [];
    for (const r of results) if (r.status === 'fulfilled') all.push(...r.value);
    const seen = new Set();
    const unique = all.filter(s => s.url && !seen.has(s.url) && seen.add(s.url));

    return new Response(JSON.stringify({ streams: unique }), { headers: cors });
  }

  return new Response(JSON.stringify({ error: 'Not found' }), { status: 404, headers: cors });
});
