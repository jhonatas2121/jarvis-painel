(function () {
  var go = document.getElementById('go');
  var inp = document.getElementById('in');
  var reply = document.getElementById('reply');
  if (!go || !inp) return;

  var items = [];
  var idx = 0;
  var w = 280;
  var box = null, frame = null, titleEl = null;

  function norm(s) {
    return String(s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[.,!?;:]+/g, ' ').replace(/\s+/g, ' ').trim();
  }

  function decode(s) {
    var ta = document.createElement('textarea');
    ta.innerHTML = s;
    return ta.value;
  }

  function falar(t) {
    try {
      if (typeof say === 'function') say(t);
      else if (typeof speak === 'function') speak(t);
    } catch (e) {}
  }

  function msg(t) {
    try { if (reply) reply.textContent = t; } catch (e) {}
  }

  function setW(n) {
    var max = Math.max(160, window.innerWidth - 20);
    w = Math.max(160, Math.min(max, Math.round(n)));
    if (box) box.style.width = w + 'px';
  }

  function build() {
    if (box) return;
    var st = document.createElement('style');
    st.textContent =
      '#vw{position:fixed;right:10px;bottom:10px;width:280px;z-index:9998;background:rgba(1,10,16,.94);' +
      'border:1px solid #3de8ff;box-shadow:0 0 18px rgba(61,232,255,.45);color:#3de8ff;display:none;' +
      'font:500 11px Orbitron,sans-serif}' +
      '#vw .vh{display:flex;align-items:center;gap:6px;padding:4px 6px 4px 30px;border-bottom:1px solid rgba(61,232,255,.4);min-height:26px}' +
      '#vw .vt{flex:1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-size:10px}' +
      '#vw .vb{background:transparent;border:1px solid #3de8ff;color:#3de8ff;width:24px;height:22px;' +
      'font:700 12px Orbitron,sans-serif;padding:0;cursor:pointer}' +
      '#vw .vr{position:absolute;left:0;top:0;width:28px;height:28px;cursor:nwse-resize;touch-action:none;' +
      'display:flex;align-items:center;justify-content:center;z-index:2;font-size:14px}' +
      '#vw .vv{position:relative;width:100%;aspect-ratio:16/9;background:#000}' +
      '#vw iframe{position:absolute;inset:0;width:100%;height:100%;border:0}';
    document.head.appendChild(st);

    box = document.createElement('div');
    box.id = 'vw';
    box.innerHTML =
      '<div class="vr" id="vwr">&#9700;</div>' +
      '<div class="vh"><span class="vt" id="vwt">VIDEO</span>' +
      '<button class="vb" id="vwm" type="button">-</button>' +
      '<button class="vb" id="vwp" type="button">+</button>' +
      '<button class="vb" id="vwx" type="button">x</button></div>' +
      '<div class="vv" id="vwv"></div>';
    document.body.appendChild(box);
    titleEl = document.getElementById('vwt');

    document.getElementById('vwm').addEventListener('click', function () { setW(w / 1.3); });
    document.getElementById('vwp').addEventListener('click', function () { setW(w * 1.3); });
    document.getElementById('vwx').addEventListener('click', fechar);

    var h = document.getElementById('vwr');
    var sx = 0, sy = 0, sw = 0, drag = false;
    h.addEventListener('pointerdown', function (e) {
      drag = true; sx = e.clientX; sy = e.clientY; sw = w;
      try { h.setPointerCapture(e.pointerId); } catch (x) {}
      e.preventDefault();
    });
    h.addEventListener('pointermove', function (e) {
      if (!drag) return;
      var dx = sx - e.clientX;
      var dy = (sy - e.clientY) * 1.78;
      setW(sw + Math.max(dx, dy));
    });
    function end() { drag = false; }
    h.addEventListener('pointerup', end);
    h.addEventListener('pointercancel', end);
  }

  function abrir(i) {
    build();
    var it = items[i];
    if (!it) return;
    idx = i;
    setW(w);
    box.style.display = 'block';
    titleEl.textContent = decode(it.title || 'VIDEO');
    var v = document.getElementById('vwv');
    v.innerHTML = '';
    frame = document.createElement('iframe');
    frame.allow = 'autoplay; encrypted-media; picture-in-picture; fullscreen';
    frame.allowFullscreen = true;
    frame.src = 'https://www.youtube.com/embed/' + it.id + '?autoplay=1&playsinline=1&rel=0';
    v.appendChild(frame);
    msg('Vídeo: ' + decode(it.title || '') + (it.channel ? ' (' + decode(it.channel) + ')' : ''));
  }

  function fechar() {
    if (!box) return;
    var v = document.getElementById('vwv');
    if (v) v.innerHTML = '';
    frame = null;
    box.style.display = 'none';
  }

  function aberto() { return box && box.style.display === 'block'; }

  function buscar(q) {
    var pin = '';
    try { pin = getPin() || ''; } catch (e) {}
    msg('Procurando: ' + q + '...');
    var ctrl = new AbortController();
    var timer = setTimeout(function () { ctrl.abort(); }, 12000);
    fetch('/api/youtube', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ q: q, pin: pin }),
      signal: ctrl.signal
    })
      .then(function (r) { return r.json().then(function (d) { return { ok: r.ok, d: d }; }); })
      .then(function (x) {
        clearTimeout(timer);
        if (!x.ok) {
          msg('Erro na busca de vídeo: ' + ((x.d && x.d.error) || 'desconhecido'));
          falar('Não consegui buscar o vídeo, senhor.');
          return;
        }
        items = (x.d && x.d.items) || [];
        if (!items.length) {
          msg('Nenhum vídeo encontrado para: ' + q);
          falar('Não encontrei nenhum vídeo, senhor.');
          return;
        }
        abrir(0);
        falar('Tocando agora, senhor.');
      })
      .catch(function () {
        clearTimeout(timer);
        msg('Falha ou demora ao buscar o vídeo.');
        falar('A busca demorou demais, senhor.');
      });
  }

  function proximo() {
    if (!items.length) { msg('Nenhuma busca de vídeo ativa.'); return; }
    if (idx + 1 >= items.length) {
      msg('Não há mais resultados dessa busca.');
      falar('Não há mais resultados, senhor.');
      return;
    }
    abrir(idx + 1);
  }

  // devolve true se era um comando de video
  function comando(texto) {
    var t = norm(texto);
    if (!t || t.length > 90) return false;
    var temAlvo = /\b(video|janela|tela)\b/.test(t);

    if (temAlvo && /\b(fech\w*|tir\w*|desliga\w*|some|esconde\w*)\b/.test(t)) { fechar(); return true; }
    if (temAlvo && /\b(aument\w*|ampli\w*|maior|cresc\w*)\b/.test(t)) { build(); setW(w * 1.3); return true; }
    if (temAlvo && /\b(diminu\w*|reduz\w*|menor|encolh\w*)\b/.test(t)) { build(); setW(w / 1.3); return true; }
    if (/\b(proximo|outro|seguinte)\b/.test(t) && /\bvideo\b/.test(t)) { proximo(); return true; }

    var m = t.match(/^(tocar|toque|toca|colocar|coloca|passar|passa|abrir|abre|pesquisar|pesquise|procurar|procure|buscar|busque)\s+(.+)$/);
    if (!m) return false;
    var verbo = m[1];
    var resto = m[2];
    var generico = /^(pesquis|procur|busc|abr)/.test(verbo);
    if (generico && !/\b(video|videos|youtube)\b/.test(resto)) return false;
    if (/\bvolume\b/.test(resto)) return false;

    var q = resto
      .replace(/\b(no|do|pelo|pro)\s+youtube\b/g, ' ')
      .replace(/\byoutube\b/g, ' ')
      .replace(/\b(videos?|musica|musicas)\b/g, ' ')
      .replace(/\b(um|uma|o|a|os|as|de|do|da|dos|das|sobre|pra|para)\b/g, ' ')
      .replace(/\s+/g, ' ').trim();
    if (!q) return false;

    buscar(q);
    return true;
  }

  // Captura na janela: roda antes dos outros scripts
  window.addEventListener('click', function (e) {
    if (e.target !== go && !go.contains(e.target)) return;
    var v = inp.value || '';
    if (!comando(v)) return;
    e.preventDefault();
    e.stopImmediatePropagation();
    inp.value = '';
    inp.dispatchEvent(new Event('input', { bubbles: true }));
  }, true);

  window.addEventListener('resize', function () { setW(w); });
})();
