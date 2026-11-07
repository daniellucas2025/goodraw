// The extension's home screen (home.html, full screen over the page, opened
// by the toolbar icon): the products — GooDraw, Highlights and Notes —,
// then Flashcards and Planner (in the site's app) and the Android app; the YouTube channel among the footer's
// links, the cloud, this site's switch, language and theme.
(function () {
  'use strict';
  const STR = {
    pt: {
      discLeft: "{0} item(ns) ainda não subiram para a nuvem (sem internet?). Ao desconectar, eles são apagados deste computador e se perdem. Desconectar mesmo assim?",
      pairT: 'Conectando sua conta', pairB: 'Na janela do site que abriu, entre na sua conta e digite este código:', copy: 'Copiar', copied: 'Copiado', linked: 'Pronto: conectado como {0}.', pairFail: 'Não deu para conectar agora. Verifique a internet e tente de novo.', 
      hello: 'O que vamos <em>estudar</em> hoje?', sub: 'Escolha uma ferramenta para começar.', close: 'Fechar', artNote: 'Cai na prova!', artSync: 'Salvo na nuvem', 
      drawDesc: 'Para resolver questões. Os desenhos somem ao recarregar a página.',
      hlDesc: 'Para estudar. Grifos e notas ficam salvos e sincronizados.', allowAll: 'Permitir em todos os sites', dockHide: 'Ocultar os ícones do canto mesmo com marcação', allowDone: 'Pronto: a Highlights está ativa em todos os sites.',
      fcDesc: 'Grátis, no Notes: cards com repetição espaçada, do recorte à revisão', plDesc: 'Grátis, no Notes: planejamento, timer, sessões, mural e estante', notesDesc: 'Para organizar o estudo. Disciplinas, questões e revisões, tudo conversando.', soon: 'Em breve',
      andName: 'App Android', andDesc: 'Draw e Highlights no celular e tablet', ios: 'Em breve para iPhone e iPad',
      hint: 'Vai resolver questões? Use a Draw. Quer guardar o que estudou? Use a Highlights.',
      settings: 'Configurações', hlMenu: 'Menu da Highlights ao selecionar texto', hlShow: 'Mostrar', hlHide: 'Não mostrar', iconOpens: 'Ao clicar no ícone, abrir', iconDraw: 'GooDraw', iconHome: 'Esta tela inicial', lang: 'Idioma', theme: 'Tema', auto: 'Automático', light: 'Claro', dark: 'Escuro', rate: 'Avaliar a extensão', ticket: 'Relatar um problema, sugerir ou tirar uma dúvida',
      cloudOff: 'Sincronizar na nuvem', cloudOffB: 'Conecte sua conta grátis', cloudWait: 'Digite este código no site', cloudOn: 'Na nuvem',
      cloudFull: 'Sua nuvem está cheia', used: '{0} de {1}',
      open: 'Abrir Minhas marcações', syncNow: 'Sincronizar agora', more: 'Notes Premium: 10 GB', reconnect: 'Abrir o site de novo', disconnect: 'Desconectar esta extensão',
      restricted: 'A Draw e a Highlights não funcionam nesta página do navegador. Abra um site.',
      marks0: 'nenhuma marcação aqui', marks1: '1 marcação aqui', marksN: '{0} marcações aqui',
      site: 'Neste site', hlHere: 'Highlights ativa aqui', synced: 'Sincronizado', syncing: 'Sincronizando…',
      otherAcc: 'parado: este computador tem os dados de outra conta. Para usar esta, desconecte a extensão (os dados daqui são apagados) e conecte de novo'
    },
    en: {
      discLeft: "{0} item(s) haven't gone up to the cloud yet (offline?). Disconnecting deletes them from this computer and they are lost. Disconnect anyway?",
      pairT: 'Connecting your account', pairB: 'In the site window that just opened, sign in and type this code:', copy: 'Copy', copied: 'Copied', linked: 'Done: connected as {0}.', pairFail: 'Couldn\'t connect right now. Check your internet and try again.', 
      hello: 'What are we <em>studying</em> today?', sub: 'Pick a tool to get started.', close: 'Close', artNote: 'On the exam!', artSync: 'Saved to the cloud', 
      drawDesc: 'For solving questions. Drawings go away when you reload.',
      hlDesc: 'For studying. Highlights and notes stay saved and synced.', allowAll: 'Allow on every site', dockHide: 'Hide the corner icons even when the page has highlights', allowDone: 'Done: the Highlights is on for every site.',
      fcDesc: 'Free, in the Notes: spaced-repetition cards, from a crop to the review', plDesc: 'Free, in the Notes: study plan, timer, sessions, board and bookshelf', notesDesc: 'For organizing your study. Subjects, questions and reviews, all connected.', soon: 'Coming soon',
      andName: 'Android app', andDesc: 'Draw and Highlights on phone and tablet', ios: 'Coming soon to iPhone and iPad',
      hint: 'Solving questions? Use the Draw. Keeping what you studied? Use the Highlights.',
      settings: 'Settings', hlMenu: 'Highlights menu when selecting text', hlShow: 'Show', hlHide: 'Don\'t show', iconOpens: 'When you click the icon, open', iconDraw: 'GooDraw', iconHome: 'This home screen', lang: 'Language', theme: 'Theme', auto: 'Automatic', light: 'Light', dark: 'Dark', rate: 'Rate the extension', ticket: 'Report a problem, suggest or ask a question',
      cloudOff: 'Sync to the cloud', cloudOffB: 'Connect your free account', cloudWait: 'Type this code on the site', cloudOn: 'In the cloud',
      cloudFull: 'Your cloud is full', used: '{0} of {1}',
      open: 'Open My highlights', syncNow: 'Sync now', more: 'Notes Premium: 10 GB', reconnect: 'Open the site again', disconnect: 'Disconnect this extension',
      restricted: 'The Draw and the Highlights don\'t work on this browser page. Open a site to use them.',
      marks0: 'no highlights here', marks1: '1 highlight here', marksN: '{0} highlights here',
      site: 'This site', hlHere: 'Highlights on here', synced: 'Synced', syncing: 'Syncing…',
      otherAcc: 'paused: this computer holds another account’s data. To use this one, disconnect the extension (the data here is deleted) and connect again'
    },
    es: {
      discLeft: "{0} elemento(s) aún no subieron a la nube (¿sin internet?). Al desconectar se borran de este ordenador y se pierden. ¿Desconectar de todos modos?",
      pairT: 'Conectando tu cuenta', pairB: 'En la ventana del sitio que se abrió, entra en tu cuenta y escribe este código:', copy: 'Copiar', copied: 'Copiado', linked: 'Listo: conectada como {0}.', pairFail: 'No se pudo conectar ahora. Revisa tu internet e inténtalo de nuevo.', 
      hello: '¿Qué vamos a <em>estudiar</em> hoy?', sub: 'Elige una herramienta para empezar.', close: 'Cerrar', artNote: '¡Cae en el examen!', artSync: 'Guardado en la nube', 
      drawDesc: 'Para resolver preguntas. Los dibujos desaparecen al recargar.',
      hlDesc: 'Para estudiar. Resaltados y notas quedan guardados y sincronizados.', allowAll: 'Permitir en todos los sitios', dockHide: 'Ocultar los iconos de la esquina aunque haya resaltados', allowDone: 'Listo: la Highlights está activa en todos los sitios.',
      fcDesc: 'Gratis, en el Notes: tarjetas con repetición espaciada, del recorte al repaso', plDesc: 'Gratis, en el Notes: planificación, temporizador, sesiones, mural y estantería', notesDesc: 'Para organizar el estudio. Disciplinas, preguntas y repasos, todo conectado.', soon: 'Próximamente',
      andName: 'App Android', andDesc: 'Draw y Highlights en móvil y tableta', ios: 'Próximamente en iPhone y iPad',
      hint: '¿Vas a resolver preguntas? Usa la Draw. ¿Quieres guardar lo que estudiaste? Usa la Highlights.',
      settings: 'Ajustes', hlMenu: 'Menú de la Highlights al seleccionar texto', hlShow: 'Mostrar', hlHide: 'No mostrar', iconOpens: 'Al hacer clic en el icono, abrir', iconDraw: 'GooDraw', iconHome: 'Esta pantalla de inicio', lang: 'Idioma', theme: 'Tema', auto: 'Automático', light: 'Claro', dark: 'Oscuro', rate: 'Valorar la extensión', ticket: 'Reportar un problema, sugerir o hacer una pregunta',
      cloudOff: 'Sincronizar en la nube', cloudOffB: 'Conecta tu cuenta gratis', cloudWait: 'Escribe este código en el sitio', cloudOn: 'En la nube',
      cloudFull: 'Tu nube está llena', used: '{0} de {1}',
      open: 'Abrir Mis resaltados', syncNow: 'Sincronizar ahora', more: 'Notes Premium: 10 GB', reconnect: 'Abrir el sitio otra vez', disconnect: 'Desconectar esta extensión',
      restricted: 'En esta página del navegador la Draw y la Highlights no funcionan. Abre un sitio para usarlas.',
      marks0: 'ningún resaltado aquí', marks1: '1 resaltado aquí', marksN: '{0} resaltados aquí',
      site: 'Este sitio', hlHere: 'Highlights activa aquí', synced: 'Sincronizado', syncing: 'Sincronizando…',
      otherAcc: 'en pausa: este ordenador tiene los datos de otra cuenta. Para usar esta, desconecta la extensión (los datos de aquí se borran) y conéctala de nuevo'
    },
    fr: {
      discLeft: "{0} élément(s) ne sont pas encore partis dans le nuage (hors ligne ?). En vous déconnectant, ils sont effacés de cet ordinateur et perdus. Se déconnecter quand même ?",
      pairT: 'Connexion de votre compte', pairB: 'Dans la fenêtre du site qui vient de s\'ouvrir, connectez-vous et saisissez ce code :', copy: 'Copier', copied: 'Copié', linked: 'C\'est fait : connectée en tant que {0}.', pairFail: 'Connexion impossible pour le moment. Vérifiez votre internet et réessayez.', 
      hello: 'On <em>révise</em> quoi aujourd\'hui ?', sub: 'Choisissez un outil pour commencer.', close: 'Fermer', artNote: 'Tombe à l\'examen !', artSync: 'Enregistré dans le nuage', 
      drawDesc: 'Pour résoudre des questions. Les dessins disparaissent au rechargement.',
      hlDesc: 'Pour étudier. Surlignages et notes restent enregistrés et synchronisés.', allowAll: 'Autoriser sur tous les sites', dockHide: 'Masquer les icônes du coin même s\'il y a des surlignages', allowDone: 'C\'est fait : la Highlights est activée sur tous les sites.',
      fcDesc: 'Gratuit, dans le Notes : des cartes à répétition espacée, de la capture à la révision', plDesc: 'Gratuit, dans le Notes : planning, minuteur, sessions, tableau et bibliothèque', notesDesc: 'Pour organiser l\'étude. Matières, questions et révisions, tout relié.', soon: 'Bientôt',
      andName: 'App Android', andDesc: 'Draw et Highlights sur téléphone et tablette', ios: 'Bientôt sur iPhone et iPad',
      hint: 'Vous résolvez des questions ? Utilisez la Draw. Vous voulez garder ce que vous avez étudié ? Utilisez la Highlights.',
      settings: 'Paramètres', hlMenu: 'Menu de la Highlights à la sélection de texte', hlShow: 'Afficher', hlHide: 'Ne pas afficher', iconOpens: 'Quand vous cliquez sur l\'icône, ouvrir', iconDraw: 'GooDraw', iconHome: 'Cet écran d\'accueil', lang: 'Langue', theme: 'Thème', auto: 'Automatique', light: 'Clair', dark: 'Sombre', rate: 'Noter l\'extension', ticket: 'Signaler un problème, suggérer ou poser une question',
      cloudOff: 'Synchroniser dans le nuage', cloudOffB: 'Connectez votre compte gratuit', cloudWait: 'Saisissez ce code sur le site', cloudOn: 'Dans le nuage',
      cloudFull: 'Votre nuage est plein', used: '{0} sur {1}',
      open: 'Ouvrir Mes surlignages', syncNow: 'Synchroniser maintenant', more: 'Notes Premium : 10 Go', reconnect: 'Rouvrir le site', disconnect: 'Déconnecter cette extension',
      restricted: 'La Draw et la Highlights ne fonctionnent pas sur cette page du navigateur. Ouvrez un site pour les utiliser.',
      marks0: 'aucun surlignage ici', marks1: '1 surlignage ici', marksN: '{0} surlignages ici',
      site: 'Ce site', hlHere: 'Highlights activée ici', synced: 'Synchronisé', syncing: 'Synchronisation…',
      otherAcc: 'en pause : cet ordinateur contient les données d’un autre compte. Pour utiliser celui-ci, déconnectez l’extension (les données d’ici sont effacées) et reconnectez-la'
    }
  };
  const LANGS = { auto: null, pt: 'Português', en: 'English', es: 'Español', fr: 'Français' };
  const firefox = typeof browser !== 'undefined' && /Firefox\//.test(navigator.userAgent);
  const URLS = {
    instagram: 'https://www.instagram.com/agoodrawdraw/',
    youtube: '',
    android: 'https://play.google.com/store/apps/details?id=com.agoodraw.draw',
  };
  const rateUrl = lang => firefox
    ? 'https://addons.mozilla.org/' + ({ en: 'en-US', es: 'es', fr: 'fr' }[lang] || 'pt-BR') + '/firefox/addon/a-b%C3%BAssola-draw/'
    : 'https://chromewebstore.google.com/detail/a-b%C3%BAssola-draw/jmmbefgheclemjejoefjjkaklghmgobp/reviews?hl=' + ({ en: 'en', es: 'es', fr: 'fr' }[lang] || 'pt-br');
  // Every address: the Highlights on every site and the screen capture.
  const ALL_SITES = ['<all_urls>'];

  let L = STR.pt, lang = 'pt', prefs = {}, tab = null, host = '', pageUrl = '';
  const $ = id => document.getElementById(id);
  const tr = (k, ...a) => String(L[k] ?? STR.pt[k] ?? k).replace(/\{(\d)\}/g, (_, i) => a[i] ?? '');
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const send = m => new Promise(r => chrome.runtime.sendMessage(m, x => { void chrome.runtime.lastError; r(x || {}); }));
  // Over a page (in background.js's frame) the page takes the home down; in a tab of its own, the tab closes.
  const framed = window.top !== window;
  const closeHome = () => { if (framed) parent.postMessage({ bnHome: 'close' }, '*'); else window.close(); };
  // Over a page the frame may not reach chrome.tabs: the background opens it.
  // The home stays open in this tab: the link opens in a new one.
  const openTab = url => send({ action: 'home.url', url });
  const mb = b => (b >= 1073741824 ? (b / 1073741824).toFixed(1).replace('.0', '') + ' GB' : (b / 1048576).toFixed(b < 10485760 ? 1 : 0) + ' MB').replace('.', lang === 'en' ? '.' : ',');
  function toast(msg) { const t = $('toast'); t.textContent = msg; t.style.display = 'block'; clearTimeout(toast.t); toast.t = setTimeout(() => { t.style.display = 'none'; }, 3200); }

  // ─── language and theme ───────────────────────────────────────────────────
  function pickLang(p) {
    // Someone using the bar before English existed, who never chose, stays in Portuguese (background.js langPref).
    let l = LANGS.hasOwnProperty(p.pdLang) ? p.pdLang : ((p.pdTbPos || p.pdColor || p.pdNoticeHide) ? 'pt' : 'auto');
    if (l === 'auto') { const nav = (navigator.language || '').slice(0, 2).toLowerCase(); l = ['pt', 'es', 'fr'].includes(nav) ? nav : 'en'; }
    return l;
  }
  function applyTheme() {
    const t = ['light', 'dark'].includes(prefs.pdTheme) ? prefs.pdTheme : (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    document.documentElement.classList.toggle('dark', t === 'dark');
  }
  function paintTexts() {
    document.documentElement.lang = lang === 'pt' ? 'pt-BR' : lang;
    document.querySelectorAll('[data-t]').forEach(e => { e.textContent = tr(e.dataset.t); });
    document.querySelectorAll('[data-h]').forEach(e => { e.innerHTML = tr(e.dataset.h); });
    document.querySelectorAll('[data-tl]').forEach(e => { e.title = tr(e.dataset.tl); e.setAttribute('aria-label', tr(e.dataset.tl)); });
  }
  function paintSheet() {
    const cur = LANGS.hasOwnProperty(prefs.pdLang) ? prefs.pdLang : 'auto';
    $('langSeg').innerHTML = Object.keys(LANGS).map(k => `<button data-lang="${k}" class="${k === cur ? 'on' : ''}">${esc(LANGS[k] || tr('auto'))}</button>`).join('');
    const th = ['light', 'dark'].includes(prefs.pdTheme) ? prefs.pdTheme : 'auto';
    $('themeSeg').innerHTML = ['auto', 'light', 'dark'].map(k => `<button data-theme="${k}" class="${k === th ? 'on' : ''}">${esc(tr(k))}</button>`).join('');
    // What the icon opens (background.js, bnIconOpens): the Draw unless this screen is picked.
    const io = prefs.bnIconOpens === 'home' ? 'home' : 'draw';
    $('iconSeg').innerHTML = ['draw', 'home'].map(k => `<button data-icon="${k}" class="${k === io ? 'on' : ''}">${esc(tr(k === 'draw' ? 'iconDraw' : 'iconHome'))}</button>`).join('');
    // The Highlights' menu on a selection (highlights.js, hlOn): on unless turned off.
    const hm = prefs.hlOn === false ? 'off' : 'on';
    $('hlSeg').innerHTML = ['on', 'off'].map(k => `<button data-hlmenu="${k}" class="${k === hm ? 'on' : ''}">${esc(tr(k === 'on' ? 'hlShow' : 'hlHide'))}</button>`).join('');
  }

  // ─── the cloud ────────────────────────────────────────────────────────────
  let st = {};
  async function paintCloud() {
    st = await send({ action: 'hl.status' }) || {};
    const c = $('cloud');
    if (!c) return;
    c.className = 'cloud';
    const icon = `<span class="ic"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z"/></svg><i></i></span>`;
    paintPair('');
    if (st.user) {
      c.classList.add('on');
      c.innerHTML = `${icon}<span class="t"><b>${esc(tr('cloudOn'))}</b><span>${esc(st.user)}</span></span><span class="chev">⋯</span>`;
      $('cloudMenu').innerHTML = `<button data-c="open">${esc(tr('open'))}</button><button data-c="sync">${esc(tr('syncNow'))}</button>
        <button data-c="more">${esc(tr('more'))}</button><button data-c="disconnect" class="danger">${esc(tr('disconnect'))}</button>`;
    } else {
      c.innerHTML = `${icon}<span class="t"><b>${esc(tr('cloudOff'))}</b><span>${esc(tr('cloudOffB'))}</span></span><span class="chev">›</span>`;
      $('cloudMenu').innerHTML = `<button data-c="connect">${esc(tr('cloudOffB'))}</button>`;
    }
  }
  async function connect() {
    // Firefox: its own consent to send data, from this click (as hl.js does).
    // Over a site (a frame) Firefox may never show that prompt, and the click
    // would wait for it forever: a few seconds at most, then on.
    let consented = true;
    if (firefox) { try { consented = !!(await Promise.race([browser.permissions.request({ data_collection: ['personallyIdentifyingInfo', 'websiteContent'] }), new Promise(r => setTimeout(() => r(false), 2500))])); } catch (e) { consented = false; } }
    // The site opens in a window beside this one; the home stays, with the code.
    const r = await send({ action: 'hl.connect', consented, window: true });
    if (r && r.ok === false) toast(tr('pairFail'));
    paintCloud();
  }
  // The Highlights' tile: "Permitir em todos os sites" while that is missing.
  async function paintAllow() {
    let has = true;
    try { has = await chrome.permissions.contains({ origins: ALL_SITES }); } catch (e) {}
    $('hlAllow').hidden = has;
  }
  // Asked right from this tap (Chrome shows the prompt over the page). Firefox
  // doesn't show it from inside the frame: its own page asks (start.html#access).
  async function allowAll() {
    if (firefox && framed) { send({ action: 'hl.openAccess' }); return; }
    let ok = false;
    try { ok = await chrome.permissions.request({ origins: ALL_SITES }); }
    catch (e) { send({ action: 'hl.openAccess' }); return; }
    if (!ok) return;
    await send({ action: 'hl.access' });
    paintAllow(); toast(tr('allowDone'));
  }

  // While connecting: the code to type on the site (banner removed).
  function paintPair(code) {
    const box = $('pairBox');
    if (box) { box.hidden = true; box.style.display = 'none'; }
    return;
  }

  // ─── this page ────────────────────────────────────────────────────────────
  const restrictedUrl = u => !/^https?:/.test(u || '') || /^https:\/\/(chromewebstore\.google\.com|chrome\.google\.com\/webstore|addons\.mozilla\.org)\//.test(u);
  // The page strip shows only when the page can't take the tools; this
  // site's switches live under the gear (the home stays clean).
  async function paintPage() {
    const box = $('page'), site = $('siteBox');
    // Over a page, the page takes the tools (background.js frames only those);
    // its address may not be readable here, so the frame's link carries it.
    const url = (tab && tab.url) || pageUrl;
    if (!framed && (!tab || restrictedUrl(url))) {
      box.hidden = false;
      box.className = 'page warn';
      box.textContent = tr('restricted');
      $('drawGo').disabled = true;
      site.innerHTML = '';
      return;
    }
    box.hidden = true;
    if (!url || restrictedUrl(url)) { site.innerHTML = ''; return; }
    host = new URL(url).hostname.replace(/^www\./, '');
    const off = Array.isArray(prefs.hlOff) && prefs.hlOff.includes(host);
    const r = await send({ action: 'hl.load', url });
    const n = Array.isArray(r.marks) ? r.marks.length : 0;
    site.innerHTML = `<h3>${esc(tr('site'))}</h3><div class="host"><span>${esc(host)}</span><em>${esc(n === 0 ? tr('marks0') : n === 1 ? tr('marks1') : tr('marksN', n))}</em></div>
      <label class="sw"><input type="checkbox" id="hlHere" ${off ? '' : 'checked'}><span>${esc(tr('hlHere'))}</span></label>`;
    $('hlHere').addEventListener('change', e => {
      const list = (Array.isArray(prefs.hlOff) ? prefs.hlOff : []).filter(x => x !== host);
      if (!e.target.checked) list.push(host);
      prefs.hlOff = list;
      chrome.storage.local.set({ hlOff: list });
    });
  }

  // ─── the tools ────────────────────────────────────────────────────────────
  // The background does the rest: the home goes down at once, whatever the
  // page takes to answer.
  function openDraw() {
    if (!tab) return;
    send({ action: 'home.draw', tabId: tab.id });
    closeHome();
  }
  // In a tab of its own (Minhas marcações, the modal): the home stays here.
  function openHighlights() {
    send({ action: 'home.highlights' });
  }

  document.addEventListener('click', e => {
    const t = e.target;
    if (t.closest('#close')) { closeHome(); return; }
    const cp = t.closest('[data-copy]');
    if (cp) { navigator.clipboard.writeText(cp.dataset.copy).then(() => { cp.textContent = tr('copied'); }, () => {}); return; }
    if (t.closest('#gear')) { paintSheet(); $('sheet').classList.toggle('open'); $('cloudMenu').classList.remove('open'); return; }
    if (!t.closest('#sheet') && !t.closest('#cloudMenu') && !t.closest('#cloud')) { $('sheet').classList.remove('open'); $('cloudMenu').classList.remove('open'); }
    const lb = t.closest('[data-lang]');
    if (lb) {
      prefs.pdLang = lb.dataset.lang;
      chrome.storage.local.set({ pdLang: lb.dataset.lang });
      lang = pickLang(prefs); L = STR[lang] || STR.en;
      paintTexts(); paintSheet(); paintCloud(); paintPage();
      return;
    }
    const th = t.closest('[data-theme]');
    const ic = t.closest('[data-icon]');
    const hm = t.closest('[data-hlmenu]');
    if (hm) { prefs.hlOn = hm.dataset.hlmenu === 'on'; chrome.storage.local.set({ hlOn: prefs.hlOn }); paintSheet(); return; }
    if (ic) { prefs.bnIconOpens = ic.dataset.icon; chrome.storage.local.set({ bnIconOpens: ic.dataset.icon }); paintSheet(); return; }
    if (th) { prefs.pdTheme = th.dataset.theme; chrome.storage.local.set({ pdTheme: th.dataset.theme }); applyTheme(); paintSheet(); return; }
    if (t.closest('#cloud')) {
      if (!st.user && !st.pairing) { connect(); return; }
      $('cloudMenu').classList.toggle('open');
      return;
    }
    const cm = t.closest('[data-c]');
    if (cm) {
      const a = cm.dataset.c;
      if (a === 'open') { send({ action: 'hl.web' }); $('cloudMenu').classList.remove('open'); }
      else if (a === 'sync') { cm.disabled = true; send({ action: 'hl.sync' }).then(paintCloud); }
      else if (a === 'more') { send({ action: 'hl.buyCloud' }); $('cloudMenu').classList.remove('open'); }
      else if (a === 'connect') connect();
      // Disconnecting leaves nothing here: what couldn't go up yet is lost, so asked first.
      else if (a === 'disconnect') send({ action: 'hl.disconnect' }).then(r => (r && r.pending && confirm(tr('discLeft', r.pending)) ? send({ action: 'hl.disconnect', force: true }) : r)).then(() => { $('cloudMenu').classList.remove('open'); paintCloud(); });
      return;
    }
    // Clicks on the 6 Tiles (Image 1) - routes directly to the corresponding GitHub Pages page
    // 1. GooDraw
    if (t.closest('#drawTile') || t.closest('#drawGo') || t.closest('[data-open="draw"]')) {
      if (typeof chrome !== 'undefined' && chrome.tabs && tab) {
        openDraw();
      } else {
        openTab("https://daniellucas2025.github.io/goodraw/index.html");
      }
      return;
    }
    // 2. GooHighlights
    if (t.closest('#hlAllow')) { allowAll(); return; }
    if (t.id === 'hlDockHide') { chrome?.storage?.local?.set({ hlDockHide: t.checked }); return; }
    if (t.closest('#hlTile') || t.closest('#hlGo') || t.closest('[data-open="hl"]')) {
      openTab("https://daniellucas2025.github.io/goodraw/dashboard.html#grifos");
      return;
    }
    // 3. GooNotes
    if (t.closest('#notesTile') || t.closest('#notesGo') || t.closest('[data-open="notes"]')) {
      openTab("https://daniellucas2025.github.io/goodraw/dashboard.html");
      return;
    }
    // 4. Flashcards
    if (t.closest('#fcTile') || t.closest('#fcGo')) {
      openTab("https://daniellucas2025.github.io/goodraw/dashboard.html#flashcards");
      return;
    }
    // 5. Planner
    if (t.closest('#plTile') || t.closest('#plGo')) {
      openTab("https://daniellucas2025.github.io/goodraw/dashboard.html#planner");
      return;
    }
    // 6. App Android
    if (t.closest('#andTile') || t.closest('#android')) {
      openTab("https://daniellucas2025.github.io/goodraw/dashboard.html#app");
      return;
    }
    // Chamados: the Notes' form, with this page and the extension's version (background.js).
    if (t.closest("#ticketGo")) { openTab("https://daniellucas2025.github.io/goodraw/dashboard.html"); closeHome(); return; }
    const s = t.closest('[data-s]');
    if (s) openTab(s.dataset.s === 'rate' ? rateUrl(lang) : URLS[s.dataset.s]);
  });
  document.addEventListener('keydown', e => {
    if (e.key !== 'Escape') return;
    e.preventDefault();
    if ($('sheet').classList.contains('open') || $('cloudMenu').classList.contains('open')) { $('sheet').classList.remove('open'); $('cloudMenu').classList.remove('open'); }
    else closeHome();
  });

  // The Draw's preview: the circle, then the crossed-out option, the pencil's
  // tip always on the point of the stroke being drawn. One clock for both.
  function drawPreview() {
    const circ = document.querySelector('.ink .circ'), cross = document.querySelector('.ink .cross'), pen = document.querySelector('.art .pen');
    if (!circ || !cross || !pen || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const L1 = circ.getTotalLength(), L2 = cross.getTotalLength();
    [[circ, L1], [cross, L2]].forEach(([p, l]) => { p.style.strokeDasharray = l; });
    const ease = x => x < .5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2;
    const seg = (t, a, b) => Math.max(0, Math.min(1, (t - a) / (b - a)));
    const CYCLE = 4500;
    const tip = (x, y, o) => { pen.style.transform = `translate(${x}px, ${y}px) rotate(32deg)`; pen.style.opacity = o; };
    function frame(now) {
      const t = (now % CYCLE) / CYCLE;
      const c = ease(seg(t, .08, .38)), k = ease(seg(t, .44, .6)), fade = 1 - seg(t, .88, 1);
      circ.style.strokeDashoffset = L1 * (1 - c); cross.style.strokeDashoffset = L2 * (1 - k);
      circ.style.opacity = cross.style.opacity = fade;
      let pt;
      if (t < .38) pt = circ.getPointAtLength(L1 * c);
      else if (t < .44) {   // the pencil lifts and goes to the option
        const a = circ.getPointAtLength(L1), b = cross.getPointAtLength(0), m = ease(seg(t, .38, .44));
        pt = { x: a.x + (b.x - a.x) * m, y: a.y + (b.y - a.y) * m - Math.sin(m * Math.PI) * 14 };
      } else pt = cross.getPointAtLength(L2 * k);
      tip(pt.x, pt.y, fade);
      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  }
  drawPreview();

  chrome.storage.local.get(['pdLang', 'pdTheme', 'pdTbPos', 'pdColor', 'pdNoticeHide', 'hlOff', 'hlDockHide', 'bnIconOpens', 'hlOn'], async p => {
    $('hlDockHide').checked = p.hlDockHide === true;
    prefs = p || {};
    lang = pickLang(prefs); L = STR[lang] || STR.en;
    applyTheme(); paintTexts();
    // home.html#tab=<id>: a given tab instead of the active one (the tests open the home in a tab of its own).
    const hp = new URLSearchParams(location.hash.slice(1)), forced = /^\d+$/.test(hp.get('tab') || '') ? +hp.get('tab') : null;
    pageUrl = hp.get('u') || '';
    try { tab = forced != null ? await chrome.tabs.get(forced) : (await chrome.tabs.query({ active: true, currentWindow: true }))[0]; } catch (e) {}
    if (!tab && forced != null) tab = { id: forced };
    paintCloud(); paintPage(); paintAllow();
  });
  chrome.storage.onChanged.addListener((ch, area) => {
    if (area !== 'local') return;
    if (ch.bnCloudUser || ch.bnHlPair) paintCloud();
  });
})();
