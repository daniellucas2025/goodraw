// GooNotes — the cockpit's "Notas" tab: the omni2's TipTap editor
// (TipTapEditor.tsx), with the same extensions and tool bar, written here
// without React. The note is saved in the topic's contents (<topic>:notes) as
// the omni2 keeps notes_content: { version: 4, content: <TipTap JSON> }.
//
// Images stay in the Notes' own files: in the saved JSON an image's src is
// "bnblob:<id>"; while the editor is open it points at a blob: URL instead.
(function (g) {
  'use strict';
  const D = g.NotesDB, UI = g.NotesUI;
  const { t } = g.NotesI18n;
  const SAVE_MS = 1500;

  // Lucide, as in the omni2's tool bar.
  const I = {
    undo: '<path d="M9 14 4 9l5-5"/><path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11"/>',
    redo: '<path d="m15 14 5-5-5-5"/><path d="M20 9H9.5a5.5 5.5 0 0 0 0 11H13"/>',
    bold: '<path d="M6 12h9a4 4 0 0 1 0 8H7a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1h7a4 4 0 0 1 0 8"/>',
    italic: '<path d="M19 4h-9M14 20H5M15 4 9 20"/>',
    underline: '<path d="M6 4v6a6 6 0 0 0 12 0V4M4 20h16"/>',
    strike: '<path d="M16 4H9a3 3 0 0 0-2.83 4"/><path d="M14 12a4 4 0 0 1 0 8H6"/><path d="M4 12h16"/>',
    code: '<path d="m16 18 6-6-6-6M8 6l-6 6 6 6"/>',
    palette: '<circle cx="13.5" cy="6.5" r="1" fill="currentColor"/><circle cx="17.5" cy="10.5" r="1" fill="currentColor"/><circle cx="8.5" cy="7.5" r="1" fill="currentColor"/><circle cx="6.5" cy="12.5" r="1" fill="currentColor"/><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.93 0 1.65-.75 1.65-1.69 0-.44-.18-.84-.44-1.13-.29-.29-.44-.65-.44-1.13a1.64 1.64 0 0 1 1.67-1.67h2c3.05 0 5.55-2.5 5.55-5.55C21.97 6.01 17.46 2 12 2z"/>',
    highlight: '<path d="m9 11-6 6v3h9l3-3"/><path d="m22 12-4.6 4.6a2 2 0 0 1-2.8 0l-5.2-5.2a2 2 0 0 1 0-2.8L14 4"/>',
    h1: '<path d="M4 12h8M4 18V6M12 18V6"/><path d="m17 12 3-2v8"/>',
    h2: '<path d="M4 12h8M4 18V6M12 18V6"/><path d="M21 18h-4c0-4 4-3 4-6 0-1.5-2-2.5-4-1"/>',
    h3: '<path d="M4 12h8M4 18V6M12 18V6"/><path d="M17.5 10.5c1.7-1 3.5 0 3.5 1.5a2 2 0 0 1-2 2"/><path d="M17 17.5c2 1.5 4 .3 4-1.5a2 2 0 0 0-2-2"/>',
    list: '<path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>',
    olist: '<path d="M10 6h11M10 12h11M10 18h11M4 6h1v4M4 10h2"/><path d="M6 18H4c0-1 2-2 2-3s-1-1.5-2-1"/>',
    task: '<path d="m9 11 3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>',
    quote: '<path d="M3 21c3 0 7-1 7-8V5c0-1.25-.76-2-2-2H4c-1.25 0-2 .75-2 1.97V11c0 1.25.75 2 2 2 1 0 1 0 1 1v1c0 1-1 2-2 2s-1 0-1 1.03V20c0 1 0 1 1 1z"/><path d="M15 21c3 0 7-1 7-8V5c0-1.25-.76-2-2-2h-4c-1.25 0-2 .75-2 1.97V11c0 1.25.75 2 2 2h.75c0 2.25.25 4-2.75 4v3c0 1 0 1 1 1z"/>',
    hr: '<path d="M5 12h14"/>',
    details: '<path d="m3 10 2.5-2.5L3 5M3 19l2.5-2.5L3 14M10 6h11M10 12h11M10 18h11"/>',
    link: '<path d="M9 17H7A5 5 0 0 1 7 7h2M15 7h2a5 5 0 1 1 0 10h-2M8 12h8"/>',
    image: '<rect width="18" height="18" x="3" y="3" rx="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.09-3.09a2 2 0 0 0-2.82 0L6 21"/>',
    youtube: '<path d="M2.5 17a24 24 0 0 1 0-10 2 2 0 0 1 1.4-1.4 49.6 49.6 0 0 1 16.2 0A2 2 0 0 1 21.5 7a24 24 0 0 1 0 10 2 2 0 0 1-1.4 1.4 49.6 49.6 0 0 1-16.2 0A2 2 0 0 1 2.5 17"/><path d="m10 15 5-3-5-3z"/>',
    table: '<rect width="18" height="18" x="3" y="3" rx="2"/><path d="M12 3v18M3 9h18M3 15h18"/>',
    cols: '<rect width="18" height="18" x="3" y="3" rx="2"/><path d="M12 3v18"/>',
    rows: '<rect width="18" height="18" x="3" y="3" rx="2"/><path d="M3 12h18"/>',
    trash: '<path d="M3 6h18M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>',
    left: '<path d="M21 6H3M15 12H3M17 18H3"/>',
    center: '<path d="M21 6H3M17 12H7M19 18H5"/>',
    right: '<path d="M21 6H3M21 12H9M21 18H7"/>',
    justify: '<path d="M3 6h18M3 12h18M3 18h18"/>',
    chev: '<path d="m6 9 6 6 6-6"/>'
  };
  const ic = (k, s = 16) => `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${I[k]}</svg>`;

  // The omni2's palettes.
  const TEXT_COLORS = [['#000000', 'black'], ['#727273', 'gray'], ['#a3a3a5', 'lightGray'], ['#dc2626', 'red'], ['#ea580c', 'orange'],
    ['#ca8a04', 'yellow'], ['#16a34a', 'green'], ['#2563eb', 'blue'], ['#9333ea', 'purple'], ['#db2777', 'pink']];
  const HIGHLIGHT_COLORS = [['transparent', 'none'], ['#fef08a', 'yellow'], ['#bbf7d0', 'green'], ['#06b6d4', 'cyan'],
    ['blink-yellow', 'blinkYellow'], ['blink-green', 'blinkGreen'], ['blink-red', 'blinkRed'], ['#bfdbfe', 'blue'],
    ['#fbcfe8', 'pink'], ['#e9d5ff', 'purple'], ['#fed7aa', 'orange'], ['#fecaca', 'red']];
  const SWATCH = { transparent: '#fff', 'blink-green': '#22c55e', 'blink-red': '#dc2626', 'blink-yellow': '#eab308' };

  // What a topic's notes_content may hold, as the omni2 reads it
  // (convertContentToTipTap): TipTap JSON, or HTML from older versions.
  function toTipTap(c) {
    if (!c) return '<p></p>';
    if (typeof c === 'string') {
      if (c.startsWith('{"type":"doc"')) { try { return JSON.parse(c); } catch (e) { return c; } }
      return c;
    }
    if (c.version === 4 && c.content) {
      if (typeof c.content === 'string') { try { return JSON.parse(c.content); } catch (e) { return c.html || '<p></p>'; } }
      return c.content;
    }
    if ((c.version === 4 || c.version === 3) && c.html) return c.html;
    if (c.type === 'doc') return c;
    return '<p></p>';
  }

  // A text colour that is only "black" (pasted from Word or a site, or from
  // the omni2: black, #333, rgb(31, 31, 31)…) is the default colour, not a
  // choice: left in, it stays black on the dark theme. Such colours are
  // dropped when the note opens, so the text follows the theme.
  const NAMED = { black: [0, 0, 0], windowtext: [0, 0, 0] };
  function rgbOf(v) {
    v = String(v || '').trim().toLowerCase();
    if (NAMED[v]) return NAMED[v];
    let m = /^#([0-9a-f]{3}|[0-9a-f]{6})$/.exec(v);
    if (m) { const h = m[1].length === 3 ? m[1].split('').map(c => c + c).join('') : m[1]; return [0, 2, 4].map(i => parseInt(h.slice(i, i + 2), 16)); }
    m = /^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/.exec(v);
    return m ? [+m[1], +m[2], +m[3]] : null;
  }
  // Dark and without colour of its own (grey to black): the default ink.
  const plainInk = v => { const c = rgbOf(v); if (!c) return false; const mx = Math.max(...c), mn = Math.min(...c); return mx < 90 && mx - mn < 30; };
  function dropInk(doc) {
    if (typeof doc === 'string') {
      return doc.replace(/(style\s*=\s*")([^"]*)"/gi, (all, a, css) => {
        const kept = css.split(';').filter(d => { const m = /^\s*color\s*:\s*(.+)$/i.exec(d); return !(m && plainInk(m[1])); }).join(';');
        return a + kept + '"';
      }).replace(/<font([^>]*)\scolor\s*=\s*"([^"]*)"/gi, (all, a, c) => plainInk(c) ? '<font' + a : all);
    }
    const walk = n => {
      if (!n || typeof n !== 'object') return;
      if (Array.isArray(n.marks)) {
        n.marks.forEach(mk => { if (mk && mk.type === 'textStyle' && mk.attrs && plainInk(mk.attrs.color)) mk.attrs.color = null; });
        n.marks = n.marks.filter(mk => !(mk && mk.type === 'textStyle' && mk.attrs && !Object.values(mk.attrs).some(v => v !== null && v !== undefined && v !== '')));
        if (!n.marks.length) delete n.marks;
      }
      if (Array.isArray(n.content)) n.content.forEach(walk);
    };
    walk(doc);
    return doc;
  }

  // Every blob: URL an editor of this page made → its file's id. An editor
  // revokes its URLs when it closes, so pictures copied or cut from one note
  // and pasted in another (another topic's) came in dead: a broken picture,
  // saved as that "blob:…" (04/11/2026). The id brings them back.
  const shown = new Map();

  // A clipboard slice with its pictures' src changed by f.
  function mapSrc(slice, f) {
    const Fragment = slice.content.constructor;
    const walk = frag => {
      let changed = false;
      const out = [];
      frag.forEach(n => {
        let m = n;
        if (!n.isText && n.content.size) { const c = walk(n.content); if (c !== n.content) m = n.copy(c); }
        const s = m.attrs && m.attrs.src;
        if (typeof s === 'string') { const v = f(s); if (v !== s) m = m.type.create({ ...m.attrs, src: v }, m.content, m.marks); }
        if (m !== n) changed = true;
        out.push(m);
      });
      return changed ? Fragment.fromArray(out) : frag;
    };
    const c = walk(slice.content);
    return c === slice.content ? slice : new slice.constructor(c, slice.openStart, slice.openEnd);
  }

  // Every node of a TipTap JSON document with an image src.
  function eachSrc(node, fn) {
    if (!node || typeof node !== 'object') return;
    if (node.attrs && typeof node.attrs.src === 'string') fn(node.attrs);
    if (Array.isArray(node.content)) node.content.forEach(n => eachSrc(n, fn));
  }

  // The editor (≈0.8 MB) is only fetched the first time the tab opens.
  let loading = null;
  function load() {
    if (g.NotesTipTap) return Promise.resolve();
    return loading || (loading = new Promise((resolve, reject) => {
      const css = document.createElement('link');
      css.rel = 'stylesheet'; css.href = 'notes/vendor/katex/katex.min.css';
      document.head.appendChild(css);
      const s = document.createElement('script');
      s.src = 'notes/vendor/tiptap.js';
      s.onload = resolve;
      s.onerror = () => { loading = null; s.remove(); reject(new Error('tiptap')); };
      document.head.appendChild(s);
    }));
  }

  // The topic's notes, kept in its contents.
  async function mount(host, topic) {
    const rec = await D.getContent(topic.id, 'notes');
    return editorIn(host, {
      data: rec && rec.data,
      persist: data => D.putContent(topic.id, 'notes', data),
      fresh: async () => { const r = await D.getContent(topic.id, 'notes'); return r ? { data: r.data } : null; }
    });
  }
  // Any other note in the omni2's format — a mind map node's.
  // o: { data, save(data) }
  function mountDoc(host, o) {
    return editorIn(host, { data: o.data, persist: data => o.save(data), fresh: null });
  }

  // A note kept as HTML — a highlight's (Minhas marcações, the Highlights'
  // "Abrir em tela maior"). o: { html, save({ html, text }) }; an emptied
  // note saves html ''. text is the plain note (an image alone: 🖼).
  function mountHtml(host, o) {
    return editorIn(host, { html: o.html || '', persist: d => o.save(d), fresh: null });
  }

  // o: { data, persist(data) → Promise, fresh() → Promise<{ data } | null> | null }
  //    or, kept as HTML: { html, persist({ html, text }) }
  // The content check (an unknown element would be lost on the next save, so
  // the note opens locked instead) takes every HTML table as unknown: the
  // browser always puts a <tbody> in it, which TipTap 3.31 reads fine but its
  // check doesn't know. So for HTML with tables the check runs on a copy
  // without them; when the rest passes, the note loads unchecked, tables and
  // all. Anything else unknown still locks it.
  function tableSafeCheck(content) {
    if (typeof content !== 'string' || !/<table\b/i.test(content)) return true;
    const { Editor, extensions } = g.NotesTipTap;
    let bad = false;
    const el = document.createElement('div');
    try {
      const probe = new Editor({ element: el, extensions: extensions({ bubble: document.createElement('div') }),
        content: content.replace(/<table\b[\s\S]*?<\/table>/gi, '<p></p>'), enableContentCheck: true, onContentError: () => { bad = true; } });
      probe.destroy();
    } catch (e) { bad = true; }
    return bad;
  }

  // Whether the editor's document has all the HTML's text and pictures.
  function keepsAll(html, doc) {
    const body = new DOMParser().parseFromString('<body>' + html + '</body>', 'text/html').body;
    const bare = s => s.replace(/[\s\u200b\ufeff]+/g, '');
    let pics = 0;
    doc.descendants(n => { if (/^image/.test(n.type.name)) pics++; });
    return bare(body.textContent) === bare(doc.textContent) && body.querySelectorAll('img').length === pics;
  }

  async function editorIn(host, o) {
    const asHtml = typeof o.html === 'string';
    await load();
    const { Editor, extensions } = g.NotesTipTap;
    const root = UI.frag(`<div class="tn">
      <div class="tn-tb" role="toolbar"></div>
      <div class="tn-scroll"><div class="tn-page"></div></div>
    </div>`);
    // The selection's little menu: kept out of the page, the bubble-menu
    // plugin puts it in while there is a selection.
    const bubble = UI.frag(`<div class="tn-bubble">
        <button data-c="bold" title="${UI.esc(t('tn.bold'))}">${ic('bold', 14)}</button>
        <button data-c="italic" title="${UI.esc(t('tn.italic'))}">${ic('italic', 14)}</button>
        <button data-c="underline" title="${UI.esc(t('tn.underline'))}">${ic('underline', 14)}</button>
        <button data-c="link" title="${UI.esc(t('tn.link'))}">${ic('link', 14)}</button>
      </div>`);
    host.appendChild(root);
    const tb = root.querySelector('.tn-tb'), page = root.querySelector('.tn-page');

    // ── images: bnblob:<id> in the file, blob: URLs on screen ──────────────
    const urlOf = new Map(), idOf = new Map();
    const view = (id, blob) => { const u = URL.createObjectURL(blob); urlOf.set(id, u); idOf.set(u, id); shown.set(u, id); return u; };
    // A picture's file id from its src: bnblob:<id>, or a blob: URL of an editor of this page.
    const idIn = s => { const m = /^bnblob:([\w-]+)$/.exec(s); return m ? m[1] : idOf.get(s) || shown.get(s) || null; };
    async function forScreen(doc) {
      doc = dropInk(typeof doc === 'object' && doc ? JSON.parse(JSON.stringify(doc)) : doc);
      // HTML (older notes, the omni2 import): the same, in the markup.
      if (typeof doc === 'string') {
        // A table's <colgroup> (its column widths) is written but never read
        // back: it goes (the widths are recomputed).
        doc = doc.replace(/<colgroup\b[\s\S]*?<\/colgroup>/gi, '');
        const ids = [...new Set([...doc.matchAll(/bnblob:([\w-]+)/g)].map(m => m[1]))];
        await Promise.all(ids.map(id => urlOf.has(id) ? null : D.getBlob(id).then(b => { if (b && !urlOf.has(id)) view(id, b); }).catch(() => {})));
        return doc.replace(/bnblob:([\w-]+)/g, (s, id) => urlOf.get(id) || s);
      }
      if (typeof doc !== 'object') return doc;
      doc = JSON.parse(JSON.stringify(doc));
      // A picture written as a plain 'image' (a capture sent to the notes on
      // 23/10/2026): the editor knows it as 'imageResize'.
      (function fix(n) { if (!n || typeof n !== 'object') return; if (n.type === 'image') n.type = 'imageResize'; (n.content || []).forEach(fix); })(doc);
      const jobs = [];
      eachSrc(doc, a => {
        if (shown.has(a.src)) a.src = 'bnblob:' + shown.get(a.src);
        const m = /^bnblob:([\w-]+)$/.exec(a.src);
        if (!m) return;
        if (urlOf.has(m[1])) { a.src = urlOf.get(m[1]); return; }
        jobs.push(D.getBlob(m[1]).then(b => { if (b) a.src = urlOf.get(m[1]) || view(m[1], b); }).catch(() => {}));
      });
      await Promise.all(jobs);
      return doc;
    }
    function forFile(doc) {
      const id = u => idOf.get(u) || shown.get(u);
      if (typeof doc === 'string') return doc.replace(/blob:[^"'\s)]+/g, u => id(u) ? 'bnblob:' + id(u) : u);
      eachSrc(doc, a => { if (id(a.src)) a.src = 'bnblob:' + id(a.src); });
      return doc;
    }
    async function imageFrom(file) {
      const id = await D.putBlob(file);
      return view(id, file);
    }
    // Pictures pasted as bnblob:<id> (copied from a note closed since, or in
    // another tab): their files are fetched, and the src set without an undo step.
    let reviving = false;
    async function revive() {
      if (reviving || editor.isDestroyed) return;
      reviving = true;
      try {
        const ids = new Set();
        editor.state.doc.descendants(n => { const m = /^bnblob:([\w-]+)$/.exec(n.attrs && n.attrs.src || ''); if (m && !urlOf.has(m[1])) ids.add(m[1]); });
        await Promise.all([...ids].map(id => D.getBlob(id).then(b => { if (b && !urlOf.has(id)) view(id, b); }).catch(() => {})));
        if (editor.isDestroyed) return;
        const tr = editor.state.tr;
        editor.state.doc.descendants((n, pos) => {
          const m = /^bnblob:([\w-]+)$/.exec(n.attrs && n.attrs.src || '');
          if (m && urlOf.has(m[1])) tr.setNodeMarkup(pos, null, { ...n.attrs, src: urlOf.get(m[1]) });
        });
        if (tr.docChanged) editor.view.dispatch(tr.setMeta('addToHistory', false));
      } finally { reviving = false; }
    }

    // ── the editor ─────────────────────────────────────────────────────────
    let savedHash = asHtml ? o.html : o.data ? JSON.stringify(o.data.content) : null;
    let dirty = false, saving = null, timer = 0, dead = false;

    // Past the cloud's space: read only (typing that can't be kept would be lost).
    const readOnly = !!(g.NotesQuota && g.NotesQuota.locked());
    if (readOnly) page.addEventListener('pointerdown', () => g.NotesQuota.explain());
    // A note the editor can't read (a node it doesn't know…) opens read only
    // and is never saved over: an empty editor saved on top would lose it.
    let broken = false;
    // The editor may change its own content while it is being made (a table
    // gets its missing cells, say): its callbacks wait until the toolbar and
    // the rest below exist — before, they hit names not yet set, the setup
    // stopped, and the note showed with an empty toolbar.
    let ready = false;
    const content = await forScreen(asHtml ? (o.html || '<p></p>') : toTipTap(o.data));
    // A picture in the note, double-clicked: the zoom (as in questions and cards; #69).
    page.addEventListener('dblclick', e => { const im = e.target.closest && e.target.closest('img'); if (im && im.src) { e.preventDefault(); UI.zoomImage(im.currentSrc || im.src); } });
    const editor = new Editor({
      element: page,
      editable: !readOnly,
      enableContentCheck: tableSafeCheck(content),
      onContentError: ({ error }) => { broken = error; },
      extensions: extensions({ placeholder: t('tn.placeholder'), summaryPlaceholder: t('tn.summaryPh'), bubble }),
      content,
      editorProps: {
        attributes: { class: 'tn-doc', spellcheck: 'true' },
        // Copied pictures carry their file (bnblob:<id>), not this editor's
        // blob: URL, which dies with it; pasted, they get one of this editor.
        transformCopied: slice => mapSrc(slice, s => idOf.has(s) ? 'bnblob:' + idOf.get(s) : s),
        transformPasted: slice => {
          let wait = false;
          const out = mapSrc(slice, s => {
            const id = idIn(s);
            if (!id) return s;
            if (urlOf.has(id)) return urlOf.get(id);
            wait = true;
            return 'bnblob:' + id;
          });
          if (wait) setTimeout(revive);
          return out;
        },
        handlePaste: (v, e) => {
          const f = [...(e.clipboardData && e.clipboardData.files || [])].find(x => x.type.startsWith('image/'));
          if (!f) return false;     // text: Ctrl+V with formatting, Ctrl+Shift+V plain
          e.preventDefault();
          imageFrom(f).then(src => editor.chain().focus().setImage({ src }).run());
          return true;
        },
        handleDrop: (v, e, slice, moved) => {
          const fs = [...(e.dataTransfer && e.dataTransfer.files || [])].filter(x => x.type.startsWith('image/'));
          if (moved || !fs.length) return false;
          e.preventDefault();
          const at = v.posAtCoords({ left: e.clientX, top: e.clientY });
          (async () => {
            for (const f of fs) {
              const src = await imageFrom(f);
              editor.chain().focus().insertContentAt(at ? at.pos : editor.state.selection.to, { type: 'imageResize', attrs: { src } }).run();
            }
          })();
          return true;
        }
      },
      onUpdate: () => { if (!ready) return; dirty = true; status(''); clearTimeout(timer); timer = setTimeout(save, SAVE_MS); },
      onTransaction: () => { if (ready) paint(); }
    });

    // Saves when something changed; a save running is waited for.
    async function save() {
      clearTimeout(timer);
      if (saving) await saving;
      if (broken || !dirty || editor.isDestroyed) return;
      dirty = false;
      let data, hash;
      if (asHtml) {
        const html = editor.isEmpty ? '' : forFile(editor.getHTML());
        const text = editor.getText({ blockSeparator: '\n', textSerializers: { imageResize: () => '🖼', image: () => '🖼' } }).replace(/\n{3,}/g, '\n\n').trim();
        data = { html, text };
        hash = html;
      } else {
        const content = forFile(editor.getJSON());
        data = { version: 4, content };
        hash = JSON.stringify(content);
      }
      if (hash === savedHash) { status('saved'); return; }
      status('saving');
      saving = Promise.resolve(o.persist(data))
        .then(() => { savedHash = hash; if (!dead) status('saved'); })
        .catch(e => { console.error(e); dirty = true; if (!dead) status('fail'); })
        .finally(() => { saving = null; });
      await saving;
    }

    // HTML the check calls unknown may still be read whole: the check takes
    // the <div> lines and the <span> colours of the Highlights' note box
    // (and its own coloured text) as unknown, though the editor reads them
    // (29/10/2026: every formatted mark note of two lines opened locked).
    // So for HTML, it locks only when text or a picture would be lost.
    if (broken && typeof content === 'string' && keepsAll(content, editor.state.doc)) broken = false;
    if (broken) { console.error('Notes: note not readable, kept as it is', broken); editor.setEditable(false); UI.toast(t('tn.unreadable')); }

    // ── tool bar (the omni2's, in its order) ───────────────────────────────
    const ch = () => editor.chain().focus();
    const B = (c, icon, title, run, active, can) => ({ c, icon, title, run, active, can });
    const groups = [
      [B('undo', 'undo', 'tn.undo', () => ch().undo().run(), null, () => editor.can().undo()),
        B('redo', 'redo', 'tn.redo', () => ch().redo().run(), null, () => editor.can().redo())],
      [B('bold', 'bold', 'tn.bold', () => ch().toggleBold().run(), () => editor.isActive('bold')),
        B('italic', 'italic', 'tn.italic', () => ch().toggleItalic().run(), () => editor.isActive('italic')),
        B('underline', 'underline', 'tn.underline', () => ch().toggleUnderline().run(), () => editor.isActive('underline')),
        B('strike', 'strike', 'tn.strike', () => ch().toggleStrike().run(), () => editor.isActive('strike')),
        B('code', 'code', 'tn.code', () => ch().toggleCode().run(), () => editor.isActive('code'))],
      [B('color', 'palette', 'tn.color', b => palette(b, TEXT_COLORS, v => ch().setColor(v).run(), 'tn.c.')),
        B('mark', 'highlight', 'tn.highlight', b => palette(b, HIGHLIGHT_COLORS, v => v === 'transparent' ? ch().unsetHighlight().run() : ch().setHighlight({ color: v }).run(), 'tn.h.'))],
      [1, 2, 3].map(l => B('h' + l, 'h' + l, 'tn.h' + l, () => ch().toggleHeading({ level: l }).run(), () => editor.isActive('heading', { level: l }))),
      [B('ul', 'list', 'tn.list', () => ch().toggleBulletList().run(), () => editor.isActive('bulletList')),
        B('ol', 'olist', 'tn.olist', () => ch().toggleOrderedList().run(), () => editor.isActive('orderedList')),
        B('task', 'task', 'tn.task', () => ch().toggleTaskList().run(), () => editor.isActive('taskList'))],
      [B('quote', 'quote', 'tn.quote', () => ch().toggleBlockquote().run(), () => editor.isActive('blockquote')),
        B('hr', 'hr', 'tn.hr', () => ch().setHorizontalRule().run()),
        B('details', 'details', 'tn.details', () => editor.isActive('details') ? ch().unsetDetails().run() : ch().setDetails().run(), () => editor.isActive('details'))],
      [B('link', 'link', 'tn.link', () => linkDialog(), () => editor.isActive('link')),
        B('image', 'image', 'tn.image', () => pickImage()),
        B('youtube', 'youtube', 'tn.youtube', () => youtube()),
        B('table', 'table', 'tn.table', () => ch().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run())],
      // Only while the cursor is in a table, as in the omni2.
      [B('addCol', 'cols', 'tn.addCol', () => ch().addColumnAfter().run()),
        B('addRow', 'rows', 'tn.addRow', () => ch().addRowAfter().run()),
        B('delCol', 'cols', 'tn.delCol', () => ch().deleteColumn().run()),
        B('delRow', 'rows', 'tn.delRow', () => ch().deleteRow().run()),
        B('delTable', 'trash', 'tn.delTable', () => ch().deleteTable().run())],
      [['left', 'left'], ['center', 'center'], ['right', 'right'], ['justify', 'justify']].map(([a, k]) =>
        B('al-' + a, k, 'tn.al.' + a, () => ch().setTextAlign(a).run(), () => editor.isActive({ textAlign: a })))
    ];
    const all = new Map();
    groups.forEach((grp, gi) => {
      const box = document.createElement('div');
      box.className = 'tn-grp' + (gi === 7 ? ' tn-table' : '');
      grp.forEach(b => {
        const el = UI.frag(`<button type="button" class="tn-btn${/^del/.test(b.c) ? ' danger' : ''}" title="${UI.esc(t(b.title))}" aria-label="${UI.esc(t(b.title))}">${ic(b.icon)}${b.c === 'color' || b.c === 'mark' ? ic('chev', 10) : ''}</button>`);
        // mousedown, not click: the editor keeps its selection.
        el.addEventListener('mousedown', e => { e.preventDefault(); if (!el.disabled) b.run(el); });
        el.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); b.run(el); } });
        box.appendChild(el);
        all.set(b.c, { b, el });
      });
      tb.appendChild(box);
    });
    tb.appendChild(UI.frag(`<span class="tn-status" aria-live="polite"></span>`));
    const stEl = tb.querySelector('.tn-status');
    function status(s) {
      stEl.dataset.s = s;
      stEl.textContent = s ? t('tn.st.' + s) : '';
    }
    let raf = 0;
    function paint() {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        if (editor.isDestroyed) return;
        all.forEach(({ b, el }) => {
          if (b.active) el.classList.toggle('on', !!b.active());
          if (b.can) el.disabled = !b.can();
        });
        tb.querySelector('.tn-table').hidden = !editor.isActive('table');
        bubble.querySelectorAll('[data-c]').forEach(x => x.classList.toggle('on', editor.isActive(x.dataset.c)));
      });
    }
    bubble.querySelectorAll('[data-c]').forEach(x => x.addEventListener('mousedown', e => {
      e.preventDefault();
      const c = x.dataset.c;
      if (c === 'link') linkDialog();
      else ch()['toggle' + c[0].toUpperCase() + c.slice(1)]().run();
    }));

    // A row of colour swatches under the button.
    let pop = null;
    function closePop() { if (pop) { pop.remove(); pop = null; document.removeEventListener('pointerdown', outside, true); } }
    const outside = e => { if (pop && !pop.contains(e.target)) closePop(); };
    function palette(btn, colors, pick, key) {
      if (pop) { closePop(); return; }
      pop = document.createElement('div');
      pop.className = 'tn-pop';
      colors.forEach(([v, name]) => {
        const s = document.createElement('button');
        s.type = 'button';
        s.className = 'tn-sw' + (v.startsWith('blink') ? ' blink' : '');
        s.style.background = SWATCH[v] || v;
        s.title = t(key + name);
        s.addEventListener('mousedown', e => { e.preventDefault(); pick(v); closePop(); });
        pop.appendChild(s);
      });
      const r = btn.getBoundingClientRect(), rr = root.getBoundingClientRect();
      pop.style.left = Math.min(r.left - rr.left, rr.width - 160) + 'px';
      pop.style.top = (r.bottom - rr.top + 4) + 'px';
      root.appendChild(pop);
      setTimeout(() => document.addEventListener('pointerdown', outside, true));
    }

    async function linkDialog() {
      const prev = editor.getAttributes('link').href || '';
      const r = await UI.dialog({
        title: t('tn.linkTitle'),
        body: `<input class="bn-input" type="url" value="${UI.esc(prev)}" placeholder="https://exemplo.com">`,
        actions: [{ label: t('common.cancel') }, { label: t('tn.insert'), kind: 'primary' }],
        onOpen: root => { const i = root.querySelector('input'); i.focus(); i.select(); },
        collect: root => ({ url: root.querySelector('input').value.trim() })
      });
      if (!r) { editor.commands.focus(); return; }
      let url = r.url;
      if (url && !/^(https?:|mailto:)/i.test(url)) url = 'https://' + url;
      if (!url) ch().extendMarkRange('link').unsetLink().run();
      // Nothing selected and not on a link: the address goes in as the text
      // (and what is typed next stays out of the link).
      else if (!prev && editor.state.selection.empty) ch().insertContent({ type: 'text', text: url, marks: [{ type: 'link', attrs: { href: url } }] }).unsetMark('link').run();
      else ch().extendMarkRange('link').setLink({ href: url }).run();
    }
    async function pickImage() {
      const f = await UI.pickFile('image/*');
      if (!f) return;
      const src = await imageFrom(f);
      ch().setImage({ src }).run();
    }
    async function youtube() {
      const url = await UI.prompt(t('tn.youtubeTitle'), '', '');
      if (!url || !url.trim()) return;
      if (!ch().setYoutubeVideo({ src: url.trim(), width: 640, height: 360 }).run()) UI.toast(t('tn.youtubeBad'));
    }

    // Ctrl+S saves now (it saves on its own a moment after typing stops).
    const onKey = e => { if ((e.ctrlKey || e.metaKey) && !e.altKey && e.key.toLowerCase() === 's') { e.preventDefault(); dirty = true; save(); } };
    root.addEventListener('keydown', onKey);
    ready = true;
    paint();
    if (asHtml ? !o.html : !o.data) editor.commands.focus('end');

    return {
      flush: save,
      // After a sync brought a newer note (this one was saved first).
      async reload() {
        if (dirty || saving || !o.fresh) return;
        const r = await o.fresh();
        const hash = r ? JSON.stringify(r.data && r.data.content) : null;
        if (!r || hash === savedHash || editor.isDestroyed) return;
        savedHash = hash;
        const { from, to } = editor.state.selection;
        editor.commands.setContent(await forScreen(toTipTap(r.data)), { emitUpdate: false });
        try { editor.commands.setTextSelection({ from: Math.min(from, editor.state.doc.content.size), to: Math.min(to, editor.state.doc.content.size) }); } catch (e) {}
      },
      async destroy() {
        await save();
        dead = true;
        closePop();
        cancelAnimationFrame(raf);
        editor.destroy();
        urlOf.forEach(u => URL.revokeObjectURL(u));
        root.remove();
      }
    };
  }

  g.NotesTopicNotes = { mount, mountDoc, mountHtml, toTipTap };
})(window);
