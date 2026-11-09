/* olho.js - OLHO DE DEUS: satelite do planeta, busca de lugares, comando de voz */
(function () {
  var JS = 'https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/leaflet.js';
  var CSS = 'https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/leaflet.css';
  var SAT = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';
  var NOMES = 'https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}';

  var el = null, mapa = null, pino = null, aberto = false, pronto = null;

  function norm(s) {
    return String(s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[.,!?;:]/g, ' ').replace(/\s+/g, ' ').trim().replace(/^(jarvis|jarvi|javis)\s*/, '');
  }
  function falar(t) { try { if (typeof say === 'function') say(t); } catch (e) {} }

  function carregar() {
    if (pronto) return pronto;
    pronto = new Promise(function (ok, erro) {
      if (window.L) { ok(); return; }
      var l = document.createElement('link');
      l.rel = 'stylesheet'; l.href = CSS; document.head.appendChild(l);
      var s = document.createElement('script');
      s.src = JS; s.onload = function () { ok(); };
      s.onerror = function () { pronto = null; erro(new Error('leaflet')); };
      document.head.appendChild(s);
    });
    return pronto;
  }

  function montar() {
    var st = document.createElement('style');
    st.textContent =
      '#olho{position:fixed;inset:0;z-index:9999;background:#010a10;display:none;flex-direction:column;color:#cdf7ff;font:600 15px Rajdhani,system-ui,sans-serif}' +
      '#olho .t{display:flex;align-items:center;justify-content:space-between;padding:calc(8px + env(safe-area-inset-top)) 12px 8px;border-bottom:1px solid #0b3a47;font:500 12px Orbitron,sans-serif;letter-spacing:.14em;color:#3de8ff}' +
      '#olho .m{position:relative;flex:1;min-height:0}' +
      '#olho #olho-mapa{position:absolute;inset:0;background:#000}' +
      '#olho .h{position:absolute;inset:0;pointer-events:none;z-index:500;box-shadow:inset 0 0 90px rgba(1,10,16,.85)}' +
      '#olho .h::before,#olho .h::after{content:"";position:absolute;left:50%;top:50%;background:rgba(61,232,255,.7)}' +
      '#olho .h::before{width:44px;height:1px;margin-left:-22px}#olho .h::after{width:1px;height:44px;margin-top:-22px}' +
      '#olho .c{position:absolute;left:10px;bottom:8px;z-index:600;font:500 11px Orbitron,sans-serif;color:#3de8ff;text-shadow:0 0 6px #000;pointer-events:none}' +
      '#olho .b{display:flex;gap:6px;padding:8px 10px calc(8px + env(safe-area-inset-bottom));border-top:1px solid #0b3a47}' +
      '#olho input{flex:1;min-width:0;background:rgba(0,0,0,.5);border:1px solid #1aa8c4;color:#cdf7ff;font:inherit;font-size:16px;padding:8px}' +
      '#olho button{background:transparent;border:1px solid #1aa8c4;color:#3de8ff;font:500 11px Orbitron,sans-serif;letter-spacing:.08em;padding:8px 10px}' +
      '.olho-pino{width:18px;height:18px;border:2px solid #3de8ff;border-radius:50%;box-shadow:0 0 12px #3de8ff}';
    document.head.appendChild(st);
    el = document.createElement('div');
    el.id = 'olho';
    el.innerHTML =
      '<div class="t"><span>OLHO DE DEUS</span><button type="button" id="olho-x">FECHAR</button></div>' +
      '<div class="m"><div id="olho-mapa"></div><div class="h"></div><div class="c" id="olho-c">SATÉLITE EM ÓRBITA</div></div>' +
      '<div class="b"><input id="olho-q" placeholder="Lugar (ex.: Paris, Cristo Redentor)…" autocomplete="off"><button type="button" id="olho-ir">IR</button><button type="button" id="olho-mundo">MUNDO</button></div>';
    document.body.appendChild(el);
    el.querySelector('#olho-x').onclick = fechar;
    el.querySelector('#olho-ir').onclick = function () { buscar(el.querySelector('#olho-q').value); };
    el.querySelector('#olho-mundo').onclick = mundo;
    el.querySelector('#olho-q').addEventListener('keydown', function (e) { if (e.key === 'Enter') buscar(this.value); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && aberto) fechar(); });
  }

  function iniciarMapa() {
    if (mapa) { mapa.invalidateSize(); return; }
    mapa = L.map('olho-mapa', { zoomControl: false, worldCopyJump: true, minZoom: 2, maxZoom: 18, attributionControl: true });
    L.tileLayer(SAT, { maxZoom: 18, attribution: 'Imagens: Esri, Maxar, Earthstar Geographics' }).addTo(mapa);
    L.tileLayer(NOMES, { maxZoom: 18, opacity: 0.85 }).addTo(mapa);
    mapa.setView([10, -30], 2);
    mapa.on('move', function () {
      var c = mapa.getCenter();
      el.querySelector('#olho-c').textContent = c.lat.toFixed(4) + '°  ' + c.lng.toFixed(4) + '°  ·  ZOOM ' + mapa.getZoom();
    });
  }

  function abrir(lugar) {
    if (!el) montar();
    el.style.display = 'flex';
    aberto = true;
    carregar().then(function () {
      iniciarMapa();
      if (lugar) buscar(lugar); else falar('Olho de Deus ativo, senhor. Diga um lugar.');
    }).catch(function () {
      falar('Não consegui carregar o mapa de satélite, senhor.');
    });
  }

  function fechar() {
    if (el) el.style.display = 'none';
    aberto = false;
  }

  function mundo() {
    if (mapa) mapa.flyTo([10, -30], 2, { duration: 2 });
  }

  function buscar(q) {
    q = String(q || '').trim();
    if (!q || !mapa) return;
    el.querySelector('#olho-c').textContent = 'LOCALIZANDO…';
    fetch('https://nominatim.openstreetmap.org/search?format=json&limit=1&accept-language=pt-BR&q=' + encodeURIComponent(q))
      .then(function (r) { return r.json(); })
      .then(function (a) {
        if (!a || !a.length) { falar('Não encontrei esse lugar, senhor.'); return; }
        var p = a[0], b = p.boundingbox;
        var lat = parseFloat(p.lat), lon = parseFloat(p.lon);
        if (b && b.length === 4) {
          mapa.flyToBounds([[parseFloat(b[0]), parseFloat(b[2])], [parseFloat(b[1]), parseFloat(b[3])]], { maxZoom: 16, duration: 3 });
        } else {
          mapa.flyTo([lat, lon], 15, { duration: 3 });
        }
        if (pino) mapa.removeLayer(pino);
        pino = L.marker([lat, lon], { icon: L.divIcon({ className: '', html: '<div class="olho-pino"></div>', iconSize: [18, 18], iconAnchor: [9, 9] }) }).addTo(mapa);
        falar('Localizado: ' + String(p.display_name || q).split(',').slice(0, 2).join(',') + '.');
      })
      .catch(function () { falar('Falha ao localizar o lugar, senhor.'); });
  }

  // ---------- comandos (digitados ou por voz) ----------
  var RX_FECHAR = /(fechar|sair|voltar|fecha)( d?o| do)? ?(olho|satelite|mapa|painel)|^(fechar|fecha|sair)$/;
  var RX_MUNDO = /(ver |mostrar )?(o )?(planeta|mundo|terra) inteir|visao do planeta|olhar o planeta|ver o planeta/;
  var RX_OLHO = /(?:olho de deus|modo satelite|abrir (?:o )?satelite|satelite (?:em cima )?(?:de|da|do|em|sobre|na|no))\s*(.*)$/;

  function tratar(texto) {
    var v = norm(texto);
    if (!v) return false;
    if (aberto && RX_FECHAR.test(v)) { fechar(); falar('Olho de Deus desativado, senhor.'); return true; }
    var m = RX_OLHO.exec(v);
    if (m) {
      var lugar = (m[1] || '').replace(/^(em cima de|sobre|em|de|da|do|na|no)\s+/, '').trim();
      if (aberto && mapa) { if (lugar) buscar(lugar); else falar('Diga o lugar, senhor.'); }
      else abrir(lugar);
      return true;
    }
    if (aberto && mapa && RX_MUNDO.test(v)) { mundo(); return true; }
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

  window.jarvisOlho = { abrir: abrir, fechar: fechar, buscar: buscar };
})();
