// ═══════════════════════════════════════════
// Ninaflix — UI Controller
// ═══════════════════════════════════════════

const NinaflixUI = {
  currentHeroItem: null,

  init() {
    this.bindNav();
    this.bindPills();
    this.bindHero();
    this.loadHome();
  },

  bindNav() {
    document.querySelectorAll('.nav-links a').forEach(a => {
      a.addEventListener('click', e => {
        e.preventDefault();
        document.querySelectorAll('.nav-links a').forEach(x => x.classList.remove('on'));
        a.classList.add('on');
        const text = a.textContent.trim().toLowerCase();
        this.navigate(text);
      });
    });
  },

  bindPills() {
    document.querySelectorAll('.pill').forEach(p => {
      p.addEventListener('click', () => {
        document.querySelectorAll('.pill').forEach(x => x.classList.remove('on'));
        p.classList.add('on');
        this.filterByGenre(p.textContent);
      });
    });
  },

  bindHero() {
    const playBtn = document.getElementById('hero-play-btn');
    if (playBtn) {
      playBtn.onclick = () => this.playHero();
    }
    const favBtn = document.getElementById('hero-fav-btn');
    if (favBtn) {
      favBtn.onclick = () => this.toggleHeroFav();
    }
  },

  navigate(screen) {
    Ninaflix.state.screen = screen;
    console.log('[UI] Navigate to: ' + screen);

    switch (screen) {
      case 'home':
        // Show catalog, hide overlays
        document.getElementById('app').style.display = 'block';
        break;
      case 'my list':
        this.showMyList();
        break;
      case 'search':
        NinaflixSearch.open();
        break;
      case 'settings':
        NinaflixSettings.open();
        break;
    }
  },

  async showMyList() {
    const favIds = NinaflixStorage.getFavorites();
    if (favIds.length === 0) {
      Ninaflix.toast('My List is empty — add some titles');
      return;
    }

    // Show search overlay repurposed for favorites
    NinaflixSearch.open();
    document.getElementById('search-input').placeholder = 'Filter My List...';
    document.getElementById('search-results').style.display = 'block';
    document.getElementById('search-recent').style.display = 'none';
    document.getElementById('search-result-grid').innerHTML = '<div style="color:var(--t3);">Loading...</div>';
    document.getElementById('search-count').textContent = `(${favIds.length})`;

    // Load metadata for each favorite
    const items = [];
    for (const imdbId of favIds.slice(0, 20)) {
      try {
        const tmdb = await NinaflixTMDB.imdbToTmdb(imdbId);
        if (tmdb) {
          const meta = await NinaflixTMDB.getDetails(tmdb.id, tmdb.type);
          if (meta) {
            items.push({
              id: imdbId,
              name: meta.title || meta.name || '',
              poster: NinaflixTMDB.poster(meta.poster_path),
              year: (meta.release_date || meta.first_air_date || '').split('-')[0],
              type: tmdb.type || 'movie'
            });
          }
        }
      } catch (e) { /* skip failed */ }
    }

    document.getElementById('search-result-grid').innerHTML = items.map(item => `
      <div class="card" style="width:100%;" onclick="NinaflixDetail.open('${item.id}', '${item.type}')">
        <div class="card-glow"></div>
        <img class="card-poster" src="${item.poster}" alt="${NinaflixUI.escape(item.name)}" onerror="this.style.background='var(--cd)'">
        <div class="card-info">
          <div class="card-title">${NinaflixUI.escape(item.name)}</div>
          <div class="card-sub">${item.year}</div>
        </div>
      </div>
    `).join('');
  },

  async playHero() {
    if (!this.currentHeroItem) {
      Ninaflix.toast('No content loaded yet');
      return;
    }
    const item = this.currentHeroItem;
    Ninaflix.toast('Finding best stream...');
    const stream = await NinaflixAutoPlay.play(item.type || 'movie', item.id, item.name || item.title);
    if (stream) {
      await NinaflixPlayer.play(stream, item.name || item.title);
      NinaflixHUD.show(stream, item.name || item.title);
    } else {
      Ninaflix.toast('No streams available');
    }
  },

  toggleHeroFav() {
    if (!this.currentHeroItem) return;
    const imdbId = this.currentHeroItem.id;
    const isFav = NinaflixStorage.toggleFavorite(imdbId);
    const btn = document.getElementById('hero-fav-btn');
    if (btn) btn.textContent = isFav ? '♥ In List' : '+ My List';
    Ninaflix.toast(isFav ? 'Added to My List' : 'Removed from My List');
  },

  openHeroDetail() {
    if (!this.currentHeroItem) return;
    const item = this.currentHeroItem;
    NinaflixDetail.open(item.id, item.type || 'movie');
  },

  async openRandom() {
    // Open a random item from loaded catalog
    const addons = NinaflixAddons.getInstalled();
    for (const addon of addons) {
      if (addon.catalogs) {
        for (const cat of addon.catalogs) {
          const items = await NinaflixAddons.fetchCatalog(addon.id, cat.type, cat.id);
          if (items.length > 0) {
            const pick = items[Math.floor(Math.random() * Math.min(items.length, 10))];
            if (pick && pick.id) {
              NinaflixDetail.open(pick.id, pick.type || cat.type || 'movie');
              return;
            }
          }
        }
      }
    }
    Ninaflix.toast('No content available');
  },

  async loadHome() {
    // Load catalog from addons
    const addons = NinaflixAddons.getInstalled();
    let firstItem = null;
    let renderedCount = 0;

    for (const addon of addons) {
      if (addon.catalogs) {
        for (const cat of addon.catalogs) {
          if (!cat.extraRequired || cat.extraRequired.length === 0) {
            try {
              const items = await NinaflixAddons.fetchCatalog(addon.id, cat.type, cat.id);
              if (items.length > 0) {
                if (!firstItem) firstItem = { ...items[0], type: cat.type };
                this.renderCatalogRow(cat.name || cat.id, items, cat.type);
                renderedCount++;
              }
            } catch (e) {
              console.warn('[UI] Catalog load failed:', cat.id, e);
            }
          }
        }
      }
    }

    // Set hero to first item found
    if (firstItem) {
      this.setHero(firstItem);
    }

    // Load continue watching
    this.loadContinueWatching();

    console.log(`[UI] Home loaded: ${renderedCount} catalog rows`);
  },

  async setHero(item) {
    this.currentHeroItem = item;
    const titleEl = document.getElementById('hero-title');
    const descEl = document.getElementById('hero-desc');
    const metaEl = document.getElementById('hero-meta');
    const bgEl = document.getElementById('hero-bg');
    const favBtn = document.getElementById('hero-fav-btn');

    if (titleEl) titleEl.textContent = item.name || item.title || 'Unknown';
    if (descEl) descEl.textContent = item.description || item.overview || '';

    // Load rich metadata from TMDB
    if (item.id) {
      try {
        const tmdb = await NinaflixTMDB.imdbToTmdb(item.id);
        if (tmdb) {
          const meta = await NinaflixTMDB.getDetails(tmdb.id, tmdb.type);
          if (meta) {
            if (titleEl) titleEl.textContent = meta.title || meta.name || item.name;
            if (descEl) descEl.textContent = meta.overview || item.description || '';
            if (bgEl && meta.backdrop_path) {
              bgEl.style.backgroundImage = `url(${NinaflixTMDB.backdrop(meta.backdrop_path)})`;
            }
            const parts = [];
            if (meta.release_date || meta.first_air_date) parts.push((meta.release_date || meta.first_air_date).split('-')[0]);
            if (meta.runtime) parts.push(`${Math.floor(meta.runtime / 60)}h ${meta.runtime % 60}m`);
            else if (meta.episode_run_time?.[0]) parts.push(`${meta.episode_run_time[0]}m/ep`);
            if (meta.vote_average) parts.push(`${meta.vote_average.toFixed(1)} ★`);
            if (metaEl) metaEl.textContent = parts.join(' • ');
          }
        }
      } catch (e) { console.warn('[UI] Hero metadata load failed:', e); }
    }

    // Set fav button state
    if (favBtn && item.id) {
      const favs = NinaflixStorage.getFavorites();
      favBtn.textContent = favs.includes(item.id) ? '♥ In List' : '+ My List';
    }
  },

  async loadContinueWatching() {
    const section = document.getElementById('section-continue');
    const row = document.getElementById('continue-row');
    if (!section || !row) return;

    // Scan storage for progress entries
    const progressItems = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('ninaflix_progress_')) {
        try {
          const data = JSON.parse(localStorage.getItem(key));
          if (data && data.imdbId) {
            progressItems.push(data);
          }
        } catch { /* skip */ }
      }
    }

    if (progressItems.length === 0) {
      section.style.display = 'none';
      return;
    }

    section.style.display = 'block';
    row.innerHTML = '';

    for (const prog of progressItems.slice(0, 8)) {
      try {
        const tmdb = await NinaflixTMDB.imdbToTmdb(prog.imdbId);
        const meta = tmdb ? await NinaflixTMDB.getDetails(tmdb.id, tmdb.type) : null;
        const name = meta?.title || meta?.name || prog.title || 'Unknown';
        const poster = meta ? NinaflixTMDB.poster(meta.poster_path) : '';
        const pct = prog.duration > 0 ? Math.round((prog.position / prog.duration) * 100) : 0;

        const card = document.createElement('div');
        card.className = 'card';
        card.onclick = () => NinaflixDetail.open(prog.imdbId, tmdb?.type || 'movie');
        card.innerHTML = `
          <div class="card-glow"></div>
          <img class="card-poster" src="${poster}" alt="${this.escape(name)}" onerror="this.style.background='var(--cd)'">
          <div class="card-info">
            <div class="card-title">${this.escape(name)}</div>
            <div class="card-sub">${pct}% watched</div>
          </div>
        `;
        row.appendChild(card);
      } catch { /* skip */ }
    }
  },

  filterByGenre(genre) {
    console.log('[UI] Filter: ' + genre);
    // Filter visible cards by genre tag
    const allCards = document.querySelectorAll('#catalog-container .card, .sec .row .card');
    const g = genre.toLowerCase();
    if (g === 'all') {
      allCards.forEach(c => c.style.display = '');
      return;
    }
    // Genre filtering requires metadata — for now just log
    Ninaflix.toast(`Filter: ${genre}`);
  },

  renderCatalogRow(title, items, type) {
    // Create section dynamically
    const sec = document.createElement('div');
    sec.className = 'sec';
    sec.innerHTML = `
      <div class="sec-head">
        <h2 class="sec-title">${this.escape(title)}</h2>
        <a href="#" class="sec-link">See all</a>
      </div>
      <div class="row">
        ${items.slice(0, 12).map(item => this.renderCard(item, type)).join('')}
      </div>
    `;

    // Insert before footer
    const footer = document.querySelector('footer');
    if (footer) {
      footer.parentNode.insertBefore(sec, footer);
    }
  },

  renderCard(item, type) {
    const poster = item.poster || '';
    const name = item.name || item.title || 'Unknown';
    const year = item.year || '';
    const imdbRating = item.imdbRating || '';
    const itemType = item.type || type || 'movie';

    return `
      <div class="card" data-id="${item.id || ''}" onclick="NinaflixUI.onCardClick('${item.id || ''}', '${itemType}')">
        <div class="card-glow"></div>
        <img class="card-poster" src="${this.escape(poster)}" alt="${this.escape(name)}" onerror="this.style.background='var(--cd)'">
        <div class="card-info">
          <div class="card-title">${this.escape(name)}</div>
          <div class="card-sub">${year}${imdbRating ? ' • ' + imdbRating + ' ★' : ''}</div>
        </div>
      </div>
    `;
  },

  onCardClick(id, type) {
    if (!id) return;
    console.log('[UI] Card clicked: ' + type + '/' + id);
    NinaflixDetail.open(id, type);
  },

  escape(str) {
    if (!str) return '';
    return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }
};
