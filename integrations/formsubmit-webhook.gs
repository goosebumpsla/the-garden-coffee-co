/**
 * FormSubmit webhook for the Garden & Coffee lead tracker.
 *
 * Deploy this as an Apps Script web app that executes as the deploying user
 * and accepts requests from anyone. FormSubmit posts accepted submissions to
 * the deployment URL with `?token=...` appended.
 */

const TRACKER = Object.freeze({
  spreadsheetId: '1FIb5MSTfrimaMyeuBZD2CHnCUE7jhBIvygtsDbxX9C0',
  sheetName: 'Lead Tracker',
  firstDataRow: 9,
  lastTemplateRow: 208,
  webhookToken: '063dbdb533aaff7b85fa79e87fb6a7fd91022466205d5ce0',
  opsTokenProperty: 'OPS_TOKEN',
  notificationEmail: 'contact.thegardenco@gmail.com',
  opsUrl: 'https://thegardencoffeecart.com/ops/',
  gmailLookbackDays: 30,
});

function doGet(event) {
  if (!isOpsAuthorized_(event) || String(event && event.parameter && event.parameter.action || '') !== 'leads') {
    return jsonResponse_({ ok: false, error: 'Unauthorized' });
  }

  try {
    return jsonResponse_(getLeadInboxData_());
  } catch (error) {
    console.error(error && error.stack ? error.stack : error);
    return jsonResponse_({ ok: false, error: 'Unable to load leads' });
  }
}

function doPost(event) {
  if (String(event && event.parameter && event.parameter.action || '') === 'update') {
    return handleOpsUpdate_(event);
  }

  const lock = LockService.getScriptLock();
  lock.waitLock(10000);

  try {
    const request = parseRequest_(event);
    if (request.token !== TRACKER.webhookToken) {
      console.warn('Lead webhook rejected: invalid token');
      return jsonResponse_({ ok: false, error: 'Invalid token' });
    }

    const formData = request.formData;
    if (!formData || typeof formData !== 'object' || Array.isArray(formData)) {
      console.warn('Lead webhook rejected: unsupported payload shape');
      return jsonResponse_({ ok: false, error: 'Invalid FormSubmit payload' });
    }

    const receivedAt = new Date();
    const lead = normalizeLead_(formData, receivedAt);
    if (!lead.name || !lead.email || !isEmail_(lead.email)) {
      console.warn('Lead webhook rejected: missing name or valid email');
      return jsonResponse_({ ok: false, error: 'Name and valid email are required' });
    }

    const properties = PropertiesService.getScriptProperties();
    const fingerprint = submissionFingerprint_(lead, receivedAt);
    if (properties.getProperty(fingerprint)) {
      return jsonResponse_({ ok: true, duplicate: true });
    }

    const spreadsheet = SpreadsheetApp.openById(TRACKER.spreadsheetId);
    const sheet = spreadsheet.getSheetByName(TRACKER.sheetName);
    if (!sheet) throw new Error('Lead Tracker sheet not found');

    const row = findAvailableRow_(sheet);
    if (!row) throw new Error('Lead tracker is full; extend the template rows');
    const leadNumber = reserveLeadNumber_(sheet);

    sheet.getRange(row, 1, 1, 16).setValues([[
      receivedAt,
      lead.name,
      lead.email,
      lead.phone,
      lead.eventType,
      lead.eventDate,
      lead.guests,
      lead.location,
      lead.source,
      '',
      'New',
      '',
      '',
      '',
      'Contact lead',
      lead.notes,
    ]]);
    // Q:R contain Sheet formulas. Attribution fields live in S:Z so the
    // operational workflow and its formulas remain untouched.
    sheet.getRange(row, 19, 1, 8).setValues([[
      leadNumber,
      lead.formSource,
      lead.channel,
      lead.campaign,
      lead.adSet,
      lead.adCreative,
      lead.landingPage,
      lead.campaignId,
    ]]);

    SpreadsheetApp.flush();
    properties.setProperty(fingerprint, String(receivedAt.getTime()));
    cleanupFingerprints_(properties, receivedAt);
    return jsonResponse_({ ok: true, row: row });
  } catch (error) {
    console.error(error && error.stack ? error.stack : error);
    return jsonResponse_({ ok: false, error: 'Unable to record lead' });
  } finally {
    lock.releaseLock();
  }
}

