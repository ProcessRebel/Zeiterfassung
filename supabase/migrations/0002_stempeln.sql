-- Zeitkonto · Kommen/Gehen-Stempel
-- Im Supabase-Dashboard unter "SQL Editor" einmal komplett ausführen (nach 0001).
--
-- Erlaubt einen offenen Arbeitstag: Beginn ist gestempelt, Ende kommt mit "Gehen".

alter table public.time_entries drop constraint if exists arbeit_braucht_zeiten;
alter table public.time_entries add constraint arbeit_braucht_zeiten check (
  kind <> 'arbeit' or (start_time is not null and (end_time is null or end_time > start_time))
);

-- neue Herkunft 'stempel' = per Kommen/Gehen-Knopf erfasst
alter table public.time_entries drop constraint if exists time_entries_source_check;
alter table public.time_entries add constraint time_entries_source_check
  check (source in ('laufend', 'nachtrag', 'stempel'));
