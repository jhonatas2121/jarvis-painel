module.exports = async (req, res) => {
  if (req.method !== "POST") return res.status(405).json({ error: "Metodo nao permitido." });
  const body = req.body ? req.body : {};
  const pin = process.env.JARVIS_PIN;
  if (pin && body.pin !== pin) return res.status(401).json({ error: "PIN incorreto." });

  const key = process.env.ELEVENLABS_API_KEY;
  const voice = process.env.ELEVENLABS_VOICE_ID;
  if (!key) return res.status(500).json({ error: "Chave de voz nao configurada." });
  if (!voice) return res.status(500).json({ error: "ID da voz nao configurado." });

  const text = String(body.text ? body.text : "")
    .replace(/https?:\/\/\S+/g, " link ")
    .replace(/[*#`_>~]/g, "")
    .slice(0, 450);
  if (!text.trim()) return res.status(400).json({ error: "Texto vazio." });

  const model = process.env.ELEVENLABS_MODEL ? process.env.ELEVENLABS_MODEL : "eleven_flash_v2_5";
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 15000);
  try {
    const r = await fetch("https://api.elevenlabs.io/v1/text-to-speech/" + encodeURIComponent(voice), {
      method: "POST",
      headers: { "xi-api-key": key, "Content-Type": "application/json", "Accept": "audio/mpeg" },
      body: JSON.stringify({ text: text, model_id: model }),
      signal: ctrl.signal
    });
    clearTimeout(timer);
    if (!r.ok) {
      let msg = "Erro da voz (" + r.status + ").";
      try {
        const d = await r.json();
        if (d.detail && d.detail.message) msg = d.detail.message;
      } catch (e) {}
      return res.status(502).json({ error: msg });
    }
    const buf = Buffer.from(await r.arrayBuffer());
    res.setHeader("Content-Type", "audio/mpeg");
    return res.status(200).send(buf);
  } catch (e) {
    clearTimeout(timer);
    return res.status(502).json({ error: "Falha ao gerar a voz." });
  }
};
