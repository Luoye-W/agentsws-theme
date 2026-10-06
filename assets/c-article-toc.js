/**
 * <aw-article-toc data-target="ContentId" [data-levels="h2,h3"]> — "On this page" list built from the headings of a
 * blog post. Headings without an id get one (from their text). The element stays hidden when the post has fewer
 * than two headings. The link of the heading currently being read gets aria-current="true".
 *
 * Markup:
 *   <aw-article-toc data-target="…" hidden><nav …><ol data-ref="list"></ol></nav></aw-article-toc>
 */
import { ThemeElement, define } from '@aw/component';

class ArticleToc extends ThemeElement {
  /** @type {IntersectionObserver | undefined} */
  observer;

  mount() {
    const content = document.getElementById(this.dataset.target ?? '');
    const list = this.ref('list');
    if (!content || !list) return;
    const selector = this.dataset.levels || 'h2,h3';
    const headings = /** @type {HTMLElement[]} */ ([...content.querySelectorAll(selector)]).filter((h) => h.textContent?.trim());
    if (headings.length < 2) return;

    const used = new Set([...document.querySelectorAll('[id]')].map((el) => el.id));
    list.replaceChildren();
    /** @type {Map<Element, HTMLAnchorElement>} */
    const links = new Map();
    for (const heading of headings) {
      if (!heading.id) heading.id = uniqueId(slugify(heading.textContent ?? ''), used);
      const item = document.createElement('li');
      if (heading.tagName !== 'H2') item.className = 'ps-4';
      const link = document.createElement('a');
      link.href = `#${heading.id}`;
      link.textContent = heading.textContent?.trim() ?? '';
      link.className = 'block py-1 text-muted no-underline hover:text-fg aria-[current=true]:font-semibold aria-[current=true]:text-fg';
      item.append(link);
      list.append(item);
      links.set(heading, link);
    }
    this.hidden = false;

    if (!('IntersectionObserver' in window)) return;
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
        if (!visible) return;
        for (const link of links.values()) link.removeAttribute('aria-current');
        links.get(visible.target)?.setAttribute('aria-current', 'true');
      },
      { rootMargin: '0px 0px -70% 0px' },
    );
    for (const heading of headings) observer.observe(heading);
    this.observer = observer;
  }

  unmount() {
    this.observer?.disconnect();
  }
}

/** @param {string} text */
function slugify(text) {
  return (
    text
      .trim()
      .toLowerCase()
      .replace(/[^\p{L}\p{N}]+/gu, '-')
      .replace(/^-+|-+$/g, '') || 'section'
  );
}

/**
 * @param {string} base
 * @param {Set<string>} used
 */
function uniqueId(base, used) {
  let id = base;
  let n = 2;
  while (used.has(id)) id = `${base}-${n++}`;
  used.add(id);
  return id;
}

define('aw-article-toc', ArticleToc);
