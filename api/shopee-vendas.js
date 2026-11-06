const crypto = require('crypto');

async function chamar(appId, secret, query) {
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
  return d.data.conversionReport;
}

function arred(v) {
  return Math.round(v * 100) / 100;
}

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
    const dias = Math.min(Math.max(parseInt(req.query.dias) || 7, 1), 30);
    const fim = Math.floor(Date.now() / 1000);
    const ini = fim - dias * 24 * 3600;

    const vistos = {};
    const porStatus = {};
    const porDia = {};
    let unicos = 0;
    let validos = 0;
    let total = 0;
    let paginas = 0;
    let scroll = '';

    while (paginas < 20) {
      const sc = scroll ? ',scrollId:' + JSON.stringify(scroll) : '';
      const query = '{conversionReport(purchaseTimeStart:' + ini +
        ',purchaseTimeEnd:' + fim + sc + ',limit:100){' +
        'nodes{purchaseTime conversionId conversionStatus ' +
        'totalCommission}' +
        'pageInfo{hasNextPage scrollId}}}';
      const rep = await chamar(appId, secret, query);
      const nodes = rep.nodes || [];
      nodes.forEach(function (n) {
        if (vistos[n.conversionId]) return;
        vistos[n.conversionId] = true;
        unicos++;
        const st = n.conversionStatus;
        porStatus[st] = (porStatus[st] || 0) + 1;
        if (st === 'CANCELLED') return;
        const com = parseFloat(n.totalCommission) || 0;
        const dia = new Date((n.purchaseTime - 3 * 3600) * 1000)
          .toISOString().slice(0, 10);
        if (!porDia[dia]) porDia[dia] = { pedidos: 0, comissao: 0 };
        porDia[dia].pedidos++;
        porDia[dia].comissao = arred(porDia[dia].comissao + com);
        validos++;
        total += com;
      });
      paginas++;
      if (!rep.pageInfo || !rep.pageInfo.hasNextPage) break;
      scroll = rep.pageInfo.scrollId;
    }

    res.status(200).json({
      dias: dias,
      paginas: paginas,
      pedidos_unicos: unicos,
      pedidos_validos: validos,
      por_status: porStatus,
      comissao_estimada: arred(total),
      por_dia: porDia
    });
  } catch (e) {
    res.status(500).json({ erro: String(e) });
  }
};
