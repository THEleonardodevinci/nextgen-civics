import { org } from '@/data/site-content';

export const metadata = { title: 'Accessibility' };

export default function AccessibilityPage() {
  return (
    <div className="shell max-w-3xl py-14">
      <h1 className="text-title">Accessibility</h1>
      <div className="prose-article mt-8">
        <p>
          {org.name} aims to meet WCAG 2.1 Level AA. What that means concretely on this site:
        </p>
        <ul>
          <li>Every interactive element is reachable and operable with a keyboard, with a visible focus ring.</li>
          <li>A skip link jumps past the navigation to the main content.</li>
          <li>Status information is never conveyed by color alone; badges carry text labels.</li>
          <li>Images have alt text, and the article editor prompts for it when inserting one.</li>
          <li>Animation respects the reduced-motion setting in your operating system.</li>
          <li>
            The district map is a visual interface. Every district also has its own page, and a full
            searchable district list sits directly beneath the map, so nothing on the map is
            reachable only by pointing at a polygon.
          </li>
        </ul>
        <h2>Reporting a problem</h2>
        <p>
          If something on this site is difficult or impossible to use, write to {org.contactEmail} and
          describe what you were trying to do. We treat accessibility reports as bugs, not requests.
        </p>
      </div>
    </div>
  );
}
