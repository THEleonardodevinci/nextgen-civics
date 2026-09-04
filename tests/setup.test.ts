import { describe, expect, it } from 'vitest';
import { sanitizeHtml, slugify, readingTime, stripHtml } from '../src/lib/sanitize';
import { articleInput, figureInput, httpUrl, contactInput } from '../src/lib/validation/schemas';
import { ROLE_RANK } from '../src/types/db';
import { parseCsv, toCsv, FIGURE_COLUMNS } from '../src/lib/csv';
import { atLeast } from '../src/lib/auth/guards';

describe('HTML sanitization', () => {
  it('strips script tags from editor output', () => {
    const dirty = '<p>Fine</p><script>alert(1)</script>';
    expect(sanitizeHtml(dirty)).not.toContain('script');
    expect(sanitizeHtml(dirty)).toContain('Fine');
  });

  it('strips javascript: URLs', () => {
    expect(sanitizeHtml('<a href="javascript:alert(1)">x</a>')).not.toContain('javascript:');
  });

  it('strips inline event handlers', () => {
    expect(sanitizeHtml('<img src="https://x.test/a.png" onerror="alert(1)">')).not.toContain('onerror');
  });

  it('keeps allowed formatting', () => {
    const html = sanitizeHtml('<h2>Head</h2><p><strong>bold</strong></p><blockquote>q</blockquote>');
    expect(html).toContain('<h2>');
    expect(html).toContain('<strong>');
    expect(html).toContain('<blockquote>');
  });
});

describe('URL validation', () => {
  it('rejects non-http schemes', () => {
    expect(httpUrl.safeParse('javascript:alert(1)').success).toBe(false);
    expect(httpUrl.safeParse('data:text/html,x').success).toBe(false);
  });
  it('accepts https', () => {
    expect(httpUrl.safeParse('https://example.org/a').success).toBe(true);
  });
});

describe('slugs and reading time', () => {
  it('slugifies titles', () => {
    expect(slugify('Why Politics Feels Personal!')).toBe('why-politics-feels-personal');
  });
  it('never returns zero reading time', () => {
    expect(readingTime('<p>short</p>')).toBeGreaterThanOrEqual(1);
  });
  it('strips tags when counting', () => {
    expect(stripHtml('<p>a <em>b</em></p>')).toBe('a b');
  });
});

describe('article validation', () => {
  const base = { title: 'A valid title', slug: 'a-valid-title', content: '<p>x</p>', status: 'draft' as const };

  it('accepts a minimal draft', () => {
    expect(articleInput.safeParse(base).success).toBe(true);
  });
  it('rejects a malformed slug', () => {
    expect(articleInput.safeParse({ ...base, slug: 'Not A Slug' }).success).toBe(false);
  });
  it('rejects an unknown status', () => {
    expect(articleInput.safeParse({ ...base, status: 'live' }).success).toBe(false);
  });
});

describe('political figure validation', () => {
  const base = {
    name: 'Example Name', slug: 'example-name', state_code: 'IL',
    affiliation_type: 'independent' as const, candidate_status: 'declared_candidate' as const,
    state: 'needs_verification' as const,
  };

  it('accepts a valid district code', () => {
    expect(figureInput.safeParse({ ...base, district_code: 'IL-05' }).success).toBe(true);
  });
  it('accepts at-large districts', () => {
    expect(figureInput.safeParse({ ...base, district_code: 'AK-AL' }).success).toBe(true);
  });
  it('rejects a malformed district code', () => {
    expect(figureInput.safeParse({ ...base, district_code: 'IL5' }).success).toBe(false);
  });
});

describe('role hierarchy', () => {
  it('ranks roles in order', () => {
    expect(ROLE_RANK.USER).toBeLessThan(ROLE_RANK.WRITER);
    expect(ROLE_RANK.WRITER).toBeLessThan(ROLE_RANK.EDITOR);
    expect(ROLE_RANK.EDITOR).toBeLessThan(ROLE_RANK.ADMIN);
    expect(ROLE_RANK.ADMIN).toBeLessThan(ROLE_RANK.SUPER_ADMIN);
  });
  it('denies a writer editor permissions', () => {
    expect(atLeast('WRITER', 'EDITOR')).toBe(false);
  });
  it('grants an admin editor permissions', () => {
    expect(atLeast('ADMIN', 'EDITOR')).toBe(true);
  });
  it('denies an undefined role', () => {
    expect(atLeast(undefined, 'USER')).toBe(false);
  });
});

describe('contact form validation', () => {
  it('rejects a short message', () => {
    expect(contactInput.safeParse({
      name: 'A B', email: 'a@b.co', category: 'Press', message: 'too short',
    }).success).toBe(false);
  });
  it('rejects an unknown category', () => {
    expect(contactInput.safeParse({
      name: 'A B', email: 'a@b.co', category: 'Nonsense', message: 'x'.repeat(30),
    }).success).toBe(false);
  });
});

