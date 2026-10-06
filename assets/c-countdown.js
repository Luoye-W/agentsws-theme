/**
 * <aw-countdown data-end="1767225600" data-when-ended="message|hide|hide-section"> — days / hours / minutes / seconds
 * until a real deadline (Unix seconds, worked out in Liquid from the date and time the merchant typed, in the
 * store's time zone). snippets/countdown-timer.liquid renders the markup.
 *
 * Refs: timer (hidden from screen readers), days, hours, minutes, seconds, days-unit (hidden when 0 days left),
 * ended (message shown after the deadline). A static sentence with the end date is the accessible text,
 * so screen readers are not interrupted every second.
 *
 * When the deadline passes: the timer hides and the ended message shows; with data-when-ended="hide" the element
 * hides, with "hide-section" the whole section hides. Emits aw:countdown:ended once.
 */
import { ThemeElement, define } from '@aw/component';
import { emit, ThemeEvents } from '@aw/events';

/** @param {number} value */
const pad = (value) => String(value).padStart(2, '0');

class Countdown extends ThemeElement {
  mount() {
    this.end = Number(this.dataset.end) * 1000;
    if (!Number.isFinite(this.end) || this.end <= 0) return;
    this.tick();
  }

  unmount() {
    clearTimeout(this.timeout);
  }

  tick() {
    const remaining = this.end - Date.now();
    if (remaining <= 0) {
      this.finish();
      return;
    }

    const total = Math.floor(remaining / 1000);
    const days = Math.floor(total / 86400);
    const hours = Math.floor((total % 86400) / 3600);
    const minutes = Math.floor((total % 3600) / 60);
    const seconds = total % 60;

    this.set('days', String(days));
    this.set('hours', pad(hours));
    this.set('minutes', pad(minutes));
    this.set('seconds', pad(seconds));
    const daysUnit = this.ref('days-unit');
    if (daysUnit) daysUnit.hidden = days === 0;

    // Wake up just after the next whole second.
    this.timeout = setTimeout(() => this.tick(), (remaining % 1000) + 20);
  }

  /**
   * @param {string} name
   * @param {string} value
   */
  set(name, value) {
    const el = this.ref(name);
    if (el && el.textContent !== value) el.textContent = value;
  }

  finish() {
    const timer = this.ref('timer');
    if (timer) timer.hidden = true;
    const label = this.ref('label');
    if (label) label.hidden = true;
    const ended = this.ref('ended');
    const mode = this.dataset.whenEnded;
    if (mode === 'hide-section') {
      /** @type {HTMLElement | null} */ (this.closest('.shopify-section'))?.setAttribute('hidden', '');
    } else if (mode === 'hide' || !ended) {
      this.hidden = true;
    } else {
      ended.hidden = false;
    }
    if (!this.dataset.ended) {
      this.dataset.ended = 'true';
      emit(ThemeEvents.countdownEnded, { id: this.id, end: this.end });
    }
  }
}

define('aw-countdown', Countdown);
