import Link from 'next/link';
import { MonthList } from '@/components/MonthList';
import { getEntries, getSession } from '@/lib/data';
import { daysOfMonth, dayRow, fmtHM, hhmm, monthKey, monthName, shiftMonth, summarize, todayBerlin } from '@/lib/zeit';

export const metadata = { title: 'Monat · Zeitkonto' };

type Search = Promise<{ m?: string; tag?: string; nachtragen?: string }>;

export default async function MonthPage({ searchParams }: { searchParams: Search }) {
  const sp = await searchParams;
  const [{ profile }, entries] = await Promise.all([getSession(), getEntries()]);
  const today = todayBerlin();
  const sum = summarize(entries, profile, today);

  const firstMonth = monthKey(profile.start_date);
  const lastMonth = shiftMonth(monthKey(today), 2); // zwei Monate voraus, z. B. für geplanten Urlaub
  const backfill = sp.nachtragen === '1';
  let month = sp.m && /^\d{4}-\d{2}$/.test(sp.m) ? sp.m : backfill && sum.firstMissing ? monthKey(sum.firstMissing) : monthKey(today);
  if (month < firstMonth) month = firstMonth;
  if (month > lastMonth) month = lastMonth;

  const byDate = new Map(entries.map((e) => [e.work_date, e]));
  const rows = daysOfMonth(month).map((d) => dayRow(d, byDate.get(d) ?? null, profile, today));

  // Zeiten des letzten Arbeitstags vor jedem Tag, als Vorschlag beim Nachtragen
  const lastWorkBefore: Record<string, { start: string; end: string; pause: boolean } | null> = {};
  let last: { start: string; end: string; pause: boolean } | null = null;
  for (const e of entries) {
    if (e.work_date >= `${month}-01`) break;
    if (e.kind === 'arbeit' && e.end_time) last = { start: hhmm(e.start_time), end: hhmm(e.end_time), pause: e.break_min > 0 };
  }
  for (const r of rows) {
    lastWorkBefore[r.date] = last;
    const e = r.entry;
    if (e && e.kind === 'arbeit' && e.end_time) last = { start: hhmm(e.start_time), end: hhmm(e.end_time), pause: e.break_min > 0 };
  }

  const monthEnd = rows[rows.length - 1].date;
  const nextMissingAfterMonth = sum.missingDays.find((d) => d > monthEnd) ?? null;

  const withEntry = rows.filter((r) => r.entry);
  const worked = withEntry.reduce((s, r) => s + (r.entry!.kind === 'arbeit' ? r.actual ?? 0 : 0), 0);
  const diff = withEntry.reduce((s, r) => s + (r.diff ?? 0), 0);
  const missingCount = rows.filter((r) => r.missing).length;

  let initialOpen: string | null = null;
  if (sp.tag && rows.some((r) => r.date === sp.tag)) initialOpen = sp.tag;
  else if (backfill) initialOpen = rows.find((r) => r.missing)?.date ?? null;

  const prev = shiftMonth(month, -1);
  const next = shiftMonth(month, 1);

  return (
    <main className="page">
      <div className="monthnav">
        <Link href={`/monat?m=${prev}${backfill ? '&nachtragen=1' : ''}`} className={`btn-icon btn${prev < firstMonth ? ' disabled' : ''}`} aria-label="Vormonat">
          ‹
        </Link>
        <div className="title">{monthName(month)}</div>
        <Link href={`/monat?m=${next}${backfill ? '&nachtragen=1' : ''}`} className={`btn-icon btn${next > lastMonth ? ' disabled' : ''}`} aria-label="Nächster Monat">
          ›
        </Link>
      </div>

      <div className="stats">
        <div className="stat">
          <div className="k">Gearbeitet</div>
          <div className="v">{fmtHM(worked)}</div>
        </div>
        <div className="stat">
          <div className="k">Plus/Minus</div>
          <div className="v" style={{ color: diff > 0 ? 'var(--plus)' : diff < 0 ? 'var(--minus)' : 'var(--ink)' }}>{fmtHM(diff, true)}</div>
        </div>
        <div className="stat">
          <div className="k">Offen</div>
          <div className="v" style={{ color: missingCount ? 'var(--amber)' : 'var(--ink)' }}>{missingCount} {missingCount === 1 ? 'Tag' : 'Tage'}</div>
        </div>
      </div>

      {backfill ? (
        <div className="note info">
          <span className="small">
            <strong>Nachtragen vom Zettel:</strong> Tag antippen, Zeiten eintragen, „nächster Tag“. Die Zeiten vom Vortag sind schon vorausgefüllt.
          </span>
        </div>
      ) : (
        missingCount > 0 && (
          <Link href={`/monat?m=${month}&nachtragen=1`} className="note">
            <span className="small"><strong>{missingCount} Tage fehlen</strong> in diesem Monat.</span>
            <span className="btn btn-sm" style={{ background: 'var(--amber)' }}>Nachtragen</span>
          </Link>
        )
      )}

      <MonthList
        month={month}
        rows={rows}
        defaultBreak={profile.default_break_min}
        initialOpen={initialOpen}
        backfill={backfill}
        lastWorkBefore={lastWorkBefore}
        nextMissingAfterMonth={nextMissingAfterMonth}
        today={today}
      />
    </main>
  );
}
