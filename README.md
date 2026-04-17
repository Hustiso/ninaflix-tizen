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

### Option 1: TizenBrew
```
Add module: Hustiso/ninaflix-tizen
```

### Option 2: Sideload .wgt
```bash
# Enable Developer Mode on TV
# Build:
tizen build-web
tizen package -t wgt -o ./release -- .buildResult
tizen install -n ./release/Ninaflix.wgt
```

### Option 3: TizenBrew Installer
Use [TizenBrewInstaller](https://github.com/reisxd/TizenBrewInstaller/releases/latest) for one-click install.

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
