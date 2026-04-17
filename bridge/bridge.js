// ═══════════════════════════════════════════
// Ninaflix Bridge — Direct Link Streaming Server
// ═══════════════════════════════════════════
//
// Lightweight server that provides direct streaming links.
// Embeds nuvio-style provider logic for popular sources.
// Deploy free on: Vercel, Railway, Render, Fly.io
//
// Endpoints:
//   GET /manifest.json        — Stremio-compatible manifest
//   GET /stream/:type/:id.json — Get direct streams
//   GET /providers            — List available providers
//

const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

// CORS — Tizen webview needs this
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', '*');
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});

// ═══════════════════════════════════════════
// Provider Registry
// ═══════════════════════════════════════════

const providers = [
  {
    id: 'vidsrc',
    name: 'VidSrc',
    types: ['movie', 'tv'],
    // VidSrc provides embed pages with m3u8 streams
    async getStreams(type, imdbId, season, episode) {
      try {
        let url;
        if (type === 'movie') {
          url = `https://vidsrc.to/embed/movie/${imdbId}`;
        } else {
          url = `https://vidsrc.to/embed/tv/${imdbId}/${season}/${episode}`;
        }

        const res = await fetch(url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Referer': 'https://vidsrc.to/'
          }
        });
        if (!res.ok) return [];

        const html = await res.text();

        // Extract source URLs from the embed page
        // VidSrc loads sources via /ajax/embed/crew or direct iframe
        const sources = [];

        // Pattern 1: Direct m3u8 in script
        const m3u8Match = html.match(/https?:\/\/[^\s"']+\.m3u8[^\s"']*/g);
        if (m3u8Match) {
          for (const m of m3u8Match) {
            sources.push({
              name: 'VidSrc',
              title: 'Direct Stream',
              url: m,
              behaviorHints: { notWebReady: true }
            });
          }
        }

        // Pattern 2: iframe source
        const iframeMatch = html.match(/src="(https?:\/\/[^"]+)"/g);
        if (iframeMatch) {
          for (const m of iframeMatch) {
            const src = m.replace('src="', '').replace('"', '');
            if (src.includes('vidsrc') || src.includes('multiembed')) {
              sources.push({
                name: 'VidSrc',
                title: 'Embed Stream',
                url: src,
                behaviorHints: { notWebReady: true, proxyHeaders: { referer: url } }
              });
            }
          }
        }

        return sources;
      } catch (e) {
        console.error(`[VidSrc] Error: ${e.message}`);
        return [];
      }
    }
  },
  {
    id: 'superstream',
    name: 'SuperStream',
    types: ['movie', 'tv'],
    async getStreams(type, imdbId, season, episode) {
      try {
        // SuperStream API endpoint
        const apiUrl = 'https://api.consumet.org/movies/superstream';
        let url;
        if (type === 'movie') {
          url = `${apiUrl}?id=${imdbId}`;
        } else {
          url = `${apiUrl}?id=${imdbId}&season=${season}&episode=${episode}`;
        }

        const res = await fetch(url, {
          headers: { 'User-Agent': 'Ninaflix/1.0' }
        });
        if (!res.ok) return [];
        const data = await res.json();

        return (data.results || []).map(s => ({
          name: 'SuperStream',
          title: `${s.quality || 'HD'} — ${s.server || 'Direct'}`,
          url: s.url,
          quality: s.quality
        }));
      } catch {
        return [];
      }
    }
  },
  {
    id: 'multiembed',
    name: 'MultiEmbed',
    types: ['movie', 'tv'],
    async getStreams(type, imdbId, season, episode) {
      try {
        let url;
        if (type === 'movie') {
          url = `https://multiembed.mov/?video_id=${imdbId}`;
        } else {
          url = `https://multiembed.mov/?video_id=${imdbId}&s=${season}&e=${episode}`;
        }

        const res = await fetch(url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
          }
        });
        if (!res.ok) return [];

        const html = await res.text();
        const sources = [];

        // MultiEmbed loads player via script — look for video sources
        const m3u8Match = html.match(/https?:\/\/[^\s"']+\.m3u8[^\s"']*/g);
        if (m3u8Match) {
          for (const m of m3u8Match) {
            sources.push({
              name: 'MultiEmbed',
              title: 'Direct Stream',
              url: m
            });
          }
        }

        return sources;
      } catch {
        return [];
      }
    }
  },
  {
    id: 'autoembed',
    name: 'AutoEmbed',
    types: ['movie', 'tv'],
    async getStreams(type, imdbId, season, episode) {
      try {
        let url;
        if (type === 'movie') {
          url = `https://autoembed.co/embed/movie/${imdbId}`;
        } else {
          url = `https://autoembed.co/embed/tv/${imdbId}/${season}/${episode}`;
        }

        const res = await fetch(url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
          }
        });
        if (!res.ok) return [];

        const html = await res.text();
        const sources = [];

        const m3u8Match = html.match(/https?:\/\/[^\s"']+\.m3u8[^\s"']*/g);
        const mp4Match = html.match(/https?:\/\/[^\s"']+\.mp4[^\s"']*/g);

        for (const m of (m3u8Match || [])) {
          sources.push({ name: 'AutoEmbed', title: 'HLS Stream', url: m });
        }
        for (const m of (mp4Match || [])) {
          sources.push({ name: 'AutoEmbed', title: 'MP4 Direct', url: m });
        }

        return sources;
      } catch {
        return [];
      }
    }
  }
];

// ═══════════════════════════════════════════
// Manifest
// ═══════════════════════════════════════════

app.get('/manifest.json', (req, res) => {
  res.json({
    id: 'ninaflix-bridge',
    name: 'Ninaflix Bridge',
    version: '1.0.0',
    description: 'Direct streaming links — no torrents',
    catalogs: [],
    resources: ['stream'],
    types: ['movie', 'tv'],
    idPrefixes: ['tt'],
    scrapers: providers.map(p => ({
      id: p.id,
      name: p.name,
      supportedTypes: p.types,
      enabled: true
    }))
  });
});

// ═══════════════════════════════════════════
// Stream Endpoint
// ═══════════════════════════════════════════

app.get('/stream/:type/:id.json', async (req, res) => {
  const { type, id } = req.params;

  // Parse imdbId — handle series format: tt1234567:1:5
  let imdbId = id;
  let season, episode;

  if (id.includes(':')) {
    const parts = id.split(':');
    imdbId = parts[0];
    season = parseInt(parts[1]);
    episode = parseInt(parts[2]);
  }

  console.log(`[Bridge] Stream request: ${type}/${imdbId}${season ? ` S${season}E${episode}` : ''}`);

  // Fan out to all providers in parallel
  const results = await Promise.allSettled(
    providers.map(p => p.getStreams(type, imdbId, season, episode))
  );

  const allStreams = [];
  for (const r of results) {
    if (r.status === 'fulfilled') {
      allStreams.push(...r.value);
    }
  }

  // Deduplicate by URL
  const seen = new Set();
  const unique = allStreams.filter(s => {
    if (!s.url || seen.has(s.url)) return false;
    seen.add(s.url);
    return true;
  });

  console.log(`[Bridge] Returning ${unique.length} streams from ${providers.length} providers`);
  res.json({ streams: unique });
});

// ═══════════════════════════════════════════
// Provider List
// ═══════════════════════════════════════════

app.get('/providers', (req, res) => {
  res.json({
    providers: providers.map(p => ({
      id: p.id,
      name: p.name,
      types: p.types
    }))
  });
});

// Health check
app.get('/', (req, res) => {
  res.json({
    status: 'online',
    service: 'ninaflix-bridge',
    providers: providers.length,
    uptime: process.uptime()
  });
});

app.listen(PORT, () => {
  console.log(`[Ninaflix Bridge] Running on port ${PORT}`);
  console.log(`[Ninaflix Bridge] ${providers.length} providers loaded`);
  console.log(`[Ninaflix Bridge] Manifest: http://localhost:${PORT}/manifest.json`);
});
