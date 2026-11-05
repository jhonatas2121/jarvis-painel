const crypto = require('crypto');

async function buscar(appId, secret, q, sort, page) {
  const query = '{productOfferV2(keyword:' + JSON.stringify(q) +
    ',sortType:' + sort + ',page:' + page + ',limit:50)' +
    '{nodes{itemId productName price commissionRate sales ratingStar shopName offerLink}}}';
  const payload = JSON.stringify({ query: query });
  const ts = Math.floor(Date.now() / 1000);
  const sig = crypto.createHash('sha256')
    .update(appId + ts + payload + secret).digest('hex');
  const r = await fetch('https://open-api.affiliate.shopee.com.br/graphql', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'SHA256 Credential=' + appId +
        ', Timestamp=' + ts + ', Signature=' + sig
    },
    body: payload
  });
  const d = await r.json();
  if (d.errors) throw new Error(JSON.stringify(d.errors));
  return (d.data && d.data.productOfferV2 && d.data.productOfferV2.nodes) || [];
}

function num(v, padrao) {
  const n = parseFloat(v);
  return isNaN(n) ? padrao : n;
}

module.exports = async (req, res) => {
  try {
    const appId = process.env.SHOPEE_APP_ID;
    const secret = process.env.SHOPEE_APP_SECRET;
    if (!appId || !secret) {
      return res.status(500).json({ erro: 'faltam variaveis' });
    }
    const q = String(req.query.q || 'natal');
    const minCom = num(req.query.com, 8);
    const minNota = num(req.query.nota, 4.7);
    const minVendas = num(req.query.vendas, 100);
    const maxPreco = num(req.query.preco, 1000000);
    const top = Math.min(num(req.query.top, 10), 30);

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
        const preco = num(p.price, 0);
        const taxa = num(p.commissionRate, 0);
        const nota = num(p.ratingStar, 0);
        const vendas = Number(p.sales) || 0;
        const ganho = preco * taxa;
        if (taxa * 100 < minCom) return;
        if (nota < minNota) return;
        if (vendas < minVendas) return;
        if (preco > maxPreco) return;
        const emergente = vendas >= 100 && vendas <= 3000;
        let score = Math.min(taxa * 100, 30) * 1.5;
        score += nota >= 4.8 ? 15 : 10;
        score += Math.min(Math.log10(vendas + 1) * 5, 20);
        score += Math.min(ganho * 2, 20);
        if (emergente) score += 10;
        lista.push({
          nome: p.productName,
          preco: preco,
          comissaoPct: Math.round(taxa * 1000) / 10,
          ganhoPorVenda: Math.round(ganho * 100) / 100,
          vendas: vendas,
          nota: nota,
          loja: p.shopName,
          emergente: emergente,
          score: Math.round(Math.min(score, 100)),
          link: p.offerLink
        });
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
