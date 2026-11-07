// GooNotes — data layer.
// A classic script on purpose: notes.html loads it with <script>, and the
// background loads it too (importScripts in Chrome's service worker, the
// scripts list in Firefox's event page) to file captures sent from the bar.
// Both run on the extension's own origin, so they share one IndexedDB.
//
// Stores:
//  • notebooks — { id, title, layout: 'pages'|'infinite', paper, pageOrder: [pageId],
//                  createdAt, updatedAt, thumb (small JPEG data URL), v }
//  • pages     — { id, nb, paper, items: [...], w?, h?, pdf? }   (index 'nb')
//                  w/h default to an A4 sheet; a PDF page carries its own
//                  size and { blob, i } (paper 'pdf'), see pdfdoc.js
//  • blobs     — { id, blob }                       (pasted and captured images)
//  • folders   — { id, name, createdAt }            (one level, like the TEC's;
//                  a notebook points at its folder through meta.folder)
//  • subjects  — { id, name, abbreviation, display_order, created_at, updatedAt }
//  • topics    — { id, subject_id, parent_id, name, display_order, tags: [],
//                  questions_url, notes_view_mode: 'notes'|'goodraw'|'draw',
//                  created_at, updatedAt }                (index 'subject')
//                  The study tree, shaped like the omni2's (subjects /
//                  flashcard_subtopics) so it can be imported there as is:
//                  a subject, then topics up to 3 levels deep (parent_id).
//                  A notebook belongs to one topic (meta.topic) and shows in
//                  that topic's Draw tab.
//  • contents  — { id: '<topic id>:notes'|'<topic id>:map', topic, kind, data }
//                  (index 'topic') the topic's Notas (omni2's notes_content:
//                  { version: 4, content: TipTap JSON }) and Mapa mental
//                  (goodraw_map_data + goodraw_review_state), kept apart from
//                  the topic so the tree loads light
//  • folders   — the library's old folders; read once to become subjects
//  • webpages  — { id, url, title, site, description, tags: [], topic, fav,
//                  createdAt, updatedAt }                     (index 'url')
//                  A web page with marks on it (Minhas marcações). url is the
//                  address without its #fragment or tracking parameters
//                  (normUrl), so the same article opened twice is one page.
//  • marks     — { id, page, text, color, note, topic, anchor: { exact, prefix,
//                  suffix, pos }, createdAt, updatedAt }       (index 'page')
//                  A passage marked on a web page by highlights.js. The anchor
//                  finds it again on the next visit: the passage with a bit of
//                  the text around it (whitespace collapsed), and where it was.
//                  noteRich: { html, text } — the note with formatting and
//                  images (bnblob:<id>); it stands only while text === note
//                  (an older app that rewrote the note leaves the plain one).
//                  topic: its own discipline or topic (26/10/2026); none —
//                  the page's (webpages.topic, which may now be a discipline too).
//  • logs      — { id: '<topic id>:<YYYY-MM-DD>', topic, subject, date, at,
//                  types: [], questions, correct, revision, note, session,
//                  updatedAt }                                 (index 'topic')
//                  A "Registrar estudo": one per topic per day (the id says
//                  which), so the same day logged on two devices is one record.
//                  questions/correct are what that day added to the topic's
//                  totals. The topic keeps the sum up (evidence_days,
//                  last_evidence_at) for the score — see putStudyLog.
//  • sessions  — { id, subject, topic, start, end, duration, date, notes,
//                  updatedAt }                               (index 'date')
//                  A study session timed by the timer (timer.js), or added by
//                  hand. Logs made during it point at it (log.session).
//  • cycles    — { id, name, active, blockMin, subjects: [{ subject, blocks,
//                  saturation }], slots: [{ subject, blocks, minutes, done,
//                  lastAt }], rounds, updatedAt }
//                  The study cycle (cycle.js): the subjects' blocks laid out
//                  in turns; the timer's minutes fill the slots in order.
//  • cards     — { id, topic, subject, front, back, suspended, fsrs: { state,
//                  stability, difficulty, scheduled_days, reps, lapses, due,
//                  last_review }, front_img: [blob id], back_img: [blob id],
//                  front_html / back_html (rich text, rich.js; images inside
//                  as bnblob:<id>; front / back keep its plain text),
//                  src (an imported card's origin: "anki:<guid>:<ord>"),
//                  tags: [string] (the person's own words, Anki's too),
//                  editLater (set aside while studying: out of the
//                  reviews until edited — flashcards.js off()),
//                  createdAt, updatedAt }                      (index 'topic')
//                  A flashcard (flashcards.js), scheduled by FSRS (ts-fsrs, as
//                  in the omni2). due/last_review are ISO dates; a new card has
//                  state 0 and is due right away.
//  • cardrevs  — { id, card, topic, grade 1–4, at, date }    (index 'topic')
//                  Each answer given to a card: the topic's evidence counts
//                  the days with any (with the study logs).
//  • essays    — { id, topic, subject, title, prompt, model, criteria: [],
//                  lines, rule_id, starred, createdAt, updatedAt } (index 'topic')
//                  A discursive question (essays.js): the statement, a model
//                  answer and the grading criteria (quesitos).
//  • essayres  — { id, essay, topic, answer, checked: [bool], score, seconds,
//                  at, date }                                (index 'topic')
//                  An attempt, graded by ticking the criteria met.
//  • questions — { id, topic, subject, kind: 'ce'|'me', text: <html>, alts:
//                  [{ id, text, ok }], comment: <html>, textId, banca, ano,
//                  orgao, cargo, source, createdAt, updatedAt } (index 'topic')
//                  The Questões bank (questions.js), as the omni2's questoes.
//  • qtexts    — { id, title, html } a text several questions share.
//  • qanswers  — { id, question, topic, alt (null: blank), ok, ms, at, date }
//                  (index 'topic') every attempt, appended, never edited.
//                  The topic keeps q_total, q_answered, q_attempts,
//                  q_correct, q_recent, q_recent_ok (the last 20), and the
//                  answers count as evidence (evidence_days).
//  • tasks     — { id, title, note, col, kind: 'task'|'note', done, doneAt,
//                  due ('YYYY-MM-DD'), time ('HH:MM'), color, tags: [],
//                  checklist: [{ id, text, done }], order, pinned,
//                  createdAt, updatedAt }
//                  The Mural (mural.js): tasks and notes of the person's
//                  own, seen as a list, a Kanban, post-its or a calendar.
//  • taskcols  — { id, name, color, order, done } a Kanban column (done:
//                  what lands there counts as done).
//  • rules     — { id, name, text, createdAt, updatedAt }
//                  A grading rule of an exam, pasted from its edital (the bank
//                  of rules); a discursive question picks one (rule_id), or
//                  none for the general rule.
//  • mocks     — { id, title, date, type: 'ce'|'me', penalty, weights,
//                  minutes, notes, subjects: [{ subject, total, correct, blank,
//                  weight }], errors: [{ topic, note, difficulty, learning }],
//                  score, contest: contest id | null, createdAt, updatedAt }
//                  A mock exam (mocks.js), as the omni2's mock_exams.
//  • contests  — { id, name, banca, examDate: 'YYYY-MM-DD' | null, hue,
//                  type: 'concurso'|'faculdade'|'certificacao'|'vestibular'|
//                  'outro' (none: concurso), status: 'active'|'done' (none:
//                  active), doneAt, park, subjects: [subject id], topics:
//                  [topic id], snapshot, closures: [{ at, snapshot }],
//                  createdAt, updatedAt }
//                  An objetivo the person studies for (goals.js; a concurso
//                  since 31/10/2026, any goal since 31/10/2026): each mock
//                  belongs to one, so different exams aren't averaged. It is
//                  a cut of the one study tree: whole disciplines (subjects,
//                  their topics to come too) and topics one by one (topics).
//                  The study stays on the topic, so a topic in two goals
//                  moves both. Done: out of the filters, with the numbers of
//                  that day kept (snapshot; docs/ESCOPO-OBJETIVOS.md).
//  • cardmocks — { id, title, createdAt, finishedAt, status: 'done'|'partial',
//                  config: { source, order, tag, subjects: [{ subject, n,
//                  topicsOff: [topic id] }] }, items: [{ card, topic, subject,
//                  grade 1–4, ms }], score, hits, usedMs, perSubject: [{
//                  subject, n, points, score }], updatedAt }
//                  A flashcard simulado (cardmock.js): its cards were answered
//                  as in any study (the schedule moved); this keeps the score.
//  • errfolders — { id, name, parent: null | errfolder id, order, createdAt, updatedAt }
//  • errshots  — { id, folder, img: 'bnblob:<id>', w, h, note, url, title,
//                  tags: [tag id], createdAt, updatedAt }  (index 'folder')
//                  GooHighlights' caderno de erros: area captures (of
//                  the Draw or the Highlights) filed in folders and
//                  subfolders (two levels: ERR_LEVELS). A passage of text
//                  sent from the Highlights' selection menu (05/11/2026,
//                  chamado #52) is one too, with no picture: img '', html
//                  (rich.js clean: bold, colours, the marker) and text.
//  • errtags   — { id, name, createdAt, updatedAt }
//                  The caderno de erros' tags the person made (28/10/2026);
//                  the three of everyone (Não domino, Em reforço, Assunto
//                  dominado) live in marks.js, not here.
//  • outbox    — { key: 'kind:id', kind, id, seq }  what changed since the last
//                  push to GooDraw Nuvem (see sync.js). Every write below
//                  adds to it in the same transaction, so nothing changes
//                  without the cloud hearing of it — captures filed by the
//                  background included.
//  • sync      — { k, v }                           the sync's own state: the
//                  server revision of each record, the pull cursor, which
//                  files were uploaded
//
// Items are plain objects, never mutated once stored in a page — the editor
// replaces them — so an undo step only has to remember an array reference.
// Coordinates are page-local, in CSS px of an A4 sheet at 96 dpi.
(function (g) {
  'use strict';
  const DB_NAME = 'agoodraw-notes', DB_VER = 19;
  const MAX_LEVEL = 2;   // topic levels 0, 1, 2 — like the omni2 and its edital import
  const PAGE_W = 794, PAGE_H = 1123, PAGE_GAP = 32, MARGIN = 48;
  const PAPERS = ['blank', 'lined', 'grid', 'dotted', 'cornell'];
  const INK = ['pencil', 'highlight', 'line', 'rect', 'circle', 'eraser'];

  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 10);

  let dbp = null;
  function open() {
    if (dbp) return dbp;
    dbp = new Promise((resolve, reject) => {
      const r = indexedDB.open(DB_NAME, DB_VER);
      r.onupgradeneeded = () => {
        const db = r.result;
        if (!db.objectStoreNames.contains('notebooks')) db.createObjectStore('notebooks', { keyPath: 'id' });
        if (!db.objectStoreNames.contains('pages')) db.createObjectStore('pages', { keyPath: 'id' }).createIndex('nb', 'nb');
        if (!db.objectStoreNames.contains('blobs')) db.createObjectStore('blobs', { keyPath: 'id' });
        if (!db.objectStoreNames.contains('folders')) db.createObjectStore('folders', { keyPath: 'id' });
        if (!db.objectStoreNames.contains('outbox')) db.createObjectStore('outbox', { keyPath: 'key' });
        if (!db.objectStoreNames.contains('sync')) db.createObjectStore('sync', { keyPath: 'k' });
        if (!db.objectStoreNames.contains('subjects')) db.createObjectStore('subjects', { keyPath: 'id' });
        if (!db.objectStoreNames.contains('topics')) db.createObjectStore('topics', { keyPath: 'id' }).createIndex('subject', 'subject_id');
        if (!db.objectStoreNames.contains('contents')) db.createObjectStore('contents', { keyPath: 'id' }).createIndex('topic', 'topic');
        if (!db.objectStoreNames.contains('webpages')) db.createObjectStore('webpages', { keyPath: 'id' }).createIndex('url', 'url');
        if (!db.objectStoreNames.contains('marks')) db.createObjectStore('marks', { keyPath: 'id' }).createIndex('page', 'page');
        // GooHighlights' hand annotations on a web page (highlights.js).
        if (!db.objectStoreNames.contains('pageinks')) db.createObjectStore('pageinks', { keyPath: 'id' }).createIndex('page', 'page');
        if (!db.objectStoreNames.contains('logs')) db.createObjectStore('logs', { keyPath: 'id' }).createIndex('topic', 'topic');
        if (!db.objectStoreNames.contains('sessions')) db.createObjectStore('sessions', { keyPath: 'id' }).createIndex('date', 'date');
        if (!db.objectStoreNames.contains('cycles')) db.createObjectStore('cycles', { keyPath: 'id' });
        if (!db.objectStoreNames.contains('cards')) db.createObjectStore('cards', { keyPath: 'id' }).createIndex('topic', 'topic');
        if (!db.objectStoreNames.contains('cardrevs')) db.createObjectStore('cardrevs', { keyPath: 'id' }).createIndex('topic', 'topic');
        if (!db.objectStoreNames.contains('essays')) db.createObjectStore('essays', { keyPath: 'id' }).createIndex('topic', 'topic');
        if (!db.objectStoreNames.contains('essayres')) db.createObjectStore('essayres', { keyPath: 'id' }).createIndex('topic', 'topic');
        if (!db.objectStoreNames.contains('mocks')) db.createObjectStore('mocks', { keyPath: 'id' });
        if (!db.objectStoreNames.contains('rules')) db.createObjectStore('rules', { keyPath: 'id' });
        if (!db.objectStoreNames.contains('tasks')) db.createObjectStore('tasks', { keyPath: 'id' });
        if (!db.objectStoreNames.contains('taskcols')) db.createObjectStore('taskcols', { keyPath: 'id' });
        if (!db.objectStoreNames.contains('questions')) db.createObjectStore('questions', { keyPath: 'id' }).createIndex('topic', 'topic');
        if (!db.objectStoreNames.contains('qtexts')) db.createObjectStore('qtexts', { keyPath: 'id' });
        if (!db.objectStoreNames.contains('qanswers')) db.createObjectStore('qanswers', { keyPath: 'id' }).createIndex('topic', 'topic');
        if (!db.objectStoreNames.contains('books')) db.createObjectStore('books', { keyPath: 'id' }).createIndex('subject', 'subject_id');
        if (!db.objectStoreNames.contains('errfolders')) db.createObjectStore('errfolders', { keyPath: 'id' });
        if (!db.objectStoreNames.contains('errshots')) db.createObjectStore('errshots', { keyPath: 'id' }).createIndex('folder', 'folder');
        if (!db.objectStoreNames.contains('errtags')) db.createObjectStore('errtags', { keyPath: 'id' });
        if (!db.objectStoreNames.contains('cardmocks')) db.createObjectStore('cardmocks', { keyPath: 'id' });
        if (!db.objectStoreNames.contains('contests')) db.createObjectStore('contests', { keyPath: 'id' });
        // The synced preferences (kind 'pref'): today one record, 'review'.
        if (!db.objectStoreNames.contains('prefs')) db.createObjectStore('prefs', { keyPath: 'id' });
      };
      r.onsuccess = () => {
        const db = r.result;
        db.onversionchange = () => { db.close(); dbp = null; };
        resolve(db);
      };
      r.onerror = () => { dbp = null; reject(r.error); };
    });
    return dbp;
  }

  const req = r => new Promise((resolve, reject) => {
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
  });

  // Runs fn(transaction) and resolves with its result once the transaction has
  // committed — a write is only "saved" after that, not after its request.
  async function tx(stores, mode, fn) {
    const db = await open();
    return new Promise((resolve, reject) => {
      const t = db.transaction(stores, mode);
      let out;
      t.oncomplete = () => resolve(out);
      t.onerror = () => reject(t.error);
      t.onabort = () => reject(t.error || new Error('aborted'));
      Promise.resolve(fn(t)).then(v => { out = v; }, e => { try { t.abort(); } catch (_) {} reject(e); });
    });
  }

  // ─── OUTBOX ──────────────────────────────────────────────────────────────
  // A write transaction that also records what it changed. Once it commits,
  // the sync (in any open Notes tab) is told through a BroadcastChannel.
  const channel = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel('agoodraw-notes') : null;
  let seqN = 0;
  const enq = (t, kind, id) => t.objectStore('outbox').put({ key: kind + ':' + id, kind, id, seq: Date.now() * 1000 + (seqN++ % 1000) });
  // Past the cloud's space (quota.js sets NotesDB.writeLock): a change that
  // only adds — something new, an edit, an answer — is refused (the
  // transaction is undone); one that deletes something goes through, so
  // space can be freed. Writes of the app's own (sync, summaries) say
  // { system: true }.
  const quotaLocked = () => { try { return !!(g.NotesDB && g.NotesDB.writeLock && g.NotesDB.writeLock()); } catch (e) { return false; } };
  function lockedError() {
    const e = new Error('quota_locked'); e.code = 'quota_locked';
    try { if (typeof document !== 'undefined') document.dispatchEvent(new CustomEvent('bn-quota-locked')); } catch (_) {}
    return e;
  }
  const FREE_STORES = new Set(['outbox', 'sync']);
  async function wtx(stores, fn, opt) {
    if (!(opt && opt.system) && quotaLocked()) {
      let adds = false, frees = false;
      const out = await tx(stores.concat('outbox'), 'readwrite', async t => {
        const raw = t.objectStore.bind(t);
        t.objectStore = name => {
          const st = raw(name);
          if (FREE_STORES.has(name)) return st;
          return new Proxy(st, { get(o, p) {
            if (p === 'put' || p === 'add') adds = true;
            if (p === 'delete' || p === 'clear') frees = true;
            const v = o[p]; return typeof v === 'function' ? v.bind(o) : v;
          } });
        };
        const v = await fn(t);
        if (adds && !frees) throw lockedError();
        return v;
      });
      if (channel) channel.postMessage({ type: 'outbox' });
      if (g.NotesDB && g.NotesDB.onLocalChange) g.NotesDB.onLocalChange();
      return out;
    }
    const out = await tx(stores.concat('outbox'), 'readwrite', fn);
    if (channel) channel.postMessage({ type: 'outbox' });
    if (g.NotesDB && g.NotesDB.onLocalChange) g.NotesDB.onLocalChange();
    return out;
  }

  // ─── GEOMETRY (shared with the editor and the exporters) ─────────────────
  const isInk = it => INK.includes(it.t);

  function bbox(it) {
    if (it.p) {
      let x1 = Infinity, y1 = Infinity, x2 = -Infinity, y2 = -Infinity;
      for (let i = 0; i < it.p.length; i += 2) {
        const x = it.p[i], y = it.p[i + 1];
        if (x < x1) x1 = x; if (x > x2) x2 = x;
        if (y < y1) y1 = y; if (y > y2) y2 = y;
      }
      const r = it.t === 'highlight' ? it.s * 2.5 : it.t === 'eraser' ? it.s * 2.5 : it.s / 2;
      return { x: x1 - r, y: y1 - r, w: x2 - x1 + 2 * r, h: y2 - y1 + 2 * r };
    }
    if (it.t === 'line' || it.t === 'rect' || it.t === 'circle') {
      const r = it.s / 2;
      const x1 = Math.min(it.x1, it.x2), y1 = Math.min(it.y1, it.y2);
      return { x: x1 - r, y: y1 - r, w: Math.abs(it.x2 - it.x1) + 2 * r, h: Math.abs(it.y2 - it.y1) + 2 * r };
    }
    if (it.rects) {
      let x1 = Infinity, y1 = Infinity, x2 = -Infinity, y2 = -Infinity;
      it.rects.forEach(r => { x1 = Math.min(x1, r.x); y1 = Math.min(y1, r.y); x2 = Math.max(x2, r.x + r.w); y2 = Math.max(y2, r.y + r.h); });
      return { x: x1, y: y1, w: x2 - x1, h: y2 - y1 };
    }
    return { x: it.x, y: it.y, w: it.w || 0, h: it.h || 0 };
  }

  // Union of every item's box, or null for an empty page.
  function contentBounds(items) {
    let x1 = Infinity, y1 = Infinity, x2 = -Infinity, y2 = -Infinity;
    for (const it of items) {
      if (it.t === 'eraser') continue;
      const b = bbox(it);
      x1 = Math.min(x1, b.x); y1 = Math.min(y1, b.y);
      x2 = Math.max(x2, b.x + b.w); y2 = Math.max(y2, b.y + b.h);
    }
    return x1 === Infinity ? null : { x: x1, y: y1, w: x2 - x1, h: y2 - y1 };
  }

  // ─── NOTEBOOKS ───────────────────────────────────────────────────────────
  function newPage(nb, paper) { return { id: uid(), nb, paper: paper === 'pdf' ? 'blank' : paper, items: [] }; }
  const pageW = p => p.w || PAGE_W;
  const pageH = p => p.h || PAGE_H;
  // One page per page of a stored PDF.
  const pdfPages = (nb, blob, sizes) => sizes.map((sz, i) => ({ id: uid(), nb, paper: 'pdf', w: sz.w, h: sz.h, pdf: { blob, i }, items: [] }));

  async function createPdfNotebook({ title, blob, sizes, folder, topic }) {
    const now = Date.now();
    const id = uid();
    const pages = pdfPages(id, blob, sizes);
    const meta = {
      id, title: title || '', layout: 'pages', paper: 'blank', kind: 'pdf',
      pageOrder: pages.map(p => p.id), createdAt: now, updatedAt: now, thumb: null, v: 1, folder: folder || null,
      topic: topic || null
    };
    await wtx(['notebooks', 'pages'], t => {
      t.objectStore('notebooks').put(meta); enq(t, 'notebook', meta.id);
      pages.forEach(p => { t.objectStore('pages').put(p); enq(t, 'page', p.id); });
    });
    return { meta, pages };
  }

  async function listNotebooks() {
    const all = await tx(['notebooks'], 'readonly', t => req(t.objectStore('notebooks').getAll()));
    return all.sort((a, b) => b.updatedAt - a.updatedAt);
  }

  async function getNotebook(id) {
    return tx(['notebooks', 'pages'], 'readonly', async t => {
      const meta = await req(t.objectStore('notebooks').get(id));
      if (!meta) return null;
      const pages = await req(t.objectStore('pages').index('nb').getAll(id));
      const byId = new Map(pages.map(p => [p.id, p]));
      const ordered = meta.pageOrder.map(pid => byId.get(pid)).filter(Boolean);
      // A page that lost its place in the order (shouldn't happen) is kept, not dropped.
      pages.forEach(p => { if (!meta.pageOrder.includes(p.id)) ordered.push(p); });
      if (!ordered.length) ordered.push(newPage(id, meta.paper));
      return { meta, pages: ordered };
    });
  }

  async function createNotebook({ title, layout, paper, folder, topic }) {
    const now = Date.now();
    const id = uid();
    const page = newPage(id, PAPERS.includes(paper) ? paper : 'blank');
    const meta = {
      id, title: title || '', layout: layout === 'infinite' ? 'infinite' : 'pages',
      paper: page.paper, pageOrder: [page.id], createdAt: now, updatedAt: now, thumb: null, v: 1,
      folder: folder || null, topic: topic || null
    };
    await wtx(['notebooks', 'pages'], t => {
      t.objectStore('notebooks').put(meta); enq(t, 'notebook', meta.id);
      t.objectStore('pages').put(page); enq(t, 'page', page.id);
    });
    return { meta, pages: [page] };
  }

  // One transaction for the whole save: the order in meta and the pages it
  // points at can never be seen half-written.
  async function saveNotebook(meta, putPages, deleteIds) {
    return wtx(['notebooks', 'pages'], t => {
      t.objectStore('notebooks').put(meta); enq(t, 'notebook', meta.id);
      const ps = t.objectStore('pages');
      putPages.forEach(p => { ps.put(p); enq(t, 'page', p.id); });
      (deleteIds || []).forEach(id => { ps.delete(id); enq(t, 'page', id); });
    });
  }

  // { sync: false } for what only this device cares about — the library's
  // thumbnail is redrawn on each device, never sent.
  async function putMeta(meta, opts) {
    if (opts && opts.sync === false) return tx(['notebooks'], 'readwrite', t => { t.objectStore('notebooks').put(meta); });
    return wtx(['notebooks'], t => { t.objectStore('notebooks').put(meta); enq(t, 'notebook', meta.id); });
  }

  async function deleteNotebook(id) {
    await wtx(['notebooks', 'pages'], async t => {
      t.objectStore('notebooks').delete(id); enq(t, 'notebook', id);
      const ps = t.objectStore('pages');
      const keys = await req(ps.index('nb').getAllKeys(id));
      keys.forEach(k => { ps.delete(k); enq(t, 'page', k); });
    });
    await gcBlobs();
  }

  // ─── SUBJECTS AND TOPICS ─────────────────────────────────────────────────
  const byOrder = (a, b) => (a.display_order - b.display_order) || a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' });

  async function listSubjects() {
    const all = await tx(['subjects'], 'readonly', t => req(t.objectStore('subjects').getAll()));
    return all.sort(byOrder);
  }
  async function getSubject(id) { return (await tx(['subjects'], 'readonly', t => req(t.objectStore('subjects').get(id)))) || null; }
  // A subject's badge when none is typed: "Direito Constitucional" → DCO,
  // "01 - Português" → POR (the number in front only sets the order).
  const STOP = new Set(['de', 'da', 'do', 'das', 'dos', 'e', 'a', 'o', 'em', 'of', 'and', 'the']);
  function abbrOf(name) {
    const words = String(name || '').replace(/^[\s\d.\-–—_)]+/, '').split(/[^A-Za-zÀ-ÿ0-9]+/).filter(w => w && !STOP.has(w.toLowerCase()));
    if (!words.length) return String(name || '').trim().slice(0, 3).toUpperCase();
    return (words.length === 1 ? words[0].slice(0, 3) : words[0][0] + words[words.length - 1].slice(0, 2))
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase();
  }
  async function createSubject(name, abbreviation) {
    const subs = await listSubjects();
    const now = Date.now();
    const s = { id: uid(), name: String(name || '').trim(), abbreviation: (String(abbreviation || '').trim() || abbrOf(name)).slice(0, 4).toUpperCase(),
      display_order: subs.length ? Math.max(...subs.map(x => x.display_order || 0)) + 1 : 0, created_at: now, updatedAt: now };
    await wtx(['subjects'], t => { t.objectStore('subjects').put(s); enq(t, 'subject', s.id); });
    return s;
  }
  async function updateSubject(id, patch) {
    return wtx(['subjects'], async t => {
      const st = t.objectStore('subjects');
      const s = await req(st.get(id));
      if (s) { st.put({ ...s, ...patch, updatedAt: Date.now() }); enq(t, 'subject', id); }
    });
  }
  async function reorderSubjects(ids) {
    return wtx(['subjects'], async t => {
      const st = t.objectStore('subjects');
      for (let i = 0; i < ids.length; i++) {
        const s = await req(st.get(ids[i]));
        if (s && s.display_order !== i) { st.put({ ...s, display_order: i, updatedAt: Date.now() }); enq(t, 'subject', s.id); }
      }
    });
  }

  async function listTopics(subjectId) {
    return tx(['topics'], 'readonly', t => subjectId
      ? req(t.objectStore('topics').index('subject').getAll(subjectId))
      : req(t.objectStore('topics').getAll()));
  }
  async function getTopic(id) { return (await tx(['topics'], 'readonly', t => req(t.objectStore('topics').get(id)))) || null; }

  // Level of a topic in its subject (0 = top level). Needs the subject's topics.
  function levelOf(topics, id) {
    const byId = new Map(topics.map(x => [x.id, x]));
    let n = 0, cur = byId.get(id);
    while (cur && cur.parent_id && n < 10) { cur = byId.get(cur.parent_id); n++; }
    return n;
  }
  function descendants(topics, id) {
    const out = [], stack = [id];
    while (stack.length) {
      const p = stack.pop();
      topics.forEach(x => { if (x.parent_id === p) { out.push(x); stack.push(x.id); } });
    }
    return out;
  }
  // How many levels a subtree spans (a leaf is 1).
  function subtreeHeight(topics, id) {
    const kids = topics.filter(x => x.parent_id === id);
    return 1 + (kids.length ? Math.max(...kids.map(k => subtreeHeight(topics, k.id))) : 0);
  }

  async function createTopic({ subject_id, parent_id, name, after }) {
    const all = await listTopics(subject_id);
    if (parent_id && levelOf(all, parent_id) >= MAX_LEVEL) throw new Error('too_deep');
    const sibs = all.filter(x => (x.parent_id || null) === (parent_id || null)).sort(byOrder);
    const now = Date.now();
    const tp = { id: uid(), subject_id, parent_id: parent_id || null, name: String(name || '').trim(), display_order: 0,
      tags: [], questions_url: '', notes_view_mode: 'notes', created_at: now, updatedAt: now };
    // Right after `after` among its siblings, or at the end.
    const at = after ? sibs.findIndex(x => x.id === after) + 1 : sibs.length;
    sibs.splice(at < 0 ? sibs.length : at, 0, tp);
    await wtx(['topics', 'contests'], async t => {
      const st = t.objectStore('topics');
      sibs.forEach((x, i) => {
        if (x === tp || x.display_order !== i) { st.put({ ...x, display_order: i, updatedAt: x === tp ? now : Date.now() }); enq(t, 'topic', x.id); }
      });
      // A subtopic joins the objetivos its parent is in (one marked by hand;
      // a whole discipline takes it anyway).
      if (parent_id) {
        const cs = t.objectStore('contests');
        (await req(cs.getAll())).forEach(c => { if ((c.topics || []).includes(parent_id)) { cs.put({ ...c, topics: [...c.topics, tp.id], updatedAt: now }); enq(t, 'contest', c.id); } });
      }
    });
    return { ...tp, display_order: at };
  }
  async function updateTopic(id, patch) {
    return wtx(['topics'], async t => {
      const st = t.objectStore('topics');
      const x = await req(st.get(id));
      if (!x) return;
      st.put({ ...x, ...patch, updatedAt: Date.now() }); enq(t, 'topic', id);
      // Relevance or difficulty changed: the weight, and with it when the topic comes back.
      if (('relevance' in patch && patch.relevance !== x.relevance) || ('difficulty' in patch && patch.difficulty !== x.difficulty)) await reweighTopic(t, id);
    });
  }
  // The recall target of a topic, from its weight in the preparation
  // (score.js); 0.9 where score.js isn't loaded (the service worker, the
  // Android engine) — the Notes derives it again on the next write.
  const targetOf = x => (g.NotesScore && g.NotesScore.targetOf ? g.NotesScore.targetOf(g.NotesScore.weight(x).w) : 0.9);
  // The review mode (reviewmode.js, the pref 'review'): "Do meu jeito" only
  // where the module is loaded (not the service worker nor the Android
  // engine) and the person chose it; anywhere else, the automatic one.
  // There fsrs.due stays the FSRS's and next_revision_date — the queue's
  // date — is the mode's (docs/superpowers/specs/2026-11-02-revisao-do-meu-jeito-design.md).
  const mineMode = () => !!g.NotesReviewMode && reviewPrefsCached().mode === 'mine';
  // "Dias fixos" (docs/superpowers/specs/2026-11-03-revisao-tres-modos-design.md
  // §4), the same way: the queue's date is the sequence's. manualMode: either
  // of the two, where the queue's date is the mode's and not the FSRS's.
  const fixedMode = () => !!g.NotesReviewMode && reviewPrefsCached().mode === 'fixed';
  const manualMode = () => mineMode() || fixedMode();
  // The reviews per day on the calendar, from the other topics' dates.
  const loadOf = (all, exceptId) => {
    const load = new Map();
    all.forEach(o => { if (o.id !== exceptId && o.next_revision_date && !o.is_folder) load.set(o.next_revision_date, (load.get(o.next_revision_date) || 0) + 1); });
    return load;
  };
  const examOf = x => (g.NotesGoals && g.NotesGoals.examDateFor ? g.NotesGoals.examDateFor(x) : null);
  // The mode's next day for x (reviewmode.js nextDay), or null with nothing
  // to go on. o: { day, load, examDate, grade?, nudge? }.
  const mineDay = (x, o) => g.NotesReviewMode.nextDay(x, {
    day: o.day, examDate: o.examDate || null, prefs: reviewPrefsCached(), load: o.load, grade: o.grade || null, nudge: o.nudge || null,
    weightTarget: targetOf(x), decisive: !!(g.NotesScore && g.NotesScore.weight && g.NotesScore.weight(x).band === 'decisive')
  });
  // The Dias fixos' day for x (reviewmode.js fixedDay), or null with no FSRS
  // to go on. o: { day, examDate }.
  const fixedDayOf = (x, o) => g.NotesReviewMode.fixedDay(x, { day: o.day, examDate: o.examDate || null, steps: reviewPrefsCached().steps });
  // The next date of a topic derived again from its stability with its
  // current target (topicsched.js reweigh), inside a write that changed its
  // relevance or difficulty: the panel's pills, the list's toggle, an
  // external mock raising the difficulty of the topics missed.
  async function reweighTopic(t, topicId) {
    const TS = g.NotesTopicSched;
    if (!TS) return;
    const ts = t.objectStore('topics');
    const x = await req(ts.get(topicId));
    if (!x || x.is_folder || !x.fsrs) return;
    const today = localDay(Date.now()), load = new Map();
    (await req(ts.getAll())).forEach(o => { if (o.id !== topicId && o.next_revision_date && !o.is_folder) load.set(o.next_revision_date, (load.get(o.next_revision_date) || 0) + 1); });
    const examDate = g.NotesGoals && g.NotesGoals.examDateFor ? g.NotesGoals.examDateFor(x) : null;
    const r = TS.reweigh(x, { day: today, load, examDate, target: targetOf(x) });
    if (!r) return;
    const { raw, ...patch } = r; void raw;
    // "Do meu jeito" and Dias fixos: the queue's date is the mode's; only the FSRS moves.
    if (manualMode()) delete patch.next_revision_date;
    ts.put({ ...x, ...patch, updatedAt: Date.now() }); enq(t, 'topic', topicId);
  }
  // Once per device (01/11/2026, the weight): every topic whose weight isn't
  // the neutral one gets its date derived again from its stability with its
  // target, balanced; the overdue ones spread as in rebuildSchedules. Local
  // (nothing goes up). → { topics, moved }.
  async function reweighAll() {
    const TS = g.NotesTopicSched, SC = g.NotesScore;
    if (!TS || !SC) return { topics: 0, moved: 0 };
    const today = localDay(Date.now());
    // "Do meu jeito" and Dias fixos: the FSRS is derived again and spread, the queue's date stays.
    const manual = manualMode();
    const fsrsDay = x => (x.fsrs && x.fsrs.due ? TS.dayOf(new Date(x.fsrs.due).getTime()) : null);
    const tops = (await listTopics()).filter(x => !x.is_folder);
    const load = new Map();
    tops.forEach(o => { if (o.next_revision_date) load.set(o.next_revision_date, (load.get(o.next_revision_date) || 0) + 1); });
    const todo = tops.filter(x => x.fsrs && x.fsrs.state && SC.weight(x).w !== 3);
    const done = [], rawOf = new Map();   // the day the recall falls to the target: in the past, "overdue" for the spread
    for (let i = 0; i < todo.length; i += 50) {
      await tx(['topics'], 'readwrite', async t => {
        const ts = t.objectStore('topics');
        for (const x0 of todo.slice(i, i + 50)) {
          const x = await req(ts.get(x0.id));
          if (!x || !x.fsrs) continue;
          if (x.next_revision_date) load.set(x.next_revision_date, Math.max(0, (load.get(x.next_revision_date) || 1) - 1));
          const examDate = g.NotesGoals && g.NotesGoals.examDateFor ? g.NotesGoals.examDateFor(x) : null;
          const r = TS.reweigh(x, { day: today, load, examDate, target: targetOf(x) });
          const patch = r ? (({ raw, ...p }) => { rawOf.set(x.id, raw); return p; })(r) : null;
          if (patch && manual) delete patch.next_revision_date;
          const next = patch ? { ...x, ...patch } : x;
          if (next.next_revision_date) load.set(next.next_revision_date, (load.get(next.next_revision_date) || 0) + 1);
          if (patch) { ts.put(next); done.push(next); }
        }
      });
    }
    // The ones whose recall already fell below the target (pulled to today
    // by reweigh) go in as overdue, so the spread gives them the next days,
    // the highest priority first, at most max(5, ⌈n/7⌉) a day (as in the v3).
    const list = done.map(x => { const raw = rawOf.get(x.id); return { id: x.id, due: raw && raw < today ? raw : manual ? fsrsDay(x) : x.next_revision_date, priority: SC.priority(x, SC.breakdown(x), {}) }; });
    const late = list.filter(x => x.due && x.due < today).length;
    const placed = TS.spread(list, today, Math.max(5, Math.ceil(late / 7)));
    let moved = 0;
    await tx(['topics'], 'readwrite', async t => {
      const ts = t.objectStore('topics');
      for (const [id, dayTo] of placed) {
        const x = await req(ts.get(id));
        if (!x || !dayTo || (manual ? fsrsDay(x) : x.next_revision_date) === dayTo) continue;
        moved++;
        const fsrs = x.fsrs ? { ...x.fsrs, due: new Date(TS.dayNoon(dayTo)).toISOString() } : x.fsrs;
        ts.put(manual ? { ...x, fsrs } : { ...x, next_revision_date: dayTo, fsrs });
      }
    });
    return { topics: done.length, moved };
  }
  // Puts a topic (and its subtree) under newParent (null: top level) of
  // subjectId, at position `index` among the new siblings. Refuses cycles and
  // anything that would go past the 3 levels.
  async function moveTopic(id, subjectId, newParent, index) {
    const all = await listTopics();
    const me = all.find(x => x.id === id);
    if (!me) return;
    const sub = all.filter(x => x.subject_id === me.subject_id);
    const desc = descendants(sub, id);
    if (newParent && (newParent === id || desc.some(d => d.id === newParent))) throw new Error('cycle');
    const target = all.filter(x => x.subject_id === subjectId);
    const lvl = newParent ? levelOf(target, newParent) + 1 : 0;
    if (lvl + subtreeHeight(sub, id) - 1 > MAX_LEVEL) throw new Error('too_deep');
    const sibs = target.filter(x => (x.parent_id || null) === (newParent || null) && x.id !== id).sort(byOrder);
    sibs.splice(Math.max(0, Math.min(index == null ? sibs.length : index, sibs.length)), 0, me);
    const now = Date.now();
    await wtx(['topics'], t => {
      const st = t.objectStore('topics');
      sibs.forEach((x, i) => {
        const moved = x.id === id;
        if (moved || x.display_order !== i) {
          st.put({ ...x, display_order: i, ...(moved ? { parent_id: newParent || null, subject_id: subjectId } : {}), updatedAt: now });
          enq(t, 'topic', x.id);
        }
      });
      if (subjectId !== me.subject_id) desc.forEach(d => { st.put({ ...d, subject_id: subjectId, updatedAt: now }); enq(t, 'topic', d.id); });
    });
  }
  // The topic, its subtopics, their notes, maps and notebooks.
  async function deleteTopic(id) {
    const all = await listTopics();
    const me = all.find(x => x.id === id);
    if (!me) return;
    const ids = [id, ...descendants(all.filter(x => x.subject_id === me.subject_id), id).map(d => d.id)];
    await removeTopics(ids);
  }
  async function unlink(t, ids) {
    const now = Date.now();
    for (const [store, kind] of [['webpages', 'webpage'], ['marks', 'mark']]) {
      const st = t.objectStore(store);
      (await req(st.getAll())).forEach(w => { if (ids.includes(w.topic)) { st.put({ ...w, topic: null, updatedAt: now }); enq(t, kind, w.id); } });
    }
  }
  async function removeTopics(ids) {
    const metas = (await listNotebooks()).filter(m => ids.includes(m.topic));
    await wtx(['topics', 'contents', 'notebooks', 'pages', 'webpages', 'marks', 'logs', 'cards', 'cardrevs', 'essays', 'essayres', 'questions', 'qanswers', 'books', 'errshots', 'errfolders', 'contests'], async t => {
      await dropErr(t, ids);
      await unGoal(t, ids);
      for (const [store, kind] of [['logs', 'studylog'], ['cards', 'card'], ['cardrevs', 'cardrev'], ['essays', 'essay'], ['essayres', 'essayres'], ['questions', 'question'], ['qanswers', 'qanswer']]) {
        const st = t.objectStore(store);
        for (const id of ids) (await req(st.index('topic').getAllKeys(id))).forEach(k => { st.delete(k); enq(t, kind, k); });
      }
      // Web pages and marks filed under a topic stay, without the topic; so
      // do the Bookshelf's books (the PDF is the person's, not the topic's).
      await unlink(t, ids);
      const bs = t.objectStore('books');
      (await req(bs.getAll())).forEach(b => { if (b.topic_id && ids.includes(b.topic_id)) { bs.put({ ...b, topic_id: null, updatedAt: Date.now() }); enq(t, 'book', b.id); } });
      const ts = t.objectStore('topics'), cs = t.objectStore('contents'), ns = t.objectStore('notebooks'), ps = t.objectStore('pages');
      for (const id of ids) {
        ts.delete(id); enq(t, 'topic', id);
        for (const k of ['notes', 'map']) { cs.delete(id + ':' + k); enq(t, 'content', id + ':' + k); }
      }
      for (const m of metas) {
        ns.delete(m.id); enq(t, 'notebook', m.id);
        const keys = await req(ps.index('nb').getAllKeys(m.id));
        keys.forEach(k => { ps.delete(k); enq(t, 'page', k); });
      }
    });
    await gcBlobs();
  }
  async function deleteSubject(id) {
    const ids = (await listTopics(id)).map(x => x.id);
    await removeTopics(ids);
    await wtx(['subjects', 'errshots', 'errfolders', 'sessions', 'books', 'webpages', 'marks', 'contests'], async t => {
      t.objectStore('subjects').delete(id); enq(t, 'subject', id);
      await dropErr(t, [id]);
      await unGoal(t, [id]);
      await unlink(t, [id]);
      const ss = t.objectStore('sessions');
      (await req(ss.getAll())).forEach(x => { if (x.subject === id) { ss.delete(x.id); enq(t, 'session', x.id); } });
      const bs = t.objectStore('books');
      (await req(bs.index('subject').getAllKeys(id))).forEach(k => { bs.delete(k); enq(t, 'book', k); });
    });
    await gcBlobs();
  }
  // Disciplines / topics deleted leave the objetivos that had them.
  async function unGoal(t, ids) {
    const cs = t.objectStore('contests'), gone = new Set(ids);
    (await req(cs.getAll())).forEach(c => {
      const subjects = (c.subjects || []).filter(x => !gone.has(x)), topics = (c.topics || []).filter(x => !gone.has(x));
      if (subjects.length !== (c.subjects || []).length || topics.length !== (c.topics || []).length) { cs.put({ ...c, subjects, topics, updatedAt: Date.now() }); enq(t, 'contest', c.id); }
    });
  }
  // The caderno de erros under these disciplines / topics: its captures, and
  // the old folders that became them (left alone, they'd come back).
  async function dropErr(t, ids) {
    const es = t.objectStore('errshots'), fs = t.objectStore('errfolders');
    for (const id of ids) (await req(es.index('folder').getAllKeys(id))).forEach(k => { es.delete(k); enq(t, 'errshot', k); });
    (await req(fs.getAll())).forEach(f => { if (ids.includes(f.id) || ids.includes(f.to)) { fs.delete(f.id); enq(t, 'errfolder', f.id); } });
  }
  // What goes with a discipline or a topic (its subtopics included) if it is
  // deleted — told before, so "tirar do escopo" can be offered instead.
  async function contentsOf(kind, id) {
    const subj = kind === 'subject';
    const all = await listTopics(), me = all.find(x => x.id === id);
    const tops = subj ? all.filter(x => x.subject_id === id) : me ? [me, ...descendants(all.filter(x => x.subject_id === me.subject_id), id)] : [];
    const ids = new Set(tops.map(x => x.id));
    const [cards, shots, sessions, books, questions] = await Promise.all([
      tx(['cards'], 'readonly', t => req(t.objectStore('cards').getAll())),
      tx(['errshots'], 'readonly', t => req(t.objectStore('errshots').getAll())),
      listSessions(), listBooks(),
      tx(['questions'], 'readonly', t => req(t.objectStore('questions').getAll()))
    ]);
    return {
      topics: subj ? tops.length : tops.length - 1,
      cards: cards.filter(c => ids.has(c.topic)).length,
      shots: shots.filter(x => ids.has(x.folder) || (subj && x.folder === id)).length,
      sessions: subj ? sessions.filter(x => x.subject === id).length : 0,
      books: subj ? books.filter(b => b.subject_id === id).length : books.filter(b => ids.has(b.topic_id)).length,
      questions: questions.filter(q => ids.has(q.topic)).length
    };
  }

  // ─── SIGNING OUT (26/10/2026) ───────────────────────────────────────────
  // Everything needs an account now, so signing out leaves nothing of it on
  // this device (a shared computer: the next one to sign in would get it).
  // The callers push first and ask before losing what couldn't go up.
  async function wipeLocal() {
    try { const db = await open(); db.close(); } catch (e) {}
    dbp = null;
    await new Promise(res => { const r = indexedDB.deleteDatabase(DB_NAME); r.onsuccess = r.onerror = r.onblocked = () => res(); });
  }

  // ─── ONE REGISTRY (26/10/2026) ──────────────────────────────────────────
  // Disciplines › topics › subtopics are the one registry of the caderno de
  // erros, the flashcards, the planner, the questions and the Notes. The
  // caderno de erros had folders of its own (a folder, its subfolders): each
  // becomes a discipline / a topic with the folder's own id — its captures
  // stay where they are, and two devices converting make the same records. A
  // folder named like a discipline that exists (accents and case aside) joins
  // it, its captures with it. The folders stay (f.to: what they became) for
  // the older apps that still read them; whatever those create is converted
  // the next time this runs (on start, after a sync). → how many were made.
  const nameKey = v => String(v || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();
  async function adoptErrFolders() {
    const has = await tx(['errfolders'], 'readonly', t => req(t.objectStore('errfolders').count()));
    if (!has) return 0;
    return wtx(['errfolders', 'subjects', 'topics', 'errshots'], async t => {
      const fs = t.objectStore('errfolders'), ss = t.objectStore('subjects'), ts = t.objectStore('topics'), es = t.objectStore('errshots');
      const folders = (await req(fs.getAll())).sort((a, b) => (a.order || 0) - (b.order || 0) || (a.createdAt || 0) - (b.createdAt || 0));
      const subs = await req(ss.getAll()), tops = await req(ts.getAll());
      const subById = new Map(subs.map(x => [x.id, x])), subByName = new Map(subs.map(x => [nameKey(x.name), x]));
      const topById = new Map(tops.map(x => [x.id, x]));
      const now = Date.now(), to = new Map();
      let order = subs.length ? Math.max(...subs.map(x => x.display_order || 0)) + 1 : 0, made = 0;
      for (const f of folders.filter(f => !f.parent)) {
        let id = f.to && subById.has(f.to) ? f.to : null;
        if (!id) {
          const same = subById.get(f.id) || subByName.get(nameKey(f.name));
          if (same) id = same.id;
          else {
            const x = { id: f.id, name: f.name, abbreviation: abbrOf(f.name).slice(0, 4), display_order: order++, created_at: f.createdAt || now, updatedAt: now };
            ss.put(x); enq(t, 'subject', x.id); subById.set(x.id, x); subByName.set(nameKey(x.name), x); id = x.id; made++;
          }
        }
        to.set(f.id, id);
      }
      for (const f of folders.filter(f => f.parent)) {
        const sub = to.get(f.parent);
        if (!sub) continue;
        let id = f.to && topById.has(f.to) ? f.to : null;
        if (!id) {
          const sibs = tops.filter(x => x.subject_id === sub && !x.parent_id);
          const same = topById.get(f.id) || sibs.find(x => nameKey(x.name) === nameKey(f.name));
          if (same) id = same.id;
          else {
            const x = { id: f.id, subject_id: sub, parent_id: null, name: f.name, display_order: sibs.length, tags: [], questions_url: '', notes_view_mode: 'notes', created_at: f.createdAt || now, updatedAt: now };
            ts.put(x); enq(t, 'topic', x.id); topById.set(x.id, x); tops.push(x); id = x.id; made++;
          }
        }
        to.set(f.id, id);
      }
      for (const f of folders) {
        const id = to.get(f.id);
        if (!id) continue;
        if (f.to !== id) { fs.put({ ...f, to: id }); enq(t, 'errfolder', f.id); }
        if (id !== f.id) for (const x of await req(es.index('folder').getAll(f.id))) { es.put({ ...x, folder: id, updatedAt: now }); enq(t, 'errshot', x.id); }
      }
      return made;
    });
  }

  // ─── STUDY LOGS ──────────────────────────────────────────────────────────
  const listLogs = topicId => tx(['logs'], 'readonly', t => topicId
    ? req(t.objectStore('logs').index('topic').getAll(topicId))
    : req(t.objectStore('logs').getAll()));
  const getLog = id => tx(['logs'], 'readonly', t => req(t.objectStore('logs').get(id))).then(r => r || null);
  // The days a topic has study on (a log or a card answered), and the newest
  // moment: what its score counts as evidence (score.js).
  function evidenceOf(logs, revs) {
    const all = logs.concat(revs || []);
    return { evidence_days: new Set(all.map(l => l.date)).size, last_evidence_at: all.reduce((m, l) => Math.max(m, l.at || 0), 0) || null };
  }
  // Saves a day's log and the topic in one go: patch (the levels, the
  // running totals) goes on the topic, then the topic is refreshed with the
  // log as the day's practice — the score, the grade and the next review
  // (refreshTopic). Resolves with the topic as saved.
  // opt.fixedStep (Dias fixos, only when the person touched the chips): the
  // step this review is, so the next one is today + that gap even mid
  // interval — today even for a log of another day (an old one edited, a
  // past session): the chip says "from now", and the log's day would give a
  // date already gone. Kept on the topic as fixed_pick with the log that
  // brought it and the pick before it, so deleting the log undoes it
  // (deleteStudyLog).
  async function putStudyLog(log, patch, opt) {
    const step = opt && opt.fixedStep;
    const pick = fixedMode() && Number.isInteger(step) && step >= 0;
    return wtx(Q_STORES, async t => {
      const ls = t.objectStore('logs'), ts = t.objectStore('topics');
      ls.put({ ...log, updatedAt: Date.now() }); enq(t, 'studylog', log.id);
      const x = await req(ts.get(log.topic));
      if (!x) return null;
      const topic = { ...x, ...(patch || {}) };
      if (pick) {
        const cur = x.fixed_pick && typeof x.fixed_pick === 'object' ? x.fixed_pick : null;
        // Picked again in the same log (edited): the one to go back to stays the one before it.
        const prev = !cur ? null : cur.log === log.id ? cur.prev || null : (({ prev: _, ...p }) => p)(cur);
        topic.fixed_pick = { day: localDay(Date.now()), step, kAt: null, log: log.id, prev };
        // The person's choice is the newest: a pinned date gives way to it.
        if (topic.manual_pin) topic.manual_pin = null;
      }
      ts.put(topic);
      await refreshTopic(t, log.topic, summaryAll(), false, { log, pickChanged: pick });
      return req(ts.get(log.topic));
    });
  }

  // A day's log removed (logged on the wrong topic): what it added to the
  // notebook's running totals comes off the topic, and the day's practice is
  // counted again without it. The Dias fixos pick it brought goes with it.
  async function deleteStudyLog(id) {
    return wtx(Q_STORES, async t => {
      const ls = t.objectStore('logs'), ts = t.objectStore('topics');
      const log = await req(ls.get(id));
      if (!log) return null;
      ls.delete(id); enq(t, 'studylog', id);
      const x = await req(ts.get(log.topic));
      if (!x) return null;
      const topic = { ...x };
      if (log.questions) topic.total_questions = Math.max(0, (x.total_questions || 0) - log.questions);
      if (log.correct) topic.correct_answers = Math.max(0, Math.min(topic.total_questions || 0, (x.correct_answers || 0) - log.correct));
      // Back to the pick before it (in any mode: the step is the topic's, for
      // when Dias fixos comes back). The log of that earlier pick gone: there
      // is nothing to go back to any more.
      const fp = x.fixed_pick, unpick = !!(fp && fp.log === id);
      if (unpick) topic.fixed_pick = fp.prev ? { ...fp.prev, prev: null } : null;
      else if (fp && fp.prev && fp.prev.log === id) topic.fixed_pick = { ...fp, prev: null };
      ts.put(topic);
      await refreshTopic(t, log.topic, summaryAll(), false, { pickChanged: unpick });
      return req(ts.get(log.topic));
    });
  }

  // ─── FLASHCARDS ──────────────────────────────────────────────────────────
  const listCards = topicId => tx(['cards'], 'readonly', t => topicId
    ? req(t.objectStore('cards').index('topic').getAll(topicId))
    : req(t.objectStore('cards').getAll()));
  const listCardRevs = () => tx(['cardrevs'], 'readonly', t => req(t.objectStore('cardrevs').getAll()));
  // Saves cards (new or edited, and the answer just given, if any) and brings
  // their topics up to date: evidence, and what summary(cards) says (the
  // cards' retention, worked out by flashcards.js).
  // opt.fields (['fsrs'], ['suspended'] …): only those fields go over the
  // card as the store has it now — a review on this device must not undo an
  // edit that came down from another meanwhile (Onda 3, 01/11/2026).
  async function putCards(cards, rev, summary, opt) {
    return wtx(['cards', 'cardrevs', 'topics', 'logs', 'essayres', 'essays', 'questions', 'qanswers'], async t => {
      const cs = t.objectStore('cards'), rs = t.objectStore('cardrevs');
      const now = Date.now(), fields = opt && opt.fields;
      for (const c of cards) {
        let next = { ...c };
        if (fields) { const cur = await req(cs.get(c.id)); if (cur) { next = { ...cur }; fields.forEach(f => { next[f] = c[f]; }); } }
        cs.put({ ...next, updatedAt: now }); enq(t, 'card', c.id);
      }
      // rev: the answer just given, or a list of them (an Anki history).
      [].concat(rev || []).forEach(r => { rs.put(r); enq(t, 'cardrev', r.id); });
      for (const topicId of new Set(cards.map(c => c.topic).filter(Boolean))) await refreshTopic(t, topicId, summary);
    });
  }
  async function deleteCards(ids, summary) {
    return wtx(['cards', 'cardrevs', 'topics', 'logs', 'essayres', 'essays', 'questions', 'qanswers'], async t => {
      const cs = t.objectStore('cards'), topics = new Set();
      for (const id of ids) {
        const c = await req(cs.get(id));
        if (c) topics.add(c.topic);
        cs.delete(id); enq(t, 'card', id);
      }
      for (const topicId of topics) if (topicId) await refreshTopic(t, topicId, summary);
    });
  }
  // A topic's evidence and summaries, inside a write that changed its cards
  // or its discursive questions. summary(cards, essays, attempts) gives the
  // fields of the module that changed (each module brings its own).
  // local: a recount of this device's own (what came down from the cloud, a
  // topic opened) — written only when a number changed, without going up:
  // every device works the numbers out from the same records.
  // extra (score v3): { log } the "Registrar estudo" just saved (a passive
  // one closes a due review), { mockErrs } the mistakes of an external mock
  // typed in now (kept on the topic as day_mockerrs, so a recount on another
  // day or device sees them). With topicsched.js around (not in the
  // extension's service worker nor the Android engine), the day's practice
  // gives the topic its grade, status and next review; a local recount that
  // graded a day for the first time sends the topic up — the one exception
  // to "local queues nothing" (spec §4.10).
  async function refreshTopic(t, topicId, summary, local, extra) {
    const ts = t.objectStore('topics');
    const x = await req(ts.get(topicId));
    if (!x) return;
    extra = extra || {};
    const [cards, revs, logs, essays, tries, qs, ans] = await Promise.all([
      req(t.objectStore('cards').index('topic').getAll(topicId)),
      req(t.objectStore('cardrevs').index('topic').getAll(topicId)),
      req(t.objectStore('logs').index('topic').getAll(topicId)),
      req(t.objectStore('essays').index('topic').getAll(topicId)),
      req(t.objectStore('essayres').index('topic').getAll(topicId)),
      req(t.objectStore('questions').index('topic').getAll(topicId)),
      req(t.objectStore('qanswers').index('topic').getAll(topicId))
    ]);
    const today = localDay(Date.now());
    const next = { ...x, ...evidenceOf(logs, revs.concat(tries, ans)),
      ...questionSummary(qs, ans, logs, today, { total: x.total_questions || 0, correct: x.correct_answers || 0 }),
      ...(summary ? summary(cards, essays, tries) : {}) };
    // The mistakes of an external mock typed in (or taken out) today: a delta.
    if (extra.mockErrs) next.day_mockerrs = { day: today, n: Math.max(0, (x.day_mockerrs && x.day_mockerrs.day === today ? x.day_mockerrs.n : 0) + extra.mockErrs) };
    const TS = g.NotesTopicSched;
    if (TS && !x.is_folder) {
      const qsById = new Map(qs.map(q => [q.id, q]));
      const map = { last: next.map_last_review, mastery: next.map_mastery };
      const records = { ans, revs, tries, logs, map, mockErrs: next.day_mockerrs && next.day_mockerrs.day === today ? next.day_mockerrs.n : 0, target: targetOf(x) };
      const items = dayItems(records, qsById, today);
      const avail = { questions: qs.length, cards: cards.filter(c => !c.suspended && !c.editLater).length, essays: essays.length, mapNodes: next.map_mastery === null || next.map_mastery === undefined ? 0 : 5 };
      const hasEvidence = (next.evidence_days || 0) > 0 || !!next.map_last_review;
      const examDate = g.NotesGoals && g.NotesGoals.examDateFor ? g.NotesGoals.examDateFor(x) : null;
      let patch = null, load = null, undone = false;
      // No FSRS yet but a history (a topic from before the score v3, or one
      // that came down from another device without it): rebuilt from the
      // records right here — any device heals what it lacks (spec §4.7, §4.10).
      if (!x.fsrs && hasEvidence) patch = TS.rebuild(next, { ...records, mocks: [], avail, examDate }, qsById, today, dayItems);
      if (!patch) {
        const passive = !!(extra.log && !(extra.log.questions > 0));
        // The other topics' dates (the load balancing) only when a grade may
        // come out of this write: a getAll per write otherwise.
        const dayLoad = new Map();
        if (passive || (items.length && TS.points(items) >= TS.threshold(avail))) {
          (await req(ts.getAll())).forEach(o => { if (o.id !== topicId && o.next_revision_date && !o.is_folder) dayLoad.set(o.next_revision_date, (dayLoad.get(o.next_revision_date) || 0) + 1); });
          load = dayLoad;
        }
        const ctx = { day: today, load: dayLoad, avail, examDate, target: targetOf(x) };
        // A log with questions is already among the day's items (the logs store); a passive one goes its own way.
        patch = passive ? TS.applyLog(next, extra.log, ctx) : TS.applyDay(next, items, ctx);
        // The day's practice is gone (a log deleted, answers reset): its grade goes with it.
        if (!patch && x.graded_on === today && !items.length && !logs.some(l => l.date === today) && !records.mockErrs) { patch = TS.undoDay(next, today, hasEvidence); undone = !!patch; }
      }
      if (patch) Object.assign(next, patch);
      // A new grade today. One that stands (the same as earlier today: applyDay
      // hands the same FSRS back) is not: the date it has stays.
      const regraded = !!(patch && patch.graded_on === today && patch.fsrs && patch.fsrs !== x.fsrs);
      // "Do meu jeito": a review graded today takes the mode's date (the FSRS's
      // stays in fsrs.due) and the pinned date goes — the review happened. A
      // grade that stands keeps the date it has, a nudge made after it included.
      if (regraded && mineMode()) {
        const day = mineDay({ ...next, manual_pin: null }, { day: today, load: load || loadOf(await req(ts.getAll()), topicId), examDate, grade: patch.day_grade });
        next.manual_pin = null;
        if (day) next.next_revision_date = day;
      }
      // The day's grade undone: back to the mode's date from the state before
      // it (no grade); the FSRS's only with nothing to go on.
      if (undone && next.fsrs && next.fsrs.state && mineMode()) {
        const day = mineDay(next, { day: today, load: load || loadOf(await req(ts.getAll()), topicId), examDate });
        if (day) next.next_revision_date = day;
      }
      // Dias fixos: a pick made in a log is that day's review, so its kAt (the
      // reviews done) follows the day — a log that closes the review later the
      // same day is the pick's, not one step more (reviewmode.js fixedStep). In
      // any mode: the step stays the topic's for when Dias fixos comes back. A
      // pick that never got its kAt (written where this block didn't run)
      // takes it now.
      const RM = g.NotesReviewMode, pick = next.fixed_pick;
      if (RM && pick && typeof pick === 'object' && (pick.day === today || pick.kAt == null)) {
        const kAt = RM.reviewsDone(next);
        if (pick.kAt !== kAt) next.fixed_pick = { ...pick, kAt };
      }
      // Dias fixos: a new grade, the grade undone or the pick changed → the
      // sequence's date (a new grade drops the pinned date: the review
      // happened); no FSRS to go on keeps the date it has.
      if (fixedMode()) {
        if (regraded) next.manual_pin = null;
        if (regraded || undone || extra.pickChanged) {
          const day = fixedDayOf(next, { day: today, examDate });
          if (day) next.next_revision_date = day;
        }
      }
    }
    if (local) {
      if (JSON.stringify(next) === JSON.stringify(x)) return;
      ts.put(next);
      if (next.graded_on && next.graded_on !== x.graded_on) enq(t, 'topic', topicId);
      return;
    }
    ts.put({ ...next, updatedAt: Date.now() });
    enq(t, 'topic', topicId);
  }
  // The modules' summaries (the cards' retention, the essays' grade), when
  // their modules are loaded (not in the service worker).
  const summaryAll = () => (cards, essays, tries) => ({
    ...(g.NotesFlashcards && g.NotesFlashcards.summary ? g.NotesFlashcards.summary(cards) : {}),
    ...(g.NotesEssays && g.NotesEssays.summary ? g.NotesEssays.summary(cards, essays, tries) : {})
  });

  // ─── QUESTÕES ────────────────────────────────────────────────────────────
  // The score v3 (score.js, topicsched.js): an answer counts once a day per
  // question (the first), a retry never; the accuracy has the guess
  // discounted — 1/alternatives in multiple choice, 1/2 in Certo/Errado,
  // where that is the exam's own net score (right − wrong, blank neutral).
  const localDay = ms => { const d = new Date(ms); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
  const dayShift = (day, n) => { const [y, m, d] = day.split('-').map(Number); return localDay(new Date(y, m - 1, d + n, 12).getTime()); };
  const chanceOf = q => (q && q.kind === 'ce' ? 0.5 : q && q.alts && q.alts.length >= 2 ? 1 / q.alts.length : 0.25);
  const firstAttempts = ans => {
    const seen = new Set(), out = [];
    for (const a of ans.slice().sort((x, y) => (x.at || 0) - (y.at || 0))) {
      if (a.retry) continue;
      const k = a.question + ':' + a.date;
      if (seen.has(k)) continue;
      seen.add(k); out.push(a);
    }
    return out;
  };
  // Groups of answers by their guess rate → { n, right, adj (0..1), net (C/E) }.
  function qGroups(ans, qsById, extra) {
    const g0 = new Map();
    const add = (chance, n, right, net) => { const k = String(chance); if (!g0.has(k)) g0.set(k, { chance, n: 0, right: 0, netSum: 0, ce: chance === 0.5 }); const x = g0.get(k); x.n += n; x.right += right; x.netSum += net; };
    ans.forEach(a => { const q = qsById.get(a.question); add(chanceOf(q), 1, a.ok ? 1 : 0, a.ok ? 1 : a.alt === null ? 0 : -1); });
    (extra || []).forEach(e => { if (e.n > 0) add(0.25, e.n, Math.min(e.n, e.right || 0), 0); });
    let n = 0, right = 0, adjSum = 0, ceN = 0, ceNet = 0;
    g0.forEach(x => {
      // C/E: the net score is the guess discounted; blank is neutral in it.
      const adj = x.ce ? Math.max(0, x.netSum / x.n) : Math.max(0, Math.min(1, (x.right / x.n - x.chance) / (1 - x.chance)));
      n += x.n; right += x.right; adjSum += adj * x.n;
      if (x.ce) { ceN += x.n; ceNet += x.netSum; }
    });
    return { n, right, adj: n ? adjSum / n : 0, net: ceN ? Math.max(0, ceNet / ceN) : null };
  }
  // A topic's questions in numbers: registered, answered (distinct, among
  // those still there), attempts and right ones; and the score's component:
  // the last 30 days of dated practice (the bank's first attempts + what each
  // "Registrar estudo" brought that day) — with nothing recent, everything,
  // the running total typed by hand included. manual: { total, correct }.
  function questionSummary(qs, ans, logs, today, manual) {
    const ids = new Set(qs.map(q => q.id)), byId = new Map(qs.map(q => [q.id, q]));
    const live = ans.filter(a => !a.retry);
    const since = dayShift(today, -29);
    const firsts = firstAttempts(ans);
    const recentA = firsts.filter(a => (a.date || '') >= since), recentL = (logs || []).filter(l => l.questions > 0 && (l.date || '') >= since).map(l => ({ n: l.questions, right: l.correct }));
    const inWindow = recentA.length + recentL.length > 0;
    // The whole history: every logged day plus what was typed by hand in
    // the running totals beyond them (the totals already include the logs:
    // studylog.js adds each log's questions to them).
    const allL = (logs || []).filter(l => l.questions > 0).map(l => ({ n: l.questions, right: l.correct }));
    const restN = Math.max(0, ((manual && manual.total) || 0) - allL.reduce((a, l) => a + l.n, 0)), restOk = Math.max(0, Math.min(restN, ((manual && manual.correct) || 0) - allL.reduce((a, l) => a + (l.right || 0), 0)));
    const grp = inWindow ? qGroups(recentA, byId, recentL)
      : qGroups(firsts, byId, allL.concat(restN > 0 ? [{ n: restN, right: restOk }] : []));
    // Few questions prove little: the component is pulled towards 0 while the
    // sample is small (10 questions → 63%, 20 → 86%, 30 → 95% of the accuracy).
    const C = 1 - Math.exp(-0.1 * grp.n);
    return {
      q_total: qs.length, q_answered: new Set(live.filter(a => ids.has(a.question)).map(a => a.question)).size,
      q_attempts: live.length, q_correct: live.filter(a => a.ok).length,
      q_n: grp.n, q_acc: grp.n ? Math.round(grp.right / grp.n * 100) : null, q_score: grp.n ? Math.round(100 * grp.adj * C) : null,
      q_net: grp.net === null ? null : Math.round(grp.net * 100), q_window: inWindow ? '30d' : 'all'
    };
  }
  // The day's measured practice as topicsched items: the questions (first
  // attempts, the guess discounted on the day's set), the cards (Errei 0 ·
  // Difícil 0,5 · Bom/Fácil 1), the essays' content, the mistakes of an
  // external mock typed in that day (records.mockErrs).
  function dayItems(records, qsById, day) {
    const out = [];
    const ans = firstAttempts(records.ans || []).filter(a => a.date === day);
    if (ans.length) { const grp = qGroups(ans, qsById, []); for (let i = 0; i < grp.n; i++) out.push({ kind: 'q', ok: grp.adj }); }
    // The questions typed in that day's "Registrar estudo" (done outside the Notes): up to 50 items.
    const typed = (records.logs || []).filter(l => l.date === day && l.questions > 0).map(l => ({ n: l.questions, right: l.correct }));
    if (typed.length) { const grp = qGroups([], qsById, typed); for (let i = 0; i < Math.min(50, grp.n); i++) out.push({ kind: 'q', ok: grp.adj }); }
    (records.revs || []).filter(r => r.date === day).forEach(r => out.push({ kind: 'card', ok: r.grade === 1 ? 0 : r.grade === 2 ? 0.5 : 1 }));
    (records.tries || []).filter(r => r.date === day).forEach(r => out.push({ kind: 'essay', ok: Math.max(0, Math.min(1, (typeof r.content === 'number' ? r.content : r.score || 0) / 100)) }));
    // The mind map's review mode, when its last review was that day (records.map = { last, mastery }).
    const mp = records.map;
    if (mp && mp.last && typeof mp.mastery === 'number' && localDay(new Date(mp.last).getTime()) === day) out.push({ kind: 'map', ok: Math.max(0, Math.min(1, mp.mastery / 100)) });
    for (let i = 0; i < (records.mockErrs || 0); i++) out.push({ kind: 'mockerr', ok: 0 });
    return out;
  }
  const Q_STORES = ['questions', 'qtexts', 'qanswers', 'topics', 'logs', 'cardrevs', 'essayres', 'cards', 'essays'];
  const listQuestions = topicId => tx(['questions'], 'readonly', t => topicId
    ? req(t.objectStore('questions').index('topic').getAll(topicId))
    : req(t.objectStore('questions').getAll()));
  const getQuestion = id => tx(['questions'], 'readonly', t => req(t.objectStore('questions').get(id))).then(r => r || null);
  const listQTexts = () => tx(['qtexts'], 'readonly', t => req(t.objectStore('qtexts').getAll()));
  const getQText = id => id ? tx(['qtexts'], 'readonly', t => req(t.objectStore('qtexts').get(id))).then(r => r || null) : Promise.resolve(null);
  const listQAnswers = topicId => tx(['qanswers'], 'readonly', t => topicId
    ? req(t.objectStore('qanswers').index('topic').getAll(topicId))
    : req(t.objectStore('qanswers').getAll()));
  // Questions (and the texts they share) saved; their topics — and the one a
  // question left — brought up to date.
  function putQuestions(list, texts) {
    return wtx(Q_STORES, async t => {
      const qs = t.objectStore('questions'), now = Date.now(), touched = new Set();
      (texts || []).forEach(x => { t.objectStore('qtexts').put({ ...x, updatedAt: now }); enq(t, 'qtext', x.id); });
      for (const q of list) {
        const old = await req(qs.get(q.id));
        if (old && old.topic !== q.topic) touched.add(old.topic);
        qs.put({ ...q, updatedAt: now }); enq(t, 'question', q.id); touched.add(q.topic);
      }
      for (const id of touched) if (id) await refreshTopic(t, id);
    });
  }
  // Questions out (their answers stay in the history; they no longer count
  // in the coverage).
  function deleteQuestions(ids) {
    return wtx(Q_STORES, async t => {
      const qs = t.objectStore('questions'), touched = new Set();
      for (const id of ids) { const q = await req(qs.get(id)); if (q) touched.add(q.topic); qs.delete(id); enq(t, 'question', id); }
      for (const id of touched) if (id) await refreshTopic(t, id);
    });
  }
  // An attempt (appended) and the topic's numbers.
  function putAnswers(list) {
    return wtx(Q_STORES, async t => {
      const touched = new Set();
      list.forEach(a => { t.objectStore('qanswers').put(a); enq(t, 'qanswer', a.id); touched.add(a.topic); });
      for (const id of touched) if (id) await refreshTopic(t, id);
    });
  }
  // "Zerar": the attempts of these topics go.
  function deleteAnswers(topicIds) {
    return wtx(Q_STORES, async t => {
      const st = t.objectStore('qanswers');
      for (const id of topicIds) {
        for (const a of await req(st.index('topic').getAll(id))) { st.delete(a.id); enq(t, 'qanswer', a.id); }
        await refreshTopic(t, id);
      }
    });
  }

  // Every topic's summaries and evidence again (after a restore): summary
  // gives the modules' fields; patch(topic) anything else (the map's).
  // { local: true }: the recount of this device only (refreshTopic) — it
  // queues nothing, and goes through past the space limit.
  async function refreshTopics(ids, summary, patch, opt) {
    const local = !!(opt && opt.local);
    for (let i = 0; i < ids.length; i += 100) {
      const part = ids.slice(i, i + 100);
      const extra = patch ? await Promise.all(part.map(id => patch(id))) : [];
      const work = async t => {
        for (const [k, id] of part.entries()) {
          await refreshTopic(t, id, summary, local);
          if (!extra[k]) continue;
          const st = t.objectStore('topics'); const x = await req(st.get(id));
          if (x && (!local || Object.keys(extra[k]).some(f => JSON.stringify(x[f]) !== JSON.stringify(extra[k][f])))) st.put({ ...x, ...extra[k] });
        }
      };
      // The local recount queues nothing, so it doesn't wake the sync either.
      await (local ? tx(Q_STORES, 'readwrite', work) : wtx(Q_STORES, work));
    }
  }

  // Score v3, once per device (app.js): every topic's FSRS rebuilt from its
  // history (topicsched.rebuild), its summaries refreshed, and the overdue
  // reviews spread over the next days (topicsched.spread) — written locally,
  // without the outbox: every device works the same thing out of the same
  // records. → { topics, moved }.
  async function rebuildSchedules() {
    const TS = g.NotesTopicSched, SC = g.NotesScore;
    if (!TS || !SC) return { topics: 0, moved: 0 };
    const today = localDay(Date.now());
    const [tops, mocks] = await Promise.all([listTopics(), listMocks()]);
    const errsOf = new Map();   // topic → Map(day → mistakes), from the external mocks
    mocks.forEach(m => {
      if (m.status && m.status !== 'done') return;
      (m.errors || []).forEach(e => { if (!e.topic) return; if (!errsOf.has(e.topic)) errsOf.set(e.topic, new Map()); const dm = errsOf.get(e.topic); dm.set(m.date, (dm.get(m.date) || 0) + 1); });
    });
    const rebuilt = [];
    const live = tops.filter(x => !x.is_folder);
    for (let i = 0; i < live.length; i += 50) {
      const part = live.slice(i, i + 50);
      await tx(Q_STORES, 'readwrite', async t => {
        const ts = t.objectStore('topics');
        for (const x0 of part) {
          const x = await req(ts.get(x0.id));
          if (!x) continue;
          const [cards, revs, logs, essays, tries, qs, ans] = await Promise.all([
            req(t.objectStore('cards').index('topic').getAll(x.id)), req(t.objectStore('cardrevs').index('topic').getAll(x.id)),
            req(t.objectStore('logs').index('topic').getAll(x.id)), req(t.objectStore('essays').index('topic').getAll(x.id)),
            req(t.objectStore('essayres').index('topic').getAll(x.id)), req(t.objectStore('questions').index('topic').getAll(x.id)),
            req(t.objectStore('qanswers').index('topic').getAll(x.id))
          ]);
          const dm = errsOf.get(x.id);
          const avail = { questions: qs.length, cards: cards.filter(c => !c.suspended && !c.editLater).length, essays: essays.length, mapNodes: x.map_mastery === null || x.map_mastery === undefined ? 0 : 5 };
          const examDate = g.NotesGoals && g.NotesGoals.examDateFor ? g.NotesGoals.examDateFor(x) : null;
          const p = TS.rebuild(x, { ans, revs, tries, logs, map: { last: x.map_last_review, mastery: x.map_mastery }, mocks: dm ? [...dm].map(([date, errs]) => ({ date, errs })) : [], avail, examDate, target: targetOf(x) }, new Map(qs.map(q => [q.id, q])), today, dayItems);
          const next = { ...x, ...evidenceOf(logs, revs.concat(tries, ans)),
            ...questionSummary(qs, ans, logs, today, { total: x.total_questions || 0, correct: x.correct_answers || 0 }),
            ...summaryAll()(cards, essays, tries), ...(p || {}) };
          ts.put(next);
          if (p) rebuilt.push(next);
        }
      });
    }
    const list = rebuilt.map(x => ({ id: x.id, due: x.next_revision_date, priority: SC.priority(x, SC.breakdown(x), {}) }));
    const late = list.filter(x => x.due && x.due < today).length;
    const placed = TS.spread(list, today, Math.max(5, Math.ceil(late / 7)));
    let moved = 0;
    await tx(['topics'], 'readwrite', async t => {
      const ts = t.objectStore('topics');
      for (const [id, day] of placed) {
        const x = await req(ts.get(id));
        if (!x || !day || x.next_revision_date === day) continue;
        moved++;
        ts.put({ ...x, next_revision_date: day, fsrs: x.fsrs ? { ...x.fsrs, due: new Date(TS.dayNoon(day)).toISOString() } : x.fsrs });
      }
    });
    return { topics: rebuilt.length, moved };
  }

  // ─── DISCURSIVAS AND SIMULADOS ───────────────────────────────────────────
  const listEssays = topicId => tx(['essays'], 'readonly', t => topicId
    ? req(t.objectStore('essays').index('topic').getAll(topicId))
    : req(t.objectStore('essays').getAll()));
  const listEssayRes = () => tx(['essayres'], 'readonly', t => req(t.objectStore('essayres').getAll()));
  // Saves questions (and an attempt), then refreshes their topics — and the
  // topic a question left, when it moved (from).
  async function putEssays(essays, attempt, summary, from) {
    return wtx(['essays', 'essayres', 'topics', 'logs', 'cards', 'cardrevs', 'questions', 'qanswers'], async t => {
      const es = t.objectStore('essays'), now = Date.now();
      essays.forEach(e => { es.put({ ...e, updatedAt: now }); enq(t, 'essay', e.id); });
      if (attempt) { t.objectStore('essayres').put(attempt); enq(t, 'essayres', attempt.id); }
      const ids = new Set(essays.map(e => e.topic).concat(attempt ? [attempt.topic] : []).concat(from ? [from] : []).filter(Boolean));
      for (const id of ids) await refreshTopic(t, id, summary);
    });
  }
  // A question goes with its attempts.
  async function deleteEssay(id, summary) {
    return wtx(['essays', 'essayres', 'topics', 'logs', 'cards', 'cardrevs', 'questions', 'qanswers'], async t => {
      const es = t.objectStore('essays'), rs = t.objectStore('essayres');
      const e = await req(es.get(id));
      es.delete(id); enq(t, 'essay', id);
      if (!e) return;
      (await req(rs.index('topic').getAll(e.topic))).filter(r => r.essay === id).forEach(r => { rs.delete(r.id); enq(t, 'essayres', r.id); });
      await refreshTopic(t, e.topic, summary);
    });
  }
  // The Mural: tasks / notes and the Kanban's columns.
  const listTasks = () => tx(['tasks'], 'readonly', t => req(t.objectStore('tasks').getAll()));
  const putTasks = list => wtx(['tasks'], t => { const now = Date.now(); list.forEach(x => { t.objectStore('tasks').put({ ...x, updatedAt: now }); enq(t, 'task', x.id); }); });
  const deleteTasks = ids => wtx(['tasks'], t => { ids.forEach(id => { t.objectStore('tasks').delete(id); enq(t, 'task', id); }); });

  // ─── ESTANTE ─────────────────────────────────────────────────────────────
  // A book: a PDF on a subject's shelf — { id, title, subject_id, topic_id
  // (or null), file (the PDF's blob), cover (a small WebP of page 1), pages,
  // size, last_page, opened_at, createdAt, updatedAt }.
  const listBooks = () => tx(['books'], 'readonly', t => req(t.objectStore('books').getAll()));
  const getBook = id => tx(['books'], 'readonly', t => req(t.objectStore('books').get(id))).then(b => b || null);
  const putBook = b => wtx(['books'], t => { const x = { ...b, updatedAt: Date.now() }; t.objectStore('books').put(x); enq(t, 'book', x.id); return x; });
  // Where the reading stopped: a small change, never blocked by a full cloud.
  const readBook = (id, page) => wtx(['books'], async t => {
    const b = await req(t.objectStore('books').get(id));
    if (!b) return;
    t.objectStore('books').put({ ...b, last_page: page, opened_at: Date.now(), updatedAt: Date.now() }); enq(t, 'book', id);
  });
  const deleteBook = id => wtx(['books'], t => { t.objectStore('books').delete(id); enq(t, 'book', id); });
  const listTaskCols = () => tx(['taskcols'], 'readonly', t => req(t.objectStore('taskcols').getAll()))
    .then(l => l.sort((a, b) => (a.order || 0) - (b.order || 0)));
  const putTaskCols = list => wtx(['taskcols'], t => { const now = Date.now(); list.forEach(x => { t.objectStore('taskcols').put({ ...x, updatedAt: now }); enq(t, 'taskcol', x.id); }); });
  // A column out: its cards go to `to`.
  const deleteTaskCol = (id, to) => wtx(['taskcols', 'tasks'], async t => {
    t.objectStore('taskcols').delete(id); enq(t, 'taskcol', id);
    const st = t.objectStore('tasks');
    for (const x of await req(st.getAll())) if (x.col === id) { st.put({ ...x, col: to, updatedAt: Date.now() }); enq(t, 'task', x.id); }
  });

  // The bank of grading rules.
  const listRules = () => tx(['rules'], 'readonly', t => req(t.objectStore('rules').getAll()))
    .then(a => a.sort((x, y) => x.name.localeCompare(y.name, undefined, { sensitivity: 'base', numeric: true })));
  const getRule = id => id ? tx(['rules'], 'readonly', t => req(t.objectStore('rules').get(id))).then(r => r || null) : Promise.resolve(null);
  const putRule = r => wtx(['rules'], t => { t.objectStore('rules').put({ ...r, updatedAt: Date.now() }); enq(t, 'rule', r.id); });
  // A rule goes; the questions that used it go back to the general rule.
  const deleteRule = id => wtx(['rules', 'essays'], async t => {
    t.objectStore('rules').delete(id); enq(t, 'rule', id);
    const es = t.objectStore('essays');
    (await req(es.getAll())).forEach(e => { if (e.rule_id === id) { es.put({ ...e, rule_id: null, updatedAt: Date.now() }); enq(t, 'essay', e.id); } });
  });
  // The review mode's preference (reviewmode.js): one synced record, id 'review'.
  // db.js also runs in the service worker, where reviewmode.js is not loaded,
  // hence the local copy of the defaults. reviewPrefsCached is synchronous (a
  // transaction may call it): the last one read, refreshed by get/put and by a
  // pref that comes from the sync.
  const PREF_DEFAULTS = { id: 'review', mode: 'auto', times: 5, pace: 'balanced', days: [0, 1, 2, 3, 4, 5, 6], cap: 0, decide: 'notes', steps: [1, 7, 15, 30, 60], intro: null };
  const prefDefaults = () => (g.NotesReviewMode && g.NotesReviewMode.DEFAULTS) || PREF_DEFAULTS;
  let prefsCache = null;
  const mergePrefs = rec => ({ ...prefDefaults(), ...(rec || {}) });
  function setPrefsCache(rec, notify) {
    prefsCache = mergePrefs(rec);
    if (notify) { try { if (typeof document !== 'undefined') document.dispatchEvent(new CustomEvent('bn-review-mode-changed')); } catch (_) {} }
    return prefsCache;
  }
  const reviewPrefsCached = () => prefsCache || mergePrefs(null);
  const getReviewPrefs = () => tx(['prefs'], 'readonly', t => req(t.objectStore('prefs').get('review')))
    .then(r => setPrefsCache(r, false));
  // opt { system: true }: the app's own note (the modal's `intro` day), saved even
  // past the cloud's space; what the person chooses goes without it.
  const putReviewPrefs = (patch, opt) => wtx(['prefs'], async t => {
    const st = t.objectStore('prefs');
    const rec = { ...mergePrefs(await req(st.get('review'))), ...patch, id: 'review', updatedAt: Date.now() };
    st.put(rec); enq(t, 'pref', 'review');
    return rec;
  }, opt).then(rec => setPrefsCache(rec, true));
  // The other preferences, one synced record each ('cards': the flashcards'
  // { newPerDay }). prefCached is synchronous: the last one read or written,
  // or that came from the sync (null: not read yet, or never saved).
  const prefsMemo = new Map();
  const prefCached = id => prefsMemo.get(id) || null;
  const getPref = id => tx(['prefs'], 'readonly', t => req(t.objectStore('prefs').get(id)))
    .then(r => { prefsMemo.set(id, r || null); return r || null; });
  const putPref = (id, patch) => wtx(['prefs'], async t => {
    const st = t.objectStore('prefs');
    const rec = { ...(await req(st.get(id)) || {}), ...patch, id, updatedAt: Date.now() };
    st.put(rec); enq(t, 'pref', id);
    return rec;
  }).then(rec => { prefsMemo.set(id, rec); return rec; });
  // "Do meu jeito": the queue dates of the started topics with an FSRS (all,
  // or those in `only`, a Set of ids) by the mode's rule, inside a write — the
  // pinned ones first (they count on the calendar and don't move; a pin on or
  // after the exam is dropped and the topic goes by the rule), then the rest
  // in priority order (score.js, as the queue ranks them), so the daily cap
  // goes to the most needed. o.respread: the overdue (due today or before) are
  // spread from today on, the highest priority first; without it they stay as
  // they are (still due). The others: the mode's date counted from their last
  // review; one already gone is placed from tomorrow; nothing to go on (no
  // exam, no stability) keeps the date it has. o.fsrsFirst: what is overdue is
  // read from fsrs.due (the switch from the automatic mode). fsrs is never
  // touched. o: { today, only, respread, fsrsFirst, weights: Map }.
  async function mineRequeue(t, o) {
    const TS = g.NotesTopicSched, SC = g.NotesScore, G = g.NotesGoals, RM = g.NotesReviewMode, p = reviewPrefsCached();
    const ts = t.objectStore('topics'), now = Date.now(), today = o.today, weights = o.weights || new Map();
    const all = await req(ts.getAll());
    const save = (x, patch) => {
      if (Object.keys(patch).every(k => (x[k] === undefined ? null : x[k]) === patch[k])) return;
      ts.put({ ...x, ...patch, updatedAt: now }); enq(t, 'topic', x.id);
    };
    const live = all.filter(x => !x.is_folder), todo = live.filter(x => x.status && x.fsrs && (!o.only || o.only.has(x.id)));
    const ids = new Set(todo.map(x => x.id));
    const load = loadOf(live.filter(x => !ids.has(x.id)));
    const bump = d => load.set(d, (load.get(d) || 0) + 1);
    const pinned = todo.filter(x => x.manual_pin && x.manual_pin >= today && !RM.pinPastExam(x.manual_pin, today, examOf(x)));
    pinned.forEach(x => { bump(x.manual_pin); save(x, { next_revision_date: x.manual_pin }); });
    // A pinned date already gone (or past the exam) goes with the rest.
    const unpin = x => (x.manual_pin ? { manual_pin: null } : {});
    // From today on (`from`: today itself allowed or not), on the allowed
    // days, under the cap, never past the eve of the exam.
    const placeFrom = (x, from, inclusive) => RM.placeDay({ today: inclusive ? TS.addDays(from, -1) : from, want: inclusive ? from : TS.addDays(from, 1), examDate: examOf(x), days: p.days, cap: p.cap, load });
    const fsrsDay = x => (x.fsrs.due ? TS.dayOf(new Date(x.fsrs.due).getTime()) : null);
    const queueDate = x => (o.fsrsFirst ? fsrsDay(x) || x.next_revision_date : x.next_revision_date || fsrsDay(x)) || null;
    const prio = new Map(todo.map(x => {
      if (!SC) return [x.id, 0];
      const exam = examOf(x);
      return [x.id, SC.priority(x, SC.breakdown(x), { daysToExam: exam && G && G.daysTo ? G.daysTo(exam) : null, subjectWeight: weights.get(x.subject_id) || null })];
    }));
    const rest = todo.filter(x => !pinned.includes(x)).sort((a, b) => prio.get(b.id) - prio.get(a.id)
      || String(a.next_revision_date || '').localeCompare(String(b.next_revision_date || '')) || String(a.id).localeCompare(String(b.id)));
    const overdue = x => !!(queueDate(x) && queueDate(x) <= today);
    for (const x of rest.filter(overdue)) {
      if (!o.respread) { bump(x.next_revision_date); save(x, unpin(x)); continue; }
      const day = placeFrom(x, today, true);
      bump(day); save(x, { next_revision_date: day, ...unpin(x) });
    }
    for (const x of rest.filter(x => !overdue(x))) {
      const from = x.fsrs.last_review ? TS.dayOf(new Date(x.fsrs.last_review).getTime()) : today;
      let day = mineDay({ ...x, manual_pin: null }, { day: from, load, examDate: examOf(x) });
      if (day && day <= today) day = placeFrom(x, today, false);
      if (day || x.next_revision_date) bump(day || x.next_revision_date);
      save(x, { ...(day ? { next_revision_date: day } : {}), ...unpin(x) });
    }
  }
  const subjectWeightsOf = () => (g.NotesPlan && g.NotesPlan.subjectWeights ? g.NotesPlan.subjectWeights().catch(() => new Map()) : Promise.resolve(new Map()));
  // Dias fixos: the queue dates of the started topics with an FSRS (all, or
  // those in `only`, a Set of ids) by the sequence, inside a write: the day of
  // the last review + the step's gap, never past the eve of the exam. A pinned
  // date still ahead stays; one gone (or on/after the exam) is dropped. A date
  // already gone stays gone, overdue (no spread: the dates are exact). Nothing
  // to go on (no FSRS) keeps the date it has. fsrs is never touched.
  // o: { today, only }.
  async function fixedRequeue(t, o) {
    const RM = g.NotesReviewMode, ts = t.objectStore('topics'), now = Date.now();
    for (const x of await req(ts.getAll())) {
      if (x.is_folder || !x.status || !x.fsrs || (o.only && !o.only.has(x.id))) continue;
      const examDate = examOf(x);
      const keepPin = x.manual_pin && x.manual_pin >= o.today && !RM.pinPastExam(x.manual_pin, o.today, examDate);
      const day = fixedDayOf(x, { day: o.today, examDate });
      const patch = { ...(day ? { next_revision_date: day } : {}), ...(x.manual_pin && !keepPin ? { manual_pin: null } : {}) };
      if (Object.keys(patch).every(k => (x[k] === undefined ? null : x[k]) === patch[k])) continue;
      ts.put({ ...x, ...patch, updatedAt: now }); enq(t, 'topic', x.id);
    }
  }
  // The review mode chosen: the pref saved, then every topic's queue date
  // follows it in one write. 'mine': mineRequeue over every topic. 'fixed':
  // fixedRequeue over every topic. 'auto': the FSRS's date back on every
  // topic that has one, the pins gone.
  async function setReviewMode(mode) {
    mode = mode === 'mine' || mode === 'fixed' ? mode : 'auto';
    const was = reviewPrefsCached().mode;
    await putReviewPrefs({ mode });
    const TS = g.NotesTopicSched;
    const changed = () => { try { if (typeof document !== 'undefined') document.dispatchEvent(new CustomEvent('bn-study-changed')); } catch (_) {} };
    if (!TS || (mode !== 'auto' && !g.NotesReviewMode)) { changed(); return; }
    const today = localDay(Date.now());
    const weights = mode === 'mine' ? await subjectWeightsOf() : new Map();
    await wtx(['topics'], async t => {
      // Coming from the automatic mode, what is overdue is read from fsrs.due;
      // from Dias fixos (or mine itself), from the queue's date it had.
      if (mode === 'mine') return mineRequeue(t, { today, only: null, respread: true, fsrsFirst: was !== 'mine' && was !== 'fixed', weights });
      if (mode === 'fixed') return fixedRequeue(t, { today, only: null });
      const ts = t.objectStore('topics'), now = Date.now();
      (await req(ts.getAll())).forEach(x => {
        if (x.is_folder || !x.fsrs || !x.fsrs.due) return;
        const patch = { next_revision_date: TS.dayOf(new Date(x.fsrs.due).getTime()), manual_pin: null };
        if (Object.keys(patch).every(k => (x[k] === undefined ? null : x[k]) === patch[k])) return;
        ts.put({ ...x, ...patch, updatedAt: now }); enq(t, 'topic', x.id);
      });
    }, { system: true });
    changed();
  }
  // "Do meu jeito" and Dias fixos: an objetivo saved, changed or gone
  // (`before`, `after`: the records, null when there is none). When what
  // decides the exam of its topics changed (the date, what is in it, done or
  // not), the queue dates of its topics (before and after) are derived again
  // by the mode's rule with the same k, the overdue staying due — after the
  // contest write, in a write of its own, with the goals' cache read again so
  // examDateFor sees the change.
  async function requeueForContest(before, after) {
    if (!manualMode() || !g.NotesTopicSched) return;
    const key = c => (c ? JSON.stringify([c.examDate || null, c.status || null, [...(c.subjects || [])].sort(), [...(c.topics || [])].sort()]) : null);
    if (key(before) === key(after)) return;
    const G = g.NotesGoals;
    if (G && G.load) { try { await G.load(); } catch (_) {} }
    const subs = new Set(), tops = new Set();
    [before, after].forEach(c => { if (c) { (c.subjects || []).forEach(x => subs.add(x)); (c.topics || []).forEach(x => tops.add(x)); } });
    if (!subs.size && !tops.size) return;
    const fixed = fixedMode();
    const weights = fixed ? new Map() : await subjectWeightsOf();
    const today = localDay(Date.now());
    await wtx(['topics'], async t => {
      const only = new Set((await req(t.objectStore('topics').getAll())).filter(x => subs.has(x.subject_id) || tops.has(x.id)).map(x => x.id));
      if (!only.size) return;
      if (fixed) await fixedRequeue(t, { today, only });
      else await mineRequeue(t, { today, only, respread: false, fsrsFirst: false, weights });
    }, { system: true });
    try { if (typeof document !== 'undefined') document.dispatchEvent(new CustomEvent('bn-study-changed')); } catch (_) {}
  }
  const getTopicNow = id => tx(['topics'], 'readonly', t => req(t.objectStore('topics').get(id))).then(r => r || null);
  // "Do meu jeito" and Dias fixos: the person sets the topic's next review
  // day herself (the calendar, the panel). It stays until the review happens
  // (refreshTopic). In the automatic mode, nothing.
  async function pinReview(topicId, day) {
    if (!manualMode() || !/^\d{4}-\d{2}-\d{2}$/.test(String(day || ''))) return getTopicNow(topicId);
    return wtx(['topics'], async t => {
      const ts = t.objectStore('topics');
      const x = await req(ts.get(topicId));
      if (!x || x.is_folder) return x || null;
      // Never before tomorrow, never on or after the exam day.
      const exam = examOf(x);
      if (day <= localDay(Date.now()) || (exam && day >= exam)) return x;
      const out = { ...x, manual_pin: day, next_revision_date: day, updatedAt: Date.now() };
      ts.put(out); enq(t, 'topic', topicId);
      return out;
    });
  }
  // The day a topic is due in the queue, by the mode (reviews.js queueDay): the
  // FSRS's in the automatic mode, the mode's own date in the manual ones.
  const queueDateOf = x => {
    const fsrsDay = x.fsrs && x.fsrs.due ? g.NotesTopicSched.dayOf(new Date(x.fsrs.due).getTime()) : null;
    return (manualMode() ? x.next_revision_date || fsrsDay : fsrsDay || x.next_revision_date) || null;
  };
  // "Redistribuir" (spec §5), the plan: of `items` ([{ id, priority }], the
  // overdue the screen shows) those still overdue by the queue's date, and where
  // reviewmode.js redistribute puts them. The per-day load is every other
  // topic's queue date (the real calendar, not only the visible ones). The cap
  // is the person's own in "Do meu jeito" (weekdays too); else max(5, ⌈N/7⌉).
  // → { late: [topic], placed: Map(id → day), cap }.
  function planRedistribute(all, items, today) {
    const RM = g.NotesReviewMode, p = reviewPrefsCached(), mine = mineMode();
    const byId = new Map(all.map(x => [x.id, x]));
    const late = [];
    new Map((items || []).map(it => [it.id, it])).forEach((it, id) => {
      const x = byId.get(id), day = x && !x.is_folder ? queueDateOf(x) : null;
      if (day && day < today) late.push({ x, priority: it.priority || 0 });
    });
    const moving = new Set(late.map(l => l.x.id)), load = new Map();
    all.forEach(x => { const d = x.is_folder || moving.has(x.id) ? null : queueDateOf(x); if (d) load.set(d, (load.get(d) || 0) + 1); });
    const cap = mine && p.cap > 0 ? p.cap : Math.max(5, Math.ceil(late.length / 7));
    const placed = RM.redistribute(late.map(l => ({ id: l.x.id, priority: l.priority, eve: RM.examEve(today, examOf(l.x)) })), { today, load, cap, days: mine ? p.days : [] });
    return { late: late.map(l => l.x), placed, cap };
  }
  const untilOf = placed => [...placed.values()].sort().pop() || null;
  // Spreads the overdue reviews over the coming days, from tomorrow, the most
  // important first (reviewmode.js redistribute). Automatic: next_revision_date
  // and fsrs.due together (as rebuildSchedules); the stability stays, so the
  // FSRS counts the real delay. Manual modes: the queue's date, pinned (so a
  // requeue — the mode chosen again, an exam moved — keeps it; the review
  // clears it as always); the FSRS is not touched. dryRun: only the numbers
  // (for the confirmation). → { moved, until, cap, undo }, undo: [{ id, to,
  // next_revision_date, due, manual_pin }] for undoRedistribute.
  async function redistributeLate(items, opt) {
    const TS = g.NotesTopicSched, RM = g.NotesReviewMode;
    const none = { moved: 0, until: null, cap: 0 };
    if (!TS || !RM) return opt && opt.dryRun ? none : { ...none, undo: [] };
    const today = localDay(Date.now());
    if (opt && opt.dryRun) {
      const plan = await tx(['topics'], 'readonly', async t => planRedistribute(await req(t.objectStore('topics').getAll()), items, today));
      return { moved: plan.placed.size, until: untilOf(plan.placed), cap: plan.cap };
    }
    const manual = manualMode(), undo = [];
    // A bulk re-dating like setReviewMode: it adds no space, so the cloud's
    // quota lock does not stop it.
    const plan = await wtx(['topics'], async t => {
      const ts = t.objectStore('topics'), now = Date.now();
      const plan = planRedistribute(await req(ts.getAll()), items, today);
      for (const x of plan.late) {
        const day = plan.placed.get(x.id);
        undo.push({ id: x.id, to: day, next_revision_date: x.next_revision_date || null, due: x.fsrs ? x.fsrs.due || null : null, manual_pin: x.manual_pin || null });
        const patch = manual ? { next_revision_date: day, manual_pin: day }
          : { next_revision_date: day, ...(x.fsrs && x.fsrs.due ? { fsrs: { ...x.fsrs, due: new Date(TS.dayNoon(day)).toISOString() } } : {}) };
        ts.put({ ...x, ...patch, updatedAt: now }); enq(t, 'topic', x.id);
      }
      return plan;
    }, { system: true });
    return { moved: plan.placed.size, until: untilOf(plan.placed), cap: plan.cap, undo };
  }
  // Takes back a redistribution (the entries redistributeLate returned): the
  // previous date, FSRS due and pin, only for the topics still on the date it
  // gave them (one reviewed or moved since keeps its own). → how many went back.
  async function undoRedistribute(undo) {
    const TS = g.NotesTopicSched;
    if (!TS || !(undo || []).length) return 0;
    return wtx(['topics'], async t => {
      const ts = t.objectStore('topics'), now = Date.now();
      let n = 0;
      for (const e of undo) {
        const x = await req(ts.get(e.id));
        if (!x || x.is_folder || queueDateOf(x) !== e.to) continue;
        const patch = { next_revision_date: e.next_revision_date };
        if ((x.manual_pin || null) !== e.manual_pin) patch.manual_pin = e.manual_pin;
        // Only the automatic mode moved fsrs.due, and it is on the date given then.
        if (x.fsrs && e.due && TS.dayOf(new Date(x.fsrs.due).getTime()) === e.to) patch.fsrs = { ...x.fsrs, due: e.due };
        ts.put({ ...x, ...patch, updatedAt: now }); enq(t, 'topic', x.id); n++;
      }
      return n;
    }, { system: true });
  }
  // "Do meu jeito" with "eu, com um toque": the review just done, the next one
  // sooner (×0.5), at the pace (×1) or later (×1.5) — the mode's date again
  // with the nudge; a pinned date gives way to it. Elsewhere, nothing.
  async function nudgeReview(topicId, nudge) {
    if (!mineMode() || reviewPrefsCached().decide !== 'me' || !['sooner', 'same', 'later'].includes(nudge)) return getTopicNow(topicId);
    const today = localDay(Date.now());
    return wtx(['topics'], async t => {
      const ts = t.objectStore('topics');
      const x = await req(ts.get(topicId));
      if (!x || x.is_folder || !x.fsrs) return x || null;
      const day = mineDay({ ...x, manual_pin: null }, { day: today, load: loadOf(await req(ts.getAll()), topicId), examDate: examOf(x), nudge });
      if (!day) return x;
      const out = { ...x, manual_pin: null, next_revision_date: day, updatedAt: Date.now() };
      ts.put(out); enq(t, 'topic', topicId);
      return out;
    });
  }
  const listMocks = () => tx(['mocks'], 'readonly', t => req(t.objectStore('mocks').getAll())).then(a => a.sort((x, y) => String(y.date).localeCompare(String(x.date)) || y.createdAt - x.createdAt));
  // A mock and what its errors say of their topics (difficulty, mastery);
  // errsByTopic (Map topic → mistakes typed in now, as a delta: negative
  // when an edit took some out): each counts as a question missed today in
  // that topic's score and grade (refreshTopic).
  async function putMock(m, topicPatches, errsByTopic) {
    return wtx(Q_STORES.concat(['mocks']), async t => {
      t.objectStore('mocks').put({ ...m, updatedAt: Date.now() }); enq(t, 'mock', m.id);
      const ts = t.objectStore('topics');
      for (const [id, patch] of topicPatches || []) {
        const x = await req(ts.get(id));
        if (!x) continue;
        ts.put({ ...x, ...patch, updatedAt: Date.now() }); enq(t, 'topic', id);
        // Harder than thought (the mock's mistakes raise the difficulty): it comes back sooner.
        if ('difficulty' in patch && patch.difficulty !== x.difficulty) await reweighTopic(t, id);
      }
      for (const [id, n] of errsByTopic || []) if (id && n) await refreshTopic(t, id, summaryAll(), false, { mockErrs: n });
    });
  }
  const deleteMock = id => wtx(['mocks'], t => { t.objectStore('mocks').delete(id); enq(t, 'mock', id); });
  // The concursos (each mock belongs to one), by name.
  const listContests = () => tx(['contests'], 'readonly', t => req(t.objectStore('contests').getAll())).then(a => a.sort((x, y) => String(x.name).localeCompare(String(y.name), 'pt')));
  // A requeue failure ("Do meu jeito") never fails the contest's own save.
  const requeueSafe = (before, after) => requeueForContest(before, after).catch(e => { try { console.warn('[notes] requeue', e); } catch (_) {} });
  async function putContest(c) {
    const before = await wtx(['contests'], async t => {
      const st = t.objectStore('contests'), old = await req(st.get(c.id));
      st.put({ ...c, updatedAt: Date.now() }); enq(t, 'contest', c.id);
      return old || null;
    });
    await requeueSafe(before, c);
  }
  // An objetivo changed from what it is now (the links marked on another
  // device in between aren't lost): f(current) → the new record.
  async function updateContest(id, f) {
    const r = await wtx(['contests'], async t => {
      const st = t.objectStore('contests'), c = await req(st.get(id));
      if (!c) return null;
      const next = f(c);
      st.put({ ...next, updatedAt: Date.now() }); enq(t, 'contest', id);
      return { before: c, after: next };
    });
    if (r) await requeueSafe(r.before, r.after);
  }
  // Some mocks moved to a concurso (or to none: null).
  const setMocksContest = (ids, contest) => wtx(['mocks'], async t => {
    const st = t.objectStore('mocks');
    for (const id of ids) {
      const m = await req(st.get(id));
      if (m && (m.contest || null) !== (contest || null)) { st.put({ ...m, contest: contest || null, updatedAt: Date.now() }); enq(t, 'mock', id); }
    }
  });
  // A concurso deleted: its mocks stay, without one.
  async function deleteContest(id) {
    const before = await wtx(['contests', 'mocks'], async t => {
      const old = await req(t.objectStore('contests').get(id));
      t.objectStore('contests').delete(id); enq(t, 'contest', id);
      const st = t.objectStore('mocks');
      (await req(st.getAll())).forEach(m => { if (m.contest === id) { st.put({ ...m, contest: null, updatedAt: Date.now() }); enq(t, 'mock', m.id); } });
      return old || null;
    });
    await requeueSafe(before, null);
  }
  // Flashcard simulados (cardmock.js), newest first.
  const listCardMocks = () => tx(['cardmocks'], 'readonly', t => req(t.objectStore('cardmocks').getAll())).then(a => a.sort((x, y) => (y.createdAt || 0) - (x.createdAt || 0)));
  const putCardMock = m => wtx(['cardmocks'], t => { t.objectStore('cardmocks').put({ ...m, updatedAt: Date.now() }); enq(t, 'cardmock', m.id); });
  const deleteCardMock = id => wtx(['cardmocks'], t => { t.objectStore('cardmocks').delete(id); enq(t, 'cardmock', id); });

  // ─── SESSIONS AND THE CYCLE ──────────────────────────────────────────────
  const listSessions = () => tx(['sessions'], 'readonly', t => req(t.objectStore('sessions').getAll()))
    .then(all => all.sort((a, b) => b.start - a.start));
  const getSession = id => tx(['sessions'], 'readonly', t => req(t.objectStore('sessions').get(id))).then(r => r || null);
  // opt { system: true }: a session that ended is saved even past the cloud's
  // space (timer.js) — it's small, and the hours studied can't be lost.
  const putSession = (x, opt) => wtx(['sessions'], t => { t.objectStore('sessions').put({ ...x, updatedAt: Date.now() }); enq(t, 'session', x.id); }, opt);
  const deleteSession = id => wtx(['sessions'], t => { t.objectStore('sessions').delete(id); enq(t, 'session', id); });
  const listCycles = () => tx(['cycles'], 'readonly', t => req(t.objectStore('cycles').getAll()));
  const activeCycle = () => listCycles().then(all => all.filter(c => c.active).sort((a, b) => b.updatedAt - a.updatedAt)[0] || null);
  const putCycle = (c, opt) => wtx(['cycles'], t => { t.objectStore('cycles').put({ ...c, updatedAt: Date.now() }); enq(t, 'cycle', c.id); }, opt);
  const deleteCycle = id => wtx(['cycles'], t => { t.objectStore('cycles').delete(id); enq(t, 'cycle', id); });

  async function getContent(topicId, kind) {
    return (await tx(['contents'], 'readonly', t => req(t.objectStore('contents').get(topicId + ':' + kind)))) || null;
  }
  async function putContent(topicId, kind, data) {
    const c = { id: topicId + ':' + kind, topic: topicId, kind, data, updatedAt: Date.now() };
    await wtx(['contents'], t => { t.objectStore('contents').put(c); enq(t, 'content', c.id); });
    return c;
  }
  // The Draw tab's notebooks: not the drawings of the mind map's nodes
  // (meta.mapNode), which open from their node.
  async function topicNotebooks(topicId) {
    return (await listNotebooks()).filter(m => m.topic === topicId && !m.mapNode);
  }

  // The subject everything without a place goes to.
  async function generalSubject(name) {
    const subs = await listSubjects();
    return subs.find(s => s.name === name) || createSubject(name, 'GER');
  }

  // Once: the library's folders become subjects, and each notebook a topic of
  // its own (in its folder's subject, or in the general one), with the
  // notebook in its Draw tab.
  async function migrateToSubjects(generalName) {
    if (await syncGet('migr:subjects')) return false;
    const metas = await listNotebooks();
    const folders = await tx(['folders'], 'readonly', t => req(t.objectStore('folders').getAll()));
    const lonely = metas.filter(m => !m.topic);
    if (lonely.length) {
      const subjectOf = new Map();
      for (const f of folders.sort(byName)) subjectOf.set(f.id, await createSubject(f.name));
      let general = null;
      for (const m of lonely.sort((a, b) => a.createdAt - b.createdAt)) {
        let sub = m.folder && subjectOf.get(m.folder);
        if (!sub) sub = general || (general = await generalSubject(generalName));
        const tp = await createTopic({ subject_id: sub.id, parent_id: null, name: m.title || '' });
        await updateTopic(tp.id, { notes_view_mode: 'draw' });
        await putMeta({ ...m, topic: tp.id });
      }
    }
    await syncSet('migr:subjects', Date.now());
    return lonely.length > 0;
  }
  // Notebooks with no topic (an old backup restored, a capture filed by an
  // older background) each get a topic in the general subject.
  async function adoptLonelyNotebooks(generalName) {
    const lonely = (await listNotebooks()).filter(m => !m.topic);
    if (!lonely.length) return 0;
    const g = await generalSubject(generalName);
    for (const m of lonely) {
      const tp = await createTopic({ subject_id: g.id, parent_id: null, name: m.title || '' });
      await updateTopic(tp.id, { notes_view_mode: 'draw' });
      await putMeta({ ...m, topic: tp.id });
    }
    return lonely.length;
  }

  // A capture from the bar, filed in a topic (null: the general subject's
  // "Caderno de erros", made if missing). It goes into the topic's most
  // recent notebook, or a new one named after the topic.
  async function appendImageToTopic(topicId, blob, w, h, newTitle, generalName) {
    let topic = topicId ? await getTopic(topicId) : null;
    if (!topic) {
      const g = await generalSubject(generalName);
      topic = (await listTopics(g.id)).find(x => x.name === newTitle && !x.parent_id)
        || await createTopic({ subject_id: g.id, parent_id: null, name: newTitle });
    }
    const books = await topicNotebooks(topic.id);   // most recently changed first
    let nbId = books.length ? books[0].id : null;
    if (!nbId) nbId = (await createNotebook({ title: topic.name, layout: 'pages', paper: 'blank', topic: topic.id })).meta.id;
    const res = await appendImage(nbId, blob, w, h, topic.name);
    return { ...res, topic: topic.id, topicName: topic.name };
  }

  // ─── WEB PAGES AND MARKS (Minhas marcações) ──────────────────────────────
  // The address a page is known by: no #fragment, no tracking parameters,
  // no trailing slash. Anything else in the query stays (?id=12 is a page).
  function normUrl(raw) {
    try {
      const u = new URL(raw);
      u.hash = '';
      [...u.searchParams.keys()].forEach(k => { if (/^(utm_|fbclid$|gclid$|mc_|ref$|ref_src$|igshid$|si$)/i.test(k)) u.searchParams.delete(k); });
      let s = u.toString();
      if (s.endsWith('/') && u.pathname !== '/') s = s.slice(0, -1);
      return s;
    } catch (e) { return String(raw || ''); }
  }
  const siteOf = url => { try { return new URL(url).hostname.replace(/^www\./, ''); } catch (e) { return ''; } };

  const listWebpages = () => tx(['webpages'], 'readonly', t => req(t.objectStore('webpages').getAll()))
    .then(all => all.sort((a, b) => b.updatedAt - a.updatedAt));
  const getWebpage = id => tx(['webpages'], 'readonly', t => req(t.objectStore('webpages').get(id))).then(r => r || null);
  const webpageByUrl = url => tx(['webpages'], 'readonly', t => req(t.objectStore('webpages').index('url').get(normUrl(url)))).then(r => r || null);
  const listMarks = () => tx(['marks'], 'readonly', t => req(t.objectStore('marks').getAll()));
  const getMark = id => tx(['marks'], 'readonly', t => req(t.objectStore('marks').get(id))).then(r => r || null);
  const pageMarks = pageId => tx(['marks'], 'readonly', t => req(t.objectStore('marks').index('page').getAll(pageId)));

  // The page at this address, made if missing; `info` ({ title, description })
  // fills what the page doesn't know yet.
  async function ensureWebpage(url, info) {
    const u = normUrl(url);
    return wtx(['webpages'], async t => {
      const st = t.objectStore('webpages');
      let w = await req(st.index('url').get(u));
      const now = Date.now();
      if (!w) {
        w = { id: uid(), url: u, title: '', site: siteOf(u), description: '', tags: [], topic: null, fav: false, createdAt: now, updatedAt: now };
      } else if ((!info || (w.title || !info.title) && (w.description || !info.description))) return w;
      if (info && info.title && !w.title) w.title = String(info.title).slice(0, 300);
      if (info && info.description && !w.description) w.description = String(info.description).slice(0, 600);
      w = { ...w, updatedAt: now };
      st.put(w); enq(t, 'webpage', w.id);
      return w;
    });
  }
  async function updateWebpage(id, patch) {
    return wtx(['webpages'], async t => {
      const st = t.objectStore('webpages');
      const w = await req(st.get(id));
      if (w) { st.put({ ...w, ...patch, id, updatedAt: Date.now() }); enq(t, 'webpage', id); }
    });
  }
  // The page and every mark on it.
  async function deleteWebpage(id) {
    return wtx(['webpages', 'marks', 'pageinks'], async t => {
      t.objectStore('webpages').delete(id); enq(t, 'webpage', id);
      const ms = t.objectStore('marks');
      (await req(ms.index('page').getAllKeys(id))).forEach(k => { ms.delete(k); enq(t, 'mark', k); });
      const is = t.objectStore('pageinks');
      (await req(is.index('page').getAllKeys(id))).forEach(k => { is.delete(k); enq(t, 'pageink', k); });
    });
  }
  // GooHighlights' hand annotations (highlights.js): one record per
  // stroke, tied to the page and to the passage nearest to it.
  const pageInks = pageId => tx(['pageinks'], 'readonly', t => req(t.objectStore('pageinks').index('page').getAll(pageId)));
  const listInks = () => tx(['pageinks'], 'readonly', t => req(t.objectStore('pageinks').getAll()));
  async function putInk(ink) {
    return wtx(['pageinks', 'webpages'], async t => {
      const now = Date.now();
      const st = t.objectStore('pageinks');
      const old = await req(st.get(ink.id));
      const it = { ...(old || { createdAt: now }), ...ink, updatedAt: now };
      st.put(it); enq(t, 'pageink', it.id);
      const ws = t.objectStore('webpages');
      const w = await req(ws.get(it.page));
      if (w) { ws.put({ ...w, updatedAt: now }); enq(t, 'webpage', w.id); }
      return it;
    });
  }
  async function deleteInk(id) {
    return wtx(['pageinks'], t => { t.objectStore('pageinks').delete(id); enq(t, 'pageink', id); });
  }
  // A new mark or a changed one ({ id } of one already stored: merged in).
  // The page's updatedAt moves too, so the most recently studied comes first.
  async function putMark(mark) {
    return wtx(['marks', 'webpages'], async t => {
      const st = t.objectStore('marks');
      const old = mark.id ? await req(st.get(mark.id)) : null;
      const now = Date.now();
      const m = old ? { ...old, ...mark, updatedAt: now }
        : { id: mark.id || uid(), page: mark.page, text: '', color: 'yellow', note: '', anchor: null, createdAt: now, ...mark, updatedAt: now };
      st.put(m); enq(t, 'mark', m.id);
      const ws = t.objectStore('webpages');
      const w = await req(ws.get(m.page));
      if (w) { ws.put({ ...w, updatedAt: now }); enq(t, 'webpage', w.id); }
      return m;
    });
  }
  async function deleteMark(id) {
    return wtx(['marks'], t => { t.objectStore('marks').delete(id); enq(t, 'mark', id); });
  }

  // ─── CADERNO DE ERROS (GooHighlights) ─────────────────────────────
  // Folders two levels deep (a folder and its subfolders); a capture lives in
  // either. Deleting a folder takes its subfolders and captures with it.
  const ERR_LEVELS = 2;
  const listErrFolders = () => tx(['errfolders'], 'readonly', t => req(t.objectStore('errfolders').getAll()))
    .then(all => all.sort((a, b) => (a.order || 0) - (b.order || 0) || a.name.localeCompare(b.name)));
  const listErrShots = () => tx(['errshots'], 'readonly', t => req(t.objectStore('errshots').getAll()))
    .then(all => all.sort((a, b) => b.createdAt - a.createdAt));
  const getErrShot = id => tx(['errshots'], 'readonly', t => req(t.objectStore('errshots').get(id))).then(r => r || null);
  async function createErrFolder(name, parent) {
    name = String(name || '').trim().slice(0, 120);
    if (!name) throw new Error('empty_name');
    return wtx(['errfolders'], async t => {
      const st = t.objectStore('errfolders');
      const all = await req(st.getAll());
      if (parent) {
        const p = all.find(f => f.id === parent);
        if (!p || p.parent) throw new Error('bad_parent');   // only two levels
      }
      const now = Date.now();
      const f = { id: uid(), name, parent: parent || null, order: all.filter(x => (x.parent || null) === (parent || null)).length, createdAt: now, updatedAt: now };
      st.put(f); enq(t, 'errfolder', f.id);
      return f;
    });
  }
  async function updateErrFolder(id, patch) {
    return wtx(['errfolders'], async t => {
      const st = t.objectStore('errfolders');
      const f = await req(st.get(id));
      if (!f) return null;
      const out = { ...f, ...('name' in patch ? { name: String(patch.name || '').trim().slice(0, 120) || f.name } : {}), ...('order' in patch ? { order: patch.order } : {}), updatedAt: Date.now() };
      st.put(out); enq(t, 'errfolder', id);
      return out;
    });
  }
  async function deleteErrFolder(id) {
    return wtx(['errfolders', 'errshots'], async t => {
      const fs = t.objectStore('errfolders'), ss = t.objectStore('errshots');
      const all = await req(fs.getAll());
      const ids = [id, ...all.filter(f => f.parent === id).map(f => f.id)];
      for (const fid of ids) {
        fs.delete(fid); enq(t, 'errfolder', fid);
        (await req(ss.index('folder').getAllKeys(fid))).forEach(k => { ss.delete(k); enq(t, 'errshot', k); });
      }
    });
  }
  // A capture (a Blob of the image) into a folder. `info`: { w, h, note, url, title }.
  async function addErrShot(folder, blob, info) {
    info = info || {};
    const img = await putBlob(blob);
    return wtx(['errshots'], async t => {
      const now = Date.now();
      const s = { id: uid(), folder, img: 'bnblob:' + img, w: +info.w || 0, h: +info.h || 0, note: String(info.note || '').slice(0, 4000),
        url: info.url ? normUrl(info.url) : '', title: String(info.title || '').slice(0, 300), createdAt: now, updatedAt: now };
      t.objectStore('errshots').put(s); enq(t, 'errshot', s.id);
      return s;
    });
  }
  // A passage of text into a folder (no picture). `info`: { html, text, note, url, title }.
  async function addErrText(folder, info) {
    info = info || {};
    const text = String(info.text || '').slice(0, 5000);
    if (!text.trim()) throw new Error('empty_text');
    return wtx(['errshots'], async t => {
      const now = Date.now();
      const s = { id: uid(), folder, img: '', html: String(info.html || '').slice(0, 20000), text, w: 0, h: 0, note: String(info.note || '').slice(0, 4000),
        url: info.url ? normUrl(info.url) : '', title: String(info.title || '').slice(0, 300), createdAt: now, updatedAt: now };
      t.objectStore('errshots').put(s); enq(t, 'errshot', s.id);
      return s;
    });
  }
  async function updateErrShot(id, patch) {
    return wtx(['errshots'], async t => {
      const st = t.objectStore('errshots');
      const s = await req(st.get(id));
      if (!s) return null;
      const out = { ...s, ...('note' in patch ? { note: String(patch.note || '').slice(0, 4000) } : {}), ...('folder' in patch ? { folder: patch.folder } : {}),
        ...('html' in patch && !s.img ? { html: String(patch.html || '').slice(0, 20000), text: String(patch.text || '').slice(0, 5000) } : {}),
        ...('tags' in patch ? { tags: [...new Set((patch.tags || []).map(String))].slice(0, 30) } : {}), updatedAt: Date.now() };
      st.put(out); enq(t, 'errshot', id);
      return out;
    });
  }
  // The caderno de erros' own tags (the person's; the three of everyone are in marks.js).
  const listErrTags = () => tx(['errtags'], 'readonly', t => req(t.objectStore('errtags').getAll()))
    .then(all => all.sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' })));
  async function createErrTag(name) {
    name = String(name || '').trim().replace(/\s+/g, ' ').slice(0, 40);
    if (!name) throw new Error('empty_name');
    return wtx(['errtags'], async t => {
      const st = t.objectStore('errtags');
      const same = (await req(st.getAll())).find(x => x.name.toLowerCase() === name.toLowerCase());
      if (same) return same;
      const now = Date.now(), x = { id: uid(), name, createdAt: now, updatedAt: now };
      st.put(x); enq(t, 'errtag', x.id);
      return x;
    });
  }
  async function updateErrTag(id, name) {
    name = String(name || '').trim().replace(/\s+/g, ' ').slice(0, 40);
    return wtx(['errtags'], async t => {
      const st = t.objectStore('errtags'), x = await req(st.get(id));
      if (!x || !name) return null;
      const out = { ...x, name, updatedAt: Date.now() };
      st.put(out); enq(t, 'errtag', id);
      return out;
    });
  }
  // A tag deleted leaves the captures that had it.
  async function deleteErrTag(id) {
    return wtx(['errtags', 'errshots'], async t => {
      t.objectStore('errtags').delete(id); enq(t, 'errtag', id);
      const ss = t.objectStore('errshots');
      for (const s of await req(ss.getAll())) {
        if (!(s.tags || []).includes(id)) continue;
        ss.put({ ...s, tags: s.tags.filter(x => x !== id), updatedAt: Date.now() }); enq(t, 'errshot', s.id);
      }
    });
  }
  async function deleteErrShot(id) {
    return wtx(['errshots'], t => { t.objectStore('errshots').delete(id); enq(t, 'errshot', id); });
  }
  const errShotBlob = s => s && s.img ? getBlob(String(s.img).replace(/^bnblob:/, '')) : Promise.resolve(null);

  // The colours a mark can have (highlights.js keeps the same list).
  // 'hide' doesn't highlight: the passage leaves the reading on the page
  // (highlights.js); here it is shown in grey, and left out of what is sent on.
  const MARK_COLORS = { yellow: '#fde047', green: '#86efac', blue: '#93c5fd', pink: '#f9a8d4', orange: '#fdba74', purple: '#c4b5fd', hide: '#d4d4de', none: '#e4e4ee' };

  // Marks as blocks of a topic's Notas: each passage a quote (its note under
  // it, after `noteLabel`), then the page's title linking back to it.
  function marksToNoteBlocks(page, marks, noteLabel) {
    const blocks = [];
    marks.filter(m => m.color !== 'hide').forEach(m => {
      const paras = String(m.text || '').split(/\n+/).filter(Boolean).map(t => ({ type: 'paragraph', content: [{ type: 'text', text: t }] }));
      if (m.note) paras.push({ type: 'paragraph', content: [{ type: 'text', text: noteLabel + ': ', marks: [{ type: 'bold' }] }, { type: 'text', text: m.note }] });
      blocks.push({ type: 'blockquote', content: paras.length ? paras : [{ type: 'paragraph' }] });
    });
    if (page && page.url) {
      blocks.push({ type: 'paragraph', content: [{ type: 'text', text: page.title || page.url, marks: [{ type: 'link', attrs: { href: page.url, target: '_blank' } }] }] });
    }
    return blocks;
  }

  // Appends blocks (TipTap JSON) to the end of a topic's Notas. The cockpit,
  // if it shows that note, saved what it had before this runs (app.js).
  async function appendToTopicNotes(topicId, blocks) {
    const rec = await getContent(topicId, 'notes');
    const data = rec && rec.data && rec.data.content ? rec.data : { version: 4, content: { type: 'doc', content: [] } };
    const doc = data.content.type === 'doc' ? data.content : { type: 'doc', content: [] };
    let list = Array.isArray(doc.content) ? doc.content.slice() : [];
    // A brand-new note is one empty paragraph: write over it.
    if (list.length === 1 && list[0].type === 'paragraph' && !list[0].content) list = [];
    return putContent(topicId, 'notes', { ...data, version: 4, content: { ...doc, content: list.concat(blocks) } });
  }

  // ─── FOLDERS ─────────────────────────────────────────────────────────────
  // Sorted the way people number them: "02 - Direito" before "10 - Ética",
  // so a number in front of the name is all it takes to choose the order.
  const byName = (a, b) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' });

  async function listFolders() {
    const all = await tx(['folders'], 'readonly', t => req(t.objectStore('folders').getAll()));
    return all.sort(byName);
  }
  async function createFolder(name) {
    const f = { id: uid(), name: String(name || '').trim(), createdAt: Date.now() };
    await wtx(['folders'], t => { t.objectStore('folders').put(f); enq(t, 'folder', f.id); });
    return f;
  }
  async function renameFolder(id, name) {
    return wtx(['folders'], async t => {
      const st = t.objectStore('folders');
      const f = await req(st.get(id));
      if (f) { st.put({ ...f, name: String(name || '').trim() }); enq(t, 'folder', id); }
    });
  }
  // The notebooks inside are kept: they go back to the top level.
  async function deleteFolder(id) {
    return wtx(['folders', 'notebooks'], async t => {
      t.objectStore('folders').delete(id); enq(t, 'folder', id);
      const ns = t.objectStore('notebooks');
      const all = await req(ns.getAll());
      all.forEach(m => { if (m.folder === id) { ns.put({ ...m, folder: null }); enq(t, 'notebook', m.id); } });
    });
  }
  async function moveNotebook(id, folder) {
    return wtx(['notebooks'], async t => {
      const ns = t.objectStore('notebooks');
      const m = await req(ns.get(id));
      if (m) { ns.put({ ...m, folder: folder || null }); enq(t, 'notebook', id); }
    });
  }

  // ─── IMAGES ──────────────────────────────────────────────────────────────
  // A picture is kept as WebP (as the omni2 does): a pasted screenshot goes
  // from ~1 MB of PNG to ~100 KB, and the cloud's space goes much further.
  // At most 2400 px on its longer side. Kept as it came when WebP isn't
  // smaller, can't be made here, or it's a GIF / SVG / WebP already.
  const SQUEEZE = /^image\/(png|jpeg|jpg|bmp|x-ms-bmp|tiff)$/i, MAX_SIDE = 2400;
  async function squeeze(blob) {
    if (!blob || !SQUEEZE.test(blob.type || '') || blob.size < 40 * 1024 || typeof createImageBitmap !== 'function') return blob;
    try {
      const bmp = await createImageBitmap(blob);
      const k = Math.min(1, MAX_SIDE / Math.max(bmp.width, bmp.height));
      const w = Math.max(1, Math.round(bmp.width * k)), h = Math.max(1, Math.round(bmp.height * k));
      let out;
      if (typeof OffscreenCanvas !== 'undefined') {
        const c = new OffscreenCanvas(w, h);
        c.getContext('2d').drawImage(bmp, 0, 0, w, h);
        out = await c.convertToBlob({ type: 'image/webp', quality: 0.85 });
      } else {
        const c = document.createElement('canvas'); c.width = w; c.height = h;
        c.getContext('2d').drawImage(bmp, 0, 0, w, h);
        out = await new Promise(r => c.toBlob(r, 'image/webp', 0.85));
      }
      if (bmp.close) bmp.close();
      return out && out.type === 'image/webp' && out.size < blob.size ? out : blob;
    } catch (e) { return blob; }
  }
  async function putBlob(blob) {
    if (quotaLocked()) throw lockedError();
    blob = await squeeze(blob);
    const id = uid();
    await tx(['blobs'], 'readwrite', t => { t.objectStore('blobs').put({ id, blob }); });
    return id;
  }
  async function putBlobWithId(id, blob) {
    await tx(['blobs'], 'readwrite', t => { t.objectStore('blobs').put({ id, blob }); });
  }
  // A file this device doesn't have yet (a notebook synced from another one)
  // comes down from the cloud the first time it is needed.
  async function getBlob(id) {
    const r = await tx(['blobs'], 'readonly', t => req(t.objectStore('blobs').get(id)));
    if (r) return r.blob;
    const remote = g.NotesDB && g.NotesDB.remoteBlob;
    if (!remote) return null;
    try {
      const blob = await remote(id);
      if (blob) await putBlobWithId(id, blob);
      return blob || null;
    } catch (e) { return null; }
  }
  // Images inside notes and mind maps are referenced as "bnblob:<id>" (the
  // editors turn that into a local object URL).
  const BLOB_URL = /bnblob:([A-Za-z0-9_-]+)/g;
  function contentRefs(c) {
    const out = new Set();
    for (const m of JSON.stringify((c && c.data) || '').matchAll(BLOB_URL)) out.add(m[1]);
    return [...out];
  }
  // Files a record uses: a page's images and PDF, a note's or a map's images.
  function blobRefs(page) {
    if (page && 'anchor' in page && 'color' in page) return markRefs(page);   // a mark's note, with its images
    if (page && page.img && 'folder' in page) return [String(page.img).replace(/^bnblob:/, '')];   // a capture of the caderno de erros
    if (page && 'folder' in page && 'html' in page && !page.img) return htmlRefs(page.html);   // a passage of text there (images pasted in it)
    // A question's statement and comment (rich boxes, rich.js).
    if (page && Array.isArray(page.alts)) return htmlRefs((page.text || '') + (page.comment || ''));
    if (page && page.kind && page.topic) return contentRefs(page);
    if (page && 'front' in page && 'back' in page) return cardRefs(page);   // a flashcard's images
    // An external simulado's exam PDF (mockpdf.js: paper.file = 'bnblob:<id>'); before
    // the essay test below — a mock has an essay too (its grade).
    if (page && page.paper && typeof page.paper.file === 'string') return [page.paper.file.replace(/^bnblob:/, '')];
    // A discursive attempt: its answer PDF, its pen strokes (hand = 'bnblob:<id>').
    if (page && page.essay) return [page.pdf, page.hand ? String(page.hand).replace(/^bnblob:/, '') : null].filter(Boolean);
    if (page && page.shelf) return [page.file, page.cover].filter(Boolean);   // a book of the Estante
    if (page && typeof page.html === 'string' && 'title' in page && !page.items) return htmlRefs(page.html);   // a text questions share
    const out = [];
    if (page.pdf) out.push(page.pdf.blob);
    (page.items || []).forEach(it => { if (it.t === 'image') out.push(it.blob); });
    return out;
  }

  const htmlRefs = html => [...new Set([...String(html || '').matchAll(BLOB_URL)].map(x => x[1]))];
  const markRefs = m => (m.noteRich && typeof m.noteRich.html === 'string' ? [...new Set([...m.noteRich.html.matchAll(BLOB_URL)].map(x => x[1]))] : []);
  // Its images: apart (older cards) and inside the rich text.
  const cardRefs = c => {
    const out = new Set((c.front_img || []).concat(c.back_img || []));
    for (const m of ((c.front_html || '') + (c.back_html || '')).matchAll(BLOB_URL)) out.add(m[1]);
    return [...out];
  };

  // Images nothing points at any more (deleted items, deleted notebooks).
  // Only run with no editor open: an undo there may still bring one back.
  async function gcBlobs() {
    return tx(['pages', 'blobs', 'contents', 'essayres', 'cards', 'books', 'errshots', 'marks', 'mocks', 'questions', 'qtexts'], 'readwrite', async t => {
      const pages = await req(t.objectStore('pages').getAll());
      const used = new Set();
      (await req(t.objectStore('marks').getAll())).forEach(m => markRefs(m).forEach(id => used.add(id)));
      (await req(t.objectStore('errshots').getAll())).forEach(s => s.img ? used.add(String(s.img).replace(/^bnblob:/, '')) : htmlRefs(s.html).forEach(id => used.add(id)));
      (await req(t.objectStore('books').getAll())).forEach(b => [b.file, b.cover].forEach(id => id && used.add(id)));
      (await req(t.objectStore('cards').getAll())).forEach(c => cardRefs(c).forEach(id => used.add(id)));
      (await req(t.objectStore('questions').getAll())).forEach(q => htmlRefs((q.text || '') + (q.comment || '')).forEach(id => used.add(id)));
      (await req(t.objectStore('qtexts').getAll())).forEach(x => htmlRefs(x.html).forEach(id => used.add(id)));
      (await req(t.objectStore('mocks').getAll())).forEach(m => { if (m.paper && typeof m.paper.file === 'string') used.add(m.paper.file.replace(/^bnblob:/, '')); });   // a simulado's PDF
      // An attempt's answer PDF and its pen strokes (hand = 'bnblob:<id>', as in blobRefs).
      (await req(t.objectStore('essayres').getAll())).forEach(r => {
        if (r.pdf) used.add(r.pdf);
        if (r.hand) used.add(String(r.hand).replace(/^bnblob:/, ''));
      });
      pages.forEach(p => {
        if (p.pdf) used.add(p.pdf.blob);
        p.items.forEach(it => { if (it.t === 'image') used.add(it.blob); });
      });
      (await req(t.objectStore('contents').getAll())).forEach(c => contentRefs(c).forEach(id => used.add(id)));
      const bs = t.objectStore('blobs');
      const keys = await req(bs.getAllKeys());
      keys.forEach(k => { if (!used.has(k)) bs.delete(k); });
    });
  }

  // A capture from the bar: below whatever is already on the last sheet, or
  // at the top of a new sheet when it doesn't fit — room is left under it for
  // working the question out by hand. nbId null creates the notebook.
  // w/h are the capture's size in CSS px.
  async function appendImage(nbId, blob, w, h, newTitle) {
    let nb = nbId ? await getNotebook(nbId) : null;
    if (!nb) nb = await createNotebook({ title: newTitle, layout: 'pages', paper: 'blank' });
    const { meta, pages } = nb;
    const blobId = await putBlob(blob);
    const infinite = meta.layout === 'infinite';
    const maxW = infinite ? 760 : PAGE_W - 2 * MARGIN;
    const maxH = infinite ? Infinity : PAGE_H - 2 * MARGIN;
    const k = Math.min(1, maxW / w, maxH / h);
    const iw = Math.round(w * k), ih = Math.round(h * k);

    let page = pages[pages.length - 1];
    const b = contentBounds(page.items);
    let x, y;
    if (infinite) {
      x = b ? b.x : 0;
      y = b ? b.y + b.h + 40 : 0;
    } else {
      x = MARGIN;
      y = b ? Math.max(MARGIN, b.y + b.h + 28) : MARGIN;
      // A PDF page is already full of text: the capture gets a sheet of its own.
      if (page.paper === 'pdf' || (b && y + ih > pageH(page) - MARGIN)) {
        page = newPage(meta.id, page.paper === 'pdf' ? meta.paper : page.paper);
        pages.push(page);
        y = MARGIN;
      }
    }
    page.items = page.items.concat([{ t: 'image', id: uid(), x, y, w: iw, h: ih, blob: blobId }]);
    meta.pageOrder = pages.map(p => p.id);
    meta.updatedAt = Date.now();
    meta.thumb = null;   // the library redraws it the next time it is opened
    await saveNotebook(meta, [page], []);
    return { id: meta.id, title: meta.title, page: pages.indexOf(page) };
  }

  // ─── BACKUP ──────────────────────────────────────────────────────────────
  const FORMAT = 'agoodraw-notes-backup';

  function blobToDataUrl(blob) {
    return new Promise((resolve, reject) => {
      const fr = new FileReader();
      fr.onload = () => resolve(fr.result);
      fr.onerror = () => reject(fr.error);
      fr.readAsDataURL(blob);
    });
  }
  async function dataUrlToBlob(url) { return (await fetch(url)).blob(); }

  async function exportAll() {
    const { metas, pages, blobs, subjects, topics, contents, webpages, marks, logs, sessions, cycles, cards, cardrevs, essays, essayres, mocks, cardmocks, contests, rules, tasks, taskcols, questions, qtexts, qanswers, books, errshots, errfolders, errtags, pageinks } = await tx(['notebooks', 'pages', 'blobs', 'subjects', 'topics', 'contents', 'webpages', 'marks', 'logs', 'sessions', 'cycles', 'cards', 'cardrevs', 'essays', 'essayres', 'mocks', 'cardmocks', 'contests', 'rules', 'tasks', 'taskcols', 'questions', 'qtexts', 'qanswers', 'books', 'errshots', 'errfolders', 'errtags', 'pageinks'], 'readonly', async t => ({
      errshots: await req(t.objectStore('errshots').getAll()),
      errfolders: await req(t.objectStore('errfolders').getAll()),
      errtags: await req(t.objectStore('errtags').getAll()),
      pageinks: await req(t.objectStore('pageinks').getAll()),
      books: await req(t.objectStore('books').getAll()),
      questions: await req(t.objectStore('questions').getAll()),
      qtexts: await req(t.objectStore('qtexts').getAll()),
      qanswers: await req(t.objectStore('qanswers').getAll()),
      rules: await req(t.objectStore('rules').getAll()),
      tasks: await req(t.objectStore('tasks').getAll()),
      taskcols: await req(t.objectStore('taskcols').getAll()),
      essays: await req(t.objectStore('essays').getAll()),
      essayres: await req(t.objectStore('essayres').getAll()),
      mocks: await req(t.objectStore('mocks').getAll()),
      cardmocks: await req(t.objectStore('cardmocks').getAll()),
      contests: await req(t.objectStore('contests').getAll()),
      cards: await req(t.objectStore('cards').getAll()),
      cardrevs: await req(t.objectStore('cardrevs').getAll()),
      sessions: await req(t.objectStore('sessions').getAll()),
      cycles: await req(t.objectStore('cycles').getAll()),
      logs: await req(t.objectStore('logs').getAll()),
      metas: await req(t.objectStore('notebooks').getAll()),
      pages: await req(t.objectStore('pages').getAll()),
      blobs: await req(t.objectStore('blobs').getAll()),
      subjects: await req(t.objectStore('subjects').getAll()),
      topics: await req(t.objectStore('topics').getAll()),
      contents: await req(t.objectStore('contents').getAll()),
      webpages: await req(t.objectStore('webpages').getAll()),
      marks: await req(t.objectStore('marks').getAll())
    }));
    const out = { format: FORMAT, version: 2, exportedAt: new Date().toISOString(), subjects, topics, contents, webpages, marks, logs, sessions, cycles, cards, cardrevs, essays, essayres, mocks, cardmocks, contests, rules, tasks, taskcols, questions, qtexts, qanswers, books, errshots, errfolders, errtags, pageinks, notebooks: [], blobs: [] };
    metas.forEach(m => out.notebooks.push({ meta: m, pages: pages.filter(p => p.nb === m.id) }));
    for (const b of blobs) out.blobs.push({ id: b.id, data: await blobToDataUrl(b.blob) });
    // Files this device doesn't hold (in the cloud, never opened here): the
    // backup can't carry them; the caller tells the person how many.
    const have = new Set(blobs.map(b => b.id)), refs = new Set();
    books.forEach(b => [b.file, b.cover].forEach(id => id && refs.add(id)));
    cards.forEach(c => cardRefs(c).forEach(id => refs.add(id)));
    pages.forEach(p => { if (p.pdf) refs.add(p.pdf.blob); (p.items || []).forEach(it => { if (it.t === 'image') refs.add(it.blob); }); });
    out.missing = [...refs].filter(id => !have.has(id)).length;
    return out;
  }

  // Which of `incoming` (a backup's records) go in over `existing` (this
  // device's), by id: the newest wins; neither dated, the one here stays.
  // → { keep, replace, add }: Sets of ids.
  function mergePlan(existing, incoming) {
    const have = new Map((existing || []).map(x => [x.id, x.updatedAt || 0]));
    const keep = new Set(), replace = new Set(), add = new Set();
    (incoming || []).forEach(x => {
      if (!x || !x.id) return;
      if (!have.has(x.id)) add.add(x.id);
      else if ((x.updatedAt || 0) > have.get(x.id)) replace.add(x.id);
      else keep.add(x.id);
    });
    return { keep, replace, add };
  }
  // Adds what the file holds. A notebook already here (same id) comes in as a
  // copy rather than overwriting: restoring an old backup must never wipe out
  // newer work. The study tree and what hangs on it are matched by id and
  // merged (mergePlan: the newest wins), so a restore where the data already
  // is leaves one tree, not two. Returns how many notebooks were added.
  async function importAll(data) {
    if (!data || data.format !== FORMAT || !Array.isArray(data.notebooks)) throw new Error('format');
    const existing = new Set((await listNotebooks()).map(m => m.id));
    const blobs = [];
    for (const b of data.blobs || []) blobs.push({ id: b.id, blob: await dataUrlToBlob(b.data) });
    const haveBlobs = new Set(await tx(['blobs'], 'readonly', t => req(t.objectStore('blobs').getAllKeys())));
    // Folders are matched by id, then by name, so restoring twice doesn't
    // leave two "01 - Português" side by side.
    const haveFolders = await listFolders();
    const folderMap = new Map();
    const newFolders = [];
    for (const f of Array.isArray(data.folders) ? data.folders : []) {
      if (!f || !f.id) continue;
      const same = haveFolders.find(h => h.id === f.id) || haveFolders.find(h => h.name === f.name);
      if (same) folderMap.set(f.id, same.id);
      else { folderMap.set(f.id, f.id); newFolders.push({ id: f.id, name: String(f.name || ''), createdAt: f.createdAt || Date.now() }); }
    }
    // The study tree and the records under it keep their ids; one already
    // here is replaced only by a newer copy (Onda 3, 01/11/2026). History
    // (answers, card reviews, attempts, marks) is never replaced.
    const stamp = async st => (await tx([st], 'readonly', t => req(t.objectStore(st).getAll()))).map(x => ({ id: x.id, updatedAt: x.updatedAt }));
    const plans = {};
    // A session's log keeps its id (topic:date:session); an old file's log without one gets the day's.
    const logsIn = (Array.isArray(data.logs) ? data.logs : []).filter(l => l && l.topic && l.date).map(l => ({ ...l, id: l.id && String(l.id).startsWith(l.topic + ':') ? l.id : l.topic + ':' + l.date }));
    for (const st of ['subjects', 'topics', 'contents', 'cards', 'essays', 'questions', 'qtexts', 'books', 'contests', 'rules', 'tasks', 'taskcols', 'mocks', 'cardmocks', 'sessions', 'logs', 'errfolders', 'errshots', 'errtags', 'pageinks']) plans[st] = mergePlan(await stamp(st), st === 'logs' ? logsIn : Array.isArray(data[st]) ? data[st] : []);
    const goes = (st, id) => plans[st].add.has(id) || plans[st].replace.has(id);
    const subMap = new Map(), topMap = new Map();
    (data.subjects || []).forEach(x => { if (x && x.id) subMap.set(x.id, x.id); });
    (data.topics || []).forEach(x => { if (x && x.id) topMap.set(x.id, x.id); });
    // Web pages: the same address already here keeps its record (and gets the
    // marks it doesn't have); marks are matched by id.
    const haveByUrl = new Map((await listWebpages()).map(w => [w.url, w.id]));
    const haveMarks = new Set(await tx(['marks'], 'readonly', t => req(t.objectStore('marks').getAllKeys())));
    const pageMap = new Map();
    let n = 0;
    const hadCycle = (await listCycles()).length > 0;
    const haveRevs = new Set(await tx(['cardrevs'], 'readonly', t => req(t.objectStore('cardrevs').getAllKeys())));
    const have = async st => new Set(await tx([st], 'readonly', t => req(t.objectStore(st).getAllKeys())));
    const haveTries = await have('essayres'), haveQA = await have('qanswers');
    await wtx(['notebooks', 'pages', 'blobs', 'folders', 'subjects', 'topics', 'contents', 'webpages', 'marks', 'logs', 'sessions', 'cycles', 'cards', 'cardrevs', 'essays', 'essayres', 'mocks', 'cardmocks', 'contests', 'rules', 'tasks', 'taskcols', 'questions', 'qtexts', 'qanswers', 'books', 'errfolders', 'errshots', 'errtags', 'pageinks'], t => {
      (Array.isArray(data.contests) ? data.contests : []).forEach(r => {
        if (!r || !r.id || !goes('contests', r.id)) return;
        const sm = id => subMap.get(id) || id, tm = id => topMap.get(id) || id;
        t.objectStore('contests').put({ ...r, ...(r.subjects ? { subjects: r.subjects.map(sm) } : {}), ...(r.topics ? { topics: r.topics.map(tm) } : {}) }); enq(t, 'contest', r.id);
      });
      for (const [st, kind] of [['rules', 'rule'], ['tasks', 'task'], ['taskcols', 'taskcol'], ['qtexts', 'qtext'], ['errfolders', 'errfolder'], ['errshots', 'errshot'], ['errtags', 'errtag'], ['pageinks', 'pageink']]) {
        (Array.isArray(data[st]) ? data[st] : []).forEach(r => { if (r && r.id && goes(st, r.id)) { t.objectStore(st).put(r); enq(t, kind, r.id); } });
      }
      const tm = id => topMap.get(id) || id, sm = id => subMap.get(id) || id;
      (Array.isArray(data.questions) ? data.questions : []).forEach(r => { if (r && r.id && goes('questions', r.id)) { t.objectStore('questions').put({ ...r, topic: tm(r.topic), subject: sm(r.subject) }); enq(t, 'question', r.id); } });
      (Array.isArray(data.qanswers) ? data.qanswers : []).forEach(r => { if (r && r.id && !haveQA.has(r.id)) { t.objectStore('qanswers').put({ ...r, topic: tm(r.topic) }); enq(t, 'qanswer', r.id); } });
      (Array.isArray(data.books) ? data.books : []).forEach(r => { if (r && r.id && goes('books', r.id)) { t.objectStore('books').put({ ...r, subject_id: sm(r.subject_id), topic_id: r.topic_id ? tm(r.topic_id) : null }); enq(t, 'book', r.id); } });
      (Array.isArray(data.essays) ? data.essays : []).forEach(e => { if (e && e.id && goes('essays', e.id)) { t.objectStore('essays').put({ ...e, topic: tm(e.topic), subject: sm(e.subject) }); enq(t, 'essay', e.id); } });
      (Array.isArray(data.essayres) ? data.essayres : []).forEach(r => { if (r && r.id && !haveTries.has(r.id)) { t.objectStore('essayres').put({ ...r, topic: tm(r.topic) }); enq(t, 'essayres', r.id); } });
      (Array.isArray(data.mocks) ? data.mocks : []).forEach(m => {
        if (!m || !m.id || !goes('mocks', m.id)) return;
        t.objectStore('mocks').put({ ...m, subjects: (m.subjects || []).map(x => ({ ...x, subject: sm(x.subject) })), errors: (m.errors || []).map(x => ({ ...x, topic: tm(x.topic) })) });
        enq(t, 'mock', m.id);
      });
      (Array.isArray(data.cardmocks) ? data.cardmocks : []).forEach(m => {
        if (!m || !m.id || !goes('cardmocks', m.id)) return;
        t.objectStore('cardmocks').put({ ...m, config: { ...(m.config || {}), subjects: ((m.config && m.config.subjects) || []).map(x => ({ ...x, subject: sm(x.subject), topicsOff: (x.topicsOff || []).map(tm) })) },
          items: (m.items || []).map(x => ({ ...x, topic: tm(x.topic), subject: sm(x.subject) })), perSubject: (m.perSubject || []).map(x => ({ ...x, subject: sm(x.subject) })) });
        enq(t, 'cardmock', m.id);
      });
      (Array.isArray(data.cards) ? data.cards : []).forEach(c => {
        if (!c || !c.id || !goes('cards', c.id)) return;
        t.objectStore('cards').put({ ...c, topic: topMap.get(c.topic) || c.topic, subject: subMap.get(c.subject) || c.subject }); enq(t, 'card', c.id);
      });
      (Array.isArray(data.cardrevs) ? data.cardrevs : []).forEach(r => {
        if (!r || !r.id || haveRevs.has(r.id)) return;
        t.objectStore('cardrevs').put({ ...r, topic: topMap.get(r.topic) || r.topic }); enq(t, 'cardrev', r.id);
      });
      (Array.isArray(data.sessions) ? data.sessions : []).forEach(x => {
        if (!x || !x.id || !goes('sessions', x.id)) return;
        t.objectStore('sessions').put({ ...x, subject: subMap.get(x.subject) || x.subject, topic: x.topic ? (topMap.get(x.topic) || x.topic) : null }); enq(t, 'session', x.id);
      });
      // A cycle comes in only where there is none: it's a plan, not history.
      if (!hadCycle) (Array.isArray(data.cycles) ? data.cycles : []).forEach(c => {
        if (!c || !c.id) return;
        const m = id => subMap.get(id) || id;
        t.objectStore('cycles').put({ ...c, subjects: (c.subjects || []).map(x => ({ ...x, subject: m(x.subject) })), slots: (c.slots || []).map(x => ({ ...x, subject: m(x.subject) })) });
        enq(t, 'cycle', c.id);
      });
      logsIn.forEach(l => {
        if (!goes('logs', l.id)) return;
        t.objectStore('logs').put({ ...l, subject: subMap.get(l.subject) || l.subject }); enq(t, 'studylog', l.id);
      });
      (Array.isArray(data.webpages) ? data.webpages : []).forEach(w => {
        if (!w || !w.id || !w.url) return;
        if (haveByUrl.has(w.url)) { pageMap.set(w.id, haveByUrl.get(w.url)); return; }
        pageMap.set(w.id, w.id);
        t.objectStore('webpages').put({ ...w, topic: w.topic ? (topMap.get(w.topic) || w.topic) : null }); enq(t, 'webpage', w.id);
      });
      (Array.isArray(data.marks) ? data.marks : []).forEach(m => {
        if (!m || !m.id || haveMarks.has(m.id) || !pageMap.has(m.page)) return;
        t.objectStore('marks').put({ ...m, page: pageMap.get(m.page) }); enq(t, 'mark', m.id);
      });
      const bs = t.objectStore('blobs');
      blobs.forEach(b => { if (!haveBlobs.has(b.id)) bs.put(b); });
      newFolders.forEach(f => { t.objectStore('folders').put(f); enq(t, 'folder', f.id); });
      (data.subjects || []).forEach(x => { if (x && x.id && goes('subjects', x.id)) { t.objectStore('subjects').put(x); enq(t, 'subject', x.id); } });
      (data.topics || []).forEach(x => {
        if (!x || !x.id || !goes('topics', x.id)) return;
        t.objectStore('topics').put({ ...x, parent_id: x.parent_id || null }); enq(t, 'topic', x.id);
      });
      (data.contents || []).forEach(c => {
        if (!c || !c.topic) return;
        const id = c.topic + ':' + c.kind;
        if (!goes('contents', c.id || id)) return;
        t.objectStore('contents').put({ ...c, id }); enq(t, 'content', id);
      });
      for (const { meta, pages } of data.notebooks) {
        if (!meta || !Array.isArray(pages)) continue;
        const m = { ...meta };
        let ps = pages.map(p => ({ ...p }));
        if (existing.has(m.id)) {
          m.id = uid();
          const map = new Map(ps.map(p => [p.id, uid()]));
          ps = ps.map(p => ({ ...p, id: map.get(p.id), nb: m.id }));
          m.pageOrder = (m.pageOrder || []).map(id => map.get(id)).filter(Boolean);
        }
        if (!m.pageOrder || !m.pageOrder.length) m.pageOrder = ps.map(p => p.id);
        m.folder = m.folder && folderMap.has(m.folder) ? folderMap.get(m.folder) : null;
        if (m.topic) m.topic = topMap.get(m.topic) || m.topic;
        t.objectStore('notebooks').put(m); enq(t, 'notebook', m.id);
        ps.forEach(p => { t.objectStore('pages').put(p); enq(t, 'page', p.id); });
        n++;
      }
    });
    return n;
  }

  // ─── FOR THE SYNC ────────────────────────────────────────────────────────
  const STORE = { notebook: 'notebooks', page: 'pages', folder: 'folders', subject: 'subjects', topic: 'topics', content: 'contents', webpage: 'webpages', mark: 'marks', pageink: 'pageinks', studylog: 'logs', session: 'sessions', cycle: 'cycles', card: 'cards', cardrev: 'cardrevs', essay: 'essays', essayres: 'essayres', mock: 'mocks', cardmock: 'cardmocks', contest: 'contests', rule: 'rules', task: 'tasks', taskcol: 'taskcols', question: 'questions', qtext: 'qtexts', qanswer: 'qanswers', book: 'books', errfolder: 'errfolders', errshot: 'errshots', errtag: 'errtags', pref: 'prefs' };
  // A kind this version doesn't know (a newer device's) is left alone.
  const knows = kind => !!STORE[kind];
  // "Desfazer" after a delete: the records as they were, put back (and sent
  // up again — the cloud has them as deleted). recs: [{ kind, data }].
  async function restoreRecords(recs) {
    const list = (recs || []).filter(r => r && r.data && STORE[r.kind]);
    if (!list.length) return;
    const stores = [...new Set(list.map(r => STORE[r.kind]))];
    await wtx(stores, t => {
      list.forEach(r => { t.objectStore(STORE[r.kind]).put({ ...r.data, updatedAt: Date.now() }); enq(t, r.kind, r.data.id); });
    });
  }
  // What this version knows, to tell when an update learned a new kind.
  const KINDS_SIG = Object.keys(STORE).sort().join(',');
  async function recordFor(kind, id) {
    if (!STORE[kind]) return null;
    return (await tx([STORE[kind]], 'readonly', t => req(t.objectStore(STORE[kind]).get(id)))) || null;
  }
  // In key order ('kind:id'); `after`: only the keys past that one.
  const outboxList = (limit, after) => tx(['outbox'], 'readonly', t => req(t.objectStore('outbox').getAll(after ? IDBKeyRange.lowerBound(after, true) : null, limit)));
  const outboxCount = () => tx(['outbox'], 'readonly', t => req(t.objectStore('outbox').count()));
  const outboxGet = key => tx(['outbox'], 'readonly', t => req(t.objectStore('outbox').get(key))).then(r => r || null);
  // Clears what was pushed — unless it changed again meanwhile (new seq).
  function outboxDone(entries) {
    return tx(['outbox'], 'readwrite', async t => {
      const st = t.objectStore('outbox');
      for (const e of entries) {
        const cur = await req(st.get(e.key));
        if (cur && cur.seq === e.seq) st.delete(e.key);
      }
    });
  }
  // Everything on this device, queued: the first sync with an account (or
  // only some kinds: those the cloud started taking later).
  function outboxAll(kinds) {
    return wtx(['notebooks', 'pages', 'folders', 'subjects', 'topics', 'contents', 'webpages', 'marks', 'pageinks', 'logs', 'sessions', 'cycles', 'cards', 'cardrevs', 'essays', 'essayres', 'mocks', 'cardmocks', 'contests', 'rules', 'tasks', 'taskcols', 'questions', 'qtexts', 'qanswers', 'books', 'errfolders', 'errshots', 'errtags'], async t => {
      for (const kind of kinds || ['folder', 'subject', 'topic', 'notebook', 'page', 'content', 'webpage', 'mark', 'pageink', 'studylog', 'session', 'cycle', 'card', 'cardrev', 'essay', 'essayres', 'contest', 'mock', 'cardmock', 'rule', 'task', 'taskcol', 'qtext', 'question', 'qanswer', 'book', 'errfolder', 'errshot', 'errtag']) {
        const keys = await req(t.objectStore(STORE[kind]).getAllKeys());
        keys.forEach(id => enq(t, kind, id));
      }
    });
  }
  // Marks a record to be pushed without changing it (a merge just written).
  const outboxTouch = (kind, id) => wtx([], t => { enq(t, kind, id); });
  // The ids this device holds of a kind (hl-sync.js: the full check against the cloud).
  const localIds = kind => STORE[kind] ? tx([STORE[kind]], 'readonly', t => req(t.objectStore(STORE[kind]).getAllKeys())) : Promise.resolve([]);
  // Topics whose discipline is gone (a pull that brought the topic but not
  // it, a deletion that crossed a sync, a restore of part of a backup): put
  // under a discipline `name`, made if there is none; subtopics whose parent
  // is gone go to the top of theirs. What hangs on those topics (cards,
  // questions, discursivas, books) follows. → how many topics moved.
  async function adoptOrphans(name) {
    const [subs, tops] = await Promise.all([listSubjects(), listTopics()]);
    const have = new Set(subs.map(s => s.id)), ids = new Set(tops.map(x => x.id));
    const lost = tops.filter(x => !have.has(x.subject_id)), lostParent = tops.filter(x => x.parent_id && !ids.has(x.parent_id) && have.has(x.subject_id));
    if (!lost.length && !lostParent.length) return 0;
    let home = subs.find(s => s.name === name) || null;
    await wtx(['subjects', 'topics', 'cards', 'questions', 'essays', 'books'], async t => {
      const now = Date.now();
      if (lost.length && !home) { home = { id: uid(), name, display_order: subs.length, in_scope: true, createdAt: now, updatedAt: now }; t.objectStore('subjects').put(home); enq(t, 'subject', home.id); }
      const ts = t.objectStore('topics');
      lost.forEach(x => { ts.put({ ...x, subject_id: home.id, parent_id: x.parent_id && ids.has(x.parent_id) ? x.parent_id : null, updatedAt: now }); enq(t, 'topic', x.id); });
      lostParent.forEach(x => { ts.put({ ...x, parent_id: null, updatedAt: now }); enq(t, 'topic', x.id); });
      for (const [store, kind] of [['cards', 'card'], ['questions', 'question'], ['essays', 'essay']]) {
        const st = t.objectStore(store);
        for (const x of lost) (await req(st.index('topic').getAll(x.id))).forEach(r => { if (r.subject !== home.id) { st.put({ ...r, subject: home.id, updatedAt: now }); enq(t, kind, r.id); } });
      }
      const gone = new Set(lost.map(x => x.id)), bs = t.objectStore('books');
      (await req(bs.getAll())).forEach(b => { if (b.topic_id && gone.has(b.topic_id) && b.subject_id !== home.id) { bs.put({ ...b, subject_id: home.id, updatedAt: now }); enq(t, 'book', b.id); } });
    });
    return lost.length + lostParent.length;
  }
  // The whole sync store at once (the full check reads it once, not per record).
  const syncAll = () => tx(['sync'], 'readonly', t => req(t.objectStore('sync').getAll())).then(rows => new Map(rows.map(r => [r.k, r.v])));
  const outboxClear = () => tx(['outbox'], 'readwrite', t => { t.objectStore('outbox').clear(); });
  // A change that came from the cloud: written (or removed) without queueing.
  // A notebook's tombstone only removes its meta — each of its pages comes
  // with a tombstone of its own.
  function applyRemote(kind, id, data, also) {
    if (!STORE[kind]) return Promise.resolve();
    return tx([STORE[kind], 'sync'], 'readwrite', t => {
      const st = t.objectStore(STORE[kind]);
      if (data) st.put(kind === 'notebook' ? { thumb: null, ...data } : data);
      else st.delete(id);
      (also || []).forEach(([k, v]) => t.objectStore('sync').put({ k, v }));
    }).then(r => { if (kind === 'pref' && id === 'review') setPrefsCache(data, true); else if (kind === 'pref') prefsMemo.set(id, data || null); return r; });
  }
  const syncGet = k => tx(['sync'], 'readonly', t => req(t.objectStore('sync').get(k))).then(r => r ? r.v : undefined);
  const syncSet = (k, v) => tx(['sync'], 'readwrite', t => { t.objectStore('sync').put({ k, v }); });
  const syncSetMany = pairs => tx(['sync'], 'readwrite', t => { const st = t.objectStore('sync'); pairs.forEach(([k, v]) => st.put({ k, v })); });
  // The accounts whose data this device holds: each one that synced here
  // (sync.js marks u:<id>:started on its first sync, hl-sync.js u:<id>:started:marks).
  const syncUsers = () => tx(['sync'], 'readonly', t => req(t.objectStore('sync').getAllKeys(IDBKeyRange.bound('u:', 'u:\uffff'))))
    .then(keys => [...new Set(keys.map(k => (/^u:([^:]+):started(?::|$)/.exec(k) || [])[1]).filter(Boolean))]);
  const syncClear = () => tx(['sync'], 'readwrite', t => { t.objectStore('sync').clear(); });
  const hasBlob = id => tx(['blobs'], 'readonly', t => req(t.objectStore('blobs').getKey(id))).then(k => k !== undefined);
  const localBlob = id => tx(['blobs'], 'readonly', t => req(t.objectStore('blobs').get(id))).then(r => r ? r.blob : null);

  g.NotesDB = {
    PAGE_W, PAGE_H, PAGE_GAP, MARGIN, PAPERS,
    uid, isInk, bbox, contentBounds, newPage,
    pageW, pageH, pdfPages, createPdfNotebook, MAX_LEVEL,
    listSubjects, getSubject, createSubject, updateSubject, reorderSubjects, deleteSubject,
    listTopics, getTopic, createTopic, updateTopic, moveTopic, deleteTopic, levelOf, descendants, subtreeHeight,
    listLogs, getLog, putStudyLog, deleteStudyLog, evidenceOf,
    listCards, listCardRevs, putCards, deleteCards,
    listEssays, listEssayRes, putEssays, deleteEssay, listMocks, putMock, deleteMock, listContests, putContest, getReviewPrefs, putReviewPrefs, reviewPrefsCached, getPref, putPref, prefCached, setReviewMode, pinReview, redistributeLate, undoRedistribute, nudgeReview, updateContest, setMocksContest, deleteContest, listCardMocks, putCardMock, deleteCardMock, listRules, getRule, putRule, deleteRule,
    listTasks, putTasks, deleteTasks, listTaskCols, putTaskCols, deleteTaskCol,
    listBooks, getBook, putBook, readBook, deleteBook,
    refreshTopics, rebuildSchedules, listQuestions, getQuestion, listQTexts, getQText, listQAnswers, putQuestions, deleteQuestions, putAnswers, deleteAnswers, questionSummary, dayItems,
    adoptErrFolders, contentsOf, wipeLocal,
    listSessions, getSession, putSession, deleteSession, listCycles, activeCycle, putCycle, deleteCycle,
    abbrOf, getContent, putContent, topicNotebooks, migrateToSubjects, adoptLonelyNotebooks, appendImageToTopic, contentRefs,
    listNotebooks, getNotebook, createNotebook, saveNotebook, putMeta, deleteNotebook,
    normUrl, siteOf, listWebpages, getWebpage, webpageByUrl, ensureWebpage, updateWebpage, deleteWebpage,
    listMarks, getMark, pageMarks, putMark, deleteMark, pageInks, listInks, putInk, deleteInk, appendToTopicNotes, marksToNoteBlocks, MARK_COLORS,
    listFolders, createFolder, renameFolder, deleteFolder, moveNotebook,
    ERR_LEVELS, listErrFolders, listErrShots, getErrShot, createErrFolder, updateErrFolder, deleteErrFolder, addErrShot, addErrText, updateErrShot, deleteErrShot, errShotBlob, listErrTags, createErrTag, updateErrTag, deleteErrTag,
    putBlob, putBlobWithId, getBlob, blobRefs, gcBlobs, appendImage, exportAll, importAll, mergePlan, adoptOrphans, syncAll, reweighAll,
    knows, KINDS_SIG, restoreRecords, recordFor, outboxList, outboxCount, outboxGet, outboxDone, outboxTouch, localIds, outboxAll, outboxClear, applyRemote,
    syncGet, syncSet, syncSetMany, syncUsers, syncClear, hasBlob, localBlob,
    remoteBlob: null, onLocalChange: null
  };
})(typeof self !== 'undefined' ? self : this);
