const crypto = require('crypto');

module.exports = async (req, res) => {
  try {
    const pin = process.env.JARVIS_PIN;
    if (!pin || req.query.pin !== pin) {
      return res.status(401).json({ erro: 'pin invalido' });
    }
    const appId = process.env.SHOPEE_APP_ID;
    const secret = process.env.SHOPEE_APP_SECRET;
    if (!appId || !secret) {
      return res.status(500).json({ erro: 'faltam variaveis' });
    }
    const fim = Math.floor(Date.now() / 1000);
    const ini = fim - 3 * 24 * 3600;
    const query = '{conversionReport(purchaseTimeStart:' + ini +
      ',purchaseTimeEnd:' + fim + ',limit:5){' +
      'nodes{conversionId conversionStatus totalCommission ' +
      'orders{orderId orderStatus items{itemId itemName itemPrice ' +
      'qty actualAmount itemTotalCommission}}}}}';
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
    res.status(200).json(d);
  } catch (e) {
    res.status(500).json({ erro: String(e) });
  }
};
