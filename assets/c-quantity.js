/**
 * <aw-quantity> — number input with − / + buttons. Buttons change the value within min/max/step and
 * fire a bubbling `change` event on the input, so forms and cart lines react the same way as typing.
 *
 * Markup: <aw-quantity><button data-ref="minus">…</button><input data-ref="input" type="number">…<button data-ref="plus">…</button></aw-quantity>
 */
import { ThemeElement, define } from '@aw/component';

class Quantity extends ThemeElement {
  mount() {
    const input = /** @type {HTMLInputElement | null} */ (this.ref('input'));
    if (!input) return;
    for (const [name, direction] of [['minus', -1], ['plus', 1]]) {
      const button = this.ref(/** @type {string} */ (name));
      if (!button) continue;
      this.listen(button, 'click', () => {
        const step = Number(input.step) || 1;
        const min = input.min === '' ? 0 : Number(input.min);
        const max = input.max === '' ? Infinity : Number(input.max);
        const next = Math.min(max, Math.max(min, (Number(input.value) || 0) + step * Number(direction)));
        if (String(next) === input.value) return;
        input.value = String(next);
        input.dispatchEvent(new Event('change', { bubbles: true }));
      });
    }
  }
}

define('aw-quantity', Quantity);
