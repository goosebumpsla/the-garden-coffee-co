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
      var previewsPaused = false;
      var visibleReels = new Set();
      var dialog = document.createElement('dialog');
      dialog.className = 'w-film-dialog';
      dialog.setAttribute('aria-label', 'Wedding film');
      dialog.innerHTML = '<button type="button" class="w-film-close" aria-label="Close wedding film">Close ×</button><video controls muted playsinline preload="none" aria-label="Wedding film, no sound"></video>';
      document.body.appendChild(dialog);
      var player = dialog.querySelector('video');
      player.muted = true;
      var opener;
      var pauseButton = document.createElement('button');
      pauseButton.type = 'button';
      pauseButton.className = 'w-previews-toggle';
      document.querySelector('.w-real-events__note').before(pauseButton);
      function loadReel(video) {
        var source = video.querySelector('source[data-src]');
        if (source) {
          source.src = source.dataset.src;
          source.removeAttribute('data-src');
          video.load();
        }
      }
      function updatePreviews() {
        pauseButton.hidden = !allowMotion.matches;
        pauseButton.textContent = previewsPaused ? 'Play previews' : 'Pause previews';
        reelVideos.forEach(function(video) {
          if (visibleReels.has(video) && !previewsPaused && allowMotion.matches && !document.hidden && !dialog.open) {
            loadReel(video);
            video.play().catch(function() {});
          } else video.pause();
        });
      }
      pauseButton.addEventListener('click', function() { previewsPaused = !previewsPaused; updatePreviews(); });
      dialog.querySelector('button').addEventListener('click', function() { dialog.close(); });
      dialog.addEventListener('click', function(event) {
        if (event.target === dialog) {
          var rect = dialog.getBoundingClientRect();
          if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) dialog.close();
        }
      });
      dialog.addEventListener('close', function() {
        player.pause();
        player.removeAttribute('src');
        player.load();
        document.body.classList.remove('w-film-open');
        updatePreviews();
        if (opener) opener.focus({ preventScroll: true });
      });
      var reelObserver = new IntersectionObserver(function(entries) {
        entries.forEach(function(entry) {
          var video = entry.target;
          if (entry.isIntersecting && entry.intersectionRatio >= 0.18) {
            visibleReels.add(video);
          } else {
            visibleReels.delete(video);
          }
        });
        updatePreviews();
      }, { rootMargin: '0px', threshold: 0.18 });

      reelVideos.forEach(function(video) {
        video.controls = false;
        video.muted = true;
        video.loop = true;
        var frame = document.createElement('div');
        frame.className = 'w-reel-frame';
        video.before(frame);
        frame.appendChild(video);
        var openButton = document.createElement('button');
        openButton.type = 'button';
        openButton.className = 'w-film-open-button';
        openButton.textContent = 'Watch film ↗';
        var label = document.getElementById(video.getAttribute('aria-describedby'));
        openButton.setAttribute('aria-label', 'Watch ' + label.textContent + ' — no sound');
        frame.appendChild(openButton);
        openButton.addEventListener('click', function() {
          opener = openButton;
          var source = video.querySelector('source');
          player.src = source.dataset.src || source.src;
          player.poster = video.poster;
          player.muted = true;
          dialog.showModal();
          document.body.classList.add('w-film-open');
          updatePreviews();
          player.play().catch(function() {});
          if (typeof window.gardenTrack === 'function') {
            window.gardenTrack('WeddingVideoPlay', { video: video.getAttribute('aria-describedby') });
          }
        });
        reelObserver.observe(video);
      });
      document.addEventListener('visibilitychange', function() { if (document.hidden) player.pause(); updatePreviews(); });
      allowMotion.addEventListener('change', updatePreviews);
      updatePreviews();
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', startWeddingPage);
  } else {
    startWeddingPage();
  }

})();
