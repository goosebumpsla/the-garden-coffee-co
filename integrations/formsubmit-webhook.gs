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
});

function doPost(event) {
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);

  try {
    if (!event || !event.parameter || event.parameter.token !== TRACKER.webhookToken) {
      return jsonResponse_({ ok: false, error: 'Invalid token' });
    }

    const payload = JSON.parse((event.postData && event.postData.contents) || '{}');
    const formData = payload && payload.form_data;
    if (!formData || typeof formData !== 'object' || Array.isArray(formData)) {
      return jsonResponse_({ ok: false, error: 'Invalid FormSubmit payload' });
    }

    const receivedAt = new Date();
    const lead = normalizeLead_(formData, receivedAt);
    if (!lead.name || !lead.email || !isEmail_(lead.email)) {
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
  const eventDate = data['date-not-confirmed'] === 'yes' ? '' : parseDate_(data['event-date']);
  const notes = [];
  const message = clean_(data.message, 500);
  if (message) notes.push(message);
  if (data['date-not-confirmed'] === 'yes') notes.push('Event date not confirmed');

  const campaign = clean_(data.utm_campaign, 180);
  const landingPage = clean_(data['landing-page'], 250);
  const attribution = [
    utmSource && 'utm_source=' + utmSource,
    utmMedium && 'utm_medium=' + utmMedium,
    campaign && 'utm_campaign=' + campaign,
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
    notes: clean_(notes.join(' | '), 900),
  };
}

function findAvailableRow_(sheet) {
  const height = TRACKER.lastTemplateRow - TRACKER.firstDataRow + 1;
  const names = sheet.getRange(TRACKER.firstDataRow, 2, height, 1).getDisplayValues();
  const offset = names.findIndex(function(row) { return !String(row[0] || '').trim(); });
  return offset < 0 ? null : TRACKER.firstDataRow + offset;
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
