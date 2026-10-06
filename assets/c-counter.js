/**
 * <aw-counter data-duration="2"> — counts the number inside it up from zero the first time it scrolls into view.
 *
 * Markup:
 *   <aw-counter data-duration="2">
 *     <span data-ref="display" aria-hidden="true">150K+</span>   ← animated copy (hidden from screen readers)
 *     <span class="sr-only">150K+</span>                          ← final value for assistive technology
 *   </aw-counter>
 *
 * The text is split into prefix, number and suffix, so "$1,234.50", "150K+", "4.8/5", "95%" and "1.234.567"
 * all count correctly while keeping their symbols, decimals and thousands separators. Text without digits
 * is left alone. Reduced motion shows the final value. Each counter runs once.
 */
import { ThemeElement, define } from '@aw/component';

/**
 * Split display text into its parts. Returns null when there is nothing to count.
 * @param {string} text
 * @returns {{ prefix: string, suffix: string, value: number, decimals: number, group: string, decimal: string } | null}
 */
export function parseNumber(text) {
  const match = text.match(/\d[\d.,  ' ]*/);
  if (!match || match.index === undefined) return null;
  const raw = match[0].replace(/[^\d]+$/, '');
  const prefix = text.slice(0, match.index);
  const suffix = text.slice(match.index + raw.length);

  const separators = raw.match(/[^\d]/g) ?? [];
  let decimal = '';
  let group = '';
  if (separators.length) {
    const last = separators[separators.length - 1];
    const lastIndex = raw.lastIndexOf(last);
    const digitsAfter = raw.length - lastIndex - 1;
    const distinct = [...new Set(separators)];
    if (distinct.length > 1) {
      // "1,234.5" or "1.234,5": the last separator is the decimal mark.
      decimal = last;
      group = distinct.find((s) => s !== last) ?? '';
    } else if (separators.length === 1 && digitsAfter !== 3 && (last === '.' || last === ',')) {
      // "4.8", "12,5": one mark not followed by exactly three digits is a decimal mark.
      decimal = last;
    } else {
      // "1,234", "1.234.567", "10 000": thousands separators only.
      group = last;
    }
  }

  let integerPart = raw;
  let fraction = '';
  if (decimal) {
    const at = raw.lastIndexOf(decimal);
    integerPart = raw.slice(0, at);
    fraction = raw.slice(at + 1);
  }
  const digits = integerPart.replace(/[^\d]/g, '');
  const value = Number(`${digits}.${fraction || '0'}`);
  if (!Number.isFinite(value)) return null;
  return { prefix, suffix, value, decimals: fraction.length, group, decimal };
}

/**
 * Format a number the same way the original text was written.
 * @param {number} value
 * @param {{ decimals: number, group: string, decimal: string }} format
 */
export function formatNumber(value, { decimals, group, decimal }) {
  const [integer, fraction = ''] = value.toFixed(decimals).split('.');
  const grouped = group ? integer.replace(/\B(?=(\d{3})+(?!\d))/g, group) : integer;
  return fraction ? `${grouped}${decimal || '.'}${fraction}` : grouped;
}

class Counter extends ThemeElement {
  mount() {
    const display = this.ref('display');
    if (!display || this.dataset.done) return;
    this.finalText = display.textContent ?? '';
    this.parsed = parseNumber(this.finalText);
    if (!this.parsed || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    display.textContent = this.compose(0);
    this.observer = new IntersectionObserver((entries) => {
      if (!entries.some((entry) => entry.isIntersecting)) return;
      this.observer?.disconnect();
      this.run();
    }, { threshold: 0.4 });
    this.observer.observe(this);
  }

  unmount() {
    this.observer?.disconnect();
    cancelAnimationFrame(this.frame ?? 0);
    const display = this.ref('display');
    if (display && this.finalText !== undefined) display.textContent = this.finalText;
  }

  /** @param {number} value */
  compose(value) {
    const p = this.parsed;
    if (!p) return this.finalText ?? '';
    return `${p.prefix}${formatNumber(value, p)}${p.suffix}`;
  }

  run() {
    const display = this.ref('display');
    const p = this.parsed;
    if (!display || !p) return;
    const duration = Math.min(Math.max(Number(this.dataset.duration) || 2, 0.5), 5) * 1000;
    const start = performance.now();
    const step = (/** @type {number} */ now) => {
      const t = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      if (t < 1) {
        display.textContent = this.compose(p.value * eased);
        this.frame = requestAnimationFrame(step);
      } else {
        display.textContent = this.finalText ?? '';
        this.dataset.done = 'true';
      }
    };
    this.frame = requestAnimationFrame(step);
  }
}

define('aw-counter', Counter);
