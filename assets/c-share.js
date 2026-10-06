/**
 * <aw-share data-url data-title data-copied> — share button.
 *
 * Where the browser offers the Web Share API the button opens the device's share sheet. Otherwise the <details>
 * panel (data-ref="details") shows share links; "Copy link" (data-ref="copy", shown only when the Clipboard API is
 * available) copies the URL and confirms in a polite status (data-ref="status"). The panel closes on Escape and
 * outside click.
 */
import { ThemeElement, define } from '@aw/component';

class Share extends ThemeElement {
  mount() {
    const details = /** @type {HTMLDetailsElement | null} */ (this.ref('details'));
    const summary = details?.querySelector('summary');
    if (!details || !summary) return;
    const url = this.dataset.url ?? window.location.href;
    const title = this.dataset.title ?? document.title;

    if (typeof navigator.share === 'function') {
      this.listen(summary, 'click', async (event) => {
        event.preventDefault();
        try {
          await navigator.share({ title, url });
        } catch (error) {
          // The shopper closed the sheet (AbortError): nothing to do. Anything else: fall back to the panel.
          if (/** @type {Error} */ (error).name !== 'AbortError') details.open = true;
        }
      });
    }

    const copy = this.ref('copy');
    if (copy && navigator.clipboard) {
      copy.hidden = false;
      this.listen(copy, 'click', async () => {
        try {
          await navigator.clipboard.writeText(url);
          const status = this.ref('status');
          if (status) status.textContent = this.dataset.copied ?? '';
        } catch {
          copy.hidden = true;
        }
      });
    }

    this.listen(details, 'toggle', () => {
      if (!details.open) {
        const status = this.ref('status');
        if (status) status.textContent = '';
      }
    });
    this.listen(this, 'keydown', (event) => {
      if (/** @type {KeyboardEvent} */ (event).key !== 'Escape' || !details.open) return;
      details.open = false;
      summary.focus();
    });
    this.listen(document, 'click', (event) => {
      if (details.open && !this.contains(/** @type {Node} */ (event.target))) details.open = false;
    });
  }
}

define('aw-share', Share);
