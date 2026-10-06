/**
 * <aw-lightbox data-counter="[index] of [count]"> — full-screen image viewer on a native modal <dialog>
 * (focus stays inside, Esc closes). Opened by <aw-gallery> with the list of images; the <img> is created here.
 *
 * Zoom: click / tap the image or press the zoom button (Enter / Space) to toggle 2.5×; mouse wheel and two-finger
 * pinch zoom between 1× and 4×; drag pans while zoomed; swipe or ← → change image when not zoomed; + / − keys zoom.
 * On close the callback receives the last shown index so the gallery can return focus to that image.
 */
import { ThemeElement, define } from '@aw/component';

const MAX_SCALE = 4;
const TAP_SCALE = 2.5;

class Lightbox extends ThemeElement {
  /** @type {{ src: string, srcset: string, alt: string }[]} */
  items = [];
  index = 0;
  scale = 1;
  x = 0;
  y = 0;
  /** @type {Map<number, { x: number, y: number }>} */
  pointers = new Map();
  /** @type {((index: number) => void) | null} */
  onClose = null;

  mount() {
    const dialog = this.dialog;
    const stage = this.ref('lb-stage');
    if (!dialog || !stage) return;
    if (!this.ref('lb-image')) {
      const image = document.createElement('img');
      image.dataset.ref = 'lb-image';
      image.className = 'absolute inset-0 size-full origin-top-left object-contain';
      image.sizes = '100vw';
      image.alt = '';
      image.draggable = false;
      stage.append(image);
    }

    const close = this.ref('lb-close');
    const zoom = this.ref('lb-zoom');
    const prev = this.ref('lb-prev');
    const next = this.ref('lb-next');
    if (close) this.listen(close, 'click', () => dialog.close());
    if (zoom) this.listen(zoom, 'click', () => this.toggleZoom());
    if (prev) this.listen(prev, 'click', () => this.show(this.index - 1));
    if (next) this.listen(next, 'click', () => this.show(this.index + 1));

    this.listen(dialog, 'close', () => {
      // Keep the scroll lock when another modal (the quick view window) is still open underneath.
      if (!document.querySelector('dialog[open]')) document.documentElement.style.removeProperty('overflow');
      this.reset();
      this.onClose?.(this.index);
    });

    this.listen(dialog, 'keydown', (event) => {
      const key = /** @type {KeyboardEvent} */ (event).key;
      const forward = document.dir === 'rtl' ? 'ArrowLeft' : 'ArrowRight';
      const back = document.dir === 'rtl' ? 'ArrowRight' : 'ArrowLeft';
      if (key === forward && this.scale === 1) this.show(this.index + 1);
      else if (key === back && this.scale === 1) this.show(this.index - 1);
      else if (key === '+' || key === '=') this.zoomAt(Math.min(MAX_SCALE, this.scale * 1.5));
      else if (key === '-') this.zoomAt(Math.max(1, this.scale / 1.5));
      else return;
      event.preventDefault();
    });

    this.listen(stage, 'wheel', (event) => {
      const wheel = /** @type {WheelEvent} */ (event);
      wheel.preventDefault();
      const factor = Math.exp(-wheel.deltaY * 0.002);
      this.zoomAt(Math.min(MAX_SCALE, Math.max(1, this.scale * factor)), this.point(wheel));
    }, { passive: false });

    this.setupPointers(stage);
  }

  /** @returns {HTMLDialogElement | null} */
  get dialog() {
    return /** @type {HTMLDialogElement | null} */ (this.ref('lb-dialog'));
  }

  /**
   * @param {{ src: string, srcset: string, alt: string }[]} items
   * @param {number} index
   * @param {(index: number) => void} [onClose]
   */
  open(items, index, onClose) {
    const dialog = this.dialog;
    if (!dialog || dialog.open || !items.length) return;
    this.items = items;
    this.onClose = onClose ?? null;
    this.show(index);
    document.documentElement.style.overflow = 'hidden';
    dialog.showModal();
  }

  /** @param {number} index */
  show(index) {
    const count = this.items.length;
    if (!count) return;
    this.index = (index + count) % count;
    const item = this.items[this.index];
    const image = /** @type {HTMLImageElement | null} */ (this.ref('lb-image'));
    if (image) {
      image.srcset = item.srcset;
      image.src = item.src;
      image.alt = item.alt;
    }
    this.reset();
    const status = this.ref('lb-status');
    if (status) {
      status.textContent = (this.dataset.counter ?? '[index] / [count]')
        .replace('[index]', String(this.index + 1))
        .replace('[count]', String(count));
    }
  }

  toggleZoom() {
    this.zoomAt(this.scale > 1 ? 1 : TAP_SCALE);
  }

