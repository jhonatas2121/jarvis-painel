const crypto = require('crypto');

module.exports = async (req, res) => {
  try {
    const appId = process.env.SHOPEE_APP_ID;
    const secret = process.env.SHOPEE_APP_SECRET;
    if (!appId || !secret) {
      return res.status(500).json({ erro: 'faltam variaveis' });
    }
    const q = String(req.query.q || 'natal');
    const sort = parseInt(req.query.sort || '2', 10);
    const limit = Math.min(parseInt(req.query.limit || '20', 10), 50);
    const query = '{productOfferV2(keyword:' + JSON.stringify(q) +
      ',sortType:' + sort + ',page:1,limit:' + limit +
      '){nodes{itemId productName price commissionRate sales ratingStar shopName offerLink}}}';
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
    res.status(200).json(d);
  } catch (e) {
    res.status(500).json({ erro: String(e) });
  }
};
