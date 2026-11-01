module.exports = async (req, res) => {
  if (req.method !== "POST") return res.status(405).json({ error: "Método não permitido." });
  const body = req.body || {};
  const pin = process.env.JARVIS_PIN;
  if (pin && body.pin !== pin) return res.status(401).json({ error: "PIN incorreto." });
  const q = String(body.q || "").slice(0, 1000);
  if (!q) return res.status(400).json({ error: "Pergunta vazia." });
  try {
    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify({
        model: "claude-sonnet-5-5",
        max_tokens: 1024,
        system: "Você é o JARVIS, assistente do painel de um usuário brasileiro que trabalha com afiliados da Shopee. Responda em português, de forma direta e elegante, em no máximo 8 frases. Use a busca na web quando a pergunta depender de informação atual.",
        tools: [{ type: "web_search_20250305", name: "web_search", max_uses: 3 }],
        messages: [{ role: "user", content: q }]
      })
    });
    const d = await r.json();
    if (!r.ok) return res.status(502).json({ error: (d.error && d.error.message) || "Erro da API." });
    const text = (d.content || []).filter(b => b.type === "text").map(b => b.text).join("");
    return res.status(200).json({ text: text || "Sem resposta." });
  } catch (e) {
    return res.status(500).json({ error: "Falha ao consultar a API." });
  }
};
