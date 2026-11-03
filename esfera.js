/* esfera.js - esfera de pontinhos do JARVIS (visual novo, sem apagar o antigo) */
(function () {
  var core = document.getElementById("core");
  if (!core || document.getElementById("esfera")) return;

  var cv = document.createElement("canvas");
  cv.id = "esfera";
  var ctx = cv.getContext ? cv.getContext("2d") : null;
  if (!ctx) return;

  var st = document.createElement("style");
  st.textContent =
    "#core{display:none!important}" +
    "#esfera{width:100%;max-width:460px;aspect-ratio:1;margin:0 auto;display:block}";
  document.head.appendChild(st);
  core.parentNode.insertBefore(cv, core.nextSibling);

  var reduzido = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;

  // ---------- pontos da esfera ----------
  var N = (navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 4) ? 600 : 850;
  var P = [];
  for (var i = 0; i < N; i++) {
    var y = 1 - 2 * (i + 0.5) / N;
    var r = Math.sqrt(1 - y * y);
    var th = i * 2.399963;
    P.push([Math.cos(th) * r, y, Math.sin(th) * r]);
  }

  // ---------- orbitas (cometas) ----------
  var O = [
    { a: 1.55, b: 0.55, roll: 0.5, tx: 1.1, ty: 0.0, sp: 0.3, u: 0.0, v: 1.3 },
    { a: 1.45, b: 0.45, roll: -0.7, tx: 0.9, ty: 2.1, sp: -0.22, u: 2.1, v: 1.0 },
    { a: 1.65, b: 0.62, roll: 1.9, tx: 1.25, ty: 4.0, sp: 0.18, u: 4.2, v: 0.8 }
  ];

  // ---------- voz ----------
  var actx = null;
  function iniciarAudio() {
    try {
      var AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      if (!actx) actx = new AC();
      if (actx.resume) actx.resume();
    } catch (e) {}
  }
  document.addEventListener("pointerdown", iniciarAudio, { once: true });
  document.addEventListener("keydown", iniciarAudio, { once: true });

  function ligarAnalisador(a) {
    if (a._jvHook) return;
    a._jvHook = 1;
    try {
      if (!actx || actx.state !== "running") { iniciarAudio(); return; }
      var src = actx.createMediaElementSource(a);
      var an = actx.createAnalyser();
      an.fftSize = 256;
      src.connect(an);
      an.connect(actx.destination);
      a._jvAn = an;
      a._jvBuf = new Uint8Array(an.fftSize);
    } catch (e) { a._jvAn = null; }
  }

  function falando() {
    var a = window.curAudio;
    if (a && !a.paused && !a.ended) return "audio";
    if (window.speechSynthesis && speechSynthesis.speaking) return "tts";
    return null;
  }

  function nivelAlvo(modo, t) {
    if (modo === "audio") {
      var a = window.curAudio;
      ligarAnalisador(a);
      if (a._jvAn) {
        try {
          a._jvAn.getByteTimeDomainData(a._jvBuf);
          var s = 0;
          for (var k = 0; k < a._jvBuf.length; k++) {
            var d = (a._jvBuf[k] - 128) / 128;
            s += d * d;
          }
          return Math.min(1, Math.sqrt(s / a._jvBuf.length) * 5);
        } catch (e) {}
      }
    }
    // sem medidor (voz do telefone ou audio sem analisador): simula o ritmo da fala
    var v = 0.5 + 0.28 * Math.sin(t * 9.0) + 0.2 * Math.sin(t * 5.3 + 1.0) + 0.12 * Math.sin(t * 13.7);
    return Math.max(0.1, Math.min(1, v));
  }

  // ---------- desenho ----------
  var W = 0, H = 0, dpr = 1;
  function ajustar() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    var w = cv.clientWidth;
    if (!w) return false;
    var px = Math.round(w * dpr);
    if (cv.width !== px) { cv.width = px; cv.height = px; }
    W = cv.width; H = cv.height;
    return true;
  }

  var ang = 0, tph = 0, rot2 = 0, nivel = 0, last = 0, lentos = 0, passo = 1;
  var cosX = Math.cos(0.35), sinX = Math.sin(0.35);

  function frame(ms) {
    requestAnimationFrame(frame);
    if (!ajustar()) return;
    var t = ms / 1000;
    var dt = last ? Math.min(0.05, t - last) : 0.016;
    last = t;

    // se o aparelho estiver lento, usa metade dos pontos
    if (dt > 0.034) { lentos++; if (lentos > 90) passo = 2; } else if (lentos > 0) { lentos--; }

    var pensando = core.classList.contains("think");
    var modo = falando();
    var alvo = modo ? nivelAlvo(modo, t) : 0;
    nivel += (alvo - nivel) * 0.22;

    var calmo = reduzido ? 0.3 : 1;
    var vel = (0.6 + (pensando ? 1.4 : 0) + (modo ? 1.0 + 2.6 * nivel : 0)) * calmo;
    tph += dt * vel;
    ang += dt * (0.25 + (pensando ? 0.6 : 0)) * calmo;
    rot2 += dt * 0.08 * calmo;

    var amp = 0.05 + 0.17 * nivel + (pensando ? 0.04 : 0);
    var R = W * 0.27;
    var cx0 = W / 2, cy0 = H / 2;
    var balx = Math.sin(tph * 0.8) * amp * R * 0.45;
    var baly = Math.cos(tph * 0.65) * amp * R * 0.35;
    var ca = Math.cos(ang), sa = Math.sin(ang);

    ctx.clearRect(0, 0, W, H);

    // luz no meio
    var g = ctx.createRadialGradient(cx0, cy0, 0, cx0, cy0, R * 1.25);
    g.addColorStop(0, "rgba(190,245,255,0.55)");
    g.addColorStop(0.25, "rgba(61,200,255,0.28)");
    g.addColorStop(1, "rgba(27,134,216,0)");
    ctx.globalCompositeOperation = "source-over";
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);

    ctx.globalCompositeOperation = "lighter";

    // marcas finas em arco
    ctx.strokeStyle = "rgba(61,232,255,0.55)";
    ctx.lineWidth = Math.max(1, dpr * 0.8);
    var rt = W * 0.47;
    ctx.beginPath();
    for (var k = 0; k < 120; k++) {
      if ((k % 40) >= 30) continue;
      var an2 = k / 120 * 6.2832 + rot2;
      var len = (k % 5 === 0) ? 0.028 : 0.014;
      var c2 = Math.cos(an2), s2 = Math.sin(an2);
      ctx.moveTo(cx0 + c2 * rt, cy0 + s2 * rt);
      ctx.lineTo(cx0 + c2 * rt * (1 - len), cy0 + s2 * rt * (1 - len));
    }
    ctx.stroke();

    // pontos da esfera (se deforma como bolha)
    for (var i = 0; i < N; i += passo) {
      var p = P[i], x = p[0], y = p[1], z = p[2];
      var d = Math.sin(x * 2.3 + tph * 1.1) * Math.cos(y * 2.9 - tph * 0.9) +
              0.6 * Math.sin(z * 3.1 + tph * 1.4 + x);
      var rr = 1 + amp * d;
      var x1 = (x * ca + z * sa) * rr;
      var z1 = (-x * sa + z * ca) * rr;
      var y1 = y * rr;
      var y2 = y1 * cosX - z1 * sinX;
      var z2 = y1 * sinX + z1 * cosX;
      var pe = 3 / (3 - z2);
      var sx = cx0 + balx + x1 * R * pe;
      var sy = cy0 + baly + y2 * R * pe;
      var f = (z2 + 1.2) / 2.4;
      var al = 0.2 + 0.7 * f;
      var tam = (0.9 + 1.3 * f) * dpr * (passo === 2 ? 1.3 : 1);
      ctx.fillStyle = "rgba(" + Math.round(40 + 110 * f) + "," + Math.round(150 + 90 * f) + ",255," + al.toFixed(2) + ")";
      ctx.beginPath();
      ctx.arc(sx, sy, tam, 0, 6.2832);
      ctx.fill();
    }

    // orbitas com cometa
    for (var j = 0; j < O.length; j++) {
      var o = O[j];
      o.u += dt * o.v * (1 + (modo ? 0.8 * nivel : 0) + (pensando ? 1 : 0)) * calmo;
      var oy = o.ty + ang * o.sp * 3;
      var cr = Math.cos(o.roll), sr = Math.sin(o.roll);
      var ctx_ = Math.cos(o.tx), stx = Math.sin(o.tx);
      var coy = Math.cos(oy), soy = Math.sin(oy);
      var pos = function (u) {
        var px = o.a * Math.cos(u), py = o.b * Math.sin(u);
        var qx = px * cr - py * sr, qy = px * sr + py * cr;
        var qz = qy * stx, qy2 = qy * ctx_;
        var rx = qx * coy + qz * soy, rz = -qx * soy + qz * coy;
        var ry = qy2 * cosX - rz * sinX, rz2 = qy2 * sinX + rz * cosX;
        var pe2 = 3 / (3 - rz2);
        return [cx0 + balx + rx * R * pe2, cy0 + baly + ry * R * pe2, rz2];
      };
      // trilho fraco
      ctx.strokeStyle = "rgba(61,232,255,0.14)";
      ctx.lineWidth = Math.max(1, dpr * 0.7);
      ctx.beginPath();
      for (var q = 0; q <= 48; q++) {
        var pq = pos(q / 48 * 6.2832);
        if (q === 0) ctx.moveTo(pq[0], pq[1]); else ctx.lineTo(pq[0], pq[1]);
      }
      ctx.stroke();
      // cauda do cometa
      var prev = pos(o.u);
      for (var s3 = 1; s3 <= 26; s3++) {
        var cur = pos(o.u - s3 * 0.055);
        var a3 = (1 - s3 / 26) * 0.85;
        ctx.strokeStyle = "rgba(150,235,255," + a3.toFixed(2) + ")";
        ctx.lineWidth = Math.max(1, dpr * (1.6 - s3 * 0.05));
        ctx.beginPath();
        ctx.moveTo(prev[0], prev[1]);
        ctx.lineTo(cur[0], cur[1]);
        ctx.stroke();
        prev = cur;
      }
      var h = pos(o.u);
      ctx.fillStyle = "rgba(255,255,255,0.95)";
      ctx.beginPath();
      ctx.arc(h[0], h[1], 2.4 * dpr, 0, 6.2832);
      ctx.fill();
      ctx.fillStyle = "rgba(61,232,255,0.35)";
      ctx.beginPath();
      ctx.arc(h[0], h[1], 5.5 * dpr, 0, 6.2832);
      ctx.fill();
    }

    ctx.globalCompositeOperation = "source-over";
  }

  requestAnimationFrame(frame);
})();
