/* esfera.js v5 - esfera de poeira que vira um arco, escorre para o centro e desenha um humanoide em neon */
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

  function suave(a) { a = Math.max(0, Math.min(1, a)); return a * a * (3 - 2 * a); }

  // ---------- ajustes rapidos ----------
  var CORE_Y = 0.5;      // altura do nucleo laranja (0.5 = rosto; -0.42 = peito)
  var TEMPO_IDA = 6.5;   // segundos para virar humanoide
  var TEMPO_VOLTA = 4.0; // segundos para voltar a esfera
  var RA = 1.55;         // raio do arco de poeira
  var ARCO = 4.2;        // tamanho do arco (radianos)

  // ---------- pontos da esfera ----------
  var N = (navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 4) ? 1200 : 2200;
  var P = [];
  for (var i = 0; i < N; i++) {
    var y = 1 - 2 * (i + 0.5) / N;
    var r = Math.sqrt(1 - y * y);
    var th = i * 2.399963;
    P.push([Math.cos(th) * r, y, Math.sin(th) * r]);
  }

  // ---------- formas do humanoide (y para cima) ----------
  var CX = 0.6, RX = 0.30, RY = 0.42;
  var NH = 30, NB = 20;
  function tpr(s) { return s < 0 ? 1 + 0.32 * s : 1 - 0.04 * s * s; }
  function cabeca(a) {
    var s = Math.sin(a);
    return [RX * Math.cos(a) * tpr(s), CX + RY * s];
  }
  function larguraCabeca(q) {
    if (Math.abs(q) >= 1) return 0;
    return RX * Math.sqrt(1 - q * q) * tpr(q);
  }
  function larguraOmbro(yy) {
    if (yy >= 0) return 0.17;
    if (yy > -0.28) {
      var t = -yy / 0.28;
      return 0.17 + 0.66 * (1 - Math.pow(1 - t, 1.7));
    }
    return 0.83 + 0.06 * Math.min(1, (-0.28 - yy) / 0.72);
  }

  // contorno direito: pescoco + ombro + bracos (de cima para baixo)
  var RP = [], k0, y0;
  for (k0 = 0; k0 < 14; k0++) {
    y0 = 0.28 - k0 * 0.02;
    RP.push([0.12 + 0.05 * (0.28 - y0) / 0.28, y0]);
  }
  for (k0 = 0; k0 <= 50; k0++) {
    y0 = -k0 * 0.02;
    RP.push([larguraOmbro(y0), y0]);
  }
  var RL = [0];
  for (k0 = 1; k0 < RP.length; k0++) {
    var dx = RP[k0][0] - RP[k0 - 1][0], dy = RP[k0][1] - RP[k0 - 1][1];
    RL.push(RL[k0 - 1] + Math.sqrt(dx * dx + dy * dy));
  }
  var RT = RL[RL.length - 1];
  function noContorno(u) {
    var d = u * RT, k = 1;
    while (k < RL.length - 1 && RL[k] < d) k++;
    var f = (d - RL[k - 1]) / Math.max(1e-6, RL[k] - RL[k - 1]);
    return [RP[k - 1][0] + (RP[k][0] - RP[k - 1][0]) * f,
            RP[k - 1][1] + (RP[k][1] - RP[k - 1][1]) * f];
  }

  var HP = [];
  for (k0 = 0; k0 <= 64; k0++) HP.push(cabeca(k0 / 64 * 6.2832));

  // ---------- onde cada particula vai parar no corpo ----------
  // tipos: 0 contorno, 1 cabeca (miolo), 2 corpo (miolo), 3 nucleo laranja, 4 poeira em volta
  var COR = [[150, 235, 255], [70, 170, 255], [60, 150, 255], [255, 175, 70], [130, 200, 255]];
  var ALT = [0.95, 0.42, 0.36, 0.85, 0.5];
  var TAMT = [1.0, 0.8, 0.8, 0.9, 0.7];

  var T = [], ORD = [], SR = [], SZ = [], ORC = [], TP = [];
  for (var n = 0; n < N; n++) {
    var f = (n * 0.61803398) % 1;
    var u = (n * 0.75487766) % 1;
    var v = (n * 0.56984029) % 1;
    var rn = (n * 0.41421356) % 1;
    var tx = 0, ty = 0, tz = 0, tipo = 0;
    if (f < 0.14) {
      tipo = 0;
      var pc = cabeca(u * 6.2832);
      tx = pc[0] + (rn - 0.5) * 0.02; ty = pc[1] + (v - 0.5) * 0.02; tz = (v - 0.5) * 0.04;
    } else if (f < 0.36) {
      tipo = 0;
      var lado = (n % 2) ? 1 : -1;
      var nc = noContorno(v);
      tx = lado * nc[0] + (rn - 0.5) * 0.02; ty = nc[1]; tz = (u - 0.5) * 0.04;
    } else if (f < 0.52) {
      tipo = 1;
      var q = -0.95 + 1.9 * v;
      var xn = u * 2 - 1;
      tx = xn * larguraCabeca(q) * 0.97;
      ty = CX + RY * q;
      tz = 0.3 * Math.sqrt(Math.max(0, 1 - xn * xn)) * Math.sqrt(Math.max(0, 1 - q * q));
    } else if (f < 0.64) {
      tipo = 2;
      var yb = -0.06 - 0.92 * v;
      var xb = u * 2 - 1;
      tx = xb * larguraOmbro(yb) * 0.95;
      ty = yb;
      tz = 0.12 * Math.sqrt(Math.max(0, 1 - xb * xb));
    } else if (f < 0.84) {
      tipo = 3;
      var ac = u * 6.2832;
      var rc = 0.2 * Math.sqrt(v) * (0.35 + rn * 0.65);
      tx = Math.cos(ac) * rc; ty = CORE_Y + Math.sin(ac) * rc * 1.1; tz = 0;
    } else {
      tipo = 4;
      var ar = u * 6.2832;
      var dist = 0.42 + 0.4 * v;
      tx = Math.cos(ar) * dist; ty = CX + Math.sin(ar) * dist * 0.9; tz = (rn - 0.5) * 0.2;
    }
    T.push([tx, -ty, tz]);
    TP.push(tipo);
    if (tipo === 3) ORD.push(0.12 * rn);
    else if (tipo === 4) ORD.push(0.55 + 0.45 * rn);
    else ORD.push(Math.max(0, Math.min(1, (ty + 1) / 2.05 + (rn - 0.5) * 0.1)));
    ORC.push((n * 0.3819) % 1);
    SR.push((n * 0.3247) % 1);
    SZ.push((n * 0.7071) % 1);
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

  // mapeamento do corpo (plano) para a tela
  var gx = 0, gy = 0, gR = 1, gcs = 1, gSC = 1.08, gre = 0;
  function LX(x) { return gx + x * gcs * gSC * gR; }
  function LY(y) { return gy + (-y * gSC + gre) * gR; }

  function tracar(pts, espelho, estilo, larg) {
    ctx.strokeStyle = estilo;
    ctx.lineWidth = larg;
    ctx.beginPath();
    for (var k = 0; k < pts.length; k++) {
      var px = espelho ? -pts[k][0] : pts[k][0];
      if (k === 0) ctx.moveTo(LX(px), LY(pts[k][1]));
      else ctx.lineTo(LX(px), LY(pts[k][1]));
    }
    ctx.stroke();
  }

  var ang = 0, tph = 0, rot2 = 0, nivel = 0, last = 0, lentos = 0, passo = 1, mm = 0, strAng = 0;
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

    if (mm < humanaAlvo) mm = Math.min(humanaAlvo, mm + dt / TEMPO_IDA);
    else if (mm > humanaAlvo) mm = Math.max(humanaAlvo, mm - dt / TEMPO_VOLTA);

    var calmo = reduzido ? 0.3 : 1;
    var vel = (0.6 + (pensando ? 1.4 : 0) + (modo ? 1.0 + 2.6 * nivel : 0)) * calmo;
    tph += dt * vel;
    ang = (ang + dt * (0.25 + (pensando ? 0.6 : 0)) * calmo) % 6.2832;
    rot2 += dt * 0.08 * calmo;
    strAng = (strAng + dt * 2.2 * calmo) % 6.2832;

    var amp = 0.05 + 0.17 * nivel + (pensando ? 0.04 : 0);
    var R = W * 0.27;
    var cx0 = W / 2, cy0 = H / 2;
    var sway = 1 - mm * 0.8;
    var balx = Math.sin(tph * 0.8) * amp * R * 0.45 * sway;
    var baly = Math.cos(tph * 0.65) * amp * R * 0.35 * sway;

    var ca = Math.cos(ang), sa = Math.sin(ang);
    var tilt = 0.35 * (1 - mm);
    cosX = Math.cos(tilt); sinX = Math.sin(tilt);
    var SC = 1.08;
    var respira = Math.sin(tph * 0.9) * 0.012;
    var swv = Math.sin(t * 0.6) * 0.07 * mm;
    var csw = Math.cos(swv), ssw = Math.sin(swv);

    gx = cx0 + balx; gy = cy0 + baly; gR = R; gcs = csw; gSC = SC; gre = respira;

    ctx.clearRect(0, 0, W, H);

    var g = ctx.createRadialGradient(cx0, cy0, 0, cx0, cy0, R * 1.25);
    g.addColorStop(0, "rgba(190,245,255," + (0.55 - 0.35 * mm).toFixed(2) + ")");
    g.addColorStop(0.25, "rgba(61,200,255," + (0.28 - 0.16 * mm).toFixed(2) + ")");
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

    // particulas: esfera -> arco de poeira -> corpo
    var esc = dpr * (passo === 2 ? 1.3 : 1);
    for (var i = 0; i < N; i += passo) {
      var p = P[i];
      var d = Math.sin(p[0] * 2.3 + tph * 1.1) * Math.cos(p[1] * 2.9 - tph * 0.9) +
              0.6 * Math.sin(p[2] * 3.1 + tph * 1.4 + p[0]);
      var rr = 1 + amp * d;
      var bx = p[0] * rr, by = p[1] * rr, bz = p[2] * rr;

      var x1 = bx * ca + bz * sa;
      var z1 = -bx * sa + bz * ca;
      var x = x1;
      var yv = by * cosX - z1 * sinX;
      var z = by * sinX + z1 * cosX;
      var e = 0, sp = 0, bp = 0;
      var oc = ORC[i];

      if (mm > 0) {
        sp = suave((mm - oc * 0.10) / 0.20);
        if (sp > 0) {
          var thS = strAng - oc * ARCO;
          var rs = RA + (SR[i] - 0.5) * (0.08 + 0.3 * oc) + 0.02 * Math.sin(tph * 2 + i);
          var qx = Math.cos(thS) * rs, qy = Math.sin(thS) * rs * 0.92, qz = (SZ[i] - 0.5) * 0.12;
          var sw1 = Math.sin(sp * 3.14159) * 0.25 * (0.5 + oc);
          x = x + (qx - x) * sp - Math.sin(thS) * sw1;
          yv = yv + (qy - yv) * sp + Math.cos(thS) * sw1 * 0.92;
          z = z + (qz - z) * sp;

          bp = suave((mm - 0.34 - ORD[i] * 0.42) / 0.24);
          if (bp > 0) {
            var tg = T[i];
            var jit = amp * 0.2 * d;
            var tx2 = (tg[0] * csw + tg[2] * ssw) * SC + jit;
            var ty2 = tg[1] * SC + respira;
            var tz2 = (-tg[0] * ssw + tg[2] * csw) + jit;
            if (TP[i] === 4) {
              tx2 += 0.04 * Math.sin(tph * 0.7 + i * 1.3);
              ty2 += 0.04 * Math.cos(tph * 0.6 + i * 0.9);
            }
            var sw2 = Math.sin(bp * 3.14159) * 0.5;
            x = x * (1 - bp) + tx2 * bp - Math.sin(thS) * sw2;
            yv = yv * (1 - bp) + ty2 * bp + Math.cos(thS) * sw2 * 0.92;
            z = z * (1 - bp) + tz2 * bp;
          }
          e = bp;
        }
      }

      var ze = z * (1 - 0.85 * e);
      var pe = 3 / (3 - ze);
      var sx = cx0 + balx + x * R * pe;
      var sy = cy0 + baly + yv * R * pe;
      var fz = (z + 1.2) / 2.4;
      var f2 = fz * (1 - e) + 0.78 * e;

      var al = 0.2 + 0.7 * f2;
      var tam = 0.9 + 1.3 * f2;
      var rC = 40 + 110 * f2, gC = 150 + 90 * f2, bC = 255;
      if (sp > 0) {
        al = al * (1 - sp) + (0.3 + 0.6 * (1 - oc)) * sp;
        tam = tam * (1 - sp) + (0.6 + 0.9 * (1 - oc)) * sp;
      }
      if (bp > 0) {
        var tc = COR[TP[i]];
        al = al * (1 - bp) + ALT[TP[i]] * bp;
        tam = tam * (1 - bp) + TAMT[TP[i]] * bp;
        rC = rC * (1 - bp) + tc[0] * bp;
        gC = gC * (1 - bp) + tc[1] * bp;
        bC = bC * (1 - bp) + tc[2] * bp;
      }
      var lado2 = tam * esc * 1.5;
      ctx.fillStyle = "rgba(" + Math.round(rC) + "," + Math.round(gC) + "," + Math.round(bC) + "," + al.toFixed(2) + ")";
      ctx.fillRect(sx - lado2 / 2, sy - lado2 / 2, lado2, lado2);
    }

    // cabeca brilhante do arco de poeira
    if (mm > 0.02 && mm < 0.9) {
      var ha = suave(mm / 0.15) * (1 - suave((mm - 0.72) / 0.16));
      if (ha > 0.01) {
        var hx = cx0 + balx + Math.cos(strAng) * RA * R;
        var hy = cy0 + baly + Math.sin(strAng) * RA * 0.92 * R;
        var hr = R * 0.22;
        var hg = ctx.createRadialGradient(hx, hy, 0, hx, hy, hr);
        hg.addColorStop(0, "rgba(220,250,255," + (0.95 * ha).toFixed(2) + ")");
        hg.addColorStop(0.3, "rgba(70,200,255," + (0.5 * ha).toFixed(2) + ")");
        hg.addColorStop(1, "rgba(30,120,230,0)");
        ctx.fillStyle = hg;
        ctx.fillRect(hx - hr, hy - hr, hr * 2, hr * 2);
      }
    }

    // nucleo laranja (nasce no centro quando a poeira comeca a escorrer)
    if (mm > 0.26) {
      var cA = suave((mm - 0.26) / 0.30);
      var cG = 0.35 + 0.65 * suave((mm - 0.26) / 0.5);
      var pulso = 1 + 0.08 * Math.sin(t * 3) + 0.5 * nivel;
      var nr = R * 0.36 * cG * pulso;
      var ncx = LX(0) - gx + cx0 + balx * 0.2;
      var ncy = LY(CORE_Y) - gy + cy0 + baly * 0.2;
      var og = ctx.createRadialGradient(ncx, ncy, 0, ncx, ncy, nr);
      og.addColorStop(0, "rgba(255,245,210,0.95)");
      og.addColorStop(0.25, "rgba(255,160,50,0.75)");
      og.addColorStop(1, "rgba(255,100,20,0)");
      ctx.globalAlpha = cA;
      ctx.fillStyle = og;
      ctx.fillRect(ncx - nr, ncy - nr, nr * 2, nr * 2);
      ctx.globalAlpha = 1;
    }

    // contorno neon: aparece de baixo para cima, acompanhando a poeira
    if (mm > 0.38) {
      var na = suave((mm - 0.40) / 0.18) * (1 + 0.45 * nivel);
      var yUp = -1.1 + (mm - 0.40) / 0.48 * 2.35;
      var pronto = yUp >= 1.25;
      var gy0 = LY(-0.25), gy1 = LY(-1.0);
      var passes = [[16, 0.07], [7, 0.15], [3, 0.35], [1.6, 0.95]];
      var pi, gg, kh2, q2, w2, kb2, yb2;

      ctx.save();
      if (!pronto) {
        ctx.beginPath();
        ctx.rect(0, LY(yUp), W, H);
        ctx.clip();
      }

      // brilho suave dentro da cabeca
      var hf = ctx.createRadialGradient(LX(0), LY(CX), 0, LX(0), LY(CX), R * 0.55);
      hf.addColorStop(0, "rgba(90,190,255," + (0.16 * na).toFixed(3) + ")");
      hf.addColorStop(1, "rgba(60,150,255,0)");
      ctx.fillStyle = hf;
      ctx.beginPath();
      for (var kk = 0; kk < HP.length; kk++) {
        if (kk === 0) ctx.moveTo(LX(HP[kk][0]), LY(HP[kk][1]));
        else ctx.lineTo(LX(HP[kk][0]), LY(HP[kk][1]));
      }
      ctx.closePath();
      ctx.fill();

      for (pi = 0; pi < passes.length; pi++) {
        var lw = passes[pi][0] * dpr * 0.8, aa = Math.min(1, passes[pi][1] * na);
        tracar(HP, false, "rgba(110,215,255," + aa.toFixed(3) + ")", lw);
        gg = ctx.createLinearGradient(0, gy0, 0, gy1);
        gg.addColorStop(0, "rgba(130,225,255," + aa.toFixed(3) + ")");
        gg.addColorStop(1, "rgba(130,225,255,0)");
        tracar(RP, false, gg, lw);
        tracar(RP, true, gg, lw);
      }

      // linhas finas na cabeca e no corpo
      ctx.lineWidth = Math.max(1, dpr * 0.8);
      ctx.strokeStyle = "rgba(120,220,255," + (0.2 * na).toFixed(3) + ")";
      ctx.beginPath();
      for (kh2 = 0; kh2 < NH; kh2++) {
        q2 = -0.92 + 1.84 * kh2 / (NH - 1);
        w2 = larguraCabeca(q2) * 0.97;
        ctx.moveTo(LX(-w2), LY(CX + RY * q2));
        ctx.lineTo(LX(w2), LY(CX + RY * q2));
      }
      ctx.stroke();
      gg = ctx.createLinearGradient(0, gy0, 0, gy1);
      gg.addColorStop(0, "rgba(120,220,255," + (0.2 * na).toFixed(3) + ")");
      gg.addColorStop(1, "rgba(120,220,255,0)");
      ctx.strokeStyle = gg;
      ctx.beginPath();
      for (kb2 = 0; kb2 < NB; kb2++) {
        yb2 = -0.06 - 0.9 * kb2 / (NB - 1);
        w2 = larguraOmbro(yb2) * 0.95;
        ctx.moveTo(LX(-w2), LY(yb2));
        ctx.lineTo(LX(w2), LY(yb2));
      }
      ctx.stroke();
      ctx.restore();

      // linha de luz que sobe desenhando o corpo
      if (!pronto && yUp > -1.05) {
        var sl = 0.8 * (1 - suave((yUp - 0.9) / 0.35)) * na;
        var ly = LY(yUp);
        var sg = ctx.createLinearGradient(LX(-1.1), 0, LX(1.1), 0);
        sg.addColorStop(0, "rgba(150,240,255,0)");
        sg.addColorStop(0.5, "rgba(190,250,255," + sl.toFixed(3) + ")");
        sg.addColorStop(1, "rgba(150,240,255,0)");
        ctx.fillStyle = sg;
        ctx.fillRect(LX(-1.1), ly - dpr, LX(1.1) - LX(-1.1), 2 * dpr);
      }

      // luz horizontal cruzando a figura quando o corpo esta pronto
      if (mm > 0.92) {
        var ml = suave((mm - 0.92) / 0.08);
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
        ctx.globalAlpha = 1;
      }
    }

    // orbitas com cometa (somem rapido quando a esfera se desfaz)
    var oa = 1 - 0.97 * suave(mm / 0.3);
    if (oa > 0.02) {
      ctx.globalAlpha = oa;
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
    } else {
      // mantem as orbitas andando para nao "pularem" quando a esfera volta
      for (var j2 = 0; j2 < O.length; j2++) O[j2].u += dt * O[j2].v * calmo;
    }

    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = "source-over";
  }

  requestAnimationFrame(frame);
})();
