/* Night opens the page. The control flips night and day. Nothing is saved, so a reload is night again. */
(function () {
  var night = document.getElementById('sky-night');
  var day = document.getElementById('sky-day');
  if (!night || !day) return;

  function sync() {
    var mode = day.checked ? 'day' : 'night';
    if (document.documentElement.dataset.sky !== mode) {
      document.documentElement.dataset.sky = mode;
    }
    var nightLabel = document.querySelector('label[for="sky-night"]');
    var dayLabel = document.querySelector('label[for="sky-day"]');
    if (nightLabel) nightLabel.setAttribute('aria-pressed', mode === 'night' ? 'true' : 'false');
    if (dayLabel) dayLabel.setAttribute('aria-pressed', mode === 'day' ? 'true' : 'false');
  }

  night.addEventListener('change', sync);
  day.addEventListener('change', sync);
  sync();
})();
