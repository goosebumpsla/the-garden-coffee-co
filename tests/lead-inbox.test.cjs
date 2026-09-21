const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const read = file => fs.readFileSync(path.join(__dirname, '..', file), 'utf8');

test('lead inbox uses exclusive operational queues', () => {
  const context = {};
  vm.runInNewContext(read('integrations/formsubmit-webhook.gs'), context);
  assert.equal(context.classifyQueue_({ stage: 'New' }), 'new');
  assert.equal(context.classifyQueue_({ stage: 'Contacted', lastContact: 'today' }), 'responded');
  assert.equal(context.classifyQueue_({ stage: 'Replied', response: 'Good response' }), 'good');
  assert.equal(context.classifyQueue_({ stage: 'Quote sent', response: 'Good response' }), 'quote');
  assert.equal(context.classifyQueue_({ stage: 'Contacted', followUpStatus: 'Overdue' }), 'followup');
  assert.equal(context.classifyQueue_({ stage: 'Won' }), 'booked');
  assert.equal(context.classifyQueue_({ stage: 'Lost' }), 'closed');
});

test('lead inbox exposes the requested queues and actions', () => {
  const html = read('integrations/lead-inbox/Index.html');
  for (const queue of ['New', 'Follow-up', 'Responded', 'Good responses', 'Quote sent', 'Booked', 'Closed']) {
    assert.match(html, new RegExp(queue));
  }
  for (const action of ['Contacted', 'Good response', 'Quote sent', 'Booked', 'Set follow-up']) {
    assert.match(html, new RegExp(action));
  }
  assert.doesNotMatch(html, /innerHTML\s*=/);
  assert.match(html, /fetch\('\/api\/ops\/leads'/);
  assert.match(html, /fetch\('\/api\/ops\/update'/);
  assert.match(html, /noindex,nofollow,noarchive/);
  assert.doesNotMatch(html, /google\.script\.run/);
});

test('FormSubmit integration includes the protected lead API without changing the webhook route', () => {
  const code = read('integrations/formsubmit-webhook.gs');
  assert.match(code, /function doGet\(event\)/);
  assert.match(code, /opsTokenProperty: 'OPS_TOKEN'/);
  assert.match(code, /function updateLeadInboxRecord_/);
  assert.match(code, /request\.token !== TRACKER\.webhookToken/);
  assert.doesNotMatch(code, /OPS_TOKEN:\s*['"][^'"]+/);
});
