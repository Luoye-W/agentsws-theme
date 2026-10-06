/**
 * <aw-grid-density data-key data-default> — desktop column switch for a product grid (e.g. 2 / 3 / 4 per row).
 *
 * Children: <button data-cols="N" aria-pressed>. A click sets `--grid-cols: repeat(N, minmax(0, 1fr))` on the closest
 * [data-grid-root] (the section root, which is not replaced when filters re-render the grid, so the choice survives)
 * and remembers N in localStorage under "aw:grid-density:<data-key>", so every page of the same kind opens with it.
 * The grid uses the variable only from 990px up (lg:grid-cols-(--grid-cols)); smaller screens keep their own columns.
 */
import { ThemeElement, define } from '@aw/component';

class GridDensity extends ThemeElement {
  mount() {
    const stored = Number(readStorage(this.storageKey));
    if (stored && this.buttons.some((button) => Number(button.dataset.cols) === stored)) this.apply(stored);

    this.listen(this, 'click', (event) => {
      const button = /** @type {HTMLElement} */ (event.target).closest?.('button[data-cols]');
      if (!(button instanceof HTMLElement)) return;
      const cols = Number(button.dataset.cols);
      this.apply(cols);
      writeStorage(this.storageKey, String(cols));
    });
  }

  get storageKey() {
    return `aw:grid-density:${this.dataset.key ?? 'collection'}`;
  }

  /** @returns {HTMLElement[]} */
  get buttons() {
    return [...this.querySelectorAll('button[data-cols]')].map((el) => /** @type {HTMLElement} */ (el));
  }

  /** @param {number} cols */
  apply(cols) {
    const root = /** @type {HTMLElement | null} */ (this.closest('[data-grid-root]'));
    root?.style.setProperty('--grid-cols', `repeat(${cols}, minmax(0, 1fr))`);
    for (const button of this.buttons) button.setAttribute('aria-pressed', String(Number(button.dataset.cols) === cols));
  }
}

/** @param {string} key */
function readStorage(key) {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

/**
 * @param {string} key
 * @param {string} value
 */
function writeStorage(key, value) {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // Private mode or storage disabled: the choice lasts for this page only.
  }
}

define('aw-grid-density', GridDensity);
