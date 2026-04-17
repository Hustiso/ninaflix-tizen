// ═══════════════════════════════════════════
// Ninaflix — README
// ═══════════════════════════════════════════

# Ninaflix Tizen

Premium streaming app for Samsung Tizen TV (6-9). Ultra lightweight (<200KB).

## Features

- **Stremio Addon Ecosystem** — Browse catalogs from any Stremio addon
- **Direct Streaming** — No torrents. Direct links only. Fast.
- **Auto-Play Engine** — Scores, probes, and plays the best stream automatically
- **Smart Quality** — Auto-selects 4K/1080p/720p based on connection speed
- **Auto Subtitles** — English default. Perfect sync. Multiple sources.
- **Provider Health** — Learns which providers work, auto-skips blocked ones
- **TMDB Metadata** — Rich movie/show information
- **Trakt Sync** — Watch history, scrobble, lists
- **Kids Mode** — PIN-protected content filtering
- **Nina Animations** — Wiggling logo, splash with laugh, easter eggs

## Installation

### Option 1: TizenBrew (Easiest — No PC Required)
1. Install [TizenBrew](https://github.com/nicedayzhu/tizenbrew) on your Samsung TV
2. Open TizenBrew → Add Module
3. Enter: `Hustiso/ninaflix-tizen`
4. Launch Ninaflix from TizenBrew

### Option 2: Sideload from PC (Developer Mode)
1. **Enable Developer Mode on TV:**
   - Open Apps on TV
   - Press `1 2 3 4 5` on the remote number pad
   - Set your PC's IP address, port `26101`
   - TV reboots in Developer Mode
2. **Install:**
   ```bash
   # Windows:
   push-to-tv.bat <TV_IP>
   
   # Or manually:
   sdb connect <TV_IP>
   # Build and install:
   tizen build-web
   tizen package -t wgt -o ./release -- .buildResult
   tizen install -n ./release/Ninaflix.wgt
   ```

### Option 3: Download Pre-built .wgt
Check [GitHub Releases](https://github.com/Hustiso/ninaflix-tizen/releases) for auto-built `.wgt` files.
Download and sideload via SDB or Tizen CLI.

### Option 4: Browser Test (No TV Needed)
Open `test.html` in any browser to run the test harness, or open `index.html` directly to use the app (desktop/mobile, no Tizen required).

## Architecture

```
css/          — Design system (coral theme, Poppins, animations)
js/
  api/        — Stremio addon client
  player/     — AVPlay + HTML5 fallback
  engine/     — Auto-play: collector, ranker, prober
  services/   — Storage, cache, provider health
  ui/         — Screens, navigation, splash
assets/       — Nina logo, sounds
```

## Provider System

Uses [nuvio-providers](https://github.com/yoruix/nuvio-providers) for direct streaming links. Auto-ranks by quality + speed + provider trust.

## Subtitles

5-layer subtitle system:
1. Embedded tracks (100% sync)
2. OpenSubtitles hash match (99% sync)
3. Backup sources (SubDL, Addic7ed, YIFY)
4. Auto-sync correction (duration + silence detection)
5. User fine-tune (saved per-release)

Supports: SRT, VTT, ASS, SUB formats.

## Made with ♥

Ninaflix — because Nina deserves her own streaming app.
