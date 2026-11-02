module.exports = async (req, res) => {
  const body = req.method === "POST" ? (req.body ? req.body : {}) : (req.query ? req.query : {});
  const pin = process.env.JARVIS_PIN;
  if (pin && body.pin !== pin) return res.status(401).json({ error: "PIN incorreto." });
  const key = process.env.YOUTUBE_API_KEY;
  if (!key) return res.status(500).json({ error: "Falta a chave YOUTUBE_API_KEY na Vercel." });
  const q = String(body.q ? body.q : "").slice(0, 150).trim();
  if (!q) return res.status(400).json({ error: "Busca vazia." });

  const url =
    "https://www.googleapis.com/youtube/v3/search" +
    "?part=snippet&type=video&maxResults=6&videoEmbeddable=true&videoSyndicated=true&safeSearch=moderate" +
    "&regionCode=BR&relevanceLanguage=pt" +
    "&q=" + encodeURIComponent(q) +
    "&key=" + encodeURIComponent(key);

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 8000);
  try {
    const r = await fetch(url, { signal: ctrl.signal });
    const d = await r.json();
    clearTimeout(timer);
    if (!r.ok) {
      const msg = d.error && d.error.message ? d.error.message : "Erro da API do YouTube.";
      return res.status(502).json({ error: msg });
    }
    const items = (d.items || [])
      .filter((i) => i.id && i.id.videoId)
      .map((i) => ({
        id: i.id.videoId,
        title: i.snippet && i.snippet.title ? i.snippet.title : "",
        channel: i.snippet && i.snippet.channelTitle ? i.snippet.channelTitle : ""
      }));
    return res.status(200).json({ items: items });
  } catch (e) {
    clearTimeout(timer);
    return res.status(502).json({ error: "Falha ou demora ao consultar o YouTube." });
  }
};
