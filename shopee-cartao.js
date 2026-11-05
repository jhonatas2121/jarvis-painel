(function () {
  function el(t, x) {
    var e = document.createElement(t);
    if (x != null) e.textContent = x;
    return e;
  }
  window.shopeeCartoes = function (lista, q) {
    var old = document.getElementById('shp');
    if (old) old.remove();
    var o = el('div');
    o.id = 'shp';
    o.style.cssText = 'position:fixed;left:0;right:0;bottom:0;' +
      'max-height:75%;overflow:auto;background:#031018;' +
      'border-top:2px solid #0ff;padding:10px;z-index:9999;' +
      'color:#cfe;font:14px sans-serif';
    var x = el('button', 'Fechar X');
    x.style.cssText = 'float:right;background:none;' +
      'border:1px solid #0ff;color:#0ff;padding:6px 10px';
    x.onclick = function () { o.remove(); };
    o.appendChild(x);
    o.appendChild(el('b', 'Shopee: ' + q));
    lista.forEach(function (p) {
      var c = el('div');
      c.style.cssText = 'display:flex;gap:10px;margin:10px 0;' +
        'padding:8px;border:1px solid #0ff5';
      var i = el('img');
      i.src = p.imagem || '';
      i.style.cssText = 'width:84px;height:84px;object-fit:cover';
      var d = el('div');
      d.appendChild(el('div', String(p.nome).slice(0, 60)));
      d.appendChild(el('div', 'R$ ' + p.preco.toFixed(2) + ' | ' +
        p.comissaoPct + '% | ganha R$ ' + p.ganhoPorVenda.toFixed(2)));
      d.appendChild(el('div', p.vendas + ' vendas | nota ' + p.nota +
        (p.emergente ? ' | emergente' : '')));
      var a = el('a', 'Abrir na Shopee');
      a.href = p.link;
      a.target = '_blank';
      a.style.color = '#0ff';
      d.appendChild(a);
      c.appendChild(i);
      c.appendChild(d);
      o.appendChild(c);
    });
    document.body.appendChild(o);
  };
})();
