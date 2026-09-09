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
    var heroVideoLoaded = false;
    var pageReady = document.readyState === 'complete';
    var allowMotion = window.matchMedia('(prefers-reduced-motion: no-preference)');
    function loadHeroVideo() {
      if (!heroVideo || heroVideoLoaded || !allowMotion.matches) return;
      heroVideo.querySelectorAll('source[data-src]').forEach(function(source) {
        source.src = source.dataset.src;
        source.removeAttribute('data-src');
      });
      heroVideoLoaded = true;
      heroVideo.load();
    }
    function updateVideoToggle() {
      if (!heroVideo || !videoToggle) return;
      videoToggle.textContent = heroVideo.paused ? 'Play video' : 'Pause video';
      videoToggle.setAttribute('aria-label', heroVideo.paused ? 'Play video' : 'Pause video');
    }
    function updateHeroPlayback() {
      if (!heroVideo) return;
      if (!userPaused && heroInView && !document.hidden && allowMotion.matches && pageReady) {
        loadHeroVideo();
        heroVideo.play().catch(updateVideoToggle);
      } else heroVideo.pause();
    }
    if (heroVideo && videoToggle) {
      heroVideo.muted = true;
      updateVideoToggle();
      videoToggle.addEventListener('click', function() {
        userPaused = !heroVideo.paused;
        if (!userPaused) pageReady = true;
        updateHeroPlayback();
      });
      ['play', 'pause'].forEach(function(eventName) {
        heroVideo.addEventListener(eventName, updateVideoToggle);
      });
      new IntersectionObserver(function(entries) {
        heroInView = entries[0].isIntersecting;
        updateHeroPlayback();
      }).observe(heroVideo);
      document.addEventListener('visibilitychange', updateHeroPlayback);
      allowMotion.addEventListener('change', updateHeroPlayback);
      if (!pageReady) window.addEventListener('load', function() {
        // Let the poster, typography and primary CTA finish rendering before
        // the decorative video competes for the visitor's connection.
        window.setTimeout(function() {
          pageReady = true;
          updateHeroPlayback();
        }, 3500);
      }, { once: true });
    }
    var quote = document.getElementById('quote');
    var stickyCta = document.querySelector('.w-sticky-cta');
    if (quote && stickyCta) {
      new IntersectionObserver(function(entries) {
        stickyCta.hidden = entries[0].isIntersecting;
      }).observe(quote);
    }

    if (typeof window.gardenTrack === 'function') window.gardenTrack('WeddingPageView');

    document.querySelectorAll('[data-cta-location]').forEach(function(link) {
      link.addEventListener('click', function() {
        if (typeof window.gardenTrack !== 'function') return;
        window.gardenTrack('WeddingQuoteIntent', {
          cta_location: link.getAttribute('data-cta-location') || 'unknown'
        });
      });
    });

    var reelVideos = document.querySelectorAll('.w-reel-video');
    if (reelVideos.length) {
      var reelObserver = new IntersectionObserver(function(entries) {
        entries.forEach(function(entry) {
          var video = entry.target;
          if (entry.isIntersecting && entry.intersectionRatio >= 0.18) {
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
        video.muted = true;
        video.addEventListener('play', function() {
          reelVideos.forEach(function(other) { if (other !== video) other.pause(); });
          if (typeof window.gardenTrack === 'function') {
            window.gardenTrack('WeddingVideoPlay', { video: video.getAttribute('aria-describedby') });
          }
        });
        reelObserver.observe(video);
      });
      document.addEventListener('visibilitychange', function() {
        if (document.hidden) reelVideos.forEach(function(video) { video.pause(); });
      });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', startWeddingPage);
  } else {
    startWeddingPage();
  }

})();
