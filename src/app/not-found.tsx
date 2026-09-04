import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="shell flex max-w-lg flex-col py-28">
      <p className="eyebrow">404</p>
      <h1 className="mt-3 text-title">That page does not exist</h1>
      <p className="mt-4 leading-relaxed text-slate">
        The link may be out of date, or the district or article may have been moved. The map and the
        article index are the two best places to pick the thread back up.
      </p>
      <div className="mt-8 flex flex-wrap gap-3">
        <Link href="/" className="btn-primary">Go to the homepage</Link>
        <Link href="/districts" className="btn-secondary">Open the district map</Link>
      </div>
    </div>
  );
}
