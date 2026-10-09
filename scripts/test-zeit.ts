// Prüft die Rechenlogik: npm test
import assert from 'node:assert/strict';
import { actualFor, holidays, summarize, targetFor, vacationFor, fmtHM, type Entry, type Profile } from '../src/lib/zeit.ts';

const p: Profile = {
  name: 'Test',
  start_date: '2026-01-01',
  start_balance_min: 120,
  daily_target_min: 300,
  workdays: [1, 2, 3, 4, 5],
  default_break_min: 30,
  vacation_days_per_year: 30,
  vacation_carryover_days: 2,
};

// Feiertage 2026 (Ostern = 5. April)
const h = holidays(2026);
assert.equal(h.get('2026-04-03'), 'Karfreitag');
assert.equal(h.get('2026-04-06'), 'Ostermontag');
assert.equal(h.get('2026-05-14'), 'Christi Himmelfahrt');
assert.equal(h.get('2026-05-25'), 'Pfingstmontag');
assert.equal(h.get('2026-06-04'), 'Fronleichnam');
assert.equal(h.size, 13);
// 2027: Ostern = 28. März
assert.equal(holidays(2027).get('2027-03-26'), 'Karfreitag');

// Soll
assert.equal(targetFor('2026-01-01', p), 0, 'Neujahr');
assert.equal(targetFor('2026-01-02', p), 300, 'Freitag');
assert.equal(targetFor('2026-01-03', p), 0, 'Samstag');

const work = (d: string, s: string, e: string, b = 30): Entry => ({ work_date: d, kind: 'arbeit', start_time: s, end_time: e, break_min: b, note: '' });

// 8:00–13:30 mit Pause = 5:00 → 0; ohne Pause = 5:30 → +30 Min.
assert.equal(actualFor(work('2026-01-02', '08:00', '13:30'), 300), 300);
assert.equal(actualFor(work('2026-01-02', '08:00', '13:30', 0), 300), 330);
assert.equal(actualFor({ ...work('2026-01-05', '', ''), kind: 'urlaub', start_time: null, end_time: null }, 300), 300);
assert.equal(actualFor({ ...work('2026-01-05', '', ''), kind: 'ausgleich', start_time: null, end_time: null }, 300), 0);

const entries: Entry[] = [
  work('2026-01-02', '08:00', '13:30', 0), // +30
  work('2026-01-03', '09:00', '11:00', 0), // Samstag: +120
  { work_date: '2026-01-05', kind: 'ausgleich', start_time: null, end_time: null, break_min: 0, note: '' }, // −300
  { work_date: '2026-01-07', kind: 'urlaub', start_time: null, end_time: null, break_min: 0, note: '' }, // 0
];
const s = summarize(entries, p, '2026-01-09');
// 120 Übertrag + 30 + 120 − 300 + 0 = −30
assert.equal(s.balance, -30);
// fehlend: 6.1. ist Feiertag, also nur 8.1. und 9.1.
assert.deepEqual(s.missingDays, ['2026-01-08', '2026-01-09']);

const v = vacationFor(entries, p, '2026-01-09');
assert.deepEqual(v, { year: 2026, entitlement: 32, used: 1, planned: 0, left: 31 });

assert.equal(fmtHM(754), '12:34');
assert.equal(fmtHM(-30), '−0:30');
assert.equal(fmtHM(90, true), '+1:30');

console.log('Alle Rechentests bestanden.');
