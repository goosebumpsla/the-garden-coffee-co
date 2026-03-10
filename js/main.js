/* ===== MAIN.JS =====
 * App initialization, Lenis smooth scroll, mobile menu, anchor links
 */

(function() {
  'use strict';

  // Wait for everything to be ready
  function boot() {
    // Check dependencies
    if (typeof gsap === 'undefined') {
      console.error('[Garden] GSAP not loaded');
      document.getElementById('loader').style.display = 'none';
      return;
    }

    if (typeof ScrollTrigger === 'undefined') {
      console.error('[Garden] ScrollTrigger not loaded');
      document.getElementById('loader').style.display = 'none';
      return;
    }

    gsap.registerPlugin(ScrollTrigger);

    var loader = document.getElementById('loader');
    var loaderText = loader ? loader.querySelector('.loader__text') : null;

    if (!loader || !loaderText) {
      startApp();
      return;
    }

    // Loader animation
    var tl = gsap.timeline();
    tl.to(loaderText, {
      opacity: 1,
      duration: 0.6,
      ease: 'power2.out'
    });
    tl.to(loaderText, {
      opacity: 0,
      duration: 0.4,
      ease: 'power2.in'
    }, '+=0.4');
    tl.to(loader, {
      yPercent: -100,
      duration: 0.8,
      ease: 'power3.inOut',
      onComplete: function() {
        loader.style.display = 'none';
        startApp();
      }
    }, '-=0.2');
  }

  // Start when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }

  function startApp() {
    // ===== LENIS SMOOTH SCROLL =====
    var lenis = null;
    try {
      if (typeof Lenis !== 'undefined') {
        lenis = new Lenis({
          duration: 1.2,
          easing: function(t) { return Math.min(1, 1.001 - Math.pow(2, -10 * t)); },
          orientation: 'vertical',
          smoothWheel: true,
          smoothTouch: false
        });

        lenis.on('scroll', ScrollTrigger.update);

        gsap.ticker.add(function(time) {
          lenis.raf(time * 1000);
        });
        gsap.ticker.lagSmoothing(0);
      }
    } catch(e) {
      console.warn('[Garden] Lenis init failed:', e);
      lenis = null;
    }

    // ===== INIT ANIMATIONS =====
    try {
      initAnimations();
    } catch(e) {
      console.error('[Garden] Animations init failed:', e);
    }

    // ===== INIT FORM =====
    try {
      initForm();
    } catch(e) {
      console.error('[Garden] Form init failed:', e);
    }

    // ===== INIT TESTIMONIALS =====
    try {
      initTestimonials();
    } catch(e) {
      console.error('[Garden] Testimonials init failed:', e);
    }

    // ===== MOBILE MENU =====
    var hamburger = document.getElementById('hamburger');
    var mobileMenu = document.getElementById('mobileMenu');
    var mobileLinks = document.querySelectorAll('.mobile-menu__link');

    if (hamburger && mobileMenu) {
      hamburger.addEventListener('click', function() {
        var isActive = hamburger.classList.toggle('active');
        mobileMenu.classList.toggle('active');
        if (lenis) {
          isActive ? lenis.stop() : lenis.start();
        }
      });

      mobileLinks.forEach(function(link) {
        link.addEventListener('click', function() {
          hamburger.classList.remove('active');
          mobileMenu.classList.remove('active');
          if (lenis) lenis.start();
        });
      });
    }

    // ===== SMOOTH ANCHOR SCROLLING =====
    document.querySelectorAll('a[href^="#"]').forEach(function(anchor) {
      anchor.addEventListener('click', function(e) {
        var href = anchor.getAttribute('href');
        if (href === '#') return;
        e.preventDefault();
        var target = document.querySelector(href);
        if (target) {
          if (lenis) {
            lenis.scrollTo(target, { offset: -60 });
          } else {
            target.scrollIntoView({ behavior: 'smooth' });
          }
        }
      });
    });
  }
})();
