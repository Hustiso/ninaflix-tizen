// ═══════════════════════════════════════════
// Ninaflix — UI Controller
// ═══════════════════════════════════════════

const NinaflixUI = {
  init() {
    this.bindNav();
    this.bindPills();
    this.loadHome();
  },

  bindNav() {
    document.querySelectorAll('.nav-links a').forEach(a => {
      a.addEventListener('click', e => {
        e.preventDefault();
        document.querySelectorAll('.nav-links a').forEach(x => x.classList.remove('on'));
        a.classList.add('on');
        const screen = a.textContent.toLowerCase().replace(' ', '_');
        this.navigate(screen);
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

  navigate(screen) {
    Ninaflix.state.screen = screen;
    console.log('[UI] Navigate to: ' + screen);
    // Future: load screen dynamically
  },

  filterByGenre(genre) {
    console.log('[UI] Filter: ' + genre);
    // Future: re-render cards filtered by genre
  },

  async loadHome() {
    // Load catalog from addons
    const addons = NinaflixAddons.getInstalled();
    for (const addon of addons) {
      if (addon.catalogs) {
        for (const cat of addon.catalogs) {
          if (!cat.extraRequired || cat.extraRequired.length === 0) {
            const items = await NinaflixAddons.fetchCatalog(addon.id, cat.type, cat.id);
            if (items.length > 0) {
              this.renderCatalogRow(cat.name || cat.id, items);
            }
          }
        }
      }
    }
  },

  renderCatalogRow(title, items) {
    // Create section dynamically
    const sec = document.createElement('div');
    sec.className = 'sec';
    sec.innerHTML = `
      <div class="sec-head">
        <h2 class="sec-title">${this.escape(title)}</h2>
        <a href="#" class="sec-link">See all</a>
      </div>
      <div class="row">
        ${items.slice(0, 12).map(item => this.renderCard(item)).join('')}
      </div>
    `;

    // Insert before footer
    const footer = document.querySelector('footer');
    if (footer) {
      footer.parentNode.insertBefore(sec, footer);
    }
  },

  renderCard(item) {
    const poster = item.poster || '';
    const name = item.name || item.title || 'Unknown';
    const year = item.year || '';
    const imdbRating = item.imdbRating || '';

    return `
      <div class="card" data-id="${item.id || ''}" onclick="NinaflixUI.onCardClick('${item.id || ''}', '${item.type || 'movie'}')">
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
    console.log('[UI] Card clicked: ' + type + '/' + id);
    // Future: open detail overlay → auto-play
  },

  escape(str) {
    if (!str) return '';
    return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }
};
