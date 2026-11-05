const crypto = require('crypto');

function num(v, padrao) {
  const n = parseFloat(v);
  return isNaN(n) ? padrao : n;
}

async function buscar(appId, secret, q, sort, page) {
  const campos = 'itemId productName price commissionRate ' +
    'sellerCommissionRate shopeeCommissionRate ' +
    'sales ratingStar shopName offerLink imageUrl';
  const query = '{productOfferV2(keyword:' + JSON.stringify(q) +
    ',sortType:' + sort + ',page:' + page + ',limit:50)' +
    '{nodes{' + campos + '}}}';
  const payload = JSON.stringify({ query: query });
  const ts = Math.floor(Date.now() / 1000);
  const sig = crypto.createHash('sha256')
    .update(appId + ts + payload + secret).digest('hex');
  const r = await fetch(
    'https://open-api.affiliate.shopee.com.br/graphql', {
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
  const p = d.data && d.data.productOfferV2;
  return (p && p.nodes) || [];
}

module.exports = { buscar, num };
