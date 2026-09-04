import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

/**
 * Regression guard. `glyphs: undefined` in the MapLibre style object fails
 * style validation, which prevents the `load` event from ever firing — the
 * map then shows its loading state forever with no error surfaced.
 * The key must be absent, not present-and-undefined.
 */
describe('MapLibre style', () => {
  const src = readFileSync('src/components/map/DistrictMap.tsx', 'utf8');

  it('does not set an undefined glyphs key', () => {
    expect(src).not.toMatch(/glyphs\s*:\s*undefined/);
  });

  it('does not set an undefined sprite key either', () => {
    expect(src).not.toMatch(/sprite\s*:\s*undefined/);
  });

  it('registers an error handler so failures do not hang on loading', () => {
    expect(src).toMatch(/m\.on\('error'/);
  });

  it('uses no external tile or glyph provider', () => {
    expect(src).not.toMatch(/mapbox\.com|maptiler\.com|demotiles/);
  });
});
