// Vercel serverless function: accounts + deck sync.
// Storage: Upstash Redis via its REST API. Add the "Upstash for Redis"
// integration to the Vercel project (Storage tab) and the env vars are
// injected automatically. Without configuration the endpoint answers 501
// and the app keeps working locally without sync.
//
// Every stored deck has a revision number (key v:<user>). A push must name
// the revision it was based on; if another device pushed in between, the
// server answers 409 with its current deck so the client can merge and retry.

const crypto = require('crypto');

const RURL = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const RTOK = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;

// in-memory fallback used only for local testing (SYNC_TEST_MEMORY=1)
const mem = global.__memkv || (global.__memkv = new Map());
const memExp = global.__memexp || (global.__memexp = new Map());

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
  if (memExp.has(key) && memExp.get(key) <= Date.now()) { mem.delete(key); memExp.delete(key); }
  if (op === 'GET') return mem.has(key) ? mem.get(key) : null;
  if (op === 'SET') {
    if (cmd.includes('NX') && mem.has(key)) return null;
    mem.set(key, cmd[2]);
    const ex = cmd.indexOf('EX');
    if (ex > 0) memExp.set(key, Date.now() + Number(cmd[ex + 1]) * 1000); else memExp.delete(key);
    return 'OK';
  }
  if (op === 'DEL') { memExp.delete(key); return mem.delete(key) ? 1 : 0; }
  if (op === 'EXPIRE') { if (!mem.has(key)) return 0; memExp.set(key, Date.now() + Number(cmd[2]) * 1000); return 1; }
  if (op === 'INCR') { const n = (Number(mem.get(key)) || 0) + 1; mem.set(key, String(n)); return n; }
  throw new Error('unsupported ' + op);
}

const CAS_LUA = "local cur=tonumber(redis.call('GET',KEYS[2]) or '0') " +
  "if cur~=tonumber(ARGV[2]) then return {0,cur} end " +
  "redis.call('SET',KEYS[1],ARGV[1]) return {1,redis.call('INCR',KEYS[2])}";
// store the deck only if the stored revision is still `base`
async function casDeck(user, str, base) {
  if (RURL && RTOK) {
    try {
      const r = await kv(['EVAL', CAS_LUA, '2', 'd:' + user, 'v:' + user, str, String(base)]);
      if (Array.isArray(r)) return { ok: Number(r[0]) === 1, rev: Number(r[1]) };
    } catch (e) { /* scripting unavailable: fall back to the non-atomic check below */ }
  }
  const cur = Number(await kv(['GET', 'v:' + user])) || 0;
  if (cur !== base) return { ok: false, rev: cur };
  await kv(['SET', 'd:' + user, str]);
  return { ok: true, rev: Number(await kv(['INCR', 'v:' + user])) };
}

