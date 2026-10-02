// MindMate — horizontal chip/tab rows: edge fade, tap-to-centre, mouse drag-to-scroll.
// Works for rows that exist on load and rows filled in later (e.g. the date strip).
(function () {
  const SELECTOR = '.filter-pills, .filter-mood-chips, .time-range-tabs, .date-strip, .mood-selector-buttons, [data-scroll-row]';
  const CHIP = 'button, [role="tab"], .pill-btn, .tab-chip, .mood-choice, .date-chip';

  function updateFade(row) {
    const max = row.scrollWidth - row.clientWidth;
    row.classList.toggle('fade-start', row.scrollLeft > 2);
    row.classList.toggle('fade-end', max > 2 && row.scrollLeft < max - 2);
  }

  // Centre a chip inside its row without moving the page vertically.
  function centre(row, chip, smooth = true) {
    const left = chip.offsetLeft - (row.clientWidth - chip.offsetWidth) / 2;
    row.scrollTo({ left: Math.max(0, left), behavior: smooth ? 'smooth' : 'auto' });
  }

  function enhance(row) {
    if (row.classList.contains('is-scroll-row')) return;
    row.classList.add('is-scroll-row');
    updateFade(row);
    row.addEventListener('scroll', () => updateFade(row), { passive: true });

    // Tap: bring the selected chip into view (runs after the app's own click handler).
    row.addEventListener('click', e => {
      const chip = e.target.closest(CHIP);
      if (chip && row.contains(chip)) setTimeout(() => centre(row, chip), 0);
    });

    // Mouse drag-to-scroll (touch and trackpad already scroll natively).
    let startX = 0, startLeft = 0, moved = false, down = false;
    row.addEventListener('pointerdown', e => {
      if (e.pointerType !== 'mouse' || e.button !== 0) return;
      down = true; moved = false; startX = e.clientX; startLeft = row.scrollLeft;
    });
    window.addEventListener('pointermove', e => {
      if (!down) return;
      const dx = e.clientX - startX;
      if (!moved && Math.abs(dx) > 5) { moved = true; row.classList.add('dragging'); }
      if (moved) row.scrollLeft = startLeft - dx;
    });
    window.addEventListener('pointerup', () => {
      if (!down) return;
      down = false;
      if (moved) {
        // Swallow the click that follows a drag so it doesn't select a chip.
        const stop = ev => { ev.stopPropagation(); ev.preventDefault(); };
        row.addEventListener('click', stop, { capture: true, once: true });
        setTimeout(() => row.removeEventListener('click', stop, { capture: true }), 50);
      }
      row.classList.remove('dragging');
    });

    // Re-check the fade when chips are added/removed or the row is resized.
    new MutationObserver(() => {
      updateFade(row);
      const active = row.querySelector('.active, [aria-selected="true"]');
      if (active) centre(row, active, false);
    }).observe(row, { childList: true });
    if ('ResizeObserver' in window) new ResizeObserver(() => updateFade(row)).observe(row);
  }

  function scan() { document.querySelectorAll(SELECTOR).forEach(enhance); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', scan); else scan();
  window.addEventListener('load', scan);
  window.addEventListener('resize', () => document.querySelectorAll('.is-scroll-row').forEach(updateFade));
  window.MindMateScrollRows = { scan };
})();
