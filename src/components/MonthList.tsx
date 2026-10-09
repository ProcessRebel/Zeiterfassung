'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { DayEditor } from './DayEditor';
import { dayMonth, fmtHM, hhmm, KIND_SHORT, shiftMonth, wdShort, type DayRow, type Entry } from '@/lib/zeit';

type Props = {
  month: string;
  rows: DayRow[];
  defaultBreak: number;
  initialOpen: string | null;
  backfill: boolean;
  lastWorkBefore: Record<string, { start: string; end: string; pause: boolean } | null>;
  nextMissingAfterMonth: string | null; // erster fehlender Tag nach diesem Monat
  today: string;
};

export function MonthList({ month, rows, defaultBreak, initialOpen, backfill, lastWorkBefore, nextMissingAfterMonth, today: todayISO }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState<string | null>(initialOpen);
  const [lastDraft, setLastDraft] = useState<Entry | null>(null);
  const [saved, setSaved] = useState<string | null>(null);
  const refs = useRef(new Map<string, HTMLElement>());

  useEffect(() => {
    setOpen(initialOpen);
  }, [initialOpen, month]);

  useEffect(() => {
    if (!open) return;
    const el = refs.current.get(open);
    // kurz warten, bis die Zeile aufgeklappt ist
    const t = setTimeout(() => el?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 60);
    return () => clearTimeout(t);
  }, [open]);

  const missing = useMemo(() => rows.filter((r) => r.missing).map((r) => r.date), [rows]);

  function suggestFor(date: string) {
    if (lastDraft && lastDraft.kind === 'arbeit' && lastDraft.work_date < date) {
      return { start: hhmm(lastDraft.start_time), end: hhmm(lastDraft.end_time), pause: lastDraft.break_min > 0 };
    }
    return lastWorkBefore[date] ?? null;
  }

  function goNext(after: string, draft: Entry) {
    setLastDraft(draft);
    setSaved(after);
    const next = missing.find((d) => d > after);
    if (next) {
      setOpen(next);
      return;
    }
    setOpen(null);
    if (nextMissingAfterMonth) router.push(`/monat?m=${nextMissingAfterMonth.slice(0, 7)}&nachtragen=1`);
  }

  const visible = rows.filter((r) => !r.beforeStart);
  const nextLabelFor = (date: string) => {
    if (missing.some((d) => d > date)) return 'Speichern & nächster Tag';
    if (nextMissingAfterMonth) return `Speichern & weiter im ${new Intl.DateTimeFormat('de-DE', { month: 'long' }).format(new Date(`${shiftMonth(month, 1)}-01T12:00:00`))}`;
    return null;
  };

  return (
    <div className="days">
      {visible.map((r) => {
        const isOpen = open === r.date;
        const e = r.entry;
        const weekendEmpty = r.target === 0 && !e && !r.holiday;
        let what: React.ReactNode;
        if (r.open) what = r.future || r.date === todayISO ? `seit ${hhmm(e!.start_time)} da` : `${hhmm(e!.start_time)}–? · Gehen fehlt`;
        else if (e) what = e.kind === 'arbeit' ? `${hhmm(e.start_time)}–${hhmm(e.end_time)}${e.break_min > 0 ? '' : ' · ohne Pause'}` : KIND_SHORT[e.kind];
        else if (r.holiday) what = r.holiday;
        else if (r.missing) what = 'fehlt noch';
        else if (r.target === 0) what = '';
        else what = '';

        let pill: React.ReactNode = null;
        if (r.open) pill = <span className={`pill ${r.date === todayISO ? 'kind' : 'minus'}`}>{r.date === todayISO ? 'läuft' : 'offen'}</span>;
        else if (r.diff !== null) pill = <span className={`pill ${r.diff > 0 ? 'plus' : r.diff < 0 ? 'minus' : 'zero'}`}>{fmtHM(r.diff, true)}</span>;
        else if (r.holiday) pill = <span className="pill hol">Feiertag</span>;
        else if (r.missing) pill = <span className="pill miss">offen</span>;

        return (
          <article
            key={r.date}
            ref={(el) => {
              if (el) refs.current.set(r.date, el);
            }}
            className={`day${weekendEmpty && !isOpen ? ' weekend' : ''}${isOpen ? ' open' : ''}${r.missing && !isOpen ? ' is-missing' : ''}`}
          >
            <button type="button" className="dayhead" aria-expanded={isOpen} onClick={() => setOpen(isOpen ? null : r.date)}>
              <span className="date">
                <b>{wdShort(r.date)}</b>
                <span>{dayMonth(r.date)}</span>
              </span>
              <span className={`what${e ? '' : ' empty'}`}>
                {what}
                {saved === r.date && !isOpen && <span className="ok"> ✓</span>}
              </span>
              {pill}
            </button>
            {isOpen && (
              <div className="daybody">
                <DayEditor
                  key={`${r.date}-${e?.kind}-${e?.start_time}-${e?.end_time}-${e?.break_min}`}
                  date={r.date}
                  entry={e}
                  target={r.target}
                  defaultBreak={defaultBreak}
                  suggest={suggestFor(r.date)}
                  nextLabel={backfill || r.missing ? nextLabelFor(r.date) : null}
                  onNext={(draft) => goNext(r.date, draft)}
                  onDone={(res, draft) => {
                    if (draft) setLastDraft(draft);
                    setSaved(res === 'saved' ? r.date : null);
                    setOpen(null);
                  }}
                />
              </div>
            )}
          </article>
        );
      })}
    </div>
  );
}
