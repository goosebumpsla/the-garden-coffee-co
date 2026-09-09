(() => {
  const video = document.querySelector('.service-card__video');
  const toggle = document.querySelector('.services__motion');
  if (!video || !toggle) return;
  const motion = matchMedia('(prefers-reduced-motion: no-preference)');
  let visible = false;
  let paused = false;
  function update() {
    toggle.hidden = !motion.matches;
    toggle.textContent = paused ? 'Play video' : 'Pause video';
    if (visible && !paused && motion.matches && !document.hidden) {
      const source = video.querySelector('source[data-src]');
      if (source) { source.src = source.dataset.src; source.removeAttribute('data-src'); video.load(); }
      video.muted = true;
      video.play().catch(() => {});
    } else video.pause();
  }
  new IntersectionObserver(entries => { visible = entries[0].isIntersecting; update(); }, { threshold: 0.15 }).observe(video);
  toggle.addEventListener('click', () => { paused = !paused; update(); });
  motion.addEventListener('change', update);
  document.addEventListener('visibilitychange', update);
})();
