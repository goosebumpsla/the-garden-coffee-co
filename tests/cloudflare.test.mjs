import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { metaLead, opsApi, default as worker } from '../cloudflare/worker.mjs';
const payload = { advertisingConsent: true, eventId: 'garden_lead_test_123', email: ' TEST@example.com ', phone: '(818) 555-0100', eventSourceUrl: 'https://thegardencoffeecart.com/weddings/?private=omit' };
const env = { META_CAPI_ACCESS_TOKEN: 'dummy-test-only' };
const req = (body = payload, headers = {}) => new Request('https://thegardencoffeecart.com/.netlify/functions/meta-lead', { method: 'POST', headers: { Origin: 'https://thegardencoffeecart.com', 'Content-Type': 'application/json', ...headers }, body: JSON.stringify(body) });
test('Cloudflare CAPI preserves deduplication, hashes PII and omits query data', async () => {
  let sent;
  const result = await metaLead(req(), env, async (url, options) => { sent = { url, options, payload: JSON.parse(options.body) }; return new Response('{}'); });
  assert.equal(result.status, 200);
  assert.equal(sent.payload.data[0].event_id, payload.eventId);
  assert.match(sent.payload.data[0].user_data.em[0], /^[a-f0-9]{64}$/);
  assert.equal(sent.payload.data[0].event_source_url, 'https://thegardencoffeecart.com/weddings/');
  assert(!sent.url.includes('dummy-test-only'));
  assert(!sent.options.body.includes('test@example.com'));
});
test('Cloudflare rejects unconsented, invalid, oversized and unconfigured requests', async () => {
  const forbiddenSend = () => { throw Error('Must not contact Meta'); };
  for (const [request, config, expected] of [
    [req({ ...payload, advertisingConsent: false }), env, 403],
    [req(payload, { 'Sec-GPC': '1' }), env, 403],
    [req(payload, { DNT: '1' }), env, 403],
    [req(payload, { Origin: 'https://evil.example' }), env, 403],
    [req(null), env, 400],
    [req({ ...payload, eventId: 'bad' }), env, 400],
    [req({ ...payload, extra: 'a'.repeat(9000) }), env, 413],
    [req(), {}, 503],
  ]) assert.equal((await metaLead(request, config, forbiddenSend)).status, expected);
});
test('Cloudflare keeps static requests separate and API responses private', async () => {
  const result = await worker.fetch(new Request('https://example.com/weddings/'), { ASSETS: { fetch: () => new Response('page') } });
  assert.equal(await result.text(), 'page');
  assert.equal(result.headers.get('X-Robots-Tag'), null);
  const preview = await worker.fetch(new Request('https://garden-preview.workers.dev/weddings/'), { ASSETS: { fetch: () => new Response('page') } });
  assert.equal(preview.headers.get('X-Robots-Tag'), 'noindex, nofollow');
  const redirect = await worker.fetch(new Request('https://www.thegardencoffeecart.com/blog/?source=test'), {});
  assert.equal(redirect.status, 301);
  assert.equal(redirect.headers.get('Location'), 'https://thegardencoffeecart.com/blog/?source=test');
  const failure = await metaLead(req(), env, async () => new Response('error', { status: 400 }));
  assert.equal(failure.status, 502);
  assert.equal(failure.headers.get('Cache-Control'), 'no-store');
  assert.equal((await worker.fetch(new Request('https://example.com/api/missing'), {})).status, 404);
});
const auth = password => `Basic ${Buffer.from(`garden:${password}`).toString('base64')}`;
const opsEnv = {
  OPS_PASSWORD: 'test-secret',
  LEAD_OPS_ENDPOINT: 'https://script.google.com/macros/s/test-deployment/exec',
  LEAD_OPS_TOKEN: 'server-only-token',
  ASSETS: { fetch: () => new Response('<h1>Lead inbox</h1>', { headers: { 'Content-Type': 'text/html' } }) },
};
test('Cloudflare provides a normal sign-in screen and protects the lead inbox', async () => {
  for (const request of [new Request('https://thegardencoffeecart.com/ops/'), new Request('https://thegardencoffeecart.com/ops/', { headers: { Authorization: auth('wrong') } })]) {
    const response = await worker.fetch(request, opsEnv);
    assert.equal(response.status, 302);
    assert.equal(response.headers.get('Location'), 'https://thegardencoffeecart.com/ops/login');
  }
  const apiDenied = await worker.fetch(new Request('https://thegardencoffeecart.com/api/ops/leads'), opsEnv);
  assert.equal(apiDenied.status, 401);
  assert.equal((await apiDenied.json()).error, 'Sign in required');

  const loginPage = await worker.fetch(new Request('https://thegardencoffeecart.com/ops/login'), opsEnv);
  assert.equal(loginPage.status, 200);
  assert.match(await loginPage.text(), /Team password/);
  const wrongLogin = await worker.fetch(new Request('https://thegardencoffeecart.com/ops/login', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: 'password=wrong' }), opsEnv);
  assert.equal(wrongLogin.status, 401);

  const login = await worker.fetch(new Request('https://thegardencoffeecart.com/ops/login', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: 'password=test-secret' }), opsEnv);
  assert.equal(login.status, 303);
  assert.equal(login.headers.get('Location'), '/ops/');
  assert.match(login.headers.get('Set-Cookie'), /Secure; HttpOnly; SameSite=Strict/);
  const cookie = login.headers.get('Set-Cookie').split(';')[0];
  const cookieAllowed = await worker.fetch(new Request('https://thegardencoffeecart.com/ops/', { headers: { Cookie: cookie } }), opsEnv);
  assert.equal(cookieAllowed.status, 200);

  const allowed = await worker.fetch(new Request('https://thegardencoffeecart.com/ops/', { headers: { Authorization: auth('test-secret') } }), opsEnv);
  assert.equal(allowed.status, 200);
  assert.equal(allowed.headers.get('X-Robots-Tag'), 'noindex, nofollow');
  assert.equal(allowed.headers.get('Cache-Control'), 'no-store');
});
test('Cloudflare proxies only validated lead operations and keeps the backend token private', async () => {
  let sent;
  const getResponse = await opsApi(new Request('https://thegardencoffeecart.com/api/ops/leads'), opsEnv, async (url, options) => {
    sent = { url, options };
    return Response.json({ ok: true, leads: [] });
  });
  assert.equal(getResponse.status, 200);
  assert.equal(new URL(sent.url).searchParams.get('ops_token'), 'server-only-token');
  assert.equal(new URL(sent.url).searchParams.get('action'), 'leads');
  assert(!JSON.stringify(await getResponse.json()).includes('server-only-token'));

  const redirectCalls = [];
  const redirectedResponse = await opsApi(new Request('https://thegardencoffeecart.com/api/ops/leads'), opsEnv, async (url, options) => {
    redirectCalls.push({ url, options });
    if (redirectCalls.length === 1) return new Response(null, { status: 302, headers: { Location: 'https://script.googleusercontent.com/macros/echo?user_content_key=test' } });
    return Response.json({ ok: true, leads: [] });
  });
  assert.equal(redirectedResponse.status, 200);
  assert.equal(redirectCalls.length, 2);
  assert.equal(redirectCalls[0].options.redirect, 'manual');
  assert.equal(redirectCalls[1].options.redirect, 'manual');
  assert.equal(new URL(redirectCalls[1].url).hostname, 'script.googleusercontent.com');

  const rejectedRedirect = await opsApi(new Request('https://thegardencoffeecart.com/api/ops/leads'), opsEnv, async () => new Response(null, { status: 302, headers: { Location: 'https://example.com/not-google' } }));
  assert.equal(rejectedRedirect.status, 502);

  const update = new Request('https://thegardencoffeecart.com/api/ops/update', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ leadId: 'GCC-0048', action: { type: 'follow-up', date: '2026-09-23', ignored: 'value' }, ignored: 'value' }),
  });
  const updateResponse = await opsApi(update, opsEnv, async (url, options) => {
    sent = { url, options, body: JSON.parse(options.body) };
    return Response.json({ ok: true, leads: [] });
  });
  assert.equal(updateResponse.status, 200);
  assert.deepEqual(sent.body, { leadId: 'GCC-0048', action: { type: 'follow-up', date: '2026-09-23' } });
  assert.equal(new URL(sent.url).searchParams.get('action'), 'update');

  for (const body of [
    { leadId: 'bad', action: { type: 'contacted' } },
    { leadId: 'GCC-0048', action: { type: 'delete' } },
    { leadId: 'GCC-0048', action: { type: 'follow-up', date: 'tomorrow' } },
    { leadId: 'GCC-0048', action: { type: 'assign', owner: 'Someone else' } },
  ]) {
    const response = await opsApi(new Request('https://thegardencoffeecart.com/api/ops/update', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }), opsEnv, () => { throw Error('Must not call backend'); });
    assert.equal(response.status, 400);
  }

  const assign = new Request('https://thegardencoffeecart.com/api/ops/update', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ leadId: 'GCC-0048', action: { type: 'assign', owner: 'Taylor' } }),
  });
  const assignResponse = await opsApi(assign, opsEnv, async (url, options) => {
    sent = { url, body: JSON.parse(options.body) };
    return Response.json({ ok: true, leads: [] });
  });
  assert.equal(assignResponse.status, 200);
  assert.deepEqual(sent.body, { leadId: 'GCC-0048', action: { type: 'assign', owner: 'Taylor' } });
});
test('Cloudflare serves static assets without Worker calls and protects the pinned preview', () => {
  const config = JSON.parse(readFileSync(new URL('../wrangler.jsonc', import.meta.url), 'utf8'));
  assert.deepEqual(config.assets.run_worker_first, ['/.netlify/functions/*', '/api/*', '/ops', '/ops/*']);
  assert.equal(config.preview_urls, false);
  assert.equal(config.account_id, 'fa8f38e8680cea78962368c580c63f6c');
  const headers = readFileSync(new URL('../cloudflare/_headers', import.meta.url), 'utf8');
  assert.match(headers, /https:\/\/the-garden-coffee-co\.contact-thegardenco\.workers\.dev\/\*\s+X-Robots-Tag: noindex, nofollow/);
});
