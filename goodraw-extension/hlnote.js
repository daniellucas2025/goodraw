// GooHighlights — a highlight's note in the large editor, over the site.
// highlights.js opens this page in a frame ("Abrir em tela maior", in the
// menu of a highlight): hlnote.html#id=<mark>&lang=<pt|en|es|fr>&dark=<0|1>.
// The editor is the Notes' (marknote.js → topicnotes.js); what it writes goes
// through the background (hl.update), which keeps it and sends it to the
// cloud, like a note typed on the page. Closed, it tells the frame's page,
// which takes the frame down and shows the note.
(function () {
  'use strict';
  const D = window.NotesDB;
  const q = new URLSearchParams(location.hash.slice(1));
  const id = q.get('id') || '';
  window.NotesI18n.setLang(q.get('lang') || 'pt');
  document.documentElement.dataset.theme = q.get('dark') === '1' ? 'dark' : 'light';
  const send = m => new Promise(r => { try { chrome.runtime.sendMessage(m, x => { void chrome.runtime.lastError; r(x); }); } catch (e) { r(null); } });
  const done = () => parent.postMessage({ bnHlNote: 'close', id }, '*');
  // An image that came with the note from another device: the background
  // fetches it from the cloud.
  D.remoteBlob = async bid => {
    const r = await send({ action: 'hl.blob', id: bid });
    return r && r.ok ? (await fetch(r.dataUrl)).blob() : null;
  };
  (async () => {
    const m = (await D.listMarks()).find(x => x.id === id);
    if (!m) return done();
    const color = { yellow: '#fde047', green: '#86efac', blue: '#93c5fd', pink: '#f9a8d4', orange: '#fdba74', purple: '#c4b5fd' }[m.color];
    await window.NotesMarkNote.open(m, {
      color,
      save: async p => {
        const r = await send({ action: 'hl.update', id, patch: { note: p.note, noteRich: p.noteRich } });
        if (!r || !r.ok) throw new Error('save');
      }
    });
    done();
  })();
})();
