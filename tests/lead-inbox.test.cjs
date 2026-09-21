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
  assert.equal(context.classifyQueue_({ stage: 'Replied', response: 'Client replied' }), 'reply');
  assert.equal(context.classifyQueue_({ stage: 'Quote sent', response: 'Good response' }), 'quote');
  assert.equal(context.classifyQueue_({ stage: 'Contacted', followUpStatus: 'Overdue' }), 'followup');
  assert.equal(context.classifyQueue_({ stage: 'Won' }), 'booked');
  assert.equal(context.classifyQueue_({ stage: 'Lost' }), 'closed');
});

test('lead inbox exposes the requested queues and actions', () => {
  const html = read('integrations/lead-inbox/Index.html');
  for (const queue of ['New', 'Client replied', 'Follow-up', 'Responded', 'Good responses', 'Quote sent', 'Booked', 'Closed']) {
    assert.match(html, new RegExp(queue));
  }
  for (const action of ['Contacted', 'Good response', 'Quote sent', 'Booked', 'Set follow-up']) {
    assert.match(html, new RegExp(action));
  }
  assert.doesNotMatch(html, /innerHTML\s*=/);
  assert.match(html, /fetch\('\/api\/ops\/leads'/);
  assert.match(html, /fetch\('\/api\/ops\/update'/);
  assert.match(html, /noindex,nofollow,noarchive/);
  assert.match(html, /id="ownerFilter"/);
  assert.match(html, /type: 'assign'/);
  assert.match(html, /setInterval/);
  assert.doesNotMatch(html, /google\.script\.run/);
});

test('FormSubmit integration includes the protected lead API without changing the webhook route', () => {
  const code = read('integrations/formsubmit-webhook.gs');
  assert.match(code, /function doGet\(event\)/);
  assert.match(code, /opsTokenProperty: 'OPS_TOKEN'/);
  assert.match(code, /function updateLeadInboxRecord_/);
  assert.match(code, /function syncGmailLeadReplies/);
  assert.match(code, /function sendDailyLeadDigest/);
  assert.match(code, /everyMinutes\(5\)/);
  assert.match(code, /everyDays\(1\)\.atHour\(8\)/);
  assert.match(code, /GmailApp\.search/);
  assert.match(code, /MailApp\.sendEmail/);
  assert.match(code, /request\.token !== TRACKER\.webhookToken/);
  assert.doesNotMatch(code, /OPS_TOKEN:\s*['"][^'"]+/);
});

test('Apps Script requests least-privilege Gmail access', () => {
  const manifest = JSON.parse(read('integrations/appsscript.json'));
  assert.ok(manifest.oauthScopes.includes('https://www.googleapis.com/auth/gmail.readonly'));
  assert.ok(manifest.oauthScopes.includes('https://www.googleapis.com/auth/script.send_mail'));
  assert.ok(manifest.oauthScopes.includes('https://www.googleapis.com/auth/script.scriptapp'));
  assert.ok(!manifest.oauthScopes.includes('https://mail.google.com/'));
  assert.equal(manifest.webapp.executeAs, 'USER_DEPLOYING');
  assert.equal(manifest.webapp.access, 'ANYONE_ANONYMOUS');
});