describe('CSV parsing', () => {
  it('parses a simple row', () => {
    expect(parseCsv('a,b,c\n1,2,3')).toEqual([['a', 'b', 'c'], ['1', '2', '3']]);
  });
  it('respects quoted commas', () => {
    expect(parseCsv('name,office\n"Doe, Jane",Mayor')).toEqual([
      ['name', 'office'], ['Doe, Jane', 'Mayor'],
    ]);
  });
  it('unescapes doubled quotes', () => {
    expect(parseCsv('a\n"She said ""hi"""')).toEqual([['a'], ['She said "hi"']]);
  });
  it('handles newlines inside quoted fields', () => {
    expect(parseCsv('bio\n"line one\nline two"')).toEqual([['bio'], ['line one\nline two']]);
  });
  it('handles CRLF endings', () => {
    expect(parseCsv('a,b\r\n1,2\r\n')).toEqual([['a', 'b'], ['1', '2']]);
  });
  it('drops trailing blank lines', () => {
    expect(parseCsv('a\n1\n\n\n')).toEqual([['a'], ['1']]);
  });
  it('round-trips through toCsv', () => {
    const csv = toCsv(['name', 'note'], [{ name: 'A "B"', note: 'x,y' }]);
    expect(parseCsv(csv)[1]).toEqual(['A "B"', 'x,y']);
  });
  it('exports the columns the importer validates', () => {
    expect(FIGURE_COLUMNS).toContain('source_url');
    expect(FIGURE_COLUMNS).toContain('last_verified');
  });
});

describe('directory inclusion criteria', () => {
  const base = {
    name: 'Example Name', slug: 'example-name', state_code: 'IL',
    affiliation_type: 'independent' as const, candidate_status: 'independent_candidate' as const,
    state: 'needs_verification' as const,
  };

  it('accepts the four checkable inclusion bases', () => {
    for (const b of ['ballot_qualified', 'filed_candidacy', 'officeholder', 'party_organization']) {
      expect(figureInput.safeParse({ ...base, inclusion_basis: b }).success).toBe(true);
    }
  });

  it('rejects an ideological inclusion basis', () => {
    // There is deliberately no way to list someone for being moderate.
    for (const b of ['moderate', 'centrist', 'depolarization_supporter', 'constructive']) {
      expect(figureInput.safeParse({ ...base, inclusion_basis: b }).success).toBe(false);
    }
  });

  it('defaults to the weaker claim when none is given', () => {
    const parsed = figureInput.parse(base);
    expect(parsed.inclusion_basis).toBe('filed_candidacy');
  });

  it('requires a source URL on every stated position', () => {
    expect(figureInput.safeParse({
      ...base,
      stated_positions: [{ topic: 'Housing', statement: 'A position.' }],
    }).success).toBe(false);
  });

  it('rejects a non-http source on a stated position', () => {
    expect(figureInput.safeParse({
      ...base,
      stated_positions: [{ topic: 'Housing', statement: 'A position.', sourceUrl: 'javascript:alert(1)' }],
    }).success).toBe(false);
  });

  it('accepts a sourced stated position', () => {
    expect(figureInput.safeParse({
      ...base,
      stated_positions: [{
        topic: 'Housing', statement: 'A position in their own words.',
        sourceUrl: 'https://example.org/platform', retrieved: '2026-08-14',
      }],
    }).success).toBe(true);
  });
});

describe('sanitizer hardening (sanitize-html)', () => {
  it('drops data: URIs on images', () => {
    expect(sanitizeHtml('<img src="data:text/html,<script>alert(1)</script>">')).not.toContain('data:');
  });

  it('drops protocol-relative URLs', () => {
    expect(sanitizeHtml('<a href="//evil.test/x">x</a>')).not.toContain('evil.test');
  });

  it('strips inline styles', () => {
    expect(sanitizeHtml('<p style="position:fixed;top:0">x</p>')).not.toContain('style');
  });

  it('removes iframe content entirely rather than unwrapping it', () => {
    const out = sanitizeHtml('<iframe src="https://evil.test">fallback</iframe>');
    expect(out).not.toContain('iframe');
    expect(out).not.toContain('fallback');
  });

  it('adds rel=noopener to external links', () => {
    const out = sanitizeHtml('<a href="https://example.org">x</a>');
    expect(out).toContain('rel="noopener noreferrer"');
    expect(out).toContain('target="_blank"');
  });

  it('leaves internal links alone', () => {
    expect(sanitizeHtml('<a href="/articles/x">x</a>')).not.toContain('target');
  });

  it('keeps mailto links', () => {
    expect(sanitizeHtml('<a href="mailto:a@b.co">mail</a>')).toContain('mailto:');
  });

  it('handles empty input', () => {
    expect(sanitizeHtml('')).toBe('');
  });
});
