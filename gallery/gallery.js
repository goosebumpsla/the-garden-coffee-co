(() => {
  const track = (name, details = {}) => {
    if (typeof window.fbq === 'function') window.fbq('trackCustom', name, details);
  };

  const cards = [...document.querySelectorAll('.g-card')];
  const filters = [...document.querySelectorAll('.g-filter')];

  const stopCard = (card) => {
    const video = card.querySelector('video');
    const button = card.querySelector('.g-play');
    if (!video || !button) return;
    video.pause();
    button.hidden = false;
    button.classList.remove('is-playing');
    button.innerHTML = '<span aria-hidden="true">▶</span> Play';
    button.setAttribute('aria-label', button.getAttribute('aria-label').replace(/^Pause/, 'Play'));
  };

  filters.forEach((button) => {
    button.addEventListener('click', () => {
      const selected = button.dataset.filter;
      filters.forEach((item) => {
        const active = item === button;
        item.classList.toggle('is-active', active);
        item.setAttribute('aria-pressed', String(active));
      });

      cards.forEach((card) => {
        const visible = selected === 'all' || card.dataset.category === selected;
        card.classList.toggle('is-hidden', !visible);
        if (!visible) stopCard(card);
      });
      track('GalleryFilter', { category: selected });
    });
  });

  document.querySelectorAll('.g-play').forEach((button) => {
    button.addEventListener('click', async () => {
      const card = button.closest('.g-card');
      const video = card.querySelector('video');
      const source = video.querySelector('source[data-src]');

      if (source) {
        source.src = source.dataset.src;
        source.removeAttribute('data-src');
        video.load();
      }

      if (video.paused) {
        document.querySelectorAll('.g-card video').forEach((other) => {
          if (other !== video) stopCard(other.closest('.g-card'));
        });
        try {
          await video.play();
          button.hidden = false;
          button.classList.add('is-playing');
          button.innerHTML = '<span aria-hidden="true">Ⅱ</span> Pause';
          button.setAttribute('aria-label', button.getAttribute('aria-label').replace(/^Play/, 'Pause'));
          track('GalleryVideoPlay', {
            category: card.dataset.category,
            title: card.querySelector('strong')?.textContent || 'Event video'
          });
        } catch (_) {
          button.hidden = false;
        }
      } else {
        stopCard(card);
      }
    });
  });

  document.querySelectorAll('[data-gallery-cta]').forEach((link) => {
    link.addEventListener('click', () => track('GalleryQuoteClick', { location: link.dataset.galleryCta }));
  });
})();
