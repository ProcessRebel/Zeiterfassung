'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { getSession } from '@/lib/data';
import { nowBerlinHM, timeToMin, todayBerlin, type Kind } from '@/lib/zeit';

export type SaveResult = { ok: true } | { ok: false; error: string };

const KINDS: Kind[] = ['arbeit', 'urlaub', 'krank', 'ausgleich'];
const isDate = (s: string) => /^\d{4}-\d{2}-\d{2}$/.test(s);
const isTime = (s: string) => /^\d{2}:\d{2}$/.test(s);

export type EntryInput = {
  work_date: string;
  kind: Kind;
  start_time: string;
  end_time: string;
  break_min: number;
  note: string;
};

export async function saveEntry(input: EntryInput): Promise<SaveResult> {
  const { supabase, userId, profile } = await getSession();
  const { work_date, kind } = input;
  if (!isDate(work_date)) return { ok: false, error: 'Das Datum stimmt nicht.' };
  if (!KINDS.includes(kind)) return { ok: false, error: 'Unbekannte Art.' };
  if (work_date < profile.start_date) return { ok: false, error: 'Dieser Tag liegt vor dem Startdatum in den Einstellungen.' };

  const row = {
    user_id: userId,
    work_date,
    kind,
    start_time: null as string | null,
    end_time: null as string | null,
    break_min: 0,
    note: input.note.trim().slice(0, 300),
    // am selben Tag eingetragen = laufend, sonst Nachtrag vom Zettel
    source: work_date === todayBerlin() ? 'laufend' : 'nachtrag',
  };

  if (kind === 'arbeit') {
    if (!isTime(input.start_time) || !isTime(input.end_time)) return { ok: false, error: 'Bitte Beginn und Ende eintragen.' };
    const s = timeToMin(input.start_time)!;
    const e = timeToMin(input.end_time)!;
    if (e <= s) return { ok: false, error: 'Das Ende muss nach dem Beginn liegen.' };
    const brk = Math.max(0, Math.min(240, Math.round(Number(input.break_min) || 0)));
    if (brk >= e - s) return { ok: false, error: 'Die Pause ist länger als die Arbeitszeit.' };
    row.start_time = input.start_time;
    row.end_time = input.end_time;
    row.break_min = brk;
  }

  const { error } = await supabase.from('time_entries').upsert(row, { onConflict: 'user_id,work_date' });
  if (error) return { ok: false, error: 'Speichern hat nicht geklappt. Bitte nochmal versuchen.' };
  revalidatePath('/', 'layout');
  return { ok: true };
}

export async function deleteEntry(work_date: string): Promise<SaveResult> {
  const { supabase } = await getSession();
  if (!isDate(work_date)) return { ok: false, error: 'Das Datum stimmt nicht.' };
  const { error } = await supabase.from('time_entries').delete().eq('work_date', work_date);
  if (error) return { ok: false, error: 'Löschen hat nicht geklappt.' };
  revalidatePath('/', 'layout');
  return { ok: true };
}

export type SettingsState = { error?: string; saved?: boolean } | undefined;

