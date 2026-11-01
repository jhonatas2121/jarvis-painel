(function () {
  var go = document.getElementById('go');
  var inp = document.getElementById('in');
  var core = document.getElementById('core');
  if (!go || !inp) return;

  var THRESH = 0.04;      // volume minimo para considerar voz
  var START_MS = 200;     // voz sustentada para valer
  var SILENCE_MS = 900;   // silencio que encerra o trecho
  var MIN_MS = 600;       // trecho minimo
  var MAX_MS = 12000;     // trecho maximo
  var RX = /j[aáe]r?[vb][iíe][sz]/i;

  var btn = document.createElement('button');
  btn.type = 'button';
  btn.className = go.className;
  btn.style.cssText = go.style.cssText;
  btn.textContent = 'MIC: OFF';
  go.parentNode.insertBefore(btn, go.nextSibling);

  var on = false, stream = null, ctx = null, analyser = null, buf = null;
  var timer = null, lock = null, mimeType = '';
  var rec = null, recording = false, recStart = 0, lastLoud = 0, sustained = false;
  var pending = 0, wake = false, wakeTimer = null;
  var st = 'OUVINDO', last = '', shown = '';

  function show(s) {
    if (s) st = s;
    var t = on ? ('MIC: ' + st + (last ? ' | ' + last : '')) : 'MIC: OFF' + (last ? ' | ' + last : '');
    if (t !== shown) { shown = t; btn.textContent = t; }
  }

  function jarvisBusy() {
    try { if (typeof busy !== 'undefined' && busy) return true; } catch (e) {}
    try { if (typeof curAudio !== 'undefined' && curAudio && !curAudio.paused && !curAudio.ended) return true; } catch (e) {}
    try { if (window.speechSynthesis && window.speechSynthesis.speaking) return true; } catch (e) {}
    return false;
  }

  function wakeOn() {
    wake = true;
    if (core) core.classList.add('think');
    clearTimeout(wakeTimer);
    wakeTimer = setTimeout(wakeOff, 8000);
  }

  function wakeOff() {
    wake = false;
    clearTimeout(wakeTimer);
    if (core && !jarvisBusy()) core.classList.remove('think');
  }

  function run(cmd) {
    wake = false;
    clearTimeout(wakeTimer);
    if (core) core.classList.add('think');
    inp.value = cmd;
    inp.dispatchEvent(new Event('input', { bubbles: true }));
    go.click();
    setTimeout(function () {
      if (core && !jarvisBusy() && !wake) core.classList.remove('think');
    }, 2500);
  }

  function handle(t) {
    t = (t || '').trim();
    if (t.length < 2 || /^[.\s…]+$/.test(t)) return;
    last = t.slice(0, 24);
    if (jarvisBusy()) { show(); return; }
    var m = t.match(RX);
    if (m) {
      var cmd = t.slice(m.index + m[0].length).replace(/^[\s,.:;!?\-–]+/, '').trim();
      if (cmd.length >= 2) run(cmd); else wakeOn();
    } else if (wake) {
      run(t);
    }
    show();
  }

  function upload(blob) {
    var fr = new FileReader();
    fr.onloadend = function () {
      var b64 = String(fr.result || '').split(',')[1];
      if (!b64) return;
      var pin = '';
      try { pin = getPin() || ''; } catch (e) {}
      pending++;
      fetch('/api/listen', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ audio: b64, mime: blob.type || 'audio/webm', pin: pin })
      })
        .then(function (r) {
          return r.json().then(function (d) { return { ok: r.ok, d: d }; });
        })
        .then(function (x) {
          pending--;
          if (!x.ok) { last = 'ERRO: ' + ((x.d && x.d.error) || '?').slice(0, 40); show(); return; }
          handle(x.d.text);
        })
        .catch(function () {
          pending--;
          last = 'ERRO DE REDE';
          show();
        });
    };
    fr.readAsDataURL(blob);
  }

  function startRec(now) {
    var chunks = [];
    var r;
    try {
      r = mimeType ? new MediaRecorder(stream, { mimeType: mimeType }) : new MediaRecorder(stream);
    } catch (e) { last = 'ERRO REC'; show(); return; }
    r._keep = false;
    r.ondataavailable = function (e) { if (e.data && e.data.size) chunks.push(e.data); };
    r.onstop = function () {
      if (r._keep && chunks.length) upload(new Blob(chunks, { type: r.mimeType || 'audio/webm' }));
    };
    try { r.start(); } catch (e) { last = 'ERRO REC'; show(); return; }
    rec = r;
    recording = true;
    recStart = now;
    lastLoud = now;
    sustained = false;
  }

  function endRec(keep) {
    if (!rec) return;
    rec._keep = keep;
    recording = false;
    try { rec.stop(); } catch (e) {}
    rec = null;
  }

  function tick() {
    if (!on || !analyser) return;
    analyser.getByteTimeDomainData(buf);
    var sum = 0;
    for (var i = 0; i < buf.length; i++) {
      var v = (buf[i] - 128) / 128;
      sum += v * v;
    }
    var level = Math.sqrt(sum / buf.length);
    var now = Date.now();

    if (jarvisBusy()) {
      if (recording) endRec(false);
      show('JARVIS OCUPADO');
      return;
    }

    var loud = level > THRESH;

    if (!recording) {
      if (loud) { startRec(now); show('GRAVANDO'); }
      else show(pending > 0 ? 'TRANSCREVENDO' : 'OUVINDO');
      return;
    }

    if (loud) {
      lastLoud = now;
      if (now - recStart >= START_MS) sustained = true;
    }
    if (now - recStart > MAX_MS) { endRec(false); return; }
    if (now - lastLoud > SILENCE_MS) {
      var dur = lastLoud - recStart;
      endRec(sustained && dur >= MIN_MS);
      return;
    }
    if (!sustained && now - lastLoud > START_MS) { endRec(false); return; }
    show('GRAVANDO');
  }

  async function getLock() {
    try {
      if ('wakeLock' in navigator) lock = await navigator.wakeLock.request('screen');
    } catch (e) {}
  }

  async function start() {
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true }
      });
      var AC = window.AudioContext || window.webkitAudioContext;
      ctx = new AC();
      if (ctx.state === 'suspended') await ctx.resume();
      var src = ctx.createMediaStreamSource(stream);
      analyser = ctx.createAnalyser();
      analyser.fftSize = 1024;
      src.connect(analyser);
      buf = new Uint8Array(analyser.fftSize);
      mimeType = '';
      var types = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4'];
      for (var i = 0; i < types.length; i++) {
        if (window.MediaRecorder && MediaRecorder.isTypeSupported(types[i])) { mimeType = types[i]; break; }
      }
      on = true;
      last = '';
      st = 'OUVINDO';
      timer = setInterval(tick, 50);
      getLock();
      show();
    } catch (e) {
      on = false;
      last = 'ERRO MIC: ' + (e && e.name ? e.name : 'desconhecido');
      show();
    }
  }

  function stop() {
    on = false;
    clearInterval(timer);
    if (recording) endRec(false);
    try { if (stream) stream.getTracks().forEach(function (t) { t.stop(); }); } catch (e) {}
    try { if (ctx) ctx.close(); } catch (e) {}
    try { if (lock) lock.release(); } catch (e) {}
    stream = null; ctx = null; analyser = null; lock = null;
    wakeOff();
    last = '';
    show();
  }

  btn.addEventListener('click', function () {
    if (on) stop(); else start();
  });

  if (core) {
    core.addEventListener('click', function () {
      try { if (typeof stopVoice === 'function') stopVoice(); } catch (e) {}
    });
  }

  document.addEventListener('visibilitychange', function () {
    if (on && document.visibilityState === 'visible') getLock();
  });
})();
