(function () {
  ['shopee-cartao.js', 'shopee-voz.js'].forEach(function (f) {
    var s = document.createElement('script');
    s.src = '/' + f + '?v=1';
    document.head.appendChild(s);
  });
  function interceptar(e) {
    var inp = document.getElementById('in');
    if (!inp || typeof window.shopeeTratar !== 'function') return;
    if (window.shopeeTratar(inp.value)) {
      e.stopImmediatePropagation();
      e.preventDefault();
      inp.value = '';
    }
  }
  window.addEventListener('click', function (e) {
    var go = document.getElementById('go');
    if (go && e.target &&
      (e.target === go || go.contains(e.target))) interceptar(e);
  }, true);
  window.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' && e.target &&
      e.target.id === 'in') interceptar(e);
  }, true);
})();
