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

    const pedVistos = {};
    const itVistos = {};
    const validos = {};
    const porStatus = {};
    const porDia = {};
    let totalPedidos = 0;
    let itens = 0;
    let valor = 0;
    let comissao = 0;
    let paginas = 0;
    let scroll = '';

    while (paginas < 20) {
      const sc = scroll ? ',scrollId:' + JSON.stringify(scroll) : '';
      const query = '{conversionReport(purchaseTimeStart:' + ini +
        ',purchaseTimeEnd:' + fim + sc + ',limit:100){' +
        'nodes{purchaseTime conversionId conversionStatus ' +
        'orders{orderId orderStatus items{itemId qty actualAmount itemTotalCommission}}}' +
        'pageInfo{hasNextPage scrollId}}}';
      const rep = await chamar(appId, secret, query);
      const nodes = rep.nodes || [];
      nodes.forEach(function (n) {
        const st = n.conversionStatus;
        const dia = new Date((n.purchaseTime - 3 * 3600) * 1000)
          .toISOString().slice(0, 10);
        (n.orders || []).forEach(function (o) {
          const cancel = st === 'CANCELLED' || o.orderStatus === 'CANCELLED';
          if (!pedVistos[o.orderId]) {
            pedVistos[o.orderId] = true;
            totalPedidos++;
            porStatus[st] = (porStatus[st] || 0) + 1;
          }
          if (cancel) return;
          (o.items || []).forEach(function (it) {
            const k = o.orderId + '|' + it.itemId;
            if (itVistos[k]) return;
            itVistos[k] = true;
            const q = parseInt(it.qty) || 1;
            const v = parseFloat(it.actualAmount) || 0;
            const c = parseFloat(it.itemTotalCommission) || 0;
            if (!porDia[dia]) {
              porDia[dia] = { pedidos: 0, itens: 0, valor: 0, comissao: 0, _o: {} };
            }
            const d = porDia[dia];
            if (!d._o[o.orderId]) {
              d._o[o.orderId] = true;
              d.pedidos++;
            }
            validos[o.orderId] = true;
            d.itens += q;
            d.valor = arred(d.valor + v);
            d.comissao = arred(d.comissao + c);
            itens += q;
            valor += v;
            comissao += c;
          });
        });
      });
      paginas++;
      if (!rep.pageInfo || !rep.pageInfo.hasNextPage) break;
      scroll = rep.pageInfo.scrollId;
    }

    Object.keys(porDia).forEach(function (k) {
      delete porDia[k]._o;
    });

    res.status(200).json({
      dias: dias,
      paginas: paginas,
      pedidos_unicos: totalPedidos,
      pedidos_validos: Object.keys(validos).length,
      itens: itens,
      valor_vendido: arred(valor),
      por_status: porStatus,
      comissao_estimada: arred(comissao),
      por_dia: porDia
    });
  } catch (e) {
    res.status(500).json({ erro: String(e) });
  }
};
