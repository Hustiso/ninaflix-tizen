// ═══════════════════════════════════════════
// Ninaflix — Kids Mode
// ═══════════════════════════════════════════

const NinaflixKids = {
  enabled: false,
  pin: null,

  init() {
    const settings = NinaflixStorage.getSettings();
    this.enabled = settings.kids_mode || false;
    this.pin = NinaflixStorage.get('kids_pin', null);
  },

  isActive() {
    return this.enabled;
  },

  enable(pin) {
    this.enabled = true;
    this.pin = pin;
    NinaflixStorage.set('kids_pin', pin);
    const s = NinaflixStorage.getSettings();
    s.kids_mode = true;
    NinaflixStorage.set('settings', s);
    this.applyFilters();
  },

  disable(enteredPin) {
    if (enteredPin !== this.pin) return false;
    this.enabled = false;
    const s = NinaflixStorage.getSettings();
    s.kids_mode = false;
    NinaflixStorage.set('settings', s);
    return true;
  },

  // Filter content by rating
  isAllowed(content) {
    if (!this.enabled) return true;
    const rating = (content.certification || content.rating || '').toUpperCase();
    const allowed = ['G', 'PG', 'PG-13', 'TV-G', 'TV-PG', 'TV-Y', 'TV-Y7', 'U', 'PG'];
    // Block anything rated R, NC-17, TV-MA, or unrated adult content
    if (!rating) return true; // Unknown = allow (conservative)
    return allowed.some(a => rating.includes(a));
  },

  applyFilters() {
    if (!this.enabled) return;
    // Remove non-kids cards from DOM
    document.querySelectorAll('.card').forEach(card => {
      const rating = card.dataset.rating || '';
      if (!this.isAllowed({ certification: rating })) {
        card.style.display = 'none';
      }
    });
  },

  // PIN entry dialog
  promptPin(callback) {
    const dialog = document.createElement('div');
    dialog.style.cssText = `
      position:fixed;inset:0;z-index:99999;
      background:rgba(0,0,0,.9);display:flex;flex-direction:column;
      align-items:center;justify-content:center;
    `;
    dialog.innerHTML = `
      <div style="text-align:center;">
        <img src="assets/nina.png" style="width:80px;opacity:.5;margin-bottom:20px;" alt="">
        <h2 style="font-size:20px;font-weight:600;margin-bottom:8px;">Enter PIN</h2>
        <p style="font-size:13px;color:var(--t3);margin-bottom:24px;">Parental control</p>
        <input type="password" id="pin-input" maxlength="4" style="
          background:rgba(255,255,255,.05);border:2px solid rgba(255,255,255,.1);
          color:#fff;padding:12px 24px;border-radius:var(--r);font-size:24px;
          text-align:center;letter-spacing:12px;width:160px;
          font-family:'Poppins',sans-serif;
        ">
        <div style="margin-top:16px;">
          <button id="pin-cancel" style="
            background:none;border:1px solid rgba(255,255,255,.1);color:var(--t2);
            padding:8px 24px;border-radius:var(--r);cursor:pointer;
            font-family:'Poppins',sans-serif;margin-right:8px;
          ">Cancel</button>
          <button id="pin-ok" style="
            background:var(--co);border:none;color:#fff;
            padding:8px 24px;border-radius:var(--r);cursor:pointer;
            font-family:'Poppins',sans-serif;
          ">OK</button>
        </div>
      </div>
    `;
    document.body.appendChild(dialog);
    document.getElementById('pin-input').focus();
    document.getElementById('pin-ok').onclick = () => {
      const val = document.getElementById('pin-input').value;
      dialog.remove();
      callback(val);
    };
    document.getElementById('pin-cancel').onclick = () => {
      dialog.remove();
      callback(null);
    };
  }
};
