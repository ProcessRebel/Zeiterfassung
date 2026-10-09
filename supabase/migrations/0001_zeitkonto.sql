-- Zeitkonto · Grundschema
-- Im Supabase-Dashboard unter "SQL Editor" einmal komplett ausführen.
--
-- Aufbau mit Blick auf ein späteres Zeiterfassungssystem:
-- eine Zeile pro Person und Tag, mit Beginn, Ende, Pause und Art.
-- Genau diese Felder erwartet praktisch jedes System beim Import.

-- ───────────── Tabellen ─────────────

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  name text not null default '',
  -- ab diesem Tag wird gerechnet
  start_date date not null default '2026-01-01',
  -- Überstunden-Übertrag zum Startdatum in Minuten (negativ = Minusstunden)
  start_balance_min integer not null default 0,
  -- Sollzeit je Arbeitstag in Minuten (5 Std. = 300)
  daily_target_min integer not null default 300 check (daily_target_min between 0 and 720),
  -- Arbeitstage nach ISO: 1 = Montag … 7 = Sonntag
  workdays smallint[] not null default '{1,2,3,4,5}',
  -- Pause, die abgezogen wird, wenn "Pause gemacht" an ist
  default_break_min integer not null default 30 check (default_break_min between 0 and 120),
  -- Urlaubstage pro Jahr (leer = keine Urlaubsübersicht)
  vacation_days_per_year integer check (vacation_days_per_year between 0 and 60),
  -- Resturlaub aus dem Vorjahr, der ins Startjahr übernommen wird
  vacation_carryover_days numeric(4,1) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.time_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade default auth.uid(),
  work_date date not null,
  -- arbeit = gearbeitet · urlaub · krank · ausgleich = Überstunden abgebaut (frei)
  kind text not null default 'arbeit' check (kind in ('arbeit', 'urlaub', 'krank', 'ausgleich')),
  start_time time,
  end_time time,
  break_min integer not null default 0 check (break_min between 0 and 240),
  note text not null default '',
  -- woher der Eintrag kommt: 'nachtrag' (vom Zettel) oder 'laufend' (am selben Tag)
  source text not null default 'laufend' check (source in ('laufend', 'nachtrag')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, work_date),
  -- Arbeitstage brauchen Beginn und Ende, Ende nach Beginn
  constraint arbeit_braucht_zeiten check (
    kind <> 'arbeit' or (start_time is not null and end_time is not null and end_time > start_time)
  )
);
create index on public.time_entries (user_id, work_date);

-- ───────────── Automatik ─────────────

-- Profil beim Registrieren anlegen
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'name', ''));
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- updated_at pflegen
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_touch before update on public.profiles
  for each row execute function public.touch_updated_at();
create trigger entries_touch before update on public.time_entries
  for each row execute function public.touch_updated_at();

-- ───────────── Zugriff (Row Level Security) ─────────────
-- Jede Person sieht und ändert nur ihre eigenen Zeilen. Niemand sonst, auch kein anderer Login.

alter table public.profiles enable row level security;
alter table public.time_entries enable row level security;

create policy "profil: nur eigenes lesen" on public.profiles
  for select using (id = auth.uid());
create policy "profil: nur eigenes ändern" on public.profiles
  for update using (id = auth.uid()) with check (id = auth.uid());

create policy "zeiten: nur eigene lesen" on public.time_entries
  for select using (user_id = auth.uid());
create policy "zeiten: nur eigene anlegen" on public.time_entries
  for insert with check (user_id = auth.uid());
create policy "zeiten: nur eigene ändern" on public.time_entries
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "zeiten: nur eigene löschen" on public.time_entries
  for delete using (user_id = auth.uid());
