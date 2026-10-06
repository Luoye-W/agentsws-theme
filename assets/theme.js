/**
 * Global bootstrap, loaded once as a module from layout/theme.liquid.
 * Keep this file tiny: feature code belongs in assets/c-<name>.js custom elements.
 */
import { emit, ThemeEvents } from '@aw/events';

document.documentElement.classList.add('js');

// Lazy images fade in once loaded (Theme settings → Animations). Images already loaded are marked at once.
const markLoaded = (/** @type {HTMLImageElement} */ img) => img.classList.add('is-loaded');
document.addEventListener('load', (event) => {
  const target = /** @type {HTMLElement} */ (event.target);
  if (target instanceof HTMLImageElement) markLoaded(target);
}, true);
for (const img of document.querySelectorAll('img[loading="lazy"]')) {
  if (/** @type {HTMLImageElement} */ (img).complete) markLoaded(/** @type {HTMLImageElement} */ (img));
}

// Theme editor: announce section re-renders so non-component code can react.
document.addEventListener('shopify:section:load', (event) => {
  const target = /** @type {CustomEvent} */ (event);
  emit(ThemeEvents.sectionRendered, { sectionId: target.detail?.sectionId });
});
