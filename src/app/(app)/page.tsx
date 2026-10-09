import Link from 'next/link';
import { TodayCard } from '@/components/TodayCard';
import { getEntries, getSession } from '@/lib/data';
import {
  addDays,
  dateDE,
  dayMonth,
  dayRow,
  fmtHM,
  fmtLong,
  hhmm,
  holidayName,
  monthKey,
  summarize,
  todayBerlin,
  vacationFor,
  wdLong,
  wdShort,
  weekStart,
} from '@/lib/zeit';

export const metadata = { title: 'Heute · Zeitkonto' };

export default async function HomePage() {
  const [{ profile }, entries] = await Promise.all([getSession(), getEntries()]);
  const today = todayBerlin();
  const byDate = new Map(entries.map((e) => [e.work_date, e]));
  const sum = summarize(entries, profile, today);
  const vac = vacationFor(entries, profile, today);
  const todayRow = dayRow(today, byDate.get(today) ?? null, profile, today);

  // Vorschlag für neue Einträge: die Zeiten vom letzten Arbeitstag
  const lastWork = [...entries].reverse().find((e) => e.kind === 'arbeit');
  const suggest = lastWork ? { start: hhmm(lastWork.start_time), end: hhmm(lastWork.end_time), pause: lastWork.break_min > 0 } : null;

  const mon = weekStart(today);
  const week = Array.from({ length: 5 }, (_, i) => dayRow(addDays(mon, i), byDate.get(addDays(mon, i)) ?? null, profile, today));
  const weekActual = week.reduce((s, d) => s + (d.actual ?? 0), 0);
  const weekTarget = week.reduce((s, d) => s + d.target, 0);

  const hello = profile.name ? `Hallo ${profile.name}` : 'Hallo';
  const tone = sum.balance > 0 ? 'plus' : sum.balance < 0 ? 'minus' : '';
  const hol = holidayName(today);
  const title = `${wdLong(today)}, ${dateDE(today)}${hol ? ` · ${hol}` : todayRow.target === 0 ? ' · kein Arbeitstag' : ''}`;

  return (
    <main className="page">
      <div className="head">
        <div>
          <div className="sub">{hello}</div>
          <h1>Zeitkonto</h1>
        </div>
      </div>

      <section className="balance" aria-label="Überstundenkonto">
        <div className="label">Überstundenkonto heute</div>
        <div className={`big ${tone}`}>{fmtHM(sum.balance, true)}</div>
        <div className="explain">
          {sum.balance === 0 ? 'Ausgeglichen.' : sum.balance > 0 ? `Du hast ${fmtLong(sum.balance)} gut.` : `Dir fehlen ${fmtLong(sum.balance).replace('minus ', '')}.`}
        </div>
        <div className="parts">
          <span className="part">Übertrag {dateDE(profile.start_date)}: <b>{fmtHM(profile.start_balance_min, true)}</b></span>
          <span className="part">seitdem: <b>{fmtHM(sum.fromEntries, true)}</b></span>
          {vac && <span className="part">Resturlaub {vac.year}: <b>{vac.left} Tage</b></span>}
        </div>
      </section>

      {sum.missingDays.length > 0 && (
        <Link href={`/monat?m=${monthKey(sum.firstMissing!)}&nachtragen=1`} className="note">
          <span>
            <strong>{sum.missingDays.length} Arbeitstage ohne Eintrag</strong>
            <br />
            <span className="small">Ab {dateDE(sum.firstMissing!)}. Sie zählen erst, wenn sie eingetragen sind.</span>
          </span>
          <span className="btn btn-sm" style={{ background: 'var(--amber)' }}>Nachtragen</span>
        </Link>
      )}

      <TodayCard
        date={today}
        title={title}
        entry={todayRow.entry}
        target={todayRow.target}
        actual={todayRow.actual}
        defaultBreak={profile.default_break_min}
        suggest={suggest}
      />

      <div className="h2">Diese Woche</div>
      <section className="card form" aria-label="Diese Woche">
        <div className="week">
          {week.map((d) => (
            <Link key={d.date} href={`/monat?m=${monthKey(d.date)}&tag=${d.date}`} className={d.date === today ? 'today' : ''}>
              <span className="wd">{wdShort(d.date)} {dayMonth(d.date)}</span>
              <span className="h">{d.holiday ? '·' : d.actual === null ? '–' : fmtHM(d.actual)}</span>
              <span
                className="d"
                style={{ color: d.diff === null ? 'var(--faint)' : d.diff > 0 ? 'var(--plus)' : d.diff < 0 ? 'var(--minus)' : 'var(--muted)' }}
              >
                {d.holiday ? 'Feiertag' : d.diff === null ? (d.future ? '' : 'offen') : fmtHM(d.diff, true)}
              </span>
            </Link>
          ))}
        </div>
        <div className="row between small">
          <span className="muted">Woche: {fmtHM(weekActual)} von {fmtHM(weekTarget)} Std.</span>
          <span style={{ fontWeight: 800, color: weekActual - weekTarget >= 0 ? 'var(--plus)' : 'var(--minus)' }}>
            {weekActual >= weekTarget ? fmtHM(weekActual - weekTarget, true) : ''}
          </span>
        </div>
      </section>
    </main>
  );
}