function handleOpsUpdate_(event) {
  if (!isOpsAuthorized_(event)) return jsonResponse_({ ok: false, error: 'Unauthorized' });

  let body;
  try {
    body = JSON.parse(String(event && event.postData && event.postData.contents || ''));
  } catch (error) {
    return jsonResponse_({ ok: false, error: 'Invalid update' });
  }

  try {
    return jsonResponse_(updateLeadInboxRecord_(body && body.leadId, body && body.action));
  } catch (error) {
    console.error(error && error.stack ? error.stack : error);
    return jsonResponse_({ ok: false, error: error && error.message ? error.message : 'Unable to update lead' });
  }
}

function isOpsAuthorized_(event) {
  const expected = PropertiesService.getScriptProperties().getProperty(TRACKER.opsTokenProperty);
  const supplied = String(event && event.parameter && event.parameter.ops_token || '');
  return Boolean(expected) && supplied === expected;
}

function getLeadInboxData_() {
  const spreadsheet = SpreadsheetApp.openById(TRACKER.spreadsheetId);
  const sheet = spreadsheet.getSheetByName(TRACKER.sheetName);
  if (!sheet) throw new Error('Lead Tracker sheet not found');

  const height = TRACKER.lastTemplateRow - TRACKER.firstDataRow + 1;
  const range = sheet.getRange(TRACKER.firstDataRow, 1, height, 26);
  const values = range.getValues();
  const display = range.getDisplayValues();
  const timezone = spreadsheet.getSpreadsheetTimeZone();
  const leads = [];

  values.forEach(function(row, index) {
    if (!String(row[1] || '').trim()) return;
    const shown = display[index];
    const lead = {
      received: shown[0] || '',
      receivedSort: row[0] instanceof Date ? row[0].getTime() : 0,
      name: shown[1] || '',
      email: shown[2] || '',
      phone: shown[3] || '',
      eventType: shown[4] || '',
      eventDate: shown[5] || '',
      guests: shown[6] || '',
      location: shown[7] || '',
      source: shown[8] || '',
      owner: shown[9] || '',
      stage: shown[10] || 'New',
      response: shown[11] || '',
      lastContact: shown[12] || '',
      nextFollowUp: shown[13] || '',
      nextFollowUpISO: toIsoDate_(row[13], timezone),
      nextAction: shown[14] || '',
      notes: shown[15] || '',
      daysSinceLead: shown[16] || '',
      followUpStatus: shown[17] || '',
      id: shown[18] || '',
      formSource: shown[19] || '',
      channel: shown[20] || '',
      campaign: shown[21] || '',
      adSet: shown[22] || '',
      creative: shown[23] || '',
      landingPage: shown[24] || '',
      campaignId: shown[25] || '',
    };
    lead.queue = classifyQueue_(lead);
    leads.push(lead);
  });

  leads.sort(function(a, b) { return b.receivedSort - a.receivedSort; });
  return {
    ok: true,
    leads: leads,
    refreshedAt: Utilities.formatDate(new Date(), timezone, 'MMM d, h:mm a'),
  };
}

