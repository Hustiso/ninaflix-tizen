// ═══════════════════════════════════════════
// Ninaflix — Voice Search (Web Speech API)
// ═══════════════════════════════════════════

const NinaflixVoice = {
  recognition: null,
  listening: false,

  init() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      console.log('[Voice] Speech API not available');
      return;
    }
    this.recognition = new SpeechRecognition();
    this.recognition.lang = 'en-US';
    this.recognition.continuous = false;
    this.recognition.interimResults = true;
    this.recognition.maxAlternatives = 1;

    this.recognition.onresult = (e) => {
      const transcript = Array.from(e.results)
        .map(r => r[0].transcript)
        .join('');
      // Feed to search input live
      const input = document.getElementById('search-input');
      if (input) input.value = transcript;

      if (e.results[0].isFinal) {
        this.stop();
        if (transcript.trim()) {
          NinaflixSearch.search(transcript.trim());
        }
      }
    };

    this.recognition.onerror = (e) => {
      console.warn('[Voice] Error:', e.error);
      this.stop();
      if (e.error === 'not-allowed') {
        Ninaflix.toast('Microphone access denied');
      } else {
        Ninaflix.toast('Voice search failed');
      }
    };

    this.recognition.onend = () => {
      this.listening = false;
      this.updateMicUI();
    };

    console.log('[Voice] Initialized');
  },

  start() {
    if (!this.recognition) {
      Ninaflix.toast('Voice search not available');
      return;
    }
    if (this.listening) {
      this.stop();
      return;
    }
    try {
      this.recognition.start();
      this.listening = true;
      this.updateMicUI();
      Ninaflix.toast('Listening...');
    } catch (e) {
      console.warn('[Voice] Start failed:', e);
    }
  },

  stop() {
    if (this.recognition && this.listening) {
      try { this.recognition.stop(); } catch { /* ignore */ }
    }
    this.listening = false;
    this.updateMicUI();
  },

  updateMicUI() {
    const btn = document.getElementById('voice-search-btn');
    if (!btn) return;
    if (this.listening) {
      btn.style.background = 'var(--co)';
      btn.style.color = '#fff';
      btn.textContent = '⏹';
    } else {
      btn.style.background = 'rgba(255,255,255,.05)';
      btn.style.color = '#fff';
      btn.textContent = '🎤';
    }
  }
};
