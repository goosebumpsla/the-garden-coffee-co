const HOSTS = new Set(['thegardencoffeecart.com', 'www.thegardencoffeecart.com']);
const API_PATHS = new Set(['/api/meta-lead', '/.netlify/functions/meta-lead']);
const OPS_API_PATHS = new Set(['/api/ops/leads', '/api/ops/update']);
const OPS_ACTIONS = new Set(['contacted', 'good-response', 'quote-sent', 'booked', 'closed', 'follow-up']);
const json = (status, body) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' } });
const hash = async value => Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value))), byte => byte.toString(16).padStart(2, '0')).join('');
const preventPreviewIndexing = response => {
  const headers = new Headers(response.headers);
  headers.set('X-Robots-Tag', 'noindex, nofollow');
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
};
const protectOpsResponse = response => {
  const headers = new Headers(response.headers);
  headers.set('Cache-Control', 'no-store');
  headers.set('X-Robots-Tag', 'noindex, nofollow');
  headers.set('Referrer-Policy', 'no-referrer');
  headers.set('X-Content-Type-Options', 'nosniff');
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
};
const opsLoginPage = error => new Response(`<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow,noarchive"><title>Garden &amp; Coffee Ops</title>
<style>:root{font-family:Inter,ui-sans-serif,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;color:#16201f;background:#f3f1e9}*{box-sizing:border-box}body{margin:0;min-height:100vh;display:grid;place-items:center;padding:20px}.card{width:min(420px,100%);background:#fffdf7;border:1px solid #dfe5e1;border-radius:24px;padding:34px;box-shadow:0 24px 70px rgba(31,53,48,.13)}.mark{width:54px;height:54px;display:grid;place-items:center;border-radius:16px;background:#173f3a;color:#f7f0df;font-weight:900;letter-spacing:-.06em}h1{font:600 2rem Georgia,"Times New Roman",serif;margin:22px 0 8px}p{color:#65716e;margin:0 0 24px;line-height:1.5}label{display:block;font-weight:800;font-size:.88rem;margin-bottom:8px}input{width:100%;min-height:50px;border:1px solid #cdd7d2;border-radius:13px;padding:0 14px;font:inherit;background:white}input:focus{outline:3px solid rgba(217,130,88,.35);border-color:#d98258}button{width:100%;min-height:50px;margin-top:14px;border:0;border-radius:13px;background:#173f3a;color:white;font:inherit;font-weight:850;cursor:pointer}.error{color:#a93128;background:#fae6e3;border-radius:11px;padding:10px 12px;margin-bottom:16px;font-size:.88rem}</style></head>
<body><main class="card"><div class="mark">G&amp;C</div><h1>Lead inbox</h1><p>Sign in to manage Garden &amp; Coffee inquiries.</p>${error ? '<div class="error" role="alert">That password was not correct. Please try again.</div>' : ''}<form method="post" action="/ops/login"><label for="password">Team password</label><input id="password" name="password" type="password" autocomplete="current-password" required autofocus><button type="submit">Open lead inbox</button></form></main></body></html>`, {
  status: error ? 401 : 200,
  headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex, nofollow', 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'no-referrer' },
});

async function sessionSignature(secret, expires) {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const signature = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(expires));
  return Array.from(new Uint8Array(signature), byte => byte.toString(16).padStart(2, '0')).join('');
}

async function validOpsCookie(request, env) {
  const match = String(request.headers.get('Cookie') || '').match(/(?:^|;\s*)garden_ops=([^;]+)/);
  if (!match || !env.OPS_PASSWORD) return false;
  const [expires, supplied] = decodeURIComponent(match[1]).split('.');
  if (!/^\d{10,}$/.test(expires || '') || Number(expires) < Date.now()) return false;
  const expected = await sessionSignature(String(env.OPS_PASSWORD), expires);
  return supplied === expected;
}

async function opsLogin(request, env) {
  if (request.method === 'GET') {
    if (await validOpsCookie(request, env)) return Response.redirect('https://thegardencoffeecart.com/ops/', 302);
    return opsLoginPage(false);
  }
  if (request.method !== 'POST') return json(405, { error: 'Method not allowed' });
  if (!request.headers.get('Content-Type')?.includes('application/x-www-form-urlencoded') || Number(request.headers.get('Content-Length')) > 1024) return opsLoginPage(true);
  const form = await request.formData();
  const supplied = String(form.get('password') || '');
  if (!env.OPS_PASSWORD || await hash(supplied) !== await hash(String(env.OPS_PASSWORD))) return opsLoginPage(true);
  const expires = String(Date.now() + 12 * 60 * 60 * 1000);
  const token = `${expires}.${await sessionSignature(String(env.OPS_PASSWORD), expires)}`;
  return new Response(null, {
    status: 303,
    headers: {
      Location: '/ops/',
      'Set-Cookie': `garden_ops=${encodeURIComponent(token)}; Max-Age=43200; Path=/; Secure; HttpOnly; SameSite=Strict`,
      'Cache-Control': 'no-store',
      'X-Robots-Tag': 'noindex, nofollow',
    },
  });
}

