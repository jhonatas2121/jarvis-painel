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
  function consultar() {
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
          falar('Não consegui consultar a Cakto, senhor.');
          return;
        }
        if (!j.total) {
          falar('Senhor, ainda não há nenhuma venda registrada na Cakto.');
          return;
        }
        if (!j.pagos) {
          falar('Senhor, há ' + j.total + ' pedidos, mas nenhum pago até o momento.');
          return;
        }
        var msg = 'Senhor, até o momento há ' + dinheiro(j.valorPagos) + ' em vendas e ' +
          j.pagos + (j.pagos === 1 ? ' compra.' : ' compras.');
        if (j.total > 100) msg += ' Considerando os 100 pedidos mais recentes.';
        falar(msg);
      })
      .catch(function () {
        falar('Não consegui consultar a Cakto, senhor.');
      });
  }
  function tratar(texto) {
    var v = norm(texto);
    if (!v) return false;
    if (/^(vendas|minhas vendas|ver vendas|cakto|cakto vendas|vendas da cakto|como estao as vendas|como esta a cakto|quanto vendi|quanto eu vendi)$/.test(v)) {
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
