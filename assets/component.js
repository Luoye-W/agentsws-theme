/**
 * Base class for every interactive element in the theme (`<aw-*>` custom elements).
 *
 * Rules (see AGENTS.md → JavaScript):
 * - One custom element per file: assets/c-<name>.js defines <aw-<name>>.
 * - Put setup in `mount()`, never in the constructor. It runs each time the element
 *   is connected, which also covers theme-editor section re-renders.
 * - Register listeners with `this.listen()` so they are removed automatically on disconnect.
 * - Query children with `this.ref('name')` / `this.refs('name')` using `data-ref="name"`.
 */
export class ThemeElement extends HTMLElement {
  /** @type {AbortController | null} */
  #abort = null;

  connectedCallback() {
    this.#abort = new AbortController();
    this.mount();
  }

  disconnectedCallback() {
    this.#abort?.abort();
    this.#abort = null;
    this.unmount();
  }

  /** Override: set up the element. */
  mount() {}

  /** Override: extra cleanup beyond listeners registered with listen(). */
  unmount() {}

  /**
   * Add an event listener that is removed when the element disconnects.
   * @param {EventTarget} target
   * @param {string} type
   * @param {EventListenerOrEventListenerObject} handler
   * @param {AddEventListenerOptions} [options]
   */
  listen(target, type, handler, options = {}) {
    target.addEventListener(type, handler, { ...options, signal: this.#abort?.signal });
  }

  /**
   * First descendant with data-ref="name".
   * @param {string} name
   * @returns {HTMLElement | null}
   */
  ref(name) {
    return this.querySelector(`[data-ref="${name}"]`);
  }

  /**
   * All descendants with data-ref="name".
   * @param {string} name
   * @returns {HTMLElement[]}
   */
  refs(name) {
    return [...this.querySelectorAll(`[data-ref="${name}"]`)];
  }
}

/**
 * Define a custom element once (safe when a script is evaluated twice).
 * @param {string} tag - Must start with "aw-".
 * @param {CustomElementConstructor} ctor
 */
export function define(tag, ctor) {
  if (!customElements.get(tag)) customElements.define(tag, ctor);
}

/**
 * Replace every `[data-swap="key"]` element inside `root` with the element carrying the same key in `html`
 * (a Section Rendering API response). Keeps keyboard focus on the equivalent control when possible.
 * @param {HTMLElement} root
 * @param {string} html
 * @returns {Document} The parsed response, for callers that need more from it.
 */
export function swapFromHTML(root, html) {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const active = /** @type {HTMLElement | null} */ (document.activeElement);
  const focusKey = active && root.contains(active) ? focusSelector(active) : null;

  for (const current of root.querySelectorAll('[data-swap]')) {
    const key = current.getAttribute('data-swap');
    const next = doc.querySelector(`[data-swap="${CSS.escape(key ?? '')}"]`);
    if (next) current.replaceWith(document.importNode(next, true));
  }

  if (focusKey) /** @type {HTMLElement | null} */ (root.querySelector(focusKey))?.focus({ preventScroll: true });
  return doc;
}

/** @param {HTMLElement} el */
function focusSelector(el) {
  if (el.id) return `#${CSS.escape(el.id)}`;
  const name = el.getAttribute('name');
  if (!name) return null;
  const value = el.getAttribute('value');
  return value === null ? `[name="${CSS.escape(name)}"]` : `[name="${CSS.escape(name)}"][value="${CSS.escape(value)}"]`;
}
