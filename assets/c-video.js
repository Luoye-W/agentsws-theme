/**
 * <aw-video> — lazy video player for Shopify-hosted videos and YouTube / Vimeo links.
 *
 * Only the cover image is in the page at first; the <video> or <iframe> is created from
 * <template data-ref="template"> when it is needed, so the first screen does not pay for video bytes.
 *
 * Attributes:
 *   data-provider   "hosted" | "youtube" | "vimeo"
 *   data-autoplay   present → background mode: muted, no native controls, plays while in view
 *   data-label-play / data-label-pause   accessible names for the play/pause button
 *
 * Background (autoplay) mode:
 *   - waits for the page `load` event and an idle moment before anything is downloaded;
 *   - never autoplays with Save-Data, a 2G connection or prefers-reduced-motion (the play button stays);
 *   - plays in view, pauses out of view, and never resumes a video the shopper paused;
 *   - when the browser blocks autoplay it retries once on the first tap, click or key press;
 *   - the cover cross-fades to the video after the first frame is painted (no black flash);
 *   - the play/pause button is always available.
 * Click mode: the button starts the video with sound and native controls, then gets out of the way.
 *
 * Children: [data-ref=cover], [data-ref=stage], <template data-ref=template>, [data-ref=toggle].
 * State is reflected in data-state (idle | loading | playing | paused) and in data-playing on the toggle button,
 * which snippets/play-pause-icon uses to swap its icon.
 */
import { ThemeElement, define } from '@aw/component';

/** Resolves after the window `load` event plus an idle moment. */
const pageReady = new Promise((resolve) => {
  if (document.readyState === 'complete') resolve(undefined);
  else window.addEventListener('load', () => resolve(undefined), { once: true });
}).then(
  () =>
    new Promise((resolve) => {
      if ('requestIdleCallback' in window) window.requestIdleCallback(() => resolve(undefined), { timeout: 2000 });
      else setTimeout(resolve, 200);
    }),
);

/**
 * Whether background video may start on its own on this device.
 * @returns {boolean}
 */
export function mayAutoplay() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return false;
  const connection = /** @type {any} */ (navigator).connection;
  if (connection?.saveData) return false;
  if (/(^|-)2g$/.test(connection?.effectiveType ?? '')) return false;
  return true;
}

class VideoPlayer extends ThemeElement {
  mount() {
    this.background = this.hasAttribute('data-autoplay');
    this.userPaused = false;
    this.inView = false;
    /** @type {HTMLVideoElement | HTMLIFrameElement | null} */
    this.media = null;
    this.setState('idle');

    const toggle = this.ref('toggle');
    if (toggle) this.listen(toggle, 'click', () => this.onToggle());

    if (!this.background || !mayAutoplay()) return;
    pageReady.then(() => {
      if (!this.isConnected) return;
      this.observer = new IntersectionObserver(
        ([entry]) => {
          this.inView = entry.isIntersecting;
          if (this.inView && !this.userPaused) this.play();
          else if (!this.inView) this.pause();
        },
        { threshold: 0.25 },
      );
      this.observer.observe(this);
    });
  }

  unmount() {
    this.observer?.disconnect();
    this.stopRetry?.();
  }

  onToggle() {
    const playing = this.dataset.state === 'playing' || this.dataset.state === 'loading';
    if (playing) {
      this.userPaused = true;
      this.pause();
    } else {
      this.userPaused = false;
      this.play(true);
    }
  }

  /** @param {'idle' | 'loading' | 'playing' | 'paused'} state */
  setState(state) {
    this.dataset.state = state;
    const toggle = this.ref('toggle');
    if (!toggle) return;
    const playing = state === 'playing' || state === 'loading';
    toggle.toggleAttribute('data-playing', playing);
    const label = playing ? this.dataset.labelPause : this.dataset.labelPlay;
    if (label) toggle.setAttribute('aria-label', label);
  }

