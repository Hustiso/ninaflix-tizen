// ═══════════════════════════════════════════
// Ninaflix Bridge — Deno Deploy (Fixed)
// ═══════════════════════════════════════════
// Follows embed chains to extract direct m3u8/mp4 links

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

async function fetchHTML(url, referer) {
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': UA,
        ...(referer ? { 'Referer': referer } : {})
      }
    });
    if (!res.ok) return '';
    return await res.text();
  } catch { return ''; }
}

function extractUrls(html) {
  const m3u8 = [...html.matchAll(/(https?:\/\/[^\s"'<>\\]+\.m3u8[^\s"'<>\\]*)/g)].map(m => m[1]);
  const mp4 = [...html.matchAll(/(https?:\/\/[^\s"'<>\\]+\.mp4[^\s"'<>\\]*)/g)].map(m => m[1]);
  const iframes = [...html.matchAll(/src=["'](https?:\/\/[^"']+)["']/g)].map(m => m[1])
    .filter(u => !u.includes('ads') && !u.includes('analytics') && !u.includes('cdn-cgi'));
  return { m3u8, mp4, iframes };
}

// Deep extraction: follow iframe chain up to 3 levels
async function deepExtract(url, depth = 0, referer) {
  if (depth > 3) return { m3u8: [], mp4: [] };

  const html = await fetchHTML(url, referer);
  if (!html) return { m3u8: [], mp4: [] };

  const { m3u8, mp4, iframes } = extractUrls(html);

  // Found direct links
  if (m3u8.length > 0 || mp4.length > 0) {
    return { m3u8, mp4 };
  }

  // Follow iframes deeper
  for (const iframe of iframes) {
    if (iframe.includes('vidsrc') || iframe.includes('vsembed') ||
        iframe.includes('multiembed') || iframe.includes('autoembed') ||
        iframe.includes('embed') || iframe.includes('player')) {
      const deeper = await deepExtract(iframe, depth + 1, url);
      if (deeper.m3u8.length > 0 || deeper.mp4.length > 0) {
        return deeper;
      }
    }
  }

  return { m3u8: [], mp4: [] };
}

// ═══════════════════════════════════════════
// Providers
// ═══════════════════════════════════════════

const providers = [
  {
    id: 'vidsrc', name: 'VidSrc', types: ['movie', 'tv'],
    async getStreams(type, imdbId, season, episode) {
      const url = type === 'movie'
        ? `https://vidsrc.to/embed/movie/${imdbId}`
        : `https://vidsrc.to/embed/tv/${imdbId}/${season}/${episode}`;

      const { m3u8, mp4 } = await deepExtract(url, 0, 'https://vidsrc.to/');
      const streams = [];
      for (const u of m3u8) streams.push({ name: 'VidSrc', title: 'HLS Stream', url: u });
      for (const u of mp4) streams.push({ name: 'VidSrc', title: 'MP4 Direct', url: u });
      return streams;
    }
  },
  {
    id: 'autoembed', name: 'AutoEmbed', types: ['movie', 'tv'],
    async getStreams(type, imdbId, season, episode) {
      const url = type === 'movie'
        ? `https://autoembed.co/embed/movie/${imdbId}`
        : `https://autoembed.co/embed/tv/${imdbId}/${season}/${episode}`;

      const { m3u8, mp4 } = await deepExtract(url, 0);
      const streams = [];
      for (const u of m3u8) streams.push({ name: 'AutoEmbed', title: 'HLS', url: u });
      for (const u of mp4) streams.push({ name: 'AutoEmbed', title: 'MP4', url: u });
      return streams;
    }
  },
  {
    id: 'multiembed', name: 'MultiEmbed', types: ['movie', 'tv'],
    async getStreams(type, imdbId, season, episode) {
      const url = type === 'movie'
        ? `https://multiembed.mov/?video_id=${imdbId}`
        : `https://multiembed.mov/?video_id=${imdbId}&s=${season}&e=${episode}`;

      const { m3u8, mp4 } = await deepExtract(url, 0);
      const streams = [];
      for (const u of m3u8) streams.push({ name: 'MultiEmbed', title: 'Direct', url: u });
      for (const u of mp4) streams.push({ name: 'MultiEmbed', title: 'MP4', url: u });
      return streams;
    }
  },
  {
    id: 'vidlink', name: 'VidLink', types: ['movie', 'tv'],
    async getStreams(type, imdbId, season, episode) {
      const url = type === 'movie'
        ? `https://vidlink.pro/movie/${imdbId}`
        : `https://vidlink.pro/tv/${imdbId}/${season}/${episode}`;

      const { m3u8, mp4 } = await deepExtract(url, 0);
      const streams = [];
      for (const u of m3u8) streams.push({ name: 'VidLink', title: 'HLS', url: u });
      for (const u of mp4) streams.push({ name: 'VidLink', title: 'MP4', url: u });
      return streams;
    }
  },
  {
    id: 'nontongo', name: 'Nontongo', types: ['movie', 'tv'],
    async getStreams(type, imdbId, season, episode) {
      const url = type === 'movie'
        ? `https://nontongo.win/embed/movie/${imdbId}`
        : `https://nontongo.win/embed/tv/${imdbId}/${season}/${episode}`;

      const { m3u8, mp4 } = await deepExtract(url, 0);
      const streams = [];
      for (const u of m3u8) streams.push({ name: 'Nontongo', title: 'HLS', url: u });
      for (const u of mp4) streams.push({ name: 'Nontongo', title: 'MP4', url: u });
      return streams;
    }
  }
];

// ═══════════════════════════════════════════
// Server
// ═══════════════════════════════════════════

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
      version: '1.1.0',
      description: 'Direct streaming — deep embed extraction',
      providers: providers.map(p => ({ id: p.id, name: p.name, types: p.types }))
    }), { headers: cors });
  }

  // Stream
  const m = path.match(/^\/stream\/(movie|tv)\/(.+)\.json$/);
  if (m) {
    const type = m[1];
    let id = m[2], season, episode;
    if (id.includes(':')) { const p = id.split(':'); id = p[0]; season = +p[1]; episode = +p[2]; }

    console.log(`[Bridge] ${type}/${id}${season ? ` S${season}E${episode}` : ''}`);

    // Fan out to all providers
    const results = await Promise.allSettled(providers.map(p => p.getStreams(type, id, season, episode)));
    const all = [];
    for (const r of results) if (r.status === 'fulfilled') all.push(...r.value);

    // Deduplicate
    const seen = new Set();
    const unique = all.filter(s => s.url && !seen.has(s.url) && seen.add(s.url));

    console.log(`[Bridge] ${unique.length} streams from ${providers.length} providers`);
    return new Response(JSON.stringify({ streams: unique }), { headers: cors });
  }

  return new Response(JSON.stringify({ error: 'Not found' }), { status: 404, headers: cors });
});
