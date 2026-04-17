// ═══════════════════════════════════════════
// Ninaflix Bridge — Deno Deploy Edition
// ═══════════════════════════════════════════
// Free, no card, global edge network
// Deploy: deployctl deploy --project=ninaflix-bridge bridge/deno-bridge.js

const PORT = 8000;

const providers = [
  {
    id: 'vidsrc',
    name: 'VidSrc',
    types: ['movie', 'tv'],
    async getStreams(type, imdbId, season, episode) {
      try {
        const url = type === 'movie'
          ? `https://vidsrc.to/embed/movie/${imdbId}`
          : `https://vidsrc.to/embed/tv/${imdbId}/${season}/${episode}`;

        const res = await fetch(url, {
          headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36', 'Referer': 'https://vidsrc.to/' }
        });
        if (!res.ok) return [];
        const html = await res.text();
        const sources = [];

        // Extract m3u8 links
        const m3u8Matches = html.matchAll(/(https?:\/\/[^\s"'<>]+\.m3u8[^\s"'<>]*)/g);
        for (const m of m3u8Matches) {
          sources.push({ name: 'VidSrc', title: 'HLS Stream', url: m[1] });
        }

        // Extract embed iframes
        const iframeMatches = html.matchAll(/src="(https:\/\/[^"]*vidsrc[^"]*|https:\/\/[^"]*multiembed[^"]*)"/g);
        for (const m of iframeMatches) {
          sources.push({ name: 'VidSrc', title: 'Embed', url: m[1], behaviorHints: { proxyHeaders: { referer: url } } });
        }

        return sources;
      } catch { return []; }
    }
  },
  {
    id: 'autoembed',
    name: 'AutoEmbed',
    types: ['movie', 'tv'],
    async getStreams(type, imdbId, season, episode) {
      try {
        const url = type === 'movie'
          ? `https://autoembed.co/embed/movie/${imdbId}`
          : `https://autoembed.co/embed/tv/${imdbId}/${season}/${episode}`;

        const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
        if (!res.ok) return [];
        const html = await res.text();
        const sources = [];

        const m3u8Matches = html.matchAll(/(https?:\/\/[^\s"'<>]+\.m3u8[^\s"'<>]*)/g);
        for (const m of m3u8Matches) {
          sources.push({ name: 'AutoEmbed', title: 'HLS', url: m[1] });
        }
        const mp4Matches = html.matchAll(/(https?:\/\/[^\s"'<>]+\.mp4[^\s"'<>]*)/g);
        for (const m of mp4Matches) {
          sources.push({ name: 'AutoEmbed', title: 'MP4', url: m[1] });
        }
        return sources;
      } catch { return []; }
    }
  },
  {
    id: 'multiembed',
    name: 'MultiEmbed',
    types: ['movie', 'tv'],
    async getStreams(type, imdbId, season, episode) {
      try {
        const url = type === 'movie'
          ? `https://multiembed.mov/?video_id=${imdbId}`
          : `https://multiembed.mov/?video_id=${imdbId}&s=${season}&e=${episode}`;

        const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
        if (!res.ok) return [];
        const html = await res.text();
        const sources = [];

        const m3u8Matches = html.matchAll(/(https?:\/\/[^\s"'<>]+\.m3u8[^\s"'<>]*)/g);
        for (const m of m3u8Matches) {
          sources.push({ name: 'MultiEmbed', title: 'Direct', url: m[1] });
        }
        return sources;
      } catch { return []; }
    }
  },
  {
    id: 'nontongo',
    name: 'Nontongo',
    types: ['movie', 'tv'],
    async getStreams(type, imdbId, season, episode) {
      try {
        const url = type === 'movie'
          ? `https://nontongo.win/embed/movie/${imdbId}`
          : `https://nontongo.win/embed/tv/${imdbId}/${season}/${episode}`;

        const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
        if (!res.ok) return [];
        const html = await res.text();
        const sources = [];

        const m3u8Matches = html.matchAll(/(https?:\/\/[^\s"'<>]+\.m3u8[^\s"'<>]*)/g);
        for (const m of m3u8Matches) {
          sources.push({ name: 'Nontongo', title: 'HLS', url: m[1] });
        }
        return sources;
      } catch { return []; }
    }
  }
];

// ═══════════════════════════════════════════
// HTTP Server
// ═══════════════════════════════════════════

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': '*',
    'Content-Type': 'application/json'
  };
}

async function handler(req) {
  const url = new URL(req.url);
  const path = url.pathname;

  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders() });
  }

  // Manifest
  if (path === '/manifest.json' || path === '/') {
    return new Response(JSON.stringify({
      id: 'ninaflix-bridge',
      name: 'Ninaflix Bridge',
      version: '1.0.0',
      description: 'Direct streaming links — no torrents',
      resources: ['stream'],
      types: ['movie', 'tv'],
      idPrefixes: ['tt'],
      providers: providers.map(p => ({ id: p.id, name: p.name, types: p.types }))
    }), { headers: corsHeaders() });
  }

  // Stream endpoint
  const streamMatch = path.match(/^\/stream\/(movie|tv)\/(.+)\.json$/);
  if (streamMatch) {
    const type = streamMatch[1];
    const id = streamMatch[2];

    let imdbId = id, season, episode;
    if (id.includes(':')) {
      const parts = id.split(':');
      imdbId = parts[0];
      season = parseInt(parts[1]);
      episode = parseInt(parts[2]);
    }

    console.log(`[Bridge] ${type}/${imdbId}${season ? ` S${season}E${episode}` : ''}`);

    const results = await Promise.allSettled(
      providers.map(p => p.getStreams(type, imdbId, season, episode))
    );

    const allStreams = [];
    for (const r of results) {
      if (r.status === 'fulfilled') allStreams.push(...r.value);
    }

    // Deduplicate
    const seen = new Set();
    const unique = allStreams.filter(s => {
      if (!s.url || seen.has(s.url)) return false;
      seen.add(s.url);
      return true;
    });

    console.log(`[Bridge] ${unique.length} streams from ${providers.length} providers`);
    return new Response(JSON.stringify({ streams: unique }), { headers: corsHeaders() });
  }

  // Providers list
  if (path === '/providers') {
    return new Response(JSON.stringify({
      providers: providers.map(p => ({ id: p.id, name: p.name, types: p.types }))
    }), { headers: corsHeaders() });
  }

  return new Response(JSON.stringify({ error: 'Not found' }), { status: 404, headers: corsHeaders() });
}

// Run server
console.log(`[Ninaflix Bridge] Starting on port ${PORT}`);
Deno.serve({ port: PORT }, handler);
