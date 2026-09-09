const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const read = file => fs.readFileSync(path.join(__dirname, '..', file), 'utf8');

function privacy({ stored = '', gpc = false, dnt = '', host = 'thegardencoffeecart.com' } = {}) {
  let ready, scripts = 0;
  const actions = {};
  const buttons = ['accepted', 'declined'].map(choice => ({ dataset: { choice }, addEventListener(_, fn) { actions[choice] = fn; } }));
  const panel = { hidden: false, setAttribute() {}, querySelectorAll() { return buttons; } };
  const context = { window: {}, location: { hostname: host, pathname: '/weddings/' }, navigator: { globalPrivacyControl: gpc, doNotTrack: dnt }, localStorage: { getItem: () => stored, setItem() {} }, document: { readyState: 'loading', cookie: '', head: { appendChild() { scripts++; } }, body: { appendChild() {} }, createElement: tag => tag === 'aside' ? panel : {}, querySelectorAll: () => [], addEventListener(_, fn) { ready = fn; } } };
  vm.runInNewContext(read('js/meta-pixel.js'), context);
  ready();
  return { context, actions, panel, scripts: () => scripts };
}

test('Meta SDK waits for opt-in and stops recording after opt-out', () => {
  const p = privacy();
  assert.equal(p.scripts(), 0);
  p.actions.accepted();
  assert.equal(p.scripts(), 1);
  assert.equal(p.context.window.gardenAdvertisingAllowed(), true);
  p.actions.declined();
  const count = p.context.window.fbq.queue.length;
  p.context.window.fbq('track', 'Lead');
  assert.equal(p.context.window.fbq.queue.length, count);
});
test('GPC, Do Not Track and localhost prevent advertising SDK load', () => {
  for (const options of [{ stored: 'accepted', gpc: true }, { stored: 'accepted', dnt: '1' }, { stored: 'accepted', host: '127.0.0.1' }]) {
    const p = privacy(options); p.actions.accepted(); assert.equal(p.scripts(), 0);
  }
});

async function submitResult({ success = true, httpOK = true, jsonFails = false, consent = false, host = 'thegardencoffeecart.com' } = {}) {
  const handlers = {}, requests = [], events = [];
  let shown = false, errors = 0, focused = false;
  const classes = { add() {}, remove() {} };
  const date = { required: true, disabled: false }, unknown = { checked: true, addEventListener(_, fn) { this.change = fn; } };
  const button = { classList: classes, parentNode: { insertBefore() { errors++; } } };
  const successEl = { classList: { add() { shown = true; } }, setAttribute() {}, focus() { focused = true; }, scrollIntoView() {}, querySelector() { return null; } };
  const form = { action: 'https://formsubmit.co/test@example.com', style: {}, dataset: {}, appendChild() {}, querySelectorAll() { return []; }, querySelector(s) { return ({ '[data-date-unconfirmed]': unknown, '#event-date': date, '#email': { value: 'test@example.com' }, '#event-type': { value: 'wedding' }, '.quote-form__submit': button })[s] || null; }, addEventListener(name, fn) { handlers[name] = fn; } };
  const context = { document: { getElementById: id => id === 'quoteForm' ? form : successEl, querySelectorAll: () => [], cookie: '', createElement: () => ({ style: {}, setAttribute() {}, remove() {} }) }, window: { location: { search: '', origin: 'https://example.com', pathname: '/weddings/', hostname: host }, gardenAdvertisingAllowed: () => consent, fbq(...args) { events.push(args); } }, FormData: class {}, URLSearchParams, setTimeout() {}, fetch: async (url, options) => { requests.push({ url, options }); return { ok: httpOK, json: async () => { if (jsonFails) throw Error('Not JSON'); return { success }; } }; } };
  vm.runInNewContext(read('js/form.js'), context);
  context.initForm();
  assert.equal(date.disabled, true); assert.equal(date.required, false);
  unknown.checked = false; unknown.change();
  assert.equal(date.disabled, false); assert.equal(date.required, true);
  handlers.submit({ preventDefault() {} });
  handlers.submit({ preventDefault() {} });
  await new Promise(setImmediate);
  return { requests, events, shown, focused, errors, button };
}
test('Accepted form shows booking step once; no CAPI without consent', async () => {
  const r = await submitResult();
  assert(r.shown && r.focused);
  assert.equal(r.requests.length, 1);
  assert.equal(r.requests[0].url, 'https://formsubmit.co/ajax/test@example.com');
  assert.equal(r.events.length, 0);
});
test('Local preview shows the calendar without sending a false inquiry', async () => {
  const r = await submitResult({ host: '127.0.0.1', consent: true });
  assert(r.shown && r.focused);
  assert.equal(r.requests.length, 0);
  assert.equal(r.events.length, 0);
});
test('Consented inquiry uses one matching browser/server event ID', async () => {
  const r = await submitResult({ consent: true });
  const lead = r.events.find(e => e[1] === 'Lead');
  const payload = JSON.parse(r.requests[1].options.body);
  assert.equal(payload.eventId, lead[3].eventID);
  assert.equal(payload.advertisingConsent, true);
});
test('HTTP errors, rejected forms and HTML responses never count as leads', async () => {
  for (const option of [{ httpOK: false }, { success: false }, { jsonFails: true }]) {
    const r = await submitResult({ ...option, consent: true });
    assert.equal(r.shown, false); assert.equal(r.errors, 1);
    assert.equal(r.button.disabled, false); assert.equal(r.events.length, 0);
  }
});

test('CAPI denies unconsented requests and hashes identifiers for consented requests', async () => {
  const mod = { exports: {} }, forwarded = [];
  vm.runInNewContext(read('netlify/functions/meta-lead.js'), { exports: mod.exports, require, process: { env: { META_CAPI_ACCESS_TOKEN: 'test-only-not-a-real-token' } }, URL, Set, console, fetch: async (url, options) => { forwarded.push(JSON.parse(options.body)); return { ok: true }; } });
  const handler = mod.exports.handler;
  const event = { httpMethod: 'POST', headers: { origin: 'https://thegardencoffeecart.com' }, body: JSON.stringify({ eventId: 'garden_lead_test', email: 'TEST@example.com' }) };
  assert.equal((await handler(event)).statusCode, 403); assert.equal(forwarded.length, 0);
  event.body = JSON.stringify({ eventId: 'garden_lead_test', email: 'TEST@example.com', advertisingConsent: true });
  assert.equal((await handler(event)).statusCode, 200);
  assert.match(forwarded[0].data[0].user_data.em[0], /^[a-f0-9]{64}$/);
  event.headers['sec-gpc'] = '1';
  assert.equal((await handler(event)).statusCode, 403); assert.equal(forwarded.length, 1);
});