function updateLeadInboxRecord_(leadId, action) {
  if (!/^GCC-\d{4,}$/.test(String(leadId || ''))) throw new Error('Invalid lead number');
  if (!action || typeof action !== 'object' || Array.isArray(action)) throw new Error('Invalid update');

  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const spreadsheet = SpreadsheetApp.openById(TRACKER.spreadsheetId);
    const sheet = spreadsheet.getSheetByName(TRACKER.sheetName);
    if (!sheet) throw new Error('Lead Tracker sheet not found');

    const height = TRACKER.lastTemplateRow - TRACKER.firstDataRow + 1;
    const ids = sheet.getRange(TRACKER.firstDataRow, 19, height, 1).getDisplayValues();
    const offset = ids.findIndex(function(row) { return row[0] === leadId; });
    if (offset < 0) throw new Error('Lead not found');

    const workflowRange = sheet.getRange(TRACKER.firstDataRow + offset, 10, 1, 6);
    const workflow = workflowRange.getValues()[0];
    const now = new Date();
    const type = String(action.type || '');
    const owner = ownerFromAction_(action, String(workflow[0] || ''));

    if (type === 'contacted') {
      workflow[0] = owner || 'DS';
      workflow[1] = 'Contacted';
      workflow[2] = '';
      workflow[3] = now;
      workflow[4] = addDays_(now, 1);
      workflow[5] = 'Follow up';
    } else if (type === 'good-response') {
      workflow[0] = owner || 'DS';
      workflow[1] = 'Replied';
      workflow[2] = 'Good response';
      workflow[3] = now;
      workflow[4] = addDays_(now, 1);
      workflow[5] = 'Follow up';
    } else if (type === 'quote-sent') {
      workflow[0] = owner || 'DS';
      workflow[1] = 'Quote sent';
      workflow[3] = now;
      workflow[4] = addDays_(now, 2);
      workflow[5] = 'Follow up';
    } else if (type === 'booked') {
      workflow[0] = owner || 'DS';
      workflow[1] = 'Won';
      workflow[3] = now;
      workflow[4] = '';
      workflow[5] = '';
    } else if (type === 'closed') {
      workflow[0] = owner || 'DS';
      workflow[1] = 'Lost';
      workflow[3] = now;
      workflow[4] = '';
      workflow[5] = '';
    } else if (type === 'follow-up') {
      workflow[0] = owner || 'DS';
      workflow[4] = parseIsoDate_(action.date);
      workflow[5] = 'Follow up';
    } else if (type === 'assign') {
      workflow[0] = owner;
    } else {
      throw new Error('Unsupported update');
    }

    workflowRange.setValues([workflow]);
    SpreadsheetApp.flush();
    return getLeadInboxData_();
  } finally {
    lock.releaseLock();
  }
}

function classifyQueue_(lead) {
  const stage = String(lead.stage || '').toLowerCase();
  const response = String(lead.response || '').toLowerCase();
  const follow = String(lead.followUpStatus || '').toLowerCase();

  if (stage === 'lost' || stage === 'not a fit') return 'closed';
  if (stage === 'won' || stage === 'consultation booked') return 'booked';
  if (stage === 'quote sent') return 'quote';
  if (response === 'good response') return 'good';
  if (response === 'client replied' || stage === 'replied') return 'reply';
  if (follow === 'overdue' || follow === 'due today') return 'followup';
  if (stage === 'contacted' || lead.lastContact) return 'responded';
  return 'new';
}

function ownerFromAction_(action, currentOwner) {
  if (!Object.prototype.hasOwnProperty.call(action, 'owner')) return currentOwner;
  const owner = String(action.owner || '');
  if (owner !== '' && owner !== 'Albert' && owner !== 'DS') throw new Error('Invalid owner');
  return owner;
}

/**
 * Install once from the Apps Script editor. The first pass reconciles existing
 * Gmail conversations without sending a flood of old missed-lead alerts.
 */
function installOpsAutomation() {
  const functions = ['syncGmailLeadReplies', 'sendDailyLeadDigest'];
  ScriptApp.getProjectTriggers().forEach(function(trigger) {
    if (functions.indexOf(trigger.getHandlerFunction()) >= 0) ScriptApp.deleteTrigger(trigger);
  });
  ScriptApp.newTrigger('syncGmailLeadReplies').timeBased().everyMinutes(5).create();
  ScriptApp.newTrigger('sendDailyLeadDigest').timeBased().everyDays(1).atHour(8).create();
  syncGmailLeadReplies_();
  primeExistingNewLeadAlerts_();
  return 'Gmail sync and lead alerts installed';
}

function syncGmailLeadReplies() {
  syncGmailLeadReplies_();
  sendStaleNewLeadAlerts_();
}

