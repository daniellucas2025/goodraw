// GooNotes — Minhas marcações, on the web page itself.
//
// Select text on any site and a small menu of colours appears (or, with the
// quick highlighter on — Alt+Q — the selection is marked at once). Marks are
// kept by the background in the Notes' database (db.js: webpages, marks) and
// painted again on the next visit. Alt+W opens the side panel: the page's
// marks, its topic (disciplina › tópico) and tags, and sending marks to the
// topic's Notas.
//
// How it gets here: registered for every site once the person grants access
// to all sites from Minhas marcações (background.js → syncHighlightScript);
// without that, injected along with the bar when it is opened on a page.
//
// Finding a mark again: the page's text (whitespace collapsed) is searched
// for the passage; when it occurs more than once, the copy whose
// surroundings match best wins, then the one nearest to where it was. Each
// stretch of a text node it covers is wrapped in a <bn-mark>.
(function () {
  'use strict';
  if (!/^https?:$/.test(location.protocol)) return;
  // A copy already on the page: the same version (this file injected twice)
  // stays as it is; the one from before an update (its runtime is gone)
  // hands the page over through its teardown (Onda 3, 01/11/2026).
  const MY_V = (() => { try { return chrome.runtime.getManifest().version; } catch (e) { return ''; } })();
  if (window.__bnHl === true) {
    if (window.__bnHlVersion === MY_V || typeof window.__bnHlTeardown !== 'function') return;
    try { window.__bnHlTeardown(); } catch (e) {}
  }
  window.__bnHl = true; window.__bnHlVersion = MY_V;
  // Everything hung on the document or the window is tied to one signal.
  const __ac = new AbortController();
  const SIG = { signal: __ac.signal }, SIGC = { signal: __ac.signal, capture: true };
  let themeIv = 0, tmIv = 0, spaIv = 0;   // the intervals the teardown clears

  // ─── TALKING TO THE EXTENSION ─────────────────────────────────────────────
  // After the extension is updated or reloaded the old copy of this script is
  // cut off: every call then settles with undefined instead of throwing.
  const alive = () => { try { return !!chrome.runtime.id; } catch (e) { return false; } };
  const send = msg => new Promise(resolve => {
    if (!alive()) return resolve(undefined);
    try { chrome.runtime.sendMessage(msg, r => { void chrome.runtime.lastError; resolve(r); }); }
    catch (e) { resolve(undefined); }
  });

  // ─── SIGNED IN ON THE SITE = SIGNED IN HERE ───────────────────────────────
  // On the site's app (notes/connect.js), signed in, with this extension still
  // without an account: the same pair and code as the person typing it, only
  // handed over through the page — so signing in on the site, by whatever way,
  // connects the extension too. Only this origin; the login still goes to the
  // one holding the pair's secret (hl-sync.js).
  if (window.top === window && location.origin === 'https://www.agoodrawdraw.com.br' && location.pathname.startsWith('/notes/app/')) {
    let asked = false;
    addEventListener('message', async e => {
      if (e.source !== window || e.origin !== location.origin || !e.data || typeof e.data !== 'object') return;
      if (e.data.bnSite === 'signedIn' && !asked) {
        asked = true;
        const r = await send({ action: 'hl.autoPair', since: +e.data.since || 0 });
        if (r && r.ok && r.pair) postMessage({ bnExt: 'pair', pair: r.pair, code: r.code }, location.origin);
        else if (!(r && r.linked)) asked = false;
      }
      if (e.data.bnSite === 'linked') send({ action: 'hl.pairCheck' });
    }, SIG);
    postMessage({ bnExt: 'hello' }, location.origin);
  }

  // ─── LANGUAGE ─────────────────────────────────────────────────────────────
  const STR = {
    pt: {
      card: 'Criar flashcard', sendBtn: 'Enviar o trecho para as anotações ou o caderno de erros', sendTitle: 'Enviar trecho', sendText: 'O trecho (edite e formate à vontade)', sendSent: 'Inserido nas anotações de “{0}”', sendEmpty: 'O trecho está vazio.', cardTitle: 'Novo flashcard', cardPick: 'Escolha o tópico', cardOne: 'Um card', cardMany: 'Vários de uma vez', cardFront: 'Frente (pergunta)', cardBack: 'Verso (resposta)', cardFrontPh: 'Ex.: Qual o prazo do recurso administrativo?', cardBackPh: 'Ex.: 10 dias, salvo disposição legal específica (Lei 9.784/99, art. 59).', cardHint: 'Selecione um trecho para negrito, cores e marca-texto.', cardManyLbl: 'Um card por linha: frente ; verso', cardManyPh: 'Capital do Brasil ; Brasília\nPrazo do recurso ; 10 dias', cardManyHint: 'Separe a frente do verso com ponto e vírgula (;) ou com Tab — dá para colar de uma planilha.', cardAgain: 'Criar outro em seguida', cardNeedTopic: 'Escolha o tópico do card.', cardNeedBoth: 'Preencha a frente e o verso.', cardNeedMany: 'Nenhuma linha no formato frente ; verso.', cancel: 'Cancelar', save: 'Salvar', rtBold: 'Negrito (Ctrl+B)', rtItalic: 'Itálico (Ctrl+I)', rtUnder: 'Sublinhado (Ctrl+U)', rtStrike: 'Tachado', rtInk: 'Cor do texto', rtMark: 'Cor de fundo (marca-texto)', rtClear: 'Limpar formatação', rtInkNone: 'Sem cor', rtMarkNone: 'Sem fundo', cardLoading: 'Carregando os tópicos…', cardDone: 'Flashcard criado em “{0}”', cardDoneN: '{0} flashcards criados em “{1}”', cardFail: 'Não deu para criar o flashcard', cardOffline: 'Sem internet: o flashcard não foi criado', cardNoAcc: 'Os flashcards do Notes são grátis e guardam os cards na sua conta, para estudar em qualquer lugar: crie a conta grátis (ou entre) e conecte a extensão.', cardGoAcc: 'Criar conta ou entrar', cardGoTopics: 'Criar disciplinas', cardNoNotes: 'Os flashcards ficam na GooNotes, que esta conta não tem.', cardNoTopics: 'Crie primeiro suas disciplinas e tópicos (as mesmas do caderno de erros) na tela de Flashcards.',
      mark: 'Marcar', note: 'Nota', copy: 'Copiar', del: 'Excluir', toTopic: 'Mandar para o tópico',
      hide: 'Ocultar o trecho (some da leitura)', hidden: 'Trecho oculto: clique para ver',
      introGo: 'Use a GooHighlights nesta página', introOff: 'Não mostrar neste site', introHint: 'Selecione um trecho da página para grifar.',
      tourNext: 'Próximo', tourBack: 'Voltar', tourSkip: 'Pular', tourDone: 'Entendi', tour: [['GooHighlights está ativa', 'Selecione um texto em qualquer site e escolha a cor. Cada grifo pode levar um nome (opcional, para achar fácil na busca) e uma nota, com formatação e imagens (e em tela maior, se precisar), e tudo volta quando você reabre a página. No mesmo menu, escolha o tópico do trecho (os próximos vão para ele) e ligue-o a outra marcação, desta ou de outra página: um clique nela abre a nota dela ali mesmo, para ler e editar (ou em tela maior). O botão de enviar leva o trecho, com a formatação que você quiser, para as anotações do tópico ou para o caderno de erros. Não quer o menu? O último botão dele o desliga.'], ['Anotação à mão', 'Escreva e desenhe por cima da página. Diferente da Draw, isto fica salvo junto dos grifos.'], ['Captura parcial', 'Recorte um trecho da página para o caderno de erros, para virar flashcard (nos flashcards do Notes, grátis), para copiar ou para baixar.'], ['Painel desta página', 'Tudo o que você marcou aqui, com as notas, e a disciplina desta página (cada marcação fica num tópico dela). Atalho: Alt+W.'], ['Tela inicial', 'Minhas marcações, a nuvem e a Draw ficam lá. Atalho: Alt+Shift+H.'], ['Timer do Notes', 'Enquanto uma sessão de estudo corre no Notes, o tempo aparece aqui, em qualquer página. Arraste para mudar de lugar; botão direito para ocultar.']], home: 'Tela inicial da GooDraw (Alt+Shift+H)', inkBtn: 'Anotar à mão (fica salvo)', inkTitle: 'Anotação à mão', inkDone: 'Concluir', inkUndo: 'Desfazer',
      inkHint: 'Desenhe na página: fica salvo com as marcações. Toque de novo na ferramenta para cor e espessura. Esc ou Concluir para sair.',
      inkColor: 'Cor', inkSize: 'Espessura', inkEraserSize: 'Tamanho da borracha', inkFree: 'Livre', inkStraight: 'Reto', inkRedo: 'Refazer', inkSmooth: 'Suave', inkNatural: 'Natural', inkRuler: 'Régua', inkPick: 'Outra cor',
      inkWhole: 'Apaga o traço inteiro', inkPart: 'Apaga só onde passa',
      'ink.lasso': 'Laço: selecione, mova e redimensione', 'ink.pencil': 'Lápis', 'ink.highlight': 'Marca-texto', 'ink.line': 'Linha', 'ink.rect': 'Retângulo', 'ink.circle': 'Círculo', 'ink.eraser': 'Borracha',
      inks1: '1 anotação à mão', inksN: '{0} anotações à mão', inkShow: 'Mostrar', inkHide: 'Ocultar', inkMissing: '{0} não encontrada(s) no texto atual: no lugar de antes',
      noColor: 'Sem marca-texto', bold: 'Negrito', under: 'Sublinhado', smaller: 'Diminuir a fonte', bigger: 'Aumentar a fonte',
      quote: 'Citação', textColor: 'Cor do texto', textReset: 'Cor original do texto',
      quickOn: 'Marcador rápido ligado: o texto é marcado ao selecioná-lo', quickOff: 'Marcador rápido desligado',
      quick: 'Marcador rápido', panel: 'Painel de marcações', close: 'Fechar', delMark: 'Excluir esta marcação', mlSave: 'Salvar nota', mlOpen: 'Abrir a página', mlBig: 'Tela maior', mlSaved: 'Nota salva', mlNoteTip: 'A nota desta marcação: edite aqui mesmo', mlBtn: 'Ligar a outra marcação', mlSearch: 'Buscar pelo nome, trecho, nota ou página', namePh: 'Dar um nome (opcional)', nameTip: 'Um nome seu para achar esta marcação mais fácil na busca', mlNone: 'Nenhuma marcação encontrada', mlGone: 'Marcação excluída', mlUnlink: 'Desfazer a ligação', mlHere: 'Nesta página', mlSet: 'Marcações ligadas', mlFail: 'Não deu para ligar as marcações', mlOpenFail: 'Não deu para abrir a marcação', mlCount1: 'Ligada a 1 marcação', mlCountN: 'Ligada a {0} marcações', ticket: 'Relatar um problema ou sugerir', tmTitle: 'Timer do Notes: arraste para mudar de lugar; botão direito para ocultar', tmPause: 'Pausar', tmResume: 'Continuar', tmHide: 'Ocultar nesta aba', tmNever: 'Não mostrar mais nas outras abas', tmOpen: 'Abrir o Notes', tmNeverDone: 'O timer não aparece mais nas outras abas. Para trazer de volta: engrenagem do timer, no Notes.', tmNoNotes: 'Abra o Notes para pausar ou continuar o timer.', tmBreak: 'Pausa', deleted: 'Marcação excluída', undo: 'Desfazer',
      notesShow: 'Mostrar notas', notesHide: 'Ocultar notas', notesHiddenN: '{0} nota(s) oculta(s)',
      notePh: 'Escreva uma nota (cole imagens com Ctrl+V)…', noteBig: 'Abrir a nota em tela maior', capAcc: 'Sem conta, nada fica guardado: crie a conta grátis para virar flashcard ou ir para o caderno de erros (e sincronizar).', accTrialT: 'Guarde isto na sua conta grátis', accTrial: 'Seus grifos desta página estão guardados só neste computador, por enquanto. Crie a conta grátis para guardar estes e os próximos.', accNeedT: 'Crie sua conta grátis para salvar', accNeed: 'Grifos, notas, desenhos e o caderno de erros ficam guardados na sua conta grátis.', accP1: '100% grátis e ilimitado, sem cartão', accP2: 'Em qualquer computador, celular ou tablet', accP3: 'Sem internet, continua salvando aqui e sincroniza quando voltar', accSignup: 'Criar conta grátis', accLogin: 'Já tenho conta', accLater: 'Agora não', accCode: 'Na janela que abriu, crie a conta ou entre e digite este código:', accDone: 'Pronto: conectado à sua conta.', accFail: 'Não deu para abrir agora. Verifique a internet e tente de novo.', accLocalT: 'Só neste computador', accLocalTM: 'Só neste aparelho', accTrialM: 'Seus grifos desta página estão guardados só neste aparelho, por enquanto. Crie a conta grátis para guardar estes e os próximos.', accLocalM: '{0} marcação(ões) estão só neste aparelho. Crie a conta grátis para não perder e continuar salvando.', accLocal: '{0} marcação(ões) estão só aqui. Crie a conta grátis para não perder e continuar salvando.', linkLbl: 'Disciplina', linkTitle: 'Vincular a', linkHint: 'A disciplina desta página: cada marcação escolhe um tópico dela', linkTopic: 'Escolher o tópico deste trecho', linkOther: 'Outra disciplina', linkBtn: 'Vincular a uma disciplina ou tópico', linkNone: 'Sem vínculo', linkNoneHint: 'Sem disciplina: escolha a desta página', linkSome: 'Vinculada', linkPage: 'Usar o da página: {0}', linkPageNone: 'Usar o da página (sem vínculo)', linkFromPage: '{0} (da página)', linkSet: 'Vinculado a “{0}”', linkSearch: 'Buscar disciplina ou tópico', linkNoMatch: 'Nenhuma disciplina ou tópico encontrado', imgFail: 'Não deu para colar a imagem', copied: 'Copiado', saveFail: 'Não deu para salvar a marcação',
      title: 'GooHighlights', none: 'Selecione um trecho da página para marcá-lo.',
      topic: 'Tópico', noTopic: 'Sem tópico', pickTopic: 'Escolha o tópico', searchTopic: 'Buscar disciplina ou tópico',
      noTopics: 'Crie disciplinas e tópicos no GooNotes primeiro.', tags: 'Tags', tagPh: 'Nova tag + Enter',
      allToTopic: 'Mandar tudo para o tópico', md: 'Copiar em Markdown', openNotes: 'Abrir no Notes', openMarks: 'Abrir em Minhas marcações (site)',
      menuOff: 'Não mostrar este menu ao selecionar texto', menuOffDone: 'Menu desligado. Para ligar de novo: ajustes da Draw ou da tela inicial.', siteOff: 'Desativar neste site', siteOffDone: 'Marcações desativadas em {0}. Para reativar: tela inicial da extensão › Neste site › Highlights ativa aqui.',
      sent1: 'Enviado para as Notas de “{0}”', sentN: '{1} marcações enviadas para as Notas de “{0}”',
      sendFail: 'Não deu para mandar para o tópico', missing: 'Não encontrado na página',
      nMarks1: '1 marcação', nMarksN: '{0} marcações', noteLbl: 'Nota', source: 'Fonte',
      delAsk: 'Excluir esta marcação?',
      quickPill: 'Marcador rápido ligado', quickOffBtn: 'Desligar',
      nudge: 'Quer este menu em qualquer site, sem abrir a extensão?', nudgeOn: 'Ativar', nudgeLater: 'Agora não',
      statMark1: 'marcação', statMarkN: 'marcações', statInk1: 'anotação', statInkN: 'anotações', statNotes: 'com nota',
      spaceFull: 'Sua nuvem está cheia', spaceFullTx: 'Os grifos novos ficam salvos neste computador e sobem sozinhos quando houver espaço.',
      spaceNear: 'Sua nuvem está quase cheia', spaceNearTx: 'Quando encher, os grifos novos ficam só neste computador até haver espaço.', spaceBuy: 'Notes Premium: 10 GB',
      errCrop: 'Recortar para o caderno de erros (Alt+Shift+B)', errTitle: 'Caderno de erros', errSave: 'Guardar', errNewFolder: 'Nova disciplina',
      errNewSub: 'Novo tópico', errNewSubSub: 'Novo subtópico', errFolderPh: 'Nome da disciplina', errSubPh: 'Nome do tópico em “{0}”', errSubSubPh: 'Nome do subtópico em “{0}”', errFold: 'Recolher', errUnfold: 'Abrir', errNotePh: 'Por que errei? (opcional)',
      errPick: 'Escolha a disciplina ou o tópico', errSaved: 'Guardado no caderno de erros: “{0}”', errFail: 'Não deu para guardar no caderno de erros',
      errNoFolders: 'Crie a primeira disciplina (ex.: Direito Constitucional) e, se quiser, tópicos e subtópicos dentro dela. São as mesmas disciplinas dos seus flashcards e do Planner.',
      errHint: 'Arraste para recortar · Esc cancela', errLocal: 'Sem conta, fica só neste computador. Conecte a conta para ver no site e nos outros aparelhos.',
      errConnect: 'Conectar', errCode: 'Na aba do site que abriu, entre e digite o código {0}.', errCopy: 'Copiar', errDownload: 'Baixar', errCapFail: 'Não deu para capturar a tela', errCapPerm: 'Para capturar, o navegador pede uma permissão a mais.', errCapAllow: 'Permitir', capTitle: 'Captura parcial', capCopied: 'Copiada: Ctrl+V cola em qualquer lugar.', capCard: 'Flashcard com a captura na frente', capCardSub: 'A captura é a pergunta; você escreve a resposta.', capCardBack: 'Flashcard com a captura no verso', capCardBackSub: 'Você escreve a pergunta; a captura é a resposta.', capNotes: 'Inserir nas anotações', capNotesSub: 'Entra no fim das anotações do tópico.', capErr: 'Caderno de erros', capErrSub: 'Na disciplina, no tópico ou no subtópico do seu caderno de erros.', capCopy: 'Copiar', capCopySub: 'Para colar com Ctrl+V.', capDl: 'Baixar', capDlSub: 'Salva a imagem (PNG).', capWhere: 'Em qual tópico?', capBack: 'Voltar', capSent: 'Inserida nas anotações de “{0}”', capFail: 'Não deu para inserir nas anotações', capFull: 'Sua nuvem está cheia: libere espaço para guardar a imagem.', capCopiedNow: 'Copiada', cardPic: 'Frente (a captura)', cardPicText: 'Texto abaixo da imagem (opcional)', cardPicBack: 'Verso (a captura)', errFull: 'Sua nuvem está cheia: libere espaço ou amplie a nuvem para guardar.'
    },
    en: {
      card: 'Make a flashcard', sendBtn: 'Send the passage to your notes or the mistakes notebook', sendTitle: 'Send passage', sendText: 'The passage (edit and format it as you like)', sendSent: 'Added to the notes of “{0}”', sendEmpty: 'The passage is empty.', cardTitle: 'New flashcard', cardPick: 'Choose the topic', cardOne: 'One card', cardMany: 'Many at once', cardFront: 'Front (question)', cardBack: 'Back (answer)', cardFrontPh: 'E.g.: What is the deadline to appeal?', cardBackPh: 'E.g.: 10 days, unless the law says otherwise.', cardHint: 'Select some text for bold, colours and the marker.', cardManyLbl: 'One card per line: front ; back', cardManyPh: 'Capital of Brazil ; Brasília\nDeadline to appeal ; 10 days', cardManyHint: 'Split front and back with a semicolon (;) or a Tab — you can paste from a spreadsheet.', cardAgain: 'Create another right after', cardNeedTopic: 'Choose the card\'s topic.', cardNeedBoth: 'Fill in the front and the back.', cardNeedMany: 'No line in the front ; back format.', cancel: 'Cancel', save: 'Save', rtBold: 'Bold (Ctrl+B)', rtItalic: 'Italic (Ctrl+I)', rtUnder: 'Underline (Ctrl+U)', rtStrike: 'Strikethrough', rtInk: 'Text colour', rtMark: 'Background colour (marker)', rtClear: 'Clear formatting', rtInkNone: 'No colour', rtMarkNone: 'No background', cardLoading: 'Loading the topics…', cardDone: 'Flashcard made in “{0}”', cardDoneN: '{0} flashcards made in “{1}”', cardFail: 'Couldn’t make the flashcard', cardOffline: 'No internet: the flashcard wasn’t made', cardNoAcc: 'The Notes’ flashcards are free and keep the cards in your account, to study anywhere: create the free account (or sign in) and connect the extension.', cardGoAcc: 'Create an account or sign in', cardGoTopics: 'Create subjects', cardNoNotes: 'Flashcards live in GooNotes, which this account doesn’t have.', cardNoTopics: 'First create your subjects and topics (the same as the mistakes notebook\'s) on the Flashcards screen.',
      mark: 'Highlight', note: 'Note', copy: 'Copy', del: 'Delete', toTopic: 'Send to topic',
      hide: 'Hide the passage (out of your reading)', hidden: 'Hidden passage: click to see it',
      introGo: 'Use GooHighlights on this page', introOff: 'Don\'t show on this site', introHint: 'Select a passage on the page to highlight it.',
      tourNext: 'Next', tourBack: 'Back', tourSkip: 'Skip', tourDone: 'Got it', tour: [['GooHighlights is on', 'Select text on any site and pick a colour. Every highlight can carry a name (optional, to find it easily in search) and a note, with formatting and images (and in a larger view when you need it), and it all comes back when you reopen the page. In the same menu, choose the passage\'s topic (the next ones go there too) and link it to another highlight, on this page or another: a click on it opens its note right there, to read and edit (or in a larger view). The send button takes the passage, formatted as you like, to the topic\'s notes or to the mistakes notebook. Don\'t want the menu? Its last button turns it off.'], ['Hand annotation', 'Write and draw over the page. Unlike the Draw, this is kept with your highlights.'], ['Partial capture', 'Cut out part of the page for your mistakes notebook, to make a flashcard (in the Notes’ flashcards, free), to copy or to download.'], ['This page\'s panel', 'Everything you marked here, with the notes, and this page\'s subject (each highlight goes to one of its topics). Shortcut: Alt+W.'], ['Home screen', 'My highlights, the cloud and the Draw are there. Shortcut: Alt+Shift+H.'], ['Notes timer', 'While a study session runs in the Notes, the time shows here, on any page. Drag it to move it; right-click to hide.']], home: 'GooDraw home screen (Alt+Shift+H)', inkBtn: 'Annotate by hand (kept)', inkTitle: 'Hand annotation', inkDone: 'Done', inkUndo: 'Undo',
      inkHint: 'Draw on the page: it is kept with the highlights. Tap the tool again for colour and thickness. Esc or Done to leave.',
      inkColor: 'Colour', inkSize: 'Thickness', inkEraserSize: 'Eraser size', inkFree: 'Freehand', inkStraight: 'Straight', inkRedo: 'Redo', inkSmooth: 'Smooth', inkNatural: 'Natural', inkRuler: 'Ruler', inkPick: 'Another colour',
      inkWhole: 'Erase the whole stroke', inkPart: 'Erase only where it passes',
      'ink.lasso': 'Lasso: select, move and resize', 'ink.pencil': 'Pencil', 'ink.highlight': 'Highlighter', 'ink.line': 'Line', 'ink.rect': 'Rectangle', 'ink.circle': 'Circle', 'ink.eraser': 'Eraser',
      inks1: '1 hand annotation', inksN: '{0} hand annotations', inkShow: 'Show', inkHide: 'Hide', inkMissing: '{0} not found in the current text: shown where they were',
      noColor: 'No highlighter', bold: 'Bold', under: 'Underline', smaller: 'Smaller text', bigger: 'Bigger text',
      quote: 'Quote', textColor: 'Text colour', textReset: 'Original text colour',
      quickOn: 'Quick highlighter on: text is highlighted as you select it', quickOff: 'Quick highlighter off',
      quick: 'Quick highlighter', panel: 'Highlights panel', close: 'Close', delMark: 'Delete this highlight', mlSave: 'Save note', mlOpen: 'Open the page', mlBig: 'Larger view', mlSaved: 'Note saved', mlNoteTip: 'This highlight\'s note: edit it right here', mlBtn: 'Link to another highlight', mlSearch: 'Search name, passage, note or page', namePh: 'Give it a name (optional)', nameTip: 'A name of your own, to find this highlight more easily in search', mlNone: 'No highlight found', mlGone: 'Deleted highlight', mlUnlink: 'Remove the link', mlHere: 'On this page', mlSet: 'Highlights linked', mlFail: "Couldn't link the highlights", mlOpenFail: "Couldn't open the highlight", mlCount1: 'Linked to 1 highlight', mlCountN: 'Linked to {0} highlights', ticket: 'Report a problem or suggest', tmTitle: 'Notes timer: drag to move it; right-click to hide', tmPause: 'Pause', tmResume: 'Resume', tmHide: 'Hide on this tab', tmNever: "Don't show on other tabs anymore", tmOpen: 'Open the Notes', tmNeverDone: "The timer won't show on other tabs anymore. To bring it back: the timer's gear, in the Notes.", tmNoNotes: 'Open the Notes to pause or resume the timer.', tmBreak: 'Break', deleted: 'Highlight deleted', undo: 'Undo',
      notesShow: 'Show notes', notesHide: 'Hide notes', notesHiddenN: '{0} note(s) hidden',
      notePh: 'Write a note (paste images with Ctrl+V)…', noteBig: 'Open the note in a larger view', capAcc: 'Without an account nothing is kept: create the free account to make a flashcard or file it in the mistakes notebook (and sync).', accTrialT: 'Keep this in your free account', accTrial: 'Your highlights on this page are kept on this computer only, for now. Create the free account to keep these and the next ones.', accNeedT: 'Create your free account to save', accNeed: 'Highlights, notes, drawings and the mistakes notebook are kept in your free account.', accP1: '5 MB free, no card', accP2: 'On any computer, phone or tablet', accP3: 'Offline, it keeps saving here and syncs when you are back', accSignup: 'Create free account', accLogin: 'I have an account', accLater: 'Not now', accCode: 'In the window that opened, create the account or sign in and type this code:', accDone: 'Done: connected to your account.', accFail: "Couldn't open it now. Check your internet and try again.", accLocalT: 'Only on this computer', accLocalTM: 'Only on this device', accTrialM: 'Your highlights on this page are kept on this device only, for now. Create the free account to keep these and the next ones.', accLocalM: '{0} highlight(s) are only on this device. Create the free account so you don\'t lose them and keep saving.', accLocal: '{0} highlight(s) are only here. Create the free account so you don\'t lose them and keep saving.', linkLbl: 'Subject', linkTitle: 'Link to', linkHint: 'This page\'s subject: each highlight picks one of its topics', linkTopic: 'Choose this passage\'s topic', linkOther: 'Another subject', linkBtn: 'Link to a subject or topic', linkNone: 'Not linked', linkNoneHint: 'No subject: choose this page\'s', linkSome: 'Linked', linkPage: 'Use the page\'s: {0}', linkPageNone: 'Use the page\'s (not linked)', linkFromPage: '{0} (from the page)', linkSet: 'Linked to “{0}”', linkSearch: 'Search subject or topic', linkNoMatch: 'No subject or topic found', imgFail: "Couldn't paste the image", copied: 'Copied', saveFail: "Couldn't save the highlight",
      title: 'GooHighlights', none: 'Select a passage on the page to highlight it.',
      topic: 'Topic', noTopic: 'No topic', pickTopic: 'Choose the topic', searchTopic: 'Search subject or topic',
      noTopics: 'Create subjects and topics in GooNotes first.', tags: 'Tags', tagPh: 'New tag + Enter',
      allToTopic: 'Send all to the topic', md: 'Copy as Markdown', openNotes: 'Open in Notes', openMarks: 'Open in My highlights (site)',
      menuOff: 'Don\'t show this menu when selecting text', menuOffDone: 'Menu turned off. To turn it back on: the Draw\'s or the home screen\'s settings.', siteOff: 'Turn off on this site', siteOffDone: 'Highlights turned off on {0}. To turn them back on: the extension\'s home screen › This site › Highlights on here.',
      sent1: 'Sent to the Notes of “{0}”', sentN: '{1} highlights sent to the Notes of “{0}”',
      sendFail: "Couldn't send to the topic", missing: 'Not found on the page',
      nMarks1: '1 highlight', nMarksN: '{0} highlights', noteLbl: 'Note', source: 'Source',
      delAsk: 'Delete this highlight?',
      quickPill: 'Quick highlighter on', quickOffBtn: 'Turn off',
      nudge: 'Want this menu on every site, without opening the extension?', nudgeOn: 'Turn on', nudgeLater: 'Not now',
      statMark1: 'highlight', statMarkN: 'highlights', statInk1: 'drawing', statInkN: 'drawings', statNotes: 'with a note',
      spaceFull: 'Your cloud is full', spaceFullTx: 'New highlights are saved on this computer and go up by themselves when there is space.',
      spaceNear: 'Your cloud is nearly full', spaceNearTx: 'When it fills up, new highlights stay on this computer only until there is space.', spaceBuy: 'Notes Premium: 10 GB',
      errCrop: 'Crop into the mistakes notebook (Alt+Shift+B)', errTitle: 'Mistakes notebook', errSave: 'Save', errNewFolder: 'New subject',
      errNewSub: 'New topic', errNewSubSub: 'New subtopic', errFolderPh: 'Subject name', errSubPh: 'Topic name in “{0}”', errSubSubPh: 'Subtopic name in “{0}”', errFold: 'Collapse', errUnfold: 'Expand', errNotePh: 'Why did I get it wrong? (optional)',
      errPick: 'Choose the subject or topic', errSaved: 'Saved in the mistakes notebook: “{0}”', errFail: "Couldn't save to the mistakes notebook",
      errNoFolders: 'Create your first subject (e.g. Constitutional Law) and, if you like, topics and subtopics inside it. They are the same subjects as your flashcards and the Planner.',
      errHint: 'Drag to crop · Esc cancels', errLocal: 'Without an account it stays on this computer only. Connect your account to see it on the site and your other devices.',
      errConnect: 'Connect', errCode: 'In the site tab that opened, sign in and type the code {0}.', errCopy: 'Copy', errDownload: 'Download', errCapFail: "Couldn't capture the screen", errCapPerm: 'To capture, the browser needs one more permission.', errCapAllow: 'Allow', capTitle: 'Partial capture', capCopied: 'Copied: Ctrl+V pastes it anywhere.', capCard: 'Flashcard with the capture on the front', capCardSub: 'The capture is the question; you write the answer.', capCardBack: 'Flashcard with the capture on the back', capCardBackSub: 'You write the question; the capture is the answer.', capNotes: 'Add to the notes', capNotesSub: 'Goes at the end of the topic\'s notes.', capErr: 'Error notebook', capErrSub: 'Under a subject, topic or subtopic of your mistakes notebook.', capCopy: 'Copy', capCopySub: 'To paste with Ctrl+V.', capDl: 'Download', capDlSub: 'Saves the image (PNG).', capWhere: 'Which topic?', capBack: 'Back', capSent: 'Added to the notes of “{0}”', capFail: 'Couldn\'t add it to the notes', capFull: 'Your cloud is full: free up space to keep the image.', capCopiedNow: 'Copied', cardPic: 'Front (the capture)', cardPicText: 'Text under the image (optional)', cardPicBack: 'Back (the capture)', errFull: 'Your cloud is full: free up space or get more to save this.'
    },
    es: {
      card: 'Crear flashcard', sendBtn: 'Enviar el fragmento a las notas o al cuaderno de errores', sendTitle: 'Enviar fragmento', sendText: 'El fragmento (edítalo y dale formato como quieras)', sendSent: 'Insertado en las notas de “{0}”', sendEmpty: 'El fragmento está vacío.', cardTitle: 'Nueva flashcard', cardPick: 'Elige el tema', cardOne: 'Una tarjeta', cardMany: 'Varias a la vez', cardFront: 'Anverso (pregunta)', cardBack: 'Reverso (respuesta)', cardFrontPh: 'Ej.: ¿Cuál es el plazo del recurso administrativo?', cardBackPh: 'Ej.: 10 días, salvo disposición legal específica.', cardHint: 'Selecciona un fragmento para negrita, colores y marcatextos.', cardManyLbl: 'Una tarjeta por línea: anverso ; reverso', cardManyPh: 'Capital de Brasil ; Brasilia\nPlazo del recurso ; 10 días', cardManyHint: 'Separa el anverso del reverso con punto y coma (;) o con Tab — puedes pegar desde una hoja de cálculo.', cardAgain: 'Crear otra a continuación', cardNeedTopic: 'Elige el tema de la tarjeta.', cardNeedBoth: 'Rellena el anverso y el reverso.', cardNeedMany: 'Ninguna línea en el formato anverso ; reverso.', cancel: 'Cancelar', save: 'Guardar', rtBold: 'Negrita (Ctrl+B)', rtItalic: 'Cursiva (Ctrl+I)', rtUnder: 'Subrayado (Ctrl+U)', rtStrike: 'Tachado', rtInk: 'Color del texto', rtMark: 'Color de fondo (marcatextos)', rtClear: 'Quitar formato', rtInkNone: 'Sin color', rtMarkNone: 'Sin fondo', cardLoading: 'Cargando los temas…', cardDone: 'Flashcard creada en “{0}”', cardDoneN: '{0} flashcards creadas en “{1}”', cardFail: 'No se pudo crear la flashcard', cardOffline: 'Sin internet: la flashcard no se creó', cardNoAcc: 'Las flashcards del Notes son gratis y guardan las tarjetas en tu cuenta, para estudiar en cualquier lugar: crea la cuenta gratis (o entra) y conecta la extensión.', cardGoAcc: 'Crear cuenta o entrar', cardGoTopics: 'Crear asignaturas', cardNoNotes: 'Las flashcards están en GooNotes, que esta cuenta no tiene.', cardNoTopics: 'Crea primero tus asignaturas y temas (los mismos del cuaderno de errores) en la pantalla de Flashcards.',
      mark: 'Resaltar', note: 'Nota', copy: 'Copiar', del: 'Eliminar', toTopic: 'Enviar al tema',
      hide: 'Ocultar el fragmento (sale de la lectura)', hidden: 'Fragmento oculto: haz clic para verlo',
      introGo: 'Usa GooHighlights en esta página', introOff: 'No mostrar en este sitio', introHint: 'Selecciona un fragmento de la página para resaltarlo.',
      tourNext: 'Siguiente', tourBack: 'Atrás', tourSkip: 'Saltar', tourDone: 'Entendido', tour: [['GooHighlights está activa', 'Selecciona un texto en cualquier sitio y elige el color. Cada resaltado puede llevar un nombre (opcional, para encontrarlo fácil en la búsqueda) y una nota, con formato e imágenes (y en pantalla grande si la necesitas), y todo vuelve cuando reabres la página. En el mismo menú, elige el tema del fragmento (los siguientes van a él) y enlázalo con otro resaltado, de esta o de otra página: un clic en él abre su nota ahí mismo, para leerla y editarla (o en pantalla grande). El botón de enviar lleva el fragmento, con el formato que quieras, a las notas del tema o al cuaderno de errores. ¿No quieres el menú? Su último botón lo desactiva.'], ['Anotación a mano', 'Escribe y dibuja sobre la página. A diferencia de la Draw, esto queda guardado con tus resaltados.'], ['Captura parcial', 'Recorta una parte de la página para el cuaderno de errores, para crear una flashcard (en las flashcards del Notes, gratis), para copiar o para descargar.'], ['Panel de esta página', 'Todo lo que marcaste aquí, con las notas, y la asignatura de esta página (cada resaltado va a uno de sus temas). Atajo: Alt+W.'], ['Pantalla de inicio', 'Mis resaltados, la nube y la Draw están allí. Atajo: Alt+Shift+H.'], ['Temporizador de Notes', 'Mientras corre una sesión de estudio en Notes, el tiempo aparece aquí, en cualquier página. Arrástralo para moverlo; clic derecho para ocultarlo.']], home: 'Pantalla de inicio de GooDraw (Alt+Shift+H)', inkBtn: 'Anotar a mano (queda guardado)', inkTitle: 'Anotación a mano', inkDone: 'Listo', inkUndo: 'Deshacer',
      inkHint: 'Dibuja en la página: queda guardado con los resaltados. Toca de nuevo la herramienta para color y grosor. Esc o Listo para salir.',
      inkColor: 'Color', inkSize: 'Grosor', inkEraserSize: 'Tamaño del borrador', inkFree: 'Libre', inkStraight: 'Recto', inkRedo: 'Rehacer', inkSmooth: 'Suave', inkNatural: 'Natural', inkRuler: 'Regla', inkPick: 'Otro color',
      inkWhole: 'Borra el trazo entero', inkPart: 'Borra solo por donde pasa',
      'ink.lasso': 'Lazo: selecciona, mueve y redimensiona', 'ink.pencil': 'Lápiz', 'ink.highlight': 'Marcatextos', 'ink.line': 'Línea', 'ink.rect': 'Rectángulo', 'ink.circle': 'Círculo', 'ink.eraser': 'Borrador',
      inks1: '1 anotación a mano', inksN: '{0} anotaciones a mano', inkShow: 'Mostrar', inkHide: 'Ocultar', inkMissing: '{0} no encontrada(s) en el texto actual: en su lugar anterior',
      noColor: 'Sin marcatextos', bold: 'Negrita', under: 'Subrayado', smaller: 'Reducir la fuente', bigger: 'Aumentar la fuente',
      quote: 'Cita', textColor: 'Color del texto', textReset: 'Color original del texto',
      quickOn: 'Resaltador rápido activado: el texto se resalta al seleccionarlo', quickOff: 'Resaltador rápido desactivado',
      quick: 'Resaltador rápido', panel: 'Panel de resaltados', close: 'Cerrar', delMark: 'Eliminar este resaltado', mlSave: 'Guardar nota', mlOpen: 'Abrir la página', mlBig: 'Pantalla grande', mlSaved: 'Nota guardada', mlNoteTip: 'La nota de este resaltado: edítala aquí mismo', mlBtn: 'Enlazar con otro resaltado', mlSearch: 'Buscar por nombre, fragmento, nota o página', namePh: 'Ponerle un nombre (opcional)', nameTip: 'Un nombre tuyo para encontrar este resaltado más fácil en la búsqueda', mlNone: 'Ningún resaltado encontrado', mlGone: 'Resaltado eliminado', mlUnlink: 'Quitar el enlace', mlHere: 'En esta página', mlSet: 'Resaltados enlazados', mlFail: 'No se pudieron enlazar los resaltados', mlOpenFail: 'No se pudo abrir el resaltado', mlCount1: 'Enlazado con 1 resaltado', mlCountN: 'Enlazado con {0} resaltados', ticket: 'Reportar un problema o sugerir', tmTitle: 'Temporizador de Notes: arrástralo para moverlo; clic derecho para ocultarlo', tmPause: 'Pausar', tmResume: 'Continuar', tmHide: 'Ocultar en esta pestaña', tmNever: 'No mostrar más en otras pestañas', tmOpen: 'Abrir Notes', tmNeverDone: 'El temporizador ya no aparecerá en otras pestañas. Para recuperarlo: el engranaje del temporizador, en Notes.', tmNoNotes: 'Abre Notes para pausar o continuar el temporizador.', tmBreak: 'Pausa', deleted: 'Resaltado eliminado', undo: 'Deshacer',
      notesShow: 'Mostrar notas', notesHide: 'Ocultar notas', notesHiddenN: '{0} nota(s) oculta(s)',
      notePh: 'Escribe una nota (pega imágenes con Ctrl+V)…', noteBig: 'Abrir la nota en pantalla grande', capAcc: 'Sin cuenta no se guarda nada: crea la cuenta gratis para convertirla en flashcard o llevarla al cuaderno de errores (y sincronizar).', accTrialT: 'Guarda esto en tu cuenta gratis', accTrial: 'Tus resaltados de esta página están guardados solo en este ordenador, por ahora. Crea la cuenta gratis para guardar estos y los próximos.', accNeedT: 'Crea tu cuenta gratis para guardar', accNeed: 'Resaltados, notas, dibujos y el cuaderno de errores se guardan en tu cuenta gratis.', accP1: '5 MB gratis, sin tarjeta', accP2: 'En cualquier ordenador, móvil o tableta', accP3: 'Sin internet, sigue guardando aquí y sincroniza al volver', accSignup: 'Crear cuenta gratis', accLogin: 'Ya tengo cuenta', accLater: 'Ahora no', accCode: 'En la ventana que se abrió, crea la cuenta o entra y escribe este código:', accDone: 'Listo: conectado a tu cuenta.', accFail: 'No se pudo abrir ahora. Revisa tu internet e inténtalo de nuevo.', accLocalT: 'Solo en este ordenador', accLocalTM: 'Solo en este dispositivo', accTrialM: 'Tus resaltados de esta página están guardados solo en este dispositivo, por ahora. Crea la cuenta gratis para guardar estos y los próximos.', accLocalM: '{0} resaltado(s) están solo en este dispositivo. Crea la cuenta gratis para no perderlos y seguir guardando.', accLocal: '{0} resaltado(s) están solo aquí. Crea la cuenta gratis para no perderlos y seguir guardando.', linkLbl: 'Asignatura', linkTitle: 'Vincular a', linkHint: 'La asignatura de esta página: cada resaltado elige un tema de ella', linkTopic: 'Elegir el tema de este fragmento', linkOther: 'Otra asignatura', linkBtn: 'Vincular a una asignatura o tema', linkNone: 'Sin vínculo', linkNoneHint: 'Sin asignatura: elige la de esta página', linkSome: 'Vinculado', linkPage: 'Usar el de la página: {0}', linkPageNone: 'Usar el de la página (sin vínculo)', linkFromPage: '{0} (de la página)', linkSet: 'Vinculado a “{0}”', linkSearch: 'Buscar asignatura o tema', linkNoMatch: 'Ninguna asignatura o tema encontrado', imgFail: 'No se pudo pegar la imagen', copied: 'Copiado', saveFail: 'No se pudo guardar el resaltado',
      title: 'GooHighlights', none: 'Selecciona un fragmento de la página para resaltarlo.',
      topic: 'Tema', noTopic: 'Sin tema', pickTopic: 'Elige el tema', searchTopic: 'Buscar asignatura o tema',
      noTopics: 'Crea asignaturas y temas en GooNotes primero.', tags: 'Etiquetas', tagPh: 'Nueva etiqueta + Enter',
      allToTopic: 'Enviar todo al tema', md: 'Copiar en Markdown', openNotes: 'Abrir en Notes', openMarks: 'Abrir en Mis resaltados (sitio)',
      menuOff: 'No mostrar este menú al seleccionar texto', menuOffDone: 'Menú desactivado. Para volver a activarlo: ajustes de la Draw o de la pantalla de inicio.', siteOff: 'Desactivar en este sitio', siteOffDone: 'Resaltados desactivados en {0}. Para reactivarlos: pantalla de inicio de la extensión › Este sitio › Highlights activa aquí.',
      sent1: 'Enviado a las Notas de “{0}”', sentN: '{1} resaltados enviados a las Notas de “{0}”',
      sendFail: 'No se pudo enviar al tema', missing: 'No encontrado en la página',
      nMarks1: '1 resaltado', nMarksN: '{0} resaltados', noteLbl: 'Nota', source: 'Fuente',
      delAsk: '¿Eliminar este resaltado?',
      quickPill: 'Resaltador rápido activado', quickOffBtn: 'Desactivar',
      nudge: '¿Quieres este menú en cualquier sitio, sin abrir la extensión?', nudgeOn: 'Activar', nudgeLater: 'Ahora no',
      statMark1: 'resaltado', statMarkN: 'resaltados', statInk1: 'anotación', statInkN: 'anotaciones', statNotes: 'con nota',
      spaceFull: 'Tu nube está llena', spaceFullTx: 'Los resaltados nuevos se guardan en este ordenador y se suben solos cuando haya espacio.',
      spaceNear: 'Tu nube está casi llena', spaceNearTx: 'Cuando se llene, los resaltados nuevos quedarán solo en este ordenador hasta que haya espacio.', spaceBuy: 'Notes Premium: 10 GB',
      errCrop: 'Recortar al cuaderno de errores (Alt+Shift+B)', errTitle: 'Cuaderno de errores', errSave: 'Guardar', errNewFolder: 'Nueva asignatura',
      errNewSub: 'Nuevo tema', errNewSubSub: 'Nuevo subtema', errFolderPh: 'Nombre de la asignatura', errSubPh: 'Nombre del tema en “{0}”', errSubSubPh: 'Nombre del subtema en “{0}”', errFold: 'Contraer', errUnfold: 'Abrir', errNotePh: '¿Por qué me equivoqué? (opcional)',
      errPick: 'Elige la asignatura o el tema', errSaved: 'Guardado en el cuaderno de errores: “{0}”', errFail: 'No se pudo guardar en el cuaderno de errores',
      errNoFolders: 'Crea la primera asignatura (ej.: Derecho Constitucional) y, si quieres, temas y subtemas dentro. Son las mismas asignaturas de tus flashcards y del Planner.',
      errHint: 'Arrastra para recortar · Esc cancela', errLocal: 'Sin cuenta, queda solo en este ordenador. Conecta la cuenta para verlo en el sitio y en tus otros dispositivos.',
      errConnect: 'Conectar', errCode: 'En la pestaña del sitio que se abrió, entra y escribe el código {0}.', errCopy: 'Copiar', errDownload: 'Descargar', errCapFail: 'No se pudo capturar la pantalla', errCapPerm: 'Para capturar, el navegador pide un permiso más.', errCapAllow: 'Permitir', capTitle: 'Captura parcial', capCopied: 'Copiada: Ctrl+V la pega en cualquier lugar.', capCard: 'Flashcard con la captura en el anverso', capCardSub: 'La captura es la pregunta; tú escribes la respuesta.', capCardBack: 'Flashcard con la captura en el reverso', capCardBackSub: 'Tú escribes la pregunta; la captura es la respuesta.', capNotes: 'Insertar en las notas', capNotesSub: 'Va al final de las notas del tema.', capErr: 'Cuaderno de errores', capErrSub: 'En la asignatura, el tema o el subtema de tu cuaderno de errores.', capCopy: 'Copiar', capCopySub: 'Para pegar con Ctrl+V.', capDl: 'Descargar', capDlSub: 'Guarda la imagen (PNG).', capWhere: '¿En qué tema?', capBack: 'Volver', capSent: 'Insertada en las notas de “{0}”', capFail: 'No se pudo insertar en las notas', capFull: 'Tu nube está llena: libera espacio para guardar la imagen.', capCopiedNow: 'Copiada', cardPic: 'Anverso (la captura)', cardPicText: 'Texto bajo la imagen (opcional)', cardPicBack: 'Reverso (la captura)', errFull: 'Tu nube está llena: libera espacio o amplía la nube para guardar.'
    },
    fr: {
      card: 'Créer une flashcard', sendBtn: 'Envoyer le passage vers les notes ou le cahier d\'erreurs', sendTitle: 'Envoyer le passage', sendText: 'Le passage (modifiez-le et mettez-le en forme)', sendSent: 'Ajouté aux notes de « {0} »', sendEmpty: 'Le passage est vide.', cardTitle: 'Nouvelle flashcard', cardPick: 'Choisissez le sujet', cardOne: 'Une carte', cardMany: 'Plusieurs à la fois', cardFront: 'Recto (question)', cardBack: 'Verso (réponse)', cardFrontPh: 'Ex. : Quel est le délai du recours administratif ?', cardBackPh: 'Ex. : 10 jours, sauf disposition légale spécifique.', cardHint: 'Sélectionnez un passage pour le gras, les couleurs et le surligneur.', cardManyLbl: 'Une carte par ligne : recto ; verso', cardManyPh: 'Capitale du Brésil ; Brasília\nDélai du recours ; 10 jours', cardManyHint: 'Séparez le recto du verso par un point-virgule (;) ou une tabulation — vous pouvez coller depuis un tableur.', cardAgain: 'En créer une autre ensuite', cardNeedTopic: 'Choisissez le sujet de la carte.', cardNeedBoth: 'Remplissez le recto et le verso.', cardNeedMany: 'Aucune ligne au format recto ; verso.', cancel: 'Annuler', save: 'Enregistrer', rtBold: 'Gras (Ctrl+B)', rtItalic: 'Italique (Ctrl+I)', rtUnder: 'Souligné (Ctrl+U)', rtStrike: 'Barré', rtInk: 'Couleur du texte', rtMark: 'Couleur de fond (surligneur)', rtClear: 'Effacer la mise en forme', rtInkNone: 'Sans couleur', rtMarkNone: 'Sans fond', cardLoading: 'Chargement des sujets…', cardDone: 'Flashcard créée dans « {0} »', cardDoneN: '{0} flashcards créées dans « {1} »', cardFail: 'Impossible de créer la flashcard', cardOffline: 'Pas d’internet : la flashcard n’a pas été créée', cardNoAcc: 'Les flashcards du Notes sont gratuites et gardent les cartes dans votre compte, pour réviser partout : créez le compte gratuit (ou connectez-vous) et reliez l’extension.', cardGoAcc: 'Créer un compte ou se connecter', cardGoTopics: 'Créer des matières', cardNoNotes: 'Les flashcards sont dans GooNotes, que ce compte n’a pas.', cardNoTopics: 'Créez d’abord vos matières et sujets (les mêmes que le carnet d’erreurs) sur l’écran Flashcards.',
      mark: 'Surligner', note: 'Note', copy: 'Copier', del: 'Supprimer', toTopic: 'Envoyer au sujet',
      hide: 'Masquer le passage (retiré de la lecture)', hidden: 'Passage masqué : cliquez pour le voir',
      introGo: 'Utilisez GooHighlights sur cette page', introOff: 'Ne pas afficher sur ce site', introHint: 'Sélectionnez un passage de la page pour le surligner.',
      tourNext: 'Suivant', tourBack: 'Retour', tourSkip: 'Passer', tourDone: 'Compris', tour: [['GooHighlights est activée', 'Sélectionnez du texte sur n\'importe quel site et choisissez la couleur. Chaque surlignage peut porter un nom (facultatif, pour le retrouver facilement) et une note, avec mise en forme et images (et en grand si besoin), et tout revient quand vous rouvrez la page. Dans le même menu, choisissez le sujet du passage (les suivants y vont aussi) et reliez-le à un autre surlignage, sur cette page ou une autre : un clic dessus ouvre sa note sur place, pour la lire et la modifier (ou en grand). Le bouton d\'envoi emmène le passage, mis en forme comme vous voulez, vers les notes du sujet ou le cahier d\'erreurs. Vous ne voulez pas du menu ? Son dernier bouton le désactive.'], ['Annotation à la main', 'Écrivez et dessinez sur la page. Contrairement à la Draw, c\'est enregistré avec vos surlignages.'], ['Capture partielle', 'Découpez une partie de la page pour le cahier d\'erreurs, pour en faire une flashcard (dans les flashcards du Notes, gratuit), pour copier ou pour télécharger.'], ['Panneau de cette page', 'Tout ce que vous avez marqué ici, avec les notes, et la matière de cette page (chaque surlignage va dans l\'un de ses sujets). Raccourci : Alt+W.'], ['Écran d\'accueil', 'Mes surlignages, le nuage et la Draw sont là. Raccourci : Alt+Shift+H.'], ['Minuteur de Notes', 'Pendant une session d\'étude dans Notes, le temps s\'affiche ici, sur n\'importe quelle page. Faites-le glisser pour le déplacer ; clic droit pour le masquer.']], home: "Écran d'accueil de GooDraw (Alt+Shift+H)", inkBtn: 'Annoter à la main (enregistré)', inkTitle: 'Annotation à la main', inkDone: 'Terminer', inkUndo: 'Annuler',
      inkHint: "Dessinez sur la page : c'est enregistré avec les surlignages. Touchez de nouveau l'outil pour la couleur et l'épaisseur. Esc ou Terminer pour quitter.",
      inkColor: 'Couleur', inkSize: 'Épaisseur', inkEraserSize: 'Taille de la gomme', inkFree: 'Libre', inkStraight: 'Droit', inkRedo: 'Rétablir', inkSmooth: 'Lisse', inkNatural: 'Naturel', inkRuler: 'Règle', inkPick: 'Autre couleur',
      inkWhole: 'Efface le trait entier', inkPart: 'Efface seulement là où elle passe',
      'ink.lasso': 'Lasso : sélectionner, déplacer et redimensionner', 'ink.pencil': 'Crayon', 'ink.highlight': 'Surligneur', 'ink.line': 'Ligne', 'ink.rect': 'Rectangle', 'ink.circle': 'Cercle', 'ink.eraser': 'Gomme',
      inks1: '1 annotation à la main', inksN: '{0} annotations à la main', inkShow: 'Afficher', inkHide: 'Masquer', inkMissing: "{0} introuvable(s) dans le texte actuel : à leur place d'avant",
      noColor: 'Sans surligneur', bold: 'Gras', under: 'Souligné', smaller: 'Réduire la police', bigger: 'Agrandir la police',
      quote: 'Citation', textColor: 'Couleur du texte', textReset: "Couleur d'origine du texte",
      quickOn: 'Surligneur rapide activé : le texte est surligné dès sa sélection', quickOff: 'Surligneur rapide désactivé',
      quick: 'Surligneur rapide', panel: 'Panneau des surlignages', close: 'Fermer', delMark: 'Supprimer ce surlignage', mlSave: 'Enregistrer la note', mlOpen: 'Ouvrir la page', mlBig: 'En grand', mlSaved: 'Note enregistrée', mlNoteTip: 'La note de ce surlignage : modifiez-la ici même', mlBtn: 'Relier à un autre surlignage', mlSearch: 'Chercher nom, passage, note ou page', namePh: 'Lui donner un nom (facultatif)', nameTip: 'Un nom à vous, pour retrouver ce surlignage plus facilement', mlNone: 'Aucun surlignage trouvé', mlGone: 'Surlignage supprimé', mlUnlink: 'Retirer le lien', mlHere: 'Sur cette page', mlSet: 'Surlignages reliés', mlFail: "Impossible de relier les surlignages", mlOpenFail: "Impossible d'ouvrir le surlignage", mlCount1: 'Relié à 1 surlignage', mlCountN: 'Relié à {0} surlignages', ticket: 'Signaler un problème ou suggérer', tmTitle: 'Minuteur de Notes : faites-le glisser pour le déplacer ; clic droit pour le masquer', tmPause: 'Pause', tmResume: 'Reprendre', tmHide: 'Masquer dans cet onglet', tmNever: 'Ne plus afficher dans les autres onglets', tmOpen: 'Ouvrir Notes', tmNeverDone: 'Le minuteur ne s’affichera plus dans les autres onglets. Pour le réactiver : l’engrenage du minuteur, dans Notes.', tmNoNotes: 'Ouvrez Notes pour mettre en pause ou reprendre le minuteur.', tmBreak: 'Pause', deleted: 'Surlignage supprimé', undo: 'Annuler',
      notesShow: 'Afficher les notes', notesHide: 'Masquer les notes', notesHiddenN: '{0} note(s) masquée(s)',
      notePh: 'Écrivez une note (collez des images avec Ctrl+V)…', noteBig: 'Ouvrir la note en grand', capAcc: 'Sans compte, rien n\'est gardé : créez le compte gratuit pour en faire une flashcard ou la ranger dans le cahier d\'erreurs (et synchroniser).', accTrialT: 'Gardez ceci dans votre compte gratuit', accTrial: 'Vos surlignages de cette page sont gardés seulement sur cet ordinateur, pour l\'instant. Créez le compte gratuit pour garder ceux-ci et les suivants.', accNeedT: 'Créez votre compte gratuit pour enregistrer', accNeed: 'Surlignages, notes, dessins et le cahier d\'erreurs sont gardés dans votre compte gratuit.', accP1: '5 Mo gratuits, sans carte', accP2: 'Sur n\'importe quel ordinateur, téléphone ou tablette', accP3: 'Hors ligne, il continue d\'enregistrer ici et synchronise au retour', accSignup: 'Créer un compte gratuit', accLogin: 'J\'ai déjà un compte', accLater: 'Pas maintenant', accCode: 'Dans la fenêtre ouverte, créez le compte ou connectez-vous et saisissez ce code :', accDone: 'C\'est fait : connecté à votre compte.', accFail: 'Ouverture impossible pour le moment. Vérifiez votre internet et réessayez.', accLocalT: 'Seulement sur cet ordinateur', accLocalTM: 'Seulement sur cet appareil', accTrialM: 'Vos surlignages de cette page sont gardés seulement sur cet appareil, pour l\'instant. Créez le compte gratuit pour garder ceux-ci et les suivants.', accLocalM: '{0} surlignage(s) sont seulement sur cet appareil. Créez le compte gratuit pour ne pas les perdre et continuer à enregistrer.', accLocal: '{0} surlignage(s) sont seulement ici. Créez le compte gratuit pour ne pas les perdre et continuer à enregistrer.', linkLbl: 'Matière', linkTitle: 'Lier à', linkHint: 'La matière de cette page : chaque surlignage choisit un de ses sujets', linkTopic: 'Choisir le sujet de ce passage', linkOther: 'Une autre matière', linkBtn: 'Lier à une matière ou un sujet', linkNone: 'Non lié', linkNoneHint: 'Sans matière : choisissez celle de cette page', linkSome: 'Lié', linkPage: 'Utiliser celui de la page : {0}', linkPageNone: 'Utiliser celui de la page (non lié)', linkFromPage: '{0} (de la page)', linkSet: 'Lié à « {0} »', linkSearch: 'Chercher une matière ou un sujet', linkNoMatch: 'Aucune matière ni aucun sujet trouvé', imgFail: "Impossible de coller l'image", copied: 'Copié', saveFail: "Impossible d'enregistrer le surlignage",
      title: 'GooHighlights', none: 'Sélectionnez un passage de la page pour le surligner.',
      topic: 'Sujet', noTopic: 'Sans sujet', pickTopic: 'Choisissez le sujet', searchTopic: 'Chercher une matière ou un sujet',
      noTopics: "Créez d'abord des matières et des sujets dans GooNotes.", tags: 'Tags', tagPh: 'Nouveau tag + Enter',
      allToTopic: 'Tout envoyer au sujet', md: 'Copier en Markdown', openNotes: 'Ouvrir dans Notes', openMarks: 'Ouvrir dans Mes surlignages (site)',
      menuOff: 'Ne plus afficher ce menu à la sélection de texte', menuOffDone: 'Menu désactivé. Pour le réactiver : réglages de la Draw ou de l\'écran d\'accueil.', siteOff: 'Désactiver sur ce site', siteOffDone: 'Surlignages désactivés sur {0}. Pour les réactiver : écran d\'accueil de l\'extension › Ce site › Highlights activée ici.',
      sent1: 'Envoyé aux Notes de « {0} »', sentN: '{1} surlignages envoyés aux Notes de « {0} »',
      sendFail: "Impossible d'envoyer au sujet", missing: 'Introuvable sur la page',
      nMarks1: '1 surlignage', nMarksN: '{0} surlignages', noteLbl: 'Note', source: 'Source',
      delAsk: 'Supprimer ce surlignage ?',
      quickPill: 'Surligneur rapide activé', quickOffBtn: 'Désactiver',
      nudge: "Ce menu sur tous les sites, sans ouvrir l'extension ?", nudgeOn: 'Activer', nudgeLater: 'Plus tard',
      statMark1: 'surlignage', statMarkN: 'surlignages', statInk1: 'annotation', statInkN: 'annotations', statNotes: 'avec note',
      spaceFull: 'Votre nuage est plein', spaceFullTx: "Les nouveaux surlignages sont enregistrés sur cet ordinateur et sont envoyés d'eux-mêmes dès qu'il y a de la place.",
      spaceNear: 'Votre nuage est presque plein', spaceNearTx: "Une fois plein, les nouveaux surlignages resteront sur cet ordinateur jusqu'à ce qu'il y ait de la place.", spaceBuy: 'Notes Premium : 10 Go',
      errCrop: "Découper vers le carnet d'erreurs (Alt+Shift+B)", errTitle: "Carnet d'erreurs", errSave: 'Enregistrer', errNewFolder: 'Nouvelle matière',
      errNewSub: 'Nouveau sujet', errNewSubSub: 'Nouveau sous-sujet', errFolderPh: 'Nom de la matière', errSubPh: 'Nom du sujet dans « {0} »', errSubSubPh: 'Nom du sous-sujet dans « {0} »', errFold: 'Replier', errUnfold: 'Ouvrir', errNotePh: "Pourquoi me suis-je trompé ? (facultatif)",
      errPick: 'Choisissez la matière ou le sujet', errSaved: "Enregistré dans le carnet d'erreurs : « {0} »", errFail: "Impossible d'enregistrer dans le carnet d'erreurs",
      errNoFolders: 'Créez la première matière (ex. : Droit constitutionnel) et, si vous voulez, des sujets et sous-sujets dedans. Ce sont les mêmes matières que vos flashcards et le Planner.',
      errHint: 'Faites glisser pour découper · Esc annule', errLocal: 'Sans compte, cela reste sur cet ordinateur. Connectez votre compte pour le voir sur le site et vos autres appareils.',
      errConnect: 'Connecter', errCode: "Dans l'onglet du site qui s'est ouvert, connectez-vous et saisissez le code {0}.", errCopy: 'Copier', errDownload: 'Télécharger', errCapFail: "Impossible de capturer l'écran", errCapPerm: "Pour capturer, le navigateur demande une autorisation de plus.", errCapAllow: 'Autoriser', capTitle: 'Capture partielle', capCopied: 'Copiée : Ctrl+V la colle n\'importe où.', capCard: 'Flashcard avec la capture au recto', capCardSub: 'La capture est la question ; vous écrivez la réponse.', capCardBack: 'Flashcard avec la capture au verso', capCardBackSub: 'Vous écrivez la question ; la capture est la réponse.', capNotes: 'Insérer dans les notes', capNotesSub: 'Ajoutée à la fin des notes du sujet.', capErr: 'Cahier d\'erreurs', capErrSub: 'Dans la matière, le sujet ou le sous-sujet de votre cahier d\'erreurs.', capCopy: 'Copier', capCopySub: 'Pour coller avec Ctrl+V.', capDl: 'Télécharger', capDlSub: 'Enregistre l\'image (PNG).', capWhere: 'Dans quel sujet ?', capBack: 'Retour', capSent: 'Insérée dans les notes de « {0} »', capFail: 'Impossible d\'insérer dans les notes', capFull: 'Votre nuage est plein : libérez de la place pour garder l\'image.', capCopiedNow: 'Copiée', cardPic: 'Recto (la capture)', cardPicText: 'Texte sous l\'image (facultatif)', cardPicBack: 'Verso (la capture)', errFull: 'Votre nuage est plein : libérez de la place ou agrandissez le nuage pour enregistrer.'
    }
  };
  let L = STR.pt;
  let uiLang = 'pt';
  const tr = (k, ...a) => String(L[k] || (L !== STR.pt && STR.en[k]) || STR.pt[k] || k).replace(/\{(\d)\}/g, (_, i) => a[i] ?? '');

  // Same colours as Minhas marcações in the Notes (notes/marks.js). The last,
  // white, doesn't highlight: it hides — a passage of the law that doesn't
  // matter leaves the reading, as a small "⋯" (click: it shows, faded).
  const COLORS = { yellow: '#fde047', green: '#86efac', blue: '#93c5fd', pink: '#f9a8d4', orange: '#fdba74', purple: '#c4b5fd', hide: '#ffffff' };
  const HIDE = 'hide';
  // A mark can also change the text itself (fmt): bold, underline, size,
  // colour, quote — with a highlighter or without one (color 'none').
  const NONE = 'none';
  const TEXT_COLORS = { red: '#dc2626', blue: '#2563eb', green: '#16a34a', purple: '#7c3aed', orange: '#ea580c' };
  const SIZES = { '-2': 0.8, '-1': 0.9, '1': 1.15, '2': 1.3, '3': 1.5 };
  const COLOR_KEYS = Object.keys(COLORS);

  // ─── STATE ────────────────────────────────────────────────────────────────
  const HOST = location.hostname.replace(/^www\./, '');
  const prefs = { on: true, quick: false, color: 'yellow', off: [], theme: 'auto', introOff: [], tourDone: false, dockHide: false };
  // "Ocultar notas": only the highlights show — the notes' text in the panel
  // and their marks on the page (dotted underline, the note pin) go away.
  let notesHidden = false;
  let page = null;               // the webpages record, once there is one
  let marks = [];                // the marks of this page
  let curTopic = null;           // the topic a new mark on this page gets (the menu's; the last one used)
  const painted = new Map();     // mark id → its <bn-mark> elements
  // The address the marks are kept under. Sites that change question without
  // changing the address get their own: on TEC Concursos the caderno's address
  // stays put while the question goes by, so the question's own link (the
  // "#2992744" on the page, a.id-questao) is the page — the marks follow the
  // question into any caderno, and open with it on its own.
  const tecQuestion = () => /(^|\.)tecconcursos\.com\.br$/.test(location.hostname)
    ? document.querySelector('a.id-questao[href*="/questoes/"]') : null;
  function pageUrl() {
    const a = tecQuestion();
    const m = a && /\/questoes\/(\d+)/.exec(a.getAttribute('href') || '');
    return m ? 'https://www.tecconcursos.com.br/questoes/' + m[1] : location.href;
  }
  let url = pageUrl();
  let enabled = false;
  // In the Android app (MainActivity → HlEngine) there is no mouse: a
  // selection is made with the phone's handles, so the menu follows the
  // selection itself, and opens below it (the phone's own Copiar/Compartilhar
  // floats above). A tap on the menu may clear the selection first: the
  // range it was opened for is kept.
  const TOUCH = !!window.__bnHlAndroid;
  // The extension (not the Android or iOS app): it has a home screen
  // (home.html), opened over the page by background.js.
  const IS_EXT = !TOUCH && !window.__bnIOS && !window.AndroidBridge && (() => { try { return !!chrome.runtime.id; } catch (e) { return false; } })();
  const goHome = () => send({ action: 'home.open' });
  let barRange = null;

  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  // ─── THE PAGE'S TEXT ──────────────────────────────────────────────────────
  // Every text node in reading order, where each starts in the joined text,
  // and the joined text with whitespace collapsed (norm) — map[i] is where
  // norm's character i is in the joined text.
  const SKIP = new Set(['SCRIPT', 'STYLE', 'NOSCRIPT', 'TEXTAREA', 'INPUT', 'SELECT', 'TEMPLATE', 'IFRAME', 'OBJECT', 'CANVAS', 'VIDEO', 'AUDIO', 'svg', 'math']);
  const OURS = ['__bn_hl_host__', '__pd_root__'];
  let index = null;
  function buildIndex() {
    const nodes = [], starts = [], parts = [];
    let len = 0;
    const w = document.createTreeWalker(document.body || document.documentElement, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT, {
      acceptNode(n) {
        if (n.nodeType === 3) return NodeFilter.FILTER_ACCEPT;
        if (SKIP.has(n.nodeName) || OURS.includes(n.id)) return NodeFilter.FILTER_REJECT;
        return NodeFilter.FILTER_SKIP;
      }
    });
    for (let n = w.nextNode(); n; n = w.nextNode()) {
      if (!n.data.length) continue;
      nodes.push(n); starts.push(len); parts.push(n.data); len += n.data.length;
    }
    const full = parts.join('');
    const out = [], map = [];
    let space = true;
    for (let i = 0; i < full.length; i++) {
      const ch = full[i];
      if (ch === ' ' || ch === '\n' || ch === '\t' || ch === '\r' || ch === ' ' || ch === '\f' || ch === '\v' || ch === ' ' || ch === ' ') {
        if (!space) { out.push(' '); map.push(i); space = true; }
      } else { out.push(ch); map.push(i); space = false; }
    }
    index = { nodes, starts, norm: out.join(''), map };
    return index;
  }
  const getIndex = () => index || buildIndex();

  // First i with a[i] >= v.
  function lowerBound(a, v) {
    let lo = 0, hi = a.length;
    while (lo < hi) { const m = (lo + hi) >> 1; if (a[m] < v) lo = m + 1; else hi = m; }
    return lo;
  }

  // A selection → [start, end) in the joined text, or null.
  function rangeOffsets(ix, range) {
    let a = -1, b = -1;
    // Nodes before the selection's own first text node can't be in it.
    const si = range.startContainer.nodeType === 3 ? ix.nodes.indexOf(range.startContainer) : -1;
    for (let i = Math.max(0, si); i < ix.nodes.length; i++) {
      const n = ix.nodes[i];
      if (!range.intersectsNode(n)) { if (a >= 0) break; continue; }
      const s = n === range.startContainer ? range.startOffset : 0;
      const e = n === range.endContainer ? range.endOffset : n.data.length;
      if (e <= s) continue;
      if (a < 0) a = ix.starts[i] + s;
      b = ix.starts[i] + e;
    }
    return a < 0 ? null : { a, b };
  }

  // The anchor of a passage of the joined text, with the trimmed range. A
  // selection that starts or ends inside a word takes the whole word: a
  // mouse rarely lands exactly on a word's edge.
  const WORD = /[\p{L}\p{N}]/u;
  function anchorOf(ix, o) {
    const T = ix.norm;
    let ns = lowerBound(ix.map, o.a), ne = lowerBound(ix.map, o.b);
    while (ns < ne && T[ns] === ' ') ns++;
    while (ne > ns && T[ne - 1] === ' ') ne--;
    if (ne <= ns) return null;
    if (WORD.test(T[ns])) while (ns > 0 && WORD.test(T[ns - 1])) ns--;
    if (WORD.test(T[ne - 1])) while (ne < T.length && WORD.test(T[ne])) ne++;
    const exact = T.slice(ns, ne);
    return {
      anchor: { exact, prefix: T.slice(Math.max(0, ns - 48), ns), suffix: T.slice(ne, ne + 48), pos: ns },
      a: ix.map[ns], b: ix.map[ne - 1] + 1
    };
  }

  function locate(ix, an) {
    if (!an || !an.exact) return null;
    const { exact, prefix = '', suffix = '', pos = 0 } = an;
    let best = -1, bestScore = -1, bestDist = Infinity, n = 0;
    for (let i = ix.norm.indexOf(exact); i >= 0 && n < 3000; i = ix.norm.indexOf(exact, i + 1), n++) {
      const before = ix.norm.slice(Math.max(0, i - prefix.length), i), after = ix.norm.slice(i + exact.length, i + exact.length + suffix.length);
      let p = 0; while (p < prefix.length && p < before.length && prefix[prefix.length - 1 - p] === before[before.length - 1 - p]) p++;
      let s = 0; while (s < suffix.length && s < after.length && suffix[s] === after[s]) s++;
      const score = p + s, dist = Math.abs(i - pos);
      if (score > bestScore || (score === bestScore && dist < bestDist)) { best = i; bestScore = score; bestDist = dist; }
    }
    return best < 0 ? null : { a: ix.map[best], b: ix.map[best + exact.length - 1] + 1 };
  }

  // ─── PAINTING ─────────────────────────────────────────────────────────────
  let quiet = false;   // our own DOM changes: the observer looks away
  // The page's own stylesheet, for the hidden passages (a pseudo-element can't
  // be set inline).
  function ensurePageCss() {
    if (document.getElementById('__bn_hl_css__')) return;
    const st = document.createElement('style');
    st.id = '__bn_hl_css__';
    st.textContent = `bn-mark[data-hide]{font-size:0!important;background:none!important;border:0!important}
bn-mark[data-hide][data-first]::before{content:"⋯";font-size:14px;line-height:1;display:inline-block;padding:1px 7px 3px;margin:0 3px;border-radius:99px;background:rgba(128,128,140,.16);color:rgba(100,100,120,.95);vertical-align:middle;cursor:pointer;letter-spacing:1px;font-weight:700;text-decoration:none}
bn-mark[data-hide].bn-peek{font-size:inherit!important;opacity:.5;text-decoration:line-through!important}
bn-mark[data-hide].bn-peek::before{display:none!important}
bn-mark[data-q]:not([data-hide]){font-style:italic!important}
bn-mark[data-q][data-first]:not([data-hide])::before{content:"“";font-weight:700;opacity:.6;margin-right:1px}
bn-mark[data-q][data-last]:not([data-hide])::after{content:"”";font-weight:700;opacity:.6;margin-left:1px}`;
    (document.head || document.documentElement).appendChild(st);
  }
  // A page in dark mode (light text on a dark background): a solid pastel
  // under light letters can't be read, so there the highlight is the same
  // colour, translucent, and the text keeps the site's own colour — as the
  // e-book readers do at night. Read from the text around the passage.
  function darkAround(node) {
    const e = node && (node.nodeType === 1 ? node : node.parentElement);
    if (!e) return false;
    const m = /rgba?\((\d+),\s*(\d+),\s*(\d+)/.exec(getComputedStyle(e).color || '');
    if (!m) return false;
    const [r, g, b] = [m[1], m[2], m[3]].map(v => +v / 255);
    return 0.2126 * r + 0.7152 * g + 0.0722 * b > 0.6;
  }
  // A site whose dark mode inverts the whole page with a CSS filter (as the
  // TEC Concursos does — the hues come back with hue-rotate, the lightness
  // doesn't): under it a pastel turns into a muddy dark. The mark then takes
  // the opposite filter and shows its real colour, text included.
  function invertedAround(node) {
    let e = node && (node.nodeType === 1 ? node : node.parentElement), odd = false;
    for (let n = 0; e && n < 60; e = e.parentElement, n++) {
      const f = getComputedStyle(e).filter;
      const m = f && f !== 'none' && /invert\(\s*([\d.]+)(%?)\s*\)/.exec(f);
      if (m && (m[2] ? +m[1] / 100 : +m[1]) >= 0.5) odd = !odd;
    }
    return odd;
  }
  const tint = (hex, a) => { const h = hex.replace('#', ''); return `rgba(${parseInt(h.slice(0, 2), 16)},${parseInt(h.slice(2, 4), 16)},${parseInt(h.slice(4, 6), 16)},${a})`; };
  function styleEl(el, m, around) {
    ensurePageCss();
    const inv = invertedAround(around || el.parentNode);
    // Under an inverting filter the computed colours are still the light ones.
    const dark = !inv && darkAround(around || el.parentNode);
    if (inv) el.style.setProperty('filter', 'invert(1) hue-rotate(180deg)', 'important'); else el.style.removeProperty('filter');
    if (m.color === HIDE) {
      el.dataset.hide = '1';
      el.title = tr('hidden');
      ['background-color', 'border-radius', 'border-bottom'].forEach(k => el.style.removeProperty(k));
      el.style.setProperty('cursor', 'pointer', 'important');
      return;
    }
    if (el.dataset.hide) { delete el.dataset.hide; el.classList.remove('bn-peek'); el.removeAttribute('title'); }
    if (m.color === NONE) el.style.removeProperty('background-color');
    else el.style.setProperty('background-color', dark ? tint(COLORS[m.color] || COLORS.yellow, 0.34) : (COLORS[m.color] || COLORS.yellow), 'important');
    const f = m.fmt || {};
    el.style.setProperty('color', TEXT_COLORS[f.tc] || 'inherit', 'important');
    if (f.b) el.style.setProperty('font-weight', '700', 'important'); else el.style.removeProperty('font-weight');
    if (f.u) { el.style.setProperty('text-decoration', 'underline', 'important'); el.style.setProperty('text-underline-offset', '3px'); }
    else { el.style.removeProperty('text-decoration'); el.style.removeProperty('text-underline-offset'); }
    if (SIZES[f.size]) el.style.setProperty('font-size', SIZES[f.size] + 'em', 'important'); else el.style.removeProperty('font-size');
    if (f.q) el.dataset.q = '1'; else delete el.dataset.q;
    el.style.setProperty('border-radius', '2px', 'important');
    el.style.setProperty('cursor', 'pointer', 'important');
    el.style.setProperty('-webkit-box-decoration-break', 'clone');
    el.style.setProperty('box-decoration-break', 'clone');
    if (m.note && !notesHidden) el.style.setProperty('border-bottom', `2px dotted ${dark ? 'rgba(255,255,255,.6)' : 'rgba(0,0,0,.45)'}`, 'important');
    else el.style.removeProperty('border-bottom');
  }
  // Wraps [a, b) of the joined text. Splitting a text node keeps the original
  // node as its first part, so passages wrapped from the last to the first
  // never invalidate the index for the ones still to come.
  function wrap(ix, a, b, m) {
    const els = [];
    quiet = true;
    let i = Math.max(0, lowerBound(ix.starts, a + 1) - 1);
    for (; i < ix.nodes.length && ix.starts[i] < b; i++) {
      const n = ix.nodes[i], st = ix.starts[i];
      if (!n.parentNode) continue;
      const s = Math.max(0, a - st), e = Math.min(n.data.length, b - st);
      if (e <= s || !n.data.slice(s, e).trim()) continue;
      if (e < n.data.length) n.splitText(e);
      const part = s > 0 ? n.splitText(s) : n;
      const el = document.createElement('bn-mark');
      el.dataset.id = m.id;
      if (!els.length) el.dataset.first = '1';
      styleEl(el, m, part.parentNode);
      part.parentNode.insertBefore(el, part);
      el.appendChild(part);
      els.push(el);
    }
    if (els.length) { els[els.length - 1].dataset.last = '1'; painted.set(m.id, els); }
    quiet = false;
    if (observer) observer.takeRecords();
    return els.length > 0;
  }
  function unwrap(id) {
    const els = painted.get(id);
    painted.delete(id);
    if (!els) return;
    quiet = true;
    els.forEach(el => {
      const p = el.parentNode;
      if (!p) return;
      while (el.firstChild) p.insertBefore(el.firstChild, el);
      el.remove();
      p.normalize();
    });
    quiet = false;
    if (observer) observer.takeRecords();
    index = null;
  }
  function restyle(m) { (painted.get(m.id) || []).forEach(el => styleEl(el, m)); renderPins(); }
  // The site switching its own light/dark mode (a class, an attribute, a
  // filter on <html> or <body>): every mark is painted again for it.
  let themeSig = '';
  function pageThemeSig() {
    const h = document.documentElement, b = document.body;
    const hs = getComputedStyle(h), bs = b ? getComputedStyle(b) : null;
    return [hs.filter, hs.colorScheme, hs.backgroundColor, bs && bs.filter, bs && bs.color, bs && bs.backgroundColor].join('|');
  }
  // Our own menus and bars, inside <html>, are inverted with it: the same
  // opposite filter puts their colours back.
  function counterHost() {
    if (invertedAround(document.documentElement)) host.style.setProperty('filter', 'invert(1) hue-rotate(180deg)');
    else host.style.removeProperty('filter');
  }
  function watchTheme() {
    themeSig = pageThemeSig();
    counterHost();
    let t = 0;
    const check = () => {
      clearTimeout(t);
      t = setTimeout(() => {
        const sig = pageThemeSig();
        if (sig === themeSig) return;
        themeSig = sig;
        counterHost();
        if (enabled && marks.length) marks.forEach(restyle);
      }, 120);
    };
    const mo = new MutationObserver(check);
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ['class', 'style', 'data-theme', 'data-bs-theme', 'theme'] });
    if (document.body) mo.observe(document.body, { attributes: true, attributeFilter: ['class', 'style', 'data-theme', 'data-bs-theme', 'theme'] });
    // A stylesheet swapped in, or a toggle deeper in the page: a slow look too.
    themeIv = setInterval(check, 2500);
  }

  // Paints every mark not on screen yet; returns how many are still missing.
  function paintAll() {
    if (!enabled || !document.body) return 0;
    const todo = [];
    let ix = buildIndex();
    for (const m of marks) {
      if (painted.has(m.id)) continue;
      const r = locate(ix, m.anchor);
      if (r) todo.push({ m, r });
    }
    todo.sort((x, y) => y.r.a - x.r.a);
    let last = Infinity;
    for (let { m, r } of todo) {
      if (r.b > last) {             // overlaps the one just wrapped: look again
        ix = buildIndex();
        r = locate(ix, m.anchor);
        if (!r) continue;
      }
      if (wrap(ix, r.a, r.b, m)) last = r.a;
    }
    index = null;
    renderPins();
    return marks.filter(m => !painted.has(m.id)).length;
  }
  function unpaintAll() { [...painted.keys()].forEach(unwrap); renderPins(); }

  // ─── NOTE PINS ───────────────────────────────────────────────────────────
  // A highlight with a note gets a small pin at its end. Clicking the pin
  // opens the note — on a passage that is also a button of the site (an
  // alternative of a question), a click on the highlight itself goes to the
  // site, so the pin is the way in. Drawn in the overlay, following the page.
  let pinBox = null, pinRaf = 0;
  const pinEls = new Map();
  function renderPins() { if (!pinRaf) pinRaf = requestAnimationFrame(drawPins); }
  function drawPins() {
    pinRaf = 0;
    const want = enabled && !notesHidden && !(typeof inkOn !== 'undefined' && inkOn)
      ? marks.filter(m => m.note && m.color !== HIDE && painted.has(m.id)) : [];
    const keep = new Set();
    for (const m of want) {
      const els = painted.get(m.id), last = els[els.length - 1];
      if (!last || !last.isConnected) continue;
      const rs = last.getClientRects(), r = rs[rs.length - 1];
      if (!r || r.bottom < 0 || r.top > innerHeight || r.right < 0 || r.left > innerWidth) continue;
      if (!pinBox) { mount(); pinBox = el('<div class="pins"></div>'); shadow.appendChild(pinBox); }
      let b = pinEls.get(m.id);
      if (!b) {
        b = el(`<button class="pin" title="${esc(tr('noteLbl'))}" aria-label="${esc(tr('noteLbl'))}">${svg(IC.note, 11)}</button>`);
        b.addEventListener('pointerdown', e => { e.stopPropagation(); e.preventDefault(); });
        b.addEventListener('click', e => { e.stopPropagation(); e.preventDefault(); openPop(m.id); });
        pinEls.set(m.id, b); pinBox.appendChild(b);
      }
      b.style.left = Math.round(Math.min(innerWidth - 22, r.right - 4)) + 'px';
      b.style.top = Math.round(Math.max(0, r.top - 11)) + 'px';
      keep.add(m.id);
    }
    pinEls.forEach((b, id) => { if (!keep.has(id)) { b.remove(); pinEls.delete(id); } });
    if (!pinEls.size && pinBox) { pinBox.remove(); pinBox = null; }
  }
  addEventListener('scroll', renderPins, { signal: __ac.signal, capture: true, passive: true });
  addEventListener('resize', renderPins, { signal: __ac.signal, passive: true });

  // Pages that build themselves late, or rebuild a part (a single-page app):
  // what was wrapped and is gone is looked for again, and so is what was
  // never found.
  let observer = null, moTimer = 0, moWait = 700, moLen = -1;
  function watch() {
    if (observer || !document.body) return;
    observer = new MutationObserver(() => {
      if (quiet || moTimer) return;
      index = null;
      // One look per wait, not one per mutation. A page whose text changed
      // for real (over 1%) is looked at again soon; one that only ticks (a
      // clock, an ad) while a mark is still missing waits longer each time,
      // up to half a minute (Onda 3, 01/11/2026).
      moTimer = setTimeout(() => {
        moTimer = 0;
        const len = document.body ? document.body.textContent.length : 0;
        const changed = moLen < 0 || Math.abs(len - moLen) > moLen * 0.01;
        moLen = len;
        for (const [id, els] of painted) if (els.some(el => !el.isConnected)) unwrap(id);
        if (marks.some(m => !painted.has(m.id))) { paintAll(); renderPanel(); focusPending(); }
        if (inks.length) placeInks();
        moWait = changed || !marks.some(m => !painted.has(m.id)) ? 700 : Math.min(30000, moWait * 2);
      }, moWait);
    });
    observer.observe(document.body, { childList: true, subtree: true, characterData: true });
  }

  // ─── LOADING ──────────────────────────────────────────────────────────────
  async function load() {
    const r = await send({ action: 'hl.load', url: pageUrl() });
    if (!r) return;
    page = r.page || null;
    const next = Array.isArray(r.marks) ? r.marks : [];
    // What changed elsewhere (in the Notes, on another device): gone, recoloured.
    const byId = new Map(next.map(m => [m.id, m]));
    for (const id of [...painted.keys()]) if (!byId.has(id)) unwrap(id);
    for (const m of next) {
      const old = marks.find(x => x.id === m.id);
      if (old && (old.color !== m.color || old.note !== m.note)) restyle(m);
    }
    marks = next.sort((a, b) => (a.anchor ? a.anchor.pos : 0) - (b.anchor ? b.anchor.pos : 0));
    // The next mark goes where the last one went (the same topic, most often).
    if (!curTopic) { const last = marks.filter(x => x.topic).sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))[0]; curTopic = last ? last.topic : null; }
    paintAll();
    // The hand annotations kept with this page (none left over from another).
    inks = Array.isArray(r.inks) ? r.inks : [];
    placeInks();
    watch();
    loadedOnce = true;
    linkN = r.linkN || {};
    renderBadge();
    renderPanel();
    // Opened from a mark linked to one of these (hl.goto): there, and open —
    // now, or when the page shows its passage (a page still loading).
    if (r.focus) { focusId = r.focus; focusUntil = Date.now() + 30000; }
    focusPending();
  }
  let focusId = null, focusUntil = 0;
  function focusPending() {
    if (!focusId || !painted.has(focusId)) { if (Date.now() > focusUntil) focusId = null; return; }
    const id = focusId; focusId = null;
    setTimeout(() => gotoMark(id), 300);
  }

  function pageInfo() {
    const meta = n => { const el = document.querySelector(`meta[name="${n}"],meta[property="${n}"]`); return el ? el.getAttribute('content') || '' : ''; };
    const title = (document.title || meta('og:title') || '').trim();
    // A TEC question: its number before the caderno's name, one item per question.
    const q = tecQuestion(), qn = q ? q.textContent.trim() : '';
    return { title: qn ? `${qn} · ${title}` : title, description: (meta('description') || meta('og:description')).trim() };
  }

  // ─── UI: ONE SHADOW ROOT FOR EVERYTHING ───────────────────────────────────
  const host = document.createElement('div');
  host.id = '__bn_hl_host__';
  host.style.cssText = 'all:initial;position:fixed;top:0;left:0;width:0;height:0;z-index:2147483646;';
  // Closed: the page's scripts can't reach in (read the marks of other sites
  // through the link picker, the capture's picture…). Nothing uses .shadowRoot.
  const shadow = host.attachShadow({ mode: 'closed' });
  // Whether an event happened inside one of our boxes (the bar, a picker…).
  // The shadow is closed: a listener on the page or the window sees the path
  // stop at the host, never the box itself — so a press on the bar looked
  // like one outside it and closed it before the click (chamados #34 and #35,
  // 02/11/2026). The spot under the pointer says which box it was.
  function inBox(e, box) {
    if (!box) return false;
    const p = e.composedPath();
    if (p.includes(box)) return true;
    if (!p.includes(host)) return false;
    const pt = (e.touches && e.touches[0]) || (e.changedTouches && e.changedTouches[0]) || e;
    if (typeof pt.clientX !== 'number') return true;
    const at = shadow.elementFromPoint(pt.clientX, pt.clientY);
    return !!at && box.contains(at);
  }
  // The next version of this file takes the page over (background.js injects
  // it after an update): what this copy hung on the page comes off.
  window.__bnHlTeardown = () => {
    try { __ac.abort(); } catch (e) {}
    if (observer) { observer.disconnect(); observer = null; }
    clearTimeout(moTimer);
    [themeIv, tmIv, spaIv, fitTimer, inkFitTimer, tmTick].forEach(iv => clearInterval(iv));
    try { unpaintAll(); } catch (e) {}   // the <bn-mark>s of this copy: the next one paints its own
    if (tmEl) { tmEl.remove(); tmEl = null; }
    host.remove();
    window.__bnHl = false; delete window.__bnHlTeardown; delete window.__bnHlVersion;
  };
  shadow.innerHTML = `<style>
    :host { --bg:#1f1f2c; --bg2:#2a2a3c; --ink:#ececf6; --soft:#b4b4c8; --line:#3a3a52; --brand:#4a4aff; --panel:#ffffff; --pink:#f5f5fa; --pinkLine:#e7e7ef; --pinkInk:#1a1a2e; --pinkSoft:#5a5a70; }
    :host(.dark) { --panel:#1f1f2c; --pink:#262636; --pinkLine:#34344a; --pinkInk:#ececf6; --pinkSoft:#b4b4c8; }
    * { box-sizing:border-box; font-family:'Segoe UI',system-ui,-apple-system,Roboto,Arial,sans-serif; }
    button { font:inherit; cursor:pointer; }
    .bar { position:fixed; display:flex; align-items:center; gap:4px; padding:5px 6px; background:var(--bg); color:var(--ink);
      border-radius:12px; box-shadow:0 8px 28px rgba(0,0,0,.35); border:1px solid var(--line); font-size:13px; user-select:none; }
    .dot { width:22px; height:22px; border-radius:50%; border:2px solid rgba(255,255,255,.25); padding:0; }
    .dot:hover, .dot.on { border-color:#fff; transform:scale(1.08); }
    .dot[data-c="hide"] { background:linear-gradient(135deg, #fff 44%, #8b8ba0 44%, #8b8ba0 56%, #fff 56%) !important; }
    .sep { width:1px; height:22px; background:var(--line); margin:0 3px; }
    .ib { width:30px; height:30px; display:inline-flex; align-items:center; justify-content:center; border-radius:8px; border:0; background:transparent; color:var(--soft); }
    .ib:hover { background:var(--bg2); color:#fff; }
    .ib.on { background:linear-gradient(180deg,#5c5cff,#4a4aff); color:#fff; }
    .ib.danger:hover { background:#e53935; }
    /* The colours and buttons on one line (.r1) — the bar as wide as they
       are, so nothing drops to a line of its own; the format row under them. */
    .bar { flex-direction:column; align-items:stretch; gap:0; max-width:calc(100vw - 12px); }
    .bar .r1 { display:flex; flex-wrap:wrap; align-items:center; gap:4px; }
    .fmt { display:flex; align-items:center; gap:2px; flex-basis:100%; padding-top:4px; margin-top:2px; border-top:1px solid var(--line); }
    .fmt .ib { width:28px; height:28px; font-size:14px; font-weight:700; font-family:Georgia,'Times New Roman',serif; }
    .fmt .tc { width:22px; height:22px; border-radius:6px; border:2px solid transparent; padding:0; font:800 13px Georgia,serif; background:var(--bg2); }
    .fmt .tc.on, .fmt .tc:hover { border-color:#fff; }
    .dot[data-c="none"] { background:transparent !important; border:2px dashed rgba(255,255,255,.45); }
    .pop { position:fixed; width:350px; background:var(--bg); color:var(--ink); border-radius:12px; border:1px solid var(--line);
      box-shadow:0 10px 32px rgba(0,0,0,.4); padding:10px; font-size:13px; }
    .pop .row { display:flex; align-items:center; gap:4px; }
    .pop textarea { width:100%; min-height:70px; margin-top:8px; resize:vertical; border-radius:8px; border:1px solid var(--line);
      background:var(--bg2); color:var(--ink); padding:8px; font-size:13px; outline:none; }
    .pop textarea:focus { border-color:#6b6bff; }
    .cap-acc { display:flex; align-items:center; gap:10px; margin:10px 0 12px; padding:10px 12px; border-radius:12px; background:var(--brand-soft); color:var(--brand-ink); font-size:13px; line-height:1.45; }
    .cap-acc span { flex:1; }
    .cap-acc .bn-btn { flex:none; }
    .acc .acc-tx { margin:0 0 10px; line-height:1.55; }
    .acc .acc-li { list-style:none; margin:0 0 6px; padding:0; display:grid; gap:7px; }
    .acc .acc-li li { display:flex; gap:8px; align-items:flex-start; font-size:13.5px; line-height:1.45; }
    .acc .acc-li svg { flex:none; margin-top:2px; color:var(--brand); }
    .acc .acc-code { margin-top:12px; padding:12px; border-radius:12px; background:var(--brand-soft); color:var(--brand-ink); display:flex; flex-direction:column; gap:6px; text-align:center; font-size:13px; }
    .acc .acc-code b { font:800 26px/1.1 ui-monospace,Menlo,monospace; letter-spacing:.12em; }
    .pop .nm { width:100%; margin-top:8px; padding:6px 8px; border-radius:8px; border:1px solid var(--line); background:transparent; color:var(--ink); font:600 13px/1.3 inherit; font-family:inherit; outline:none; box-sizing:border-box; }
    .pop .nm:focus { border-color:#6b6bff; }
    .pop .nm::placeholder { color:var(--soft); font-weight:400; opacity:.8; }
    .pop-link { display:flex; align-items:center; gap:6px; width:100%; margin-top:8px; padding:6px 8px; border-radius:8px; border:1px dashed var(--line);
      background:transparent; color:var(--soft); font-size:12px; text-align:left; }
    .pop-link span { flex:1; min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
    .pop-link.own { border-style:solid; color:var(--ink); }
    .pop-link:hover { border-color:#6b6bff; color:var(--ink); }
    .rp { width:320px; z-index:3; }
    .rp-hd { display:flex; align-items:center; justify-content:space-between; padding:10px 8px 6px 14px; }
    .rp-hd .ib { color:var(--pinkSoft); }
    .rp .rp-opt { display:flex; align-items:center; gap:8px; margin:0 6px 4px; width:calc(100% - 12px); }
    .rp .list.err-list { padding:0 6px 8px; }
    .tp.rp .rp-q { margin:2px 8px 6px; }
    .p-link { display:flex; align-items:center; gap:8px; }
    .p-link span { flex:1; min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
    .p-link.none span { color:var(--pinkSoft); }
    .card .lk { display:flex; align-items:center; gap:5px; margin-top:6px; font-size:11.5px; color:var(--pinkSoft); }
    .card .lk span { overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
    .tmf { position:fixed; z-index:6; display:flex; align-items:center; gap:8px; padding:5px 5px 5px 10px; border-radius:12px; background:var(--bg); color:var(--ink);
      border:1px solid var(--line); box-shadow:0 8px 24px rgba(0,0,0,.28); cursor:grab; user-select:none; touch-action:none; font-size:12px; }
    .tmf:active { cursor:grabbing; }
    .tmf-dot { width:7px; height:7px; border-radius:50%; background:var(--soft); flex:none; }
    .tmf.run .tmf-dot { background:#22c55e; box-shadow:0 0 0 3px rgba(34,197,94,.22); }
    .tmf-txt { display:flex; flex-direction:column; line-height:1.15; min-width:0; }
    .tmf-txt small { max-width:130px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; color:var(--soft); font-size:10.5px; }
    .tmf-txt small:empty { display:none; }
    .tmf-t { font:700 15px ui-monospace,Menlo,Consolas,monospace; letter-spacing:-.02em; font-variant-numeric:tabular-nums; }
    .tmf-t.over { color:#f59e0b; } .tmf-t.brk { color:#22c55e; }
    .tmf-p { width:28px; height:28px; border-radius:8px; border:0; background:#4a4aff; color:#fff; display:grid; place-items:center; cursor:pointer; flex:none; }
    .tmf-menu { position:fixed; z-index:7; display:flex; flex-direction:column; min-width:210px; padding:4px; border-radius:10px; background:var(--bg); border:1px solid var(--line); box-shadow:0 10px 30px rgba(0,0,0,.35); }
    .tmf-menu button { text-align:left; padding:8px 10px; border:0; border-radius:7px; background:transparent; color:var(--ink); font-size:12.5px; cursor:pointer; }
    .tmf-menu button:hover { background:var(--bg2); }
    .mls { display:flex; flex-direction:column; gap:4px; margin-top:6px; }
    .ml-note { margin:-2px 0 4px 10px; padding-left:8px; border-left:3px solid var(--line); }
    .pop .ml-note .nte { min-height:56px; max-height:200px; margin-top:4px; }
    .ml-acts { display:flex; flex-wrap:wrap; gap:6px; margin-top:6px; }
    .pbtn { font:inherit; font-size:12.5px; font-weight:600; padding:5px 10px; border-radius:8px; border:0; cursor:pointer; background:#5b5bf0; color:#fff; }
    .pbtn.ghost { background:transparent; color:inherit; border:1px solid var(--line); }
    .ml { display:flex; align-items:center; gap:2px; border-radius:8px; border:1px solid var(--line); border-left:3px solid var(--c); }
    .ml-go { flex:1; min-width:0; display:flex; flex-direction:column; align-items:flex-start; gap:1px; padding:5px 8px; border:0; background:transparent; color:var(--ink); font-size:12px; text-align:left; cursor:pointer; border-radius:7px; }
    .ml-go:hover { background:var(--bg2); }
    .ml-go span, .ml-go small { max-width:100%; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
    .ml-go small { color:var(--soft); font-size:11px; }
    .ml.gone .ml-go { color:var(--soft); font-style:italic; cursor:default; }
    .ml .ib { flex:none; color:var(--soft); }
    .ml-add { display:flex; align-items:center; gap:6px; width:100%; padding:5px 8px; border-radius:8px; border:1px dashed var(--line); background:transparent; color:var(--soft); font-size:12px; text-align:left; cursor:pointer; }
    .ml-add:hover { border-color:#6b6bff; color:var(--ink); }
    .ml-pick { z-index:3; }
    .tp.ml-pick .ml-it { border-left:3px solid var(--c); border-radius:4px 8px 8px 4px; margin-bottom:2px; }
    .ml-pick .ml-it span { display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden; font-size:12.5px; }
    .ml-pick .empty { padding:10px; color:var(--pinkSoft); font-size:12.5px; }
    .pop .nte { width:100%; min-height:70px; max-height:260px; overflow:auto; margin-top:8px; resize:vertical; border-radius:8px; border:1px solid var(--line);
      background:var(--bg2); color:var(--ink); padding:8px; font-size:13px; line-height:1.45; outline:none; cursor:text; overflow-wrap:anywhere; }
    .pop .nte:focus { border-color:#6b6bff; }
    .pop .nte:empty::before { content:attr(data-ph); color:var(--soft); opacity:.75; pointer-events:none; }
    .nte img, .nt.rich img { max-width:100%; max-height:200px; border-radius:6px; display:block; margin:4px 0; }
    .nte p, .nt.rich p { margin:0 0 4px; }
    .nte ul, .nte ol, .nt.rich ul, .nt.rich ol { margin:2px 0 4px; padding-left:20px; }
    .nte blockquote, .nt.rich blockquote { margin:4px 0; padding-left:10px; border-left:3px solid var(--line); }
    .nte h1, .nte h2, .nte h3, .nt.rich h1, .nt.rich h2, .nt.rich h3 { font-size:1.12em; margin:6px 0 4px; }
    .nte table, .nt.rich table { border-collapse:collapse; } .nte td, .nte th, .nt.rich td, .nt.rich th { border:1px solid var(--line); padding:2px 6px; }
    .nte a, .nt.rich a { color:#8f94ff; }
    .nt.rich { white-space:normal; max-height:220px; overflow:hidden; }
    li[data-checked]::marker { content:''; } li[data-checked] { list-style:none; } li[data-checked]::before { content:'☐ '; } li[data-checked="true"]::before { content:'☑ '; }
    .big-note { position:fixed; inset:0; width:100vw; height:100vh; border:0; margin:0; background:transparent; color-scheme:normal; }
    .toast { position:fixed; left:50%; bottom:28px; transform:translateX(-50%); background:var(--bg); color:var(--ink); border:1px solid var(--line);
      padding:10px 16px; border-radius:10px; font-size:13px; box-shadow:0 8px 28px rgba(0,0,0,.35); max-width:min(520px,90vw); opacity:0; transition:opacity .2s; pointer-events:none; }
    .toast.show { opacity:1; pointer-events:auto; }
    .pins { position:fixed; inset:0; pointer-events:none; }
    .pin { position:fixed; pointer-events:auto; width:22px; height:22px; padding:0; border-radius:50%; border:2px solid #fff; background:#fde047; color:#1a1a2e;
      display:grid; place-items:center; cursor:pointer; box-shadow:0 2px 8px rgba(0,0,0,.35); }
    .pin:hover { transform:scale(1.12); }
    .toast .t-act { margin-left:12px; padding:4px 10px; border-radius:8px; border:0; background:#4a4aff; color:#fff; font:600 12.5px inherit; cursor:pointer; }
    .dock { position:fixed; right:18px; bottom:18px; display:flex; align-items:center; gap:8px; }
    .hl-intro { position:fixed; right:18px; bottom:18px; display:flex; align-items:center; gap:2px; padding:4px; border-radius:22px;
      background:var(--bg); border:1px solid var(--line); box-shadow:0 8px 24px rgba(0,0,0,.28); font-family:BnPoppins,'Segoe UI',system-ui,sans-serif;
      animation:hiIn .3s ease-out; }
    .hl-intro .hi-go { display:flex; align-items:center; gap:8px; height:34px; padding:0 12px 0 4px; border:0; border-radius:18px; background:transparent;
      color:var(--ink); font:600 13px BnPoppins,'Segoe UI',system-ui,sans-serif; cursor:pointer; }
    .hl-intro .hi-go:hover { background:rgba(253,224,71,.22); }
    .hl-intro .hi-go img { width:26px; height:26px; border-radius:8px; }
    .hl-intro .hi-go i { width:9px; height:9px; border-radius:50%; background:#eab308; box-shadow:0 0 0 3px rgba(234,179,8,.25); flex:none; }
    .hl-intro .hi-x { width:26px; height:26px; display:grid; place-items:center; border:0; border-radius:13px; background:transparent; color:var(--soft, #888); cursor:pointer; opacity:.6; }
    .hl-intro .hi-x:hover { opacity:1; background:rgba(127,127,127,.15); }
    @keyframes hiIn { from { opacity:0; transform:translateY(8px); } }
    .ink-fab { width:40px; height:40px; border-radius:20px; display:grid; place-items:center; border:0; color:#fff;
      background:linear-gradient(135deg,#4a4aff,#8b3dff); box-shadow:0 8px 22px -6px rgba(74,74,255,.75); }
    .ink-fab:hover { filter:brightness(1.08); }
    .badge { display:flex; align-items:center; gap:6px; height:36px; padding:0 12px 0 10px; border-radius:18px;
      background:var(--bg); color:var(--ink); border:1px solid var(--line); box-shadow:0 6px 20px rgba(0,0,0,.3); font-size:13px; font-weight:600; }
    .badge:hover { border-color:#6b6bff; }
    .panel { position:fixed; top:0; right:0; width:min(380px,100vw); height:100vh; background:var(--panel); color:var(--pinkInk);
      border-left:1px solid var(--pinkLine); box-shadow:-8px 0 32px rgba(0,0,0,.18); display:flex; flex-direction:column; font-size:13.5px; }
    .p-hdr { display:flex; align-items:center; gap:8px; padding:14px 14px 10px; border-bottom:1px solid var(--pinkLine); }
    .p-hdr h2 { flex:1; margin:0; font-size:15px; }
    .p-hdr .ib, .p-body .ib { color:var(--pinkSoft); }
    .p-hdr .ib:hover, .p-body .ib:hover { background:var(--pink); color:var(--pinkInk); }
    .p-body { flex:1; overflow:auto; padding:12px 14px; }
    .p-title { font-weight:700; font-size:15px; margin:0 0 4px; }
    .p-site { color:var(--pinkSoft); font-size:12px; margin-bottom:12px; word-break:break-all; }
    .lbl { font-size:11.5px; font-weight:700; color:var(--pinkSoft); text-transform:uppercase; letter-spacing:.04em; margin:12px 0 6px; }
    .pick { width:100%; text-align:left; border:1px solid var(--pinkLine); background:var(--pink); color:var(--pinkInk); border-radius:9px; padding:8px 10px; }
    .pick:hover { border-color:#8f94ff; }
    .tags { display:flex; flex-wrap:wrap; gap:6px; align-items:center; }
    .tag { display:inline-flex; align-items:center; gap:4px; background:var(--pink); border:1px solid var(--pinkLine); border-radius:12px; padding:2px 6px 2px 9px; font-size:12px; }
    .tag button { border:0; background:transparent; color:var(--pinkSoft); padding:0 2px; }
    .t-in { position:relative; flex:1; min-width:110px; display:flex; }
    .t-sug { position:absolute; left:0; right:0; top:calc(100% + 4px); z-index:2; padding:4px; border-radius:10px; background:var(--panel); border:1px solid var(--pinkLine); box-shadow:0 10px 24px rgba(0,0,0,.18); }
    .t-sug button { display:block; width:100%; text-align:left; border:0; border-radius:7px; padding:6px 9px; background:transparent; color:var(--pinkInk); font-size:12.5px; }
    .t-sug button:hover, .t-sug button.on { background:var(--pink); }
    .tags input { flex:1; min-width:110px; border:1px solid var(--pinkLine); background:var(--panel); color:var(--pinkInk); border-radius:8px; padding:5px 8px; font-size:12.5px; outline:none; }
    .card { position:relative; border:1px solid var(--pinkLine); border-radius:10px; padding:9px 10px 9px 14px; margin-bottom:8px; background:var(--panel); cursor:pointer; }
    .card:hover { border-color:#8f94ff; }
    .card::before { content:''; position:absolute; left:5px; top:9px; bottom:9px; width:3px; border-radius:2px; background:var(--c); }
    .card .nmv { display:block; font-size:12.5px; margin-bottom:3px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
    .card .tx { display:-webkit-box; -webkit-line-clamp:5; -webkit-box-orient:vertical; overflow:hidden; line-height:1.45; }
    .card .nt { margin-top:6px; color:var(--pinkSoft); font-size:12.5px; white-space:pre-wrap; }
    .card .miss { margin-top:4px; color:#e07b00; font-size:11.5px; }
    .empty { color:var(--pinkSoft); padding:14px 2px; }
    .p-foot { border-top:1px solid var(--pinkLine); padding:10px 14px 14px; display:flex; flex-wrap:wrap; gap:6px; }
    .btn { display:inline-flex; align-items:center; gap:6px; height:32px; padding:0 11px; border-radius:9px; border:1px solid var(--pinkLine);
      background:var(--pink); color:var(--pinkInk); font-size:12.5px; font-weight:600; }
    .btn:hover { border-color:#8f94ff; }
    .btn.primary { background:linear-gradient(180deg,#5c5cff,#4a4aff); border-color:#4038e6; color:#fff; }
    .btn:disabled { opacity:.45; cursor:default; }
    .tp { position:fixed; width:340px; max-height:60vh; display:flex; flex-direction:column; background:var(--panel); color:var(--pinkInk);
      border:1px solid var(--pinkLine); border-radius:12px; box-shadow:0 12px 36px rgba(0,0,0,.3); overflow:hidden; font-size:13px; }
    .tp input { margin:10px; border:1px solid var(--pinkLine); background:var(--pink); color:var(--pinkInk); border-radius:8px; padding:8px 10px; outline:none; font-size:13px; }
    .tp .list { overflow:auto; padding:0 6px 8px; }
    .tp .it { display:block; width:100%; text-align:left; border:0; background:transparent; color:var(--pinkInk); padding:7px 8px; border-radius:8px; }
    .tp .it small { display:block; color:var(--pinkSoft); font-size:11.5px; }
    .tp .it:hover, .tp .it.on { background:var(--pink); }
    .quick { position:fixed; left:18px; bottom:18px; display:flex; align-items:center; gap:10px; height:40px; padding:0 6px 0 14px;
      border-radius:20px; background:linear-gradient(180deg,#5c5cff,#4a4aff); color:#fff; box-shadow:0 10px 28px rgba(74,74,255,.45); font-size:13px; font-weight:600; }
    .quick .q-dot { width:9px; height:9px; border-radius:50%; background:#fde047; box-shadow:0 0 0 3px rgba(253,224,71,.35); animation:qpulse 1.6s ease-in-out infinite; }
    .quick kbd { font:600 11px ui-monospace,Menlo,monospace; opacity:.75; }
    .quick button { height:30px; padding:0 12px; border-radius:15px; border:0; background:rgba(255,255,255,.18); color:#fff; font-weight:700; font-size:12.5px; }
    .quick button:hover { background:rgba(255,255,255,.3); }
    @keyframes qpulse { 50% { opacity:.4; } }
    .bar.wrap { max-width:min(390px, calc(100vw - 12px)); }
    .bar-topic { display:flex; align-items:center; gap:6px; width:100%; margin:6px 0 0; padding:5px 9px; border:1px dashed var(--line); border-radius:8px; background:transparent; color:var(--soft); font:inherit; font-size:12px; text-align:left; cursor:pointer; }
    .bar-topic span { flex:1; min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
    .bar-topic.on { border-style:solid; color:var(--ink); }
    .bar-topic:hover { border-color:var(--brand); color:var(--ink); }
    .bar.wrap .r1 { gap:3px; }
    /* Caderno de erros: the crop, and the card that files it */
    .crop-fab { width:40px; height:40px; border-radius:20px; display:grid; place-items:center; border:1px solid var(--line); color:var(--ink); background:var(--bg); box-shadow:0 6px 20px rgba(0,0,0,.3); }
    .crop-fab:hover { border-color:#6b6bff; }
    .tour { position:fixed; inset:0; z-index:3; pointer-events:none; }
    .tour .t-ring { position:fixed; border-radius:24px; box-shadow:0 0 0 3px #8b3dff, 0 0 0 9999px rgba(10,10,30,.45); transition:all .3s cubic-bezier(.2,.8,.2,1); }
    .tour .t-card { position:fixed; width:300px; padding:14px 16px; border-radius:16px; background:#16163a; color:#fff; pointer-events:auto; font-size:13px;
      box-shadow:0 24px 60px -20px rgba(0,0,0,.7); transition:left .3s, top .3s; }
    .tour .t-top { display:flex; justify-content:space-between; align-items:center; font-size:11px; font-weight:800; color:#a5a5ff; letter-spacing:.06em; }
    .tour .t-top button { border:0; background:none; color:rgba(255,255,255,.6); font:inherit; cursor:pointer; }
    .tour b { display:block; margin:6px 0 4px; font-size:15px; }
    .tour p { margin:0; line-height:1.5; color:rgba(255,255,255,.78); }
    .tour .t-acts { display:flex; justify-content:flex-end; gap:8px; margin-top:12px; }
    .tour .t-acts button { border:1px solid rgba(255,255,255,.25); background:none; color:#fff; padding:7px 14px; border-radius:99px; font:700 12.5px inherit; cursor:pointer; }
    .tour .t-acts .go { border:0; background:linear-gradient(135deg,#4a4aff,#8b3dff); }
    .sel { position:fixed; inset:0; cursor:crosshair; touch-action:none; background:rgba(10,10,30,.18); }
    .sel .r { position:fixed; border:2px solid #6b6bff; background:rgba(107,107,255,.12); box-shadow:0 0 0 9999px rgba(10,10,30,.32); border-radius:4px; }
    .sel .hint { position:fixed; left:50%; top:18px; transform:translateX(-50%); background:var(--bg); color:var(--ink); border:1px solid var(--line); padding:8px 14px; border-radius:10px; font-size:13px; font-weight:600; box-shadow:0 8px 28px rgba(0,0,0,.35); pointer-events:none; }
    .err { position:fixed; right:18px; bottom:18px; width:min(370px, calc(100vw - 24px)); max-height:min(620px, calc(100vh - 36px)); display:flex; flex-direction:column;
      background:var(--panel); color:var(--pinkInk); border:1px solid var(--pinkLine); border-radius:16px; box-shadow:0 18px 48px rgba(0,0,0,.32); font-size:13px; overflow:hidden; font-family:BnPoppins,'Segoe UI',system-ui,sans-serif; }
    .err * { font-family:inherit; }
    .err-hd { display:flex; align-items:center; gap:10px; padding:12px 12px 10px 14px; border-bottom:1px solid var(--pinkLine); }
    .err-hd b { flex:1; font-size:14px; display:flex; align-items:center; gap:7px; }
    .err-hd b i { width:8px; height:8px; border-radius:50%; background:linear-gradient(135deg,#4a4aff,#8b3dff); }
    .err-hd .ib { color:var(--pinkSoft); } .err-hd .ib:hover { background:var(--pink); color:var(--pinkInk); }
    .err-shot { margin:10px 14px 0; border-radius:10px; border:1px solid var(--pinkLine); background:var(--pink) center/contain no-repeat; height:110px; flex:none; }
    .err-txt { margin:10px 14px 0; border-radius:10px; border:1px solid var(--pinkLine); background:var(--pink); max-height:130px; overflow:auto; flex:none; padding:8px 10px; font-size:13px; line-height:1.45; color:var(--pinkInk); white-space:normal; overflow-wrap:anywhere; }
    .err-txt p, .err-txt div { margin:0; }
    .err-lbl { font-size:11px; font-weight:700; color:var(--pinkSoft); text-transform:uppercase; letter-spacing:.05em; margin:12px 14px 6px; }
    .err-list { overflow:auto; padding:0 8px; flex:1 1 auto; min-height:60px; }
    .err-row { display:flex; align-items:center; gap:2px; padding-left:calc(var(--d, 0) * 16px); }
    .err-tg { flex:none; width:22px; height:28px; border:0; background:transparent; color:var(--pinkSoft); display:grid; place-items:center; padding:0; border-radius:6px; }
    .err-tg:hover { background:var(--pink); } .err-tg.none { pointer-events:none; }
    .err-f.out span { opacity:.55; }
    .err-new { padding-left:calc(var(--d, 0) * 16px + 22px); }
    .err-f { flex:1; display:flex; align-items:center; gap:8px; text-align:left; border:1px solid transparent; background:transparent; color:var(--pinkInk); padding:7px 8px; border-radius:9px; min-width:0; }
    .err-f span { overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
    .err-f svg { flex:none; color:#6b6bff; }
    .err-f.sub { margin-left:22px; } .err-f.sub svg { color:var(--pinkSoft); }
    .err-f:hover { background:var(--pink); }
    .err-f.on { background:rgba(74,74,255,.1); border-color:#8f94ff; font-weight:600; }
    .err-add { flex:none; width:28px; height:28px; border:0; border-radius:8px; background:transparent; color:var(--pinkSoft); display:grid; place-items:center; opacity:0; }
    .err-row:hover .err-add, .err-add:focus { opacity:1; }
    .err-touch .err-add { opacity:.7; }
    .err-add:hover { background:var(--pink); color:var(--pinkInk); }
    .err-new { display:flex; gap:6px; margin:6px 8px 2px; }
    .err-new input, .err textarea { flex:1; min-width:0; border:1px solid var(--pinkLine); background:var(--pink); color:var(--pinkInk); border-radius:9px; padding:8px 10px; font-size:13px; outline:none; }
    .err-new input:focus, .err textarea:focus { border-color:#8f94ff; }
    .err-newbtn { display:flex; align-items:center; gap:6px; margin:4px 8px 0; border:1px dashed var(--pinkLine); background:transparent; color:var(--pinkSoft); border-radius:9px; padding:7px 10px; font-size:12.5px; font-weight:600; width:calc(100% - 16px); }
    .err-newbtn:hover { border-color:#8f94ff; color:var(--pinkInk); }
    .err-empty { color:var(--pinkSoft); font-size:12.5px; padding:4px 8px 2px; line-height:1.45; }
    .err textarea { margin:8px 14px 0; min-height:52px; resize:vertical; flex:none; }
    .err-local { margin:8px 14px 0; font-size:12px; color:var(--pinkSoft); line-height:1.4; }
    .err-local button { border:0; background:none; color:#4a4aff; font-weight:700; padding:0; text-decoration:underline; }
    .err-ft { display:flex; gap:6px; padding:12px 14px 14px; flex:none; }
    /* The flashcard window: the Notes' own dialog (notes.css .bn-modal, .bn-dlg, .fc-ed, .rt) */
    .fcm { --brand:#4a4aff; --brand-soft:#eeeeff; --brand-ink:#3030d8; --surface:#fff; --surface2:#fafafb; --line:#ececf0; --line2:#e2e2e8;
      --ink:#0f0f14; --soft:#3f3f4a; --mute:#71717f; --faint:#a1a1ad; --hover:#f3f3f6; --hoverLine:#d6d6de; --danger:#e5484d;
      --shadow-1:0 1px 2px rgba(16,16,24,.05),0 0 0 1px rgba(16,16,24,.05); --shadow-2:0 1px 2px rgba(16,16,24,.04),0 10px 28px -10px rgba(16,16,24,.16);
      --shadow:0 0 0 1px rgba(16,16,24,.06),0 16px 40px -12px rgba(16,16,24,.25);
      position:fixed; inset:0; display:flex; align-items:center; justify-content:center; padding:16px; background:rgba(10,10,16,.4);
      -webkit-backdrop-filter:blur(3px); backdrop-filter:blur(3px); opacity:0; transition:opacity .15s; color-scheme:light;
      font:400 14px/1.4 BnOnest,'Onest','Segoe UI',system-ui,-apple-system,Roboto,Arial,sans-serif; color:var(--ink); }
    :host(.dark) .fcm { --brand:#6e6eff; --brand-soft:#1d1d3a; --brand-ink:#c4c5ff; --surface:#121217; --surface2:#18181e; --line:#222229; --line2:#2c2c35;
      --ink:#f4f4f6; --soft:#c9c9d1; --mute:#8b8b97; --faint:#5c5c68; --hover:#1c1c23; --hoverLine:#383842; --danger:#f87171;
      --shadow-1:0 0 0 1px rgba(255,255,255,.06); --shadow-2:0 0 0 1px rgba(255,255,255,.07),0 12px 32px -12px rgba(0,0,0,.7);
      --shadow:0 0 0 1px rgba(255,255,255,.08),0 18px 44px -12px rgba(0,0,0,.8); color-scheme:dark; }
    .fcm * { box-sizing:border-box; font-family:inherit; }
    .fcm.show { opacity:1; }
    .fcm-dlg { width:100%; max-width:620px; max-height:calc(100vh - 32px); overflow:auto; background:var(--surface); border-radius:16px; box-shadow:var(--shadow);
      transform:translateY(8px) scale(.985); transition:transform .18s cubic-bezier(.2,.8,.2,1); }
    .fcm.show .fcm-dlg { transform:none; }
    .fcm-hdr { display:flex; align-items:center; justify-content:space-between; padding:16px 16px 4px 22px; }
    .fcm-hdr h2 { margin:0; font-size:16px; font-weight:600; letter-spacing:-.01em; color:var(--ink); }
    .fcm-x { width:34px; height:34px; display:grid; place-items:center; border:0; border-radius:9px; background:transparent; color:var(--mute); cursor:pointer; }
    .fcm-x:hover { background:var(--hover); color:var(--ink); }
    .fcm-body { padding:8px 22px 6px; line-height:1.5; }
    .fc-ed { display:flex; flex-direction:column; gap:12px; color:var(--ink); }
    .fc-ed .fld { display:block; margin:0; }
    .fc-ed .fld > span { display:block; font-size:11.5px; font-weight:600; color:var(--mute); margin-bottom:6px; }
    .fc-ed textarea { width:100%; height:auto; padding:10px 12px; resize:vertical; line-height:1.5; font-size:14px; border:1px solid var(--line2); border-radius:9px;
      background:var(--surface); color:var(--ink); outline:none; }
    .fc-ed textarea:focus { border-color:var(--brand); box-shadow:0 0 0 3px var(--brand-soft); }
    .fc-ed textarea::placeholder { color:var(--faint); }
    .fc-tpwrap { position:relative; }
    .fc-topic { display:flex; align-items:center; gap:8px; width:100%; height:38px; padding:0 12px; border:1px solid var(--line2); border-radius:9px; background:var(--surface2);
      color:var(--ink); font-size:13px; text-align:left; cursor:pointer; }
    .fc-topic span { flex:1; min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
    .fc-topic svg { color:var(--mute); flex-shrink:0; }
    .fc-topic.none span { color:var(--brand); font-weight:550; }
    .fc-topic:disabled { cursor:default; }
    .fc-tplist { position:absolute; left:0; right:0; top:42px; z-index:3; max-height:300px; display:flex; flex-direction:column; background:var(--surface);
      border-radius:12px; box-shadow:var(--shadow); overflow:hidden; }
    .fc-tplist input { margin:8px; height:34px; padding:0 10px; border:1px solid var(--line2); border-radius:8px; background:var(--surface2); color:var(--ink); font-size:13px; outline:none; }
    .fc-tplist input:focus { border-color:var(--brand); }
    .fc-tplist .list { overflow:auto; padding:0 6px 8px; }
    .fc-tplist .it { display:block; width:100%; text-align:left; border:0; background:transparent; color:var(--ink); padding:7px 8px; border-radius:8px; font-size:13px; cursor:pointer; }
    .fc-tplist .it small { display:block; color:var(--mute); font-size:11.5px; }
    .fc-tplist .it:hover, .fc-tplist .it.on { background:var(--hover); }
    .fc-tplist .it.on { color:var(--brand-ink); font-weight:600; }
    .tp-seg { display:flex; align-self:flex-start; padding:2px; border-radius:9px; background:var(--surface2); box-shadow:var(--shadow-1); }
    .tp-seg button { height:28px; padding:0 14px; display:inline-flex; align-items:center; justify-content:center; border:0; border-radius:7px; background:transparent;
      color:var(--mute); font-size:12px; font-weight:520; cursor:pointer; white-space:nowrap; }
    .tp-seg button.on { background:var(--surface); color:var(--ink); box-shadow:var(--shadow-2); }
    .fcm .hint { margin:0; font-size:12.5px; color:var(--mute); }
    .fcm [hidden] { display:none !important; }
    .bn-check { display:flex; align-items:center; gap:8px; color:var(--ink); cursor:pointer; font-size:14px; }
    .bn-check input { width:16px; height:16px; margin:0; accent-color:var(--brand); }
    .fcm-err { margin:0; color:var(--danger); font-size:13px; }
    .fcm-actions { display:flex; justify-content:flex-end; gap:8px; padding:12px 22px 20px; }
    .fcm .bn-btn { display:inline-flex; align-items:center; gap:7px; height:34px; padding:0 13px; border-radius:9px; border:1px solid var(--line2); background:var(--surface);
      color:var(--ink); font-size:13px; font-weight:520; cursor:pointer; white-space:nowrap; }
    .fcm .bn-btn:hover { background:var(--hover); border-color:var(--hoverLine); }
    .fcm .bn-btn.primary { background:var(--ink); border-color:var(--ink); color:var(--surface); }
    .fcm .bn-btn.primary:hover { opacity:.86; }
    .fcm .bn-btn:disabled { opacity:.45; cursor:default; }
    .fc-pic { border:1px solid var(--line2); border-radius:10px; background:var(--surface2); padding:8px; display:flex; justify-content:center; max-height:220px; overflow:hidden; }
    .fc-pic img { max-width:100%; max-height:200px; object-fit:contain; border-radius:6px; }
    .cap .cap-img { border:1px solid var(--line2); border-radius:12px; background:var(--surface2); padding:10px; display:flex; justify-content:center; }
    .cap .cap-img img { max-width:100%; max-height:150px; object-fit:contain; border-radius:6px; box-shadow:0 2px 10px rgba(0,0,0,.12); }
    .cap .cap-copied { display:flex; align-items:center; gap:6px; margin:10px 0 0; font-size:12.5px; color:var(--mute); }
    .cap .cap-copied svg { color:var(--ok, #16a34a); }
    .cap .cap-opts { display:grid; gap:8px; margin-top:12px; }
    .cap .cap-opt { display:flex; align-items:center; gap:12px; padding:12px; border-radius:12px; border:1px solid var(--line2); background:var(--surface); color:var(--ink); text-align:left; cursor:pointer; }
    .cap .cap-opt:hover { border-color:var(--brand); background:var(--brand-soft); }
    .cap .cap-opt svg { color:var(--brand); flex:none; }
    .cap .cap-opt span { display:flex; flex-direction:column; gap:2px; }
    .cap .cap-opt b { font-size:14px; font-weight:600; }
    .cap .cap-opt small { font-size:12px; color:var(--mute); }
    .cap .cap-th { display:flex; align-items:center; gap:10px; margin:12px 0 8px; }
    .cap.send .cap-opts { margin-top:14px; }
    .cap .cap-th b { font-size:14px; }
    .cap .fc-tplist.inline { position:static; max-height:300px; box-shadow:none; border:1px solid var(--line2); }
    .cap .fc-tplist .it:disabled { opacity:.5; }
    .rt { position:relative; border:1px solid var(--line2); border-radius:10px; background:var(--surface); }
    .rt:focus-within { border-color:var(--brand); box-shadow:0 0 0 3px var(--brand-soft); }
    .rt-tb { display:flex; align-items:center; gap:2px; flex-wrap:wrap; padding:4px 6px; border-bottom:1px solid var(--line); }
    .rt-tb button { position:relative; min-width:30px; height:28px; display:grid; place-items:center; padding:0 6px; border:0; border-radius:7px; background:transparent;
      color:var(--soft); font-size:14px; font-weight:600; cursor:pointer; }
    .rt-tb button:hover { background:var(--hover); color:var(--ink); }
    .rt-tb button > i { position:absolute; left:7px; right:7px; bottom:3px; height:3px; border-radius:2px; }
    .rt-tb .rt-ink span { font-weight:700; margin-top:-3px; }
    .rt-sep { width:1px; height:18px; margin:0 4px; background:var(--line2); }
    .rt-pop { position:absolute; top:36px; z-index:5; display:flex; gap:4px; padding:6px; border-radius:10px; background:var(--surface); box-shadow:var(--shadow-2); }
    .rt-pop button { width:22px; height:22px; padding:0; border:2px solid var(--surface); border-radius:50%; background:var(--c); box-shadow:0 0 0 1px var(--line2); cursor:pointer; }
    .rt-pop .rt-none { display:grid; place-items:center; background:var(--surface2); color:var(--mute); }
    .rt-ed { min-height:72px; max-height:300px; overflow:auto; padding:10px 12px; color:var(--ink); font-size:14.5px; line-height:1.55; outline:none; overflow-wrap:anywhere; }
    .rt.blank .rt-ed::before { content:attr(data-ph); color:var(--faint); pointer-events:none; position:absolute; }
    .rt-ed p { margin:0 0 6px; }
    @media (max-width: 600px) { .fcm { padding:8px; } .fcm-body { padding:8px 16px 6px; } .fcm-hdr { padding:14px 12px 4px 16px; } .fcm-actions { padding:12px 16px 16px; } }
    .card-chip { position:fixed; width:34px; height:34px; border-radius:10px; border:0; display:grid; place-items:center; color:#fff; cursor:pointer;
      background:linear-gradient(180deg,#5c5cff,#4a4aff); box-shadow:0 8px 22px rgba(74,74,255,.45); animation:cardIn .14s ease-out; }
    .card-chip:hover { filter:brightness(1.1); }
    @keyframes cardIn { from { opacity:0; transform:scale(.8); } }
    .err-ft .sp { flex:1; }
    /* A phone: a sheet from the bottom, the whole width, over the Draw's bars */
    .err-grab { display:none; }
    @media (max-width: 600px) {
      .err { left:0; right:0; bottom:0; width:auto; max-height:min(78vh, calc(100vh - 56px)); border-radius:20px 20px 0 0; border-bottom:0;
        padding-bottom:env(safe-area-inset-bottom, 0); box-shadow:0 -12px 40px rgba(0,0,0,.35); animation:errUp .22s ease-out; }
      .err-grab { display:block; width:40px; height:4px; border-radius:2px; background:var(--pinkLine); margin:8px auto 0; flex:none; }
      .err-hd { padding:8px 12px 8px 16px; }
      .err-shot { height:88px; margin:10px 16px 0; }
      .err-lbl { margin:12px 16px 6px; }
      .err-list { padding:0 10px; }
      .err-f { padding:9px 8px; font-size:14px; }
      .err textarea { margin:8px 16px 0; min-height:44px; font-size:14px; }
      .err-local { margin:8px 16px 0; }
      .err-ft { padding:10px 16px 14px; }
      .err-ft .btn { height:40px; padding:0 16px; font-size:14px; }
    }
    @keyframes errUp { from { transform:translateY(40px); opacity:0; } }
    /* On a phone the colours and all five buttons share one line (the panel's
       button used to drop to a line of its own); the format row below. */
    .bar.wrap .r1 > .dot { width:20px; height:20px; }
    .bar.wrap .r1 > .ib { width:28px; height:28px; }
    .bar.wrap .r1 > .sep { margin:0 2px; }
    .nudge { flex:1 1 100%; display:flex; align-items:center; gap:8px; margin-top:4px; padding:8px 4px 2px; border-top:1px solid var(--line); font-size:12.5px; color:var(--soft); }
    .nudge span { flex:1; line-height:1.35; }
    .nudge .go { height:28px; padding:0 12px; border-radius:8px; border:0; background:linear-gradient(180deg,#5c5cff,#4a4aff); color:#fff; font-weight:700; font-size:12px; white-space:nowrap; }
    .nudge .later { border:0; background:transparent; color:var(--soft); font-size:12px; padding:0 4px; white-space:nowrap; }
    .nudge .later:hover { color:#fff; }
    .ink-cv { position:fixed; inset:0; width:100vw; height:100vh; pointer-events:none; display:none; }
    .ink-cv.on { pointer-events:auto; cursor:crosshair; touch-action:none; }
    .ink-bar { position:fixed; left:50%; bottom:22px; transform:translateX(-50%); display:flex; align-items:center; gap:4px; padding:6px 8px; border-radius:14px;
      background:var(--bg); color:var(--ink); border:1px solid var(--line); box-shadow:0 10px 32px rgba(0,0,0,.4); user-select:none;
      max-width:calc(100vw - 16px); overflow-x:auto; overflow-y:hidden; scrollbar-width:none; overscroll-behavior-x:contain; }
    /* A narrow window: the bar scrolls sideways (wheel or drag) — its buttons keep their size. */
    .ink-bar::-webkit-scrollbar { display:none; }
    .ink-bar > * { flex-shrink:0; }
    .ink-bar .ink-t { display:inline-flex; align-items:center; gap:6px; padding:0 8px 0 4px; font-size:12.5px; font-weight:700; color:#fde047; white-space:nowrap; }
    .ink-bar .ib.on { position:relative; }
    .ink-bar .ib.on::after { content:''; position:absolute; right:3px; bottom:3px; width:5px; height:5px; border-radius:3px; background:currentColor; opacity:.6; }
    .ink-pop { position:fixed; left:50%; bottom:76px; transform:translateX(-50%); width:min(320px, calc(100vw - 24px)); padding:12px 14px 14px; border-radius:18px;
      background:var(--bg); color:var(--ink); border:1px solid var(--line); box-shadow:0 18px 50px rgba(0,0,0,.45); user-select:none; }
    .ink-pop .ip-h { display:flex; align-items:center; gap:8px; margin-bottom:6px; }
    .ink-pop .ip-h b { flex:1; font-size:14px; }
    .ink-pop .ip-l { font-size:11px; font-weight:800; letter-spacing:.06em; text-transform:uppercase; color:var(--soft); margin:10px 0 7px; }
    .ink-pop .ip-v { float:right; font-weight:700; letter-spacing:0; }
    .ink-pop .ip-colors { display:grid; grid-template-columns:repeat(6, 1fr); gap:8px; }
    .ink-pop .sw { width:100%; aspect-ratio:1; border-radius:50%; border:2px solid rgba(255,255,255,.18); padding:0; }
    .ink-pop .sw.on { box-shadow:0 0 0 2px var(--bg), 0 0 0 4px #8f94ff; }
    .ink-pop .ip-size { display:flex; align-items:center; gap:12px; height:44px; }
    .ink-pop .ip-size input { flex:1; accent-color:#6b6bff; }
    .ink-pop .ip-prev { flex:0 0 auto; border-radius:50%; max-width:44px; max-height:44px; }
    .ink-pop .ip-seg { display:flex; gap:6px; margin-top:12px; padding:4px; border-radius:12px; background:var(--bg2); }
    .ink-pop .ip-seg.col { flex-direction:column; }
    .ink-pop .ip-seg button { flex:1; border:0; border-radius:9px; padding:9px 10px; background:transparent; color:var(--soft); font-weight:700; font-size:12.5px; text-align:center; }
    .ink-pop .ip-seg button.on { background:linear-gradient(90deg,#4a4aff,#8b3dff); color:#fff; }
    .ink-bar .done { height:30px; padding:0 14px; border-radius:9px; border:0; background:linear-gradient(180deg,#5c5cff,#4a4aff); color:#fff; font-weight:700; font-size:12.5px; margin-left:4px; }
    /* The bar dressed as the Draw's (content.js #__pd_tb__): white, square
       buttons with a border, the tool in hand in the indigo gradient, square
       colours — and its brand, so the drawings are known to be the Highlights'. */
    .ink-bar { background:#fff; color:#3a3a44; border:1px solid #e0e0e0; border-radius:16px; padding:6px 8px; gap:3px;
      box-shadow:0 10px 32px rgba(0,0,0,.18); font-family:'Segoe UI',Arial,sans-serif; }
    .ink-bar .ink-brand { display:flex; align-items:center; gap:8px; padding:0 8px 0 4px; white-space:nowrap; }
    .ink-bar .ink-brand img { width:22px; height:22px; border-radius:5px; display:block; }
    .ink-bar .ink-brand span { display:flex; flex-direction:column; line-height:1.15; }
    .ink-bar .ink-brand b { font-size:13.5px; font-weight:800; letter-spacing:.2px; background:linear-gradient(90deg,#4a4aff 0%,#8b3dff 100%);
      -webkit-background-clip:text; background-clip:text; -webkit-text-fill-color:transparent; color:#4a4aff; }
    .ink-bar .ink-brand small { font-size:9px; font-weight:700; color:#f59e0b; text-transform:uppercase; letter-spacing:.4px; }
    .ink-bar .sep { width:1px; height:26px; background:#e0e0e0; margin:0 5px; flex-shrink:0; }
    .ink-bar .ib { width:auto; height:34px; min-width:34px; padding:0 7px; border-radius:10px; background:#fbfbfd; border:1px solid #e7e7ef; color:#3a3a44;
      transition:background .15s, border-color .15s, box-shadow .15s, transform .08s, color .15s; }
    .ink-bar .ib:hover { background:#f2f3ff; border-color:#b9beff; color:#2b2be0; box-shadow:0 3px 8px rgba(74,74,255,.14); transform:translateY(-1px); }
    .ink-bar .ib.on { background:linear-gradient(180deg,#5c5cff 0%,#4a4aff 100%); border-color:#4038e6; color:#fff; box-shadow:0 3px 11px rgba(74,74,255,.38), inset 0 1px 0 rgba(255,255,255,.28); }
    .ink-bar .ib.on::after { background:#fff; }
    .ink-bar .dot { width:22px; height:22px; min-width:22px; border-radius:6px; padding:0; border:1.5px solid rgba(0,0,0,.18); box-shadow:none; }
    .ink-bar .dot:hover { transform:translateY(-1px) scale(1.1); box-shadow:0 2px 7px rgba(0,0,0,.25); }
    .ink-bar .dot.on { border-color:#4a4aff; box-shadow:0 0 0 2px #fff, 0 0 0 3.5px #4a4aff; }
    .ink-bar .done { height:34px; border-radius:10px; border:1px solid #4038e6; box-shadow:0 3px 11px rgba(74,74,255,.38); }
    .ink-bar .pick { position:relative; width:22px; height:22px; border-radius:6px; border:1.5px dashed #b4b4c8; display:grid; place-items:center;
      color:#6b6b80; font-weight:700; font-size:14px; cursor:pointer; flex-shrink:0; }
    .ink-bar .pick:hover { border-color:#4a4aff; color:#4a4aff; }
    .ink-bar .pick input { position:absolute; inset:0; opacity:0; width:100%; height:100%; cursor:pointer; padding:0; border:0; }
    .ink-bar .ib:disabled { opacity:.38; cursor:default; transform:none; box-shadow:none; }
    :host(.dark) .ink-bar { background:#1c1c28; color:#d6d6e4; border-color:#33334a; box-shadow:0 10px 32px rgba(0,0,0,.5); }
    :host(.dark) .ink-bar .sep { background:#33334a; }
    :host(.dark) .ink-bar .ink-brand b { background:linear-gradient(90deg,#8f8fff 0%,#b98aff 100%); -webkit-background-clip:text; background-clip:text; color:#8f8fff; }
    :host(.dark) .ink-bar .ib { background:#262636; border-color:#36364c; color:#d6d6e4; }
    :host(.dark) .ink-bar .ib:hover { background:#2e2e52; border-color:#5c5cff; color:#c9c9ff; box-shadow:0 3px 8px rgba(0,0,0,.35); }
    :host(.dark) .ink-bar .ib.on { background:linear-gradient(180deg,#5c5cff 0%,#4a4aff 100%); color:#fff; border-color:#4038e6; }
    :host(.dark) .ink-bar .dot { border-color:rgba(255,255,255,.22); }
    :host(.dark) .ink-bar .dot.on { border-color:#8f8fff; box-shadow:0 0 0 2px #1c1c28, 0 0 0 3.5px #8f8fff; }
    .inks { display:flex; align-items:center; gap:6px; flex-wrap:wrap; }
    .inks .n { flex:1; font-size:13px; }
    /* ─── The side panel, dressed as GooDraw ─── */
    .panel { width:min(460px,100vw); background:var(--pbg); border-left:0; box-shadow:-24px 0 60px -20px rgba(40,10,140,.45); font-family:'BnPoppins','Segoe UI',system-ui,-apple-system,Roboto,sans-serif;
      animation:p-in .38s cubic-bezier(.2,.8,.2,1) both; --pbg:#f4f3ff; --pcard:#ffffff; --pline:#e6e4fb; }
    :host(.dark) .panel { --pbg:#0e0e24; --pcard:#18182f; --pline:#2b2b4c; }
    .panel, .panel * { font-family:'BnPoppins','Segoe UI',system-ui,-apple-system,Roboto,sans-serif; }
    @keyframes p-in { from { transform:translateX(40px); opacity:0; } }
    .p-hero { position:relative; overflow:hidden; isolation:isolate; padding:16px 16px 18px; color:#fff; border-radius:0 0 26px 26px;
      background:linear-gradient(150deg,#4a4aff 0%,#6a3dff 55%,#8b3dff 100%); box-shadow:0 18px 40px -24px rgba(60,20,180,.9); }
    .p-hero::before, .p-hero::after { content:''; position:absolute; z-index:-1; border-radius:50%; filter:blur(26px); pointer-events:none; }
    .p-hero::before { width:70%; height:150%; left:-25%; top:-70%; background:radial-gradient(closest-side,rgba(160,160,255,.8),transparent); animation:p-aur 14s ease-in-out infinite alternate; }
    .p-hero::after { width:60%; height:140%; right:-20%; bottom:-80%; background:radial-gradient(closest-side,rgba(253,224,71,.4),transparent); animation:p-aur 18s ease-in-out infinite alternate-reverse; }
    @keyframes p-aur { to { transform:translate(16%,12%) scale(1.15); } }
    .p-hdr { padding:0; border:0; gap:10px; }
    .p-hdr .logo { width:34px; height:34px; border-radius:11px; display:grid; place-items:center; background:rgba(255,255,255,.2); box-shadow:inset 0 1px 0 rgba(255,255,255,.3); flex-shrink:0; }
    .p-hdr h2 { font-size:15px; font-weight:800; letter-spacing:-.01em; color:#fff; }
    .p-hdr .ib { color:rgba(255,255,255,.85); }
    .p-hdr .ib:hover { background:rgba(255,255,255,.18); color:#fff; }
    .p-hdr [data-a="close"] { width:36px; height:36px; border-radius:50%; background:rgba(255,255,255,.22); border:1px solid rgba(255,255,255,.35); color:#fff; }
    .p-hdr [data-a="close"]:hover { background:rgba(255,255,255,.34); }
    .p-tab { position:fixed; top:50%; right:min(460px,100vw); transform:translate(0,-50%); width:26px; height:64px; border:0; border-radius:12px 0 0 12px;
      background:#4a4aff; color:#fff; display:grid; place-items:center; cursor:pointer; box-shadow:-6px 0 18px -6px rgba(40,10,140,.5); z-index:2; }
    .p-tab:hover { background:#3b3bea; }
    @media (max-width:520px) { .p-tab { display:none; } }
    .card .c-del { position:absolute; top:6px; right:6px; width:26px; height:26px; border-radius:8px; border:0; background:transparent; color:var(--pinkSoft); display:grid; place-items:center; cursor:pointer; opacity:.55; }
    .card:hover .c-del, .card .c-del:focus-visible { opacity:1; }
    .card .c-del:hover { background:rgba(229,72,77,.14); color:#e5484d; }
    .card { padding-right:34px; }
    .lbl .lbl-act { margin-left:auto; display:inline-flex; align-items:center; gap:5px; padding:3px 8px; border-radius:99px; border:1px solid var(--pline); background:transparent; color:var(--pinkSoft); font:600 10.5px inherit; letter-spacing:0; text-transform:none; cursor:pointer; }
    .lbl .lbl-act:hover { color:var(--pinkInk); }
    .p-hero .p-title { margin:16px 0 6px; font-size:19px; font-weight:800; line-height:1.25; letter-spacing:-.015em; color:#fff; display:-webkit-box; -webkit-line-clamp:3; -webkit-box-orient:vertical; overflow:hidden; }
    .p-hero .p-site { display:inline-flex; margin:0; padding:3px 10px; border-radius:99px; background:rgba(255,255,255,.18); color:#fff; font-size:11.5px; font-weight:600; }
    .p-stats { display:flex; gap:8px; margin-top:14px; }
    .p-stats div { flex:1; padding:9px 11px; border-radius:14px; background:rgba(255,255,255,.14); border:1px solid rgba(255,255,255,.22); }
    .p-stats b { display:block; font-size:20px; font-weight:800; line-height:1.1; }
    .p-stats span { font-size:11px; font-weight:600; opacity:.85; }
    .p-body { padding:6px 14px 14px; }
    .lbl { display:flex; align-items:center; gap:8px; margin:18px 2px 9px; font-size:11px; font-weight:800; letter-spacing:.08em; color:var(--pinkSoft); }
    .lbl::before { content:''; width:5px; height:15px; border-radius:3px; background:linear-gradient(180deg,#fde047,#ff8a3d); }
    .p-box { padding:12px; border-radius:18px; background:var(--pcard); border:1px solid var(--pline); box-shadow:0 12px 28px -22px rgba(60,20,180,.6); }
    .tags input { border-radius:12px; border-color:var(--pline); background:var(--pbg); padding:8px 11px; font-size:13px; font-family:inherit; }
    .tag { border-radius:99px; padding:3px 7px 3px 11px; background:linear-gradient(90deg,rgba(74,74,255,.12),rgba(139,61,255,.12)); border-color:transparent; color:#4a3bdb; font-weight:600; }
    :host(.dark) .tag { color:#c4c5ff; }
    .inks { gap:8px; }
    .btn { height:38px; padding:0 14px; border-radius:12px; border-color:var(--pline); background:var(--pcard); font-family:inherit; font-size:12.5px; }
    .btn.primary { background:linear-gradient(90deg,#4a4aff,#8b3dff); border:0; box-shadow:0 10px 22px -12px rgba(74,74,255,.9); }
    .btn.primary:hover { filter:brightness(1.06); }
    .card { border-radius:16px; padding:12px 12px 12px 20px; margin-bottom:9px; background:var(--pcard); border-color:var(--pline); box-shadow:0 10px 24px -20px rgba(60,20,180,.6);
      transition:transform .15s, box-shadow .15s; animation:p-up .4s cubic-bezier(.2,.8,.2,1) both; }
    .card:hover { transform:translateY(-1px); border-color:#b9b6ff; box-shadow:0 16px 30px -18px rgba(60,20,180,.6); }
    .card::before { left:8px; top:12px; bottom:12px; width:5px; border-radius:3px; }
    .card .tx { font-size:13.5px; line-height:1.55; }
    .card .nt { margin-top:8px; padding:7px 10px; border-radius:10px; color:var(--pinkInk); background:rgba(253,224,71,.18); border:1px solid rgba(253,224,71,.45); }
    @keyframes p-up { from { opacity:0; transform:translateY(10px); } }
    .empty { text-align:center; padding:20px 10px; border-radius:16px; border:1.5px dashed var(--pline); }
    .p-foot { border-top:0; padding:10px 14px 16px; gap:8px; background:linear-gradient(180deg,transparent,var(--pbg) 30%); }
    .p-foot .btn { flex:1 1 calc(50% - 4px); justify-content:center; }
    .p-foot .btn[data-a="open"] { flex-basis:100%; background:linear-gradient(90deg,#4a4aff,#8b3dff); color:#fff; border:0; box-shadow:0 10px 22px -12px rgba(74,74,255,.9); }
    .p-foot .btn[data-a="off"] { color:var(--pinkSoft); }
    .p-space { margin:14px 0 0; padding:12px 14px; border-radius:16px; display:flex; flex-direction:column; gap:4px; border:1px solid; }
    .p-space.full { background:rgba(239,68,68,.08); border-color:rgba(239,68,68,.35); }
    .p-space.near { background:rgba(245,158,11,.1); border-color:rgba(245,158,11,.4); }
    .p-space b { font-size:13.5px; font-weight:800; color:var(--pinkInk); }
    .p-space span { font-size:12.5px; line-height:1.45; color:var(--pinkSoft); }
    .p-space .btn { margin-top:8px; align-self:flex-start; }
    @media (prefers-reduced-motion: reduce) { .toast { transition:none; } .quick .q-dot { animation:none; } .panel, .card, .p-hero::before, .p-hero::after { animation:none; } }
  </style>`;
  const svg = (p, s = 16) => `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${p}</svg>`;
  const IC = {
    big: '<path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/>',
    home: '<path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V20a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1V9.5"/>',
    check: '<path d="M20 6 9 17l-5-5"/>',
    download: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="m7 10 5 5 5-5"/><path d="M12 15V3"/>',
    target: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/>',
    marker: '<path d="m9 11-6 6v3h9l3-3"/><path d="m22 12-4.6 4.6a2 2 0 0 1-2.8 0l-5.2-5.2a2 2 0 0 1 0-2.8L14 4"/>',
    eraser: '<path d="m7 21-4.3-4.3a2 2 0 0 1 0-2.8l9.6-9.6a2 2 0 0 1 2.8 0l5.6 5.6a2 2 0 0 1 0 2.8L13.5 21"/><path d="M22 21H8"/><path d="m5 11 8 8"/>',
    down: '<path d="m6 9 6 6 6-6"/>',
    right: '<path d="m9 6 6 6-6 6"/>',
    book: '<path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"/>',
    topicTree: '<path d="M4 4h16v4H4z"/><path d="M8 12h12M8 16h12M8 20h12M4 12v8"/>',
    send: '<path d="M22 2 11 13"/><path d="M22 2 15 22l-4-9-9-4z"/>',
    card: '<rect x="3" y="7" width="14" height="13" rx="2"/><path d="M7 7V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2h-2"/>',
    eye: '<path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
    eyeOff: '<path d="M3 3l18 18"/><path d="M10.6 5.1A10.9 10.9 0 0 1 12 5c6.4 0 10 7 10 7a17.6 17.6 0 0 1-3.2 4.2M6.6 6.6A17.4 17.4 0 0 0 2 12s3.6 7 10 7a10.7 10.7 0 0 0 5.4-1.4"/><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2"/>',
    note: '<path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><path d="M14 3v6h6M8 13h8M8 17h5"/>',
    note: '<path d="M16 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V8z"/><path d="M15 3v4a2 2 0 0 0 2 2h4"/>',
    copy: '<rect x="8" y="8" width="13" height="13" rx="2"/><path d="M4 16a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2"/>',
    trash: '<path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/>',
    quick: '<path d="m9 11-6 6v3h9l3-3"/><path d="m22 12-4.6 4.6a2 2 0 0 1-2.8 0l-5.2-5.2a2 2 0 0 1 0-2.8L14 4"/>',
    panel: '<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M15 3v18"/>',
    topic: '<path d="M4 4h16v4H4z"/><path d="M8 12h12M8 16h12M8 20h12M4 12v8"/>',
    close: '<path d="M18 6 6 18"/><path d="m6 6 12 12"/>',
    external: '<path d="M15 3h6v6"/><path d="M10 14 21 3"/><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>',
    off: '<circle cx="12" cy="12" r="9"/><path d="m5.6 5.6 12.8 12.8"/>',
    crop: '<path d="M6 2v14a2 2 0 0 0 2 2h14"/><path d="M18 22V8a2 2 0 0 0-2-2H2"/>',
    folder: '<path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    play: '<path d="M7 4v16l13-8z"/>',
    pause: '<path d="M8 5v14M16 5v14"/>',
    message: '<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>',
    chain: '<path d="M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7"/><path d="M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7"/>'
  };
  const el = html => { const t = document.createElement('template'); t.innerHTML = html.trim(); return t.content.firstElementChild; };
  // Poppins, the brand's font (fonts/, web-accessible): added to the page's
  // fonts once, so the panel inside the shadow root can use it. Without it
  // (the Android app, an old copy of the script) the system font stands in.
  let fontsAsked = false;
  function brandFont() {
    if (fontsAsked) return;
    fontsAsked = true;
    try {
      if (!chrome.runtime.getURL || !document.fonts || typeof FontFace !== 'function') return;
      [500, 700, 800].forEach(w => {
        const f = new FontFace('BnPoppins', `url(${chrome.runtime.getURL('fonts/poppins-' + w + '.woff2')})`, { weight: String(w) });
        f.load().then(x => document.fonts.add(x)).catch(() => {});
      });
    } catch (e) {}
  }
  let mounted = false;
  function mount() {
    if (mounted && host.isConnected) return;
    // On <html>, beside <body>: a page that rewrites its body keeps it.
    document.documentElement.appendChild(host);
    mounted = true;
  }
  function applyTheme() {
    const dark = prefs.theme === 'dark' || (prefs.theme !== 'light' && matchMedia('(prefers-color-scheme: dark)').matches);
    host.classList.toggle('dark', dark);
  }

  let toastTimer = 0;
  // A toast with one action (Desfazer): it stays a little longer.
  function toastAction(msg, label, fn) {
    toast(msg, 6000);
    const t = shadow.querySelector('.toast');
    const b = el(`<button class="t-act">${esc(label)}</button>`);
    b.addEventListener('click', () => { t.classList.remove('show'); fn(); });
    t.appendChild(b);
  }
  function toast(msg, ms) {
    mount();
    let t = shadow.querySelector('.toast');
    if (!t) { t = el('<div class="toast" role="status"></div>'); shadow.appendChild(t); }
    t.textContent = msg;
    // Above the hand-annotation bar while it is out.
    t.style.bottom = typeof inkOn !== 'undefined' && inkOn ? '84px' : '';
    t.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove('show'), ms || 3200);
  }

  function place(box, rect, below) {
    const w = box.offsetWidth, h = box.offsetHeight;
    let x = rect.left + rect.width / 2 - w / 2;
    let y = below ? rect.bottom + 8 : rect.top - h - 8;
    if (y < 6) y = rect.bottom + 8;
    if (y + h > innerHeight - 6) y = Math.max(6, rect.top - h - 8);
    x = Math.max(6, Math.min(x, innerWidth - w - 6));
    // The Draw's bar (and its "Conheça a GooNotes" tab, hanging below
    // it) sits above everything: a menu under it gets none of its clicks
    // (they go to the eraser, the pen…). It goes to the other side of the
    // passage, or just past the bar.
    const t = ['__pd_tb__', '__pd_notes_tab__'].map(id => document.getElementById(id)).filter(e => e && e.getClientRects().length)
      .map(e => e.getBoundingClientRect()).reduce((a, r) => !a ? { left: r.left, right: r.right, top: r.top, bottom: r.bottom }
        : { left: Math.min(a.left, r.left), right: Math.max(a.right, r.right), top: Math.min(a.top, r.top), bottom: Math.max(a.bottom, r.bottom) }, null);
    const hits = yy => !!t && x < t.right && x + w > t.left && yy < t.bottom && yy + h > t.top;
    if (hits(y)) {
      const alt = y < rect.top ? rect.bottom + 8 : rect.top - h - 8;
      y = !hits(alt) && alt >= 6 && alt + h <= innerHeight - 6 ? alt : t.top < innerHeight / 2 ? t.bottom + 6 : t.top - h - 6;
    }
    box.style.left = x + 'px'; box.style.top = y + 'px';
  }

  // The format buttons, in the selection's menu and in a mark's.
  function fmtRow(f) {
    f = f || {};
    const ib = (a, label, html, on) => `<button class="ib${on ? ' on' : ''}" data-f="${a}" title="${esc(tr(label))}">${html}</button>`;
    return `<div class="fmt">
      ${ib('b', 'bold', '<b>B</b>', f.b)}${ib('u', 'under', '<u>U</u>', f.u)}${ib('q', 'quote', '“”', f.q)}
      ${ib('dn', 'smaller', 'A<small style="font-size:9px">−</small>', (f.size || 0) < 0)}${ib('up', 'bigger', 'A<small style="font-size:9px">+</small>', (f.size || 0) > 0)}
      <span class="sep"></span>
      ${Object.entries(TEXT_COLORS).map(([k, c]) => `<button class="tc${f.tc === k ? ' on' : ''}" data-tc="${k}" style="color:${c}" title="${esc(tr('textColor'))}">A</button>`).join('')}
      <button class="tc${f.tc ? '' : ' on'}" data-tc="" style="color:var(--ink)" title="${esc(tr('textReset'))}">A</button>
    </div>`;
  }
  // The format after a press on one of those buttons.
  function nextFmt(f, b) {
    const o = { ...(f || {}) };
    if (b.dataset.f === 'b' || b.dataset.f === 'u' || b.dataset.f === 'q') o[b.dataset.f] = !o[b.dataset.f];
    else if (b.dataset.f === 'dn') o.size = Math.max(-2, (o.size || 0) - 1);
    else if (b.dataset.f === 'up') o.size = Math.min(3, (o.size || 0) + 1);
    else if ('tc' in b.dataset) o.tc = b.dataset.tc || undefined;
    Object.keys(o).forEach(k => { if (!o[k]) delete o[k]; });
    return Object.keys(o).length ? o : null;
  }

  // ─── THE MENU ON A SELECTION ──────────────────────────────────────────────
  let bar = null;
  // The last highlighter colour — never "ocultar" (that one takes the passage
  // out of the reading): a note, or the quick highlighter, highlights.
  const markColor = () => (prefs.color && prefs.color !== HIDE && COLORS[prefs.color] ? prefs.color : 'yellow');
  function closeBar() { if (bar) { bar.remove(); bar = null; } }
  function showBar(range) {
    closeBar(); closePop();
    mount();
    bar = el(`<div class="bar" role="toolbar"><div class="r1">
      ${COLOR_KEYS.map(k => `<button class="dot${k === prefs.color ? ' on' : ''}" data-c="${k}" style="background:${COLORS[k]}" title="${esc(tr(k === HIDE ? 'hide' : 'mark'))}"></button>`).join('')}
      <span class="sep"></span>
      <button class="ib" data-a="note" title="${esc(tr('note'))}">${svg(IC.note)}</button>
      <button class="ib" data-a="ink" title="${esc(tr('inkBtn'))}">${svg('<path d="M4 20l4-1 11-11-3-3L5 16z"/><path d="M14 6l3 3"/>')}</button>
      <button class="ib" data-a="copy" title="${esc(tr('copy'))}">${svg(IC.copy)}</button>
      ${cardAccess || !TOUCH ? `<button class="ib" data-a="card" title="${esc(tr('card'))}">${svg(IC.card)}</button>` : ''}
      <button class="ib" data-a="send" title="${esc(tr('sendBtn'))}">${svg(IC.send)}</button>
      <button class="ib${prefs.quick ? ' on' : ''}" data-a="quick" title="${esc(tr('quick'))} (Alt+Q)">${svg(IC.quick)}</button>
      <button class="ib" data-a="panel" title="${esc(tr('panel'))} (Alt+W)">${svg(IC.panel)}</button>
      ${TOUCH ? '' : `<button class="ib" data-a="menuOff" title="${esc(tr('menuOff'))}" aria-label="${esc(tr('menuOff'))}">${svg(IC.off)}</button>`}
      </div>
      <button class="bar-topic${curTopic ? ' on' : ''}" data-a="topic" title="${esc(tr('linkBtn'))}">${svg(IC.topic, 13)}<span></span>${svg(IC.down, 11)}</button>
      ${fmtRow(null)}
    </div>`);
    // The invitation: this menu came with the bar opened on this page only —
    // on every site it would be there by itself (Minhas marcações).
    if (nudgeWanted()) {
      bar.classList.add('wrap');
      const n = el(`<div class="nudge"><span>${esc(tr('nudge'))}</span><button class="go" data-a="nudgeOn">${esc(tr('nudgeOn'))}</button><button class="later" data-a="nudgeLater">${esc(tr('nudgeLater'))}</button></div>`);
      bar.appendChild(n);
    }
    if (TOUCH) { bar.classList.add('wrap'); barRange = range.cloneRange(); }
    const tl = bar.querySelector('.bar-topic span');
    tl.textContent = (curTopic && reg && reg.item(curTopic) && reg.item(curTopic).name) || tr('linkTopic');
    if (!reg) loadReg().then(() => { if (curTopic && reg && reg.item(curTopic)) tl.textContent = reg.item(curTopic).name; });
    shadow.appendChild(bar);
    place(bar, range.getBoundingClientRect(), TOUCH);
    // Keep the selection: a press on the menu must not clear it.
    bar.addEventListener('mousedown', e => e.preventDefault());
    bar.addEventListener('click', e => {
      const b = e.target.closest('button');
      if (!b) return;
      if (b.dataset.c) { if (b.dataset.c !== HIDE) { prefs.color = b.dataset.c; save({ hlColor: b.dataset.c }); } markSelection(b.dataset.c); }
      // A format with no highlighter: the passage changes, and its menu opens
      // for more (another format, a colour, a note).
      else if (b.dataset.f || 'tc' in b.dataset) markSelection(NONE, false, nextFmt(null, b));
      else if (b.dataset.a === 'note') markSelection(markColor(), true);
      else if (b.dataset.a === 'ink') startInk();
      else if (b.dataset.a === 'copy') { copy(String(getSelection()) || (barRange ? String(barRange) : '')); closeBar(); }
      else if (b.dataset.a === 'card') cardOffer(String(getSelection()) || (barRange ? String(barRange) : ''));
      else if (b.dataset.a === 'send') sendOffer(String(getSelection()) || (barRange ? String(barRange) : ''));
      else if (b.dataset.a === 'quick') { toggleQuick(); b.classList.toggle('on', prefs.quick); }
      else if (b.dataset.a === 'panel') { closeBar(); openPanel(); }
      // For whoever only wants the Draw: this menu off on every site (hlOn).
      else if (b.dataset.a === 'menuOff') { prefs.on = false; save({ hlOn: false }); closeBar(); toast(tr('menuOffDone')); }
      // The passage's topic (of the page's discipline): picking it marks the
      // passage there, with the last colour; the next marks go there too.
      else if (b.dataset.a === 'topic') {
        const keep = (currentRange() || barRange || range).cloneRange();
        linkPicker(b, { sel: curTopic, only: pageSubject(), onPick: id => { curTopic = id; markSelection(markColor(), false, null, keep); } });
      }
      else if (b.dataset.a === 'nudgeOn') { closeBar(); send({ action: 'hl.openAccess' }); }
      else if (b.dataset.a === 'nudgeLater') { nudgeUntil = Date.now() + 14 * 86400000; save({ hlNudgeUntil: nudgeUntil }); closeBar(); }
    });
  }

  const TEXT_INPUTS = ['text', 'search', 'email', 'url', 'tel', 'password', 'number'];
  const editable = n => {
    const e = n && (n.nodeType === 1 ? n : n.parentElement);
    if (!e) return false;
    if (e.isContentEditable || e.closest('textarea')) return true;
    return e.tagName === 'INPUT' && TEXT_INPUTS.includes((e.type || 'text').toLowerCase());
  };
  function currentRange() {
    const sel = getSelection();
    if (!sel || sel.isCollapsed || !sel.rangeCount) return null;
    const r = sel.getRangeAt(0);
    if (!String(sel).trim() || editable(r.commonAncestorContainer) || editable(document.activeElement)) return null;
    const c = r.commonAncestorContainer;
    if (host.contains(c) || (c.nodeType === 1 && c.closest && c.closest('#__pd_root__'))) return null;
    return r;
  }

  // Only the person's own input (e.isTrusted): a page's script can fire a
  // mouseup, a click on a bn-mark or Alt+Shift+B, and must not drive us.
  function onPointerUp(e) {
    if (!e.isTrusted || !enabled || e.composedPath().includes(host)) return;
    setTimeout(() => {
      const r = currentRange();
      if (!r) return;
      if (prefs.quick) markSelection(markColor());
      else if (prefs.on) showBar(r);
      else cardChipFor(r);
    }, 10);
  }

  async function markSelection(color, withNote, fmt, range) {
    const r = range || currentRange() || (TOUCH && bar && barRange) || null;
    closeBar();
    if (!r) return;
    const ix = buildIndex();
    const o = rangeOffsets(ix, r);
    const an = o && anchorOf(ix, o);
    if (!an || an.anchor.exact.length > 20000) return;
    const m = { id: uid(), text: an.anchor.exact, color, note: '', anchor: an.anchor, ...(fmt ? { fmt } : {}), ...(curTopic ? { topic: curTopic } : {}) };
    getSelection().removeAllRanges();
    wrap(ix, an.a, an.b, m);
    index = null;
    marks.push(m);
    marks.sort((a, b) => a.anchor.pos - b.anchor.pos);
    renderBadge(); renderPanel();
    if (withNote || fmt) openPop(m.id, !!withNote);
    const res = await send({ action: 'hl.save', url: pageUrl(), info: pageInfo(), mark: m });
    if (!res || !res.ok) {
      unwrap(m.id); marks = marks.filter(x => x.id !== m.id); renderBadge(); renderPanel(); closePop();
      if (res && res.error === 'account') accountAsk(false); else toast(tr('saveFail'));
      return;
    }
    page = res.page;
    if (res.trial) accountAsk(true);
    watch();
    // A page with no discipline yet takes its passage's.
    if (m.topic && !(page && page.topic) && reg && reg.item(m.topic)) { const sub = subjectOf(m.topic); if (sub) setPageLink(sub, true); }
  }

  // ─── A MARK CLICKED ───────────────────────────────────────────────────────
  let pop = null, popId = null;
  let popOff = null;
  function closePop() {
    closeMarkPicker();
    if (popId) (painted.get(popId) || []).forEach(e => e.classList.remove('bn-peek'));
    if (pop) { pop.remove(); pop = null; popId = null; }
    if (popOff) { popOff(); popOff = null; }
  }
  function openPop(id, focusNote) {
    const m = marks.find(x => x.id === id);
    const els = painted.get(id);
    if (!m || !els || !els.length) return;
    closeBar(); closePop();
    mount();
    popId = id;
    // A hidden passage shows (faded, struck through) while its menu is open.
    if (m.color === HIDE) els.forEach(e => e.classList.add('bn-peek'));
    pop = el(`<div class="pop">
      <div class="row">
        ${COLOR_KEYS.map(k => `<button class="dot${k === m.color ? ' on' : ''}" data-c="${k}" style="background:${COLORS[k]}"${k === HIDE ? ` title="${esc(tr('hide'))}"` : ''}></button>`).join('')}
        <button class="dot${m.color === NONE ? ' on' : ''}" data-c="${NONE}" title="${esc(tr('noColor'))}"></button>
        <span style="flex:1"></span>
        ${IS_EXT ? `<button class="ib" data-a="big" title="${esc(tr('noteBig'))}">${svg(IC.big)}</button>` : ''}
        <button class="ib" data-a="copy" title="${esc(tr('copy'))}">${svg(IC.copy)}</button>
        ${notesOk ? `<button class="ib" data-a="topic" title="${esc(tr('toTopic'))}">${svg(IC.topic)}</button>` : ''}
        <button class="ib danger" data-a="del" title="${esc(tr('del'))}">${svg(IC.trash)}</button>
      </div>
      ${fmtRow(m.fmt)}
      <input class="nm" type="text" maxlength="120" placeholder="${esc(tr('namePh'))}" title="${esc(tr('nameTip'))}" aria-label="${esc(tr('namePh'))}">
      <button class="pop-link" data-a="link" title="${esc(tr('linkBtn'))}">${svg(IC.topic, 13)}<span></span>${svg(IC.down, 12)}</button>
      ${IS_EXT ? '<div class="mls"></div>' : ''}
      <div class="nte" contenteditable="true" role="textbox" aria-multiline="true" data-ph="${esc(tr('notePh'))}"></div>
    </div>`);
    const ta = pop.querySelector('.nte');
    // Its name (optional): saved as it is typed, a moment after.
    const nm = pop.querySelector('.nm');
    nm.value = m.name || '';
    let nmTimer = 0;
    const saveName = () => { clearTimeout(nmTimer); const v = nm.value.trim(); if (v !== (m.name || '')) update(m, { name: v }); };
    nm.addEventListener('input', () => { clearTimeout(nmTimer); nmTimer = setTimeout(saveName, 600); });
    nm.addEventListener('blur', saveName);
    ['keydown', 'keyup', 'keypress'].forEach(k => nm.addEventListener(k, e => { e.stopPropagation(); if (e.type === 'keydown' && e.key === 'Enter') { e.preventDefault(); saveName(); ta.focus(); } if (e.key === 'Escape') closePop(); }));
    ffDelete(ta);
    noteIn(ta, m);
    // Its link: its own, or the page's.
    const paintLink = () => {
      const sp = pop && pop.querySelector('.pop-link span');
      if (!sp) return;
      const pg = page && page.topic;
      sp.textContent = m.topic ? linkPath(m.topic) || tr('linkSome') : pg ? tr('linkFromPage', linkPath(pg) || tr('linkSome')) : tr('linkNone');
      pop.querySelector('.pop-link').classList.toggle('own', !!m.topic);
    };
    paintLink();
    if (!reg) loadReg().then(paintLink);
    // The marks it is linked to, either side, and linking one more (the extension only).
    const mls = pop.querySelector('.mls');
    const paintMl = async () => {
      const r = await send({ action: 'hl.links', id: m.id });
      if (!pop || popId !== m.id) return;
      const list = (r && r.ok && r.links) || [];
      mls.replaceChildren();
      list.forEach(x => {
        const row = el(`<div class="ml${x.gone ? ' gone' : ''}" style="--c:${COLORS[x.color] || COLORS.yellow}">
          <button class="ml-go"${x.gone ? ' disabled' : ''}><span></span><small></small></button>
          <button class="ib" data-un title="${esc(tr('mlUnlink'))}">${svg(IC.close, 12)}</button></div>`);
        row.querySelector('.ml-go span').textContent = x.gone ? tr('mlGone') : x.name ? x.name + ' · ' + x.text : x.text;
        row.querySelector('.ml-go small').textContent = x.gone ? '' : page && x.page === page.id ? tr('mlHere') : x.title || hostOf(x.url);
        // Its note opens right here, to read and edit (chamado #25); the page
        // is one more click away.
        if (!x.gone) row.querySelector('.ml-go').addEventListener('click', () => toggleLinkedNote(row, x));
        row.querySelector('[data-un]').addEventListener('click', async () => {
          const r = await send({ action: 'hl.link', id: m.id, other: x.id, on: false });
          if (!r || !r.ok) return toast(tr('mlFail'));
          linkCount(m.id, x.id, -1); paintMl();
        });
        mls.appendChild(row);
      });
      const add = el(`<button class="ml-add">${svg(IC.chain, 13)}<span>${esc(tr('mlBtn'))}</span></button>`);
      add.addEventListener('click', () => markPicker(add, m, [m.id, ...list.map(x => x.id)], paintMl));
      mls.appendChild(add);
      placePop();   // taller now: still on screen
    };
    // The linked mark's note under its row: open/closed by a click on it.
    const toggleLinkedNote = (row, x) => {
      const open = row.nextElementSibling && row.nextElementSibling.classList.contains('ml-note') ? row.nextElementSibling : null;
      if (open) { const same = open.dataset.id === x.id; open.remove(); placePop(); if (same) return; }
      const box = el(`<div class="ml-note" data-id="${esc(x.id)}" title="${esc(tr('mlNoteTip'))}"><div class="nte" contenteditable="true" data-ph="${esc(tr('notePh'))}"></div>
        <div class="ml-acts"><button class="pbtn" data-save>${esc(tr('mlSave'))}</button><button class="pbtn ghost" data-big title="${esc(tr('noteBig'))}">${esc(tr('mlBig'))}</button><button class="pbtn ghost" data-open>${esc(tr('mlOpen'))}</button></div></div>`);
      const nte = box.querySelector('.nte');
      noteIn(nte, x);
      const saveLinked = async () => {
        const o = noteOut(nte);
        const r = await send({ action: 'hl.update', id: x.id, patch: { note: o.note, noteRich: o.noteRich } });
        if (!r || !r.ok) return false;
        x.note = o.note; x.noteRich = o.noteRich;
        return true;
      };
      box.querySelector('[data-save]').addEventListener('click', async () => toast(tr(await saveLinked() ? 'mlSaved' : 'mlFail')));
      // The same note in the Notes' editor, over the page (chamado #26): what
      // was typed here goes first.
      box.querySelector('[data-big]').addEventListener('click', async () => {
        if (!same(noteOut(nte), { note: x.note || '', noteRich: x.noteRich || null }) && !await saveLinked()) return toast(tr('mlFail'));
        closePop(); bigNote(x);
      });
      box.querySelector('[data-open]').addEventListener('click', () => gotoMark(x.id));
      row.after(box);
      placePop();
      nte.focus();
    };
    if (mls) paintMl();
    shadow.appendChild(pop);
    const placePop = () => {
      const r = els[0].getBoundingClientRect(), r2 = els[els.length - 1].getBoundingClientRect();
      place(pop, { left: Math.min(r.left, r2.left), width: Math.abs(r2.right - r.left), top: r.top, bottom: r2.bottom }, true);
    };
    placePop();
    // The keyboard (Android: the page shrinks under it) or a note grown long:
    // the box moves up, and the note shrinks if it still doesn't fit, so what
    // is being typed stays in sight (ticket #15).
    const fit = () => {
      if (!pop) return;
      const vv = window.visualViewport, vh = vv ? vv.height + vv.offsetTop : innerHeight;
      ta.style.maxHeight = '';
      let r = pop.getBoundingClientRect();
      if (r.height > vh - 12) {
        ta.style.maxHeight = Math.max(60, ta.offsetHeight - (r.height - (vh - 12))) + 'px';
        r = pop.getBoundingClientRect();
      }
      if (r.bottom > vh - 6) pop.style.top = Math.max(6, vh - r.height - 6) + 'px';
    };
    const fitSoon = () => { fit(); setTimeout(fit, 350); };
    addEventListener('resize', fitSoon, SIG);
    if (window.visualViewport) visualViewport.addEventListener('resize', fitSoon);
    ta.addEventListener('focus', fitSoon);
    popOff = () => {
      removeEventListener('resize', fitSoon);
      if (window.visualViewport) visualViewport.removeEventListener('resize', fitSoon);
    };
    let noteTimer = 0;
    // Saved when what the box holds changed since it opened (or was last saved).
    const same = (a, b) => a.note === b.note && (a.noteRich && a.noteRich.html) === (b.noteRich && b.noteRich.html);
    let lastOut = noteOut(ta);
    const saveNote = () => {
      clearTimeout(noteTimer);
      const o = noteOut(ta);
      if (same(o, lastOut)) return;
      lastOut = o; update(m, o);
    };
    ta.addEventListener('input', () => { clearTimeout(noteTimer); noteTimer = setTimeout(saveNote, 600); });
    ta.addEventListener('blur', saveNote);
    ta.addEventListener('paste', e => notePaste(e, ta, () => { clearTimeout(noteTimer); noteTimer = setTimeout(saveNote, 600); }));
    // Keys typed here belong to the note, not to the site's shortcuts.
    ['keydown', 'keyup', 'keypress'].forEach(k => ta.addEventListener(k, e => { e.stopPropagation(); if (e.key === 'Escape') closePop(); }));
    pop.addEventListener('click', async e => {
      const b = e.target.closest('button');
      if (!b) return;
      if (b.dataset.c) {
        pop.querySelectorAll('.dot').forEach(d => d.classList.toggle('on', d === b));
        update(m, { color: b.dataset.c });
        (painted.get(m.id) || []).forEach(e => e.classList.toggle('bn-peek', b.dataset.c === HIDE));
      }
      else if (b.dataset.f || 'tc' in b.dataset) {
        update(m, { fmt: nextFmt(m.fmt, b) });
        const row = pop.querySelector('.fmt'), fresh = el(fmtRow(m.fmt));
        row.replaceWith(fresh);
      }
      else if (b.dataset.a === 'copy') copy(m.text);
      else if (b.dataset.a === 'big') { saveNote(); closePop(); bigNote(m); }
      else if (b.dataset.a === 'link') linkPicker(b, { sel: m.topic || null, only: pageSubject(), onPick: id => { update(m, { topic: id }); if (id) curTopic = id; if (pop && popId === m.id) paintLink(); if (id) toast(tr('linkSet', linkPath(id))); } });
      else if (b.dataset.a === 'del') { closePop(); removeWithUndo(m.id); }
    });
    if (focusNote) setTimeout(() => ta.focus(), 30);
  }

  // ─── A NOTE WITH FORMATTING AND IMAGES ────────────────────────────────────
  // The note box takes bold, italic, underline (Ctrl+B/I/U), formatted text
  // pasted from elsewhere and pasted images. Kept as mark.noteRich { html,
  // text } beside the plain note (what search, Markdown and older apps read):
  // the images as files of the Notes' own (bnblob:<id>, hl.blobPut), synced
  // with the marks. The same note opens large in the Notes' editor
  // (bigNote → hlnote.html), with headings, lists, tables…
  const RICH_TAGS = new Set(['P', 'DIV', 'BR', 'B', 'STRONG', 'I', 'EM', 'U', 'S', 'STRIKE', 'DEL', 'SUB', 'SUP', 'SPAN', 'MARK', 'CODE', 'PRE',
    'BLOCKQUOTE', 'UL', 'OL', 'LI', 'H1', 'H2', 'H3', 'H4', 'HR', 'TABLE', 'THEAD', 'TBODY', 'TR', 'TD', 'TH', 'A', 'IMG', 'DETAILS', 'SUMMARY']);
  const RICH_DROP = new Set(['SCRIPT', 'STYLE', 'IFRAME', 'OBJECT', 'EMBED', 'FORM', 'INPUT', 'BUTTON', 'SELECT', 'TEXTAREA', 'LINK', 'META', 'SVG', 'MATH', 'TITLE', 'NOSCRIPT', 'TEMPLATE', 'VIDEO', 'AUDIO', 'CANVAS']);
  const RICH_CSS = /^(color|background-color|text-align|font-weight|font-style|text-decoration|width)$/;
  const BLOCKS = new Set(['P', 'DIV', 'LI', 'H1', 'H2', 'H3', 'H4', 'BLOCKQUOTE', 'PRE', 'TR', 'SUMMARY']);
  const parser = new DOMParser();
  // The formatted note while it is the note's own (an older app that rewrote
  // the note in plain text leaves it behind).
  const richOf = m => (m && m.noteRich && typeof m.noteRich.html === 'string' && m.noteRich.html && m.noteRich.text === (m.note || '') ? m.noteRich.html : null);
  // Only formatting: no scripts, no handlers, no foreign styles; links to the
  // web, images of the note's own (or on the web).
  function cleanRich(html) {
    const doc = parser.parseFromString('<body>' + (html || '') + '</body>', 'text/html');
    const walk = node => [...node.childNodes].forEach(n => {
      if (n.nodeType === 8) return n.remove();
      if (n.nodeType !== 1) return;
      if (RICH_DROP.has(n.tagName)) return n.remove();
      walk(n);
      if (!RICH_TAGS.has(n.tagName)) return n.replaceWith(...n.childNodes);
      [...n.attributes].forEach(a => {
        const k = a.name.toLowerCase(), v = a.value;
        if (k === 'style') {
          const kept = v.split(';').map(d => d.trim()).filter(d => { const [p, ...x] = d.split(':'); return p && RICH_CSS.test(p.trim().toLowerCase()) && !/url\(|expression|[<>]/i.test(x.join(':')); });
          if (kept.length) n.setAttribute('style', kept.join('; ')); else n.removeAttribute('style');
        } else if (k === 'href' && n.tagName === 'A' && /^(https?:|mailto:)/i.test(v.trim())) n.setAttribute('target', '_blank');
        else if (k === 'src' && n.tagName === 'IMG' && /^(bnblob:[\w-]+$|https?:)/i.test(v.trim())) { /* kept */ }
        else if (k === 'data-bn' && n.tagName === 'IMG') { /* the box's own image */ }
        else if (!['alt', 'colspan', 'rowspan', 'data-type', 'data-checked', 'open', 'target'].includes(k)) n.removeAttribute(a.name);
      });
      if (n.tagName === 'A') n.setAttribute('rel', 'noopener noreferrer');
      if (n.tagName === 'IMG' && !n.getAttribute('src')) n.remove();
    });
    walk(doc.body);
    return doc.body.innerHTML;
  }
  // The plain text of a formatted note (an image alone: 🖼).
  function richText(html) {
    const doc = parser.parseFromString('<body>' + html + '</body>', 'text/html');
    let out = '';
    const walk = n => {
      if (n.nodeType === 3) { out += n.nodeValue.replace(/\s+/g, ' '); return; }
      if (n.nodeType !== 1) return;
      if (n.tagName === 'BR') { out += '\n'; return; }
      if (n.tagName === 'IMG') { out += '🖼'; return; }
      const block = BLOCKS.has(n.tagName);
      if (block && out && !out.endsWith('\n')) out += '\n';
      n.childNodes.forEach(walk);
      if (block && !out.endsWith('\n')) out += '\n';
    };
    walk(doc.body);
    return out.replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
  }
  // The note's images: asked of the background once, as data: URLs.
  const blobUrls = new Map();
  const blobUrl = id => {
    if (!blobUrls.has(id)) blobUrls.set(id, send({ action: 'hl.blob', id }).then(r => (r && r.ok ? r.dataUrl : null)));
    return blobUrls.get(id);
  };
  // A formatted note shown in a box (the panel's card, the note box).
  // (Built in a <template>: nothing loads before bnblob: is taken out.)
  function richInto(box, html) {
    const tpl = document.createElement('template');
    tpl.innerHTML = cleanRich(html);
    tpl.content.querySelectorAll('img').forEach(im => {
      const m = /^bnblob:([\w-]+)$/.exec(im.getAttribute('src') || '');
      if (!m) return;
      im.dataset.bn = m[1]; im.removeAttribute('src');
      blobUrl(m[1]).then(u => { if (u) im.src = u; });
    });
    box.replaceChildren(tpl.content);
  }
  function noteIn(box, m) {
    const rich = richOf(m);
    if (rich) richInto(box, rich);
    else box.innerHTML = (m.note || '').split('\n').map(l => `<div>${l ? esc(l) : '<br>'}</div>`).join('');
    if (!m.note) box.innerHTML = '';
  }
  // What the box holds, as the mark keeps it: only plain lines → just the note.
  function noteOut(box) {
    const c = parser.parseFromString('<body>' + box.innerHTML + '</body>', 'text/html').body;
    c.querySelectorAll('img').forEach(im => { if (im.dataset.bn) { im.setAttribute('src', 'bnblob:' + im.dataset.bn); im.removeAttribute('data-bn'); } });
    const html = cleanRich(c.innerHTML), note = richText(html).slice(0, 20000);
    const plain = ![...parser.parseFromString('<body>' + html + '</body>', 'text/html').body.querySelectorAll('*')].some(n => !['DIV', 'P', 'BR'].includes(n.tagName) || n.attributes.length);
    return { note, noteRich: plain || !note ? null : { html, text: note } };
  }
  // Ctrl+V: an image → a file of the Notes'; formatted text → its formatting, cleaned.
  function notePaste(e, box, changed) {
    const dt = e.clipboardData;
    if (!dt) return;
    const f = [...(dt.files || [])].find(x => /^image\/(png|jpeg|gif|webp)$/.test(x.type));
    if (f) {
      e.preventDefault();
      const rd = new FileReader();
      rd.onload = async () => {
        const r = await send({ action: 'hl.blobPut', dataUrl: rd.result });
        if (!r || !r.ok) return toast(tr('imgFail'));
        blobUrls.set(r.id, Promise.resolve(rd.result));
        box.focus();
        document.execCommand('insertHTML', false, `<img src="${rd.result}" data-bn="${r.id}" alt="">`);
        changed();
      };
      rd.readAsDataURL(f);
      return;
    }
    const h = dt.getData('text/html');
    if (h) {
      e.preventDefault();
      document.execCommand('insertHTML', false, cleanRich(h.replace(/<img\b[^>]*>/gi, '')));
      changed();
    }
  }
  // The note in the Notes' editor, over the page (hlnote.html in a frame):
  // the page's marks come back when it closes, with what was written there.
  let bigFrame = null;
  function bigNote(m) {
    if (!IS_EXT || bigFrame) return;
    mount();
    const f = bigFrame = document.createElement('iframe');
    f.className = 'big-note';
    const dark = host.classList.contains('dark');
    // The frame's colour scheme as its page's (dark in dark): when the two
    // differ the browser paints the frame opaque, hiding the site behind.
    f.style.colorScheme = dark ? 'dark' : 'light';
    f.src = chrome.runtime.getURL('hlnote.html') + '#id=' + encodeURIComponent(m.id) + '&lang=' + uiLang + '&dark=' + (dark ? 1 : 0);
    f.setAttribute('allow', 'clipboard-read; clipboard-write');
    const root = document.documentElement, overflow = root.style.overflow;
    const onMsg = e => {
      if (e.source !== f.contentWindow || !e.data || e.data.bnHlNote !== 'close') return;
      removeEventListener('message', onMsg);
      root.style.overflow = overflow;
      f.remove(); bigFrame = null;
      load();
    };
    addEventListener('message', onMsg, SIG);
    f.addEventListener('load', () => f.focus());
    root.style.overflow = 'hidden';
    shadow.appendChild(f);
  }

  async function update(m, patch) {
    Object.assign(m, patch);
    restyle(m); renderPanel();
    const r = await send({ action: 'hl.update', id: m.id, patch });
    if (!r || !r.ok) toast(tr('saveFail'));
  }
  async function remove(id) {
    unwrap(id);
    marks = marks.filter(x => x.id !== id);
    renderBadge(); renderPanel(); renderPins();
    await send({ action: 'hl.delete', id });
  }
  // Deleted from the page or the panel: "Desfazer" for a few seconds brings it
  // back (saved again, under a new id: the old one is already gone).
  async function removeWithUndo(id) {
    const m = marks.find(x => x.id === id);
    await remove(id);
    if (!m) return;
    toastAction(tr('deleted'), tr('undo'), async () => {
      const back = { ...m, id: uid() };
      marks.push(back);
      marks.sort((a, b) => a.anchor.pos - b.anchor.pos);
      paintAll(); renderBadge(); renderPanel(); renderPins();
      const res = await send({ action: 'hl.save', url: pageUrl(), info: pageInfo(), mark: back });
      if (!res || !res.ok) { unwrap(back.id); marks = marks.filter(x => x.id !== back.id); renderBadge(); renderPanel(); renderPins(); toast(tr('saveFail')); }
      else page = res.page;
    });
  }

  function onClick(e) {
    if (!e.isTrusted || !enabled) return;
    const path = e.composedPath();
    if (path.includes(host)) return;
    if (pop && !path.includes(pop)) closePop();
    const sel = getSelection();
    if (sel && !sel.isCollapsed) return;
    const m = e.target && e.target.closest && e.target.closest('bn-mark');
    if (m && m.dataset.id) openPop(m.dataset.id);
  }

  async function copy(text) {
    try { await navigator.clipboard.writeText(text); toast(tr('copied')); }
    catch (e) {
      const ta = document.createElement('textarea');
      ta.value = text; ta.style.cssText = 'position:fixed;opacity:0';
      shadow.appendChild(ta); ta.select();
      try { document.execCommand('copy'); toast(tr('copied')); } catch (_) {}
      ta.remove();
    }
  }

  // ─── TOPICS ───────────────────────────────────────────────────────────────
  // The list of "Disciplina › … › Tópico" to file this page under.
  let tp = null;
  function closeTopicPicker() { if (tp) { tp.remove(); tp = null; } }

  // ─── LINKED MARKS (29/10/2026) ────────────────────────────────────────────
  // A mark linked to others, here or on other pages (kept on one of the two,
  // shown on both). Going to one: on this page, it scrolls there; on another,
  // that page opens at the passage (background.js, hl.goto).
  let linkN = {};
  const hostOf = u => { try { return new URL(u).hostname.replace(/^www\./, ''); } catch (e) { return ''; } };
  function linkCount(a, b, d) {
    [a, b].forEach(id => { if (marks.some(x => x.id === id)) linkN[id] = Math.max(0, (linkN[id] || 0) + d); });
    renderPanel();
  }
  function gotoMark(id) {
    const els = painted.get(id);
    if (els && els.length) {
      closePop();
      els[0].scrollIntoView({ behavior: 'smooth', block: 'center' });
      flash(els);
      setTimeout(() => openPop(id), 450);
      return;
    }
    send({ action: 'hl.goto', id }).then(r => { if (!r || !r.ok) toast(tr('mlOpenFail')); });
  }
  let mlBox = null;
  function closeMarkPicker() { if (mlBox) { mlBox.remove(); mlBox = null; } }
  function markPicker(anchor, m, not, done) {
    closeMarkPicker();
    const box = mlBox = el(`<div class="tp ml-pick" role="dialog" aria-label="${esc(tr('mlBtn'))}"><input type="search" placeholder="${esc(tr('mlSearch'))}"><div class="list"></div></div>`);
    shadow.appendChild(box);
    const list = box.querySelector('.list'), inp = box.querySelector('input');
    let asked = 0, timer = 0;
    const paint = async () => {
      const n = ++asked;
      const r = await send({ action: 'hl.markSearch', q: inp.value, not });
      if (n !== asked || mlBox !== box) return;
      const found = (r && r.ok && r.marks) || [];
      list.replaceChildren();
      if (!found.length) { list.innerHTML = `<p class="empty">${esc(tr('mlNone'))}</p>`; return; }
      found.forEach(x => {
        const b = el(`<button class="it ml-it" style="--c:${COLORS[x.color] || COLORS.yellow}"><small></small><span></span></button>`);
        b.querySelector('small').textContent = page && x.page === page.id ? tr('mlHere') : x.title || hostOf(x.url);
        b.querySelector('span').textContent = x.name ? x.name + ' · ' + x.text : x.text;
        b.addEventListener('click', async () => {
          closeMarkPicker();
          const r = await send({ action: 'hl.link', id: m.id, other: x.id, on: true });
          if (!r || !r.ok) return toast(tr('mlFail'));
          toast(tr('mlSet'));
          linkCount(m.id, x.id, 1);
          done();
        });
        list.appendChild(b);
      });
    };
    paint();
    inp.addEventListener('input', () => { clearTimeout(timer); timer = setTimeout(paint, 180); });
    ['keydown', 'keyup', 'keypress'].forEach(k => box.addEventListener(k, e => {
      e.stopPropagation();
      if (e.type !== 'keydown') return;
      if (e.key === 'Escape') closeMarkPicker();
      if (e.key === 'Enter') { const f = list.querySelector('.it'); if (f) f.click(); }
    }));
    box.addEventListener('mousedown', e => e.stopPropagation());
    place(box, anchor.getBoundingClientRect(), true);
    setTimeout(() => inp.focus(), 20);
    setTimeout(() => {
      const off = e => { if (mlBox !== box) return removeEventListener('mousedown', off, true); if (!inBox(e, box)) { closeMarkPicker(); removeEventListener('mousedown', off, true); } };
      addEventListener('mousedown', off, SIGC);
    });
  }
  function pickTopic(anchor) {
    return new Promise(async resolve => {
      closeTopicPicker();
      const list = (await send({ action: 'notesList' })) || [];
      mount();
      tp = el(`<div class="tp"><input type="search" placeholder="${esc(tr('searchTopic'))}"><div class="list"></div></div>`);
      shadow.appendChild(tp);
      const box = tp.querySelector('.list'), inp = tp.querySelector('input');
      const norm = s => String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
      const done = v => { closeTopicPicker(); document.removeEventListener('mousedown', off, true); resolve(v); };
      const paint = () => {
        const q = norm(inp.value.trim());
        box.innerHTML = '';
        if (!list.length) { box.innerHTML = `<p class="empty">${esc(tr('noTopics'))}</p>`; return; }
        list.filter(x => !q || norm(x.path + ' ' + x.name).includes(q)).slice(0, 200).forEach(x => {
          const b = el(`<button class="it${page && page.topic === x.id ? ' on' : ''}"><small></small><span></span></button>`);
          b.querySelector('small').textContent = x.path;
          b.querySelector('span').textContent = x.name;
          b.addEventListener('click', () => done(x));
          box.appendChild(b);
        });
      };
      paint();
      inp.addEventListener('input', paint);
      ['keydown', 'keyup', 'keypress'].forEach(k => inp.addEventListener(k, e => {
        e.stopPropagation();
        if (e.type === 'keydown' && e.key === 'Escape') done(null);
        if (e.type === 'keydown' && e.key === 'Enter') { const f = box.querySelector('.it'); if (f) f.click(); }
      }));
      const r = anchor.getBoundingClientRect();
      tp.style.left = Math.max(6, Math.min(r.right - 340, innerWidth - 346)) + 'px';
      tp.style.top = Math.min(r.bottom + 6, innerHeight - tp.offsetHeight - 6) + 'px';
      setTimeout(() => inp.focus(), 20);
      // A press outside closes it.
      const off = e => { if (!inBox(e, tp)) done(null); };
      setTimeout(() => document.addEventListener('mousedown', off, true));
    });
  }
  async function setTopic(anchor) {
    const x = await pickTopic(anchor);
    if (!x) return null;
    const r = await send({ action: 'hl.page', url: pageUrl(), info: pageInfo(), patch: { topic: x.id } });
    if (r && r.page) page = r.page;
    renderPanel();
    return x;
  }
  // ─── THE SIDE PANEL ───────────────────────────────────────────────────────
  let panel = null, badge = null;
  // The corner: the page's count (opens the panel) and, at its left, the
  // pen that turns hand annotation on. In the Android app it is always there
  // (the browser is the Highlights'); in the extension, once the page has
  // something marked — not on every site anyone opens. Away while drawing.
  let dock = null, inkFab = null, cropFab = null, homeFab = null;
  function renderBadge() {
    const hasAny = marks.length > 0 || inks.length > 0;
    // In the extension (28/10/2026) the corner shows only on pages with
    // something marked: back on such a page, the count says so at once; on
    // any other page nothing sits in the corner (the selection menu is still
    // there). The home screen's "Ocultar os ícones mesmo com marcação"
    // (hlDockHide) keeps it away everywhere — Alt+W still opens the panel.
    const hide = IS_EXT && prefs.dockHide;
    renderIntro(hasAny || IS_EXT);
    const showBadge = enabled && hasAny && !hide && !panel && !inkOn;
    const showFab = enabled && !hide && !inkOn && !panel && (TOUCH || hasAny);
    if (!showBadge && !showFab) { if (dock) { dock.remove(); dock = badge = inkFab = cropFab = homeFab = null; } return; }
    mount();
    if (!dock) { dock = el('<div class="dock"></div>'); shadow.appendChild(dock); }
    if (showFab && !inkFab) {
      inkFab = el(`<button class="ink-fab" title="${esc(tr('inkBtn'))}" aria-label="${esc(tr('inkBtn'))}">${svg('<path d="M12 20h9"/><path d="M16.4 3.6a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/>', 17)}</button>`);
      inkFab.addEventListener('click', startInk);
      dock.prepend(inkFab);
    } else if (!showFab && inkFab) { inkFab.remove(); inkFab = null; }
    // The caderno de erros' crop, beside the pen (not in the iOS app yet: it
    // can't hand the area back to the page).
    if (showFab && !cropFab && !window.__bnIOS) {
      cropFab = el(`<button class="crop-fab" title="${esc(tr('errCrop'))}" aria-label="${esc(tr('errCrop'))}">${svg(IC.crop, 17)}</button>`);
      cropFab.addEventListener('click', errCrop);
      dock.prepend(cropFab);
    } else if (!showFab && cropFab) { cropFab.remove(); cropFab = null; }
    // ⌂ The extension's home screen, first in the row.
    if (IS_EXT && !homeFab) {
      homeFab = el(`<button class="crop-fab home-fab" title="${esc(tr('home'))}" aria-label="${esc(tr('home'))}">${svg(IC.home, 17)}</button>`);
      homeFab.addEventListener('click', goHome);
      dock.prepend(homeFab);
    } else if (homeFab && dock.firstChild !== homeFab) dock.prepend(homeFab);
    if (showBadge && !badge) {
      badge = el(`<button class="badge" title="${esc(tr('panel'))} (Alt+W)"></button>`);
      badge.addEventListener('click', openPanel);
      dock.appendChild(badge);
    } else if (!showBadge && badge) { badge.remove(); badge = null; }
    if (badge) badge.innerHTML = `${svg(IC.quick, 15)}<span>${marks.filter(m => m.color !== HIDE).length + inks.length}</span>`;
    if (IS_EXT && badge && !prefs.tourDone && !tourEl) { prefs.tourDone = true; setTimeout(runTour, 900); }
  }
  // ─── THE TOUR (extension, once: when the corner's buttons first show) ─────
  // A ring on each button of the corner, with a card: marking, the hand
  // annotation, the partial capture, the page's panel, the home screen.
  let tourEl = null;
  function runTour() {
    if (!dock || !badge || panel || inkOn) { prefs.tourDone = false; return; }
    save({ hlTourDone: true });
    const steps = [[null], [inkFab], [cropFab], [badge], [homeFab], [tmEl]].map((x, i) => [x[0], L.tour[i] || STR.pt.tour[i]]).filter(([e], i) => !i || e);
    tourEl = el('<div class="tour"><div class="t-ring"></div><div class="t-card"></div></div>');
    shadow.appendChild(tourEl);
    const ring = tourEl.querySelector('.t-ring'), card = tourEl.querySelector('.t-card');
    let i = 0;
    const end = () => { removeEventListener('keydown', key, true); tourEl.remove(); tourEl = null; };
    function place() {
      const [target, [t, b]] = steps[i], last = i === steps.length - 1;
      card.innerHTML = `<div class="t-top"><span>${i + 1} / ${steps.length}</span>${last ? '' : `<button data-x="skip">${esc(tr('tourSkip'))}</button>`}</div>
        <b>${esc(t)}</b><p>${esc(b)}</p>
        <div class="t-acts">${i ? `<button data-x="back">${esc(tr('tourBack'))}</button>` : ''}<button class="go" data-x="go">${esc(last ? tr('tourDone') : tr('tourNext'))} →</button></div>`;
      const vw = innerWidth, vh = innerHeight, cw = card.offsetWidth, ch = card.offsetHeight;
      if (!target) { ring.style.display = 'none'; card.style.left = (vw - cw - 24) + 'px'; card.style.top = (vh - ch - 90) + 'px'; return; }
      const r = target.getBoundingClientRect();
      ring.style.display = 'block';
      Object.assign(ring.style, { left: r.left - 5 + 'px', top: r.top - 5 + 'px', width: r.width + 10 + 'px', height: r.height + 10 + 'px' });
      card.style.left = Math.max(12, Math.min(vw - cw - 12, r.left + r.width / 2 - cw / 2)) + 'px';
      card.style.top = Math.max(12, r.top - ch - 16) + 'px';
    }
    card.addEventListener('click', e => {
      const x = e.target.closest('[data-x]'); if (!x) return;
      if (x.dataset.x === 'skip' || (x.dataset.x === 'go' && i === steps.length - 1)) return end();
      i += x.dataset.x === 'back' ? -1 : 1; place();
    });
    const key = e => { if (e.key === 'Escape') { e.stopPropagation(); end(); } };
    addEventListener('keydown', key, SIGC);
    place();
  }
  // ─── "USE GOOHIGHLIGHTS NESTA PÁGINA" ──────────────────────────────
  // On a computer, a page with nothing marked yet shows, in the corner, that
  // the Highlights is there (many never notice it): the GooDraw and a line;
  // a click opens the same paged "Conheça a GooHighlights" as the Draw's
  // bar (highlights-promo.js). The first mark puts the corner's buttons in
  // its place. It can be turned off for a site (hlIntroOff). Not on touch
  // screens: there the pen and the crop are in the corner from the start.
  let intro = null, loadedOnce = false;
  function renderIntro(hasAny) {
    const show = loadedOnce && enabled && !hasAny && !panel && !inkOn && !TOUCH && !window.__bnIOS
      && !prefs.introOff.includes(HOST) && !document.getElementById('__pd_promo__');
    if (!show) { if (intro) { intro.remove(); intro = null; } return; }
    if (intro) return;
    mount(); brandFont();
    let logo = '';
    try { logo = chrome.runtime.getURL('icons/icon128.png'); } catch (e) {}
    intro = el(`<div class="hl-intro"><button class="hi-go" title="${esc(tr('introGo'))}">${logo ? `<img src="${esc(logo)}" alt="">` : ''}<i></i><span>${esc(tr('introGo'))}</span></button>
      <button class="hi-x" title="${esc(tr('introOff'))}" aria-label="${esc(tr('introOff'))}">${svg(IC.close, 13)}</button></div>`);
    intro.querySelector('.hi-go').addEventListener('click', openIntroPromo);
    intro.querySelector('.hi-x').addEventListener('click', () => {
      prefs.introOff = [...new Set(prefs.introOff.concat(HOST))];
      save({ hlIntroOff: prefs.introOff });
      renderBadge();
    });
    shadow.appendChild(intro);
  }
  function openIntroPromo() {
    if (document.getElementById('__pd_promo__')) return;
    const done = () => { renderBadge(); };
    const mountPromo = () => {
      const host = document.createElement('div');
      host.id = '__pd_promo__';
      document.documentElement.appendChild(host);
      let poster = '', logo = '';
      try { poster = chrome.runtime.getURL('highlights-video.jpg'); logo = chrome.runtime.getURL('icons/icon128.png'); } catch (e) {}
      renderBadge();
      window.__bnHighlightsPromo.mount(host, {
        lang: Object.keys(STR).find(k => STR[k] === L) || 'en', logo, poster, manual: true,
        // Its button: on every site (Minhas marcações) when it isn't yet;
        // already on, the way to start right here.
        onCta() {
          if (hasAccess === false) send({ action: 'hl.openAccess' });
          else toast(tr('introHint'));
          done();
        },
        onClose: done
      });
    };
    if (window.__bnHighlightsPromo) { mountPromo(); return; }
    send({ action: 'injectPromo', which: 'highlights' }).then(r => {
      if (r && r.ok && window.__bnHighlightsPromo) mountPromo();
      else toast(tr('introHint'));
    });
  }

  function openPanel() {
    if (!enabled) return;
    mount();
    if (!panel) { panel = el('<aside class="panel" role="complementary"></aside>'); shadow.appendChild(panel); }
    panelChrome();
    renderBadge();
    renderPanel();
    fitPanel();
    clearInterval(fitTimer); fitTimer = setInterval(fitPanel, 600);
  }
  // The Draw's bar (content.js) on the same page sits above everything: the
  // panel steps out of its way — under it when it is on top, over it when at
  // the foot, to its left when it stands on the right — so the panel's own
  // buttons (the X, the header) are never covered. It follows the bar while
  // the panel is open (the bar moves, folds, closes).
  let fitTimer = 0;
  function fitPanel() {
    if (!panel) { clearInterval(fitTimer); return; }
    let top = 0, bottom = 0, right = 0;
    const tb = document.getElementById('__pd_tb__');
    const r = tb && tb.getClientRects().length ? tb.getBoundingClientRect() : null;
    const pw = Math.min(460, innerWidth);
    if (r && r.width && r.height && getComputedStyle(tb).visibility !== 'hidden' && r.right > innerWidth - pw) {
      if (r.width >= r.height) {
        if (r.top < innerHeight / 2) top = Math.max(0, Math.ceil(r.bottom));
        else bottom = Math.max(0, Math.ceil(innerHeight - r.top));
      } else if (r.left > innerWidth / 2) right = Math.max(0, Math.ceil(innerWidth - r.left));
    }
    // The Draw's answer bar (TEC shortcuts) at the foot, under the panel: the panel stops above it.
    const sc = document.getElementById('__pd_sc__');
    const s = sc && sc.getClientRects().length && getComputedStyle(sc).display !== 'none' ? sc.getBoundingClientRect() : null;
    if (s && s.width && s.top > innerHeight / 2 && s.right > innerWidth - pw - right) bottom = Math.max(bottom, Math.ceil(innerHeight - s.top) + 8);
    if (pTab) pTab.style.right = right ? `calc(min(460px, 100vw) + ${right}px)` : '';
    const v = top + '|' + bottom + '|' + right;
    if (panel.dataset.fit === v) return;
    panel.dataset.fit = v;
    panel.style.top = top + 'px';
    panel.style.height = `calc(100vh - ${top + bottom}px)`;
    panel.style.right = right + 'px';
  }
  let spaceAt = 0, spaceSt = null;
  async function spaceStrip() {
    if (Date.now() - spaceAt > 60000) { spaceAt = Date.now(); spaceSt = await send({ action: 'hl.status' }); }
    const st = spaceSt;
    if (panel && st && !st.user && st.marks > 0) {
      const body = panel.querySelector('.p-body');
      if (!body || body.querySelector('.p-space')) return;
      const box = el(`<div class="p-space near"><b>${esc(tr(TOUCH ? 'accLocalTM' : 'accLocalT'))}</b><span>${esc(tr(TOUCH ? 'accLocalM' : 'accLocal', st.marks))}</span>
        <button class="btn primary" data-a="acc">${esc(tr('accSignup'))}</button></div>`);
      box.querySelector('[data-a="acc"]').addEventListener('click', () => accountAsk(false));
      body.prepend(box);
      return;
    }
    if (!panel || !st || !st.user || (st.space !== 'full' && st.space !== 'near')) return;
    const body = panel.querySelector('.p-body');
    if (!body || body.querySelector('.p-space')) return;
    const full = st.space === 'full';
    const box = el(`<div class="p-space ${full ? 'full' : 'near'}"><b>${esc(tr(full ? 'spaceFull' : 'spaceNear'))}</b><span>${esc(tr(full ? 'spaceFullTx' : 'spaceNearTx'))}</span>
      <button class="btn primary" data-a="buy">${esc(tr('spaceBuy'))}</button></div>`);
    box.querySelector('[data-a="buy"]').addEventListener('click', () => send({ action: 'hl.buyCloud' }));
    body.prepend(box);
  }
  function closePanel() {
    clearInterval(fitTimer);
    if (panel) { panel.remove(); panel = null; }
    if (pTab) { pTab.remove(); pTab = null; }
    document.removeEventListener('keydown', panelKey, true);
    closeTopicPicker(); renderBadge(); renderPins();
  }
  // The panel closes with Esc too, and with a tab on its edge (a big target:
  // the X in the header is easy to miss).
  let pTab = null;
  function panelKey(e) { if (e.key === 'Escape' && panel && !e.defaultPrevented) { e.stopPropagation(); closePanel(); } }
  function panelChrome() {
    document.addEventListener('keydown', panelKey, SIGC);
    if (pTab) return;
    pTab = el(`<button class="p-tab" title="${esc(tr('close'))}" aria-label="${esc(tr('close'))}">${svg('<path d="m9 6 6 6-6 6"/>', 16)}</button>`);
    pTab.addEventListener('click', closePanel);
    shadow.appendChild(pTab);
  }
  async function renderPanel() {
    if (!panel) return;
    if (!reg) await loadReg();
    if (!panel) return;
    const info = pageInfo();
    // A passage hidden from the reading ("ocultar") is out of the list and the
    // counts too: it was taken out because it doesn't matter.
    const shown = marks.filter(m => m.color !== HIDE);
    brandFont();
    panel.innerHTML = `<div class="p-hero"><div class="p-hdr"><span class="logo">${svg(IC.quick, 18)}</span><h2>${esc(tr('title'))}</h2>
        <button class="ib" data-a="close" title="${esc(tr('close'))}">${svg(IC.close)}</button></div>
        <p class="p-title"></p><div class="p-site"></div>
        <div class="p-stats"><div><b>${shown.length}</b><span>${esc(tr(shown.length === 1 ? 'statMark1' : 'statMarkN'))}</span></div>
          <div><b>${inks.length}</b><span>${esc(tr(inks.length === 1 ? 'statInk1' : 'statInkN'))}</span></div>
          <div><b>${shown.filter(m => m.note).length}</b><span>${esc(tr('statNotes'))}</span></div></div></div>
      <div class="p-body">
        <div class="lbl">${esc(tr('linkLbl'))}</div>
        <button class="pick p-link" data-a="link" title="${esc(tr('linkHint'))}">${svg(IC.book, 14)}<span></span>${svg(IC.down, 13)}</button>
        <div class="lbl">${esc(tr('tags'))}</div>
        <div class="tags p-box"></div>
        <div class="lbl">${esc(tr(inks.length === 1 ? 'inks1' : 'inksN', inks.length))}</div>
        <div class="inks p-box"><button class="btn primary" data-a="ink">${svg('<path d="M4 20l4-1 11-11-3-3L5 16z"/><path d="M14 6l3 3"/>', 14)}${esc(tr(inkOn ? 'inkDone' : 'inkBtn'))}</button>
          ${inks.length ? `<button class="btn" data-a="inkEye">${esc(tr(inkHidden ? 'inkShow' : 'inkHide'))}</button>` : ''}</div>
        ${inkMissing.size ? `<div class="card"><div class="miss">${esc(tr('inkMissing', inkMissing.size))}</div></div>` : ''}
        <div class="lbl">${esc(tr(shown.length === 1 ? 'nMarks1' : 'nMarksN', shown.length))}
          ${shown.some(m => m.note) ? `<button class="lbl-act" data-a="notes">${svg(notesHidden ? IC.eye : IC.eyeOff, 13)}${esc(tr(notesHidden ? 'notesShow' : 'notesHide'))}</button>` : ''}</div>
        <div class="cards"></div>
      </div>
      <div class="p-foot">
        ${notesOk ? `<button class="btn primary" data-a="all" ${shown.length ? '' : 'disabled'}>${svg(IC.topic, 14)}${esc(tr('allToTopic'))}</button>` : ''}
        <button class="btn" data-a="md" ${shown.length ? '' : 'disabled'}>${svg(IC.copy, 14)}${esc(tr('md'))}</button>
        <button class="btn" data-a="open">${svg(IC.external, 14)}${esc(tr(notesOk ? 'openNotes' : 'openMarks'))}</button>
        <button class="btn" data-a="off">${svg(IC.off, 14)}${esc(tr('siteOff'))}</button>
        ${IS_EXT ? `<button class="btn" data-a="ticket">${svg(IC.message, 14)}${esc(tr('ticket'))}</button>` : ''}
      </div>`;
    // The cloud full (or nearly): a strip on top, with where to get more
    // space. Extension only: in the Android app the page can't ask (HlBridge),
    // and the app says it on its own screens, without a link.
    spaceStrip();
    panel.querySelector('.p-title').textContent = (page && page.title) || info.title || HOST;
    panel.querySelector('.p-site').textContent = HOST;
    const pl = panel.querySelector('[data-a="link"]');
    pl.querySelector('span').textContent = (pageSubject() && linkPath(pageSubject())) || tr('linkNoneHint');
    pl.classList.toggle('none', !pageSubject());
    pl.addEventListener('click', () => linkPicker(pl, { sel: pageSubject(), subjects: true, onPick: setPageLink }));
    // Tags
    const tags = panel.querySelector('.tags');
    ((page && page.tags) || []).forEach(tag => {
      const c = el(`<span class="tag"><span></span><button title="${esc(tr('del'))}">×</button></span>`);
      c.firstChild.textContent = tag;
      c.querySelector('button').addEventListener('click', () => setTags(page.tags.filter(x => x !== tag)));
      tags.appendChild(c);
    });
    tags.appendChild(tagInput());
    // Marks
    const cards = panel.querySelector('.cards');
    if (!shown.length) cards.innerHTML = `<p class="empty">${esc(tr('none'))}</p>`;
    shown.forEach(m => {
      const c = el(`<div class="card" style="--c:${COLORS[m.color] || COLORS.yellow}">${m.name ? '<b class="nmv"></b>' : ''}<div class="tx"></div></div>`);
      if (m.name) c.querySelector('.nmv').textContent = m.name;
      c.querySelector('.tx').textContent = m.text;
      if (m.topic && m.topic !== (page && page.topic) && linkPath(m.topic)) {
        const lk = el(`<div class="lk">${svg(IC.topic, 12)}<span></span></div>`);
        lk.lastChild.textContent = linkPath(m.topic);
        c.appendChild(lk);
      }
      if (linkN[m.id]) {
        const lk = el(`<div class="lk">${svg(IC.chain, 12)}<span></span></div>`);
        lk.lastChild.textContent = linkN[m.id] === 1 ? tr('mlCount1') : tr('mlCountN', linkN[m.id]);
        c.appendChild(lk);
      }
      if (m.note && !notesHidden) {
        const n = el('<div class="nt"></div>'), rich = richOf(m);
        if (rich) { n.classList.add('rich'); richInto(n, rich); } else n.textContent = m.note;
        c.appendChild(n);
      }
      const del = el(`<button class="c-del" title="${esc(tr('delMark'))}" aria-label="${esc(tr('delMark'))}">${svg(IC.trash, 14)}</button>`);
      del.addEventListener('click', e => { e.stopPropagation(); removeWithUndo(m.id); });
      c.appendChild(del);
      if (!painted.has(m.id)) c.appendChild(el(`<div class="miss">${esc(tr('missing'))}</div>`));
      c.addEventListener('click', () => {
        const els = painted.get(m.id);
        if (!els) return;
        els[0].scrollIntoView({ behavior: 'smooth', block: 'center' });
        flash(els);
        setTimeout(() => openPop(m.id), 450);
      });
      cards.appendChild(c);
    });
    panel.querySelector('.p-hdr [data-a="close"]').addEventListener('click', closePanel);
    const nb = panel.querySelector('[data-a="notes"]');
    if (nb) nb.addEventListener('click', () => { notesHidden = !notesHidden; save({ hlNotesHidden: notesHidden }); marks.forEach(restyle); renderPins(); renderPanel(); });
    panel.querySelector('[data-a="ink"]').addEventListener('click', () => (inkOn ? stopInk() : startInk()));
    if (panel.querySelector('[data-a="inkEye"]')) panel.querySelector('[data-a="inkEye"]').addEventListener('click', toggleInkHidden);
    panel.querySelector('[data-a="md"]').addEventListener('click', () => copy(markdown()));
    panel.querySelector('[data-a="open"]').addEventListener('click', () => send({ action: 'hl.open', pageId: page ? page.id : null }));
    const tk = panel.querySelector('[data-a="ticket"]');
    if (tk) tk.addEventListener('click', () => send({ action: 'ticket.open', tool: 'highlights', url: pageUrl() }));
    panel.querySelector('[data-a="off"]').addEventListener('click', () => {
      save({ hlOff: [...new Set(prefs.off.concat(HOST))] });
      toast(tr('siteOffDone', HOST));
    });
  }
  // The tag box: what is typed finds the tags that already exist (accents and
  // capitals aside), so "Lei seca" isn't made a second time as "lei Seca".
  // ↑/↓ and Enter, or a click, take one; Enter on a new name makes it.
  let allTags = null;
  const tagKey = v => String(v).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();
  function tagInput() {
    const wrap = el(`<div class="t-in"><input type="text" maxlength="40" placeholder="${esc(tr('tagPh'))}" autocomplete="off"><div class="t-sug" role="listbox" hidden></div></div>`);
    const ti = wrap.firstChild, sug = wrap.lastChild;
    let list = [], at = -1;
    const cur = () => (page && page.tags) || [];
    const add = v => {
      v = v.trim(); if (!v) return;
      const k = tagKey(v), known = (allTags || []).find(x => tagKey(x) === k);
      if (!cur().some(x => tagKey(x) === k)) setTags(cur().concat(known || v)); else { ti.value = ''; paint(); }
    };
    const paint = () => {
      const q = tagKey(ti.value), mine = new Set(cur().map(tagKey));
      list = q ? (allTags || []).filter(x => !mine.has(tagKey(x)) && tagKey(x).includes(q))
        .sort((a, b) => tagKey(b).startsWith(q) - tagKey(a).startsWith(q) || a.localeCompare(b)).slice(0, 6) : [];
      at = list.length && list.some(x => tagKey(x) === q) ? list.findIndex(x => tagKey(x) === q) : -1;
      sug.hidden = !list.length;
      sug.innerHTML = list.map((x, i) => `<button type="button" class="${i === at ? 'on' : ''}" data-i="${i}"></button>`).join('');
      [...sug.children].forEach((b, i) => { b.textContent = list[i]; });
    };
    ['keydown', 'keyup', 'keypress'].forEach(k => ti.addEventListener(k, e => {
      e.stopPropagation();
      if (e.type !== 'keydown') return;
      if ((e.key === 'ArrowDown' || e.key === 'ArrowUp') && list.length) {
        e.preventDefault();
        at = (at + (e.key === 'ArrowDown' ? 1 : list.length - 1 + (at < 0 ? 1 : 0))) % list.length;
        [...sug.children].forEach((b, i) => b.classList.toggle('on', i === at));
      } else if (e.key === 'Enter' && ti.value.trim()) add(at >= 0 ? list[at] : ti.value);
      else if (e.key === 'Escape') { sug.hidden = true; list = []; at = -1; }
    }));
    ti.addEventListener('input', paint);
    ti.addEventListener('blur', () => setTimeout(() => { sug.hidden = true; }, 150));
    sug.addEventListener('mousedown', e => e.preventDefault());
    sug.addEventListener('click', e => { const b = e.target.closest('button'); if (b) add(list[+b.dataset.i]); });
    if (!allTags) send({ action: 'hl.tags' }).then(r => { allTags = r && Array.isArray(r.tags) ? r.tags : []; if (ti.value) paint(); });
    return wrap;
  }
  async function setTags(tags) {
    const r = await send({ action: 'hl.page', url: pageUrl(), info: pageInfo(), patch: { tags } });
    if (r && r.page) page = r.page;
    allTags = null;
    renderPanel();
    const i = panel && panel.querySelector('.tags input');
    if (i) i.focus();
  }
  function flash(els) {
    els.forEach(e => { e.style.setProperty('outline', '2px solid #4a4aff', 'important'); });
    setTimeout(() => els.forEach(e => e.style.removeProperty('outline')), 1200);
  }
  function markdown() {
    const title = (page && page.title) || pageInfo().title || HOST;
    const lines = [`# ${title}`, '', pageUrl().split('#')[0], ''];
    marks.filter(m => m.color !== HIDE).forEach(m => {
      lines.push(...m.text.split('\n').map(l => '> ' + l));
      if (m.note) lines.push('', `**${tr('noteLbl')}:** ${m.note}`);
      lines.push('');
    });
    return lines.join('\n');
  }

  // ─── ANOTAÇÕES À MÃO (salvas com as marcações) ──────────────────────────────
  // GooHighlights also draws: pencil, highlighter, line, rectangle,
  // circle, eraser — and, unlike the Draw's bar (scribbles to solve a
  // question, never kept), what is drawn here is kept with the page's marks
  // and synced (kind 'pageink', one record per stroke). Each stroke is tied
  // to the passage of text nearest to it (its anchor, like a mark's): when
  // the page comes back, even laid out wider or narrower, the stroke is drawn
  // again from where that passage is now. A stroke away from any text keeps
  // its place on the page.
  const INK_COLORS = ['#e53935', '#1e88e5', '#43a047', '#1a1a2e', '#f59e0b', '#8e24aa'];
  // Like GooDraw's bar: each tool keeps its own colour and thickness
  // (a tap on the tool in hand opens them), the highlighter goes straight or
  // free, and the eraser takes whole strokes or only where it passes.
  // Kept in hlInkOpts (and with the account's settings, hl-sync.js).
  const INK_PALETTE = ['#e53935', '#f97316', '#f59e0b', '#fde047', '#43a047', '#14b8a6', '#1e88e5', '#4a4aff', '#8e24aa', '#ec4899', '#1a1a2e', '#ffffff'];
  const INK_DEF = { size: { pencil: 3, highlight: 16, line: 3, rect: 3, circle: 3, eraser: 22 },
    color: { pencil: '#e53935', highlight: '#fde047', line: '#e53935', rect: '#e53935', circle: '#e53935' }, hlStraight: true, eraserWhole: true, pencilRaw: false, recent: [] };
  let inkOpts = JSON.parse(JSON.stringify(INK_DEF));
  function readInkOpts(o) {
    if (!o || typeof o !== 'object') return;
    const n = JSON.parse(JSON.stringify(INK_DEF));
    for (const t in n.size) if (+(o.size || {})[t] > 0) n.size[t] = Math.max(1, Math.min(t === 'eraser' ? 80 : 40, +o.size[t]));
    for (const t in n.color) if (/^#[0-9a-f]{3,8}$/i.test((o.color || {})[t] || '')) n.color[t] = o.color[t];
    n.hlStraight = o.hlStraight !== false; n.eraserWhole = o.eraserWhole !== false; n.pencilRaw = !!o.pencilRaw;
    n.recent = Array.isArray(o.recent) ? o.recent.filter(c => /^#[0-9a-f]{6}$/i.test(c)).slice(0, 3) : [];
    inkOpts = n;
  }
  // The lasso: the same controller as the Notes' (notes/lasso.js — keep both
  // alike), on the strokes in page coordinates.
  const makeLasso = (function () {
  const inPoly = (x, y, poly) => {
    let c = false;
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
      const a = poly[i], b = poly[j];
      if ((a.y > y) !== (b.y > y) && x < (b.x - a.x) * (y - a.y) / (b.y - a.y) + a.x) c = !c;
    }
    return c;
  };

  function create(o) {
    let poly = null, sel = null, act = null;
    const box = idx => {
      const list = o.list();
      let x1 = Infinity, y1 = Infinity, x2 = -Infinity, y2 = -Infinity;
      idx.forEach(i => { const s = list[i]; if (!s) return; const w = o.half(s); o.pts(s).forEach(p => { x1 = Math.min(x1, p.x - w); y1 = Math.min(y1, p.y - w); x2 = Math.max(x2, p.x + w); y2 = Math.max(y2, p.y + w); }); });
      return x1 === Infinity ? null : { x1, y1, x2, y2 };
    };
    // pad: a few css px in this page's units (handles are the same size at any zoom)
    const hit = (x, y, u) => {
      if (!sel) return null;
      const b = sel.box, pad = 6 * u, h = 12 * u;
      if (Math.hypot(x - (b.x1 + b.x2) / 2, y - (b.y1 - pad - 26 * u)) <= 20 * u) return 'del';
      const cs = [[b.x1 - pad, b.y1 - pad], [b.x2 + pad, b.y1 - pad], [b.x2 + pad, b.y2 + pad], [b.x1 - pad, b.y2 + pad]];
      for (let i = 0; i < 4; i++) if (Math.abs(x - cs[i][0]) <= h && Math.abs(y - cs[i][1]) <= h) return i;
      if (x >= b.x1 - pad && x <= b.x2 + pad && y >= b.y1 - pad && y <= b.y2 + pad) return 'move';
      return null;
    };
    const api = {
      get busy() { return !!(poly || act); },
      get selected() { return !!sel; },
      // u: units per css px. True when the lasso took the touch.
      down(x, y, u) {
        const h = hit(x, y, u);
        if (h === 'del') { api.del(); return true; }
        if (h != null) {
          const b = sel.box, cs = [[b.x1, b.y1], [b.x2, b.y1], [b.x2, b.y2], [b.x1, b.y2]];
          act = { kind: h === 'move' ? 'move' : 'scale', x, y, box: { ...b }, before: o.list().slice(),
            anchor: h === 'move' ? null : { x: cs[(h + 2) % 4][0], y: cs[(h + 2) % 4][1] }, corner: h === 'move' ? null : { x: cs[h][0], y: cs[h][1] } };
          return true;
        }
        sel = null; poly = [{ x, y }];
        o.repaint();
        return true;
      },
      move(x, y) {
        if (act) {
          let f, k = 1;
          if (act.kind === 'move') { const dx = x - act.x, dy = y - act.y; f = p => ({ x: p.x + dx, y: p.y + dy }); }
          else {
            const a = act.anchor, d0 = Math.hypot(act.corner.x - a.x, act.corner.y - a.y) || 1;
            k = Math.max(0.15, Math.min(8, Math.hypot(x - a.x, y - a.y) / d0));
            f = p => ({ x: a.x + (p.x - a.x) * k, y: a.y + (p.y - a.y) * k });
          }
          const p1 = f({ x: act.box.x1, y: act.box.y1 }), p2 = f({ x: act.box.x2, y: act.box.y2 });
          sel.box = { x1: Math.min(p1.x, p2.x), y1: Math.min(p1.y, p2.y), x2: Math.max(p1.x, p2.x), y2: Math.max(p1.y, p2.y) };
          const set = new Set(sel.idx);
          o.set(act.before.map((s, i) => set.has(i) ? o.map(s, f, k) : s), null);
          o.repaint();
          return;
        }
        if (!poly) return;
        poly.push({ x, y });
        o.repaint();
      },
      up() {
        if (act) {
          const before = act.before; act = null;
          sel.box = box(sel.idx) || sel.box;
          o.set(o.list(), { before });
          o.repaint();
          return;
        }
        const p = poly; poly = null;
        if (p && p.length > 2) {
          const idx = [];
          o.list().forEach((s, i) => { const ps = o.pts(s); if (ps.length && ps.filter(q => inPoly(q.x, q.y, p)).length / ps.length >= 0.6) idx.push(i); });
          const b = idx.length ? box(idx) : null;
          sel = b ? { idx, box: b } : null;
        }
        o.repaint();
      },
      cancel() {
        if (act) { o.set(act.before, null); sel.box = act.box; act = null; }
        poly = null;
        o.repaint();
      },
      clear() { if (!sel && !poly) return; sel = null; poly = null; act = null; o.repaint(); },
      del() {
        if (!sel) return;
        const before = o.list().slice(), gone = new Set(sel.idx);
        sel = null;
        o.set(before.filter((_, i) => !gone.has(i)), { before });
        o.repaint();
      },
      // The lasso's line or the box, on a context drawing in page units × s.
      paint(ctx, s) {
        ctx.save();
        ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
        if (poly) {
          ctx.setLineDash([6, 5]); ctx.lineWidth = 1.6; ctx.strokeStyle = '#4A4AFF'; ctx.fillStyle = 'rgba(74,74,255,.07)';
          ctx.beginPath(); poly.forEach((q, i) => i ? ctx.lineTo(q.x * s, q.y * s) : ctx.moveTo(q.x * s, q.y * s));
          ctx.closePath(); ctx.fill(); ctx.stroke();
        }
        if (sel) {
          const b = sel.box, x1 = b.x1 * s - 6, y1 = b.y1 * s - 6, x2 = b.x2 * s + 6, y2 = b.y2 * s + 6;
          ctx.fillStyle = 'rgba(74,74,255,.06)'; ctx.fillRect(x1, y1, x2 - x1, y2 - y1);
          ctx.setLineDash([7, 5]); ctx.lineWidth = 1.6; ctx.strokeStyle = '#4A4AFF'; ctx.strokeRect(x1, y1, x2 - x1, y2 - y1);
          ctx.setLineDash([]);
          [[x1, y1], [x2, y1], [x2, y2], [x1, y2]].forEach(([x, y]) => { ctx.fillStyle = '#fff'; ctx.lineWidth = 2; ctx.beginPath(); ctx.rect(x - 6, y - 6, 12, 12); ctx.fill(); ctx.stroke(); });
          const dx = (x1 + x2) / 2, dy = y1 - 26;
          ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(dx, y1); ctx.lineTo(dx, dy + 14); ctx.stroke();
          ctx.fillStyle = '#E53935'; ctx.beginPath(); ctx.arc(dx, dy, 14, 0, Math.PI * 2); ctx.fill();
          ctx.strokeStyle = '#fff'; ctx.lineWidth = 2.4; ctx.lineCap = 'round';
          ctx.beginPath(); ctx.moveTo(dx - 5, dy - 5); ctx.lineTo(dx + 5, dy + 5); ctx.moveTo(dx + 5, dy - 5); ctx.lineTo(dx - 5, dy + 5); ctx.stroke();
        }
        ctx.restore();
      },
      cursor(x, y, u) { const h = hit(x, y, u); return h === 'del' ? 'pointer' : h === 'move' ? 'move' : h === 0 || h === 2 ? 'nwse-resize' : h === 1 || h === 3 ? 'nesw-resize' : 'crosshair'; }
    };
    return api;
  }

    return create;
  })();
  let inkLasso = null;
  function lassoCtl() {
    if (inkLasso) return inkLasso;
    const abs = k => { const o = inkOrigin.get(k.id) || { x: 0, y: 0 }, out = []; for (let i = 0; i < k.pts.length; i += 2) out.push({ x: k.pts[i] + o.x, y: k.pts[i + 1] + o.y }); return out; };
    inkLasso = makeLasso({
      list: () => inks,
      pts: abs,
      // Moved and resized in page coordinates, kept relative to the same passage.
      map: (k, f, m) => { const o = inkOrigin.get(k.id) || { x: 0, y: 0 }, p = []; abs(k).forEach(q => { const r = f(q); p.push(Math.round((r.x - o.x) * 10) / 10, Math.round((r.y - o.y) * 10) / 10); }); return { ...k, pts: p, size: Math.max(1, Math.min(40, Math.round(k.size * m * 10) / 10)) }; },
      half: k => k.size / 2,
      set: (list, done) => {
        inks = list;
        if (!done) return;
        pushInkHist(done.before);
        keepInks(done.before, list);
      },
      repaint: drawInks
    });
    return inkLasso;
  }
  // What changed between two versions of the page's strokes, to the database.
  function keepInks(before, after) {
    before.forEach(k => { if (!after.some(x => x.id === k.id)) send({ action: 'hl.inkDelete', id: k.id }); });
    after.forEach(k => { if (!before.includes(k)) send({ action: 'hl.inkSave', url: pageUrl(), info: pageInfo(), ink: k }); });
    renderBadge(); renderPanel();
  }
  let inks = [], inkOn = false, inkHidden = false, inkTool = 'pencil';
  let inkCv = null, inkBar = null, inkCur = null, inkRaf = 0;
  // Undo and redo, as in the Draw: every gesture (a stroke, an erase, a lasso
  // move) is a step — the strokes before and after it. Taking a step back or
  // forward writes the difference (keepInks). Kept while the bar is open.
  let inkHist = [], inkRedo = [];
  function pushInkHist(before) { inkHist.push({ before, after: inks.slice() }); if (inkHist.length > 80) inkHist.shift(); inkRedo = []; renderInkBar(); }
  const inkOrigin = new Map();   // ink id → { x, y } where its passage is now (page coordinates)
  const inkMissing = new Set();

  // A DOM range of [a, b) of the joined text.
  function rangeAt(ix, a, b) {
    const i = Math.max(0, lowerBound(ix.starts, a + 1) - 1), j = Math.max(0, lowerBound(ix.starts, b) - 1);
    const n1 = ix.nodes[i], n2 = ix.nodes[j];
    if (!n1 || !n2) return null;
    const r = document.createRange();
    r.setStart(n1, Math.min(n1.data.length, a - ix.starts[i]));
    r.setEnd(n2, Math.min(n2.data.length, b - ix.starts[j]));
    return r;
  }
  // The word under a point of the screen, as a range (null: no text there).
  function wordAt(x, y) {
    let node = null, off = 0;
    if (document.caretRangeFromPoint) { const r = document.caretRangeFromPoint(x, y); if (r) { node = r.startContainer; off = r.startOffset; } }
    else if (document.caretPositionFromPoint) { const p = document.caretPositionFromPoint(x, y); if (p) { node = p.offsetNode; off = p.offset; } }
    if (!node || node.nodeType !== 3 || !node.data.trim() || host.contains(node)) return null;
    let s = off, e = off;
    while (s > 0 && WORD.test(node.data[s - 1])) s--;
    while (e < node.data.length && WORD.test(node.data[e])) e++;
    if (e - s < 2) { s = Math.max(0, off - 12); e = Math.min(node.data.length, off + 12); }
    const r = document.createRange();
    r.setStart(node, s); r.setEnd(node, e);
    const b = r.getBoundingClientRect();
    if (!b.width && !b.height) return null;
    // Only text close to the stroke: a click far from any line isn't "on" it.
    if (Math.abs(b.top + b.height / 2 - y) > 120) return null;
    return r;
  }
  // Where a stroke goes: its anchor (a passage of text) and that passage's
  // top-left on the page now; the stroke's points are kept from there.
  function anchorFor(bb) {
    // The middle first (a circle around a word), then the corners.
    const pts = [[bb.x + bb.w / 2, bb.y + bb.h / 2], [bb.x, bb.y], [bb.x + bb.w, bb.y + bb.h], [bb.x, bb.y + bb.h / 2]];
    const ix = buildIndex();
    // The page's text under the stroke, not our own canvas on top of it.
    const pe = inkCv ? inkCv.style.pointerEvents : '';
    if (inkCv) inkCv.style.pointerEvents = 'none';
    try { return findAnchor(ix, pts); } finally { if (inkCv) inkCv.style.pointerEvents = pe; index = null; }
  }
  function findAnchor(ix, pts) {
    for (const [x, y] of pts) {
      const r = wordAt(x - scrollX, y - scrollY);
      if (!r) continue;
      const o = rangeOffsets(ix, r), an = o && anchorOf(ix, o);
      if (!an) continue;
      // The anchor's own passage (anchorOf may trim it): its place now.
      const loc = locate(ix, an.anchor), rr = loc && rangeAt(ix, loc.a, loc.b);
      const rect = (rr || r).getBoundingClientRect();
      return { anchor: an.anchor, ax: rect.left + scrollX, ay: rect.top + scrollY };
    }
    return { anchor: null, ax: 0, ay: 0 };
  }
  // Where each kept stroke's passage is now (done after loading, and again
  // when the page changes size or content).
  function placeInks() {
    inkOrigin.clear(); inkMissing.clear();
    const ix = buildIndex();
    for (const k of inks) {
      if (!k.anchor) { inkOrigin.set(k.id, { x: k.ax, y: k.ay }); continue; }
      const loc = locate(ix, k.anchor), r = loc && rangeAt(ix, loc.a, loc.b);
      const b = r && r.getBoundingClientRect();
      if (b && (b.width || b.height)) inkOrigin.set(k.id, { x: b.left + scrollX, y: b.top + scrollY });
      else { inkOrigin.set(k.id, { x: k.ax, y: k.ay }); inkMissing.add(k.id); }
    }
    index = null;
    drawInks();
  }

  function ensureInkCanvas() {
    mount();
    if (inkCv && inkCv.isConnected) return;
    inkCv = el('<canvas class="ink-cv"></canvas>');
    shadow.appendChild(inkCv);
    inkCv.addEventListener('pointerdown', inkDown);
    inkCv.addEventListener('contextmenu', e => { if (inkOn) e.preventDefault(); });   // the stylus's side button
    inkCv.addEventListener('pointermove', inkMove);
    inkCv.addEventListener('pointerup', inkUp);
    inkCv.addEventListener('pointercancel', inkUp);
    // Scrolling still moves the page underneath (the wheel isn't stopped).
  }
  function sizeCanvas() {
    const d = devicePixelRatio || 1;
    if (inkCv.width !== Math.round(innerWidth * d) || inkCv.height !== Math.round(innerHeight * d)) {
      inkCv.width = Math.round(innerWidth * d); inkCv.height = Math.round(innerHeight * d);
    }
    return d;
  }
  let hlScratch = null;
  function strokePath(ctx, k, ox, oy) {
    if (k.tool === 'highlight' && ctx.canvas === inkCv) {
      const c = hlScratch || (hlScratch = document.createElement('canvas')), d = devicePixelRatio || 1;
      if (c.width !== inkCv.width || c.height !== inkCv.height) { c.width = inkCv.width; c.height = inkCv.height; }
      const x = c.getContext('2d');
      x.setTransform(1, 0, 0, 1, 0, 0); x.clearRect(0, 0, c.width, c.height); x.setTransform(d, 0, 0, d, 0, 0);
      strokePath(x, { ...k, tool: 'pen' }, ox, oy);
      ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 0.35; ctx.drawImage(c, 0, 0); ctx.restore();
      return;
    }
    const p = k.pts;
    ctx.lineWidth = k.size; ctx.strokeStyle = k.color; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.globalAlpha = k.tool === 'highlight' ? 0.35 : 1;
    ctx.beginPath();
    if (k.tool === 'pencil' || k.tool === 'highlight' || k.tool === 'pen') {
      ctx.moveTo(p[0] + ox, p[1] + oy);
      if (p.length === 2) ctx.lineTo(p[0] + ox + 0.1, p[1] + oy);
      // "Natural" (raw): every point as it came, small loops kept; else smoothed.
      if (k.raw) for (let i = 2; i < p.length; i += 2) ctx.lineTo(p[i] + ox, p[i + 1] + oy);
      else {
        for (let i = 2; i < p.length - 2; i += 2) ctx.quadraticCurveTo(p[i] + ox, p[i + 1] + oy, (p[i] + p[i + 2]) / 2 + ox, (p[i + 1] + p[i + 3]) / 2 + oy);
        if (p.length >= 4) ctx.lineTo(p[p.length - 2] + ox, p[p.length - 1] + oy);
      }
    } else {
      const [x1, y1, x2, y2] = [p[0] + ox, p[1] + oy, p[2] + ox, p[3] + oy];
      if (k.tool === 'line') { ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); }
      else if (k.tool === 'rect') ctx.rect(Math.min(x1, x2), Math.min(y1, y2), Math.abs(x2 - x1), Math.abs(y2 - y1));
      else ctx.ellipse((x1 + x2) / 2, (y1 + y2) / 2, Math.abs(x2 - x1) / 2 || 1, Math.abs(y2 - y1) / 2 || 1, 0, 0, Math.PI * 2);
    }
    ctx.stroke();
    ctx.globalAlpha = 1;
  }
  function drawInks() {
    if (!enabled || (!inks.length && !inkOn && !inkCur)) { if (inkCv) inkCv.style.display = 'none'; return; }
    ensureInkCanvas();
    inkCv.style.display = inkHidden && !inkOn ? 'none' : 'block';
    const d = sizeCanvas(), ctx = inkCv.getContext('2d');
    ctx.setTransform(d, 0, 0, d, 0, 0);
    ctx.clearRect(0, 0, innerWidth, innerHeight);
    if (inkHidden && !inkOn) return;
    for (const k of inks) {
      const o = inkOrigin.get(k.id);
      if (o) strokePath(ctx, k, o.x - scrollX, o.y - scrollY);
    }
    if (inkCur && !inkCur.erase && !inkCur.lasso) strokePath(ctx, inkCur, -scrollX, -scrollY);
    if (inkLasso && inkOn && inkTool === 'lasso') { ctx.save(); ctx.translate(-scrollX, -scrollY); inkLasso.paint(ctx, 1); ctx.restore(); }
  }
  const redrawSoon = () => { if (!inkRaf) inkRaf = requestAnimationFrame(() => { inkRaf = 0; drawInks(); }); };

  // ─── drawing (page coordinates while drawing; relative once kept) ────────
  const pagePt = e => [e.clientX + scrollX, e.clientY + scrollY];
  // The stylus's own eraser — its tail, or the side button held — erases
  // whatever tool is picked, like the Caneta na tela.
  const penErases = e => e.pointerType === 'pen' && (e.button === 5 || e.button === 2 || (e.buttons & 34) !== 0);
  // As in the Draw: a pen seen a moment ago means the fingers on the glass are
  // the palm (ignored); two fingers scroll the page; only the pointer that
  // began a stroke draws it.
  const PALM_MS = 1200;
  let penAt = 0, pan = null;
  const touches = new Map();
  const palm = () => Date.now() - penAt < PALM_MS;
  const capture = e => { try { inkCv.setPointerCapture(e.pointerId); } catch (err) {} };
  function abortInk() {
    const k = inkCur; inkCur = null;
    if (!k) return;
    if (k.lasso) inkLasso.cancel();
    else if (k.erase) { if (!k.whole) eraseCommit(); if (inks.length !== k.before.length || inks.some((x, i) => x !== k.before[i])) pushInkHist(k.before); }
    redrawSoon();
  }
  function inkDown(e) {
    const rub = penErases(e);
    if (!inkOn || (e.button > 0 && !rub)) return;
    e.preventDefault(); e.stopPropagation();
    if (e.pointerType === 'pen') penAt = Date.now();
    if (e.pointerType === 'touch') {
      if (palm()) return;
      touches.set(e.pointerId, { x: e.clientX, y: e.clientY });
      capture(e);
      if (touches.size >= 2) { abortInk(); pan = centroid(); return; }
    } else capture(e);
    if (inkCur) return;   // a stroke is already under way, by another pointer
    const [x, y] = pagePt(e);
    closeInkPop();
    if (inkTool === 'lasso' && !rub) { lassoCtl().down(x, y, 1); inkCur = { lasso: true, pid: e.pointerId }; return; }
    if (inkTool === 'eraser' || rub) { inkCur = { erase: true, whole: inkOpts.eraserWhole, last: [x, y], pid: e.pointerId, before: inks.slice() }; eraseGone.clear(); eraseNew.clear(); eraseAt(x, y); return; }
    inkCur = { tool: inkTool, color: inkOpts.color[inkTool], size: inkOpts.size[inkTool], pts: [x, y], pid: e.pointerId, raw: inkTool === 'pencil' && inkOpts.pencilRaw };
    redrawSoon();
  }
  const centroid = () => { let x = 0, y = 0; touches.forEach(t => { x += t.x; y += t.y; }); return { x: x / touches.size, y: y / touches.size }; };
  function inkMove(e) {
    if (e.pointerType === 'pen') penAt = Date.now();
    if (e.pointerType === 'touch' && touches.has(e.pointerId)) {
      touches.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pan && touches.size >= 2) { const c = centroid(); scrollBy(pan.x - c.x, pan.y - c.y); pan = c; return; }
    }
    if (!inkCur) { if (inkOn && inkTool === 'lasso' && inkLasso && e.pointerType !== 'touch') { const [x, y] = pagePt(e); inkCv.style.cursor = inkLasso.cursor(x, y, 1) || toolCursor(); } return; }
    if (e.pointerId !== inkCur.pid) return;
    // A pen tablet that passes itself off as a mouse: no button pressed any
    // more means the stroke is over (else the dot of an "i" joins the stem).
    if (e.pointerType !== 'touch' && e.buttons === 0) { inkUp(e); return; }
    e.preventDefault();
    const [x, y] = pagePt(e);
    if (inkCur.lasso) { inkLasso.move(x, y); return; }
    if (inkCur.erase) {
      // A quick swipe: everything between this point and the last one too.
      const l = inkCur.last || [x, y], d = Math.hypot(x - l[0], y - l[1]), step = Math.max(3, inkOpts.size.eraser / 3);
      for (let t = step; t < d; t += step) eraseAt(l[0] + (x - l[0]) * t / d, l[1] + (y - l[1]) * t / d);
      eraseAt(x, y); inkCur.last = [x, y]; return;
    }
    // The highlighter's ruler: along the line it started on, like the Draw's.
    if (inkCur.tool === 'highlight' && inkOpts.hlStraight) inkCur.pts = [inkCur.pts[0], inkCur.pts[1], x, inkCur.pts[1]];
    else if (inkCur.tool === 'pencil' || inkCur.tool === 'highlight') {
      // A quick stroke: the points the browser grouped into this one event too.
      const evs = typeof e.getCoalescedEvents === 'function' ? e.getCoalescedEvents() : [];
      const p = inkCur.pts;
      for (const ev of (evs.length ? evs : [e])) {
        const [cx, cy] = pagePt(ev), n = p.length;
        if (Math.hypot(cx - p[n - 2], cy - p[n - 1]) >= (inkCur.raw ? 0.75 : 2)) p.push(cx, cy);
      }
    } else inkCur.pts = [inkCur.pts[0], inkCur.pts[1], x, y];
    redrawSoon();
  }
  async function inkUp(e) {
    if (e && e.pointerType === 'touch') { touches.delete(e.pointerId); if (touches.size < 2) pan = null; }
    if (!inkCur || (e && e.pointerId !== inkCur.pid)) return;
    // Taken over by the browser (palm, a gesture): what was drawn is let go.
    if (e && e.type === 'pointercancel') { abortInk(); return; }
    const k = inkCur; inkCur = null;
    if (k.lasso) { inkLasso.up(); return; }
    if (k.erase) {
      if (!k.whole) eraseCommit();
      if (inks.length !== k.before.length || inks.some((x, i) => x !== k.before[i])) pushInkHist(k.before);
      return;
    }
    let p = k.pts;
    // A ruler stroke: points along it, so the eraser can cut it anywhere.
    if (k.tool === 'highlight' && p.length === 4) {
      const n = Math.max(1, Math.round(Math.hypot(p[2] - p[0], p[3] - p[1]) / 6)), q = [];
      for (let i = 0; i <= n; i++) q.push(p[0] + (p[2] - p[0]) * i / n, p[1] + (p[3] - p[1]) * i / n);
      p = q;
    }
    if (k.tool !== 'pencil' && k.tool !== 'highlight' && (p.length < 4 || Math.hypot(p[2] - p[0], p[3] - p[1]) < 4)) { redrawSoon(); return; }
    let x1 = Infinity, y1 = Infinity, x2 = -Infinity, y2 = -Infinity;
    for (let i = 0; i < p.length; i += 2) { x1 = Math.min(x1, p[i]); x2 = Math.max(x2, p[i]); y1 = Math.min(y1, p[i + 1]); y2 = Math.max(y2, p[i + 1]); }
    const at = anchorFor({ x: x1, y: y1, w: x2 - x1, h: y2 - y1 });
    const ink = { id: uid(), tool: k.tool, color: k.color, size: k.size, pts: p.map((v, i) => Math.round((v - (i % 2 ? at.ay : at.ax)) * 10) / 10), anchor: at.anchor, ax: at.ax, ay: at.ay, dw: document.documentElement.scrollWidth, ...(k.raw ? { raw: true } : {}) };
    const before = inks.slice();
    inks.push(ink);
    inkOrigin.set(ink.id, { x: at.ax, y: at.ay });
    pushInkHist(before);
    drawInks(); renderBadge(); renderPanel();
    const r = await send({ action: 'hl.inkSave', url: pageUrl(), info: pageInfo(), ink });
    if (!r || !r.ok) { inks = inks.filter(x => x.id !== ink.id); inkHist = inkHist.filter(h => !h.after.includes(ink)); drawInks(); renderInkBar(); if (r && r.error === 'account') accountAsk(false); else toast(tr('saveFail')); return; }
    page = r.page || page;
    if (r.trial) accountAsk(true);
  }
  // The eraser takes whole strokes: any it passes over.
  function nearSeg(px, py, ax, ay, bx, by) {
    const dx = bx - ax, dy = by - ay, l = dx * dx + dy * dy;
    const t = l ? Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / l)) : 0;
    return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
  }
  function hits(k, x, y) {
    const o = inkOrigin.get(k.id); if (!o) return false;
    const p = k.pts, X = x - o.x, Y = y - o.y, tol = 8 + k.size / 2;
    if (k.tool === 'pencil' || k.tool === 'highlight') {
      for (let i = 0; i < p.length - 2; i += 2) if (nearSeg(X, Y, p[i], p[i + 1], p[i + 2], p[i + 3]) < tol) return true;
      return p.length === 2 && Math.hypot(X - p[0], Y - p[1]) < tol;
    }
    const [x1, y1, x2, y2] = p;
    if (k.tool === 'line') return nearSeg(X, Y, x1, y1, x2, y2) < tol;
    const l = Math.min(x1, x2), r = Math.max(x1, x2), t = Math.min(y1, y2), b = Math.max(y1, y2);
    if (k.tool === 'rect') return [nearSeg(X, Y, l, t, r, t), nearSeg(X, Y, r, t, r, b), nearSeg(X, Y, r, b, l, b), nearSeg(X, Y, l, b, l, t)].some(dd => dd < tol);
    const cx = (l + r) / 2, cy = (t + b) / 2, rx = (r - l) / 2 || 1, ry = (b - t) / 2 || 1;
    return Math.abs(Math.hypot((X - cx) / rx, (Y - cy) / ry) - 1) * Math.min(rx, ry) < tol;
  }
  // "Só onde passa": a freehand stroke the eraser crosses is cut there — what
  // is left becomes strokes of their own, on the same passage (so they keep
  // its anchor); a shape it touches goes whole. Kept when the finger lifts.
  const eraseGone = new Set(), eraseNew = new Map();
  function eraseParts(x, y) {
    const r = inkOpts.size.eraser / 2;
    let changed = false;
    for (const k of inks.slice()) {
      const o = inkOrigin.get(k.id);
      if (!o) continue;
      if (k.tool !== 'pencil' && k.tool !== 'highlight') {
        if (!hits(k, x, y)) continue;
        removeInk(k); changed = true; continue;
      }
      const p = k.pts, X = x - o.x, Y = y - o.y, tol = r + k.size / 2;
      const keep = [];
      let cut = false;
      for (let i = 0; i < p.length; i += 2) {
        const out = Math.hypot(p[i] - X, p[i + 1] - Y) < tol;
        if (out) cut = true;
        keep.push(!out);
      }
      if (!cut) continue;
      removeInk(k); changed = true;
      let run = [];
      const flush = () => { if (run.length >= 4) addPiece(k, run, o); run = []; };
      keep.forEach((ok, n) => { if (ok) run.push(p[2 * n], p[2 * n + 1]); else flush(); });
      flush();
    }
    if (changed) { drawInks(); renderBadge(); renderPanel(); }
  }
  function removeInk(k) {
    inks = inks.filter(x => x !== k);
    if (eraseNew.has(k.id)) eraseNew.delete(k.id); else eraseGone.add(k.id);
  }
  function addPiece(k, pts, o) {
    const n = { ...k, id: uid(), pts };
    inks.push(n); inkOrigin.set(n.id, o); eraseNew.set(n.id, n);
  }
  function eraseCommit() {
    eraseGone.forEach(id => send({ action: 'hl.inkDelete', id }));
    eraseNew.forEach(ink => send({ action: 'hl.inkSave', url: pageUrl(), info: pageInfo(), ink }));
    eraseGone.clear(); eraseNew.clear();
  }
  function eraseAt(x, y) {
    if (inkCur && inkCur.erase && !inkCur.whole) return eraseParts(x, y);
    const gone = inks.filter(k => hits(k, x, y));
    if (!gone.length) return;
    inks = inks.filter(k => !gone.includes(k));
    gone.forEach(k => send({ action: 'hl.inkDelete', id: k.id }));
    drawInks(); renderBadge(); renderPanel();
  }
  // Undo and redo, while the bar is open (a stroke, an erase, a lasso move).
  function inkStep(back) {
    const h = (back ? inkHist : inkRedo).pop();
    if (!h) return;
    (back ? inkRedo : inkHist).push(h);
    const now = inks; inks = (back ? h.before : h.after).slice();
    if (inkLasso) inkLasso.clear();
    keepInks(now, inks);
    placeInks();   // a stroke that comes back goes where its passage is now
    renderInkBar();
  }
  const inkUndo = () => inkStep(true), inkRedoStep = () => inkStep(false);

  // The pointer shows the tip: its size and colour (a ring for the highlighter
  // and the eraser), like the Draw's — as a CSS cursor image.
  function toolCursor() {
    if (inkTool === 'lasso') return 'crosshair';
    const er = inkTool === 'eraser', hl = inkTool === 'highlight';
    const sz = Math.max(4, Math.min(64, inkOpts.size[inkTool] || 4)), n = Math.ceil(sz + 6), c = document.createElement('canvas');
    c.width = c.height = n;
    const x = c.getContext('2d'), m = n / 2;
    x.beginPath(); x.arc(m, m, sz / 2, 0, Math.PI * 2);
    if (er) { x.setLineDash([3, 2]); x.lineWidth = 1.5; x.strokeStyle = '#555'; x.fillStyle = 'rgba(255,255,255,.55)'; x.fill(); x.stroke(); }
    else if (hl) { x.globalAlpha = .45; x.fillStyle = inkOpts.color.highlight; x.fill(); x.globalAlpha = 1; x.lineWidth = 1; x.strokeStyle = 'rgba(0,0,0,.35)'; x.stroke(); }
    else { x.fillStyle = inkOpts.color[inkTool] || '#e53935'; x.fill(); x.lineWidth = 1; x.strokeStyle = 'rgba(255,255,255,.9)'; x.stroke(); }
    return `url(${c.toDataURL()}) ${Math.round(m)} ${Math.round(m)}, crosshair`;
  }
  const paintCursor = () => { if (inkCv && inkOn) inkCv.style.cursor = toolCursor(); };
  // A colour picked: on the tool in hand, and among the last three custom ones.
  function pickColor(c) {
    if (!/^#[0-9a-f]{6}$/i.test(c) || inkTool === 'eraser' || inkTool === 'lasso') return;
    inkOpts.color[inkTool] = c;
    if (!INK_COLORS.includes(c)) inkOpts.recent = [c, ...inkOpts.recent.filter(x => x !== c)].slice(0, 3);
    saveInkOpts(); renderInkBar(); paintCursor();
  }
  // The Draw's shortcuts, for the same tools (Alt+letter; the Draw's own keys
  // stand back while this bar is open — content.js, __bnHlInkOn).
  const INK_KEYS = { KeyS: 'pencil', KeyD: 'highlight', KeyF: 'line', KeyG: 'rect', KeyH: 'circle', KeyL: 'eraser', KeyR: 'lasso' };
  const INK_KEY_OF = { pencil: 'S', highlight: 'D', line: 'F', rect: 'G', circle: 'H', eraser: 'L', lasso: 'R' };
  function setInkTool(t) {
    if (t === inkTool) return;
    inkTool = t; closeInkPop();
    if (inkLasso) inkLasso.clear();
    renderInkBar(); paintCursor(); drawInks();
  }
  function inkSize(d) {
    if (inkTool === 'lasso') return;
    const max = inkTool === 'eraser' ? 80 : inkTool === 'highlight' ? 40 : 20;
    inkOpts.size[inkTool] = Math.max(1, Math.min(max, (inkOpts.size[inkTool] || 3) + d));
    saveInkOpts(); paintCursor(); toast(tr('inkSize') + ': ' + inkOpts.size[inkTool], 1200);
  }

  // ─── the small bar ───────────────────────────────────────────────────────
  const INK_IC = {
    pencil: '<path d="M4 20l4-1 11-11-3-3L5 16z"/><path d="M14 6l3 3"/>',
    highlight: '<path d="m9 11-6 6v3h9l3-3"/><path d="m22 12-4.6 4.6a2 2 0 0 1-2.8 0l-5.2-5.2a2 2 0 0 1 0-2.8L14 4"/>',
    line: '<path d="M5 19 19 5"/>', rect: '<rect x="4" y="6" width="16" height="12" rx="1"/>', circle: '<circle cx="12" cy="12" r="8"/>',
    eraser: '<path d="M20 20H8l-5-5 10-10 8 8-6 6"/><path d="m7 10 8 8"/>',
    lasso: '<path d="M7 22a5 5 0 0 1-2-4"/><path d="M3.3 14A6.8 6.8 0 0 1 2 10c0-4.4 4.5-8 10-8s10 3.6 10 8-4.5 8-10 8a12 12 0 0 1-5-1"/><circle cx="5" cy="16" r="2"/>', undo: '<path d="M9 14 4 9l5-5"/><path d="M4 9h11a5 5 0 0 1 0 10h-3"/>',
    redo: '<path d="m15 14 5-5-5-5"/><path d="M20 9H9a5 5 0 0 0 0 10h3"/>'
  };
  function renderInkBar() {
    if (!inkBar) return;
    // The brand on the left, as on the Draw's bar: whose these drawings are.
    let logo = '';
    try { logo = chrome.runtime.getURL('icons/icon128.png'); } catch (e) {}
    inkBar.innerHTML = `<span class="ink-brand">${logo ? `<img src="${esc(logo)}" alt="">` : ''}<span><b>GooHighlights</b><small>${esc(tr('inkTitle'))}</small></span></span>
      ${IS_EXT ? `<button class="ib" data-a="home" title="${esc(tr('home'))}">${svg(IC.home)}</button>` : ''}
      <span class="sep"></span>
      ${['pencil', 'highlight', 'line', 'rect', 'circle', 'eraser', 'lasso'].map(t => `<button class="ib${inkTool === t ? ' on' : ''}" data-t="${t}" title="${esc(tr('ink.' + t))} [Alt+${INK_KEY_OF[t]}]">${svg(INK_IC[t])}</button>`).join('')}
      <span class="sep"></span>
      ${inkTool === 'eraser' || inkTool === 'lasso' ? '' : `${INK_COLORS.concat(inkOpts.recent.filter(c => !INK_COLORS.includes(c))).map(c => `<button class="dot${inkOpts.color[inkTool] === c ? ' on' : ''}" data-ic="${c}" style="background:${c}"></button>`).join('')}
        <label class="pick" title="${esc(tr('inkPick'))}"><input type="color" value="${esc(/^#[0-9a-f]{6}$/i.test(inkOpts.color[inkTool]) ? inkOpts.color[inkTool] : '#e53935')}"><span>+</span></label>
      <span class="sep"></span>`}
      <button class="ib" data-a="undo" title="${esc(tr('inkUndo'))} (Ctrl+Z · Alt+C)"${inkHist.length ? '' : ' disabled'}>${svg(INK_IC.undo)}</button>
      <button class="ib" data-a="redo" title="${esc(tr('inkRedo'))} (Ctrl+Y · Alt+V)"${inkRedo.length ? '' : ' disabled'}>${svg(INK_IC.redo)}</button>
      <button class="done" data-a="done">${esc(tr('inkDone'))}</button>`;
  }
  // Clear of what sits at the foot of the page: the Draw's answer bar (the
  // TEC shortcuts, #__pd_sc__) and the Draw's bar docked at the bottom — the
  // hand-annotation bar goes just above them, and follows them.
  let inkFitTimer = 0;
  function fitInkBar() {
    if (!inkBar) { clearInterval(inkFitTimer); inkFitTimer = 0; return; }
    const ib = inkBar.getBoundingClientRect();
    let bottom = 22;
    ['__pd_sc__', '__pd_tb__'].forEach(id => {
      const e = document.getElementById(id);
      if (!e || !e.getClientRects().length || getComputedStyle(e).display === 'none' || getComputedStyle(e).visibility === 'hidden') return;
      const r = e.getBoundingClientRect();
      // Only what is down there and under the bar's width.
      if (!r.width || r.top < innerHeight * .5 || r.right < ib.left || r.left > ib.right) return;
      bottom = Math.max(bottom, Math.ceil(innerHeight - r.top) + 12);
    });
    const v = bottom + 'px';
    if (inkBar.style.bottom !== v) inkBar.style.bottom = v;
  }
  function startInk() {
    if (!enabled) return;
    appDrawing(true);
    closeBar(); closePop();
    try { getSelection().removeAllRanges(); } catch (e) {}
    inkOn = true; inkHidden = false; window.__bnHlInkOn = true;
    inkHist = []; inkRedo = [];
    ensureInkCanvas();
    inkCv.classList.add('on');
    if (!inkBar) {
      inkBar = el('<div class="ink-bar" role="toolbar"></div>');
      shadow.appendChild(inkBar);
      // Too wide for the window: the mouse wheel scrolls it sideways.
      inkBar.addEventListener('wheel', e => {
        if (inkBar.scrollWidth <= inkBar.clientWidth || Math.abs(e.deltaX) > Math.abs(e.deltaY)) return;
        e.preventDefault(); inkBar.scrollLeft += e.deltaY;
      }, { passive: false });
      inkBar.addEventListener('click', e => {
        const b = e.target.closest('button'); if (!b) return;
        if (b.dataset.t) {
          // The tool already in hand: its colour, thickness and options.
          if (b.dataset.t === inkTool) { if (inkTool !== 'lasso') inkPop ? closeInkPop() : openInkPop(); return; }
          setInkTool(b.dataset.t);
        } else if (b.dataset.ic) { pickColor(b.dataset.ic); }
        else if (b.dataset.a === 'undo') inkUndo();
        else if (b.dataset.a === 'redo') inkRedoStep();
        else if (b.dataset.a === 'done') return stopInk();
        else if (b.dataset.a === 'home') { stopInk(); return goHome(); }
        renderInkBar();
      });
    }
    // The colour picker in the bar (an <input type=color> inside the label).
    inkBar.addEventListener('input', e => { if (e.target.type === 'color') pickColor(e.target.value); });
    renderInkBar(); paintCursor();
    drawInks(); renderPanel(); renderBadge();
    fitInkBar(); clearInterval(inkFitTimer); inkFitTimer = setInterval(fitInkBar, 400);
    toast(tr('inkHint'));
  }
  // In the Android app, "pull down to reload" (MainActivity) must stand back
  // while drawing — or a quick downward stroke is taken from the page as a
  // pull, cut short, and the page reloads. The Draw's bar tells the app the
  // same way (setDrawTool).
  function appDrawing(on) {
    if (!TOUCH) return;
    try { window.AndroidBridge.setDrawTool(on ? 'pencil' : 'pointer'); } catch (e) {}
  }
  // ─── a tool's options (a second tap on it) ──────────────────────────────
  let inkPop = null;
  function saveInkOpts() { save({ hlInkOpts: inkOpts }); }
  function closeInkPop() { if (inkPop) { inkPop.remove(); inkPop = null; } }
  function openInkPop() {
    closeInkPop();
    const tst = shadow.querySelector('.toast'); if (tst) tst.classList.remove('show');
    const t = inkTool, er = t === 'eraser';
    inkPop = el(`<div class="ink-pop" role="dialog">
      <div class="ip-h">${svg(INK_IC[t], 16)}<b>${esc(tr('ink.' + t).split(' (')[0])}</b><button class="ib" data-a="x">${svg(IC.close, 15)}</button></div>
      ${er ? '' : `<div class="ip-l">${esc(tr('inkColor'))}</div><div class="ip-colors">${(t === 'highlight' ? INK_PALETTE.filter(c => c !== '#1a1a2e') : INK_PALETTE).map(c => `<button class="sw${inkOpts.color[t] === c ? ' on' : ''}" data-c="${c}" style="background:${c}"></button>`).join('')}</div>`}
      <div class="ip-l">${esc(tr(er ? 'inkEraserSize' : 'inkSize'))} <span class="ip-v">${inkOpts.size[t]}</span></div>
      <div class="ip-size"><input type="range" min="${er ? 8 : 1}" max="${er ? 80 : t === 'highlight' ? 40 : 20}" value="${inkOpts.size[t]}"><i class="ip-prev"></i></div>
      ${t === 'highlight' ? `<div class="ip-seg"><button data-o="straight" class="${inkOpts.hlStraight ? 'on' : ''}">${esc(tr('inkRuler'))}</button><button data-o="free" class="${inkOpts.hlStraight ? '' : 'on'}">${esc(tr('inkFree'))}</button></div>` : ''}
      ${t === 'pencil' ? `<div class="ip-seg"><button data-o="smooth" class="${inkOpts.pencilRaw ? '' : 'on'}">${esc(tr('inkSmooth'))}</button><button data-o="natural" class="${inkOpts.pencilRaw ? 'on' : ''}">${esc(tr('inkNatural'))}</button></div>` : ''}
      ${er ? `<div class="ip-seg col"><button data-o="whole" class="${inkOpts.eraserWhole ? 'on' : ''}">${esc(tr('inkWhole'))}</button><button data-o="part" class="${inkOpts.eraserWhole ? '' : 'on'}">${esc(tr('inkPart'))}</button></div>` : ''}
    </div>`);
    shadow.appendChild(inkPop);
    const range = inkPop.querySelector('input'), prev = inkPop.querySelector('.ip-prev');
    const paint = () => {
      const v = +range.value, c = er ? '#9a9ab4' : inkOpts.color[t];
      prev.style.cssText = `width:${Math.max(4, v)}px;height:${Math.max(4, v)}px;background:${c};opacity:${t === 'highlight' ? .45 : 1};${er ? 'border:2px dashed #9a9ab4;background:transparent' : ''}`;
      inkPop.querySelector('.ip-v').textContent = v;
    };
    paint();
    range.addEventListener('input', () => { inkOpts.size[t] = +range.value; paint(); paintCursor(); });
    range.addEventListener('change', saveInkOpts);
    inkPop.addEventListener('click', e => {
      const b = e.target.closest('button'); if (!b) return;
      if (b.dataset.a === 'x') return closeInkPop();
      if (b.dataset.c) { inkOpts.color[t] = b.dataset.c; inkPop.querySelectorAll('.sw').forEach(x => x.classList.toggle('on', x === b)); paint(); renderInkBar(); paintCursor(); }
      if (b.dataset.o) {
        if (b.dataset.o === 'free' || b.dataset.o === 'straight') inkOpts.hlStraight = b.dataset.o === 'straight';
        else if (b.dataset.o === 'smooth' || b.dataset.o === 'natural') inkOpts.pencilRaw = b.dataset.o === 'natural';
        else inkOpts.eraserWhole = b.dataset.o === 'whole';
        inkPop.querySelectorAll('[data-o]').forEach(x => x.classList.toggle('on', x === b));
      }
      saveInkOpts();
    });
    ['pointerdown', 'mousedown', 'touchstart'].forEach(k => inkPop.addEventListener(k, e => e.stopPropagation()));
  }

  function stopInk() {
    clearInterval(inkFitTimer); inkFitTimer = 0;
    closeInkPop();
    appDrawing(false);
    inkOn = false; inkCur = null; inkHist = []; inkRedo = []; window.__bnHlInkOn = false;
    touches.clear(); pan = null;
    if (inkLasso) { inkLasso.clear(); inkLasso = null; }
    if (inkCv) inkCv.style.cursor = '';
    if (inkCv) inkCv.classList.remove('on');
    if (inkBar) { inkBar.remove(); inkBar = null; }
    drawInks(); renderPanel(); renderBadge();
  }
  function toggleInkHidden() { inkHidden = !inkHidden; drawInks(); renderPanel(); }
  addEventListener('scroll', redrawSoon, { signal: __ac.signal, passive: true, capture: true });
  let inkResize = 0;
  addEventListener('resize', () => { clearTimeout(inkResize); inkResize = setTimeout(placeInks, 200); }, SIG);

  // ─── PREFERENCES ──────────────────────────────────────────────────────────
  // hlOn: the menu on a selection · hlQuick: the quick highlighter · hlColor:
  // the last colour · hlOff: sites where all of this is off.
  function save(obj) { try { chrome.storage.local.set(obj); } catch (e) {} }
  function toggleQuick() {
    prefs.quick = !prefs.quick;
    save({ hlQuick: prefs.quick });
    toast(tr(prefs.quick ? 'quickOn' : 'quickOff'));
    renderQuick();
  }
  // While the quick highlighter is on, a pill says so — and turns it off.
  let quickPill = null;
  function renderQuick() {
    const show = enabled && prefs.on && prefs.quick;
    if (!show) { if (quickPill) { quickPill.remove(); quickPill = null; } return; }
    mount();
    if (!quickPill) {
      quickPill = el(`<div class="quick" role="status"><i class="q-dot"></i><span>${esc(tr('quickPill'))} <kbd>Alt+Q</kbd></span><button>${esc(tr('quickOffBtn'))}</button></div>`);
      quickPill.querySelector('button').addEventListener('click', () => { if (prefs.quick) toggleQuick(); });
      quickPill.addEventListener('mousedown', e => e.preventDefault());
      shadow.appendChild(quickPill);
    }
  }
  // The invitation to turn the menu on for every site: until it's on, or for
  // two weeks after "Agora não".
  let hasAccess = null, nudgeUntil = 0;
  const nudgeWanted = () => hasAccess === false && Date.now() > nudgeUntil;
  // Sending to a topic was the Notes inside the extension; the Notes is the
  // site's now (21/10/2026), so the topic actions stay off here.
  const notesOk = false;
  function readPrefs(p) {
    if (typeof p.hlOn === 'boolean') prefs.on = p.hlOn;
    if (typeof p.hlQuick === 'boolean') prefs.quick = p.hlQuick;
    if (typeof p.hlNudgeUntil === 'number') nudgeUntil = p.hlNudgeUntil;
    if (COLORS[p.hlColor]) prefs.color = p.hlColor;
    if (Array.isArray(p.hlOff)) prefs.off = p.hlOff;
    if (Array.isArray(p.hlIntroOff)) prefs.introOff = p.hlIntroOff;
    if (p.hlTourDone === true) prefs.tourDone = true;
    if (['light', 'dark', 'auto'].includes(p.pdTheme)) prefs.theme = p.pdTheme;
    if (p.hlInkOpts) readInkOpts(p.hlInkOpts);
    if (typeof p.hlNotesHidden === 'boolean') notesHidden = p.hlNotesHidden;
    if (typeof p.hlDockHide === 'boolean') prefs.dockHide = p.hlDockHide;
    if ('bnNotesAccess' in p) cardAccess = p.bnNotesAccess === true;
  }
  function setEnabled(on) {
    if (on === enabled) return;
    enabled = on;
    if (on) load();
    else { unpaintAll(); closeBar(); closePop(); closePanel(); renderBadge(); if (inkOn) stopInk(); drawInks(); }
    renderQuick();
  }

  // ─── CADERNO DE ERROS ─────────────────────────────────────────────────────
  // A piece of the page — the question just missed — cropped (here: the
  // dock's button or Alt+Shift+B; or the Draw's own area capture, content.js)
  // and filed in a folder or subfolder of the caderno de erros, with a note
  // and the page's address. It lives with the marks (db.js errshots, synced
  // by hl-sync.js) and is seen in Minhas marcações.
  const ERR_LAST = 'hlErrLast';
  let errBox = null, selBox = null;
  // The Draw's bars sit at the top z-index: while the crop or the card is out,
  // our layer goes there too (later in the document, so it wins the tie).
  const raise = on => { host.style.zIndex = on ? '2147483647' : '2147483646'; if (on) document.documentElement.appendChild(host); };
  const later = () => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(() => setTimeout(r, 30))));
  const drawRoot = () => document.getElementById('__pd_root__');

  // The person drags the area; then the screen is read without our own UI.
  function errCrop() {
    if (selBox || !enabled) return;
    closeBar(); closePop();
    mount();
    raise(true);
    selBox = el(`<div class="sel"><div class="hint">${esc(tr('errHint'))}</div></div>`);
    shadow.appendChild(selBox);
    let x0 = 0, y0 = 0, r = null;
    const box = el('<div class="r"></div>');
    const end = () => { if (selBox) { selBox.remove(); selBox = null; } if (!errBox) raise(false); removeEventListener('keydown', esc_, true); };
    const esc_ = e => { if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); end(); } };
    addEventListener('keydown', esc_, SIGC);
    selBox.addEventListener('pointerdown', e => {
      e.preventDefault();
      x0 = e.clientX; y0 = e.clientY;
      try { selBox.setPointerCapture(e.pointerId); } catch (_) {}
      selBox.appendChild(box);
      r = { x: x0, y: y0, w: 0, h: 0 };
      Object.assign(box.style, { left: x0 + 'px', top: y0 + 'px', width: '0px', height: '0px' });
    });
    selBox.addEventListener('pointermove', e => {
      if (!r) return;
      r = { x: Math.min(x0, e.clientX), y: Math.min(y0, e.clientY), w: Math.abs(e.clientX - x0), h: Math.abs(e.clientY - y0) };
      Object.assign(box.style, { left: r.x + 'px', top: r.y + 'px', width: r.w + 'px', height: r.h + 'px' });
    });
    selBox.addEventListener('pointerup', async () => {
      const rect = r; end();
      if (!rect || rect.w < 8 || rect.h < 8) return;
      const shot = await grab(rect);
      if (shot) {
        send({ action: 'cloud.saveScreenshot', shot: { url: pageUrl(), title: document.title || 'Recorte de Questão', imageDataUrl: shot, isErrorNotebook: true } }).catch(() => {});
        capOffer(shot, rect.w, rect.h, { own: true });
      }
      // The browser wants the permission for every address (asked on hl.html).
      else if (capPerm && !TOUCH) toastAction(tr('errCapPerm'), tr('errCapAllow'), () => send({ action: 'hl.openAccess' }));
      else toast(tr('errCapFail'));
    });
  }
  // The area as a PNG data URL with what is drawn on the page — the Draw's
  // strokes and text, this page's hand annotations — and without the floating
  // UI around it (ours, the Draw's panels and cursor; as content.js's own
  // capture, CAPTURE_HIDE). The Draw's toolbar can't be inside the area.
  // capPerm: the last one failed for want of the "every address" permission.
  let capPerm = false;
  const DRAW_UI = '#__pd_cur__,#__pd_sel__,#__pd_sc__,#__pd_cfg__,#__pd_help__,#__pd_social__,#__pd_tp__,#__pd_news__,#__pd_toast__,#__pd_notes__';
  async function grab(rect) {
    const hide = [host, ...document.querySelectorAll(DRAW_UI)], was = hide.map(n => n.style.visibility);
    hide.forEach(n => { n.style.visibility = 'hidden'; });
    // The annotations' canvas lives in our (hidden) layer: it alone shows.
    const inkWas = inkCv ? inkCv.style.visibility : null;
    if (inkCv) inkCv.style.visibility = 'visible';
    await later();
    try {
      if (TOUCH) return await new Promise(resolve => {
        const dpr = devicePixelRatio || 1;
        const t = setTimeout(() => { window.__bnErrShot = null; resolve(null); }, 6000);
        window.__bnErrShot = d => { clearTimeout(t); window.__bnErrShot = null; resolve(d || null); };
        try { window.AndroidBridge.captureShot(Math.round(rect.x * dpr), Math.round(rect.y * dpr), Math.round(rect.w * dpr), Math.round(rect.h * dpr)); }
        catch (e) { clearTimeout(t); resolve(null); }
      });
      const res = await send({ action: 'captureTab' });
      capPerm = !!(res && res.perm);
      if (!res || !res.dataUrl) return null;
      const img = new Image();
      await new Promise((ok, bad) => { img.onload = ok; img.onerror = bad; img.src = res.dataUrl; });
      const k = img.naturalWidth / innerWidth;
      const c = document.createElement('canvas');
      c.width = Math.max(1, Math.round(rect.w * k)); c.height = Math.max(1, Math.round(rect.h * k));
      c.getContext('2d').drawImage(img, Math.round(rect.x * k), Math.round(rect.y * k), c.width, c.height, 0, 0, c.width, c.height);
      return c.toDataURL('image/png');
    } catch (e) { return null; }
    finally { hide.forEach((n, i) => { n.style.visibility = was[i]; }); if (inkCv) inkCv.style.visibility = inkWas || ''; }
  }

  // ─── "CAPTURA PARCIAL": the cockpit's sheet (notes/capture.js) ─────────
  // After a crop — the Draw's area capture (content.js) or ours — the same
  // choices as in a notebook of the Notes: a flashcard with the capture on
  // the front or on the back, the topic's notes, the caderno de erros, copy, download. The
  // flashcard and the notes go to the account, only for whoever has the
  // Notes (cardAccess); everyone else gets the caderno de erros. The
  // flashcard is offered to everyone (the free account keeps flashcards;
  // without one, .cap-acc says so first).
  let capBox = null;
  function closeCap() { if (capBox) { capBox.remove(); capBox = null; } if (!selBox && !errBox && !cardBox) raise(false); }
  async function capOffer(dataUrl, w, h, opts) {
    opts = opts || {};
    closeCap(); closeBar(); closePop();
    mount(); fcFont();
    // Ours goes to the clipboard here (the Draw's capture already did it).
    let copied = !!opts.copied;
    if (!copied && opts.own) copied = await copyImage(dataUrl);
    const tile = (k, icon, label, sub) => `<button type="button" class="cap-opt" data-k="${k}">${svg(icon, 20)}<span><b>${esc(tr(label))}</b><small>${esc(tr(sub))}</small></span></button>`;
    capBox = el(`<div class="fcm cap" role="dialog" aria-modal="true" aria-label="${esc(tr('capTitle'))}">
      <div class="fcm-dlg" style="max-width:440px">
        <div class="fcm-hdr"><h2>${esc(tr('capTitle'))}</h2><button type="button" class="fcm-x" data-x title="${esc(tr('close'))}">${svg(IC.close, 18)}</button></div>
        <div class="fcm-body">
          <div class="cap-img"><img alt=""></div>
          ${copied ? `<p class="cap-copied">${svg(IC.check, 14)}<span>${esc(tr('capCopied'))}</span></p>` : ''}
          <div class="cap-acc" hidden><span>${esc(tr('capAcc'))}</span><button type="button" class="bn-btn primary small">${esc(tr('accSignup'))}</button></div>
          <div class="cap-opts">
            ${tile('card', IC.card, 'capCard', 'capCardSub')}${tile('cardBack', IC.card, 'capCardBack', 'capCardBackSub')}${cardAccess ? tile('notes', IC.note, 'capNotes', 'capNotesSub') : ''}
            ${tile('err', IC.target, 'capErr', 'capErrSub')}
            ${copied ? '' : tile('copy', IC.copy, 'capCopy', 'capCopySub')}
            ${tile('dl', IC.download, 'capDl', 'capDlSub')}
          </div>
          <div class="cap-topics" hidden></div>
        </div>
        <div class="fcm-actions"><button type="button" class="bn-btn" data-x>${esc(tr('close'))}</button></div>
      </div>
    </div>`);
    raise(true);
    shadow.appendChild(capBox);
    const root = capBox, $ = q => root.querySelector(q);
    $('.cap-img img').src = dataUrl;
    requestAnimationFrame(() => root.classList.add('show'));
    // The Draw keeps nothing — but what a capture becomes here (a flashcard, the
    // caderno de erros) is kept, in the account: without one, say so first.
    send({ action: 'hl.status' }).then(st => {
      if (!st || st.user || capBox !== root) return;
      const a = $('.cap-acc');
      a.hidden = false;
      a.querySelector('button').addEventListener('click', () => { closeCap(); accountAsk(false); });
    });
    ['keydown', 'keyup', 'keypress'].forEach(k => root.addEventListener(k, e => { e.stopPropagation(); if (e.type === 'keydown' && e.key === 'Escape') closeCap(); }));
    root.addEventListener('mousedown', e => { if (e.target === root) closeCap(); });
    root.querySelectorAll('[data-x]').forEach(b => b.addEventListener('click', closeCap));
    root.querySelector('.cap-opts').addEventListener('click', async e => {
      const b = e.target.closest('[data-k]'); if (!b) return;
      const k = b.dataset.k;
      if (k === 'card' || k === 'cardBack') { closeCap(); cardOffer('', null, dataUrl, k === 'cardBack'); }
      else if (k === 'err') { closeCap(); errOffer(dataUrl, w, h, {}); }
      else if (k === 'copy') { if (await copyImage(dataUrl)) { b.querySelector('b').textContent = tr('capCopiedNow'); } }
      else if (k === 'dl') { const a = document.createElement('a'); a.download = 'goodraw-' + Date.now() + '.png'; a.href = dataUrl; a.click(); }
      else if (k === 'notes') pickNotesTopic();
    });
    // "Inserir nas anotações": the topic (the last one used first), then off it goes.
    const pickNotesTopic = () => notesPick(root, null, tp => send({ action: 'hl.notesAppend', topicId: tp.id, image: dataUrl }), tp => { closeCap(); toast(tr('capSent', tp.name)); });
  }
  // The topic a capture or a passage goes to, in the dialog's .cap-topics
  // (in place of .cap-opts; ← goes back to them): `prefer` first (the
  // passage's topic), else the last one used. go(topic) → the answer of
  // hl.notesAppend; done(topic) when it went.
  async function notesPick(root, prefer, go, done) {
    const $ = q => root.querySelector(q), box = $('.cap-topics');
    $('.cap-opts').hidden = true; box.hidden = false;
    box.innerHTML = `<div class="cap-th"><button type="button" class="bn-btn" data-back>← ${esc(tr('capBack'))}</button><b>${esc(tr('capWhere'))}</b></div><div class="fc-tplist inline"><input type="search" placeholder="${esc(tr('searchTopic'))}"><div class="list"><p class="hint">${esc(tr('cardLoading'))}</p></div></div>`;
    box.querySelector('[data-back]').addEventListener('click', () => { box.hidden = true; $('.cap-opts').hidden = false; });
    const r = await send({ action: 'hl.cardTopics' });
    if (!root.isConnected) return;
    const list = box.querySelector('.list'), inp = box.querySelector('input');
    if (!r || !r.ok || !(r.topics || []).length) { list.innerHTML = `<p class="hint">${esc(tr(r && r.error === 'no_account' ? 'cardNoAcc' : r && r.ok ? 'cardNoTopics' : 'cardFail'))}</p>`; return; }
    const first = prefer && r.topics.some(x => x.id === prefer) ? prefer : r.last;
    const topics = r.topics.filter(x => x.id === first).concat(r.topics.filter(x => x.id !== first));
    const norm = v => String(v).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
    const paint = () => {
      const q = norm(inp.value.trim());
      list.innerHTML = topics.filter(x => !q || norm(x.path + ' ' + x.name).includes(q)).slice(0, 300)
        .map(x => `<button type="button" class="it${x.id === first ? ' on' : ''}" data-t="${esc(x.id)}"><small>${esc(x.path)}</small>${esc(x.name)}</button>`).join('');
    };
    paint(); inp.addEventListener('input', paint); setTimeout(() => inp.focus(), 20);
    list.addEventListener('click', async e => {
      const b = e.target.closest('[data-t]'); if (!b) return;
      const tp = topics.find(x => x.id === b.dataset.t);
      list.querySelectorAll('[data-t]').forEach(x => { x.disabled = true; });
      const res = await go(tp);
      if (res && res.ok) { done(tp); return; }
      list.querySelectorAll('[data-t]').forEach(x => { x.disabled = false; });
      toast(tr(res && res.error === 'full' ? 'capFull' : res && res.error === 'no_notes' ? 'cardNoNotes' : res && res.error === 'offline' ? 'cardOffline' : 'capFail'));
    });
  }
  async function copyImage(dataUrl) {
    try {
      if (!navigator.clipboard || !window.ClipboardItem) return false;
      const blob = await (await fetch(dataUrl)).blob();
      await navigator.clipboard.write([new ClipboardItem({ [blob.type]: blob })]);
      return true;
    } catch (e) { return false; }
  }

  // The card: the folders (and subfolders), a note, Guardar. `own`: cropped
  // here, so Copiar and Baixar too (the Draw's capture already did both).
  // ─── THE FREE ACCOUNT ─────────────────────────────────────────────────────
  // What is saved needs the free account (background.js gated): the first
  // page is a taste (soft: said once, it stays saved here until an account
  // takes it up); after it, saving asks for the account. Creating it or
  // signing in is the extension's pairing with the site (hl.connect): a window
  // of the site, a code to type there, and this card waits for it. In the
  // Android app (__bnHlAndroid) there is no site to pair with: the app's own
  // account window (AndroidBridge.openCloud, the home screen's "Sincronizar
  // na nuvem") signs in or creates the account, and no code is shown.
  let accBox = null, accTold = false, accPoll = 0;
  function closeAcc() { clearInterval(accPoll); if (accBox) { accBox.remove(); accBox = null; } }
  function accountAsk(soft) {
    if (soft && accTold) return;
    if (soft) accTold = true;
    closeAcc(); mount(); fcFont();
    accBox = el(`<div class="fcm acc" role="dialog" aria-modal="true" aria-label="${esc(tr(soft ? 'accTrialT' : 'accNeedT'))}">
      <div class="fcm-dlg" style="max-width:440px">
        <div class="fcm-hdr"><h2>${esc(tr(soft ? 'accTrialT' : 'accNeedT'))}</h2><button type="button" class="fcm-x" data-x title="${esc(tr('close'))}">${svg(IC.close, 18)}</button></div>
        <div class="fcm-body"><p class="acc-tx">${esc(tr(soft ? (TOUCH ? 'accTrialM' : 'accTrial') : 'accNeed'))}</p>
          <ul class="acc-li"><li>${svg(IC.check, 14)}<span>${esc(tr('accP1'))}</span></li><li>${svg(IC.check, 14)}<span>${esc(tr('accP2'))}</span></li><li>${svg(IC.check, 14)}<span>${esc(tr('accP3'))}</span></li></ul>
          <div class="acc-code" hidden></div></div>
        <div class="fcm-actions">${soft ? `<button type="button" class="bn-btn" data-x>${esc(tr('accLater'))}</button>` : ''}<button type="button" class="bn-btn" data-go>${esc(tr('accLogin'))}</button><button type="button" class="bn-btn primary" data-go>${esc(tr('accSignup'))}</button></div>
      </div></div>`);
    raise(true);
    shadow.appendChild(accBox);
    requestAnimationFrame(() => accBox && accBox.classList.add('show'));
    const root = accBox;
    root.querySelectorAll('[data-x]').forEach(b => b.addEventListener('click', closeAcc));
    root.addEventListener('mousedown', e => { if (e.target === root) closeAcc(); });
    ['keydown', 'keyup', 'keypress'].forEach(k => root.addEventListener(k, e => { e.stopPropagation(); if (e.type === 'keydown' && e.key === 'Escape') closeAcc(); }));
    root.querySelectorAll('[data-go]').forEach(b => b.addEventListener('click', async () => {
      if (window.__bnHlAndroid) { closeAcc(); try { window.AndroidBridge.openCloud(); } catch (e) { toast(tr('accFail')); } return; }
      const r = await send({ action: 'hl.connect', window: true });
      if (!r || r.ok === false) { toast(tr('accFail')); return; }
      if (!r.code) { closeAcc(); return; }   // Firefox: its own page asks first, and goes on from there
      const box = root.querySelector('.acc-code');
      box.hidden = false;
      box.innerHTML = `<span>${esc(tr('accCode'))}</span><b>${esc(r.code)}</b>`;
      clearInterval(accPoll);
      const t0 = Date.now();
      accPoll = setInterval(async () => {
        if (!accBox || Date.now() - t0 > 15 * 60000) return clearInterval(accPoll);
        const ok = await send({ action: 'hl.pairCheck' });
        if (ok && ok.ok) { clearInterval(accPoll); closeAcc(); toast(tr('accDone')); }
      }, 2500);
    }));
  }

  // ─── THE REGISTRY, AS A TREE ─────────────────────────────────────────────
  // Disciplines › topics › subtopics (the one registry: hl.errFolders),
  // folded like the Notes' (Questões, Flashcards); + adds one level down (to
  // the subtopics' subtopics, the Notes' three levels). To file a capture in
  // the caderno de erros, and to link a page or a mark to what it is about.
  const regOrd = (a, b) => (a.order - b.order) || a.name.localeCompare(b.name, undefined, { numeric: true });
  function regModel(r) {
    const m = { subjects: (r.subjects || []).sort(regOrd), topics: r.topics || [] };
    m.item = id => m.subjects.find(x => x.id === id) || m.topics.find(x => x.id === id) || null;
    m.up = x => (x.parent ? m.item(x.parent) : x.subject ? m.item(x.subject) : null);
    m.kids = id => (m.subjects.some(x => x.id === id) ? m.topics.filter(x => x.subject === id && !x.parent) : m.topics.filter(x => x.parent === id)).sort(regOrd);
    m.path = id => { const out = []; for (let x = m.item(id), n = 0; x && n < 5; n++, x = m.up(x)) out.unshift(x.name); return out; };
    return m;
  }
  // list: the element; o: { sel, onPick(id) }.
  // o.only: one discipline's topics (the page's), opened, with a way to the
  // others; o.subjects: the disciplines alone (a page's). search(q): the
  // matches of every discipline, flat, by name or path (accents ignored).
  const regKey = v => String(v).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  function regTree(list, m, o) {
    let sel = m.item(o.sel) ? o.sel : null, q = '';
    let only = o.only && m.item(o.only) ? o.only : null;
    const open = new Set(only ? [only] : []);
    for (let x = m.item(sel); x; x = m.up(x)) open.add(x.id);
    const input = (parent, depth) => `<div class="err-new" style="--d:${depth || 0}"><input data-new="${esc(parent || '')}" maxlength="120" placeholder="${esc(parent ? tr(depth > 1 ? 'errSubSubPh' : 'errSubPh', (m.item(parent) || {}).name || '') : tr('errFolderPh'))}"><button class="btn primary" data-ok>OK</button></div>`;
    const draw = adding => {
      if (q) {
        const found = (o.subjects ? m.subjects : m.subjects.concat(m.topics)).filter(x => regKey(m.path(x.id).join(' ')).includes(q));
        list.innerHTML = found.length ? found.map(x => `<div class="err-row"><button class="err-f${x.id === sel ? ' on' : ''}${x.out ? ' out' : ''}" data-f="${esc(x.id)}">${svg(m.subjects.includes(x) ? IC.book : IC.topic, 15)}<span>${esc(m.path(x.id).join(' › '))}</span></button></div>`).join('')
          : `<div class="err-empty">${esc(tr('linkNoMatch'))}</div>`;
        return;
      }
      const row = (x, depth) => {
        const ks = o.subjects ? [] : m.kids(x.id), isOpen = open.has(x.id);
        return `<div class="err-row" style="--d:${depth}">`
          + `<button class="err-tg${ks.length ? '' : ' none'}" data-tg="${esc(x.id)}" aria-label="${esc(tr(isOpen ? 'errFold' : 'errUnfold'))}">${ks.length ? svg(isOpen ? IC.down : IC.right, 13) : ''}</button>`
          + `<button class="err-f${depth ? ' sub' : ''}${x.id === sel ? ' on' : ''}${x.out ? ' out' : ''}" data-f="${esc(x.id)}">${svg(depth ? IC.topic : IC.book, 15)}<span>${esc(x.name)}</span></button>`
          + (depth < 3 && !o.subjects ? `<button class="err-add" data-sub="${esc(x.id)}" title="${esc(tr(depth ? 'errNewSubSub' : 'errNewSub'))}">${svg(IC.plus, 14)}</button>` : '') + '</div>'
          + (isOpen || adding === x.id ? ks.map(k => row(k, depth + 1)).join('') : '')
          + (adding === x.id ? input(x.id, depth + 1) : '');
      };
      list.innerHTML = (m.subjects.length ? '' : `<div class="err-empty">${esc(tr('errNoFolders'))}</div>`)
        + (only ? m.subjects.filter(x => x.id === only) : m.subjects).map(x => row(x, 0)).join('')
        + (only ? `<button class="err-newbtn" data-all>${svg(IC.book, 14)}${esc(tr('linkOther'))}</button>`
          : adding === '' ? input(null) : `<button class="err-newbtn" data-newtop>${svg(IC.plus, 14)}${esc(tr('errNewFolder'))}</button>`);
      const inp = list.querySelector('[data-new]');
      if (inp) { inp.focus(); inp.scrollIntoView({ block: 'nearest' }); }
    };
    const pick = id => { sel = id; if (m.kids(id).length) open.add(id); draw(); if (o.onPick) o.onPick(id); };
    const create = async inp => {
      const name = inp.value.trim();
      if (!name) return;
      const res = await send({ action: 'hl.errFolder', name, parent: inp.dataset.new || null });
      if (!res || !res.ok) { toast(tr('errFail')); return; }
      const x = { ...res.folder, order: 1e9, out: false };
      if (x.kind === 'subject') m.subjects.push(x); else m.topics.push(x);
      if (inp.dataset.new) open.add(inp.dataset.new);
      pick(x.id);
    };
    list.addEventListener('click', e => {
      const f = e.target.closest('[data-f]'), sub = e.target.closest('[data-sub]'), tg = e.target.closest('[data-tg]');
      if (tg) { if (open.has(tg.dataset.tg)) open.delete(tg.dataset.tg); else open.add(tg.dataset.tg); draw(); return; }
      if (sub) { open.add(sub.dataset.sub); draw(sub.dataset.sub); return; }
      if (f) { pick(f.dataset.f); return; }
      if (e.target.closest('[data-newtop]')) { draw(''); return; }
      if (e.target.closest('[data-all]')) { only = null; draw(); return; }
      if (e.target.closest('[data-ok]')) create(list.querySelector('[data-new]'));
    });
    list.addEventListener('keydown', e => { if (e.key === 'Enter' && e.target.matches('[data-new]')) { e.preventDefault(); create(e.target); } });
    draw();
    return { get sel() { return sel; }, search(v) { q = regKey(v).trim(); draw(); } };
  }

  // ─── WHAT A PAGE / A MARK IS ABOUT ───────────────────────────────────────
  // A page is linked to a discipline or topic of the registry (its marks go
  // with it); a mark may have its own (an article with passages of two
  // subjects) — webpages.topic, marks.topic.
  let reg = null;
  async function loadReg() { const r = await send({ action: 'hl.errFolders' }); reg = r && r.ok ? regModel(r) : reg; return reg; }
  const linkPath = id => (reg && id && reg.item(id) ? reg.path(id).join(' › ') : '');
  let linkBox = null;
  function closeLink() { if (linkBox) { linkBox.remove(); linkBox = null; } }
  // o: { sel, page (the page's link, offered as "use the page's"; undefined
  // for the page itself), onPick(id | null) }.
  async function linkPicker(anchor, o) {
    closeLink();
    const m = await loadReg();
    if (!m) { toast(tr('errFail')); return; }
    const box = linkBox = el(`<div class="tp rp" role="dialog" aria-label="${esc(tr('linkTitle'))}">
      <div class="rp-hd"><b>${esc(tr('linkTitle'))}</b><button class="ib" data-x title="${esc(tr('close'))}">${svg(IC.close, 14)}</button></div>
      ${o.page !== undefined ? `<button class="it rp-opt${o.sel ? '' : ' on'}" data-k="page">${svg(IC.pages || IC.topic, 14)}<span></span></button>` : `<button class="it rp-opt${o.sel ? '' : ' on'}" data-k="none">${svg(IC.close, 14)}<span>${esc(tr('linkNone'))}</span></button>`}
      <input type="search" class="rp-q" placeholder="${esc(tr('linkSearch'))}">
      <div class="list err-list"></div></div>`);
    const opt = box.querySelector('[data-k="page"] span');
    if (opt) opt.textContent = o.page ? tr('linkPage', linkPath(o.page)) : tr('linkPageNone');
    shadow.appendChild(box);
    const tree = regTree(box.querySelector('.list'), m, { sel: o.sel, only: o.only, subjects: o.subjects, onPick: id => { closeLink(); o.onPick(id); } });
    const q = box.querySelector('.rp-q');
    q.addEventListener('input', () => tree.search(q.value));
    q.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); const f = box.querySelector('.list [data-f]'); if (f) f.click(); } });
    place(box, anchor.getBoundingClientRect(), true);
    if (!TOUCH) setTimeout(() => q.focus(), 20);
    box.querySelector('[data-x]').addEventListener('click', closeLink);
    const k = box.querySelector('[data-k]');
    k.addEventListener('click', () => { closeLink(); o.onPick(null); });
    ['keydown', 'keyup', 'keypress'].forEach(t => box.addEventListener(t, e => { e.stopPropagation(); if (e.type === 'keydown' && e.key === 'Escape') closeLink(); }));
    box.addEventListener('mousedown', e => e.stopPropagation());
    setTimeout(() => {
      const off = e => { if (!linkBox) return removeEventListener('mousedown', off, true); if (!inBox(e, linkBox)) { closeLink(); removeEventListener('mousedown', off, true); } };
      addEventListener('mousedown', off, SIGC);
    });
  }
  // The page is linked to a discipline (27/10/2026); its marks, each to a
  // topic of it. A page linked to a topic before that: its discipline.
  const subjectOf = id => { let x = reg && reg.item(id); while (x && m_up(x)) x = m_up(x); return x ? x.id : null; };
  const m_up = x => reg.up(x);
  const pageSubject = () => (page && page.topic ? subjectOf(page.topic) || page.topic : null);
  async function setPageLink(id, quiet) {
    const r = await send({ action: 'hl.page', url: pageUrl(), info: pageInfo(), patch: { topic: id } });
    if (r && r.page) page = r.page; else toast(tr('saveFail'));
    // A topic of another discipline isn't the next mark's any more.
    if (curTopic && pageSubject() && subjectOf(curTopic) !== pageSubject()) curTopic = null;
    renderPanel(); renderPins();
    if (id && !quiet) toast(tr('linkSet', linkPath(id)));
  }

  // opts.html / opts.text: a passage of text instead of a picture (the
  // selection menu's "Enviar trecho"); opts.prefer: the folder chosen first
  // (the passage's topic).
  async function errOffer(dataUrl, w, h, opts) {
    opts = opts || {};
    const asText = !dataUrl && !!opts.text;
    closeErr();
    mount(); brandFont();
    const r = await send({ action: 'hl.errFolders' });
    if (!r || !r.ok) { toast(tr('errFail')); return; }
    const m = regModel(r);
    let last = null;
    try { last = (await chrome.storage.local.get(ERR_LAST))[ERR_LAST] || null; } catch (e) {}
    errBox = el(`<div class="err${TOUCH ? ' err-touch' : ''}" role="dialog" aria-label="${esc(tr('errTitle'))}">
      <div class="err-grab"></div>
      <div class="err-hd"><b><i></i>${esc(tr('errTitle'))}</b><button class="ib" data-x title="${esc(tr('close'))}">${svg(IC.close, 15)}</button></div>
      <div class="${asText ? 'err-txt' : 'err-shot'}"></div>
      <div class="err-lbl">${esc(tr('errPick'))}</div>
      <div class="err-list"></div>
      <textarea placeholder="${esc(tr('errNotePh'))}"></textarea>
      ${r.user || TOUCH ? '' : `<div class="err-local">${esc(tr('errLocal'))} <button data-connect>${esc(tr('errConnect'))}</button></div>`}
      <div class="err-ft">${opts.own ? `<button class="btn" data-copy>${svg(IC.copy, 14)}${esc(tr('errCopy'))}</button>${TOUCH ? '' : `<button class="btn" data-dl>${esc(tr('errDownload'))}</button>`}` : ''}<span class="sp"></span><button class="btn primary" data-save disabled>${esc(tr('errSave'))}</button></div>
    </div>`);
    if (asText) errBox.querySelector('.err-txt').innerHTML = fcClean(opts.html || fcFromText(opts.text));
    else errBox.querySelector('.err-shot').style.backgroundImage = `url("${dataUrl}")`;
    raise(true);
    shadow.appendChild(errBox);
    const list = errBox.querySelector('.err-list'), save = errBox.querySelector('[data-save]'), ta = errBox.querySelector('textarea');
    ['keydown', 'keyup', 'keypress'].forEach(k => errBox.addEventListener(k, e => { e.stopPropagation(); if (e.type === 'keydown' && e.key === 'Escape') closeErr(); }));
    // The folder offered: the passage's topic, else the page's (the notebook
    // opened from the topic's link, #69), else the last one used.
    const pageTopic = page && page.topic && m.item(page.topic) ? page.topic : null;
    const tree = regTree(list, m, { sel: opts.prefer && m.item(opts.prefer) ? opts.prefer : pageTopic || last, onPick: () => { save.disabled = false; } });
    save.disabled = !tree.sel;
    errBox.querySelector('[data-x]').addEventListener('click', closeErr);
    const cn = errBox.querySelector('[data-connect]');
    // The code the site asks for (ext-link): shown right here, where the click was.
    if (cn) cn.addEventListener('click', async () => {
      const r = await send({ action: 'hl.connect' });
      if (r && r.code) { const p = cn.parentNode; p.textContent = tr('errCode', r.code); p.style.fontWeight = '600'; }
    });
    const cp = errBox.querySelector('[data-copy]');
    if (cp) cp.addEventListener('click', async () => {
      try { const b = await (await fetch(dataUrl)).blob(); await navigator.clipboard.write([new ClipboardItem({ [b.type]: b })]); toast(tr('copied')); }
      catch (e) { toast(tr('errFail')); }
    });
    const dl = errBox.querySelector('[data-dl]');
    if (dl) dl.addEventListener('click', () => { const a = document.createElement('a'); a.href = dataUrl; a.download = 'goodraw-erro-' + Date.now() + '.png'; a.click(); });
    save.addEventListener('click', async () => {
      const sel = tree.sel;
      if (!sel) return;
      save.disabled = true;
      const res = await send(asText ? { action: 'hl.errAdd', html: opts.html || '', text: opts.text, url: pageUrl(), title: document.title, folder: sel, note: ta.value }
        : { action: 'hl.errAdd', dataUrl, w: Math.round(w), h: Math.round(h), url: pageUrl(), title: document.title, folder: sel, note: ta.value });
      if (!res || !res.ok) { save.disabled = false; if (res && res.error === 'account') { closeErr(); accountAsk(false); return; } toast(res && res.error === 'quota_locked' ? tr('errFull') : tr('errFail')); return; }
      if (res.trial) setTimeout(() => accountAsk(true), 600);
      try { await chrome.storage.local.set({ [ERR_LAST]: sel }); } catch (e) {}
      closeErr();
      toast(tr('errSaved', m.path(sel).join(' › ')));
    });
  }
  function closeErr() { if (errBox) { errBox.remove(); errBox = null; } if (!selBox) raise(false); }
  // For content.js (the Draw's area capture, same page): offer the caderno too.
  // The Draw's area capture (content.js) opens the same "Captura parcial".
  window.__bnErr = { offer: (d, w, h) => capOffer(d, w, h, {}), crop: errCrop };

  // ─── "ENVIAR TRECHO": A PASSAGE TO THE NOTES OR THE CADERNO ──────────────
  // (05/11/2026, chamado #52) From the selection's menu: the passage in the
  // flashcard's rich box (to edit and format: bold, colours, the marker),
  // then where it goes — the end of a topic's notes (only for whoever has the
  // Notes, cardAccess; hl.notesAppend, as a capture does) or the caderno de
  // erros, as text (errOffer with it). The passage's topic comes first.
  let sendBox = null;
  function closeSend() { if (sendBox) { sendBox.remove(); sendBox = null; } if (!selBox && !errBox && !cardBox && !capBox) raise(false); }
  function sendOffer(text) {
    closeBar(); closeChip(); closeSend(); closeCap();
    text = String(text || '').trim().slice(0, 5000);
    mount(); fcFont();
    const tile = (k, icon, label, sub) => `<button type="button" class="cap-opt" data-k="${k}">${svg(icon, 20)}<span><b>${esc(tr(label))}</b><small>${esc(tr(sub))}</small></span></button>`;
    sendBox = el(`<div class="fcm cap send" role="dialog" aria-modal="true" aria-label="${esc(tr('sendTitle'))}">
      <div class="fcm-dlg" style="max-width:480px">
        <div class="fcm-hdr"><h2>${esc(tr('sendTitle'))}</h2><button type="button" class="fcm-x" data-x title="${esc(tr('close'))}">${svg(IC.close, 18)}</button></div>
        <div class="fcm-body fc-ed">
          <div class="fld"><span>${esc(tr('sendText'))}</span><div data-f="text"></div></div>
          <div class="cap-opts">${cardAccess ? tile('notes', IC.note, 'capNotes', 'capNotesSub') : ''}${tile('err', IC.target, 'capErr', 'capErrSub')}</div>
          <div class="cap-topics" hidden></div>
          <p class="fcm-err" hidden></p>
        </div>
        <div class="fcm-actions"><button type="button" class="bn-btn" data-x>${esc(tr('close'))}</button></div>
      </div>
    </div>`);
    raise(true);
    shadow.appendChild(sendBox);
    const root = sendBox, $ = q => root.querySelector(q);
    const box = fcBox(fcFromText(text), '', 90);
    $('[data-f="text"]').replaceWith(box.el);
    requestAnimationFrame(() => root.classList.add('show'));
    const err = m => { const e = $('.fcm-err'); e.textContent = m; e.hidden = !m; };
    ['keydown', 'keyup', 'keypress'].forEach(k => root.addEventListener(k, e => { e.stopPropagation(); if (e.type === 'keydown' && e.key === 'Escape') closeSend(); }));
    root.addEventListener('mousedown', e => {
      if (e.target === root) closeSend();
      const pop = root.querySelector('.rt-pop');
      if (pop && !e.composedPath().includes(pop) && !e.target.closest('[data-pop]')) pop.remove();
    });
    root.querySelectorAll('[data-x]').forEach(b => b.addEventListener('click', closeSend));
    const prefer = curTopic;
    $('.cap-opts').addEventListener('click', e => {
      const b = e.target.closest('[data-k]'); if (!b) return;
      const html = box.html(), plain = fcText(html);
      if (!plain) { err(tr('sendEmpty')); return; }
      err('');
      if (b.dataset.k === 'err') { closeSend(); errOffer(null, 0, 0, { html, text: plain, prefer }); return; }
      notesPick(root, prefer, tp => send({ action: 'hl.notesAppend', topicId: tp.id, nodes: fcDoc(html), html }), tp => { closeSend(); toast(tr('sendSent', tp.name)); });
    });
    setTimeout(() => box.focus(), 40);
  }
  // The rich box's HTML as the notes editor's paragraphs (its JSON, TipTap):
  // a paragraph a line, the text with bold, italic, underline, strike, its
  // colour (textStyle) and the marker (highlight); a list's items as lines.
  function fcDoc(html) {
    const doc = new DOMParser().parseFromString('<body>' + (html || '') + '</body>', 'text/html');
    const out = [], BLOCK = new Set(['P', 'DIV', 'LI', 'UL', 'OL', 'BLOCKQUOTE']);
    let cur = null;
    const line = () => { cur = { type: 'paragraph', content: [] }; out.push(cur); };
    const add = (list, m) => list.filter(x => x.type !== m.type).concat(m);
    const walk = (node, marks) => {
      for (const n of node.childNodes) {
        if (n.nodeType === 3) {
          const text = n.textContent.replace(/\u00a0/g, ' ');
          if (!text || (!cur && !text.trim())) continue;
          if (!cur) line();
          cur.content.push(marks.length ? { type: 'text', text, marks } : { type: 'text', text });
          continue;
        }
        if (n.nodeType !== 1) continue;
        if (n.tagName === 'BR') { line(); continue; }
        const block = BLOCK.has(n.tagName);
        if (block && cur && cur.content.length) cur = null;
        let m = marks;
        if (n.tagName === 'B' || n.tagName === 'STRONG') m = add(m, { type: 'bold' });
        if (n.tagName === 'I' || n.tagName === 'EM') m = add(m, { type: 'italic' });
        if (n.tagName === 'U') m = add(m, { type: 'underline' });
        if (n.tagName === 'S' || n.tagName === 'STRIKE') m = add(m, { type: 'strike' });
        if (n.tagName === 'MARK') m = add(m, { type: 'highlight', attrs: { color: FC_MARKS[0] } });
        const c = n.style && n.style.color, bg = n.style && n.style.backgroundColor;
        if (c && FC_COLOR.test(c)) m = add(m, { type: 'textStyle', attrs: { color: c } });
        if (bg && FC_COLOR.test(bg) && !/rgba\([^)]*,\s*0\s*\)$/.test(bg)) m = add(m, { type: 'highlight', attrs: { color: bg } });
        if (n.tagName === 'LI') { line(); cur.content.push({ type: 'text', text: '• ' }); }
        walk(n, m);
        if (block) cur = null;
      }
    };
    walk(doc.body, []);
    while (out.length && !out[out.length - 1].content.length) out.pop();
    return out.map(p => p.content.length ? p : { type: 'paragraph' });
  }

  // ─── A FLASHCARD FROM A PASSAGE ───────────────────────────────────────────
  // A selected passage turned into a flashcard of the person's GooNotes:
  // from the selection's menu, or — with only the Draw on the page (its bar
  // open, the colour menu off; or the Android app's Draw) — from a small
  // button by the selection. The topics are the account's and the card goes
  // straight to it (hl-sync.js cardTopics/cardAdd). Only for an account with
  // the Notes (bnNotesAccess, written by hl-sync.js).
  let cardAccess = false, cardBox = null, cardChip = null;
  function closeChip() { if (cardChip) { cardChip.remove(); cardChip = null; } }
  function cardChipFor(range) {
    closeChip();
    if (!cardAccess || cardBox || !(drawRoot() || window.__bnHlErrOnly)) return;
    const text = String(range).trim();
    if (!text) return;
    mount();
    cardChip = el(`<button class="card-chip" title="${esc(tr('card'))}" aria-label="${esc(tr('card'))}">${svg(IC.card, 17)}</button>`);
    shadow.appendChild(cardChip);
    const rs = range.getClientRects(), last = rs[rs.length - 1] || range.getBoundingClientRect();
    // Under the end of the selection (on a phone, under the system's handles).
    const x = Math.max(6, Math.min(last.right + 4, innerWidth - 42)), y = last.bottom + (TOUCH ? 30 : 6);
    cardChip.style.left = x + 'px';
    cardChip.style.top = (y + 36 > innerHeight ? Math.max(6, last.top - 42) : y) + 'px';
    cardChip.addEventListener('mousedown', e => e.preventDefault());
    cardChip.addEventListener('click', () => cardOffer(text));
  }
  function closeCard() { if (cardBox) { cardBox.remove(); cardBox = null; } if (!selBox && !errBox) raise(false); }
  // The same window as the Notes' "Novo flashcard" (notes/flashcards.js edit,
  // rich.js box): the topic on top, one card or many at once, front and back
  // with bold, italic, underline, strike, the text's colour and the marker,
  // "Criar outro em seguida", Cancelar / Salvar — with the Notes' look
  // (its colours, Onest). Images stay in the Notes (they are its files).
  const FC_INKS = ['#e5484d', '#f76b15', '#16a34a', '#2563eb', '#8e4ec6', '#6b7280'];
  const FC_MARKS = ['#fff3a3', '#c6f6d5', '#cfe5ff', '#fbd3e9', '#ffd8b5'];
  const FC_KEEP = new Set(['P', 'DIV', 'BR', 'B', 'STRONG', 'I', 'EM', 'U', 'S', 'STRIKE', 'UL', 'OL', 'LI', 'SUB', 'SUP', 'SPAN', 'FONT', 'MARK', 'BLOCKQUOTE', 'CODE']);
  const FC_DROP = new Set(['SCRIPT', 'STYLE', 'IFRAME', 'OBJECT', 'EMBED', 'FORM', 'INPUT', 'BUTTON', 'SELECT', 'TEXTAREA', 'LINK', 'META', 'SVG', 'MATH', 'TITLE', 'IMG']);
  const FC_COLOR = /^(#[0-9a-f]{3,8}|rgba?\(\s*[\d.]+\s*,\s*[\d.]+\s*,\s*[\d.]+\s*(,\s*[\d.]+\s*)?\))$/i;
  // What the Notes keeps of a card's HTML (rich.js clean, without images).
  function fcClean(html) {
    const doc = new DOMParser().parseFromString('<body>' + (html || '') + '</body>', 'text/html');
    const walk = node => {
      [...node.childNodes].forEach(n => {
        if (n.nodeType === 8) { n.remove(); return; }
        if (n.nodeType !== 1) return;
        if (FC_DROP.has(n.tagName)) { n.remove(); return; }
        walk(n);
        if (!FC_KEEP.has(n.tagName)) { n.replaceWith(...n.childNodes); return; }
        let color = '', bg = '';
        if (n.style) {
          const fw = n.style.fontWeight, deco = n.style.textDecorationLine || n.style.textDecoration || '';
          const wrap = tag => { const w = n.ownerDocument.createElement(tag); w.append(...n.childNodes); n.append(w); };
          if (fw === 'bold' || +fw >= 600) wrap('b');
          if (n.style.fontStyle === 'italic') wrap('i');
          if (/underline/.test(deco)) wrap('u');
          if (/line-through/.test(deco)) wrap('s');
          color = (n.style.color || '').trim(); bg = (n.style.backgroundColor || '').trim();
          if (!FC_COLOR.test(color)) color = '';
          if (!FC_COLOR.test(bg) || /rgba\([^)]*,\s*0\s*\)$/.test(bg)) bg = '';
        }
        if (n.tagName === 'FONT' && n.getAttribute('color') && FC_COLOR.test(n.getAttribute('color'))) color = n.getAttribute('color');
        [...n.attributes].forEach(a => n.removeAttribute(a.name));
        if (n.tagName === 'FONT') { const sp = n.ownerDocument.createElement('span'); sp.append(...n.childNodes); n.replaceWith(sp); n = sp; }
        if (color || bg) n.setAttribute('style', (color ? 'color:' + color + ';' : '') + (bg ? 'background-color:' + bg + ';' : ''));
        if (n.tagName === 'SPAN' && !n.getAttribute('style')) n.replaceWith(...n.childNodes);
      });
    };
    walk(doc.body);
    return doc.body.innerHTML.replace(/(<(p|div)>\s*(<br>)?\s*<\/\2>)+$/g, '').replace(/^(<br>\s*)+|(\s*<br>)+$/g, '').trim();
  }
  function fcText(html) {
    const doc = new DOMParser().parseFromString('<body>' + (html || '') + '</body>', 'text/html');
    doc.querySelectorAll('br').forEach(x => x.replaceWith('\n'));
    doc.querySelectorAll('p, div, li').forEach(x => { if (x.previousSibling) x.before('\n'); x.append('\n'); });
    return (doc.body.textContent || '').replace(/ /g, ' ').replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
  }
  const fcFromText = s => String(s || '').split('\n').map(esc).join('<br>');
  // The rich box (rich.js box): the toolbar works on the selection inside it.
  // Firefox (28/10/2026): a contenteditable inside a shadow root attached to
  // <html> — ours, so it stays above any site — doesn't delete: Backspace and
  // Delete do nothing (typing works; inputs and textareas are fine). There
  // the deletion is done here: a character, or a word with Ctrl/Alt, or what
  // is selected. Chrome keeps its own (and its undo).
  const FF = /Firefox\//.test(navigator.userAgent);
  function ffDelete(ed) {
    if (!FF) return;
    ed.addEventListener('keydown', e => {
      if ((e.key !== 'Backspace' && e.key !== 'Delete') || e.defaultPrevented || e.isComposing || e.metaKey) return;
      const sel = getSelection(), back = e.key === 'Backspace';
      if (!sel.rangeCount) return;
      e.preventDefault();
      const was = sel.getRangeAt(0).cloneRange();
      if (sel.isCollapsed) sel.modify('extend', back ? 'backward' : 'forward', e.ctrlKey || e.altKey ? 'word' : 'character');
      const r = sel.rangeCount && sel.getRangeAt(0);
      // At the very start (or end): nothing to take; the cursor stays put.
      if (!r || r.collapsed || !ed.contains(r.startContainer) || !ed.contains(r.endContainer)) { sel.removeAllRanges(); sel.addRange(was); return; }
      r.deleteContents(); sel.collapseToStart();
      ed.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: back ? 'deleteContentBackward' : 'deleteContentForward' }));
    });
  }
  function fcBox(html, ph, minH) {
    const box = el(`<div class="rt blank">
      <div class="rt-tb" role="toolbar">
        <button type="button" data-c="bold" title="${esc(tr('rtBold'))}"><b>B</b></button>
        <button type="button" data-c="italic" title="${esc(tr('rtItalic'))}"><em>I</em></button>
        <button type="button" data-c="underline" title="${esc(tr('rtUnder'))}"><u>U</u></button>
        <button type="button" data-c="strikeThrough" title="${esc(tr('rtStrike'))}"><s>S</s></button>
        <i class="rt-sep"></i>
        <button type="button" data-pop="ink" class="rt-ink" title="${esc(tr('rtInk'))}"><span>A</span><i style="background:${FC_INKS[0]}"></i></button>
        <button type="button" data-pop="mark" class="rt-mark" title="${esc(tr('rtMark'))}">${svg(IC.marker, 15)}<i style="background:${FC_MARKS[0]}"></i></button>
        <i class="rt-sep"></i>
        <button type="button" data-c="clear" title="${esc(tr('rtClear'))}">${svg(IC.eraser, 15)}</button>
      </div>
      <div class="rt-ed" contenteditable="true" spellcheck="true"></div>
    </div>`);
    const ed = box.querySelector('.rt-ed'), tb = box.querySelector('.rt-tb');
    ffDelete(ed);
    ed.dataset.ph = ph; ed.style.minHeight = minH + 'px';
    ed.innerHTML = fcClean(html);
    const blank = () => box.classList.toggle('blank', !ed.textContent.trim());
    blank();
    ed.addEventListener('input', blank);
    // A press on the toolbar keeps the focus (and the selection) in the text.
    tb.addEventListener('mousedown', e => { if (e.target.closest('button')) e.preventDefault(); });
    const run = (cmd, val) => { ed.focus(); document.execCommand('styleWithCSS', false, /Color$/.test(cmd)); document.execCommand(cmd, false, val); blank(); };
    tb.addEventListener('click', e => {
      const b = e.target.closest('button');
      if (!b) return;
      if (b.dataset.pop) { palette(b, b.dataset.pop); return; }
      if (b.dataset.c === 'clear') { run('removeFormat'); run('hiliteColor', 'transparent'); return; }
      run(b.dataset.c);
    });
    function palette(btn, kind) {
      const old = box.querySelector('.rt-pop');
      if (old) { old.remove(); if (old.dataset.kind === kind) return; }
      const list = kind === 'ink' ? FC_INKS : FC_MARKS;
      const pop = el(`<div class="rt-pop" data-kind="${kind}">${list.map(c => `<button type="button" style="--c:${c}" data-v="${c}"></button>`).join('')}<button type="button" class="rt-none" data-v="" title="${esc(tr(kind === 'ink' ? 'rtInkNone' : 'rtMarkNone'))}">${svg(IC.close, 12)}</button></div>`);
      pop.addEventListener('mousedown', e => e.preventDefault());
      pop.addEventListener('click', e => {
        const b = e.target.closest('[data-v]');
        if (!b) return;
        const v = b.dataset.v;
        if (kind === 'ink') {
          if (v) { btn.querySelector('i').style.background = v; run('foreColor', v); }
          else {
            run('foreColor', '#010203');
            ed.querySelectorAll('[style*="color"], font[color]').forEach(x => {
              if (x.getAttribute('color') === '#010203') x.removeAttribute('color');
              if (/^rgb\(1, 2, 3\)$|^#010203$/i.test(x.style.color)) x.style.color = '';
            });
          }
        } else {
          if (v) btn.querySelector('i').style.background = v;
          run('hiliteColor', v || 'transparent');
        }
        pop.remove();
      });
      btn.after(pop);
      pop.style.left = btn.offsetLeft + 'px';
    }
    // Pasted: only what the box keeps; plain text stays plain.
    ed.addEventListener('paste', e => {
      const cd = e.clipboardData;
      if (!cd) return;
      e.preventDefault();
      const h = cd.getData('text/html');
      document.execCommand('insertHTML', false, h ? fcClean(h) : fcFromText(cd.getData('text/plain')));
      blank();
    });
    return { el: box, html: () => fcClean(ed.innerHTML), focus: () => { ed.focus(); const s = getSelection(); s.selectAllChildren(ed); s.collapseToEnd(); } };
  }

  // onBack: the capture is the answer (the card's back), and the question is
  // written on the front — as in the Notes' own sheet (notes/capture.js).
  async function cardOffer(text, keepTopic, image, onBack) {
    onBack = !!(image && onBack);
    closeBar(); closeChip(); closeCard();
    text = String(text || '').trim().slice(0, 5000);
    mount(); fcFont();
    const fresh = !text && !image;
    cardBox = el(`<div class="fcm" role="dialog" aria-modal="true" aria-label="${esc(tr('cardTitle'))}">
      <div class="fcm-dlg">
        <div class="fcm-hdr"><h2>${esc(tr('cardTitle'))}</h2><button type="button" class="fcm-x" data-x title="${esc(tr('close'))}">${svg(IC.close, 18)}</button></div>
        <div class="fcm-body fc-ed">
          <div class="fc-tpwrap"><button type="button" class="fc-topic none">${svg(IC.topicTree, 15)}<span>${esc(tr('cardLoading'))}</span>${svg(IC.down, 14)}</button></div>
          ${image ? '' : `<div class="tp-seg fc-mode"><button type="button" class="on" data-m="one">${esc(tr('cardOne'))}</button><button type="button" data-m="many">${esc(tr('cardMany'))}</button></div>`}
          <div class="fc-one">
            ${image && !onBack ? `<div class="fld"><span>${esc(tr('cardPic'))}</span><div class="fc-pic"><img alt=""></div></div>` : ''}
            <div class="fld"><span>${esc(tr(image && !onBack ? 'cardPicText' : 'cardFront'))}</span><div data-f="front"></div></div>
            ${onBack ? `<div class="fld"><span>${esc(tr('cardPicBack'))}</span><div class="fc-pic"><img alt=""></div></div>` : ''}
            <div class="fld"><span>${esc(tr(onBack ? 'cardPicText' : 'cardBack'))}</span><div data-f="back"></div></div>
            <p class="hint">${esc(tr('cardHint'))}</p>
          </div>
          <div class="fc-many" hidden>
            <label class="fld"><span>${esc(tr('cardManyLbl'))}</span><textarea rows="9" placeholder="${esc(tr('cardManyPh'))}"></textarea></label>
            <p class="hint">${esc(tr('cardManyHint'))}</p>
          </div>
          <label class="bn-check"><input type="checkbox" data-again${fresh ? ' checked' : ''}>${esc(tr('cardAgain'))}</label>
          <p class="fcm-err" hidden></p>
        </div>
        <div class="fcm-actions"><button type="button" class="bn-btn" data-cancel>${esc(tr('cancel'))}</button><button type="button" class="bn-btn primary" data-save>${esc(tr('save'))}</button></div>
      </div>
    </div>`);
    raise(true);
    shadow.appendChild(cardBox);
    const root = cardBox, $ = q => root.querySelector(q);
    requestAnimationFrame(() => root.classList.add('show'));
    if (image) root.querySelector('.fc-pic img').src = image;
    const front = fcBox(fcFromText(text), image && !onBack ? '' : tr('cardFrontPh'), image && !onBack ? 40 : 72), back = fcBox('', onBack ? '' : tr('cardBackPh'), onBack ? 40 : 96);
    $('[data-f="front"]').replaceWith(front.el);
    $('[data-f="back"]').replaceWith(back.el);
    let many = false, topics = [], topic = null, busy = false;
    const err = m => { const e = $('.fcm-err'); e.textContent = m; e.hidden = !m; };
    root.querySelectorAll('[data-m]').forEach(b => b.addEventListener('click', () => {
      many = b.dataset.m === 'many';
      root.querySelectorAll('[data-m]').forEach(x => x.classList.toggle('on', x === b));
      $('.fc-one').hidden = many; $('.fc-many').hidden = !many;
    }));
    // Keys typed here are the card's, not the site's shortcuts.
    ['keydown', 'keyup', 'keypress'].forEach(k => root.addEventListener(k, e => {
      e.stopPropagation();
      if (e.type === 'keydown' && e.key === 'Escape') { if ($('.fc-tplist')) $('.fc-tplist').remove(); else closeCard(); }
    }));
    root.addEventListener('mousedown', e => {
      if (e.target === root) closeCard();
      const pop = root.querySelector('.rt-pop');
      if (pop && !e.composedPath().includes(pop) && !e.target.closest('[data-pop]')) pop.remove();
      const tl = $('.fc-tplist');
      if (tl && !e.composedPath().includes(tl) && !e.target.closest('.fc-topic')) tl.remove();
    });
    $('[data-x]').addEventListener('click', closeCard);
    $('[data-cancel]').addEventListener('click', closeCard);
    setTimeout(() => (text || (image && !onBack) ? back : front).focus(), 40);

    const tb = $('.fc-topic');
    const paintTopic = () => {
      const x = topics.find(t => t.id === topic);
      tb.querySelector('span').textContent = x ? (x.path ? x.path + ' › ' : '') + x.name : tr('cardPick');
      tb.classList.toggle('none', !x);
    };
    // The topic list: under the button, with a search.
    tb.addEventListener('click', () => {
      if ($('.fc-tplist')) { $('.fc-tplist').remove(); return; }
      if (!topics.length) return;
      const pop = el(`<div class="fc-tplist"><input type="search" placeholder="${esc(tr('searchTopic'))}"><div class="list"></div></div>`);
      tb.after(pop);
      const inp = pop.querySelector('input'), list = pop.querySelector('.list');
      const norm = v => String(v).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
      const paint = () => {
        const k = norm(inp.value.trim());
        list.innerHTML = topics.filter(x => !k || norm(x.path + ' ' + x.name).includes(k)).slice(0, 300)
          .map(x => `<button type="button" class="it${x.id === topic ? ' on' : ''}" data-t="${esc(x.id)}"><small>${esc(x.path)}</small>${esc(x.name)}</button>`).join('');
      };
      paint();
      inp.addEventListener('input', paint);
      inp.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); const f = list.querySelector('[data-t]'); if (f) f.click(); } });
      list.addEventListener('click', e => { const b = e.target.closest('[data-t]'); if (!b) return; topic = b.dataset.t; paintTopic(); pop.remove(); err(''); });
      setTimeout(() => inp.focus(), 20);
    });

    const r = await send({ action: 'hl.cardTopics' });
    if (cardBox !== root) return;
    // Without an account (the card goes to it) or without topics yet: why, and the way there.
    const stop = (msg, go) => {
      tb.querySelector('span').textContent = msg; tb.classList.add('none'); tb.disabled = true; $('[data-save]').disabled = true;
      if (!go) return;
      const b = el(`<button type="button" class="bn-btn primary fc-go">${esc(tr(go === 'acc' ? 'cardGoAcc' : 'cardGoTopics'))}</button>`);
      // In the Android app: its account window and its Flashcards screen (no hl.app nor home there).
      const app = window.__bnHlAndroid && window.AndroidBridge;
      b.addEventListener('click', () => {
        closeCard();
        if (go === 'acc') { if (app) accountAsk(false); else goHome(); }
        else if (app) { try { app.openFlashcards(); } catch (e) {} }
        else send({ action: 'hl.app', hash: '#/flashcards' });
      });
      tb.after(b);
    };
    if (!r || !r.ok) { const acc = r && r.error === 'no_account'; stop(tr(acc ? 'cardNoAcc' : r && r.error === 'offline' ? 'cardOffline' : 'cardFail'), acc && 'acc'); return; }
    topics = r.topics || [];
    if (!topics.length) { stop(tr('cardNoTopics'), 'topics'); return; }
    topic = topics.some(x => x.id === (keepTopic || r.last)) ? (keepTopic || r.last) : null;
    paintTopic();

    $('[data-save]').addEventListener('click', async () => {
      if (busy) return;
      const x = topics.find(t => t.id === topic);
      if (!x) { err(tr('cardNeedTopic')); return; }
      let cards;
      if (many) {
        cards = $('.fc-many textarea').value.split('\n').map(l => l.split(/\s;\s|;|\t/)).filter(p => p.length >= 2 && p[0].trim() && p.slice(1).join(';').trim())
          .map(p => { const f = p[0].trim(), b = p.slice(1).join(';').trim(); return { front: f, back: b, front_html: fcFromText(f), back_html: fcFromText(b) }; });
        if (!cards.length) { err(tr('cardNeedMany')); return; }
      } else {
        const fh = front.html(), bh = back.html();
        if ((!fcText(fh) && !(image && !onBack)) || (!fcText(bh) && !onBack)) { err(tr('cardNeedBoth')); return; }
        cards = [{ front: fcText(fh), back: fcText(bh), front_html: fh, back_html: bh }];
      }
      busy = true; $('[data-save]').disabled = true; err('');
      const res = await send({ action: 'hl.cardAdd', topicId: x.id, subject: x.subject, cards, ...(image ? { image, imageSide: onBack ? 'back' : 'front' } : {}) });
      busy = false; $('[data-save]').disabled = false;
      if (!res || !res.ok) { err(tr(res && res.error === 'no_notes' ? 'cardNoNotes' : res && res.error === 'offline' ? 'cardOffline' : 'cardFail')); return; }
      const again = $('[data-again]').checked && !many;
      closeCard();
      toast(cards.length === 1 ? tr('cardDone', x.name) : tr('cardDoneN', cards.length, x.name));
      if (again) cardOffer('', x.id);
    });
  }
  // The Notes' font (Onest), shipped in the extension; the system's otherwise.
  let fcFontAsked = false;
  function fcFont() {
    if (fcFontAsked) return;
    fcFontAsked = true;
    try {
      if (!chrome.runtime.getURL || !document.fonts || typeof FontFace !== 'function') return;
      new FontFace('BnOnest', `url(${chrome.runtime.getURL('fonts/onest.woff2')})`, { weight: '100 900' }).load().then(x => document.fonts.add(x)).catch(() => {});
    } catch (e) {}
  }

  // ─── THE NOTES' TIMER ON THE OTHER TABS (29/10/2026) ──────────────────────
  // While a study session runs in the Notes (the site's app), a small timer
  // floats on every other page: the time, ▶/❚❚, dragged anywhere (kept), and
  // a right click to hide it here or not show it any more. The Notes' page
  // hands it over (its localStorage, bn.timer) through the background
  // (bnTimer); a pause or resume here goes back to the Notes' tab, the one
  // that keeps the timer (notes/timerx.js, 'bn-timer-cmd'). Never on the
  // Notes itself, where the timer is already at the foot of the screen.
  const ON_NOTES = window.top === window && location.origin === 'https://www.agoodrawdraw.com.br' && location.pathname.startsWith('/notes/app/');
  if (IS_EXT && ON_NOTES) {
    let last = '';
    const syncTimer = () => {
      let st = null, pr = {};
      try { st = JSON.parse(localStorage.getItem('bn.timer')); pr = JSON.parse(localStorage.getItem('bn.timer.prefs')) || {}; } catch (e) {}
      // The pomodoro (notes/timerx.js): its focus length goes along for the countdown.
      const msg = { state: st && st.id ? st : null, float: pr.pip !== false, mode: ['down', 'pomo'].includes(pr.mode) ? pr.mode : 'up', focus: Math.max(5, Math.min(120, Math.round(Number(pr.focus)) || 25)) };
      const k = JSON.stringify(msg);
      if (k !== last) { last = k; send({ action: 'timer.sync', ...msg }); }
    };
    tmIv = setInterval(syncTimer, 1000);
    addEventListener('storage', syncTimer, SIG);
    syncTimer();
    chrome.runtime.onMessage.addListener(msg => {
      if (msg && msg.action === 'timer.cmd') dispatchEvent(new CustomEvent('bn-timer-cmd', { detail: String(msg.cmd) }));
    });
  }
  let tmEl = null, tmData = null, tmHidden = false, tmTick = 0, tmPos = null;
  const tmFmt = ms => { const x = Math.floor(Math.max(0, ms) / 1000); return [Math.floor(x / 3600), Math.floor(x / 60) % 60, x % 60].map(n => String(n).padStart(2, '0')).join(':'); };
  function tmView() {
    const d = tmData, s = d.state, el = Math.min(12 * 3600000, (s.base || 0) + (s.runAt ? Date.now() - s.runAt : 0));
    const goal = typeof s.goal === 'number' ? s.goal : null;
    // Pomodoro: what is left of the focus, or of the break (the timer paused for it).
    if (d.mode === 'pomo' && s.pomo) {
      const P = s.pomo;
      if (P.phase === 'break') return { text: tmFmt(P.len - (Date.now() - P.at)), over: false, brk: true };
      return { text: tmFmt((d.focus || 25) * 60000 - (el - P.from)), over: false };
    }
    if (d.mode === 'down' && goal) { const left = goal - el; return { text: (left < 0 ? '+' : '') + tmFmt(Math.abs(left)), over: left < 0 }; }
    return { text: tmFmt(el), over: !!goal && el > goal };
  }
  function tmPaint() {
    const s = tmData && tmData.state;
    const show = IS_EXT && !ON_NOTES && window.top === window && s && tmData.float !== false && !tmHidden;
    if (!show) { if (tmEl) { tmEl.remove(); tmEl = null; } clearInterval(tmTick); tmTick = 0; return; }
    if (!tmEl) {
      mount();
      tmEl = el(`<div class="tmf" title="${esc(tr('tmTitle'))}"><span class="tmf-dot"></span><span class="tmf-txt"><small></small><b class="tmf-t"></b></span><button class="tmf-p"></button></div>`);
      shadow.appendChild(tmEl);
      const p = tmPos || { r: 20, b: 92 };
      tmEl.style.right = p.r + 'px'; tmEl.style.bottom = p.b + 'px';
      tmEl.querySelector('.tmf-p').addEventListener('click', async e => {
        e.stopPropagation();
        const r = await send({ action: 'timer.cmd', cmd: tmData.state.runAt ? 'pause' : 'resume' });
        if (!r || !r.ok) toast(tr('tmNoNotes'));
      });
      // Dragged by any part but the button; where it was left is kept.
      tmEl.addEventListener('pointerdown', e => {
        if (e.button !== 0 || e.target.closest('button')) return;
        e.preventDefault();
        const r0 = tmEl.getBoundingClientRect(), dx = e.clientX - r0.left, dy = e.clientY - r0.top;
        tmEl.setPointerCapture(e.pointerId);
        const mv = ev => {
          const x = Math.max(4, Math.min(innerWidth - r0.width - 4, ev.clientX - dx)), y = Math.max(4, Math.min(innerHeight - r0.height - 4, ev.clientY - dy));
          tmEl.style.right = (innerWidth - x - r0.width) + 'px'; tmEl.style.bottom = (innerHeight - y - r0.height) + 'px';
        };
        const up = () => {
          tmEl.removeEventListener('pointermove', mv); tmEl.removeEventListener('pointerup', up);
          tmPos = { r: parseInt(tmEl.style.right, 10), b: parseInt(tmEl.style.bottom, 10) };
          save({ bnTimerPos: tmPos });
        };
        tmEl.addEventListener('pointermove', mv); tmEl.addEventListener('pointerup', up);
      });
      // Right click: hide it on this page, or not show it any more.
      tmEl.addEventListener('contextmenu', e => {
        e.preventDefault(); e.stopPropagation();
        const old = shadow.querySelector('.tmf-menu'); if (old) old.remove();
        const m = el(`<div class="tmf-menu"><button data-m="hide">${esc(tr('tmHide'))}</button><button data-m="never">${esc(tr('tmNever'))}</button><button data-m="open">${esc(tr('tmOpen'))}</button></div>`);
        shadow.appendChild(m);
        m.style.left = Math.min(e.clientX, innerWidth - m.offsetWidth - 6) + 'px';
        m.style.top = Math.max(6, Math.min(e.clientY - m.offsetHeight, innerHeight - m.offsetHeight - 6)) + 'px';
        const close = () => { m.remove(); removeEventListener('mousedown', out, true); };
        const out = ev => { if (!inBox(ev, m)) close(); };
        setTimeout(() => addEventListener('mousedown', out, true));
        m.addEventListener('click', ev => {
          const k = ev.target.closest('[data-m]') && ev.target.closest('[data-m]').dataset.m;
          if (k === 'hide') { tmHidden = true; tmPaint(); }
          else if (k === 'never') { send({ action: 'timer.cmd', cmd: 'floatOff' }); toast(tr('tmNeverDone')); }
          else if (k === 'open') send({ action: 'hl.app', hash: '#/' });
          close();
        });
      });
    }
    const s2 = tmData.state, v = tmView();
    tmEl.classList.toggle('run', !!s2.runAt);
    tmEl.querySelector('small').textContent = v.brk ? tr('tmBreak') : s2.name || '';
    tmEl.querySelector('.tmf-t').textContent = v.text;
    tmEl.querySelector('.tmf-t').classList.toggle('over', v.over);
    tmEl.querySelector('.tmf-t').classList.toggle('brk', !!v.brk);
    const pb = tmEl.querySelector('.tmf-p');
    pb.innerHTML = svg(s2.runAt ? IC.pause : IC.play, 13);
    pb.title = tr(s2.runAt ? 'tmPause' : 'tmResume');
    if (!tmTick) tmTick = setInterval(() => { if (tmEl && tmData && tmData.state) { const w = tmView(); tmEl.querySelector('.tmf-t').textContent = w.text; tmEl.querySelector('.tmf-t').classList.toggle('over', w.over); tmEl.querySelector('.tmf-t').classList.toggle('brk', !!w.brk); } }, 1000);
  }
  if (IS_EXT && !ON_NOTES && window.top === window) {
    chrome.storage.local.get(['bnTimer', 'bnTimerPos']).then(o => { tmPos = o.bnTimerPos || null; tmData = o.bnTimer || null; tmPaint(); }).catch(() => {});
    chrome.storage.onChanged.addListener((ch, area) => {
      if (area !== 'local' || !ch.bnTimer) return;
      const was = tmData && tmData.state && tmData.state.id, now = ch.bnTimer.newValue && ch.bnTimer.newValue.state;
      tmData = ch.bnTimer.newValue || null;
      // Hidden here until another session (or the play again after a stop).
      if (!now || now.id !== was) tmHidden = false;
      tmPaint();
    });
  }

  // ─── WIRING ───────────────────────────────────────────────────────────────
  // Alt+Q quick highlighter, Alt+W the panel — the bar's shortcuts are
  // Alt+letter too, and neither letter is one of them (content.js).
  // Typing: on the page, or in one of our boxes (the closed shadow shows the
  // window only the host, so the focus inside it says).
  const typing = e => editable(e.target) || (e.composedPath().includes(host) && editable(shadow.activeElement));
  function onKey(e) {
    if (!e.isTrusted) return;
    if (inkOn && !typing(e)) {
      // The lasso's selection: Delete removes it, Esc lets it go (a second Esc leaves).
      if (inkLasso && inkLasso.selected && (e.key === 'Delete' || e.key === 'Backspace')) { e.preventDefault(); e.stopPropagation(); inkLasso.del(); return; }
      if (inkLasso && inkLasso.selected && e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); inkLasso.clear(); return; }
      if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); stopInk(); return; }
      if ((e.ctrlKey || e.metaKey) && ((e.code === 'KeyZ' && e.shiftKey) || e.code === 'KeyY')) { e.preventDefault(); e.stopPropagation(); inkRedoStep(); return; }
      if ((e.ctrlKey || e.metaKey) && e.code === 'KeyZ') { e.preventDefault(); e.stopPropagation(); inkUndo(); return; }
      // The Draw's Alt keys, for these tools.
      if (e.altKey && !e.ctrlKey && !e.metaKey) {
        const run = INK_KEYS[e.code] ? () => setInkTool(INK_KEYS[e.code])
          : e.code === 'KeyZ' ? () => inkSize(-1) : e.code === 'KeyX' ? () => inkSize(1)
          : e.code === 'KeyC' ? inkUndo : e.code === 'KeyV' ? inkRedoStep : null;
        if (run) { e.preventDefault(); e.stopPropagation(); run(); return; }
      }
    }
    if (!enabled || !e.altKey || e.ctrlKey || e.metaKey || typing(e)) return;
    // Alt+Shift+B: the Draw's area capture when its bar is open (content.js), ours otherwise.
    if (e.code === 'KeyB' && e.shiftKey) { if (!drawRoot()) { e.preventDefault(); e.stopPropagation(); errCrop(); } return; }
    if (e.code === 'KeyQ') { e.preventDefault(); e.stopPropagation(); toggleQuick(); }
    else if (e.code === 'KeyW') { e.preventDefault(); e.stopPropagation(); panel ? closePanel() : openPanel(); }
  }

  (async function start() {
    let p = {};
    try { p = await chrome.storage.local.get(['hlInkOpts', 'bnNotesAccess', 'hlOn', 'hlQuick', 'hlNudgeUntil', 'hlColor', 'hlOff', 'hlIntroOff', 'hlTourDone', 'hlNotesHidden', 'hlDockHide', 'pdTheme', 'pdLang', 'pdTbPos', 'pdColor', 'pdNoticeHide']); } catch (e) {}
    readPrefs(p);
    let lang = ['auto', 'pt', 'en', 'es', 'fr'].includes(p.pdLang) ? p.pdLang : ((p.pdTbPos || p.pdColor || p.pdNoticeHide) ? 'pt' : 'auto');
    if (lang === 'auto') { const nav = (navigator.language || '').slice(0, 2).toLowerCase(); lang = ['pt', 'es', 'fr'].includes(nav) ? nav : 'en'; }
    L = STR[lang] || STR.en;
    uiLang = STR[lang] ? lang : 'en';
    applyTheme();
    // The Android app's Draw (not the Highlights' browser): only the caderno
    // de erros, for the Draw's area capture — no marking on the page.
    if (window.__bnHlErrOnly) {
      enabled = true;
      let t = 0;
      document.addEventListener('selectionchange', () => { clearTimeout(t); t = setTimeout(() => { const r = currentRange(); if (r) cardChipFor(r); else closeChip(); }, 450); }, SIG);
      return;
    }
    document.addEventListener('mouseup', onPointerUp, SIGC);
    document.addEventListener('keyup', e => { if (e.shiftKey && enabled && prefs.on && !prefs.quick) onPointerUp(e); }, SIGC);
    document.addEventListener('click', onClick, SIGC);
    document.addEventListener('mousedown', e => { if (bar && !inBox(e, bar)) closeBar(); if (cardChip && !inBox(e, cardChip)) closeChip(); }, SIGC);
    addEventListener('scroll', () => { closeBar(); closeChip(); }, { signal: __ac.signal, passive: true, capture: true });
    window.addEventListener('keydown', onKey, SIGC);
    if (TOUCH) {
      let selTimer = 0;
      // A quick tap outside our UI lets the selection go (ticket #14): on
      // sites like TEC a tap on an alternative doesn't clear it by itself. A
      // long press (choosing another word) or a drag (scrolling) doesn't.
      let tap = null;
      document.addEventListener('touchstart', e => {
        const p = e.composedPath();
        // Anything of ours (the menu, a mark's box, the topic picker…) is not "outside".
        tap = e.touches.length === 1 && !p.includes(host) ? { x: e.touches[0].clientX, y: e.touches[0].clientY, at: Date.now() } : null;
      }, { signal: __ac.signal, capture: true, passive: true });
      document.addEventListener('touchend', e => {
        const t0 = tap; tap = null;
        const c = e.changedTouches[0];
        if (!t0 || !c || Date.now() - t0.at > 450 || Math.hypot(c.clientX - t0.x, c.clientY - t0.y) > 10) return;
        const sel = getSelection();
        if (!sel || sel.isCollapsed) return;
        try { sel.removeAllRanges(); } catch (x) {}
        closeBar(); closeChip();
      }, { signal: __ac.signal, capture: true, passive: true });
      document.addEventListener('selectionchange', () => {
        clearTimeout(selTimer);
        selTimer = setTimeout(() => {
          if (!enabled || inkOn) return;
          const r = currentRange();
          if (!r) { closeBar(); closeChip(); return; }
          if (prefs.quick) markSelection(markColor());
          else if (prefs.on) showBar(r);
          else cardChipFor(r);
        }, prefs.quick ? 900 : 450);
      }, SIG);
    }
    try {
      chrome.storage.onChanged.addListener((ch, area) => {
        if (area !== 'local') return;
        const n = {};
        Object.keys(ch).forEach(k => { n[k] = ch[k].newValue; });
        readPrefs(n);
        if (ch.pdTheme) applyTheme();
        if (ch.hlOff) setEnabled(!prefs.off.includes(HOST));
        if (ch.hlQuick || ch.hlOn) renderQuick();
        if (ch.hlOn && !prefs.on) closeBar();
        if (ch.hlNotesHidden) { marks.forEach(restyle); renderPins(); renderPanel(); }
        if (ch.hlDockHide) renderBadge();
      });
    } catch (e) {}
    // Back on the tab: what changed in the Notes meanwhile shows here.
    const askAccess = () => send({ action: 'hl.hasAccess' }).then(r => { hasAccess = r ? !!r.ok : null; });
    askAccess();
    document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') { askAccess(); if (enabled) load(); } }, SIG);
    // A single-page app moving to another address (or TEC to another
    // question): another page's marks.
    spaIv = setInterval(() => {
      const now = pageUrl();
      if (now.split('#')[0] === url.split('#')[0]) return;
      url = now;
      if (!enabled) return;
      unpaintAll(); marks = []; page = null; closePop(); closeBar();
      load();
    }, 1200);
    if (document.readyState === 'loading') await new Promise(r => document.addEventListener('DOMContentLoaded', r, { once: true }));
    setEnabled(!prefs.off.includes(HOST));
    watchTheme();
  })();
})();
