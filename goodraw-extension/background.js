// The highlights' data layer (notes/db.js) and their cloud (hl-sync.js): the
// extension has no Notes screens since 21/10/2026 — Minhas marcações and the
// account live on the site, /notes/app. Firefox runs this file as an event
// page, where the build lists these files in "scripts" ahead of it instead.
if (typeof importScripts === 'function') {
  try { importScripts('notes/db.js', 'notes/cloud-config.js', 'hl-sync.js', 'supabase-client.js'); } catch (e) {}
}

// ─── LANGUAGE ───────────────────────────────────────────────────────────────
// content.js builds the bar the moment it runs, before chrome.storage could
// answer it, so the language choice is read here and handed over first as
// window.__pdLang. 'auto' follows the browser. Someone who was already using
// the extension before English existed, and never picked a language, stays
// in Portuguese: they must not wake up to a different bar.
const LANG_PREFS = ['auto', 'pt', 'en', 'es', 'fr'];
async function langPref() {
  const res = await chrome.storage.local.get(['pdLang', 'pdTbPos', 'pdColor', 'pdNoticeHide']);
  if (LANG_PREFS.includes(res.pdLang)) return res.pdLang;
  return (res.pdTbPos || res.pdColor || res.pdNoticeHide) ? 'pt' : 'auto';
}

/** Puts the bar on a tab: the language first, then content.js. The marks
 *  of Minhas marcações come along (highlights.js guards against a second copy). */
async function injectBar(tabId) {
  const lang = await langPref();
  await chrome.scripting.executeScript({ target: { tabId }, func: l => { window.__pdLang = l; }, args: [lang] });
  await chrome.scripting.executeScript({ target: { tabId }, files: ['supabase-client.js'] }).catch(() => {});
  await chrome.scripting.executeScript({ target: { tabId }, files: ['content.js'] });
  chrome.scripting.executeScript({ target: { tabId }, files: ['highlights.js'] }).catch(() => {});
}

const RESTRICTED = /^(chrome|edge|chrome-extension|moz-extension|about|view-source):/;
/** The bar on a tab, kept if it's already there (the home's Draw). */
async function openBar(tab) {
  if (!tab || (tab.url && RESTRICTED.test(tab.url))) return;
  try {
    const res = await chrome.scripting.executeScript({ target: { tabId: tab.id }, func: () => { delete window.__pdUserClosed; return document.getElementById('__pd_root__') ? 'open' : 'fresh'; } });
    if (res?.[0]?.result === 'fresh') await injectBar(tab.id);
  } catch (e) { console.error('PageDraw:', e); }
}

// ─── THE HOME SCREEN (home.html) ────────────────────────────────────────────
// The icon opens the home screen full screen over the page (a frame of
// home.html; again, or Esc, takes it down); on the browser's own pages and
// the stores, where nothing can be put on the page, in a tab of its own.
const HOME = 'home.html';
const START = chrome.runtime.getURL('start.html');
const STORES = /^https:\/\/(chromewebstore\.google\.com|chrome\.google\.com\/webstore|addons\.mozilla\.org)\//;
async function showHome(tab) {
  const hash = tab && tab.id != null ? '#tab=' + tab.id + (tab.url ? '&u=' + encodeURIComponent(tab.url) : '') : '';
  const url = chrome.runtime.getURL(HOME) + hash;
  if (!tab || !tab.url || RESTRICTED.test(tab.url) || STORES.test(tab.url)) { chrome.tabs.create({ url }); return; }
  try {
    await chrome.scripting.executeScript({
      target: { tabId: tab.id }, args: [hash],
      // The address is made inside the page (the content-script world): with
      // use_dynamic_url (manifest.json) only the per-session id the page gets
      // from getURL may be framed there — the worker's static one is refused.
      func: hash => {
        const url = chrome.runtime.getURL('home.html') + hash;
        const old = document.getElementById('__bn_home__');
        if (old && old.__bnClose) { old.__bnClose(); return; }
        const host = document.createElement('div');
        host.id = '__bn_home__';
        host.style.cssText = 'all:initial;position:fixed;inset:0;z-index:2147483647;';
        const shadow = host.attachShadow({ mode: 'closed' });
        const f = document.createElement('iframe');
        f.src = url;
        f.setAttribute('allow', 'clipboard-write');
        f.style.cssText = 'position:fixed;inset:0;width:100vw;height:100vh;border:0;margin:0;opacity:0;transition:opacity .25s ease;background:transparent;';
        shadow.appendChild(f);
        const root = document.documentElement, overflow = root.style.overflow;
        const onMsg = e => { if (e.source === f.contentWindow && e.data && e.data.bnHome === 'close') close(); };
        const onKey = e => { if (e.key === 'Escape') { e.stopPropagation(); close(); } };
        function close() {
          removeEventListener('message', onMsg); removeEventListener('keydown', onKey, true);
          root.style.overflow = overflow;
          f.style.opacity = '0';
          setTimeout(() => host.remove(), 200);
        }
        host.__bnClose = close;
        addEventListener('message', onMsg); addEventListener('keydown', onKey, true);
        f.addEventListener('load', () => { f.style.opacity = '1'; f.focus(); });
        root.style.overflow = 'hidden';
        root.appendChild(host);
      }
    });
  } catch (e) { chrome.tabs.create({ url }); }
}
// After installing: the welcome (start.html), which opens the welcome video
// in a tab of its own.
chrome.runtime.onInstalled.addListener(async ({ reason }) => {
  if (reason === 'install') chrome.tabs.create({ url: START + '#welcome' });
  // After an update, the copies of highlights.js in the open tabs lost their
  // runtime: a fresh copy takes each page over (its guard retires the old one).
  if (reason === 'update') {
    try {
      if (await chrome.permissions.contains({ origins: WEB_SITES })) (await chrome.tabs.query({ url: ['http://*/*', 'https://*/*'] })).forEach(t => chrome.scripting.executeScript({ target: { tabId: t.id }, files: ['highlights.js'] }).catch(() => {}));
    } catch (e) {}
  }
});

// GooHighlights from the home (or the icon): its modal and the
// permission on start.html while either is due, otherwise Minhas marcações.
async function openHighlights() {
  const [p, has] = await Promise.all([chrome.storage.local.get('bnHlPromoOff'), chrome.permissions.contains({ origins: ALL_SITES }).catch(() => false)]);
  if (p.bnHlPromoOff && has) openNotes(null, '#/m');
  else chrome.tabs.create({ url: START + '#hl' });
}
// GooDraw from the home or the icon: the bar on the page right away.
// Its paged modal (highlights-promo.js, kind 'draw') opened the first time
// until 30/10/2026; it came off to shorten the way to the first stroke.
async function openDraw(tabId) {
  let tab;
  try { tab = await chrome.tabs.get(tabId); } catch (e) { return; }
  // No address readable (no access to the site yet): the injection tells.
  if (tab.url && RESTRICTED.test(tab.url)) return;
  openBar(tab);
}

