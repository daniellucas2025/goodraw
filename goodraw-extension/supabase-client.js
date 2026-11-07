/**
 * Universal Supabase Client & Sync Layer for GooDraw & Study Cloud
 * Funciona de forma transparente no navegador, em extensões Chromium e em PWAs móveis.
 */
(function (global) {
  'use strict';

  // Configuração padrão conectada ao Supabase Cloud do usuário
  const DEFAULT_CONFIG = {
    url: 'https://frwnoteybuadmnkultoh.supabase.co',
    anonKey: 'sb_publishable_oR15v6U20AsAsKm2eBfCsg_73hGR90b',
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

    async deleteScreenshot(idOrCreated) {
      try {
        const key = 'goodraw_local_shots';
        let list = JSON.parse(localStorage.getItem(key) || '[]');
        list = list.filter(s => (s.id && s.id !== idOrCreated) && s.created_at !== idOrCreated);
        localStorage.setItem(key, JSON.stringify(list));
      } catch (e) {}

      if (!this.isConfigured() || !idOrCreated) return { ok: true };

      try {
        let endpoint = `${this.config.url}/rest/v1/screenshots?id=eq.${encodeURIComponent(idOrCreated)}`;
        const res = await fetch(endpoint, {
          method: 'DELETE',
          headers: this.getAuthHeader()
        });
        return { ok: res.ok };
      } catch (e) {
        console.warn('[SupabaseSync] Erro ao deletar screenshot na nuvem:', e);
        return { ok: false, error: e };
      }
    }

    async deleteHighlight(id) {
      if (!this.isConfigured() || !id) return { ok: true };
      try {
        const res = await fetch(`${this.config.url}/rest/v1/highlights?id=eq.${encodeURIComponent(id)}`, {
          method: 'DELETE',
          headers: this.getAuthHeader()
        });
        return { ok: res.ok };
      } catch (e) {
        return { ok: false, error: e };
      }
    }

    async clearAllData() {
      try {
        localStorage.removeItem('goodraw_local_shots');
        for (let i = localStorage.length - 1; i >= 0; i--) {
          const k = localStorage.key(i);
          if (k && k.startsWith('goodraw_')) localStorage.removeItem(k);
        }
      } catch (e) {}

      if (!this.isConfigured()) return { ok: true };

      try {
        await Promise.all([
          fetch(`${this.config.url}/rest/v1/screenshots?id=neq.00000000-0000-0000-0000-000000000000`, { method: 'DELETE', headers: this.getAuthHeader() }),
          fetch(`${this.config.url}/rest/v1/highlights?id=neq.00000000-0000-0000-0000-000000000000`, { method: 'DELETE', headers: this.getAuthHeader() }),
          fetch(`${this.config.url}/rest/v1/drawings?id=neq.00000000-0000-0000-0000-000000000000`, { method: 'DELETE', headers: this.getAuthHeader() })
        ]);
        return { ok: true };
      } catch (e) {
        return { ok: false, error: e };
      }
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


    // ──────────────────────── REENVIAR CONFIRMAÇÃO DE E-MAIL ────────────────────────
    async resendConfirmationEmail(email) {
      if (!this.isConfigured() || !email) throw new Error('E-mail inválido ou não informado.');
      const res = await fetch(`${this.config.url}/auth/v1/resend`, {
        method: 'POST',
        headers: { 'apikey': this.config.anonKey, 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'signup', email: email.trim() })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.msg || data.error_description || 'Erro ao reenviar e-mail');
      return data;
    }

    // ──────────────────────── CADERNO DE ERROS ────────────────────────
    async saveErrorQuestion(question) {
      const id = question.id || 'err_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6);
      const record = {
        id,
        title: question.title || 'Questão sem título',
        banca: question.banca || 'Geral',
        disciplina: question.disciplina || 'Geral',
        statement: question.statement || '',
        marked_option: question.marked_option || '',
        correct_option: question.correct_option || '',
        error_reason: question.error_reason || 'Pegadinha',
        explanation: question.explanation || '',
        screenshot_url: question.screenshot_url || '',
        is_resolved: Boolean(question.is_resolved),
        created_at: question.created_at || new Date().toISOString()
      };

      const key = 'goodraw_caderno_erros';
      let list = JSON.parse(localStorage.getItem(key) || '[]');
      const idx = list.findIndex(x => x.id === id);
      if (idx >= 0) list[idx] = record;
      else list.unshift(record);
      localStorage.setItem(key, JSON.stringify(list));

      if (this.isConfigured()) {
        try {
          const notePayload = {
            title: `[ERRO] ${record.title} (${record.banca})`,
            content: JSON.stringify(record),
            subject: record.disciplina,
            tags: ['caderno_erros', record.banca, record.error_reason, record.is_resolved ? 'resolvido' : 'pendente'],
            user_id: this.session?.user?.id || null
          };
          fetch(`${this.config.url}/rest/v1/study_notes`, {
            method: 'POST',
            headers: this.getAuthHeader(),
            body: JSON.stringify(notePayload)
          }).catch(() => {});
        } catch (e) {}
      }
      return record;
    }

    async listErrorQuestions(filters = {}) {
      const key = 'goodraw_caderno_erros';
      let list = JSON.parse(localStorage.getItem(key) || '[]');
      if (filters.banca && filters.banca !== 'todas') {
        list = list.filter(q => (q.banca || '').toLowerCase() === filters.banca.toLowerCase());
      }
      if (filters.disciplina && filters.disciplina !== 'todas') {
        list = list.filter(q => (q.disciplina || '').toLowerCase() === filters.disciplina.toLowerCase());
      }
      if (filters.error_reason && filters.error_reason !== 'todos') {
        list = list.filter(q => (q.error_reason || '').toLowerCase() === filters.error_reason.toLowerCase());
      }
      if (filters.status === 'pendente') {
        list = list.filter(q => !q.is_resolved);
      } else if (filters.status === 'resolvido') {
        list = list.filter(q => q.is_resolved);
      }
      if (filters.search) {
        const s = filters.search.toLowerCase();
        list = list.filter(q => (q.title + ' ' + (q.statement||'') + ' ' + (q.explanation||'')).toLowerCase().includes(s));
      }
      return list;
    }

    async toggleErrorQuestionStatus(id) {
      const key = 'goodraw_caderno_erros';
      let list = JSON.parse(localStorage.getItem(key) || '[]');
      const q = list.find(x => x.id === id);
      if (q) {
        q.is_resolved = !q.is_resolved;
        localStorage.setItem(key, JSON.stringify(list));
      }
      return q;
    }

    async deleteErrorQuestion(id) {
      const key = 'goodraw_caderno_erros';
      let list = JSON.parse(localStorage.getItem(key) || '[]');
      list = list.filter(x => x.id !== id);
      localStorage.setItem(key, JSON.stringify(list));
      return { ok: true };
    }

    // ──────────────────────── FLASHCARDS COM SRS ────────────────────────
    async saveFlashcard(card) {
      const id = card.id || 'fc_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6);
      const record = {
        id,
        front: card.front || '',
        back: card.back || '',
        subject: card.subject || 'Geral',
        tags: card.tags || [],
        interval_days: card.interval_days || 1,
        review_count: card.review_count || 0,
        next_review: card.next_review || new Date().toISOString(),
        created_at: card.created_at || new Date().toISOString()
      };

      const key = 'goodraw_flashcards';
      let list = JSON.parse(localStorage.getItem(key) || '[]');
      const idx = list.findIndex(x => x.id === id);
      if (idx >= 0) list[idx] = record;
      else list.unshift(record);
      localStorage.setItem(key, JSON.stringify(list));

      if (this.isConfigured()) {
        try {
          fetch(`${this.config.url}/rest/v1/study_notes`, {
            method: 'POST',
            headers: this.getAuthHeader(),
            body: JSON.stringify({
              title: `[FLASHCARD] ${record.front.substring(0, 50)}`,
              content: JSON.stringify(record),
              subject: record.subject,
              tags: ['flashcard', record.subject],
              user_id: this.session?.user?.id || null
            })
          }).catch(() => {});
        } catch (e) {}
      }
      return record;
    }

    async listFlashcards(subject = '') {
      const key = 'goodraw_flashcards';
      let list = JSON.parse(localStorage.getItem(key) || '[]');
      if (subject && subject !== 'todos') {
        list = list.filter(c => (c.subject || '').toLowerCase() === subject.toLowerCase());
      }
      return list;
    }

    async reviewFlashcard(id, quality) {
      const key = 'goodraw_flashcards';
      let list = JSON.parse(localStorage.getItem(key) || '[]');
      const c = list.find(x => x.id === id);
      if (c) {
        c.review_count = (c.review_count || 0) + 1;
        const addDays = quality === 'acertei' ? 7 : quality === 'dificil' ? 3 : 1;
        c.interval_days = addDays;
        const d = new Date();
        d.setDate(d.getDate() + addDays);
        c.next_review = d.toISOString();
        localStorage.setItem(key, JSON.stringify(list));
      }
      return c;
    }

    async deleteFlashcard(id) {
      const key = 'goodraw_flashcards';
      let list = JSON.parse(localStorage.getItem(key) || '[]');
      list = list.filter(x => x.id !== id);
      localStorage.setItem(key, JSON.stringify(list));
      return { ok: true };
    }

    // ──────────────────────── PLANNER & METAS SEMANAIS ────────────────────────
    async saveGoal(goal) {
      const id = goal.id || 'goal_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6);
      const record = {
        id,
        text: goal.text || '',
        category: goal.category || 'Meta Semanal',
        completed: Boolean(goal.completed),
        created_at: goal.created_at || new Date().toISOString()
      };
      const key = 'goodraw_planner_goals';
      let list = JSON.parse(localStorage.getItem(key) || '[]');
      const idx = list.findIndex(x => x.id === id);
      if (idx >= 0) list[idx] = record;
      else list.unshift(record);
      localStorage.setItem(key, JSON.stringify(list));
      return record;
    }

    async listGoals() {
      const key = 'goodraw_planner_goals';
      return JSON.parse(localStorage.getItem(key) || '[]');
    }

    async toggleGoal(id) {
      const key = 'goodraw_planner_goals';
      let list = JSON.parse(localStorage.getItem(key) || '[]');
      const g = list.find(x => x.id === id);
      if (g) {
        g.completed = !g.completed;
        localStorage.setItem(key, JSON.stringify(list));
      }
      return g;
    }

    async deleteGoal(id) {
      const key = 'goodraw_planner_goals';
      let list = JSON.parse(localStorage.getItem(key) || '[]');
      list = list.filter(x => x.id !== id);
      localStorage.setItem(key, JSON.stringify(list));
      return { ok: true };
    }

    // ──────────────────────── POMODORO STATS ────────────────────────
    recordPomodoro(minutes = 25) {
      const today = new Date().toISOString().split('T')[0];
      const key = 'goodraw_pomodoro_' + today;
      let data = JSON.parse(localStorage.getItem(key) || '{"cycles":0,"minutes":0}');
      data.cycles += 1;
      data.minutes += minutes;
      localStorage.setItem(key, JSON.stringify(data));
      return data;
    }

    getPomodoroStats() {
      const today = new Date().toISOString().split('T')[0];
      const key = 'goodraw_pomodoro_' + today;
      return JSON.parse(localStorage.getItem(key) || '{"cycles":0,"minutes":0}');
    }

    on(event, fn) { this.listeners.add(fn); }
    off(event, fn) { this.listeners.delete(fn); }
    emit(type, data) { this.listeners.forEach(fn => { try { fn(type, data); } catch (e) {} }); }
  }

  global.SupabaseSyncService = new SupabaseSyncService();
})(typeof self !== 'undefined' ? self : window);
