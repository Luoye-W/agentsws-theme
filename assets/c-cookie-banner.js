/**
 * <aw-cookie-banner data-delay="1" [data-test-mode] data-section-id="…" hidden> — cookie consent card backed by
 * Shopify's Customer Privacy API (window.Shopify.customerPrivacy, loaded with Shopify.loadFeatures).
 *
 * - Shows only when the API says the visitor must be asked and has not answered (shouldShowBanner()), after the delay.
 *   Test mode shows it on every load without asking the API.
 * - Buttons inside: [data-action="accept"], "decline", "toggle-preferences" (reveals [data-ref="preferences"]) and
 *   "save" (sends the ticked [data-consent="analytics|marketing|preferences"] boxes).
 * - It is deliberately NOT modal: no backdrop, no scroll lock, no touch handlers, focus is not taken from the page.
 *   Escape hides it for this page view without recording anything.
 * - Theme editor: opens while its section is selected.
 */
import { ThemeElement, define } from '@aw/component';
import { emit, ThemeEvents } from '@aw/events';

/** @typedef {{ analytics: boolean, marketing: boolean, preferences: boolean, sale_of_data: boolean }} Consent */

/** @returns {Promise<any>} Shopify's customerPrivacy object, or null when unavailable */
function loadCustomerPrivacy() {
  const shopify = /** @type {any} */ (window).Shopify;
  if (shopify?.customerPrivacy) return Promise.resolve(shopify.customerPrivacy);
  if (typeof shopify?.loadFeatures !== 'function') return Promise.resolve(null);
  return new Promise((resolve) => {
    shopify.loadFeatures([{ name: 'consent-tracking-api', version: '0.1' }], (/** @type {unknown} */ error) => {
      resolve(error ? null : shopify.customerPrivacy ?? null);
    });
  });
}

class CookieBanner extends ThemeElement {
  /** @type {any} */
  privacy = null;
  /** @type {number | undefined} */
  timer;

  mount() {
    const designMode = Boolean(/** @type {any} */ (window).Shopify?.designMode);
    const testMode = this.hasAttribute('data-test-mode');

    this.listen(this, 'click', (event) => {
      const button = /** @type {HTMLElement} */ (event.target).closest?.('[data-action]');
      if (!(button instanceof HTMLElement)) return;
      switch (button.dataset.action) {
        case 'accept':
          this.decide({ analytics: true, marketing: true, preferences: true, sale_of_data: true });
          break;
        case 'decline':
          this.decide({ analytics: false, marketing: false, preferences: false, sale_of_data: false });
          break;
        case 'save':
          this.decide(this.chosen());
          break;
        case 'toggle-preferences':
          this.togglePreferences(button);
          break;
      }
    });

    this.listen(this, 'keydown', (event) => {
      if (/** @type {KeyboardEvent} */ (event).key === 'Escape') this.hide();
    });

    if (designMode) {
      this.listen(document, 'shopify:section:select', (event) => {
        if (/** @type {CustomEvent} */ (event).detail?.sectionId === this.dataset.sectionId) this.show();
      });
      this.listen(document, 'shopify:section:deselect', (event) => {
        if (/** @type {CustomEvent} */ (event).detail?.sectionId === this.dataset.sectionId) this.hide();
      });
      if (testMode) this.show();
      return;
    }

    loadCustomerPrivacy().then((privacy) => {
      this.privacy = privacy;
      const needed = testMode || Boolean(privacy?.shouldShowBanner?.());
      if (!needed) return;
      this.timer = window.setTimeout(() => this.show(), Number(this.dataset.delay || 0) * 1000);
    });
  }

  unmount() {
    window.clearTimeout(this.timer);
  }

  show() {
    this.hidden = false;
    // Next frame, so the entrance transition runs (skipped under reduced motion by the global rule).
    requestAnimationFrame(() => this.ref('panel')?.setAttribute('data-shown', ''));
  }

  hide() {
    this.ref('panel')?.removeAttribute('data-shown');
    this.hidden = true;
  }

  /** @returns {Consent} */
  chosen() {
    const value = (/** @type {string} */ name) =>
      Boolean(/** @type {HTMLInputElement | null} */ (this.querySelector(`[data-consent="${name}"]`))?.checked);
    const marketing = value('marketing');
    return { analytics: value('analytics'), marketing, preferences: value('preferences'), sale_of_data: marketing };
  }

  /** @param {HTMLElement} button */
  togglePreferences(button) {
    const panel = this.ref('preferences');
    if (!panel) return;
    const open = panel.hidden;
    panel.hidden = !open;
    button.setAttribute('aria-expanded', String(open));
    if (open) /** @type {HTMLElement | null} */ (panel.querySelector('input:not([disabled])'))?.focus();
  }

  /** @param {Consent} consent */
  decide(consent) {
    emit(ThemeEvents.consentChanged, consent);
    const privacy = this.privacy;
    if (privacy?.setTrackingConsent) {
      try {
        privacy.setTrackingConsent(consent, () => this.hide());
      } catch {
        // Older API versions take a single boolean.
        privacy.setTrackingConsent(consent.analytics && consent.marketing, () => this.hide());
      }
    }
    this.hide();
  }
}

define('aw-cookie-banner', CookieBanner);