export async function opsAuthorized(request, env) {
  if (await validOpsCookie(request, env)) return true;
  if (!env.OPS_PASSWORD) return false;
  const match = String(request.headers.get('Authorization') || '').match(/^Basic\s+(.+)$/i);
  if (!match) return false;
  let decoded;
  try { decoded = atob(match[1]); } catch (_) { return false; }
  const separator = decoded.indexOf(':');
  if (separator < 0) return false;
  const username = decoded.slice(0, separator);
  const password = decoded.slice(separator + 1);
  const [suppliedUser, expectedUser, suppliedPassword, expectedPassword] = await Promise.all([
    hash(username), hash('garden'), hash(password), hash(String(env.OPS_PASSWORD)),
  ]);
  return suppliedUser === expectedUser && suppliedPassword === expectedPassword;
}

async function boundedJson(request, maximum) {
  if (!request.headers.get('Content-Type')?.includes('application/json')) throw new Error('JSON required');
  if (Number(request.headers.get('Content-Length')) > maximum) throw new Error('Request too large');
  const reader = request.body?.getReader();
  if (!reader) throw new Error('Invalid request');
  const chunks = []; let size = 0;
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > maximum) { await reader.cancel(); throw new Error('Request too large'); }
    chunks.push(value);
  }
  const bytes = new Uint8Array(size); let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
  const value = JSON.parse(new TextDecoder().decode(bytes));
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Invalid request');
  return value;
}

