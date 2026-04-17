// ═══════════════════════════════════════════
// Ninaflix — Search Screen
// ═══════════════════════════════════════════

const NinaflixSearch = {
  overlay: null,
  debounceTimer: null,

  init() {
    this.createOverlay();
  },

  createOverlay() {
    const el = document.createElement('div');
    el.id = 'search-overlay';
    el.style.cssText = `
      position:fixed;inset:0;z-index:8200;display:none;
      background:rgba(8,8,8,.98);backdrop-filter:blur(20px);
      padding:80px 48px 48px;overflow-y:auto;
    `;

    // Build inner HTML with DOM API to avoid escaping issues
    const container = document.createElement('div');
    container.style.cssText = 'max-width:900px;margin:0 auto;';

    // Search bar row
    const searchRow = document.createElement('div');
    searchRow.style.cssText = 'display:flex;gap:12px;margin-bottom:32px;';

    const input = document.createElement('input');
    input.type = 'text';
    input.id = 'search-input';
    input.placeholder = 'Search movies, series...';
    input.style.cssText = `
      flex:1;background:rgba(255,255,255,.05);border:2px solid rgba(255,255,255,.08);
      color:#fff;padding:14px 20px;border-radius:12px;font-size:16px;
      font-family:'Poppins',sans-serif;transition:border-color .2s;
    `;
    input.onfocus = () => input.style.borderColor = 'var(--co)';
    input.onblur = () => input.style.borderColor = 'rgba(255,255,255,.08)';

    const voiceBtn = document.createElement('button');
    voiceBtn.id = 'voice-search-btn';
    voiceBtn.textContent = '🎤';
    voiceBtn.title = 'Voice Search';
    voiceBtn.onclick = () => NinaflixVoice.start();
    voiceBtn.style.cssText = `
      background:rgba(255,255,255,.05);border:none;color:#fff;
      padding:14px 18px;border-radius:12px;cursor:pointer;font-size:18px;
    `;

    const closeBtn = document.createElement('button');
    closeBtn.id = 'search-close';
    closeBtn.textContent = 'Cancel';
    closeBtn.style.cssText = `
      background:rgba(255,255,255,.1);border:none;color:#fff;
      padding:14px 24px;border-radius:12px;cursor:pointer;
      font-family:'Poppins',sans-serif;font-size:14px;
    `;

    searchRow.appendChild(input);
    searchRow.appendChild(voiceBtn);
    searchRow.appendChild(closeBtn);

    // Recent searches
    const recentSection = document.createElement('div');
    recentSection.id = 'search-recent';
    recentSection.style.cssText = 'margin-bottom:24px;';
    recentSection.innerHTML = `
      <h3 style="font-size:14px;font-weight:600;color:var(--t3);margin-bottom:12px;">Recent</h3>
      <div id="search-recent-list" style="display:flex;gap:8px;flex-wrap:wrap;"></div>
    `;

    // Results section
    const resultsSection = document.createElement('div');
    resultsSection.id = 'search-results';
    resultsSection.style.display = 'none';
    resultsSection.innerHTML = `
      <h3 style="font-size:14px;font-weight:600;color:var(--t3);margin-bottom:16px;">
        Results <span id="search-count"></span>
      </h3>
      <div id="search-result-grid" style="
        display:grid;grid-template-columns:repeat(auto-fill,minmax(140px,1fr));gap:16px;
      "></div>
    `;

    // Empty state
    const emptySection = document.createElement('div');
    emptySection.id = 'search-empty';
    emptySection.style.cssText = 'display:none;text-align:center;padding:60px 0;';
    emptySection.innerHTML = `
      <div style="font-size:48px;margin-bottom:16px;">🔍</div>
      <div style="font-size:16px;color:var(--t2);">No results found</div>
      <div style="font-size:13px;color:var(--t3);margin-top:4px;">Try voice search or different keywords</div>
    `;

    container.appendChild(searchRow);
    container.appendChild(recentSection);
    container.appendChild(resultsSection);
    container.appendChild(emptySection);
    el.appendChild(container);

    document.body.appendChild(el);
    this.overlay = el;

    closeBtn.onclick = () => this.close();
    input.oninput = (e) => this.onInput(e.target.value);

    // Load recent searches
    this.loadRecent();
  },

  open() {
    this.overlay.style.display = 'block';
    document.getElementById('search-input').focus();
  },

  close() {
    this.overlay.style.display = 'none';
    document.getElementById('search-input').value = '';
    NinaflixVoice.stop();
  },

  onInput(query) {
    clearTimeout(this.debounceTimer);
    if (query.length < 2) {
      document.getElementById('search-results').style.display = 'none';
      document.getElementById('search-recent').style.display = 'block';
      return;
    }
    this.debounceTimer = setTimeout(() => this.search(query), 300);
  },

  async search(query) {
    document.getElementById('search-recent').style.display = 'none';
    document.getElementById('search-results').style.display = 'block';
    document.getElementById('search-empty').style.display = 'none';
    document.getElementById('search-result-grid').innerHTML = '<div style="color:var(--t3);">Searching...</div>';

    // Search across all addons
    const results = [];
    for (const addon of NinaflixAddons.getInstalled()) {
      if (addon.catalogs) {
        for (const cat of addon.catalogs) {
          if (cat.extraSupported?.includes('search')) {
            const items = await NinaflixAddons.fetchCatalog(addon.id, cat.type, cat.id, { search: query });
            results.push(...items);
          }
        }
      }
    }

    // Also search TMDB if available
    if (NinaflixTMDB.KEY) {
      try {
        const tmdbResults = await NinaflixTMDB.search(query);
        for (const r of tmdbResults.slice(0, 10)) {
          results.push({
            id: r.imdb_id || `tmdb_${r.id}`,
            name: r.title || r.name || '',
            poster: NinaflixTMDB.poster(r.poster_path),
            year: (r.release_date || r.first_air_date || '').split('-')[0],
            type: r.media_type || 'movie',
            _source: 'tmdb'
          });
        }
      } catch { /* skip */ }
    }

    // Deduplicate by ID
    const seen = new Set();
    const unique = results.filter(r => {
      if (!r.id || seen.has(r.id)) return false;
      seen.add(r.id);
      return true;
    });

    document.getElementById('search-count').textContent = '(' + unique.length + ')';

    if (unique.length === 0) {
      document.getElementById('search-results').style.display = 'none';
      document.getElementById('search-empty').style.display = 'block';
      return;
    }

    document.getElementById('search-result-grid').innerHTML = unique.map(item => {
      const id = item.id || '';
      const type = item.type || 'movie';
      const name = NinaflixUI.escape(item.name || '');
      const poster = item.poster || '';
      const year = item.year || '';

      return '<div class="card" style="width:100%;" onclick="NinaflixDetail.open(\'' + id + '\', \'' + type + '\')">' +
        '<div class="card-glow"></div>' +
        '<img class="card-poster" src="' + poster + '" alt="' + name + '" onerror="this.style.background=\'var(--cd)\'">' +
        '<div class="card-info">' +
          '<div class="card-title">' + name + '</div>' +
          '<div class="card-sub">' + year + '</div>' +
        '</div>' +
      '</div>';
    }).join('');

    // Save to recent
    this.saveRecent(query);
  },

  saveRecent(query) {
    let recent = NinaflixStorage.get('search_recent', []);
    recent = [query, ...recent.filter(r => r !== query)].slice(0, 8);
    NinaflixStorage.set('search_recent', recent);
    this.loadRecent();
  },

  loadRecent() {
    const recent = NinaflixStorage.get('search_recent', []);
    const list = document.getElementById('search-recent-list');
    if (!list) return;
    list.innerHTML = recent.map(r =>
      '<button class="pill" onclick="document.getElementById(\'search-input\').value=\'' +
      r.replace(/'/g, "\\'") + '\';NinaflixSearch.search(\'' +
      r.replace(/'/g, "\\'") + '\');">' + NinaflixUI.escape(r) + '</button>'
    ).join('');
  }
};
