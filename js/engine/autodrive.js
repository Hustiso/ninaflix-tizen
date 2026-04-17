// ═══════════════════════════════════════════
// Ninaflix — Auto-Play Controller
// ═══════════════════════════════════════════

const NinaflixAutoPlay = {
  PROBE_TIMEOUT: 2000,
  PROBE_SIZE: 256 * 1024, // 256KB
  connectionSpeed: 100, // Mbps, detected on boot

  async init() {
    this.connectionSpeed = await this.measureSpeed();
    console.log(`[AutoPlay] Connection: ${this.connectionSpeed} Mbps`);
  },

  // Quick connection speed test
  async measureSpeed() {
    try {
      const start = performance.now();
      // Download a small test file from a fast CDN
      const res = await fetch('https://www.google.com/favicon.ico', { cache: 'no-store' });
      await res.blob();
      const elapsed = performance.now() - start;
      // Rough estimate: favicon ~4KB
      const mbps = (4 * 8) / (elapsed / 1000) / 1000;
      return Math.min(Math.max(mbps, 5), 200);
    } catch {
      return 50; // Default assumption
    }
  },

  // Probe a stream URL to check if it works
  async probe(url) {
    return new Promise((resolve) => {
      const controller = new AbortController();
      const timeout = setTimeout(() => {
        controller.abort();
        resolve({ alive: false, reason: 'timeout' });
      }, this.PROBE_TIMEOUT);

      fetch(url, {
        method: 'HEAD',
        signal: controller.signal,
        headers: { 'Range': 'bytes=0-1024' }
      }).then(res => {
        clearTimeout(timeout);
        const alive = res.ok || res.status === 206;
        resolve({ alive, status: res.status, type: res.headers.get('content-type') });
      }).catch(() => {
        clearTimeout(timeout);
        resolve({ alive: false, reason: 'error' });
      });
    });
  },

  // Parallel probe top N streams
  async probeTop(streams, count = 3) {
    const top = streams.slice(0, count);
    const probes = top.map(s => this.probe(s.url).then(r => ({ ...s, _probe: r })));
    const results = await Promise.all(probes);
    return results.filter(r => r._probe.alive);
  },

  // Full auto-play pipeline
  async play(type, imdbId, title) {
    console.log(`[AutoPlay] Playing: ${title} (${type}/${imdbId})`);

    // 1. Collect direct streams
    const streams = await NinaflixEngine.collect(type, imdbId);
    if (streams.length === 0) {
      console.warn('[AutoPlay] No streams found');
      return null;
    }

    // 2. Rank by quality + trust
    const ranked = NinaflixEngine.rank(streams, this.connectionSpeed);
    if (ranked.length === 0) {
      console.warn('[AutoPlay] All providers blocked');
      return null;
    }

    // 3. Probe top 3
    const alive = await this.probeTop(ranked, 3);
    if (alive.length === 0) {
      // Expand to top 6
      const moreAlive = await this.probeTop(ranked.slice(3), 3);
      if (moreAlive.length === 0) {
        console.warn('[AutoPlay] No working streams');
        return null;
      }
      alive.push(...moreAlive);
    }

    // 4. Select best
    const best = NinaflixEngine.selectBest(alive, this.connectionSpeed);
    console.log(`[AutoPlay] Selected: ${best._quality} from ${best._provider}`);

    // 5. Update provider health
    NinaflixStorage.updateProviderHealth(best._provider, true);

    return best;
  }
};
