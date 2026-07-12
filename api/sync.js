// Vercel serverless function: accounts + deck sync.
// Storage: Upstash Redis via its REST API. Add the "Upstash for Redis"
// integration to the Vercel project (Storage tab) and the env vars are
// injected automatically. Without configuration the endpoint answers 501
// and the app keeps working locally without sync.

const crypto = require('crypto');

const RURL = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const RTOK = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;

// in-memory fallback used only for local testing (SYNC_TEST_MEMORY=1)
const mem = global.__memkv || (global.__memkv = new Map());

async function kv(cmd) {
  if (RURL && RTOK) {
    const r = await fetch(RURL, {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + RTOK, 'content-type': 'application/json' },
      body: JSON.stringify(cmd)
    });
    if (!r.ok) throw new Error('kv ' + r.status);
    return (await r.json()).result;
  }
  const op = cmd[0], key = cmd[1];
  if (op === 'GET') return mem.has(key) ? mem.get(key) : null;
  if (op === 'SET') {
    if (cmd.includes('NX') && mem.has(key)) return null;
    mem.set(key, cmd[2]);
    return 'OK';
  }
  if (op === 'DEL') return mem.delete(key) ? 1 : 0;
  throw new Error('unsupported ' + op);
}

const ok = (res, o) => res.status(200).json(o);
const err = (res, code, msg) => res.status(code).json({ error: msg });
const hashPass = (pass, salt) => crypto.scryptSync(pass, salt, 32).toString('hex');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return err(res, 405, 'post-only');
  if (!(RURL && RTOK) && !process.env.SYNC_TEST_MEMORY) return err(res, 501, 'not-configured');
  const b = req.body || {};
  const action = String(b.action || '');
  try {
    if (action === 'register' || action === 'login') {
      const user = String(b.user || '').trim().toLowerCase();
      const pass = String(b.pass || '');
      if (!/^[\w.@+-]{3,64}$/.test(user)) return err(res, 400, 'bad-user');
      if (pass.length < 6 || pass.length > 200) return err(res, 400, 'bad-pass');
      if (action === 'register') {
        const salt = crypto.randomBytes(16).toString('hex');
        const rec = JSON.stringify({ salt, hash: hashPass(pass, salt), created: Date.now() });
        const set = await kv(['SET', 'u:' + user, rec, 'NX']);
        if (set !== 'OK') return err(res, 409, 'user-exists');
      } else {
        const raw = await kv(['GET', 'u:' + user]);
        if (!raw) return err(res, 401, 'bad-credentials');
        const rec = JSON.parse(raw);
        const h = Buffer.from(hashPass(pass, rec.salt), 'hex');
        if (!crypto.timingSafeEqual(h, Buffer.from(rec.hash, 'hex'))) return err(res, 401, 'bad-credentials');
      }
      const token = crypto.randomBytes(24).toString('hex');
      await kv(['SET', 't:' + token, user, 'EX', 7776000]); // 90 days
      return ok(res, { token, user });
    }

    const token = String(b.token || '');
    if (!/^[0-9a-f]{48}$/.test(token)) return err(res, 401, 'unauthorized');
    const user = await kv(['GET', 't:' + token]);
    if (!user) return err(res, 401, 'unauthorized');

    if (action === 'logout') {
      await kv(['DEL', 't:' + token]);
      return ok(res, { ok: true });
    }
    if (action === 'pull') {
      const raw = await kv(['GET', 'd:' + user]);
      return ok(res, { deck: raw ? JSON.parse(raw) : null });
    }
    if (action === 'push') {
      if (!b.deck || typeof b.deck !== 'object' || !Array.isArray(b.deck.words)) return err(res, 400, 'bad-deck');
      const str = JSON.stringify(b.deck);
      if (str.length > 900000) return err(res, 413, 'too-large');
      await kv(['SET', 'd:' + user, str]);
      return ok(res, { ok: true });
    }
    return err(res, 400, 'bad-action');
  } catch (e) {
    return err(res, 502, 'storage-error');
  }
};
