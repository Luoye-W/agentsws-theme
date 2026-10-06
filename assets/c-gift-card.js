/**
 * <aw-gift-card data-copied="…" data-copy-failed="…"> — gift card page helpers:
 * - Copy button (data-ref="copy") puts the code (data-ref="code") on the clipboard and announces it in the
 *   status line (data-ref="status", role="status"); the message clears after a few seconds.
 * - Print button (data-ref="print") opens the browser's print dialog (buttons are hidden in print via print:hidden).
 * - QR code (data-ref="qr" data-identifier="…") is drawn with Shopify's hosted QR library (window.QRCode, loaded with
 *   `defer` before this module). If that script is late or fails, the code above stays the fallback.
 * Buttons are hidden until this script runs, so nothing is shown that cannot work.
 */
import { ThemeElement, define } from '@aw/component';

class GiftCard extends ThemeElement {
  /** @type {number | undefined} */
  clearTimer;

  mount() {
    const code = this.ref('code');
    const copy = this.ref('copy');
    const print = this.ref('print');

    if (copy && code && navigator.clipboard) {
      copy.hidden = false;
      this.listen(copy, 'click', async () => {
        try {
          await navigator.clipboard.writeText(code.textContent?.trim() ?? '');
          this.announce(this.dataset.copied ?? '');
        } catch {
          this.announce(this.dataset.copyFailed ?? '');
        }
      });
    }

    if (print) {
      print.hidden = false;
      this.listen(print, 'click', () => window.print());
    }

    this.drawQr();
  }

  unmount() {
    window.clearTimeout(this.clearTimer);
  }

  /** @param {string} message */
  announce(message) {
    const status = this.ref('status');
    if (!status) return;
    status.textContent = message;
    window.clearTimeout(this.clearTimer);
    this.clearTimer = window.setTimeout(() => {
      status.textContent = '';
    }, 4000);
  }

  drawQr() {
    const box = this.ref('qr');
    const identifier = box?.dataset.identifier;
    if (!box || !identifier || box.childElementCount > 0) return;

    const render = () => {
      const QRCode = /** @type {any} */ (window).QRCode;
      if (!QRCode || box.childElementCount > 0) return Boolean(QRCode);
      new QRCode(box, { text: identifier, width: 128, height: 128 });
      box.setAttribute('role', 'img');
      box.setAttribute('aria-label', box.dataset.alt ?? '');
      for (const img of box.querySelectorAll('img')) img.alt = '';
      return true;
    };

    if (!render()) this.listen(window, 'load', () => render(), { once: true });
  }
}

define('aw-gift-card', GiftCard);