// What the icon opens (29/10/2026, after installs fell with the home screen
// as the only way in): bnIconOpens — 'draw' (the default, also when the
// welcome's question is skipped) or 'home'. Chosen on the welcome, in the
// home's settings and in the Draw's. The Draw: the bar on the page, or off if
// it's there; on the browser's own pages and the stores, and while the
// account is being connected (the home shows the code), the home screen.
const ICON_KEY = 'bnIconOpens';
async function toggleBar(tab) {
  try {
    const res = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      // Opening by hand lifts a "closed by the user" mark left on this page.
      func: () => { delete window.__pdUserClosed; return typeof window.__pdToggle === 'function' && document.getElementById('__pd_root__') ? (window.__pdToggle(), 'toggled') : 'fresh'; }
    });
    if (res?.[0]?.result === 'fresh') await openDraw(tab.id);
  } catch (e) { showHome(tab); }
}
chrome.action.onClicked.addListener(async tab => {
  const p = await chrome.storage.local.get([ICON_KEY, 'bnHlPair']);
  const pairing = p.bnHlPair && p.bnHlPair.secret && Date.now() - p.bnHlPair.at < 15 * 60e3;
  if (p[ICON_KEY] !== 'home' && !pairing && tab.url && !RESTRICTED.test(tab.url) && !STORES.test(tab.url)) toggleBar(tab);
  else showHome(tab);
});
chrome.runtime.onInstalled.addListener(() => { chrome.storage.local.remove('bnMainTool'); });

// ─── THE DRAW OPENING BY ITSELF ON CHOSEN SITES (back on 27/10/2026) ────────
// "Abrir sozinha neste site", in the Draw's settings: on those sites the bar
// opens as the page loads (TEC every day, without a click). The icon and the
// bar's "Tela inicial" still open the home screen — it stays the main screen.
// Access to the site is an optional host permission asked at that moment
// (auto.html: the browser only shows that prompt from a click on an
// extension page); the Highlights' access to every site covers it already.
const AUTO_KEY = 'pdAutoSites';
const patternFor = host => `*://*.${host}/*`;
const hostMatches = (hostname, host) => hostname === host || hostname.endsWith('.' + host);
async function getAutoSites() {
  const res = await chrome.storage.local.get(AUTO_KEY);
  return Array.isArray(res[AUTO_KEY]) ? res[AUTO_KEY] : [];
}
async function autoOpen(tabId) {
  try {
    const res = await chrome.scripting.executeScript({
      target: { tabId },
      func: () => {
        if (document.getElementById('__pd_root__')) return 'open';
        // Closed by hand on this page: stays closed until a reload.
        if (window.__pdUserClosed) return 'closed';
        // A load and a URL change can both land here within a moment — a
        // second injection while the first is building would toggle it off.
        if (Date.now() - (window.__pdAutoAt || 0) < 3000) return 'busy';
        window.__pdAutoAt = Date.now();
        return 'go';
      }
    });
    if (res?.[0]?.result === 'go') await injectBar(tabId);
  } catch (e) { /* the access was taken away, or the page can't be scripted */ }
}
// A full load reports 'complete'; a single-page app moving to another route
// only its new url. tab.url is visible only on sites we have access to.
chrome.tabs.onUpdated.addListener(async (tabId, info, tab) => {
  if (info.status !== 'complete' && !info.url) return;
  if (!tab.url || !/^https?:/.test(tab.url)) return;
  let hostname;
  try { hostname = new URL(tab.url).hostname; } catch (e) { return; }
  const sites = await getAutoSites();
  if (sites.some(h => hostMatches(hostname, h))) autoOpen(tabId);
});
// Access taken away in the browser's settings: the site leaves the list too
// (unless the access to every site still covers it).
chrome.permissions.onRemoved.addListener(async () => {
  syncHighlightScript();
  const sites = await getAutoSites();
  const left = [];
  for (const h of sites) { try { if (await chrome.permissions.contains({ origins: [patternFor(h)] })) left.push(h); } catch (e) {} }
  if (left.length !== sites.length) await chrome.storage.local.set({ [AUTO_KEY]: left });
});
async function setAutoSite(host, on) {
  const sites = await getAutoSites();
  if (!on) { await chrome.storage.local.set({ [AUTO_KEY]: sites.filter(h => h !== host) }); return; }
  // Already allowed (the Highlights on every site, or asked before): no question.
  if (await chrome.permissions.contains({ origins: [patternFor(host)] })) {
    if (!sites.includes(host)) await chrome.storage.local.set({ [AUTO_KEY]: [...sites, host] });
    return;
  }
  let lang = await langPref();
  if (lang === 'auto') { const ui = (chrome.i18n.getUILanguage() || '').slice(0, 2).toLowerCase(); lang = ['pt', 'es', 'fr'].includes(ui) ? ui : 'en'; }
  chrome.windows.create({ url: chrome.runtime.getURL('auto.html?host=' + encodeURIComponent(host) + '&lang=' + lang), type: 'popup', width: 440, height: 340 });
}

// ─── GOODRAW NOTES ────────────────────────────────────────────────────────
// The notebooks live in notes.html, a page of the extension opened in a tab.
// The bar reaches it through here: open it, list the notebooks, file a
// capture into one.
// The Notes is the site now (hl-sync.js → WEB): it updates without a store review.
const NOTES_URL = 'https://daniellucas2025.github.io/goodraw/dashboard.html';

// A message to the extension's own pages (an open Notes tab). Settles with
// undefined when no page answers, instead of throwing.
const toNotesPages = msg => new Promise(resolve => {
  try { chrome.runtime.sendMessage(msg, r => { void chrome.runtime.lastError; resolve(r); }); }
  catch (e) { resolve(undefined); }
});

