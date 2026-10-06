/**
 * <aw-video-media> — lightweight video player wrapper. snippets/video-media.liquid renders the markup.
 *
 * External (YouTube / Vimeo): a poster button (data-ref="play") stands in for the player; clicking it swaps in the
 * iframe from <template data-ref="content"> and moves focus to it. Nothing from YouTube / Vimeo loads before that.
 *
 * Shopify-hosted autoplay video (data-autoplay): plays muted only while on screen, and never starts on its own when the
 * visitor prefers reduced motion. Native controls stay available so it can always be paused.
 */
import { ThemeElement, define } from '@aw/component';

class VideoMedia extends ThemeElement {
  mount() {
    const play = this.ref('play');
    if (play) this.listen(play, 'click', () => this.activate());

    const video = this.querySelector('video');
    if (video && this.hasAttribute('data-autoplay')) {
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        video.autoplay = false;
        video.pause();
        return;
      }
      this.observer = new IntersectionObserver((entries) => {
        const visible = entries.some((entry) => entry.isIntersecting);
        if (visible) video.play().catch(() => {});
        else video.pause();
      });
      this.observer.observe(this);
    }
  }

  unmount() {
    this.observer?.disconnect();
  }

  activate() {
    const template = /** @type {HTMLTemplateElement | null} */ (this.ref('content'));
    const play = this.ref('play');
    if (!template || !play) return;
    const content = template.content.cloneNode(true);
    play.replaceWith(content);
    /** @type {HTMLElement | null} */ (this.querySelector('iframe, video'))?.focus();
  }
}

define('aw-video-media', VideoMedia);
