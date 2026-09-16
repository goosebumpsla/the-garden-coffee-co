/* Google Analytics 4 with consent aligned to the site's tracking choice. */
(function () {
  'use strict';

  var measurementId = 'G-FLCR8F46VC';
  var storageKey = 'garden-advertising-v1';
  var accepted = false;

  try {
    accepted = localStorage.getItem(storageKey) === 'accepted' &&
      navigator.globalPrivacyControl !== true && navigator.doNotTrack !== '1';
  } catch (_) {}

  window.dataLayer = window.dataLayer || [];
  window.gtag = window.gtag || function () { window.dataLayer.push(arguments); };

  function consent(granted) {
    window.gtag('consent', 'update', {
      analytics_storage: granted ? 'granted' : 'denied',
      ad_storage: granted ? 'granted' : 'denied',
      ad_user_data: granted ? 'granted' : 'denied',
      ad_personalization: granted ? 'granted' : 'denied'
    });
  }

  window.gtag('consent', 'default', {
    analytics_storage: accepted ? 'granted' : 'denied',
    ad_storage: accepted ? 'granted' : 'denied',
    ad_user_data: accepted ? 'granted' : 'denied',
    ad_personalization: accepted ? 'granted' : 'denied'
  });
  window.gtag('js', new Date());
  window.gtag('config', measurementId);

  window.gardenGoogleAnalyticsConsent = consent;

  var script = document.createElement('script');
  script.async = true;
  script.src = 'https://www.googletagmanager.com/gtag/js?id=' + encodeURIComponent(measurementId);
  document.head.appendChild(script);
})();
