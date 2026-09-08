/* Native scrolling; essential controls never wait for an animation library. */
(function() {
  'use strict';
  function boot() {
    var loader = document.getElementById('loader');
    if (loader) loader.hidden = true;
    [window.initGallerySlideshow, window.initForm, window.initTestimonials].forEach(function(init) {
      if (typeof init === 'function') init();
    });
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
