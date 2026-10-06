/**
 * <aw-scrolling-images data-speed="40" data-direction="left|right"> — endless sideways row (marquee).
 *
 * The server renders one set of tiles in [data-ref=track]. When motion is allowed this element appends enough
 * copies (aria-hidden + inert, so screen readers and keyboard users meet each tile once) to fill the screen,
 * measures one set, and runs a CSS animation over exactly that distance (data-running, --marquee-distance,
 * --marquee-duration from the speed in px/s). The animation pauses on hover / focus (CSS), with the pause
 * button ([data-ref=toggle] → data-paused) and while the row is off screen (data-offscreen).
 * With prefers-reduced-motion nothing is cloned: the row stays a static strip shoppers can swipe.
 *
 * Twin rows ([data-ref=twin] > [data-ref=twin-track], optional): a second, decorative row filled with copies of the
 * tiles in reverse order, moving the other way (CSS). The whole row is aria-hidden + inert, and stays hidden with
 * reduced motion or without JavaScript.
 */
import { ThemeElement, define } from '@aw/component';

const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

class ScrollingImages extends ThemeElement {
  mount() {
    this.track = /** @type {HTMLElement | null} */ (this.ref('track'));
    this.viewport = /** @type {HTMLElement | null} */ (this.ref('viewport'));
    if (!this.track || !this.viewport) return;
    this.originals = /** @type {HTMLElement[]} */ ([...this.track.children]);
    if (!this.originals.length) return;

    const toggle = this.ref('toggle');
    if (toggle) this.listen(toggle, 'click', () => this.setPaused(!this.hasAttribute('data-paused')));

    this.observer = new IntersectionObserver(([entry]) => this.toggleAttribute('data-offscreen', !entry.isIntersecting));
    this.observer.observe(this);

    this.resizeObserver = new ResizeObserver(() => this.setup());
    this.resizeObserver.observe(this.viewport);
    this.listen(reducedMotion, 'change', () => this.setup());

    this.listen(document, 'shopify:block:select', (event) => {
      if (this.contains(/** @type {Node} */ (event.target))) this.setPaused(true);
    });
  }

  unmount() {
    this.observer?.disconnect();
    this.resizeObserver?.disconnect();
  }

  /** (Re)build the copies and animation for the current width. */
  setup() {
    const track = this.track;
    const viewport = this.viewport;
    if (!track || !viewport) return;
    for (const clone of track.querySelectorAll('[data-clone]')) clone.remove();
    const toggle = this.ref('toggle');
    const twin = this.ref('twin');
    const twinTrack = this.ref('twin-track');
    twinTrack?.replaceChildren();

    if (reducedMotion.matches) {
      this.removeAttribute('data-running');
      toggle?.setAttribute('hidden', '');
      twin?.setAttribute('hidden', '');
      return;
    }

    // One set = all original tiles plus the gap after each, i.e. the distance to where the first copy starts.
    const gap = parseFloat(getComputedStyle(track).columnGap) || 0;
    const originalsWidth = this.originals.reduce((sum, el) => sum + el.getBoundingClientRect().width, 0) + gap * this.originals.length;
    const copies = Math.max(1, Math.ceil(viewport.clientWidth / Math.max(originalsWidth, 1)));
    for (let i = 0; i < copies; i += 1) {
      for (const original of this.originals ?? []) track.append(copyTile(original));
    }
    // The twin row holds the same tiles (reversed) as many times as the main row: set + copies. Same set width,
    // so the same distance and duration apply; CSS runs it in the opposite direction.
    if (twin && twinTrack) {
      const reversed = [...(this.originals ?? [])].reverse();
      for (let i = 0; i <= copies; i += 1) {
        for (const original of reversed) twinTrack.append(copyTile(original, 'div'));
      }
      twin.removeAttribute('hidden');
    }

    const rtl = getComputedStyle(this).direction === 'rtl';
    const speed = Math.max(Number(this.dataset.speed) || 40, 1);
    this.style.setProperty('--marquee-distance', `${rtl ? originalsWidth : -originalsWidth}px`);
    this.style.setProperty('--marquee-duration', `${(originalsWidth / speed).toFixed(2)}s`);
    this.toggleAttribute('data-running', true);
    toggle?.removeAttribute('hidden');
  }

  /** @param {boolean} paused */
  setPaused(paused) {
    this.toggleAttribute('data-paused', paused);
    const toggle = this.ref('toggle');
    if (!toggle) return;
    toggle.toggleAttribute('data-playing', !paused);
    const label = paused ? this.dataset.labelPlay : this.dataset.labelPause;
    if (label) toggle.setAttribute('aria-label', label);
  }
}

/**
 * A decorative copy of a tile: hidden from assistive tech, not focusable, no ids or theme-editor hooks.
 * @param {HTMLElement} original
 * @param {string} [tag] - Re-wrap the copy in this element (the twin row is not a list, so no <li>).
 * @returns {HTMLElement}
 */
function copyTile(original, tag) {
  let clone = /** @type {HTMLElement} */ (original.cloneNode(true));
  if (tag) {
    const wrapper = document.createElement(tag);
    wrapper.className = clone.className;
    wrapper.setAttribute('style', clone.getAttribute('style') ?? '');
    wrapper.append(...clone.childNodes);
    clone = wrapper;
  }
  clone.setAttribute('data-clone', '');
  clone.setAttribute('aria-hidden', 'true');
  clone.inert = true;
  clone.removeAttribute('data-shopify-editor-block');
  for (const el of clone.querySelectorAll('[id]')) el.removeAttribute('id');
  return clone;
}

define('aw-scrolling-images', ScrollingImages);
