import sanitize from 'sanitize-html';

/**
 * Article bodies are stored as HTML from the rich-text editor, so they are
 * sanitized on write (in the API route) and again on render. Editor output is
 * never trusted at any point.
 *
 * Why sanitize-html rather than DOMPurify: DOMPurify needs a DOM, so on the
 * server it pulls in jsdom, which is a large dependency and -- as of 2026 --
 * transitively depends on an ESM-only package that breaks CommonJS `require`,
 * producing "require() of ES Module ... not supported" at runtime.
 * sanitize-html parses with htmlparser2 and needs no DOM, so it behaves
 * identically on server and client and drops several hundred packages from
 * the dependency tree.
 *
 * The allowlist is deliberately narrow. Anything not named here is removed
 * rather than escaped.
 */

const ALLOWED_TAGS = [
  'p', 'br', 'strong', 'em', 'u', 's', 'blockquote', 'h2', 'h3', 'h4',
  'ul', 'ol', 'li', 'a', 'img', 'figure', 'figcaption', 'hr',
  'table', 'thead', 'tbody', 'tr', 'th', 'td', 'code', 'pre', 'div', 'span',
];

export function sanitizeHtml(dirty: string): string {
  if (!dirty) return '';

  return sanitize(dirty, {
    allowedTags: ALLOWED_TAGS,
    allowedAttributes: {
      a: ['href', 'title', 'target', 'rel'],
      img: ['src', 'alt', 'title'],
      td: ['colspan', 'rowspan'],
      th: ['colspan', 'rowspan'],
      '*': ['class'],
    },
    // Only these URL schemes survive. javascript: and data: are dropped,
    // which is the attack this function exists to stop.
    allowedSchemes: ['http', 'https', 'mailto'],
    allowedSchemesAppliedToAttributes: ['href', 'src'],
    allowProtocolRelative: false,
    // Inline styles can overlay or hide page chrome, so they go. `style` is
    // already absent from allowedAttributes; this makes the intent explicit.
    allowedStyles: {},
    // These are dropped along with their contents rather than unwrapped.
    nonTextTags: ['script', 'style', 'textarea', 'noscript', 'iframe', 'object', 'embed'],
    // Every external link opens safely, whatever the editor produced.
    transformTags: {
      a: (tagName, attribs) => {
        const href = attribs.href ?? '';
        const external = /^https?:\/\//i.test(href);
        return {
          tagName: 'a',
          attribs: {
            ...attribs,
            ...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {}),
          },
        };
      },
    },
  });
}

export function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

/** ~225 words per minute, minimum 1. */
export function readingTime(html: string): number {
  const words = stripHtml(html).split(' ').filter(Boolean).length;
  return Math.max(1, Math.round(words / 225));
}

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 80);
}
