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

  var RX_CAKTO = /\b(cakto|cackto|kakto|cacto|cachto|caquito|catko|kactu)\b/;
  var RX_VENDA = /\b(venda|vendas|vendi|vendeu|faturei|faturamento|pedido|pedidos|compra|compras|comprou|ganhei|resultado|resultados)\b/;
  var RX_TEMPO = /\b(hoje|quanto|quantas|quantos)\b/;
  var RX_NAO = /\b(ideia|ideias|plano|estrategia|dica|dicas|criar|configurar|tutorial|aumentar|melhorar|mais|escalar|aprender|funciona|integrar)\b/;
  var RX_SIMPLES = /^(quantas vendas( eu)?( fiz| tive)?|quanto( eu)? (vendi|faturei|ganhei)|(minhas |ver |as |como estao as |como foram as )?vendas)( de hoje| hoje)?$/;

  function ehConsulta(v) {
    if (!v || v.split(' ').length > 10) return false;
    if (RX_SIMPLES.test(v)) return true;
    if (!RX_CAKTO.test(v)) return false;
    if (RX_NAO.test(v)) return false;
    if (/\bcomo\b/.test(v) && !/\bcomo (estao|esta|foram|foi)\b/.test(v)) return false;
    return RX_VENDA.test(v) || RX_TEMPO.test(v) || /\bcomo (estao|esta|foram|foi)\b/.test(v) || v.split(' ').length <= 3;
  }

  function consultar() {
    falar('Consultando a Cakto, senhor…');
    pino()
      .then(function (pin) {
        return fetch('/api/cakto', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ pin: pin || '' })
        });
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
        if (!j.ok) {
          falar('Não consegui consultar a Cakto' + (j.etapa ? ' (etapa: ' + j.etapa + ')' : '') + ', senhor.');
          return;
        }
        if (!j.total) {
          falar('Senhor, hoje ainda não há nenhum pedido na Cakto.');
          return;
        }
        if (!j.pagos) {
          falar('Senhor, hoje há ' + j.total + (j.total === 1 ? ' pedido' : ' pedidos') + ' na Cakto, mas nenhum pago até o momento.');
          return;
        }
        var msg = 'Senhor, hoje há ' + dinheiro(j.valorPagos) + ' em vendas pagas e ' +
          j.pagos + (j.pagos === 1 ? ' compra.' : ' compras.');
        var pend = j.total - j.pagos;
        if (pend > 0) msg += ' Outros ' + pend + (pend === 1 ? ' pedido ainda não foi pago.' : ' pedidos ainda não foram pagos.');
        if (j.aviso) msg += ' Atenção: ' + j.aviso + '.';
        falar(msg);
      })
      .catch(function () {
        falar('Não consegui consultar a Cakto, senhor.');
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