// A Notes tab already open answers and is brought forward; only without one
// is a new tab opened. No "tabs" permission needed either way.
async function openNotes(notebookId, at) {
  const hash = notebookId ? '#/n/' + notebookId : (at || '');
  if (await focusNotes(hash || '#/')) return;
  chrome.tabs.create({ url: NOTES_URL + (hash || '#/') });
}
// A tab of the site's app already open (Minhas marcações): brought forward,
// at that screen, instead of a new one. Only a tab whose address is readable
// (access to every site) can be told apart: without it, a new tab.
async function focusNotes(hash) {
  let tabs = [];
  try { tabs = await chrome.tabs.query({ url: NOTES_URL + '*' }); } catch (e) {}
  const t = tabs.find(x => x.url && x.url.startsWith(NOTES_URL));
  if (!t) return false;
  const url = NOTES_URL + hash;
  await chrome.tabs.update(t.id, t.url === url ? { active: true } : { active: true, url });
  try { await chrome.windows.update(t.windowId, { focused: true }); } catch (e) {}
  return true;
}
// The extension's own page for what a browser only allows from one: turning
// the colour menu on for every site, and (Firefox) the consent to send data.
const HL_PAGE = chrome.runtime.getURL('hl.html');
const isFirefox = typeof browser !== 'undefined' && /Firefox\//.test(navigator.userAgent);


// ─── MINHAS MARCAÇÕES ───────────────────────────────────────────────────────
// highlights.js marks text on web pages; the marks live in the Notes'
// database like everything else (db.js: webpages, marks). Access to every
// site is optional: granted from Minhas marcações (a click on the Notes page,
// where the browser allows the prompt), it makes highlights.js run on every
// page by itself. Without it, it only comes with the bar (injectBar).
const HL_SCRIPT = 'bn-highlights';
// What is asked for: every address — the screen capture (the caderno de
// erros' crop) needs '<all_urls>' (or a click on the icon, activeTab); every
// http(s) site isn't enough (24/10/2026, tested). What runs the Highlights on
// every page: http(s) — an older grant of only that keeps it running.
const ALL_SITES = ['<all_urls>'];
const WEB_SITES = ['*://*/*'];
async function syncHighlightScript() {
  try {
    const has = await chrome.permissions.contains({ origins: WEB_SITES });
    const reg = await chrome.scripting.getRegisteredContentScripts({ ids: [HL_SCRIPT] });
    if (has && !reg.length) {
      await chrome.scripting.registerContentScripts([{
        id: HL_SCRIPT, matches: ['http://*/*', 'https://*/*'], js: ['highlights.js'],
        runAt: 'document_idle', persistAcrossSessions: true
      }]);
      // The tabs already open get it now, without a reload.
      const tabs = await chrome.tabs.query({ url: ['http://*/*', 'https://*/*'] });
      tabs.forEach(t => chrome.scripting.executeScript({ target: { tabId: t.id }, files: ['highlights.js'] }).catch(() => {}));
    } else if (!has && reg.length) {
      await chrome.scripting.unregisterContentScripts({ ids: [HL_SCRIPT] });
    }
  } catch (e) { console.error('Marcações:', e); }
}
chrome.permissions.onAdded.addListener(syncHighlightScript);
chrome.runtime.onInstalled.addListener(syncHighlightScript);
chrome.runtime.onStartup.addListener(syncHighlightScript);

// 'hide' takes the passage out of the reading; 'none' is a mark with no
// highlighter, only its format (bold, underline, size, text colour, quote).
const HL_COLORS = ['yellow', 'green', 'blue', 'pink', 'orange', 'purple', 'hide', 'none'];
const HL_TEXT = ['red', 'blue', 'green', 'purple', 'orange'];
// The format of a mark: only these fields, in range; nothing set → none.
function cleanFmt(f) {
  if (!f || typeof f !== 'object') return null;
  const o = {};
  if (f.b === true) o.b = true;
  if (f.u === true) o.u = true;
  if (f.q === true) o.q = true;
  const z = Math.round(+f.size || 0);
  if (z) o.size = Math.max(-2, Math.min(3, z));
  if (HL_TEXT.includes(f.tc)) o.tc = f.tc;
  return Object.keys(o).length ? o : null;
}
const str = (v, max) => typeof v === 'string' ? v.slice(0, max) : '';
// A note with formatting and images: its HTML (images as bnblob:<id>, files
// of the Notes' own) beside the plain note, which stays what older apps,
// search and Markdown read. Cleaned again wherever it is shown.
function cleanRich(r, note) {
  if (!r || typeof r.html !== 'string' || !r.html.trim() || r.html.length > 400000) return null;
  return { html: r.html, text: note };
}
// Only what a mark is made of, whatever the page sent.
function cleanMark(m) {
  const a = m && m.anchor;
  const note = str(m.note, 20000);
  return {
    // Optional: a name of its own, to find it more easily (31/10/2026).
    name: str(m.name, 120).trim(),
    text: str(m.text, 20000), color: HL_COLORS.includes(m.color) ? m.color : 'yellow', note, noteRich: cleanRich(m.noteRich, note), fmt: cleanFmt(m.fmt),
    // Its own discipline / topic; none: the page's (hlPage's topic).
    topic: typeof m.topic === 'string' && /^[\w-]{4,64}$/.test(m.topic) ? m.topic : null,
    links: cleanLinks(m.links, m.id),
    anchor: a ? { exact: str(a.exact, 20000), prefix: str(a.prefix, 64), suffix: str(a.suffix, 64), pos: Math.max(0, +a.pos || 0) } : null
  };
}
// The marks a mark is linked to (29/10/2026): their ids, never its own.
function cleanLinks(v, self) {
  if (!Array.isArray(v)) return [];
  return [...new Set(v.filter(x => typeof x === 'string' && /^[\w-]{6,40}$/.test(x) && x !== self))].slice(0, 50);
}
function cleanInfo(i) { return i ? { title: str(i.title, 300), description: str(i.description, 600) } : null; }

