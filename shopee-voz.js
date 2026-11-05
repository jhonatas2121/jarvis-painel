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
