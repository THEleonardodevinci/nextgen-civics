import { createClient } from '@/lib/supabase/server';
import { requireRole } from '@/lib/auth/guards';
import SettingsEditor from './SettingsEditor';

export default async function SettingsPage() {
  await requireRole('SUPER_ADMIN');
  const { data } = await createClient().from('site_settings').select('*').order('key');
  return (
    <>
      <h1 className="text-title">Settings</h1>
      <p className="mt-3 max-w-2xl text-sm leading-relaxed text-slate">
        Site-wide values stored as JSON. Homepage statistics live under <code className="font-mono">statistics</code>;
        every entry needs a real source before it should be published.
      </p>
      <SettingsEditor settings={(data as { key: string; value: unknown; description: string | null }[]) ?? []} />
    </>
  );
}
