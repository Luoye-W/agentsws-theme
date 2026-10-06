/**
 * <aw-image-comparison data-direction="horizontal|vertical" data-value-text="Before [before]%, after [after]%">
 * Before/after divider. The source of truth is a visually hidden <input type="range" data-ref="input">:
 * keyboard (arrows, Home/End, Page Up/Down) and screen readers use it directly. Mouse and touch drag anywhere
 * on the image (horizontal mode keeps vertical page scrolling on touch). The position is written to --pos,
 * measured from the left (horizontal) or top (vertical) edge; RTL pages mirror the horizontal value.
 * While dragging, data-dragging is set so labels can fade out.
 */
import { ThemeElement, define } from '@aw/component';

class ImageComparison extends ThemeElement {
  mount() {
    const input = /** @type {HTMLInputElement | null} */ (this.ref('input'));
    if (!input) return;
    this.input = input;
    this.vertical = this.dataset.direction === 'vertical';

    this.listen(input, 'input', () => this.update());
    if (this.vertical) {
      // Up moves the divider up, Down moves it down (a plain range input does the opposite).
      this.listen(input, 'keydown', (event) => {
        const key = /** @type {KeyboardEvent} */ (event).key;
        if (key !== 'ArrowUp' && key !== 'ArrowDown') return;
        event.preventDefault();
        this.setValue(Number(input.value) + (key === 'ArrowDown' ? 1 : -1));
      });
    }

    // Touch: the divider follows only once the finger moves along the slider axis (touch-action lets the page
    // scroll on the other axis, which cancels the pointer), so scrolling past the image never moves it.
    this.listen(this, 'pointerdown', (event) => {
      const pointer = /** @type {PointerEvent} */ (event);
      if (pointer.button !== 0) return;
      this.dragging = true;
      this.setPointerCapture(pointer.pointerId);
      if (pointer.pointerType === 'touch') return;
      this.toggleAttribute('data-dragging', true);
      this.fromPointer(pointer);
    });
    this.listen(this, 'pointermove', (event) => {
      if (!this.dragging) return;
      this.toggleAttribute('data-dragging', true);
      this.fromPointer(/** @type {PointerEvent} */ (event));
    });
    this.listen(this, 'pointerup', (event) => {
      if (this.dragging) this.fromPointer(/** @type {PointerEvent} */ (event));
      this.stopDrag();
    });
    this.listen(this, 'pointercancel', () => this.stopDrag());
    this.listen(this, 'lostpointercapture', () => this.stopDrag());

    this.update();
  }

  stopDrag() {
    this.dragging = false;
    this.removeAttribute('data-dragging');
  }

  get rtl() {
    return !this.vertical && getComputedStyle(this).direction === 'rtl';
  }

  /** @param {PointerEvent} event */
  fromPointer(event) {
    const rect = this.getBoundingClientRect();
    let ratio = this.vertical ? (event.clientY - rect.top) / rect.height : (event.clientX - rect.left) / rect.width;
    if (this.rtl) ratio = 1 - ratio;
    this.setValue(Math.round(ratio * 100));
  }

  /** @param {number} value */
  setValue(value) {
    if (!this.input) return;
    this.input.value = String(Math.min(100, Math.max(0, value)));
    this.update();
  }

  update() {
    if (!this.input) return;
    const value = Number(this.input.value);
    const position = this.rtl ? 100 - value : value;
    this.style.setProperty('--pos', `${position}%`);
    const template = this.dataset.valueText;
    if (template) {
      this.input.setAttribute('aria-valuetext', template.replace('[before]', String(value)).replace('[after]', String(100 - value)));
    }
  }
}

define('aw-image-comparison', ImageComparison);