  /** Create the <video>/<iframe> from the template on first use. */
  createMedia() {
    if (this.media) return this.media;
    const template = /** @type {HTMLTemplateElement | null} */ (this.ref('template'));
    const stage = this.ref('stage');
    if (!template || !stage) return null;
    const node = /** @type {HTMLElement | null} */ (template.content.firstElementChild?.cloneNode(true) ?? null);
    if (!node) return null;

    if (node instanceof HTMLIFrameElement) {
      const url = new URL(node.dataset.src ?? '');
      url.searchParams.set('autoplay', '1');
      if (this.background) {
        url.searchParams.set(this.dataset.provider === 'vimeo' ? 'muted' : 'mute', '1');
        url.searchParams.set('controls', '0');
      }
      node.src = url.toString();
      this.listen(node, 'load', () => this.reveal());
    } else if (node instanceof HTMLVideoElement) {
      node.muted = this.background;
      node.controls = !this.background;
      node.playsInline = true;
      node.loop = this.hasAttribute('data-loop');
      if (this.dataset.description) node.setAttribute('aria-label', this.dataset.description);
      this.listen(node, 'playing', () => this.revealAfterFrame(/** @type {HTMLVideoElement} */ (node)));
      this.listen(node, 'pause', () => this.setState('paused'));
    }
    stage.append(node);
    this.media = /** @type {HTMLVideoElement | HTMLIFrameElement} */ (node);
    return this.media;
  }

  /** @param {HTMLVideoElement} video */
  revealAfterFrame(video) {
    this.setState('playing');
    if (this.hasAttribute('data-revealed')) return;
    // First painted frame when the browser can tell us; the first time update otherwise (or when frames are not painted).
    if ('requestVideoFrameCallback' in video) video.requestVideoFrameCallback(() => this.reveal());
    video.addEventListener('timeupdate', () => this.reveal(), { once: true });
  }

  reveal() {
    this.toggleAttribute('data-revealed', true);
    if (this.media instanceof HTMLIFrameElement) this.setState('playing');
    // Click mode hands over to the native / embedded controls.
    if (!this.background) this.ref('toggle')?.setAttribute('hidden', '');
  }

  /** @param {boolean} [fromUser] */
  play(fromUser = false) {
    const media = this.createMedia();
    if (!media) return;
    this.setState('loading');
    if (media instanceof HTMLVideoElement) {
      media.play().catch(() => {
        this.setState('paused');
        if (!fromUser) this.retryOnInteraction();
      });
    } else if (this.hasAttribute('data-revealed')) {
      this.command('play');
      this.setState('playing');
    }
  }

  pause() {
    const media = this.media;
    if (!media) return;
    if (media instanceof HTMLVideoElement) media.pause();
    else this.command('pause');
    this.setState('paused');
  }

  /** @param {'play' | 'pause'} action */
  command(action) {
    const frame = /** @type {HTMLIFrameElement} */ (this.media);
    const message =
      this.dataset.provider === 'vimeo'
        ? { method: action }
        : { event: 'command', func: action === 'play' ? 'playVideo' : 'pauseVideo', args: [] };
    frame.contentWindow?.postMessage(JSON.stringify(message), '*');
  }

  /** Autoplay was blocked: try again on the shopper's first interaction, if still in view. */
  retryOnInteraction() {
    if (this.stopRetry) return;
    const controller = new AbortController();
    /** @param {Event} event */
    const retry = (event) => {
      this.stopRetry?.();
      // A press on our own button is handled by its click listener.
      if (this.ref('toggle')?.contains(/** @type {Node} */ (event.target))) return;
      if (this.inView && !this.userPaused) this.play(true);
    };
    for (const type of ['pointerdown', 'keydown', 'touchstart']) {
      document.addEventListener(type, retry, { passive: true, signal: controller.signal });
    }
    this.stopRetry = () => {
      controller.abort();
      this.stopRetry = undefined;
    };
  }
}

define('aw-video', VideoPlayer);
