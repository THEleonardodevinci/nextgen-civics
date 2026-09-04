'use client';

import dynamic from 'next/dynamic';
import { useState } from 'react';
import DistrictSearch from '@/components/map/DistrictSearch';
import DistrictPanel from '@/components/map/DistrictPanel';
import type { DistrictFeatureProps } from '@/components/map/DistrictMap';

// MapLibre is ~200 KB and only needed on this route, so it loads on the
// client after the page is interactive rather than blocking first paint.
const DistrictMap = dynamic(() => import('@/components/map/DistrictMap'), {
  ssr: false,
  loading: () => (
    <div className="h-full w-full animate-pulse rounded-md border border-parchment-edge bg-parchment-deep" />
  ),
});

export default function DistrictExplorer() {
  const [selected, setSelected] = useState<string | null>(null);
  const [focus, setFocus] = useState<string | null>(null);

  const pick = (code: string) => { setSelected(code); setFocus(code); };

  return (
    <>
      <div className="mt-8 max-w-xl">
        <DistrictSearch onPick={pick} />
      </div>

      <div className="mt-8 grid gap-5 lg:grid-cols-[1fr_380px]">
        <div className="h-[420px] sm:h-[540px] lg:h-[620px]">
          <DistrictMap
            selected={selected}
            focusCode={focus}
            onSelect={(p: DistrictFeatureProps | null) => setSelected(p?.district_code ?? null)}
          />
        </div>

        <div className="hidden lg:block lg:h-[620px]">
          <DistrictPanel code={selected} onClose={() => setSelected(null)} variant="panel" />
        </div>
      </div>

      <div className="lg:hidden">
        <DistrictPanel code={selected} onClose={() => setSelected(null)} variant="sheet" />
      </div>
    </>
  );
}
