'use client';

import { useEffect, useRef, useState } from 'react';
import maplibregl, { type Map as MLMap } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';

export interface DistrictFeatureProps {
  district_code: string;
  state_code: string;
  state_name: string;
  district_number: string;
  label: string;
}

const US_BOUNDS: [number, number, number, number] = [-179, 17, -64, 72];

/**
 * The basemap is our own GeoJSON on a flat background — no tile provider,
 * no API key, no per-view billing. Boundaries come from
 * public/data/districts.geojson (see scripts/fetch-districts.mjs).
 */
const STYLE: maplibregl.StyleSpecification = {
  version: 8,
  sources: {},
  layers: [{ id: 'bg', type: 'background', paint: { 'background-color': '#F7F5F0' } }],
  // No `glyphs` key. MapLibre validates the style before firing `load`, and a
  // key present with an undefined value fails validation ("glyphs: string
  // expected, undefined found") — which silently prevents the map from ever
  // loading. Glyphs are only needed for symbol layers with text, and this map
  // has none: labels live in the panel and the district list, not on the
  // polygons. Do not add the key back "for completeness".
};

export default function DistrictMap({
  selected, onSelect, focusCode,
}: {
  selected: string | null;
  onSelect: (props: DistrictFeatureProps | null) => void;
  focusCode?: string | null;
}) {
  const container = useRef<HTMLDivElement>(null);
  const map = useRef<MLMap | null>(null);
  const hovered = useRef<string | number | null>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'missing' | 'error'>('loading');
  const [hoverLabel, setHoverLabel] = useState<string | null>(null);

  // ---- initialise once ----
  useEffect(() => {
    if (!container.current || map.current) return;

    const m = new maplibregl.Map({
      container: container.current,
      style: STYLE,
      bounds: US_BOUNDS,
      fitBoundsOptions: { padding: 24 },
      attributionControl: false,
      dragRotate: false,
      touchZoomRotate: true,
      maxZoom: 10,
      minZoom: 2,
    });
    map.current = m;

    m.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right');
    m.addControl(new maplibregl.FullscreenControl(), 'top-right');
    m.addControl(
      new maplibregl.AttributionControl({
        compact: true,
        customAttribution: 'Boundaries: U.S. Census Bureau cartographic boundary files',
      })
    );

    // Without this, any style or source failure leaves the component stuck
    // showing the loading state with no explanation.
    m.on('error', (e) => {
      console.error('MapLibre error:', e?.error ?? e);
      setStatus((cur) => (cur === 'loading' ? 'error' : cur));
    });

    m.on('load', async () => {
      try {
        const res = await fetch('/data/districts.geojson');
        if (!res.ok) { setStatus('missing'); return; }
        const districts = await res.json();

        m.addSource('districts', { type: 'geojson', data: districts, promoteId: 'district_code' });

        // Try state outlines; they are optional so a missing file is not fatal.
        try {
          const st = await fetch('/data/states.geojson');
          if (st.ok) {
            m.addSource('states', { type: 'geojson', data: await st.json() });
          }
        } catch { /* state outlines are decorative */ }

        m.addLayer({
          id: 'district-fill',
          type: 'fill',
          source: 'districts',
          paint: {
            'fill-color': [
              'case',
              ['boolean', ['feature-state', 'selected'], false], '#3E6FA3',
              ['boolean', ['feature-state', 'hover'], false], '#C6D8EA',
              '#E9E5DC',
            ],
            'fill-opacity': 0.95,
          },
        });

        m.addLayer({
          id: 'district-line',
          type: 'line',
          source: 'districts',
          paint: { 'line-color': '#C9C3B7', 'line-width': 0.6 },
        });

        if (m.getSource('states')) {
          m.addLayer({
            id: 'state-line',
            type: 'line',
            source: 'states',
            paint: { 'line-color': '#8C8578', 'line-width': 1.1 },
          });
        }

        m.addLayer({
          id: 'district-selected-line',
          type: 'line',
          source: 'districts',
          paint: {
            'line-color': '#16233A',
            'line-width': ['case', ['boolean', ['feature-state', 'selected'], false], 2.2, 0],
          },
        });

        setStatus('ready');
      } catch {
        setStatus('error');
      }
    });

    m.on('mousemove', 'district-fill', (e) => {
      const f = e.features?.[0];
      if (!f) return;
      m.getCanvas().style.cursor = 'pointer';
      if (hovered.current !== null && hovered.current !== f.id) {
        m.setFeatureState({ source: 'districts', id: hovered.current }, { hover: false });
      }
      hovered.current = f.id ?? null;
      if (hovered.current !== null) {
        m.setFeatureState({ source: 'districts', id: hovered.current }, { hover: true });
      }
      setHoverLabel((f.properties as DistrictFeatureProps).label);
    });

    m.on('mouseleave', 'district-fill', () => {
      m.getCanvas().style.cursor = '';
      if (hovered.current !== null) {
        m.setFeatureState({ source: 'districts', id: hovered.current }, { hover: false });
      }
      hovered.current = null;
      setHoverLabel(null);
    });

    m.on('click', 'district-fill', (e) => {
      const f = e.features?.[0];
      if (!f) return;
      onSelect(f.properties as DistrictFeatureProps);
    });

    return () => { m.remove(); map.current = null; };
    // onSelect is stable in practice; re-running would tear down the map.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---- reflect selection ----
  useEffect(() => {
    const m = map.current;
    if (!m || status !== 'ready') return;

    m.removeFeatureState({ source: 'districts' });
    if (selected) m.setFeatureState({ source: 'districts', id: selected }, { selected: true });
  }, [selected, status]);

  // ---- zoom to a district chosen from search ----
  useEffect(() => {
    const m = map.current;
    if (!m || status !== 'ready' || !focusCode) return;

    const features = m.querySourceFeatures('districts', {
      filter: ['==', ['get', 'district_code'], focusCode],
    });
    if (!features.length) return;

    const bounds = new maplibregl.LngLatBounds();
    for (const f of features) {
      const geom = f.geometry;
      const rings =
        geom.type === 'Polygon' ? geom.coordinates
        : geom.type === 'MultiPolygon' ? geom.coordinates.flat()
        : [];
      for (const ring of rings) for (const c of ring as number[][]) bounds.extend(c as [number, number]);
    }
    if (!bounds.isEmpty()) m.fitBounds(bounds, { padding: 60, maxZoom: 9, duration: 700 });
  }, [focusCode, status]);

  return (
    <div className="relative h-full w-full overflow-hidden rounded-md border border-parchment-edge bg-parchment-deep">
      <div ref={container} className="h-full w-full" aria-hidden={status !== 'ready'} />

      {/* Screen readers and keyboard users get the district list beside the map,
          which is the accessible equivalent of clicking a polygon. */}
      <p className="sr-only">
        Interactive map of United States congressional districts. A searchable list of districts is
        available beside the map for keyboard and screen reader use.
      </p>

      {hoverLabel && (
        <div className="pointer-events-none absolute left-3 top-3 rounded-[3px] border border-parchment-edge
                        bg-white/95 px-3 py-1.5 font-mono text-[0.7rem] text-ink shadow-card">
          {hoverLabel}
        </div>
      )}

      {status === 'loading' && (
        <div className="absolute inset-0 flex items-center justify-center bg-parchment-deep" role="status">
          <p className="font-mono text-[0.7rem] uppercase tracking-wider text-slate-light">Loading boundaries…</p>
        </div>
      )}

      {status === 'missing' && (
        <div className="absolute inset-0 flex items-center justify-center bg-parchment-deep p-8">
          <div className="max-w-md text-center">
            <p className="font-display text-lg text-ink">District boundaries are not installed yet</p>
            <p className="mt-2 text-sm leading-relaxed text-slate">
              Run <code className="rounded bg-white px-1.5 py-0.5 font-mono text-[0.8rem]">npm run map:fetch</code> to
              download and simplify the Census boundary files into{' '}
              <code className="font-mono text-[0.8rem]">public/data/</code>. Search and district pages work
              without it.
            </p>
          </div>
        </div>
      )}

      {status === 'error' && (
        <div className="absolute inset-0 flex items-center justify-center bg-parchment-deep p-8">
          <div className="text-center">
            <p className="font-display text-lg text-ink">The map could not load</p>
            <button className="btn-secondary mt-4" onClick={() => window.location.reload()}>Reload</button>
          </div>
        </div>
      )}
    </div>
  );
}
