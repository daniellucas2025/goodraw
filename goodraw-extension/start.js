// The extension's own tab (start.html):
//   #hl      — the Highlights' tile on the home screen (or the icon, when it is
//              the main tool): its paged modal until "Não mostrar novamente",
//              the permission for every site while it's missing, then Minhas
//              marcações, in this same tab;
//   #access  — only the permission (the menu's and the capture's invitations);
//   #welcome — after installing: GooDraw as a whole — what each of the
//              three tools is for and what is free, where the icon is and
//              what it opens (bnIconOpens: the Draw unless the home is picked),
//              and whether the Highlights' menu shows on a selection (hlOn)
//              The welcome video (in Portuguese) opens once, in a tab of its
//              own, in front: YouTube won't play inside an extension page
//              (error 153).
// The permission is asked for here, from a click on an extension page, the
// only place every browser shows its prompt from (a popup may close under it).
(function () {
  'use strict';
  const STR = {
    pt: {
      permK: 'Uma vez só', permT: 'Ative a Highlights em todos os sites',
      permP: 'Para o menu de cores aparecer quando você seleciona um texto, em qualquer site, e para a captura de área funcionar, o navegador precisa da sua permissão. Ela é pedida uma vez só.',
      allow: 'Ativar em todos os sites', notNow: 'Agora não', marks: 'Ver minhas marcações', done: 'Pronto: a Highlights está ativa em todos os sites.',
      welK: 'Instalada', welT: 'Boas-vindas à GooDraw', welP: 'Três ferramentas para quem estuda por questões. Para que serve cada uma:',
      draw: 'Para resolver questões. Risque, circule e faça a conta por cima de qualquer site de questões (Alt+S pega o lápis). O traço some ao recarregar; a questão que você recortar fica salva.',
      hl: 'Para estudar e revisar. Grife lei seca, súmulas e artigos em qualquer site, com cor e nota. Os grifos voltam quando você reabre a página e ficam em Minhas marcações.',
      pin: 'Fixe o ícone da GooDraw: clique na peça de quebra-cabeça ao lado da barra de endereço e no alfinete ao lado de GooDraw. Depois, em qualquer site, é só clicar no ícone.',
      hlAskT: 'Quando você seleciona um texto:', hlAskOn: 'Mostrar o menu da Highlights', hlAskOnD: 'Cores e nota para grifar o trecho na hora.', hlAskOff: 'Não mostrar', hlAskOffD: 'Só vou usar a Draw: selecionar texto fica normal.', askT: 'Ao clicar no ícone, abrir:', askDraw: 'GooDraw', askDrawD: 'A barra de desenho direto no site, para resolver questões.', askHome: 'A tela inicial', askHomeD: 'Draw, Highlights e Notes numa tela só, para escolher.', askNote: 'Dá para mudar quando quiser, nas configurações da Draw ou da tela inicial.',
      readyK: 'Tudo pronto', readyT: 'Abra um site de questões e clique no ícone', readyP: 'A barra da Draw aparece por cima da página. Atalho: Alt+S pega o lápis. A Highlights e o Notes ficam no botão ⌂ da barra.', seeHome: 'Ver a tela inicial', closeTab: 'Fechar esta aba',
      notes: 'Para organizar o estudo. Com a conta grátis: flashcards, planejamento com timer, caderno de erros e as suas disciplinas. O Notes Premium acrescenta revisões, questões, discursivas corrigidas por IA e simulados.', free: 'Grátis', freeAcc: 'Grátis + Premium', go: 'Começar', permTw: 'Ative a GooDraw em todos os sites',
      ok: 'Entendi',
      why1: 'A caneta da Draw e o menu de cores da Highlights funcionam em qualquer site.', why2: 'A captura parcial e as anotações à mão funcionam em qualquer página.', why3: 'Nada do que você lê é enviado: só o que você marca vai para a sua conta.', confirm: 'Confirmar'
    },
    en: {
      permK: 'Just once', permT: 'Turn the Highlights on for every site',
      permP: 'For the colour menu to show when you select text, on any site, and for the area capture to work, the browser needs your permission. It is asked only once.',
      allow: 'Turn on for every site', notNow: 'Not now', marks: 'See my highlights', done: 'Done: the Highlights is on for every site.',
      welK: 'Installed', welT: 'Welcome to GooDraw', welP: 'Three tools for studying with practice questions. What each one is for:',
      draw: 'For solving questions. Strike, circle and work out sums on top of any question site (Alt+S takes the pencil). The strokes go when you reload; the question you crop stays saved.',
      hl: 'For studying and reviewing. Highlight laws, case law and articles on any site, with colour and a note. Your highlights come back when you reopen the page and stay in My highlights.',
      pin: 'Pin the GooDraw icon: click the puzzle piece next to the address bar and the pin next to GooDraw. Then, on any site, just click the icon.',
      hlAskT: 'When you select text:', hlAskOn: 'Show the Highlights menu', hlAskOnD: 'Colours and a note to highlight the passage right away.', hlAskOff: 'Don\'t show', hlAskOffD: 'I\'ll only use the Draw: selecting text stays plain.', askT: 'When you click the icon, open:', askDraw: 'GooDraw', askDrawD: 'The drawing bar right on the site, for solving questions.', askHome: 'The home screen', askHomeD: 'Draw, Highlights and Notes on one screen, to choose from.', askNote: 'You can change it any time, in the Draw\'s or the home screen\'s settings.',
      readyK: 'All set', readyT: 'Open a question site and click the icon', readyP: 'The Draw\'s bar shows up over the page. Shortcut: Alt+S takes the pencil. The Highlights and the Notes are on the bar\'s ⌂ button.', seeHome: 'See the home screen', closeTab: 'Close this tab',
      notes: 'For organising your study. With the free account: flashcards, a study plan with a timer, the mistakes notebook and your subjects. Notes Premium adds reviews, questions, AI-graded essays and mock exams.', free: 'Free', freeAcc: 'Free + Premium', go: 'Get started', permTw: 'Turn GooDraw on for every site',
      ok: 'Got it',
      why1: 'The Draw\'s pen and the Highlights\' colour menu work on any site.', why2: 'The partial capture and hand annotations work on any page.', why3: 'Nothing you read is sent: only what you mark goes to your account.', confirm: 'Confirm'
    },
    es: {
      permK: 'Solo una vez', permT: 'Activa la Highlights en todos los sitios',
      permP: 'Para que el menú de colores aparezca al seleccionar un texto, en cualquier sitio, y para que la captura de área funcione, el navegador necesita tu permiso. Se pide una sola vez.',
      allow: 'Activar en todos los sitios', notNow: 'Ahora no', marks: 'Ver mis resaltados', done: 'Listo: la Highlights está activa en todos los sitios.',
      welK: 'Instalada', welT: 'Bienvenido a GooDraw', welP: 'Tres herramientas para quien estudia con preguntas. Para qué sirve cada una:',
      draw: 'Para resolver preguntas. Tacha, marca con círculos y calcula sobre cualquier sitio de preguntas (Alt+S toma el lápiz). El trazo desaparece al recargar; la pregunta que recortes queda guardada.',
      hl: 'Para estudiar y repasar. Resalta leyes, jurisprudencia y artículos en cualquier sitio, con color y nota. Tus resaltados vuelven al reabrir la página y quedan en Mis resaltados.',
      pin: 'Fija el icono de GooDraw: haz clic en la pieza de rompecabezas junto a la barra de direcciones y en el alfiler junto a GooDraw. Después, en cualquier sitio, basta con hacer clic en el icono.',
      hlAskT: 'Cuando seleccionas un texto:', hlAskOn: 'Mostrar el menú de la Highlights', hlAskOnD: 'Colores y nota para resaltar el fragmento al momento.', hlAskOff: 'No mostrar', hlAskOffD: 'Solo usaré la Draw: seleccionar texto queda normal.', askT: 'Al hacer clic en el icono, abrir:', askDraw: 'GooDraw', askDrawD: 'La barra de dibujo directo en el sitio, para resolver preguntas.', askHome: 'La pantalla de inicio', askHomeD: 'Draw, Highlights y Notes en una sola pantalla, para elegir.', askNote: 'Puedes cambiarlo cuando quieras, en los ajustes de la Draw o de la pantalla de inicio.',
      readyK: 'Todo listo', readyT: 'Abre un sitio de preguntas y haz clic en el icono', readyP: 'La barra de la Draw aparece sobre la página. Atajo: Alt+S toma el lápiz. La Highlights y el Notes están en el botón ⌂ de la barra.', seeHome: 'Ver la pantalla de inicio', closeTab: 'Cerrar esta pestaña',
      notes: 'Para organizar el estudio. Con la cuenta gratis: flashcards, planificación con temporizador, cuaderno de errores y tus asignaturas. Notes Premium añade repasos, preguntas, preguntas de desarrollo corregidas por IA y simulacros.', free: 'Gratis', freeAcc: 'Gratis + Premium', go: 'Empezar', permTw: 'Activa GooDraw en todos los sitios',
      ok: 'Entendido',
      why1: 'El lápiz de la Draw y el menú de colores de la Highlights funcionan en cualquier sitio.', why2: 'La captura parcial y las anotaciones a mano funcionan en cualquier página.', why3: 'Nada de lo que lees se envía: solo lo que marcas va a tu cuenta.', confirm: 'Confirmar'
    },
    fr: {
      permK: 'Une seule fois', permT: 'Activez la Highlights sur tous les sites',
      permP: 'Pour que le menu de couleurs apparaisse quand vous sélectionnez du texte, sur n\'importe quel site, et pour que la capture de zone fonctionne, le navigateur a besoin de votre autorisation. Elle n\'est demandée qu\'une fois.',
      allow: 'Activer sur tous les sites', notNow: 'Pas maintenant', marks: 'Voir mes surlignages', done: 'C\'est fait : la Highlights est activée sur tous les sites.',
      welK: 'Installée', welT: 'Bienvenue dans GooDraw', welP: 'Trois outils pour réviser avec des questions. À quoi sert chacun :',
      draw: 'Pour résoudre des questions. Barrez, entourez et calculez par-dessus n\'importe quel site de questions (Alt+S prend le crayon). Le tracé disparaît au rechargement ; la question que vous découpez reste enregistrée.',
      hl: 'Pour étudier et réviser. Surlignez lois, jurisprudence et articles sur n\'importe quel site, avec couleur et note. Vos surlignages reviennent quand vous rouvrez la page et restent dans Mes surlignages.',
      pin: 'Épinglez l\'icône de GooDraw : cliquez sur la pièce de puzzle à côté de la barre d\'adresse, puis sur l\'épingle à côté de GooDraw. Ensuite, sur n\'importe quel site, il suffit de cliquer sur l\'icône.',
      hlAskT: 'Quand vous sélectionnez du texte :', hlAskOn: 'Afficher le menu de la Highlights', hlAskOnD: 'Des couleurs et une note pour surligner le passage tout de suite.', hlAskOff: 'Ne pas afficher', hlAskOffD: 'Je n\'utiliserai que la Draw : sélectionner du texte reste normal.', askT: 'Quand vous cliquez sur l\'icône, ouvrir :', askDraw: 'GooDraw', askDrawD: 'La barre de dessin directement sur le site, pour résoudre des questions.', askHome: 'L\'écran d\'accueil', askHomeD: 'Draw, Highlights et Notes sur un seul écran, au choix.', askNote: 'Vous pouvez changer quand vous voulez, dans les paramètres de la Draw ou de l\'écran d\'accueil.',
      readyK: 'Tout est prêt', readyT: 'Ouvrez un site de questions et cliquez sur l\'icône', readyP: 'La barre de la Draw apparaît par-dessus la page. Raccourci : Alt+S prend le crayon. La Highlights et le Notes sont sur le bouton ⌂ de la barre.', seeHome: 'Voir l\'écran d\'accueil', closeTab: 'Fermer cet onglet',
      notes: 'Pour organiser vos études. Avec le compte gratuit : flashcards, planning avec minuteur, cahier d\'erreurs et vos matières. Notes Premium ajoute révisions, questions, rédactions corrigées par IA et examens blancs.', free: 'Gratuit', freeAcc: 'Gratuit + Premium', go: 'Commencer', permTw: 'Activez GooDraw sur tous les sites',
      ok: 'Compris',
      why1: 'Le crayon de la Draw et le menu de couleurs de la Highlights fonctionnent sur n\'importe quel site.', why2: 'La capture partielle et les annotations à la main fonctionnent sur n\'importe quelle page.', why3: 'Rien de ce que vous lisez n\'est envoyé : seul ce que vous marquez va dans votre compte.', confirm: 'Confirmer'
    }
  };
  const WELCOME_VIDEO = '';
  const ALL_SITES = ['<all_urls>'];
  let L = STR.pt, lang = 'pt';
  const view = document.getElementById('view');
  const tr = k => L[k] ?? STR.pt[k] ?? k;
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const send = m => new Promise(r => chrome.runtime.sendMessage(m, x => { void chrome.runtime.lastError; r(x || {}); }));
  const hasAccess = () => chrome.permissions.contains({ origins: ALL_SITES }).catch(() => false);
  // Minhas marcações, on the site, in this tab.
  const toMarks = () => send({ action: 'home.marks' });
  // After installing, the welcome ends on the extension's home screen (the
  // Draw, the Highlights, the Notes…) in this tab, instead of closing.
  let fromWelcome = false;
  const toHome = () => location.replace(chrome.runtime.getURL('home.html'));
  const after = () => (fromWelcome ? toHome() : toMarks());
  async function allow() {
    let ok = false;
    try { ok = await chrome.permissions.request({ origins: ALL_SITES }); } catch (e) {}
    if (ok) await send({ action: 'hl.access' });
    return ok;
  }

  function permCard(then) {
    view.innerHTML = `<div class="card"><img class="logo" src="icons/icon128.png" alt="">
      <span class="k">${esc(tr('permK'))}</span><h1>${esc(tr('permT'))}</h1><p>${esc(tr('permP'))}</p>
      <div class="acts"><button class="b go" data-a="allow">${esc(tr('allow'))}</button><button class="b" data-a="later">${esc(tr('notNow'))}</button></div></div>`;
    view.onclick = async e => {
      const a = e.target.closest('[data-a]');
      if (!a) return;
      if (a.dataset.a === 'allow') await allow();
      then();
    };
  }

  async function highlights() {
    const [has, p] = await Promise.all([hasAccess(), chrome.storage.local.get('bnHlPromoOff')]);
    if (p.bnHlPromoOff) { if (has) after(); else permCard(after); return; }
    view.innerHTML = '';
    const host = document.createElement('div');
    document.body.appendChild(host);
    window.__bnHighlightsPromo.mount(host, {
      lang, logo: 'icons/icon128.png', poster: 'highlights-video.jpg',
      // The last page's button: the permission while it's missing.
      cta: has ? tr('marks') : tr('allow'),
      // "Não mostrar novamente": kept the moment it's ticked, however this ends.
      onDont(dont) { chrome.storage.local.set({ bnHlPromoOff: !!dont }); },
      async onCta() { if (!has) await allow(); after(); },
      onClose(dont) {
        if (dont) chrome.storage.local.set({ bnHlPromoOff: true });
        if (has) after(); else permCard(after);
      }
    });
  }

  function welcome() {
    const tool = (name, cls, txt, tag) => `<div class="tool ${cls}"><div class="th"><b>${name}</b><em>${esc(tag)}</em></div><span>${esc(txt)}</span></div>`;
    view.innerHTML = `<div class="card wide"><img class="logo" src="icons/icon128.png" alt="">
      <span class="k">${esc(tr('welK'))}</span><h1>${esc(tr('welT'))}</h1><p>${esc(tr('welP'))}</p>
      <div class="tools">${tool('GooDraw', 'draw', tr('draw'), tr('free'))}${tool('GooHighlights', 'hl', tr('hl'), tr('free'))}${tool('GooNotes', 'notes', tr('notes'), tr('freeAcc'))}</div>
      <div class="pin"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 17v5"/><path d="M9 10.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V17h14v-1.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V7a1 1 0 0 1 1-1 2 2 0 0 0 0-4H8a2 2 0 0 0 0 4 1 1 0 0 1 1 1z"/></svg><span>${esc(tr('pin'))}</span></div>
      <div class="ask"><b>${esc(tr('askT'))}</b><div class="choice" role="radiogroup">
        <button role="radio" data-open="draw"><b>${esc(tr('askDraw'))}</b><span>${esc(tr('askDrawD'))}</span></button>
        <button role="radio" data-open="home"><b>${esc(tr('askHome'))}</b><span>${esc(tr('askHomeD'))}</span></button></div>
        <small>${esc(tr('askNote'))}</small></div>
      <div class="ask"><b>${esc(tr('hlAskT'))}</b><div class="choice" role="radiogroup">
        <button role="radio" data-hlmenu="on"><b>${esc(tr('hlAskOn'))}</b><span>${esc(tr('hlAskOnD'))}</span></button>
        <button role="radio" data-hlmenu="off"><b>${esc(tr('hlAskOff'))}</b><span>${esc(tr('hlAskOffD'))}</span></button></div>
        <small>${esc(tr('askNote'))}</small></div>
      <div class="acts"><button class="b go" data-a="ok">${esc(tr('go'))}</button></div></div>`;
    // Nothing picked = the Draw (the icon's default); a pick is kept at once.
    const paintChoice = v => view.querySelectorAll('[data-open]').forEach(b => { const on = b.dataset.open === v; b.classList.toggle('on', on); b.setAttribute('aria-checked', on); });
    chrome.storage.local.get('bnIconOpens', p => paintChoice(p.bnIconOpens === 'home' ? 'home' : 'draw'));
    // The Highlights' menu on a selection (hlOn): shown unless "Não mostrar".
    const paintHl = v => view.querySelectorAll('[data-hlmenu]').forEach(b => { const on = b.dataset.hlmenu === v; b.classList.toggle('on', on); b.setAttribute('aria-checked', on); });
    chrome.storage.local.get('hlOn', p => paintHl(p.hlOn === false ? 'off' : 'on'));
    if (lang === 'pt') chrome.storage.local.get('bnWelcomeVideo', p => {
      if (p.bnWelcomeVideo) return;
      chrome.storage.local.set({ bnWelcomeVideo: true });
      // welcome video removed
    });
    view.onclick = e => {
      const o = e.target.closest('[data-open]');
      if (o) { chrome.storage.local.set({ bnIconOpens: o.dataset.open }); paintChoice(o.dataset.open); return; }
      const hm = e.target.closest('[data-hlmenu]');
      if (hm) { chrome.storage.local.set({ hlOn: hm.dataset.hlmenu === 'on' }); paintHl(hm.dataset.hlmenu); return; }
      const a = e.target.closest('[data-a]');
      if (!a) return;
      askAccess();
    };
  }
  // The welcome's end: the home screen if it's what the icon opens; otherwise
  // where to go from here (the Draw needs a site to open on).
  function finish() {
    chrome.storage.local.get('bnIconOpens', p => {
      if (p.bnIconOpens === 'home') { toHome(); return; }
      document.querySelector('.scrim')?.remove();
      view.innerHTML = `<div class="card"><img class="logo" src="icons/icon128.png" alt="">
        <span class="k">${esc(tr('readyK'))}</span><h1>${esc(tr('readyT'))}</h1><p>${esc(tr('readyP'))}</p>
        <div class="acts"><button class="b go" data-a="close">${esc(tr('closeTab'))}</button><button class="b" data-a="home">${esc(tr('seeHome'))}</button></div></div>`;
      view.onclick = e => {
        const a = e.target.closest('[data-a]');
        if (a) a.dataset.a === 'home' ? toHome() : chrome.tabs.getCurrent(t => (t ? chrome.tabs.remove(t.id) : window.close()));
      };
    });
  }
  // "Entendi": the permission for every site, explained first; "Confirmar"
  // (a tap on this extension page, the place every browser shows its prompt
  // from) brings the browser's own question. Then — or already given, or
  // "Agora não" — finish().
  async function askAccess() {
    if (await hasAccess()) { finish(); return; }
    const ok = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>';
    const scrim = document.createElement('div');
    scrim.className = 'scrim';
    scrim.innerHTML = `<div class="card" role="dialog" aria-modal="true"><img class="logo" src="icons/icon128.png" alt="">
      <span class="k">${esc(tr('permK'))}</span><h1>${esc(tr('permTw'))}</h1>
      <ul class="why"><li>${ok}<span>${esc(tr('why1'))}</span></li><li>${ok}<span>${esc(tr('why2'))}</span></li><li>${ok}<span>${esc(tr('why3'))}</span></li></ul>
      <div class="acts"><button class="b go" data-m="yes">${esc(tr('confirm'))}</button><button class="b" data-m="no">${esc(tr('notNow'))}</button></div></div>`;
    document.body.appendChild(scrim);
    scrim.querySelector('[data-m="yes"]').focus();
    scrim.addEventListener('click', async e => {
      const b = e.target.closest('[data-m]');
      if (!b) return;
      if (b.dataset.m === 'no') { finish(); return; }
      if (await allow()) finish();
    });
  }

  chrome.storage.local.get(['pdLang', 'pdTbPos', 'pdColor', 'pdNoticeHide'], async p => {
    let l = ['pt', 'en', 'es', 'fr'].includes(p.pdLang) ? p.pdLang : ((p.pdTbPos || p.pdColor || p.pdNoticeHide) ? 'pt' : 'auto');
    if (l === 'auto') { const nav = (navigator.language || '').slice(0, 2).toLowerCase(); l = ['pt', 'es', 'fr'].includes(nav) ? nav : 'en'; }
    lang = l; L = STR[l] || STR.en;
    document.documentElement.lang = l === 'pt' ? 'pt-BR' : l;
    const h = location.hash;
    if (h === '#welcome') welcome();
    else if (h === '#access') {
      if (await hasAccess()) { view.innerHTML = `<div class="card"><h1>${esc(tr('done'))}</h1></div>`; return; }
      permCard(async () => { if (await hasAccess()) view.innerHTML = `<div class="card"><h1>${esc(tr('done'))}</h1></div>`; else window.close(); });
    } else highlights();
  });
})();
