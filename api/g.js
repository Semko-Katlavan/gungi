// Лобби и партии через Upstash Redis (Vercel Marketplace -> Upstash Redis)
const U = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
const T = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;
const r = async (...c) => (await (await fetch(U, { method: 'POST', headers: { Authorization: 'Bearer ' + T }, body: JSON.stringify(c) })).json()).result;

module.exports = async (q, s) => {
  const b = q.body || {}, a = b.a, o = {};
  try {
    if (a === 'wait') await r('SET', 'w:' + b.id, String(b.name).slice(0, 20), 'EX', 12);
    else if (a === 'stop') await r('DEL', 'w:' + b.id);
    else if (a === 'list') {
      const k = await r('KEYS', 'w:*');
      const v = k.length ? await r('MGET', ...k) : [];
      o.l = k.map((x, i) => ({ id: x.slice(2), name: v[i] }));
    } else if (a === 'invite') {
      const nm = await r('GET', 'w:' + b.to);
      if (nm) {
        const g = Math.random().toString(36).slice(2, 9), st = b.state;
        st.p = { w: b.to, b: b.id }; st.n = { w: nm, b: String(b.name).slice(0, 20) };
        await r('SET', 'g:' + g, JSON.stringify(st), 'EX', 7200);
        await r('SET', 'm:' + b.to, g, 'EX', 60);
        await r('DEL', 'w:' + b.to);
        o.g = g;
      }
    } else if (a === 'poll') o.g = await r('GET', 'm:' + b.id);
    else if (a === 'get') { const x = await r('GET', 'g:' + b.g); o.s = x && JSON.parse(x); }
    else if (a === 'move') {
      const x = JSON.parse(await r('GET', 'g:' + b.g));
      const c = x.p.w === b.id ? 'w' : x.p.b === b.id ? 'b' : 0;
      if (c && x.turn === c) { await r('SET', 'g:' + b.g, JSON.stringify(b.state), 'EX', 7200); o.ok = 1; }
    }
  } catch (e) { o.err = String(e); }
  s.json(o);
};
