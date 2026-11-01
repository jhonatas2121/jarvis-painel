module.exports = async (req, res) => {
  if (req.method !== "POST") return res.status(405).json({ error: "Método não permitido." });
  const body = req.body || {};
  const pin = process.env.JARVIS_PIN;
  if (pin && body.pin !== pin) return res.status(401).json({ error: "PIN incorreto." });
  const q = String(body.q || "").slice(0, 1000);
  if (!q) return res.status(400).json({ error: "Pergunta vazia." });

  const models = [
    process.env.GEMINI_MODEL || "gemini-3.1-flash-lite",
    process.env.GEMINI_FALLBACK_MODEL || "gemini-3-flash-preview"
  ];
  const t = q.toLowerCase();
  const keywords = ["hoje", "agora", "atual", "última", "ultima", "último", "ultimo", "notícia", "noticia", "cotação", "cotacao", "preço", "preco", "clima", "previsão", "previsao", "placar", "resultado", "lançamento", "lancamento", "tendência", "tendencia", "2026"];
  let useSearch = process.env.GEMINI_SEARCH !== "off" && (body.search === true || keywords.some((k) => t.includes(k)));

  const buildPayload = () => JSON.stringify({
    systemInstruction: { parts: [{ text: "Você é o JARVIS, assistente do painel de um usuário brasileiro que trabalha com afiliados da Shopee. Responda em português, de forma direta e elegante, em no máximo 8 frases. Use a busca na web quando a pergunta depender de informação atual." }] },
    contents: [{ role: "user", parts: [{ text: q }] }],
    ...(useSearch ? { tools: [{ google_search: {} }] } : {})
  });
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  let lastError = "Erro da API.";

  for (const model of models) {
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const r = await fetch("https://generativelanguage.googleapis.com/v1beta/models/" + model + ":generateContent", {
          method: "POST",
          headers: { "content-type": "application/json", "x-goog-api-key": process.env.GEMINI_API_KEY },
          body: buildPayload()
        });
        const d = await r.json();
        if (r.ok) {
          const parts = (d.candidates && d.candidates[0] && d.candidates[0].content && d.candidates[0].content.parts) || [];
          const text = parts.map((p) => p.text || "").join("");
          return res.status(200).json({ text: text || "Sem resposta." });
        }
        lastError = (d.error && d.error.message) || "Erro da API.";
        if (r.status === 503 || r.status === 500) { await wait(600); continue; }
        if (useSearch && (r.status === 429  r.status === 400  r.status === 403)) { useSearch = false; continue; }
        break;
      } catch (e) {
        lastError = "Falha ao consultar a API.";
        await wait(600);
      }
    }
  }
  return res.status(502).json({ error: lastError });
};