const TOKEN_TTL = 7776000; // 90 days
function cookieToken(req) {
  const c = req.headers && req.headers.cookie;
  if (!c) return '';
  const m = /(?:^|;\s*)ws_token=([0-9a-f]{48})(?:;|$)/.exec(c);
  return m ? m[1] : '';
}
function setTokenCookie(req, res, token, clear) {
  const secure = (req.headers && req.headers['x-forwarded-proto'] === 'https') ? '; Secure' : '';
  res.setHeader('Set-Cookie', 'ws_token=' + (clear ? '' : token) +
    '; Max-Age=' + (clear ? 0 : TOKEN_TTL) + '; Path=/; HttpOnly; SameSite=Lax' + secure);
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
// fixed-window counter: true once `key` was hit more than `max` times in `ttl` seconds
async function bump(key, ttl) {
  const n = await kv(['INCR', key]);
  if (n === 1) await kv(['EXPIRE', key, ttl]);
  return n;
}

const ok = (res, o) => res.status(200).json(o);
const err = (res, code, msg) => res.status(code).json({ error: msg });
const hashPass = (pass, salt) => crypto.scryptSync(pass, salt, 32).toString('hex');
const DUMMY_SALT = crypto.randomBytes(16).toString('hex');
const DUMMY_HASH = hashPass('not-a-password', DUMMY_SALT);

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return err(res, 405, 'post-only');
  if (String((req.headers && req.headers['content-type']) || '').indexOf('application/json') !== 0) return err(res, 415, 'json-only');
  if (badOrigin(req)) return err(res, 403, 'bad-origin');
  if (!(RURL && RTOK) && !process.env.SYNC_TEST_MEMORY) return err(res, 501, 'not-configured');
  const b = req.body || {};
  const action = String(b.action || '');
  try {
    if (action === 'register' || action === 'login') {
      const user = String(b.user || '').trim().toLowerCase();
      const pass = String(b.pass || '');
      if (!/^[\w.@+-]{3,64}$/.test(user)) return err(res, 400, 'bad-user');
      if (pass.length < 6 || pass.length > 200) return err(res, 400, 'bad-pass');
      const ip = clientIp(req);
      if (action === 'register') {
        if (await bump('rl:reg:' + ip, 3600) > 10) return err(res, 429, 'rate-limited');
        const salt = crypto.randomBytes(16).toString('hex');
        const rec = JSON.stringify({ salt, hash: hashPass(pass, salt), created: Date.now() });
        const set = await kv(['SET', 'u:' + user, rec, 'NX']);
        if (set !== 'OK') return err(res, 409, 'user-exists');
      } else {
        if (await bump('rl:ip:' + ip, 900) > 40) return err(res, 429, 'rate-limited');
        if ((Number(await kv(['GET', 'rl:u:' + user])) || 0) >= 10) return err(res, 429, 'rate-limited');
        const raw = await kv(['GET', 'u:' + user]);
        const rec = raw ? JSON.parse(raw) : { salt: DUMMY_SALT, hash: DUMMY_HASH };
        const h = Buffer.from(hashPass(pass, rec.salt), 'hex');
        if (!crypto.timingSafeEqual(h, Buffer.from(rec.hash, 'hex')) || !raw) {
          await bump('rl:u:' + user, 900);
          return err(res, 401, 'bad-credentials');
        }
      }
      const token = crypto.randomBytes(24).toString('hex');
      await kv(['SET', 't:' + token, user, 'EX', TOKEN_TTL]);
      setTokenCookie(req, res, token);
      return ok(res, { user });
    }

    const token = cookieToken(req) || String(b.token || '');
    if (!/^[0-9a-f]{48}$/.test(token)) return err(res, 401, 'unauthorized');
    const user = await kv(['GET', 't:' + token]);
    if (!user) return err(res, 401, 'unauthorized');

    if (action === 'logout') {
      await kv(['DEL', 't:' + token]);
      setTokenCookie(req, res, '', true);
      return ok(res, { ok: true });
    }
    if (action === 'me') {
      await kv(['EXPIRE', 't:' + token, TOKEN_TTL]);
      setTokenCookie(req, res, token);
      return ok(res, { user });
    }
    if (action === 'pull') {
      await kv(['EXPIRE', 't:' + token, TOKEN_TTL]);
      setTokenCookie(req, res, token);
      const raw = await kv(['GET', 'd:' + user]);
      const rev = Number(await kv(['GET', 'v:' + user])) || 0;
      return ok(res, { deck: raw ? JSON.parse(raw) : null, rev });
    }
    if (action === 'push') {
      if (!b.deck || typeof b.deck !== 'object' || !Array.isArray(b.deck.words)) return err(res, 400, 'bad-deck');
      const str = JSON.stringify(b.deck);
      if (str.length > 900000) return err(res, 413, 'too-large');
      if (typeof b.base === 'number') {
        const r = await casDeck(user, str, b.base);
        if (!r.ok) {
          const raw = await kv(['GET', 'd:' + user]);
          return res.status(409).json({ error: 'conflict', deck: raw ? JSON.parse(raw) : null, rev: r.rev });
        }
        return ok(res, { ok: true, rev: r.rev });
      }
      // older app versions send no base: never let them replace a newer deck
      const raw = await kv(['GET', 'd:' + user]);
      if (raw && (JSON.parse(raw).updatedAt || 0) > (b.deck.updatedAt || 0)) return err(res, 409, 'conflict');
      await kv(['SET', 'd:' + user, str]);
      return ok(res, { ok: true, rev: Number(await kv(['INCR', 'v:' + user])) });
    }
    return err(res, 400, 'bad-action');
  } catch (e) {
    return err(res, 502, 'storage-error');
  }
};