function syncGmailLeadReplies_() {
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    const spreadsheet = SpreadsheetApp.openById(TRACKER.spreadsheetId);
    const sheet = spreadsheet.getSheetByName(TRACKER.sheetName);
    if (!sheet) throw new Error('Lead Tracker sheet not found');
    const height = TRACKER.lastTemplateRow - TRACKER.firstDataRow + 1;
    const rows = sheet.getRange(TRACKER.firstDataRow, 1, height, 19).getValues();
    const workflow = sheet.getRange(TRACKER.firstDataRow, 10, height, 6).getValues();
    const leadsByEmail = {};

    rows.forEach(function(row, index) {
      const email = String(row[2] || '').trim().toLowerCase();
      const id = String(row[18] || '').trim();
      if (!email || !id || !isEmail_(email)) return;
      if (!leadsByEmail[email]) leadsByEmail[email] = [];
      leadsByEmail[email].push(index);
    });

    const emails = Object.keys(leadsByEmail);
    const activity = {};
    for (let start = 0; start < emails.length; start += 20) {
      const batch = emails.slice(start, start + 20);
      const query = 'newer_than:' + TRACKER.gmailLookbackDays + 'd {' + batch.map(function(email) {
        return 'from:' + email + ' to:' + email;
      }).join(' ') + '}';
      GmailApp.search(query, 0, 500).forEach(function(thread) {
        thread.getMessages().forEach(function(message) {
          const from = extractEmails_(message.getFrom());
          const recipients = extractEmails_([message.getTo(), message.getCc()].join(','));
          const timestamp = message.getDate().getTime();
          batch.forEach(function(email) {
            if (!activity[email]) activity[email] = { inbound: 0, outbound: 0 };
            if (from.indexOf(email) >= 0) activity[email].inbound = Math.max(activity[email].inbound, timestamp);
            else if (recipients.indexOf(email) >= 0) activity[email].outbound = Math.max(activity[email].outbound, timestamp);
          });
        });
      });
    }

    let updates = 0;
    emails.forEach(function(email) {
      const events = activity[email];
      if (!events) return;
      leadsByEmail[email].forEach(function(index) {
        const current = workflow[index];
        const stage = String(current[1] || '').toLowerCase();
        const response = String(current[2] || '').toLowerCase();
        if (['lost', 'not a fit', 'won', 'consultation booked', 'quote sent'].indexOf(stage) >= 0 || response === 'good response') return;
        const lastContact = current[3] instanceof Date ? current[3].getTime() : 0;

        if (events.inbound > lastContact && events.inbound >= events.outbound) {
          current[0] = current[0] || 'DS';
          current[1] = 'Replied';
          current[2] = 'Client replied';
          current[3] = new Date(events.inbound);
          current[4] = '';
          current[5] = 'Review reply';
          updates += 1;
        } else if (events.outbound > lastContact && (stage === '' || stage === 'new' || stage === 'contacted')) {
          current[0] = current[0] || 'DS';
          current[1] = 'Contacted';
          current[2] = '';
          current[3] = new Date(events.outbound);
          current[4] = addDays_(new Date(events.outbound), 1);
          current[5] = 'Follow up';
          updates += 1;
        }
      });
    });

    if (updates) {
      sheet.getRange(TRACKER.firstDataRow, 10, height, 6).setValues(workflow);
      SpreadsheetApp.flush();
    }
    console.log('Gmail lead sync updated ' + updates + ' record(s)');
  } finally {
    lock.releaseLock();
  }
}

function extractEmails_(value) {
  const matches = String(value || '').toLowerCase().match(/[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-z0-9.-]+\.[a-z]{2,}/g);
  return matches || [];
}

function primeExistingNewLeadAlerts_() {
  const properties = PropertiesService.getScriptProperties();
  getLeadInboxData_().leads.forEach(function(lead) {
    if (lead.queue === 'new' && lead.id) properties.setProperty('ops_new_alert_' + lead.id, 'primed');
  });
}

function sendStaleNewLeadAlerts_() {
  const properties = PropertiesService.getScriptProperties();
  const cutoff = Date.now() - (30 * 60 * 1000);
  const stale = getLeadInboxData_().leads.filter(function(lead) {
    return lead.queue === 'new' && lead.id && lead.receivedSort && lead.receivedSort <= cutoff && !properties.getProperty('ops_new_alert_' + lead.id);
  });
  if (!stale.length) return;

  const lines = stale.map(function(lead) {
    return lead.id + ' — ' + lead.name + (lead.eventType ? ' — ' + lead.eventType : '');
  });
  MailApp.sendEmail({
    to: TRACKER.notificationEmail,
    subject: stale.length + ' Garden & Coffee lead' + (stale.length === 1 ? '' : 's') + ' waiting for a response',
    body: 'These new inquiries have been waiting more than 30 minutes:\n\n' + lines.join('\n') + '\n\nOpen the lead inbox: ' + TRACKER.opsUrl,
  });
  stale.forEach(function(lead) { properties.setProperty('ops_new_alert_' + lead.id, String(Date.now())); });
}