  /**
   * Zoom to `scale` keeping `origin` (stage coordinates, default: centre) under the pointer.
   * @param {number} scale
   * @param {{ x: number, y: number }} [origin]
   */
  zoomAt(scale, origin) {
    const stage = /** @type {HTMLElement} */ (this.ref('lb-stage'));
    const p = origin ?? { x: stage.clientWidth / 2, y: stage.clientHeight / 2 };
    const ratio = scale / this.scale;
    this.x = p.x - (p.x - this.x) * ratio;
    this.y = p.y - (p.y - this.y) * ratio;
    this.scale = scale;
    this.apply();
  }

  reset() {
    this.scale = 1;
    this.x = 0;
    this.y = 0;
    this.apply();
  }

  /** Clamp the pan so the image never leaves the stage, then paint. */
  apply() {
    const stage = this.ref('lb-stage');
    const image = this.ref('lb-image');
    if (!stage || !image) return;
    if (this.scale <= 1) {
      this.scale = 1;
      this.x = 0;
      this.y = 0;
    }
    const w = stage.clientWidth;
    const h = stage.clientHeight;
    this.x = Math.min(0, Math.max(w - w * this.scale, this.x));
    this.y = Math.min(0, Math.max(h - h * this.scale, this.y));
    image.style.transform = this.scale === 1 ? '' : `translate(${this.x}px, ${this.y}px) scale(${this.scale})`;
    stage.toggleAttribute('data-zoomed', this.scale > 1);
    this.ref('lb-zoom')?.setAttribute('aria-pressed', String(this.scale > 1));
  }

  /**
   * Pointer position relative to the stage.
   * @param {{ clientX: number, clientY: number }} event
   */
  point(event) {
    const box = /** @type {HTMLElement} */ (this.ref('lb-stage')).getBoundingClientRect();
    return { x: event.clientX - box.left, y: event.clientY - box.top };
  }

  /** @param {HTMLElement} stage */
  setupPointers(stage) {
    /** @type {{ x: number, y: number, panX: number, panY: number, moved: boolean, distance: number, scale: number } | null} */
    let start = null;

    this.listen(stage, 'pointerdown', (event) => {
      const e = /** @type {PointerEvent} */ (event);
      stage.setPointerCapture(e.pointerId);
      this.pointers.set(e.pointerId, this.point(e));
      const [a, b] = [...this.pointers.values()];
      start = {
        x: a.x, y: a.y, panX: this.x, panY: this.y, moved: false, scale: this.scale,
        distance: b ? Math.hypot(a.x - b.x, a.y - b.y) : 0,
      };
    });

    this.listen(stage, 'pointermove', (event) => {
      const e = /** @type {PointerEvent} */ (event);
      if (!start || !this.pointers.has(e.pointerId)) return;
      this.pointers.set(e.pointerId, this.point(e));
      const [a, b] = [...this.pointers.values()];
      if (b && start.distance) {
        // Pinch: scale around the midpoint of both fingers.
        const scale = Math.min(MAX_SCALE, Math.max(1, start.scale * (Math.hypot(a.x - b.x, a.y - b.y) / start.distance)));
        this.zoomAt(scale, { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });
        start.moved = true;
        return;
      }
      const dx = a.x - start.x;
      const dy = a.y - start.y;
      if (Math.hypot(dx, dy) > 6) start.moved = true;
      if (this.scale > 1) {
        this.x = start.panX + dx;
        this.y = start.panY + dy;
        this.apply();
      }
    });

    const end = (/** @type {Event} */ event) => {
      const e = /** @type {PointerEvent} */ (event);
      if (!this.pointers.has(e.pointerId)) return;
      const last = this.pointers.get(e.pointerId) ?? this.point(e);
      this.pointers.delete(e.pointerId);
      if (!start) return;
      if (this.pointers.size > 0) {
        // One finger of a pinch lifted: continue as a pan from the remaining finger.
        const [rest] = [...this.pointers.values()];
        start = { x: rest.x, y: rest.y, panX: this.x, panY: this.y, moved: true, scale: this.scale, distance: 0 };
        return;
      }
      const dx = last.x - start.x;
      if (!start.moved && e.type === 'pointerup') {
        this.zoomAt(this.scale > 1 ? 1 : TAP_SCALE, last);
      } else if (this.scale === 1 && Math.abs(dx) > 50 && this.items.length > 1) {
        const forward = document.dir === 'rtl' ? dx > 0 : dx < 0;
        this.show(this.index + (forward ? 1 : -1));
      }
      start = null;
    };
    this.listen(stage, 'pointerup', end);
    this.listen(stage, 'pointercancel', end);
  }
}

define('aw-lightbox', Lightbox);
