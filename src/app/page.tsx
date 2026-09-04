import Link from 'next/link';
import Hero from '@/components/home/Hero';
import Statistics from '@/components/home/Statistics';
import TeamCarousel from '@/components/home/TeamCarousel';
import Newsletter from '@/components/home/Newsletter';
import ArticleCard from '@/components/articles/ArticleCard';
import { SectionHeader } from '@/components/ui/primitives';
import {
  ActionsSection, ConsequencesSection, DistrictCta, MissionIntro,
  PerspectivesSection, PillarsSection, PolarizationSection, QuickLinksSection,
} from '@/components/home/Sections';
import { getPublishedArticles, getStatistics, getTeamMembers } from '@/lib/queries';

export const revalidate = 300;

/**
 * Homepage doubles as the mission page. Every block below is a standalone
 * component, so sections can be reordered, removed, or added without
 * touching any of the others.
 */
export default async function HomePage() {
  const [{ articles }, team, stats] = await Promise.all([
    getPublishedArticles({ limit: 3 }),
    getTeamMembers(),
    getStatistics(),
  ]);

  return (
    <>
      <Hero />
      <MissionIntro />
      <PolarizationSection />
      <Statistics stats={stats} />
      <ConsequencesSection />
      <ActionsSection />
      <PillarsSection />

      {articles.length > 0 && (
        <section className="shell py-20">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <SectionHeader eyebrow="Reading" title="Latest articles" />
            <Link href="/articles" className="btn-secondary">All articles</Link>
          </div>
          <div className="mt-10 grid gap-5 md:grid-cols-3">
            {articles.map((a) => <ArticleCard key={a.id} article={a} />)}
          </div>
        </section>
      )}

      <DistrictCta />
      <PerspectivesSection />
      <QuickLinksSection />
      <TeamCarousel members={team} />
      <Newsletter />
    </>
  );
}
