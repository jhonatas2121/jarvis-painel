module.exports = async (req, res) => {
  if (req.method !== "POST") return res.status(405).json({ error: "Metodo nao permitido." });
  const body = req.body ? req.body : {};
  const pin = process.env.JARVIS_PIN;
  if (pin && body.pin !== pin) return res.status(401).json({ error: "PIN incorreto." });
  const q = String(body.q ? body.q : "").slice(0, 1000);
  if (!q) return res.status(400).json({ error: "Pergunta vazia." });

  const m1 = process.env.GEMINI_MODEL ? process.env.GEMINI_MODEL : "gemini-3.1-flash-lite";
  const m2 = process.env.GEMINI_FALLBACK_MODEL ? process.env.GEMINI_FALLBACK_MODEL : "gemini-3-flash-preview";
  const models = [m1, m2];

  const t = q.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  const keywords = ["hoje", "agora", "atual", "ultima", "ultimo", "noticia", "cotacao", "preco", "clima", "previsao", "placar", "resultado", "lancamento", "tendencia", "2026"];
  const wantsSearch = body.search === true ? true : keywords.some((k) => t.includes(k));
  let useSearch = process.env.GEMINI_SEARCH !== "off" && wantsSearch;

  const buildPayload = () => {
    const p = {
      systemInstruction: { parts: [{ text: "Voce e o JARVIS, assistente do painel de um usuario brasileiro que trabalha com afiliados da Shopee. Responda em portugues do Brasil, com acentos corretos, de forma direta e elegante, em no maximo 8 frases. Use a busca na web quando a pergunta depender de informacao atual." }] },
      contents: [{ role: "user", parts: [{ text: q }] }]
    };
    if (useSearch) p.tools = [{ google_search: {} }];
    return JSON.stringify(p);
  };

  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  let lastError = "Erro da API.";

  for (const model of models) {
    for (let attempt = 0; attempt < 2; attempt++) {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 8000);
      try {
        const r = await fetch("https://generativelanguage.googleapis.com/v1beta/models/" + model + ":generateContent", {
          method: "POST",
          headers: { "content-type": "application/json", "x-goog-api-key": process.env.GEMINI_API_KEY },
          body: buildPayload(),
          signal: ctrl.signal
        });
        const d = await r.json();
        clearTimeout(timer);
        if (r.ok) {
          const c = d.candidates && d.candidates[0];
          const parts = c && c.content && c.content.parts ? c.content.parts : [];
          const text = parts.map((p) => (p.text ? p.text : "")).join("");
          return res.status(200).json({ text: text ? text : "Sem resposta." });
        }
        lastError = d.error && d.error.message ? d.error.message : "Erro da API.";
        if ([500, 503].includes(r.status)) { await wait(600); continue; }
        if (useSearch && [400, 403, 429].includes(r.status)) { useSearch = false; continue; }
        break;
      } catch (e) {
        clearTimeout(timer);
        lastError = "Falha ou demora ao consultar a API.";
        break;
      }
    }
  }
  return res.status(502).json({ error: lastError });
};
