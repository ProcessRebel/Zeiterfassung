import 'server-only';
import { cache } from 'react';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import type { Entry, Profile } from '@/lib/zeit';

const PROFILE_FIELDS =
  'name, start_date, start_balance_min, daily_target_min, workdays, default_break_min, vacation_days_per_year, vacation_carryover_days';
export const ENTRY_FIELDS = 'id, work_date, kind, start_time, end_time, break_min, note, source';

/** Angemeldete Person + Profil. Ohne Login geht es zur Anmeldung. */
export const getSession = cache(async () => {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub as string | undefined;
  if (!userId) redirect('/login');

  const { data: profile } = await supabase.from('profiles').select(PROFILE_FIELDS).eq('id', userId).maybeSingle();
  const p: Profile = profile
    ? { ...profile, vacation_carryover_days: Number(profile.vacation_carryover_days ?? 0) }
    : {
        name: '',
        start_date: '2026-01-01',
        start_balance_min: 0,
        daily_target_min: 300,
        workdays: [1, 2, 3, 4, 5],
        default_break_min: 30,
        vacation_days_per_year: null,
        vacation_carryover_days: 0,
      };
  return { supabase, userId, profile: p };
});

/** Alle Einträge ab Startdatum (bei einer Person sind das höchstens ein paar hundert Zeilen pro Jahr). */
export const getEntries = cache(async () => {
  const { supabase, profile } = await getSession();
  const { data, error } = await supabase
    .from('time_entries')
    .select(ENTRY_FIELDS)
    .gte('work_date', profile.start_date)
    .order('work_date')
    .limit(5000);
  if (error) throw new Error(error.message);
  return (data ?? []) as Entry[];
});
