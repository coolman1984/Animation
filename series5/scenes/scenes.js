/* Marks a still page when the visitor asked for less motion. Other folders read html.is-reduced. */
(function () {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    document.documentElement.classList.add('is-reduced');
  }
})();
