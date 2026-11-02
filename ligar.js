(function () {
  function norm(s) {
    return String(s || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[.,!?;:]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .replace(/^(jarvis|jarvi|javis)\s*/, '');
  }
  function falar(t) {
    try { if (typeof say === 'function') say(t); } catch (e) {}
  }
  function abrir(url, nome, aviso) {
    falar(aviso);
    setTimeout(function () { window.location.href = url; }, 700);
    setTimeout(function () {
      if (document.visibilityState === 'visible') {
        falar('Não consegui abrir ' + nome + '. Confira se o aplicativo está instalado.');
      }
    }, 3800);
  }
  function numero(txt) {
    var d = String(txt || '').replace(/\D/g, '');
    return d.length >= 8 ? d : '';
  }
  function tratar(texto) {
    var v = norm(texto);
    if (!v) return false;
    var m;
    if (/^(abrir|abre|abra|iniciar|ir para)( o)? (whats ?app|zap ?zap|zap)$/.test(v)) {
      abrir('whatsapp://send', 'o WhatsApp', 'Abrindo o WhatsApp, senhor.');
      return true;
    }
    if (/^(abrir|abre|abra|iniciar|ir para)( o)? discord$/.test(v)) {
      abrir('discord://', 'o Discord', 'Abrindo o Discord, senhor.');
      return true;
    }
    m = v.match(/^(?:mandar |enviar |abrir |chamar )?(?:whats ?app|zap ?zap|zap) (?:para|pra) (.+)$/);
    if (m) {
      var n1 = numero(m[1]);
      if (n1) {
        if (n1.length <= 11) n1 = '55' + n1;
        abrir('https://wa.me/' + n1, 'o WhatsApp', 'Abrindo a conversa no WhatsApp, senhor.');
        return true;
      }
      falar('Preciso do número com DDD para abrir a conversa, senhor.');
      return true;
    }
    m = v.match(/^(?:ligar|liga|ligue|telefonar|chamar)(?: para| pra)? (.+)$/);
    if (m) {
      var n2 = numero(m[1]);
      if (n2) {
        abrir('tel:' + n2, 'o discador', 'Preparando a ligação, senhor. Toque em ligar.');
        return true;
      }
    }
    return false;
  }
  function interceptar(e) {
    var inp = document.getElementById('in');
    if (!inp) return;
    if (tratar(inp.value)) {
      e.stopImmediatePropagation();
      e.preventDefault();
      inp.value = '';
    }
  }
  window.addEventListener('click', function (e) {
    var go = document.getElementById('go');
    if (go && e.target && (e.target === go || go.contains(e.target))) interceptar(e);
  }, true);
  window.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' && e.target && e.target.id === 'in') interceptar(e);
  }, true);
})();
