import { test } from 'node:test';
import assert from 'node:assert/strict';
import { metaLead, default as worker } from '../cloudflare/worker.mjs';
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
  const failure = await metaLead(req(), env, async () => new Response('error', { status: 400 }));
  assert.equal(failure.status, 502);
  assert.equal(failure.headers.get('Cache-Control'), 'no-store');
  assert.equal((await worker.fetch(new Request('https://example.com/api/missing'), {})).status, 404);
});
