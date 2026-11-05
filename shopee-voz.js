(function () {
  function norm(s) {
    return String(s || '').toLowerCase().normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '').replace(/[!?;:]/g, ' ')
      .replace(/(\d),(\d)/g, '$1.$2').replace(/\s+/g, ' ').trim()
      .replace(/^(jarvis|jarvi|javis)[ ,]*/, '');
  }
  function falar(t) {
    try { if (typeof say === 'function') say(t); } catch (e) {}
  }
  var N = '(\\d+(?:\\.\\d+)?)';
  var RC = new RegExp('comissao (?:acima de|maior que|de) ' + N);
  var RP = new RegExp('\\b(?:ate|abaixo de|menos de) ' + N + '(?: reais)?');
  var RN = new RegExp('nota (?:acima de|maior que|de) ' + N);
  var RT = /top (\d+)|(\d+) (?:produtos|achadinhos)/;
  var GATI = /\b(produtos?|achadinhos?|afiliados?|comissao)\b|o que (vender|divulgar|rodar)/;
  var NAO = /\b(ideias?|criar|curso|digital|como|tutorial|cakto|vendas?)\b/;
  var STOP = /\b(produtos?|achadinhos?|afiliados?|comissao|boa|bom|com|de|da|do|me|acha|ache|mostra|mostre|busca|busque|procure|pesquisa|quais|quero|ver|o|que|eu|posso|divulgar|vender|rodar|para|pra|uns|uma|um|os|as|em|e|top|reais|nota)\b/g;

  function tira(st, rx, nome) {
    var m = st.v.match(rx);
    if (!m) return;
    st.p.push(nome + '=' + (m[1] || m[2]));
    st.v = st.v.replace(m[0], ' ');
  }
  window.shopeeTratar = function (texto) {
    var st = { v: norm(texto), p: [] };
    var v = st.v;
    if (!v || v.split(' ').length > 14) return false;
    if (!GATI.test(v) || NAO.test(v)) return false;
    tira(st, RC, 'com'); tira(st, RP, 'preco');
    tira(st, RN, 'nota'); tira(st, RT, 'top');
    var q = st.v.replace(STOP, ' ').replace(/[^a-z ]/g, ' ')
      .replace(/\s+/g, ' ').trim();
    if (!q) { falar('Qual assunto, senhor?'); return true; }
    st.p.push('q=' + encodeURIComponent(q));
    falar('Buscando ' + q + ', senhor…');
    fetch('/api/shopee?' + st.p.join('&'))
      .then(function (r) { return r.json(); })
      .then(function (j) {
        var l = j.produtos || [];
        if (!l.length) { falar('Não achei produtos com esses filtros, senhor.'); return; }
        window.shopeeCartoes(l, q);
        var b = l[0];
        falar('Senhor, achei ' + l.length + ' produtos. O melhor paga ' +
          b.comissaoPct + ' por cento, cerca de ' +
          b.ganhoPorVenda.toFixed(2).replace('.', ',') + ' reais por venda.');
      })
      .catch(function () { falar('Não consegui buscar na Shopee, senhor.'); });
    return true;
  };
})();
