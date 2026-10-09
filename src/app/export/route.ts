import { getEntries, getSession } from '@/lib/data';
import { addDays, actualFor, dateDE, fmtDecimal, hhmm, holidayName, KIND_LABEL, targetFor, todayBerlin, wdShort, type Entry } from '@/lib/zeit';

export const dynamic = 'force-dynamic';

const esc = (v: string | number, sep: string) => {
  const s = String(v ?? '');
  return s.includes(sep) || s.includes('"') || s.includes('\n') ? `"${s.replace(/"/g, '""')}"` : s;
};

export async function GET(request: Request) {
  const { profile } = await getSession();
  const entries = await getEntries();
  const format = new URL(request.url).searchParams.get('format') === 'import' ? 'import' : 'excel';
  const today = todayBerlin();
  const byDate = new Map<string, Entry>(entries.map((e) => [e.work_date, e]));
  const lines: string[] = [];

  if (format === 'import') {
    // Maschinenlesbar: ISO-Datum, Punkt als Dezimaltrenner, Minuten als Ganzzahl. Eine Zeile pro Eintrag.
    const sep = ',';
    lines.push(['person', 'date', 'type', 'start', 'end', 'break_minutes', 'worked_minutes', 'target_minutes', 'balance_minutes', 'note', 'source'].join(sep));
    for (const e of entries) {
      const target = targetFor(e.work_date, profile);
      const worked = actualFor(e, target);
      lines.push(
        [profile.name, e.work_date, e.kind, hhmm(e.start_time), hhmm(e.end_time), e.break_min, worked, target, worked - target, e.note, e.source ?? '']
          .map((v) => esc(v, sep))
          .join(sep),
      );
    }
    lines.push(['', profile.start_date, 'uebertrag', '', '', 0, 0, 0, profile.start_balance_min, 'Überstunden-Übertrag zum Startdatum', ''].map((v) => esc(v, sep)).join(sep));
  } else {
    // Für deutsches Excel: Semikolon, Komma als Dezimaltrenner, alle Tage mit laufendem Saldo
    const sep = ';';
    lines.push(['Datum', 'Tag', 'Art', 'Von', 'Bis', 'Pause (Min.)', 'Gearbeitet (Std.)', 'Soll (Std.)', 'Plus/Minus (Std.)', 'Konto (Std.)', 'Feiertag', 'Notiz'].join(sep));
    lines.push([dateDE(profile.start_date), '', 'Übertrag', '', '', '', '', '', '', fmtDecimal(profile.start_balance_min), '', ''].join(sep));
    let balance = profile.start_balance_min;
    const end = entries.length && entries[entries.length - 1].work_date > today ? entries[entries.length - 1].work_date : today;
    for (let d = profile.start_date; d <= end; d = addDays(d, 1)) {
      const e = byDate.get(d);
      const target = targetFor(d, profile);
      const hol = holidayName(d) ?? '';
      if (!e && target === 0 && !hol) continue; // leere Wochenenden weglassen
      const worked = e ? actualFor(e, target) : null;
      if (e && d <= today) balance += (worked ?? 0) - target;
      lines.push(
        [
          dateDE(d),
          wdShort(d),
          e ? KIND_LABEL[e.kind] : hol ? 'Feiertag' : d > today ? '' : 'fehlt',
          e ? hhmm(e.start_time) : '',
          e ? hhmm(e.end_time) : '',
          e && e.kind === 'arbeit' ? e.break_min : '',
          worked === null ? '' : fmtDecimal(worked),
          fmtDecimal(target),
          worked === null ? '' : fmtDecimal(worked - target),
          d <= today ? fmtDecimal(balance) : '',
          hol,
          e?.note ?? '',
        ]
          .map((v) => esc(v, sep))
          .join(sep),
      );
    }
  }

  const body = '﻿' + lines.join('\r\n') + '\r\n';
  const name = `zeitkonto_${(profile.name || 'export').toLowerCase().replace(/[^a-z0-9]+/g, '-')}_${today}_${format}.csv`;
  return new Response(body, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${name}"`,
      'Cache-Control': 'no-store',
    },
  });
}
