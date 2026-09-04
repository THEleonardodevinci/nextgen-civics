import { createClient } from '@/lib/supabase/server';
import { requireRole } from '@/lib/auth/guards';
import { getVerificationWindow } from '@/lib/queries';
import FigureManager from './FigureManager';
import type { PoliticalFigure } from '@/types/db';

export default async function AdminFiguresPage() {
  await requireRole('ADMIN');
  const supabase = createClient();

  const [{ data: figures }, { data: districts }, windowDays] = await Promise.all([
    supabase.from('political_figures').select('*').order('name').limit(1000),
    supabase.from('districts').select('district_code').order('district_code'),
    getVerificationWindow(),
  ]);

  return (
    <FigureManager
      figures={(figures as PoliticalFigure[]) ?? []}
      districtCodes={((districts as { district_code: string }[]) ?? []).map((d) => d.district_code)}
      windowDays={windowDays}
    />
  );
}
