/* ===== ANIMATIONS.JS =====
 * GSAP + ScrollTrigger animation definitions
 * Custom text splitting (free alternative to SplitText)
 * Parallax effects, reveals, magnetic buttons, marquee
 */

// ===== TEXT SPLITTING =====
function splitText(element, type) {
  type = type || 'words';
  // Use innerText to respect <br> line breaks, fallback to textContent
  var text = (element.innerText || element.textContent).trim();

  if (type === 'words') {
    var words = text.split(/\s+/);
    element.innerHTML = words
      .map(function(word) { return '<span class="word"><span class="word-inner">' + word + '</span></span>'; })
      .join(' ');
    element.classList.add('split-ready');
    return element.querySelectorAll('.word-inner');
  }

  if (type === 'lines') {
    // Wrap in temp spans to measure lines
    var lineWords = text.split(/\s+/);
    element.innerHTML = lineWords.map(function(w) { return '<span class="measure">' + w + '</span>'; }).join(' ');

    var spans = element.querySelectorAll('.measure');
    var lines = [];
    var currentLine = [];
    var lastTop = null;

    spans.forEach(function(span) {
      var top = span.getBoundingClientRect().top;
      if (lastTop !== null && Math.abs(top - lastTop) > 5) {
        lines.push(currentLine.map(function(s) { return s.textContent; }).join(' '));
        currentLine = [];
      }
      currentLine.push(span);
      lastTop = top;
    });
    if (currentLine.length) {
      lines.push(currentLine.map(function(s) { return s.textContent; }).join(' '));
    }

    element.innerHTML = lines
      .map(function(line) { return '<span class="line"><span class="line-inner">' + line + '</span></span>'; })
      .join(' ');
    element.classList.add('split-ready');
    return element.querySelectorAll('.line-inner');
  }
}

// ===== MAGNETIC BUTTON EFFECT =====
function initMagneticButtons() {
  var buttons = document.querySelectorAll('[data-magnetic]');
  var isTouchDevice = 'ontouchstart' in window;

  if (isTouchDevice) return;

  buttons.forEach(function(btn) {
    var xTo = gsap.quickTo(btn, 'x', { duration: 0.6, ease: 'elastic.out(1, 0.5)' });
    var yTo = gsap.quickTo(btn, 'y', { duration: 0.6, ease: 'elastic.out(1, 0.5)' });

    btn.addEventListener('mousemove', function(e) {
      var rect = btn.getBoundingClientRect();
      var x = e.clientX - rect.left - rect.width / 2;
      var y = e.clientY - rect.top - rect.height / 2;
      xTo(x * 0.3);
      yTo(y * 0.3);
    });

    btn.addEventListener('mouseleave', function() {
      xTo(0);
      yTo(0);
    });
  });
}

// ===== HERO ENTRANCE ANIMATION =====
function initHeroAnimation() {
  var tl = gsap.timeline({ delay: 0.2 });

  // Image scale down
  tl.to('.hero__img', {
    scale: 1,
    duration: 2,
    ease: 'power2.out'
  }, 0);

  // Overlay lighten
  tl.to('.hero__overlay', {
    opacity: 0.3,
    duration: 1.8,
    ease: 'power2.out'
  }, 0);

  // Title split and reveal
  var titleEl = document.querySelector('.hero__title');
  if (titleEl) {
    var words = splitText(titleEl, 'words');
    tl.from(words, {
      y: 50,
      opacity: 0,
      duration: 1,
      stagger: 0.1,
      ease: 'power3.out'
    }, 0.5);
  }

  // Subtitle
  tl.to('.hero__subtitle', {
    y: 0,
    opacity: 1,
    duration: 0.8,
    ease: 'power3.out'
  }, 1);

  // CTA button
  tl.fromTo('.hero__cta', {
    opacity: 0,
    scale: 0.85
  }, {
    opacity: 1,
    scale: 1,
    duration: 0.6,
    ease: 'back.out(1.5)'
  }, 1.3);

  // Nav items
  tl.to('.nav__logo', {
    opacity: 1,
    y: 0,
    duration: 0.6,
    ease: 'power3.out'
  }, 0.8);

  tl.to(['.nav__link', '.nav__cta', '.nav__hamburger'], {
    opacity: 1,
    y: 0,
    duration: 0.6,
    stagger: 0.08,
    ease: 'power3.out'
  }, 0.9);

  // Scroll indicator
  tl.to('.hero__scroll-indicator', {
    opacity: 1,
    duration: 0.6,
    ease: 'power2.out'
  }, 1.8);

  // Fade out scroll indicator on scroll
  gsap.to('.hero__scroll-indicator', {
    opacity: 0,
    scrollTrigger: {
      trigger: '.hero',
      start: 'top top',
      end: '+=150',
      scrub: true
    }
  });

  return tl;
}

