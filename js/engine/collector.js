// ═══════════════════════════════════════════
// Ninaflix — Stream Collector & Ranker
// ═══════════════════════════════════════════

const NinaflixEngine = {
  
  // Collect streams from all addons, filter direct only
  async collect(type, imdbId) {
    const raw = await NinaflixAddons.fetchAllStreams(type, imdbId);
    const direct = raw.filter(s => this.isDirect(s));
    console.log(`[Engine] ${raw.length} total, ${direct.length} direct streams`);
    return direct;
  },

  // Check if stream is direct (not torrent/magnet)
  isDirect(stream) {
    if (stream.infoHash || stream.magnet) return false;
    if (!stream.url) return false;
    if (stream.url.startsWith('magnet:')) return false;
    if (stream.url.startsWith('torrent:')) return false;
    // Direct HTTP/HTTPS
    return stream.url.startsWith('http://') || stream.url.startsWith('https://');
  },

  // Score and rank streams
  rank(streams, connectionMbps = 100) {
    return streams.map(s => {
      const quality = this.parseQuality(s.name || s.title || '');
      const qualityScore = this.qualityScore(quality);
      const providerDomain = this.extractDomain(s.url);
      const health = NinaflixStorage.getProviderHealth();
      const providerTrust = health.providers[providerDomain]?.trust_score || 0.5;
      const providerBlocked = health.providers[providerDomain]?.blocked || false;

      if (providerBlocked) return null;

      // Connection-based quality preference
      let qualityWeight = 0.4;
      let speedWeight = 0.4;
      if (connectionMbps >= 80) {
        // Fast connection — prefer 4K
        qualityWeight = 0.5;
      } else if (connectionMbps < 25) {
        // Slow connection — prefer speed/lower quality
        qualityWeight = 0.3;
        speedWeight = 0.5;
      }

      const score = (qualityScore * qualityWeight) + (providerTrust * speedWeight) + (0.2 * 0.5);

      return {
        ...s,
        _quality: quality,
        _qualityScore: qualityScore,
        _provider: providerDomain,
        _trust: providerTrust,
        _score: score
      };
    }).filter(Boolean).sort((a, b) => b._score - a._score);
  },

  // Parse quality from stream name
  parseQuality(name) {
    const n = name.toLowerCase();
    if (n.includes('2160') || n.includes('4k') || n.includes('uhd')) return '4K';
    if (n.includes('1080')) return '1080p';
    if (n.includes('720')) return '720p';
    if (n.includes('480')) return '480p';
    return 'unknown';
  },

  qualityScore(quality) {
    switch (quality) {
      case '4K': return 1.0;
      case '1080p': return 0.8;
      case '720p': return 0.5;
      case '480p': return 0.2;
      default: return 0.4;
    }
  },

  extractDomain(url) {
    try {
      return new URL(url).hostname;
    } catch { return 'unknown'; }
  },

  // Select best quality for connection
  selectBest(ranked, connectionMbps = 100) {
    if (connectionMbps >= 80) {
      const fourK = ranked.find(s => s._quality === '4K');
      if (fourK) return fourK;
    }
    if (connectionMbps >= 25) {
      const hd = ranked.find(s => s._quality === '1080p');
      if (hd) return hd;
    }
    return ranked[0] || null;
  }
};
