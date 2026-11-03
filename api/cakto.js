module.exports = async function handler(req, res) {
  try {
    const id = process.env.CAKTO_CLIENT_ID;
    const secret = process.env.CAKTO_CLIENT_SECRET;
    if (!id || !secret) {
      res.status(500).json({ ok: false, erro: 'Faltam as variaveis CAKTO_CLIENT_ID e CAKTO_CLIENT_SECRET' });
      return;
    }

    const t = await fetch('https://api.cakto.com.br/public_api/token/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ client_id: id, client_secret: secret }).toString()
    });
    const tj = await t.json().catch(function () { return {}; });
    if (!t.ok || !tj.access_token) {
      res.status(502).json({ ok: false, etapa: 'token', status: t.status, erro: tj.error || 'sem token' });
      return;
    }

    const o = await fetch('https://api.cakto.com.br/public_api/orders/?limit=1', {
      headers: { Authorization: 'Bearer ' + tj.access_token }
    });
    const oj = await o.json().catch(function () { return {}; });
    if (!o.ok) {
      res.status(502).json({ ok: false, etapa: 'pedidos', status: o.status, erro: oj.detail || 'erro' });
      return;
    }

    const primeiro = Array.isArray(oj.results) && oj.results[0] ? Object.keys(oj.results[0]) : [];
    res.status(200).json({ ok: true, totalPedidos: oj.count, camposDoPedido: primeiro });
  } catch (e) {
    res.status(500).json({ ok: false, erro: 'falha inesperada' });
  }
};
