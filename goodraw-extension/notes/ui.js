// GooNotes — small UI kit shared by the library and the editor:
// icons, dialogs, pop-up menus, toasts and downloads.
(function (g) {
  'use strict';
  const { t } = g.NotesI18n;

  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  // Same Lucide-style strokes as the bar in content.js; the drawing tools use
  // the very same paths so the two toolbars read as one product.
  const P = {
    select: '<path d="m3 3 7.07 16.97 2.51-7.39 7.39-2.51z"/>',
    lasso: '<path d="M7 22a5 5 0 0 1-2-4"/><path d="M3.3 14A6.8 6.8 0 0 1 2 10c0-4.4 4.5-8 10-8s10 3.6 10 8-4.5 8-10 8a12 12 0 0 1-5-1"/><path d="M5 18a2 2 0 1 0 0-4 2 2 0 0 0 0 4z"/>',
    lock: '<rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>',
    unlock: '<rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 9.9-1"/>',
    pencil: '<path d="M21.2 6.8a1 1 0 0 0-4-4L3.8 16.2a2 2 0 0 0-.5.8l-1.3 4.4a.5.5 0 0 0 .6.6l4.4-1.3a2 2 0 0 0 .8-.5z"/><path d="m15 5 4 4"/>',
    highlight: '<path d="m9 11-6 6v3h9l3-3"/><path d="m22 12-4.6 4.6a2 2 0 0 1-2.8 0l-5.2-5.2a2 2 0 0 1 0-2.8L14 4"/>',
    line: '<path d="M4 20 20 4"/>',
    rect: '<rect x="3" y="5" width="18" height="14" rx="2"/>',
    circle: '<ellipse cx="12" cy="12" rx="9" ry="7.5"/>',
    eraser: '<path d="m7 21-4.3-4.3a2 2 0 0 1 0-2.8l9.6-9.6a2 2 0 0 1 2.8 0l5.6 5.6a2 2 0 0 1 0 2.8L13.5 21"/><path d="M22 21H8"/><path d="m5 11 8 8"/>',
    text: '<path d="M4 7V5h16v2"/><path d="M12 5v14"/><path d="M9 19h6"/>',
    image: '<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.1-3.1a2 2 0 0 0-2.8 0L6 21"/>',
    undo: '<path d="M9 14 4 9l5-5"/><path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11"/>',
    redo: '<path d="m15 14 5-5-5-5"/><path d="M20 9H9.5a5.5 5.5 0 0 0 0 11H13"/>',
    back: '<path d="m12 19-7-7 7-7"/><path d="M19 12H5"/>',
    more: '<circle cx="12" cy="5" r="1.2"/><circle cx="12" cy="12" r="1.2"/><circle cx="12" cy="19" r="1.2"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    minus: '<path d="M5 12h14"/>',
    left: '<path d="m15 18-6-6 6-6"/>',
    right: '<path d="m9 18 6-6-6-6"/>',
    up: '<path d="m18 15-6-6-6 6"/>',
    down: '<path d="m6 9 6 6 6-6"/>',
    trash: '<path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/>',
    download: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="m7 10 5 5 5-5"/><path d="M12 15V3"/>',
    upload: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="m17 8-5-5-5 5"/><path d="M12 3v12"/>',
    file: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/>',
    edit: '<path d="M12 20h9"/><path d="M16.4 3.6a2 2 0 0 1 2.8 2.8L7 18.6 3 20l1.4-4z"/>',
    paper: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M8 13h8M8 17h8M8 9h2"/>',
    keyboard: '<rect x="2" y="6" width="20" height="12" rx="2"/><path d="M6 10h.01M10 10h.01M14 10h.01M18 10h.01M7 14h10"/>',
    fit: '<path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/>',
    close: '<path d="M18 6 6 18"/><path d="m6 6 12 12"/>',
    folder: '<path d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.7-.9l-.8-1.2A2 2 0 0 0 7.9 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2z"/>',
    folderPlus: '<path d="M12 10v6M9 13h6"/><path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.7-.9l-.8-1.2A2 2 0 0 0 7.9 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2z"/>',
    search: '<circle cx="11" cy="11" r="7.5"/><path d="m20.5 20.5-4.2-4.2"/>',
    settings: '<path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/>',
    topic: '<path d="M4 4h16v4H4z"/><path d="M8 12h12M8 16h12M8 20h12M4 12v8"/>',
    maximize: '<path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/>',
    tag: '<path d="M12.6 2.6A2 2 0 0 0 11.2 2H4a2 2 0 0 0-2 2v7.2a2 2 0 0 0 .6 1.4l8.7 8.7a2.4 2.4 0 0 0 3.4 0l6.6-6.6a2.4 2.4 0 0 0 0-3.4z"/><circle cx="7.5" cy="7.5" r="1.2"/>',
    split: '<path d="M16 3h5v5"/><path d="M8 3H3v5"/><path d="M12 22v-8.3a4 4 0 0 0-1.2-2.9L3 3"/><path d="m15 9 6-6"/>',
    indent: '<path d="M21 6H11M21 12H11M21 18H11"/><path d="m3 8 4 4-4 4"/>',
    outdent: '<path d="M21 6H11M21 12H11M21 18H11"/><path d="m7 8-4 4 4 4"/>',
    crop: '<path d="M6 2v14a2 2 0 0 0 2 2h14"/><path d="M18 22V8a2 2 0 0 0-2-2H2"/>',
    link: '<path d="M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7"/><path d="M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7"/>',
    external: '<path d="M15 3h6v6"/><path d="M10 14 21 3"/><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>',
    notes: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M8 13h8M8 17h6"/>',
    mindmap: '<circle cx="12" cy="12" r="3"/><circle cx="4" cy="5" r="2"/><circle cx="20" cy="5" r="2"/><circle cx="4" cy="19" r="2"/><circle cx="20" cy="19" r="2"/><path d="m6 6 3.6 3.6M18 6l-3.6 3.6M6 18l3.6-3.6M18 18l-3.6-3.6"/>',
    cloud: '<path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z"/>',
    refresh: '<path d="M3 12a9 9 0 0 1 15-6.7L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-15 6.7L3 16"/><path d="M8 16H3v5"/>',
    sidebar: '<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 3v18"/>',
    pages: '<rect x="8" y="2" width="13" height="16" rx="2"/><path d="M4 6v14a2 2 0 0 0 2 2h10"/>',
    textsel: '<path d="M5 4h4M7 4v16M5 20h4"/><path d="M13 7h8M13 12h8M13 17h5"/>',
    copy: '<rect x="8" y="8" width="13" height="13" rx="2"/><path d="M4 16a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2"/>',
    underline: '<path d="M6 4v6a6 6 0 0 0 12 0V4"/><path d="M4 20h16"/>',
    strike: '<path d="M16 4H9a3 3 0 0 0-2.8 4"/><path d="M14 12a4 4 0 0 1 0 8H6"/><path d="M4 12h16"/>',
    whiteout: '<path d="M4 7V4h16v3"/><path d="M5 20h6"/><path d="M13 4 8 20"/><path d="m15 15 5 5"/><path d="m20 15-5 5"/>',
    board: '<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 3v18M15 3v12"/>',
    list: '<path d="M9 6h12M9 12h12M9 18h12"/><path d="m3 6 1 1 2-2M3 12l1 1 2-2M3 18l1 1 2-2"/>',
    note: '<path d="M16 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V8z"/><path d="M15 3v4a2 2 0 0 0 2 2h4"/>',
    filePdf: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/><path d="M12 12v6M9 15l3 3 3-3"/>',
    home2: '<path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V20a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1V9.5"/>',
    globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18"/><path d="M12 3a14 14 0 0 1 0 18a14 14 0 0 1 0-18z"/>',
    trophy: '<path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/>',
    star: '<path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2L12 17.3 6.4 20.2l1.1-6.2L3 9.6l6.2-.9z"/>',
    notebook: '<path d="M13.4 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-7.4"/><path d="M2 6h4M2 10h4M2 14h4M2 18h4"/><path d="M21.4 5.6a1 1 0 1 0-3-3l-5 5a2 2 0 0 0-.5.9l-.8 2.8a.5.5 0 0 0 .6.6l2.9-.8a2 2 0 0 0 .8-.5z"/>',
    // The side menu (nav.js).
    chart: '<path d="M3 3v16a2 2 0 0 0 2 2h16"/><path d="M8 17v-5M13 17V7M18 17v-8"/>',
    book: '<path d="M12 7v14"/><path d="M3 18a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h5a4 4 0 0 1 4 4 4 4 0 0 1 4-4h5a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1h-6a3 3 0 0 0-3 3 3 3 0 0 0-3-3z"/>',
    calendar: '<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/><path d="m9 16 2 2 4-4"/>',
    cycle: '<path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"/><path d="M16 16h5v5"/>',
    clock: '<circle cx="12" cy="13" r="8"/><path d="M12 9v4l2 2"/><path d="M10 2h4"/>',
    cards: '<rect x="2" y="7" width="15" height="14" rx="2"/><path d="M7 3h13a2 2 0 0 1 2 2v12"/>',
    pen: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/><path d="m10 18 6-6-2-2-6 6v2z"/>',
    help: '<circle cx="12" cy="12" r="9"/><path d="M9.1 9a3 3 0 0 1 5.8 1c0 2-3 3-3 3"/><path d="M12 17h.01"/>',
    pip: '<rect x="2" y="4" width="20" height="16" rx="2"/><rect x="12" y="11" width="7" height="6" rx="1"/>',
    message: '<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>',
    // The Feed (feed.js): the menu's item, liking and reporting.
    feed: '<path d="M15 18h-5"/><path d="M18 14h-8"/><path d="M4 22h16a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v16a2 2 0 0 1-4 0v-9a2 2 0 0 1 2-2h2"/><rect x="10" y="6" width="8" height="4" rx="1"/>',
    heart: '<path d="M19 14c1.5-1.5 3-3.2 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.8 0-3 .5-4.5 2-1.5-1.5-2.7-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4 3 5.5l7 7z"/>',
    flag: '<path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><path d="M4 22v-7"/>',
    trend: '<path d="m22 7-8.5 8.5-5-5L2 17"/><path d="M16 7h6v6"/>',
    video: '<path d="m16 13 5.2 3.5a.5.5 0 0 0 .8-.4V7.9a.5.5 0 0 0-.8-.4L16 11"/><rect x="2" y="6" width="14" height="12" rx="2"/>',
    mic: '<rect x="9" y="2" width="6" height="12" rx="3"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><path d="M12 19v3"/>',
    alert: '<path d="m21.7 18-8-14a2 2 0 0 0-3.4 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.7-3"/><path d="M12 9v4M12 17h.01"/>',
    check: '<path d="M20 6 9 17l-5-5"/>',
    pause: '<rect x="6" y="4" width="4" height="16" rx="1"/><rect x="14" y="4" width="4" height="16" rx="1"/>',
    square: '<rect x="5" y="5" width="14" height="14" rx="2"/>',
    mail: '<rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-10 6L2 7"/>',
    eye: '<path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
    eyeOff: '<path d="M9.9 4.2A10.4 10.4 0 0 1 12 4c6.4 0 10 8 10 8a17 17 0 0 1-2.2 3.2M6.6 6.6A17 17 0 0 0 2 12s3.6 8 10 8a9.7 9.7 0 0 0 5.4-1.6M2 2l20 20"/><path d="M14.1 14.1a3 3 0 0 1-4.2-4.2"/>',
    play: '<path d="M7 4v16l13-8z"/>',
    target: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/>',
    compass: '<circle cx="12" cy="12" r="9"/><path d="M15.5 8.5l-2 5-5 2 2-5z"/>',
    sparkle: '<path d="M12 3v4M12 17v4M3 12h4M17 12h4M5.6 5.6l2.8 2.8M15.6 15.6l2.8 2.8M5.6 18.4l2.8-2.8M15.6 8.4l2.8-2.8"/>',
    shelf: '<path d="M3 20h18M5 20V6h3v14M9.5 20V4h3v16M14.5 20l2.2-13.5 3 .5L17.5 20"/>',
    pix: '<path d="M12 2.8l3.2 3.2-3.2 3.2-3.2-3.2zM12 14.8l3.2 3.2-3.2 3.2-3.2-3.2zM2.8 12L6 8.8l3.2 3.2L6 15.2zM14.8 12L18 8.8l3.2 3.2-3.2 3.2z"/>',
    clipboard: '<rect x="8" y="2" width="8" height="4" rx="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><path d="m9 14 2 2 4-4"/>',
    phone: '<rect width="14" height="20" x="5" y="2" rx="2" ry="2"/><path d="M12 18h.01"/>',
  };
  const icon = (k, size = 18) => `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${P[k] || ''}</svg>`;

  const frag = html => { const d = document.createElement('template'); d.innerHTML = html.trim(); return d.content.firstElementChild; };
  // The text of an HTML string (tags out, entities decoded, one line): the
  // one format the alternatives of a question are kept and shown in, and
  // what a list shows of a statement.
  const parser = typeof DOMParser === 'function' ? new DOMParser() : null;
  const plainText = html => (parser ? (parser.parseFromString('<body>' + String(html || '') + '</body>', 'text/html').body.textContent || '') : String(html || '').replace(/<[^>]*>/g, '')).replace(/\s+/g, ' ').trim();
  // Text as it should show: decoded when it carries markup or an entity (an
  // old alternative kept escaped, HTML from an exam's site), as it is
  // otherwise — "x<y" in a logic question is text, not the start of a tag.
  const textOf = s => (/&[a-z#0-9]+;|<\/?[a-z][^<>]*>/i.test(String(s || '')) ? plainText(s) : String(s || '').replace(/\s+/g, ' ').trim());

  // ─── DIALOG ──────────────────────────────────────────────────────────────
  // actions: [{ label, kind: 'primary'|'danger'|undefined, value }]. Resolves
  // with the value of the button pressed, or null for Esc / backdrop / ✕.
  // `onOpen(root)` runs once it is in the page; `collect(root)` turns the
  // primary button's value into whatever the form holds.
  // The open dialogs, the last one on top (Onda 3, 01/11/2026): only the top
  // one answers the keys, the focus stays inside it (Tab wraps), and closing
  // it gives the focus back to the dialog below or to what opened it.
  const stack = [];
  let seq = 0;
  const FOCUS = 'button:not([disabled]), [href], input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"]), [contenteditable="true"]';
  const focusables = root => [...root.querySelectorAll(FOCUS)].filter(el => el.offsetParent !== null || el === document.activeElement);
  const focusTop = () => {
    const top = stack[stack.length - 1];
    if (!top) return;
    const f = top.querySelector('.bn-dlg-actions .primary, .bn-dlg-actions .danger') || focusables(top)[0];
    if (f) f.focus();
  };
  function dialog({ title, body, actions, onOpen, collect, wide }) {
    return new Promise(resolve => {
      const hid = 'bn-dlg-t' + (++seq);
      const root = frag(`<div class="bn-modal" role="dialog" aria-modal="true" aria-labelledby="${hid}">
        <div class="bn-dlg${wide ? ' wide' : ''}">
          <div class="bn-dlg-hdr"><h2 id="${hid}">${esc(title)}</h2><button class="bn-icon-btn" data-x title="${esc(t('common.close'))}">${icon('close')}</button></div>
          <div class="bn-dlg-body"></div>
          <div class="bn-dlg-actions"></div>
        </div></div>`);
      const bodyEl = root.querySelector('.bn-dlg-body');
      if (typeof body === 'string') bodyEl.innerHTML = body; else if (body) bodyEl.appendChild(body);
      const acts = root.querySelector('.bn-dlg-actions');
      const opener = document.activeElement;
      let done = false, dirty = false;
      stack.push(root);
      const finish = v => {
        if (done) return; done = true;
        stack.splice(stack.indexOf(root), 1);
        document.removeEventListener('keydown', onKey, true);
        root.classList.remove('show');
        setTimeout(() => root.remove(), 160);
        if (stack.length) focusTop();
        else if (opener && opener.focus && document.contains(opener)) { try { opener.focus({ preventScroll: true }); } catch (e) {} }
        resolve(v);
      };
      (actions || []).forEach(a => {
        const b = document.createElement('button');
        b.className = 'bn-btn' + (a.kind ? ' ' + a.kind : '');
        b.textContent = a.label;
        b.addEventListener('click', () => {
          if (a.kind === 'primary' && collect) {
            const v = collect(root);
            if (v === undefined) return;   // form not ready: stay open
            finish(v);
          } else finish(a.value ?? null);
        });
        acts.appendChild(b);
      });
      const onKey = e => {
        if (stack[stack.length - 1] !== root) return;   // a dialog above this one answers
        // A field with a list open (the tag picker) closes the list first.
        if (e.key === 'Escape' && e.target.dataset && e.target.dataset.ownEsc) return;
        if (e.key === 'Escape') { e.preventDefault(); e.stopImmediatePropagation(); finish(null); }
        else if (e.key === 'Tab') {
          const f = focusables(root);
          if (!f.length) { e.preventDefault(); return; }
          const first = f[0], last = f[f.length - 1], cur = document.activeElement;
          if (!root.contains(cur)) { e.preventDefault(); first.focus(); }
          else if (e.shiftKey && cur === first) { e.preventDefault(); last.focus(); }
          else if (!e.shiftKey && cur === last) { e.preventDefault(); first.focus(); }
        }
        // A field inside a form of its own (a new tag, say) handles its Enter.
        else if (e.key === 'Enter' && !e.shiftKey && e.target.tagName !== 'TEXTAREA' && e.target.tagName !== 'BUTTON' && !e.target.isContentEditable && !e.target.closest('form')) {
          const p = acts.querySelector('.primary, .danger');
          if (p) { e.preventDefault(); e.stopImmediatePropagation(); p.click(); }
        }
      };
      document.addEventListener('keydown', onKey, true);
      // A form with something typed in doesn't close on a stray click on the backdrop.
      bodyEl.addEventListener('input', () => { dirty = true; });
      bodyEl.addEventListener('change', () => { dirty = true; });
      root.addEventListener('pointerdown', e => { if (e.target === root && !(collect && dirty)) finish(null); });
      root.querySelector('[data-x]').addEventListener('click', () => finish(null));
      document.body.appendChild(root);
      requestAnimationFrame(() => root.classList.add('show'));
      if (onOpen) onOpen(root);
      // The main button takes the focus (Enter), without scrolling a tall form
      // down to it.
      else { const f = acts.querySelector('.primary, .danger'); if (f) { try { f.focus({ preventScroll: true }); } catch (e) { f.focus(); } } }
      // Every window opens at its top (05/11/2026, the owner's rule): whatever
      // got the focus (a field low in the form, the Save button), the reading
      // starts from the title — now and once the opening animation settles.
      const dlg = root.querySelector('.bn-dlg');
      const atTop = () => { if (!done) { dlg.scrollTop = 0; bodyEl.scrollTop = 0; } };
      atTop(); requestAnimationFrame(atTop); setTimeout(atTop, 200);
    });
  }

  const confirm = (title, text, okLabel, danger) => dialog({
    title, body: `<p>${text}</p>`,
    actions: [{ label: t('common.cancel') }, { label: okLabel, kind: danger ? 'danger' : 'primary', value: true }]
  }).then(v => v === true);

  function prompt(title, value, placeholder) {
    return dialog({
      title,
      body: `<input class="bn-input" type="text" maxlength="120" value="${esc(value || '')}" placeholder="${esc(placeholder || '')}">`,
      actions: [{ label: t('common.cancel') }, { label: t('common.save'), kind: 'primary' }],
      onOpen: r => { const i = r.querySelector('input'); i.focus(); i.select(); },
      collect: r => r.querySelector('input').value.trim()
    });
  }

  // ─── POP-UP MENU ─────────────────────────────────────────────────────────
  // items: [{ label, icon, onClick, danger, disabled, checked } | 'sep']
  let openMenu = null;
  function menu(anchor, items, align = 'right') {
    closeMenu();
    const m = document.createElement('div');
    m.className = 'bn-menu';
    m.setAttribute('role', 'menu');
    items.forEach(it => {
      if (it === 'sep') { m.appendChild(frag('<div class="bn-menu-sep" role="separator"></div>')); return; }
      const b = document.createElement('button');
      b.className = 'bn-menu-item' + (it.danger ? ' danger' : '') + (it.checked ? ' checked' : '');
      b.setAttribute('role', 'menuitem');
      b.disabled = !!it.disabled;
      b.innerHTML = (it.icon ? icon(it.icon, 16) : '<span class="bn-menu-pad"></span>') + `<span>${esc(it.label)}</span>`;
      b.addEventListener('click', () => { closeMenu(); it.onClick && it.onClick(); });
      m.appendChild(b);
    });
    document.body.appendChild(m);
    const r = anchor.getBoundingClientRect();
    const mw = m.offsetWidth, mh = m.offsetHeight;
    let x = align === 'right' ? r.right - mw : r.left;
    let y = r.bottom + 6;
    if (y + mh > innerHeight - 8) y = Math.max(8, r.top - mh - 6);
    x = Math.max(8, Math.min(x, innerWidth - mw - 8));
    m.style.left = x + 'px'; m.style.top = y + 'px';
    const off = e => { if (!m.contains(e.target) && !anchor.contains(e.target)) closeMenu(); };
    // The keyboard (Onda 3): ↑ ↓ Home End move, Enter and Space press, Esc
    // closes and gives the focus back to the button that opened it.
    const btns = () => [...m.querySelectorAll('.bn-menu-item:not(:disabled)')];
    const key = e => {
      const list = btns(), i = list.indexOf(document.activeElement);
      if (e.key === 'Escape') { e.stopPropagation(); closeMenu(); if (anchor.focus) anchor.focus({ preventScroll: true }); }
      else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); if (list.length) list[e.key === 'ArrowDown' ? (i + 1) % list.length : (i - 1 + list.length) % list.length].focus(); }
      else if (e.key === 'Home' || e.key === 'End') { e.preventDefault(); if (list.length) list[e.key === 'Home' ? 0 : list.length - 1].focus(); }
      else if (e.key === 'Tab') closeMenu();
    };
    setTimeout(() => document.addEventListener('pointerdown', off, true));
    document.addEventListener('keydown', key, true);
    openMenu = { m, off, key };
    requestAnimationFrame(() => { m.classList.add('show'); const f = btns()[0]; if (f) f.focus({ preventScroll: true }); });
  }
  function closeMenu() {
    if (!openMenu) return;
    document.removeEventListener('pointerdown', openMenu.off, true);
    document.removeEventListener('keydown', openMenu.key, true);
    openMenu.m.remove();
    openMenu = null;
  }

  // ─── POPOVER ─────────────────────────────────────────────────────────────
  // A small panel hanging from a button (tags, links): stays open while it's
  // used, closes on a click outside, Esc or the same button. onClose runs once.
  let openPop = null;
  function popover(anchor, el, opts = {}) {
    const again = openPop && openPop.anchor === anchor;
    closePopover();
    if (again) return null;
    closeMenu();
    const p = document.createElement('div');
    p.className = 'bn-pop' + (opts.cls ? ' ' + opts.cls : '');
    p.appendChild(el);
    document.body.appendChild(p);
    const place = () => {
      const r = anchor.getBoundingClientRect(), pw = p.offsetWidth, ph = p.offsetHeight;
      let x = r.right - pw, y = r.bottom + 6;
      if (y + ph > innerHeight - 8) y = Math.max(8, r.top - ph - 6);
      p.style.left = Math.max(8, Math.min(x, innerWidth - pw - 8)) + 'px'; p.style.top = y + 'px';
    };
    place();
    const off = e => { if (!p.contains(e.target) && !anchor.contains(e.target) && !e.target.closest('.bn-dlg, .bn-menu')) closePopover(); };
    const key = e => { if (e.key === 'Escape') { e.stopPropagation(); closePopover(); } };
    setTimeout(() => document.addEventListener('pointerdown', off, true));
    document.addEventListener('keydown', key, true);
    addEventListener('resize', place);
    anchor.classList.add('open');
    openPop = { p, anchor, off, key, place, onClose: opts.onClose };
    requestAnimationFrame(() => p.classList.add('show'));
    return { el: p, place, close: closePopover };
  }
  function closePopover() {
    if (!openPop) return;
    const o = openPop; openPop = null;
    document.removeEventListener('pointerdown', o.off, true);
    document.removeEventListener('keydown', o.key, true);
    removeEventListener('resize', o.place);
    o.anchor.classList.remove('open');
    o.p.remove();
    if (o.onClose) o.onClose();
  }

  // ─── TOAST ───────────────────────────────────────────────────────────────
  let toastTimer = 0;
  // action: { label, onClick }, or a list of them (each a button); with
  // buttons the toast stays longer (opts.ms, or 6 s).
  function toast(msg, action, opts) {
    let el = document.getElementById('bn-toast');
    if (!el) { el = document.createElement('div'); el.id = 'bn-toast'; document.body.appendChild(el); }
    el.innerHTML = `<span>${esc(msg)}</span>`;
    const acts = (Array.isArray(action) ? action : action ? [action] : []).filter(a => a && a.label);
    acts.forEach(a => {
      const b = document.createElement('button');
      b.textContent = a.label;
      if (a.data) b.dataset.act = a.data;
      b.addEventListener('click', () => { el.classList.remove('show'); a.onClick(); });
      el.appendChild(b);
    });
    el.classList.remove('show'); void el.offsetWidth; el.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove('show'), (opts && opts.ms) || (acts.length ? 6000 : 3200));
  }

  function download(blob, name) {
    // The Android app has no downloads for a page: the file goes to the
    // app, which asks where to save it.
    if (window.NotesBridge) {
      const fr = new FileReader();
      fr.onload = () => {
        const s = String(fr.result);
        window.NotesBridge.saveFile(name, blob.type || 'application/octet-stream', s.slice(s.indexOf(',') + 1));
      };
      fr.readAsDataURL(blob);
      return;
    }
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = name;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 30000);
  }

  // File names: the notebook title, minus what file systems refuse.
  const fileSafe = s => (String(s || '').replace(/[\\/:*?"<>|\u0000-\u001f]+/g, ' ').replace(/\s+/g, ' ').trim() || 'caderno').slice(0, 80);

  function pickFile(accept) {
    return new Promise(resolve => {
      const i = document.createElement('input');
      i.type = 'file'; i.accept = accept;
      i.addEventListener('change', () => resolve(i.files && i.files[0] || null));
      i.click();
    });
  }

  // The two halves of the Notes, side by side in the header: the study
  // notebooks (#/) and Minhas marcações (#/m).

  // A picture big, over everything: wheel or pinch zooms, drag moves, a
  // double tap goes 1× ↔ 2.5×; a tap outside it, Esc or ✕ closes (flashcards'
  // review, the questions). → { close() }; opt.onClose runs once it's gone.
  function zoomImage(src, opt) {
    opt = opt || {};
    const z = frag(`<div class="cr-zoom" role="dialog" aria-modal="true"><img alt="" draggable="false"><button class="bn-icon-btn cr-zoom-x" title="${esc(t('common.close'))}">${icon('close', 20)}</button><p class="cr-zoom-hint">${esc(t('cr.zoomHint'))}</p></div>`);
    const im = z.querySelector('img');
    im.src = src;
    let k = 1, x = 0, y = 0, lastTap = 0, gone = false;
    const pts = new Map();
    let pinch = null, drag = null;
    const set = () => { k = Math.min(8, Math.max(1, k)); if (k === 1) { x = 0; y = 0; } im.style.transform = `translate(${x}px, ${y}px) scale(${k})`; z.classList.toggle('zoomed', k > 1); };
    const at = (nk, cx, cy) => { const r = z.getBoundingClientRect(), ox = cx - r.width / 2 - x, oy = cy - r.height / 2 - y; const f = Math.min(8, Math.max(1, nk)) / k; x -= ox * (f - 1); y -= oy * (f - 1); k *= f; set(); };
    z.addEventListener('wheel', e => { e.preventDefault(); at(k * (e.deltaY < 0 ? 1.2 : 1 / 1.2), e.clientX, e.clientY); }, { passive: false });
    z.addEventListener('pointerdown', e => {
      if (e.target.closest('button')) return;
      z.setPointerCapture(e.pointerId);
      pts.set(e.pointerId, [e.clientX, e.clientY]);
      if (pts.size === 2) { const [a, b] = [...pts.values()]; pinch = { d: Math.hypot(a[0] - b[0], a[1] - b[1]), k }; drag = null; }
      else { drag = { sx: e.clientX - x, sy: e.clientY - y, moved: false }; }
    });
    z.addEventListener('pointermove', e => {
      if (!pts.has(e.pointerId)) return;
      pts.set(e.pointerId, [e.clientX, e.clientY]);
      if (pinch && pts.size === 2) { const [a, b] = [...pts.values()]; at(pinch.k * Math.hypot(a[0] - b[0], a[1] - b[1]) / pinch.d, (a[0] + b[0]) / 2, (a[1] + b[1]) / 2); }
      else if (drag && k > 1) { x = e.clientX - drag.sx; y = e.clientY - drag.sy; drag.moved = true; set(); }
    });
    const up = e => {
      pts.delete(e.pointerId);
      if (pts.size < 2) pinch = null;
      if (!drag || pts.size) return;
      const moved = drag.moved; drag = null;
      if (moved) return;
      const now = Date.now();
      if (now - lastTap < 320) { lastTap = 0; if (k > 1) { k = 1; set(); } else at(2.5, e.clientX, e.clientY); }
      else { lastTap = now; if (k === 1 && e.target === z) setTimeout(() => { if (lastTap === now) close(); }, 330); }
    };
    z.addEventListener('pointerup', up);
    z.addEventListener('pointercancel', up);
    const onKey = e => { if (e.key === 'Escape') { e.preventDefault(); e.stopImmediatePropagation(); close(); } };
    function close() {
      if (gone) return;
      gone = true;
      document.removeEventListener('keydown', onKey, true);
      z.remove();
      if (opt.onClose) opt.onClose();
    }
    z.querySelector('.cr-zoom-x').addEventListener('click', close);
    document.addEventListener('keydown', onKey, true);
    document.body.appendChild(z);
    return { close };
  }

  // The phone's Back (the Android app, NotesActivity, asks this first):
  // what is open on top closes — a menu, a popover, then a window or a
  // full-screen task, by the Esc it already answers to (a simulado halfway
  // still asks before leaving). True when something took it; false lets the
  // app go back in the Notes' history (ticket #18).
  g.__bnBack = () => {
    if (openMenu) { closeMenu(); return true; }
    if (openPop) { closePopover(); return true; }
    const top = () => { const l = document.querySelectorAll('[aria-modal="true"], .bn-modal, .cr-zoom'); return l[l.length - 1] || null; };
    const was = top();
    if (!was) return false;
    const at = document.activeElement && document.activeElement !== document.body ? document.activeElement : document;
    const ev = new KeyboardEvent('keydown', { key: 'Escape', code: 'Escape', keyCode: 27, bubbles: true, cancelable: true });
    at.dispatchEvent(ev);
    // Taken (the windows answer Esc with preventDefault; some close with an
    // animation, so the element may still be there). Nothing answered: back
    // goes on as before.
    return ev.defaultPrevented || top() !== was || !was.isConnected;
  };

  g.NotesUI = { esc, icon, frag, plainText, textOf, dialog, confirm, prompt, menu, closeMenu, popover, closePopover, toast, download, fileSafe, pickFile, zoomImage };
})(window);
