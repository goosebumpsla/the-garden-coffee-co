(function() {
  var menu = document.querySelector('.site-menu');
  if (!menu) return;
  function closeMenu() { menu.open = false; }
  menu.querySelectorAll('a').forEach(function(link) { link.addEventListener('click', closeMenu); });
  document.addEventListener('click', function(event) { if (!menu.contains(event.target)) closeMenu(); });
  document.addEventListener('keydown', function(event) {
    if (event.key === 'Escape' && menu.open) {
      closeMenu();
      menu.querySelector('summary').focus();
    }
  });
})();