// ===== SCROLL-TRIGGERED TEXT REVEALS =====
function initTextReveals() {
  document.querySelectorAll('[data-split="lines"]').forEach(function(el) {
    var lines = splitText(el, 'lines');
    gsap.to(lines, {
      y: 0,
      duration: 0.9,
      stagger: 0.15,
      ease: 'power3.out',
      scrollTrigger: {
        trigger: el,
        start: 'top 85%',
        toggleActions: 'play none none none'
      }
    });
  });
}

// ===== GENERAL REVEALS =====
function initReveals() {
  var reveals = document.querySelectorAll('[data-reveal]');

  ScrollTrigger.batch(reveals, {
    start: 'top 88%',
    onEnter: function(batch) {
      gsap.to(batch, {
        opacity: 1,
        y: 0,
        duration: 0.8,
        stagger: 0.12,
        ease: 'power3.out',
        overwrite: true
      });
    }
  });
}

// ===== PARALLAX =====
function initParallax() {
  var isMobile = window.matchMedia('(max-width: 768px)').matches;
  if (isMobile) return;

  document.querySelectorAll('[data-parallax]').forEach(function(el) {
    var speed = parseInt(el.dataset.speed) || -50;
    gsap.to(el, {
      y: speed,
      ease: 'none',
      scrollTrigger: {
        trigger: el,
        start: 'top bottom',
        end: 'bottom top',
        scrub: 1
      }
    });
  });
}

// ===== STEP CONNECTORS =====
function initConnectors() {
  document.querySelectorAll('[data-connector]').forEach(function(el) {
    gsap.to(el, {
      scaleX: 1,
      duration: 0.8,
      ease: 'power2.out',
      scrollTrigger: {
        trigger: el,
        start: 'top 85%',
        toggleActions: 'play none none none'
      }
    });
  });
}

// ===== NAV SCROLL BEHAVIOR =====
function initNavScroll() {
  ScrollTrigger.create({
    start: 'top -80',
    end: 99999,
    toggleClass: { className: 'nav--scrolled', targets: '.nav' }
  });
}

// ===== SERVICE CARD IMAGE REVEAL =====
function initServiceCards() {
  document.querySelectorAll('.service-card__image img').forEach(function(img) {
    gsap.from(img, {
      scale: 1.15,
      duration: 1.2,
      ease: 'power2.out',
      scrollTrigger: {
        trigger: img,
        start: 'top 90%',
        toggleActions: 'play none none none'
      }
    });
  });
}

// ===== GALLERY IMAGE CLIP REVEAL =====
function initGalleryReveals() {
  document.querySelectorAll('.gallery__item').forEach(function(item) {
    gsap.from(item, {
      clipPath: 'inset(15% 0 15% 0)',
      opacity: 0,
      duration: 1.2,
      ease: 'power3.out',
      scrollTrigger: {
        trigger: item,
        start: 'top 85%',
        toggleActions: 'play none none none'
      }
    });
  });
}

// ===== QUOTE IMAGE REVEAL =====
function initQuoteImageReveal() {
  var quoteImg = document.querySelector('.quote__image');
  if (!quoteImg) return;

  gsap.from(quoteImg, {
    clipPath: 'inset(0 100% 0 0)',
    opacity: 0,
    duration: 1.2,
    ease: 'power3.inOut',
    scrollTrigger: {
      trigger: quoteImg,
      start: 'top 80%',
      toggleActions: 'play none none none'
    }
  });
}

