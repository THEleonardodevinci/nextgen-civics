'use client';

export default function ErrorBoundary({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="shell flex max-w-lg flex-col py-28">
      <p className="eyebrow">Something went wrong</p>
      <h1 className="mt-3 text-title">This page failed to load</h1>
      <p className="mt-4 leading-relaxed text-slate">
        The most common cause is a database connection that is not configured yet. If you are running
        this locally, check that your Supabase environment variables are set in <code className="font-mono">.env.local</code>.
      </p>
      <button onClick={reset} className="btn-primary mt-8 self-start">Try again</button>
    </div>
  );
}
