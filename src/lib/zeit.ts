// Reine Rechenlogik ohne Datenbank: läuft im Browser und auf dem Server gleich.
// Datumswerte sind immer Texte im Format JJJJ-MM-TT, damit keine Zeitzone dazwischenfunkt.

export type Kind = 'arbeit' | 'urlaub' | 'krank' | 'ausgleich';

export type Entry = {
  id?: string;
  work_date: string;
  kind: Kind;
  start_time: string | null; // "08:00" oder "08:00:00"
  end_time: string | null;
  break_min: number;
  note: string;
  source?: 'laufend' | 'nachtrag';
};

export type Profile = {
  name: string;
  start_date: string;
  start_balance_min: number;
  daily_target_min: number;
  workdays: number[];
  default_break_min: number;
  vacation_days_per_year: number | null;
  vacation_carryover_days: number;
};

export const KIND_LABEL: Record<Kind, string> = {
  arbeit: 'Gearbeitet',
  urlaub: 'Urlaub',
  krank: 'Krank',
  ausgleich: 'Überstunden frei',
};

export const KIND_SHORT: Record<Kind, string> = {
  arbeit: 'Arbeit',
  urlaub: 'Urlaub',
  krank: 'Krank',
  ausgleich: 'Frei (Ü)',
};

// ───────────── Datum ─────────────

const pad = (n: number) => String(n).padStart(2, '0');

export function toISO(d: Date) {
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
}

export function fromISO(iso: string) {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

export function addDays(iso: string, days: number) {
  const d = fromISO(iso);
  d.setUTCDate(d.getUTCDate() + days);
  return toISO(d);
}

/** ISO-Wochentag: 1 = Montag … 7 = Sonntag */
export function isoWeekday(iso: string) {
  const w = fromISO(iso).getUTCDay();
  return w === 0 ? 7 : w;
}

/** Heutiges Datum in München, egal wo der Server steht */
export function todayBerlin(now = new Date()) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Berlin', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
}

export function monthKey(iso: string) {
  return iso.slice(0, 7);
}

export function daysOfMonth(key: string) {
  const [y, m] = key.split('-').map(Number);
  const last = new Date(Date.UTC(y, m, 0)).getUTCDate();
  return Array.from({ length: last }, (_, i) => `${key}-${pad(i + 1)}`);
}

