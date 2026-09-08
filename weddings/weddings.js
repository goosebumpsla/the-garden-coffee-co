(function() {
  'use strict';

  function startWeddingPage() {
    if (typeof initForm === 'function') {
      initForm();
    }

    // Native anchors preserve browser history and never take over scrolling.
    var heroVideo = document.querySelector('.w-hero__video');
    var videoToggle = document.querySelector('.w-video-toggle');
    var userPaused = false;
    var heroInView = true;
    var allowMotion = window.matchMedia('(min-width: 769px) and (prefers-reduced-motion: no-preference)');
    function updateHeroPlayback() {
      if (!heroVideo) return;
      if (!userPaused && heroInView && !document.hidden && allowMotion.matches) {
        heroVideo.play().catch(function() {});
      } else heroVideo.pause();
    }
    if (heroVideo && videoToggle) {
      videoToggle.addEventListener('click', function() {
        userPaused = !heroVideo.paused;
        updateHeroPlayback();
      });
      ['play', 'pause'].forEach(function(eventName) {
        heroVideo.addEventListener(eventName, function() {
          videoToggle.textContent = heroVideo.paused ? 'Play video' : 'Pause video';
          videoToggle.setAttribute('aria-label', heroVideo.paused ? 'Play background video' : 'Pause background video');
        });
      });
      new IntersectionObserver(function(entries) {
        heroInView = entries[0].isIntersecting;
        updateHeroPlayback();
      }).observe(heroVideo);
      document.addEventListener('visibilitychange', updateHeroPlayback);
      allowMotion.addEventListener('change', updateHeroPlayback);
    }
    var quote = document.getElementById('quote');
    var stickyCta = document.querySelector('.w-sticky-cta');
    if (quote && stickyCta) {
      new IntersectionObserver(function(entries) {
        stickyCta.hidden = entries[0].isIntersecting;
      }).observe(quote);
    }

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
    if (reelVideos.length) {
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
          } else {
            video.pause();
          }
        });
      }, { rootMargin: '0px', threshold: 0.18 });

      reelVideos.forEach(function(video) {
        video.controls = true;
        video.addEventListener('play', function() {
          reelVideos.forEach(function(other) { if (other !== video) other.pause(); });
        });
        reelObserver.observe(video);
      });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', startWeddingPage);
  } else {
    startWeddingPage();
  }

})();