function sendDailyLeadDigest() {
  const data = getLeadInboxData_();
  const important = data.leads.filter(function(lead) {
    return lead.queue === 'new' || lead.queue === 'reply' || lead.queue === 'followup';
  });
  if (!important.length) return;
  const counts = important.reduce(function(result, lead) {
    result[lead.queue] = (result[lead.queue] || 0) + 1;
    return result;
  }, {});
  const lines = important.slice(0, 25).map(function(lead) {
    return lead.id + ' — ' + lead.name + ' — ' + queueLabel_(lead.queue) + ' — ' + (lead.owner || 'Unassigned');
  });
  MailApp.sendEmail({
    to: TRACKER.notificationEmail,
    subject: 'Garden & Coffee lead digest: ' + important.length + ' need attention',
    body: [
      'New: ' + (counts.new || 0),
      'Client replied: ' + (counts.reply || 0),
      'Follow-up due: ' + (counts.followup || 0),
      '',
      lines.join('\n'),
      important.length > 25 ? '\n+' + (important.length - 25) + ' more' : '',
      '',
      'Open the lead inbox: ' + TRACKER.opsUrl,
    ].join('\n'),
  });
}

function queueLabel_(queue) {
  return queue === 'reply' ? 'Client replied' : queue === 'followup' ? 'Follow-up due' : 'New';
}

function addDays_(date, days) {
  const result = new Date(date.getTime());
  result.setDate(result.getDate() + days);
  result.setHours(12, 0, 0, 0);
  return result;
}

function parseIsoDate_(value) {
  const match = String(value || '').match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) throw new Error('Choose a valid follow-up date');
  return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]), 12, 0, 0);
}

function toIsoDate_(value, timezone) {
  return value instanceof Date ? Utilities.formatDate(value, timezone, 'yyyy-MM-dd') : '';
}

/**
 * FormSubmit has used both JSON and application/x-www-form-urlencoded webhook
 * bodies. Accept the nested JSON format, a flat JSON object, or Apps Script's
 * parsed request parameters so a successful form email cannot silently miss
 * the tracker because the delivery format changed.
 */
function parseRequest_(event) {
  const parameters = event && event.parameter && typeof event.parameter === 'object'
    ? event.parameter
    : {};
  const raw = event && event.postData ? String(event.postData.contents || '') : '';
  let payload = {};

  if (raw.trim()) {
    try {
      payload = JSON.parse(raw);
    } catch (error) {
      // URL-encoded bodies are exposed through event.parameter by Apps Script.
      payload = {};
    }
  }

  const payloadObject = isPlainObject_(payload) ? payload : {};
  const token = String(parameters.token || payloadObject.token || payloadObject.webhook_token || '');
  let formData = isPlainObject_(payloadObject.form_data)
    ? payloadObject.form_data
    : isPlainObject_(payloadObject.data)
      ? payloadObject.data
      : stripRequestMetadata_(payloadObject);

  if (!Object.keys(formData).length) {
    formData = stripRequestMetadata_(parameters);
  }

  return { token: token, formData: formData };
}

