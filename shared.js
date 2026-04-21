// =========================================================================
// Ascent — shared site script
// Tiny, vanilla, no dependencies. Loaded by every page.
// =========================================================================

(function() {
  'use strict';

  // Nav scroll state — compact + border-bottom once user scrolls
  const nav = document.getElementById('nav');
  if (nav) {
    let lastScroll = 0;
    const onScroll = () => {
      const y = window.scrollY || window.pageYOffset;
      if (y > 12) {
        nav.classList.add('scrolled');
      } else {
        nav.classList.remove('scrolled');
      }
      lastScroll = y;
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  // Scroll reveal — IntersectionObserver pattern
  if ('IntersectionObserver' in window) {
    const targets = document.querySelectorAll('[data-reveal]');
    if (targets.length) {
      const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            entry.target.classList.add('in-view');
            observer.unobserve(entry.target);
          }
        });
      }, {
        rootMargin: '0px 0px -8% 0px',
        threshold: 0.08
      });
      targets.forEach(el => observer.observe(el));
    }
  } else {
    // No observer support — just show everything
    document.querySelectorAll('[data-reveal]').forEach(el => el.classList.add('in-view'));
  }
})();