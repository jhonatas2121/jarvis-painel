(function () {
  var J = window.JarvisApp;
  try {
    if (!J || typeof J.ouvirComecar !== 'function' || !J.ouvirDisponivel()) return;
  } catch (e) { return; }

  var go = document.getElementById('go');
  var inp = document.getElementById('in');
  var core = document.getElementById('core');
  if (!go || !inp) return;

  var btn = null;
  var bs = document.getElementsByTagName('button');
  for (var i = 0; i < bs.length; i++) {
    if (/^\s*MIC:/.test(bs[i].textContent)) { btn = bs[i]; break; }
  }
  if (!btn) return;

  var RXS = [
    /(?<![a-z])[jgtd]a?r[vbd][aei]s(?![a-z])/,
    /(?<![a-z])ja ?v[aei]s(?![a-z])/,
    /^(?:jair|de ?arv[aei]s)(?![a-z])/
  ];
  var on = false, wake = false, wakeTimer = null, lastBusy = 0, err = '';

  function label() {
    btn.textContent = 'MIC: ' + (on ? 'ON' : 'OFF') + (err ? ' (' + err + ')' : '');
  }

  function busyNow() {
    try { if (typeof busy !== 'undefined' && busy) return true; } catch (e) {}
    try { if (typeof curAudio !== 'undefined' && curAudio && !curAudio.paused && !curAudio.ended) return true; } catch (e) {}
    try { if (window.speechSynthesis && window.speechSynthesis.speaking) return true; } catch (e) {}
    return false;
  }

  setInterval(function () { if (busyNow()) lastBusy = Date.now(); }, 200);

  function wakeOn() {
    wake = true;
    if (core) core.classList.add('think');
    clearTimeout(wakeTimer);
    wakeTimer = setTimeout(wakeOff, 8000);
  }

  function wakeOff() {
    wake = false;
    clearTimeout(wakeTimer);
    if (core && !busyNow()) core.classList.remove('think');
  }

  function run(cmd) {
    wake = false;
    clearTimeout(wakeTimer);
    if (core) core.classList.add('think');
    inp.value = cmd;
    inp.dispatchEvent(new Event('input', { bubbles: true }));
    go.click();
    setTimeout(function () {
      if (core && !busyNow() && !wake) core.classList.remove('think');
    }, 2500);
  }

  function findWake(t) {
    var n = t.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    for (var i = 0; i < RXS.length; i++) {
      var m = RXS[i].exec(n);
      if (m) return { index: m.index, len: m[0].length };
    }
    return null;
  }

  function handle(t) {
    t = (t || '').trim();
    if (t.length < 2) return;
    if (busyNow() || Date.now() - lastBusy < 1500) return;
    var m = findWake(t);
    if (m) {
      var cmd = t.slice(m.index + m.len).replace(/^[\s,.:;!?\-–]+/, '').trim();
      if (cmd.length >= 2) run(cmd); else wakeOn();
    } else if (wake) {
      run(t);
    }
  }

  window.jarvisOuvirTexto = function (t) { if (on) handle(t); };
  window.jarvisOuvirErro = function (e) {
    on = false;
    err = e === 'sem permissao' ? 'sem permissão' : 'erro';
    label();
  };

  btn.addEventListener('click', function (e) {
    e.preventDefault();
    e.stopImmediatePropagation();
    if (on) {
      on = false;
      err = '';
      try { J.ouvirParar(); } catch (x) {}
      wakeOff();
    } else {
      on = true;
      err = '';
      try { J.ouvirComecar(); } catch (x) { on = false; err = 'erro'; }
    }
    label();
  }, true);
})();
