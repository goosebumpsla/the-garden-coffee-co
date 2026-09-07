(function() {
  'use strict';

  function startWeddingPage() {
    if (typeof initForm === 'function') {
      initForm();
    }

    document.querySelectorAll('a[href^="#"]').forEach(function(link) {
      link.addEventListener('click', function(event) {
        var target = document.querySelector(link.getAttribute('href'));
        if (!target) return;
        event.preventDefault();
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        history.replaceState(null, '', link.getAttribute('href'));
      });
    });

    if (typeof window.fbq === 'function') {
      window.fbq('track', 'ViewContent', {
        content_name: 'Los Angeles Wedding Coffee Cart',
        content_category: 'Wedding Catering'
      });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', startWeddingPage);
  } else {
    startWeddingPage();
  }

  // Re-align deep links after web fonts and images finish laying out.
  window.addEventListener('load', function() {
    if (!window.location.hash) return;
    var target = document.querySelector(window.location.hash);
    if (target) target.scrollIntoView({ block: 'start' });
  });
})();
