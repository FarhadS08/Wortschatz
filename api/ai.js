// Vercel serverless proxy for the app's AI features (auto article / auto fill).
// Set ANTHROPIC_API_KEY in the Vercel project settings to enable it.
// Without a key the endpoint answers 501 and the app falls back to its
// built-in suffix rules.

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: { message: 'POST only' } });
    return;
  }
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) {
    res.status(501).json({ error: { message: 'ANTHROPIC_API_KEY is not configured' } });
    return;
  }
  const b = req.body || {};
  const body = {
    model: typeof b.model === 'string' ? b.model : 'claude-sonnet-5',
    max_tokens: Math.min(Number(b.max_tokens) || 1000, 2048),
    messages: Array.isArray(b.messages) ? b.messages : []
  };
  try {
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': key,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify(body)
    });
    const data = await r.json();
    res.status(r.status).json(data);
  } catch (e) {
    res.status(502).json({ error: { message: 'upstream error' } });
  }
};