function isPlainObject_(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function stripRequestMetadata_(value) {
  if (!isPlainObject_(value)) return {};
  const result = {};
  Object.keys(value).forEach(function(key) {
    if (key !== 'token' && key !== 'webhook_token' && key !== 'form_data' && key !== 'data') {
      result[key] = value[key];
    }
  });
  return result;
}

function normalizeLead_(data, receivedAt) {
  const rawEventType = clean_(data['event-type'], 80).toLowerCase();
  const otherEventType = clean_(data['event-type-other'], 80);
  const eventLabels = {
    wedding: 'Wedding',
    shower: 'Baby or Bridal Shower',
    birthday: 'Birthday',
    'private-party': 'Private event',
    corporate: 'Corporate event',
    'brand-activation': 'Brand activation or pop-up',
    other: otherEventType || 'Other',
  };

  const utmSource = clean_(data.utm_source, 180);
  const utmMedium = clean_(data.utm_medium, 180);
  const paidSocial = /facebook|instagram|meta/i.test(utmSource) || /paid[_ -]?social/i.test(utmMedium);
  const channel = paidSocial
    ? 'Paid Meta'
    : /google/i.test(utmSource) && /organic/i.test(utmMedium)
      ? 'Organic search'
      : utmSource
        ? 'Other tracked campaign'
        : 'Direct / organic unknown';
  const eventDate = data['date-not-confirmed'] === 'yes' ? '' : parseDate_(data['event-date']);
  const notes = [];
  const message = clean_(data.message, 500);
  if (message) notes.push(message);
  if (data['date-not-confirmed'] === 'yes') notes.push('Event date not confirmed');

  const campaign = clean_(data.utm_campaign, 180);
  const adSet = clean_(data.utm_term, 180);
  const adCreative = clean_(data.utm_content, 180);
  const campaignId = clean_(data.utm_id, 80);
  const landingPage = clean_(data['landing-page'], 250);
  const attribution = [
    utmSource && 'utm_source=' + utmSource,
    utmMedium && 'utm_medium=' + utmMedium,
    campaign && 'utm_campaign=' + campaign,
    adSet && 'utm_term=' + adSet,
    adCreative && 'utm_content=' + adCreative,
    campaignId && 'utm_id=' + campaignId,
    landingPage && 'landing_page=' + landingPage,
  ].filter(Boolean).join(', ');
  if (attribution) notes.push(attribution);

  return {
    receivedAt: receivedAt,
    name: clean_(data.name, 120),
    email: clean_(data.email, 254).toLowerCase(),
    phone: clean_(data.phone, 40),
    eventType: clean_(eventLabels[rawEventType] || rawEventType || otherEventType || 'Other', 100),
    eventDate: eventDate,
    guests: parseGuestCount_(data['guest-count']),
    location: clean_(data.location, 200),
    source: paidSocial ? 'Meta ads / website' : 'Website form',
    formSource: 'FormSubmit',
    channel: channel,
    campaign: campaign,
    adSet: adSet,
    adCreative: adCreative,
    landingPage: landingPage,
    campaignId: campaignId,
    notes: clean_(notes.join(' | '), 900),
  };
}

function findAvailableRow_(sheet) {
  const height = TRACKER.lastTemplateRow - TRACKER.firstDataRow + 1;
  const names = sheet.getRange(TRACKER.firstDataRow, 2, height, 1).getDisplayValues();
  const offset = names.findIndex(function(row) { return !String(row[0] || '').trim(); });
  return offset < 0 ? null : TRACKER.firstDataRow + offset;
}

function reserveLeadNumber_(sheet) {
  const properties = PropertiesService.getScriptProperties();
  const height = TRACKER.lastTemplateRow - TRACKER.firstDataRow + 1;
  const existingIds = sheet.getRange(TRACKER.firstDataRow, 19, height, 1).getDisplayValues();
  const highestExisting = existingIds.reduce(function(highest, row) {
    const match = String(row[0] || '').match(/^GCC-(\d+)$/);
    return match ? Math.max(highest, Number(match[1])) : highest;
  }, 0);
  const stored = Number(properties.getProperty('lastLeadNumber'));
  const nextNumber = Math.max(Number.isInteger(stored) ? stored : 0, highestExisting) + 1;
  properties.setProperty('lastLeadNumber', String(nextNumber));
  return 'GCC-' + String(nextNumber).padStart(4, '0');
}

function parseDate_(value) {
  const match = String(value || '').match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return '';
  return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]), 12, 0, 0);
}

function parseGuestCount_(value) {
  const count = Number(value);
  return Number.isFinite(count) && count >= 1 && count <= 500 ? count : '';
}

function clean_(value, maxLength) {
  const raw = Array.isArray(value) ? value.join(', ') : String(value == null ? '' : value);
  const trimmed = raw.trim().slice(0, maxLength);
  return /^[=+\-@]/.test(trimmed) ? "'" + trimmed : trimmed;
}

function isEmail_(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function submissionFingerprint_(lead, receivedAt) {
  const day = Utilities.formatDate(receivedAt, 'America/Los_Angeles', 'yyyy-MM-dd');
  const source = [lead.email, lead.eventType, lead.eventDate || '', lead.guests || '', day].join('|');
  const digest = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, source);
  return 'lead_' + Utilities.base64EncodeWebSafe(digest).replace(/=+$/, '');
}

function cleanupFingerprints_(properties, now) {
  const cutoff = now.getTime() - (30 * 24 * 60 * 60 * 1000);
  const all = properties.getProperties();
  Object.keys(all).forEach(function(key) {
    if (key.indexOf('lead_') === 0 && Number(all[key]) < cutoff) properties.deleteProperty(key);
  });
}

function jsonResponse_(body) {
  return ContentService
    .createTextOutput(JSON.stringify(body))
    .setMimeType(ContentService.MimeType.JSON);
}
