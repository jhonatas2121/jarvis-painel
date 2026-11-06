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

  var RX_SHOPEE = /\b(shopee|shopi|shope|shoppe|shoppee|chopee|xopi|xope)\b/;
  var RX_VENDA = /\b(venda|vendas|vendi|vendeu|faturei|pedido|pedidos|ganhei|resultado|resultados)\b/;
  var RX_NAO = /\b(ideia|ideias|plano|estrategia|dica|dicas|criar|configurar|tutorial|aumentar|melhorar|escalar|aprender|funciona|integrar|produto|produtos|procure|procura|achadinhos)\b/;

  function ehConsulta(v) {
    if (!v || v.split(' ').length > 12) return false;
    if (!RX_SHOPEE.test(v)) return false;
    if (RX_NAO.test(v)) return false;
    return RX_VENDA.test(v);
  }

  function consultar() {
    falar('Consultando a Shopee, senhor…');
    pino()
      .then(function (pin) {
        return fetch('/api/shopee-vendas?pin=' + encodeURIComponent(pin || ''));
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
        var dias = Object.keys(j.por_dia || {}).sort();
        if (!dias.length) {
          falar('Senhor, não há vendas da Shopee nos últimos ' + (j.dias || 7) + ' dias.');
          return;
        }
        var ult = dias[dias.length - 1];
        var d = j.por_dia[ult];
        var msg = 'Senhor, no dia mais recente do painel da Shopee, ' + dataBR(ult) +
          ', foram ' + pedidos(d.pedidos) + ' e ' + dinheiro(d.comissao) +
          ' de comissão estimada.';
        msg += ' Nos últimos ' + (j.dias || 7) + ' dias, ' + pedidos(j.pedidos_validos) +
          ' e ' + dinheiro(j.comissao_estimada) + ' estimados.';
        falar(msg);
      })
      .catch(function () {
        falar('Não consegui consultar a Shopee, senhor.');
      });
  }
  function tratar(texto) {
    var v = norm(texto);
    if (!v) return false;
    if (ehConsulta(v)) {
      consultar();
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