export function shiftMonth(key: string, delta: number) {
  const [y, m] = key.split('-').map(Number);
  const d = new Date(Date.UTC(y, m - 1 + delta, 1));
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}`;
}

/** Montag der Woche */
export function weekStart(iso: string) {
  return addDays(iso, 1 - isoWeekday(iso));
}

const WD = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];
const WD_LONG = ['Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag', 'Sonntag'];
const MONTHS = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];

export const wdShort = (iso: string) => WD[isoWeekday(iso) - 1];
export const wdLong = (iso: string) => WD_LONG[isoWeekday(iso) - 1];
export const monthName = (key: string) => `${MONTHS[Number(key.slice(5, 7)) - 1]} ${key.slice(0, 4)}`;
export const dayMonth = (iso: string) => `${Number(iso.slice(8, 10))}.${Number(iso.slice(5, 7))}.`;
export const dateDE = (iso: string) => `${iso.slice(8, 10)}.${iso.slice(5, 7)}.${iso.slice(0, 4)}`;

// ───────────── Feiertage Bayern (München) ─────────────

function easterSunday(year: number) {
  // Gaußsche Osterformel (Anonymer Gregorianischer Algorithmus)
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return toISO(new Date(Date.UTC(year, month - 1, day)));
}

const holidayCache = new Map<number, Map<string, string>>();

/** Gesetzliche Feiertage in München (Bayern, inkl. Mariä Himmelfahrt) */
export function holidays(year: number) {
  const cached = holidayCache.get(year);
  if (cached) return cached;
  const e = easterSunday(year);
  const list: [string, string][] = [
    [`${year}-01-01`, 'Neujahr'],
    [`${year}-01-06`, 'Heilige Drei Könige'],
    [addDays(e, -2), 'Karfreitag'],
    [addDays(e, 1), 'Ostermontag'],
    [`${year}-05-01`, 'Tag der Arbeit'],
    [addDays(e, 39), 'Christi Himmelfahrt'],
    [addDays(e, 50), 'Pfingstmontag'],
    [addDays(e, 60), 'Fronleichnam'],
    [`${year}-08-15`, 'Mariä Himmelfahrt'],
    [`${year}-10-03`, 'Tag der Deutschen Einheit'],
    [`${year}-11-01`, 'Allerheiligen'],
    [`${year}-12-25`, '1. Weihnachtstag'],
    [`${year}-12-26`, '2. Weihnachtstag'],
  ];
  const map = new Map(list);
  holidayCache.set(year, map);
  return map;
}

export function holidayName(iso: string) {
  return holidays(Number(iso.slice(0, 4))).get(iso) ?? null;
}

// ───────────── Zeiten ─────────────

/** "08:30" oder "08:30:00" → Minuten seit Mitternacht */
export function timeToMin(t: string | null | undefined) {
  if (!t) return null;
  const [h, m] = t.split(':').map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return null;
  return h * 60 + m;
}

export const hhmm = (t: string | null | undefined) => (t ? t.slice(0, 5) : '');

/** Soll an diesem Tag in Minuten (0 an Wochenenden und Feiertagen) */
export function targetFor(iso: string, p: Pick<Profile, 'workdays' | 'daily_target_min'>) {
  if (!p.workdays.includes(isoWeekday(iso))) return 0;
  if (holidayName(iso)) return 0;
  return p.daily_target_min;
}

/** Gearbeitete bzw. angerechnete Minuten eines Eintrags */
export function actualFor(e: Entry, target: number) {
  if (e.kind === 'urlaub' || e.kind === 'krank') return target; // zählt wie ein normaler Tag
  if (e.kind === 'ausgleich') return 0; // frei genommen, Soll wird vom Konto abgezogen
  const s = timeToMin(e.start_time);
  const en = timeToMin(e.end_time);
  if (s === null || en === null || en <= s) return 0;
  return Math.max(0, en - s - (e.break_min || 0));
}

export type DayRow = {
  date: string;
  target: number;
  holiday: string | null;
  entry: Entry | null;
  actual: number | null; // null = kein Eintrag
  diff: number | null;
  missing: boolean; // Arbeitstag in der Vergangenheit ohne Eintrag
  beforeStart: boolean;
  future: boolean;
};

export function dayRow(date: string, entry: Entry | null, p: Profile, today: string): DayRow {
  const target = targetFor(date, p);
  const actual = entry ? actualFor(entry, target) : null;
  const beforeStart = date < p.start_date;
  const future = date > today;
  return {
    date,
    target,
    holiday: holidayName(date),
    entry,
    actual,
    diff: actual === null ? null : actual - target,
    missing: !entry && target > 0 && !beforeStart && !future,
    beforeStart,
    future,
  };
}

export type Summary = {
  balance: number; // Überstundenkonto inkl. Übertrag, bis heute
  fromEntries: number; // nur aus den Einträgen
  missingDays: string[];
  entered: number;
  firstMissing: string | null;
};

/** Überstundenkonto: Übertrag + Summe aller (Ist − Soll) vom Startdatum bis heute. Tage ohne Eintrag zählen nicht. */
export function summarize(entries: Entry[], p: Profile, today: string): Summary {
  const byDate = new Map(entries.map((e) => [e.work_date, e]));
  let fromEntries = 0;
  let entered = 0;
  const missingDays: string[] = [];
  for (let d = p.start_date; d <= today; d = addDays(d, 1)) {
    const e = byDate.get(d);
    const target = targetFor(d, p);
    if (e) {
      fromEntries += actualFor(e, target) - target;
      entered++;
    } else if (target > 0) {
      missingDays.push(d);
    }
  }
  return {
    balance: p.start_balance_min + fromEntries,
    fromEntries,
    missingDays,
    entered,
    firstMissing: missingDays[0] ?? null,
  };
}

export type Vacation = { year: number; entitlement: number; used: number; planned: number; left: number } | null;

export function vacationFor(entries: Entry[], p: Profile, today: string): Vacation {
  if (p.vacation_days_per_year === null || p.vacation_days_per_year === undefined) return null;
  const year = Number(today.slice(0, 4));
  const carry = year === Number(p.start_date.slice(0, 4)) ? Number(p.vacation_carryover_days) || 0 : 0;
  let used = 0;
  let planned = 0;
  for (const e of entries) {
    if (e.kind !== 'urlaub' || Number(e.work_date.slice(0, 4)) !== year) continue;
    if (targetFor(e.work_date, p) === 0) continue; // Wochenende/Feiertag kostet keinen Urlaubstag
    if (e.work_date <= today) used++;
    else planned++;
  }
  const entitlement = p.vacation_days_per_year + carry;
  return { year, entitlement, used, planned, left: entitlement - used - planned };
}

// ───────────── Anzeige ─────────────

/** 754 → "12:34", −30 → "−0:30" */
export function fmtHM(min: number, withPlus = false) {
  const sign = min < 0 ? '−' : withPlus && min > 0 ? '+' : '';
  const a = Math.abs(Math.round(min));
  return `${sign}${Math.floor(a / 60)}:${pad(a % 60)}`;
}

/** 754 → "12 Std. 34 Min." */
export function fmtLong(min: number) {
  const a = Math.abs(Math.round(min));
  const h = Math.floor(a / 60);
  const m = a % 60;
  const parts = [];
  if (h) parts.push(`${h} Std.`);
  if (m || !h) parts.push(`${m} Min.`);
  return (min < 0 ? 'minus ' : '') + parts.join(' ');
}

/** 754 → "12,57" (Dezimalstunden, wie es Lohnprogramme erwarten) */
export const fmtDecimal = (min: number) => (min / 60).toFixed(2).replace('.', ',');
