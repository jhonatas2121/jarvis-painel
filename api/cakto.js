module.exports = async function handler(req, res) {
  try {
    if (req.method !== 'POST') {
      res.status(405).json({ ok: false, erro: 'use POST' });
      return;
    }

    const body = req.body || {};
    const pinCerto = process.env.JARVIS_PIN;
    if (pinCerto && String(body.pin || '') !== String(pinCerto)) {
      res.status(401).json({ ok: false, erro: 'PIN errado' });
      return;
    }

    const id = process.env.CAKTO_CLIENT_ID;
    const secret = process.env.CAKTO_CLIENT_SECRET;
    if (!id || !secret) {
      res.status(500).json({ ok: false, erro: 'Faltam as variaveis da Cakto' });
      return;
    }

    const t = await fetch('https://api.cakto.com.br/public_api/token/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ client_id: id, client_secret: secret }).toString()
    });
    const tj = await t.json().catch(function () { return {}; });
    if (!t.ok || !tj.access_token) {
      res.status(502).json({ ok: false, etapa: 'token', erro: tj.error || 'sem token' });
      return;
    }

    const o = await fetch('https://api.cakto.com.br/public_api/orders/?limit=100', {
      headers: { Authorization: 'Bearer ' + tj.access_token }
    });
    const oj = await o.json().catch(function () { return {}; });
    if (!o.ok) {
      res.status(502).json({ ok: false, etapa: 'pedidos', erro: oj.detail || 'erro' });
      return;
    }

    const lista = Array.isArray(oj.results) ? oj.results : [];
    let pagos = 0;
    let valorPagos = 0;
    lista.forEach(function (p) {
      if (String(p.status || '').toLowerCase() === 'paid') {
        pagos += 1;
        valorPagos += Number(p.amount) || 0;
      }
    });

    const ultimos = lista.slice(0, 3).map(function (p) {
      return {
        status: p.status || '',
        valor: Number(p.amount) || 0,
        produto: (p.product && p.product.name) || '',
        data: p.createdAt || p.created_at || ''
      };
    });

    res.status(200).json({
      ok: true,
      total: oj.count || 0,
      pagos: pagos,
      valorPagos: valorPagos,
      ultimos: ultimos
    });
  } catch (e) {
    res.status(500).json({ ok: false, erro: 'falha inesperada' });
  }
};
