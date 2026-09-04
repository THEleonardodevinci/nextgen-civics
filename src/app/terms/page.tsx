import { org } from '@/data/site-content';

export const metadata = { title: 'Terms' };

export default function TermsPage() {
  return (
    <div className="shell max-w-3xl py-14">
      <h1 className="text-title">Terms of use</h1>
      <p className="mt-2 font-mono text-[0.65rem] uppercase tracking-wider text-slate-light">
        [PLACEHOLDER — have this reviewed before launch]
      </p>

      <div className="prose-article mt-8">
        <h2>Informational purpose</h2>
        <p>
          Everything on this site is provided for informational purposes. Listings of candidates,
          officeholders, organizations, and resources do not constitute endorsements by {org.name}.
        </p>

        <h2>Accuracy</h2>
        <p>
          Political information changes frequently. We show verification dates and source links so you
          can check for yourself, and we correct errors when they are reported, but we cannot guarantee
          that every record is current. Verify anything you intend to rely on against the original source.
        </p>

        <h2>External links</h2>
        <p>
          Links to external sites are provided as references. We do not control their content and
          linking to a resource is not an endorsement of its methodology or conclusions.
        </p>

        <h2>Accounts</h2>
        <p>
          You are responsible for keeping your account credentials secure. We may suspend accounts used
          to abuse the service.
        </p>

        <h2>Contact</h2>
        <p>Questions about these terms: {org.contactEmail}.</p>
      </div>
    </div>
  );
}
