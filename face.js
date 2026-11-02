(function () {
  var KEY = 'jarvis_face_v1';
  var PKEY = 'jarvis_pin_v1';
  var CDN = 'https://cdn.jsdelivr.net/npm/@vladmandic/face-api/dist/face-api.js';
  var MODELS = 'https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model/';
  var MATCH = 0.5; // menor = mais rigoroso (0.45 a 0.6)
  var HITS = 2;
  var MISSES = 6; // leituras seguidas de rosto diferente para rejeitar

  var root = document.documentElement;
  var fl, vid, stEl, bar, btn, pn, pi, sm;
  var stream = null, loaded = false, busy = false, checking = false, opt = null, has = false;
  var pinMode = 'enter';
  var ac = null;

  var css = [
    'html.fl-lock{background:#010a10}',
    'html.fl-lock body{visibility:hidden!important}',
    '#fl{position:fixed;inset:0;z-index:2147483000;display:flex;align-items:center;justify-content:center;',
    'background:radial-gradient(circle at 50% 40%,#06263a 0%,#010a10 70%);color:#3de8ff;',
    'font:600 13px Orbitron,Rajdhani,sans-serif;transition:opacity .6s;text-align:center;padding:16px;box-sizing:border-box}',
    '#fl.out{opacity:0;pointer-events:none}',
    '#fl.ok{color:#5dffb0}',
    '#fl.bad{color:#ff5d5d}',
    '#fl .gr{position:absolute;inset:0;background-image:linear-gradient(rgba(61,232,255,.07) 1px,transparent 1px),linear-gradient(90deg,rgba(61,232,255,.07) 1px,transparent 1px);background-size:34px 34px}',
    '#fl .bx{position:relative;width:100%;max-width:380px}',
    '#fl .rg{position:relative;width:min(72vw,300px);aspect-ratio:1;margin:0 auto 18px}',
    '#fl .rg svg{position:absolute;inset:0;width:100%;height:100%;filter:drop-shadow(0 0 6px currentColor)}',
    '#fl .r1{transform-origin:50% 50%;animation:flsp 14s linear infinite}',
    '#fl .r2{transform-origin:50% 50%;animation:flsp 7s linear infinite reverse}',
    '#fl .r3{transform-origin:50% 50%;animation:flsp 22s linear infinite}',
    '#fl.scan .r1{animation-duration:3s}',
    '#fl.scan .r2{animation-duration:1.6s}',
    '#fl .vw{position:absolute;left:19%;top:19%;width:62%;height:62%;border-radius:50%;overflow:hidden;background:#02131d;box-shadow:0 0 22px currentColor}',
    '#fl video{width:100%;height:100%;object-fit:cover;transform:scaleX(-1);opacity:0;transition:opacity .5s}',
    '#fl.cam video{opacity:.9}',
    '#fl .sl{position:absolute;left:0;right:0;top:0;height:3px;background:currentColor;box-shadow:0 0 12px currentColor;opacity:0}',
    '#fl.scan .sl{opacity:1;animation:flsc 1.6s ease-in-out infinite alternate}',
    '#fl .tt{font-size:22px;letter-spacing:.35em;margin-bottom:8px;text-shadow:0 0 12px currentColor}',
    '#fl .ss{min-height:2.8em;letter-spacing:.12em;font-size:12px;margin-bottom:10px;line-height:1.5}',
    '#fl .pb{height:4px;background:rgba(61,232,255,.2);margin:0 auto 16px;width:70%}',
    '#fl .pb i{display:block;height:100%;width:0;background:currentColor;box-shadow:0 0 8px currentColor;transition:width .3s}',
    '#fl button{background:transparent;border:1px solid currentColor;color:inherit;font:600 12px Orbitron,sans-serif;letter-spacing:.14em;padding:12px 18px;cursor:pointer}',
    '#fl button:active{background:currentColor}',
    '#fl .sm{margin-top:14px;display:flex;gap:10px;justify-content:center}',
    '#fl .sm button{font-size:10px;padding:8px 10px;opacity:.75}',
    '#fl .pn{display:none;margin-top:14px;gap:8px;justify-content:center;flex-wrap:wrap}',
    '#fl .pn input{background:rgba(0,0,0,.4);border:1px solid currentColor;color:#cdf7ff;font:600 14px Rajdhani,sans-serif;padding:8px;width:130px;text-align:center}',
    '#fl .pn button{padding:8px 14px;font-size:11px}',
    '#fl.neg .tt{animation:flpk .5s steps(2) infinite}',
    '@keyframes flpk{50%{opacity:.35}}',
    '@keyframes flsp{to{transform:rotate(360deg)}}',
    '@keyframes flsc{from{top:0}to{top:calc(100% - 3px)}}'
  ].join('');

  var st = document.createElement('style');
  st.textContent = css;
  (document.head || root).appendChild(st);
  root.classList.add('fl-lock');

  function sleep(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }
  function setStatus(t) { if (stEl) stEl.textContent = t; }
  function setBar(p) { if (bar) bar.style.width = p + '%'; }

  function beep(f1, f2, t0, d, v) {
    try {
      if (!ac) { var A = window.AudioContext || window.webkitAudioContext; ac = new A(); }
      if (ac.state === 'suspended') ac.resume();
      var t = ac.currentTime + t0;
      var o = ac.createOscillator();
      var g = ac.createGain();
      o.type = 'sine';
      o.frequency.setValueAtTime(f1, t);
      if (f2 !== f1) o.frequency.exponentialRampToValueAtTime(f2, t + d);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(v, t + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, t + d);
      o.connect(g); g.connect(ac.destination);
      o.start(t); o.stop(t + d + 0.03);
    } catch (e) {}
  }
  function sStart() { beep(500, 1500, 0, 0.18, 0.06); }
  function sOk() { beep(660, 660, 0, 0.12, 0.07); beep(880, 880, 0.12, 0.12, 0.07); beep(1320, 1320, 0.24, 0.25, 0.07); }
  function sBad() { beep(220, 90, 0, 0.35, 0.08); }
  function sSeen() { beep(880, 880, 0, 0.1, 0.06); beep(1320, 1320, 0.12, 0.18, 0.06); }
  function sNeg() {
    beep(900, 500, 0, 0.25, 0.08);
    beep(900, 500, 0.3, 0.25, 0.08);
    beep(900, 500, 0.6, 0.25, 0.08);
    beep(200, 70, 0.95, 0.5, 0.09);
  }

  function falando() {
    try { if (typeof curAudio !== 'undefined' && curAudio && !curAudio.paused && !curAudio.ended) return true; } catch (e) {}
    try { if (window.speechSynthesis && window.speechSynthesis.speaking) return true; } catch (e) {}
    return false;
  }
  function esperaFala(max) {
    return new Promise(function (res) {
      var t0 = Date.now(), started = false;
      var iv = setInterval(function () {
        var p = falando();
        if (p) started = true;
        if ((started && !p) || Date.now() - t0 > max) { clearInterval(iv); res(); }
      }, 200);
    });
  }
  function falar(t) {
    try {
      if (typeof say === 'function') say(t);
      else if (typeof speak === 'function') speak(t);
    } catch (e) {}
  }

  function loadScript(src) {
    return new Promise(function (res, rej) {
      if (window.faceapi) return res();
      var s = document.createElement('script');
      s.src = src;
      s.onload = res;
      s.onerror = function () { rej(new Error('load')); };
      document.head.appendChild(s);
    });
  }

  async function loadModels() {
    if (loaded) return;
    try {
      setStatus('CARREGANDO MÓDULOS'); setBar(10);
      await loadScript(CDN); setBar(40);
      await faceapi.nets.tinyFaceDetector.loadFromUri(MODELS); setBar(55);
      await faceapi.nets.faceLandmark68TinyNet.loadFromUri(MODELS); setBar(70);
      await faceapi.nets.faceRecognitionNet.loadFromUri(MODELS); setBar(90);
      opt = new faceapi.TinyFaceDetectorOptions({ inputSize: 224, scoreThreshold: 0.5 });
      loaded = true;
    } catch (e) {
      throw new Error('load');
    }
  }

  async function openCam() {
    stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'user', width: { ideal: 480 }, height: { ideal: 480 } },
      audio: false
    });
    vid.srcObject = stream;
    try { await vid.play(); } catch (e) {}
  }

  function pararCam() {
    try { if (stream) stream.getTracks().forEach(function (t) { t.stop(); }); } catch (e) {}
    stream = null;
    try { vid.srcObject = null; } catch (e) {}
  }

  async function detectarReal() {
    var r = await faceapi.detectSingleFace(vid, opt).withFaceLandmarks(true).withFaceDescriptor();
    return r ? r.descriptor : null;
  }

  // cada leitura tem no maximo 4 s, para nunca ficar travado
  function detectar() {
    return Promise.race([
      detectarReal().catch(function () { return null; }),
      new Promise(function (res) { setTimeout(function () { res(null); }, 4000); })
    ]);
  }

  function lerSalvo() {
    try {
      var a = JSON.parse(localStorage.getItem(KEY) || '[]');
      return a.map(function (x) { return new Float32Array(x); });
    } catch (e) { return []; }
  }

  function lerPin() {
    try { return localStorage.getItem(PKEY); } catch (e) { return null; }
  }
  function salvarPin(p) {
    try { localStorage.setItem(PKEY, p); } catch (e) {}
  }
  function apagarPin() {
    try { localStorage.removeItem(PKEY); } catch (e) {}
  }

  function msgErro(e) {
    var n = e && e.name ? e.name : '';
    var m = e && e.message ? e.message : '';
    if (n === 'NotAllowedError') return 'CÂMERA NEGADA. LIBERE NAS CONFIGURAÇÕES DO SITE';
    if (n === 'NotFoundError') return 'CÂMERA NÃO ENCONTRADA';
    if (m === 'load') return 'FALHA AO CARREGAR MÓDULOS';
    if (m === 'timeout') return 'NÃO CONSEGUI VER SEU ROSTO. MELHORE A LUZ';
    if (m === 'save') return 'NÃO CONSEGUI SALVAR O ROSTO NESTE NAVEGADOR';
    return 'ERRO: ' + (m || n || 'DESCONHECIDO').slice(0, 40);
  }

  function falhar(texto) {
    pararCam();
    fl.classList.remove('scan', 'cam', 'neg');
    fl.classList.add('bad');
    pn.style.display = 'none';
    setStatus(texto);
    setBar(0);
    sBad();
    btn.textContent = has ? 'TENTAR NOVAMENTE' : 'CADASTRAR MEU ROSTO';
    btn.style.display = '';
    sm.style.display = '';
  }

  function negar() {
    pararCam();
    fl.classList.remove('scan', 'cam', 'ok');
    fl.classList.add('bad', 'neg');
    pn.style.display = 'none';
    setStatus('ACESSO NEGADO. ROSTO NÃO COMPATÍVEL COM O USUÁRIO AUTORIZADO. VOCÊ NÃO É O MEU SENHOR.');
    setBar(0);
    sNeg();
    falar('Acesso negado. Rosto não compatível com o usuário autorizado. Você não é o meu senhor.');
    btn.textContent = 'TENTAR NOVAMENTE';
    btn.style.display = '';
    sm.style.display = '';
  }

  function acordar() {
    var inp = document.getElementById('in');
    var go = document.getElementById('go');
    if (!inp || !go) return;
    inp.value = 'acordar';
    inp.dispatchEvent(new Event('input', { bubbles: true }));
    go.click();
  }

  function liberar(rodar) {
    pararCam();
    fl.classList.add('out');
    root.classList.remove('fl-lock');
    setTimeout(function () { if (fl && fl.parentNode) fl.parentNode.removeChild(fl); }, 800);
    if (rodar) setTimeout(acordar, 500);
  }

  async function aprovar() {
    fl.classList.remove('scan', 'bad', 'neg');
    fl.classList.add('ok');
    pn.style.display = 'none';
    setBar(100);
    setStatus('VERIFICAÇÃO CONCLUÍDA. BEM-VINDO, SENHOR');
    sOk();
    falar('Verificação concluída. Bem-vindo, senhor.');
    await esperaFala(9000);
    liberar(true);
  }

  function mostrarCampoPin(texto) {
    pinMode = 'enter';
    setStatus(texto);
    btn.style.display = 'none';
    sm.style.display = 'none';
    pi.value = '';
    pn.style.display = 'flex';
    try { pi.focus(); } catch (e) {}
  }

  // rosto reconhecido: o painel digita o PIN guardado sozinho
  async function pedirPin() {
    pararCam();
    fl.classList.remove('scan', 'cam', 'bad', 'neg');
    setBar(100);
    sSeen();
    var guardado = lerPin();
    if (guardado === null) {
      mostrarCampoPin('ROSTO RECONHECIDO. DIGITE O PIN UMA VEZ');
      return;
    }
    setStatus('ROSTO RECONHECIDO. VALIDANDO ACESSO');
    btn.style.display = 'none';
    sm.style.display = 'none';
    var r = await checarPin(guardado);
    if (r === 'ok') { await aprovar(); return; }
    if (r === 'net') { falhar('SEM CONEXÃO. TENTE NOVAMENTE'); return; }
    apagarPin();
    mostrarCampoPin('ROSTO RECONHECIDO. O PIN MUDOU, DIGITE O NOVO');
  }

  async function verificar() {
    if (busy) return;
    busy = true;
    fl.classList.remove('bad', 'neg');
    btn.style.display = 'none';
    sm.style.display = 'none';
    pn.style.display = 'none';
    try {
      sStart();
      await loadModels();
      setStatus('ATIVANDO CÂMERA'); setBar(92);
      await openCam();
      fl.classList.add('cam', 'scan');
      setStatus('ESCANEANDO ROSTO'); setBar(95);
      var saved = lerSalvo();
      var t0 = Date.now(), hits = 0, miss = 0, ok = false, n = 0;
      while (Date.now() - t0 < 15000) {
        var d = await detectar();
        if (d) {
          var best = 9;
          for (var i = 0; i < saved.length; i++) {
            var dist = faceapi.euclideanDistance(d, saved[i]);
            if (dist < best) best = dist;
          }
          if (best < MATCH) { hits++; miss = 0; } else { hits = 0; miss++; }
          if (hits >= HITS) { ok = true; break; }
          if (miss >= MISSES) break;
        }
        n++;
        if (n % 8 === 0) beep(1800, 2200, 0, 0.04, 0.03);
        await sleep(120);
      }
      if (ok) await pedirPin();
      else if (miss >= MISSES) negar();
      else falhar('NÃO CONSEGUI VER SEU ROSTO. MELHORE A LUZ');
    } catch (e) {
      falhar(msgErro(e));
    }
    busy = false;
  }

  async function cadastrar() {
    if (busy) return;
    busy = true;
    fl.classList.remove('bad', 'neg');
    btn.style.display = 'none';
    sm.style.display = 'none';
    pn.style.display = 'none';
    try {
      sStart();
      await loadModels();
      setStatus('ATIVANDO CÂMERA'); setBar(92);
      await openCam();
      fl.classList.add('cam', 'scan');
      var frases = [
        'OLHE DE FRENTE PARA A CÂMERA', 'OLHE DE FRENTE PARA A CÂMERA',
        'VIRE LEVEMENTE PARA A ESQUERDA', 'VIRE LEVEMENTE PARA A ESQUERDA',
        'VIRE LEVEMENTE PARA A DIREITA', 'VIRE LEVEMENTE PARA A DIREITA'
      ];
      var out = [], t0 = Date.now(), last = 0;
      setStatus(frases[0] + ' 0/6'); setBar(0);
      while (out.length < 6 && Date.now() - t0 < 60000) {
        var d = await detectar();
        var now = Date.now();
        if (d && now - last > 700) {
          out.push(Array.from(d));
          last = now;
          beep(1500, 1500, 0, 0.05, 0.05);
          setBar(Math.round(out.length / 6 * 100));
          setStatus((frases[Math.min(out.length, 5)]) + ' ' + out.length + '/6');
        }
        await sleep(120);
      }
      if (out.length < 6) throw new Error('timeout');
      try { localStorage.setItem(KEY, JSON.stringify(out)); } catch (e) { throw new Error('save'); }
      has = true;
      setStatus('ROSTO CADASTRADO');
      await sleep(800);
      await aprovar();
    } catch (e) {
      falhar(msgErro(e));
    }
    busy = false;
  }

  async function checarPin(pin) {
    try {
      var r = await fetch('/api/listen', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ audio: '', mime: 'audio/webm', pin: pin })
      });
      return r.status === 401 ? 'bad' : 'ok';
    } catch (e) { return 'net'; }
  }

  function mostraPin(modo) {
    if (busy) return;
    pinMode = modo;
    fl.classList.remove('bad', 'neg');
    pi.value = '';
    pn.style.display = 'flex';
    setStatus('DIGITE O PIN PARA CADASTRAR O ROSTO');
    try { pi.focus(); } catch (e) {}
  }

  async function pinOk() {
    if (busy || checking) return;
    checking = true;
    var p = pi.value;
    var r = await checarPin(p);
    pi.value = '';
    checking = false;
    if (r === 'net') { setStatus('SEM CONEXÃO'); sBad(); return; }
    if (r === 'bad') {
      if (pinMode === 'enter') { negar(); return; }
      setStatus('PIN INCORRETO'); sBad(); return;
    }
    salvarPin(p);
    pn.style.display = 'none';
    if (pinMode === 'redo') cadastrar(); else aprovar();
  }

  function pinCancelar() {
    if (busy || checking) return;
    pi.value = '';
    pn.style.display = 'none';
    if (pinMode === 'enter') { negar(); return; }
    setStatus(has ? 'TOQUE PARA INICIAR' : 'ROSTO NÃO CADASTRADO');
  }

  function build() {
    fl = document.createElement('div');
    fl.id = 'fl';
    fl.innerHTML =
      '<div class="gr"></div><div class="bx">' +
      '<div class="rg">' +
      '<svg viewBox="0 0 200 200" fill="none" stroke="currentColor">' +
      '<circle class="r1" cx="100" cy="100" r="96" stroke-width="2" stroke-dasharray="46 14 10 14"/>' +
      '<circle class="r2" cx="100" cy="100" r="88" stroke-width="1.5" stroke-dasharray="3 7"/>' +
      '<circle class="r3" cx="100" cy="100" r="78" stroke-width="3" stroke-dasharray="70 30 20 30" stroke-opacity=".7"/>' +
      '<circle cx="100" cy="100" r="70" stroke-width="1"/>' +
      '</svg>' +
      '<div class="vw"><video id="flv" playsinline muted autoplay></video><div class="sl"></div></div>' +
      '</div>' +
      '<div class="tt">J.A.R.V.I.S.</div>' +
      '<div class="ss" id="fls"></div>' +
      '<div class="pb"><i id="flb"></i></div>' +
      '<button id="flgo" type="button"></button>' +
      '<div class="pn" id="flpn"><input id="flpi" type="password" placeholder="PIN" autocomplete="off"><button id="flpo" type="button">OK</button><button id="flpc" type="button">CANCELAR</button></div>' +
      '<div class="sm" id="flsm"><button id="flre" type="button">REFAZER ROSTO</button></div>' +
      '</div>';
    root.appendChild(fl);

    vid = document.getElementById('flv');
    stEl = document.getElementById('fls');
    bar = document.getElementById('flb');
    btn = document.getElementById('flgo');
    pn = document.getElementById('flpn');
    pi = document.getElementById('flpi');
    sm = document.getElementById('flsm');

    has = lerSalvo().length > 0;
    btn.textContent = has ? 'INICIAR VERIFICAÇÃO' : 'CADASTRAR MEU ROSTO';
    setStatus(has ? 'TOQUE PARA INICIAR' : 'ROSTO NÃO CADASTRADO');
    if (!has) sm.style.display = 'none';

    btn.addEventListener('click', function () {
      if (has) verificar(); else mostraPin('redo');
    });
    document.getElementById('flre').addEventListener('click', function () { mostraPin('redo'); });
    document.getElementById('flpo').addEventListener('click', pinOk);
    document.getElementById('flpc').addEventListener('click', pinCancelar);
    pi.addEventListener('keydown', function (e) { if (e.key === 'Enter') pinOk(); });
  }

  function init() {
    try { build(); } catch (e) { root.classList.remove('fl-lock'); }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
