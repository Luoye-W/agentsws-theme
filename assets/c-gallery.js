/**
 * <aw-gallery data-section data-counter [data-video-autoplay] [data-video-loop] [data-zoom-mode="hover"] [data-natural]>
 * — product media viewer (snippets/product-gallery.liquid).
 *
 * - A scroll-snap track (swipe on touch, arrow buttons and ← → keys on desktop) with thumbnails and/or dots.
 *   In the desktop grid / stack / featured layouts the track simply stops scrolling and the same code keeps working.
 * - Thumbnail strips: the current thumbnail is scrolled into the middle of the strip; the strip fades (with small
 *   arrow buttons for the mouse) at an end that has more thumbnails to scroll to.
 * - Keeps showing the same slide when the width changes (rotating a phone, resizing a window).
 * - data-natural (each image its own shape): the slider takes the height of the current slide.
 * - Image buttons (data-ref="zoom") open the full-screen <aw-lightbox>; closing it returns to the same image.
 *   data-zoom-mode="hover": with a mouse, a click shows a 2× copy that follows the pointer (click again or leave to
 *   close); touch screens and keyboard still open the full-screen viewer. data-ref="zoom-button" (phones) opens it too.
 * - Uploaded videos play muted while at least 60% visible when data-video-autoplay is set (never with reduced
 *   motion); the video that leaves the view is paused. data-video-loop loops them.
 * - Follows `aw:variant:changed` to show the chosen variant's image.
 */
import { ThemeElement, define } from '@aw/component';
import { ThemeEvents } from '@aw/events';

const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const isRtl = () => document.dir === 'rtl' || document.documentElement.dir === 'rtl';

class Gallery extends ThemeElement {
  mount() {
    const track = this.ref('track');
    if (!track) return;
    this.slides = /** @type {HTMLElement[]} */ (this.refs('slide'));
    this.thumbs = /** @type {HTMLButtonElement[]} */ (this.refs('thumb'));
    this.dots = /** @type {HTMLElement[]} */ ([...(this.ref('dots')?.children ?? [])]);
    this.index = 0;
    this.lockUntil = 0;

    for (const thumb of this.thumbs) {
      this.listen(thumb, 'click', () => this.go(Number(thumb.dataset.index)));
    }
    const prev = this.ref('prev');
    const next = this.ref('next');
    if (prev) this.listen(prev, 'click', () => this.go(this.index - 1));
    if (next) this.listen(next, 'click', () => this.go(this.index + 1));

    this.listen(track, 'keydown', (event) => {
      const key = /** @type {KeyboardEvent} */ (event).key;
      if (event.target !== track || track.scrollWidth <= track.clientWidth) return;
      const forward = isRtl() ? 'ArrowLeft' : 'ArrowRight';
      const back = isRtl() ? 'ArrowRight' : 'ArrowLeft';
      if (key !== forward && key !== back) return;
      event.preventDefault();
      this.go(this.index + (key === forward ? 1 : -1));
    });

    this.observer = new IntersectionObserver((entries) => {
      if (performance.now() < this.lockUntil) return;
      for (const entry of entries) {
        if (entry.isIntersecting) this.mark(this.slides?.indexOf(/** @type {HTMLElement} */ (entry.target)) ?? -1);
      }
    }, { root: track, threshold: 0.6 });
    for (const slide of this.slides) this.observer.observe(slide);

    // Same slide after a width change; height-only changes (a phone's address bar) are ignored.
    let width = track.clientWidth;
    this.resizeObserver = new ResizeObserver(() => {
      if (track.clientWidth !== width) {
        width = track.clientWidth;
        this.lockUntil = performance.now() + 300;
        this.go(this.index, true);
      }
      this.fitHeight();
      this.updateFades();
    });
    this.resizeObserver.observe(track);

    this.setupThumbStrip();
    this.setupZoom();
    this.setupVideos();

    this.listen(document, ThemeEvents.variantChanged, (event) => {
      const { sectionId, mediaId } = /** @type {CustomEvent} */ (event).detail;
      if (sectionId !== this.dataset.section || !mediaId) return;
      const index = (this.slides ?? []).findIndex((s) => s.dataset.mediaId === String(mediaId));
      if (index >= 0) this.go(index);
    });
  }

  unmount() {
    this.observer?.disconnect();
    this.videoObserver?.disconnect();
    this.resizeObserver?.disconnect();
  }

