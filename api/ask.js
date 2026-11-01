module.exports = async (req, res) => {
  if (req.method !== "POST") return res.status(405).json({ error: "Método não permitido." });
  const body = req.body || {};
  const pin = process.env.JARVIS_PIN;
  if (pin && body.pin !== pin) return res.status(401).json({ error: "PIN incorreto." });
  const q = String(body.q || "").slice(0, 1000);
  if (!q) return res.status(400).json({ error: "Pergunta vazia." });
  const model = process.env.GEMINI_MODEL || "gemini-2.5-flash";
  try {
    const r = await fetch("https://generativelanguage.googleapis.com/v1beta/models/" + model + ":generateContent", {
      method: "POST",
      headers: { "content-type": "application/json", "x-goog-api-key": process.env.GEMINI_API_KEY },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: "Você é o JARVIS, assistente do painel de um usuário brasileiro que trabalha com afiliados da Shopee. Responda em português, de forma direta e elegante, em no máximo 8 frases. Use a busca na web quando a pergunta depender de informação atual." }] },
        contents: [{ role: "user", parts: [{ text: q }] }],
        ...(process.env.GEMINI_SEARCH === "off" ? {} : { tools: [{ google_search: {} }] })
      })
    });
    const d = await r.json();
    if (!r.ok) return res.status(502).json({ error: (d.error && d.error.message) || "Erro da API." });
    const parts = (d.candidates && d.candidates[0] && d.candidates[0].content && d.candidates[0].content.parts) || [];
    const text = parts.map(p => p.text || "").join("");
    return res.status(200).json({ text: text || "Sem resposta." });
  } catch (e) {
    return res.status(500).json({ error: "Falha ao consultar a API." });
  }
};
