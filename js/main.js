/* Native scrolling; essential controls never wait for an animation library. */
(function() {
  'use strict';
  function boot() {
    var loader = document.getElementById('loader');
    if (loader) loader.hidden = true;
    [window.initGallerySlideshow, window.initForm].forEach(function(init) {
      if (typeof init === 'function') init();
    });

    document.querySelectorAll('[data-cta-location]').forEach(function(link) {
      link.addEventListener('click', function() {
        var href = link.getAttribute('href') || '';
        var eventName = href.indexOf('people.com/') !== -1 ? 'PressLinkClick' :
          href.indexOf('#quote') !== -1 ? 'QuoteCtaClick' : 'ContentCtaClick';
        if (typeof window.gardenTrack === 'function') {
          window.gardenTrack(eventName, { cta_location: link.getAttribute('data-cta-location') || 'unknown' });
        }
      });
    });

    var stickyCta = document.querySelector('[data-home-sticky-cta]');
    var hero = document.getElementById('hero');
    var quote = document.getElementById('quote');
    if (stickyCta && hero && quote && 'IntersectionObserver' in window) {
      var heroVisible = true;
      var quoteVisible = false;
      function syncStickyCta() {
        stickyCta.classList.toggle('is-visible', !heroVisible && !quoteVisible);
      }
      new IntersectionObserver(function(entries) {
        heroVisible = entries[0].isIntersecting;
        syncStickyCta();
      }, { threshold: .05 }).observe(hero);
      new IntersectionObserver(function(entries) {
        quoteVisible = entries[0].isIntersecting;
        syncStickyCta();
      }, { threshold: .05 }).observe(quote);
    }

    var heroVideo = document.querySelector('.hero__video');
    if (heroVideo && window.matchMedia('(min-width: 769px) and (prefers-reduced-motion: no-preference)').matches) {
      window.addEventListener('load', function() {
        window.setTimeout(function() {
          heroVideo.querySelectorAll('source[data-src]').forEach(function(source) {
            source.src = source.dataset.src;
            source.removeAttribute('data-src');
          });
          heroVideo.load();
          heroVideo.play().catch(function() {});
        }, 3500);
      }, { once: true });
    }

    var hamburger = document.getElementById('hamburger');
    var menu = document.getElementById('mobileMenu');
    if (!hamburger || !menu) return;
    hamburger.setAttribute('aria-controls', 'mobileMenu');
    function setMenu(open) {
      hamburger.classList.toggle('active', open);
      hamburger.setAttribute('aria-expanded', String(open));
      menu.classList.toggle('active', open);
      menu.inert = !open;
    }
    setMenu(false);
    hamburger.addEventListener('click', function() {
      setMenu(!menu.classList.contains('active'));
    });
    menu.querySelectorAll('a').forEach(function(link) {
      link.addEventListener('click', function() { setMenu(false); });
    });
    document.addEventListener('keydown', function(event) {
      if (event.key === 'Escape' && menu.classList.contains('active')) {
        setMenu(false);
        hamburger.focus();
      }
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
