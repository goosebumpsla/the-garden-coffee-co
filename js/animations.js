/* Manual gallery navigation only. No scroll hijacking or entrance animations. */
function initGallerySlideshow() {
  var carousel = document.getElementById('galleryCarousel');
  if (!carousel) return;

  var track = carousel.querySelector('.gallery__track');
  var slides = carousel.querySelectorAll('.gallery__slide');
  var prevBtn = carousel.querySelector('.gallery__arrow--prev');
  var nextBtn = carousel.querySelector('.gallery__arrow--next');
  var current = 0;
  var total = slides.length;

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

  });

  nextBtn.addEventListener('click', function() {
    goTo(current + 1);

  });

  // Swipe support
  var startX = 0;
  var startY = 0;
  track.addEventListener('touchstart', function(e) {
    startX = e.touches[0].clientX;
    startY = e.touches[0].clientY;
  }, { passive: true });

  track.addEventListener('touchend', function(e) {
    var diff = startX - e.changedTouches[0].clientX;
    var vertical = Math.abs(startY - e.changedTouches[0].clientY);
    if (Math.abs(diff) > 50 && Math.abs(diff) > vertical) {
      if (diff > 0) { goTo(current + 1); }
      else { goTo(current - 1); }

    }
  }, { passive: true });

  // Recalculate on resize
  window.addEventListener('resize', function() { goTo(current); });

}
