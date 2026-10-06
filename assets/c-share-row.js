/**
 * <aw-share-row data-url data-title data-copied> — share row (blocks/product-share.liquid).
 *
 * The network links work without JavaScript. This element only reveals the two buttons that need browser APIs:
 * "Copy link" (data-ref="copy", Clipboard API) confirms in a polite status (data-ref="status"), and the native
 * "Share" button (data-ref="native", Web Share API) opens the device's share sheet.
 */
import { ThemeElement, define } from '@aw/component';

class ShareRow extends ThemeElement {
  /** @type {number | undefined} */
  timer;

  mount() {
    const url = this.dataset.url ?? window.location.href;
    const title = this.dataset.title ?? document.title;
    const status = this.ref('status');

    const copy = this.ref('copy');
    if (copy && navigator.clipboard) {
      copy.hidden = false;
      this.listen(copy, 'click', async () => {
        try {
          await navigator.clipboard.writeText(url);
          if (status) {
            status.textContent = this.dataset.copied ?? '';
            window.clearTimeout(this.timer);
            this.timer = window.setTimeout(() => (status.textContent = ''), 4000);
          }
        } catch {
          copy.hidden = true;
        }
      });
    }

    const native = this.ref('native');
    if (native && typeof navigator.share === 'function') {
      native.hidden = false;
      this.listen(native, 'click', async () => {
        try {
          await navigator.share({ title, url });
        } catch {
          // The shopper closed the share sheet: nothing to do.
        }
      });
    }
  }

  unmount() {
    window.clearTimeout(this.timer);
  }
}

define('aw-share-row', ShareRow);
