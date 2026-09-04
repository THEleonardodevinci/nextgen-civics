import { createClient } from '@/lib/supabase/server';
import { requireRole } from '@/lib/auth/guards';
import RecordManager, { type FieldDef } from '@/components/admin/RecordManager';

export default async function AdminTeamPage() {
  await requireRole('ADMIN');
  const { data } = await createClient().from('team_members').select('*').order('display_order');

  const fields: FieldDef[] = [
    { key: 'name', label: 'Name', required: true },
    { key: 'role_title', label: 'Role or title', required: true },
    { key: 'bio', label: 'Biography', type: 'textarea', required: true, help: 'Two to four sentences.' },
    { key: 'photo_url', label: 'Photograph URL' },
    { key: 'email', label: 'Email' },
    { key: 'website_url', label: 'Personal website' },
    { key: 'linkedin_url', label: 'LinkedIn' },
    { key: 'display_order', label: 'Display order', type: 'number', help: 'Lower numbers appear first in the carousel.' },
    { key: 'active', label: 'Show on the site', type: 'checkbox' },
  ];

  return (
    <RecordManager
      table="team_members"
      title="Team"
      intro="These entries populate the About Us carousel on the homepage. Display order controls the sequence; deactivating hides someone without deleting the record."
      rows={(data as Record<string, unknown>[]) ?? []}
      fields={fields}
      columns={[
        { key: 'name', label: 'Name' },
        { key: 'role_title', label: 'Role' },
        { key: 'display_order', label: 'Order' },
        { key: 'active', label: 'Visible' },
      ]}
      empty={{ title: 'No team members yet', body: 'Add the first person to populate the About Us carousel.' }}
    />
  );
}
