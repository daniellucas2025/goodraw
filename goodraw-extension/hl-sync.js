// GooHighlights na nuvem, direto do background da extensão (21/10/2026).
// A extensão não tem mais o Notes dentro: as telas (Minhas marcações, a conta)
// ficam no site, /notes/app. Aqui ficam só:
//
//  • a sessão da extensão — dela, não a do site: a pessoa entra no site, que
//    cria um login de uso único para o par que a extensão abriu
//    (cloud/supabase/functions/ext-link); a extensão o troca por uma sessão
//    e a renova sozinha. Desde 05/11/2026 (um login só, notes/onelogin.js),
//    no Chrome e no Edge o site faz isso direto (background.js,
//    onMessageExternal), sem código, e sair de um lado sai do outro;
//  • as configurações da barra (cores, espessuras, tema, posição, idioma, as
//    da Highlights): ficam neste computador e, com a conta, também nela (nos
//    dados do usuário: user_metadata.draw_prefs) — vale a mudança mais nova;
//  • a sincronização das páginas, marcações e anotações à mão ('webpage',
//    'mark', 'pageink') e do caderno de erros ('errfolder', 'errshot', com a
//    imagem de cada captura no bucket 'notes', como os arquivos do Notes): o que foi
//    grifado sem conta já está no aparelho (notes/db.js) e sobe na primeira
//    vez; depois, cada grifo sobe em seguida, e o que veio de outros
//    aparelhos desce de tempos em tempos e quando uma página é aberta.
//
// Os mesmos registros e as mesmas chaves de sincronização (u:<id>:rev:…) que
// o notes/sync.js usava aqui: quem já sincronizava continua de onde parou.
(function (g) {
  'use strict';
  const D = g.NotesDB, CFG = g.NotesCloudConfig;
  const WEB = 'https://daniellucas2025.github.io/goodraw/dashboard.html';
  // 'subject' e 'topic' (26/10/2026): o cadastro único — disciplinas e tópicos —
  // que o caderno de erros passou a usar (as pastas viraram ele).
  const KINDS = ['webpage', 'mark', 'pageink', 'errfolder', 'errshot', 'subject', 'topic'];
  const K_SESSION = 'bnHlSession', K_PAIR = 'bnHlPair', K_DEVICE = 'bnHlDevice';
  // Um login só (05/11/2026, notes/onelogin.js): quando esta sessão começou e
  // quando a pessoa saiu daqui de propósito pela última vez (ms).
  const K_SINCE = 'bnHlSince', K_OUT = 'bnHlOut', K_OUT_USER = 'bnHlOutUser';
  const markOut = async () => { await store.set(K_OUT, Date.now()); await store.set(K_OUT_USER, session && session.user ? session.user.email || '' : ''); };
  const PAIR_TTL = 15 * 60 * 1000;
  const listeners = new Set();
  let session = null, ready = null, busy = null, timer = 0, lastPull = 0;
  const state = { phase: 'off', error: null, lastSync: null, used: null, quota: null };

  const store = {
    get: k => new Promise(r => chrome.storage.local.get(k, o => r(o ? o[k] : undefined))),
    set: (k, v) => new Promise(r => chrome.storage.local.set({ [k]: v }, () => r())),
    del: k => new Promise(r => chrome.storage.local.remove(k, () => r()))
  };
  const emit = () => listeners.forEach(f => { try { f(status()); } catch (e) {} });
  const set = p => { Object.assign(state, p); emit(); };
  function load() {
    return ready || (ready = store.get(K_SESSION).then(s => { session = s || null; }));
  }
  async function save(s) {
    const was = session;
    session = s;
    if (s) await store.set(K_SESSION, s); else await store.del(K_SESSION);
    // Um login só (notes/onelogin.js): quando esta sessão começou.
    if (s && !was) await store.set(K_SINCE, Date.now());
    // A aba "GooHighlights" da barra (content.js) mostra onde as marcações ficam.
    await store.set('bnCloudUser', s && s.user ? s.user.email || '' : '');
    if (!s) await store.del('bnNotesAccess');
    emit();
  }
  const keep = d => ({ access_token: d.access_token, refresh_token: d.refresh_token, expires_at: d.expires_at || Math.floor(Date.now() / 1000) + (d.expires_in || 3600), user: { id: d.user.id, email: d.user.email } });

  // ─── a nuvem, sem SDK ────────────────────────────────────────────────────
  async function req(path, { method = 'GET', token, body } = {}) {
    let r;
    try {
      r = await fetch(CFG.url + path, { method, headers: { apikey: CFG.key, ...(token ? { Authorization: 'Bearer ' + token } : {}), ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}) }, body: body === undefined ? undefined : JSON.stringify(body) });
    } catch (e) { const x = new Error('offline'); x.status = 0; throw x; }
    const text = await r.text();
    let data = null; try { data = text ? JSON.parse(text) : null; } catch (e) { data = text; }
    if (!r.ok) { const x = new Error((data && (data.error_code || data.error || data.code || data.message)) || 'http_' + r.status); x.status = r.status; x.detail = data && data.message; throw x; }
    return data;
  }
  let refreshing = null;
  async function token() {
    await load();
    if (!session) return null;
    if (session.expires_at - 60 > Date.now() / 1000) return session.access_token;
    if (!refreshing) {
      refreshing = req('/auth/v1/token?grant_type=refresh_token', { method: 'POST', body: { refresh_token: session.refresh_token } })
        .then(async d => { await save(keep(d)); return session.access_token; })
        .catch(async e => { if (e.status === 400 || e.status === 401) await save(null); throw e; })
        .finally(() => { refreshing = null; });
    }
    return refreshing;
  }
  async function authed(path, opts = {}) {
    const tk = await token();
    if (!tk) { const x = new Error('not_authenticated'); x.status = 401; throw x; }
    return req(path, { ...opts, token: tk });
  }

  // ─── conectar pelo site ──────────────────────────────────────────────────
  const rand = () => Array.from(crypto.getRandomValues(new Uint8Array(24)), b => b.toString(16).padStart(2, '0')).join('');
  // Como o "código de dispositivo" das TVs: a extensão abre o par com um
  // segredo que só ela tem (vai só o hash) e recebe um código curto, que
  // mostra; a pessoa o digita no site. O link do site leva só o par: sozinho,
  // não conecta nada — e o login só sai para quem tem o segredo.
  const sha256 = async s => Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s))), b => b.toString(16).padStart(2, '0')).join('');
  // opts.window: the site in a window of its own, beside the page — the home
  // screen (home.js) stays in view with the code to type there.
  // opts.silent (27/10/2026): no site opened — the site already open and
  // signed in takes the pair and its code from the page (highlights.js →
  // notes/connect.js) and approves it by itself. → { pair, code }.
  async function connect(opts = {}) {
    // The site taking the pair by itself: the one under way, if any — a new
    // pair would replace it here, and the one the site approves (or the code
    // the person is typing) would never be collected.
    if (opts.silent) {
      const p = await store.get(K_PAIR);
      if (p && p.secret && p.code && Date.now() - p.at < PAIR_TTL) return { pair: p.id, code: p.code };
    }
    const pair = rand(), secret = rand() + rand();
    const r = await req('/functions/v1/ext-link', { method: 'POST', body: { start: true, pair, verifier: await sha256(secret) } });
    await store.set(K_PAIR, { id: pair, secret, code: r.code, at: Date.now() });
    if (opts.silent) return { pair, code: r.code };
    const url = WEB + '#/conectar/' + pair;
    // A window beside the one in use, in front. Chrome may put a popup where
    // the last one was — off every screen, if a monitor is gone — and then the
    // click seems to do nothing: one that lands outside the window in use is
    // brought inside it. Chrome refuses bounds mostly off screen, hence the
    // catches; a tab if no window can be made.
    if (opts.window && chrome.windows) {
      try {
        const cur = await chrome.windows.getLastFocused().catch(() => null);
        const pop = await chrome.windows.create({ url, type: 'popup', width: 560, height: 760 });
        if (pop && pop.id != null) {
          const inside = cur && cur.width && pop.left != null && pop.left >= cur.left - 40 && pop.left < cur.left + cur.width - 80 && pop.top >= cur.top - 40 && pop.top < cur.top + cur.height - 80;
          if (cur && cur.width && !inside) await chrome.windows.update(pop.id, { left: Math.max(cur.left, cur.left + cur.width - 584), top: cur.top + 60 }).catch(() => {});
          chrome.windows.update(pop.id, { focused: true, drawAttention: true }).catch(() => {});
        }
        return r.code;
      } catch (e) {}
    }
    chrome.tabs.create({ url });
    return r.code;
  }
  // Pergunta se o site já deixou o login do par; troca por uma sessão.
  async function checkPair() {
    const p = await store.get(K_PAIR);
    if (!p) return false;
    if (Date.now() - p.at > PAIR_TTL) { await store.del(K_PAIR); return false; }
    let r;
    if (!p.secret) { await store.del(K_PAIR); return false; }   // a par of the old kind: no longer accepted
    try { r = await req('/functions/v1/ext-link?pair=' + encodeURIComponent(p.id) + '&secret=' + encodeURIComponent(p.secret)); }
    catch (e) { if (e.status === 410 || e.status === 400 || e.status === 404) await store.del(K_PAIR); return false; }
    if (!r || !r.token_hash) return false;
    await store.del(K_PAIR);
    const d = await req('/auth/v1/verify', { method: 'POST', body: { type: 'magiclink', token_hash: r.token_hash } });
    await save(keep(d));
    sync();
    return true;
  }
  const pairPending = async () => { const p = await store.get(K_PAIR); return !!p && !!p.secret && Date.now() - p.at < PAIR_TTL; };
  const pairCode = async () => { const p = await store.get(K_PAIR); return p && p.secret && Date.now() - p.at < PAIR_TTL ? p.code || '' : ''; };
  // Sair: o que falta sobe antes; o que não subir (sem internet) só se perde
  // com force (quem chamou perguntou). Depois, nada da conta fica aqui
  // (26/10/2026: tudo pede conta, e um computador pode ser de vários).
  // One at a time (the site may ask while the person clicks Desconectar).
  let leaving = null;
  function disconnect(force) {
    return leaving || (leaving = disconnectNow(force).finally(() => { leaving = null; }));
  }
  async function disconnectNow(force) {
    await load();
    if (session) { try { await sync(); } catch (e) {} }
    const left = (await D.outboxList(5000).catch(() => [])).filter(e => KINDS.includes(e.kind)).length;
    if (left && !force) return { ok: false, pending: left };
    const tk = session && session.access_token;
    if (session) await markOut();
    await save(null);
    await D.wipeLocal();
    await store.del('bnCloudSpace'); await store.del('bnQuotaMailed');
    set({ phase: 'off', error: null, used: null, quota: null });
    if (tk) req('/auth/v1/logout', { method: 'POST', token: tk }).catch(() => {});
    return { ok: true };
  }

  // ─── um login só (05/11/2026, notes/onelogin.js) ──────────────────────────
  // O site (onMessageExternal, background.js) ou o Notes do app (engine.js)
  // perguntam como está esta conta, dão a ela um login de uso único da conta
  // deles, ou pedem um desta para eles. Cada lado com a sua própria sessão.
  async function linkState() {
    await load();
    const [since, out, outUser] = await Promise.all([store.get(K_SINCE), store.get(K_OUT), store.get(K_OUT_USER)]);
    return { user: session && session.user ? session.user.email || '' : '', since: +since || 0, out: +out || 0, outUser: outUser || '' };
  }
  // Um login de uso único desta conta, para o outro lado (tk: o token de
  // outra sessão — o Notes do app —; sem ele, o desta).
  async function handoff(tk) {
    tk = tk || await token();
    if (!tk) return { ok: false, error: 'no_account' };
    const r = await req('/functions/v1/ext-link', { method: 'POST', token: tk, body: { handoff: true } });
    return r && r.token_hash ? { ok: true, token_hash: r.token_hash, email: r.email || '' } : { ok: false, error: 'link_failed' };
  }
  // O login do outro lado vira uma sessão daqui. Já com conta, nada muda.
  async function adopt(tokenHash) {
    await load();
    if (session) return { ok: false, signedIn: true, user: session.user ? session.user.email : '' };
    if (typeof tokenHash !== 'string' || !/^[A-Za-z0-9_-]{16,200}$/.test(tokenHash)) return { ok: false, error: 'bad_token' };
    const d = await req('/auth/v1/verify', { method: 'POST', body: { type: 'magiclink', token_hash: tokenHash } });
    await load();
    if (session) return { ok: false, signedIn: true, user: session.user ? session.user.email : '' };
    await save(keep(d));
    await store.del(K_PAIR);
    sync();
    return { ok: true, user: d.user.email };
  }

  // ─── entrar aqui mesmo (o app Android: o modal "Sincronizar na nuvem") ───
  // E-mail e senha, como no site (notes/cloud.js): a conta nova recebe um
  // código por e-mail para confirmar; quem esqueceu a senha, um código e uma
  // senha nova ali mesmo.
  async function signedIn(d) { await save(keep(d)); await store.del(K_PAIR); sync(); return { ok: true, user: d.user.email }; }
  const signIn = (email, password) => req('/auth/v1/token?grant_type=password', { method: 'POST', body: { email, password } }).then(signedIn);
  async function signUp(email, password) {
    const d = await req('/auth/v1/signup', { method: 'POST', body: { email, password } });
    if (d && d.access_token) return signedIn(d);
    const u = d && (d.user || d);
    if (u && Array.isArray(u.identities) && !u.identities.length) return { ok: false, exists: true };
    return { ok: true, code: true };
  }
  const verifySignup = (email, token) => req('/auth/v1/verify', { method: 'POST', body: { type: 'signup', email, token } }).then(signedIn);
  const resendSignup = email => req('/auth/v1/resend', { method: 'POST', body: { type: 'signup', email } }).then(() => ({ ok: true }));
  const recover = email => req('/auth/v1/recover', { method: 'POST', body: { email } }).then(() => ({ ok: true }));
  async function resetPassword(email, token, password) {
    const d = await req('/auth/v1/verify', { method: 'POST', body: { type: 'recovery', email, token } });
    await save(keep(d));
    await authed('/auth/v1/user', { method: 'PUT', body: { password } });
    sync();
    return { ok: true, user: d.user.email };
  }

  // ─── sincronizar ─────────────────────────────────────────────────────────
  const recKey = (kind, id) => kind + ':' + id;
  const uk = () => 'u:' + (session && session.user ? session.user.id : '') + ':';
  const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
  async function deviceId() {
    let d = await store.get(K_DEVICE);
    if (!d) { d = 'ext-' + rand().slice(0, 16); await store.set(K_DEVICE, d); }
    return d;
  }
  // Os campos de uma marcação ou página: o que só um lado mudou desde a base
  // fica; o que os dois mudaram, fica o da nuvem (como no notes/sync.js).
  function merge(base, local, server) {
    const out = { ...server };
    for (const k of new Set([...Object.keys(local), ...Object.keys(server)])) {
      if (k === 'updatedAt' || same(local[k], server[k])) continue;
      if (base && same(server[k], base[k])) { if (local[k] === undefined) delete out[k]; else out[k] = local[k]; }
    }
    out.updatedAt = Math.max(local.updatedAt || 0, server.updatedAt || 0) || out.updatedAt;
    return out;
  }
  async function resolve(server, entry) {
    const key = recKey(server.kind, server.id);
    const local = await D.recordFor(server.kind, server.id);
    const synced = data => [[uk() + 'rev:' + key, server.rev], [uk() + 'base:' + key, data]];
    const adopt = async data => { await D.applyRemote(server.kind, server.id, data, synced(data)); if (entry) await D.outboxDone([entry]); };
    if (!local) return adopt(server.deleted ? null : server.data);
    if (server.deleted) { await D.syncSetMany(synced(null)); return; }   // editado aqui: sobe de novo
    if (same(local, server.data)) return adopt(server.data);
    const m = merge(await D.syncGet(uk() + 'base:' + key), local, server.data);
    if (same(m, server.data)) return adopt(server.data);
    await D.applyRemote(server.kind, server.id, m, synced(server.data));
    await D.outboxTouch(server.kind, server.id);
  }
  // ─── as imagens do caderno de erros ──────────────────────────────────────
  // Sobem antes do registro que as usa (uma vez: 409 = já estava lá); descem
  // logo que o registro chega, para estarem no aparelho mesmo sem internet.
  const filePath = id => '/storage/v1/object/notes/' + session.user.id + '/' + encodeURIComponent(id);
  async function upload(id) {
    if (await D.syncGet(uk() + 'up:' + id)) return;
    const blob = await D.localBlob(id);
    if (!blob) return;   // não é deste aparelho: o outro já a enviou
    const tk = await token();
    const r = await fetch(CFG.url + filePath(id), { method: 'POST', headers: { apikey: CFG.key, Authorization: 'Bearer ' + tk, 'Content-Type': blob.type || 'application/octet-stream' }, body: blob });
    if (!r.ok && r.status !== 409) {
      const t = await r.text().catch(() => '');
      if (r.status === 409 || /exists|Duplicate/i.test(t)) { /* já estava lá */ }
      else if (r.status === 403 || /row-level security/i.test(t)) { const x = new Error('quota_exceeded'); x.detail = 'quota_exceeded'; throw x; }
      else { const x = new Error('upload_' + r.status); x.status = r.status; throw x; }
    }
    await D.syncSet(uk() + 'up:' + id, 1);
  }
  async function download(id) {
    if (await D.hasBlob(id)) return;
    const tk = await token();
    const r = await fetch(CFG.url + '/storage/v1/object/authenticated/notes/' + session.user.id + '/' + encodeURIComponent(id), { headers: { apikey: CFG.key, Authorization: 'Bearer ' + tk } });
    if (r.ok) await D.putBlobWithId(id, await r.blob());
  }
  const shotImg = rec => rec && rec.img ? String(rec.img).replace(/^bnblob:/, '') : null;
  // Os arquivos de um registro: a imagem da captura, as imagens da nota de uma marcação.
  const filesOf = (kind, rec) => !rec ? [] : kind === 'errshot' ? (shotImg(rec) ? [shotImg(rec)] : D.blobRefs(rec)) : kind === 'mark' ? D.blobRefs(rec) : [];
  // Uma imagem que este aparelho ainda não tem (a nota veio de outro): da nuvem, na hora.
  D.remoteBlob = async id => {
    await load();
    if (!session) return null;
    const tk = await token();
    const r = await fetch(CFG.url + '/storage/v1/object/authenticated/notes/' + session.user.id + '/' + encodeURIComponent(id), { headers: { apikey: CFG.key, Authorization: 'Bearer ' + tk } });
    return r.ok ? r.blob() : null;
  };

  // onlyDeletes: com a nuvem cheia, só as exclusões sobem (é assim que o
  // espaço volta); o resto espera na fila.
  async function push(onlyDeletes) {
    const dev = await deviceId();
    for (let round = 0; round < 50; round++) {
      let entries = (await D.outboxList(5000)).filter(e => KINDS.includes(e.kind));
      if (onlyDeletes) {
        const gone = [];
        for (const e of entries) if (!(await D.recordFor(e.kind, e.id))) gone.push(e);
        entries = gone;
      }
      entries = entries.slice(0, 100);
      if (!entries.length) return;
      const changes = [];
      for (const e of entries) {
        const rec = await D.recordFor(e.kind, e.id);
        for (const id of filesOf(e.kind, rec)) await upload(id);
        changes.push({ kind: e.kind, id: e.id, deleted: !rec, data: rec || null, device: dev, base_rev: (await D.syncGet(uk() + 'rev:' + e.key)) ?? null });
      }
      const res = await authed('/rest/v1/rpc/notes_push', { method: 'POST', body: { changes } });
      const byKey = new Map(changes.map(c => [recKey(c.kind, c.id), c]));
      await D.syncSetMany(res.applied.flatMap(a => { const key = recKey(a.kind, a.id), c = byKey.get(key); return [[uk() + 'rev:' + key, a.rev], [uk() + 'base:' + key, c && !c.deleted ? c.data : null]]; }));
      const applied = new Set(res.applied.map(a => recKey(a.kind, a.id)));
      await D.outboxDone(entries.filter(e => applied.has(e.key)));
      // A record the server can't take (too big, a bad id): out of the queue,
      // and said in the console — sent again and again it would never get in (Onda 3).
      const rejected = new Set((res.rejected || []).map(a => recKey(a.kind, a.id)));
      if (rejected.size) {
        console.warn('Marcações: recusados pela nuvem', res.rejected);
        await D.outboxDone(entries.filter(e => rejected.has(e.key)));
        await D.syncSetMany(res.rejected.map(a => [uk() + 'rej:' + recKey(a.kind, a.id), a.reason || 'rejected']));
      }
      for (const c of res.conflicts) await resolve(c, entries.find(e => e.key === recKey(c.kind, c.id)));
      if (!res.applied.length && !res.conflicts.length) return;
    }
  }
  // The full check (30/10/2026, chamado #6: a Highlights showing disciplines
  // deleted on the site two days before): every so often, and once after each
  // update of the extension, the pull goes back to the start and compares
  // what this device holds with the cloud, record by record — not only the
  // revisions it hasn't seen. What the cloud deleted goes from here; what the
  // cloud has and this device lacks comes down; what only this device has,
  // and isn't waiting to go up, is queued to go up (never thrown away).
  const FULL_EVERY = 6 * 3600 * 1000;
  const VER = (() => { try { return chrome.runtime.getManifest().version; } catch (e) { return ''; } })();
  async function pull() {
    let cursor = (await D.syncGet(uk() + 'hlcursor')) || 0;
    // A version with more kinds than the last pull's goes back to the start
    // once: the new kind's records (made on another device) come down too.
    if ((await D.syncGet(uk() + 'hlkinds')) !== KINDS.join(',')) { cursor = 0; await D.syncSet(uk() + 'hlkinds', KINDS.join(',')); }
    const lastFull = await D.syncGet(uk() + 'hlfull');
    const full = !lastFull || lastFull.v !== VER || Date.now() - lastFull.at > FULL_EVERY;
    if (full) cursor = 0;
    const seen = new Set();
    for (let round = 0; round < 100; round++) {
      const rows = await authed(`/rest/v1/notes_records?select=kind,id,rev,deleted&kind=in.(${KINDS.join(',')})&rev=gt.${Math.max(0, cursor - 50)}&order=rev.asc&limit=500`);
      const fresh = [], wanted = [];
      for (const r of rows) {
        const key = recKey(r.kind, r.id);
        if (full) seen.add(key);
        const have = await D.syncGet(uk() + 'rev:' + key);
        let due = have == null || have < r.rev;
        // Seen already, but here it's alive where the cloud deleted it (or
        // missing where the cloud has it): it comes again.
        if (!due && full && !(await D.outboxGet(key))) due = !!(await D.recordFor(r.kind, r.id)) === !!r.deleted;
        if (due) (r.deleted ? fresh : wanted).push(r);
      }
      for (let i = 0; i < wanted.length; i += 100) fresh.push(...await authed(`/rest/v1/notes_records?select=kind,id,rev,deleted,data&rev=in.(${wanted.slice(i, i + 100).map(r => r.rev).join(',')})`));
      // As páginas antes das marcações delas.
      fresh.sort((a, b) => (a.kind === b.kind ? a.rev - b.rev : a.kind === 'webpage' ? -1 : 1));
      for (const r of fresh) {
        const key = recKey(r.kind, r.id), entry = await D.outboxGet(key);
        if (entry) await resolve(r, entry);
        else await D.applyRemote(r.kind, r.id, r.deleted ? null : r.data, [[uk() + 'rev:' + key, r.rev], [uk() + 'base:' + key, r.deleted ? null : r.data]]);
        if (!r.deleted) for (const id of filesOf(r.kind, r.data)) { try { await download(id); } catch (e) {} }
      }
      if (rows.length) cursor = Math.max(cursor, ...rows.map(r => r.rev));
      await D.syncSet(uk() + 'hlcursor', cursor);
      if (rows.length < 500) break;
    }
    if (!full) return;
    let orphans = 0;
    for (const kind of KINDS) {
      for (const id of await D.localIds(kind)) {
        const key = recKey(kind, id);
        if (seen.has(key) || await D.outboxGet(key) || (await D.syncGet(uk() + 'rej:' + key)) != null) continue;
        await D.outboxTouch(kind, id); orphans++;
      }
    }
    await D.syncSet(uk() + 'hlfull', { v: VER, at: Date.now() });
    if (orphans) soon();
  }
  // ─── as configurações da barra ───────────────────────────────────────────
  const PREF_KEYS = ['pdColor', 'pdSize', 'pdRecent', 'pdToolSizes', 'pdToolColors', 'pdHlStraight', 'pdEraserStroke', 'pdPencilSmooth',
    'pdScPos', 'pdCalcScale', 'pdTbPos', 'pdTheme', 'pdLang', 'pdClearOnNav', 'hlOn', 'hlQuick', 'hlColor', 'hlOff', 'hlInkOpts'];
  const applied = new Map();   // o que veio da conta: escrever aqui não conta como mudança local
  let prefTimer = 0;
  const localPrefs = () => new Promise(r => chrome.storage.local.get(PREF_KEYS, o => r(o || {})));
  async function pushPrefs() {
    await load();
    if (!session) return;
    const at = (await store.get('bnPrefsAt')) || Date.now();
    await authed('/auth/v1/user', { method: 'PUT', body: { data: { draw_prefs: { at, v: await localPrefs() } } } });
  }
  async function syncPrefs() {
    const u = await authed('/auth/v1/user');
    const remote = u && u.user_metadata && u.user_metadata.draw_prefs;
    const localAt = (await store.get('bnPrefsAt')) || 0;
    if (remote && remote.v && remote.at > localAt) {
      // Only the bar's own preferences come down: a key the account carries
      // from elsewhere must not land in this extension's storage.
      const v = {};
      Object.entries(remote.v).forEach(([k, val]) => { if (PREF_KEYS.includes(k)) { applied.set(k, JSON.stringify(val)); v[k] = val; } });
      await new Promise(r => chrome.storage.local.set({ ...v, bnPrefsAt: remote.at }, r));
    } else if (localAt && (!remote || localAt > remote.at)) await pushPrefs();
  }
  // Uma mudança feita aqui (na barra, na Highlights): anotada e enviada 3 s depois.
  chrome.storage.onChanged.addListener((ch, area) => {
    if (area !== 'local') return;
    const mine = Object.keys(ch).filter(k => PREF_KEYS.includes(k) && applied.get(k) !== JSON.stringify(ch[k].newValue));
    Object.keys(ch).forEach(k => applied.delete(k));
    if (!mine.length) return;
    store.set('bnPrefsAt', Date.now());
    clearTimeout(prefTimer);
    prefTimer = setTimeout(() => pushPrefs().catch(() => {}), 3000);
  });

  // ─── o espaço da nuvem (5 MB grátis; 10 MB para as contas de antes de 26/10/2026) ────────────────────────────────────
  // Cheia, a nuvem não recebe nada: o envio para (os grifos novos ficam no
  // aparelho, na fila, e sobem quando houver espaço) e o que vem de outros
  // aparelhos continua descendo. A partir de 80% e ao encher, a conta recebe
  // um e-mail (quota-mail: uma vez por nível; é por ele que a compra chega a
  // quem usa o app Android/iOS, onde não pode haver link nem preço).
  const NEAR = 0.8;
  const level = () => (state.quota > 0 && state.used != null ? (state.used >= state.quota ? 'full' : state.used >= state.quota * NEAR ? 'near' : 'ok') : 'ok');
  async function readSpace() {
    try {
      const a = await authed('/rest/v1/rpc/notes_account', { method: 'POST', body: {} });
      if (a && typeof a.used === 'number' && typeof a.quota === 'number') set({ used: a.used, quota: a.quota });
      // The account has the Notes: the flashcard of a selected passage shows
      // (highlights.js, cardOffer).
      if (a && (await store.get('bnNotesAccess')) !== (a.notes === true)) await store.set('bnNotesAccess', a.notes === true);
    } catch (e) { if (e.status === 0) throw e; }
    const lv = level(), told = await store.get('bnQuotaMailed');
    // A aba "GooHighlights" da barra (content.js) mostra a nuvem cheia.
    if ((await store.get('bnCloudSpace')) !== lv) await store.set('bnCloudSpace', lv);
    if (lv === 'ok') { if (told) await store.del('bnQuotaMailed'); return; }
    if (told === lv || (told === 'full' && lv === 'near')) return;
    try { await authed('/functions/v1/quota-mail', { method: 'POST', body: { level: lv } }); await store.set('bnQuotaMailed', lv); } catch (e) {}
  }
  const quotaHit = e => /quota_exceeded/.test(String(e && (e.detail || e.message) || ''));

  async function once() {
    await load();
    if (!session) { set({ phase: 'off' }); return; }
    set({ phase: 'syncing', error: null });
    try {
      // A primeira vez desta conta aqui: tudo o que foi grifado sem conta sobe.
      if (!(await D.syncGet(uk() + 'started:marks'))) {
        // Os dados de outra conta neste computador (a sessão dela acabou e
        // outra pessoa conectou): nunca se misturam na nuvem desta. A tela
        // inicial avisa; "Desconectar esta extensão" limpa o computador.
        if ((await D.syncUsers()).some(id => id !== session.user.id)) { set({ phase: 'error', error: 'other_account' }); return; }
        await D.outboxAll(KINDS);
        await D.syncSet(uk() + 'started:marks', Date.now());
      }
      await readSpace();
      if (level() === 'full') { await push(true); await readSpace(); }
      if (level() !== 'full') {
        try { await push(); }
        catch (e) { if (!quotaHit(e)) throw e; set({ used: Math.max(state.used || 0, state.quota || 0) }); await readSpace(); }
      }
      await pull();
      // Pastas que vieram de um app mais antigo viram disciplinas e tópicos (sobem na próxima vez).
      try { if (await D.adoptErrFolders()) soon(); } catch (e) { console.error('Caderno de erros', e); }
      try { await syncPrefs(); } catch (e) { console.error('prefs', e); }
      lastPull = Date.now();
      try { chrome.storage.session.set({ hlLastPull: lastPull }); } catch (e) {}
      set({ phase: 'idle', lastSync: Date.now() });
    } catch (e) {
      set({ phase: e.status === 0 ? 'offline' : 'error', error: e.message });
    }
  }
  // Uma sincronização de cada vez: a próxima espera a anterior (só a última
  // da fila libera o busy — antes, a primeira a acabar o zerava com outra
  // ainda rodando, e uma terceira começava em paralelo).
  function sync() {
    const p = (busy || Promise.resolve()).then(once);
    busy = p;
    p.finally(() => { if (busy === p) busy = null; }).catch(() => {});
    return p;
  }
  // Depois de um grifo: sobe 2 s depois do último de uma sequência.
  function soon() { clearTimeout(timer); timer = setTimeout(sync, 2000); }
  // Uma página aberta: o que veio de outros aparelhos, no máximo a cada 2 min.
  // When the last pull was (also in storage.session: the worker restarts
  // between two pages, and would pull again at once).
  const pulledAt = () => new Promise(r => { try { chrome.storage.session.get('hlLastPull', o => { void chrome.runtime.lastError; r(Math.max(lastPull, (o && o.hlLastPull) || 0)); }); } catch (e) { r(lastPull); } });
  async function maybePull() { if (Date.now() - await pulledAt() > 120000) sync(); }
  // Before showing the disciplines (the topic picker, the caderno de erros):
  // what changed on the site comes down first — up to 4 s, then what's here.
  async function fresh() {
    await load();
    if (!session || Date.now() - await pulledAt() < 60000) return;
    await Promise.race([sync().catch(() => {}), new Promise(r => setTimeout(r, 4000))]);
  }

  // "Excluir conta" (as lojas exigem dentro do app): a função apaga a nuvem e o
  // usuário; aqui só se esquece a sessão, que já não existe no servidor.
  async function deleteAccount() {
    await authed('/functions/v1/delete-account', { method: 'POST', body: {} });
    await markOut();
    await save(null);
    await store.del('bnCloudSpace'); await store.del('bnQuotaMailed');
    set({ phase: 'off', error: null, used: null, quota: null });
    return { ok: true };
  }

  async function status() {
    await load();
    const lv = session ? level() : 'ok';
    return { user: session && session.user ? session.user.email : '', phase: state.phase, error: state.error, lastSync: state.lastSync, pairing: await pairPending(), pairCode: await pairCode(),
      used: state.used, quota: state.quota, space: lv, pending: lv === 'full' ? (await D.outboxList(5000)).filter(e => KINDS.includes(e.kind)).length : 0 };
  }

  // ─── a flashcard from a selected passage (highlights.js → cardOffer) ─────
  // The Notes isn't here: its topics are read from the account, and the card
  // goes straight to it, like one made in the Notes (notes/flashcards.js) —
  // new, due now. An account without the Notes isn't given it (notes_push
  // leaves it out): then it says so.
  async function cardTopics() {
    await load();
    if (!session) return { ok: false, error: 'no_account' };
    // The server answers at most 1000 rows a time: page through (a long
    // syllabus has more topics than that), and add what this device made
    // and hasn't sent yet (the registry is synced here too).
    const sel = 'select=kind,id,name:data->>name,subject_id:data->>subject_id,parent_id:data->>parent_id,ord:data->>display_order';
    const subs = new Map(), tops = new Map();
    for (let from = 0; ; from += 1000) {
      const rows = await authed(`/rest/v1/notes_records?${sel}&kind=in.(subject,topic)&deleted=is.false&order=kind,id&offset=${from}&limit=1000`);
      for (const r of rows || []) (r.kind === 'subject' ? subs : tops).set(r.id, r);
      if (!rows || rows.length < 1000) break;
    }
    // Only what is still waiting to go up: a discipline deleted on the site
    // and still here (not pulled yet) must not come back in the list.
    const pending = new Set((await D.outboxList(5000).catch(() => [])).map(e => e.key));
    const [ls, lt] = await Promise.all([D.listSubjects().catch(() => []).then(a => a.filter(x => pending.has(recKey('subject', x.id)))),
      D.listTopics().catch(() => []).then(a => a.filter(x => pending.has(recKey('topic', x.id))))]);
    ls.forEach(x => subs.set(x.id, { id: x.id, name: x.name, ord: x.display_order }));
    lt.forEach(x => tops.set(x.id, { id: x.id, name: x.name, subject_id: x.subject_id, parent_id: x.parent_id || null, ord: x.display_order }));
    const last = await store.get('bnCardTopic');
    const topics = [...tops.values()].filter(x => subs.has(x.subject_id)).map(x => {
      const names = [];
      for (let p = tops.get(x.parent_id), n = 0; p && n < 4; p = tops.get(p.parent_id), n++) names.unshift(p.name);
      return { id: x.id, subject: x.subject_id, name: x.name || '', path: [subs.get(x.subject_id).name || '', ...names].join(' › '),
        o: [+(subs.get(x.subject_id).ord) || 0, +x.ord || 0] };
    }).sort((a, b) => (b.id === last) - (a.id === last) || a.o[0] - b.o[0] || a.path.localeCompare(b.path, undefined, { numeric: true }) || a.o[1] - b.o[1])
      .map(({ o, ...x }) => x);
    return { ok: true, topics, last: last || null };
  }
  // The card's HTML as the Notes keeps it (rich.js clean): its formatting
  // tags and colours only — the page that sent it isn't trusted.
  const TAGS = new Set(['p', 'div', 'br', 'b', 'strong', 'i', 'em', 'u', 's', 'strike', 'ul', 'ol', 'li', 'sub', 'sup', 'span', 'mark', 'blockquote', 'code', 'img']);
  const COLOR = /^(color|background-color)\s*:\s*(#[0-9a-f]{3,8}|rgba?\(\s*[\d.]+\s*,\s*[\d.]+\s*,\s*[\d.]+\s*(,\s*[\d.]+\s*)?\))$/i;
  const safeHtml = h => String(h || '').slice(0, 20000)
    .replace(/<(script|style|iframe|object|embed|svg|math|template|textarea|title)\b[\s\S]*?<\/\1\s*>/gi, '')
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<(\/?)([a-z0-9]+)\b([^>]*)>/gi, (m, close, tag, attrs) => {
      tag = tag.toLowerCase();
      if (!TAGS.has(tag)) return '';
      if (close) return tag === 'img' ? '' : '</' + tag + '>';
      // A picture only as one of the account's own files.
      if (tag === 'img') { const m = /\bsrc\s*=\s*"(bnblob:[\w-]+)"/i.exec(attrs); return m ? '<img src="' + m[1] + '" alt="">' : ''; }
      const st = /\bstyle\s*=\s*"([^"]*)"/i.exec(attrs);
      const keep = st ? st[1].split(';').map(x => x.trim()).filter(x => COLOR.test(x)).join(';') : '';
      return '<' + tag + (keep ? ' style="' + keep + '"' : '') + '>';
    })
    .replace(/<(?![a-z/])/gi, '&lt;');
  const escHtml = t => String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').split('\n').join('<br>');
  // A picture of this device (a capture) into the account's files, for a
  // card or the topic's notes to point to (bnblob:<id>, as the Notes does).
  async function shareBlob(blob) {
    const id = await D.putBlob(blob);
    await upload(id);
    return id;
  }
  async function cardAdd({ topicId, subject, cards, image, imageSide }) {
    await load();
    if (!session) return { ok: false, error: 'no_account' };
    // A capture on the front (or, imageSide 'back', on the back) of cards[0]:
    // the picture first, the text under it.
    if (image) {
      const id = await shareBlob(image), side = imageSide === 'back' ? 'back' : 'front';
      cards = cards.map((c, i) => i ? c : { ...c, [side + '_html']: `<p><img src="bnblob:${id}" alt=""></p>` + (c[side] ? (c[side + '_html'] || escHtml(c[side])) : '') });
    }
    const now = Date.now(), dev = await deviceId();
    const changes = cards.map((c, i) => {
      const id = D.uid();
      return { kind: 'card', id, deleted: false, device: dev, base_rev: null, data: { id, topic: topicId, subject: subject || null,
        front: c.front, back: c.back, front_html: c.front_html ? safeHtml(c.front_html) : escHtml(c.front), back_html: c.back_html ? safeHtml(c.back_html) : escHtml(c.back),
        front_img: [], back_img: [], suspended: false,
        fsrs: { state: 0, stability: 0, difficulty: 0, scheduled_days: 0, reps: 0, lapses: 0, due: null, last_review: null },
        src: 'selecao', createdAt: now + i, updatedAt: now } };
    });
    const res = await authed('/rest/v1/rpc/notes_push', { method: 'POST', body: { changes } });
    const applied = new Set(((res && res.applied) || []).map(a => a.id));
    if (!changes.every(c => applied.has(c.id))) return { ok: false, error: 'no_notes' };
    await store.set('bnCardTopic', topicId);
    return { ok: true, n: changes.length };
  }

  // A capture at the end of a topic's notes (the 'content' record
  // "<topic>:notes", as notes/capture.js writes it): read as it is in the
  // account, the picture added, written back on top of that version — if it
  // changed meanwhile (the Notes open elsewhere), read again and retried.
  // Or a passage of text (the selection menu's "Enviar trecho", 05/11/2026):
  // `nodes`, its paragraphs as the notes editor keeps them (highlights.js
  // fcDoc: text with bold, italic, underline, strike, colour and marker),
  // checked here — the page isn't trusted; `html` the same, for a note
  // still kept as HTML.
  const PM_MARKS = new Set(['bold', 'italic', 'underline', 'strike', 'textStyle', 'highlight']);
  const PM_COLOR = /^(#[0-9a-f]{3,8}|rgba?\(\s*[\d.]+\s*,\s*[\d.]+\s*,\s*[\d.]+\s*(,\s*[\d.]+\s*)?\))$/i;
  function pmNodes(list) {
    let room = 20000;
    const mark = m => {
      if (!m || !PM_MARKS.has(m.type)) return null;
      if (m.type !== 'textStyle' && m.type !== 'highlight') return { type: m.type };
      const c = m.attrs && typeof m.attrs.color === 'string' ? m.attrs.color.trim() : '';
      return PM_COLOR.test(c) ? { type: m.type, attrs: { color: c } } : null;
    };
    const out = [];
    for (const p of (Array.isArray(list) ? list : []).slice(0, 400)) {
      if (!p || p.type !== 'paragraph') continue;
      const content = [];
      for (const n of (Array.isArray(p.content) ? p.content : []).slice(0, 400)) {
        if (!n || n.type !== 'text' || typeof n.text !== 'string' || !n.text || room <= 0) continue;
        const text = n.text.slice(0, room); room -= text.length;
        const marks = (Array.isArray(n.marks) ? n.marks : []).map(mark).filter(Boolean);
        content.push(marks.length ? { type: 'text', text, marks } : { type: 'text', text });
      }
      out.push(content.length ? { type: 'paragraph', content } : { type: 'paragraph' });
    }
    while (out.length && !out[out.length - 1].content) out.pop();
    return out.some(p => p.content) ? out : null;
  }
  async function notesAppend({ topicId, image, nodes, html }) {
    await load();
    if (!session) return { ok: false, error: 'no_account' };
    const paras = image ? null : pmNodes(nodes);
    if (!image && !paras) return { ok: false, error: 'fail' };
    const rich = paras ? safeHtml(html).replace(/<img\b[^>]*>/gi, '') || paras.map(p => '<p>' + escHtml((p.content || []).map(n => n.text).join('')) + '</p>').join('') : '';
    const id = image ? await shareBlob(image) : null, rid = topicId + ':notes', dev = await deviceId();
    for (let n = 0; n < 4; n++) {
      const rows = await authed(`/rest/v1/notes_records?select=rev,data,deleted&kind=eq.content&id=eq.${encodeURIComponent(rid)}`);
      const cur = rows && rows[0];
      const rec = cur && !cur.deleted && cur.data ? JSON.parse(JSON.stringify(cur.data)) : { id: rid, topic: topicId, kind: 'notes', data: null };
      const data = rec.data || { version: 4, content: { type: 'doc', content: [] } };
      let doc = data.content;
      if (typeof doc === 'string') { try { doc = JSON.parse(doc); } catch (e) { doc = null; } }
      const add = paras || [{ type: 'imageResize', attrs: { src: 'bnblob:' + id } }];
      const addHtml = paras ? rich : `<p><img src="bnblob:${id}"></p>`;
      if (doc && doc.type === 'doc') { doc.content = (doc.content || []).concat(add, { type: 'paragraph' }); data.content = doc; data.version = 4; }
      else if (typeof data.html === 'string') data.html += addHtml;
      else if (typeof data.content === 'string') data.content += addHtml;
      else { data.version = 4; data.content = { type: 'doc', content: [...add, { type: 'paragraph' }] }; }
      const out = { ...rec, id: rid, topic: topicId, kind: 'notes', data, updatedAt: Date.now() };
      const res = await authed('/rest/v1/rpc/notes_push', { method: 'POST', body: { changes: [{ kind: 'content', id: rid, deleted: false, data: out, device: dev, base_rev: cur ? cur.rev : null }] } });
      if ((res.applied || []).some(a => a.id === rid)) return { ok: true };
      if (!(res.conflicts || []).length) return { ok: false, error: 'no_notes' };
    }
    return { ok: false, error: 'busy' };
  }

  g.HlSync = { WEB, cardTopics, cardAdd, notesAppend, safeHtml, BUY: WEB + '#/nuvem', load, connect, checkPair, disconnect, linkState, handoff, adopt, sync, soon, maybePull, fresh, status, signIn, signUp, verifySignup, resendSignup, recover, resetPassword, deleteAccount, onChange: f => { listeners.add(f); return () => listeners.delete(f); } };
})(self);
