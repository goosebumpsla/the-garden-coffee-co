(() => {
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const saveData = navigator.connection?.saveData;

  const track = (name, details = {}) => {
    if (typeof window.fbq === 'function') window.fbq('trackCustom', name, details);
  };

  const loadVideo = (video) => {
    const source = video.querySelector('source[data-src]');
    if (!source) return;
    source.src = source.dataset.src;
    source.removeAttribute('data-src');
    video.load();
  };

  const setButtonState = (video, playing) => {
    const button = video.closest('.g-media')?.querySelector('.g-video-toggle');
    if (!button) return;
    button.textContent = playing ? 'Pause' : 'Play';
    button.setAttribute('aria-label', `${playing ? 'Pause' : 'Play'} ${video.getAttribute('aria-label')}`);
  };

  const videos = [...document.querySelectorAll('.g-story-video')];

  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(async (entry) => {
        const video = entry.target;
        if (entry.isIntersecting) {
          loadVideo(video);
          if (!reducedMotion && !saveData) {
            try {
              await video.play();
              setButtonState(video, true);
            } catch (_) {
              setButtonState(video, false);
            }
          } else {
            setButtonState(video, false);
          }
        } else {
          video.pause();
          setButtonState(video, false);
        }
      });
    }, { rootMargin: '160px 0px', threshold: .2 });

    videos.forEach((video) => observer.observe(video));
  } else {
    videos.forEach(loadVideo);
  }

  document.querySelectorAll('.g-video-toggle').forEach((button) => {
    button.addEventListener('click', async () => {
      const video = button.closest('.g-media').querySelector('video');
      loadVideo(video);
      if (video.paused) {
        try {
          await video.play();
          setButtonState(video, true);
          track('GalleryVideoPlay', { title: video.getAttribute('aria-label') });
        } catch (_) {
          setButtonState(video, false);
        }
      } else {
        video.pause();
        setButtonState(video, false);
      }
    });
  });

  document.querySelectorAll('[data-gallery-cta]').forEach((link) => {
    link.addEventListener('click', () => track('GalleryQuoteClick', { location: link.dataset.galleryCta }));
  });
})();