async function hlLoad(url) {
  const page = await NotesDB.webpageByUrl(url);
  const marks = page ? await NotesDB.pageMarks(page.id) : [];
  return { page, marks, inks: page ? await NotesDB.pageInks(page.id) : [], linkN: marks.length ? await hlLinkCounts(marks) : {} };
}
// How many marks each of these is linked to, either side (the panel's cards).
async function hlLinkCounts(marks) {
  const all = await NotesDB.listMarks(), ids = new Set(all.map(m => m.id)), n = {};
  const mine = new Set(marks.map(m => m.id));
  const pair = new Set();
  all.forEach(m => (Array.isArray(m.links) ? m.links : []).forEach(x => {
    if (!ids.has(x)) return;
    [[m.id, x], [x, m.id]].forEach(([a, b]) => { if (mine.has(a) && !pair.has(a + ' ' + b)) { pair.add(a + ' ' + b); n[a] = (n[a] || 0) + 1; } });
  }));
  return n;
}
// The Highlights' hand annotations: one stroke per record, only what one is
// made of (highlights.js → inkStore), whatever the page sent.
const INK_TOOLS = ['pencil', 'highlight', 'line', 'rect', 'circle'];
const num = v => (typeof v === 'number' && isFinite(v) ? Math.round(v * 10) / 10 : 0);
function cleanInk(k) {
  const a = k && k.anchor;
  return {
    id: typeof k.id === 'string' && /^[\w-]{6,40}$/.test(k.id) ? k.id : undefined,
    tool: INK_TOOLS.includes(k.tool) ? k.tool : 'pencil',
    color: typeof k.color === 'string' && /^#[0-9a-f]{3,8}$/i.test(k.color) ? k.color : '#e53935',
    size: Math.max(1, Math.min(40, num(k.size) || 3)),
    pts: Array.isArray(k.pts) ? k.pts.slice(0, 20000).map(num) : [],
    ax: num(k.ax), ay: num(k.ay), dw: num(k.dw),
    anchor: a ? { exact: str(a.exact, 400), prefix: str(a.prefix, 64), suffix: str(a.suffix, 64), pos: Math.max(0, +a.pos || 0) } : null,
    // The pencil's "Natural" mode: drawn point by point, not smoothed.
    ...(k.raw === true ? { raw: true } : {})
  };
}
async function hlInkSave({ url, info, ink }) {
  const page = await NotesDB.ensureWebpage(url, cleanInfo(info));
  const it = cleanInk(ink);
  if (!it.id) delete it.id;
  const saved = await NotesDB.putInk({ ...it, id: it.id || (Date.now().toString(36) + Math.random().toString(36).slice(2, 10)), page: page.id });
  return { ok: true, ink: saved, page: await NotesDB.getWebpage(page.id) };
}
async function hlSave({ url, info, mark }) {
  const page = await NotesDB.ensureWebpage(url, cleanInfo(info));
  const id = typeof mark.id === 'string' && /^[\w-]{6,40}$/.test(mark.id) ? mark.id : undefined;
  const m = await NotesDB.putMark({ ...cleanMark(mark), id, page: page.id });
  toNotesPages({ action: 'notesChanged' });
  return { ok: true, page: await NotesDB.getWebpage(page.id), mark: m };
}
async function hlUpdate(id, patch) {
  const p = {};
  if (patch && HL_COLORS.includes(patch.color)) p.color = patch.color;
  if (patch && typeof patch.name === 'string') p.name = patch.name.trim().slice(0, 120);
  if (patch && typeof patch.note === 'string') { p.note = patch.note.slice(0, 20000); p.noteRich = cleanRich(patch.noteRich, p.note); }
  if (patch && 'fmt' in patch) p.fmt = cleanFmt(patch.fmt);
  if (patch && 'topic' in patch) p.topic = typeof patch.topic === 'string' && /^[\w-]{4,64}$/.test(patch.topic) ? patch.topic : null;
  await NotesDB.putMark({ id, ...p });
  toNotesPages({ action: 'notesChanged' });
  return { ok: true };
}
// Linked marks (29/10/2026). A link is kept on one side (mark.links); the
// other shows it too, found here. A mark as the page's menu shows it.
const hlBrief = (m, w) => ({ id: m.id, name: str(m.name, 120), text: str(m.text, 300), color: m.color, page: m.page, title: w ? w.title || '' : '', url: w ? w.url : '' });
async function hlLinks(id) {
  const [all, pages] = await Promise.all([NotesDB.listMarks(), NotesDB.listWebpages()]);
  const byId = new Map(all.map(m => [m.id, m])), pg = new Map(pages.map(w => [w.id, w]));
  const m = byId.get(id);
  if (!m) return { ok: false };
  // With its note: it opens right there, to read and edit (chamado #25).
  const withNote = x => ({ ...hlBrief(x, pg.get(x.page)), note: str(x.note, 20000), noteRich: x.noteRich || null });
  const out = (Array.isArray(m.links) ? m.links : []).map(x => byId.has(x) ? withNote(byId.get(x)) : { id: x, gone: true });
  const back = all.filter(x => x.id !== id && Array.isArray(x.links) && x.links.includes(id) && !(m.links || []).includes(x.id))
    .map(x => ({ ...withNote(x), back: true }));
  return { ok: true, links: out.concat(back) };
}
// Linking two marks (on: kept on the first), or taking the link away (from both sides).
async function hlLink(id, other, on) {
  if (id === other) return { ok: false };
  const [a, b] = await Promise.all([NotesDB.getMark(id), NotesDB.getMark(other)]);
  if (on) {
    if (!a || !b) return { ok: false };
    if (!(b.links || []).includes(id)) await NotesDB.putMark({ id, links: cleanLinks([...(a.links || []), other], id) });
  } else {
    if (a && (a.links || []).includes(other)) await NotesDB.putMark({ id, links: a.links.filter(x => x !== other) });
    if (b && (b.links || []).includes(id)) await NotesDB.putMark({ id: other, links: b.links.filter(x => x !== id) });
  }
  toNotesPages({ action: 'notesChanged' });
  return { ok: true };
}
// The marks to link to: the passage, the note or the page's title has what is typed.
async function hlMarkSearch(q, not) {
  const [all, pages] = await Promise.all([NotesDB.listMarks(), NotesDB.listWebpages()]);
  const pg = new Map(pages.map(w => [w.id, w]));
  const norm = s => String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  const words = norm(q).split(/\s+/).filter(Boolean);
  const skip = new Set(Array.isArray(not) ? not : []);
  const marks = all.filter(m => m.color !== 'hide' && !skip.has(m.id))
    .filter(m => { const w = pg.get(m.page), h = norm((m.name || '') + ' ' + m.text + ' ' + (m.note || '') + ' ' + (w ? w.title + ' ' + w.url : '')); return words.every(x => h.includes(x)); })
    .sort((a, b) => (b.updatedAt || b.createdAt || 0) - (a.updatedAt || a.createdAt || 0))
    .slice(0, 40).map(m => hlBrief(m, pg.get(m.page)));
  return { ok: true, marks };
}
// A linked mark on another page: that page in a new tab, at the passage (the
// browser's text fragment), and its own highlights.js scrolls to it and opens
// it when the page loads (hl.load's focus).
// (In storage.session: the worker may restart between the click and the page's load.)
const FOCUS_KEY = 'hlFocus';
const focusMap = () => new Promise(r => { try { chrome.storage.session.get(FOCUS_KEY, o => { void chrome.runtime.lastError; r((o && o[FOCUS_KEY]) || {}); }); } catch (e) { r({}); } });
const focusSave = m => new Promise(r => { try { chrome.storage.session.set({ [FOCUS_KEY]: m }, () => { void chrome.runtime.lastError; r(); }); } catch (e) { r(); } });
async function hlGoto(id) {
  const m = await NotesDB.getMark(id);
  const w = m && await NotesDB.getWebpage(m.page);
  if (!w || !/^https?:/.test(w.url)) return { ok: false };
  const words = String(m.text || '').split(/\s+/).filter(Boolean);
  const enc = x => encodeURIComponent(x).replace(/-/g, '%2D');
  const frag = !words.length ? '' : '#:~:text=' + (words.length <= 8 ? enc(words.join(' ')) : enc(words.slice(0, 4).join(' ')) + ',' + enc(words.slice(-4).join(' ')));
  const tab = await chrome.tabs.create({ url: w.url.split('#')[0] + frag });
  if (tab && tab.id != null) { const m = await focusMap(); m[tab.id] = { id, at: Date.now() }; await focusSave(m); }
  return { ok: true };
}
async function hlFocusTake(tabId) {
  const m = await focusMap(), f = m[tabId];
  if (!f) return null;
  delete m[tabId]; await focusSave(m);
  return Date.now() - f.at < 120000 ? f.id : null;
}
// An account to save (26/10/2026): the free account is what the Highlights,
// the Flashcards and the Planner keep things in (and sync, and work offline
// with). Without one, a first taste: the marks and drawings of the first page
// are kept (here, until an account takes them up), and the first capture of
// the caderno de erros; anything after that asks for the account. What was
// saved before this rule stays. err: a capture.
async function gated(url, save, err) {
  const st = await HlSync.status();
  if (st.user) return save();
  const [ms, ks, es] = await Promise.all([NotesDB.listMarks(), NotesDB.listInks(), NotesDB.listErrShots()]);
  let ok;
  if (err) ok = !ms.length && !ks.length && !es.length;
  else {
    const page = url ? await NotesDB.webpageByUrl(url) : null;
    ok = !es.length && ms.concat(ks).every(x => page && x.page === page.id);
  }
  if (!ok) return { ok: false, error: 'account' };
  const r = await save();
  return r && r.ok ? { ...r, trial: true } : r;
}
// The registry as the caderno de erros' card shows it: only what it needs.
async function hlRegistry() {
  await HlSync.fresh().catch(() => {});
  await NotesDB.adoptErrFolders().catch(e => console.error('Caderno de erros:', e));
  const [subs, tops, st] = await Promise.all([NotesDB.listSubjects(), NotesDB.listTopics(), HlSync.status()]);
  const pick = (x, o) => ({ id: x.id, name: x.name || '', order: x.display_order || 0, out: x.in_scope === false, ...o });
  return { ok: true, user: !!st.user,
    subjects: subs.map(x => pick(x, {})),
    topics: tops.map(x => pick(x, { subject: x.subject_id, parent: x.parent_id || null })) };
}
// A new discipline (no parent), a topic in a discipline, a subtopic in a topic.
async function hlRegistryAdd(name, parent) {
  if (!parent) { const x = await NotesDB.createSubject(name); return { id: x.id, name: x.name, kind: 'subject' }; }
  const sub = (await NotesDB.listSubjects()).find(x => x.id === parent);
  const top = sub ? null : await NotesDB.getTopic(parent);
  if (!sub && !top) throw new Error('bad_parent');
  const x = await NotesDB.createTopic({ subject_id: sub ? sub.id : top.subject_id, parent_id: sub ? null : top.id, name });
  return { id: x.id, name: x.name, kind: 'topic', subject: x.subject_id, parent: x.parent_id || null };
}
async function hlBlobPut(dataUrl) {
  const m = /^data:(image\/(?:png|jpeg|gif|webp));base64,([A-Za-z0-9+/=]+)$/.exec(typeof dataUrl === 'string' ? dataUrl : '');
  if (!m || m[2].length > 7 * 1024 * 1024) return { ok: false };
  const bin = atob(m[2]), u8 = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
  return { ok: true, id: await NotesDB.putBlob(new Blob([u8], { type: m[1] })) };
}
async function hlBlob(id) {
  if (typeof id !== 'string' || !/^[\w-]{4,64}$/.test(id)) return { ok: false };
  const b = await NotesDB.getBlob(id);
  if (!b || !/^image\//.test(b.type)) return { ok: false };
  const u8 = new Uint8Array(await b.arrayBuffer());
  let bin = '';
  for (let i = 0; i < u8.length; i += 0x8000) bin += String.fromCharCode.apply(null, u8.subarray(i, i + 0x8000));
  return { ok: true, dataUrl: 'data:' + b.type + ';base64,' + btoa(bin) };
}
// Tags: one tag however it is typed — "Lei Seca", "lei seca" and "léi seca"
// are the same (tagKey); the first spelling kept is the one used from then on.
const tagKey = s => String(s).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();
async function hlTags() {
  const by = new Map();
  (await NotesDB.listWebpages()).forEach(w => (w.tags || []).forEach(x => { const k = tagKey(x); if (k && !by.has(k)) by.set(k, x); }));
  return [...by.values()].sort((a, b) => a.localeCompare(b));
}
async function hlPage({ url, info, patch }) {
  const page = await NotesDB.ensureWebpage(url, cleanInfo(info));
  const p = {};
  if (patch && 'topic' in patch) p.topic = typeof patch.topic === 'string' ? patch.topic : null;
  if (patch && Array.isArray(patch.tags)) {
    const known = new Map((await hlTags()).map(x => [tagKey(x), x])), seen = new Set();
    p.tags = patch.tags.filter(x => typeof x === 'string').map(x => x.trim().slice(0, 40)).filter(Boolean)
      .map(x => known.get(tagKey(x)) || x).filter(x => !seen.has(tagKey(x)) && seen.add(tagKey(x))).slice(0, 30);
  }
  await NotesDB.updateWebpage(page.id, p);
  toNotesPages({ action: 'notesChanged' });
  return { ok: true, page: await NotesDB.getWebpage(page.id) };
}


chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  // The home screen (home.js) and its tab (start.js).
  if (request.action === 'home.draw' && Number.isInteger(request.tabId)) { openDraw(request.tabId).then(() => sendResponse({ ok: true })); return true; }
  if (request.action === 'home.highlights') { openHighlights().then(() => sendResponse({ ok: true })); return true; }
  // The home's links (footer, Android app, the Notes' page): only these addresses.
  if (request.action === 'home.url' && typeof request.url === 'string'
    && /^https:\/\/(www\.agoodrawdraw\.com\.br\/((es|fr)\/)?notes\/$|www\.youtube\.com\/@agoodrawdraw|www\.instagram\.com\/agoodrawdraw\/|t\.me\/|play\.google\.com\/store\/apps\/details\?id=com\.agoodraw\.draw|chromewebstore\.google\.com\/detail\/|addons\.mozilla\.org\/)/.test(request.url)) {
    chrome.tabs.create({ url: request.url });
    return;
  }
  // The tools' Home button (the Draw's bar, the Highlights' dock).
  if (request.action === 'home.open' && sender.tab) { showHome(sender.tab); return; }
  // start.html's end: Minhas marcações — in the site's tab already open (this one closes), or here.
  if (request.action === 'home.marks' && sender.tab) {
    focusNotes('#/m').then(found => found ? chrome.tabs.remove(sender.tab.id) : chrome.tabs.update(sender.tab.id, { url: NOTES_URL + '#/m' }));
    return;
  }
  // Chamados (the home's and the Highlights panel's "Relatar um problema…"):
  // the Notes' form, with the tool, the page and this extension's version.
  if (request.action === 'ticket.open') {
    const q = new URLSearchParams({ from: 'ext', ext: chrome.runtime.getManifest().version + (isFirefox ? ' · Firefox' : '') });
    if (['draw', 'highlights'].includes(request.tool)) { q.set('tool', request.tool); q.set('area', request.tool); }
    if (typeof request.url === 'string' && /^https?:\/\//.test(request.url) && !request.url.startsWith(NOTES_URL)) q.set('url', request.url.slice(0, 1000));
    openNotes(null, '#/chamados/novo?' + q.toString());
    return;
  }
  // The Notes' timer on the other tabs (highlights.js): the Notes' page sends
  // it (timer.sync); the other pages read bnTimer and send back their pause /
  // resume / "don't show it" (timer.cmd) to the Notes' tabs.
  if (request.action === 'timer.sync') {
    const st = request.state && typeof request.state === 'object' ? request.state : null;
    chrome.storage.local.set({ bnTimer: { state: st, float: request.float !== false, mode: ['down', 'pomo'].includes(request.mode) ? request.mode : 'up', focus: Math.max(5, Math.min(120, Number(request.focus) || 25)), at: Date.now() } });
    return;
  }
  if (request.action === 'timer.cmd' && ['pause', 'resume', 'floatOff'].includes(request.cmd)) {
    (async () => {
      if (request.cmd === 'floatOff') {
        const { bnTimer } = await chrome.storage.local.get('bnTimer');
        await chrome.storage.local.set({ bnTimer: { ...(bnTimer || {}), float: false } });
      }
      let tabs = [];
      try { tabs = await chrome.tabs.query({ url: NOTES_URL + '*' }); } catch (e) {}
      let told = 0;
      for (const t of tabs) { try { await chrome.tabs.sendMessage(t.id, { action: 'timer.cmd', cmd: request.cmd }); told++; } catch (e) {} }
      sendResponse({ ok: told > 0 });
    })();
    return true;
  }
  if (request.action === 'openNotes') {
    if (typeof request.hash === 'string' && /^#\/[\w/-]*$/.test(request.hash)) { openNotes(null, request.hash); return; }
    openNotes(typeof request.notebookId === 'string' ? request.notebookId : null);
    return;
  }
  // Minhas marcações (highlights.js on a page, marks.js in the Notes).
  if (typeof request.action === 'string' && request.action.startsWith('hl.')) {
    const fail = e => { console.error('Marcações:', e); sendResponse({ ok: false }); };
    const id = typeof request.id === 'string' ? request.id : '';
    const url = typeof request.url === 'string' && /^https?:/.test(request.url) ? request.url : '';
    switch (request.action) {
      case 'hl.load': if (!url) return; HlSync.maybePull(); hlLoad(url).then(async r => ({ ...r, focus: sender.tab ? await hlFocusTake(sender.tab.id) : null })).then(sendResponse, fail); return true;
      case 'hl.links': if (!id) return; hlLinks(id).then(sendResponse, fail); return true;
      case 'hl.markSearch': hlMarkSearch(typeof request.q === 'string' ? request.q.slice(0, 200) : '', request.not).then(sendResponse, fail); return true;
      case 'hl.link': if (!id || typeof request.other !== 'string') return; hlLink(id, request.other, !!request.on).then(r => { HlSync.soon(); sendResponse(r); }, fail); return true;
      case 'hl.goto': if (!id) return; hlGoto(id).then(sendResponse, fail); return true;
      case 'hl.save': if (!url || !request.mark) return; gated(url, () => hlSave(request)).then(r => { HlSync.soon(); sendResponse(r); }, fail); return true;
      case 'hl.update': if (!id) return; hlUpdate(id, request.patch).then(r => { HlSync.soon(); sendResponse(r); }, fail); return true;
      case 'hl.delete': if (!id) return; NotesDB.deleteMark(id).then(() => { HlSync.soon(); sendResponse({ ok: true }); }, fail); return true;
      case 'hl.inkSave': if (!url || !request.ink) return; gated(url, () => hlInkSave(request)).then(r => { HlSync.soon(); sendResponse(r); }, fail); return true;
      case 'hl.inkDelete': if (!id) return; NotesDB.deleteInk(id).then(() => { HlSync.soon(); sendResponse({ ok: true }); }, fail); return true;
      case 'hl.page': if (!url) return; hlPage(request).then(sendResponse, fail); return true;
      case 'hl.tags': hlTags().then(tags => sendResponse({ ok: true, tags }), fail); return true;
      // A note's images: pasted on the page → a file of the Notes'; shown → back as a data: URL.
      case 'hl.blobPut': hlBlobPut(request.dataUrl).then(sendResponse, fail); return true;
      case 'hl.blob': hlBlob(request.id).then(sendResponse, fail); return true;
      // Minhas marcações is on the site: with an account, there; without one,
      // connecting comes first (that is where the highlights get to the site).
      case 'hl.open': HlSync.status().then(st => st.user ? openNotes(null, typeof request.pageId === 'string' ? '#/m/p/' + request.pageId : '#/m') : chrome.tabs.create({ url: HL_PAGE })); return;
      case 'hl.access': syncHighlightScript().then(() => sendResponse({ ok: true })); return true;
      // The menu's invitation (highlights.js): is it already on every site? / where to turn it on.
      case 'hl.hasAccess': chrome.permissions.contains({ origins: ALL_SITES }).then(ok => sendResponse({ ok }), () => sendResponse({ ok: false })); return true;
      case 'hl.openAccess': chrome.tabs.create({ url: START + '#access' }); return;
      // The bar's "GooHighlights" tab and hl.html: how much is kept,
      // where (this computer or the account), and connecting to the account.
      case 'hl.status': Promise.all([NotesDB.listMarks(), NotesDB.listWebpages(), HlSync.status()]).then(([m, w, st]) => sendResponse({ ok: true, marks: m.length, pages: w.length, ...st }), fail); return true;
      // Firefox asks for its consent to send data first, on hl.html.
      // The site's app, signed in, in a tab (highlights.js there): a pair for
      // it to approve by itself, when this extension has no account yet.
      case 'hl.autoPair':
        if (!sender.tab || !/^https:\/\/www\.agoodrawdraw\.com\.br\/notes\/app\//.test(sender.url || '')) { sendResponse({ ok: false }); return; }
        (async () => {
          const st = await HlSync.linkState();
          if (st.user) return { ok: true, linked: true };
          // One login (notes/onelogin.js): signed out here on purpose after
          // the site's account came in there — this stays out (the site's
          // `since`; a site of before sends none).
          if (st.out > (+request.since || 0)) return { ok: false, out: true };
          // Firefox: never before its own consent to send data (asked on hl.html).
          if (isFirefox) { try { if (!(await browser.permissions.contains({ data_collection: ['personallyIdentifyingInfo', 'websiteContent'] }))) return { ok: false, consent: true }; } catch (e) { return { ok: false, consent: true }; } }
          return { ok: true, ...(await HlSync.connect({ silent: true })) };
        })().then(sendResponse, () => sendResponse({ ok: false }));
        return true;
      case 'hl.connect':
        if (isFirefox && !request.consented) { chrome.tabs.create({ url: HL_PAGE + '#connect' }); sendResponse({ ok: true }); return; }
        HlSync.connect({ window: !!request.window }).then(code => sendResponse({ ok: true, code }), e => sendResponse({ ok: false, error: e && e.message }));
        return true;
      // A flashcard from a selected passage (highlights.js → cardOffer): the
      // account's topics, and the card into one of them.
      case 'hl.cardTopics': HlSync.cardTopics().then(sendResponse, e => sendResponse({ ok: false, error: e && e.status === 0 ? 'offline' : 'fail' })); return true;
      case 'hl.cardAdd': {
        const txt = (v, n) => (typeof v === 'string' ? v.trim().slice(0, n) : '');
        const topicId = typeof request.topicId === 'string' ? request.topicId : '';
        // A capture on the front, or on the back (imageSide 'back'), of the first
        // card (the Draw's or the Highlights' crop): a PNG/JPEG data URL.
        const image = typeof request.image === 'string' && /^data:image\/(png|jpeg|webp);base64,/.test(request.image) && request.image.length < 12e6 ? request.image : null;
        const onBack = !!image && request.imageSide === 'back';
        const cards = (Array.isArray(request.cards) ? request.cards : []).slice(0, 200)
          .map(c => ({ front: txt(c && c.front, 5000), back: txt(c && c.back, 5000), front_html: txt(c && c.front_html, 20000), back_html: txt(c && c.back_html, 20000) }))
          .filter((c, i) => (c.front || (image && !i && !onBack)) && (c.back || (image && !i && onBack)));
        if (!cards.length || !topicId) return;
        const go = blob => HlSync.cardAdd({ topicId, subject: typeof request.subject === 'string' ? request.subject : null, cards, image: blob, imageSide: onBack ? 'back' : 'front' });
        (image ? fetch(image).then(r => r.blob()).then(go) : go(null))
          .then(sendResponse, e => sendResponse({ ok: false, error: e && e.status === 0 ? 'offline' : 'fail' }));
        return true;
      }
      // A capture at the end of a topic's notes, in the account.
      // Or a passage of text (the selection menu's "Enviar trecho"): its
      // paragraphs as the notes editor keeps them, and its HTML.
      case 'hl.notesAppend': {
        const topicId = typeof request.topicId === 'string' ? request.topicId : '';
        if (!topicId) return;
        if (Array.isArray(request.nodes)) {
          HlSync.notesAppend({ topicId, nodes: request.nodes, html: typeof request.html === 'string' ? request.html : '' })
            .then(sendResponse, e => sendResponse({ ok: false, error: e && e.status === 0 ? 'offline' : /quota/.test(String(e && (e.detail || e.message))) ? 'full' : 'fail' }));
          return true;
        }
        if (typeof request.image !== 'string' || !/^data:image\/(png|jpeg|webp);base64,/.test(request.image) || request.image.length > 12e6) return;
        fetch(request.image).then(r => r.blob()).then(image => HlSync.notesAppend({ topicId, image }))
          .then(sendResponse, e => sendResponse({ ok: false, error: e && e.status === 0 ? 'offline' : /quota/.test(String(e && (e.detail || e.message))) ? 'full' : 'fail' }));
        return true;
      }
      case 'hl.pairCheck': HlSync.checkPair().then(ok => sendResponse({ ok }), () => sendResponse({ ok: false })); return true;
      case 'hl.disconnect': HlSync.disconnect(request.force === true).then(sendResponse, fail); return true;
      case 'hl.sync': HlSync.sync().then(() => sendResponse({ ok: true })); return true;
      case 'hl.web': openNotes(null, '#/m'); return;
      // The Notes (and its free Flashcards / Planner), in the site's app.
      case 'hl.app': openNotes(null, ['#/', '#/flashcards', '#/disciplinas', '#/planejamento'].includes(request.hash) ? request.hash : '#/m'); return;
      // "Ampliar a nuvem" (the full cloud's window): the site's page to buy space.
      case 'hl.buyCloud': chrome.tabs.create({ url: HlSync.BUY }); return;
      // The caderno de erros (highlights.js → errOffer): its folders, a new one, a capture into one.
      // The caderno de erros files under the one registry (disciplines ›
      // topics › subtopics, notes/db.js adoptErrFolders): the old folders
      // become it first.
      case 'hl.errFolders': hlRegistry().then(sendResponse, fail); return true;
      case 'hl.errFolder': {
        const name = typeof request.name === 'string' ? request.name.trim().slice(0, 120) : '';
        if (!name) return;
        hlRegistryAdd(name, typeof request.parent === 'string' && request.parent ? request.parent : null)
          .then(folder => { HlSync.soon(); sendResponse({ ok: true, folder }); }, fail);
        return true;
      }
      // A capture — or, with text and no picture, a passage of text (the
      // selection menu's "Enviar trecho"; its HTML only with the formatting).
      case 'hl.errAdd': {
        if (typeof request.folder !== 'string') return;
        if (typeof request.dataUrl !== 'string' && typeof request.text === 'string') {
          const text = request.text.trim().slice(0, 5000);
          if (!text) return;
          const html = (HlSync.safeHtml(typeof request.html === 'string' ? request.html : '').replace(/<img\b[^>]*>/gi, '')) || '';
          gated(null, () => NotesDB.addErrText(request.folder, { html, text, note: typeof request.note === 'string' ? request.note : '', url, title: typeof request.title === 'string' ? request.title : '' })
            .then(() => ({ ok: true })), true)
            .then(r => { HlSync.soon(); sendResponse(r); }, e => { console.error('Caderno de erros:', e); sendResponse({ ok: false, error: e && e.code }); });
          return true;
        }
        if (typeof request.dataUrl !== 'string' || !/^data:image\/(png|jpeg|webp);base64,/.test(request.dataUrl)) return;
        gated(null, () => fetch(request.dataUrl).then(r => r.blob())
          .then(b => NotesDB.addErrShot(request.folder, b, { w: request.w, h: request.h, note: typeof request.note === 'string' ? request.note : '', url, title: typeof request.title === 'string' ? request.title : '' }))
          .then(() => ({ ok: true })), true)
          .then(r => { HlSync.soon(); sendResponse(r); }, e => { console.error('Caderno de erros:', e); sendResponse({ ok: false, error: e && e.code }); });
        return true;
      }
    }
    return;
  }
  // The "Conheça a GooNotes" modal (notes-promo.js, Remotion) — or, while
  // the Notes is on hold, the GooHighlights one (highlights-promo.js):
  // loaded into the page only when it opens, in the content scripts' world.
  if (request.action === 'injectPromo' && sender.tab) {
    const file = request.which === 'highlights' ? 'highlights-promo.js' : 'notes-promo.js';
    chrome.scripting.executeScript({ target: { tabId: sender.tab.id, frameIds: [sender.frameId || 0] }, files: [file] })
      .then(() => sendResponse({ ok: true }), e => { console.error('Notes promo:', e); sendResponse({ ok: false }); });
    return true;
  }
  if (request.action === 'captureTab') {
    // captureVisibleTab takes what's on screen in that window: a tab in the
    // background asking would get another tab's page.
    if (!sender.tab || !sender.tab.active) { sendResponse({ dataUrl: null }); return true; }
    chrome.tabs.captureVisibleTab(sender.tab?.windowId ?? null, { format: 'png' }, (dataUrl) => {
      if (chrome.runtime.lastError) {
        console.error('Capture error:', chrome.runtime.lastError);
        // Without '<all_urls>' (and no click on the icon): the page can offer it.
        sendResponse({ dataUrl: null, perm: /all_urls|activeTab/.test(chrome.runtime.lastError.message || '') });
      } else {
        sendResponse({ dataUrl: dataUrl });
      }
    });
    return true;
  }
  // ⚙️ → Idioma / Language: the bar took itself down; bring it back in the
  // language just stored.
  if (request.action === 'pdReopen' && sender.tab?.id != null) {
    injectBar(sender.tab.id).catch(() => {});
    return;
  }
  if (request.action === 'autoOpen' && typeof request.host === 'string' && /^[a-z0-9.-]+\.[a-z0-9-]+$/i.test(request.host)) {
    setAutoSite(request.host.toLowerCase(), !!request.on);
  }
});

// ─── THE HIGHLIGHTS' CLOUD (hl-sync.js) ─────────────────────────────────────
// A pull of what other devices marked every 10 minutes; while a connection
// started on the site is pending, a look every minute — and whenever a tab
// changes (the site tab finishing the connection wakes this up).
async function ensureAlarms() {
  for (const [name, periodInMinutes] of [['hl-sync', 10], ['hl-pair', 1]]) {
    try { if (!(await chrome.alarms.get(name))) chrome.alarms.create(name, { periodInMinutes }); } catch (e) {}
  }
}
chrome.runtime.onInstalled.addListener(ensureAlarms);
chrome.runtime.onStartup.addListener(ensureAlarms);
ensureAlarms();
chrome.alarms.onAlarm.addListener(a => {
  if (a.name === 'hl-sync') HlSync.sync();
  if (a.name === 'hl-pair') HlSync.checkPair().catch(() => {});
});
chrome.tabs.onUpdated.addListener(() => { HlSync.checkPair().catch(() => {}); });
chrome.tabs.onActivated.addListener(() => { HlSync.checkPair().catch(() => {}); });

// ─── ONE LOGIN WITH THE SITE (05/11/2026, notes/onelogin.js) ────────────────
// The site's Notes (notes/connect.js) reaches this extension straight, through
// externally_connectable (Chrome and Edge; manifest.json, only our site) — no
// permission, no code to type. It asks how this account is, hands it a
// one-time login of its own account when this has none, asks this one for one
// when it has none itself, and tells this to sign out when the person signed
// out there. Each side keeps its own session (hl-sync.js, ext-link handoff).
// Firefox has no externally_connectable for pages: there the pairing stays.
const SITE_APP = /^https:\/\/(www\.)?agoodrawdraw\.com\.br\/notes\/app\//;
if (chrome.runtime.onMessageExternal) chrome.runtime.onMessageExternal.addListener((msg, sender, sendResponse) => {
  if (!msg || typeof msg !== 'object' || typeof msg.bn !== 'string') return;
  const origin = sender.origin || (() => { try { return new URL(sender.url).origin; } catch (e) { return ''; } })();
  if (!/^https:\/\/(www\.)?agoodrawdraw\.com\.br$/.test(origin) || !SITE_APP.test(sender.url || '')) return;
  const fail = e => sendResponse({ ok: false, error: (e && e.message) || 'fail', status: e && e.status });
  switch (msg.bn) {
    case 'status': HlSync.linkState().then(st => sendResponse({ ok: true, ...st }), fail); return true;
    case 'adopt': HlSync.adopt(msg.token_hash).then(sendResponse, fail); return true;
    case 'handoff': HlSync.handoff().then(sendResponse, fail); return true;
    // What hasn't gone up yet stays (no internet): then this stays signed in, and the site asks again later.
    case 'signOut': HlSync.disconnect(false).then(sendResponse, fail); return true;
  }
});
