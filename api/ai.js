// Vercel serverless proxy for the app's AI features (auto article, auto fill,
// translating word meanings). Set ANTHROPIC_API_KEY in the Vercel project
// settings to enable it. Without a key the endpoint answers 501 and the app
// falls back to its built-in suffix rules.
//
// The endpoint only runs the app's own three tasks with prompts built here,
// so it cannot be used as a general-purpose proxy for the API key.

const MODEL = 'claude-sonnet-5';
const LANG_PROMPT = { tr: 'Turkish', az: 'Azerbaijani (Azərbaycan dili)', ru: 'Russian', es: 'Spanish', fr: 'French', it: 'Italian', pt: 'Portuguese', pl: 'Polish', uk: 'Ukrainian', nl: 'Dutch', el: 'Greek', cs: 'Czech', ro: 'Romanian', hu: 'Hungarian', sv: 'Swedish' };

const RURL = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const RTOK = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;

const str = (v, max) => (typeof v === 'string' && v.length <= max ? v : null);

function buildRequest(b) {
  const p = (b && typeof b.params === 'object' && b.params) || {};
  if (b.task === 'article') {
    const word = str(p.word, 80);
    if (!word || !word.trim()) return null;
    return {
      max_tokens: 1000,
      prompt: 'Welcher Artikel gehört zum deutschen Wort "' + word + '"? Antworte mit genau einem Wort: der, die, das oder kein (falls es kein Nomen ist).'
    };
  }
  if (b.task === 'fill') {
    const word = str(p.word, 80), givenTrans = str(p.trans || '', 200), givenEx = str(p.ex || '', 300);
    if (!word || !word.trim() || givenTrans === null || givenEx === null) return null;
    const lang = typeof p.lang === 'string' ? p.lang : 'en';
    const tgt = (lang === 'de' || lang === 'en') ? 'English' : LANG_PROMPT[lang];
    if (!tgt) return null;
    return {
      max_tokens: 1000,
      prompt: 'Du hilfst einem Deutschlerner (Niveau A2). Wort: "' + word + '".' + (givenTrans ? ' Die Übersetzung ist: "' + givenTrans + '".' : '') + (givenEx ? ' Der Beispielsatz ist: "' + givenEx + '" — übernimm ihn unverändert als "beispiel" und übersetze genau diesen Satz.' : '') + ' Antworte NUR mit einem JSON-Objekt ohne Markdown, ohne Erklärung: {"wort":"das Wort in korrekter deutscher Schreibweise, ohne Artikel","artikel":"der|die|das|kein","uebersetzung":"kurze Übersetzung auf ' + tgt + '","beispiel":"ein einfacher deutscher Beispielsatz (A2-Niveau)","beispiel_uebersetzung":"Übersetzung des Beispielsatzes auf ' + tgt + '","notiz":"sehr kurzer Grammatik-Hinweis auf Deutsch (z.B. Gegenteil, Kasus, trennbar, Plural) oder leerer String"}'
    };
  }
  if (b.task === 'translate') {
    const target = LANG_PROMPT[p.lang];
    if (!target || !Array.isArray(p.items) || !p.items.length || p.items.length > 30) return null;
    const items = [];
    for (const it of p.items) {
      const id = str(it && it.id, 40), de = str(it && it.de, 120), en = str(it && it.en, 200), ex = str((it && it.ex) || '', 300);
      if (!id || !de || en === null || ex === null) return null;
      items.push({ id, de, en, ex });
    }
    return {
      max_tokens: 4000,
      prompt: 'Du übersetzt Vokabeln für einen Deutschlerner. Zielsprache: ' + target + '. Für jedes Objekt: übersetze die Bedeutung des deutschen Worts "de" (die englische Übersetzung "en" zeigt die gemeinte Bedeutung) und, falls "ex" nicht leer ist, den Beispielsatz. Antworte NUR mit einem JSON-Array in gleicher Reihenfolge, ohne Markdown: [{"id":"...","t":"Übersetzung des Wortes","x":"Übersetzung des Beispielsatzes oder leerer String"}] Vokabeln: ' + JSON.stringify(items)
    };
  }
  return null;
}

async function kv(cmd) {
  const r = await fetch(RURL, {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + RTOK, 'content-type': 'application/json' },
    body: JSON.stringify(cmd)
  });
  if (!r.ok) throw new Error('kv ' + r.status);
  return (await r.json()).result;
}
// fixed-window counter; storage problems never block the feature
async function overLimit(key, max, ttl) {
  if (!(RURL && RTOK)) return false;
  try {
    const n = await kv(['INCR', key]);
    if (n === 1) await kv(['EXPIRE', key, ttl]);
    return n > max;
  } catch (e) { return false; }
}
function clientIp(req) {
  const xf = String((req.headers && req.headers['x-forwarded-for']) || '');
  return xf.split(',')[0].trim() || (req.socket && req.socket.remoteAddress) || 'unknown';
}
function badOrigin(req) {
  const o = req.headers && req.headers.origin;
  if (!o) return false;
  const host = req.headers['x-forwarded-host'] || req.headers.host;
  try { return new URL(o).host !== host; } catch (e) { return true; }
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: { message: 'POST only' } });
    return;
  }
  if (String((req.headers && req.headers['content-type']) || '').indexOf('application/json') !== 0) {
    res.status(415).json({ error: { message: 'JSON only' } });
    return;
  }
  if (badOrigin(req)) {
    res.status(403).json({ error: { message: 'forbidden' } });
    return;
  }
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) {
    res.status(501).json({ error: { message: 'ANTHROPIC_API_KEY is not configured' } });
    return;
  }
  const spec = buildRequest(req.body || {});
  if (!spec) {
    res.status(400).json({ error: { message: 'bad request' } });
    return;
  }
  const day = new Date().toISOString().slice(0, 10);
  if (await overLimit('rl:ai:' + clientIp(req), 150, 600) || await overLimit('rl:ai:day:' + day, 4000, 90000)) {
    res.status(429).json({ error: { message: 'rate limited' } });
    return;
  }
  try {
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': key,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({ model: MODEL, max_tokens: spec.max_tokens, messages: [{ role: 'user', content: spec.prompt }] })
    });
    const data = await r.json();
    res.status(r.status).json(data);
  } catch (e) {
    res.status(502).json({ error: { message: 'upstream error' } });
  }
};

module.exports.buildRequest = buildRequest;
