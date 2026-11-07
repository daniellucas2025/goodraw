// GooHighlights — a página da extensão para o que o navegador só deixa
// fazer numa página dela: ligar o menu de cores em todos os sites, e (no
// Firefox) o consentimento para enviar dados à nuvem antes de conectar a
// conta. Minhas marcações e a conta em si ficam no site (/notes/app).
(function () {
  'use strict';
  // Every address: the screen capture needs it (background.js, ALL_SITES).
  const ALL_SITES = ['<all_urls>'];
  const FIREFOX_DATA = ['personallyIdentifyingInfo', 'websiteContent'];
  const firefox = typeof browser !== 'undefined' && /Firefox\//.test(navigator.userAgent);
  const STR = {
    pt: {
      discLeft: "{0} item(ns) ainda não subiram para a nuvem (sem internet?). Ao desconectar, eles são apagados deste computador e se perdem. Desconectar mesmo assim?",
      sub: 'Grife qualquer site e guarde na sua conta',
      fine: 'Suas marcações ficam neste computador e, com a conta conectada, também na nuvem. Para ver e organizar todas, use Minhas marcações no site.',
      localT: 'Só neste computador', localB: 'Você tem {0} marcações guardadas só neste navegador. Conecte sua conta grátis (5 MB na nuvem) para que elas subam e apareçam em Minhas marcações, no site.',
      localB0: 'Conecte sua conta grátis (5 MB na nuvem): o que você grifar sobe sozinho e aparece em Minhas marcações, no site.',
      connect: 'Conectar à minha conta (ou criar uma grátis)', connectFine: 'Abre o site da GooDraw: entre ou crie sua conta e a extensão se conecta sozinha.',
      waitT: 'Esperando você entrar no site…', waitB: 'Na aba do site que acabou de abrir, entre (ou crie sua conta) e digite este código. Assim que terminar, a extensão se conecta.',
      cloudT: 'Na nuvem', cloudB: 'Conectada como {0}. O que você grifa sobe para a sua conta e aparece em Minhas marcações.',
      open: 'Abrir Minhas marcações no site', syncNow: 'Sincronizar agora', disconnect: 'Desconectar esta extensão',
      accessT: 'Menu de cores em todos os sites', accessOff: 'Para o menu aparecer sozinho quando você seleciona um texto, em qualquer site, o navegador precisa da sua permissão. É pedida uma vez.',
      accessOn: 'Ligado: o menu aparece em qualquer site quando você seleciona um texto.', accessBtn: 'Ligar em todos os sites', on: 'ligado', off: 'desligado',
      synced: 'Sincronizado', syncing: 'Sincronizando…'
    },
    en: {
      discLeft: "{0} item(s) haven't gone up to the cloud yet (offline?). Disconnecting deletes them from this computer and they are lost. Disconnect anyway?",
      sub: 'Highlight any site and keep it in your account',
      fine: 'Your highlights stay on this computer and, with the account connected, in the cloud too. To see and organise them all, use My highlights on the site.',
      localT: 'This computer only', localB: 'You have {0} highlights kept only in this browser. Connect your free account (5 MB of cloud) so they go up and show in My highlights, on the site.',
      localB0: 'Connect your free account (5 MB of cloud): what you highlight goes up by itself and shows in My highlights, on the site.',
      connect: 'Connect my account (or create a free one)', connectFine: 'Opens the GooDraw site: sign in or create your account and the extension connects by itself.',
      waitT: 'Waiting for you to sign in on the site…', waitB: 'In the site tab that just opened, sign in (or create your account) and type this code. As soon as you finish, the extension connects.',
      cloudT: 'In the cloud', cloudB: 'Connected as {0}. What you highlight goes up to your account and shows in My highlights.',
      open: 'Open My highlights on the site', syncNow: 'Sync now', disconnect: 'Disconnect this extension',
      accessT: 'Colour menu on every site', accessOff: 'For the menu to show by itself when you select text, on any site, the browser needs your permission. It is asked once.',
      accessOn: 'On: the menu shows on any site when you select text.', accessBtn: 'Turn on for every site', on: 'on', off: 'off',
      synced: 'Synced', syncing: 'Syncing…'
    },
    es: {
      discLeft: "{0} elemento(s) aún no subieron a la nube (¿sin internet?). Al desconectar se borran de este ordenador y se pierden. ¿Desconectar de todos modos?",
      sub: 'Resalta cualquier sitio y guárdalo en tu cuenta',
      fine: 'Tus resaltados quedan en este ordenador y, con la cuenta conectada, también en la nube. Para verlos y organizarlos todos, usa Mis resaltados en el sitio.',
      localT: 'Solo en este ordenador', localB: 'Tienes {0} resaltados guardados solo en este navegador. Conecta tu cuenta gratis (5 MB en la nube) para que se suban y aparezcan en Mis resaltados, en el sitio.',
      localB0: 'Conecta tu cuenta gratis (5 MB en la nube): lo que resaltes se sube solo y aparece en Mis resaltados, en el sitio.',
      connect: 'Conectar a mi cuenta (o crear una gratis)', connectFine: 'Abre el sitio de GooDraw: entra o crea tu cuenta y la extensión se conecta sola.',
      waitT: 'Esperando a que entres en el sitio…', waitB: 'En la pestaña del sitio que se acaba de abrir, entra (o crea tu cuenta) y escribe este código. En cuanto termines, la extensión se conecta.',
      cloudT: 'En la nube', cloudB: 'Conectada como {0}. Lo que resaltas se sube a tu cuenta y aparece en Mis resaltados.',
      open: 'Abrir Mis resaltados en el sitio', syncNow: 'Sincronizar ahora', disconnect: 'Desconectar esta extensión',
      accessT: 'Menú de colores en todos los sitios', accessOff: 'Para que el menú aparezca solo al seleccionar un texto, en cualquier sitio, el navegador necesita tu permiso. Se pide una vez.',
      accessOn: 'Activado: el menú aparece en cualquier sitio al seleccionar un texto.', accessBtn: 'Activar en todos los sitios', on: 'activado', off: 'desactivado',
      synced: 'Sincronizado', syncing: 'Sincronizando…'
    },
    fr: {
      discLeft: "{0} élément(s) ne sont pas encore partis dans le nuage (hors ligne ?). En vous déconnectant, ils sont effacés de cet ordinateur et perdus. Se déconnecter quand même ?",
      sub: "Surlignez n'importe quel site et gardez-le dans votre compte",
      fine: 'Vos surlignages restent sur cet ordinateur et, avec le compte connecté, aussi dans le nuage. Pour tous les voir et les organiser, utilisez Mes surlignages sur le site.',
      localT: 'Sur cet ordinateur seulement', localB: 'Vous avez {0} surlignages gardés uniquement dans ce navigateur. Connectez votre compte gratuit (5 MB dans le nuage) pour les envoyer et les voir dans Mes surlignages, sur le site.',
      localB0: 'Connectez votre compte gratuit (5 MB dans le nuage) : ce que vous surlignez est envoyé tout seul et apparaît dans Mes surlignages, sur le site.',
      connect: 'Connecter mon compte (ou en créer un gratuit)', connectFine: "Ouvre le site d'GooDraw : connectez-vous ou créez votre compte et l'extension se connecte toute seule.",
      waitT: 'En attente de votre connexion sur le site…', waitB: "Dans l'onglet du site qui vient de s'ouvrir, connectez-vous (ou créez votre compte) et saisissez ce code. Dès que c'est fait, l'extension se connecte.",
      cloudT: 'Dans le nuage', cloudB: 'Connectée en tant que {0}. Ce que vous surlignez est envoyé sur votre compte et apparaît dans Mes surlignages.',
      open: 'Ouvrir Mes surlignages sur le site', syncNow: 'Synchroniser maintenant', disconnect: 'Déconnecter cette extension',
      accessT: 'Menu de couleurs sur tous les sites', accessOff: "Pour que le menu apparaisse tout seul quand vous sélectionnez du texte, sur n'importe quel site, le navigateur a besoin de votre autorisation. Elle n'est demandée qu'une fois.",
      accessOn: "Activé : le menu apparaît sur n'importe quel site quand vous sélectionnez du texte.", accessBtn: 'Activer sur tous les sites', on: 'activé', off: 'désactivé',
      synced: 'Synchronisé', syncing: 'Synchronisation…'
    }
  };
  let L = STR.pt;
  const tr = (k, ...a) => String(L[k] || STR.pt[k] || k).replace(/\{(\d)\}/g, (_, i) => a[i] ?? '');
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const send = m => new Promise(r => chrome.runtime.sendMessage(m, x => { void chrome.runtime.lastError; r(x || {}); }));
  const acc = document.getElementById('acc'), access = document.getElementById('access');
  let poll = 0;

  async function paintAccount() {
    const st = await send({ action: 'hl.status' });
    if (st.user) {
      clearInterval(poll); poll = 0;
      acc.innerHTML = `<h2>${esc(tr('cloudT'))} <span class="badge cloud"><i></i>${esc(st.phase === 'syncing' ? tr('syncing') : tr('synced'))}</span></h2>
        <p>${esc(tr('cloudB', st.user))}</p>
        <div class="acts"><button class="go" data-a="open">${esc(tr('open'))}</button><button data-a="sync">${esc(tr('syncNow'))}</button><button data-a="disconnect">${esc(tr('disconnect'))}</button></div>`;
    } else if (st.pairing) {
      acc.innerHTML = `<h2>${esc(tr('waitT'))} <span class="badge wait"><i></i>…</span></h2><p>${esc(tr('waitB'))}</p>
        ${st.pairCode ? `<p class="paircode" style="font:700 28px/1.2 ui-monospace,monospace;letter-spacing:.12em;margin:4px 0 12px">${esc(st.pairCode)}</p>` : ''}
        <div class="acts"><button data-a="connect">${esc(tr('connect'))}</button></div>`;
      if (!poll) poll = setInterval(async () => { const r = await send({ action: 'hl.pairCheck' }); if (r.ok) paintAccount(); }, 2500);
    } else {
      acc.innerHTML = `<h2>${esc(tr('localT'))} <span class="badge local"><i></i>${esc(tr('localT'))}</span></h2>
        <p>${esc(st.marks ? tr('localB', st.marks) : tr('localB0'))}</p>
        <div class="acts"><button class="go" data-a="connect">${esc(tr('connect'))}</button></div>
        <p class="fine" style="margin-top:10px">${esc(tr('connectFine'))}</p>`;
    }
  }
  async function paintAccess() {
    let on = false;
    try { on = await chrome.permissions.contains({ origins: ALL_SITES }); } catch (e) {}
    access.innerHTML = `<h2>${esc(tr('accessT'))} <span class="badge ${on ? 'cloud' : 'local'}"><i></i>${esc(tr(on ? 'on' : 'off'))}</span></h2>
      <p>${esc(tr(on ? 'accessOn' : 'accessOff'))}</p>
      ${on ? '' : `<div class="acts"><button class="go" data-a="access">${esc(tr('accessBtn'))}</button></div>`}`;
  }
  async function connect() {
    // Firefox: o consentimento dele para enviar dados, direto deste clique.
    // Firefox: its consent to send data, as the person answered it (not assumed).
    let consented = true;
    if (firefox) { try { consented = !!(await browser.permissions.request({ data_collection: FIREFOX_DATA })); } catch (e) { consented = false; } }
    await send({ action: 'hl.connect', consented });
    paintAccount();
  }
  document.addEventListener('click', async e => {
    const b = e.target.closest('button[data-a]');
    if (!b) return;
    const a = b.dataset.a;
    if (a === 'connect') connect();
    else if (a === 'open') send({ action: 'hl.web' });
    else if (a === 'sync') { b.disabled = true; await send({ action: 'hl.sync' }); paintAccount(); }
    else if (a === 'disconnect') {
      // Disconnecting leaves nothing here: what couldn't go up yet is lost, so asked first.
      const r = await send({ action: 'hl.disconnect' });
      if (r && r.pending && confirm(tr('discLeft', r.pending))) await send({ action: 'hl.disconnect', force: true });
      paintAccount();
    }
    else if (a === 'access') {
      try { if (await chrome.permissions.request({ origins: ALL_SITES })) await send({ action: 'hl.access' }); } catch (e) {}
      paintAccess();
    }
  });
  chrome.storage.local.get(['pdLang'], r => {
    const nav = (navigator.language || '').slice(0, 2).toLowerCase();
    const lang = r && ['pt', 'en', 'es', 'fr'].includes(r.pdLang) ? r.pdLang : (['pt', 'es', 'fr'].includes(nav) ? nav : 'en');
    L = STR[lang] || STR.en; document.documentElement.lang = lang === 'pt' ? 'pt-BR' : lang;
    document.querySelectorAll('[data-t]').forEach(el => { el.textContent = tr(el.dataset.t); });
    paintAccount(); paintAccess();
    // Vindo da barra para conectar (no Firefox, depois do consentimento).
    if (location.hash === '#connect') { history.replaceState(null, '', location.pathname); }
  });
  chrome.storage.onChanged.addListener((ch, area) => { if (area === 'local' && (ch.bnCloudUser || ch.bnHlPair)) paintAccount(); });
})();
