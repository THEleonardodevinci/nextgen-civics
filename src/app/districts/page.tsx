import type { Metadata } from 'next';
import Link from 'next/link';
import DistrictExplorer from './DistrictExplorer';
import { createClient } from '@/lib/supabase/server';
import { listingDisclaimer } from '@/data/site-content';
import { Disclaimer } from '@/components/ui/primitives';

export const metadata: Metadata = {
  title: 'Explore your district',
  description:
    'Look up your congressional district and find neutral information about independent and third-party political figures in your area.',
};

export const revalidate = 600;

export default async function DistrictsPage() {
  const supabase = createClient();
  // Accessible, crawlable list of every district we have a record for.
  const { data } = await supabase
    .from('districts')
    .select('district_code, state_name, district_number')
    .order('district_code');

  const districts = (data ?? []) as { district_code: string; state_name: string; district_number: string }[];

  const byState = districts.reduce<Record<string, typeof districts>>((acc, d) => {
    (acc[d.state_name] ??= []).push(d);
    return acc;
  }, {});

  return (
    <div className="shell py-14">
      <p className="eyebrow">Third-party voters</p>
      <h1 className="mt-3 text-title">Explore your district</h1>
      <p className="mt-4 max-w-2xl text-[1.05rem] leading-relaxed text-slate">
        Learn about your congressional district and discover independent and third-party political
        voices in your area.
      </p>

      <div className="mt-6 max-w-2xl">
        <Disclaimer>{listingDisclaimer}</Disclaimer>
      </div>

      <DistrictExplorer />

      <section className="mt-16">
        <h2 className="text-[1.3rem]">All districts</h2>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate">
          Every district also has its own page, which works without the map and is what search
          engines and screen readers use.
        </p>

        {Object.keys(byState).length === 0 ? (
          <p className="mt-6 text-sm text-slate">
            No district records yet. Load <code className="font-mono">supabase/seed.sql</code> or add
            districts under Admin → Districts.
          </p>
        ) : (
          <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {Object.entries(byState).map(([stateName, list]) => (
              <div key={stateName}>
                <h3 className="font-mono text-eyebrow uppercase text-slate">{stateName}</h3>
                <ul className="mt-2 flex flex-wrap gap-1.5">
                  {list.map((d) => (
                    <li key={d.district_code}>
                      <Link
                        href={`/districts/${d.district_code.toLowerCase()}`}
                        className="badge border-parchment-edge text-slate hover:border-ink hover:text-ink"
                      >
                        {d.district_number === 'AL' ? 'At-large' : Number(d.district_number)}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
