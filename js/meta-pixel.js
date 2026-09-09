/* Optional advertising measurement. No SDK or CAPI calls before opt-in. */
(function() {
  'use strict';
  var key = 'garden-advertising-v1';
  var choice = '';
  try { choice = localStorage.getItem(key) || ''; } catch (_) {}
  var signal = navigator.globalPrivacyControl === true || navigator.doNotTrack === '1';
  var production = /^(www\.)?thegardencoffeecart\.com$/.test(location.hostname);
  var loaded = false;
  var panel;
  function allowed() { return choice === 'accepted' && !signal && production; }
  window.gardenAdvertisingAllowed = allowed;
  window.gardenTrack = function(name, details) {
    if (allowed() && typeof window.fbq === 'function') {
      var payload = { page_path: location.pathname };
      if (details && typeof details === 'object') {
        Object.keys(details).slice(0, 8).forEach(function(key) {
          var value = details[key];
          if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
            payload[key] = typeof value === 'string' ? value.slice(0, 120) : value;
          }
        });
      }
      window.fbq('trackCustom', name, payload);
    }
  };
  function startPixel() {
    if (!allowed() || loaded) return;
    loaded = true;
    var fbq = window.fbq = function() {
      if (arguments[0] !== 'consent' && !allowed()) return;
      fbq.callMethod ? fbq.callMethod.apply(fbq, arguments) : fbq.queue.push(arguments);
    };
    window._fbq = fbq;
    fbq.push = fbq; fbq.loaded = true; fbq.version = '2.0'; fbq.queue = [];
    var script = document.createElement('script');
    script.async = true;
    script.src = 'https://connect.facebook.net/en_US/fbevents.js';
    document.head.appendChild(script);
    fbq('init', '1075812884821288');
    fbq('track', 'PageView');
  }
  function clearAdCookies() {
    ['_fbp', '_fbc'].forEach(function(name) {
      document.cookie = name + '=; Max-Age=0; path=/; SameSite=Lax';
      document.cookie = name + '=; Max-Age=0; path=/; domain=.thegardencoffeecart.com; SameSite=Lax';
    });
  }
  function save(value) {
    choice = value;
    try { localStorage.setItem(key, value); } catch (_) {}
    if (!allowed()) {
      if (window.fbq) window.fbq('consent', 'revoke');
      clearAdCookies();
    } else {
      if (window.fbq) window.fbq('consent', 'grant');
      startPixel();
    }
    panel.hidden = true;
    document.querySelectorAll('[data-privacy-status]').forEach(function(el) {
      el.textContent = signal ? 'Advertising tracking is off because your browser sends a privacy signal.' :
        choice === 'accepted' ? 'Optional advertising tracking is allowed.' : 'Optional advertising tracking is off.';
    });
  }
  function setup() {
    panel = document.createElement('aside');
    panel.className = 'privacy-choice'; panel.setAttribute('aria-label', 'Optional advertising tracking');
    panel.hidden = Boolean(choice) || signal;
    panel.innerHTML = '<p><strong>Your privacy choices</strong>We use optional Meta tracking to measure advertising. You can request a quote without it. <a href="/privacy/">Privacy notice</a></p><div><button type="button" data-choice="declined">Continue without tracking</button><button type="button" data-choice="accepted">Allow advertising tracking</button></div>';
    document.body.appendChild(panel);
    panel.querySelectorAll('[data-choice]').forEach(function(button) {
      button.addEventListener('click', function() { save(button.dataset.choice); });
    });
    document.querySelectorAll('[data-privacy-settings]').forEach(function(button) {
      button.addEventListener('click', function(event) {
        event.preventDefault();
        if (signal) { save('declined'); return; }
        panel.hidden = false;
        panel.querySelector('button').focus();
      });
    });
    if (signal || choice) save(signal ? 'declined' : choice);
    else startPixel();
  }
  // Honor stored choices before other page scripts run.
  startPixel();
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', setup);
  else setup();
})();
