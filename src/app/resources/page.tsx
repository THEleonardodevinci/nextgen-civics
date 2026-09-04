import type { Metadata } from 'next';
import { getResources } from '@/lib/queries';
import ResourceBrowser from './ResourceBrowser';

export const metadata: Metadata = {
  title: 'Resources for better political understanding',
  description: 'A curated collection of tools, research organizations, datasets, and news resources for understanding political issues from multiple perspectives.',
};

export const revalidate = 600;

export default async function ResourcesPage() {
  const { categories, resources } = await getResources();

  return (
    <div className="shell py-14">
      <p className="eyebrow">Resources</p>
      <h1 className="mt-3 text-title">Resources for better political understanding</h1>
      <p className="mt-4 max-w-2xl text-[1.05rem] leading-relaxed text-slate">
        Tools, research organizations, datasets, and news resources that make it easier to understand
        political issues and encounter multiple perspectives. Listing a resource is not an endorsement
        of its methodology or its conclusions.
      </p>

      <ResourceBrowser categories={categories} resources={resources} />
    </div>
  );
}