export async function saveSettings(_: SettingsState, form: FormData): Promise<SettingsState> {
  const { supabase, userId } = await getSession();
  const num = (k: string) => Number(String(form.get(k) ?? '').replace(',', '.'));

  const name = String(form.get('name') ?? '').trim().slice(0, 60);
  const start_date = String(form.get('start_date') ?? '');
  if (!isDate(start_date)) return { error: 'Bitte ein gültiges Startdatum wählen.' };

  const sign = form.get('balance_sign') === '-' ? -1 : 1;
  const bh = num('balance_h');
  const bm = num('balance_m');
  if (!Number.isFinite(bh) || !Number.isFinite(bm) || bh < 0 || bm < 0 || bm > 59) return { error: 'Den Übertrag bitte als Stunden und Minuten (0–59) eintragen.' };
  const start_balance_min = sign * Math.round(bh * 60 + bm);

  const th = num('target_h');
  const tm = num('target_m');
  const daily_target_min = Math.round(th * 60 + tm);
  if (!Number.isFinite(daily_target_min) || daily_target_min < 0 || daily_target_min > 720) return { error: 'Die Sollzeit pro Tag passt nicht.' };

  const workdays = form.getAll('workdays').map(Number).filter((n) => n >= 1 && n <= 7);
  if (workdays.length === 0) return { error: 'Bitte mindestens einen Arbeitstag wählen.' };

  const default_break_min = Math.round(num('default_break_min'));
  if (!Number.isFinite(default_break_min) || default_break_min < 0 || default_break_min > 120) return { error: 'Die Pause passt nicht (0–120 Minuten).' };

  const vRaw = String(form.get('vacation_days_per_year') ?? '').trim();
  const vacation_days_per_year = vRaw === '' ? null : Math.round(num('vacation_days_per_year'));
  if (vacation_days_per_year !== null && (!Number.isFinite(vacation_days_per_year) || vacation_days_per_year < 0 || vacation_days_per_year > 60)) {
    return { error: 'Die Urlaubstage passen nicht.' };
  }
  const cRaw = String(form.get('vacation_carryover_days') ?? '').trim();
  const vacation_carryover_days = cRaw === '' ? 0 : num('vacation_carryover_days');
  if (!Number.isFinite(vacation_carryover_days) || vacation_carryover_days < 0 || vacation_carryover_days > 60) return { error: 'Der Resturlaub passt nicht.' };

  const { error } = await supabase
    .from('profiles')
    .update({ name, start_date, start_balance_min, daily_target_min, workdays, default_break_min, vacation_days_per_year, vacation_carryover_days })
    .eq('id', userId);
  if (error) return { error: 'Speichern hat nicht geklappt. Bitte nochmal versuchen.' };
  revalidatePath('/', 'layout');
  if (form.get('first') === '1') redirect('/monat?nachtragen=1');
  return { saved: true };
}

// ───────────── Kommen / Gehen ─────────────
// Die Uhrzeit nimmt der Server (München), nicht das Handy.

export async function clockIn(): Promise<SaveResult> {
  const { supabase, userId, profile } = await getSession();
  const today = todayBerlin();
  if (today < profile.start_date) return { ok: false, error: 'Heute liegt vor dem Startdatum in den Einstellungen.' };
  const { data: existing } = await supabase.from('time_entries').select('id').eq('work_date', today).maybeSingle();
  if (existing) return { ok: false, error: 'Für heute gibt es schon einen Eintrag. Du kannst ihn über „Ändern“ anpassen.' };
  const { error } = await supabase.from('time_entries').insert({
    user_id: userId,
    work_date: today,
    kind: 'arbeit',
    start_time: nowBerlinHM(),
    end_time: null,
    break_min: 0,
    source: 'stempel',
  });
  if (error) return { ok: false, error: 'Kommen hat nicht geklappt. Bitte nochmal versuchen.' };
  revalidatePath('/', 'layout');
  return { ok: true };
}

export async function clockOut(pause: boolean): Promise<SaveResult> {
  const { supabase, profile } = await getSession();
  const today = todayBerlin();
  const { data: e } = await supabase.from('time_entries').select('start_time, end_time, kind').eq('work_date', today).maybeSingle();
  if (!e || e.kind !== 'arbeit' || !e.start_time || e.end_time) return { ok: false, error: 'Heute ist kein offener „Kommen“-Eintrag da.' };
  const end = nowBerlinHM();
  const s = timeToMin(e.start_time)!;
  const en = timeToMin(end)!;
  if (en <= s) return { ok: false, error: 'Gehen geht frühestens eine Minute nach Kommen.' };
  const brk = pause && en - s > profile.default_break_min ? profile.default_break_min : 0;
  const { error } = await supabase.from('time_entries').update({ end_time: end, break_min: brk }).eq('work_date', today);
  if (error) return { ok: false, error: 'Gehen hat nicht geklappt. Bitte nochmal versuchen.' };
  revalidatePath('/', 'layout');
  return { ok: true };
}
