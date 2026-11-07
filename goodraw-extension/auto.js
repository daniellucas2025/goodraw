// "Abrir sozinha neste site" (the Draw's settings): asks for the access to
// that one site. It has to happen here: the browser only shows that prompt in
// response to a click on an extension page, never from a message sent by the
// content script. Granted, the site joins pdAutoSites and the bar opens by
// itself there (background.js); the icon still opens the home screen.
const q = new URLSearchParams(location.search);
const host = (q.get('host') || '').toLowerCase();
const valid = /^[a-z0-9.-]+\.[a-z0-9-]+$/.test(host);
const msg = document.getElementById('msg');

// The bar's language, passed in by background.js.
const STR = {
  pt: { askA: 'Abrir sozinha sempre que você entrar em', askB: '?', why: 'O navegador vai pedir permissão para a extensão funcionar nesse site. Dá para desligar quando quiser, nas Configurações da barra.', no: 'Agora não', ok: 'Permitir', refused: 'Tudo bem, nada mudou.', granted: h => 'Pronto! A barra vai abrir sozinha em ' + h + '.' },
  en: { askA: 'Open automatically every time you visit', askB: '?', why: 'Your browser will ask for permission for the extension to run on this site. You can turn it off anytime in the toolbar’s Settings.', no: 'Not now', ok: 'Allow', refused: 'No problem, nothing changed.', granted: h => 'Done! The toolbar will open automatically on ' + h + '.' },
  es: { askA: '¿Abrir sola siempre que entres en', askB: '?', why: 'El navegador pedirá permiso para que la extensión funcione en ese sitio. Puedes desactivarlo cuando quieras, en los Ajustes de la barra.', no: 'Ahora no', ok: 'Permitir', refused: 'Está bien, nada cambió.', granted: h => '¡Listo! La barra se abrirá sola en ' + h + '.' },
  fr: { askA: 'Ouvrir automatiquement chaque fois que vous allez sur', askB: ' ?', why: 'Le navigateur va demander l’autorisation pour que l’extension fonctionne sur ce site. Vous pouvez la désactiver quand vous voulez, dans les Réglages de la barre.', no: 'Pas maintenant', ok: 'Autoriser', refused: 'D’accord, rien n’a changé.', granted: h => 'C’est fait ! La barre s’ouvrira automatiquement sur ' + h + '.' },
};
const lang = STR[q.get('lang')] ? q.get('lang') : 'pt';
const T = STR[lang];
document.documentElement.lang = lang === 'pt' ? 'pt-BR' : lang;
['askA', 'askB', 'why', 'no', 'ok'].forEach(id => { const el = document.getElementById(id); if (el) el.textContent = T[id]; });

document.getElementById('host').textContent = valid ? host : '—';
if (!valid) document.getElementById('ok').disabled = true;

function done(text, good) {
  document.getElementById('btns').hidden = true;
  msg.textContent = text;
  msg.className = good ? 'good' : '';
  msg.hidden = false;
  setTimeout(() => window.close(), good ? 1500 : 2500);
}

document.getElementById('no').addEventListener('click', () => window.close());

document.getElementById('ok').addEventListener('click', () => {
  // Called straight from the click handler — anything awaited first would
  // lose the user gesture and the browser would refuse to ask.
  chrome.permissions.request({ origins: [`*://*.${host}/*`] }, granted => {
    if (!granted) { done(T.refused, false); return; }
    chrome.storage.local.get('pdAutoSites', res => {
      const sites = Array.isArray(res.pdAutoSites) ? res.pdAutoSites : [];
      if (!sites.includes(host)) sites.push(host);
      chrome.storage.local.set({ pdAutoSites: sites }, () => done(T.granted(host), true));
    });
  });
});
