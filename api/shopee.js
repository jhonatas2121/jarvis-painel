const { buscar, num } = require('./_busca');
const { avaliar } = require('./_filtro');

module.exports = async (req, res) => {
  try {
    const appId = process.env.SHOPEE_APP_ID;
    const secret = process.env.SHOPEE_APP_SECRET;
    if (!appId || !secret) {
      return res.status(500).json({ erro: 'faltam variaveis' });
    }
    const x = req.query;
    const q = String(x.q || 'natal');
    const extra = x.extra === '1';
    const f = {
      soExtra: extra,
      minCom: num(x.com, extra ? 0 : 8),
      minNota: num(x.nota, 4.7),
      minVendas: num(x.vendas, 100),
      maxPreco: num(x.preco, 1000000)
    };
    const top = Math.min(num(x.top, 10), 30);

    const buscas = [];
    [2, 5].forEach(function (sort) {
      [1, 2].forEach(function (page) {
        buscas.push(buscar(appId, secret, q, sort, page));
      });
    });
    const resultados = await Promise.all(buscas);

    const vistos = {};
    const lista = [];
    resultados.forEach(function (nodes) {
      nodes.forEach(function (p) {
        if (vistos[p.itemId]) return;
        vistos[p.itemId] = true;
        const item = avaliar(p, f);
        if (item) lista.push(item);
      });
    });

    lista.sort(function (a, b) { return b.score - a.score; });
    res.status(200).json({
      consulta: q,
      total: lista.length,
      produtos: lista.slice(0, top)
    });
  } catch (e) {
    res.status(500).json({ erro: String(e) });
  }
};
