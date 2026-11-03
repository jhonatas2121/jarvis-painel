/* esfera.js v3 - esfera de pontinhos + forma humana (busto) do JARVIS */
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

  // ---------- pontos do busto (forma humana) ----------
  function suave(a) { a = Math.max(0, Math.min(1, a)); return a * a * (3 - 2 * a); }
  function meiaLargura(yy) {
    if (yy > 0) return 0.13;
    if (yy > -0.35) return 0.13 + 0.72 * suave(-yy / 0.35);
    return 0.85 + 0.07 * Math.max(0, Math.min(1, (-0.35 - yy) / 0.65));
  }
  var CX = 0.55, RX = 0.36, RY = 0.46;
  function larguraCabeca(yy) {
    var q = (yy - CX) / RY;
    if (Math.abs(q) >= 1) return 0;
    var w = RX * Math.sqrt(1 - q * q);
    if (q < 0) w *= 1 + 0.18 * q;
    return w;
  }
  var T = [], ORD = [], SIDE = [];
  for (var n = 0; n < N; n++) {
    var f = (n * 0.61803398) % 1;
    var u = (n * 0.75487766) % 1;
    var v = (n * 0.56984029) % 1;
    var tx = 0, ty = 0, tz = 0;
    if (f < 0.26) {
      var a = u * 6.2832, s = Math.sin(a);
      tx = RX * Math.cos(a) * (s < 0 ? 1 + 0.18 * s : 1);
      ty = CX + RY * s;
      tz = (v - 0.5) * 0.1;
    } else if (f < 0.48) {
      var k = Math.floor(v * 16);
      var yy = CX - RY * 0.95 + (k / 15) * 2 * RY * 0.95;
      tx = (u * 2 - 1) * larguraCabeca(yy) * 0.95;
      ty = yy;
      tz = ((k % 3) - 1) * 0.05;
    } else if (f < 0.62) {
      var lado = u < 0.5 ? -1 : 1;
      var yy2 = -v * 1.0;
      if (v < 0.1) yy2 = 0.1 - v * 1.5;
      tx = lado * meiaLargura(yy2);
      ty = yy2;
      tz = (v - 0.5) * 0.06;
    } else if (f < 0.84) {
      var k2 = Math.floor(v * 12);
      var yy3 = -0.12 - (k2 / 11) * 0.86;
      tx = (u * 2 - 1) * meiaLargura(yy3) * 0.95;
      ty = yy3;
      tz = ((k2 % 3) - 1) * 0.05;
    } else {
      var ar = -0.5 + u * 4.14;
      var rd = 1.22 + v * 0.3;
      tx = rd * Math.cos(ar);
      ty = -0.1 + rd * Math.sin(ar) * 0.95;
      tz = (v - 0.5) * 0.3;
    }
    T.push([tx, -ty, tz]);
    ORD.push(Math.max(0, Math.min(1, (ty + 1) / 2.2)));
    SIDE.push(tx < 0 ? -1 : 1);
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
    var v = 0.5 + 0.28 * Math.sin(t * 9.0) + 0.2 * Math.sin(t * 5.3 + 1.0) + 0.12 * Math.sin(t * 13.7);
    return Math.max(0.1, Math.min(1, v));
  }

  // ---------- forma humana: liga/desliga ----------
  var humanaAlvo = 0;
  function humana(on) { humanaAlvo = on ? 1 : 0; }
  window.jarvisEsfera = {
    humana: function () { humana(true); },
    esfera: function () { humana(false); }
  };

  // ---------- comandos de voz (sem gastar Gemini) ----------
  function norm(s) {
    var x = String(s || "").toLowerCase();
    try { x = x.normalize("NFD").replace(/[\u0300-\u036f]/g, ""); } catch (e) {}
    return x.replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim();
  }
  var RX_ON = /(revele ?se|revelar ?se|se revele|forma humana|assuma (a |sua )?forma|assumir (a )?forma|mostre (a )?(sua )?forma|mostre (o )?seu corpo)/;
  var RX_OFF = /(volt[a-z]* (a|para a|pra) esfera|forma de esfera|modo esfera|desfaca (a )?forma)/;
  function comando(v) {
    var n = norm(v);
    if (!n) return 0;
    if (RX_OFF.test(n)) return 2;
    if (RX_ON.test(n)) return 1;
    return 0;
  }
  function executar(c, inp) {
    if (inp) inp.value = "";
    humana(c === 1);
    if (typeof window.say === "function") {
      window.say(c === 1 ? "Como desejar, senhor." : "Voltando à forma de esfera, senhor.");
    }
  }

  // intercepta o toque no ENVIAR antes de qualquer outro codigo
  document.addEventListener("click", function (e) {
    var go = document.getElementById("go");
    if (!go || !(e.target === go || go.contains(e.target))) return;
    var inp = document.getElementById("in");
    var c = comando(inp ? inp.value : "");
    if (!c) return;
    e.stopImmediatePropagation();
    e.preventDefault();
    executar(c, inp);
  }, true);

  // intercepta o Enter no campo
  document.addEventListener("keydown", function (e) {
    if (e.key !== "Enter") return;
    var inp = document.getElementById("in");
    if (!inp || e.target !== inp) return;
    var c = comando(inp.value);
    if (!c) return;
    e.stopImmediatePropagation();
    e.preventDefault();
    executar(c, inp);
  }, true);

  // reserva: se alguem chamar send() direto
  var _send = window.send;
  if (typeof _send === "function") {
    window.send = function (txt) {
      var inp = document.getElementById("in");
      var v = typeof txt === "string" ? txt : (inp ? inp.value : "");
      var c = comando(v);
      if (!c) return _send.apply(this, arguments);
      executar(c, inp);
    };
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

  var ang = 0, tph = 0, rot2 = 0, nivel = 0, last = 0, lentos = 0, passo = 1, mm = 0;
  var cosX = Math.cos(0.35), sinX = Math.sin(0.35);

  function frame(ms) {
    requestAnimationFrame(frame);
    if (!ajustar()) return;
    var t = ms / 1000;
    var dt = last ? Math.min(0.05, t - last) : 0.016;
    last = t;

    if (dt > 0.034) { lentos++; if (lentos > 90) passo = 2; } else if (lentos > 0) { lentos--; }

    var pensando = core.classList.contains("think");
    var modo = falando();
    var alvo = modo ? nivelAlvo(modo, t) : 0;
    nivel += (alvo - nivel) * 0.22;

    if (mm < humanaAlvo) mm = Math.min(humanaAlvo, mm + dt / 2.4);
    else if (mm > humanaAlvo) mm = Math.max(humanaAlvo, mm - dt / 2.4);

    var calmo = reduzido ? 0.3 : 1;
    var vel = (0.6 + (pensando ? 1.4 : 0) + (modo ? 1.0 + 2.6 * nivel : 0)) * calmo;
    tph += dt * vel;
    ang += dt * (0.25 + (pensando ? 0.6 : 0)) * calmo;
    rot2 += dt * 0.08 * calmo;

    var amp = 0.05 + 0.17 * nivel + (pensando ? 0.04 : 0);
    var R = W * 0.27;
    var cx0 = W / 2, cy0 = H / 2;
    var sway = 1 - mm * 0.8;
    var balx = Math.sin(tph * 0.8) * amp * R * 0.45 * sway;
    var baly = Math.cos(tph * 0.65) * amp * R * 0.35 * sway;

    var angE = ang * (1 - mm) + Math.sin(t * 0.6) * 0.2 * mm;
    var ca = Math.cos(angE), sa = Math.sin(angE);
    var tilt = 0.35 * (1 - mm);
    cosX = Math.cos(tilt); sinX = Math.sin(tilt);
    var SC = 1.08;
    var respira = Math.sin(tph * 0.9) * 0.012;

    ctx.clearRect(0, 0, W, H);

    var g = ctx.createRadialGradient(cx0, cy0, 0, cx0, cy0, R * 1.25);
    g.addColorStop(0, "rgba(190,245,255," + (0.55 - 0.3 * mm).toFixed(2) + ")");
    g.addColorStop(0.25, "rgba(61,200,255," + (0.28 - 0.12 * mm).toFixed(2) + ")");
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

    // pontos: esfera -> busto, com a trilha subindo
    for (var i = 0; i < N; i += passo) {
      var p = P[i], x = p[0], y = p[1], z = p[2];
      var d = Math.sin(x * 2.3 + tph * 1.1) * Math.cos(y * 2.9 - tph * 0.9) +
              0.6 * Math.sin(z * 3.1 + tph * 1.4 + x);
      var rr = 1 + amp * d;
      var bx = x * rr, by = y * rr, bz = z * rr;

      var e = 0;
      if (mm > 0) {
        var li = Math.max(0, Math.min(1, mm * 1.7 - ORD[i] * 0.7));
        e = li * li * (3 - 2 * li);
        var tg = T[i];
        var cu = Math.sin(li * 3.14159) * 0.9 * SIDE[i];
        var jit = amp * 0.25 * d;
        var txx = tg[0] * SC + jit, tyy = tg[1] * SC + respira, tzz = tg[2] + jit;
        bx = bx * (1 - e) + txx * e + cu;
        by = by * (1 - e) + tyy * e;
        bz = bz * (1 - e) + tzz * e + cu * 0.4;
      }

      var x1 = bx * ca + bz * sa;
      var z1 = -bx * sa + bz * ca;
      var y2 = by * cosX - z1 * sinX;
      var z2 = by * sinX + z1 * cosX;
      var pe = 3 / (3 - z2);
      var sx = cx0 + balx + x1 * R * pe;
      var sy = cy0 + baly + y2 * R * pe;
      var fz = (z2 + 1.2) / 2.4;
      var f2 = fz * (1 - e) + 0.78 * e;
      var al = 0.2 + 0.7 * f2;
      var tam = (0.9 + 1.3 * f2) * dpr * (passo === 2 ? 1.3 : 1);
      ctx.fillStyle = "rgba(" + Math.round(40 + 110 * f2) + "," + Math.round(150 + 90 * f2) + ",255," + al.toFixed(2) + ")";
      ctx.beginPath();
      ctx.arc(sx, sy, tam, 0, 6.2832);
      ctx.fill();
    }

    // luz horizontal cruzando a figura + nucleo laranja
    if (mm > 0.05) {
      var ml = mm * mm;
      var yl = cy0 + Math.sin(t * 0.7) * R * 0.95;
      var lg = ctx.createLinearGradient(cx0 - R * 1.3, 0, cx0 + R * 1.3, 0);
      lg.addColorStop(0, "rgba(150,240,255,0)");
      lg.addColorStop(0.5, "rgba(170,245,255,0.8)");
      lg.addColorStop(1, "rgba(150,240,255,0)");
      ctx.globalAlpha = ml * 0.8;
      ctx.fillStyle = lg;
      ctx.fillRect(cx0 - R * 1.3, yl - dpr, R * 2.6, 2 * dpr);
      ctx.globalAlpha = ml * 0.25;
      ctx.fillRect(cx0 - R * 1.3, yl - 4 * dpr, R * 2.6, 8 * dpr);

      var ncx = cx0 + balx * 0.2, ncy = cy0 + 0.42 * R * SC + baly * 0.2;
      var pulso = 1 + 0.1 * Math.sin(t * 3) + 0.5 * nivel;
      var nr = R * 0.3 * pulso;
      var og = ctx.createRadialGradient(ncx, ncy, 0, ncx, ncy, nr);
      og.addColorStop(0, "rgba(255,245,210,0.95)");
      og.addColorStop(0.25, "rgba(255,160,50,0.75)");
      og.addColorStop(1, "rgba(255,100,20,0)");
      ctx.globalAlpha = ml;
      ctx.fillStyle = og;
      ctx.fillRect(ncx - nr, ncy - nr, nr * 2, nr * 2);
      ctx.globalAlpha = 1;
    }

    // orbitas com cometa (somem aos poucos na forma humana)
    ctx.globalAlpha = 1 - 0.75 * mm;
    for (var j = 0; j < O.length; j++) {
      var o = O[j];
      o.u += dt * o.v * (1 + (modo ? 0.8 * nivel : 0) + (pensando ? 1 : 0)) * calmo;
      var oy = o.ty + ang * o.sp * 3;
      var cr = Math.cos(o.roll), sr = Math.sin(o.roll);
      var cOx = Math.cos(o.tx), sOx = Math.sin(o.tx);
      var coy = Math.cos(oy), soy = Math.sin(oy);
      var pos = function (u) {
        var px = o.a * Math.cos(u), py = o.b * Math.sin(u);
        var qx = px * cr - py * sr, qy = px * sr + py * cr;
        var qz = qy * sOx, qy2 = qy * cOx;
        var rx = qx * coy + qz * soy, rz = -qx * soy + qz * coy;
        var ry = qy2 * cosX - rz * sinX, rz2 = qy2 * sinX + rz * cosX;
        var pe2 = 3 / (3 - rz2);
        return [cx0 + balx + rx * R * pe2, cy0 + baly + ry * R * pe2, rz2];
      };
      ctx.strokeStyle = "rgba(61,232,255,0.14)";
      ctx.lineWidth = Math.max(1, dpr * 0.7);
      ctx.beginPath();
      for (var q = 0; q <= 48; q++) {
        var pq = pos(q / 48 * 6.2832);
        if (q === 0) ctx.moveTo(pq[0], pq[1]); else ctx.lineTo(pq[0], pq[1]);
      }
      ctx.stroke();
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

    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = "source-over";
  }

  requestAnimationFrame(frame);
})();
