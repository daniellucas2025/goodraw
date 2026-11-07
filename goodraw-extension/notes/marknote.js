// GooNotes — a highlight's note, large: the topic notes' editor
// (topicnotes.js, TipTap) in a window over the screen, with the marked
// passage on top. Minhas marcações opens it ("Nota da marcação"), and so does
// the Highlights on the page ("Abrir em tela maior": hlnote.html, in a frame).
//
// The note is kept as HTML (mark.noteRich, images as bnblob:<id>) beside the
// plain note (mark.note) — what search, Markdown and older apps read.
//
//   NotesMarkNote.open(mark, { save({ note, noteRich }) → Promise, color }) → Promise (closed)
//   NotesMarkNote.richOf(mark)   the note's HTML, or null when it is plain
(function (g) {
  'use strict';
  const UI = g.NotesUI;
  const { t } = g.NotesI18n;

  // The formatted note stands while its text is the note's: an older app
  // that rewrote the note in plain text leaves noteRich behind.
  const richOf = m => (m && m.noteRich && typeof m.noteRich.html === 'string' && m.noteRich.html && m.noteRich.text === (m.note || '') ? m.noteRich.html : null);
  // A plain note opened in the editor: its lines as paragraphs.
  const plainHtml = s => String(s || '').split('\n').map(l => `<p>${UI.esc(l)}</p>`).join('');

  function open(m, o) {
    return new Promise(resolve => {
      const root = UI.frag(`<div class="mn-modal" role="dialog" aria-modal="true">
        <div class="mn-win">
          <div class="mn-hdr">${UI.icon('note', 17)}<h2></h2><button class="bn-icon-btn" data-x title="${UI.esc(t('common.close'))}">${UI.icon('close')}</button></div>
          <blockquote class="mn-q"></blockquote>
          <div class="mn-ed"></div>
        </div></div>`);
      root.querySelector('h2').textContent = t('mk.noteTitle');
      const q = root.querySelector('.mn-q');
      q.textContent = m.text || '';
      if (o.color) q.style.setProperty('--c', o.color);
      document.body.appendChild(root);
      requestAnimationFrame(() => root.classList.add('show'));
      let ed = null, done = false;
      const html = richOf(m) || (m.note ? plainHtml(m.note) : '');
      g.NotesTopicNotes.mountHtml(root.querySelector('.mn-ed'), {
        html,
        save: d => o.save({ note: d.text, noteRich: d.html ? { html: d.html, text: d.text } : null })
      }).then(e => { ed = e; if (done) ed.destroy(); }, err => { console.error(err); UI.toast(t('tn.st.fail')); });
      async function close() {
        if (done) return; done = true;
        document.removeEventListener('keydown', onKey, true);
        if (ed) await ed.destroy();
        root.classList.remove('show');
        setTimeout(() => root.remove(), 160);
        resolve();
      }
      // Esc closes (a colour or link menu of the editor closes first, by itself).
      const onKey = e => { if (e.key === 'Escape' && !document.querySelector('.bn-modal')) { e.preventDefault(); e.stopPropagation(); close(); } };
      document.addEventListener('keydown', onKey, true);
      root.querySelector('[data-x]').addEventListener('click', close);
      root.addEventListener('mousedown', e => { if (e.target === root) close(); });
      open.close = close;
    });
  }

  g.NotesMarkNote = { open, richOf, plainHtml };
})(window);
