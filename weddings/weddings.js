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

    document.querySelectorAll('[data-cta-location]').forEach(function(link) {
      link.addEventListener('click', function() {
        if (typeof window.fbq !== 'function') return;
        window.fbq('trackCustom', 'WeddingQuoteIntent', {
          content_name: 'Wedding Quote',
          cta_location: link.getAttribute('data-cta-location') || 'unknown'
        });
      });
    });

    var weddingDate = document.getElementById('event-date');
    if (weddingDate) {
      var today = new Date();
      var localToday = new Date(today.getTime() - (today.getTimezoneOffset() * 60000));
      weddingDate.min = localToday.toISOString().slice(0, 10);
    }

    var reelVideos = document.querySelectorAll('.w-reel-video');
    if (reelVideos.length && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      var reelObserver = new IntersectionObserver(function(entries) {
        entries.forEach(function(entry) {
          var video = entry.target;
          if (entry.isIntersecting) {
            var source = video.querySelector('source[data-src]');
            if (source) {
              source.src = source.dataset.src;
              source.removeAttribute('data-src');
              video.load();
            }
            video.play().catch(function() {});
          } else {
            video.pause();
          }
        });
      }, { rootMargin: '180px 0px', threshold: 0.18 });

      reelVideos.forEach(function(video) {
        reelObserver.observe(video);
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
