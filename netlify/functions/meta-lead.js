const crypto = require('node:crypto');

const DATASET_ID = process.env.META_PIXEL_ID || '1075812884821288';
const GRAPH_API_VERSION = process.env.META_GRAPH_API_VERSION || 'v26.0';
const ALLOWED_HOSTS = new Set([
  'thegardencoffeecart.com',
  'www.thegardencoffeecart.com'
]);

function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function normalizeEmail(value) {
  return String(value || '').trim().toLowerCase();
}

function normalizePhone(value) {
  const digits = String(value || '').replace(/\D/g, '');
  return digits.length === 10 ? `1${digits}` : digits;
}

function cookieValue(value) {
  const clean = String(value || '').trim();
  return clean.slice(0, 255);
}

function sourceUrl(value) {
  try {
    const url = new URL(String(value || ''));
    return ALLOWED_HOSTS.has(url.hostname)
      ? url.href
      : 'https://thegardencoffeecart.com/';
  } catch (_error) {
    return 'https://thegardencoffeecart.com/';
  }
}

exports.handler = async function handler(event) {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  const origin = event.headers.origin || '';
  try {
    if (!ALLOWED_HOSTS.has(new URL(origin).hostname)) {
      return { statusCode: 403, body: JSON.stringify({ error: 'Invalid origin' }) };
    }
  } catch (_error) {
    return { statusCode: 403, body: JSON.stringify({ error: 'Invalid origin' }) };
  }

  const accessToken = process.env.META_CAPI_ACCESS_TOKEN;
  if (!accessToken) {
    return { statusCode: 503, body: JSON.stringify({ error: 'Tracking is not configured' }) };
  }

  let input;
  try {
    input = JSON.parse(event.body || '{}');
  } catch (_error) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Invalid request' }) };
  }

  const eventId = String(input.eventId || '').slice(0, 100);
  if (input.advertisingConsent !== true || event.headers['sec-gpc'] === '1' || event.headers.dnt === '1') {
    return { statusCode: 403, body: JSON.stringify({ error: 'Advertising consent required' }) };
  }
  if (!/^garden_lead_[a-zA-Z0-9_-]+$/.test(eventId)) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Invalid event' }) };
  }

  const email = normalizeEmail(input.email);
  const phone = normalizePhone(input.phone);
  const forwardedIp = event.headers['x-nf-client-connection-ip'] ||
    String(event.headers['x-forwarded-for'] || '').split(',')[0].trim();
  const userAgent = event.headers['user-agent'] || '';

  const userData = {};
  if (email) userData.em = [sha256(email)];
  if (phone) userData.ph = [sha256(phone)];
  if (forwardedIp) userData.client_ip_address = forwardedIp;
  if (userAgent) userData.client_user_agent = userAgent;
  if (input.fbp) userData.fbp = cookieValue(input.fbp);
  if (input.fbc) userData.fbc = cookieValue(input.fbc);

  const payload = {
    data: [{
      event_name: 'Lead',
      event_time: Math.floor(Date.now() / 1000),
      event_id: eventId,
      event_source_url: sourceUrl(input.eventSourceUrl),
      action_source: 'website',
      user_data: userData,
      custom_data: {
        content_name: 'Event Quote Request',
        content_category: String(input.eventType || 'other').slice(0, 80)
      }
    }]
  };

  if (process.env.META_CAPI_TEST_EVENT_CODE) {
    payload.test_event_code = process.env.META_CAPI_TEST_EVENT_CODE;
  }

  try {
    const response = await fetch(
      `https://graph.facebook.com/${GRAPH_API_VERSION}/${DATASET_ID}/events?access_token=${encodeURIComponent(accessToken)}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      }
    );

    if (!response.ok) {
      console.error('Meta CAPI request failed with status', response.status);
      return { statusCode: 502, body: JSON.stringify({ error: 'Tracking request failed' }) };
    }

    return { statusCode: 200, body: JSON.stringify({ ok: true }) };
  } catch (_error) {
    return { statusCode: 502, body: JSON.stringify({ error: 'Tracking request failed' }) };
  }
};