export async function opsApi(request, env, send = fetch) {
  const url = new URL(request.url);
  if (!OPS_API_PATHS.has(url.pathname)) return json(404, { error: 'Not found' });
  if (!env.LEAD_OPS_ENDPOINT || !env.LEAD_OPS_TOKEN) return json(503, { error: 'Lead inbox is not configured' });

  let endpoint;
  try {
    endpoint = new URL(env.LEAD_OPS_ENDPOINT);
    if (endpoint.protocol !== 'https:' || endpoint.hostname !== 'script.google.com' || !endpoint.pathname.startsWith('/macros/s/')) throw new Error();
  } catch (_) { return json(503, { error: 'Lead inbox is not configured' }); }

  let body;
  if (url.pathname === '/api/ops/leads') {
    if (request.method !== 'GET') return json(405, { error: 'Method not allowed' });
    endpoint.searchParams.set('action', 'leads');
  } else {
    if (request.method !== 'POST') return json(405, { error: 'Method not allowed' });
    try { body = await boundedJson(request, 4096); } catch (error) {
      const message = error && error.message;
      return json(message === 'Request too large' ? 413 : message === 'JSON required' ? 415 : 400, { error: message || 'Invalid request' });
    }
    if (!/^GCC-\d{4,}$/.test(String(body.leadId || '')) || !body.action || typeof body.action !== 'object' || Array.isArray(body.action)) return json(400, { error: 'Invalid update' });
    const type = String(body.action.type || '');
    if (!OPS_ACTIONS.has(type)) return json(400, { error: 'Invalid update' });
    if (type === 'follow-up' && !/^\d{4}-\d{2}-\d{2}$/.test(String(body.action.date || ''))) return json(400, { error: 'Invalid follow-up date' });
    body = { leadId: String(body.leadId), action: type === 'follow-up' ? { type, date: String(body.action.date) } : { type } };
    endpoint.searchParams.set('action', 'update');
  }
  endpoint.searchParams.set('ops_token', String(env.LEAD_OPS_TOKEN));

  try {
    const upstream = await send(endpoint.toString(), {
      method: body ? 'POST' : 'GET',
      headers: body ? { 'Content-Type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined,
      redirect: 'follow',
      signal: AbortSignal.timeout(25000),
    });
    if (!upstream.ok) return json(502, { error: 'Lead tracker request failed' });
    const data = await upstream.json();
    if (!data || typeof data !== 'object') throw new Error();
    if (data.ok === false) return json(400, { error: String(data.error || 'Unable to update lead') });
    return json(200, data);
  } catch (_) { return json(502, { error: 'Lead tracker request failed' }); }
}

export async function metaLead(request, env, send = fetch) {
  if (request.method !== 'POST') return json(405, { error: 'Method not allowed' });
  try {
    const origin = new URL(request.headers.get('Origin'));
    if (origin.protocol !== 'https:' || !HOSTS.has(origin.hostname)) throw Error();
  } catch (_) { return json(403, { error: 'Invalid origin' }); }
  if (!request.headers.get('Content-Type')?.includes('application/json')) return json(415, { error: 'JSON required' });
  if (Number(request.headers.get('Content-Length')) > 8192) return json(413, { error: 'Request too large' });
  // Bound the stream as well: Content-Length can be absent or incorrect.
  const reader = request.body?.getReader();
  if (!reader) return json(400, { error: 'Invalid request' });
  const chunks = []; let size = 0;
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > 8192) { await reader.cancel(); return json(413, { error: 'Request too large' }); }
    chunks.push(value);
  }
  let input;
  try {
    const bytes = new Uint8Array(size); let offset = 0;
    for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
    input = JSON.parse(new TextDecoder().decode(bytes));
    if (!input || typeof input !== 'object' || Array.isArray(input)) throw Error();
  } catch (_) { return json(400, { error: 'Invalid request' }); }
  if (input.advertisingConsent !== true || request.headers.get('Sec-GPC') === '1' || request.headers.get('DNT') === '1') return json(403, { error: 'Advertising consent required' });
  const eventId = String(input.eventId || '');
  if (!/^garden_lead_[a-zA-Z0-9_-]{1,88}$/.test(eventId)) return json(400, { error: 'Invalid event' });
  if (!env.META_CAPI_ACCESS_TOKEN) return json(503, { error: 'Tracking is not configured' });
  const email = String(input.email || '').trim().toLowerCase();
  const digits = String(input.phone || '').replace(/\D/g, '');
  const phone = digits.length === 10 ? '1' + digits : digits;
  const userData = {};
  if (email) userData.em = [await hash(email)];
  if (phone) userData.ph = [await hash(phone)];
  const ip = request.headers.get('CF-Connecting-IP');
  if (ip) userData.client_ip_address = ip;
  const agent = request.headers.get('User-Agent');
  if (agent) userData.client_user_agent = agent;
  for (const key of ['fbp', 'fbc']) if (input[key]) userData[key] = String(input[key]).trim().slice(0, 255);
  let source = 'https://thegardencoffeecart.com/';
  try {
    const url = new URL(input.eventSourceUrl);
    if (url.protocol === 'https:' && HOSTS.has(url.hostname)) source = url.origin + url.pathname;
  } catch (_) {}
  const payload = { data: [{ event_name: 'Lead', event_time: Math.floor(Date.now() / 1000), event_id: eventId, event_source_url: source, action_source: 'website', user_data: userData, custom_data: { content_name: 'Event Quote Request', content_category: String(input.eventType || 'other').slice(0, 80) } }] };
  if (env.META_CAPI_TEST_EVENT_CODE) payload.test_event_code = env.META_CAPI_TEST_EVENT_CODE;
  try {
    const result = await send(`https://graph.facebook.com/${env.META_GRAPH_API_VERSION || 'v26.0'}/${env.META_PIXEL_ID || '1075812884821288'}/events`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${env.META_CAPI_ACCESS_TOKEN}` }, body: JSON.stringify(payload), signal: AbortSignal.timeout(8000) });
    if (!result.ok) return json(502, { error: 'Tracking request failed' });
    return json(200, { ok: true });
  } catch (_) { return json(502, { error: 'Tracking request failed' }); }
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.hostname === 'www.thegardencoffeecart.com') {
      return Response.redirect(`https://thegardencoffeecart.com${url.pathname}${url.search}`, 301);
    }
    if (url.pathname === '/ops/login') return opsLogin(request, env);
    const opsPage = url.pathname === '/ops' || url.pathname.startsWith('/ops/');
    const opsApiPath = url.pathname.startsWith('/api/ops/');
    if ((opsPage || opsApiPath) && !await opsAuthorized(request, env)) {
      if (opsApiPath) return protectOpsResponse(json(401, { error: 'Sign in required' }));
      return Response.redirect(`https://thegardencoffeecart.com/ops/login`, 302);
    }

    let response;
    if (OPS_API_PATHS.has(url.pathname)) response = await opsApi(request, env);
    else if (API_PATHS.has(url.pathname)) response = await metaLead(request, env);
    else if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/.netlify/')) response = json(404, { error: 'Not found' });
    else response = await env.ASSETS.fetch(request);
    if (url.pathname === '/ops' || url.pathname.startsWith('/ops/') || url.pathname.startsWith('/api/ops/')) response = protectOpsResponse(response);
    return url.hostname.endsWith('.workers.dev') ? preventPreviewIndexing(response) : response;
  }
};
