module.exports = async (req, res) => {
  if (req.method !== "POST") return res.status(405).json({ error: "Metodo nao permitido." });
  const body = req.body ? req.body : {};
  const pin = process.env.JARVIS_PIN;
  if (pin && body.pin !== pin) return res.status(401).json({ error: "PIN incorreto." });
  const audio = String(body.audio ? body.audio : "");
  if (!audio) return res.status(400).json({ error: "Audio vazio." });
  const mime = String(body.mime ? body.mime : "audio/webm").split(";")[0];
  const m1 = process.env.GEMINI_MODEL ? process.env.GEMINI_MODEL : "gemini-3.1-flash-lite";
  const m2 = process.env.GEMINI_FALLBACK_MODEL ? process.env.GEMINI_FALLBACK_MODEL : "gemini-3-flash-preview";

  const build = (fast) => {
    const p = {
      contents: [{ role: "user", parts: [
        { text: "Transcreva este audio em portugues do Brasil. Responda somente com o texto falado, sem comentarios. Se nao houver fala clara, responda apenas um ponto." },
        { inline_data: { mime_type: mime, data: audio } }
      ] }],
      generationConfig: { maxOutputTokens: 80 }
    };
    if (fast) p.generationConfig.thinkingConfig = { thinkingLevel: "minimal" };
    return JSON.stringify(p);
  };

  let lastError = "Erro da API.";
  for (const model of [m1, m2]) {
    for (const fast of [true, false]) {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 7000);
      try {
        const r = await fetch("https://generativelanguage.googleapis.com/v1beta/models/" + model + ":generateContent", {
          method: "POST",
          headers: { "content-type": "application/json", "x-goog-api-key": process.env.GEMINI_API_KEY },
          body: build(fast),
          signal: ctrl.signal
        });
        const d = await r.json();
        clearTimeout(timer);
        if (r.ok) {
          const c = d.candidates && d.candidates[0];
          const parts = c && c.content && c.content.parts ? c.content.parts : [];
          const text = parts.map((p) => (p.text ? p.text : "")).join("").trim();
          return res.status(200).json({ text: text });
        }
        lastError = d.error && d.error.message ? d.error.message : "Erro da API.";
        if (r.status === 400 && fast) continue;
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
