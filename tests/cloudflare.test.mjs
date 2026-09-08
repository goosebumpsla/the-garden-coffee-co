import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
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
test('Cloudflare serves static assets without Worker calls and protects the pinned preview', () => {
  const config = JSON.parse(readFileSync(new URL('../wrangler.jsonc', import.meta.url), 'utf8'));
  assert.deepEqual(config.assets.run_worker_first, ['/.netlify/functions/*', '/api/*']);
  assert.equal(config.preview_urls, false);
  assert.equal(config.account_id, 'fa8f38e8680cea78962368c580c63f6c');
  const headers = readFileSync(new URL('../cloudflare/_headers', import.meta.url), 'utf8');
  assert.match(headers, /https:\/\/the-garden-coffee-co\.contact-thegardenco\.workers\.dev\/\*\s+X-Robots-Tag: noindex, nofollow/);
});
