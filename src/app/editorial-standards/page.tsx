import { org } from '@/data/site-content';

export const metadata = { title: 'Editorial standards' };

const PRINCIPLES = [
  { h: 'Political neutrality', p: 'We do not endorse candidates, parties, or ballot measures, and we do not publish material intended to move readers toward a party. Where a piece argues a position, it is labeled Opinion and attributed to a named author.' },
  { h: 'Accuracy', p: 'Empirical claims are sourced. Where research is contested or effect sizes are disputed, we say so rather than presenting one study as settled.' },
  { h: 'Source transparency', p: 'Articles carry a sources section. District statistics and political listings carry source URLs and a verification date. If we cannot source something, we do not publish it.' },
  { h: 'Separating fact, analysis, and opinion', p: 'Factual reporting states what happened. Analysis interprets it. Opinion argues for a position and is visibly labeled as such on cards, in the article header, and in structured data.' },
  { h: 'Avoiding inflammatory framing', p: 'We describe positions in terms their holders would recognize. We do not characterize a group by its least representative members, and we avoid framing that treats disagreement as evidence of bad faith.' },
  { h: 'Directory inclusion is structural, never ideological', p: 'Candidates appear in the directory because of a fact anyone can check — they filed with the FEC or a state, they qualified for the ballot, or they hold the office. They do not appear because we judged them moderate, centrist, or constructive, and they are not excluded for being far from the center. Those judgments are contested and relative, and a directory filtered that way is a slate of approved candidates regardless of what it is called. Where a reader wants to know where someone stands, we publish that candidate\u2019s own words with a link to where they said it, and let the reader judge.' },
  { h: 'Comparable presentation', p: 'Every political figure is presented through the same template with the same fields, so no listing is visually favored over another.' },
  { h: 'Updating outdated information', p: 'Records past the verification window are flagged internally and surfaced on the admin dashboard. Outdated records are deactivated rather than silently deleted.' },
  { h: 'Corrections', p: 'Errors are corrected promptly and substantive corrections are noted on the affected page. Anyone can report one, with or without giving us their name.' },
];

export default function EditorialStandardsPage() {
  return (
    <div className="shell max-w-3xl py-14">
      <h1 className="text-title">Editorial standards</h1>
      <p className="mt-4 text-[1.05rem] leading-relaxed text-slate">
        {org.name} publishes material about a subject where readers have good reason to be skeptical
        of anyone claiming neutrality. These are the rules we hold ourselves to, so that the claim is
        checkable rather than asserted.
      </p>

      <dl className="mt-12 space-y-9">
        {PRINCIPLES.map((s) => (
          <div key={s.h}>
            <dt className="font-display text-[1.2rem] text-ink">{s.h}</dt>
            <dd className="mt-2 max-w-prose leading-relaxed text-slate">{s.p}</dd>
          </div>
        ))}
      </dl>

      <p className="mt-12 rounded-md border border-parchment-edge bg-white p-5 text-sm leading-relaxed text-slate">
        If you believe we have fallen short of any of this, the{' '}
        <a href="/corrections" className="link-underline">corrections form</a> goes to an editor.
      </p>
    </div>
  );
}
