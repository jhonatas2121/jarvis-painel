(function () {
  // Volume geral: 0.5 = mais baixo, 1 = normal, 1.5 = mais alto
  var VOL = 1;

  var core = document.getElementById('core');
  var reply = document.getElementById('reply');
  var go = document.getElementById('go');
  var inp = document.getElementById('in');

  var ctx = null;
  var master = null;

  function ensure() {
    try {
      if (!ctx) {
        var AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return false;
        ctx = new AC();
        master = ctx.createGain();
        master.gain.value = 0.5 * VOL;
        master.connect(ctx.destination);
      }
      if (ctx.state === 'suspended') ctx.resume();
      return true;
    } catch (e) { return false; }
  }

  // Um tom simples: tipo, freq inicial, freq final, inicio (s), duracao (s), volume
  function tone(type, f1, f2, t0, dur, vol) {
    if (!ensure()) return;
    var t = ctx.currentTime + t0;
    var o = ctx.createOscillator();
    var g = ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(f1, t);
    if (f2 && f2 !== f1) o.frequency.exponentialRampToValueAtTime(f2, t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g);
    g.connect(master);
    o.start(t);
    o.stop(t + dur + 0.03);
  }

  function sClick() { tone('square', 1500, 900, 0, 0.04, 0.05); }

  function sOn() {
    tone('sine', 600, 600, 0, 0.07, 0.10);
    tone('sine', 900, 900, 0.07, 0.07, 0.10);
    tone('triangle', 1300, 1800, 0.14, 0.12, 0.10);
  }

  function sOff() {
    tone('triangle', 1500, 1500, 0, 0.07, 0.10);
    tone('sine', 900, 900, 0.07, 0.07, 0.10);
    tone('sine', 520, 300, 0.14, 0.14, 0.10);
  }

  function sAtivar() {
    tone('triangle', 800, 2600, 0, 0.14, 0.12);
    tone('sine', 3200, 3200, 0.10, 0.05, 0.07);
    tone('sine', 4200, 4200, 0.16, 0.05, 0.05);
  }

  function sResposta() {
    tone('sine', 900, 900, 0, 0.07, 0.08);
    tone('sine', 1350, 1350, 0.08, 0.10, 0.08);
  }

  function sErro() {
    tone('sawtooth', 190, 80, 0, 0.35, 0.10);
    tone('square', 95, 60, 0.05, 0.30, 0.05);
  }

  function sBoot() {
    var n = [300, 450, 600, 900, 1200, 1800, 2400];
    for (var i = 0; i < n.length; i++) tone('triangle', n[i], n[i] * 1.02, i * 0.09, 0.10, 0.10);
    tone('sawtooth', 80, 400, 0, 0.7, 0.05);
  }

  // Zumbido robotico enquanto processa
  var hum = null;
  var chat = null;
  var humStop = null;

  function humOn() {
    if (hum || !ensure()) return;
    var t = ctx.currentTime;
    var g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.07, t + 0.4);

    var lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 650;

    var o1 = ctx.createOscillator();
    o1.type = 'sawtooth';
    o1.frequency.setValueAtTime(70, t);
    o1.frequency.exponentialRampToValueAtTime(130, t + 10);

    var o2 = ctx.createOscillator();
    o2.type = 'square';
    o2.frequency.setValueAtTime(141, t);
    o2.frequency.exponentialRampToValueAtTime(262, t + 10);
    var g2 = ctx.createGain();
    g2.gain.value = 0.35;

    var lfo = ctx.createOscillator();
    lfo.frequency.value = 5;
    var lg = ctx.createGain();
    lg.gain.value = 260;
    lfo.connect(lg);
    lg.connect(lp.frequency);

    o1.connect(lp);
    o2.connect(g2);
    g2.connect(lp);
    lp.connect(g);
    g.connect(master);
    o1.start(t); o2.start(t); lfo.start(t);

    hum = { g: g, nodes: [o1, o2, lfo] };

    // bipes digitais aleatorios por cima
    chat = setInterval(function () {
      var f = 1400 + Math.random() * 2600;
      tone('sine', f, f * (0.8 + Math.random() * 0.5), 0, 0.035, 0.035);
    }, 280);

    // trava de seguranca: nunca passa de 40 s
    humStop = setTimeout(humOff, 40000);
  }

  function humOff() {
    clearInterval(chat); chat = null;
    clearTimeout(humStop); humStop = null;
    if (!hum || !ctx) { hum = null; return; }
    var h = hum;
    hum = null;
    var t = ctx.currentTime;
    try {
      h.g.gain.cancelScheduledValues(t);
      h.g.gain.setValueAtTime(Math.max(h.g.gain.value, 0.0001), t);
      h.g.gain.exponentialRampToValueAtTime(0.0001, t + 0.35);
      h.nodes.forEach(function (n) { try { n.stop(t + 0.4); } catch (e) {} });
    } catch (e) {}
  }

  // Libera o audio no primeiro toque
  window.addEventListener('pointerdown', function () { ensure(); }, true);

  // Cliques nos botoes
  window.addEventListener('click', function (e) {
    var el = e.target;
    if (!el || !el.closest) return;

    if (go && (el === go || go.contains(el)) && inp && /^\s*acord(ar|a|e)\b/i.test(inp.value || '')) {
      sBoot();
      return;
    }

    var b = el.closest('button');
    if (!b) return;
    var txt = (b.textContent || '').toUpperCase();
    if (txt.indexOf('MIC:') === 0 || txt.indexOf('VOZ:') === 0) {
      setTimeout(function () {
        var now = (b.textContent || '').toUpperCase();
        if (/OFF/.test(now)) sOff(); else sOn();
      }, 180);
    } else {
      sClick();
    }
  }, true);

  // Esfera processando
  if (core) {
    var was = core.classList.contains('think');
    new MutationObserver(function () {
      var now = core.classList.contains('think');
      if (now && !was) { sAtivar(); setTimeout(humOn, 160); }
      if (!now && was) humOff();
      was = now;
    }).observe(core, { attributes: true, attributeFilter: ['class'] });
  }

  // Resposta chegando ou erro
  if (reply) {
    var lastBeep = 0;
    new MutationObserver(function () {
      var now = Date.now();
      if (now - lastBeep < 2500) return;
      var t = (reply.textContent || '').trim();
      if (!t) return;
      lastBeep = now;
      if (/erro|exceeded|quota|falha|incorreto/i.test(t)) sErro(); else sResposta();
    }).observe(reply, { childList: true, characterData: true, subtree: true });
  }
})();
