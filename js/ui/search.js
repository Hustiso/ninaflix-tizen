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
    el.innerHTML = `
      <div style="max-width:900px;margin:0 auto;">
        <!-- Search bar -->
        <div style="display:flex;gap:12px;margin-bottom:32px;">
          <input type="text" id="search-input" placeholder="Search movies, series..." style="
            flex:1;background:rgba(255,255,255,.05);border:2px solid rgba(255,255,255,.08);
            color:#fff;padding:14px 20px;border-radius:12px;font-size:16px;
            font-family:'Poppins',sans-serif;transition:border-color .2s;
          " onfocus="this.style.borderColor='var(--co)'" onblur="this.style.borderColor='rgba(255,255,255,.08)'">
          <button id="search-close" style="
            background:rgba(255,255,255,.1);border:none;color:#fff;
            padding:14px 24px;border-radius:12px;cursor:pointer;
            font-family:'Poppins',sans-serif;font-size:14px;
          ">Cancel</button>
        </div>

        <!-- Recent searches -->
        <div id="search-recent" style="margin-bottom:24px;">
          <h3 style="font-size:14px;font-weight:600;color:var(--t3);margin-bottom:12px;">Recent</h3>
          <div id="search-recent-list" style="display:flex;gap:8px;flex-wrap:wrap;"></div>
        </div>

        <!-- Results -->
        <div id="search-results" style="display:none;">
          <h3 style="font-size:14px;font-weight:600;color:var(--t3);margin-bottom:16px;">
            Results <span id="search-count"></span>
          </h3>
          <div id="search-result-grid" style="
            display:grid;grid-template-columns:repeat(auto-fill,minmax(140px,1fr));gap:16px;
          "></div>
        </div>

        <!-- No results -->
        <div id="search-empty" style="display:none;text-align:center;padding:60px 0;">
          <div style="font-size:48px;margin-bottom:16px;">🔍</div>
          <div style="font-size:16px;color:var(--t2);">No results found</div>
          <div style="font-size:13px;color:var(--t3);margin-top:4px;">Try different keywords</div>
        </div>
      </div>
    `;
    document.body.appendChild(el);
    this.overlay = el;

    document.getElementById('search-close').onclick = () => this.close();
    document.getElementById('search-input').oninput = (e) => this.onInput(e.target.value);

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

    // Deduplicate by ID
    const seen = new Set();
    const unique = results.filter(r => {
      if (seen.has(r.id)) return false;
      seen.add(r.id);
      return true;
    });

    document.getElementById('search-count').textContent = `(${unique.length})`;

    if (unique.length === 0) {
      document.getElementById('search-results').style.display = 'none';
      document.getElementById('search-empty').style.display = 'block';
      return;
    }

    document.getElementById('search-result-grid').innerHTML = unique.map(item => `
      <div class="card" style="width:100%;" onclick="NinaflixDetail.open('${item.id}', '${item.type || 'movie'}')">
        <div class="card-glow"></div>
        <img class="card-poster" src="${item.poster || ''}" alt="${NinaflixUI.escape(item.name || '')}" onerror="this.style.background='var(--cd)'">
        <div class="card-info">
          <div class="card-title">${NinaflixUI.escape(item.name || '')}</div>
          <div class="card-sub">${item.year || ''}</div>
        </div>
      </div>
    `).join('');

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
    list.innerHTML = recent.map(r => `
      <button class="pill" onclick="document.getElementById('search-input').value='${r}';NinaflixSearch.search('${r}');">
        ${NinaflixUI.escape(r)}
      </button>
    `).join('');
  }
};
