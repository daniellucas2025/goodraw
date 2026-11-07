/* GooDraw - Draw v9 — content.js */
(function () {
  'use strict';
  if (typeof window.__pdToggle === 'function') {
    if (document.getElementById('__pd_root__')) { window.__pdToggle(); return; }
    // The hook is here but our toolbar isn't: the page replaced its DOM
    // without a navigation (an SPA route change). Tear the old instance down
    // so its document-level listeners go with it, then fall through and
    // rebuild — toggling would do nothing and leave the page with no tools.
    try { window.__pdDestroy?.(); } catch (e) {}
  }
  // A bar left on the page by another copy of this extension — the previous
  // version after a store update, a copy that was just disabled, or the store
  // build next to a test build. It runs in a different isolated world, so the
  // hook above can't see it; its elements share our ids and, sitting later in
  // <body>, paint over the bar built below — the new one looks like it never
  // opened. Take them down first (styles included: all ids start with __pd_).
  document.querySelectorAll('[id^="__pd_"]').forEach(el => el.remove());
  // Everything this instance hangs on the document or the window is tied to
  // one signal: destroy() aborts it, so closing and reopening the bar ten
  // times leaves no listener behind (Onda 3, 01/11/2026).
  const __ac = new AbortController();
  const SIG = { signal: __ac.signal }, SIGC = { signal: __ac.signal, capture: true };

  // ─── PLATFORM ADAPTER ─────────────────────────────────────────────────────
  // The same file runs unchanged in three hosts:
  //  • 'extension' — Chrome content script (chrome.* APIs available)
  //  • 'android'   — WebView app: window.AndroidBridge is injected natively
  //                  via addJavascriptInterface (prefs + native capture)
  //  • 'web'       — fallback for dev/testing (script pasted into a page):
  //                  prefs via localStorage, capture unavailable
  const PD_ENV = (typeof chrome !== 'undefined' && chrome.runtime?.id) ? 'extension'
    : (typeof window.AndroidBridge !== 'undefined' ? 'android' : 'web');
  // GooNotes on hold (21/10/2026): its tab under the brand, its button
  // and its modal are kept but not shown, and the GooHighlights modal
  // takes the modal's place. "Save to the Notes" after a capture only for an
  // account that still has the Notes (notes/hold.js writes bnNotesAccess).
  // false brings the Notes' tab, button and modal back — since the Notes'
  // launch (26/10/2026; docs/ESCOPO-LANCAMENTO-NOTES.md): they open the site's app.
  const NOTES_HOLD = false;
  // The Notes' screens are on the site (/notes/app) since 21/10/2026, not in
  // the extension: what used to open them there opens the site.
  const NOTES_IN_EXTENSION = false;

  // ─── LANGUAGE ─────────────────────────────────────────────────────────────
  // Portuguese or English. Portuguese when the device/browser language starts
  // with "pt", English otherwise — unless a choice was made in ⚙️ → Idioma /
  // Language:
  //  • extension: pdLang ('auto' | 'pt' | 'en') in chrome.storage. Storage only
  //    answers after this file has built the bar, so background.js reads it
  //    first and hands it over as window.__pdLang before injecting us;
  //  • app: the native side owns it (Android's per-app language) and answers
  //    through AndroidBridge.getLang() / getLangPref();
  //  • web (the site's demo): always Portuguese.
  const LANG_PREFS = ['auto', 'pt', 'en', 'es', 'fr'];
  let langPref = 'auto';
  if (PD_ENV === 'extension' && LANG_PREFS.includes(window.__pdLang)) langPref = window.__pdLang;
  if (PD_ENV === 'android') {
    try { const p = window.AndroidBridge.getLangPref(); if (LANG_PREFS.includes(p)) langPref = p; } catch (e) {}
  }
  const PD_LANG = (() => {
    // The site's demo: the language of the page it is on (/es/, /fr/…).
    if (PD_ENV === 'web') { const l = (document.documentElement.lang || '').slice(0, 2).toLowerCase(); return ['en', 'es', 'fr'].includes(l) ? l : 'pt'; }
    if (PD_ENV === 'android') {
      try { const l = window.AndroidBridge.getLang(); return ['en', 'es', 'fr'].includes(l) ? l : 'pt'; } catch (e) { return 'pt'; }
    }
    if (langPref !== 'auto') return langPref;
    const nav = (navigator.language || '').slice(0, 2).toLowerCase();
    return ['pt', 'es', 'fr'].includes(nav) ? nav : 'en';
  })();

  // Every string the bar shows. The Portuguese is the original text, word for
  // word; English follows the glossary in marketing/fichas-das-lojas.md.
  // {0}, {1}… are filled in by tr(key, a, b…). Some values carry markup.
  const I18N = {
    pt: {
      'plan.lifetime': 'Plano vitalício',
      'plan.yearlyActive': 'Plano anual ativo',
      'plan.monthlyActive': 'Plano mensal ativo',
      'plan.moveYearly': 'Conhecer o vitalício',
      'plan.moveMonthly': 'Ver plano anual e vitalício',
      'plan.active': 'Assinatura ativa',
      'plan.see': '✨ Ver planos Premium',
      'plan.restore': 'Já comprou? Restaurar compra',
      'gate.title': 'GooDraw no celular e tablet',
      'gate.body': 'Em dispositivos Android, use o aplicativo oficial — otimizado para toque e caneta, com rejeição de palma, tela cheia e captura na galeria.',
      'gate.cta': 'Baixar na Play Store',
      'gate.free': 'No computador, a extensão continua gratuita 💙',
      'common.close': 'Fechar',
      'tool.pointer': 'Ponteiro',
      'tool.pencil': 'Lápis',
      'tool.highlight': 'Marcador',
      'tool.line': 'Linha',
      'tool.rect': 'Retângulo',
      'tool.circle': 'Círculo', 'tool.lasso': 'Laço: selecionar, mover e redimensionar', 'hk.lasso': 'Laço',
      'tool.eraser': 'Borracha',
      'tool.laser': 'Laser Pointer (3s)',
      'tool.text': 'Texto',
      'act.clear': 'Limpar tudo',
      'act.undo': 'Desfazer',
      'act.redo': 'Refazer',
      'act.capture': 'Capturar tela inteira',
      'act.crop': 'Capturar uma área',
      'act.calc': 'Calculadora',
      'act.notes': 'GooNotes: seu estudo completo',
      'notes.send': 'Mandar para o caderno',
      'notes.pick': 'Mandar para qual tópico?',
      'notes.find': 'Buscar tópico',
      'notes.general': 'Geral',
      'notes.newErrors': 'Novo caderno de erros',
      'notes.errors': 'Caderno de erros',
      'notes.untitled': 'Caderno sem título',
      'notes.sending': 'Mandando…',
      'notes.sent': 'Foi para “{0}”',
      'notes.open': 'Abrir o caderno',
      'notes.fail': 'Não deu para mandar para o caderno',
      'card.make': 'Criar flashcard',
      'card.pick': 'Criar o flashcard em qual tópico?',
      'card.in': 'Flashcard em “{0}”',
      'card.picFront': 'Imagem na frente',
      'card.picBack': 'Imagem no verso',
      'card.backPh': 'Escreva o verso: a resposta…',
      'card.frontPh': 'Escreva a frente: a pergunta…',
      'card.create': 'Criar flashcard',
      'card.done': 'Flashcard criado em “{0}”',
      'card.open': 'Abrir os flashcards',
      'card.fail': 'Não deu para criar o flashcard',
      'card.noTopics': 'Crie disciplinas e tópicos no GooNotes primeiro.',
      'act.fullscreen': 'Tela cheia',
      'act.pen': 'Caneta na tela',
      'act.settings': 'Configurações',
      'act.more': 'Mais ferramentas',
      'act.shortcuts': 'Atalhos do teclado',
      'brand.rateChrome': 'Gostou? Deixe sua avaliação na Chrome Web Store ⭐',
      'brand.rateFirefox': 'Gostou? Deixe sua avaliação no Firefox Add-ons ⭐',
      'brand.sub': '⭐ Avalie a extensão',
      'color.tool': 'Cor da ferramenta',
      'color.recent': 'Últimas cores usadas',
      'color.other': 'Outra cor',
      'color.use': 'Usar {0}',
      'social.contact': 'Contato',
      'social.ig': 'Siga @agoodrawdraw no Instagram',
      'android.pill': 'App para Android',
      'android.pillShort': 'Android',
      'android.pillTitle': 'Ver os planos do app',
      'am.title': 'No tablet, a caneta na questão',
      'am.body': 'O GooDraw para <b>tablet e celular</b> já está na Google Play.\n        Lápis e borracha são grátis; o resto vem em um destes planos:',
      'am.fine': 'Aqui no computador a extensão continua gratuita, com tudo liberado.',
      'am.cta': 'Ver na Google Play',
      'am.dontShow': 'Não mostrar esta mensagem novamente',
      'am.prices': 'Preços na sua moeda na Google Play.',
      'news.never': 'Não avisar mais',
      'news.notes.tag': 'Novidade',
      'news.notes.title': '📚 Conheça GooNotes',
      'news.notes.body': 'Seu edital em <b>disciplinas e tópicos</b>, e em cada tópico <b>notas, mapa mental e caderno à mão</b>, ' +
        'até sobre o PDF. Grátis, no computador, no tablet e no celular.',
      'news.notes.cta': 'Conhecer',
      'dr.title': 'GooDraw no tablet e no celular',
      'dr.body': 'Escreva com a caneta direto na tela, em qualquer app — no Android.',
      'dr.cta': 'Ver o app',
      'bf.pre.title': 'Black Friday da GooNotes',
      'bf.pre.body': 'Pague um, leve… Em 06/11 a gente revela o resto. Entre na lista e saiba antes de todo mundo.',
      'bf.pre.cta': 'Entrar na lista',
      'bf.live.title': 'Black Friday da GooNotes',
      'bf.live.body': 'Até 20/11, todo plano do Notes Premium vem em dobro. E, pela primeira vez, o vitalício.',
      'bf.live.cta': 'Ver as ofertas',
      'notesTab': 'Conheça GooNotes',
      'notesTab.tip': 'Flashcards e Planner grátis; o Notes completo — disciplinas, questões, discursivas, simulados — no Premium',
      'tour.next': "Próximo",
      'tour.back': "Voltar",
      'tour.skip': "Pular o tour",
      'tour.done': "Começar a usar",
      'tour.again': "▶ Rever o tour da barra",
      'tour.brand.t': "Bem-vindo à GooDraw",
      'tour.brand.b': "Escreva, grife e desenhe sobre qualquer página — questões, PDFs, aulas. Em um minuto, a gente mostra cada ferramenta.",
      'act.home': 'Tela inicial', 'brand.home': '⌂ Tela inicial', 'tour.home.t': 'Tela inicial', 'tour.home.b': "Volta para a tela inicial da GooDraw: a Highlights, a nuvem, idioma e tema. Atalho: Alt+Shift+H.",
      'tour.pointer.t': "Ponteiro",
      'tour.pointer.b': "Volta a usar a página normalmente (clicar, rolar, selecionar) sem apagar o que você desenhou. Atalho: Alt+A.",
      'tour.pencil.t': "Lápis",
      'tour.pencil.b': "Escreva à mão. Clique de novo no lápis para a espessura, a cor e o modo: Suave ou Natural (o melhor para mesa digitalizadora). Alt+S.",
      'tour.hl.t': "Marca-texto",
      'tour.hl.b': "No modo Régua ele corre reto sobre a linha do texto; no Livre, segue a sua mão. Alt+D.",
      'tour.shapes.t': "Linha, retângulo e elipse",
      'tour.shapes.b': "Para sublinhar, enquadrar uma alternativa ou circular o que importa. Alt+F, G e H.",
      'tour.eraser.t': "Borracha",
      'tour.eraser.b': "Apaga o traço inteiro de uma vez ou esfrega só um pedaço. A lixeira ao lado limpa tudo.",
      'tour.laser.t': "Laser",
      'tour.laser.b': "Aponta e some sozinho em dois segundos — perfeito para explicar algo na tela ou numa aula. Alt+K.",
      'tour.text.t': "Post-it de texto",
      'tour.text.b': "Clique na página e escreva uma nota que fica ali, por cima do conteúdo. Alt+J.",
      'tour.color.t': "Cores",
      'tour.color.b': "Escolha qualquer cor; as últimas usadas ficam ao lado, a um clique.",
      'tour.undo.t': "Desfazer e refazer",
      'tour.undo.b': "Errou o traço? Desfaça e refaça quantas vezes quiser. Alt+C desfaz, Alt+V refaz.",
      'tour.cap.t': "Capturar a tela",
      'tour.cap.b': "Uma imagem da página com o seu desenho por cima, para salvar ou mandar.",
      'tour.crop.t': "Captura parcial",
      'tour.crop.b': "Recorte só um pedaço — a questão, o parágrafo da lei — e mande para o caderno de um tópico ou transforme em flashcard na GooNotes.",
      'tour.calc.t': "Calculadora",
      'tour.calc.b': "Sempre à mão, por cima da página, para as questões de cálculo. Alt+N.",
      'tour.notes.t': "GooNotes",
      'tour.notes.b': "O seu estudo completo, no site: Flashcards e Planner grátis; disciplinas, questões, discursivas e simulados no Notes Premium. Alt+O.",
      'tour.pen.t': "Caneta na tela",
      'tour.pen.b': "A caneta sai do navegador e flutua por cima de qualquer outro app do tablet.",
      "tour.lasso.t": "Laço",
      "tour.lasso.b": "Selecione um trecho do desenho para mover, copiar ou apagar de uma vez. Alt+R.",
      "tour.fs.t": "Tela cheia",
      "tour.fs.b": "A página ocupa a tela toda, com a barra por cima: mais espaço para a questão. Clique de novo (ou Esc) para voltar.",
      'tour.sc.t': "Barra de respostas",
      'tour.sc.b': "Para resolver questões: marque a alternativa, confira certo ou errado e acompanhe a sua estatística. Arraste para onde preferir.",
      'tour.help.t': "Atalhos de teclado",
      'tour.help.b': "Tudo na barra tem um atalho com Alt. Aqui está a lista completa.",
      'tour.cfg.t': "Ajustes",
      'tour.cfg.b': "Tema claro ou escuro, idioma, a posição da barra (em cima, embaixo ou nas laterais), abrir sozinha neste site (no TEC, por exemplo), o que o ícone abre (a Draw ou a tela inicial), se o menu da Highlights aparece ao selecionar texto — e este tour, quando quiser rever.",
      'tour.end.t': "Pronto para estudar!",
      'tour.end.b': "Abra a barra em qualquer página pelo ícone da extensão. Bons estudos — e boa prova!",
      'tour.endApp.b': "Abra qualquer site ou PDF e escreva por cima. Bons estudos — e boa prova!",
      'sc.answer': 'Resposta:',
      'sc.correct': 'Correto → C + Enter',
      'sc.wrong': 'Errado → E + Enter',
      'sc.option': 'Alternativa:',
      'sc.nav': 'Nav:',
      'sc.prev': 'Anterior [←]',
      'sc.next': 'Próxima [→]',
      'sc.nextUnsolved': 'Próx. não resolvida [N]',
      'sc.random': 'Próx. aleatória [L]',
      'sc.view': 'Ver:',
      'sc.teacher': 'Professor [O]',
      'sc.forum': 'Fórum [F]',
      'sc.stats': 'Estatísticas [H]',
      'sc.clear': 'Limpar tudo [Mouse Meio]',
      'tp.color': 'Cor',
      'tp.size': 'Espessura',
      'tp.mode': 'Traço',
      'tp.ruler': 'Régua',
      'tp.smooth': 'Suave',
      'tp.natural': 'Natural',
      'tp.free': 'Livre',
      'tp.wholeStroke': 'Traço',
      'hk.tools': 'Ferramentas',
      'hk.size': 'Espessura',
      'hk.actions': 'Ações',
      'hk.thinner': 'Diminuir',
      'hk.thicker': 'Aumentar',
      'hk.text': 'Texto (post-it)',
      'hk.laser': 'Laser pointer',
      'hk.legend': 'Todos os atalhos usam <b>Alt</b>. O TEC Concursos não ' +
        'tem nenhum atalho com Alt, então os dois não entram em conflito.',
      'hk.mouse': '<b>Clique do scroll</b> (botão do meio) em qualquer ponto da página também <b>limpa tudo</b>.',
      'cfg.theme': 'Tema',
      'cfg.light': '☀️ Claro',
      'cfg.dark': '🌙 Escuro',
      'cfg.auto': 'Automático',
      'cfg.autoThemeTitle': 'Acompanha o tema claro ou escuro do sistema',
      'cfg.lang': 'Idioma / Language',
      'cfg.langAutoTitle': 'Segue o idioma do navegador',
      'cfg.langNoteExt': 'Ao trocar, a barra reabre no novo idioma e os desenhos desta página são apagados.',
      'cfg.langNoteApp': 'Ao trocar, o app recarrega a página e os desenhos dela são apagados.',
      'cfg.barsPos': 'Posição das barras',
      'cfg.swap': '⇅ Trocar as barras de lugar',
      'cfg.toolbar': 'Barra de ferramentas',
      'cfg.top': 'Superior',
      'cfg.left': 'Esquerda',
      'cfg.right': 'Direita',
      'cfg.bottom': 'Inferior',
      'cfg.hidden': 'Oculta',
      'cfg.scBar': 'Barra de atalhos',
      'cfg.size': 'Tamanho',
      'cfg.sizeNote': 'A cor e a espessura de cada ferramenta ficam na própria ferramenta: toque nela uma vez para usar e outra vez para abrir.',
      'cfg.navSec': 'Ao mudar de página', 'cfg.clearNav': 'Limpar os traços ao mudar de página',
      'cfg.clearNavNote': 'Ligado, os desenhos somem quando o endereço da página muda — por exemplo, ao passar para a próxima questão.',
      'cfg.penSec': 'Caneta', 'cfg.penOnly': 'Desenhar só com a caneta',
      'cfg.penOnlyNote': 'O dedo rola a página e toca nos botões do site; só a caneta desenha.',
      'pen.autoOn': 'Caneta detectada: agora só a caneta desenha e o dedo rola a página. Dá para mudar em ⚙️.',
      'cfg.sub': 'Assinatura',
      'cfg.help': 'Ajuda',
      'cfg.tutorial': '👋 Ver tutorial novamente',
      'cfg.autoOpen': 'Abrir sozinha neste site', 'cfg.autoOpenNote': 'A barra aparece assim que você entra neste site, sem precisar clicar no ícone.', 'cfg.iconOpens': 'Ao clicar no ícone, abrir', 'cfg.iconDraw': 'A Draw', 'cfg.iconHome': 'A tela inicial', 'cfg.iconNote': 'A tela inicial reúne a Highlights e o Notes. Daqui, ela abre no botão ⌂ da barra.', 'cfg.hlMenu': 'Menu da Highlights ao selecionar texto', 'cfg.hlShow': 'Mostrar', 'cfg.hlHide': 'Não mostrar', 'cfg.hlNote': 'O menu de cores que aparece quando você seleciona um trecho. Sem ele, selecionar texto fica como sempre foi.', 'cfg.autoOn': '✓ Ativado em {0}', 'cfg.autoOff': 'Ativar em {0}',
      'note.title': '📌 Nota',
      'note.remove': 'Remover nota',
      'note.placeholder': 'Escreva sua nota aqui…',
      'calc.error': 'Erro',
      'copy.app': '📋 Imagem copiada! Para colar, toque e segure onde quiser e escolha Colar.',
      'copy.desktop': '📋 Imagem copiada! Cole com {0} onde quiser.',
      'sel.hint': 'Arraste para selecionar a área &nbsp;·&nbsp; Esc cancela'
    },
    en: {
      'plan.lifetime': 'Lifetime plan',
      'plan.yearlyActive': 'Yearly plan active',
      'plan.monthlyActive': 'Monthly plan active',
      'plan.moveYearly': 'See the Lifetime plan',
      'plan.moveMonthly': 'See Yearly and Lifetime plans',
      'plan.active': 'Subscription active',
      'plan.see': '✨ See Premium plans',
      'plan.restore': 'Already bought? Restore purchase',
      'gate.title': 'GooDraw on phones and tablets',
      'gate.body': 'On Android, use the official app — built for touch and stylus, with palm rejection, full screen and screenshots saved to your gallery.',
      'gate.cta': 'Get it on Google Play',
      'gate.free': 'On your computer, the extension stays free 💙',
      'common.close': 'Close',
      'tool.pointer': 'Pointer',
      'tool.pencil': 'Pencil',
      'tool.highlight': 'Highlighter',
      'tool.line': 'Line',
      'tool.rect': 'Rectangle',
      'tool.circle': 'Circle', 'tool.lasso': 'Lasso: select, move and resize', 'hk.lasso': 'Lasso',
      'tool.eraser': 'Eraser',
      'tool.laser': 'Laser pointer (3s)',
      'tool.text': 'Sticky note',
      'act.clear': 'Clear all',
      'act.undo': 'Undo',
      'act.redo': 'Redo',
      'act.capture': 'Screenshot',
      'act.crop': 'Capture an area',
      'act.calc': 'Calculator',
      'act.notes': 'GooNotes: your whole study',
      'notes.send': 'Send to notebook',
      'notes.pick': 'Send to which topic?',
      'notes.find': 'Search topic',
      'notes.general': 'General',
      'notes.newErrors': 'New mistakes notebook',
      'notes.errors': 'Mistakes notebook',
      'notes.untitled': 'Untitled notebook',
      'notes.sending': 'Sending…',
      'notes.sent': 'Sent to “{0}”',
      'notes.open': 'Open the notebook',
      'notes.fail': 'Couldn’t send it to the notebook',
      'card.make': 'Make a flashcard',
      'card.pick': 'Make the flashcard in which topic?',
      'card.in': 'Flashcard in “{0}”',
      'card.picFront': 'Picture on the front',
      'card.picBack': 'Picture on the back',
      'card.backPh': 'Write the back: the answer…',
      'card.frontPh': 'Write the front: the question…',
      'card.create': 'Make flashcard',
      'card.done': 'Flashcard made in “{0}”',
      'card.open': 'Open the flashcards',
      'card.fail': 'Couldn’t make the flashcard',
      'card.noTopics': 'Create subjects and topics in GooNotes first.',
      'act.fullscreen': 'Full screen',
      'act.pen': 'Screen Pen',
      'act.settings': 'Settings',
      'act.more': 'More tools',
      'act.shortcuts': 'Keyboard shortcuts',
      'brand.rateChrome': 'Like it? Leave a review on the Chrome Web Store ⭐',
      'brand.rateFirefox': 'Like it? Leave a review on Firefox Add-ons ⭐',
      'brand.sub': '⭐ Rate the extension',
      'color.tool': 'Tool color',
      'color.recent': 'Recently used colors',
      'color.other': 'Other color',
      'color.use': 'Use {0}',
      'social.contact': 'Contact',
      'social.ig': 'Follow @agoodrawdraw on Instagram',
      'android.pill': 'Android app',
      'android.pillShort': 'Android',
      'android.pillTitle': 'See the app plans',
      'am.title': 'Your pen, right on your tablet',
      'am.body': 'GooDraw for <b>tablets and phones</b> is on Google Play. ' +
        'Pencil and eraser are free; everything else comes with one of these plans:',
      'am.fine': 'On your computer, the extension stays free, with everything unlocked.',
      'am.cta': 'Open Google Play',
      'am.dontShow': 'Don’t show this again',
      'am.prices': 'Prices are shown in your currency on Google Play.',
      'news.never': 'Don’t show again',
      'news.notes.tag': 'New',
      'news.notes.title': '📚 Meet GooNotes',
      'news.notes.body': 'Your syllabus in <b>subjects and topics</b>, and in each topic <b>notes, a mind map and a handwritten notebook</b>, ' +
        'even on top of a PDF. Free, on your computer, tablet and phone.',
      'news.notes.cta': 'Take a look',
      'dr.title': 'GooDraw on tablets and phones',
      'dr.body': 'Write with your pen right on the screen, in any app — on Android.',
      'dr.cta': 'See the app',
      'bf.pre.title': 'GooNotes Black Friday',
      'bf.pre.body': 'Pay for one, get… On 11/06 we reveal the rest. Join the list and be the first to know.',
      'bf.pre.cta': 'Join the list',
      'bf.live.title': 'GooNotes Black Friday',
      'bf.live.body': 'Until 11/20, every Notes Premium plan comes doubled. And, for the first time, a lifetime plan.',
      'bf.live.cta': 'See the offers',
      'notesTab': 'Meet GooNotes',
      'notesTab.tip': 'Free Flashcards and Planner; the whole Notes — subjects, questions, essays, mock exams — with Premium',
      'tour.next': "Next",
      'tour.back': "Back",
      'tour.skip': "Skip the tour",
      'tour.done': "Start using it",
      'tour.again': "▶ Replay the toolbar tour",
      'tour.brand.t': "Welcome to GooDraw",
      'tour.brand.b': "Write, highlight and draw over any page — questions, PDFs, lessons. In a minute, we'll show you every tool.",
      'act.home': 'Home screen', 'brand.home': '⌂ Home screen', 'tour.home.t': 'Home screen', 'tour.home.b': "Back to GooDraw's home screen: the Highlights, the cloud, language and theme. Shortcut: Alt+Shift+H.",
      'tour.pointer.t': "Pointer",
      'tour.pointer.b': "Use the page normally again (click, scroll, select) without erasing what you drew. Shortcut: Alt+A.",
      'tour.pencil.t': "Pencil",
      'tour.pencil.b': "Write by hand. Click the pencil again for thickness, colour and mode: Smooth or Natural (best for a pen tablet). Alt+S.",
      'tour.hl.t': "Highlighter",
      'tour.hl.b': "In Ruler mode it runs straight along the line of text; in Free mode it follows your hand. Alt+D.",
      'tour.shapes.t': "Line, rectangle and ellipse",
      'tour.shapes.b': "To underline, frame an option or circle what matters. Alt+F, G and H.",
      'tour.eraser.t': "Eraser",
      'tour.eraser.b': "Erase a whole stroke at once or rub out just a piece. The bin next to it clears everything.",
      'tour.laser.t': "Laser",
      'tour.laser.b': "Points and fades on its own in two seconds — perfect for explaining something on screen. Alt+K.",
      'tour.text.t': "Text sticky note",
      'tour.text.b': "Click the page and write a note that stays there, over the content. Alt+J.",
      'tour.color.t': "Colours",
      'tour.color.b': "Pick any colour; the last ones used stay beside it, one click away.",
      'tour.undo.t': "Undo and redo",
      'tour.undo.b': "Wrong stroke? Undo and redo as many times as you like. Alt+C undoes, Alt+V redoes.",
      'tour.cap.t': "Capture the screen",
      'tour.cap.b': "A picture of the page with your drawing on top, to save or send.",
      'tour.crop.t': "Partial capture",
      'tour.crop.b': "Crop just a piece — the question, the paragraph of the law — and send it to a topic's notebook or turn it into a flashcard in GooNotes.",
      'tour.calc.t': "Calculator",
      'tour.calc.b': "Always at hand, over the page, for maths questions. Alt+N.",
      'tour.notes.t': "GooNotes",
      'tour.notes.b': "Your whole study, on the site: free Flashcards and Planner; subjects, questions, essays and mock exams with Notes Premium. Alt+O.",
      'tour.pen.t': "Pen on screen",
      'tour.pen.b': "The pen leaves the browser and floats over any other app on the tablet.",
      "tour.lasso.t": "Lasso",
      "tour.lasso.b": "Select part of the drawing to move, copy or erase it at once. Alt+R.",
      "tour.fs.t": "Full screen",
      "tour.fs.b": "The page takes the whole screen, with the bar over it: more room for the question. Click again (or Esc) to leave.",
      'tour.sc.t': "Answer bar",
      'tour.sc.b': "For solving questions: mark the option, check right or wrong and follow your stats. Drag it wherever you like.",
      'tour.help.t': "Keyboard shortcuts",
      'tour.help.b': "Everything on the toolbar has an Alt shortcut. Here is the full list.",
      'tour.cfg.t': "Settings",
      'tour.cfg.b': "Light or dark theme, language, where the toolbar sits (top, bottom or the sides), opening by itself on this site, what the icon opens (the Draw or the home screen), whether the Highlights menu shows when you select text — and this tour, whenever you want it again.",
      'tour.end.t': "Ready to study!",
      'tour.end.b': "Open the toolbar on any page from the extension icon. Happy studying — and good luck on the exam!",
      'tour.endApp.b': "Open any site or PDF and write over it. Happy studying — and good luck on the exam!",
      'sc.answer': 'Answer:',
      'sc.correct': 'Correct → C + Enter',
      'sc.wrong': 'Wrong → E + Enter',
      'sc.option': 'Option:',
      'sc.nav': 'Nav:',
      'sc.prev': 'Previous [←]',
      'sc.next': 'Next [→]',
      'sc.nextUnsolved': 'Next unsolved [N]',
      'sc.random': 'Random next [L]',
      'sc.view': 'View:',
      'sc.teacher': 'Teacher [O]',
      'sc.forum': 'Forum [F]',
      'sc.stats': 'Stats [H]',
      'sc.clear': 'Clear all [Middle click]',
      'tp.color': 'Color',
      'tp.size': 'Thickness',
      'tp.mode': 'Stroke',
      'tp.ruler': 'Ruler',
      'tp.smooth': 'Smooth',
      'tp.natural': 'Natural',
      'tp.free': 'Freehand',
      'tp.wholeStroke': 'Whole stroke',
      'hk.tools': 'Tools',
      'hk.size': 'Thickness',
      'hk.actions': 'Actions',
      'hk.thinner': 'Thinner',
      'hk.thicker': 'Thicker',
      'hk.text': 'Sticky note',
      'hk.laser': 'Laser pointer',
      'hk.legend': 'All shortcuts use <b>Alt</b>, so they rarely clash with a site’s own shortcuts.',
      'hk.mouse': 'A <b>middle click</b> (the scroll wheel) anywhere on the page also <b>clears all</b>.',
      'cfg.theme': 'Theme',
      'cfg.light': '☀️ Light',
      'cfg.dark': '🌙 Dark',
      'cfg.auto': 'Auto',
      'cfg.autoThemeTitle': 'Follows your system’s light or dark theme',
      'cfg.lang': 'Idioma / Language',
      'cfg.langAutoTitle': 'Follows your browser’s language',
      'cfg.langNoteExt': 'Switching reopens the toolbar in the new language and clears the drawings on this page.',
      'cfg.langNoteApp': 'Switching reloads the page in the app and clears its drawings.',
      'cfg.barsPos': 'Bar position',
      'cfg.swap': '⇅ Swap bars',
      'cfg.toolbar': 'Toolbar',
      'cfg.top': 'Top',
      'cfg.left': 'Left',
      'cfg.right': 'Right',
      'cfg.bottom': 'Bottom',
      'cfg.hidden': 'Hidden',
      'cfg.scBar': 'Answer shortcut bar',
      'cfg.size': 'Size',
      'cfg.sizeNote': 'Each tool keeps its own color and thickness: tap it once to use it, and again to change them.',
      'cfg.navSec': 'When the page changes', 'cfg.clearNav': 'Clear the drawing when the page changes',
      'cfg.clearNavNote': 'On, the drawing goes away when the page address changes — for example, when you move to the next question.',
      'cfg.penSec': 'Stylus', 'cfg.penOnly': 'Draw with the stylus only',
      'cfg.penOnlyNote': 'Your finger scrolls the page and taps the site\'s buttons; only the stylus draws.',
      'pen.autoOn': 'Stylus detected: now only the stylus draws and your finger scrolls the page. Change it in ⚙️.',
      'cfg.sub': 'Subscription',
      'cfg.help': 'Help',
      'cfg.tutorial': '👋 Watch the tutorial again',
      'cfg.autoOpen': 'Open by itself on this site', 'cfg.autoOpenNote': 'The toolbar shows up as soon as you visit this site, no need to click the icon.', 'cfg.iconOpens': 'When you click the icon, open', 'cfg.iconDraw': 'The Draw', 'cfg.iconHome': 'The home screen', 'cfg.iconNote': 'The home screen gathers the Highlights and the Notes. From here, it opens with the bar\'s ⌂ button.', 'cfg.hlMenu': 'Highlights menu when selecting text', 'cfg.hlShow': 'Show', 'cfg.hlHide': 'Don\'t show', 'cfg.hlNote': 'The colour menu that shows up when you select a passage. Without it, selecting text works as it always did.', 'cfg.autoOn': '✓ On for {0}', 'cfg.autoOff': 'Turn on for {0}',
      'note.title': '📌 Note',
      'note.remove': 'Remove note',
      'note.placeholder': 'Type your note here…',
      'calc.error': 'Error',
      'copy.app': '📋 Image copied! To paste it, touch and hold where you want it and choose Paste.',
      'copy.desktop': '📋 Image copied! Paste it anywhere with {0}.',
      'sel.hint': 'Drag to select an area &nbsp;·&nbsp; Esc cancels'
    },
    es: {
      'plan.lifetime': 'Plan vitalicio',
      'plan.yearlyActive': 'Plan anual activo',
      'plan.monthlyActive': 'Plan mensual activo',
      'plan.moveYearly': 'Conocer el vitalicio',
      'plan.moveMonthly': 'Ver plan anual y vitalicio',
      'plan.active': 'Suscripción activa',
      'plan.see': '✨ Ver planes Premium',
      'plan.restore': '¿Ya compraste? Restaurar compra',
      'gate.title': 'GooDraw en el móvil y la tablet',
      'gate.body': 'En dispositivos Android, usa la app oficial — optimizada para toque y lápiz óptico, con rechazo de palma, pantalla completa y capturas en la galería.',
      'gate.cta': 'Descargar en Google Play',
      'gate.free': 'En el ordenador, la extensión sigue siendo gratuita 💙',
      'common.close': 'Cerrar',
      'tool.pointer': 'Puntero',
      'tool.pencil': 'Lápiz',
      'tool.highlight': 'Resaltador',
      'tool.line': 'Línea',
      'tool.rect': 'Rectángulo',
      'tool.circle': 'Círculo',
      'tool.lasso': 'Lazo: seleccionar, mover y redimensionar',
      'hk.lasso': 'Lazo',
      'tool.eraser': 'Borrador',
      'tool.laser': 'Puntero láser (3s)',
      'tool.text': 'Texto',
      'act.clear': 'Borrar todo',
      'act.undo': 'Deshacer',
      'act.redo': 'Rehacer',
      'act.capture': 'Capturar pantalla completa',
      'act.crop': 'Capturar un área',
      'act.calc': 'Calculadora',
      'act.notes': 'GooNotes: tu estudio completo',
      'notes.send': 'Enviar al cuaderno',
      'notes.pick': '¿A qué tema enviarlo?',
      'notes.find': 'Buscar tema',
      'notes.general': 'General',
      'notes.newErrors': 'Nuevo cuaderno de errores',
      'notes.errors': 'Cuaderno de errores',
      'notes.untitled': 'Cuaderno sin título',
      'notes.sending': 'Enviando…',
      'notes.sent': 'Enviado a “{0}”',
      'notes.open': 'Abrir el cuaderno',
      'notes.fail': 'No se pudo enviar al cuaderno',
      'card.make': 'Crear flashcard',
      'card.pick': '¿En qué tema crear la flashcard?',
      'card.in': 'Flashcard en “{0}”',
      'card.picFront': 'Imagen en el anverso',
      'card.picBack': 'Imagen en el reverso',
      'card.backPh': 'Escribe el reverso: la respuesta…',
      'card.frontPh': 'Escribe el anverso: la pregunta…',
      'card.create': 'Crear flashcard',
      'card.done': 'Flashcard creada en “{0}”',
      'card.open': 'Abrir las flashcards',
      'card.fail': 'No se pudo crear la flashcard',
      'card.noTopics': 'Primero crea asignaturas y temas en GooNotes.',
      'act.fullscreen': 'Pantalla completa',
      'act.pen': 'Lápiz en pantalla',
      'act.settings': 'Ajustes',
      'act.more': 'Más herramientas',
      'act.shortcuts': 'Atajos de teclado',
      'brand.rateChrome': '¿Te gusta? Deja tu valoración en la Chrome Web Store ⭐',
      'brand.rateFirefox': '¿Te gusta? Deja tu valoración en Firefox Add-ons ⭐',
      'brand.sub': '⭐ Valora la extensión',
      'color.tool': 'Color de la herramienta',
      'color.recent': 'Últimos colores usados',
      'color.other': 'Otro color',
      'color.use': 'Usar {0}',
      'social.contact': 'Contacto',
      'social.ig': 'Sigue a @agoodrawdraw en Instagram',
      'android.pill': 'App para Android',
      'android.pillShort': 'Android',
      'android.pillTitle': 'Ver los planes de la app',
      'am.title': 'En la tablet, el lápiz sobre la pregunta',
      'am.body': 'GooDraw para <b>tablet y móvil</b> ya está en Google Play. Lápiz y borrador son gratis; el resto viene en uno de estos planes:',
      'am.fine': 'Aquí en el ordenador la extensión sigue siendo gratuita, con todo desbloqueado.',
      'am.cta': 'Ver en Google Play',
      'am.dontShow': 'No volver a mostrar este mensaje',
      'am.prices': 'Precios en tu moneda en Google Play.',
      'news.never': 'No avisar más',
      'news.notes.tag': 'Novedad',
      'news.notes.title': '📚 Conoce GooNotes',
      'news.notes.body': 'Tu convocatoria en <b>asignaturas y temas</b>, y en cada tema <b>notas, mapa mental y cuaderno a mano</b>, incluso sobre el PDF. Gratis, en el ordenador, la tablet y el móvil.',
      'news.notes.cta': 'Conocer',
      'dr.title': 'GooDraw en la tablet y el móvil',
      'dr.body': 'Escribe con el lápiz directamente en la pantalla, en cualquier app — en Android.',
      'dr.cta': 'Ver la app',
      'bf.pre.title': 'Black Friday de GooNotes',
      'bf.pre.body': 'Paga uno, llévate… El 06/11 revelamos el resto. Únete a la lista y entérate antes que nadie.',
      'bf.pre.cta': 'Unirme a la lista',
      'bf.live.title': 'Black Friday de GooNotes',
      'bf.live.body': 'Hasta el 20/11, todos los planes de Notes Premium vienen al doble. Y, por primera vez, el vitalicio.',
      'bf.live.cta': 'Ver las ofertas',
      'notesTab': 'Conoce GooNotes',
      'notesTab.tip': 'Flashcards y Planner gratis; el Notes completo — asignaturas, preguntas, ensayos, simulacros — en Premium',
      'tour.next': 'Siguiente',
      'tour.back': 'Atrás',
      'tour.skip': 'Saltar el tour',
      'tour.done': 'Empezar a usar',
      'tour.again': '▶ Volver a ver el tour de la barra',
      'tour.brand.t': 'Bienvenido a GooDraw',
      'tour.brand.b': 'Escribe, resalta y dibuja sobre cualquier página — preguntas, PDF, clases. En un minuto te mostramos cada herramienta.',
      'act.home': 'Pantalla de inicio', 'brand.home': '⌂ Pantalla de inicio', 'tour.home.t': 'Pantalla de inicio', 'tour.home.b': 'Vuelve a la pantalla de inicio de GooDraw: la Highlights, la nube, idioma y tema. Atajo: Alt+Shift+H.',
      'tour.pointer.t': 'Puntero',
      'tour.pointer.b': 'Vuelve a usar la página con normalidad (hacer clic, desplazarte, seleccionar) sin borrar lo que dibujaste. Atajo: Alt+A.',
      'tour.pencil.t': 'Lápiz',
      'tour.pencil.b': 'Escribe a mano. Haz clic de nuevo en el lápiz para elegir grosor, color y modo: Suave o Natural (el mejor para tableta digitalizadora). Alt+S.',
      'tour.hl.t': 'Resaltador',
      'tour.hl.b': 'En el modo Regla corre recto sobre la línea del texto; en el Libre, sigue tu mano. Alt+D.',
      'tour.shapes.t': 'Línea, rectángulo y elipse',
      'tour.shapes.b': 'Para subrayar, enmarcar una opción o encerrar en un círculo lo importante. Alt+F, G y H.',
      'tour.eraser.t': 'Borrador',
      'tour.eraser.b': 'Borra el trazo entero de una vez o frota solo un trozo. La papelera de al lado lo borra todo.',
      'tour.laser.t': 'Láser',
      'tour.laser.b': 'Señala y desaparece solo en dos segundos — perfecto para explicar algo en la pantalla o en una clase. Alt+K.',
      'tour.text.t': 'Pósit de texto',
      'tour.text.b': 'Haz clic en la página y escribe una nota que se queda ahí, encima del contenido. Alt+J.',
      'tour.color.t': 'Colores',
      'tour.color.b': 'Elige cualquier color; los últimos usados quedan al lado, a un clic.',
      'tour.undo.t': 'Deshacer y rehacer',
      'tour.undo.b': '¿Te equivocaste de trazo? Deshaz y rehaz cuantas veces quieras. Alt+C deshace, Alt+V rehace.',
      'tour.cap.t': 'Capturar la pantalla',
      'tour.cap.b': 'Una imagen de la página con tu dibujo encima, para guardar o enviar.',
      'tour.crop.t': 'Captura parcial',
      'tour.crop.b': 'Recorta solo un trozo — la pregunta, el párrafo de la ley — y envíalo al cuaderno de un tema o conviértelo en flashcard en GooNotes.',
      'tour.calc.t': 'Calculadora',
      'tour.calc.b': 'Siempre a mano, encima de la página, para las preguntas de cálculo. Alt+N.',
      'tour.notes.t': 'GooNotes',
      'tour.notes.b': 'Tu estudio completo, en el sitio: Flashcards y Planner gratis; asignaturas, preguntas, ensayos y simulacros en Notes Premium. Alt+O.',
      'tour.pen.t': 'Lápiz en pantalla',
      'tour.pen.b': 'El lápiz sale del navegador y flota encima de cualquier otra app de la tablet.',
      "tour.lasso.t": "Lazo",
      "tour.lasso.b": "Selecciona una parte del dibujo para moverla, copiarla o borrarla de una vez. Alt+R.",
      "tour.fs.t": "Pantalla completa",
      "tour.fs.b": "La página ocupa toda la pantalla, con la barra encima: más espacio para la pregunta. Haz clic de nuevo (o Esc) para salir.",
      'tour.sc.t': 'Barra de respuestas',
      'tour.sc.b': 'Para resolver preguntas: marca la opción, comprueba si acertaste o fallaste y sigue tus estadísticas. Arrástrala adonde prefieras.',
      'tour.help.t': 'Atajos de teclado',
      'tour.help.b': 'Todo en la barra tiene un atajo con Alt. Aquí está la lista completa.',
      'tour.cfg.t': 'Ajustes',
      'tour.cfg.b': 'Tema claro u oscuro, idioma, la posición de la barra (arriba, abajo o a los lados), abrir sola en este sitio, qué abre el icono (la Draw o la pantalla de inicio), si el menú de la Highlights aparece al seleccionar texto — y este tour, cuando quieras volver a verlo.',
      'tour.end.t': '¡Listo para estudiar!',
      'tour.end.b': 'Abre la barra en cualquier página desde el icono de la extensión. ¡Buen estudio — y mucha suerte en el examen!',
      'tour.endApp.b': 'Abre cualquier sitio o PDF y escribe encima. ¡Buen estudio — y mucha suerte en el examen!',
      'sc.answer': 'Respuesta:',
      'sc.correct': 'Cierto → C + Enter',
      'sc.wrong': 'Errado → E + Enter',
      'sc.option': 'Opción:',
      'sc.nav': 'Nav:',
      'sc.prev': 'Anterior [←]',
      'sc.next': 'Siguiente [→]',
      'sc.nextUnsolved': 'Sig. sin resolver [N]',
      'sc.random': 'Sig. aleatoria [L]',
      'sc.view': 'Ver:',
      'sc.teacher': 'Profesor [O]',
      'sc.forum': 'Foro [F]',
      'sc.stats': 'Estadísticas [H]',
      'sc.clear': 'Borrar todo [Clic central]',
      'tp.color': 'Color',
      'tp.size': 'Grosor',
      'tp.mode': 'Trazo',
      'tp.ruler': 'Regla',
      'tp.smooth': 'Suave',
      'tp.natural': 'Natural',
      'tp.free': 'Libre',
      'tp.wholeStroke': 'Trazo',
      'hk.tools': 'Herramientas',
      'hk.size': 'Grosor',
      'hk.actions': 'Acciones',
      'hk.thinner': 'Reducir',
      'hk.thicker': 'Aumentar',
      'hk.text': 'Texto (pósit)',
      'hk.laser': 'Puntero láser',
      'hk.legend': 'Todos los atajos usan <b>Alt</b>. TEC Concursos no tiene ningún atajo con Alt, así que no entran en conflicto.',
      'hk.mouse': 'El <b>clic de la rueda</b> (botón central) en cualquier punto de la página también <b>borra todo</b>.',
      'cfg.theme': 'Tema',
      'cfg.light': '☀️ Claro',
      'cfg.dark': '🌙 Oscuro',
      'cfg.auto': 'Automático',
      'cfg.autoThemeTitle': 'Sigue el tema claro u oscuro del sistema',
      'cfg.lang': 'Idioma / Language',
      'cfg.langAutoTitle': 'Sigue el idioma del navegador',
      'cfg.langNoteExt': 'Al cambiarlo, la barra se vuelve a abrir en el nuevo idioma y se borran los dibujos de esta página.',
      'cfg.langNoteApp': 'Al cambiarlo, la app recarga la página y se borran sus dibujos.',
      'cfg.barsPos': 'Posición de las barras',
      'cfg.swap': '⇅ Intercambiar las barras',
      'cfg.toolbar': 'Barra de herramientas',
      'cfg.top': 'Arriba',
      'cfg.left': 'Izquierda',
      'cfg.right': 'Derecha',
      'cfg.bottom': 'Abajo',
      'cfg.hidden': 'Oculta',
      'cfg.scBar': 'Barra de atajos',
      'cfg.size': 'Tamaño',
      'cfg.sizeNote': 'El color y el grosor de cada herramienta están en la propia herramienta: tócala una vez para usarla y otra vez para abrirla.',
      'cfg.navSec': 'Al cambiar de página',
      'cfg.clearNav': 'Borrar los trazos al cambiar de página',
      'cfg.clearNavNote': 'Activado, los dibujos desaparecen cuando cambia la dirección de la página — por ejemplo, al pasar a la siguiente pregunta.',
      'cfg.penSec': 'Lápiz óptico',
      'cfg.penOnly': 'Dibujar solo con el lápiz',
      'cfg.penOnlyNote': 'El dedo desplaza la página y toca los botones del sitio; solo el lápiz dibuja.',
      'pen.autoOn': 'Lápiz detectado: ahora solo el lápiz dibuja y el dedo desplaza la página. Puedes cambiarlo en ⚙️.',
      'cfg.sub': 'Suscripción',
      'cfg.help': 'Ayuda',
      'cfg.tutorial': '👋 Ver el tutorial de nuevo',
      'cfg.autoOpen': 'Abrir sola en este sitio', 'cfg.autoOpenNote': 'La barra aparece en cuanto entras en este sitio, sin hacer clic en el icono.', 'cfg.iconOpens': 'Al hacer clic en el icono, abrir', 'cfg.iconDraw': 'La Draw', 'cfg.iconHome': 'La pantalla de inicio', 'cfg.iconNote': 'La pantalla de inicio reúne la Highlights y el Notes. Desde aquí, se abre con el botón ⌂ de la barra.', 'cfg.hlMenu': 'Menú de la Highlights al seleccionar texto', 'cfg.hlShow': 'Mostrar', 'cfg.hlHide': 'No mostrar', 'cfg.hlNote': 'El menú de colores que aparece al seleccionar un fragmento. Sin él, seleccionar texto funciona como siempre.', 'cfg.autoOn': '✓ Activado en {0}', 'cfg.autoOff': 'Activar en {0}',
      'note.title': '📌 Nota',
      'note.remove': 'Eliminar nota',
      'note.placeholder': 'Escribe tu nota aquí…',
      'calc.error': 'Error',
      'copy.app': '📋 ¡Imagen copiada! Para pegarla, mantén pulsado donde quieras y elige Pegar.',
      'copy.desktop': '📋 ¡Imagen copiada! Pégala con {0} donde quieras.',
      'sel.hint': 'Arrastra para seleccionar el área &nbsp;·&nbsp; Esc cancela'
    },
    fr: {
      'plan.lifetime': 'Offre à vie',
      'plan.yearlyActive': 'Offre annuelle active',
      'plan.monthlyActive': 'Offre mensuelle active',
      'plan.moveYearly': 'Découvrir l\'offre à vie',
      'plan.moveMonthly': 'Voir les offres annuelle et à vie',
      'plan.active': 'Abonnement actif',
      'plan.see': '✨ Voir les offres Premium',
      'plan.restore': 'Déjà acheté ? Restaurer l\'achat',
      'gate.title': 'GooDraw sur mobile et tablette',
      'gate.body': 'Sur Android, utilisez l\'application officielle — optimisée pour le tactile et le stylet, avec rejet de la paume, plein écran et captures dans la galerie.',
      'gate.cta': 'Télécharger sur Google Play',
      'gate.free': 'Sur ordinateur, l\'extension reste gratuite 💙',
      'common.close': 'Fermer',
      'tool.pointer': 'Pointeur',
      'tool.pencil': 'Crayon',
      'tool.highlight': 'Surligneur',
      'tool.line': 'Ligne',
      'tool.rect': 'Rectangle',
      'tool.circle': 'Cercle',
      'tool.lasso': 'Lasso : sélectionner, déplacer et redimensionner',
      'hk.lasso': 'Lasso',
      'tool.eraser': 'Gomme',
      'tool.laser': 'Pointeur laser (3s)',
      'tool.text': 'Texte',
      'act.clear': 'Tout effacer',
      'act.undo': 'Annuler',
      'act.redo': 'Rétablir',
      'act.capture': 'Capturer tout l\'écran',
      'act.crop': 'Capturer une zone',
      'act.calc': 'Calculatrice',
      'act.notes': 'GooNotes : votre étude complète',
      'notes.send': 'Envoyer au carnet',
      'notes.pick': 'Envoyer vers quel sujet ?',
      'notes.find': 'Chercher un sujet',
      'notes.general': 'Général',
      'notes.newErrors': 'Nouveau carnet d\'erreurs',
      'notes.errors': 'Carnet d\'erreurs',
      'notes.untitled': 'Carnet sans titre',
      'notes.sending': 'Envoi…',
      'notes.sent': 'Envoyé dans « {0} »',
      'notes.open': 'Ouvrir le carnet',
      'notes.fail': 'Impossible d\'envoyer au carnet',
      'card.make': 'Créer une flashcard',
      'card.pick': 'Créer la flashcard dans quel sujet ?',
      'card.in': 'Flashcard dans « {0} »',
      'card.picFront': 'Image au recto',
      'card.picBack': 'Image au verso',
      'card.backPh': 'Écrivez le verso : la réponse…',
      'card.frontPh': 'Écrivez le recto : la question…',
      'card.create': 'Créer la flashcard',
      'card.done': 'Flashcard créée dans « {0} »',
      'card.open': 'Ouvrir les flashcards',
      'card.fail': 'Impossible de créer la flashcard',
      'card.noTopics': 'Créez d\'abord des matières et des sujets dans GooNotes.',
      'act.fullscreen': 'Plein écran',
      'act.pen': 'Stylet à l\'écran',
      'act.settings': 'Paramètres',
      'act.more': 'Plus d\'outils',
      'act.shortcuts': 'Raccourcis clavier',
      'brand.rateChrome': 'Vous aimez ? Laissez votre avis sur le Chrome Web Store ⭐',
      'brand.rateFirefox': 'Vous aimez ? Laissez votre avis sur Firefox Add-ons ⭐',
      'brand.sub': '⭐ Notez l\'extension',
      'color.tool': 'Couleur de l\'outil',
      'color.recent': 'Dernières couleurs utilisées',
      'color.other': 'Autre couleur',
      'color.use': 'Utiliser {0}',
      'social.contact': 'Contact',
      'social.ig': 'Suivez @agoodrawdraw sur Instagram',
      'android.pill': 'App Android',
      'android.pillShort': 'Android',
      'android.pillTitle': 'Voir les offres de l\'app',
      'am.title': 'Sur tablette, le stylet sur la question',
      'am.body': 'GooDraw pour <b>tablette et mobile</b> est disponible sur Google Play. Le crayon et la gomme sont gratuits ; le reste est inclus dans l\'une de ces offres :',
      'am.fine': 'Ici, sur ordinateur, l\'extension reste gratuite, avec tout débloqué.',
      'am.cta': 'Voir sur Google Play',
      'am.dontShow': 'Ne plus afficher ce message',
      'am.prices': 'Prix dans votre devise sur Google Play.',
      'news.never': 'Ne plus prévenir',
      'news.notes.tag': 'Nouveau',
      'news.notes.title': '📚 Découvrez GooNotes',
      'news.notes.body': 'Votre avis de concours en <b>matières et sujets</b>, et dans chaque sujet <b>notes, carte mentale et carnet manuscrit</b>, même sur le PDF. Gratuit, sur ordinateur, tablette et mobile.',
      'news.notes.cta': 'Découvrir',
      'dr.title': 'GooDraw sur tablette et mobile',
      'dr.body': 'Écrivez au stylet directement sur l\'écran, dans n\'importe quelle app — sur Android.',
      'dr.cta': 'Voir l\'app',
      'bf.pre.title': 'Black Friday de GooNotes',
      'bf.pre.body': 'Payez un, emportez… Le 06/11, on révèle la suite. Rejoignez la liste et soyez le premier informé.',
      'bf.pre.cta': 'Rejoindre la liste',
      'bf.live.title': 'Black Friday de GooNotes',
      'bf.live.body': 'Jusqu\'au 20/11, chaque offre Notes Premium est doublée. Et, pour la première fois, l\'offre à vie.',
      'bf.live.cta': 'Voir les offres',
      'notesTab': 'Découvrez GooNotes',
      'notesTab.tip': 'Flashcards et Planner gratuits ; le Notes complet — matières, questions, rédactions, examens blancs — avec Premium',
      'tour.next': 'Suivant',
      'tour.back': 'Retour',
      'tour.skip': 'Passer la visite',
      'tour.done': 'Commencer',
      'tour.again': '▶ Revoir la visite de la barre',
      'tour.brand.t': 'Bienvenue dans GooDraw',
      'tour.brand.b': 'Écrivez, surlignez et dessinez sur n\'importe quelle page — questions, PDF, cours. En une minute, nous vous montrons chaque outil.',
      'act.home': "Écran d'accueil", 'brand.home': "⌂ Écran d'accueil", 'tour.home.t': "Écran d'accueil", 'tour.home.b': "Retour à l'écran d'accueil de GooDraw : la Highlights, le nuage, la langue et le thème. Raccourci : Alt+Shift+H.",
      'tour.pointer.t': 'Pointeur',
      'tour.pointer.b': 'Revenez à une utilisation normale de la page (cliquer, faire défiler, sélectionner) sans effacer vos dessins. Raccourci : Alt+A.',
      'tour.pencil.t': 'Crayon',
      'tour.pencil.b': 'Écrivez à la main. Cliquez à nouveau sur le crayon pour l\'épaisseur, la couleur et le mode : Lisse ou Naturel (le meilleur pour une tablette graphique). Alt+S.',
      'tour.hl.t': 'Surligneur',
      'tour.hl.b': 'En mode Règle, il suit la ligne de texte bien droit ; en mode Libre, il suit votre main. Alt+D.',
      'tour.shapes.t': 'Ligne, rectangle et ellipse',
      'tour.shapes.b': 'Pour souligner, encadrer une réponse ou entourer l\'essentiel. Alt+F, G et H.',
      'tour.eraser.t': 'Gomme',
      'tour.eraser.b': 'Efface tout le trait d\'un coup ou seulement un morceau en frottant. La corbeille à côté efface tout.',
      'tour.laser.t': 'Laser',
      'tour.laser.b': 'Pointe et disparaît tout seul en deux secondes — parfait pour expliquer quelque chose à l\'écran ou en cours. Alt+K.',
      'tour.text.t': 'Post-it de texte',
      'tour.text.b': 'Cliquez sur la page et écrivez une note qui reste là, par-dessus le contenu. Alt+J.',
      'tour.color.t': 'Couleurs',
      'tour.color.b': 'Choisissez n\'importe quelle couleur ; les dernières utilisées restent à côté, à un clic.',
      'tour.undo.t': 'Annuler et rétablir',
      'tour.undo.b': 'Trait raté ? Annulez et rétablissez autant de fois que vous voulez. Alt+C annule, Alt+V rétablit.',
      'tour.cap.t': 'Capturer l\'écran',
      'tour.cap.b': 'Une image de la page avec votre dessin par-dessus, à enregistrer ou à envoyer.',
      'tour.crop.t': 'Capture partielle',
      'tour.crop.b': 'Découpez juste un morceau — la question, l\'alinéa de la loi — et envoyez-le dans le carnet d\'un sujet ou transformez-le en flashcard dans GooNotes.',
      'tour.calc.t': 'Calculatrice',
      'tour.calc.b': 'Toujours à portée de main, par-dessus la page, pour les questions de calcul. Alt+N.',
      'tour.notes.t': 'GooNotes',
      'tour.notes.b': 'Votre étude complète, sur le site : Flashcards et Planner gratuits ; matières, questions, rédactions et examens blancs avec Notes Premium. Alt+O.',
      'tour.pen.t': 'Stylet à l\'écran',
      'tour.pen.b': 'Le stylet sort du navigateur et flotte par-dessus n\'importe quelle autre app de la tablette.',
      "tour.lasso.t": "Lasso",
      "tour.lasso.b": "Sélectionnez une partie du dessin pour la déplacer, la copier ou l'effacer d'un coup. Alt+R.",
      "tour.fs.t": "Plein écran",
      "tour.fs.b": "La page occupe tout l'écran, avec la barre par-dessus : plus de place pour la question. Cliquez à nouveau (ou Échap) pour quitter.",
      'tour.sc.t': 'Barre de réponses',
      'tour.sc.b': 'Pour résoudre des questions : cochez la réponse, vérifiez si c\'est juste ou faux et suivez vos statistiques. Déplacez-la où vous voulez.',
      'tour.help.t': 'Raccourcis clavier',
      'tour.help.b': 'Tout dans la barre a un raccourci avec Alt. Voici la liste complète.',
      'tour.cfg.t': 'Réglages',
      'tour.cfg.b': 'Thème clair ou sombre, langue, position de la barre (en haut, en bas ou sur les côtés), ouverture automatique sur ce site, ce que l\'icône ouvre (la Draw ou l\'écran d\'accueil), si le menu de la Highlights apparaît à la sélection de texte — et cette visite, quand vous voulez la revoir.',
      'tour.end.t': 'Prêt à réviser !',
      'tour.end.b': 'Ouvrez la barre sur n\'importe quelle page depuis l\'icône de l\'extension. Bonnes révisions — et bonne chance pour le concours !',
      'tour.endApp.b': 'Ouvrez n\'importe quel site ou PDF et écrivez par-dessus. Bonnes révisions — et bonne chance pour le concours !',
      'sc.answer': 'Réponse :',
      'sc.correct': 'Vrai → C + Enter',
      'sc.wrong': 'Faux → E + Enter',
      'sc.option': 'Option :',
      'sc.nav': 'Nav :',
      'sc.prev': 'Précédente [←]',
      'sc.next': 'Suivante [→]',
      'sc.nextUnsolved': 'Suiv. non résolue [N]',
      'sc.random': 'Suiv. aléatoire [L]',
      'sc.view': 'Voir :',
      'sc.teacher': 'Professeur [O]',
      'sc.forum': 'Forum [F]',
      'sc.stats': 'Statistiques [H]',
      'sc.clear': 'Tout effacer [Clic molette]',
      'tp.color': 'Couleur',
      'tp.size': 'Épaisseur',
      'tp.mode': 'Trait',
      'tp.ruler': 'Règle',
      'tp.smooth': 'Lisse',
      'tp.natural': 'Naturel',
      'tp.free': 'Libre',
      'tp.wholeStroke': 'Trait',
      'hk.tools': 'Outils',
      'hk.size': 'Épaisseur',
      'hk.actions': 'Actions',
      'hk.thinner': 'Diminuer',
      'hk.thicker': 'Augmenter',
      'hk.text': 'Texte (post-it)',
      'hk.laser': 'Pointeur laser',
      'hk.legend': 'Tous les raccourcis utilisent <b>Alt</b>. TEC Concursos n\'a aucun raccourci avec Alt, il n\'y a donc pas de conflit.',
      'hk.mouse': 'Un <b>clic molette</b> (bouton du milieu) n\'importe où sur la page <b>efface tout</b> aussi.',
      'cfg.theme': 'Thème',
      'cfg.light': '☀️ Clair',
      'cfg.dark': '🌙 Sombre',
      'cfg.auto': 'Automatique',
      'cfg.autoThemeTitle': 'Suit le thème clair ou sombre du système',
      'cfg.lang': 'Langue / Language',
      'cfg.langAutoTitle': 'Suit la langue du navigateur',
      'cfg.langNoteExt': 'Au changement, la barre se rouvre dans la nouvelle langue et les dessins de cette page sont effacés.',
      'cfg.langNoteApp': 'Au changement, l\'app recharge la page et ses dessins sont effacés.',
      'cfg.barsPos': 'Position des barres',
      'cfg.swap': '⇅ Intervertir les barres',
      'cfg.toolbar': 'Barre d\'outils',
      'cfg.top': 'En haut',
      'cfg.left': 'Gauche',
      'cfg.right': 'Droite',
      'cfg.bottom': 'En bas',
      'cfg.hidden': 'Masquée',
      'cfg.scBar': 'Barre de raccourcis',
      'cfg.size': 'Taille',
      'cfg.sizeNote': 'La couleur et l\'épaisseur de chaque outil se règlent dans l\'outil lui-même : touchez-le une fois pour l\'utiliser et une seconde fois pour l\'ouvrir.',
      'cfg.navSec': 'Au changement de page',
      'cfg.clearNav': 'Effacer les traits au changement de page',
      'cfg.clearNavNote': 'Activé, les dessins disparaissent quand l\'adresse de la page change — par exemple, en passant à la question suivante.',
      'cfg.penSec': 'Stylet',
      'cfg.penOnly': 'Dessiner uniquement au stylet',
      'cfg.penOnlyNote': 'Le doigt fait défiler la page et touche les boutons du site ; seul le stylet dessine.',
      'pen.autoOn': 'Stylet détecté : désormais seul le stylet dessine et le doigt fait défiler la page. Modifiable dans ⚙️.',
      'cfg.sub': 'Abonnement',
      'cfg.help': 'Aide',
      'cfg.tutorial': '👋 Revoir le tutoriel',
      'cfg.autoOpen': 'Ouvrir automatiquement sur ce site', 'cfg.autoOpenNote': 'La barre apparaît dès que vous arrivez sur ce site, sans cliquer sur l\'icône.', 'cfg.iconOpens': 'Quand vous cliquez sur l\'icône, ouvrir', 'cfg.iconDraw': 'La Draw', 'cfg.iconHome': 'L\'écran d\'accueil', 'cfg.iconNote': 'L\'écran d\'accueil réunit la Highlights et le Notes. D\'ici, il s\'ouvre avec le bouton ⌂ de la barre.', 'cfg.hlMenu': 'Menu de la Highlights à la sélection de texte', 'cfg.hlShow': 'Afficher', 'cfg.hlHide': 'Ne pas afficher', 'cfg.hlNote': 'Le menu de couleurs qui apparaît quand vous sélectionnez un passage. Sans lui, sélectionner du texte fonctionne comme avant.', 'cfg.autoOn': '✓ Activé sur {0}', 'cfg.autoOff': 'Activer sur {0}',
      'note.title': '📌 Note',
      'note.remove': 'Supprimer la note',
      'note.placeholder': 'Écrivez votre note ici…',
      'calc.error': 'Erreur',
      'copy.app': '📋 Image copiée ! Pour la coller, appuyez longuement à l\'endroit voulu et choisissez Coller.',
      'copy.desktop': '📋 Image copiée ! Collez-la avec {0} où vous voulez.',
      'sel.hint': 'Faites glisser pour sélectionner la zone &nbsp;·&nbsp; Esc annule'
    }
  };
  // Looks a string up in the current language, falling back to Portuguese.
  function tr(key, ...args) {
    // Spanish and French fall back to English, English to the Portuguese original.
    let s = (I18N[PD_LANG] || I18N.en)[key] ?? (PD_LANG !== 'pt' ? I18N.en[key] : undefined) ?? I18N.pt[key] ?? key;
    args.forEach((v, i) => { s = s.split('{' + i + '}').join(v); });
    return s;
  }
  // The calculator shows this on a bad result, and also checks for it to
  // know the display holds an error rather than a number.
  const CALC_ERR = tr('calc.error');
  // Every persisted key lives here — chrome.storage.local.get() returns ONLY
  // the keys it is asked for, so this list must stay in sync with savePrefs().
  const PD_PREF_KEYS = ['pdColor', 'pdSize', 'pdRecent', 'pdToolSizes', 'pdToolColors', 'pdHlStraight', 'pdEraserStroke', 'pdScPos', 'pdCalcScale', 'pdTbPos', 'pdNoticeHide', 'pdTheme', 'pdNewsNotesHide', 'pdLang', 'pdNotesPromoHide', 'pdNotesPromoSnooze', 'pdHlPromoHide', 'pdHlPromoSnooze', 'pdBfHide', 'pdPencilSmooth', 'pdTourDone', 'pdClearOnNav', 'pdPenOnly'];
  const PD = {
    savePrefs(obj) {
      if (PD_ENV === 'extension') { try { chrome.storage?.local.set(obj); } catch (e) {} }
      else if (PD_ENV === 'android') { try { window.AndroidBridge.setPrefs(JSON.stringify(obj)); } catch (e) {} }
      else { try { localStorage.setItem('__pd_prefs__', JSON.stringify(obj)); } catch (e) {} }
    },
    loadPrefs(cb) {
      if (PD_ENV === 'extension') {
        try {
          chrome.storage?.local.get(PD_PREF_KEYS, res => {
            cb(chrome.runtime.lastError ? null : res);
          });
        } catch (e) { cb(null); }
      } else {
        let raw = null;
        try {
          raw = PD_ENV === 'android' ? window.AndroidBridge.getPrefs()
                                     : localStorage.getItem('__pd_prefs__');
        } catch (e) {}
        let res = null;
        try { res = raw ? JSON.parse(raw) : null; } catch (e) {}
        cb(res);
      }
    },
    setFullscreen(on) {
      if (PD_ENV === 'android') {
        // Native: hides the app's browser bar + system bars
        try { window.AndroidBridge.setFullscreen(on); } catch (e) {}
      } else {
        // Extension/web: browser Fullscreen API (like F11)
        try {
          if (on) document.documentElement.requestFullscreen?.()?.catch?.(() => {});
          else if (document.fullscreenElement) document.exitFullscreen?.()?.catch?.(() => {});
        } catch (e) {}
      }
    }
  };

  // ─── PREMIUM GATING (android app only) ────────────────────────────────────
  // The Chrome extension stays entirely free — this only gates the Android app,
  // where pencil + eraser are free and the tools below need a subscription.
  // Native BillingManager owns the entitlement; we read its cached value and
  // get pushed updates through window.__pdSetPremium (see MainActivity).
  const PREMIUM_TOOLS = ['highlight', 'line', 'rect', 'circle', 'laser', 'lasso'];
  // Controls dimmed/padlocked while unsubscribed. bColor and __pd_recent__ lock
  // colour choice (free draws in the default colour); the shortcut bar is
  // locked as a whole further below.
  const PREMIUM_BTNS = ['bHL', 'bLine', 'bRect', 'bCircle', 'bLaser', 'bLasso', 'bCap', 'bCrop',
                        'bCalc', 'bColor', '__pd_recent__'];
  let isPremiumUser = true;
  if (PD_ENV === 'android') {
    try { isPremiumUser = !!window.AndroidBridge.isPremium(); } catch (e) { isPremiumUser = false; }
  }
  // Returns true when the feature may run; otherwise opens the paywall.
  function premiumOk() {
    if (isPremiumUser) return true;
    try { window.AndroidBridge.requestSubscription(); } catch (e) {}
    return false;
  }
  // Subscription row inside the settings panel (exists on android only)
  function renderSubRow() {
    const row = document.getElementById('cfgSubRow');
    if (!row) return;
    // 'LIFETIME' | 'YEARLY' | 'MONTHLY' | '' — which plan unlocked the tools.
    let plan = '';
    try { plan = window.AndroidBridge.getPlanCode() || ''; } catch (e) {}
    const PLAN_LABEL = { LIFETIME: tr('plan.lifetime'), YEARLY: tr('plan.yearlyActive'), MONTHLY: tr('plan.monthlyActive') };
    // A subscriber can still move to a better deal; lifetime is the end of the road.
    const PLAN_MOVE = { YEARLY: tr('plan.moveYearly'), MONTHLY: tr('plan.moveMonthly') };
    row.innerHTML = isPremiumUser
      ? `<span class="cfg-sub-ok">✓ ${PLAN_LABEL[plan] || tr('plan.active')}</span>` +
        (PLAN_MOVE[plan] ? `<button id="cfgPlanBtn" class="cfg-ghost">${PLAN_MOVE[plan]}</button>` : '')
      : `<button id="cfgSubBtn">${tr('plan.see')}</button>` +
        // Bought on another device and it isn't showing here yet.
        `<button id="cfgRestoreBtn" class="cfg-ghost" style="margin-top:6px">${tr('plan.restore')}</button>`;
    const restore = row.querySelector('#cfgRestoreBtn');
    if (restore) restore.onclick = () => { try { window.AndroidBridge.restorePurchases(); } catch (e) {} };
    const btn = row.querySelector('#cfgSubBtn');
    if (btn) btn.onclick = () => premiumOk();
    const move = row.querySelector('#cfgPlanBtn');
    // premiumOk() would just return true here — go straight to the picker.
    if (move) move.onclick = () => { try { window.AndroidBridge.requestSubscription(); } catch (e) {} };
  }
  function refreshPremiumUI() {
    if (PD_ENV !== 'android') return;
    PREMIUM_BTNS.forEach(id => {
      document.getElementById(id)?.classList.toggle('pd-locked', !isPremiumUser);
    });
    // Looked up by id rather than the `sc` binding: this runs before that
    // const is initialised on the very first call.
    document.getElementById('__pd_sc__')?.classList.toggle('pd-locked', !isPremiumUser);
    renderSubRow();
  }

  /**
   * Swallows interaction with a locked control before its own handlers see it,
   * and opens the paywall instead. Capture phase so it wins over the element's
   * listeners; pointerdown is blocked too because <input type=color> can open
   * its picker on press, ahead of any click.
   */
  function lockWhileFree(el) {
    if (!el || PD_ENV !== 'android') return;
    ['pointerdown', 'click'].forEach(type => {
      el.addEventListener(type, e => {
        if (isPremiumUser) return;
        e.preventDefault();
        e.stopPropagation();
        if (type === 'click') premiumOk();   // one paywall per tap, not two
      }, true);
    });
  }

  // ─── MOBILE GATE (extension only) ─────────────────────────────────────────
  // The extension is free on desktop. On Android/iOS browsers that sideload
  // extensions (Lemur, Kiwi, Orion...) we point to the official paid app
  // instead of running the tools. The app itself enters through PD_ENV ===
  // 'android' and never hits this gate. Layered signals also catch mobile
  // browsers in "desktop site" mode; ChromeOS (CrOS) is explicitly allowed.
  if (PD_ENV !== 'android') {
    const ua = navigator.userAgent || '';
    const plat = navigator.platform || '';
    const uad = navigator.userAgentData;
    const isMobileDevice =
      /android|iphone|ipad|ipod/i.test(ua) ||
      (uad && (uad.mobile === true || uad.platform === 'Android')) ||
      (/mac/i.test(plat) && navigator.maxTouchPoints > 1) ||          // iPad posing as Mac
      (/armv|aarch64/i.test(plat) && !/cros/i.test(ua));              // Android in desktop-site mode
    if (isMobileDevice) {
      const prev = document.getElementById('__pd_mobile_gate__');
      if (prev) { prev.remove(); return; }
      const gate = document.createElement('div');
      gate.id = '__pd_mobile_gate__';
      gate.style.cssText = 'position:fixed;inset:0;z-index:2147483647;display:flex;align-items:center;justify-content:center;background:rgba(15,15,35,.55);font-family:\'Segoe UI\',Arial,sans-serif;';
      gate.innerHTML = `
        <div style="background:#fff;border-radius:18px;max-width:340px;margin:20px;padding:26px 22px;text-align:center;box-shadow:0 12px 48px rgba(0,0,0,.35);">
          <div style="font-size:44px;line-height:1">🧭</div>
          <div style="font-size:18px;font-weight:800;margin:10px 0 6px;color:#2a2a33;">${tr('gate.title')}</div>
          <div style="font-size:13.5px;color:#555;line-height:1.5;">${tr('gate.body')}</div>
          <a href="https://play.google.com/store/apps/details?id=com.agoodraw.draw" target="_blank" rel="noopener" style="display:block;margin:16px 0 10px;background:linear-gradient(90deg,#4a4aff,#8b3dff);color:#fff;text-decoration:none;font-weight:700;font-size:14px;padding:12px;border-radius:12px;">${tr('gate.cta')}</a>
          <div style="font-size:11px;color:#999;">${tr('gate.free')}</div>
          <button id="__pd_gate_close__" style="margin-top:12px;border:none;background:transparent;color:#888;font-size:12px;cursor:pointer;text-decoration:underline;">${tr('common.close')}</button>
        </div>`;
      document.body.appendChild(gate);
      gate.querySelector('#__pd_gate_close__').onclick = () => gate.remove();
      gate.addEventListener('click', e => { if (e.target === gate) gate.remove(); });
      return;
    }
  }

  // ─── STATE ────────────────────────────────────────────────────────────────
  let tool = 'pointer';
  let color = '#E53935';
  let sz = 4;
  let drawing = false;
  let sx = 0, sy = 0;        // page-relative start coords for shape tools
  let lastP = null;           // last enriched mouse pos from mousemove

  // Vector stroke store — coords are page-relative (viewport + scroll offset)
  let strokes = [];
  let currentPencilStroke = null;
  let currentEraserStroke = null;
  // The finished strokes, kept as a picture the previews (marker, shapes,
  // lasso) start from. A canvas, not ImageData: canvas to canvas stays on the
  // GPU, while getImageData/putImageData read the whole screen back to the
  // CPU — tens of ms per stroke on a tablet, the marker stuttering.
  let baseSnap = null;
  const baseCv = document.createElement('canvas');
  function snapBase() {
    if (baseCv.width !== cv.width || baseCv.height !== cv.height) { baseCv.width = cv.width; baseCv.height = cv.height; }
    const b = baseCv.getContext('2d');
    b.globalCompositeOperation = 'copy'; b.drawImage(cv, 0, 0);
    return baseCv;
  }
  // One screen-sized scratch canvas for the marker (drawn opaque there, then
  // laid down at 30% so it never darkens where it crosses itself), cleared
  // and reused: a new one per move or per marker stroke was a fresh
  // full-screen buffer each time.
  const tmpCv = document.createElement('canvas');
  function scratch() {
    if (tmpCv.width !== cv.width || tmpCv.height !== cv.height) { tmpCv.width = cv.width; tmpCv.height = cv.height; }
    const t = tmpCv.getContext('2d');
    t.setTransform(1, 0, 0, 1, 0, 0); t.globalAlpha = 1; t.globalCompositeOperation = 'source-over';
    t.clearRect(0, 0, tmpCv.width, tmpCv.height);
    return tmpCv;
  }
  // Puts the picture back exactly (like putImageData: replaces, doesn't blend).
  function restoreBase() {
    cx.save(); cx.setTransform(1, 0, 0, 1, 0, 0); cx.globalAlpha = 1; cx.globalCompositeOperation = 'copy';
    cx.drawImage(baseSnap, 0, 0); cx.restore();
  }
  let hlPts = [];
  let pencilPts = [];
  let hist = [], redoStack = [];

  // Every drawing tool owns its thickness and its colour, like a pencil case:
  // switching tool brings back exactly how that tool was left. Both maps are
  // persisted, and the pop-over on the tool button is where they are edited —
  // which is why the toolbar has no size slider and the settings panel no
  // longer carries default sizes.
  let toolSizes = {};
  let toolColors = {};
  const SIZE_MIN = 1, SIZE_MAX = 40;
  const SIZE_TOOLS = ['pencil', 'highlight', 'line', 'rect', 'circle', 'eraser'];
  const COLOR_TOOLS = ['pencil', 'highlight', 'line', 'rect', 'circle'];
  const sizeKey = t => SIZE_TOOLS.includes(t) ? t : null;
  const colorKey = t => COLOR_TOOLS.includes(t) ? t : null;
  // Yellow marker, red for everything else: what people reach for on paper.
  const TOOL_COLOR_DEFAULT = { highlight: '#FDD835' };
  // Marker stroke: locked to the starting line (a ruler, the default) or free.
  let hlStraight = true;
  // The pencil smooths the stroke (curves through the midpoints) unless set to
  // "Natural": then it follows every sample as drawn — what a pen tablet's
  // small loops (an m, an n) need.
  let pencilSmooth = true;
  // Eraser: false rubs pixels out where it passes (the default), true removes
  // the whole stroke it touches.
  let eraserStroke = false;
  // ⚙️ "Limpar os traços ao mudar de página": the drawing goes when the
  // address changes (a site that moves to the next question without reloading).
  let clearOnNav = false;
  // ⚙️ "Desenhar só com a caneta" (a screen that takes touch: tablet, the
  // Notes on a phone or a touch laptop): the finger scrolls and taps the site,
  // only a stylus draws. null = never chosen: it turns itself on the first
  // time a pen is used (and says so). The app has its own copy of this.
  let penOnly = null;
  const TOUCH_SCREEN = (navigator.maxTouchPoints || 0) > 0;
  const TOOL_LABEL = {
    pencil: tr('tool.pencil'), highlight: tr('tool.highlight'), line: tr('tool.line'),
    rect: tr('tool.rect'), circle: tr('tool.circle'), eraser: tr('tool.eraser')
  };
  // One row, five slots: four colours that cover most of what people mark on
  // a question, plus the picker at the end for anything else.
  const TOOL_PALETTE = ['#E53935', '#FDD835', '#43A047', '#1E88E5'];
  // Seeded here so the tools already have a colour and a thickness when
  // nothing is stored yet (first run, or storage that answers empty);
  // loadPrefs overwrites both from storage.
  const SIZE_DEFAULT = 4;
  COLOR_TOOLS.forEach(k => { toolColors[k] = TOOL_COLOR_DEFAULT[k] || color; });
  SIZE_TOOLS.forEach(k => { toolSizes[k] = SIZE_DEFAULT; });

  // Calculator widget scale (persisted), applied as a uniform CSS transform
  // so every element inside (display, buttons, grid) resizes together.
  let calcScale = 1;
  function applyCalcScale() {
    const el = document.getElementById('__pd_calc__');
    if (el) { el.style.transform = 'scale(' + calcScale + ')'; el.style.transformOrigin = 'top left'; }
  }

  // Laser Revamp State
  let laserStrokes = [];
  let currentLaserStroke = null;
  let lastLaserActivity = 0;
  let laserFadeStart = null;
  let laserLoopAnim = null;
  let laserPainted = false;   // lv holds something the next frame must clear

  let mouseX = 0, mouseY = 0;
  let __pdSending = false;

  // Track last focused page element (outside toolbars)
  let lastFocus = document.body;
  document.addEventListener('focusin', e => { if (!e.target.closest?.('#__pd_tb__,#__pd_sc__')) lastFocus = e.target; }, SIGC);
  document.addEventListener('mousedown', e => { if (!e.target.closest?.('#__pd_tb__,#__pd_sc__')) lastFocus = e.target; }, SIGC);

  // ─── THEME (light / dark) ─────────────────────────────────────────────────
  // 'light' | 'dark' | 'auto' (follows the system). Only our own UI changes —
  // the page underneath is never touched. The dark palette is a stylesheet of
  // its own (darkStyleEl, below the main one) switched on and off through its
  // media attribute, so nothing is ever written onto the page's own <html>.
  // Extension/web keep the choice in prefs (pdTheme); the app keeps it natively,
  // because the native browser bar, the home page and the dialogs follow it too.
  const THEME_MODES = ['light', 'dark', 'auto'];
  let themeMode = 'light';
  let darkStyleEl = null;    // built with the other styles below
  if (PD_ENV === 'android') {
    try { const m = window.AndroidBridge.getTheme(); if (THEME_MODES.includes(m)) themeMode = m; } catch (e) {}
  }
  const darkMq = (() => { try { return window.matchMedia('(prefers-color-scheme: dark)'); } catch (e) { return null; } })();
  // Inside a page with a theme of its own that the Draw is part of (the
  // GooNotes' questions and flashcards, 05/11/2026): <html
  // data-pd-host-theme="dark|light">, kept by that page — the Draw follows it
  // and its own light/dark/auto choice steps aside. An attribute, not a
  // global: the extension's Draw runs in a world of its own and sees the DOM.
  const hostTheme = () => { const v = document.documentElement.getAttribute('data-pd-host-theme'); return v === 'dark' || v === 'light' ? v : null; };
  const hostThemeMo = new MutationObserver(() => applyTheme());
  hostThemeMo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-pd-host-theme'] });
  function themeIsDark() {
    const host = hostTheme();
    if (host) return host === 'dark';
    // The app resolves 'auto' natively: the WebView's own media query follows
    // the app theme rather than the system's.
    if (PD_ENV === 'android') { try { return !!window.AndroidBridge.isDarkUi(); } catch (e) { return false; } }
    return themeMode === 'dark' || (themeMode === 'auto' && !!darkMq?.matches);
  }
  function applyTheme() {
    if (darkStyleEl) darkStyleEl.media = themeIsDark() ? 'all' : 'not all';
    document.querySelectorAll('#cfgTheme button').forEach(b =>
      b.classList.toggle('on', b.dataset.theme === themeMode));
    // The host's theme rules: no choice of its own to show.
    const hosted = !!hostTheme();
    ['cfgThemeSec', 'cfgTheme'].forEach(id => { const el = document.getElementById(id); if (el) el.style.display = hosted ? 'none' : ''; });
  }
  function setThemeMode(m) {
    if (!THEME_MODES.includes(m)) return;
    themeMode = m;
    // Native stores it and re-themes its own bar; it also stops its notice.
    if (PD_ENV === 'android') { try { window.AndroidBridge.setTheme(m); } catch (e) {} }
    applyTheme();
  }
  const onSystemTheme = () => { if (themeMode === 'auto') applyTheme(); };
  try { darkMq?.addEventListener('change', onSystemTheme); } catch (e) {}

  // ─── STYLES ───────────────────────────────────────────────────────────────
  const styleEl = document.createElement('style');
  styleEl.id = '__pd_style__';
  styleEl.textContent = `
    #__pd_root__ { position:fixed;inset:0;z-index:2147483640;pointer-events:none; }
    #__pd_lv__, #__pd_cur__ { position:absolute;inset:0;pointer-events:none; }
    #__pd_cv__ { position:absolute;inset:0;pointer-events:none;touch-action:none; }

    /* ══ MAIN TOOLBAR ══ */
    #__pd_tb__ {
      position:fixed;top:0;left:0;right:0;z-index:2147483647;
      pointer-events:all;background:#fff;
      border-bottom:2px solid #e0e0e0;
      box-shadow:0 2px 12px rgba(0,0,0,.10);
      font-family:'Segoe UI',Arial,sans-serif;
    }
    #__pd_tb__ .pd-row {
      position:relative;
      display:flex;align-items:center;justify-content:center;
      flex-wrap:nowrap;gap:3px;padding:5px 12px;
    }
    #__pd_brand__ {
      position:absolute;left:14px;top:50%;transform:translateY(-50%);
      display:flex;align-items:center;gap:9px;text-decoration:none;
      padding:4px 10px 4px 8px;border-radius:10px;border:1px solid transparent;
      transition:background .12s,border-color .12s,box-shadow .12s;cursor:pointer;
    }
    #__pd_brand__:hover { background:#f5f6ff;border-color:#c7ccff;box-shadow:0 2px 8px rgba(74,74,255,.14); }
    #__pd_brand__ .brand-icon { font-size:21px;line-height:1;filter:drop-shadow(0 1px 1px rgba(0,0,0,.15)); }
    #__pd_brand__ .brand-icon img { width:22px;height:22px;display:block;border-radius:5px; }
    #__pd_brand__ .brand-text { display:flex;flex-direction:column;line-height:1.15; }
    #__pd_brand__ .brand-name {
      font-size:14.5px;font-weight:800;letter-spacing:.2px;white-space:nowrap;
      background:linear-gradient(90deg,#4a4aff 0%,#8b3dff 100%);
      -webkit-background-clip:text;background-clip:text;
      -webkit-text-fill-color:transparent;color:#4a4aff;
    }
    #__pd_brand__ .brand-sub {
      font-size:9px;font-weight:700;color:#7c5cff;white-space:nowrap;
      text-transform:uppercase;letter-spacing:.4px;display:flex;align-items:center;gap:3px;
    }
    #__pd_brand__:hover .brand-sub { color:#4a4aff; }
    /* The brand is absolutely positioned on the left while the buttons are
       centred, so they collide once the window gets narrow — measured: the
       buttons need ~860px and the brand ~165px, i.e. below ~1220px the logo
       ends up sitting on top of the first tools. Hide it before that happens.
       Applies to every platform: the same overlap showed up in a narrow Chrome
       window on the desktop extension, not just on a tablet in portrait. */
    @media (max-width:1250px) { #__pd_brand__ { display:none; } }
    /* "Conheça GooNotes": hangs from the bar's lower edge, under the brand. */
    #__pd_notes_tab__ {
      position:absolute;left:22px;top:100%;margin-top:0;display:flex;align-items:center;gap:6px;
      padding:4px 12px 5px;border-radius:0 0 11px 11px;text-decoration:none;white-space:nowrap;
      font:800 11px/1.2 'Segoe UI',Arial,sans-serif;letter-spacing:.2px;color:#fff;
      background:linear-gradient(90deg,#4a4aff 0%,#8b3dff 100%);
      box-shadow:0 6px 14px -6px rgba(74,74,255,.6);transition:padding .15s,box-shadow .15s;
    }
    #__pd_notes_tab__:hover { padding-bottom:8px;box-shadow:0 8px 18px -6px rgba(74,74,255,.75); }
    #__pd_notes_tab__ svg { flex-shrink:0; }
    #__pd_tb__.pd-tb-bottom #__pd_notes_tab__ { top:auto;bottom:100%;border-radius:11px 11px 0 0;padding:5px 12px 4px; }
    #__pd_tb__.pd-tb-bottom #__pd_notes_tab__:hover { padding-top:8px;padding-bottom:4px; }
    @media (max-width:1250px) { #__pd_notes_tab__ { display:none; } }
    /* "GooHighlights": the same kind of tab, with where the highlights
       are kept — this computer only (amber) or the cloud (green). */
    #__pd_tb__ #__pd_hl_tab__ {
      position:absolute;left:22px;top:100%;display:flex;align-items:center;gap:7px;cursor:pointer;border:0;
      padding:4px 6px 5px 12px;border-radius:0 0 11px 11px;white-space:nowrap;
      font:800 11px/1.2 'Segoe UI',Arial,sans-serif;letter-spacing:.2px;color:#fff;
      background:linear-gradient(90deg,#4a4aff 0%,#8b3dff 100%);
      box-shadow:0 6px 14px -6px rgba(74,74,255,.6);transition:padding .15s,box-shadow .15s;
    }
    #__pd_tb__ #__pd_hl_tab__:hover { padding-bottom:8px;box-shadow:0 8px 18px -6px rgba(74,74,255,.75); }
    #__pd_tb__ #__pd_hl_tab__.with-notes { left:230px; }
    #__pd_tb__ #__pd_hl_tab__ .hl-st { display:inline-flex;align-items:center;gap:4px;padding:2px 7px;border-radius:99px;font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:.3px; }
    #__pd_tb__ #__pd_hl_tab__ .hl-st.local { background:#FEF3C7;color:#92400E; }
    #__pd_tb__ #__pd_hl_tab__ .hl-st.cloud { background:#DCFCE7;color:#166534; }
    #__pd_tb__ #__pd_hl_tab__ .hl-st.near { background:#FEF3C7;color:#92400E; }
    #__pd_tb__ #__pd_hl_tab__ .hl-st.full { background:#FEE2E2;color:#B91C1C; }
    #__pd_tb__ #__pd_hl_tab__ .hl-st.full i { animation:pdHlPulse 1.2s ease-in-out infinite; }
    #__pd_tb__ #__pd_hl_tab__ .hl-st i { width:6px;height:6px;border-radius:3px;background:currentColor;display:block; }
    #__pd_tb__ #__pd_hl_tab__ .hl-st.local i { animation:pdHlPulse 1.6s ease-in-out infinite; }
    @keyframes pdHlPulse { 50% { opacity:.25; } }
    #__pd_tb__.pd-tb-bottom #__pd_hl_tab__#__pd_hl_tab__ { top:auto;bottom:100%;border-radius:11px 11px 0 0;padding:5px 6px 4px 12px; }
    #__pd_tb__.pd-tb-bottom #__pd_hl_tab__#__pd_hl_tab__:hover { padding-top:8px;padding-bottom:4px; }
    @media (max-width:900px) { #__pd_hl_tab__ { display:none; } }
    #__pd_hl_modal__ { position:fixed;inset:0;z-index:2147483647;display:flex;align-items:center;justify-content:center;padding:20px;background:rgba(15,15,35,.55);font-family:'Segoe UI',Arial,sans-serif; }
    #__pd_hl_modal__ .hm-card { background:#fff;border-radius:20px;max-width:460px;width:100%;padding:28px 26px 22px;text-align:center;box-shadow:0 16px 52px rgba(0,0,0,.38); }
    #__pd_hl_modal__ .hm-ic { width:64px;height:64px;margin:0 auto;border-radius:18px;display:grid;place-items:center;font-size:30px; }
    #__pd_hl_modal__ .hm-ic.local { background:#FEF3C7; } #__pd_hl_modal__ .hm-ic.cloud { background:#DCFCE7; }
    #__pd_hl_modal__ .hm-ic.near { background:#FEF3C7; } #__pd_hl_modal__ .hm-ic.full { background:#FEE2E2; }
    #__pd_hl_modal__ .hm-badge.near { background:#FEF3C7;color:#92400E; } #__pd_hl_modal__ .hm-badge.full { background:#FEE2E2;color:#B91C1C; }
    #__pd_hl_modal__ .hm-bar { height:8px;border-radius:8px;background:#ECEAF8;overflow:hidden;margin:2px 0 14px; }
    #__pd_hl_modal__ .hm-bar i { display:block;height:100%;border-radius:8px;background:linear-gradient(90deg,#F59E0B,#EF4444); }
    #__pd_hl_modal__ .hm-badge { display:inline-flex;align-items:center;gap:6px;margin-top:14px;padding:4px 11px;border-radius:99px;font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:.4px; }
    #__pd_hl_modal__ .hm-badge.local { background:#FEF3C7;color:#92400E; } #__pd_hl_modal__ .hm-badge.cloud { background:#DCFCE7;color:#166534; }
    #__pd_hl_modal__ h2 { font-size:19px;font-weight:800;color:#26263a;margin:10px 0 8px; }
    #__pd_hl_modal__ p { font-size:13.5px;color:#55556a;line-height:1.6;margin:0; }
    #__pd_hl_modal__ p + p { margin-top:10px; }
    #__pd_hl_modal__ .hm-cta { display:block;width:100%;margin:18px 0 8px;padding:13px;border:0;cursor:pointer;background:linear-gradient(90deg,#4a4aff,#8b3dff);color:#fff;font:700 14px 'Segoe UI',Arial,sans-serif;border-radius:13px; }
    #__pd_hl_modal__ .hm-sec { display:block;width:100%;padding:11px;border:1.5px solid #E4E4EE;background:#fff;color:#3a3a50;font:700 13.5px 'Segoe UI',Arial,sans-serif;border-radius:13px;cursor:pointer; }
    #__pd_hl_modal__ .hm-sec + .hm-sec { margin-top:8px; }
    #__pd_hl_modal__ .hm-close { margin-top:12px;border:none;background:transparent;color:#8a8a99;font-size:12.5px;cursor:pointer;text-decoration:underline;font-family:inherit; }
    #__pd_tb__ .pd-sep { width:1px;height:26px;background:#e0e0e0;margin:0 5px;flex-shrink:0; }
    /* Forced flex line-break, off by default — the tablet-portrait rules below
       switch it on to split tools / actions onto two deliberate rows. */
    #__pd_tb__ .pd-break { display:none;flex-basis:100%;height:0;margin:0; }
    #__pd_tb__ .pd-lbl { font-size:9px;color:#aaa;text-transform:uppercase;letter-spacing:.5px;white-space:nowrap;padding:0 2px; }
    #__pd_tb__ button {
      height:34px;min-width:34px;background:#fbfbfd;
      border:1px solid #e7e7ef;border-radius:10px;color:#3a3a44;
      cursor:pointer;font-size:15px;display:flex;align-items:center;
      justify-content:center;
      transition:background .15s ease,border-color .15s ease,box-shadow .15s ease,transform .08s ease,color .15s ease;
      padding:0 7px;position:relative;flex-shrink:0;font-family:inherit;white-space:nowrap;
    }
    #__pd_tb__ button:hover {
      background:#f2f3ff;border-color:#b9beff;color:#2b2be0;
      box-shadow:0 3px 8px rgba(74,74,255,.14);transform:translateY(-1px);
    }
    #__pd_tb__ button:active { transform:translateY(0);box-shadow:0 1px 3px rgba(74,74,255,.18); }
    #__pd_tb__ button.on {
      background:linear-gradient(180deg,#5c5cff 0%,#4a4aff 100%)!important;
      border-color:#4038e6!important;color:#fff!important;
      box-shadow:0 3px 11px rgba(74,74,255,.38),inset 0 1px 0 rgba(255,255,255,.28)!important;
      transform:none;
    }
    #__pd_tb__ button.on:hover {
      background:linear-gradient(180deg,#6a6aff 0%,#5555ff 100%)!important;
      transform:translateY(-1px);
    }
    #__pd_tb__ input[type=color] { width:34px;height:34px;padding:2px;border:1px solid #e7e7ef;border-radius:10px;cursor:pointer;background:#fff;flex-shrink:0;transition:border-color .15s,box-shadow .15s; }
    #__pd_tb__ input[type=color]:hover { border-color:#b9beff;box-shadow:0 3px 8px rgba(74,74,255,.14); }
    #__pd_tb__ .pd-recent { display:flex;align-items:center;gap:4px;flex-shrink:0; }
    #__pd_tb__ .pd-recent .pd-sw {
      width:22px;height:22px;min-width:22px;border-radius:6px;cursor:pointer;padding:0;
      border:1.5px solid rgba(0,0,0,.18);flex-shrink:0;
      transition:transform .1s ease,box-shadow .12s ease,border-color .12s ease;
    }
    #__pd_tb__ .pd-recent .pd-sw:hover {
      transform:translateY(-1px) scale(1.1);
      box-shadow:0 2px 7px rgba(0,0,0,.25);border-color:rgba(0,0,0,.35);
    }
    #__pd_tb__ .pd-recent .pd-sw.active {
      border-color:#4a4aff;
      box-shadow:0 0 0 2px #fff,0 0 0 3.5px #4a4aff;
    }
    #__pd_tb__ .pd-recent .pd-sw.active:hover {
      box-shadow:0 0 0 2px #fff,0 0 0 3.5px #4a4aff,0 2px 7px rgba(74,74,255,.3);
    }
    #__pd_tb__ input[type=range] { width:72px;accent-color:#4a4aff;cursor:pointer;flex-shrink:0; }
    #__pd_tb__ .pd-sz-lbl { font-size:11px;color:#666;min-width:18px;text-align:center; }
    #__pd_tb__ button .tt {
      position:absolute;top:calc(100% + 5px);left:50%;transform:translateX(-50%);
      background:#1a1a2e;color:#fff;font-size:10px;padding:3px 7px;
      border-radius:5px;white-space:nowrap;pointer-events:none;
      opacity:0;transition:opacity .12s;z-index:9999;font-family:'Segoe UI',sans-serif;
    }
    #__pd_tb__ button:hover .tt { opacity:1; }
    #__pd_spacer__ { width:100%; }

    /* ══ CONTATO + APP PARA ANDROID (extension only, inserted via JS) ══
       Mirrors the brand on the other side: absolutely positioned, so it never
       pushes the centred buttons around. On a narrow window it gives way in
       steps (placeSocial); only the vertical column sends it out of the bar,
       to float in the bottom-right corner (.ps-float). Both triggers
       are links, not buttons, so the toolbar's button rules never reach them. */
    #__pd_social__ {
      position:absolute; right:14px; top:50%; transform:translateY(-50%);
      display:flex; align-items:center; gap:6px;
      font-family:'Segoe UI',Arial,sans-serif;
    }
    #__pd_social__ .ps-contact { position:relative; }
    #__pd_social__ .ps-btn {
      display:flex; align-items:center; gap:6px; text-decoration:none;
      padding:5px 11px; border-radius:999px; border:1px solid #ececf4;
      background:#fff; font-size:12px; font-weight:600; line-height:1.4;
      color:#5f5f72; white-space:nowrap; cursor:pointer; user-select:none;
      transition:background .12s, border-color .12s, color .12s, box-shadow .12s, transform .12s;
    }
    #__pd_social__ .ps-btn svg { display:block; flex-shrink:0; }
    /* In the bar every pixel counts: without the speech bubble the pair fits
       a 1366px laptop screen. The floating corner has room for it. */
    #__pd_tb__ #__pd_social__ .ps-chat { display:none; }
    #__pd_tb__ #__pd_social__ .ps-btn { padding:5px 10px; }
    #__pd_social__ .ps-contact:hover .ps-btn, #__pd_social__ .ps-contact.open .ps-btn {
      background:#f5f6ff; border-color:#c7ccff; color:#2b2be0;
    }
    #__pd_social__ .ps-chev { transition:transform .15s; }
    #__pd_social__ .ps-contact:hover .ps-chev, #__pd_social__ .ps-contact.open .ps-chev { transform:rotate(180deg); }
    #__pd_social__ #__pd_android_link__ {
      background:linear-gradient(100deg,#4a4aff,#8b3dff); border-color:transparent;
      color:#fff; font-weight:700; box-shadow:0 2px 8px rgba(74,74,255,.28);
    }
    #__pd_social__ #__pd_android_link__:hover {
      transform:translateY(-1px); box-shadow:0 5px 14px rgba(74,74,255,.4);
    }
    /* The menu hangs from the trigger; its top padding bridges the gap so
       the pointer can travel down to it without the hover dropping. */
    #__pd_social__ .ps-menu {
      display:none; position:absolute; right:0; top:100%; padding-top:8px; z-index:1;
    }
    #__pd_social__ .ps-contact:hover .ps-menu,
    #__pd_social__ .ps-contact.open .ps-menu,
    #__pd_social__ .ps-contact:focus-within .ps-menu { display:block; }
    /* Opening upward: a bar docked to the bottom, or the floating corner. */
    #__pd_social__.ps-up .ps-menu { top:auto; bottom:100%; padding-top:0; padding-bottom:8px; }
    #__pd_social__ .ps-menu-in {
      min-width:230px; padding:6px; background:#fff; border:1px solid #e7e7ef;
      border-radius:14px; box-shadow:0 12px 32px rgba(20,20,60,.16);
    }
    #__pd_social__ .ps-item {
      display:flex; align-items:center; gap:11px; padding:8px 10px;
      border-radius:10px; text-decoration:none; color:#2a2a35;
    }
    #__pd_social__ .ps-item:hover { background:#f4f4fb; }
    #__pd_social__ .ps-ico {
      width:32px; height:32px; border-radius:9px; flex-shrink:0;
      display:flex; align-items:center; justify-content:center; color:#fff;
    }
    #__pd_social__ .ps-ico.ig { background:linear-gradient(45deg,#f9a825 0%,#e1306c 55%,#8a3ab9 100%); }
    #__pd_social__ .ps-ico.tg { background:linear-gradient(135deg,#2aabee,#229ed9); }
    #__pd_social__ .ps-txt { display:flex; flex-direction:column; line-height:1.25; }
    #__pd_social__ .ps-txt b { font-size:13px; font-weight:700; }
    #__pd_social__ .ps-txt small { font-size:11.5px; color:#7a7a8c; }
    /* Out of the bar: a permanent pair of pills in the bottom-right corner. */
    #__pd_social__.ps-float {
      position:fixed; top:auto; right:18px; bottom:18px; transform:none;
      z-index:2147483646; gap:8px;
    }
    #__pd_social__.ps-float .ps-btn { padding:9px 15px; box-shadow:0 4px 16px rgba(20,20,60,.16); }
    #__pd_social__.ps-float #__pd_android_link__ { box-shadow:0 4px 16px rgba(74,74,255,.35); }
    /* A horizontal bar too narrow for the pair gives way in steps (placeSocial):
       Contato goes first, then the Android pill shortens to "Android", then it
       goes too. The pair never leaves the bar to float over the page. */
    #__pd_social__ .ps-short { display:none; }
    #__pd_social__.ps-shrunk .ps-long { display:none; }
    #__pd_social__.ps-shrunk .ps-short { display:inline; }
    #__pd_social__.ps-no-contact .ps-contact { display:none; }
    #__pd_social__.ps-gone { display:none; }

    /* ══ VERTICAL TOOLBAR (docked to a side edge) ══
       Buttons stack in a column, so the row never has to fit the screen width —
       and a left-hander can move the whole bar to the side their hand rests on.
       The page is pushed aside by syncLayout (body margin), mirroring what the
       spacer does for the horizontal bar. */
    /* Full height from top:0 + bottom:0, deliberately with no height rule:
       the column is an edge-to-edge sidebar. Where the shortcut bar crosses
       it, syncLayout ends the column at the bar. */
    #__pd_tb__.pd-tb-left, #__pd_tb__.pd-tb-right {
      top:0; bottom:0; width:auto;
      border-bottom:none; overflow-y:auto; overflow-x:hidden;
      box-shadow:0 2px 12px rgba(0,0,0,.10);
    }
    #__pd_tb__.pd-tb-left  { left:0; right:auto; border-right:2px solid #e0e0e0; }
    #__pd_tb__.pd-tb-right { left:auto; right:0; border-left:2px solid #e0e0e0; }
    #__pd_tb__.pd-tb-left .pd-row, #__pd_tb__.pd-tb-right .pd-row {
      flex-direction:column; flex-wrap:nowrap; justify-content:flex-start;
      align-items:center; padding:6px 5px; gap:4px;
    }
    /* Separators turn into horizontal dividers inside the column */
    #__pd_tb__.pd-tb-left .pd-sep, #__pd_tb__.pd-tb-right .pd-sep {
      width:26px; height:1px; margin:4px 0;
    }
    /* No room for the inline thickness slider in a ~46px column — the ⚙️ panel
       keeps a per-tool size control, so nothing is actually lost. */
    #__pd_tb__.pd-tb-left #__pd_recent__, #__pd_tb__.pd-tb-right #__pd_recent__,
    #__pd_tb__.pd-tb-left #__pd_brand__, #__pd_tb__.pd-tb-right #__pd_brand__,
    #__pd_tb__.pd-tb-left #__pd_notes_tab__, #__pd_tb__.pd-tb-right #__pd_notes_tab__,
    #__pd_tb__.pd-tb-left #__pd_hl_tab__, #__pd_tb__.pd-tb-right #__pd_hl_tab__,
    #__pd_tb__.pd-tb-left .pd-break, #__pd_tb__.pd-tb-right .pd-break { display:none; }
    /* Tooltips fly out sideways, away from the screen edge */
    #__pd_tb__.pd-tb-left button .tt {
      top:50%; bottom:auto; left:calc(100% + 8px); transform:translateY(-50%);
    }
    #__pd_tb__.pd-tb-right button .tt {
      top:50%; bottom:auto; left:auto; right:calc(100% + 8px); transform:translateY(-50%);
    }

    /* ══ BOTTOM-DOCKED TOOLBAR ══
       The same horizontal bar flipped to the bottom edge. On a tablet held in
       two hands the tools land under the thumbs instead of at arm's reach, and
       the site's own header stays visible at the top of the page. Pairs with
       pd-pos-top on the shortcut bar: the two swap places. */
    #__pd_tb__.pd-tb-bottom {
      top:auto; bottom:0; left:0; right:0;
      border-bottom:none; border-top:2px solid #e0e0e0;
      box-shadow:0 -2px 12px rgba(0,0,0,.10);
    }
    /* Tooltips flip above the button — below the bar they'd be off-screen. */
    #__pd_tb__.pd-tb-bottom button .tt {
      top:auto; bottom:calc(100% + 5px);
    }

    /* ══ NARROW WINDOW: the bars scroll sideways (.pd-scroll, set by fitScroll) ══
       Instead of cutting the last buttons off, the row keeps its size and
       scrolls; the button labels float outside (#__pd_ftt__), since the
       scrolling box would clip them. */
    #__pd_tb__.pd-scroll { overflow-x:auto; overflow-y:hidden; scrollbar-width:thin; }
    #__pd_tb__.pd-scroll .pd-row { width:max-content; justify-content:flex-start; margin:0 auto; }
    #__pd_tb__.pd-scroll button .tt, #__pd_sc__.pd-scroll button .tt { display:none; }
    #__pd_sc__ { max-width:calc(100vw - 24px); }
    #__pd_sc__.pd-scroll .sc-row { overflow-x:auto; overflow-y:hidden; justify-content:flex-start; scrollbar-width:thin; padding-bottom:2px; }
    #__pd_ftt__ { position:fixed; z-index:2147483647; pointer-events:none; background:#1a1a2e; color:#fff; font:10px/1.3 'Segoe UI',sans-serif;
      padding:3px 7px; border-radius:5px; white-space:nowrap; display:none; }

    /* ══ FLOATING SHORTCUT PANEL ══ */
    #__pd_sc__ {
      position:fixed;bottom:20px;left:50%;transform:translateX(-50%);
      z-index:2147483647;pointer-events:all;
      background:#fff;border:1.5px solid #e0e0e0;border-radius:14px;
      box-shadow:0 4px 24px rgba(0,0,0,.15);
      font-family:'Segoe UI',Arial,sans-serif;
      padding:6px 10px;display:flex;flex-direction:column;gap:4px;
      user-select:none;
    }
    #__pd_sc__ .sc-drag {
      text-align:center;color:#ccc;font-size:12px;cursor:grab;
      letter-spacing:3px;padding:0 0 2px;line-height:1;
      touch-action:none;
    }
    #__pd_sc__ .sc-drag:active { cursor:grabbing; }
    #__pd_sc__ .sc-row { display:flex;align-items:center;gap:4px;justify-content:center; }
    #__pd_sc__ .sc-lbl { font-size:9px;color:#aaa;text-transform:uppercase;letter-spacing:.5px;white-space:nowrap;padding:0 2px; }
    #__pd_sc__ .sc-sep { width:1px;height:26px;background:#e0e0e0;margin:0 4px;flex-shrink:0; }
    #__pd_sc__ button {
      height:34px;min-width:34px;border-radius:10px;cursor:pointer;
      font-size:13px;font-family:inherit;display:flex;align-items:center;
      justify-content:center;padding:0 9px;flex-shrink:0;
      transition:background .15s ease,border-color .15s ease,box-shadow .15s ease,transform .08s ease,color .15s ease;
      white-space:nowrap;border:1.5px solid;position:relative;
    }
    #__pd_sc__ button:hover { transform:translateY(-1px); }
    #__pd_sc__ button:active { transform:translateY(0);box-shadow:0 1px 3px rgba(0,0,0,.14)!important; }
    #__pd_sc__ button.ok  { background:#e8fdf0;border-color:#86efac;color:#15803d;font-size:18px;font-weight:700; }
    #__pd_sc__ button.ok:hover  { background:#bbf7d0;border-color:#4ade80;box-shadow:0 3px 9px rgba(34,197,94,.30); }
    #__pd_sc__ button.no  { background:#fef2f2;border-color:#fca5a5;color:#dc2626;font-size:18px;font-weight:700; }
    #__pd_sc__ button.no:hover  { background:#fee2e2;border-color:#f87171;box-shadow:0 3px 9px rgba(239,68,68,.28); }
    #__pd_sc__ button.lt  { background:#fffbeb;border-color:#fcd34d;color:#92400e;font-size:13px;font-weight:800;font-family:monospace;min-width:32px; }
    #__pd_sc__ button.lt:hover  { background:#fef3c7;border-color:#fbbf24;box-shadow:0 3px 9px rgba(245,158,11,.30); }
    #__pd_sc__ button.nv  { background:#eff6ff;border-color:#93c5fd;color:#1d4ed8;font-size:11px;font-weight:600; }
    #__pd_sc__ button.nv:hover  { background:#dbeafe;border-color:#60a5fa;box-shadow:0 3px 9px rgba(59,130,246,.28); }
    #__pd_sc__ button .tt {
      position:absolute;bottom:calc(100% + 5px);left:50%;transform:translateX(-50%);
      background:#1a1a2e;color:#fff;font-size:10px;padding:3px 7px;
      border-radius:5px;white-space:nowrap;pointer-events:none;
      opacity:0;transition:opacity .12s;z-index:9999;font-family:'Segoe UI',sans-serif;
    }
    #__pd_sc__ button:hover .tt { opacity:1; }

    /* ══ POST-IT NOTES ══ */
    .pd-postit {
      position:absolute;z-index:2147483642;pointer-events:all;
      min-width:180px;min-height:120px;width:240px;
      display:flex;flex-direction:column;
      border-radius:4px 4px 6px 6px;
      box-shadow:2px 4px 18px rgba(0,0,0,.22), 0 0 0 1px rgba(0,0,0,.06);
      font-family:'Segoe UI',Arial,sans-serif;
      transition:box-shadow .15s;
      overflow:hidden;
    }
    .pd-postit:hover { box-shadow:3px 6px 24px rgba(0,0,0,.30), 0 0 0 1px rgba(0,0,0,.10); }
    .pd-postit .postit-header {
      display:flex;align-items:center;justify-content:space-between;
      padding:4px 6px 3px 10px;cursor:grab;user-select:none;
      font-size:10px;font-weight:700;letter-spacing:.5px;
      text-transform:uppercase;color:rgba(0,0,0,.45);
      border-bottom:1px solid rgba(0,0,0,.08);
      flex-shrink:0;
    }
    .pd-postit .postit-header:active { cursor:grabbing; }
    .pd-postit .postit-close {
      width:18px;height:18px;border:none;background:transparent;
      color:rgba(0,0,0,.35);font-size:14px;cursor:pointer;
      display:flex;align-items:center;justify-content:center;
      border-radius:3px;padding:0;line-height:1;
    }
    .pd-postit .postit-close:hover { background:rgba(0,0,0,.10);color:#c00; }
    .pd-postit .postit-body {
      flex:1;padding:0;margin:0;border:none;outline:none;
      background:transparent;color:rgba(0,0,0,.82);resize:none;
      font-size:14px;font-family:'Segoe UI',Arial,sans-serif;
      line-height:1.5;padding:8px 10px;
      overflow-y:auto;
    }
    .pd-postit .postit-body::placeholder { color:rgba(0,0,0,.28); }
    .pd-postit .postit-resize {
      position:absolute;bottom:0;right:0;width:16px;height:16px;
      cursor:nwse-resize;opacity:0.3;
    }
    .pd-postit .postit-resize:hover { opacity:0.6; }

    /* ══ CALCULATOR ══ */
    #__pd_calc__ {
      border-radius:10px;overflow:hidden;
      box-shadow:0 8px 32px rgba(0,0,0,.28);
      font-family:'Segoe UI',Arial,sans-serif;pointer-events:all;
      background:#f3f3f3;
    }
    #__pd_calc__ .calc-header {
      display:flex;align-items:center;justify-content:space-between;
      padding:10px 12px 6px;cursor:grab;background:#f3f3f3;
      font-size:13px;font-weight:600;color:#333;user-select:none;
    }
    #__pd_calc__ .calc-header:active { cursor:grabbing; }
    #__pd_calc__ .calc-close-btn {
      border:none;background:transparent;font-size:14px;cursor:pointer;
      color:#888;padding:2px 7px;border-radius:4px;line-height:1;
    }
    #__pd_calc__ .calc-close-btn:hover { background:#e81123;color:#fff; }
    #__pd_calc__ .calc-display-area {
      background:#f3f3f3;padding:4px 16px 10px;text-align:right;
      min-height:76px;display:flex;flex-direction:column;justify-content:flex-end;
    }
    #__pd_calc__ .calc-expr { font-size:12px;color:#888;min-height:18px;word-break:break-all; }
    #__pd_calc__ .calc-display {
      font-size:36px;font-weight:300;color:#1a1a1a;
      word-break:break-all;line-height:1.2;transition:font-size .1s;
    }
    #__pd_calc__ .calc-mem-indicator {
      font-size:11px;color:#0078d4;font-weight:700;
      opacity:0;transition:opacity .2s;margin-right:4px;
    }
    #__pd_calc__ .calc-mem-row {
      display:grid;grid-template-columns:repeat(5,1fr);
      gap:1px;background:#e0e0e0;border-top:1px solid #ddd;
    }
    #__pd_calc__ .calc-mem-row button {
      padding:9px 4px;border:none;background:#f3f3f3;font-size:11px;font-weight:600;
      cursor:pointer;color:#555;font-family:'Segoe UI',Arial,sans-serif;
    }
    #__pd_calc__ .calc-mem-row button:hover { background:#e4e4e4; }
    #__pd_calc__ .calc-mem-row button:active { background:#d8d8d8; }
    #__pd_calc__ .calc-buttons {
      display:grid;grid-template-columns:repeat(4,1fr);gap:1px;background:#e0e0e0;
    }
    #__pd_calc__ .calc-buttons button {
      padding:17px 8px;border:none;background:#fafafa;font-size:15px;
      cursor:pointer;color:#1a1a1a;font-family:'Segoe UI',Arial,sans-serif;
    }
    #__pd_calc__ .calc-buttons button:hover { background:#efefef; }
    #__pd_calc__ .calc-buttons button:active { background:#e0e0e0; }
    #__pd_calc__ .calc-buttons button.c-op { background:#f0f0f0; }
    #__pd_calc__ .calc-buttons button.c-op:hover { background:#e6e6e6; }
    #__pd_calc__ .calc-buttons button.c-eq {
      background:#0078d4;color:#fff;font-size:18px;font-weight:600;
    }
    #__pd_calc__ .calc-buttons button.c-eq:hover { background:#006cbd; }
    #__pd_calc__ .calc-buttons button.c-eq:active { background:#005a9e; }
    #__pd_calc__ .calc-buttons button.c-clr { color:#c00020;font-weight:600; }
  `;
  // Universal add-ons (extension + android): shortcut-panel lateral docking
  // and the settings panel
  styleEl.textContent += `
    /* ══ SHORTCUT PANEL — LATERAL DOCKING ══ */
    /* No overflow clipping here: tooltips must escape the panel (desktop).
       The android block re-adds scrolling — tooltips are hidden there. */
    #__pd_sc__.pd-pos-left, #__pd_sc__.pd-pos-right {
      bottom:auto; top:50%; transform:translateY(-50%); max-width:none;
    }
    #__pd_sc__.pd-pos-left  { left:0; right:auto; border-radius:0 14px 14px 0; border-left:none; }
    #__pd_sc__.pd-pos-right { left:auto; right:0; border-radius:14px 0 0 14px; border-right:none; }
    /* Lateral: tooltips fly out sideways (above the button they'd clip at the screen edge) */
    #__pd_sc__.pd-pos-left .sc-row button .tt, #__pd_sc__.pd-pos-right .sc-row button .tt {
      bottom:auto; top:50%; transform:translateY(-50%);
    }
    #__pd_sc__.pd-pos-left .sc-row button .tt  { left:calc(100% + 8px); right:auto; }
    #__pd_sc__.pd-pos-right .sc-row button .tt { left:auto; right:calc(100% + 8px); }
    #__pd_sc__.pd-pos-left .sc-row, #__pd_sc__.pd-pos-right .sc-row { flex-direction:column; }
    #__pd_sc__.pd-pos-left .sc-sep, #__pd_sc__.pd-pos-right .sc-sep { width:26px; height:1px; margin:4px 0; }
    /* Lateral: icon-only uniform column — no group labels, no drag dots, equal button size */
    #__pd_sc__.pd-pos-left .sc-lbl, #__pd_sc__.pd-pos-right .sc-lbl { display:none; }
    #__pd_sc__.pd-pos-left .sc-drag, #__pd_sc__.pd-pos-right .sc-drag { display:none; }
    #__pd_sc__.pd-pos-left .sc-row button, #__pd_sc__.pd-pos-right .sc-row button { width:38px; min-width:38px; padding:0; }

    /* ══ SHORTCUT PANEL — TOP DOCKING ══
       Mirror image of the bottom dock, so moving the bar up changes only its
       edge, never its look: it floats 20px off the top with all four corners
       rounded, exactly as it floats 20px off the bottom. The android block
       docks the bar flush at the bottom, and mirrors that flush style here. */
    #__pd_sc__.pd-pos-top {
      top:20px; bottom:auto; left:50%; transform:translateX(-50%);
    }
    #__pd_sc__.pd-pos-top button .tt { bottom:auto; top:calc(100% + 5px); }

    /* ══ TOOL POP-OVER (colour + thickness of one tool) ══
       Opened by tapping the tool that is already in use. Anchored to its
       button by syncToolPopover, so it follows the bar to any edge. */
    #__pd_tp__ {
      position:fixed; z-index:2147483647; pointer-events:all; display:none;
      background:#fff; border:1.5px solid #e0e0e0; border-radius:14px;
      box-shadow:0 8px 32px rgba(0,0,0,.22);
      font-family:'Segoe UI',Arial,sans-serif; color:#333;
      padding:12px 14px; width:232px;
    }
    #__pd_tp__ .tp-hdr {
      display:flex; align-items:center; justify-content:space-between;
      font-size:13px; font-weight:700; margin-bottom:8px;
    }
    #__pd_tp__ .tp-hdr button {
      border:none; background:transparent; font-size:15px; color:#888;
      padding:2px 4px; cursor:pointer; line-height:1; font-family:inherit;
    }
    #__pd_tp__ .tp-lbl {
      font-size:10px; font-weight:700; color:#999; text-transform:uppercase;
      letter-spacing:.5px; margin:8px 0 5px;
    }
    #__pd_tp__ .tp-colors { display:flex; gap:8px; justify-content:space-between; }
    #__pd_tp__ .tp-colors button {
      width:30px; height:30px; flex:none; border-radius:50%; border:2px solid transparent;
      box-shadow:0 0 0 1px rgba(0,0,0,.12) inset; cursor:pointer; padding:0;
      position:relative;
    }
    #__pd_tp__ .tp-colors button.on {
      border-color:#4a4aff; box-shadow:0 0 0 2px #fff inset, 0 0 0 1px rgba(0,0,0,.12);
    }
    /* The picker is a swatch like the others, with the current colour inside */
    #__pd_tp__ .tp-colors .tp-pick { overflow:hidden; }
    #__pd_tp__ .tp-colors .tp-pick input {
      position:absolute; inset:-6px; width:calc(100% + 12px); height:calc(100% + 12px);
      border:none; padding:0; background:transparent; cursor:pointer;
    }
    #__pd_tp__ .tp-size { display:flex; align-items:center; gap:9px; }
    #__pd_tp__ .tp-size input[type=range] { flex:1; min-width:0; accent-color:#4a4aff; cursor:pointer; }
    #__pd_tp__ .tp-size .tp-val {
      width:26px; text-align:right; font-size:13px; font-weight:700;
      font-variant-numeric:tabular-nums;
    }
    /* While a tool's pop-over is open, that button's hover tooltip would land
       right on top of it. Two selectors so this also wins against the
       pen-hover rule in the android block. */
    #__pd_tb__ button.pd-tp-open .tt,
    #__pd_tb__ button.pd-tp-open.pd-pen-hover .tt { display:none; }

    #__pd_tp__ .tp-mode { display:flex; gap:6px; }
    #__pd_tp__ .tp-mode button {
      flex:1; height:30px; border-radius:9px; border:1.5px solid #ddd;
      background:#fafafa; font-family:inherit; font-size:11.5px; color:#444; cursor:pointer;
    }
    #__pd_tp__ .tp-mode button.on { background:#eff6ff; border-color:#60a5fa; color:#1d4ed8; font-weight:700; }
    /* Colours are a subscription feature in the app: the section stays visible
       (and padlocked) rather than disappearing, so people know it exists. */
    #__pd_tp__ .tp-colors.pd-locked { opacity:.55; }
    #__pd_tp__ .tp-colors.pd-locked button::after {
      content:'🔒'; position:absolute; top:-5px; right:-5px; font-size:9px; line-height:1;
    }

    /* The shortcut bar's bin duplicates the toolbar's — keep only one.
       (On phone the toolbar hides its own, so there the bin lives here.) */
    #__pd_sc__ #bClearSc { display:none; }

    /* ══ REGION CAPTURE (drag-to-select) ══
       The overlay covers the page area only — never the toolbar — so the shot
       can't contain our own UI and the ✕ stays reachable to back out. */
    #__pd_sel__ {
      position:fixed; z-index:2147483646; pointer-events:all;
      cursor:crosshair; touch-action:none; overflow:hidden;
      background:rgba(18,18,38,.30);
    }
    /* Once a rectangle exists the dim comes from its outward shadow instead,
       so the selection is a true hole and not a lighter shade of the overlay. */
    #__pd_sel__.dragging { background:transparent; }
    #__pd_sel__ .sel-box {
      position:absolute; display:none;
      border:1.5px solid #fff; border-radius:2px;
      box-shadow:0 0 0 100vmax rgba(18,18,38,.30), 0 0 0 1px rgba(0,0,0,.45) inset;
    }
    #__pd_sel__ .sel-hint {
      position:absolute; top:16px; left:50%; transform:translateX(-50%);
      background:#1a1a2e; color:#fff; font-family:'Segoe UI',Arial,sans-serif;
      font-size:12.5px; font-weight:600; padding:9px 16px; border-radius:999px;
      white-space:nowrap; pointer-events:none; box-shadow:0 4px 18px rgba(0,0,0,.35);
      transition:opacity .15s;
    }
    #__pd_sel__.dragging .sel-hint { opacity:.25; }
    #__pd_sel__ .sel-size {
      position:absolute; display:none;
      background:#1a1a2e; color:#fff; font-family:'Segoe UI',Arial,sans-serif;
      font-size:11px; font-weight:700; padding:3px 7px; border-radius:5px;
      white-space:nowrap; pointer-events:none; font-variant-numeric:tabular-nums;
    }

    /* ══ SETTINGS PANEL ══ */
    #__pd_cfg__ {
      position:fixed; right:8px; z-index:2147483647; pointer-events:all;
      background:#fff; border:1.5px solid #e0e0e0; border-radius:14px;
      box-shadow:0 8px 32px rgba(0,0,0,.22);
      font-family:'Segoe UI',Arial,sans-serif; font-size:13px; color:#333;
      padding:10px 14px; width:280px; display:none;
      /* A short window: the panel scrolls inside instead of being cut off
         (max-height is set to the room left when it opens). */
      max-height:calc(100vh - 16px); overflow-y:auto; overscroll-behavior:contain;
    }
    #__pd_cfg__ .cfg-check { display:flex; align-items:center; gap:8px; font-size:12.5px; font-weight:600; color:inherit; cursor:pointer; margin:2px 0 4px; }
    #__pd_cfg__ .cfg-check input { width:16px; height:16px; accent-color:#4a4aff; cursor:pointer; margin:0; }
    #__pd_cfg__ .cfg-hdr, #__pd_help__ .cfg-hdr { display:flex; align-items:center; justify-content:space-between; font-weight:700; font-size:14px; }
    #__pd_cfg__ .cfg-hdr button, #__pd_help__ .cfg-hdr button { border:none; background:transparent; font-size:16px; color:#888; padding:4px 8px; cursor:pointer; }
    #__pd_cfg__ .cfg-sec, #__pd_help__ .cfg-sec { font-size:10px; font-weight:700; color:#999; text-transform:uppercase; letter-spacing:.5px; margin:10px 0 5px; }
    /* The position pickers are laid out like the screen they describe: each
       button sits on the edge it docks the bar to, so the choice reads at a
       glance. The centre cell is the screen itself — "Oculta" for the shortcut
       bar, a plain screen marker for the toolbar, which can't be hidden. Every
       button owns a named grid area, so a cell hidden on phone (the lateral
       shortcut-bar options) leaves a gap instead of shifting its neighbours. */
    #__pd_cfg__ .cfg-pos {
      display:grid; gap:5px;
      grid-template-columns:repeat(3, 1fr);
      grid-template-areas:". top ." "left mid right" ". bottom .";
    }
    #__pd_cfg__ .cfg-pos button {
      height:30px; min-width:0; border-radius:9px; border:1.5px solid #ddd;
      background:#fafafa; font-family:inherit; font-size:11px; color:#444; cursor:pointer;
      padding:0 2px;
    }
    #__pd_cfg__ .cfg-pos [data-tbp="top"],    #__pd_cfg__ .cfg-pos [data-pos="top"]    { grid-area:top; }
    #__pd_cfg__ .cfg-pos [data-tbp="left"],   #__pd_cfg__ .cfg-pos [data-pos="left"]   { grid-area:left; }
    #__pd_cfg__ .cfg-pos [data-tbp="right"],  #__pd_cfg__ .cfg-pos [data-pos="right"]  { grid-area:right; }
    #__pd_cfg__ .cfg-pos [data-tbp="bottom"], #__pd_cfg__ .cfg-pos [data-pos="bottom"] { grid-area:bottom; }
    #__pd_cfg__ .cfg-pos [data-pos="hidden"], #__pd_cfg__ .cfg-pos .cfg-screen        { grid-area:mid; }
    #__pd_cfg__ .cfg-pos .cfg-screen {
      display:flex; align-items:center; justify-content:center;
      color:#c9c9d6; pointer-events:none;
    }
    /* One-tap swap: puts the toolbar where the shortcut bar is and vice versa.
       Both edges are reachable one by one from the rows below, but the thing
       people actually ask for is the swap itself. */
    #__pd_cfg__ .cfg-swap {
      width:100%; height:34px; margin:2px 0 4px; border-radius:9px;
      border:1.5px solid #d7d7e6; background:#f4f4fa; color:#44445a;
      font-family:inherit; font-size:11.5px; font-weight:600; cursor:pointer;
    }
    #__pd_cfg__ .cfg-swap:hover:not(:disabled) { background:#ececf8; border-color:#c2c2dd; }
    #__pd_cfg__ .cfg-swap:disabled { opacity:.38; cursor:not-allowed; }
    #__pd_cfg__ .cfg-auto.on { background:#eff6ff; border-color:#60a5fa; color:#1d4ed8; }
    #__pd_cfg__ .cfg-pos button.on { background:#eff6ff; border-color:#60a5fa; color:#1d4ed8; font-weight:700; }
    /* Edge already taken by the other bar */
    #__pd_cfg__ .cfg-pos button:disabled {
      opacity:.38; cursor:not-allowed; background:#f4f4f7; color:#999; font-weight:400;
    }
    #__pd_cfg__ .cfg-size { display:flex; align-items:center; gap:8px; margin:7px 0; }
    #__pd_cfg__ .cfg-size .lbl { width:100px; flex-shrink:0; }
    #__pd_cfg__ .cfg-size input[type=range] { flex:1; min-width:0; }
    #__pd_cfg__ .cfg-size .val { width:22px; text-align:right; font-weight:700; font-variant-numeric:tabular-nums; }
    #__pd_cfg__ .cfg-sub { margin-top:2px; }
    #__pd_cfg__ .cfg-sub button {
      width:100%; height:36px; border-radius:10px; border:none; cursor:pointer;
      background:linear-gradient(90deg,#4a4aff,#8b3dff); color:#fff;
      font-family:inherit; font-size:13px; font-weight:700;
    }
    #__pd_cfg__ .cfg-sub-ok { display:block; font-size:12.5px; font-weight:700; color:#16a34a; padding:4px 0; }
    #__pd_cfg__ .cfg-sub button.cfg-ghost {
      background:#f4f4fa; color:#44445a; border:1.5px solid #e0e0ea; font-weight:600;
    }
    /* Theme: three equal chips, the current one lit like the position pickers. */
    #__pd_cfg__ .cfg-theme { display:grid; grid-template-columns:repeat(3, 1fr); gap:5px; }
    #__pd_cfg__ .cfg-theme button {
      height:32px; min-width:0; border-radius:9px; border:1.5px solid #ddd;
      background:#fafafa; font-family:inherit; font-size:11.5px; color:#444; cursor:pointer;
      padding:0 2px; white-space:nowrap;
    }
    #__pd_cfg__ .cfg-theme button.on { background:#eff6ff; border-color:#60a5fa; color:#1d4ed8; font-weight:700; }

    /* ══ WHAT'S NEW NOTICE (extension only, inserted via JS) ══
       A small card in the bottom-left corner, clear of the store pill on the
       right. It comes back each time the toolbar opens until "Não avisar mais". */
    /* Toast ("também copiada"): a dark pill that reads on light and dark
       pages alike, so the dark theme leaves it as it is. Clicks pass through. */
    #__pd_toast__ {
      position:fixed; z-index:2147483647; pointer-events:none;
      transform:translate(-50%, -100%) translateY(8px); opacity:0;
      transition:opacity .2s, transform .2s;
      max-width:min(420px, calc(100vw - 32px)); box-sizing:border-box;
      background:#1f1f2e; color:#fff; border-radius:14px; padding:13px 20px;
      box-shadow:0 10px 32px rgba(0,0,0,.35); border:1.5px solid rgba(255,255,255,.14);
      font-family:'Segoe UI',Arial,sans-serif; font-size:15px; font-weight:700;
      line-height:1.4; text-align:center;
    }
    #__pd_toast__.show { opacity:1; transform:translate(-50%, -100%); }
    /* Over the captured area: centred on it, where the eyes already are. */
    #__pd_toast__.at-area { transform:translate(-50%, -50%) scale(.96); }
    #__pd_toast__.at-area.show { transform:translate(-50%, -50%); }
    /* "Mandar para o caderno" after a capture: the toast's dark card, but
       clickable — it reads on light and dark pages alike, like the toast. */
    #__pd_notes__ {
      position:fixed; z-index:2147483647; pointer-events:all; transform:translate(-50%, -100%);
      display:flex; flex-direction:column; align-items:stretch; gap:6px;
      min-width:250px; max-width:min(340px, calc(100vw - 32px)); box-sizing:border-box;
      background:#1f1f2e; color:#fff; border-radius:14px; padding:8px;
      box-shadow:0 10px 32px rgba(0,0,0,.35); border:1.5px solid rgba(255,255,255,.14);
      font-family:'Segoe UI',Arial,sans-serif; font-size:14px; line-height:1.3;
    }
    #__pd_notes__.row { flex-direction:row; align-items:center; }
    #__pd_notes__.row .nc-main { flex:1; }
    #__pd_notes__ button {
      margin:0; font-family:inherit; line-height:1.2; text-transform:none; letter-spacing:normal;
      cursor:pointer; border-radius:10px; border:1px solid transparent; box-sizing:border-box;
    }
    #__pd_notes__ .nc-main {
      flex:none; height:38px; padding:0 14px; white-space:nowrap; font-size:14px; font-weight:700; color:#fff;
      background:linear-gradient(180deg,#5c5cff 0%,#4a4aff 100%); border-color:#4038e6;
    }
    #__pd_notes__ .nc-main:hover { background:linear-gradient(180deg,#6a6aff 0%,#5555ff 100%); }
    #__pd_notes__ .nc-x { width:32px; height:32px; padding:0; background:transparent; color:#9a9ab4; font-size:14px; }
    #__pd_notes__ .nc-x:hover { color:#fff; background:rgba(255,255,255,.08); }
    #__pd_notes__ .nc-hdr { padding:6px 8px 2px; font-size:13px; font-weight:700; color:#d8d8ea; }
    #__pd_notes__ .nc-list { display:flex; flex-direction:column; gap:2px; max-height:260px; overflow:auto; }
    #__pd_notes__ .nc-list button {
      text-align:left; padding:9px 10px; background:transparent; color:#fff; font-size:13.5px;
      white-space:nowrap; overflow:hidden; text-overflow:ellipsis;
    }
    #__pd_notes__ .nc-list button:hover { background:rgba(255,255,255,.08); }
    #__pd_notes__ .nc-list .nc-new { color:#a9adff; font-weight:700; }
    #__pd_notes__ .nc-list .nc-folder { display:block; margin-top:1px; font-size:11.5px; color:#9a9ab4; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
    #__pd_notes__ .nc-find { display:block; width:100%; box-sizing:border-box; margin:0 0 6px; height:32px; padding:0 10px; border-radius:8px; border:1px solid #3a3a52; background:#262636; color:#fff; font:inherit; font-size:13px; outline:none; }
    #__pd_notes__ .nc-find:focus { border-color:#7c7cff; }
    #__pd_notes__ .nc-alt { background:rgba(255,255,255,.08); color:#e4e4f2; font-weight:700; white-space:nowrap; }
    #__pd_notes__ .nc-alt:hover { background:rgba(255,255,255,.14); }
    #__pd_notes__ .nc-seg { display:flex; gap:4px; padding:3px; margin:4px 0 6px; border-radius:9px; background:#262636; }
    #__pd_notes__ .nc-seg button { flex:1; height:28px; font-size:12.5px; background:transparent; color:#b4b4c8; }
    #__pd_notes__ .nc-seg button.on { background:#4a4aff; color:#fff; }
    #__pd_notes__ .nc-txt { display:block; width:100%; box-sizing:border-box; min-height:74px; padding:8px 10px; border-radius:8px; border:1px solid #3a3a52; background:#262636; color:#fff; font:inherit; font-size:13px; outline:none; resize:vertical; }
    #__pd_notes__ .nc-txt:focus { border-color:#7c7cff; }
    #__pd_notes__ .nc-acts { display:flex; justify-content:flex-end; gap:6px; margin-top:6px; }

    /* The toolbar tour: a ring around the tool (its shadow dims the rest) and a card. */
    #__pd_tour__ { position:fixed; inset:0; z-index:2147483647; pointer-events:all; font-family:'Segoe UI',Arial,sans-serif; }
    #__pd_tour__ .pt-ring { position:fixed; border-radius:12px; box-shadow:0 0 0 9999px rgba(10,10,30,.58); outline:2px solid #8b8bff; outline-offset:2px;
      transition:left .35s cubic-bezier(.2,.8,.2,1), top .35s cubic-bezier(.2,.8,.2,1), width .35s, height .35s; animation:ptPulse 1.6s ease-in-out infinite; }
    #__pd_tour__ .pt-ring.none { left:50% !important; top:50% !important; width:0 !important; height:0 !important; outline:0; }
    @keyframes ptPulse { 50% { outline-color:#c4b5fd; outline-offset:5px; } }
    #__pd_tour__ .pt-card { position:fixed; width:320px; max-width:calc(100vw - 24px); box-sizing:border-box; padding:16px 18px 14px; border-radius:16px; color:#fff;
      background:linear-gradient(160deg,#1d1d3c,#121228); box-shadow:0 24px 60px rgba(0,0,0,.45), 0 0 0 1px rgba(255,255,255,.08);
      transition:left .35s cubic-bezier(.2,.8,.2,1), top .35s cubic-bezier(.2,.8,.2,1); }
    #__pd_tour__ .pt-top { display:flex; align-items:center; justify-content:space-between; margin-bottom:6px; }
    #__pd_tour__ .pt-n { font:700 11px/1 'Consolas',monospace; letter-spacing:.12em; color:#a5a5ff; }
    #__pd_tour__ .pt-skip { border:0; background:none; color:rgba(255,255,255,.6); font:12.5px 'Segoe UI',Arial,sans-serif; cursor:pointer; padding:2px 4px; }
    #__pd_tour__ .pt-skip:hover { color:#fff; }
    #__pd_tour__ .pt-t { font-size:16.5px; font-weight:700; margin:2px 0 6px; }
    #__pd_tour__ .pt-b { font-size:13.5px; line-height:1.5; color:rgba(255,255,255,.78); }
    #__pd_tour__ .pt-bar { height:4px; border-radius:2px; background:rgba(255,255,255,.12); margin:12px 0; overflow:hidden; }
    #__pd_tour__ .pt-bar i { display:block; height:100%; background:linear-gradient(90deg,#4a4aff,#8b3dff,#22d3ee); transition:width .35s; }
    #__pd_tour__ .pt-acts { display:flex; justify-content:flex-end; gap:8px; }
    #__pd_tour__ .pt-acts button { border-radius:99px; padding:8px 16px; font:600 13px 'Segoe UI',Arial,sans-serif; cursor:pointer; }
    #__pd_tour__ .pt-back { border:1px solid rgba(255,255,255,.2); background:none; color:#fff; }
    #__pd_tour__ .pt-go { border:0; color:#fff; background:linear-gradient(135deg,#4a4aff,#8b3dff); box-shadow:0 8px 20px -8px rgba(110,80,255,.9); }
    #__pd_tour__ .pt-card.hero { text-align:center; }
    #__pd_tour__ .pt-card.hero .pt-logo { width:54px; height:54px; border-radius:14px; display:block; margin:6px auto 8px; box-shadow:0 0 0 8px rgba(139,61,255,.15), 0 0 40px rgba(139,61,255,.5); }
    #__pd_tour__ .pt-card.hero .pt-acts { justify-content:center; }
    #__pd_cfg__ .cfg-tour { width:100%; margin:2px 0 6px; }

    /* The Android app, in the bottom-right corner. */
    /* Above the Highlights' corner buttons (home, crop, pen, panel), not over them. */
    #__pd_droid__ {
      position:fixed; right:18px; bottom:76px; z-index:2147483646; pointer-events:all;
      width:290px; max-width:calc(100vw - 36px); box-sizing:border-box; padding:13px 14px 12px;
      background:linear-gradient(160deg,#1d1d3c,#121228); color:#fff; border-radius:16px;
      box-shadow:0 14px 40px rgba(0,0,0,.35), 0 0 0 1px rgba(255,255,255,.08);
      font-family:'Segoe UI',Arial,sans-serif; animation:pdNewsIn .25s ease-out;
    }
    #__pd_droid__ .dr-x { position:absolute; top:8px; right:8px; border:0; background:none; color:#9a9ab8; font-size:13px; cursor:pointer; padding:4px 6px; border-radius:6px; }
    #__pd_droid__ .dr-x:hover { background:rgba(255,255,255,.08); color:#fff; }
    #__pd_droid__ .dr-top { display:flex; align-items:center; gap:9px; padding-right:20px; }
    #__pd_droid__ .dr-top img { width:26px; height:26px; border-radius:7px; }
    #__pd_droid__ .dr-top b { font-size:13.5px; line-height:1.25; }
    #__pd_droid__ .dr-body { margin:8px 0 10px; font-size:12.5px; line-height:1.45; color:rgba(255,255,255,.72); }
    #__pd_droid__ .dr-acts { display:flex; gap:6px; }
    #__pd_droid__ button.dr-go { flex:1; border:0; border-radius:99px; padding:8px 12px; font:600 12.5px 'Segoe UI',Arial,sans-serif; color:#fff; cursor:pointer; background:linear-gradient(135deg,#4a4aff,#8b3dff); }
    #__pd_droid__ button.dr-never { border:1px solid rgba(255,255,255,.18); background:none; color:rgba(255,255,255,.65); border-radius:99px; padding:8px 10px; font:12px 'Segoe UI',Arial,sans-serif; cursor:pointer; }
    /* Black Friday da Notes (2026), the same card in the bottom-left corner. */
    #__pd_bf__ {
      position:fixed; left:18px; bottom:18px; z-index:2147483646; pointer-events:all;
      width:290px; max-width:calc(100vw - 36px); box-sizing:border-box; padding:13px 14px 12px;
      background:linear-gradient(160deg,#1d1d3c,#121228); color:#fff; border-radius:16px;
      box-shadow:0 14px 40px rgba(0,0,0,.35), 0 0 0 1px rgba(255,255,255,.08);
      font-family:'Segoe UI',Arial,sans-serif; animation:pdNewsIn .25s ease-out;
    }
    #__pd_bf__ .dr-x { position:absolute; top:8px; right:8px; border:0; background:none; color:#9a9ab8; font-size:13px; cursor:pointer; padding:4px 6px; border-radius:6px; }
    #__pd_bf__ .dr-x:hover { background:rgba(255,255,255,.08); color:#fff; }
    #__pd_bf__ .dr-top { display:flex; align-items:center; gap:9px; padding-right:20px; }
    #__pd_bf__ .dr-top img { width:26px; height:26px; border-radius:7px; }
    #__pd_bf__ .dr-top b { font-size:13.5px; line-height:1.25; }
    #__pd_bf__ .dr-body { margin:8px 0 10px; font-size:12.5px; line-height:1.45; color:rgba(255,255,255,.72); }
    #__pd_bf__ .dr-acts { display:flex; gap:6px; }
    #__pd_bf__ button.dr-go { flex:1; border:0; border-radius:99px; padding:8px 12px; font:600 12.5px 'Segoe UI',Arial,sans-serif; color:#fff; cursor:pointer; background:linear-gradient(135deg,#4a4aff,#8b3dff); }
    #__pd_bf__ button.dr-never { border:1px solid rgba(255,255,255,.18); background:none; color:rgba(255,255,255,.65); border-radius:99px; padding:8px 10px; font:12px 'Segoe UI',Arial,sans-serif; cursor:pointer; }
    #__pd_promo__ { all:initial; }

    #__pd_news__ {
      position:fixed; left:18px; bottom:18px; z-index:2147483647; pointer-events:all;
      width:300px; max-width:calc(100vw - 36px); box-sizing:border-box;
      background:#fff; border:1.5px solid #e0e0e0; border-radius:14px;
      box-shadow:0 8px 32px rgba(0,0,0,.22);
      font-family:'Segoe UI',Arial,sans-serif; color:#333;
      padding:13px 14px 12px; animation:pdNewsIn .25s ease-out;
    }
    @keyframes pdNewsIn { from { opacity:0; transform:translateY(10px); } to { opacity:1; transform:none; } }
    #__pd_news__ .nw-x {
      position:absolute; top:6px; right:6px; border:none; background:transparent;
      font-size:14px; color:#999; padding:4px 7px; cursor:pointer; line-height:1; font-family:inherit;
    }
    #__pd_news__ .nw-tag {
      display:inline-block; font-size:9.5px; font-weight:800; letter-spacing:.5px;
      text-transform:uppercase; color:#fff; padding:2px 8px; border-radius:999px;
      background:linear-gradient(90deg,#4a4aff,#8b3dff);
    }
    #__pd_news__ .nw-title { font-size:14px; font-weight:800; color:#26263a; margin:7px 0 4px; }
    #__pd_news__ .nw-body { font-size:12.5px; color:#55556a; line-height:1.45; }
    #__pd_news__ .nw-actions { display:flex; gap:8px; margin-top:11px; }
    #__pd_news__ .nw-actions button {
      flex:1; height:32px; border-radius:9px; font-family:inherit;
      font-size:12px; font-weight:700; cursor:pointer;
    }
    #__pd_news__ .nw-try { border:none; background:linear-gradient(90deg,#4a4aff,#8b3dff); color:#fff; }
    #__pd_news__ .nw-never { border:1.5px solid #e0e0ea; background:#f4f4fa; color:#55556a; }

    /* ══ KEYBOARD SHORTCUTS PANEL (extension only) ══ */
    #__pd_help__ {
      position:fixed; right:8px; z-index:2147483647; pointer-events:all;
      background:#fff; border:1.5px solid #e0e0e0; border-radius:14px;
      box-shadow:0 8px 32px rgba(0,0,0,.22);
      font-family:'Segoe UI',Arial,sans-serif; font-size:13px; color:#333;
      padding:10px 14px; width:296px; display:none;
      max-height:calc(100vh - 16px); overflow-y:auto; overscroll-behavior:contain;
      max-height:calc(100vh - 90px); overflow-y:auto;
    }
    #__pd_help__ .hk-row { display:flex; align-items:center; justify-content:space-between; gap:12px; padding:3px 0; }
    #__pd_help__ .hk-row span:first-child { display:flex; align-items:center; gap:9px; min-width:0; flex:1; }
    #__pd_help__ .hk-ic { display:inline-flex; width:22px; height:22px; flex-shrink:0; align-items:center; justify-content:center; border-radius:6px; background:rgba(74,74,255,.12); color:#7d7dff; font-style:normal; }
    #__pd_help__ .hk-ic svg { width:14px; height:14px; }
    #__pd_help__ .hk-keys { white-space:nowrap; flex-shrink:0; color:#bbb; font-size:11px; }
    #__pd_help__ .hk-legend {
      margin:6px 0 2px; padding:8px 10px; background:#f6f6fb; border:1px solid #e4e4ee;
      border-radius:9px; font-size:11px; color:#66667a; line-height:1.5;
    }
    #__pd_help__ kbd {
      display:inline-block; background:#f5f5f7; border:1px solid #dcdce3;
      border-bottom-width:2px; border-radius:5px; padding:2px 6px;
      font-family:inherit; font-size:11px; font-weight:700; color:#444;
      min-width:11px; text-align:center;
    }
    #__pd_help__ .hk-mouse {
      margin-top:8px; padding:8px 10px; background:#f0fdf4; border:1px solid #86efac;
      border-radius:9px; font-size:11.5px; color:#15803d; line-height:1.45;
    }
    #__pd_help__ .hk-mouse { display:flex; gap:8px; align-items:flex-start; }
    #__pd_help__ .hk-mouse svg { flex-shrink:0; margin-top:1px; }

    /* ══ ANDROID RELEASE NOTICE (extension only, inserted via JS) ══ */
    /* Announcement modal */
    #__pd_android_modal__ {
      position:fixed; inset:0; z-index:2147483647; display:flex;
      align-items:center; justify-content:center; padding:20px;
      background:rgba(15,15,35,.55); font-family:'Segoe UI',Arial,sans-serif;
    }
    #__pd_android_modal__ .am-card {
      background:#fff; border-radius:20px; max-width:470px; width:100%;
      padding:28px 26px; text-align:center; box-shadow:0 16px 52px rgba(0,0,0,.38);
    }
    /* Three plans side by side. The eye should land on the lifetime card:
       it is the one lifted off the row, in brand colour, with the badge. */
    #__pd_android_modal__ .am-plans {
      display:grid; grid-template-columns:repeat(3, 1fr); gap:9px;
      margin:20px 0 6px; text-align:left;
    }
    #__pd_android_modal__ .am-plan {
      position:relative; border:1.5px solid #ececf4; border-radius:13px;
      padding:13px 11px 11px; background:#fff;
    }
    #__pd_android_modal__ .am-plan-name {
      font-size:10px; font-weight:700; letter-spacing:.6px; text-transform:uppercase;
      color:#9a9aae;
    }
    #__pd_android_modal__ .am-plan-price {
      font-size:16px; font-weight:800; color:#26263a; margin-top:5px; line-height:1.1;
    }
    #__pd_android_modal__ .am-plan-price span { font-size:11px; font-weight:600; color:#8a8a99; }
    #__pd_android_modal__ .am-plan-note { font-size:10.5px; color:#77778a; margin-top:6px; line-height:1.35; }
    #__pd_android_modal__ .am-plan-badge {
      position:absolute; top:-9px; left:50%; transform:translateX(-50%);
      font-size:9px; font-weight:800; letter-spacing:.4px; white-space:nowrap;
      padding:3px 8px; border-radius:999px; background:#ffe873; color:#4d4000;
    }
    #__pd_android_modal__ .am-best {
      border-color:#8b3dff; background:linear-gradient(180deg,#f8f5ff,#fff);
      box-shadow:0 8px 22px rgba(139,61,255,.20); transform:translateY(-4px);
    }
    #__pd_android_modal__ .am-best .am-plan-badge {
      background:linear-gradient(90deg,#4a4aff,#8b3dff); color:#fff;
    }
    #__pd_android_modal__ .am-best .am-plan-name { color:#7a3ad6; }
    /* Narrow windows: one under the other, and nothing sticking out. */
    @media (max-width:560px) {
      #__pd_android_modal__ .am-plans { grid-template-columns:1fr; gap:14px; }
      #__pd_android_modal__ .am-best { transform:none; }
    }
    #__pd_android_modal__ .am-emoji { font-size:40px; line-height:1; }
    #__pd_android_modal__ .am-logo { display:block; width:56px; height:56px; margin:0 auto; }
    #__pd_android_modal__ h2 {
      font-size:19px; font-weight:800; color:#26263a; margin:12px 0 8px;
    }
    #__pd_android_modal__ p {
      font-size:13.5px; color:#55556a; line-height:1.6; margin:0;
    }
    #__pd_android_modal__ p + p { margin-top:10px; }
    #__pd_android_modal__ p.am-fine { font-size:12px; color:#8a8a99; }
    #__pd_android_modal__ .am-cta {
      display:block; margin:18px 0 14px; padding:13px;
      background:linear-gradient(90deg,#4a4aff,#8b3dff); color:#fff;
      text-decoration:none; font-weight:700; font-size:14px; border-radius:13px;
    }
    #__pd_android_modal__ .am-check {
      display:flex; align-items:center; justify-content:center; gap:7px;
      font-size:12.5px; color:#77778a; cursor:pointer; user-select:none;
    }
    #__pd_android_modal__ .am-check input { cursor:pointer; }
    #__pd_android_modal__ .am-close {
      margin-top:12px; border:none; background:transparent; color:#8a8a99;
      font-size:12.5px; cursor:pointer; text-decoration:underline;
      font-family:inherit;
    }
  `;

  // Android/WebView: small-screen + touch adjustments layered on top
  if (PD_ENV === 'android') {
    styleEl.textContent += `
    /* ══ ANDROID (WebView) OVERRIDES ══ */
    #__pd_tb__ .pd-row { flex-wrap:wrap; justify-content:center; padding:4px 6px; gap:4px; }
    /* Brand on tablet: logo + name only — no store link, no rating subtitle.
       It is absolutely positioned on the left while the buttons are centred,
       so it must be hidden whenever the buttons would grow into its space.
       Measured: buttons need 858px, brand is 165px — below ~1200px they
       collide, which is what made the logo overlap the tools in portrait. */
    #__pd_brand__ { pointer-events:none; }
    #__pd_brand__ .brand-sub { display:none; }
    /* (the width-based hiding now lives in the shared block above) */

    /* Tablet portrait (~788px): the full set needs 858px, so trim it down to
       one row instead of wrapping — the size label goes (the number beside the
       slider already says it), the slider narrows, the gap tightens and the
       recent-colour swatches drop (the active colour swatch stays).
       The row is left- or right-aligned rather than centred, so the buttons sit
       under the hand that reaches for them — .pd-tb-right is for left-handers. */
    /* "⋮" menu (phone only): the tools a phone-width bar has no room for,
       plus Caneta na tela, settings and fullscreen. */
    #__pd_tb__ #bMore { display:none; }
    #__pd_more__ {
      position:fixed; z-index:2147483647; pointer-events:all; display:none;
      background:#fff; border:1.5px solid #e0e0e0; border-radius:14px;
      box-shadow:0 8px 32px rgba(0,0,0,.22); padding:6px;
      font-family:'Segoe UI',Arial,sans-serif; min-width:200px;
      max-height:calc(100vh - 16px); overflow-y:auto;
    }
    #__pd_more__ button {
      display:flex; align-items:center; gap:12px; width:100%;
      border:none; background:transparent; border-radius:9px;
      padding:9px 10px; font-family:inherit; font-size:14px; color:#333;
      text-align:left; cursor:pointer;
    }
    #__pd_more__ button svg { width:18px; height:18px; flex-shrink:0; transform:none; }
    #__pd_more__ button:active, #__pd_more__ button.on { background:#eff6ff; color:#1d4ed8; }
    #__pd_more__ button.pd-locked { opacity:.55; }
    #__pd_more__ button.pd-locked::after { content:'🔒'; font-size:11px; margin-left:auto; }
    #__pd_more__ .mr-sep { height:1px; background:#ececf2; margin:4px 6px; }
    /* Phone: every tool stays on the bar (no "⋮" menu); a bar that doesn't
       fit scrolls inside — down the column, or sideways along the top. */
    @media (max-width:600px) {
      #__pd_tb__.pd-tb-top, #__pd_tb__.pd-tb-bottom { overflow-x:auto; overflow-y:hidden; -webkit-overflow-scrolling:touch; scrollbar-width:none; }
      #__pd_tb__.pd-tb-top .pd-row, #__pd_tb__.pd-tb-bottom .pd-row { flex-wrap:nowrap; width:max-content; }
      #__pd_tb__::-webkit-scrollbar { display:none; }
    }

    /* Compaction for the horizontal bar where it would otherwise wrap. */
    @media (min-width:601px) and (max-width:880px) {
      #__pd_tb__.pd-tb-top .pd-row { gap:2px; padding:4px 6px; }
      #__pd_tb__.pd-tb-top .pd-lbl { display:none; }
      #__pd_tb__.pd-tb-top #__pd_recent__ { display:none; }
    }
    #__pd_tb__ button { min-width:36px; min-height:36px; }
    /* Touch has no hover, so tooltips stay hidden — but a stylus DOES hover.
       The pointerover handler tags the hovered button with .pd-pen-hover
       (pen only), which reveals its label. Two classes + an id outrank the
       hide rule, so no !important is needed on either side. */
    #__pd_tb__ .tt, #__pd_sc__ .tt { display:none; }
    #__pd_tb__ button.pd-pen-hover .tt,
    #__pd_sc__ button.pd-pen-hover .tt { display:block; opacity:1; }
    /* Post-it/text tool doesn't work well on touch — hidden on tablet */
    #__pd_tb__ #bText { display:none; }
    /* No ✕ in the app: the tools are always on (MainActivity re-injects this
       file on every page), so a close button would only lead to a state the
       app immediately undoes. */
    #__pd_tb__ #bClose { display:none; }
    /* Locked (subscription) controls: dimmed with a small padlock. Still
       tappable — tapping is what opens the paywall — so no pointer-events:none.
       The padlock is a pseudo-element, which replaced elements like
       <input type=color> can't render, so those only get the dimming. */
    #__pd_tb__ .pd-locked { opacity:.55; }
    #__pd_tb__ button.pd-locked::after {
      content:'🔒'; position:absolute; top:-4px; right:-4px;
      font-size:9px; line-height:1; filter:grayscale(.2);
    }
    /* Shortcut bar locked: the bar itself stays fully opaque — dimming the
       whole panel made it look disabled/broken — and each button carries its
       own padlock instead, matching the toolbar's locked tools. */
    #__pd_sc__.pd-locked .sc-row button::after {
      content:'🔒'; position:absolute; top:-4px; right:-4px;
      font-size:9px; line-height:1; filter:grayscale(.2); pointer-events:none;
    }
    /* Shortcut panel: fixed (no dragging on touch) → hide drag dots, slimmer.
       Docked flush to the bottom edge, always a single row (scrolls sideways
       internally if it doesn't fit the screen width) */
    #__pd_sc__ .sc-drag { display:none; }
    #__pd_sc__ { bottom:0; padding:4px 8px; max-width:100vw; border-radius:14px 14px 0 0; border-bottom:none; overflow-x:auto; }
    /* Top dock mirrors that flush bottom dock: tight to the edge, rounded on
       the side that faces the page. */
    #__pd_sc__.pd-pos-top { top:0; border-radius:0 0 14px 14px; border-top:none; border-bottom:1.5px solid #e0e0e0; }
    /* Flush bottom-docking removed the bottom border; restore it when lateral.
       Tablet also gets internal scrolling when the column is taller than the
       screen (tooltips are hidden here, so clipping is harmless). */
    #__pd_sc__.pd-pos-left, #__pd_sc__.pd-pos-right {
      border-bottom:1.5px solid #e0e0e0;
      max-height:92vh; overflow-y:auto; overflow-x:hidden;
    }

    /* ══ PHONE OVERRIDES (keeps the tablet layout, trims it down) ══
       Same sw600dp threshold Android itself uses to tell phone from tablet. */
    @media (max-width:600px) {
      /* The draw toolbar keeps every tool here too (it scrolls instead, see
         above). Shortcut bar: keep only the alternatives (A-E), "próx. não
         resolvida" and the clear button; drop prev/next/random/professor/
         forum/stats. The "Ver:" group's separator goes with them. */
      #__pd_sc__ #bPrev, #__pd_sc__ #bNext, #__pd_sc__ #bRand,
      #__pd_sc__ #bProf, #__pd_sc__ #bForum, #__pd_sc__ #bStats,
      #__pd_sc__ #scSepVer { display:none; }
      /* Group labels ("Resposta:", "Alternativa:", "Nav:") hidden — the icons
         alone are compact enough without them on a small screen. */
      #__pd_sc__ .sc-lbl { display:none; }
      /* Lateral docking isn't offered for the shortcut bar on a phone — a tall
         thin column doesn't fit. Top/bottom stay, so the two bars can still be
         swapped here ("Superior", "Inferior" and "Oculta" remain). */
      #__pd_cfg__ .cfg-pos button[data-pos="left"],
      #__pd_cfg__ .cfg-pos button[data-pos="right"] { display:none; }
      /* Toolbar icons 25% smaller (emoji/text glyphs + inline SVG). Button
         containers/touch targets are left untouched — only the glyph inside
         shrinks — so tap targets stay comfortable on a small screen. */
      #__pd_tb__ button { font-size:11.25px; }
      #__pd_tb__ button svg { transform:scale(.75); }
      /* Shortcut bar (bottom toolbar) icons: same idea, another 20% on top
         (0.75 × 0.8 = 0.6 / 13px,18px base → 7.8px,10.8px). */
      #__pd_sc__ button { font-size:7.8px; }
      #__pd_sc__ button.ok, #__pd_sc__ button.no { font-size:10.8px; }
      #__pd_sc__ button.lt { font-size:7.8px; }
      #__pd_sc__ button svg { transform:scale(.6); }
    }
    `;
  }
  document.head.appendChild(styleEl);

  // Dark palette. Every selector repeats the one it recolours, and the sheet
  // comes after the main one, so at equal specificity it wins — and it only
  // ever touches colours, never layout. applyTheme() switches it on and off.
  darkStyleEl = document.createElement('style');
  darkStyleEl.id = '__pd_dark__';
  darkStyleEl.media = 'not all';
  darkStyleEl.textContent = `
    /* ── Toolbar ── */
    #__pd_tb__, #__pd_tb__.pd-tb-left, #__pd_tb__.pd-tb-right, #__pd_tb__.pd-tb-bottom {
      background:#1c1c28; border-color:#33334a;
    }
    #__pd_tb__ .pd-sep { background:#33334a; }
    #__pd_tb__ .pd-sz-lbl { color:#a0a0b4; }
    #__pd_brand__:hover { background:rgba(124,124,255,.12); border-color:#44447a; box-shadow:none; }
    #__pd_brand__ .brand-name {
      background:linear-gradient(90deg,#8f8fff 0%,#b98aff 100%);
      -webkit-background-clip:text; background-clip:text; color:#8f8fff;
    }
    #__pd_tb__ button { background:#262636; border-color:#36364c; color:#d6d6e4; }
    #__pd_tb__ button:hover {
      background:#2e2e52; border-color:#5c5cff; color:#c9c9ff;
      box-shadow:0 3px 8px rgba(0,0,0,.35);
    }
    #__pd_tb__ input[type=color] { background:#262636; border-color:#36364c; }
    #__pd_tb__ .pd-recent .pd-sw { border-color:rgba(255,255,255,.22); }
    #__pd_tb__ .pd-recent .pd-sw.active { border-color:#8f8fff; box-shadow:0 0 0 2px #1c1c28,0 0 0 3.5px #8f8fff; }
    #__pd_tb__ .pd-recent .pd-sw.active:hover { box-shadow:0 0 0 2px #1c1c28,0 0 0 3.5px #8f8fff,0 2px 7px rgba(0,0,0,.4); }
    /* The ✕ carries its colours inline, hence the !important. */
    #__pd_tb__ #bClose, #__pd_sc__ #bClearSc {
      background:rgba(239,68,68,.12)!important; border-color:rgba(248,113,113,.45)!important; color:#f87171!important;
    }
    #__pd_tb__ button .tt, #__pd_sc__ button .tt { background:#000; }
    #__pd_social__ .ps-btn { background:#1c1c28; border-color:#36364c; color:#a8a8bc; }
    #__pd_social__ .ps-contact:hover .ps-btn, #__pd_social__ .ps-contact.open .ps-btn {
      background:#26263a; border-color:#44447a; color:#b4b4ff;
    }
    #__pd_social__ .ps-menu-in { background:#1c1c28; border-color:#33334a; box-shadow:0 12px 32px rgba(0,0,0,.5); }
    #__pd_social__ .ps-item { color:#e4e4ee; }
    #__pd_social__ .ps-item:hover { background:rgba(255,255,255,.06); }
    #__pd_social__ .ps-txt small { color:#8a8aa0; }

    /* ── Shortcut bar ── */
    #__pd_sc__, #__pd_sc__.pd-pos-top, #__pd_sc__.pd-pos-left, #__pd_sc__.pd-pos-right {
      background:#1c1c28; border-color:#33334a; box-shadow:0 4px 24px rgba(0,0,0,.45);
    }
    #__pd_sc__ .sc-drag { color:#55556a; }
    #__pd_sc__ .sc-sep { background:#33334a; }
    #__pd_sc__ .sc-lbl { color:#7c7c92; }
    #__pd_sc__ button.ok { background:rgba(34,197,94,.13); border-color:rgba(74,222,128,.45); color:#4ade80; }
    #__pd_sc__ button.ok:hover { background:rgba(34,197,94,.24); border-color:#4ade80; box-shadow:none; }
    #__pd_sc__ button.no { background:rgba(239,68,68,.13); border-color:rgba(248,113,113,.45); color:#f87171; }
    #__pd_sc__ button.no:hover { background:rgba(239,68,68,.24); border-color:#f87171; box-shadow:none; }
    #__pd_sc__ button.lt { background:rgba(245,158,11,.12); border-color:rgba(251,191,36,.42); color:#fbbf24; }
    #__pd_sc__ button.lt:hover { background:rgba(245,158,11,.22); border-color:#fbbf24; box-shadow:none; }
    #__pd_sc__ button.nv { background:rgba(59,130,246,.13); border-color:rgba(96,165,250,.42); color:#93c5fd; }
    #__pd_sc__ button.nv:hover { background:rgba(59,130,246,.24); border-color:#60a5fa; box-shadow:none; }

    /* ── "⋮" menu (app, phone) ── */
    #__pd_more__ { background:#232332; border-color:#3a3a50; box-shadow:0 8px 32px rgba(0,0,0,.5); }
    #__pd_more__ button { color:#e2e2ee; }
    #__pd_more__ button:active, #__pd_more__ button.on { background:rgba(59,130,246,.18); color:#93c5fd; }
    #__pd_more__ .mr-sep { background:#33334a; }

    /* ── Floating panels: tool pop-over, settings, keyboard shortcuts, news ── */
    #__pd_tp__, #__pd_cfg__, #__pd_help__, #__pd_news__ {
      background:#232332; border-color:#3a3a50; color:#e2e2ee; box-shadow:0 8px 32px rgba(0,0,0,.5);
    }
    #__pd_tp__ .tp-hdr button, #__pd_cfg__ .cfg-hdr button, #__pd_help__ .cfg-hdr button,
    #__pd_news__ .nw-x { color:#8a8aa2; }
    #__pd_tp__ .tp-lbl, #__pd_cfg__ .cfg-sec, #__pd_help__ .cfg-sec { color:#8a8aa2; }
    #__pd_tp__ .tp-colors button.on { border-color:#8f8fff; box-shadow:0 0 0 2px #232332 inset, 0 0 0 1px rgba(255,255,255,.15); }
    #__pd_tp__ .tp-mode button, #__pd_cfg__ .cfg-pos button, #__pd_cfg__ .cfg-theme button {
      background:#2a2a3a; border-color:#3d3d55; color:#cfcfe0;
    }
    #__pd_tp__ .tp-mode button.on, #__pd_cfg__ .cfg-pos button.on, #__pd_cfg__ .cfg-theme button.on,
    #__pd_cfg__ .cfg-auto.on {
      background:rgba(96,165,250,.16); border-color:#60a5fa; color:#93c5fd;
    }
    #__pd_cfg__ .cfg-pos button:disabled { background:#24242f; color:#6a6a7e; }
    #__pd_cfg__ .cfg-pos .cfg-screen { color:#4a4a60; }
    #__pd_cfg__ .cfg-swap { background:#2a2a3a; border-color:#3d3d55; color:#cfcfe0; }
    #__pd_cfg__ .cfg-swap:hover:not(:disabled) { background:#31314a; border-color:#55557a; }
    #__pd_cfg__ .cfg-sub-ok { color:#4ade80; }
    #__pd_cfg__ .cfg-sub button.cfg-ghost { background:#2a2a3a; border-color:#3d3d55; color:#cfcfe0; }
    #__pd_help__ .hk-keys { color:#6a6a7e; }
    #__pd_help__ .hk-legend { background:#2a2a3a; border-color:#3d3d55; color:#a0a0b4; }
    #__pd_help__ kbd { background:#2e2e40; border-color:#45455c; color:#e2e2ee; }
    #__pd_help__ .hk-mouse { background:rgba(34,197,94,.10); border-color:rgba(74,222,128,.4); color:#86efac; }
    #__pd_news__ .nw-title { color:#f0f0f8; }
    #__pd_news__ .nw-body { color:#b4b4c8; }
    #__pd_news__ .nw-never { background:#2a2a3a; border-color:#3d3d55; color:#cfcfe0; }

    /* ── Calculator (the dark Windows calculator it already resembles) ── */
    #__pd_calc__, #__pd_calc__ .calc-header, #__pd_calc__ .calc-display-area { background:#202020; }
    #__pd_calc__ { box-shadow:0 8px 32px rgba(0,0,0,.55); }
    #__pd_calc__ .calc-header { color:#e6e6e6; }
    #__pd_calc__ .calc-close-btn { color:#9a9a9a; }
    #__pd_calc__ .calc-expr { color:#9a9a9a; }
    #__pd_calc__ .calc-display { color:#fff; }
    #__pd_calc__ .calc-mem-indicator { color:#60aef0; }
    #__pd_calc__ .calc-mem-row, #__pd_calc__ .calc-buttons { background:#2b2b2b; border-color:#2b2b2b; }
    #__pd_calc__ .calc-mem-row button { background:#202020; color:#bdbdbd; }
    #__pd_calc__ .calc-mem-row button:hover { background:#2d2d2d; }
    #__pd_calc__ .calc-mem-row button:active { background:#363636; }
    #__pd_calc__ .calc-buttons button { background:#3b3b3b; color:#fff; }
    #__pd_calc__ .calc-buttons button:hover { background:#454545; }
    #__pd_calc__ .calc-buttons button:active { background:#505050; }
    #__pd_calc__ .calc-buttons button.c-op { background:#323232; }
    #__pd_calc__ .calc-buttons button.c-op:hover { background:#3c3c3c; }
    #__pd_calc__ .calc-buttons button.c-eq { background:#4cc2ff; color:#000; }
    #__pd_calc__ .calc-buttons button.c-eq:hover { background:#47b1e8; }
    #__pd_calc__ .calc-buttons button.c-eq:active { background:#42a1d2; }
    #__pd_calc__ .calc-buttons button.c-clr { color:#ff99a4; }

    /* ── Android app announcement (extension) ── */
    #__pd_android_modal__ .am-card { background:#232332; }
    #__pd_android_modal__ h2, #__pd_android_modal__ .am-plan-price { color:#f0f0f8; }
    #__pd_android_modal__ p { color:#b4b4c8; }
    #__pd_android_modal__ p.am-fine, #__pd_android_modal__ .am-plan-note,
    #__pd_android_modal__ .am-plan-price span, #__pd_android_modal__ .am-check,
    #__pd_android_modal__ .am-close { color:#8a8aa2; }
    #__pd_android_modal__ .am-plan { background:#2a2a3a; border-color:#3d3d55; }
    #__pd_android_modal__ .am-best { background:linear-gradient(180deg,#30264a,#2a2a3a); border-color:#8b3dff; }
    #__pd_android_modal__ .am-best .am-plan-name { color:#c4a2ff; }
  `;
  document.head.appendChild(darkStyleEl);
  applyTheme();

  // ─── CANVAS ROOT ──────────────────────────────────────────────────────────
  const root = document.createElement('div');
  root.id = '__pd_root__';
  document.body.appendChild(root);

  const cv = document.createElement('canvas');
  cv.id = '__pd_cv__'; cv.width = window.innerWidth; cv.height = window.innerHeight;
  root.appendChild(cv);
  const cx = cv.getContext('2d');
  // Anti-aliasing: always on for canvas 2d, but ensure imageSmoothingEnabled
  cx.imageSmoothingEnabled = true;
  cx.imageSmoothingQuality = 'high';

  const lv = document.createElement('canvas');
  lv.id = '__pd_lv__'; lv.width = window.innerWidth; lv.height = window.innerHeight;
  root.appendChild(lv);
  const lx = lv.getContext('2d');

  const cursorCanvas = document.createElement('canvas');
  cursorCanvas.id = '__pd_cur__';
  cursorCanvas.width = window.innerWidth; cursorCanvas.height = window.innerHeight;
  root.appendChild(cursorCanvas);
  const ccx = cursorCanvas.getContext('2d');
  // ─── TEXT LAYER ───────────────────────────────────────────────────────────
  const textLayer = document.createElement('div');
  textLayer.id = '__pd_text_layer__';
  textLayer.style.cssText = `position:absolute;inset:0;pointer-events:none;z-index:2147483641;`;
  root.appendChild(textLayer);

  // ─── RESIZE LOGIC ─────────────────────────────────────────────────────────
  const syncSize = () => {
    cv.width = lv.width = cursorCanvas.width = window.innerWidth;
    cv.height = lv.height = cursorCanvas.height = window.innerHeight;
    renderAllStrokes();
  };
  window.addEventListener('resize', syncSize, SIG);

  // ─── PINCH ZOOM: THE TOOLS KEEP THEIR SIZE ────────────────────────────────
  // A pinch zoom (the app; a trackpad on the desktop) scales the whole page,
  // our fixed bars included: at 2x the toolbar took twice the screen and its
  // far end went out of reach (J.T, 06/11/2026). Each bar is drawn back at
  // 1:1 and pinned to the edge of what is visible (visualViewport); what is
  // placed by a button's rect (the tool pop-over) is only shrunk back, where
  // it is. The ink is not touched: it follows the page, as it must.
  const VV = window.visualViewport;
  const pins = new Map();   // el → { x, y, move, keep }
  // x: 'left' | 'right' | 'center' · y: 'top' | 'bottom' | 'center' — the edge
  // the element hangs from · move: pinned to the visible edge (false: placed
  // by a rect already, only the size) · keep: its inline transform at 1:1.
  function pin(el, x, y, move = true, keep = '') {
    if (!el) return;
    pins.set(el, { x, y, move, keep });
    paintPin(el);
  }
  function paintPin(el) {
    const o = pins.get(el);
    if (!o) return;
    const s = VV ? VV.scale : 1;
    if (!VV || !(s > 1.005 || s < 0.995)) { el.style.transform = o.keep; el.style.transformOrigin = ''; return; }
    const k = (1 / s).toFixed(4);
    if (!o.move) {
      el.style.transformOrigin = `${o.x === 'right' ? '100%' : o.x === 'center' ? '50%' : '0'} ${o.y === 'bottom' ? '100%' : o.y === 'center' ? '50%' : '0'}`;
      el.style.transform = `scale(${k})`;
      return;
    }
    // The layout viewport, scrollbar excluded: what fixed positions count from.
    const lw = document.documentElement.clientWidth, lh = document.documentElement.clientHeight;
    const tx = o.x === 'left' ? VV.offsetLeft : o.x === 'right' ? VV.offsetLeft + VV.width - lw : VV.offsetLeft + VV.width / 2 - lw / 2;
    const ty = o.y === 'top' ? VV.offsetTop : o.y === 'bottom' ? VV.offsetTop + VV.height - lh : VV.offsetTop + VV.height / 2 - lh / 2;
    // A centred bar keeps its stylesheet's translate(-50%), applied first.
    const tail = o.x === 'center' ? ' translateX(-50%)' : o.y === 'center' ? ' translateY(-50%)' : '';
    el.style.transformOrigin = `${o.x === 'right' ? '100%' : '0'} ${o.y === 'bottom' ? '100%' : '0'}`;
    el.style.transform = `translate(${tx.toFixed(2)}px, ${ty.toFixed(2)}px) scale(${k})${tail}`;
  }
  let pinRaf = 0;
  const repin = () => {
    if (pinRaf) return;
    pinRaf = requestAnimationFrame(() => { pinRaf = 0; pins.forEach((_, el) => { if (el.isConnected) paintPin(el); else pins.delete(el); }); });
  };
  if (VV) { VV.addEventListener('resize', repin, SIG); VV.addEventListener('scroll', repin, SIG); }

  // ─── SCROLL SOURCE ────────────────────────────────────────────────────────
  // Strokes are anchored to page coordinates, which means adding the current
  // scroll offset when storing and subtracting it when drawing. That assumes
  // the DOCUMENT scrolls — true on most sites. Some (Gran Questões, for one)
  // are app-shell layouts where the content scrolls inside a panel while the
  // document never moves: window.scrollY stays 0, the window never gets a
  // scroll event, and strokes drift away from the text underneath.
  //
  // scrollerEl holds that inner panel when there is one, and stays null when
  // the document scrolls — so sites that already worked keep the exact same
  // code path, untouched.
  let scrollerEl = null;

  const PD_OWN = '#__pd_root__,#__pd_tb__,#__pd_sc__,#__pd_cfg__,#__pd_calc__,#__pd_help__';

  const isOwnUI = n => !!(n && n.closest && n.closest(PD_OWN));

  /** Current scroll offset of whatever is actually scrolling. */
  function rawScroll() {
    if (scrollerEl && scrollerEl.isConnected) {
      return { x: scrollerEl.scrollLeft, y: scrollerEl.scrollTop };
    }
    return { x: window.scrollX, y: window.scrollY };
  }
  // ─── ANCHOR (TEC Concursos) ───────────────────────────────────────────────
  // TEC opens the professor's comment, the comments and the like ABOVE the
  // question: the text moves down, and strokes held to page coordinates
  // stayed behind (chamado #24, 01/11/2026). There the question's own link
  // (a.id-questao) is the anchor: how far it moved since the first stroke is
  // taken off the scroll, so every stroke moves with the question. Elsewhere
  // nothing changes (the delta is 0).
  const ON_TEC = /(^|\.)tecconcursos\.com\.br$/.test(location.hostname);
  let anchorRef = null;
  function anchorDelta(base) {
    if (!ON_TEC) return 0;
    const a = document.querySelector('a.id-questao');
    if (!a) return 0;
    const top = a.getBoundingClientRect().top + base.y;
    if (anchorRef === null) { anchorRef = top; return 0; }
    return top - anchorRef;
  }
  function scrollOffset() {
    const o = rawScroll();
    return { x: o.x, y: o.y - anchorDelta(o) };
  }
  // A panel opening doesn't scroll anything: the anchor is watched instead.
  let lastDelta = 0;
  const tecIv = ON_TEC ? setInterval(() => {
    if (anchorRef === null) return;
    const d = anchorDelta(rawScroll());
    if (Math.abs(d - lastDelta) > 0.5) { lastDelta = d; renderAllStrokes(); }
  }, 250) : 0;

  /** Scrolls the real scroll container by a delta (two-finger pan). */
  function scrollPageBy(dx, dy) {
    if (scrollerEl && scrollerEl.isConnected) {
      scrollerEl.scrollLeft += dx;
      scrollerEl.scrollTop += dy;
    } else {
      window.scrollBy(dx, dy);
    }
  }

  function canScroll(n) {
    const s = getComputedStyle(n);
    return (s.overflowY === 'auto' || s.overflowY === 'scroll' || s.overflow === 'auto' || s.overflow === 'scroll')
      && n.scrollHeight > n.clientHeight + 1;
  }

  /**
   * Finds the panel that scrolls the page content, or null when the document
   * itself scrolls. Checks the document first precisely so the common case
   * short-circuits and behaves exactly as before.
   */
  function detectScroller() {
    const de = document.scrollingElement || document.documentElement;
    if (de && de.scrollHeight > de.clientHeight + 1) return null;
    if (!document.elementsFromPoint) return null;
    // Look at what sits under the middle of the viewport, skipping our overlay.
    const stack = document.elementsFromPoint(window.innerWidth / 2, window.innerHeight / 2);
    for (const el of stack) {
      if (isOwnUI(el)) continue;
      for (let n = el; n && n !== document.body && n !== document.documentElement; n = n.parentElement) {
        if (canScroll(n)) return n;
      }
      break;   // only the topmost page element's chain is worth walking
    }
    return null;
  }

  // Capture phase: an inner element's scroll event does NOT bubble, so this is
  // the only way to see it — and the event's target tells us exactly which
  // element moved, no scanning needed.
  let scrollRaf = 0;
  document.addEventListener('scroll', e => {
    const t = e.target;
    if (t === document || t === document.documentElement || t === document.body) {
      scrollerEl = null;
    } else if (t && t.nodeType === 1) {
      if (isOwnUI(t)) return;          // our own panels scrolling isn't the page
      scrollerEl = t;
    }
    // One redraw per frame, however many scroll events the browser fires.
    if (scrollRaf) return;
    scrollRaf = requestAnimationFrame(() => {
      scrollRaf = 0;
      renderAllStrokes();
      // If a shape is being dragged, redraw preview on top
      if (drawing && lastP && (tool === 'line' || tool === 'rect' || tool === 'circle')) _drawShapePreview(lastP);
    });
  }, SIGC);
  /** Re-detects only when we don't already hold a live scroller. */
  function ensureScroller() {
    if (scrollerEl && scrollerEl.isConnected) return;
    scrollerEl = detectScroller();
  }

  // Initial size check
  requestAnimationFrame(() => { syncSize(); ensureScroller(); });

  // ─── VECTOR RENDERER ──────────────────────────────────────────────────────
  // Renders all stored strokes onto the main canvas, translated by current scroll.
  // After rendering, caches result in baseSnap for fast preview during drawing.
  const distToSeg = (px, py, a, b) => {
    const dx = b.x - a.x, dy = b.y - a.y;
    const len = dx * dx + dy * dy;
    let t = len ? ((px - a.x) * dx + (py - a.y) * dy) / len : 0;
    t = Math.max(0, Math.min(1, t));
    return Math.hypot(px - (a.x + t * dx), py - (a.y + t * dy));
  };

  /**
   * Index of the topmost stroke under a page point, or -1. Used by the
   * whole-stroke eraser: the tolerance follows each stroke's own thickness
   * (the marker draws five times its size), with a floor so a hairline is
   * still catchable with a finger.
   */
  function strokeAt(px, py) {
    for (let i = strokes.length - 1; i >= 0; i--) {
      const s = strokes[i];
      if (s.type === 'eraser') continue;   // erase marks aren't strokes
      const w = (s.sz || 2) * (s.type === 'highlight' ? 2.5 : 0.5);
      const pad = Math.max(w, 8);
      if (s.pts && s.pts.length) {
        if (s.pts.length === 1) {
          if (Math.hypot(px - s.pts[0].x, py - s.pts[0].y) <= pad) return i;
        }
        for (let j = 1; j < s.pts.length; j++) {
          if (distToSeg(px, py, s.pts[j - 1], s.pts[j]) <= pad) return i;
        }
      } else if (s.type === 'line') {
        if (distToSeg(px, py, { x: s.x1, y: s.y1 }, { x: s.x2, y: s.y2 }) <= pad) return i;
      } else if (s.type === 'rect') {
        const x1 = Math.min(s.x1, s.x2), x2 = Math.max(s.x1, s.x2);
        const y1 = Math.min(s.y1, s.y2), y2 = Math.max(s.y1, s.y2);
        const inside = px >= x1 - pad && px <= x2 + pad && py >= y1 - pad && py <= y2 + pad;
        const onEdge = Math.abs(px - x1) <= pad || Math.abs(px - x2) <= pad ||
                       Math.abs(py - y1) <= pad || Math.abs(py - y2) <= pad;
        if (inside && onEdge) return i;
      } else if (s.type === 'circle') {
        const cx0 = (s.x1 + s.x2) / 2, cy0 = (s.y1 + s.y2) / 2;
        const rx = Math.max(Math.abs(s.x2 - s.x1) / 2, 1);
        const ry = Math.max(Math.abs(s.y2 - s.y1) / 2, 1);
        // Normalised distance to the outline, scaled back to real pixels.
        const d = Math.hypot((px - cx0) / rx, (py - cy0) / ry);
        if (Math.abs(d - 1) * Math.min(rx, ry) <= pad) return i;
      }
    }
    return -1;
  }

  /** Removes the stroke under the point, if any. */
  function eraseStrokeAt(p) {
    const i = strokeAt(p.px, p.py);
    if (i < 0) return;
    strokes.splice(i, 1);
    renderAllStrokes();
  }

  function renderAllStrokes(includeStroke) {
    cx.clearRect(0, 0, cv.width, cv.height);
    const allStrokes = includeStroke ? [...strokes, includeStroke] : strokes;
    allStrokes.forEach(s => _drawStroke(s));
    baseSnap = snapBase();
    // The lasso's box on top, out of the cached image (a preview restores it).
    if (sel && tool === 'lasso') drawSel();
  }

  // ─── LASSO ───────────────────────────────────────────────────────────────
  // Circle what was drawn to select it; then drag inside the box to move it,
  // a corner to resize it (thickness follows), the ✕ above the box (or
  // Delete) to remove it. A touch outside lets go and starts a new lasso.
  // Page coordinates throughout, like the strokes; the pixel eraser's marks
  // inside the lasso go along, so what was rubbed out stays rubbed out.
  let lassoPts = null, sel = null, selAct = null;
  const SEL_HANDLE = 11, SEL_DEL = 15;
  function inPoly(x, y, poly) {
    let c = false;
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
      const a = poly[i], b = poly[j];
      if ((a.y > y) !== (b.y > y) && x < (b.x - a.x) * (y - a.y) / (b.y - a.y) + a.x) c = !c;
    }
    return c;
  }
  function strokePoints(s) {
    if (s.pts) return s.pts;
    if (s.type === 'line') return [{ x: s.x1, y: s.y1 }, { x: (s.x1 + s.x2) / 2, y: (s.y1 + s.y2) / 2 }, { x: s.x2, y: s.y2 }];
    if (s.type === 'rect') return [{ x: s.x1, y: s.y1 }, { x: s.x2, y: s.y1 }, { x: s.x2, y: s.y2 }, { x: s.x1, y: s.y2 }];
    if (s.type === 'circle') {
      const c = { x: (s.x1 + s.x2) / 2, y: (s.y1 + s.y2) / 2 }, rx = Math.abs(s.x2 - s.x1) / 2, ry = Math.abs(s.y2 - s.y1) / 2;
      return Array.from({ length: 8 }, (_, k) => ({ x: c.x + rx * Math.cos(k * Math.PI / 4), y: c.y + ry * Math.sin(k * Math.PI / 4) }));
    }
    return [];
  }
  function selBox(idx) {
    let x1 = Infinity, y1 = Infinity, x2 = -Infinity, y2 = -Infinity;
    idx.forEach(i => {
      const s = strokes[i];
      if (!s || s.type === 'eraser') return;
      const w = (s.sz || 2) * (s.type === 'highlight' ? 2.5 : 0.5);
      strokePoints(s).forEach(p => { x1 = Math.min(x1, p.x - w); y1 = Math.min(y1, p.y - w); x2 = Math.max(x2, p.x + w); y2 = Math.max(y2, p.y + w); });
    });
    return x1 === Infinity ? null : { x1: x1 - 6, y1: y1 - 6, x2: x2 + 6, y2: y2 + 6 };
  }
  // The stroke moved by f (and its thickness scaled by k).
  function mapStroke(s, f, k) {
    const o = { ...s };
    if (s.pts) o.pts = s.pts.map(p => { const q = f(p); return p.sz != null ? { ...p, x: q.x, y: q.y, sz: Math.max(0.5, p.sz * k) } : { ...p, x: q.x, y: q.y }; });
    if (s.x1 != null) { const a = f({ x: s.x1, y: s.y1 }), b = f({ x: s.x2, y: s.y2 }); o.x1 = a.x; o.y1 = a.y; o.x2 = b.x; o.y2 = b.y; }
    if (s.sz != null) o.sz = Math.max(0.5, s.sz * k);
    return o;
  }
  // What the box offers at a page point: 'del', a corner (0 top-left, 1 top-right, 2 bottom-right, 3 bottom-left), 'move', or null.
  function selHit(px, py) {
    if (!sel) return null;
    const b = sel.box, cxm = (b.x1 + b.x2) / 2;
    if (Math.hypot(px - cxm, py - (b.y1 - 26)) <= SEL_DEL + 6) return 'del';
    const corners = [[b.x1, b.y1], [b.x2, b.y1], [b.x2, b.y2], [b.x1, b.y2]];
    for (let i = 0; i < 4; i++) if (Math.abs(px - corners[i][0]) <= SEL_HANDLE + 6 && Math.abs(py - corners[i][1]) <= SEL_HANDLE + 6) return i;
    if (px >= b.x1 && px <= b.x2 && py >= b.y1 && py <= b.y2) return 'move';
    return null;
  }
  function drawSel() {
    if (!sel) return;
    const o = scrollOffset(), b = sel.box;
    const x1 = b.x1 - o.x, y1 = b.y1 - o.y, x2 = b.x2 - o.x, y2 = b.y2 - o.y;
    cx.save();
    cx.globalCompositeOperation = 'source-over'; cx.globalAlpha = 1;
    cx.fillStyle = 'rgba(74,74,255,.06)'; cx.fillRect(x1, y1, x2 - x1, y2 - y1);
    cx.setLineDash([7, 5]); cx.lineWidth = 1.6; cx.strokeStyle = '#4A4AFF';
    cx.strokeRect(x1, y1, x2 - x1, y2 - y1);
    cx.setLineDash([]);
    [[x1, y1], [x2, y1], [x2, y2], [x1, y2]].forEach(([x, y]) => {
      cx.fillStyle = '#fff'; cx.strokeStyle = '#4A4AFF'; cx.lineWidth = 2;
      cx.beginPath(); cx.rect(x - 6, y - 6, 12, 12); cx.fill(); cx.stroke();
    });
    const dx = (x1 + x2) / 2, dy = y1 - 26;
    cx.beginPath(); cx.moveTo(dx, y1); cx.lineTo(dx, dy + SEL_DEL); cx.strokeStyle = '#4A4AFF'; cx.lineWidth = 1.4; cx.stroke();
    cx.beginPath(); cx.arc(dx, dy, SEL_DEL, 0, Math.PI * 2); cx.fillStyle = '#E53935'; cx.fill();
    cx.strokeStyle = '#fff'; cx.lineWidth = 2.4; cx.lineCap = 'round';
    cx.beginPath(); cx.moveTo(dx - 5, dy - 5); cx.lineTo(dx + 5, dy + 5); cx.moveTo(dx + 5, dy - 5); cx.lineTo(dx - 5, dy + 5); cx.stroke();
    cx.restore();
  }
  function clearSel() { if (!sel && !lassoPts) return; sel = null; lassoPts = null; selAct = null; renderAllStrokes(); }
  function deleteSel() {
    if (!sel) return;
    pushH();
    const gone = new Set(sel.idx);
    strokes = strokes.filter((_, i) => !gone.has(i));
    sel = null;
    renderAllStrokes();
  }
  function lassoDown(p) {
    const hit = selHit(p.px, p.py);
    if (hit === 'del') { deleteSel(); drawing = false; drawPointerId = null; return; }
    if (hit != null) {
      pushH();
      const b = sel.box, corners = [[b.x1, b.y1], [b.x2, b.y1], [b.x2, b.y2], [b.x1, b.y2]];
      selAct = { kind: hit === 'move' ? 'move' : 'scale', from: p, box: { ...b }, orig: sel.idx.map(i => strokes[i]),
        anchor: hit === 'move' ? null : { x: corners[(hit + 2) % 4][0], y: corners[(hit + 2) % 4][1] },
        corner: hit === 'move' ? null : { x: corners[hit][0], y: corners[hit][1] } };
      return;
    }
    sel = null;
    lassoPts = [{ x: p.px, y: p.py }];
    renderAllStrokes();
  }
  function lassoMove(p) {
    if (selAct) {
      let f, k = 1;
      if (selAct.kind === 'move') {
        const dx = p.px - selAct.from.px, dy = p.py - selAct.from.py;
        f = q => ({ x: q.x + dx, y: q.y + dy });
        sel.box = { x1: selAct.box.x1 + dx, y1: selAct.box.y1 + dy, x2: selAct.box.x2 + dx, y2: selAct.box.y2 + dy };
      } else {
        const a = selAct.anchor, c = selAct.corner;
        const d0 = Math.hypot(c.x - a.x, c.y - a.y) || 1;
        k = Math.max(0.15, Math.min(8, Math.hypot(p.px - a.x, p.py - a.y) / d0));
        f = q => ({ x: a.x + (q.x - a.x) * k, y: a.y + (q.y - a.y) * k });
        const b = selAct.box, p1 = f({ x: b.x1, y: b.y1 }), p2 = f({ x: b.x2, y: b.y2 });
        sel.box = { x1: Math.min(p1.x, p2.x), y1: Math.min(p1.y, p2.y), x2: Math.max(p1.x, p2.x), y2: Math.max(p1.y, p2.y) };
      }
      sel.idx.forEach((i, j) => { strokes[i] = mapStroke(selAct.orig[j], f, k); });
      renderAllStrokes();
      return;
    }
    if (!lassoPts) return;
    lassoPts.push({ x: p.px, y: p.py });
    if (baseSnap) restoreBase();
    const o = scrollOffset();
    cx.save();
    cx.setLineDash([6, 5]); cx.lineWidth = 1.8; cx.strokeStyle = '#4A4AFF'; cx.fillStyle = 'rgba(74,74,255,.07)';
    cx.beginPath();
    lassoPts.forEach((q, i) => i ? cx.lineTo(q.x - o.x, q.y - o.y) : cx.moveTo(q.x - o.x, q.y - o.y));
    cx.closePath(); cx.fill(); cx.stroke();
    cx.restore();
  }
  function lassoEnd() {
    if (selAct) { selAct = null; sel.box = selBox(sel.idx) || sel.box; renderAllStrokes(); return; }
    const poly = lassoPts; lassoPts = null;
    if (!poly || poly.length < 3) { renderAllStrokes(); return; }
    const idx = [];
    strokes.forEach((s, i) => {
      const ps = strokePoints(s);
      if (!ps.length) return;
      const inside = ps.filter(q => inPoly(q.x, q.y, poly)).length;
      if (inside / ps.length >= (s.type === 'eraser' ? 0.5 : 0.6)) idx.push(i);
    });
    const box = idx.length ? selBox(idx) : null;
    sel = box ? { idx, box } : null;
    renderAllStrokes();
  }
  function lassoAbort() {
    if (selAct) { sel.idx.forEach((i, j) => { strokes[i] = selAct.orig[j]; }); sel.box = selAct.box; selAct = null; hist.pop(); }
    lassoPts = null;
    renderAllStrokes();
  }
  function lassoHover(p) {
    const h = selHit(p.px, p.py);
    cv.style.cursor = h === 'del' ? 'pointer' : h === 'move' ? 'move' : h === 0 || h === 2 ? 'nwse-resize' : h === 1 || h === 3 ? 'nesw-resize' : 'crosshair';
  }


  // Draw a single stroke object. Coords in stroke are page-relative; we subtract
  // window.scroll to convert to canvas/viewport coords.
  function _drawStroke(s) {
    const _o = scrollOffset(); const ox = -_o.x, oy = -_o.y;
    const C = (px, py) => ({ x: px + ox, y: py + oy });
    cx.save();
    cx.lineCap = 'round'; cx.lineJoin = 'round';

    if (s.type === 'pencil') {
      if (!s.pts || !s.pts.length) { cx.restore(); return; }
      cx.globalAlpha = 1; cx.globalCompositeOperation = 'source-over';
      cx.strokeStyle = s.color; cx.lineWidth = s.sz;
      cx.beginPath();
      const p0 = C(s.pts[0].x, s.pts[0].y);
      cx.moveTo(p0.x, p0.y);
      if (s.pts.length < 3 || s.raw) {
        for (let i = 1; i < s.pts.length; i++) { const pi = C(s.pts[i].x, s.pts[i].y); cx.lineTo(pi.x, pi.y); }
      } else {
        for (let i = 1; i < s.pts.length - 1; i++) {
          const pi = C(s.pts[i].x, s.pts[i].y), pn = C(s.pts[i + 1].x, s.pts[i + 1].y);
          cx.quadraticCurveTo(pi.x, pi.y, (pi.x + pn.x) / 2, (pi.y + pn.y) / 2);
        }
        const last = C(s.pts[s.pts.length - 1].x, s.pts[s.pts.length - 1].y);
        cx.lineTo(last.x, last.y);
      }
      cx.stroke();

    } else if (s.type === 'highlight') {
      if (!s.pts || !s.pts.length) { cx.restore(); return; }
      const tmp = scratch(), tc = tmp.getContext('2d');
      tc.strokeStyle = s.color; tc.lineWidth = s.sz * 5;
      tc.lineCap = 'round'; tc.lineJoin = 'round'; tc.globalAlpha = 1;
      const p0h = C(s.pts[0].x, s.pts[0].y);
      tc.beginPath(); tc.moveTo(p0h.x, p0h.y);
      for (let i = 1; i < s.pts.length; i++) { const pi = C(s.pts[i].x, s.pts[i].y); tc.lineTo(pi.x, pi.y); }
      tc.stroke();
      cx.restore(); cx.save();
      cx.globalAlpha = 0.30; cx.globalCompositeOperation = 'source-over';
      cx.drawImage(tmp, 0, 0);

    } else if (s.type === 'line') {
      const a = C(s.x1, s.y1), b = C(s.x2, s.y2);
      cx.globalAlpha = 1; cx.globalCompositeOperation = 'source-over';
      cx.strokeStyle = s.color; cx.lineWidth = s.sz;
      cx.beginPath(); cx.moveTo(a.x, a.y); cx.lineTo(b.x, b.y); cx.stroke();

    } else if (s.type === 'rect') {
      const a = C(s.x1, s.y1), b = C(s.x2, s.y2);
      cx.globalAlpha = 1; cx.globalCompositeOperation = 'source-over';
      cx.strokeStyle = s.color; cx.lineWidth = s.sz;
      cx.strokeRect(a.x, a.y, b.x - a.x, b.y - a.y);

    } else if (s.type === 'circle') {
      const a = C(s.x1, s.y1), b = C(s.x2, s.y2);
      const rx = Math.abs(b.x - a.x) / 2, ry = Math.abs(b.y - a.y) / 2;
      cx.globalAlpha = 1; cx.globalCompositeOperation = 'source-over';
      cx.strokeStyle = s.color; cx.lineWidth = s.sz;
      cx.beginPath();
      cx.ellipse(Math.min(a.x, b.x) + rx, Math.min(a.y, b.y) + ry, Math.max(rx, 1), Math.max(ry, 1), 0, 0, Math.PI * 2);
      cx.stroke();

    } else if (s.type === 'eraser') {
      if (!s.pts || !s.pts.length) { cx.restore(); return; }
      cx.globalCompositeOperation = 'destination-out'; cx.globalAlpha = 1;
      s.pts.forEach(p => {
        const cv2 = C(p.x, p.y);
        cx.beginPath(); cx.arc(cv2.x, cv2.y, p.sz * 2.5, 0, Math.PI * 2); cx.fill();
      });
    }
    cx.restore();
  }

  // Restore base cache and draw shape preview on top (used during line/rect/circle drag)
  function _drawShapePreview(p) {
    if (baseSnap) restoreBase();
    else cx.clearRect(0, 0, cv.width, cv.height);
    const _o = scrollOffset(); const vsx = sx - _o.x, vsy = sy - _o.y;
    cx.save();
    cx.globalAlpha = 1; cx.globalCompositeOperation = 'source-over';
    cx.strokeStyle = color; cx.lineWidth = sz; cx.lineCap = 'round'; cx.lineJoin = 'round';
    cx.beginPath();
    if (tool === 'line') {
      cx.moveTo(vsx, vsy); cx.lineTo(p.x, p.y); cx.stroke();
    } else if (tool === 'rect') {
      cx.strokeRect(vsx, vsy, p.x - vsx, p.y - vsy);
    } else if (tool === 'circle') {
      const rx = Math.abs(p.x - vsx) / 2, ry = Math.abs(p.y - vsy) / 2;
      cx.ellipse(Math.min(vsx, p.x) + rx, Math.min(vsy, p.y) + ry, Math.max(rx, 1), Math.max(ry, 1), 0, 0, Math.PI * 2);
      cx.stroke();
    }
    cx.restore();
  }

  function startLaserLoop() {
    if (!laserLoopAnim) {
      lastLaserActivity = performance.now();
      laserFadeStart = null;

      const loop = () => {
        if (tool === 'laser' || laserStrokes.length > 0) {
          updateLaserTrail();
          laserLoopAnim = requestAnimationFrame(loop);
        } else {
          laserLoopAnim = null;
          lx.clearRect(0, 0, lv.width, lv.height);
        }
      };
      laserLoopAnim = requestAnimationFrame(loop);
    }
  }

  // ─── TOOL CURSOR ──────────────────────────────────────────────────────────
  // Each drawing tool shows a dot the size and colour of its tip. On the
  // desktop that dot is handed to the browser as a CSS cursor image, so the
  // OS draws it and it keeps up with the hand however busy the page is.
  // Painting it on cursorCanvas instead means it only moves when the page
  // paints its next frame — on a heavy page (YouTube) it trailed behind the
  // mouse. The canvas dot stays for what a cursor image can't do: Chrome
  // ignores cursor images over 128px (a fat marker), and the app's stylus
  // hover has no mouse cursor to replace.
  const NATIVE_CURSOR_MAX = 128;
  const curImg = document.createElement('canvas');
  let curKey = '';            // what the current cursor image shows; '' = none
  let curCanvasDirty = false; // cursorCanvas holds a dot that needs clearing

  function clearCursorCanvas() {
    if (!curCanvasDirty) return;
    ccx.clearRect(0, 0, cursorCanvas.width, cursorCanvas.height);
    curCanvasDirty = false;
  }

  /**
   * Shows paint(ctx, x, y) as the canvas's cursor, centred on the pointer,
   * in an image 2·half px wide. Returns false when the canvas dot must be
   * drawn instead. Only rebuilds the image when `key` changes.
   */
  function nativeCursor(key, half, paint) {
    if (PD_ENV === 'android' || half * 2 > NATIVE_CURSOR_MAX) {
      if (curKey) { curKey = ''; cv.style.cursor = 'none'; }
      return false;
    }
    clearCursorCanvas();
    if (key === curKey) return true;
    curKey = key;
    curImg.width = curImg.height = half * 2;
    paint(curImg.getContext('2d'), half, half);
    cv.style.cursor = `url(${curImg.toDataURL()}) ${half} ${half}, crosshair`;
    return true;
  }

  /** Draws paint(ccx, x, y) at the pointer on cursorCanvas (fallback path). */
  function canvasCursor(paint) {
    clearCursorCanvas();
    const r = cv.getBoundingClientRect();
    const x = mouseX - r.left, y = mouseY - r.top;
    if (x < 0 || y < 0 || x > cv.width || y > cv.height) return;
    paint(ccx, x, y);
    curCanvasDirty = true;
  }

  /** Paints the tool's dot, as a cursor image when possible. */
  function toolCursor(key, half, paint) {
    if (!nativeCursor(key, half, paint)) canvasCursor(paint);
  }

  // ─── LASER CURSOR DOT ─────────────────────────────────────────────────────
  function paintLaserDot(c, x, y) {
    c.save();
    // Outer glow
    c.globalAlpha = 0.30; c.fillStyle = '#FF1010';
    c.shadowBlur = 18; c.shadowColor = '#FF0000';
    c.beginPath(); c.arc(x, y, sz * 0.7 + 8, 0, Math.PI * 2); c.fill();
    // Core dot
    c.globalAlpha = 1; c.shadowBlur = 12;
    c.fillStyle = '#FF1010';
    c.beginPath(); c.arc(x, y, sz * 0.5 + 4, 0, Math.PI * 2); c.fill();
    // White center pinpoint
    c.globalAlpha = 0.9; c.shadowBlur = 0; c.fillStyle = '#fff';
    c.beginPath(); c.arc(x, y, 2, 0, Math.PI * 2); c.fill();
    c.restore();
  }
  function drawLaserCursor() {
    if (tool !== 'laser') return clearCursorCanvas();
    // The glow's blur reaches about its own length past the outer ring.
    toolCursor('laser|' + sz, Math.ceil(sz * 0.7 + 8 + 20), paintLaserDot);
  }

  // ─── MAIN TOOLBAR ─────────────────────────────────────────────────────────
  const tb = document.createElement('div');
  tb.id = '__pd_tb__';
  tb.innerHTML = `
    <div class="pd-row">
      <a id="__pd_brand__" href="https://chromewebstore.google.com/detail/a-b%C3%BAssola-draw/jmmbefgheclemjejoefjjkaklghmgobp?hl=pt-br" target="_blank" rel="noopener noreferrer" title="${tr('brand.rateChrome')}">
        <span class="brand-icon"><img alt="GooDraw" src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAYAAACqaXHeAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAADsMAAA7DAcdvqGQAABElSURBVHhexZoJdJTluce/tlZb77V1AwVRqKVarUIB2ROSmcm+zWQmG9lDyL6RQMi+s3nY23tVKlAsikttXY7H3gqKXL0CsiluCFiBqtjKBEUFYsL87nnmfYdMgmgSEvjO+Z+Jwcz3/f7v8izvZxhGww8NI/ZHhuF32Tgj+8d33hl7+ciRI68w1PWDiIBWH2tY2wJb2JkXbaFn/mELcX0WHeJyemTXcmjFaMUFK8V7KSHY5ZzupUStpEClHLvLmR/ncubHKBV0U6FWkUOpWKtEa5bDdawsxvVhefyZLdUpbcsWFDvDtn/00HXQ8J9btrw7ZMeWd4fs3fvBDQcPHh188OjRwV988cV1hoIf9+M7jdjLhw2L+alhGJcJeZjFGW4L7dhij4A4K8RGgiMcHGEQoxWrFacVr5UQqjQ9FBK9lKSVHAopohCtYMgIh6IEKIpXKo6Hkm6apVUap1SmNVtrThyUx0FlAtRMhwr3z+1bm3OdiccpuXrvB5tu2LZt/7D3dr03dNeu94YePPrlYMPP8LtspBFyhYb/wYSR638WFfrNakckxESBLQxsoUrRIRAdCvYQJUcIxGjFasWJgiE+BOKDIUFrulaiVlIQJAVDsnwGwoxIKIiDglilQo9i1GdRjFKxVonWLK1SB5TGQJlDabYD5jigOl6pZvrpRx794+YR+z5+5PrNm/cP2/Pa+zfJbDBk5IcMibjSMIwf+o3ffKM1tH1bnE2BWzX4QMK7FQjZNijUBvQHvMcA0VwHNEyHqviOXfcv3nbn7v1rBm3cuPOWt7d/eKOhR/6Kcbeu+nlUaPvrAu8NPtDwKVq5dmVAf8OXi+ww1w6NCVAV2/7GmjXP3frCq08P3bRpz03GDTcE/oes+dDAr/90qeBTgyDf4WVAf8LLDNAGVNihKQGq49r+vHlf9vVPPbXlZvdWb/E9YHV0W+8XEz4tGArEgIGCdyh4UZUD6uOgMeuTtNeOlF5rGMbwn0QGtb0uG97FWvPe8KJ0MUCDDyR8pVaDRIeY9jdWP33vUMPiszdAQt2lGHn36HsM0DNgoOFFVXaoj4WmrEMOIzzoxDKJ85cKPi0Q0oOUAUXagIGE9xjQIrlC/Ff3G1HB7a9IknNJ4GX0RYGQHw3FsRcHXtQUB9X29m2GNeTMoZjwiw8v4KkBkBagDMizQok2YKDhq6OhIUYMcB0xrCGuY5LeXkx4twIg1QJpWjkRyoCLAV8je4ADaqJdTsMW6nJKXn8x4FMDIckE8VPBNha2vQQ7/hfsYyHZFwpsUOIYePgamQEOqI12tRpS0XkMGCj4BD+wT4QEX7XW63NhWTWc+hq+aYMVtdCYCxUpkB8BWbIpRioDyrQB/Ql/jgFS0Q0EfJwvOCZBWTJseADe2QNff8l5r5Nfwf634Jl10JIHuRIew7uC9wd8bTQ0OqBODJBaXgzoN3j5vRlsE6BiBrzyAnR0dAU99qkC9Vzys/zO+zrTATtehnuLITcQSq1QHtM/8OcYILV8f8HH+kCSGZ5aD2fOdAK9+TqsXgwVaZAZDHETYOsm2P4SJEyE7CCoToX1y+G93Z1/5zoDG5+AMhsUhyloj/oKXxcNTZIS21ythnRxxID+gLdPUeXs+293Amx/GWqyIH4KxEyAJF9IN0OGBTLk0wSZZqVUH0ieDPmhsHgW7Hm183s+3AdNGVAUDBUXCH/WAJkBYoB0cS4YfjKUpsCxf6kH/uI4LK+FGNn8pkKGND20MgNhpnxalLIClbIDINsCRRFQFA55gbBmPpw4rr7z+GewKA+Kg6DS0Xf4+mholh6BzADp34kBFwIfKyEsphP+8EHV0rKPV0lORlBXeI8BoqwAL/gAyNEqi1ZrPS8AmmfAR/9Q3/35MWjJgNLQrib0Br7BBs1SFHkMkP5dn+CD1IaXaIKD76kHPPIBZEkfcbIC7z7yPYHPsUB+kDKgQoqjEKhJgI+1Cf88AOVRSn2Bb4iGFgc0igHSuU2QZmYf4CXGy27/7Ab1YDJVZeTjpvQdPjdAjXquWYG7NzupD4LVyH/5ubrX5r9CkaVv8I02aJEOkduAEJdTure9hffEeQl1nt1+Rb2a9hcC7zHALTMUh6hNr0r6BRZYN1/dS6LDsiKYHSo5fe/gRfOkIBIDpF8vBvQWXkbfPgm2vqQeaOer4Jio1/yFwssSEAVAvhlKQvRal5I5AN7aqu6591WYFahHvxfwTd0NkJ59b+ElvS1LUUmOywW12Xq378OGd3baS2Hkq6d/YAcFFpRkJgTCXBuUhcKKEnVPSZaW5MLc8N7Bi+bboVkMkNMaMaA38FLNRU+Axx9UI/HObhXn+zryEvokB8jyhz/MfJzny2vIt7S54WXauyWmWGBOGJQGw4E31L3/vh5mWXoH39zdADmt6Sm8p6qTwmbfXvUQa5aoJKc38AKeZYZkHxn5DlZlPsr+pVPhCYO1WRvI8OmEF3BRscwEM2SL+cvUvQ+9C3PDoNbWc3jRAukKiQFyRicG9BReRl9K2nw7nDqppmJFusrwegovIy7g+eZjrJv5Ow6t+C08YsBjBgeXTiDHpKZ9F3itEjPkTYGWJHXvttMwPxmqI6FeYrtIDBB4LTe4JD8S/qJhXjQslBkQqQ2Qs7qewouknq/PUyPg/JfK7SW97Sl8jqWNDdnzOLouAJ4dTPtag6/X/tRtwuqZj7tH3wPeHV6me7E/lAaAUxdQy3KgaApUSr4QDnVihhUarNDoURQ0RkJDGNQFQ30gVPm7Wg05nRUDegovTUzrGFhWo27+/luqsJHc3gN+PniZ9kk+sCF7IexLFvug4zTf7GygfY3B4ZV3U2Bpd+/854MXlfhD1jg4qPeB1VWQeReU+cNsE8wxQbkZ5pqhwiMTVPhDhR9U+kGtGao9BsgJbU/gpYeXYoZX/gc+d6qbnz4F//cCpEtRo034NniRrPl88+ccXWcB2tQXeK5nB/Nw1u/JmPod8BISTVA8Dbb/DdpOqj894YTX/walvjDHH8rFABPM1XLDm6DSX0YdqkxQ521AqhxZfw+8xHfp46WY4LWN8NUJdXPp6Gx7sdOA88HL6Mu6XzfzPnhmUBd2aOfThyyUmFrJN50f3i0xwBd2vqDuLdfXJ9R/l/ooA84B1/LAV/srA2rEAHkxITXk++GliysxPj1A9fBW1qmbSzND6vlzqrruoc4sa7+DQytGu9e8THs6hOA47E/liZz57tH3gH8bfKkZyuTTH3LHwQdvqmdYWwvZo3oOL6o/a0Cwy5kmLyl8H7xXhpc4VfXw5JJNUJoZM8znh5ckR+L8qswn3RudbHiy5nn2Bj59KIAncpopspx2x/rvgj9rgB/MsYDzqHqGFbIJTug5fI02oFYMSA7sNKAn8KI0fyiOhtM6DNakqQzu2+DdktnhDweWTHaHOjHh8MpRrM9aTon5M/fIu7O9HsCLZMdf6AmDp9RuX+bTc3hRg7cB6SE9h3eHOtkLfOB9nQitWwzTx3eCe8PL6Is5D858HP5scGDpJNbMfNi92wu4rPnvm/be8LPNkDsWHluk7v3hXiiZDOWyw/cQvlYbUCcGpHgZ0AVey9sA7zgfPx6e1Knwu7sgZVLXcOed3+ea29zp7ZqsDeT4447z3xnqvgNewlzBeHh/h7r383+AgjG9gxc1ehuQIQbI1NY628XRyhR5jf5MWdO+UJXcWQw1zYS0yd2qOqnmBDKww/3ZHby38HMkO5wISzJUOSzF0KJEKJ3cO/g6McAE9X5iQIDLmSGZXDBkhqpuTm6UOqvLt0KBtyLVwUVeGORI5jgBXtfl8O5XIHm8GnFveClppaiRn8/J7XsDrxOcvLGw92V1zzc3Q+G43sOLmsxQLzMgI9TlzLVCrk2d2ogKtArlxSUbFGkVy9GVl2S6t+R0NkTuq4WkcbqO1/KUtBcKL5ld7hhYU6XuJTNgSRrMmth7+HoxwAQNMgPyouXlQ8gTeDHBps7oROcYYNUmyEmuFWbZ1O6+6Un1UNISk/ZVxiQo6Gf4wgmqsDnRqu61+VEoHNM3+Ho/aD5rgM3lLHT0Ad6qTmuKw5UO71cP9s+DUBIKMyZCYUA/wY+HqiD4yHOPfVDuq9QX+AZ/ZUCjx4Aie+/hPQbIiU1BENSnqL69XEcOyDs4kDa2s5HRa3htQN4YaIruhP/836qhKVNfoPsC3+AHLWcNsMp7t32DdxtghdlW1cCcn9VpgkzV+6sg4x7ImqQaGSXdqzqTyu27hDkd6mS3zx8LqytUseOBvzcRisddGHyjtwH5Npez2N53eI8BcyRqmKExFQ7pMwK5dr4IC2ZAltQLskFKvu+vSlopakSS20t6KxmeJDkS5xenw+5Nnd9z+B3VyCy+R8Nr9QVeNM8ETW4DrMqAPsNHaQPkoEL+JhBmh8Omx1R+4Lne3goPL1KdnFILZI+DHX+HnRtVYSNTfkEiPLoQ3tVdX7nkO15cD+XTvKb9BcI3eRtQYHU5S7QBFwLvNiAK5srvw6DAD5bkw66Xup4SyyVFzEFdycklVZ3zE+//Q4W5XS+oUCe7vWx4FzrtPfCi+SZo9jagP+DdBkRBhdasACg2wb0z4bnVcGAPnPqqK6j3Jf92cA8894DK8Iru6Xuc/y74ZjFAIsE0V6tRaHU5Z2kD+gPe2wC3ImF2MBRNg8KpUBMFS7PhwSpVTbZ/A2trYHk2NIhpk1Vu35f0tqfwogUmaJEZ4DGg3+Ej1WdlpFK1/HsIFPtAwUTIGgW7NsKeFyFntKrnpaTtbVXXF/gWMcBfG1BkdR0rFQMGEL5KDNCSRoaEOVHpNCjTfbzeNDMuFL5lGiz0h3nTXE6jyHbmcJl9YOE9Bsj0rwjRnVtJdPwvDfw8P7jXJAacOWIU2U5vk5ePBhrebYAoXMGft3N7EeDnTYOlZmjyadtqFEW3rqqMvTjwtVpzAy4tvGhlANRMcf63ke/YMX2OHUptAwwfoSSnNlXBarO7FPDzp8ECP1hsgozRr0Qb09On/6o46tReeQlhQOEjoS4C6uV3oRdvt+8OL1ouKbvPqTeuvPLXQ4zEfNPwvOjd+fLygQAPJLzHgLqwSwe/0E8ZkDVq2wzDMK418jIX3RGfYrmt2Hr8mdpYDa/B+x3eo/BLAy/6vaz9ya1/NQxjyNBrgm42SnKX356eXnr39JjqCWXWU2/XxgwsfIMoHCrNXc/qLgb87yzQ7HPyrV9e4/jN1VePGT7s2pibjMrS/xqZk7F0dEJC6m9S7StNc6wn36qPUUXNgMBrA6rM/VPV9QRepr2M/Dzfk29OGjZ3gvGTa265ZbD91uGDYm80Kivvu3V20co7Z6QsHJMYk3h3vLVmSpn12NO1dqiT11H7Gb5RJAboqT9Q8KIF02CZWa35usn//suIQXGjDePnI4YNihk59BrrzSNvDBlktLQ8PLyqcNWvi3MX3zUzbeG4xNi8ceHRQaPzo14rLbd++Ya8fCRvVsvbF/IaSo1VqdYKdVryMoL7hYQoJffLCFHQpNWs1RIF8+RTTJKH0pJzOpGc1ojk0EL69tK5FUn/Tjo4HkktL5KSVqo6yetFkt5KhidJzkoLLJZ83+fErsxRm/MMw7j1qqt++6tfXG+7bcTV9uG3XB89ZNjPgq41Hlj2lyELG/44QpZCSeaiOzJT549KimsYa7MF3BERkT42J/KlzDLrJ2srok5ur4jsOFIZ6XJWRbpaq7VqtGq16kQRSvVaDVqNEa7WpkhXa0OIq1XO5kVyQiuSczqRnNa45edqlYMLkXRvRdLCEkkjQyT1vJS0LSI/V6vk9vOmdRxu9j25tWrSx6uS73o+6fLLR9xuGMbNQ68PvU2m/S+vsd48fFDYjUOH2q67/bqoq/4fiiORE66VBPgAAAAASUVORK5CYII=" /></span>
        <span class="brand-text">
          <span class="brand-name">GooDraw</span>
          <span class="brand-sub">${tr('brand.sub')}</span>
        </span>
      </a>
      <button id="bPointer" class="on"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m3 3 7.07 16.97 2.51-7.39 7.39-2.51z"/></svg><span class="tt">${tr('tool.pointer')} [Alt+A]</span></button>
      <button id="bPencil"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21.2 6.8a1 1 0 0 0-4-4L3.8 16.2a2 2 0 0 0-.5.8l-1.3 4.4a.5.5 0 0 0 .6.6l4.4-1.3a2 2 0 0 0 .8-.5z"/><path d="m15 5 4 4"/></svg><span class="tt">${tr('tool.pencil')} [Alt+S]</span></button>
      <button id="bHL"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 11-6 6v3h9l3-3"/><path d="m22 12-4.6 4.6a2 2 0 0 1-2.8 0l-5.2-5.2a2 2 0 0 1 0-2.8L14 4"/></svg><span class="tt">${tr('tool.highlight')} [Alt+D]</span></button>
      <button id="bLine"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 20 20 4"/></svg><span class="tt">${tr('tool.line')} [Alt+F]</span></button>
      <button id="bRect"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="14" rx="2"/></svg><span class="tt">${tr('tool.rect')} [Alt+G]</span></button>
      <button id="bCircle"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><ellipse cx="12" cy="12" rx="9" ry="7.5"/></svg><span class="tt">${tr('tool.circle')} [Alt+H]</span></button>
      <button id="bEraser"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m7 21-4.3-4.3a2 2 0 0 1 0-2.8l9.6-9.6a2 2 0 0 1 2.8 0l5.6 5.6a2 2 0 0 1 0 2.8L13.5 21"/><path d="M22 21H8"/><path d="m5 11 8 8"/></svg><span class="tt">${tr('tool.eraser')} [Alt+L]</span></button>
      <button id="bLasso"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M7 22a5 5 0 0 1-2-4"/><path d="M3.3 14A6.8 6.8 0 0 1 2 10c0-4.4 4.5-8 10-8s10 3.6 10 8-4.5 8-10 8a12 12 0 0 1-5-1"/><circle cx="5" cy="16" r="2"/></svg><span class="tt">${tr('tool.lasso')} [Alt+R]</span></button>
      <button id="bClear"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg><span class="tt">${tr('act.clear')} [Alt+M]</span></button>
      <div class="pd-sep" id="sepAux"></div>
      <button id="bLaser"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="2.5" fill="currentColor" stroke="none"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M5.6 5.6 7.8 7.8M16.2 16.2l2.2 2.2M18.4 5.6 16.2 7.8M7.8 16.2l-2.2 2.2"/></svg><span class="tt">${tr('tool.laser')} [Alt+K]</span></button>
      <button id="bText"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 7V5h16v2"/><path d="M12 5v14"/><path d="M9 19h6"/></svg><span class="tt">${tr('tool.text')} [Alt+J]</span></button>
      <div class="pd-sep" id="sepColor"></div>
      <input type="color" id="bColor" value="#E53935" title="${tr('color.tool')}">
      <span id="__pd_recent__" class="pd-recent" title="${tr('color.recent')}"></span>
      <div class="pd-break" id="pdBreak"></div>
      <div class="pd-sep" id="sepUndo"></div>
      <button id="bUndo"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 14 4 9l5-5"/><path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11"/></svg><span class="tt">${tr('act.undo')} [Alt+C]</span></button>
      <button id="bRedo"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m15 14 5-5-5-5"/><path d="M20 9H9.5a5.5 5.5 0 0 0 0 11H13"/></svg><span class="tt">${tr('act.redo')} [Alt+V]</span></button>
      <div class="pd-sep" id="sepCapture"></div>
      <button id="bCap"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3z"/><circle cx="12" cy="13.5" r="3.2"/></svg><span class="tt">${tr('act.capture')} [Alt+B]</span></button>
      <button id="bCrop"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 2v14a2 2 0 0 0 2 2h14"/><path d="M18 22V8a2 2 0 0 0-2-2H2"/></svg><span class="tt">${tr('act.crop')} [Alt+Shift+B]</span></button>
      <button id="bCalc"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="2" width="16" height="20" rx="2"/><path d="M8 6h8"/><path d="M8 11h.01M12 11h.01M16 11h.01M8 15h.01M12 15h.01M16 15h.01M8 19h.01M12 19h.01M16 19h.01"/></svg><span class="tt">${tr('act.calc')} [Alt+N]</span></button>
      <div class="pd-sep" id="sepSys"></div>
      <button id="bClose" style="color:#ef4444;border-color:#fca5a5;background:#fff1f2;"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg><span class="tt">${tr('common.close')}</span></button>
    </div>
  `;
  // Same file ships to Firefox Add-ons: point the "rate us" link at that
  // store's listing instead of the Chrome Web Store.
  if (PD_ENV === 'extension' && /\bFirefox\//.test(navigator.userAgent || '')) {
    const brand = tb.querySelector('#__pd_brand__');
    if (brand) {
      brand.href = 'https://addons.mozilla.org/' + ({ en: 'en-US', es: 'es', fr: 'fr' }[PD_LANG] || 'pt-BR') + '/firefox/addon/a-b%C3%BAssola-draw/';
      brand.title = tr('brand.rateFirefox');
    }
  }
  if (PD_ENV === 'extension' && PD_LANG !== 'pt') {
    const brand = tb.querySelector('#__pd_brand__');
    if (brand && brand.href.includes('chromewebstore')) brand.href = brand.href.replace('hl=pt-br', 'hl=' + PD_LANG);
  }
  // "Conheça GooNotes": a small tab hanging under the brand (extension
  // only), to the page that presents the Notes. Hidden with the brand.
  if (PD_ENV === 'extension' && !NOTES_HOLD) {
    const tab = document.createElement('a');
    tab.id = '__pd_notes_tab__';
    tab.href = 'https://www.agoodrawdraw.com.br/notes/';
    tab.target = '_blank'; tab.rel = 'noopener';
    tab.title = tr('notesTab.tip');
    tab.innerHTML = '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M13.4 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-7.4"/><path d="M2 6h4M2 10h4M2 14h4M2 18h4"/><path d="M21.4 5.6a1 1 0 1 0-3-3l-5 5a2 2 0 0 0-.5.9l-.8 2.8a.5.5 0 0 0 .6.6l2.9-.8a2 2 0 0 0 .8-.5z"/></svg><span>' + tr('notesTab') + '</span>';
    // Always the modal (also for whom chose not to see it again); its last
    // page leads to the Notes page.
    tab.addEventListener('click', e => { e.preventDefault(); showNotesPromo(true); });
    tb.appendChild(tab);
  }
  // The "GooHighlights" tab under the brand gave way to the home
  // screen (24/10/2026): the Highlights and the cloud are there now.
  // ⌂ The extension's home screen (home.html, full screen over the page):
  // the other tools, the cloud, language and theme. The brand opens it too.
  if (PD_ENV === 'extension') {
    const openHome = () => { try { chrome.runtime.sendMessage({ action: 'home.open' }); } catch (e) {} };
    const homeBtn = document.createElement('button');
    homeBtn.id = 'bHome';
    homeBtn.innerHTML = '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V20a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1V9.5"/></svg><span class="tt">' + tr('act.home') + ' [Alt+Shift+H]</span>';
    homeBtn.addEventListener('click', openHome);
    const sep = document.createElement('div');
    sep.className = 'pd-sep';
    const first = tb.querySelector('#bPointer');
    first.before(homeBtn, sep);
    const brand = tb.querySelector('#__pd_brand__');
    if (brand) {
      brand.removeAttribute('target'); brand.removeAttribute('href');
      brand.title = tr('act.home');
      brand.querySelector('.brand-sub').textContent = tr('brand.home');
      brand.addEventListener('click', e => { e.preventDefault(); openHome(); });
    }
  }
  document.body.insertBefore(tb, document.body.firstChild);

  const spacer = document.createElement('div');
  spacer.id = '__pd_spacer__';
  tb.after(spacer);
  const syncLayout = () => {
    // The pop-over is pinned to a button that is about to move.
    closeToolPopover();
    // Always reset every axis we're not using, so switching edges never leaves
    // a stale margin/offset behind.
    document.body.style.removeProperty('margin-left');
    document.body.style.removeProperty('margin-right');
    document.body.style.removeProperty('margin-bottom');
    root.style.left = ''; root.style.right = ''; root.style.width = '';
    tb.style.top = ''; tb.style.bottom = '';
    const rows = tb.querySelectorAll('.pd-row');
    rows.forEach(r => { r.style.paddingTop = ''; r.style.paddingBottom = ''; });

    if (tbPos === 'left' || tbPos === 'right') {
      spacer.style.height = '0px';
      // The column runs the full height of the window — except where the
      // shortcut bar crosses it: there it ends at the bar.
      const scEdge = (scPos === 'top' || scPos === 'bottom') && sc &&
                     getComputedStyle(sc).display !== 'none' ? scPos : null;
      if (scEdge && rows.length) {
        const s = sc.getBoundingClientRect(), c = tb.getBoundingClientRect();
        // How far the bar reaches into the column from that end: its height
        // plus any gap to the edge (the extension floats it 20px up, the app
        // docks it flush). A bar dragged well away from the edge isn't over
        // the end of the list, so it gets no padding at all.
        const reach = scEdge === 'top' ? s.bottom - c.top : c.bottom - s.top;
        const gap = scEdge === 'top' ? s.top - c.top : c.bottom - s.bottom;
        // The column stops short of it, so no tool ever sits under the bar
        // (on a phone the last ones — ajustes, ✕ — were covered); the column
        // scrolls inside what's left.
        if (s.left < c.right && s.right > c.left && gap <= 40) tb.style[scEdge] = (Math.ceil(reach) + 6) + 'px';
      }
      // Measured after the padding: the longer list can bring in a scrollbar,
      // and a scrollbar widens the column.
      const w = tb.offsetWidth;   // its own width, whatever the pinch zoom shows
      // Push the page aside — the vertical counterpart of the spacer that
      // pushes content down under the horizontal bar.
      document.body.style.setProperty(
        tbPos === 'left' ? 'margin-left' : 'margin-right', w + 'px', 'important');
      root.style.top = '0px';
      root.style.height = '100%';
      root.style[tbPos] = w + 'px';
      root.style.width = `calc(100% - ${w}px)`;
    } else {
      const h = tb.offsetHeight;
      if (tbPos === 'bottom') {
        // Nothing to push down: the bar covers the foot of the viewport, not
        // the head of the page. Reserve the room *after* the content instead,
        // so the end of the page can still be scrolled clear of the bar.
        spacer.style.height = '0px';
        document.body.style.setProperty('margin-bottom', h + 'px', 'important');
        root.style.top = '0px';
      } else {
        spacer.style.height = h + 'px';
        root.style.top = h + 'px';
      }
      root.style.height = `calc(100% - ${h}px)`;
    }

    // Contato + App para Android: in a horizontal bar, fitted to its free
    // room; beside a vertical column, floating in the bottom-right corner.
    // (Extension only — absent elsewhere.)
    const pill = document.getElementById('__pd_social__');
    if (pill && !placeSocial(pill)) {
      pill.style.bottom = tbPos === 'bottom'
        ? (Math.ceil(tb.getBoundingClientRect().height) + 12) + 'px' : '';
      // The answer-shortcut bar sits centred at the foot of the page; on a
      // narrow window it reaches the pills. Then they go up and sit above it.
      const scEl = document.getElementById('__pd_sc__');
      if (scEl) {
        const a = pill.getBoundingClientRect(), b = scEl.getBoundingClientRect();
        if (b.width && a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top) {
          pill.style.bottom = Math.ceil(innerHeight - b.top + 10) + 'px';
        }
      }
    }
    positionNews(); positionDroid(); positionBf();
    pin(tb, tbPos === 'right' ? 'right' : 'left', tbPos === 'bottom' ? 'bottom' : 'top');
    // The bars are built further down: the first layout may run before them.
    try { fitScroll(); } catch (e) {}
  };
  requestAnimationFrame(syncLayout);
  window.addEventListener('resize', syncLayout, SIG);

  // Fullscreen toggle — Android hides the app's browser bar; in the extension
  // it uses the browser Fullscreen API (like F11)
  let fsOn = false;
  const fsBtn = document.createElement('button');
  fsBtn.id = 'bFS';
  fsBtn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 3H5a2 2 0 0 0-2 2v3"/><path d="M16 3h3a2 2 0 0 1 2 2v3"/><path d="M16 21h3a2 2 0 0 0 2-2v-3"/><path d="M8 21H5a2 2 0 0 1-2-2v-3"/></svg><span class="tt">' + tr('act.fullscreen') + '</span>';
  tb.querySelector('#bClose').parentNode.insertBefore(fsBtn, tb.querySelector('#bClose'));
  fsBtn.addEventListener('click', () => {
    fsOn = !fsOn;
    fsBtn.classList.toggle('on', fsOn);
    PD.setFullscreen(fsOn);
  });
  // GooNotes (extension only): the notebooks, in a tab of their own.
  // The background brings an open Notes tab forward instead of opening another.
  if (PD_ENV === 'extension' && !NOTES_HOLD) {
    const notesBtn = document.createElement('button');
    notesBtn.id = 'bNotes';
    notesBtn.innerHTML = '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M13.4 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-7.4"/><path d="M2 6h4M2 10h4M2 14h4M2 18h4"/><path d="M21.4 5.6a1 1 0 1 0-3-3l-5 5a2 2 0 0 0-.5.9l-.8 2.8a.5.5 0 0 0 .6.6l2.9-.8a2 2 0 0 0 .8-.5z"/></svg><span class="tt">' + tr('act.notes') + ' [Alt+O]</span>';
    tb.querySelector('#bCalc').after(notesBtn);
    notesBtn.addEventListener('click', () => chrome.runtime.sendMessage({ action: 'openNotes' }));
  }
  // Caneta na tela (app only): the pen leaves the page and floats over any
  // other app. It is native (ScreenPenService); this button only starts it.
  if (PD_ENV === 'android') {
    const penBtn = document.createElement('button');
    penBtn.id = 'bPen';
    penBtn.innerHTML = '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 11V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h7"/><path d="M12 17v4M8 21h8"/><path d="M20.4 13.6a1.4 1.4 0 0 0-2-2l-4.1 4.1a2 2 0 0 0-.5.9l-.5 2a.4.4 0 0 0 .5.5l2-.5a2 2 0 0 0 .9-.5z"/></svg><span class="tt">' + tr('act.pen') + '</span>';
    fsBtn.parentNode.insertBefore(penBtn, fsBtn);
    penBtn.addEventListener('click', () => {
      try { window.AndroidBridge.startScreenPen(); } catch (e) {}
    });
  }
  // Desktop: stay in sync when the user leaves fullscreen with Esc
  const onFsChange = () => {
    if (PD_ENV !== 'android') {
      fsOn = !!document.fullscreenElement;
      fsBtn.classList.toggle('on', fsOn);
    }
  };
  document.addEventListener('fullscreenchange', onFsChange, SIG);


  // ─── ANDROID RELEASE NOTICE (extension only) ──────────────────────────────
  const PLAY_URL = 'https://play.google.com/store/apps/details?id=com.agoodraw.draw';
  // The extension can't read Play's catalogue, so the plan prices shown in the
  // announcement are typed here — one place, to keep them from drifting apart.
  // Keep in step with Play Console.
  const PLAN_COPY = PD_LANG !== 'pt' ? ({
    // Play charges in the buyer's currency: no prices outside Portuguese.
    en: [
      { name: 'Monthly', price: '', per: '', note: '7-day free trial' },
      { name: 'Yearly', price: '', per: '', note: 'Less per month than Monthly' },
      { name: 'Lifetime', price: '', per: '', note: 'Pay once, use it forever', badge: 'BEST VALUE', best: true }],
    es: [
      { name: 'Mensual', price: '', per: '', note: '7 días de prueba gratis' },
      { name: 'Anual', price: '', per: '', note: 'Sale más barato por mes que el mensual' },
      { name: 'Vitalicio', price: '', per: '', note: 'Pagas una vez y lo usas para siempre', badge: 'MEJOR OPCIÓN', best: true }],
    fr: [
      { name: 'Mensuel', price: '', per: '', note: '7 jours d’essai gratuit' },
      { name: 'Annuel', price: '', per: '', note: 'Moins cher par mois que le mensuel' },
      { name: 'À vie', price: '', per: '', note: 'Payez une fois, utilisez-le pour toujours', badge: 'MEILLEUR CHOIX', best: true }]
  })[PD_LANG] || [] : [
    { name: 'Mensal', price: 'R$ 8,99', per: '/mês', note: '7 dias grátis para testar' },
    { name: 'Anual', price: 'R$ 59,90', per: '/ano', note: 'sai por R$ 4,99 por mês', badge: '44% OFF' },
    { name: 'Vitalício', price: 'R$ 99,90', per: '', note: 'pague uma vez, use para sempre',
      badge: 'MELHOR ESCOLHA', best: true }
  ];
  const IG_URL = 'https://www.instagram.com/agoodrawdraw/';
  // Our own mark, served from the extension package. Anywhere else there is no
  // chrome.runtime to ask, and the modal that uses it never opens.
  const LOGO_URL = (() => {
    try { return chrome.runtime.getURL('icons/icon128.png'); } catch (e) { return ''; }
  })();
  let androidLinkRef = null, androidModalRef = null;
  let onSocialOutside = null;   // closes the Contato menu on a click elsewhere
  // The announcement currently running. "Não mostrar novamente" stores this id,
  // not a plain flag: bump it for the next piece of news and that one reaches
  // everybody again, including people who silenced this one.
  const NOTICE_ID = 'planos-2026-09b';
  let noticeHidden = false;    // set by the modal's "don't show again" checkbox

  // The toolbar's right corner had a "Contato" menu and the Android app's
  // pill: since the extension's home screen (home.html, 24/10/2026) those
  // live there, and the bar has a Home button instead (bHome).

  /**
   * Puts Contato + App para Android in the bar's right corner. When the bar
   * runs out of room they give way in steps rather than leaving it: Contato
   * hides first, then the Android pill shortens to "Android", then it hides
   * too. "Room" is measured, not guessed from the window width: the centred
   * buttons change with the language, the colour history and the docking
   * edge. Only the vertical column, which never has room, sends them to
   * float in the bottom-right corner.
   */
  const SOCIAL_STEPS = [[], ['ps-no-contact'], ['ps-no-contact', 'ps-shrunk'], ['ps-gone']];
  const SOCIAL_CLASSES = ['ps-no-contact', 'ps-shrunk', 'ps-gone'];
  function placeSocial(el) {
    const row = tb.querySelector('.pd-row');
    el.style.bottom = '';
    el.classList.remove(...SOCIAL_CLASSES);
    if (tbPos !== 'top' && tbPos !== 'bottom') {
      el.classList.add('ps-float', 'ps-up');
      if (el.parentNode !== document.body) document.body.appendChild(el);
      return false;
    }
    el.classList.remove('ps-float');
    if (el.parentNode !== row) row.appendChild(el);
    const fits = () => {
      const a = el.getBoundingClientRect();
      return a.width > 0 && a.left >= 0 && ![...row.children].some(c => {
        if (c === el || c.id === '__pd_brand__') return false;
        const b = c.getBoundingClientRect();
        return b.width > 0 && b.left < a.right + 10 && b.right > a.left - 10 &&
          b.top < a.bottom && b.bottom > a.top;
      });
    };
    for (const step of SOCIAL_STEPS) {
      el.classList.remove(...SOCIAL_CLASSES);
      el.classList.add(...step);
      if (step.includes('ps-gone') || fits()) break;
    }
    // The menu opens toward the page: up from a bottom bar.
    el.classList.toggle('ps-up', tbPos === 'bottom');
    return true;
  }

  /**
   * Announcement modal. Shown each time the toolbar opens until the checkbox
   * silences it. Prices are written out because the extension has no access
   * to Play's catalogue — if they change in Play Console, change them here.
   */
  function showAndroidNotice(manual) {
    if (PD_ENV !== 'extension' || document.getElementById('__pd_android_modal__')) return;
    const modal = document.createElement('div');
    modal.id = '__pd_android_modal__';
    const plans = PLAN_COPY.map(p => `
          <div class="am-plan${p.best ? ' am-best' : ''}">
            ${p.badge ? `<div class="am-plan-badge">${p.badge}</div>` : ''}
            <div class="am-plan-name">${p.name}</div>
            ${p.price ? `<div class="am-plan-price">${p.price}${p.per ? `<span>${p.per}</span>` : ''}</div>` : ''}
            <div class="am-plan-note">${p.note}</div>
          </div>`).join('');
    modal.innerHTML = `
      <div class="am-card">
        ${LOGO_URL ? `<img class="am-logo" src="${LOGO_URL}" alt="GooDraw">`
                   : '<div class="am-emoji">🧭</div>'}
        <h2>${tr('am.title')}</h2>
        <p>${tr('am.body')}</p>
        <div class="am-plans">${plans}</div>
        ${PD_LANG !== 'pt' ? `<p class="am-fine">${tr('am.prices')}</p>` : ''}
        <p class="am-fine">${tr('am.fine')}</p>
        <a class="am-cta" href="${PLAY_URL}" target="_blank" rel="noopener noreferrer">${tr('am.cta')}</a>
        ${manual ? '' : `<label class="am-check"><input type="checkbox" id="amDontShow"> ${tr('am.dontShow')}</label>`}
        <button class="am-close" id="amClose">${tr('common.close')}</button>
      </div>`;
    document.body.appendChild(modal);
    androidModalRef = modal;

    const close = () => {
      if (modal.querySelector('#amDontShow')?.checked) {
        noticeHidden = true;
        savePrefs();
      }
      modal.remove();
      androidModalRef = null;
      // One announcement at a time: the what's-new card waited for this one.
      if (newsAfterModal) { newsAfterModal = false; maybeShowNews(); }
    };
    modal.querySelector('#amClose').addEventListener('click', close);
    modal.addEventListener('click', e => { if (e.target === modal) close(); });
  }

  // ─── WHAT'S NEW NOTICE (extension only) ───────────────────────────────────
  // A small card in the bottom-left corner, one piece of news at a time, in
  // the order below: closing one brings up the next. Each card comes back
  // every time the toolbar opens until its own "Não avisar mais", or until
  // that news is acted on. The app shows the dark-theme news natively
  // (MainActivity), since there it has to greet people on the home screen.
  // Like NOTICE_ID, what is stored is the news id: a new id reaches
  // everybody again. Each item keeps its own pref key, so silencing one never
  // silences another.
  const NOTES_SITE = 'https://www.agoodrawdraw.com.br/notes/';
  // (The Notes card that lived here is now the modal below.)
  const NEWS = [];

  // ─── THE TOOLBAR TOUR (first time; again from Ajustes) ─────────────────────
  // A ring glides from tool to tool (its shadow dims the rest of the screen)
  // with a card beside it: what it is, what it's for, its Alt shortcut. Tools
  // not on screen (hidden by the layout, or of the other platform) are left
  // out. Arrow keys / Enter move, Esc skips. Shown once per TOUR_ID; the
  // announcements (Notes modal, Android card) wait for it.
  const TOUR_ID = 'draw-tour-2026-10';
  let tourDone = false, tourRef = null;
  const TOUR_STEPS = [
    [null, 'brand', true], ['#bHome', 'home'], ['#bPointer', 'pointer'], ['#bPencil', 'pencil'], ['#bHL', 'hl'], ['#bLine', 'shapes'],
    ['#bLasso', 'lasso'], ['#bEraser', 'eraser'], ['#bLaser', 'laser'], ['#bText', 'text'], ['#bColor', 'color'], ['#bUndo', 'undo'],
    ['#bCap', 'cap'], ['#bCrop', 'crop'], ['#bCalc', 'calc'], ['#bNotes', 'notes'], ['#bPen', 'pen'], ['#bFS', 'fs'],
    ['#__pd_sc__', 'sc'], ['#bHelp', 'help'], ['#bCfg', 'cfg'], [null, 'end', true]
  ];
  function runDrawTour(manual, done) {
    if (tourRef) return;
    closeOtherWindows('');
    const shown = sel => { const el = document.querySelector(sel); if (!el) return false; const cs = getComputedStyle(el); const r = el.getBoundingClientRect(); return cs.display !== 'none' && cs.visibility !== 'hidden' && r.width > 0 && r.height > 0; };
    const steps = TOUR_STEPS.filter(([sel]) => !sel || shown(sel));
    const root = document.createElement('div');
    root.id = '__pd_tour__';
    root.innerHTML = '<div class="pt-ring none"></div><div class="pt-card"></div>';
    document.body.appendChild(root);
    tourRef = root;
    const ring = root.querySelector('.pt-ring'), card = root.querySelector('.pt-card');
    let i = 0;
    // No keyboard on the tablet: the app's cards leave the Alt shortcuts out.
    const body = key => {
      const k = key === 'end' && PD_ENV === 'android' ? 'endApp' : key;
      const t = tr('tour.' + k + '.b');
      return PD_ENV === 'android' ? t.replace(/\s*(?:Atalho:\s*|Shortcut:\s*)?Alt\+[^.]*\./g, '').trim() : t;
    };
    const finish = () => {
      document.removeEventListener('keydown', onKey, true);
      window.removeEventListener('resize', place);
      root.remove(); tourRef = null;
      if (!manual) { tourDone = true; savePrefs(); }
      done && done();
    };
    function place() {
      const [sel, key, hero] = steps[i];
      const el = sel && document.querySelector(sel);
      card.classList.toggle('hero', !!hero);
      card.innerHTML = `<div class="pt-top"><span class="pt-n">${i + 1} / ${steps.length}</span>${i < steps.length - 1 ? `<button class="pt-skip">${tr('tour.skip')}</button>` : ''}</div>
        ${hero && LOGO_URL ? `<img class="pt-logo" src="${LOGO_URL}" alt="">` : ''}
        <div class="pt-t">${tr('tour.' + key + '.t')}</div><div class="pt-b">${body(key)}</div>
        <div class="pt-bar"><i style="width:${Math.round((i + 1) / steps.length * 100)}%"></i></div>
        <div class="pt-acts">${i ? `<button class="pt-back">${tr('tour.back')}</button>` : ''}<button class="pt-go">${i === steps.length - 1 ? tr('tour.done') : tr('tour.next')} →</button></div>`;
      card.querySelector('.pt-go').onclick = () => (i === steps.length - 1 ? finish() : (i++, place()));
      const back = card.querySelector('.pt-back'); if (back) back.onclick = () => { i--; place(); };
      const skip = card.querySelector('.pt-skip'); if (skip) skip.onclick = finish;
      const vw = window.innerWidth, vh = window.innerHeight, cw = card.offsetWidth, ch = card.offsetHeight;
      if (!el) {
        ring.classList.add('none');
        card.style.left = Math.round((vw - cw) / 2) + 'px'; card.style.top = Math.round((vh - ch) / 2) + 'px';
        return;
      }
      // A tool scrolled out of a narrow (phone) bar comes into view first.
      el.scrollIntoView({ block: 'nearest', inline: 'center' });
      const r = el.getBoundingClientRect(), pad = 6;
      ring.classList.remove('none');
      Object.assign(ring.style, { left: (r.left - pad) + 'px', top: (r.top - pad) + 'px', width: (r.width + pad * 2) + 'px', height: (r.height + pad * 2) + 'px' });
      // The card on the side with room: below/above a horizontal bar, beside a vertical one.
      let left, top;
      if (tbPos === 'left' || tbPos === 'right') {
        left = tbPos === 'left' ? r.right + 18 : r.left - cw - 18;
        top = r.top + r.height / 2 - ch / 2;
      } else {
        left = r.left + r.width / 2 - cw / 2;
        top = r.bottom + 18 + ch < vh ? r.bottom + 18 : r.top - ch - 18;
      }
      card.style.left = Math.round(Math.max(12, Math.min(vw - cw - 12, left))) + 'px';
      card.style.top = Math.round(Math.max(12, Math.min(vh - ch - 12, top))) + 'px';
    }
    const onKey = e => {
      if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); finish(); }
      else if (e.key === 'ArrowRight' || e.key === 'Enter') { e.preventDefault(); e.stopPropagation(); if (i < steps.length - 1) { i++; place(); } else finish(); }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); e.stopPropagation(); if (i) { i--; place(); } }
    };
    document.addEventListener('keydown', onKey, SIGC);
    window.addEventListener('resize', place, SIG);
    place();
  }

  // ─── "CONHEÇA GOODRAW NOTES" (extension only) ───────────────────────────
  // A modal in the middle of the screen: five animated pages (Remotion,
  // notes-promo.js — loaded into the page only now, by the background) that
  // end in a button to the Notes page. No prices. On its own it shows when
  // the toolbar opens, until "Não mostrar novamente" or the button is
  // followed; closed without that, it waits 3 days. The tab under the brand
  // always opens it. While it is open, the Android card waits.
  const PROMO_ID = 'notes-promo-2026-10';
  let promoHidden = false, promoSnooze = 0, promoOpen = false;
  function showNotesPromo(manual) {
    if (PD_ENV !== 'extension' || promoOpen) return;
    promoOpen = true;
    const after = () => { promoOpen = false; showAndroidCard(); };
    const mount = () => {
      const host = document.createElement('div');
      host.id = '__pd_promo__';
      document.documentElement.appendChild(host);
      window.__bnNotesPromo.mount(host, {
        lang: PD_LANG, logo: LOGO_URL, manual: !!manual,
        onCta() {
          window.open(NOTES_SITE, '_blank', 'noopener');
          if (!manual) { promoHidden = true; savePrefs(); }
          after();
        },
        onClose(dontShow) {
          if (!manual) { if (dontShow) promoHidden = true; else promoSnooze = Date.now() + 3 * 864e5; savePrefs(); }
          after();
        }
      });
    };
    if (window.__bnNotesPromo) { mount(); return; }
    chrome.runtime.sendMessage({ action: 'injectPromo' }, r => {
      void chrome.runtime.lastError;
      if (r && r.ok && window.__bnNotesPromo) mount();
      else { promoOpen = false; if (manual) window.open(NOTES_SITE, '_blank', 'noopener'); else showAndroidCard(); }
    });
  }
  // ─── "CONHEÇA GOOHIGHLIGHTS" (extension only) ──────────────────────
  // In the Notes modal's place while the Notes is on hold: the same kind of
  // modal (five animated pages, highlights-promo.js), with the same rules (on
  // its own when the toolbar opens, until "Não mostrar novamente" or the
  // button; closed without that, it waits 3 days). The button turns the
  // Highlights on: Minhas marcações, where it is switched on for every site.
  const HL_PROMO_ID = 'highlights-promo-2026-10';
  let hlPromoHidden = false, hlPromoSnooze = 0;
  function showHighlightsPromo(manual) {
    if (PD_ENV !== 'extension' || promoOpen) return;
    promoOpen = true;
    const after = () => { promoOpen = false; showAndroidCard(); };
    const turnOn = () => chrome.runtime.sendMessage({ action: 'hl.openAccess' }, () => void chrome.runtime.lastError);
    const mount = () => {
      const host = document.createElement('div');
      host.id = '__pd_promo__';
      document.documentElement.appendChild(host);
      let poster = '';
      try { poster = chrome.runtime.getURL('highlights-video.jpg'); } catch (e) {}
      window.__bnHighlightsPromo.mount(host, {
        lang: PD_LANG, logo: LOGO_URL, poster, manual: !!manual,
        onCta() {
          turnOn();
          if (!manual) { hlPromoHidden = true; savePrefs(); }
          after();
        },
        onClose(dontShow) {
          if (!manual) { if (dontShow) hlPromoHidden = true; else hlPromoSnooze = Date.now() + 3 * 864e5; savePrefs(); }
          after();
        }
      });
    };
    if (window.__bnHighlightsPromo) { mount(); return; }
    chrome.runtime.sendMessage({ action: 'injectPromo', which: 'highlights' }, r => {
      void chrome.runtime.lastError;
      if (r && r.ok && window.__bnHighlightsPromo) mount();
      else { promoOpen = false; if (manual) turnOn(); else showAndroidCard(); }
    });
  }
  // What shows when the toolbar opens: the Notes modal (the Highlights one
  // while the Notes is on hold) when it's due, then (or else) the Android
  // card in the corner.
  function startNotices() {
    // The tour opens by itself only in the app (not the site's demo, nor the
    // Notes' question window, which run this same engine). In the extension it
    // stopped on 30/10/2026, to get to the first stroke sooner: it is in the
    // settings, "rever o tour".
    if (!tourDone && PD_ENV === 'android') { setTimeout(() => runDrawTour(false, startNotices), 600); return; }
    // No modal opens by itself (24/10/2026): the Highlights and the Notes
    // are on the extension's home screen (home.html). The Android card in the
    // bottom-right corner came back on 04/11/2026, next to the Black Friday
    // one on the left.
    showAndroidCard();
  }

  // ─── THE ANDROID APP, IN THE CORNER (extension only) ──────────────────────
  // A small card in the bottom-right corner, until "Não avisar mais" (the
  // same NOTICE_ID as before); ✕ closes it for this time. The full modal with
  // the plans is still one click away, on the "App para Android" button.
  let droidRef = null;
  function showAndroidCard() {
    if (PD_ENV !== 'extension' || noticeHidden || droidRef || promoOpen) return;
    const card = document.createElement('div');
    card.id = '__pd_droid__';
    card.setAttribute('role', 'status');
    card.innerHTML = `
      <button class="dr-x" title="${tr('common.close')}">✕</button>
      <div class="dr-top">${LOGO_URL ? `<img src="${LOGO_URL}" alt="">` : '🧭'}<b>${tr('dr.title')}</b></div>
      <div class="dr-body">${tr('dr.body')}</div>
      <div class="dr-acts"><button class="dr-go">${tr('dr.cta')}</button><button class="dr-never">${tr('news.never')}</button></div>`;
    document.body.appendChild(card);
    droidRef = card;
    positionDroid();
    const close = () => { card.remove(); droidRef = null; positionBf(); };
    card.querySelector('.dr-x').addEventListener('click', close);
    card.querySelector('.dr-never').addEventListener('click', () => { noticeHidden = true; savePrefs(); close(); });
    card.querySelector('.dr-go').addEventListener('click', () => { close(); showAndroidNotice(true); });
  }
  // Clear of a bottom toolbar and of the answer bar: where that bar crosses
  // the corner, the card sits just above it.
  function positionDroid() {
    if (!droidRef) return;
    const r = tb.getBoundingClientRect();
    let bottom = tbPos === 'bottom' ? Math.ceil(r.height) + 14 : 18;
    const shortcut = document.getElementById('__pd_sc__');
    if (shortcut && getComputedStyle(shortcut).display !== 'none') {
      droidRef.style.bottom = bottom + 'px';
      const c = droidRef.getBoundingClientRect(), b = shortcut.getBoundingClientRect();
      const crosses = b.right > c.left && b.left < c.right && b.bottom > c.top && b.top < c.bottom;
      if (crosses) bottom = Math.ceil(window.innerHeight - b.top) + 12;
    }
    droidRef.style.bottom = bottom + 'px';
  }
  // ─── BLACK FRIDAY DA NOTES, IN THE OTHER CORNER (extension only, 2026) ───
  // The Android card's twin in the bottom-left corner, every time the toolbar
  // opens, following the phases of the Black Friday page (Brasília time):
  // until 06/11 it invites to the list, until 20/11 it shows the offers, then
  // it is gone. The button opens the page; "Não avisar mais" (or the button)
  // silences that phase only, so whoever silenced the list still hears when
  // the offers open. ✕ closes it for this time.
  const BF_OPEN = Date.parse('2026-11-06T00:00:00-03:00'), BF_END = Date.parse('2026-11-20T23:59:59-03:00');
  const bfPhase = () => { const t = Date.now(); return t < BF_OPEN ? 'pre' : t <= BF_END ? 'live' : ''; };
  let bfHidden = '';   // the id of the phase silenced (persisted)
  let bfRef = null;
  function showBfCard() {
    const phase = bfPhase(), id = 'bf2026-' + phase;
    if (PD_ENV !== 'extension' || !phase || bfHidden === id || bfRef) return;
    const page = { es: '/es/black-friday.html', fr: '/fr/black-friday.html' }[PD_LANG] || '/black-friday';
    const url = 'https://www.agoodrawdraw.com.br' + page
      + '?utm_source=draw&utm_medium=extensao&utm_campaign=bf2026' + (phase === 'live' ? '#ofertas' : '#lista');
    const card = document.createElement('div');
    card.id = '__pd_bf__';
    card.setAttribute('role', 'status');
    card.innerHTML = `
      <button class="dr-x" title="${tr('common.close')}">✕</button>
      <div class="dr-top">${LOGO_URL ? `<img src="${LOGO_URL}" alt="">` : '🧭'}<b>${tr('bf.' + phase + '.title')}</b></div>
      <div class="dr-body">${tr('bf.' + phase + '.body')}</div>
      <div class="dr-acts"><button class="dr-go">${tr('bf.' + phase + '.cta')}</button><button class="dr-never">${tr('news.never')}</button></div>`;
    document.body.appendChild(card);
    bfRef = card;
    positionBf();
    const close = () => { card.remove(); bfRef = null; };
    const silence = () => { bfHidden = id; savePrefs(); close(); };
    card.querySelector('.dr-x').addEventListener('click', close);
    card.querySelector('.dr-never').addEventListener('click', silence);
    card.querySelector('.dr-go').addEventListener('click', () => { window.open(url, '_blank', 'noopener'); silence(); });
  }
  // The turn of the phase with the toolbar open (midnight of 06/11, the end
  // of 20/11): the card on screen gives way to the next phase's, or goes; the
  // new phase shows up even if the old one was closed or silenced. Checked
  // every 30 s rather than with one long timer, which a sleeping computer
  // would fire late.
  let bfShownPhase = bfPhase();
  const bfIv = PD_ENV === 'extension' ? setInterval(() => {
    const now = bfPhase();
    if (now === bfShownPhase) return;
    bfShownPhase = now;
    bfRef?.remove(); bfRef = null;
    showBfCard();
  }, 30000) : 0;
  // Clear of a toolbar docked to the bottom or the left edge, and of the
  // answer bar where it crosses the corner.
  function positionBf() {
    if (!bfRef) return;
    const r = tb.getBoundingClientRect();
    let bottom = tbPos === 'bottom' ? Math.ceil(r.height) + 14 : 18;
    bfRef.style.left = tbPos === 'left' ? (Math.ceil(r.width) + 14) + 'px' : '18px';
    bfRef.style.bottom = bottom + 'px';
    const shortcut = document.getElementById('__pd_sc__');
    if (shortcut && getComputedStyle(shortcut).display !== 'none') {
      const c = bfRef.getBoundingClientRect(), b = shortcut.getBoundingClientRect();
      const crosses = b.right > c.left && b.left < c.right && b.bottom > c.top && b.top < c.bottom;
      if (crosses) bottom = Math.ceil(window.innerHeight - b.top) + 12;
    }
    bfRef.style.bottom = bottom + 'px';
    // A narrow window, where the Android card in the other corner reaches
    // this one: this one goes up, above it.
    if (droidRef) {
      const c = bfRef.getBoundingClientRect(), d = droidRef.getBoundingClientRect();
      if (d.left < c.right && d.right > c.left && d.top < c.bottom && d.bottom > c.top) {
        bfRef.style.bottom = Math.max(bottom, Math.ceil(window.innerHeight - d.top) + 10) + 'px';
      }
    }
  }
  const newsHidden = new Set();    // ids silenced for good (persisted)
  const newsSkipped = new Set();   // ids closed with ✕ while this toolbar is open
  let newsRef = null, newsItem = null;
  let newsAfterModal = false;      // waiting for the Android announcement to close
  let newsTimer = null;

  function maybeShowNews() {
    if (PD_ENV !== 'extension' || newsRef) return;
    const item = NEWS.find(n => !newsHidden.has(n.id) && !newsSkipped.has(n.id));
    if (!item) return;
    if (androidModalRef) { newsAfterModal = true; return; }
    const card = document.createElement('div');
    card.id = '__pd_news__';
    card.setAttribute('role', 'status');
    card.innerHTML = `
      <button class="nw-x" title="${tr('common.close')}">✕</button>
      <span class="nw-tag">${item.tag}</span>
      <div class="nw-title">${item.title}</div>
      <div class="nw-body">${item.body}</div>
      <div class="nw-actions">
        <button class="nw-try">${item.cta}</button>
        <button class="nw-never">${tr('news.never')}</button>
      </div>`;
    document.body.appendChild(card);
    newsRef = card; newsItem = item;
    positionNews();
    // Closed for now: it comes back the next time the toolbar opens.
    card.querySelector('.nw-x').addEventListener('click', () => hideNews(false));
    card.querySelector('.nw-never').addEventListener('click', () => { hideNews(true); savePrefs(); });
    card.querySelector('.nw-try').addEventListener('click', () => item.onTry(card));
  }

  // Closes the card on screen and moves on to the next piece of news.
  // `next: false` is for teardown, when nothing should follow.
  function hideNews(forGood, next = true) {
    if (newsItem) (forGood ? newsHidden : newsSkipped).add(newsItem.id);
    newsAfterModal = false;
    clearTimeout(newsTimer);
    newsRef?.remove();
    newsRef = null; newsItem = null;
    if (next) maybeShowNews();
  }

  /** A piece of news acted on elsewhere (e.g. a theme picked in ⚙️). */
  function retireNews(id) {
    newsHidden.add(id);
    if (newsItem?.id === id) hideNews(true);
  }

  // Kept clear of a toolbar docked to the bottom or the left edge.
  function positionNews() {
    if (!newsRef) return;
    const r = tb.getBoundingClientRect();
    newsRef.style.bottom = tbPos === 'bottom' ? (Math.ceil(r.height) + 12) + 'px' : '';
    newsRef.style.left = tbPos === 'left' ? (Math.ceil(r.width) + 12) + 'px' : '';
  }

  // ─── FLOATING SHORTCUT PANEL ──────────────────────────────────────────────
  const sc = document.createElement('div');
  sc.id = '__pd_sc__';
  sc.innerHTML = `
    <div class="sc-drag" id="scDrag">· · · · ·</div>
    <div class="sc-row">
      <div class="sc-lbl">${tr('sc.answer')}</div>
      <button id="bOK" class="ok">✓<span class="tt">${tr('sc.correct')}</span></button>
      <button id="bNO" class="no">✗<span class="tt">${tr('sc.wrong')}</span></button>
      <div class="sc-sep"></div>
      <div class="sc-lbl">${tr('sc.option')}</div>
      <button id="bA" class="lt">A<span class="tt">A + Enter</span></button>
      <button id="bB" class="lt">B<span class="tt">B + Enter</span></button>
      <button id="bC" class="lt">C<span class="tt">C + Enter</span></button>
      <button id="bD" class="lt">D<span class="tt">D + Enter</span></button>
      <button id="bE" class="lt">E<span class="tt">E + Enter</span></button>
      <div class="sc-sep"></div>
      <div class="sc-lbl">${tr('sc.nav')}</div>
      <button id="bPrev" class="nv"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m15 18-6-6 6-6"/></svg><span class="tt">${tr('sc.prev')}</span></button>
      <button id="bNext" class="nv"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg><span class="tt">${tr('sc.next')}</span></button>
      <button id="bNR"   class="nv"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m5 17 5-5-5-5"/><text x="12" y="17" font-size="13" font-weight="800" fill="currentColor" stroke="none">?</text></svg><span class="tt">${tr('sc.nextUnsolved')}</span></button>
      <button id="bRand" class="nv"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 18h1.4c1.3 0 2.5-.6 3.3-1.7l6.1-8.6c.8-1.1 2-1.7 3.3-1.7H22"/><path d="m18 2 4 4-4 4"/><path d="M2 6h1.9c1.5 0 2.9.9 3.6 2.2"/><path d="M22 18h-5.9c-1.3 0-2.6-.7-3.3-1.8l-.5-.8"/><path d="m18 14 4 4-4 4"/></svg><span class="tt">${tr('sc.random')}</span></button>
      <div class="sc-sep" id="scSepVer"></div>
      <div class="sc-lbl" id="scLblVer">${tr('sc.view')}</div>
      <button id="bProf" class="nv"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 2.5 9 2.5 12 0v-5"/><path d="M22 10v6"/></svg><span class="tt">${tr('sc.teacher')}</span></button>
      <button id="bForum" class="nv"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 9a2 2 0 0 1-2 2H6l-4 4V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2z"/><path d="M18 9h2a2 2 0 0 1 2 2v11l-4-4h-6a2 2 0 0 1-2-2v-1"/></svg><span class="tt">${tr('sc.forum')}</span></button>
      <button id="bStats" class="nv"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="6" y1="20" x2="6" y2="14"/><line x1="12" y1="20" x2="12" y2="8"/><line x1="18" y1="20" x2="18" y2="4"/></svg><span class="tt">${tr('sc.stats')}</span></button>
      <div class="sc-sep"></div>
      <button id="bClearSc" style="color:#ef4444;border-color:#fca5a5;background:#fff1f2;"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg><span class="tt">${tr('sc.clear')}</span></button>
    </div>
  `;
  document.body.appendChild(sc);
  pin(sc, 'center', 'bottom');   // its default place; applyScPos re-pins a stored one
  // A bar that doesn't fit the window scrolls sideways (not on the app,
  // which has its own phone layout): measured, not guessed from the width.
  function fitScroll() {
    if (PD_ENV === 'android') return;
    // What the buttons need, side by side (the hidden labels and the brand,
    // laid over the row, don't count).
    const need = row => {
      const cs = getComputedStyle(row), gap = parseFloat(cs.columnGap) || 0;
      const kids = [...row.children].filter(c => { const k = getComputedStyle(c); return k.display !== 'none' && k.position !== 'absolute' && k.position !== 'fixed'; });
      return kids.reduce((a, c) => { const k = getComputedStyle(c); return a + c.offsetWidth + parseFloat(k.marginLeft) + parseFloat(k.marginRight); }, 0)
        + gap * Math.max(0, kids.length - 1) + parseFloat(cs.paddingLeft) + parseFloat(cs.paddingRight);
    };
    const row = tb.querySelector('.pd-row');
    const horiz = tbPos === 'top' || tbPos === 'bottom';
    tb.classList.toggle('pd-scroll', !!(horiz && row && need(row) > tb.clientWidth + 1));
    const srow = sc.querySelector('.sc-row');
    const side = sc.classList.contains('pd-pos-left') || sc.classList.contains('pd-pos-right');
    const cs = getComputedStyle(sc), room = innerWidth - 24 - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight) - parseFloat(cs.borderLeftWidth) - parseFloat(cs.borderRightWidth);
    sc.classList.toggle('pd-scroll', !!(!side && srow && need(srow) > room + 1));
  }
  // In a scrolling bar: the wheel scrolls it sideways, and the labels float.
  const ftt = document.createElement('div');
  ftt.id = '__pd_ftt__';
  document.body.appendChild(ftt);
  const scroller = el => el === tb ? tb : el.querySelector('.sc-row');
  [tb, sc].forEach(bar => {
    bar.addEventListener('wheel', e => {
      if (!bar.classList.contains('pd-scroll') || Math.abs(e.deltaX) > Math.abs(e.deltaY)) return;
      const box = scroller(bar);
      if (!box) return;
      box.scrollLeft += e.deltaY;
      e.preventDefault();
    }, { passive: false });
    bar.addEventListener('pointerover', e => {
      const b = e.target.closest('button');
      const t = b && bar.classList.contains('pd-scroll') && b.querySelector('.tt');
      if (!t || e.pointerType === 'touch') { ftt.style.display = 'none'; return; }
      ftt.textContent = t.textContent;
      ftt.style.display = 'block';
      const r = b.getBoundingClientRect(), w = ftt.offsetWidth, h = ftt.offsetHeight;
      const below = bar === tb && tbPos === 'top';
      ftt.style.left = Math.max(6, Math.min(innerWidth - w - 6, r.left + r.width / 2 - w / 2)) + 'px';
      ftt.style.top = (below ? r.bottom + 5 : r.top - h - 5) + 'px';
    });
    bar.addEventListener('pointerleave', () => { ftt.style.display = 'none'; });
    (scroller(bar) || bar).addEventListener('scroll', () => { ftt.style.display = 'none'; }, { passive: true });
  });

  // Drag shortcut panel (pointer events: works with mouse, touch and pen)
  let scDragging = false, scOx = 0, scOy = 0;
  document.getElementById('scDrag').addEventListener('pointerdown', e => {
    scDragging = true;
    const r = sc.getBoundingClientRect();
    scOx = e.clientX - r.left; scOy = e.clientY - r.top;
    sc.style.transform = 'none';
    sc.style.left = r.left + 'px'; sc.style.top = r.top + 'px'; sc.style.bottom = 'auto';
    pin(sc, 'left', 'top', false, 'none');   // where it was dropped, in page terms; its size kept under a pinch zoom
    e.preventDefault();
  });
  const onScMove = e => { if (scDragging) { sc.style.left = (e.clientX - scOx) + 'px'; sc.style.top = (e.clientY - scOy) + 'px'; } };
  document.addEventListener('pointermove', onScMove, SIG);
  document.addEventListener('pointerup', () => { if (scDragging) { scDragging = false; positionDroid(); positionBf(); } }, SIG);
  document.addEventListener('pointercancel', () => { scDragging = false; }, SIG);

  // Toolbar placement: a horizontal bar on the 'top' or 'bottom' edge, or a
  // vertical column docked to the 'left' / 'right' one. Vertical is the answer
  // to a narrow portrait screen — a column doesn't compete for width at all —
  // and lets a left-hander put the bar under the hand that reaches for it.
  // Bottom exists so the two bars can be swapped: tools within thumb reach at
  // the foot of the screen, answer shortcuts up top.
  // Portrait on the app starts docked left, where the horizontal bar would
  // otherwise be cramped; anywhere else the familiar top bar is the default.
  // A saved preference (loadPrefs) overrides this.
  const TB_POS = ['top', 'bottom', 'left', 'right'];
  let tbPos = (PD_ENV === 'android' && window.innerWidth <= 880) ? 'left' : 'top';
  function applyTbPos(v) {
    tbPos = TB_POS.includes(v) ? v : 'top';
    // The two bars can't share an edge — they'd sit on top of each other. The
    // toolbar wins; the shortcut bar takes the opposite horizontal edge.
    // Terminates: the edge handed to applyScPos is never the one the toolbar
    // just claimed, so its own collision check can't bounce back here.
    if (scPos === tbPos) applyScPos(tbPos === 'bottom' ? 'top' : 'bottom');
    TB_POS.forEach(p => tb.classList.toggle('pd-tb-' + p, tbPos === p));
    syncLayout();
  }

  // Shortcut-panel docking: bottom (default), top, left/right edge, or hidden.
  // On phone-width screens lateral docking isn't offered at all — a tall thin
  // column doesn't fit — so left/right are coerced back to bottom. Top/bottom
  // keep the same single row, so the swap stays available on every screen.
  const isPhoneWidth = () => PD_ENV === 'android' && window.innerWidth <= 600;
  const SC_POS = ['top', 'bottom', 'left', 'right', 'hidden'];
  let scPos = 'bottom';
  let scPosChosen = false;   // a stored position exists (see the end of this file)
  function applyScPos(pos) {
    if (!SC_POS.includes(pos)) pos = 'bottom';
    if ((pos === 'left' || pos === 'right') && isPhoneWidth()) pos = 'bottom';
    // Assign before resolving the collision: applyTbPos reads scPos to decide
    // whether it has to move, and a stale value there sends it on a pointless
    // extra hop.
    scPos = pos;
    // Same-edge collision: the toolbar moves to the opposite horizontal edge.
    if (pos === tbPos) applyTbPos(pos === 'bottom' ? 'top' : 'bottom');
    sc.classList.toggle('pd-pos-top', pos === 'top');
    sc.classList.toggle('pd-pos-left', pos === 'left');
    sc.classList.toggle('pd-pos-right', pos === 'right');
    sc.style.display = pos === 'hidden' ? 'none' : '';
    // Clear any inline positioning so the docked CSS rules win
    sc.style.left = ''; sc.style.top = ''; sc.style.bottom = ''; sc.style.transform = '';
    pin(sc, pos === 'left' || pos === 'right' ? pos : 'center', pos === 'top' ? 'top' : pos === 'left' || pos === 'right' ? 'center' : 'bottom');
    // A vertical toolbar reserves space for this bar — recompute that reserve.
    syncLayout();
  }

  // ─── TOOL POP-OVER ────────────────────────────────────────────────────────
  // Colour and thickness belong to the tool, so they are edited on the tool:
  // tap it once to use it, tap it again to open this. Built on first use and
  // torn down with everything else in destroy().
  let tpRef = null;          // the element, once built
  let tpTool = null;         // which tool it is currently showing

  function buildToolPopover() {
    if (tpRef) return tpRef;
    const el = document.createElement('div');
    el.id = '__pd_tp__';
    el.innerHTML =
      '<div class="tp-hdr"><span id="tpTitle"></span><button id="tpClose" type="button">✕</button></div>' +
      '<div class="tp-lbl" id="tpColorLbl">' + tr('tp.color') + '</div>' +
      '<div class="tp-colors" id="tpColors"></div>' +
      '<div class="tp-lbl" id="tpSizeLbl">' + tr('tp.size') + '</div>' +
      '<div class="tp-size"><input type="range" id="tpSize" min="' + SIZE_MIN + '" max="' + SIZE_MAX + '">' +
      '<span class="tp-val" id="tpSizeVal"></span></div>' +
      '<div class="tp-lbl" id="tpModeLbl">' + tr('tp.mode') + '</div>' +
      '<div class="tp-mode" id="tpMode">' +
      '<button type="button" data-mode="1"></button>' +
      '<button type="button" data-mode="0"></button></div>';
    document.body.appendChild(el);
    tpRef = el;

    el.querySelector('#tpClose').addEventListener('click', closeToolPopover);
    // Keeps focus (and the page's own selection) where it was, like the bar —
    // but never on a control: preventDefault on mousedown is exactly what
    // starts a range drag and opens the colour picker, so swallowing it here
    // left the slider stuck.
    el.addEventListener('mousedown', e => {
      if (e.target.closest('input, button')) return;
      e.preventDefault();
    });

    const slider = el.querySelector('#tpSize');
    slider.addEventListener('input', () => {
      sz = Math.max(SIZE_MIN, Math.min(SIZE_MAX, +slider.value));
      const k = sizeKey(tpTool); if (k) toolSizes[k] = sz;
      syncToolPopover();
      if (tpTool === 'pencil') drawPencilCursor();
      else if (tpTool === 'highlight') drawHighlightCursor();
      else if (tpTool === 'eraser') drawEraserCursor();
    });
    slider.addEventListener('change', savePrefs);

    el.querySelectorAll('#tpMode button').forEach(b => {
      b.addEventListener('click', () => {
        const on = b.dataset.mode === '1';
        if (tpTool === 'highlight') hlStraight = on;
        else if (tpTool === 'pencil') pencilSmooth = on;
        else if (tpTool === 'eraser') { eraserStroke = on; drawEraserCursor(); }
        syncToolPopover();
        savePrefs();
      });
    });
    return el;
  }

  // Colours are a subscription feature in the app; the swatches stay visible
  // and padlocked so people can see what they'd get.
  const colorsLocked = () => PD_ENV === 'android' && !isPremiumUser;

  function renderToolColors() {
    const wrap = tpRef?.querySelector('#tpColors');
    if (!wrap) return;
    wrap.classList.toggle('pd-locked', colorsLocked());
    wrap.innerHTML = '';
    const cur = (toolColors[colorKey(tpTool)] || color || '').toLowerCase();
    TOOL_PALETTE.forEach(c => {
      const b = document.createElement('button');
      b.type = 'button';
      b.style.backgroundColor = c;
      b.title = c;
      if (c.toLowerCase() === cur) b.classList.add('on');
      b.addEventListener('click', () => {
        if (colorsLocked()) { premiumOk(); return; }
        selectColor(c);
      });
      wrap.appendChild(b);
    });
    // Fifth slot is the picker: any colour at all. It wears the current colour
    // and gets the ring whenever that colour isn't one of the four above.
    const pick = document.createElement('button');
    pick.type = 'button';
    pick.className = 'tp-pick';
    pick.title = tr('color.other');
    pick.style.backgroundColor = cur || '#ffffff';
    if (!TOOL_PALETTE.some(c => c.toLowerCase() === cur)) pick.classList.add('on');
    const inp = document.createElement('input');
    inp.type = 'color';
    inp.value = /^#[0-9a-f]{6}$/i.test(cur) ? cur : '#E53935';
    inp.addEventListener('input', e => {
      if (colorsLocked()) return;
      selectColor(e.target.value);
    });
    if (colorsLocked()) {
      inp.disabled = true;
      pick.addEventListener('click', () => premiumOk());
    }
    pick.appendChild(inp);
    wrap.appendChild(pick);
  }

  /** Fills the pop-over from the current tool state and re-anchors it. */
  function syncToolPopover() {
    if (!tpRef || tpRef.style.display !== 'block' || !tpTool) return;
    tpRef.querySelector('#tpTitle').textContent = TOOL_LABEL[tpTool] || '';

    const hasColor = !!colorKey(tpTool);
    tpRef.querySelector('#tpColorLbl').style.display = hasColor ? '' : 'none';
    tpRef.querySelector('#tpColors').style.display = hasColor ? '' : 'none';
    if (hasColor) renderToolColors();

    // The whole-stroke eraser has no thickness to set.
    const hasSize = !(tpTool === 'eraser' && eraserStroke);
    tpRef.querySelector('#tpSizeLbl').style.display = hasSize ? '' : 'none';
    tpRef.querySelector('.tp-size').style.display = hasSize ? '' : 'none';
    const size = toolSizes[sizeKey(tpTool)] != null ? toolSizes[sizeKey(tpTool)] : sz;
    tpRef.querySelector('#tpSize').value = size;
    tpRef.querySelector('#tpSizeVal').textContent = size;

    // Two tools have a mode: the marker (ruler or freehand) and the eraser
    // (whole stroke or rubbing pixels out).
    const modes = tpTool === 'highlight' ? [tr('tp.ruler'), tr('tp.free')]
                : tpTool === 'eraser' ? [tr('tp.wholeStroke'), tr('tp.free')]
                : tpTool === 'pencil' ? [tr('tp.smooth'), tr('tp.natural')] : null;
    tpRef.querySelector('#tpModeLbl').style.display = modes ? '' : 'none';
    tpRef.querySelector('#tpMode').style.display = modes ? '' : 'none';
    if (modes) {
      const on = tpTool === 'highlight' ? hlStraight : tpTool === 'pencil' ? pencilSmooth : eraserStroke;
      tpRef.querySelectorAll('#tpMode button').forEach(b => {
        const isFirst = b.dataset.mode === '1';
        b.textContent = isFirst ? modes[0] : modes[1];
        b.classList.toggle('on', isFirst === on);
      });
    }
    positionToolPopover();
  }

  /** Anchors the pop-over to its tool button, on whichever edge the bar is. */
  function positionToolPopover() {
    const btn = document.getElementById(TOOL_IDS[tpTool]);
    if (!btn || !tpRef) return;
    const b = btn.getBoundingClientRect();
    const w = tpRef.offsetWidth, h = tpRef.offsetHeight, gap = 8, edge = 8;
    let left, top;
    if (tbPos === 'left' || tbPos === 'right') {
      left = tbPos === 'left' ? b.right + gap : b.left - gap - w;
      top = b.top + b.height / 2 - h / 2;
    } else {
      left = b.left + b.width / 2 - w / 2;
      top = tbPos === 'bottom' ? b.top - gap - h : b.bottom + gap;
    }
    left = Math.max(edge, Math.min(left, innerWidth - w - edge));
    top = Math.max(edge, Math.min(top, innerHeight - h - edge));
    tpRef.style.left = Math.round(left) + 'px';
    tpRef.style.top = Math.round(top) + 'px';
    pin(tpRef, tbPos === 'left' || tbPos === 'right' ? tbPos : 'center', tbPos === 'top' || tbPos === 'bottom' ? tbPos : 'center', false);
  }

  // Closing: a tap anywhere else, or Esc. Capture phase so the page below
  // never sees the Esc that closed us.
  function onTpOutside(e) {
    if (!tpRef || tpRef.style.display !== 'block') return;
    if (e.target.closest?.('#__pd_tp__')) return;
    if (e.target.closest?.('#' + TOOL_IDS[tpTool])) return;   // the button toggles it
    closeToolPopover();
  }
  function onTpKey(e) {
    if (e.key !== 'Escape') return;
    e.preventDefault(); e.stopPropagation();
    closeToolPopover();
  }

  function openToolPopover(t) {
    buildToolPopover();
    tpTool = t;
    // Silences that button's tooltip while the pop-over covers the same spot.
    tb.querySelectorAll('button.pd-tp-open').forEach(b => b.classList.remove('pd-tp-open'));
    document.getElementById(TOOL_IDS[t])?.classList.add('pd-tp-open');
    tpRef.style.display = 'block';
    closeOtherWindows('tp');
    syncToolPopover();
    document.addEventListener('pointerdown', onTpOutside, SIGC);
    document.addEventListener('keydown', onTpKey, SIGC);
  }

  function closeToolPopover() {
    if (!tpRef || tpRef.style.display !== 'block') return;
    tpRef.style.display = 'none';
    tpTool = null;
    tb.querySelectorAll('button.pd-tp-open').forEach(b => b.classList.remove('pd-tp-open'));
    document.removeEventListener('pointerdown', onTpOutside, true);
    document.removeEventListener('keydown', onTpKey, true);
  }

  function toggleToolPopover(t) {
    if (tpRef && tpRef.style.display === 'block' && tpTool === t) closeToolPopover();
    else openToolPopover(t);
  }

  // ─── FLOATING WINDOWS ─────────────────────────────────────────────────────
  // Settings, the shortcut list and the calculator are shown one at a time:
  // opening any of them first closes whichever other is up, so they never
  // stack on top of each other. Called only from each window's "open" path,
  // so closing one never brings another back.
  function closeOtherWindows(keep) {
    if (keep !== 'tp') closeToolPopover();
    if (keep !== 'more') window.__pdCloseMore?.();
    if (keep !== 'cfg' && cfgRef && cfgRef.style.display === 'block') {
      cfgRef.style.display = 'none';
      document.getElementById('bCfg')?.classList.remove('on');
    }
    if (keep !== 'help' && helpRef && helpRef.style.display === 'block') {
      helpRef.style.display = 'none';
      document.getElementById('bHelp')?.classList.remove('on');
    }
    const calc = document.getElementById('__pd_calc__');
    if (keep !== 'calc' && calc && calc.style.display !== 'none') {
      calc.style.display = 'none';
      document.getElementById('bCalc')?.classList.remove('on');
    }
  }

  // ─── KEYBOARD SHORTCUTS PANEL (extension only — no keyboard on tablet) ────
  let helpRef = null;
  if (PD_ENV === 'extension') {
    const helpBtn = document.createElement('button');
    helpBtn.id = 'bHelp';
    helpBtn.innerHTML = '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="M6 8h.01M10 8h.01M14 8h.01M18 8h.01M6 12h.01M10 12h.01M14 12h.01M18 12h.01M8 16h8"/></svg><span class="tt">' + tr('act.shortcuts') + '</span>';
    const fsRef0 = tb.querySelector('#bFS');
    fsRef0.parentNode.insertBefore(helpBtn, fsRef0);

    // [ícone, rótulo, tecla] — always shown with Alt, which is the whole
    // scheme. The icons are the bar's own (the same drawing as its buttons),
    // not emoji: one style everywhere.
    const tbIcon = id => { const sv = tb.querySelector('#' + id + ' svg'); return sv ? sv.outerHTML.replace(/width="\d+" height="\d+"/, 'width="15" height="15"') : ''; };
    const lineIcon = d => `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${d}</svg>`;
    const HK = [
      [tr('hk.tools'), [
        [tbIcon('bPointer'), tr('tool.pointer'), 'A'], [tbIcon('bPencil'), tr('tool.pencil'), 'S'], [tbIcon('bHL'), tr('tool.highlight'), 'D'],
        [tbIcon('bLine'), tr('tool.line'), 'F'], [tbIcon('bRect'), tr('tool.rect'), 'G'], [tbIcon('bCircle'), tr('tool.circle'), 'H'],
        [tbIcon('bText'), tr('hk.text'), 'J'], [tbIcon('bLaser'), tr('hk.laser'), 'K'], [tbIcon('bEraser'), tr('tool.eraser'), 'L'], [tbIcon('bLasso'), tr('hk.lasso'), 'R']
      ]],
      [tr('hk.size'), [[lineIcon('<path d="M5 12h14"/>'), tr('hk.thinner'), 'Z'], [lineIcon('<path d="M12 5v14M5 12h14"/>'), tr('hk.thicker'), 'X']]],
      [tr('hk.actions'), [
        [tbIcon('bUndo'), tr('act.undo'), 'C'], [tbIcon('bRedo'), tr('act.redo'), 'V'],
        [tbIcon('bCap'), tr('act.capture'), 'B'], [tbIcon('bCrop'), tr('act.crop'), 'Shift+B'],
        [tbIcon('bCalc'), tr('act.calc'), 'N'], [tbIcon('bClear'), tr('act.clear'), 'M'],
        ...(PD_ENV === 'extension' && !NOTES_HOLD ? [[lineIcon('<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20V3H6.5A2.5 2.5 0 0 0 4 5.5z"/><path d="M4 19.5A2.5 2.5 0 0 0 6.5 22H20v-5"/>'), tr('act.notes'), 'O']] : [])
      ]]
    ];
    const kbd = combo => combo.split('+').map(k => `<kbd>${k}</kbd>`).join('+');
    const help = document.createElement('div');
    help.id = '__pd_help__';
    help.innerHTML =
      '<div class="cfg-hdr">' + tr('act.shortcuts') + '<button id="helpClose">✕</button></div>' +
      '<div class="hk-legend">' + tr('hk.legend') + '</div>' +
      HK.map(([sec, rows]) =>
        `<div class="cfg-sec">${sec}</div>` +
        rows.map(([ic, lbl, key]) =>
          `<div class="hk-row"><span><i class="hk-ic">${ic}</i>${lbl}</span><span class="hk-keys">${kbd('Alt+' + key)}</span></div>`
        ).join('')
      ).join('') +
      '<div class="hk-mouse">' + tbIcon('bPointer') + '<span>' + tr('hk.mouse') + '</span></div>';
    document.body.appendChild(help);
    helpRef = help;

    helpBtn.addEventListener('click', () => {
      const open = help.style.display !== 'block';
      if (open) {
        closeOtherWindows('help');
        // Same edge-anchoring as the settings panel: below a top bar, above a
        // bottom one, and clear of the top corner beside a column.
        const r = tb.getBoundingClientRect();
        if (tbPos === 'bottom') {
          help.style.top = 'auto'; help.style.bottom = (r.height + 8) + 'px';
          help.style.maxHeight = (innerHeight - r.height - 16) + 'px';
        } else {
          help.style.bottom = 'auto';
          help.style.top = (tbPos === 'top' ? r.height + 8 : 8) + 'px';
          help.style.maxHeight = (innerHeight - (tbPos === 'top' ? r.height + 8 : 8) - 8) + 'px';
        }
        help.style.right = (tbPos === 'right' ? r.width + 8 : 8) + 'px';
        pin(help, 'right', tbPos === 'bottom' ? 'bottom' : 'top');
      }
      help.style.display = open ? 'block' : 'none';
      helpBtn.classList.toggle('on', open);
    });
    help.querySelector('#helpClose').addEventListener('click', () => {
      help.style.display = 'none';
      helpBtn.classList.remove('on');
    });
  }

  // ─── SETTINGS PANEL (both platforms) ──────────────────────────────────────
  let cfgRef = null;
  let onAutoSitesChanged = null;  // storage listener, removed in destroy()
  {
    const cfgBtn = document.createElement('button');
    cfgBtn.id = 'bCfg';
    cfgBtn.innerHTML = '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 7h-9"/><path d="M14 17H5"/><circle cx="17" cy="17" r="3"/><circle cx="7" cy="7" r="3"/></svg><span class="tt">' + tr('act.settings') + '</span>';
    const fsRef = tb.querySelector('#bFS');
    fsRef.parentNode.insertBefore(cfgBtn, fsRef);

    const cfg = document.createElement('div');
    cfg.id = '__pd_cfg__';
    cfg.innerHTML = `
      <div class="cfg-hdr">${tr('act.settings')}<button id="cfgClose">✕</button></div>
      <button class="cfg-swap cfg-tour" id="cfgTour">${tr('tour.again')}</button>
      <div class="cfg-sec" id="cfgThemeSec">${tr('cfg.theme')}</div>
      <div class="cfg-theme" id="cfgTheme">
        <button data-theme="light">${tr('cfg.light')}</button>
        <button data-theme="dark">${tr('cfg.dark')}</button>
        <button data-theme="auto" title="${tr('cfg.autoThemeTitle')}">${tr('cfg.auto')}</button>
      </div>
      <div id="cfgLangSec">
        <div class="cfg-sec">${tr('cfg.lang')}</div>
        <div class="cfg-theme" id="cfgLang">
          <button data-lang="auto" title="${tr('cfg.langAutoTitle')}">${tr('cfg.auto')}</button>
          <button data-lang="pt">Português</button>
          <button data-lang="en">English</button>
          <button data-lang="es">Español</button>
          <button data-lang="fr">Français</button>
        </div>
        <div class="cfg-note" style="margin-left:0">${PD_ENV === 'android' ? tr('cfg.langNoteApp') : tr('cfg.langNoteExt')}</div>
      </div>
      <div class="cfg-sec">${tr('cfg.barsPos')}</div>
      <button class="cfg-swap" id="cfgSwap">${tr('cfg.swap')}</button>
      <div class="cfg-sec">${tr('cfg.toolbar')}</div>
      <div class="cfg-pos" id="cfgTbPos">
        <button data-tbp="top">${tr('cfg.top')}</button>
        <button data-tbp="left">${tr('cfg.left')}</button>
        <span class="cfg-screen" aria-hidden="true"><svg width="22" height="16" viewBox="0 0 22 16" fill="none" stroke="currentColor" stroke-width="1.6"><rect x="1" y="1" width="20" height="14" rx="2.5"/></svg></span>
        <button data-tbp="right">${tr('cfg.right')}</button>
        <button data-tbp="bottom">${tr('cfg.bottom')}</button>
      </div>
      <div class="cfg-sec">${tr('cfg.scBar')}</div>
      <div class="cfg-pos">
        <button data-pos="top">${tr('cfg.top')}</button>
        <button data-pos="left">${tr('cfg.left')}</button>
        <button data-pos="hidden">${tr('cfg.hidden')}</button>
        <button data-pos="right">${tr('cfg.right')}</button>
        <button data-pos="bottom">${tr('cfg.bottom')}</button>
      </div>
      <div class="cfg-sec">${tr('cfg.size')}</div>
      <div class="cfg-note" style="margin-left:0">${tr('cfg.sizeNote')}</div>
      <div class="cfg-size" id="cfgCalcRow"><span class="lbl">🧮 ${tr('act.calc')}</span><input type="range" min="70" max="160" step="10" data-tk="calc"><span class="val"></span></div>
      <div class="cfg-sec">${tr('cfg.navSec')}</div>
      <label class="cfg-check"><input type="checkbox" id="cfgClearNav"><span>${tr('cfg.clearNav')}</span></label>
      <div class="cfg-note" style="margin-left:0">${tr('cfg.clearNavNote')}</div>
      ${TOUCH_SCREEN ? `<div class="cfg-sec">${tr('cfg.penSec')}</div>
      <label class="cfg-check"><input type="checkbox" id="cfgPenOnly"><span>${tr('cfg.penOnly')}</span></label>
      <div class="cfg-note" style="margin-left:0">${tr('cfg.penOnlyNote')}</div>` : ''}
    `;
    // Subscription status/entry point (android only) — otherwise the paywall
    // would only be reachable by tapping a locked tool.
    if (PD_ENV === 'android') {
      const subSec = document.createElement('div');
      subSec.innerHTML =
        '<div class="cfg-sec">' + tr('cfg.sub') + '</div><div class="cfg-sub" id="cfgSubRow"></div>' +
        '<div class="cfg-sec">' + tr('cfg.help') + '</div><div class="cfg-sub">' +
        '<button id="cfgTutorialBtn" class="cfg-ghost">' + tr('cfg.tutorial') + '</button></div>';
      cfg.appendChild(subSec);
    }
    // What the icon opens (extension only, 29/10/2026): the Draw (the
    // default) or the home screen — background.js reads bnIconOpens.
    if (PD_ENV === 'extension') {
      const iconSec = document.createElement('div');
      iconSec.innerHTML =
        '<div class="cfg-sec">' + tr('cfg.iconOpens') + '</div>' +
        '<div class="cfg-theme" id="cfgIcon"><button data-icon="draw">' + tr('cfg.iconDraw') + '</button><button data-icon="home">' + tr('cfg.iconHome') + '</button></div>' +
        '<div class="cfg-note" style="margin-left:0">' + tr('cfg.iconNote') + '</div>';
      cfg.appendChild(iconSec);
      // The Highlights' menu on a selection (highlights.js, hlOn) — for whoever
      // only wants the Draw: off, selecting text is plain again.
      const hlSec = document.createElement('div');
      hlSec.innerHTML =
        '<div class="cfg-sec">' + tr('cfg.hlMenu') + '</div>' +
        '<div class="cfg-theme" id="cfgHlMenu"><button data-hlmenu="on">' + tr('cfg.hlShow') + '</button><button data-hlmenu="off">' + tr('cfg.hlHide') + '</button></div>' +
        '<div class="cfg-note" style="margin-left:0">' + tr('cfg.hlNote') + '</div>';
      cfg.appendChild(hlSec);
      const paintHl = v => hlSec.querySelectorAll('[data-hlmenu]').forEach(b => b.classList.toggle('on', b.dataset.hlmenu === v));
      try { chrome.storage.local.get('hlOn', r => paintHl(r?.hlOn === false ? 'off' : 'on')); } catch (e) {}
      hlSec.addEventListener('click', e => {
        const b = e.target.closest('[data-hlmenu]');
        if (!b) return;
        try { chrome.storage.local.set({ hlOn: b.dataset.hlmenu === 'on' }); } catch (e2) {}
        paintHl(b.dataset.hlmenu);
      });
      const paintIcon = v => iconSec.querySelectorAll('[data-icon]').forEach(b => b.classList.toggle('on', b.dataset.icon === v));
      try { chrome.storage.local.get('bnIconOpens', r => paintIcon(r?.bnIconOpens === 'home' ? 'home' : 'draw')); } catch (e) {}
      iconSec.addEventListener('click', e => {
        const b = e.target.closest('[data-icon]');
        if (!b) return;
        try { chrome.storage.local.set({ bnIconOpens: b.dataset.icon }); } catch (e2) {}
        paintIcon(b.dataset.icon);
      });
    }
    // "Abrir sozinha" on this site (extension only; back on 27/10/2026, after
    // leaving with the home screen): the bar opens as this site loads. background.js owns the list and the
    // site's access; this row shows the state and asks for the change. Off on
    // pages that aren't a plain website (file://, etc.).
    const autoHost = (PD_ENV === 'extension' && /^https?:$/.test(location.protocol))
      ? location.hostname.replace(/^www\./, '').toLowerCase() : '';
    let autoOn = false;
    if (autoHost && autoHost.includes('.')) {
      const autoSec = document.createElement('div');
      autoSec.innerHTML =
        '<div class="cfg-sec">' + tr('cfg.autoOpen') + '</div>' +
        '<button class="cfg-swap cfg-auto" id="cfgAuto"></button>' +
        '<div class="cfg-note" style="margin-left:0">' + tr('cfg.autoOpenNote') + '</div>';
      cfg.appendChild(autoSec);
    }
    const autoBtn = cfg.querySelector('#cfgAuto');
    const renderAutoRow = () => {
      if (!autoBtn) return;
      autoBtn.classList.toggle('on', autoOn);
      autoBtn.textContent = autoOn ? tr('cfg.autoOn', autoHost) : tr('cfg.autoOff', autoHost);
    };
    if (autoBtn) {
      const readAuto = () => {
        try {
          chrome.storage.local.get('pdAutoSites', res => {
            const sites = Array.isArray(res?.pdAutoSites) ? res.pdAutoSites : [];
            autoOn = sites.includes(autoHost);
            renderAutoRow();
          });
        } catch (e) {}
      };
      readAuto();
      // The permission window answers in storage — reflect it right away.
      onAutoSitesChanged = (changes, area) => { if (area === 'local' && changes.pdAutoSites) readAuto(); };
      try { chrome.storage.onChanged.addListener(onAutoSitesChanged); } catch (e) {}
      autoBtn.addEventListener('click', () => {
        try { chrome.runtime.sendMessage({ action: 'autoOpen', host: autoHost, on: !autoOn }); } catch (e) {}
      });
    }
    document.body.appendChild(cfg);
    cfgRef = cfg;

    const calcSlider = cfg.querySelector('[data-tk="calc"]');
    const nav = cfg.querySelector('#cfgClearNav');
    const penBox = cfg.querySelector('#cfgPenOnly');
    if (penBox) penBox.addEventListener('change', () => { penOnly = penBox.checked; savePrefs(); refreshCanvasLive(); });
    nav.addEventListener('change', () => { clearOnNav = nav.checked; savePrefs(); });
    const syncCfg = () => {
      nav.checked = clearOnNav;
      if (penBox) penBox.checked = !!penOnly;
      // Grey out the edge the other bar already occupies, so the two can never
      // be sent to the same side from here. ('hidden' isn't an edge, so it
      // never blocks anything and can't itself be blocked.)
      const scSide = scPos === 'hidden' ? null : scPos;
      cfg.querySelectorAll('.cfg-pos button[data-pos]').forEach(b => {
        b.classList.toggle('on', b.dataset.pos === scPos);
        b.disabled = (b.dataset.pos === tbPos);
      });
      cfg.querySelectorAll('.cfg-pos button[data-tbp]').forEach(b => {
        b.classList.toggle('on', b.dataset.tbp === tbPos);
        b.disabled = (b.dataset.tbp === scSide);
      });
      // Nothing to trade places with while the shortcut bar is off.
      cfg.querySelector('#cfgSwap').disabled = (scPos === 'hidden');
      calcSlider.value = Math.round(calcScale * 100);
      calcSlider.nextElementSibling.textContent = calcSlider.value + '%';
      renderSubRow();
    };
    cfgBtn.addEventListener('click', () => {
      const open = cfg.style.display !== 'block';
      if (open) {
        closeOtherWindows('cfg');
        // Anchored to the bar's own edge: below a top bar, above a bottom one,
        // beside a column — where "toolbar height" is the whole screen, so
        // measuring down from it would put the panel off the bottom edge.
        const r = tb.getBoundingClientRect();
        if (tbPos === 'bottom') {
          cfg.style.top = 'auto';
          cfg.style.bottom = (r.height + 8) + 'px';
          cfg.style.maxHeight = (innerHeight - r.height - 16) + 'px';
        } else {
          cfg.style.bottom = 'auto';
          cfg.style.top = (tbPos === 'top' ? r.height + 8 : 8) + 'px';
          cfg.style.maxHeight = (innerHeight - (tbPos === 'top' ? r.height + 8 : 8) - 8) + 'px';
        }
        cfg.style.right = (tbPos === 'right' ? r.width + 8 : 8) + 'px';
        pin(cfg, 'right', tbPos === 'bottom' ? 'bottom' : 'top');
        syncCfg();
      }
      cfg.style.display = open ? 'block' : 'none';
      cfgBtn.classList.toggle('on', open);
    });
    cfg.querySelector('#cfgClose').addEventListener('click', () => {
      cfg.style.display = 'none';
      cfgBtn.classList.remove('on');
    });
    cfg.querySelector('#cfgTutorialBtn')?.addEventListener('click', () => {
      // Close settings first — the walkthrough is a native overlay and would
      // otherwise appear with this panel still sitting on top of it.
      cfg.style.display = 'none';
      cfgBtn.classList.remove('on');
      try { window.AndroidBridge.showOnboarding(); } catch (e) {}
    });
    cfg.querySelector('#cfgTour').addEventListener('click', () => { cfg.style.display = 'none'; document.getElementById('bCfg')?.classList.remove('on'); runDrawTour(true); });
    cfg.querySelector('#cfgSwap').addEventListener('click', () => {
      const t = tbPos, s = scPos;
      if (s === 'hidden') return;
      // Park the shortcut bar out of the way first: 'hidden' collides with no
      // edge, so the toolbar can then take the bar's old one without the
      // collision lock shoving anything around behind our back.
      applyScPos('hidden');
      applyTbPos(s);
      applyScPos(t);
      syncCfg();
      savePrefs();
    });
    cfg.querySelectorAll('.cfg-pos button[data-pos]').forEach(b => b.addEventListener('click', () => {
      applyScPos(b.dataset.pos);
      syncCfg();
      savePrefs();
    }));
    cfg.querySelectorAll('.cfg-pos button[data-tbp]').forEach(b => b.addEventListener('click', () => {
      applyTbPos(b.dataset.tbp);
      syncCfg();
      savePrefs();
    }));
    calcSlider.addEventListener('input', () => {
      calcScale = +calcSlider.value / 100;
      calcSlider.nextElementSibling.textContent = calcSlider.value + '%';
      applyCalcScale();  // live-resize if the calculator is currently open
    });
    calcSlider.addEventListener('change', savePrefs);
    cfg.querySelectorAll('#cfgTheme button').forEach(b => b.addEventListener('click', () => {
      setThemeMode(b.dataset.theme);
      savePrefs();
    }));
    applyTheme();   // lights up the current chip

    // Idioma / Language. The site's demo is Portuguese only, so it has no row.
    const langSec = cfg.querySelector('#cfgLangSec');
    if (PD_ENV === 'web') langSec.remove();
    else {
      const langBtns = cfg.querySelectorAll('#cfgLang button');
      langBtns.forEach(b => b.classList.toggle('on', b.dataset.lang === langPref));
      langBtns.forEach(b => b.addEventListener('click', () => {
        const v = b.dataset.lang;
        if (v === langPref) return;
        langPref = v;
        if (PD_ENV === 'android') {
          // The app stores it as its own language and recreates the screen;
          // the page comes back with this file injected in the new language.
          try { window.AndroidBridge.setLang(v); } catch (e) {}
          return;
        }
        // Extension: store it, take this bar down and have the background
        // bring it back up with the new language handed over.
        savePrefs();
        destroy();
        try { chrome.runtime.sendMessage({ action: 'pdReopen' }); } catch (e) {}
      }));
    }
  }

  // ─── TOOL / CURSOR ────────────────────────────────────────────────────────
  const TOOL_IDS = {
    pointer: 'bPointer', pencil: 'bPencil', highlight: 'bHL',
    line: 'bLine', rect: 'bRect', circle: 'bCircle',
    text: 'bText', laser: 'bLaser', eraser: 'bEraser', lasso: 'bLasso'
  };
  // Tools a phone reaches through the "⋮" menu rather than the bar.
  const MORE_TOOLS = ['line', 'rect', 'circle'];
  const setTool = t => {
    // Locked tools open the paywall instead of activating (android only —
    // PREMIUM_TOOLS is never reached with isPremiumUser hardcoded true elsewhere)
    if (PREMIUM_TOOLS.includes(t) && !premiumOk()) return;
    if (t !== 'lasso' && (sel || lassoPts)) { tool = t; clearSel(); }
    tool = t;
    Object.keys(TOOL_IDS).forEach(k =>
      document.getElementById(TOOL_IDS[k])?.classList.toggle('on', k === t)
    );
    // A tool picked from the phone's "⋮" menu lights the menu button up.
    document.getElementById('bMore')?.classList.toggle('on', MORE_TOOLS.includes(t));
    // The app turns pull-to-refresh off while a drawing tool is in hand, so a
    // downward stroke near the top of the page never reloads it.
    if (PD_ENV === 'android') { try { window.AndroidBridge.setDrawTool(t); } catch (e) {} }
    // Every branch below sets cv's cursor afresh, so the cached image is gone.
    curKey = '';
    clearCursorCanvas();
    if (tool === 'pointer') {
      cv.style.pointerEvents = 'none'; cv.style.cursor = 'default';
      root.style.pointerEvents = 'none';
      textLayer.style.pointerEvents = 'none';
    } else if (tool === 'laser') {
      cv.style.pointerEvents = 'all'; cv.style.cursor = 'none';
      root.style.pointerEvents = 'none';
      textLayer.style.pointerEvents = 'none';
      startLaserLoop();
    } else if (tool === 'pencil') {
      cv.style.pointerEvents = 'all'; cv.style.cursor = 'none';
      root.style.pointerEvents = 'none';
      textLayer.style.pointerEvents = 'none';
      drawPencilCursor();
    } else if (tool === 'highlight') {
      cv.style.pointerEvents = 'all'; cv.style.cursor = 'none';
      root.style.pointerEvents = 'none';
      textLayer.style.pointerEvents = 'none';
      drawHighlightCursor();
    } else if (tool === 'text') {
      cv.style.pointerEvents = 'all'; cv.style.cursor = 'text';
      root.style.pointerEvents = 'none';
      textLayer.style.pointerEvents = 'none';
    } else if (tool === 'eraser') {
      cv.style.pointerEvents = 'all'; cv.style.cursor = 'none';
      root.style.pointerEvents = 'none';
      textLayer.style.pointerEvents = 'none';
      drawEraserCursor();
    } else {
      cv.style.pointerEvents = 'all'; cv.style.cursor = 'crosshair';
      root.style.pointerEvents = 'none';
      textLayer.style.pointerEvents = 'none';
    }
    if (penOnly) refreshCanvasLive();
    // Bring back this tool's own thickness and colour, and show that colour in
    // the bar's picker so both ways of changing it always agree.
    const k = sizeKey(t);
    if (k && toolSizes[k] != null) sz = Math.max(SIZE_MIN, Math.min(SIZE_MAX, toolSizes[k]));
    const ck = colorKey(t);
    if (ck && toolColors[ck]) {
      color = toolColors[ck];
      const picker = document.getElementById('bColor');
      if (picker) picker.value = color;
      updateActiveSwatch();
    }
    if (t === 'pencil') drawPencilCursor();
    else if (t === 'highlight') drawHighlightCursor();
    else if (t === 'eraser') drawEraserCursor();
    syncToolPopover();
  };

  // ─── PENCIL CURSOR DOT ──────────────────────────────────────────────────
  function drawPencilCursor() {
    if (tool !== 'pencil') return clearCursorCanvas();
    const radius = Math.max(sz / 2, 3);
    toolCursor('pencil|' + radius + '|' + color, Math.ceil(radius) + 2, (c, x, y) => {
      c.save();
      c.globalAlpha = 1;
      c.fillStyle = color;
      c.beginPath();
      c.arc(x, y, radius, 0, Math.PI * 2);
      c.fill();
      // Thin border for visibility on similar-colored backgrounds
      c.globalAlpha = 0.4;
      c.strokeStyle = '#000';
      c.lineWidth = 1;
      c.stroke();
      c.restore();
    });
  }

  // ─── HIGHLIGHT CURSOR CIRCLE ─────────────────────────────────────────────
  // Circle whose radius reflects the marker thickness (highlight draws at sz*5).
  function drawHighlightCursor() {
    if (tool !== 'highlight') return clearCursorCanvas();
    const radius = Math.max(sz * 2.5, 3);
    toolCursor('highlight|' + radius + '|' + color, Math.ceil(radius) + 2, (c, x, y) => {
      c.save();
      // Translucent fill in the marker colour
      c.globalAlpha = 0.30;
      c.fillStyle = color;
      c.beginPath();
      c.arc(x, y, radius, 0, Math.PI * 2);
      c.fill();
      // Outline for visibility
      c.globalAlpha = 0.75;
      c.strokeStyle = color;
      c.lineWidth = 1.5;
      c.stroke();
      c.restore();
    });
  }

  // ─── ERASER CURSOR CIRCLE ────────────────────────────────────────────────
  function drawEraserCursor() {
    if (tool !== 'eraser') return clearCursorCanvas();
    // In whole-stroke mode the size means nothing — show a small, fixed ring.
    const radius = eraserStroke ? 9 : Math.max(sz * 2.5, 4);
    toolCursor('eraser|' + radius, Math.ceil(radius) + 2, (c, x, y) => {
      c.save();
      c.strokeStyle = '#555';
      c.lineWidth = 1.5;
      c.globalAlpha = 0.85;
      c.beginPath();
      c.arc(x, y, radius, 0, Math.PI * 2);
      c.stroke();
      // Inner fill hint
      c.globalAlpha = 0.08;
      c.fillStyle = '#000';
      c.fill();
      c.restore();
    });
  }

  // Track pointer position globally (pen, touch and mouse) for cursor rendering.
  // Using pointermove instead of mousemove ensures the digitizer pen cursor
  // updates in real-time without waiting for synthesised mouse events.
  document.addEventListener('pointermove', e => {
    mouseX = e.clientX; mouseY = e.clientY;
    if (tool === 'laser') {
      drawLaserCursor();
      startLaserLoop();
    } else if (tool === 'pencil') {
      drawPencilCursor();
    } else if (tool === 'highlight') {
      drawHighlightCursor();
    } else if (tool === 'eraser') {
      drawEraserCursor();
    }
  }, SIG);

  // The cursor dot exists to preview where the next stroke lands and how thick
  // it will be. Once the pointer is gone that position means nothing, so a dot
  // left floating is stale — clear it.
  // (A cursor image needs no clearing: the browser stops drawing it itself.)
  const clearToolCursor = clearCursorCanvas;

  // Pen lifted out of hover range, or mouse left the window: relatedTarget is
  // null only when the pointer leaves the document entirely, so this doesn't
  // fire while merely moving between elements.
  document.addEventListener('pointerout', e => {
    if (e.relatedTarget === null) clearToolCursor();
  }, SIG);
  document.documentElement.addEventListener('pointerleave', clearToolCursor, SIG);
  // Touch has no hover at all, so the dot is stale the moment the finger lifts.
  document.addEventListener('pointerup', e => {
    if (e.pointerType === 'touch') clearToolCursor();
  }, SIG);
  document.addEventListener('pointercancel', e => {
    if (e.pointerType === 'touch') clearToolCursor();
  }, SIG);

  // ─── CANVAS HELPERS ───────────────────────────────────────────────────────
  const getPos = e => {
    const r = cv.getBoundingClientRect();
    const x = e.clientX - r.left, y = e.clientY - r.top;
    // px/py are page-relative (used to store strokes anchored to page content)
    const _o = scrollOffset();
    return { x, y, px: x + _o.x, py: y + _o.y };
  };
  const pushH = () => {
    hist.push({
      strokes: strokes.map(s => ({ ...s, pts: s.pts ? s.pts.slice() : undefined })),
      html: textLayer.innerHTML
    });
    if (hist.length > 60) hist.shift();
    redoStack = [];
  };

  const applyHistState = (state) => {
    sel = null; lassoPts = null; selAct = null;   // an undone move: the box would point at old strokes
    strokes = state.strokes.map(s => ({ ...s, pts: s.pts ? s.pts.slice() : undefined }));
    textLayer.innerHTML = state.html;
    renderAllStrokes();
    // Reattach events to restored post-it nodes
    const postits = textLayer.querySelectorAll('.pd-postit');
    postits.forEach(postit => {
      const header = postit.querySelector('.postit-header');
      const resizeHandle = postit.querySelector('.postit-resize');
      const closeBtn = postit.querySelector('.postit-close');
      const body = postit.querySelector('.postit-body');
      if (header) setupPostItDrag(postit, header);
      if (resizeHandle) setupPostItResize(postit, resizeHandle);
      if (closeBtn) {
        closeBtn.addEventListener('mousedown', e => e.stopPropagation());
        closeBtn.addEventListener('click', e => {
          e.stopPropagation();
          pushH();
          postit.remove();
        });
      }
      if (body) {
        body.addEventListener('mousedown', e => e.stopPropagation());
        body.addEventListener('click', e => e.stopPropagation());
        body.addEventListener('keydown', e => e.stopPropagation());
        body.addEventListener('input', () => { body.textContent = body.value; });
      }
    });
  };

  // ── Smooth pencil via quadratic bezier midpoints ─────────────────────────
  // Live drawing still happens in viewport coords for smooth incremental render.
  // Points are simultaneously stored in page coords (px/py) in currentPencilStroke.
  function pencilBegin(p) {
    pencilPts = [p];
    currentPencilStroke = { type: 'pencil', color, sz, pts: [{ x: p.px, y: p.py }], ...(pencilSmooth ? {} : { raw: true }) };
    cx.save();
    cx.globalAlpha = 1;
    cx.globalCompositeOperation = 'source-over';
    cx.strokeStyle = color;
    cx.lineWidth = sz;
    cx.lineCap = 'round';
    cx.lineJoin = 'round';
    cx.beginPath();
    cx.moveTo(p.x, p.y);
  }
  function pencilMove(p) {
    pencilPts.push(p);
    if (currentPencilStroke) currentPencilStroke.pts.push({ x: p.px, y: p.py });
    const len = pencilPts.length;
    if (len < 3 || !pencilSmooth) {
      cx.lineTo(p.x, p.y);
      cx.stroke();
      // Natural: segment by segment (stroking the whole path again on every
      // sample would grow with the stroke).
      if (!pencilSmooth) { cx.beginPath(); cx.moveTo(p.x, p.y); }
      return;
    }
    const prev = pencilPts[len - 2];
    const cur = pencilPts[len - 1];
    const midX = (prev.x + cur.x) / 2;
    const midY = (prev.y + cur.y) / 2;
    cx.quadraticCurveTo(prev.x, prev.y, midX, midY);
    cx.stroke();
    cx.beginPath();
    cx.moveTo(midX, midY);
  }
  function pencilEnd() {
    if (pencilPts.length >= 2) {
      const last = pencilPts[pencilPts.length - 1];
      cx.lineTo(last.x, last.y);
      cx.stroke();
    }
    cx.restore();
    cx.beginPath();
    pencilPts = [];
    // Commit the stroke to the vector store and update base cache
    if (currentPencilStroke && currentPencilStroke.pts.length > 0) {
      strokes.push(currentPencilStroke);
    }
    currentPencilStroke = null;
    renderAllStrokes();
  }

  // ── Highlight live preview (pts are page-relative; project to viewport) ──
  function renderHighlight(pts) {
    if (pts.length < 1) return;
    const _o = scrollOffset(); const ox = -_o.x, oy = -_o.y;
    const tmp = scratch(), tc = tmp.getContext('2d');
    tc.strokeStyle = color; tc.lineWidth = sz * 5;
    tc.lineCap = 'round'; tc.lineJoin = 'round'; tc.globalAlpha = 1;
    tc.beginPath(); tc.moveTo(pts[0].x + ox, pts[0].y + oy);
    for (let i = 1; i < pts.length; i++) tc.lineTo(pts[i].x + ox, pts[i].y + oy);
    tc.stroke();
    // Restore completed strokes as base, then composite preview on top
    if (baseSnap) restoreBase();
    else cx.clearRect(0, 0, cv.width, cv.height);
    cx.save();
    cx.globalAlpha = 0.30; cx.globalCompositeOperation = 'source-over';
    cx.drawImage(tmp, 0, 0);
    cx.restore();
  }

  // ─── DRAW EVENTS ──────────────────────────────────────────────────────────
  // Unified Pointer Events — handles pen (mesa digitalizadora), single-touch
  // (tablet touchscreen) and mouse with one set of listeners.
  //
  // • pen   : always draws; setPointerCapture keeps events flowing even when
  //           the stylus moves outside the canvas bounds.
  // • touch : only the primary touch (isPrimary) draws — additional fingers
  //           are ignored so pinch/scroll still work on the page.
  // • mouse : draws normally; ends on pointerleave (preserves original behaviour).
  //
  // getCoalescedEvents() is used on pointermove so that all intermediate
  // positions reported by high-frequency tablets are processed, yielding
  // smoother strokes on devices with many touch-recognition points.
  // ─── MULTI-TOUCH PAN + PALM REJECTION ─────────────────────────────────────
  // Two simultaneous fingers scroll the page instead of drawing (any stroke
  // started by the first finger is discarded). When a stylus was seen recently
  // (hover or contact), single-finger touches are ignored entirely — that is
  // the palm resting on the screen while writing.
  const activeTouches = new Map();   // pointerId → {x, y}
  let touchPanning = false, panLast = null;
  let drawPointerId = null;          // the single pointer allowed to draw a stroke
  // Palm rejection = short rolling window. While the pen is near the screen it
  // keeps emitting events (hover jitter / contact) which refresh the
  // timestamp; pull the pen away and events stop — fingers draw again PALM_MS
  // later. Never latches: no dependency on pointerleave being emitted (many
  // Android digitizers don't fire it), though when it IS emitted we lift the
  // rejection immediately via penGone().
  const PALM_MS = 1200;
  let penLastSeen = -PALM_MS;
  const palmActive = () => performance.now() - penLastSeen < PALM_MS;
  const notePen = e => { if (e.pointerType === 'pen') penLastSeen = performance.now(); };
  const penGone = () => { penLastSeen = performance.now() - PALM_MS; };
  const touchCentroid = () => {
    let x = 0, y = 0;
    for (const t of activeTouches.values()) { x += t.x; y += t.y; }
    const n = activeTouches.size || 1;
    return { x: x / n, y: y / n };
  };
  const releaseTouch = e => {
    if (e.pointerType !== 'touch') return;
    activeTouches.delete(e.pointerId);
    if (touchPanning && activeTouches.size < 2) { touchPanning = false; panLast = null; }
  };

  // Discard the stroke in progress without committing it (second finger turned
  // the gesture into a pan, palm stroke pre-empted by the pen, pointercancel).
  function abortDraw() {
    if (!drawing) return;
    drawing = false;
    drawPointerId = null;
    if (tool === 'lasso') {
      lassoAbort();
    } else if (tool === 'laser') {
      const i = laserStrokes.indexOf(currentLaserStroke);
      if (i >= 0) laserStrokes.splice(i, 1);
      currentLaserStroke = null;
    } else {
      hist.pop();                                       // undo the pushH() from pointerdown
      if (tool === 'pencil' && currentPencilStroke) cx.restore();  // balance pencilBegin's cx.save()
      currentPencilStroke = null; pencilPts = [];
      currentEraserStroke = null;
      hlPts = []; lastP = null;
      renderAllStrokes();                               // wipe the preview back to committed state
    }
  }

  // ─── DRAW WITH THE STYLUS ONLY (penOnly) ──────────────────────────────────
  // The drawing layer stays out of the finger's way — the site underneath
  // scrolls and takes taps as if the bar weren't there — and comes alive
  // while a pen is near (hover) or touching. A pen that touches down with no
  // hover first is caught on the page and handed to the layer.
  // Over another site's frame (the Notes' "Resolver aqui", notes/qframe.js)
  // the pen's hover goes to the frame and never reaches us: there the layer
  // stays alive and only the finger is kept from drawing. A mouse moving here
  // wakes it too — on a laptop with a touch screen it draws as always.
  const overFrame = () => !!window.__pdOverFrame;
  let mouseAt = -1e9;
  function canvasLive() { return tool !== 'pointer' && (!penOnly || overFrame() || palmActive() || drawing || performance.now() - mouseAt < 1500); }
  let liveTimer = 0;
  function refreshCanvasLive() {
    if (tool === 'pointer') return;
    cv.style.pointerEvents = canvasLive() ? 'all' : 'none';
    clearTimeout(liveTimer);
    if (penOnly && palmActive()) liveTimer = setTimeout(refreshCanvasLive, PALM_MS + 50);
  }
  let mouseTimer = 0;
  if (TOUCH_SCREEN) {
    const penSeen = e => {
      if (e.pointerType !== 'pen') return;
      notePen(e);
      if (penOnly === null) {   // the first pen ever: stylus-only from now on
        penOnly = true; savePrefs();
        try { showToast(tr('pen.autoOn')); } catch (err) {}
      }
      if (penOnly && cv.style.pointerEvents === 'none' && tool !== 'pointer') refreshCanvasLive();
    };
    document.addEventListener('pointermove', penSeen, SIGC);
    document.addEventListener('pointerover', penSeen, SIGC);
    document.addEventListener('pointermove', e => {
      if (e.pointerType !== 'mouse' || !penOnly) return;
      mouseAt = performance.now();
      if (cv.style.pointerEvents === 'none' && tool !== 'pointer') refreshCanvasLive();
      clearTimeout(mouseTimer); mouseTimer = setTimeout(refreshCanvasLive, 1600);
    }, SIGC);
    // A pen down on the page itself (no hover first): to the layer.
    document.addEventListener('pointerdown', e => {
      if (e.pointerType !== 'pen' || !penOnly || tool === 'pointer' || e.target === cv) return;
      // The partial capture's dim (#__pd_sel__) takes the pen too: it draws the
      // area there, not a stroke under it (04/11/2026, the Android app on a tablet).
      if (e.target.closest && e.target.closest('#__pd_tb__, #__pd_sc__, #__pd_tp__, #__pd_cfg__, #__pd_sel__')) return;
      penSeen(e);
      refreshCanvasLive();
      e.preventDefault(); e.stopPropagation();
      try { cv.setPointerCapture(e.pointerId); } catch (err) {}
      cv.dispatchEvent(new PointerEvent('pointerdown', e));
    }, SIGC);
  }

  const shouldDraw = e => {
    if (e.pointerType === 'touch') {
      if (palmActive()) return false;    // stylus in use → reject finger/palm
      if (penOnly && overFrame()) return false;
      return e.isPrimary && !touchPanning;
    }
    return true;
  };

  // A button the page lets through the ink (inside [data-pd-tap]: the
  // flashcard's "Mostrar resposta" and its grades in the Notes, 05/11/2026):
  // with the pencil on, a tap on it presses it instead of drawing — no need
  // to put the pencil down. The page element under the ink at that point.
  let tapDown = null;
  const tapThrough = e => {
    if (!document.elementsFromPoint) return null;
    for (const el of document.elementsFromPoint(e.clientX, e.clientY)) {
      if (el === cv || (el.closest && el.closest('#__pd_root__'))) continue;
      return (el.closest && el.closest('[data-pd-tap] button, [data-pd-tap] a[href], button[data-pd-tap]')) || null;
    }
    return null;
  };
  cv.addEventListener('pointerdown', e => {
    const tap = tapThrough(e);
    if (tap && !drawing) { e.preventDefault(); e.stopImmediatePropagation(); tapDown = { el: tap, id: e.pointerId }; return; }
    // Cheap when a scroller is already known; picks one up after an SPA route
    // change swapped the panel out.
    ensureScroller();
    notePen(e);
    // Pen touching down while a (palm) touch stroke is active: discard it
    if (e.pointerType === 'pen' && drawing) abortDraw();
    if (e.pointerType === 'touch') {
      activeTouches.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (activeTouches.size >= 2) {
        if (drawing) abortDraw();
        touchPanning = true;
        panLast = touchCentroid();
        cv.setPointerCapture(e.pointerId);
        e.preventDefault();
        return;
      }
    }
    if (!shouldDraw(e)) return;
    if (drawing) return;   // a stroke is already owned by another pointer
    // Middle-click clear (mouse only)
    if (e.pointerType === 'mouse' && e.button === 1) {
      e.preventDefault();
      document.getElementById('bClear')?.click();
      return;
    }
    if (e.button !== 0) return;
    e.preventDefault();
    // Capture pen / touch so pointermove keeps firing even when off-canvas
    if (e.pointerType !== 'mouse') cv.setPointerCapture(e.pointerId);
    const p = getPos(e);
    if (tool === 'text') { spawnPostIt(p.x, p.y); return; }
    drawing = true;
    drawPointerId = e.pointerId;
    // Store start in page-relative coords so shape commits are scroll-aware
    sx = p.px; sy = p.py;
    if (tool === 'lasso') { lassoDown(p); return; }
    if (tool === 'laser') {
      currentLaserStroke = { points: [{ x: p.x, y: p.y }], color: '#FF1010' };
      laserStrokes.push(currentLaserStroke);
      lastLaserActivity = performance.now();
      laserFadeStart = null;
      startLaserLoop();
      return;
    }
    pushH();
    if (tool === 'pencil') {
      pencilBegin(p);
    } else if (tool === 'highlight') {
      // Store in page coords; Y is locked to starting page Y
      hlPts = [{ x: p.px, y: p.py }];
    } else if (tool === 'eraser') {
      if (eraserStroke) {
        eraseStrokeAt(p);
      } else {
        // Rub out right where it touched down, and record that first point:
        // without it a fast flick only starts erasing at the second sample.
        currentEraserStroke = { type: 'eraser', pts: [{ x: p.px, y: p.py, sz }] };
        cx.save();
        cx.globalCompositeOperation = 'destination-out'; cx.globalAlpha = 1;
        cx.beginPath(); cx.arc(p.x, p.y, sz * 2.5, 0, Math.PI * 2); cx.fill();
        cx.restore();
      }
    }
    // line/rect/circle: no snap needed — base cache handles preview
  });

  cv.addEventListener('pointermove', e => {
    notePen(e);
    if (e.pointerType === 'touch' && activeTouches.has(e.pointerId)) {
      activeTouches.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (touchPanning) {
        e.preventDefault();
        const c = touchCentroid();
        // Scroll whatever actually scrolls: window.scrollBy is a no-op on the
        // app-shell sites where the content lives in an inner panel.
        if (panLast) scrollPageBy(panLast.x - c.x, panLast.y - c.y);
        panLast = c;
        return;
      }
    }
    if (!shouldDraw(e)) return;
    if (!drawing) { if (tool === 'lasso' && e.pointerType !== 'touch') lassoHover(getPos(e)); return; }
    if (e.pointerId !== drawPointerId) return;   // only the stroke's own pointer draws
    // The tip is no longer down (a pen tablet that didn't report lifting — some
    // pass as a mouse): end the stroke here, or the hover to the next mark
    // (the dot of an i) would be drawn as a line.
    // Desktop only: the app's WebViews aren't trusted to report buttons for a pen.
    if (PD_ENV !== 'android' && e.pointerType !== 'touch' && (e.buttons & 1) === 0) { endDraw(); return; }
    e.preventDefault();
    // Process all coalesced positions for smooth strokes on high-frequency tablets
    const events = (e.getCoalescedEvents && e.getCoalescedEvents()) || [e];
    for (const ev of events) {
      const p = getPos(ev);
      lastP = p;  // keep for scroll-during-drag repaint
      if (tool === 'laser') {
        if (currentLaserStroke) {
          const lastPoint = currentLaserStroke.points[currentLaserStroke.points.length - 1];
          const dist = Math.hypot(p.x - lastPoint.x, p.y - lastPoint.y);
          const limit = 5;
          if (dist > limit) {
            const steps = Math.floor(dist / limit);
            for (let i = 1; i <= steps; i++) {
              const t = i / (steps + 1);
              currentLaserStroke.points.push({
                x: lastPoint.x + (p.x - lastPoint.x) * t,
                y: lastPoint.y + (p.y - lastPoint.y) * t
              });
            }
          }
          currentLaserStroke.points.push({ x: p.x, y: p.y });
          lastLaserActivity = performance.now();
          laserFadeStart = null;
        }
      } else if (tool === 'pencil') {
        pencilMove(p);
      } else if (tool === 'lasso') {
        lassoMove(p);
      } else if (tool === 'highlight') {
        // Ruler mode locks Y to the starting page Y — the reason the marker
        // never wobbles over a line of text. Free mode follows the hand.
        hlPts.push({ x: p.px, y: hlStraight ? hlPts[0].y : p.py });
        renderHighlight(hlPts);
      } else if (tool === 'eraser' && eraserStroke) {
        // Whole-stroke mode: dragging over several strokes takes them all.
        eraseStrokeAt(p);
      } else if (tool === 'eraser') {
        // Interpolate between last recorded point and current to avoid skipping
        const _o = scrollOffset(); const scrollX = _o.x, scrollY = _o.y;
        const step = Math.max(sz * 1.2, 2);
        cx.save(); cx.globalCompositeOperation = 'destination-out'; cx.globalAlpha = 1;
        if (currentEraserStroke && currentEraserStroke.pts.length > 0) {
          const last = currentEraserStroke.pts[currentEraserStroke.pts.length - 1];
          const dist = Math.hypot(p.px - last.x, p.py - last.y);
          if (dist > step) {
            const steps = Math.ceil(dist / step);
            for (let i = 1; i < steps; i++) {
              const t = i / steps;
              const ipx = last.x + (p.px - last.x) * t;
              const ipy = last.y + (p.py - last.y) * t;
              currentEraserStroke.pts.push({ x: ipx, y: ipy, sz });
              cx.beginPath(); cx.arc(ipx - scrollX, ipy - scrollY, sz * 2.5, 0, Math.PI * 2); cx.fill();
            }
          }
        }
        if (currentEraserStroke) currentEraserStroke.pts.push({ x: p.px, y: p.py, sz });
        cx.beginPath(); cx.arc(p.x, p.y, sz * 2.5, 0, Math.PI * 2); cx.fill();
        cx.restore();
      } else if (tool === 'line' || tool === 'rect' || tool === 'circle') {
        // Use base cache + draw preview shape in viewport coords
        _drawShapePreview(p);
      }
    }
  });

  const endDraw = () => {
    if (!drawing) return; drawing = false;
    drawPointerId = null;
    if (tool === 'lasso') {
      lassoEnd();
    } else if (tool === 'pencil') {
      pencilEnd(); // commits currentPencilStroke to strokes[] and calls renderAllStrokes
    } else if (tool === 'highlight') {
      if (hlPts.length > 1) strokes.push({ type: 'highlight', color, sz, pts: hlPts.slice() });
      hlPts = [];
      renderAllStrokes();
    } else if (tool === 'laser') {
      currentLaserStroke = null;
      lastLaserActivity = performance.now();
    } else if (tool === 'eraser') {
      if (currentEraserStroke && currentEraserStroke.pts.length > 0) {
        strokes.push(currentEraserStroke);
      }
      currentEraserStroke = null;
      renderAllStrokes();
    } else if (tool === 'line' || tool === 'rect' || tool === 'circle') {
      // Commit shape using page-relative start (sx/sy) and last pointer page coords (lastP)
      if (lastP) {
        const s = { type: tool, color, sz, x1: sx, y1: sy, x2: lastP.px, y2: lastP.py };
        strokes.push(s);
      }
      lastP = null;
      renderAllStrokes();
    }
  };
  cv.addEventListener('pointerup', e => {
    if (tapDown && e.pointerId === tapDown.id) {
      const t = tapDown; tapDown = null;
      if (tapThrough(e) === t.el && !t.el.disabled) t.el.click();
      return;
    }
    releaseTouch(e);
    if (drawing && e.pointerId === drawPointerId) endDraw();
  });
  // pointercancel fires on palm rejection, browser interruption, etc. — the
  // gesture was taken over, so discard (not commit) the partial stroke.
  cv.addEventListener('pointercancel', e => {
    if (tapDown && e.pointerId === tapDown.id) tapDown = null;
    if (e.pointerType === 'pen') penGone();
    releaseTouch(e);
    if (drawing && e.pointerId === drawPointerId) abortDraw();
  });
  // Mouse only: end drawing when cursor leaves canvas
  // (pen/touch keep drawing via pointer capture even outside canvas bounds)
  // Pen: leaving = stylus pulled out of hover range → lift palm rejection
  cv.addEventListener('pointerleave', e => {
    if (e.pointerType === 'mouse') endDraw();
    else if (e.pointerType === 'pen') penGone();
  });

  // ─── LASER TRAIL ─────────────────────────────────────────────────────────
  function updateLaserTrail() {
    const now = performance.now();
    const FADE_DELAY = 2000;
    const FADE_DURATION = 500;

    // The loop runs every frame while the laser is in hand. Clearing an
    // already blank canvas still makes the browser repaint the whole viewport
    // layer, every frame, on top of whatever the page is playing — so only
    // clear what the last frame actually drew.
    if (laserPainted) lx.clearRect(0, 0, lv.width, lv.height);
    laserPainted = false;

    const timeSinceActivity = now - lastLaserActivity;
    let globalAlpha = 1.0;

    if (timeSinceActivity > FADE_DELAY) {
      if (laserFadeStart === null) laserFadeStart = now;
      const progress = (now - laserFadeStart) / FADE_DURATION;
      globalAlpha = Math.max(0, 1 - progress);

      if (globalAlpha <= 0) {
        laserStrokes = [];
        currentLaserStroke = null;
        laserFadeStart = null;
        globalAlpha = 0;
      }
    } else {
      laserFadeStart = null;
      globalAlpha = 1.0;
    }

    if (laserStrokes.length > 0 && globalAlpha > 0) {
      laserPainted = true;
      lx.lineJoin = 'round';
      lx.lineCap = 'round';
      lx.shadowBlur = 10;
      lx.shadowColor = '#FF0000';
      lx.lineWidth = sz * 1.2;
      lx.strokeStyle = `rgba(255, 16, 16, ${globalAlpha})`;

      laserStrokes.forEach(stroke => {
        if (stroke.points.length < 2) {
          // Draw a single dot if it's just a click
          if (stroke.points.length === 1) {
            lx.beginPath();
            lx.arc(stroke.points[0].x, stroke.points[0].y, sz * 0.75, 0, Math.PI * 2);
            lx.fillStyle = `rgba(255, 16, 16, ${globalAlpha})`;
            lx.fill();
          }
          return;
        }

        lx.beginPath();
        lx.moveTo(stroke.points[0].x, stroke.points[0].y);
        for (let i = 1; i < stroke.points.length; i++) {
          lx.lineTo(stroke.points[i].x, stroke.points[i].y);
        }
        lx.stroke();
      });
    }

    // Draw the bright tip explicitly if tool is active and we are drawing
    if (tool === 'laser' && drawing && currentLaserStroke && currentLaserStroke.points.length > 0) {
      const tip = currentLaserStroke.points[currentLaserStroke.points.length - 1];
      laserPainted = true;
      lx.globalAlpha = 1.0;
      lx.shadowBlur = 20;
      lx.shadowColor = '#FF0000';
      lx.fillStyle = '#FF1010';
      lx.beginPath();
      lx.arc(tip.x, tip.y, sz * 0.6 + 3, 0, Math.PI * 2);
      lx.fill();
      lx.shadowBlur = 0;
    }
  }

  // ─── POST-IT NOTES ───────────────────────────────────────────────────────
  const POST_IT_COLORS = [
    { bg: '#FFF9C4', border: '#F9E547' },  // yellow
    { bg: '#C8E6C9', border: '#66BB6A' },  // green
    { bg: '#BBDEFB', border: '#42A5F5' },  // blue
    { bg: '#F8BBD0', border: '#EC407A' },  // pink
    { bg: '#FFE0B2', border: '#FFA726' },  // orange
    { bg: '#E1BEE7', border: '#AB47BC' },  // purple
  ];
  let postItColorIdx = 0;

  function getNextPostItColor() {
    const c = POST_IT_COLORS[postItColorIdx % POST_IT_COLORS.length];
    postItColorIdx++;
    return c;
  }

  function setupPostItDrag(postit, header) {
    let dragging = false, ox = 0, oy = 0;
    header.addEventListener('mousedown', e => {
      if (e.target.closest('.postit-close')) return;
      dragging = true;
      const rect = postit.getBoundingClientRect();
      const parentRect = textLayer.getBoundingClientRect();
      ox = e.clientX - rect.left + parentRect.left;
      oy = e.clientY - rect.top + parentRect.top;
      e.preventDefault();
      e.stopPropagation();
    });
    document.addEventListener('mousemove', e => {
      if (!dragging) return;
      const newX = e.clientX - ox;
      const newY = e.clientY - oy;
      postit.style.left = newX + 'px';
      postit.style.top = newY + 'px';
      postit.dataset.x = newX;
      postit.dataset.y = newY;
    }, SIG);
    document.addEventListener('mouseup', () => { dragging = false; }, SIG);
  }

  function setupPostItResize(postit, handle) {
    let resizing = false, startX = 0, startY = 0, startW = 0, startH = 0;
    handle.addEventListener('mousedown', e => {
      resizing = true;
      startX = e.clientX;
      startY = e.clientY;
      startW = postit.offsetWidth;
      startH = postit.offsetHeight;
      e.preventDefault();
      e.stopPropagation();
    });
    document.addEventListener('mousemove', e => {
      if (!resizing) return;
      const w = Math.max(160, startW + (e.clientX - startX));
      const h = Math.max(100, startH + (e.clientY - startY));
      postit.style.width = w + 'px';
      postit.style.height = h + 'px';
    }, SIG);
    document.addEventListener('mouseup', () => { resizing = false; }, SIG);
  }

  function spawnPostIt(x, y) {
    pushH();
    const piColor = getNextPostItColor();

    const postit = document.createElement('div');
    postit.className = 'pd-text-node pd-postit';
    postit.dataset.x = x;
    postit.dataset.y = y;
    postit.dataset.bg = piColor.bg;
    postit.dataset.border = piColor.border;
    postit.style.left = x + 'px';
    postit.style.top = y + 'px';
    postit.style.background = piColor.bg;

    // Header (drag handle + close)
    const header = document.createElement('div');
    header.className = 'postit-header';
    header.innerHTML = `<span>${tr('note.title')}</span>`;
    const closeBtn = document.createElement('button');
    closeBtn.className = 'postit-close';
    closeBtn.innerHTML = '✕';
    closeBtn.title = tr('note.remove');
    closeBtn.addEventListener('mousedown', e => e.stopPropagation());
    closeBtn.addEventListener('click', e => {
      e.stopPropagation();
      pushH();
      postit.remove();
    });
    header.appendChild(closeBtn);
    postit.appendChild(header);

    // Body (textarea)
    const body = document.createElement('textarea');
    body.className = 'postit-body';
    body.placeholder = tr('note.placeholder');
    body.addEventListener('mousedown', e => e.stopPropagation());
    body.addEventListener('click', e => e.stopPropagation());
    body.addEventListener('keydown', e => e.stopPropagation());
    // What the history keeps is the markup: the text typed goes into it too.
    body.addEventListener('input', () => { body.textContent = body.value; });
    postit.appendChild(body);

    // Resize handle
    const resizeHandle = document.createElement('div');
    resizeHandle.className = 'postit-resize';
    resizeHandle.innerHTML = `<svg width="16" height="16" viewBox="0 0 16 16"><path d="M14 14L8 14L14 8Z" fill="rgba(0,0,0,.25)"/><path d="M14 14L11 14L14 11Z" fill="rgba(0,0,0,.35)"/></svg>`;
    postit.appendChild(resizeHandle);

    textLayer.appendChild(postit);

    // Setup interactions
    setupPostItDrag(postit, header);
    setupPostItResize(postit, resizeHandle);

    // Focus the textarea
    setTimeout(() => body.focus(), 50);
  }

  // ─── KEY SIMULATION ───────────────────────────────────────────────────────
  // Dispatch a single key event to every plausible target so quiz apps catch it
  function dispatchOneKey(key, code) {
    const kc = { 'Enter': 13, 'ArrowLeft': 37, 'ArrowRight': 39, 'a': 65, 'b': 66, 'c': 67, 'd': 68, 'e': 69, 'f': 70, 'h': 72, 'n': 78, 'o': 79 }[key]
      ?? key.toUpperCase().charCodeAt(0);
    const opts = {
      key, code, keyCode: kc, which: kc, charCode: key === 'Enter' ? 13 : 0,
      bubbles: true, cancelable: true, composed: true
    };

    // Despachamos apenas em document.body — borbulha naturalmente até document/window.
    // Despachar para múltiplos alvos (activeElement/lastFocus + body) causa double-fire:
    // na 1ª questão lastFocus === document.body → 1 alvo único → funcionava;
    // nas seguintes lastFocus vira um elemento do quiz → 2 alvos → o evento borbulha
    // de cada um até document, fazendo o quiz processar a tecla 2× → estado 0→1→2 (riscado).
    ['keydown', 'keypress', 'keyup'].forEach(t => document.body.dispatchEvent(new KeyboardEvent(t, opts)));
  }

  function sendKey(key, code) {
    __pdSending = true;
    dispatchOneKey(key, code);
    requestAnimationFrame(() => { __pdSending = false; });
  }

  // keyThenEnter: send letter, then after a delay capture the NEW activeElement and send Enter there
  function keyThenEnter(key, code) {
    // Step 1: blur toolbar so page gets focus
    if (document.activeElement?.closest('#__pd_tb__,#__pd_sc__')) {
      document.activeElement.blur();
    }

    // Step 2: dispatch letter
    __pdSending = true;
    dispatchOneKey(key, code);

    // Step 3: after quiz processes the letter (focus may have moved), dispatch Enter
    // We try at 300ms and 600ms to cover slow quiz platforms
    setTimeout(() => {
      __pdSending = true;
      // At this moment capture who has focus — the quiz may have moved it to a confirm button
      dispatchOneKey('Enter', 'Enter');
      requestAnimationFrame(() => { __pdSending = false; });
    }, 350);

    // Second attempt a bit later (belt-and-suspenders for slow platforms)
    setTimeout(() => {
      requestAnimationFrame(() => { __pdSending = false; });
    }, 700);
  }

  // ─── CALCULATOR ───────────────────────────────────────────────────────────
  const calc = {
    display: '0', expr: '', op: null, prev: null,
    reset: false, decimal: false, mem: 0, lastInput: null
  };

  function calcDoMath(a, b, op) {
    if (op === '+') return a + b;
    if (op === '-') return a - b;
    if (op === '*') return a * b;
    if (op === '/') return b === 0 ? null : a / b;
    return b;
  }
  function calcFmt(n) {
    if (n === null || !isFinite(n) || isNaN(n)) return CALC_ERR;
    const s = parseFloat(n.toPrecision(14)).toString();
    return s;
  }
  function calcOpSym(op) {
    return { '+': '+', '-': '−', '*': '×', '/': '÷' }[op] || op;
  }

  function calcDigit(d) {
    if (calc.display === CALC_ERR) { calc.display = '0'; calc.decimal = false; }
    if (calc.reset) {
      calc.display = d === '.' ? '0.' : d === '0' ? '0' : d;
      calc.reset = false; calc.decimal = d === '.';
    } else if (d === '.') {
      if (!calc.decimal) { calc.display += '.'; calc.decimal = true; }
    } else if (calc.display === '0' || calc.display === '-0') {
      calc.display = calc.display.startsWith('-') ? '-' + d : d;
    } else {
      if (calc.display.replace(/[^0-9]/g, '').length < 15) calc.display += d;
    }
    calc.lastInput = 'digit';
    calcUpdateUI();
  }

  function calcOp(op) {
    if (calc.display === CALC_ERR) return;
    const cur = parseFloat(calc.display);
    if (calc.prev !== null && calc.lastInput === 'digit') {
      const res = calcDoMath(calc.prev, cur, calc.op);
      calc.display = calcFmt(res);
      calc.prev = res !== null ? res : null;
    } else {
      calc.prev = cur;
    }
    calc.op = op;
    calc.expr = calcFmt(calc.prev) + ' ' + calcOpSym(op);
    calc.reset = true; calc.decimal = false; calc.lastInput = 'operator';
    calcUpdateUI();
  }

  function calcEquals() {
    if (calc.display === CALC_ERR) return;
    const cur = parseFloat(calc.display);
    if (calc.op === null || calc.prev === null) {
      calc.expr = calc.display + ' ='; calcUpdateUI(); return;
    }
    const res = calcDoMath(calc.prev, cur, calc.op);
    calc.expr = calcFmt(calc.prev) + ' ' + calcOpSym(calc.op) + ' ' + calcFmt(cur) + ' =';
    calc.display = calcFmt(res);
    calc.prev = null; calc.op = null; calc.reset = true; calc.decimal = false;
    calc.lastInput = 'equals'; calcUpdateUI();
  }

  function calcFn(fn) {
    const cur = parseFloat(calc.display);
    if (fn === 'ce') {
      calc.display = '0'; calc.decimal = false; calc.reset = false;
    } else if (fn === 'c') {
      calc.display = '0'; calc.expr = ''; calc.op = null; calc.prev = null;
      calc.reset = false; calc.decimal = false;
    } else if (fn === 'back') {
      if (calc.reset || calc.display === CALC_ERR) { calc.display = '0'; calc.reset = false; calc.decimal = false; }
      else if (calc.display.length <= 1 || (calc.display.length === 2 && calc.display[0] === '-')) { calc.display = '0'; calc.decimal = false; }
      else { if (calc.display.endsWith('.')) calc.decimal = false; calc.display = calc.display.slice(0, -1); }
    } else if (fn === '+/-') {
      if (!isNaN(cur) && cur !== 0) { calc.display = calcFmt(-cur); calc.decimal = calc.display.includes('.'); }
    } else if (fn === '%') {
      const v = (calc.prev !== null && calc.op !== null) ? calc.prev * cur / 100 : cur / 100;
      calc.display = calcFmt(v); calc.decimal = calc.display.includes('.');
    } else if (fn === 'sqrt') {
      if (isNaN(cur) || cur < 0) calc.display = CALC_ERR;
      else { calc.display = calcFmt(Math.sqrt(cur)); calc.decimal = calc.display.includes('.'); }
    } else if (fn === 'x2') {
      calc.display = calcFmt(cur * cur); calc.decimal = calc.display.includes('.');
    } else if (fn === '1/x') {
      if (isNaN(cur) || cur === 0) calc.display = CALC_ERR;
      else { calc.display = calcFmt(1 / cur); calc.decimal = calc.display.includes('.'); }
    } else if (fn === 'mc') { calc.mem = 0; }
    else if (fn === 'mr') { calc.display = calcFmt(calc.mem); calc.decimal = calc.display.includes('.'); calc.reset = true; }
    else if (fn === 'm+') { calc.mem += isNaN(cur) ? 0 : cur; }
    else if (fn === 'm-') { calc.mem -= isNaN(cur) ? 0 : cur; }
    else if (fn === 'ms') { calc.mem = isNaN(cur) ? 0 : cur; }
    calc.lastInput = 'fn'; calcUpdateUI();
  }

  function calcUpdateUI() {
    const el = document.getElementById('__pd_calc__');
    if (!el) return;
    const disp = el.querySelector('.calc-display');
    const expr = el.querySelector('.calc-expr');
    const memi = el.querySelector('.calc-mem-indicator');
    if (disp) {
      disp.textContent = calc.display;
      const len = calc.display.length;
      disp.style.fontSize = len > 14 ? '16px' : len > 11 ? '20px' : len > 8 ? '26px' : '36px';
    }
    if (expr) expr.textContent = calc.expr;
    if (memi) memi.style.opacity = calc.mem !== 0 ? '1' : '0';
  }

  function toggleCalculator() {
    let el = document.getElementById('__pd_calc__');
    if (el) {
      const visible = el.style.display !== 'none';
      if (!visible) closeOtherWindows('calc');
      el.style.display = visible ? 'none' : 'flex';
      document.getElementById('bCalc')?.classList.toggle('on', !visible);
      return;
    }

    closeOtherWindows('calc');
    el = document.createElement('div');
    el.id = '__pd_calc__';
    el.style.cssText = 'position:fixed;top:80px;right:20px;width:296px;z-index:2147483646;display:flex;flex-direction:column;';
    el.innerHTML = `
      <div class="calc-header">
        <span style="display:flex;align-items:center">
          <span class="calc-mem-indicator">M</span>${tr('act.calc')}
        </span>
        <button class="calc-close-btn">✕</button>
      </div>
      <div class="calc-display-area">
        <div class="calc-expr"></div>
        <div class="calc-display">0</div>
      </div>
      <div class="calc-mem-row">
        <button data-cf="mc">MC</button>
        <button data-cf="mr">MR</button>
        <button data-cf="m+">M+</button>
        <button data-cf="m-">M−</button>
        <button data-cf="ms">MS</button>
      </div>
      <div class="calc-buttons">
        <button data-cf="%">%</button>
        <button data-cf="ce">CE</button>
        <button data-cf="c" class="c-clr">C</button>
        <button data-cf="back">⌫</button>

        <button data-cf="1/x">¹/x</button>
        <button data-cf="x2">x²</button>
        <button data-cf="sqrt">√x</button>
        <button data-co="/" class="c-op">÷</button>

        <button data-cd="7">7</button>
        <button data-cd="8">8</button>
        <button data-cd="9">9</button>
        <button data-co="*" class="c-op">×</button>

        <button data-cd="4">4</button>
        <button data-cd="5">5</button>
        <button data-cd="6">6</button>
        <button data-co="-" class="c-op">−</button>

        <button data-cd="1">1</button>
        <button data-cd="2">2</button>
        <button data-cd="3">3</button>
        <button data-co="+" class="c-op">+</button>

        <button data-cf="+/-">±</button>
        <button data-cd="0">0</button>
        <button data-cd=".">.</button>
        <button data-ceq class="c-eq">=</button>
      </div>
    `;
    document.body.appendChild(el);
    applyCalcScale();

    // Wire buttons — stop propagation so page doesn't receive clicks
    el.querySelectorAll('[data-cd]').forEach(b => {
      b.addEventListener('mousedown', e => e.stopPropagation());
      b.addEventListener('click', () => calcDigit(b.dataset.cd));
    });
    el.querySelectorAll('[data-co]').forEach(b => {
      b.addEventListener('mousedown', e => e.stopPropagation());
      b.addEventListener('click', () => calcOp(b.dataset.co));
    });
    el.querySelectorAll('[data-cf]').forEach(b => {
      b.addEventListener('mousedown', e => e.stopPropagation());
      b.addEventListener('click', () => calcFn(b.dataset.cf));
    });
    el.querySelector('[data-ceq]').addEventListener('mousedown', e => e.stopPropagation());
    el.querySelector('[data-ceq]').addEventListener('click', calcEquals);
    el.querySelector('.calc-close-btn').addEventListener('click', () => {
      el.style.display = 'none';
      document.getElementById('bCalc')?.classList.remove('on');
    });

    // Drag
    let cDrag = false, cOx = 0, cOy = 0;
    const cHdr = el.querySelector('.calc-header');
    cHdr.addEventListener('mousedown', e => {
      if (e.target.closest('.calc-close-btn')) return;
      cDrag = true;
      const r = el.getBoundingClientRect();
      cOx = e.clientX - r.left; cOy = e.clientY - r.top;
      el.style.right = 'auto'; e.preventDefault(); e.stopPropagation();
    });
    document.addEventListener('mousemove', e => {
      if (!cDrag) return;
      el.style.left = (e.clientX - cOx) + 'px';
      el.style.top = (e.clientY - cOy) + 'px';
    }, SIG);
    document.addEventListener('mouseup', () => { cDrag = false; }, SIG);
    el.addEventListener('mousedown', e => e.stopPropagation());

    document.getElementById('bCalc')?.classList.add('on');
    calcUpdateUI();
  }

  // ─── WIRE TOOLBAR ─────────────────────────────────────────────────────────
  const B = id => document.getElementById(id);

  B('bPointer').onclick = () => setTool('pointer');
  B('bText').onclick = () => setTool('text');
  B('bLasso').onclick = () => setTool('lasso');
  B('bLaser').onclick = () => setTool('laser');
  // Tools that carry their own colour and thickness: the first tap picks the
  // tool, a second tap on the tool already in use opens its settings — the
  // gesture stylus apps taught people. Tapping a different tool just switches.
  // In the free app the settings are part of the plan: pencil and eraser work
  // with their defaults, and the second tap opens the paywall instead.
  [['bPencil', 'pencil'], ['bHL', 'highlight'], ['bLine', 'line'],
   ['bRect', 'rect'], ['bCircle', 'circle'], ['bEraser', 'eraser']
  ].forEach(([id, t]) => {
    B(id).onclick = () => {
      if (tool === t) { if (premiumOk()) toggleToolPopover(t); return; }
      closeToolPopover();
      setTool(t);
    };
  });
  // ── Recent colours (last 3 used) ──────────────────────────────────────────
  let recentColors = [color];

  function renderRecentColors() {
    const wrap = document.getElementById('__pd_recent__');
    if (!wrap) return;
    wrap.innerHTML = '';
    recentColors.slice(0, 3).forEach(c => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'pd-sw';
      b.dataset.color = c;
      b.style.backgroundColor = c;
      b.title = tr('color.use', c);
      if (c.toLowerCase() === (color || '').toLowerCase()) b.classList.add('active');
      b.addEventListener('mousedown', e => e.stopPropagation());
      b.addEventListener('click', () => selectColor(c));
      wrap.appendChild(b);
    });
  }

  // Toggle the .active ring on whichever swatch matches the current colour
  function updateActiveSwatch() {
    const wrap = document.getElementById('__pd_recent__');
    if (!wrap) return;
    const cur = (color || '').toLowerCase();
    wrap.querySelectorAll('.pd-sw').forEach(b => {
      b.classList.toggle('active', (b.dataset.color || '').toLowerCase() === cur);
    });
  }

  // Add a colour to the front of the recents list (deduped, max 3) and persist
  function addRecentColor(c) {
    if (!c) return;
    const cl = c.toLowerCase();
    recentColors = recentColors.filter(x => x.toLowerCase() !== cl);
    recentColors.unshift(c);
    if (recentColors.length > 3) recentColors.length = 3;
    renderRecentColors();
    savePrefs();
  }

  // Select a colour (from a swatch or the pop-over): apply it to the tool in
  // use, to the picker in the bar and to the recents.
  function selectColor(c) {
    color = c;
    const ck = colorKey(tool);
    if (ck) toolColors[ck] = c;
    B('bColor').value = c;
    addRecentColor(c);
    syncToolPopover();
    if (tool === 'pencil') drawPencilCursor();
    else if (tool === 'highlight') drawHighlightCursor();
  }

  // Persist the last used colour + size + recent colours + per-tool sizes +
  // shortcut-bar position (platform adapter)
  function savePrefs() {
    PD.savePrefs({ pdColor: color, pdSize: sz, pdRecent: recentColors, pdToolSizes: toolSizes, pdToolColors: toolColors, pdHlStraight: hlStraight, pdPencilSmooth: pencilSmooth, pdEraserStroke: eraserStroke, pdScPos: scPos, pdCalcScale: calcScale, pdTbPos: tbPos, pdNoticeHide: noticeHidden ? NOTICE_ID : '', pdNotesPromoHide: promoHidden ? PROMO_ID : '', pdNotesPromoSnooze: promoSnooze, pdHlPromoHide: hlPromoHidden ? HL_PROMO_ID : '', pdHlPromoSnooze: hlPromoSnooze, pdBfHide: bfHidden, pdTourDone: tourDone ? TOUR_ID : '', pdClearOnNav: clearOnNav, ...(penOnly === null ? {} : { pdPenOnly: penOnly }),
      // The app keeps its theme natively (see setThemeMode).
      pdTheme: themeMode, ...Object.fromEntries(NEWS.map(n => [n.key, newsHidden.has(n.id) ? n.id : ''])),
      ...(PD_ENV === 'extension' ? { pdLang: langPref } : {}) });
  }

  B('bColor').oninput = e => {
    color = e.target.value;
    const ck = colorKey(tool); if (ck) toolColors[ck] = color;
    updateActiveSwatch();
    syncToolPopover();
    if (tool === 'pencil') drawPencilCursor();
    else if (tool === 'highlight') drawHighlightCursor();
  };
  B('bColor').addEventListener('change', e => addRecentColor(e.target.value));
  renderRecentColors();

  // Adjust brush size by delta, respecting the slider's min/max, and sync UI + cursor
  function adjustSize(delta) {
    sz = Math.max(SIZE_MIN, Math.min(SIZE_MAX, sz + delta));
    const k = sizeKey(tool); if (k) toolSizes[k] = sz;  // remember per tool
    syncToolPopover();
    if (tool === 'pencil') drawPencilCursor();
    else if (tool === 'highlight') drawHighlightCursor();
    else if (tool === 'eraser') drawEraserCursor();
    savePrefs();
  }

  // Restore last used colour + size + recent colours from storage and apply
  try {
    PD.loadPrefs((res) => {
      if (!res) {
        // No prefs stored at all — still a first-time visitor who should see
        // the announcements.
        startNotices(); showBfCard();
        return;
      }
      if (res.pdNoticeHide === NOTICE_ID) noticeHidden = true;
      if (res.pdNotesPromoHide === PROMO_ID) promoHidden = true;
      if (typeof res.pdNotesPromoSnooze === 'number') promoSnooze = res.pdNotesPromoSnooze;
      if (res.pdHlPromoHide === HL_PROMO_ID) hlPromoHidden = true;
      if (typeof res.pdHlPromoSnooze === 'number') hlPromoSnooze = res.pdHlPromoSnooze;
      if (res.pdTourDone === TOUR_ID) tourDone = true;
      if (typeof res.pdBfHide === 'string') bfHidden = res.pdBfHide;
      startNotices(); showBfCard();
      if (PD_ENV !== 'android' && THEME_MODES.includes(res.pdTheme)) { themeMode = res.pdTheme; applyTheme(); }
      NEWS.forEach(n => { if (res[n.key] === n.id) newsHidden.add(n.id); });
      maybeShowNews();
      if (typeof res.pdColor === 'string') {
        color = res.pdColor;
        B('bColor').value = color;
      }
      if (typeof res.pdSize === 'number') {
        sz = Math.max(SIZE_MIN, Math.min(SIZE_MAX, res.pdSize));
      }
      if (Array.isArray(res.pdRecent) && res.pdRecent.length) {
        recentColors = res.pdRecent.filter(c => typeof c === 'string').slice(0, 3);
      }
      if (!recentColors.length) recentColors = [color];
      renderRecentColors();
      const storedSizes = (res.pdToolSizes && typeof res.pdToolSizes === 'object')
        ? res.pdToolSizes : {};
      SIZE_TOOLS.forEach(k => {
        // Stored wins. Anything else starts at the default 4 — a tool must
        // never inherit whatever the previous tool happened to be set to.
        toolSizes[k] = typeof storedSizes[k] === 'number'
          ? Math.max(SIZE_MIN, Math.min(SIZE_MAX, storedSizes[k]))
          : SIZE_DEFAULT;
      });
      // Older versions kept one size for all three shapes, under 'shape'.
      if (typeof storedSizes.shape === 'number') {
        ['line', 'rect', 'circle'].forEach(k => {
          if (typeof storedSizes[k] !== 'number') {
            toolSizes[k] = Math.max(SIZE_MIN, Math.min(SIZE_MAX, storedSizes.shape));
          }
        });
      }
      if (typeof res.pdHlStraight === 'boolean') hlStraight = res.pdHlStraight;
      if (typeof res.pdPencilSmooth === 'boolean') pencilSmooth = res.pdPencilSmooth;
      if (typeof res.pdEraserStroke === 'boolean') eraserStroke = res.pdEraserStroke;
      if (typeof res.pdClearOnNav === 'boolean') clearOnNav = res.pdClearOnNav;
      if (typeof res.pdPenOnly === 'boolean') penOnly = res.pdPenOnly;
      const storedColors = (res.pdToolColors && typeof res.pdToolColors === 'object')
        ? res.pdToolColors : {};
      COLOR_TOOLS.forEach(k => {
        // Stored wins. A tool with nothing stored inherits the last colour
        // used, so updating doesn't change what someone was drawing with —
        // except the marker, which starts yellow.
        toolColors[k] = typeof storedColors[k] === 'string'
          ? storedColors[k]
          : (TOOL_COLOR_DEFAULT[k] || color);
      });
      if (typeof res.pdCalcScale === 'number') { calcScale = res.pdCalcScale; applyCalcScale(); }
      // Toolbar first: it owns the collision lock, so restoring it second would
      // let the lock bounce the shortcut bar off the edge we just gave it —
      // exactly the swapped layout the user saved.
      if (typeof res.pdTbPos === 'string') applyTbPos(res.pdTbPos);
      if (typeof res.pdScPos === 'string') { scPosChosen = true; applyScPos(res.pdScPos); }
    });
  } catch (e) {}
  B('bUndo').onclick = () => {
    if (!hist.length) return;
    redoStack.push({
      strokes: strokes.map(s => ({ ...s, pts: s.pts ? s.pts.slice() : undefined })),
      html: textLayer.innerHTML
    });
    applyHistState(hist.pop());
  };
  B('bRedo').onclick = () => {
    if (!redoStack.length) return;
    hist.push({
      strokes: strokes.map(s => ({ ...s, pts: s.pts ? s.pts.slice() : undefined })),
      html: textLayer.innerHTML
    });
    applyHistState(redoStack.pop());
  };

  const performClear = () => { pushH(); sel = null; lassoPts = null; strokes = []; baseSnap = null; anchorRef = null; lastDelta = 0; cx.clearRect(0, 0, cv.width, cv.height); textLayer.innerHTML = ''; };
  // "Limpar os traços ao mudar de página": sites that go to the next question
  // without reloading change the address only (history API, hash). It is
  // checked twice a second and on back/forward; with the option on and
  // something drawn, the drawing goes (Ctrl+Z / Alt+C brings it back).
  // TEC Concursos keeps the caderno's address from question to question:
  // the question's own link (a.id-questao, "#2992744") tells them apart.
  const navKey = () => {
    const q = /(^|\.)tecconcursos\.com\.br$/.test(location.hostname) && document.querySelector('a.id-questao[href*="/questoes/"]');
    return location.href + (q ? ' ' + q.getAttribute('href') : '');
  };
  let navHref = navKey();
  const onNav = () => {
    const now = navKey(), was = navHref;
    if (now === was) return;
    navHref = now;
    // The question's link showing up late (the page still loading) isn't a move.
    if (now.startsWith(was + ' ')) return;
    if (clearOnNav && (strokes.length || textLayer.childNodes.length)) performClear();
  };
  const navIv = setInterval(onNav, 500);
  addEventListener('popstate', onNav, SIG);
  addEventListener('hashchange', onNav, SIG);
  B('bClear').onclick = performClear;
  if (B('bClearSc')) B('bClearSc').onclick = performClear;

  // ─── SCREEN CAPTURE ───────────────────────────────────────────────────────
  // Two entry points, one pipeline: 📷 shoots the whole page area, ✂ lets the
  // user drag a rectangle out first. Both hand runCapture the same rect in
  // viewport CSS pixels, so the two modes can't drift apart.

  // The page area — everything the toolbar doesn't occupy. It doubles as the
  // crop for a full capture, which is why docking the bar at the bottom or on
  // a side needs no special case anywhere below.
  const pageRect = () => {
    // root, not cv: the canvas box comes from its width/height attributes (the
    // whole window), so with the toolbar docked it runs past the viewport by
    // the bar's size. root is what syncLayout actually fits to the free area,
    // and it shares cv's top-left, so drawing coordinates line up either way.
    const r = root.getBoundingClientRect();
    return { x: r.left, y: r.top, w: r.width, h: r.height };
  };

  // Both platforms photograph what is actually on screen, so our own floating
  // UI would land inside the shot. Hide it for the duration. The toolbar is
  // deliberately not in this list: it can never be inside a capture rect, and
  // hiding it would reflow the page under the selection just made.
  const CAPTURE_HIDE = '#__pd_sel__,#__pd_sc__,#__pd_cfg__,#__pd_help__,#__pd_social__,#__pd_tp__,#__pd_news__,#__pd_toast__,#__pd_notes__';
  let hiddenForCapture = null;
  let captureFailsafe = 0;
  const restoreOwnUi = () => {
    clearTimeout(captureFailsafe);
    if (!hiddenForCapture) return;
    hiddenForCapture.forEach(([el, v]) => { el.style.visibility = v; });
    hiddenForCapture = null;
  };
  const hideOwnUi = () => {
    restoreOwnUi();
    hiddenForCapture = [];
    document.querySelectorAll(CAPTURE_HIDE).forEach(el => {
      hiddenForCapture.push([el, el.style.visibility]);
      el.style.visibility = 'hidden';
    });
    // A capture that never reports back (native exception, dropped message)
    // must not leave the bars invisible.
    captureFailsafe = setTimeout(restoreOwnUi, 4000);
  };
  // Called from MainActivity once the pixels have been read back. Restoring
  // any earlier would put the shortcut bar into the photo.
  window.__pdCaptureDone = restoreOwnUi;

  // Runs fn once the hide is actually on screen: two animation frames, since
  // anything that reads pixels back sooner would still see the bars. The timer
  // is the way out when frames stop coming (rAF is paused for a page in the
  // background), so a capture can never hang. Whichever fires first wins.
  const afterPaint = fn => {
    let done = false;
    const go = () => { if (!done) { done = true; fn(); } };
    requestAnimationFrame(() => requestAnimationFrame(go));
    setTimeout(go, 250);
  };

  // PNG to the clipboard. Resolves false instead of throwing wherever the
  // browser won't allow it (plain-http page, tab not focused, a site whose
  // permissions policy blocks it): the file is still saved either way.
  // Takes the PNG data URL already made for the download and decodes it in
  // place, so the write goes out at once — canvas.toBlob would add another
  // async hop between the user's drag and the write.
  const copyShot = dataUrl => {
    if (!navigator.clipboard?.write || typeof ClipboardItem === 'undefined') return Promise.resolve(false);
    try {
      const bin = atob(dataUrl.slice(dataUrl.indexOf(',') + 1));
      const bytes = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
      const blob = new Blob([bytes], { type: 'image/png' });
      return navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })])
        .then(() => true, () => false);
    } catch (e) { return Promise.resolve(false); }
  };
  const PASTE_KEY = /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent || '') ? '⌘+V' : 'Ctrl+V';
  // The app has no keyboard shortcut to point at: pasting there is a long
  // press on a text field.
  const COPIED_MSG = PD_ENV === 'android'
    ? tr('copy.app')
    : tr('copy.desktop', PASTE_KEY);

  // Short note, by default at the bottom of the page area; given an area
  // ({x,y,w,h}, viewport px) it sits on the middle of it instead. One at a
  // time: a new one replaces whatever is still showing.
  let toastTimer = 0;
  function showToast(text, area) {
    let t = document.getElementById('__pd_toast__');
    if (!t) {
      t = document.createElement('div');
      t.id = '__pd_toast__';
      document.body.appendChild(t);
    }
    t.textContent = text;
    const pr = pageRect();
    t.classList.toggle('at-area', !!area);
    t.style.left = (area ? area.x + area.w / 2 : pr.x + pr.w / 2) + 'px';
    t.style.top = (area ? area.y + area.h / 2 : pr.y + pr.h - 24) + 'px';
    t.classList.remove('show');
    void t.offsetWidth;  // restart the fade-in when replacing a toast
    t.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove('show'), 5000);
  }
  // ─── SEND TO GOODRAW NOTES (extension only) ─────────────────────────────
  // The app copies natively, after its own save; it reports back here so the
  // note shows on the area just like in the extension.
  let lastCopyArea = null;
  window.__pdCopied = () => showToast(COPIED_MSG, lastCopyArea);

  // region: {x,y,w,h} in viewport CSS px, or null for the whole page area.
  // Set by a real click on #bCap, its shortcut, its menu entry, or the drag of
  // the region (all trusted input); runCapture takes it once.
  let captureGrant = 0;
  const grantCapture = () => { captureGrant = Date.now(); };
  function runCapture(region) {
    const pr = pageRect();
    // Clamp into the page area: the toolbar strip must never reach the file.
    const x = region ? Math.max(pr.x, region.x) : pr.x;
    const y = region ? Math.max(pr.y, region.y) : pr.y;
    const x2 = region ? Math.min(pr.x + pr.w, region.x + region.w) : pr.x + pr.w;
    const y2 = region ? Math.min(pr.y + pr.h, region.y + region.h) : pr.y + pr.h;
    const w = Math.round(x2 - x), h = Math.round(y2 - y);
    if (w < 8 || h < 8) return;
    // 'web' is the paste-into-a-page dev host: there is no capture API there,
    // and hiding the bars for a shot that can never happen would just make
    // them vanish until the failsafe fires.
    // The Notes ("Resolver aqui", notes/qframe.js) photographs its own tab
    // instead: the page under the pen there is another site's.
    if (PD_ENV === 'web') {
      if (typeof window.__pdWebCapture === 'function') window.__pdWebCapture({ x, y, w, h }, { hide: hideOwnUi, show: restoreOwnUi, afterPaint });
      return;
    }

    hideOwnUi();
    afterPaint(() => {
      if (PD_ENV === 'android') {
        // Native path: page and drawings are already one surface there, so the
        // bridge only needs the rectangle — in physical pixels, which is what
        // PixelCopy reads.
        // A partial shot is also copied, as in the extension.
        const d = window.devicePixelRatio || 1;
        lastCopyArea = region ? { x, y, w, h } : null;
        try {
          window.AndroidBridge.captureArea(
            Math.round(x * d), Math.round(y * d), Math.round(w * d), Math.round(h * d), !!region);
        } catch (e) { console.error('PD capture:', e); restoreOwnUi(); }
        return;
      }
      // Extension path: the background worker grabs the visible tab and the
      // drawing layers are re-composited on top of the crop. Only with a grant
      // from the person's own gesture on our controls, used once (a page's
      // script clicking #bCap can't, even right after a click elsewhere).
      if (Date.now() - captureGrant > 3000) { restoreOwnUi(); return; }
      captureGrant = 0;
      chrome.runtime.sendMessage({ action: 'captureTab' }, (response) => {
        if (!response || !response.dataUrl) {
          console.error('Failed to capture tab');
          restoreOwnUi();
          return;
        }
        const img = new Image();
        img.onerror = restoreOwnUi;
        img.onload = () => {
          // captureVisibleTab returns the viewport at device resolution while
          // every rect here is in CSS px — one factor converts between them.
          // It also keeps the crop sharp on a HiDPI screen instead of blowing
          // the top-left quarter of the image up to full size.
          const s = (img.width / (window.innerWidth || img.width)) || 1;
          const out = document.createElement('canvas');
          out.width = Math.max(1, Math.round(w * s));
          out.height = Math.max(1, Math.round(h * s));
          const o = out.getContext('2d');

          // The captured page background, cropped to the selection
          o.drawImage(img, x * s, y * s, w * s, h * s, 0, 0, out.width, out.height);

          // The drawing layers all share one origin: the top-left of the page
          // area. Shifting that origin onto the crop is the whole difference
          // between a full shot and a partial one.
          o.save();
          o.scale(s, s);
          o.translate(pr.x - x, pr.y - y);
          o.drawImage(cv, 0, 0);
          // Draw post-it notes onto the snapshot canvas
          textLayer.querySelectorAll('.pd-postit').forEach(postit => {
            if (postit.style.display === 'none') return;
            o.save();
            const nx = parseFloat(postit.dataset.x);
            const ny = parseFloat(postit.dataset.y);
            const pw = postit.offsetWidth;
            const ph = postit.offsetHeight;
            const bg = postit.dataset.bg || '#FFF9C4';

            // Draw post-it background
            o.globalAlpha = 0.95;
            o.fillStyle = bg;
            o.shadowColor = 'rgba(0,0,0,0.2)';
            o.shadowBlur = 10;
            o.shadowOffsetX = 2;
            o.shadowOffsetY = 4;
            o.fillRect(nx, ny, pw, ph);
            o.shadowBlur = 0; o.shadowOffsetX = 0; o.shadowOffsetY = 0;

            // Draw header
            o.globalAlpha = 1;
            o.fillStyle = 'rgba(0,0,0,0.06)';
            o.fillRect(nx, ny, pw, 24);
            o.fillStyle = 'rgba(0,0,0,0.4)';
            o.font = "bold 10px 'Segoe UI',Arial,sans-serif";
            o.textBaseline = 'middle';
            o.fillText(tr('note.title'), nx + 10, ny + 13);

            // Draw body text
            const body = postit.querySelector('.postit-body');
            if (body && body.value) {
              o.fillStyle = 'rgba(0,0,0,0.82)';
              o.font = "14px 'Segoe UI',Arial,sans-serif";
              o.textBaseline = 'top';
              const lines = body.value.split('\n');
              lines.forEach((ln, i) => {
                o.fillText(ln, nx + 10, ny + 32 + i * 21);
              });
            }
            o.restore();
          });
          // Laser / cursor trail on top
          o.drawImage(lv, 0, 0);
          o.restore();

          restoreOwnUi();
          // A partial shot is usually headed straight into a message or a
          // doc, so it also lands in the clipboard. Started before the
          // download, while the drag that chose the area still counts as the
          // user's gesture (the clipboard refuses writes without one).
          const png = out.toDataURL('image/png');
          if (region) copyShot(png).then(ok => { if (ok) showToast(COPIED_MSG, { x, y, w, h }); });
          // An area: it can also go into the caderno de erros (highlights.js, same page).
          // That modal has its own "Baixar", so then nothing is saved by itself
          // (29/10/2026: the browser's save window opened on top of it).
          if (region && window.__bnErr) { window.__bnErr.offer(png, w, h); return; }
          const a = document.createElement('a');
          a.download = 'goodraw-draw-' + Date.now() + '.png';
          a.href = png;
          a.click();
        };
        img.src = response.dataUrl;
      });
    });
  }

  // Drag-to-select. The overlay is sized to the page area, so any rectangle
  // measured inside it is already clamped to what can legally be captured.
  function startRegionSelect() {
    if (document.getElementById('__pd_sel__')) return;
    const pr = pageRect();
    const ov = document.createElement('div');
    ov.id = '__pd_sel__';
    ov.style.left = pr.x + 'px'; ov.style.top = pr.y + 'px';
    ov.style.width = pr.w + 'px'; ov.style.height = pr.h + 'px';
    ov.innerHTML =
      '<div class="sel-hint">' + tr('sel.hint') + '</div>' +
      '<div class="sel-box"></div><div class="sel-size"></div>';
    document.body.appendChild(ov);

    const box = ov.querySelector('.sel-box');
    const tag = ov.querySelector('.sel-size');
    let sx = 0, sy = 0, active = false;

    const close = () => {
      ov.remove();
      document.removeEventListener('keydown', onEsc, true);
    };
    // Capture phase, so the page underneath never sees the Esc that cancels us.
    function onEsc(e) {
      if (e.key !== 'Escape') return;
      e.preventDefault(); e.stopPropagation();
      close();
    }
    document.addEventListener('keydown', onEsc, SIGC);

    const at = e => [e.clientX - pr.x, e.clientY - pr.y];
    const draw = (ax, ay, bx, by) => {
      const l = Math.min(ax, bx), t = Math.min(ay, by);
      const w = Math.abs(bx - ax), h = Math.abs(by - ay);
      box.style.left = l + 'px'; box.style.top = t + 'px';
      box.style.width = w + 'px'; box.style.height = h + 'px';
      tag.textContent = Math.round(w) + ' × ' + Math.round(h);
      // Above the selection, or just inside it when there is no room above.
      tag.style.left = l + 'px';
      tag.style.top = (t > 24 ? t - 22 : t + 4) + 'px';
      return { l, t, w, h };
    };

    ov.addEventListener('pointerdown', e => {
      // A drag the person makes (a page's script can't draw the rectangle).
      if (!e.isTrusted || active || (e.pointerType === 'mouse' && e.button !== 0)) return;
      active = true;
      ov.classList.add('dragging');
      [sx, sy] = at(e);
      box.style.display = 'block'; tag.style.display = 'block';
      draw(sx, sy, sx, sy);
      try { ov.setPointerCapture(e.pointerId); } catch (err) {}
      e.preventDefault(); e.stopPropagation();
    });
    ov.addEventListener('pointermove', e => {
      // Keeps the tool-cursor dot from tracking under the dim, and the
      // shortcut bar's drag handler out of this gesture.
      e.stopPropagation();
      if (!active) return;
      const [mx, my] = at(e);
      draw(sx, sy, mx, my);
      e.preventDefault();
    });
    ov.addEventListener('pointerup', e => {
      e.stopPropagation();
      if (!e.isTrusted || !active) return;
      active = false;
      const [ex, ey] = at(e);
      const r = draw(sx, sy, ex, ey);
      close();
      if (r.w < 8 || r.h < 8) return;   // a tap, not a drag — treat as cancel
      grantCapture();
      runCapture({ x: r.l + pr.x, y: r.t + pr.y, w: r.w, h: r.h });
    });
    ov.addEventListener('pointercancel', () => { active = false; close(); });
  }

  B('bCap').onclick = e => { if (e && e.isTrusted) grantCapture(); if (premiumOk()) runCapture(null); };
  B('bCrop').onclick = () => { if (premiumOk()) startRegionSelect(); };

  B('bCalc').onclick = () => { if (premiumOk()) toggleCalculator(); };
  // Closed by hand → the automatic opening leaves this page alone until reload
  B('bClose').onclick = () => { window.__pdUserClosed = true; destroy(); };

  // Shortcut buttons: mousedown preventDefault keeps page focus alive
  function shortcut(id, fn) {
    const btn = B(id);
    btn.addEventListener('mousedown', e => { e.preventDefault(); e.stopPropagation(); });
    btn.addEventListener('click', fn);
  }
  shortcut('bOK', () => keyThenEnter('c', 'KeyC'));
  shortcut('bNO', () => keyThenEnter('e', 'KeyE'));
  shortcut('bA', () => keyThenEnter('a', 'KeyA'));
  shortcut('bB', () => keyThenEnter('b', 'KeyB'));
  shortcut('bC', () => keyThenEnter('c', 'KeyC'));
  shortcut('bD', () => keyThenEnter('d', 'KeyD'));
  shortcut('bE', () => keyThenEnter('e', 'KeyE'));
  shortcut('bPrev', () => sendKey('ArrowLeft', 'ArrowLeft'));
  shortcut('bNext', () => sendKey('ArrowRight', 'ArrowRight'));
  shortcut('bNR', () => keyThenEnter('n', 'KeyN'));
  // L alone: it already opens the next question, and an Enter after it
  // landed on that new question and answered it (ticket #16).
  shortcut('bRand', () => sendKey('l', 'KeyL'));
  shortcut('bProf', () => sendKey('o', 'KeyO'));
  shortcut('bForum', () => sendKey('f', 'KeyF'));
  shortcut('bStats', () => sendKey('h', 'KeyH'));

  // ─── KEYBOARD SHORTCUTS ───────────────────────────────────────────────────
  // Every shortcut is Alt+letter, and that is the design, not a leftover. This
  // runs on top of sites that bind plain keys themselves — TEC Concursos uses
  // almost the whole alphabet (a–e for alternatives, n, r, t, v…) plus Ctrl+Z
  // for "desfazer navegação" — and none of them use Alt. So an Alt combo only
  // ever means one thing, and a plain key always belongs to the site.
  //
  // Capture phase on window, with propagation stopped for the combos we act
  // on: the page never receives a shortcut that was ours, even if its own
  // handler doesn't bother checking modifiers.
  //
  // We match on e.code (physical key) rather than e.key: Alt+letter alters
  // e.key on several layouts, and Option+letter on macOS turns it into a
  // diacritic. AltGr arrives as Ctrl+Alt on Windows, so requiring !ctrlKey
  // keeps typed characters such as AltGr+Q ("/") out of this entirely.
  const KEY_TOOL = {
    KeyA: 'pointer', KeyS: 'pencil', KeyD: 'highlight', KeyF: 'line',
    KeyG: 'rect', KeyH: 'circle', KeyJ: 'text', KeyK: 'laser', KeyL: 'eraser', KeyR: 'lasso'
  };
  // The lasso's selection: Delete/Backspace removes it, Esc lets it go.
  window.addEventListener('keydown', e => {
    if (tool !== 'lasso' || !sel || e.altKey || e.ctrlKey || e.metaKey) return;
    const t = e.target, typing = t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName));
    if (typing) return;
    if (e.key === 'Delete' || e.key === 'Backspace') { e.preventDefault(); e.stopPropagation(); deleteSel(); }
    else if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); clearSel(); }
  }, SIGC);
  const KEY_ACTION = {
    KeyZ: () => adjustSize(-1),
    KeyX: () => adjustSize(1),
    KeyC: () => B('bUndo').click(),
    KeyV: () => B('bRedo').click(),
    KeyN: () => B('bCalc').click(),
    KeyM: () => B('bClear').click()
  };

  // A field someone is typing in always wins — including contenteditable
  // rich-text boxes, which are div-based and so invisible to a tagName check.
  // Only fields that take TEXT count. "Any <input>" used to, and that killed
  // the shortcuts in normal use: marking an alternative on a quiz site leaves
  // keyboard focus on its radio button, and because the drawing canvas doesn't
  // take focus when clicked, it stayed there — every shortcut was ignored until
  // the user clicked somewhere neutral, like the toolbar.
  const TEXT_INPUTS = ['text', 'search', 'email', 'url', 'tel', 'password', 'number',
                       'date', 'datetime-local', 'month', 'week', 'time'];
  const typingInPage = t => {
    if (!t || !t.tagName) return false;
    if (t.isContentEditable || t.tagName === 'TEXTAREA') return true;
    return t.tagName === 'INPUT' && TEXT_INPUTS.includes((t.type || 'text').toLowerCase());
  };

  // No exception for focus sitting inside our own bars either: after clicking
  // a tool button the focus is on that button, and the next shortcut has to
  // work from there too.
  const onKey = e => {
    // The person's own keys only: a page's script must not start a capture.
    if (!e.isTrusted || __pdSending) return;
    if (!e.altKey || e.ctrlKey || e.metaKey) return;
    // The GooHighlights' hand-annotation bar is open on this page: its
    // own Alt keys (the same letters) are the ones that count (highlights.js).
    if (window.__bnHlInkOn) return;
    if (typingInPage(e.target)) return;

    let run;
    if (KEY_TOOL[e.code]) run = () => setTool(KEY_TOOL[e.code]);
    // Shift picks the partial shot — Shift is also part of the OS "capture a
    // region" shortcuts (Win+Shift+S, Cmd+Shift+4).
    else if (e.code === 'KeyB') run = () => { if (!e.shiftKey) grantCapture(); B(e.shiftKey ? 'bCrop' : 'bCap').click(); };
    else if (e.code === 'KeyO' && document.getElementById('bNotes')) run = () => document.getElementById('bNotes').click();
    else run = KEY_ACTION[e.code];
    if (!run) return;

    e.preventDefault();
    e.stopPropagation();
    run();
  };
  window.addEventListener('keydown', onKey, SIGC);

  // ─── "⋮" MENU (app, phone width) ──────────────────────────────────────────
  // A phone-width bar hides the shape tools, undo/redo, clear and capture,
  // and keeps Caneta na tela, settings and fullscreen out of the row too. All
  // of them live here instead, as the last button of the bar. Each entry just
  // works the real (hidden) button, so locks and handlers stay in one place.
  let moreRef = null;
  if (PD_ENV === 'android') {
    const moreBtn = document.createElement('button');
    moreBtn.id = 'bMore';
    moreBtn.innerHTML = '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5h.01M12 12h.01M12 19h.01"/></svg><span class="tt">' + tr('act.more') + '</span>';
    fsBtn.parentNode.appendChild(moreBtn);

    const menu = document.createElement('div');
    menu.id = '__pd_more__';
    document.body.appendChild(menu);
    moreRef = menu;

    // [label, button id, tool] — a tool entry selects it; the rest click the button.
    const ENTRIES = [
      [tr('tool.line'), 'bLine', 'line'], [tr('tool.rect'), 'bRect', 'rect'], [tr('tool.circle'), 'bCircle', 'circle'],
      null,
      [tr('act.undo'), 'bUndo'], [tr('act.redo'), 'bRedo'], [tr('act.clear'), 'bClear'],
      null,
      [tr('act.capture'), 'bCap'], [tr('act.crop'), 'bCrop'],
      null,
      [tr('act.pen'), 'bPen'], [tr('act.settings'), 'bCfg'], [tr('act.fullscreen'), 'bFS']
    ];
    const render = () => {
      menu.innerHTML = '';
      ENTRIES.forEach(e => {
        if (!e) {
          const sep = document.createElement('div');
          sep.className = 'mr-sep';
          menu.appendChild(sep);
          return;
        }
        const [label, id, t] = e;
        const src = document.getElementById(id);
        if (!src) return;
        const item = document.createElement('button');
        item.innerHTML = src.querySelector('svg')?.outerHTML || '';
        item.appendChild(document.createElement('span')).textContent = label;
        item.classList.toggle('pd-locked', src.classList.contains('pd-locked'));
        item.classList.toggle('on', (t && tool === t) || (id === 'bFS' && fsOn));
        item.addEventListener('click', ev => {
          closeMore();
          if (t) { closeToolPopover(); setTool(t); }
          else { if (ev.isTrusted && id === 'bCap') grantCapture(); src.click(); }
        });
        menu.appendChild(item);
      });
    };
    const place = () => {
      const b = moreBtn.getBoundingClientRect();
      const w = menu.offsetWidth, h = menu.offsetHeight, gap = 8, edge = 8;
      let left, top;
      if (tbPos === 'left' || tbPos === 'right') {
        left = tbPos === 'left' ? b.right + gap : b.left - gap - w;
        top = b.bottom - h;                       // grows upward from the button
      } else {
        left = b.right - w;
        top = tbPos === 'bottom' ? b.top - gap - h : b.bottom + gap;
      }
      menu.style.left = Math.round(Math.max(edge, Math.min(left, innerWidth - w - edge))) + 'px';
      menu.style.top = Math.round(Math.max(edge, Math.min(top, innerHeight - h - edge))) + 'px';
    };
    const onOutside = e => {
      if (e.target.closest?.('#__pd_more__, #bMore')) return;
      closeMore();
    };
    function closeMore() {
      menu.style.display = 'none';
      document.removeEventListener('pointerdown', onOutside, true);
    }
    moreBtn.addEventListener('click', () => {
      if (menu.style.display === 'block') { closeMore(); return; }
      closeOtherWindows('more');
      render();
      menu.style.display = 'block';
      place();
      document.addEventListener('pointerdown', onOutside, SIGC);
    });
    window.__pdCloseMore = closeMore;
  }

  // ─── PULL-TO-REFRESH GUARD (app) ──────────────────────────────────────────
  // The app reloads the page when it is pulled down from the top. Many sites
  // scroll an inner box and keep the page itself at the top, so at every touch
  // the app is told whether the finger landed in a box scrolled down — there a
  // downward drag should scroll that box back up, not reload.
  const onTouchForRefresh = e => {
    let el = e.target, inside = false;
    for (; el && el !== document.body && el !== document.documentElement; el = el.parentElement) {
      if (el.scrollTop > 0) {
        const oy = getComputedStyle(el).overflowY;
        if (oy === 'auto' || oy === 'scroll' || oy === 'overlay') { inside = true; break; }
      }
    }
    try { window.AndroidBridge.setTouchInScrolledBox(inside); } catch (err) {}
  };
  if (PD_ENV === 'android') {
    document.addEventListener('touchstart', onTouchForRefresh, { signal: __ac.signal, capture: true, passive: true });
  }

  // ─── DESTROY ─────────────────────────────────────────────────────────────
  function destroy() {
    hostThemeMo.disconnect();
    document.getElementById('__pd_ftt__')?.remove();
    if (fsOn) PD.setFullscreen(false);
    document.removeEventListener('fullscreenchange', onFsChange);
    if (laserLoopAnim) cancelAnimationFrame(laserLoopAnim);
    document.getElementById('__pd_calc__')?.remove();
    document.getElementById('__pd_sel__')?.remove();
    clearTimeout(toastTimer); document.getElementById('__pd_toast__')?.remove();
    closeToolPopover();
    tpRef?.remove(); tpRef = null;
    // Undo any half-finished capture: the failsafe timer would otherwise fire
    // into a torn-down toolbar, and the bars must not be left hidden.
    restoreOwnUi();
    cfgRef?.remove(); helpRef?.remove();
    window.__pdCloseMore?.(); moreRef?.remove(); delete window.__pdCloseMore;
    document.removeEventListener('touchstart', onTouchForRefresh, { capture: true });
    if (onAutoSitesChanged) { try { chrome.storage.onChanged.removeListener(onAutoSitesChanged); } catch (e) {} }
    androidLinkRef?.remove(); androidModalRef?.remove();
    if (onSocialOutside) document.removeEventListener('pointerdown', onSocialOutside, true);
    hideNews(false, false);
    clearInterval(bfIv); bfRef?.remove(); bfRef = null; droidRef?.remove(); droidRef = null;
    try { darkMq?.removeEventListener('change', onSystemTheme); } catch (e) {}
    darkStyleEl.remove();
    // A docked toolbar pushes the page with a body margin — give it back.
    document.body.style.removeProperty('margin-left');
    document.body.style.removeProperty('margin-right');
    document.body.style.removeProperty('margin-bottom');
    root.remove(); tb.remove(); sc.remove(); spacer.remove(); styleEl.remove();
    window.removeEventListener('keydown', onKey, true);
    document.removeEventListener('pointermove', onScMove);
    __ac.abort();
    pins.clear();
    clearInterval(tecIv); clearInterval(navIv);
    if (scrollRaf) { cancelAnimationFrame(scrollRaf); scrollRaf = 0; }
    delete window.__pdToggle;
    delete window.__pdDestroy;
    delete window.__pdSetPremium;
    delete window.__pdCaptureDone;
    delete window.__pdCopied;
    delete window.__pdApplyTheme;
  }
  window.__pdToggle = () => { if (document.getElementById('__pd_root__')) { window.__pdUserClosed = true; destroy(); } };
  // Unconditional teardown, used when this file is injected again over a
  // half-dead instance (see the guard at the top).
  window.__pdDestroy = destroy;
  // The page redrew itself without a navigation and took the bar with it —
  // TEC removing a question from a caderno (R, OK): the address stays the
  // same, so the browser reports no load and nothing would bring it back
  // (29/10/2026). Not closed by hand: it comes back (background.js, pdReopen;
  // the guard at the top tears this copy down and builds a fresh one). At
  // most three times a minute, for a page that keeps wiping its body.
  if (PD_ENV === 'extension') {
    const watch = setInterval(() => {
      if (window.__pdDestroy !== destroy) { clearInterval(watch); return; }   // taken down by us
      if (root.isConnected && tb.isConnected) return;
      clearInterval(watch);
      if (window.__pdUserClosed) return;
      const now = Date.now(), seen = (window.__pdRevived || []).filter(x => now - x < 60000);
      if (seen.length >= 3) return;
      window.__pdRevived = [...seen, now];
      try { chrome.runtime.sendMessage({ action: 'pdReopen' }); } catch (e) {}
    }, 1000);
  }

  // Called by MainActivity when the theme changes from outside this toolbar —
  // the system switching light/dark under 'auto', or the app's own notice.
  window.__pdApplyTheme = () => {
    try { const m = window.AndroidBridge.getTheme(); if (THEME_MODES.includes(m)) themeMode = m; } catch (e) {}
    applyTheme();
  };

  // Called by MainActivity whenever the entitlement changes, so a subscription
  // bought (or lapsed) takes effect without reopening the toolbar.
  window.__pdSetPremium = v => {
    isPremiumUser = !!v;
    refreshPremiumUI();
    if (!isPremiumUser) closeToolPopover();
    // Entitlement lost while a paid tool was selected → drop back to pointer
    if (!isPremiumUser && PREMIUM_TOOLS.includes(tool)) setTool('pointer');
  };

  // Stylus hover tooltips (android): a pen reports hover before it touches, so
  // resting it over a button can reveal that button's label — the affordance
  // touch alone can't offer. Restricted to pointerType 'pen' so a finger
  // sliding across the toolbar never pops tooltips.
  if (PD_ENV === 'android') {
    const setPenHover = (target, on) => {
      const btn = target?.closest?.('button');
      if (btn) btn.classList.toggle('pd-pen-hover', on);
    };
    [tb, sc].forEach(box => {
      box.addEventListener('pointerover', e => {
        if (e.pointerType === 'pen') setPenHover(e.target, true);
      });
      box.addEventListener('pointerout', e => {
        if (e.pointerType === 'pen') setPenHover(e.target, false);
      });
      // The pen can leave the bar without a matching pointerout on the button
      // (lifted out of hover range) — clear anything still marked.
      box.addEventListener('pointerleave', () => {
        box.querySelectorAll('button.pd-pen-hover')
          .forEach(b => b.classList.remove('pd-pen-hover'));
      });
    });
  }

  // Colour picking and the answer shortcuts are subscription features too.
  lockWhileFree(B('bColor'));
  lockWhileFree(document.getElementById('__pd_recent__'));
  lockWhileFree(sc);

  if (PD_LANG !== 'pt' && !scPosChosen) applyScPos('hidden');
  applyTbPos(tbPos);
  setTool('pointer');
  refreshPremiumUI();
  // Opened from the browser's own toolbar button, which can leave keyboard
  // focus up there — ask for it back so the very first shortcut reaches us.
  try { window.focus(); } catch (e) {}
})();
