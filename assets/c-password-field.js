/**
 * <aw-password-field data-show="Show" data-hide="Hide"> — adds a Show / Hide button to a password input.
 *
 * Markup (snippets/account-field.liquid):
 *   <aw-password-field data-show="…" data-hide="…">
 *     <input type="password" data-ref="input">
 *     <button type="button" data-ref="toggle" aria-controls="…" hidden>Show</button>
 *   </aw-password-field>
 * The button stays hidden without JavaScript. Its text says what the next click does, so no aria-pressed is needed.
 */
import { ThemeElement, define } from '@aw/component';

class PasswordField extends ThemeElement {
  mount() {
    const input = /** @type {HTMLInputElement | null} */ (this.ref('input'));
    const toggle = this.ref('toggle');
    if (!input || !toggle) return;

    toggle.hidden = false;
    this.listen(toggle, 'click', () => {
      const visible = input.type === 'text';
      input.type = visible ? 'password' : 'text';
      toggle.textContent = (visible ? this.dataset.show : this.dataset.hide) ?? '';
      input.focus({ preventScroll: true });
    });
  }
}

define('aw-password-field', PasswordField);
