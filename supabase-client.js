/**
 * Universal Supabase Client & Sync Layer for GooDraw & Study Cloud
 * Funciona de forma transparente no navegador, em extensões Chromium e em PWAs móveis.
 */
(function (global) {
  'use strict';

  // Configuração padrão que pode ser sobrescrita via settings ou storage local
  const DEFAULT_CONFIG = {
    url: 'https://xyzcompany.supabase.co', // Substitua pela URL do seu projeto
    anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...', // Substitua pela sua Chave Anon
    bucket: 'study_screenshots'
  };

  class SupabaseSyncService {
    constructor() {
      this.config = Object.assign({}, DEFAULT_CONFIG);
      this.session = null;
      this.listeners = new Set();
      this.init();
    }

    async init() {
      // Carregar configurações salvas (chrome.storage ou localStorage)
      try {
        if (typeof chrome !== 'undefined' && chrome.storage?.local) {
          const res = await new Promise(r => chrome.storage.local.get(['supabaseConfig', 'supabaseSession'], r));
          if (res.supabaseConfig) this.config = Object.assign(this.config, res.supabaseConfig);
          if (res.supabaseSession) this.session = res.supabaseSession;
        } else if (typeof localStorage !== 'undefined') {
          const savedCfg = localStorage.getItem('supabase_sync_config');
          if (savedCfg) this.config = Object.assign(this.config, JSON.parse(savedCfg));
          const savedSess = localStorage.getItem('supabase_sync_session');
          if (savedSess) this.session = JSON.parse(savedSess);
        }
      } catch (e) {
        console.warn('[SupabaseSync] Não foi possível carregar config armazenada:', e);
      }
      this.emit('ready', { hasConfig: this.isConfigured(), user: this.getUser() });
    }

    isConfigured() {
      return Boolean(this.config.url && this.config.anonKey && !this.config.url.includes('xyzcompany'));
    }

    getUser() {
      return this.session?.user || null;
    }

    getAuthHeader() {
      const headers = {
        'apikey': this.config.anonKey,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
      };
      if (this.session?.access_token) {
        headers['Authorization'] = `Bearer ${this.session.access_token}`;
      } else {
        headers['Authorization'] = `Bearer ${this.config.anonKey}`;
      }
      return headers;
    }

    async updateConfig(newConfig) {
      this.config = Object.assign(this.config, newConfig);
      if (typeof chrome !== 'undefined' && chrome.storage?.local) {
        await new Promise(r => chrome.storage.local.set({ supabaseConfig: this.config }, r));
      } else if (typeof localStorage !== 'undefined') {
        localStorage.setItem('supabase_sync_config', JSON.stringify(this.config));
      }
      this.emit('config_updated', this.config);
    }

    // ──────────────────────── AUTENTICAÇÃO ────────────────────────
    async signIn(email, password) {
      if (!this.isConfigured()) throw new Error('Configure o Supabase primeiro (URL e Anon Key).');
      const res = await fetch(`${this.config.url}/auth/v1/token?grant_type=password`, {
        method: 'POST',
        headers: { 'apikey': this.config.anonKey, 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error_description || data.msg || 'Erro ao autenticar');
      this.session = data;
      await this.saveSession(data);
      this.emit('auth_changed', this.session);
      return data;
    }

    async signUp(email, password) {
      if (!this.isConfigured()) throw new Error('Configure o Supabase primeiro (URL e Anon Key).');
      const res = await fetch(`${this.config.url}/auth/v1/signup`, {
        method: 'POST',
        headers: { 'apikey': this.config.anonKey, 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error_description || data.msg || 'Erro ao cadastrar');
      if (data.session) {
        this.session = data.session;
        await this.saveSession(data.session);
      }
      this.emit('auth_changed', this.session);
      return data;
    }

    async signOut() {
      this.session = null;
      if (typeof chrome !== 'undefined' && chrome.storage?.local) {
        await new Promise(r => chrome.storage.local.remove('supabaseSession', r));
      } else if (typeof localStorage !== 'undefined') {
        localStorage.removeItem('supabase_sync_session');
      }
      this.emit('auth_changed', null);
    }

    async saveSession(sess) {
      if (typeof chrome !== 'undefined' && chrome.storage?.local) {
        await new Promise(r => chrome.storage.local.set({ supabaseSession: sess }, r));
      } else if (typeof localStorage !== 'undefined') {
        localStorage.setItem('supabase_sync_session', JSON.stringify(sess));
      }
    }

    // ──────────────────────── DESENHOS / ANOTAÇÕES SOBRE QUESTÕES ────────────────────────
    async saveDrawing(url, strokes, previewThumbnail = '') {
      const cleanUrl = url.split('#')[0];
      const payload = {
        url: cleanUrl,
        strokes: strokes,
        preview_thumbnail: previewThumbnail,
        user_id: this.session?.user?.id || null,
        updated_at: new Date().toISOString()
      };

      // Sempre guarda um cache local para acesso offline instantâneo
      try {
        const localCacheKey = 'goodraw_ink_' + cleanUrl;
        if (typeof localStorage !== 'undefined') localStorage.setItem(localCacheKey, JSON.stringify(payload));
      } catch (e) {}

      if (!this.isConfigured()) return { local: true, offline: true };

      // Se configurado, sobe para o Supabase
      const res = await fetch(`${this.config.url}/rest/v1/drawings`, {
        method: 'POST',
        headers: Object.assign(this.getAuthHeader(), { 'Prefer': 'resolution=merge-duplicates,return=representation' }),
        body: JSON.stringify(payload)
      });
      return await res.json();
    }

    async getDrawing(url) {
      const cleanUrl = url.split('#')[0];
      // Tenta obter do cache local primeiro
      let cached = null;
      try {
        const local = localStorage.getItem('goodraw_ink_' + cleanUrl);
        if (local) cached = JSON.parse(local);
      } catch (e) {}

      if (!this.isConfigured()) return cached;

      try {
        const res = await fetch(`${this.config.url}/rest/v1/drawings?url=eq.${encodeURIComponent(cleanUrl)}&select=*&order=updated_at.desc&limit=1`, {
          headers: this.getAuthHeader()
        });
        if (res.ok) {
          const list = await res.json();
          if (list && list.length > 0) return list[0];
        }
      } catch (e) {
        console.warn('[SupabaseSync] Falha ao buscar na nuvem, usando cache local:', e);
      }
      return cached;
    }

    // ──────────────────────── PRINTS & CAPTURAS DE TELA ────────────────────────
    async saveScreenshot({ url, title, imageDataUrl, note = '', tags = [], isErrorNotebook = true, difficulty = 'media' }) {
      let finalImageUrl = imageDataUrl;

      // Se estiver online com Supabase configurado, podemos salvar no Storage Bucket
      if (this.isConfigured() && imageDataUrl.startsWith('data:image')) {
        try {
          const filename = `shot_${Date.now()}_${Math.random().toString(36).substring(7)}.png`;
          const base64Content = imageDataUrl.split(',')[1];
          const blob = this.base64ToBlob(base64Content, 'image/png');

          const uploadRes = await fetch(`${this.config.url}/storage/v1/object/${this.config.bucket}/${filename}`, {
            method: 'POST',
            headers: {
              'apikey': this.config.anonKey,
              'Authorization': `Bearer ${this.session?.access_token || this.config.anonKey}`,
              'Content-Type': 'image/png'
            },
            body: blob
          });
          if (uploadRes.ok) {
            finalImageUrl = `${this.config.url}/storage/v1/object/public/${this.config.bucket}/${filename}`;
          }
        } catch (err) {
          console.warn('[SupabaseSync] Falha no upload ao storage, mantendo dataUrl:', err);
        }
      }

      const record = {
        url: url || '',
        title: title || 'Recorte de Questão',
        image_url: finalImageUrl,
        note: note || '',
        tags: tags || [],
        is_error_notebook: isErrorNotebook,
        difficulty: difficulty,
        user_id: this.session?.user?.id || null,
        created_at: new Date().toISOString()
      };

      // Salva no cache local
      this.saveLocalScreenshot(record);

      if (!this.isConfigured()) return record;

      try {
        const res = await fetch(`${this.config.url}/rest/v1/screenshots`, {
          method: 'POST',
          headers: this.getAuthHeader(),
          body: JSON.stringify(record)
        });
        return await res.json();
      } catch (e) {
        console.warn('[SupabaseSync] Erro ao sincronizar print na nuvem:', e);
        return record;
      }
    }

    async listScreenshots(options = {}) {
      const { isErrorNotebook = null, limit = 50 } = options;
      if (!this.isConfigured()) return this.getLocalScreenshots(options);

      try {
        let endpoint = `${this.config.url}/rest/v1/screenshots?select=*&order=created_at.desc&limit=${limit}`;
        if (isErrorNotebook !== null) endpoint += `&is_error_notebook=eq.${isErrorNotebook}`;
        const res = await fetch(endpoint, { headers: this.getAuthHeader() });
        if (res.ok) {
          const items = await res.json();
          return items.length > 0 ? items : this.getLocalScreenshots(options);
        }
      } catch (e) {
        console.warn('[SupabaseSync] Erro ao listar prints da nuvem:', e);
      }
      return this.getLocalScreenshots(options);
    }

    // ──────────────────────── GRIFOS & HIGHLIGHTS ────────────────────────
    async saveHighlight({ url, quote, color = 'yellow', note = '', anchorData = {} }) {
      const record = {
        url: url.split('#')[0],
        quote,
        color,
        note,
        anchor_data: anchorData,
        user_id: this.session?.user?.id || null,
        created_at: new Date().toISOString()
      };

      if (!this.isConfigured()) return record;

      try {
        const res = await fetch(`${this.config.url}/rest/v1/highlights`, {
          method: 'POST',
          headers: this.getAuthHeader(),
          body: JSON.stringify(record)
        });
        return await res.json();
      } catch (e) {
        console.warn('[SupabaseSync] Erro ao salvar highlight:', e);
        return record;
      }
    }

    async listHighlights(url = '') {
      if (!this.isConfigured()) return [];
      try {
        let endpoint = `${this.config.url}/rest/v1/highlights?select=*&order=created_at.desc`;
        if (url) endpoint += `&url=eq.${encodeURIComponent(url.split('#')[0])}`;
        const res = await fetch(endpoint, { headers: this.getAuthHeader() });
        if (res.ok) return await res.json();
      } catch (e) {
        console.warn('[SupabaseSync] Erro ao listar highlights:', e);
      }
      return [];
    }

    // ──────────────────────── HELPERS & LOCAL STORAGE ────────────────────────
    saveLocalScreenshot(item) {
      try {
        const key = 'goodraw_local_shots';
        const list = JSON.parse(localStorage.getItem(key) || '[]');
        list.unshift(item);
        if (list.length > 100) list.pop();
        localStorage.setItem(key, JSON.stringify(list));
      } catch (e) {}
    }

    getLocalScreenshots(options = {}) {
      try {
        const key = 'goodraw_local_shots';
        let list = JSON.parse(localStorage.getItem(key) || '[]');
        if (options.isErrorNotebook !== null && options.isErrorNotebook !== undefined) {
          list = list.filter(x => Boolean(x.is_error_notebook) === Boolean(options.isErrorNotebook));
        }
        return list;
      } catch (e) {
        return [];
      }
    }

    base64ToBlob(base64, mimeType) {
      const bytes = atob(base64);
      const arr = new Uint8Array(bytes.length);
      for (let i = 0; i < bytes.length; i++) arr[i] = bytes.charCodeAt(i);
      return new Blob([arr], { type: mimeType });
    }

    on(event, fn) { this.listeners.add(fn); }
    off(event, fn) { this.listeners.delete(fn); }
    emit(type, data) { this.listeners.forEach(fn => { try { fn(type, data); } catch (e) {} }); }
  }

  global.SupabaseSyncService = new SupabaseSyncService();
})(typeof self !== 'undefined' ? self : window);