// ===== SHOWCASE (Garden-inspired) =====
function initShowcase() {
  var showcaseImg = document.querySelector('.showcase__image');
  if (!showcaseImg) return;

  // Image clip-path reveal
  gsap.from(showcaseImg, {
    clipPath: 'inset(0 0 100% 0)',
    duration: 1.4,
    ease: 'power3.inOut',
    scrollTrigger: {
      trigger: showcaseImg,
      start: 'top 80%',
      toggleActions: 'play none none none'
    }
  });

  // Stagger in the divider line
  var divider = document.querySelector('.showcase__divider');
  if (divider) {
    gsap.from(divider, {
      scaleX: 0,
      transformOrigin: 'left',
      duration: 0.8,
      ease: 'power2.out',
      scrollTrigger: {
        trigger: divider,
        start: 'top 85%',
        toggleActions: 'play none none none'
      }
    });
  }
}

// ===== GALLERY CAROUSEL (3 visible) =====
function initGallerySlideshow() {
  var carousel = document.getElementById('galleryCarousel');
  if (!carousel) return;

  var track = carousel.querySelector('.gallery__track');
  var slides = carousel.querySelectorAll('.gallery__slide');
  var prevBtn = carousel.querySelector('.gallery__arrow--prev');
  var nextBtn = carousel.querySelector('.gallery__arrow--next');
  var current = 0;
  var total = slides.length;
  var autoInterval;

  function getVisible() {
    return window.innerWidth <= 768 ? 1 : 3;
  }

  function getSlideWidth() {
    var gap = 24; // 1.5rem
    var visible = getVisible();
    var containerWidth = carousel.offsetWidth;
    return (containerWidth - gap * (visible - 1)) / visible + gap;
  }

  function goTo(index) {
    var maxIndex = total - getVisible();
    if (maxIndex < 0) maxIndex = 0;
    current = Math.max(0, Math.min(index, maxIndex));
    track.style.transform = 'translateX(-' + (current * getSlideWidth()) + 'px)';
  }

  prevBtn.addEventListener('click', function() {
    goTo(current - 1);
    resetAuto();
  });

  nextBtn.addEventListener('click', function() {
    goTo(current + 1);
    resetAuto();
  });

  // Swipe support
  var startX = 0;
  track.addEventListener('touchstart', function(e) {
    startX = e.touches[0].clientX;
  }, { passive: true });

  track.addEventListener('touchend', function(e) {
    var diff = startX - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 50) {
      if (diff > 0) { goTo(current + 1); }
      else { goTo(current - 1); }
      resetAuto();
    }
  }, { passive: true });

  // Auto-advance every 4 seconds
  function resetAuto() {
    clearInterval(autoInterval);
    autoInterval = setInterval(function() {
      var maxIndex = total - getVisible();
      goTo(current >= maxIndex ? 0 : current + 1);
    }, 4000);
  }

  // Recalculate on resize
  window.addEventListener('resize', function() { goTo(current); });

  resetAuto();
}

// ===== INIT ALL ANIMATIONS =====
function initAnimations() {
  gsap.registerPlugin(ScrollTrigger);

  // Signal CSS that animations are ready — enables initial hidden states
  document.body.classList.add('animations-ready');

  // Each init wrapped in try/catch to prevent cascade failures
  var inits = [
    ['Hero', initHeroAnimation],
    ['TextReveals', initTextReveals],
    ['Reveals', initReveals],
    ['Parallax', initParallax],
    ['Connectors', initConnectors],
    ['NavScroll', initNavScroll],
    ['ServiceCards', initServiceCards],
    ['GalleryReveals', initGalleryReveals],
    ['QuoteImage', initQuoteImageReveal],
    ['Showcase', initShowcase],
    ['MagneticButtons', initMagneticButtons],
    ['GallerySlideshow', initGallerySlideshow]
  ];

  inits.forEach(function(pair) {
    try {
      pair[1]();
    } catch(e) {
      console.error('[Garden] ' + pair[0] + ' failed:', e);
    }
  });
}
