/* olho.js v2 - OLHO DE DEUS: planeta 3D girando com satelites; ao aproximar, mergulha na atmosfera ate o mapa de satelite */
(function () {
  var CDN = 'https://cdn.jsdelivr.net/npm/';
  var U = {
    globe: CDN + 'globe.gl@2.45.1/dist/globe.gl.min.js',
    leaf: CDN + 'leaflet@1.9.4/dist/leaflet.js',
    leafCss: CDN + 'leaflet@1.9.4/dist/leaflet.css',
    terra: CDN + 'three-globe/example/img/earth-blue-marble.jpg',
    relevo: CDN + 'three-globe/example/img/earth-topology.png',
    fundo: CDN + 'three-globe/example/img/night-sky.png',
    sat: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    nomes: 'https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}',
    iss: 'https://api.wheretheiss.at/v1/satellites/25544'
  };
  var R_KM = 6371, PI2 = Math.PI * 2, D2R = Math.PI / 180;
  var ENTRA = 0.22;   // altitude (em raios da Terra) em que entra na atmosfera
  var SAI_Z = 5;      // zoom do mapa em que volta para o espaco

  var el = null, mapa = null, world = null, cv = null, pinoMapa = null;
  var aberto = false, modo = 'globo', alvo = null, raf = 0, issT = 0, globoOk = true;
  var iss = { lat: 0, lng: 0, real: false }, cache = {};

  // orbitas decorativas (nao sao satelites reais)
  var ORB = [
    { i: 53, o: 0.0, alt: 0.14, w: 0.30, n: 5 },
    { i: 97, o: 1.7, alt: 0.20, w: 0.24, n: 5 },
    { i: 28, o: 3.4, alt: 0.10, w: 0.36, n: 4 },
    { i: 65, o: 5.0, alt: 0.28, w: 0.20, n: 3 }
  ];

  function norm(s) {
    return String(s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[.,!?;:]/g, ' ').replace(/\s+/g, ' ').trim().replace(/^(jarvis|jarvi|javis)\s*/, '');
  }
  function falar(t) { try { if (typeof say === 'function') say(t); } catch (e) {} }
  function q(id) { return el.querySelector(id); }

  function js(url) {
    if (cache[url]) return cache[url];
    cache[url] = new Promise(function (ok, erro) {
      var s = document.createElement('script');
      s.src = url; s.onload = function () { ok(); };
      s.onerror = function () { delete cache[url]; erro(new Error(url)); };
      document.head.appendChild(s);
    });
    return cache[url];
  }
  function carregar() {
    var l = document.createElement('link');
    l.rel = 'stylesheet'; l.href = U.leafCss; document.head.appendChild(l);
    var a = window.L ? Promise.resolve() : js(U.leaf);
    var b = window.Globe ? Promise.resolve() : js(U.globe).catch(function () { globoOk = false; });
    return Promise.all([a, b]);
  }

  // ---------- matematica ----------
  function vec(lat, lng, r) {
    var a = lat * D2R, b = lng * D2R;
    return [r * Math.cos(a) * Math.cos(b), r * Math.cos(a) * Math.sin(b), r * Math.sin(a)];
  }
  function oculto(pov, lat, lng, alt) {
    var C = vec(pov.lat, pov.lng, 1 + pov.altitude), P = vec(lat, lng, 1 + alt);
    var D = [P[0] - C[0], P[1] - C[1], P[2] - C[2]];
    var a = D[0] * D[0] + D[1] * D[1] + D[2] * D[2];
    var b = 2 * (C[0] * D[0] + C[1] * D[1] + C[2] * D[2]);
    var c = C[0] * C[0] + C[1] * C[1] + C[2] * C[2] - 1;
    var d = b * b - 4 * a * c;
    if (d <= 0) return false;
    var t = (-b - Math.sqrt(d)) / (2 * a);
    return t > 0 && t < 1;
  }
  function posOrb(incl, raan, th) {
    var x = Math.cos(th), y = Math.sin(th), i = incl * D2R;
    var y1 = y * Math.cos(i), z1 = y * Math.sin(i);
    var x2 = x * Math.cos(raan) - y1 * Math.sin(raan), y2 = x * Math.sin(raan) + y1 * Math.cos(raan);
    return [Math.asin(z1) / D2R, Math.atan2(y2, x2) / D2R];
  }
  function zDeAlt(a) {
    return Math.max(SAI_Z + 1, Math.min(16, Math.round(4 + 1.4 * Math.log(1 / Math.max(a, 0.002)) / Math.LN2)));
  }
  function altDeZ(z) { return Math.pow(2, (4 - z) / 1.4); }

  // ---------- tela ----------
  function montar() {
    var st = document.createElement('style');
    st.textContent =
      '#olho{position:fixed;inset:0;z-index:9999;background:#010a10;display:none;flex-direction:column;color:#cdf7ff;font:600 15px Rajdhani,system-ui,sans-serif}' +
      '#olho .t{display:flex;align-items:center;justify-content:space-between;padding:calc(8px + env(safe-area-inset-top)) 12px 8px;border-bottom:1px solid #0b3a47;font:500 12px Orbitron,sans-serif;letter-spacing:.14em;color:#3de8ff}' +
      '#olho .m{position:relative;flex:1;min-height:0;overflow:hidden}' +
      '#olho .m>div,#olho .m>canvas{position:absolute;inset:0;width:100%;height:100%}' +
      '#olho-globo{z-index:1}#olho-cv{z-index:2;pointer-events:none}' +
      '#olho-mapa{z-index:3;background:#000;opacity:0;pointer-events:none;transition:opacity .9s}' +
      '#olho.map #olho-mapa{opacity:1;pointer-events:auto}' +
      '#olho-atm{z-index:4;pointer-events:none;opacity:0;transition:opacity .7s;background:radial-gradient(circle,rgba(200,230,255,.9),rgba(70,140,230,.6) 45%,rgba(2,10,30,0) 80%)}' +
      '#olho-atm.on{opacity:1;transition:opacity .35s}' +
      '#olho .h{z-index:5;pointer-events:none;box-shadow:inset 0 0 90px rgba(1,10,16,.8)}' +
      '#olho .h::before,#olho .h::after{content:"";position:absolute;left:50%;top:50%;background:rgba(61,232,255,.7)}' +
      '#olho .h::before{width:44px;height:1px;margin-left:-22px}#olho .h::after{width:1px;height:44px;margin-top:-22px}' +
      '#olho .m>.c{inset:auto auto 8px 10px;width:auto;height:auto;z-index:6;font:500 11px Orbitron,sans-serif;color:#3de8ff;text-shadow:0 0 6px #000;pointer-events:none}' +
      '#olho .b{display:flex;gap:6px;padding:8px 10px calc(8px + env(safe-area-inset-bottom));border-top:1px solid #0b3a47}' +
      '#olho input{flex:1;min-width:0;background:rgba(0,0,0,.5);border:1px solid #1aa8c4;color:#cdf7ff;font:inherit;font-size:16px;padding:8px}' +
      '#olho button{background:transparent;border:1px solid #1aa8c4;color:#3de8ff;font:500 11px Orbitron,sans-serif;letter-spacing:.08em;padding:8px 10px}' +
      '.olho-pino{width:18px;height:18px;border:2px solid #3de8ff;border-radius:50%;box-shadow:0 0 12px #3de8ff}';
    document.head.appendChild(st);
    el = document.createElement('div');
    el.id = 'olho';
    el.innerHTML =
      '<div class="t"><span>OLHO DE DEUS</span><button type="button" id="olho-x">FECHAR</button></div>' +
      '<div class="m"><div id="olho-globo"></div><canvas id="olho-cv"></canvas><div id="olho-mapa"></div><div id="olho-atm"></div><div class="h"></div><div class="c" id="olho-c"></div></div>' +
      '<div class="b"><input id="olho-q" placeholder="Lugar (ex.: Paris, Cristo Redentor)…" autocomplete="off"><button type="button" id="olho-ir">IR</button><button type="button" id="olho-mundo">MUNDO</button></div>';
    document.body.appendChild(el);
    cv = q('#olho-cv');
    q('#olho-x').onclick = fechar;
    q('#olho-ir').onclick = function () { buscar(q('#olho-q').value); };
    q('#olho-mundo').onclick = mundo;
    q('#olho-q').addEventListener('keydown', function (e) { if (e.key === 'Enter') buscar(this.value); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && aberto) fechar(); });
    window.addEventListener('resize', ajustar);
  }

  function ajustar() {
    if (!el || !aberto) return;
    var m = q('.m'), w = m.clientWidth, h = m.clientHeight, d = Math.min(window.devicePixelRatio || 1, 2);
    if (world && w && h) world.width(w).height(h);
    cv.width = Math.round(w * d); cv.height = Math.round(h * d);
    if (mapa) mapa.invalidateSize();
  }

  function flash() {
    var a = q('#olho-atm');
    a.classList.add('on');
    setTimeout(function () { a.classList.remove('on'); }, 450);
  }

  function iniciarMapa() {
    if (mapa) return;
    mapa = L.map('olho-mapa', { zoomControl: false, worldCopyJump: true, minZoom: 2, maxZoom: 18 });
    L.tileLayer(U.sat, { maxZoom: 18, attribution: 'Imagens: Esri, Maxar, Earthstar Geographics' }).addTo(mapa);
    L.tileLayer(U.nomes, { maxZoom: 18, opacity: 0.85 }).addTo(mapa);
    mapa.setView([10, -30], 3);
    mapa.on('move', function () {
      if (modo !== 'mapa') return;
      var c = mapa.getCenter();
      q('#olho-c').textContent = c.lat.toFixed(4) + '°  ' + c.lng.toFixed(4) + '°  ·  SUPERFÍCIE  ·  ZOOM ' + mapa.getZoom();
    });
    mapa.on('zoomend', function () {
      if (modo === 'mapa' && globoOk && mapa.getZoom() <= SAI_Z) sairMapa();
    });
  }

  function iniciarGlobo() {
    if (world || !globoOk || !window.Globe) return;
    world = new Globe(q('#olho-globo'), { animateIn: false })
      .globeImageUrl(U.terra).bumpImageUrl(U.relevo).backgroundImageUrl(U.fundo)
      .showAtmosphere(true).atmosphereColor('#5ab4ff').atmosphereAltitude(0.22)
      .pointOfView({ lat: 10, lng: -30, altitude: 2.4 })
      .pointsData([]).pointLat('lat').pointLng('lng').pointAltitude(0.015).pointRadius(0.5)
      .pointColor(function () { return '#3de8ff'; });
    var c = world.controls();
    c.autoRotate = true; c.autoRotateSpeed = 0.45;
    c.minDistance = world.getGlobeRadius() * 1.05;
    c.maxDistance = world.getGlobeRadius() * 6;
    c.addEventListener('start', function () { c.autoRotate = false; });
  }

  // ---------- globo <-> mapa ----------
  function entrarMapa(pov) {
    modo = 'mapa';
    var a = alvo || { lat: pov.lat, lng: pov.lng, z: zDeAlt(pov.altitude) };
    alvo = null;
    flash();
    el.classList.add('map');
    mapa.invalidateSize();
    mapa.setView([a.lat, a.lng], a.z, { animate: false });
    cv.getContext('2d').clearRect(0, 0, cv.width, cv.height);
  }
  function sairMapa() {
    modo = 'globo';
    var c = mapa.getCenter();
    flash();
    el.classList.remove('map');
    if (world) {
      world.pointOfView({ lat: c.lat, lng: c.lng, altitude: 0.6 }, 0);
      world.controls().autoRotate = false;
    }
  }
  function mundo() {
    if (!world) { if (mapa) mapa.flyTo([10, -30], 3, { duration: 2 }); return; }
    if (modo === 'mapa') { var c = mapa.getCenter(); sairMapa(); world.pointOfView({ lat: c.lat, lng: c.lng, altitude: 0.6 }, 0); }
    alvo = null;
    world.pointOfView({ lat: 10, lng: -30, altitude: 2.4 }, 2500);
    world.controls().autoRotate = true;
  }

  // ---------- desenho dos satelites ----------
  function ponto(g, pov, lat, lng, alt, cor, raio, rotulo, alfa) {
    if (oculto(pov, lat, lng, alt)) return;
    var p = world.getScreenCoords(lat, lng, alt);
    if (!p) return;
    g.globalAlpha = alfa;
    g.fillStyle = cor;
    g.shadowColor = cor; g.shadowBlur = raio * 3;
    g.beginPath(); g.arc(p.x, p.y, raio, 0, PI2); g.fill();
    g.shadowBlur = 0;
    if (rotulo) { g.font = '600 11px Rajdhani,sans-serif'; g.fillText(rotulo, p.x + 7, p.y - 6); }
    g.globalAlpha = 1;
  }
  function desenhar(pov, t) {
    var g = cv.getContext('2d'), d = cv.width / Math.max(1, q('.m').clientWidth);
    g.setTransform(d, 0, 0, d, 0, 0);
    g.clearRect(0, 0, cv.width, cv.height);
    ORB.forEach(function (o) {
      g.strokeStyle = 'rgba(61,232,255,0.2)'; g.lineWidth = 1; g.beginPath();
      var antes = false;
      for (var s = 0; s <= 120; s++) {
        var p = posOrb(o.i, o.o, s / 120 * PI2);
        if (oculto(pov, p[0], p[1], o.alt)) { antes = false; continue; }
        var c = world.getScreenCoords(p[0], p[1], o.alt);
        if (!c) { antes = false; continue; }
        if (antes) g.lineTo(c.x, c.y); else g.moveTo(c.x, c.y);
        antes = true;
      }
      g.stroke();
      for (var k = 0; k < o.n; k++) {
        var th = k / o.n * PI2 + o.w * t;
        for (var j = 10; j >= 1; j--) {
          var pt = posOrb(o.i, o.o, th - j * 0.05);
          ponto(g, pov, pt[0], pt[1], o.alt, '#8fe9ff', 1.1, '', 0.04 * (11 - j));
        }
        var ps = posOrb(o.i, o.o, th);
        ponto(g, pov, ps[0], ps[1], o.alt, '#ffffff', 2.4, '', 1);
      }
    });
    var ia = iss.real ? [iss.lat, iss.lng] : posOrb(51.6, 0.8, 0.28 * t);
    ponto(g, pov, ia[0], ia[1], 0.064, '#ffb347', 3.2, 'ISS', 1);
  }
  function lerISS() {
    if (!aberto) return;
    fetch(U.iss).then(function (r) { return r.json(); }).then(function (d) {
      if (d && typeof d.latitude === 'number') { iss.lat = d.latitude; iss.lng = d.longitude; iss.real = true; }
    }).catch(function () {});
    issT = setTimeout(lerISS, 5000);
  }

  function quadro(ms) {
    if (!aberto) { raf = 0; return; }
    raf = requestAnimationFrame(quadro);
    if (!world || modo !== 'globo') return;
    var pov = world.pointOfView();
    if (pov.altitude < ENTRA) { entrarMapa(pov); return; }
    desenhar(pov, ms / 1000);
    q('#olho-c').textContent = 'ALTITUDE ' + Math.round(pov.altitude * R_KM).toLocaleString('pt-BR') + ' km  ·  ' + pov.lat.toFixed(2) + '°  ' + pov.lng.toFixed(2) + '°';
  }

  // ---------- abrir / fechar / buscar ----------
  function abrir(lugar) {
    if (!el) montar();
    el.style.display = 'flex';
    aberto = true;
    carregar().then(function () {
      iniciarMapa();
      iniciarGlobo();
      ajustar();
      if (!world) { modo = 'mapa'; el.classList.add('map'); mapa.setView([10, -30], 3); }
      if (!raf) raf = requestAnimationFrame(quadro);
      clearTimeout(issT); lerISS();
      if (lugar) buscar(lugar); else falar('Olho de Deus ativo, senhor. Diga um lugar para eu descer.');
    }).catch(function () {
      falar('Não consegui carregar o mapa de satélite, senhor.');
    });
  }
  function fechar() {
    if (el) el.style.display = 'none';
    aberto = false;
    clearTimeout(issT);
  }

  function buscar(texto) {
    texto = String(texto || '').trim();
    if (!texto || !mapa) return;
    q('#olho-c').textContent = 'LOCALIZANDO…';
    fetch('https://nominatim.openstreetmap.org/search?format=json&limit=1&accept-language=pt-BR&q=' + encodeURIComponent(texto))
      .then(function (r) { return r.json(); })
      .then(function (a) {
        if (!a || !a.length) { falar('Não encontrei esse lugar, senhor.'); return; }
        var p = a[0], b = p.boundingbox, lat = parseFloat(p.lat), lon = parseFloat(p.lon);
        var bounds = b && b.length === 4 ? L.latLngBounds([[parseFloat(b[0]), parseFloat(b[2])], [parseFloat(b[1]), parseFloat(b[3])]]) : null;
        if (pinoMapa) mapa.removeLayer(pinoMapa);
        pinoMapa = L.marker([lat, lon], { icon: L.divIcon({ className: '', html: '<div class="olho-pino"></div>', iconSize: [18, 18], iconAnchor: [9, 9] }) }).addTo(mapa);
        if (world) world.pointsData([{ lat: lat, lng: lon }]);
        var z = bounds ? Math.min(16, mapa.getBoundsZoom(bounds)) : 15;
        if (modo === 'mapa' || !world) {
          if (bounds) mapa.flyToBounds(bounds, { maxZoom: 16, duration: 3 }); else mapa.flyTo([lat, lon], 15, { duration: 3 });
        } else {
          var alt = Math.max(0.1, altDeZ(z));
          alvo = alt < ENTRA ? { lat: lat, lng: lon, z: Math.max(SAI_Z + 1, z) } : null;
          world.controls().autoRotate = false;
          world.pointOfView({ lat: lat, lng: lon, altitude: alt }, 3500);
        }
        falar('Localizado: ' + String(p.display_name || texto).split(',').slice(0, 2).join(',') + '.');
      })
      .catch(function () { falar('Falha ao localizar o lugar, senhor.'); });
  }

  // ---------- comandos (digitados ou por voz) ----------
  var RX_FECHAR = /(fechar|sair|voltar|fecha)( d?o| do)? ?(olho|satelite|mapa|painel)|^(fechar|fecha|sair)$/;
  var RX_MUNDO = /(ver |mostrar )?(o )?(planeta|mundo|terra) inteir|visao do planeta|olhar o planeta|ver o planeta|subir (ao|para o) espaco/;
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
