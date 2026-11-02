(function () {
  // Codigo do video do YouTube (o que vem depois de youtu.be/ ou v= no link)
  var MUSIC = 'XcR9_P2hScQ';

  var go = document.getElementById('go');
  var inp = document.getElementById('in');
  var core = document.getElementById('core');
  if (!go || !inp) return;

  var frame = null;
  var running = false;

  function vol(v) {
    try {
      frame.contentWindow.postMessage(JSON.stringify({ event: 'command', func: 'setVolume', args: [v] }), '*');
    } catch (e) {}
  }

  function playMusic() {
    if (!MUSIC || frame) return;
    frame = document.createElement('iframe');
    frame.allow = 'autoplay';
    frame.style.cssText = 'position:fixed;left:-400px;top:0;width:200px;height:200px;border:0;opacity:0;pointer-events:none';
    frame.src = 'https://www.youtube.com/embed/' + MUSIC + '?autoplay=1&enablejsapi=1&loop=1&playlist=' + MUSIC;
    document.body.appendChild(frame);
    frame.addEventListener('load', function () {
      setTimeout(function () { vol(20); }, 1200);
    });
  }

  function stopMusic() {
    if (frame) { frame.remove(); frame = null; }
  }

  function talking() {
    try { if (typeof curAudio !== 'undefined' && curAudio && !curAudio.paused && !curAudio.ended) return true; } catch (e) {}
    try { if (window.speechSynthesis && window.speechSynthesis.speaking) return true; } catch (e) {}
    return false;
  }

  function waitDone() {
    return new Promise(function (resolve) {
      var started = false;
      var t0 = Date.now();
      var iv = setInterval(function () {
        var p = talking();
        if (p) started = true;
        if ((started && !p) || Date.now() - t0 > 25000) {
          clearInterval(iv);
          resolve();
        }
      }, 250);
    });
  }

  function falar(texto) {
    if (typeof say === 'function') say(texto);
    else if (typeof speak === 'function') speak(texto);
  }

  function buscarNoticias() {
    var pin = '';
    try { pin = getPin() || ''; } catch (e) {}
    var ctrl = new AbortController();
    var timer = setTimeout(function () { ctrl.abort(); }, 20000);
    return fetch('/api/ask', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        q: 'Diga as 3 principais manchetes de hoje no Brasil, uma frase curta cada, separadas por ponto. No maximo 200 caracteres no total. Sem introducao.',
        pin: pin,
        search: true
      }),
      signal: ctrl.signal
    })
      .then(function (r) { return r.json(); })
      .then(function (d) {
        clearTimeout(timer);
        var t = String((d && d.text) || '').replace(/[*#\n]+/g, ' ').trim();
        if (t.length > 230) {
          t = t.slice(0, 230);
          var i = t.lastIndexOf('.');
          if (i > 60) t = t.slice(0, i + 1);
        }
        return t;
      })
      .catch(function () { clearTimeout(timer); return ''; });
  }

  function textoHora(h, m) {
    var a;
    if (h === 0) a = 'É meia-noite';
    else if (h === 1) a = 'É uma hora';
    else a = 'São ' + h + ' horas';
    var b = m > 0 ? ' e ' + m + (m === 1 ? ' minuto' : ' minutos') : ' em ponto';
    return a + b + '.';
  }

  function falas(h, m) {
    var hora = textoHora(h, m);
    if (h >= 5 && h <= 11) {
      return {
        abre: 'Acordando. Sistema inicializando, senhor. ' + hora + ' O universo não parou enquanto o senhor dormia.',
        fim: 'O dia está lindo para subir campanhas e fazer muito dinheiro.'
      };
    }
    if (h >= 12 && h <= 17) {
      return {
        abre: 'Reativando sistemas, senhor. Boa tarde. ' + hora + ' O universo não parou enquanto o senhor descansava.',
        fim: 'A tarde é ótima para subir campanhas e fazer dinheiro.'
      };
    }
    if (h >= 18 && h <= 23) {
      return {
        abre: 'Sistema inicializando, senhor. Boa noite. ' + hora + ' O universo não parou enquanto o senhor esteve fora.',
        fim: 'A noite é perfeita para planejar as campanhas de amanhã e fazer dinheiro.'
      };
    }
    return {
      abre: 'Sistema inicializando, senhor. Já é madrugada. ' + hora + ' O universo não para, e pelo visto o senhor também não.',
      fim: 'Mas lembre-se de descansar. Os resultados vêm com disciplina e sono.'
    };
  }

  async function acordar() {
    if (running) return;
    running = true;
    if (core) core.classList.add('think');
    playMusic();

    var parts = new Date().toLocaleTimeString('pt-BR', {
      timeZone: 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit', hour12: false
    }).split(':');
    var h = parseInt(parts[0], 10) % 24;
    var m = parseInt(parts[1], 10);
    var f = falas(h, m);

    var noticias = buscarNoticias();

    setTimeout(function () { vol(15); }, 300);
    falar(f.abre);
    await waitDone();

    var n = await noticias;
    falar((n ? 'Manchetes de hoje: ' + n + ' ' : '') + f.fim);
    await waitDone();

    vol(30);
    if (core) core.classList.remove('think');
    running = false;
  }

  document.addEventListener('click', function (e) {
    if (e.target !== go && !go.contains(e.target)) return;
    if (!/^\s*acord(ar|a|e)\b/i.test(inp.value || '')) return;
    e.preventDefault();
    e.stopImmediatePropagation();
    inp.value = '';
    inp.dispatchEvent(new Event('input', { bubbles: true }));
    acordar();
  }, true);

  if (core) {
    core.addEventListener('click', function () {
      stopMusic();
      running = false;
    });
  }
})();
