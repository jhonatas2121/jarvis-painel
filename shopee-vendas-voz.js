(function () {
  function norm(s) {
    return String(s || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[.,!?;:]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .replace(/^(jarvis|jarvi|javis)\s*/, '');
  }
  function falar(t) {
    try { if (typeof say === 'function') say(t); } catch (e) {}
  }
  function pino() {
    try {
      if (typeof getPin === 'function') return Promise.resolve(getPin());
    } catch (e) {}
    return Promise.resolve('');
  }
  function dinheiro(v) {
    try {
      return Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    } catch (e) {
      return 'R$ ' + Number(v || 0).toFixed(2);
    }
  }
  function dataBR(iso) {
    var p = String(iso).split('-');
    return p[2] + '/' + p[1];
  }
  function pedidos(n) {
    return n + (n === 1 ? ' pedido' : ' pedidos');
  }
  function dataAtras(k) {
    return new Date(Date.now() - 3 * 3600 * 1000 - k * 86400000)
      .toISOString().slice(0, 10);
  }

  var RX_SHOPEE = /\b(shopee|shopi|shope|shoppe|shoppee|chopee|xopi|xope)\b/;
  var RX_VENDA = /\b(venda|vendas|vendi|vendeu|faturei|pedido|pedidos|ganhei|resultado|resultados)\b/;
  var RX_NAO = /\b(ideia|ideias|plano|estrategia|dica|dicas|criar|configurar|tutorial|aumentar|melhorar|escalar|aprender|funciona|integrar|produto|produtos|procure|procura|achadinhos)\b/;

  function ehConsulta(v) {
    if (!v || v.split(' ').length > 14) return false;
    if (!RX_SHOPEE.test(v)) return false;
    if (RX_NAO.test(v)) return false;
    return RX_VENDA.test(v);
  }

  function periodo(v) {
    if (/\banteontem\b/.test(v)) return { tipo: 'dia', k: 2, nome: 'anteontem' };
    if (/\bontem\b/.test(v)) return { tipo: 'dia', k: 1, nome: 'ontem' };
    if (/\b(30 dias|trinta dias)\b/.test(v)) return { tipo: 'trinta' };
    if (/\b(mes|mensal)\b/.test(v)) return { tipo: 'mes' };
    return { tipo: 'resumo' };
  }

  function consultar(v) {
    var per = periodo(v);
    var hoje = dataAtras(0);
    var dias = 7;
    if (per.tipo === 'trinta') dias = 30;
    if (per.tipo === 'mes') dias = Math.min(parseInt(hoje.slice(8, 10), 10), 30);
    falar('Consultando a Shopee, senhor…');
    pino()
      .then(function (pin) {
        return fetch('/api/shopee-vendas?dias=' + dias + '&pin=' + encodeURIComponent(pin || ''));
      })
      .then(function (r) {
        return r.json().then(function (j) { return { status: r.status, j: j }; });
      })
      .then(function (x) {
        var j = x.j || {};
        if (x.status === 401) {
          falar('O PIN está errado, senhor.');
          return;
        }
        if (j.erro) {
          falar('Não consegui consultar a Shopee, senhor.');
          return;
        }
        var porDia = j.por_dia || {};
        var lista = Object.keys(porDia).sort();

        if (per.tipo === 'dia') {
          var data = dataAtras(per.k);
          var d = porDia[data];
          if (d) {
            falar('Senhor, ' + per.nome + ', dia ' + dataBR(data) + ', foram ' +
              pedidos(d.pedidos) + ' e ' + dinheiro(d.comissao) +
              ' de comissão estimada na Shopee.');
          } else {
            falar('Senhor, não aparece nenhuma venda da Shopee em ' + dataBR(data) +
              ' no painel. A Shopee só mostra as vendas no dia seguinte.');
          }
          return;
        }

        if (per.tipo === 'mes') {
          var pref = hoje.slice(0, 7);
          var tp = 0;
          var tc = 0;
          var ultimo = '';
          lista.forEach(function (dt) {
            if (dt.slice(0, 7) !== pref) return;
            tp += porDia[dt].pedidos;
            tc += porDia[dt].comissao;
            ultimo = dt;
          });
          if (!tp) {
            falar('Senhor, ainda não aparecem vendas da Shopee neste mês no painel.');
            return;
          }
          falar('Senhor, neste mês, até o dia ' + dataBR(ultimo) + ', foram ' +
            pedidos(tp) + ' e ' + dinheiro(tc) + ' de comissão estimada na Shopee.');
          return;
        }

        if (!lista.length) {
          falar('Senhor, não há vendas da Shopee nos últimos ' + dias + ' dias.');
          return;
        }

        if (per.tipo === 'trinta') {
          falar('Senhor, nos últimos 30 dias, foram ' + pedidos(j.pedidos_validos) +
            ' e ' + dinheiro(j.comissao_estimada) + ' de comissão estimada na Shopee.');
          return;
        }

        var ult = lista[lista.length - 1];
        var u = porDia[ult];
        falar('Senhor, no dia mais recente do painel da Shopee, ' + dataBR(ult) +
          ', foram ' + pedidos(u.pedidos) + ' e ' + dinheiro(u.comissao) +
          ' de comissão estimada. Nos últimos 7 dias, ' + pedidos(j.pedidos_validos) +
          ' e ' + dinheiro(j.comissao_estimada) + ' estimados.');
      })
      .catch(function () {
        falar('Não consegui consultar a Shopee, senhor.');
      });
  }
  function tratar(texto) {
    var v = norm(texto);
    if (!v) return false;
    if (ehConsulta(v)) {
      consultar(v);
      return true;
    }
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
})();