  /** Thumbnail strip: edge fades, arrow helpers, keep them in sync while it scrolls. */
  setupThumbStrip() {
    const list = this.ref('thumbs');
    if (!list) return;
    let frame = 0;
    this.listen(list, 'scroll', () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => this.updateFades());
    }, { passive: true });
    const back = this.ref('thumbs-back');
    const more = this.ref('thumbs-more');
    if (back) this.listen(back, 'click', () => this.scrollThumbs(-1));
    if (more) this.listen(more, 'click', () => this.scrollThumbs(1));
    this.updateFades();
  }

  /** @param {number} direction - 1 towards the end of the strip, -1 towards the start */
  scrollThumbs(direction) {
    const list = this.ref('thumbs');
    if (!list) return;
    const behavior = reducedMotion() ? 'auto' : 'smooth';
    if (this.thumbsVertical(list)) {
      list.scrollBy({ top: direction * list.clientHeight * 0.8, behavior });
    } else {
      list.scrollBy({ left: direction * (isRtl() ? -1 : 1) * list.clientWidth * 0.8, behavior });
    }
  }

  /** @param {HTMLElement} list */
  thumbsVertical(list) {
    return getComputedStyle(list).flexDirection === 'column';
  }

  updateFades() {
    const list = this.ref('thumbs');
    if (!list) return;
    let before = false;
    let after = false;
    if (this.thumbsVertical(list)) {
      before = list.scrollTop > 1;
      after = list.scrollTop + list.clientHeight < list.scrollHeight - 1;
      list.style.setProperty('--fade-dir', 'bottom');
    } else {
      const position = Math.abs(list.scrollLeft);
      before = position > 1;
      after = position < list.scrollWidth - list.clientWidth - 1;
      list.style.setProperty('--fade-dir', isRtl() ? 'left' : 'right');
    }
    list.style.setProperty('--fade-start', before ? '2.5rem' : '0px');
    list.style.setProperty('--fade-end', after ? '2.5rem' : '0px');
    const back = this.ref('thumbs-back');
    const more = this.ref('thumbs-more');
    if (back) back.hidden = !before;
    if (more) more.hidden = !after;
  }

  /** Each-image-its-own-shape mode: the slider is as tall as the current slide. */
  fitHeight() {
    const track = this.ref('track');
    if (!track || !this.hasAttribute('data-natural')) return;
    const slide = this.slides?.[this.index];
    if (slide && track.scrollWidth > track.clientWidth + 1) {
      track.style.height = `${slide.offsetHeight}px`;
    } else {
      track.style.removeProperty('height');
    }
  }

  setupZoom() {
    const buttons = /** @type {HTMLElement[]} */ (this.refs('zoom'));
    const lightbox = /** @type {any} */ (this.ref('lightbox'));
    if (!buttons.length) return;
    const items = buttons.map((b) => ({ src: b.dataset.src ?? '', srcset: b.dataset.srcset ?? '', alt: b.dataset.alt ?? '' }));
    const open = (/** @type {number} */ i) => {
      lightbox?.open?.(items, i, (/** @type {number} */ last) => {
        const target = buttons[last];
        const slide = /** @type {HTMLElement | null} */ (target?.closest('[data-ref="slide"]'));
        if (slide) this.go((this.slides ?? []).indexOf(slide), true);
        target?.focus({ preventScroll: true });
      });
    };
    const hover = this.dataset.zoomMode === 'hover';
    const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)');
    const desktop = window.matchMedia('(min-width: 750px)');

    buttons.forEach((button, i) => {
      this.listen(button, 'click', (event) => {
        // A keyboard "click" has detail 0: the full-screen viewer is the accessible way to zoom.
        if (hover && finePointer.matches && desktop.matches && /** @type {MouseEvent} */ (event).detail > 0) {
          this.toggleMagnifier(button, /** @type {MouseEvent} */ (event));
        } else {
          this.closeMagnifiers();
          open(i);
        }
      });
      if (hover) {
        this.listen(button, 'pointermove', (event) => this.moveMagnifier(button, /** @type {PointerEvent} */ (event)));
        this.listen(button, 'pointerleave', () => this.closeMagnifiers());
      }
    });

    for (const magnifier of this.refs('zoom-button')) {
      const button = /** @type {HTMLElement | null} */ (magnifier.closest('[data-ref="slide"]')?.querySelector('[data-ref="zoom"]'));
      const i = button ? buttons.indexOf(button) : -1;
      if (i >= 0) this.listen(magnifier, 'click', () => open(i));
    }
  }

  /**
   * @param {HTMLElement} button
   * @param {MouseEvent} event
   */
  toggleMagnifier(button, event) {
    const existing = button.querySelector('.product-gallery__magnify');
    if (existing) {
      existing.remove();
      return;
    }
    const layer = document.createElement('span');
    layer.className = 'product-gallery__magnify';
    layer.setAttribute('aria-hidden', 'true');
    layer.dataset.loading = '';
    if (button.querySelector('img')?.classList.contains('object-cover')) layer.dataset.fit = 'cover';
    const image = new Image();
    image.alt = '';
    image.src = button.dataset.magnify || button.dataset.src || '';
    layer.append(image);
    button.append(layer);
    this.moveMagnifier(button, event);
    image.decode().catch(() => {}).finally(() => delete layer.dataset.loading);
  }

  /**
   * @param {HTMLElement} button
   * @param {MouseEvent} event
   */
  moveMagnifier(button, event) {
    const image = /** @type {HTMLElement | null} */ (button.querySelector('.product-gallery__magnify img'));
    if (!image) return;
    const box = button.getBoundingClientRect();
    const x = Math.min(1, Math.max(0, (event.clientX - box.left) / box.width));
    const y = Math.min(1, Math.max(0, (event.clientY - box.top) / box.height));
    image.style.transform = `translate(${-x * 50}%, ${-y * 50}%)`;
  }

  closeMagnifiers() {
    for (const layer of this.querySelectorAll('.product-gallery__magnify')) layer.remove();
  }

  setupVideos() {
    const videos = /** @type {HTMLVideoElement[]} */ ([...this.querySelectorAll('video')]);
    if (!videos.length) return;
    const autoplay = this.hasAttribute('data-video-autoplay') && !reducedMotion();
    for (const video of videos) {
      if (this.hasAttribute('data-video-loop')) video.loop = true;
      if (autoplay) {
        video.muted = true;
        video.playsInline = true;
      }
    }
    this.videoObserver = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        const video = /** @type {HTMLVideoElement} */ (entry.target);
        if (!entry.isIntersecting) video.pause();
        else if (autoplay) video.play().catch(() => {});
      }
    }, { threshold: 0.6 });
    for (const video of videos) this.videoObserver.observe(video);
  }

  /**
   * @param {number} index
   * @param {boolean} [instant] - Jump without smooth scrolling
   */
  go(index, instant = false) {
    const slides = this.slides ?? [];
    if (!slides.length) return;
    const target = slides[(index + slides.length) % slides.length];
    const track = /** @type {HTMLElement} */ (this.ref('track'));
    if (track.scrollWidth > track.clientWidth) {
      const behavior = instant || reducedMotion() ? 'auto' : 'smooth';
      const offset = target.offsetLeft - track.offsetLeft;
      track.scrollTo({ left: isRtl() ? offset - track.scrollWidth + track.clientWidth : offset, behavior });
    }
    this.mark(slides.indexOf(target));
  }

  /** @param {number} index */
  mark(index) {
    if (index < 0) return;
    const changed = index !== this.index;
    this.index = index;
    if (changed) this.closeMagnifiers();
    for (const thumb of this.thumbs ?? []) {
      const current = Number(thumb.dataset.index) === index;
      thumb.setAttribute('aria-current', String(current));
      if (current) this.revealThumb(thumb);
    }
    (this.dots ?? []).forEach((dot, i) => dot.toggleAttribute('data-current', i === index));
    const status = this.ref('status');
    if (status) {
      const count = String(this.slides?.length ?? 0);
      const template = this.dataset.counter || '[index] / [count]';
      status.textContent = template.replace('[index]', String(index + 1)).replace('[count]', count);
    }
    this.fitHeight();
  }

  /**
   * Scroll the thumbnail strip (not the page) so the current thumbnail sits in its middle.
   * @param {HTMLElement} thumb
   */
  revealThumb(thumb) {
    const list = this.ref('thumbs');
    if (!list || !list.offsetParent) return;
    const item = /** @type {HTMLElement} */ (thumb.parentElement).getBoundingClientRect();
    const box = list.getBoundingClientRect();
    const behavior = reducedMotion() ? 'auto' : 'smooth';
    if (this.thumbsVertical(list)) {
      list.scrollTo({ top: list.scrollTop + item.top - box.top - (box.height - item.height) / 2, behavior });
    } else if (list.scrollWidth > list.clientWidth + 1) {
      list.scrollTo({ left: list.scrollLeft + item.left - box.left - (box.width - item.width) / 2, behavior });
    }
  }
}

define('aw-gallery', Gallery);
