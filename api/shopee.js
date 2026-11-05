const crypto = require('crypto');

async function buscar(appId, secret, q, sort, page) {
  const query = '{productOfferV2(keyword:' + JSON.stringify(q) +
    ',sortType:' + sort + ',page:' + page + ',limit:50)' +
    '{nodes{itemId productName price commissionRate sales ratingStar shopName offerLink imageUrl}}}';
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
    resultados.forEa
