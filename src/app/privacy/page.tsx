import { org } from '@/data/site-content';

export const metadata = { title: 'Privacy policy' };

export default function PrivacyPage() {
  return (
    <div className="shell max-w-3xl py-14">
      <h1 className="text-title">Privacy policy</h1>
      <p className="mt-2 font-mono text-[0.65rem] uppercase tracking-wider text-slate-light">
        [PLACEHOLDER — have this reviewed before launch]
      </p>

      <div className="prose-article mt-8">
        <p>
          This page describes what {org.name} stores. It is a plain-language placeholder and should be
          reviewed by counsel before the site goes live.
        </p>

        <h2>What we store</h2>
        <ul>
          <li><strong>If you do not create an account:</strong> nothing that identifies you. Page view counts are aggregated per day with no user identifier attached.</li>
          <li><strong>If you create an account:</strong> your email address, an optional display name and photo, and the articles, resources, and district you choose to save.</li>
          <li><strong>If you contact us:</strong> whatever you put in the form. The corrections form works without a name or email.</li>
          <li><strong>If you subscribe to the newsletter:</strong> your email address and optional first name.</li>
        </ul>

        <h2>What we do not do</h2>
        <ul>
          <li>We do not ask for your political affiliation, and there is no field for it.</li>
          <li>We do not infer your political views from what you read, save, search, or click.</li>
          <li>We do not build political profiles of individual users.</li>
          <li>Administrators can see that an article is popular. They cannot see who read it.</li>
          <li>We do not sell or share browsing data.</li>
        </ul>

        <h2>Saved districts</h2>
        <p>
          Saving a district is a convenience so you can find it again. It is not treated as a signal
          about your politics and is not used for segmentation of any kind.
        </p>

        <h2>Your choices</h2>
        <p>
          You can edit or clear your saved content at any time from your account page, unsubscribe
          from the newsletter with the link in any email, and request deletion of your account by
          writing to {org.contactEmail}.
        </p>

        <h2>Third parties</h2>
        <p>
          Authentication and data storage are provided by Supabase. Hosting is provided by the platform
          this site is deployed on. Map boundary files are served from this site rather than a third-party
          tile provider, so viewing the map does not disclose your activity to a mapping company.
        </p>
      </div>
    </div>
  );
}
