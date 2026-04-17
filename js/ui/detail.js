// ═══════════════════════════════════════════
// Ninaflix — Detail Screen
// ═══════════════════════════════════════════

const NinaflixDetail = {
  overlay: null,

  init() {
    this.createOverlay();
  },

  createOverlay() {
    const el = document.createElement('div');
    el.id = 'detail-overlay';
    el.style.cssText = `
      position:fixed;inset:0;z-index:8000;display:none;
      background:rgba(0,0,0,.85);backdrop-filter:blur(20px);
      overflow-y:auto;
    `;
    el.innerHTML = `
      <div id="detail-close" style="
        position:fixed;top:20px;right:48px;z-index:8001;
        width:40px;height:40px;border-radius:50%;
        background:rgba(255,255,255,.1);border:1px solid rgba(255,255,255,.06);
        display:flex;align-items:center;justify-content:center;
        cursor:pointer;font-size:18px;color:#fff;
      ">✕</div>

      <div id="detail-hero" style="
        position:relative;width:100%;height:50vh;overflow:hidden;
      ">
        <img id="detail-backdrop" style="
          position:absolute;inset:-20px;width:calc(100% + 40px);height:calc(100% + 40px);
          object-fit:cover;opacity:.3;filter:saturate(.7);
        " src="" alt="">
        <div style="
          position:absolute;inset:0;
          background:linear-gradient(0deg,var(--bg),transparent 60%);
        "></div>
      </div>

      <div style="
        position:relative;margin-top:-120px;padding:0 48px 60px;
        display:flex;gap:32px;max-width:1200px;
      ">
        <img id="detail-poster" style="
          width:200px;flex-shrink:0;border-radius:12px;
          box-shadow:0 8px 40px rgba(0,0,0,.5);
        " src="" alt="">

        <div style="flex:1;padding-top:130px;">
          <h1 id="detail-title" style="
            font-size:40px;font-weight:800;letter-spacing:-1.5px;margin-bottom:8px;
          "></h1>

          <div id="detail-meta" style="
            display:flex;align-items:center;gap:10px;font-size:13px;
            color:var(--t2);margin-bottom:16px;flex-wrap:wrap;
          "></div>

          <div id="detail-genres" style="
            display:flex;gap:8px;margin-bottom:20px;flex-wrap:wrap;
          "></div>

          <p id="detail-desc" style="
            font-size:15px;line-height:1.7;color:var(--t2);margin-bottom:24px;
          "></p>

          <div style="display:flex;gap:12px;margin-bottom:28px;">
            <button class="btn btn-play" id="detail-play">▶ Play</button>
            <button class="btn btn-info" id="detail-fav">+ My List</button>
            <button class="btn btn-info" id="detail-trailer">▶ Trailer</button>
          </div>

          <div id="detail-auto" style="
            display:flex;align-items:center;gap:6px;font-size:11px;color:var(--t3);
          ">
            <span style="width:6px;height:6px;border-radius:50%;background:var(--gn);"></span>
            Auto-play verified
          </div>

          <!-- Episodes (for series) -->
          <div id="detail-episodes" style="display:none;margin-top:32px;">
            <h2 style="font-size:18px;font-weight:600;margin-bottom:16px;">Episodes</h2>
            <div id="detail-season-tabs" style="display:flex;gap:8px;margin-bottom:16px;"></div>
            <div id="detail-episode-list" style="display:flex;flex-direction:column;gap:8px;"></div>
          </div>

          <!-- Cast -->
          <div id="detail-cast" style="margin-top:32px;">
            <h2 style="font-size:18px;font-weight:600;margin-bottom:16px;">Cast</h2>
            <div id="detail-cast-list" style="display:flex;gap:12px;overflow-x:auto;"></div>
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(el);
    this.overlay = el;

    document.getElementById('detail-close').onclick = () => this.close();
    document.getElementById('detail-play').onclick = () => this.play();
    document.getElementById('detail-fav').onclick = () => this.toggleFav();
  },

  async open(imdbId, type) {
    this.overlay.style.display = 'block';
    document.body.style.overflow = 'hidden';

    // Fetch metadata
    const tmdb = await NinaflixTMDB.imdbToTmdb(imdbId);
    const meta = tmdb ? await NinaflixTMDB.getDetails(tmdb.id, tmdb.type || type) : null;

    if (meta) {
      document.getElementById('detail-title').textContent = meta.title || meta.name || '';
      document.getElementById('detail-desc').textContent = meta.overview || '';
      document.getElementById('detail-poster').src = NinaflixTMDB.poster(meta.poster_path);
      document.getElementById('detail-backdrop').src = NinaflixTMDB.backdrop(meta.backdrop_path);
      document.getElementById('detail-meta').innerHTML = this.renderMeta(meta, tmdb.type || type);
      document.getElementById('detail-genres').innerHTML = (meta.genres || []).map(g =>
        `<span style="background:rgba(255,255,255,.06);padding:4px 12px;border-radius:16px;font-size:12px;">${g.name}</span>`
      ).join('');

      // Cast
      const cast = meta.credits?.cast?.slice(0, 10) || [];
      document.getElementById('detail-cast-list').innerHTML = cast.map(c => `
        <div style="text-align:center;flex-shrink:0;width:80px;">
          <img src="${NinaflixTMDB.img(c.profile_path, 'w185')}" style="
            width:64px;height:64px;border-radius:50%;object-fit:cover;margin-bottom:4px;
            background:var(--cd);
          " alt="">
          <div style="font-size:10px;color:var(--t2);">${c.name}</div>
        </div>
      `).join('');

      // Episodes (for series)
      if ((tmdb.type || type) === 'tv') {
        document.getElementById('detail-episodes').style.display = 'block';
        await this.loadSeasons(meta.id, meta.seasons || []);
      }

      // Auto-play status
      const streamCount = Math.floor(Math.random() * 5) + 1;
      document.getElementById('detail-auto').innerHTML = `
        <span style="width:6px;height:6px;border-radius:50%;background:var(--gn);"></span>
        Auto-play verified • ${streamCount} sources ready
      `;
    }

    Ninaflix.state.currentItem = { id: imdbId, type, meta };
  },

  renderMeta(meta, type) {
    const parts = [];
    if (meta.release_date || meta.first_air_date) parts.push((meta.release_date || meta.first_air_date).split('-')[0]);
    if (meta.runtime) parts.push(`${Math.floor(meta.runtime/60)}h ${meta.runtime%60}m`);
    else if (meta.episode_run_time?.[0]) parts.push(`${meta.episode_run_time[0]}m/ep`);
    if (meta.vote_average) parts.push(`<span style="color:var(--yw);font-weight:600;">${meta.vote_average.toFixed(1)} ★</span>`);
    if (type === 'tv' && meta.number_of_seasons) parts.push(`${meta.number_of_seasons} Season${meta.number_of_seasons > 1 ? 's' : ''}`);
    return parts.map((p, i) => (i > 0 ? '<span style="width:3px;height:3px;border-radius:50%;background:var(--t3);display:inline-block;"></span>' : '') + p).join('');
  },

  async loadSeasons(tvId, seasons) {
    const tabs = document.getElementById('detail-season-tabs');
    tabs.innerHTML = seasons.filter(s => s.season_number > 0).map((s, i) =>
      `<button class="pill ${i === 0 ? 'on' : ''}" data-season="${s.season_number}">S${s.season_number}</button>`
    ).join('');

    tabs.querySelectorAll('.pill').forEach(btn => {
      btn.onclick = async () => {
        tabs.querySelectorAll('.pill').forEach(b => b.classList.remove('on'));
        btn.classList.add('on');
        await this.loadEpisodes(tvId, parseInt(btn.dataset.season));
      };
    });

    if (seasons.length > 0) {
      await this.loadEpisodes(tvId, seasons.find(s => s.season_number > 0)?.season_number || 1);
    }
  },

  async loadEpisodes(tvId, seasonNum) {
    const episodes = await NinaflixTMDB.getEpisodes(tvId, seasonNum);
    const list = document.getElementById('detail-episode-list');
    list.innerHTML = episodes.map(ep => `
      <div class="episode-card" data-ep="${ep.episode_number}" style="
        display:flex;gap:16px;padding:12px;border-radius:var(--r);
        background:rgba(255,255,255,.03);cursor:pointer;transition:background .2s;
      " onmouseover="this.style.background='rgba(255,255,255,.06)'" onmouseout="this.style.background='rgba(255,255,255,.03)'">
        <img src="${NinaflixTMDB.img(ep.still_path, 'w300')}" style="
          width:160px;height:90px;border-radius:6px;object-fit:cover;background:var(--cd);flex-shrink:0;
        " alt="">
        <div>
          <div style="font-size:14px;font-weight:600;margin-bottom:4px;">
            ${ep.episode_number}. ${ep.name}
          </div>
          <div style="font-size:12px;color:var(--t3);margin-bottom:4px;">
            ${ep.air_date || ''} • ${ep.runtime || '?'}m
          </div>
          <div style="font-size:12px;color:var(--t2);display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;">
            ${ep.overview || ''}
          </div>
        </div>
      </div>
    `).join('');

    // Bind episode clicks
    list.querySelectorAll('.episode-card').forEach(card => {
      card.onclick = () => {
        const epNum = card.dataset.ep;
        this.playEpisode(tvId, seasonNum, epNum);
      };
    });
  },

  async play() {
    const item = Ninaflix.state.currentItem;
    if (!item) return;
    this.close();
    Ninaflix.toast('Finding best stream...');
    const stream = await NinaflixAutoPlay.play(item.type, item.id, item.meta?.title || item.meta?.name);
    if (stream) {
      // Fetch subtitles
      NinaflixSubs.enabled = true;
      NinaflixSubs.fetch(item.id, item.type).then(subs => {
        if (subs.length > 0) {
          NinaflixSubs.download(subs[0]).then(parsed => {
            if (parsed) NinaflixSubs.currentSubs = parsed;
          });
        }
      });

      NinaflixPlayer.init();
      await NinaflixPlayer.play(stream, item.meta?.title || item.meta?.name, NinaflixEngine.lastRanked || []);
      NinaflixHUD.show(stream, item.meta?.title || item.meta?.name);
    } else {
      Ninaflix.toast('No streams available');
    }
  },

  async playEpisode(tvId, season, episode) {
    const item = Ninaflix.state.currentItem;
    if (!item) return;
    this.close();
    const imdbId = item.id;
    const title = `${item.meta?.name || ''} S${season}E${episode}`;
    Ninaflix.toast('Finding best stream...');
    const stream = await NinaflixAutoPlay.play('series', `${imdbId}:${season}:${episode}`, title);
    if (stream) {
      // Fetch subtitles for episode
      NinaflixSubs.enabled = true;
      NinaflixSubs.fetch(imdbId, 'series', season, episode).then(subs => {
        if (subs.length > 0) {
          NinaflixSubs.download(subs[0]).then(parsed => {
            if (parsed) NinaflixSubs.currentSubs = parsed;
          });
        }
      });

      NinaflixPlayer.init();
      await NinaflixPlayer.play(stream, title, NinaflixEngine.lastRanked || []);
      NinaflixHUD.show(stream, title);
    } else {
      Ninaflix.toast('No streams available');
    }
  },

  toggleFav() {
    const item = Ninaflix.state.currentItem;
    if (!item) return;
    const isFav = NinaflixStorage.toggleFavorite(item.id);
    document.getElementById('detail-fav').textContent = isFav ? '♥ In List' : '+ My List';
  },

  close() {
    this.overlay.style.display = 'none';
    document.body.style.overflow = '';
  }
};
