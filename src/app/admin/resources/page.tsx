import { createClient } from '@/lib/supabase/server';
import { requireRole } from '@/lib/auth/guards';
import RecordManager, { type FieldDef } from '@/components/admin/RecordManager';

export default async function AdminResourcesPage() {
  await requireRole('ADMIN');
  const supabase = createClient();
  const [{ data: resources }, { data: categories }] = await Promise.all([
    supabase.from('resources').select('*').order('sort_order'),
    supabase.from('resource_categories').select('id, name').order('sort_order'),
  ]);

  const fields: FieldDef[] = [
    { key: 'name', label: 'Name', required: true },
    { key: 'slug', label: 'Slug', required: true, help: 'Lowercase words separated by hyphens.' },
    { key: 'url', label: 'URL', required: true, help: 'Must start with https://' },
    { key: 'description', label: 'Description', type: 'textarea', required: true,
      help: 'Describe what the resource does. Avoid language that reads as an endorsement.' },
    { key: 'logo_url', label: 'Logo URL' },
    { key: 'category_id', label: 'Category', type: 'select',
      options: ((categories as { id: string; name: string }[]) ?? []).map((c) => ({ value: c.id, label: c.name })) },
    { key: 'sort_order', label: 'Sort order', type: 'number' },
    { key: 'featured', label: 'Featured', type: 'checkbox' },
    { key: 'active', label: 'Active', type: 'checkbox' },
  ];

  return (
    <RecordManager
      table="resources"
      title="Resources"
      intro="Entries appear on the public resources page grouped by category. Listing a resource is not an endorsement, and descriptions should stay neutral."
      rows={(resources as Record<string, unknown>[]) ?? []}
      fields={fields}
      columns={[
        { key: 'name', label: 'Name' },
        { key: 'url', label: 'URL' },
        { key: 'featured', label: 'Featured' },
        { key: 'active', label: 'Active' },
      ]}
      empty={{ title: 'No resources yet', body: 'Add the first entry, or load supabase/seed.sql.' }}
    />
  );
}
