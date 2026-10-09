'use client';

import { useEffect, useState, useTransition } from 'react';
import { clockIn, clockOut, correctClockIn } from '@/app/(app)/actions';
import { DayEditor } from './DayEditor';
import { fmtHM, hhmm, isOpen, KIND_LABEL, nowBerlinHM, timeToMin, type Entry } from '@/lib/zeit';

type Props = {
  date: string;
  title: string;
  entry: Entry | null;
  target: number;
  actual: number | null;
  defaultBreak: number;
  suggest: { start: string; end: string; pause: boolean } | null;
};

/** Minuten seit Kommen, läuft live mit */
function useSince(start: string | null) {
  const calc = () => {
    const s = timeToMin(start);
    const n = timeToMin(nowBerlinHM());
    return s === null || n === null ? 0 : Math.max(0, n - s);
  };
  const [min, setMin] = useState(calc);
  useEffect(() => {
    setMin(calc());
    const t = setInterval(() => setMin(calc()), 20_000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [start]);
  return min;
}

export function TodayCard({ date, title, entry, target, actual, defaultBreak, suggest }: Props) {
  const [mode, setMode] = useState<'stempel' | 'hand' | 'kommen'>('stempel');
  const [kommen, setKommen] = useState(hhmm(entry?.start_time));
  const [pause, setPause] = useState(suggest?.pause ?? true);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const open = isOpen(entry);
  const since = useSince(open ? entry!.start_time : null);

  const run = (fn: () => Promise<{ ok: boolean; error?: string }>) => {
    setError(null);
    startTransition(async () => {
      const res = await fn();
      if (!res.ok) setError(res.error ?? 'Das hat nicht geklappt.');
    });
  };

  // ── Nur die Kommen-Zeit korrigieren ──
  if (mode === 'kommen' && open) {
    return (
      <section className="card form" aria-label="Kommen-Zeit korrigieren">
        <div>
          <div className="label">{title}</div>
          <div style={{ fontSize: 22, fontWeight: 800 }}>Kommen-Zeit korrigieren</div>
        </div>
        <div className="field">
          <label htmlFor="kommen-zeit">Gekommen um</label>
          <input id="kommen-zeit" type="time" className="input" value={kommen} onChange={(e) => setKommen(e.target.value)} step={300} />
        </div>
        {error && <div className="error" role="alert">{error}</div>}
        <button
          className="btn btn-block"
          disabled={pending || !kommen}
          onClick={() =>
            run(async () => {
              const res = await correctClockIn(kommen);
              if (res.ok) setMode('stempel');
              return res;
            })
          }
        >
          {pending ? 'Speichert…' : 'Speichern'}
        </button>
        <button className="btn btn-ghost btn-sm" onClick={() => { setError(null); setMode('stempel'); }}>
          Abbrechen
        </button>
      </section>
    );
  }

  // ── Von Hand eintragen oder ändern ──
  if (mode === 'hand') {
    return (
      <section className="card form" aria-label="Heute von Hand eintragen">
        <div>
          <div className="label">{title}</div>
          <div style={{ fontSize: 22, fontWeight: 800 }}>{entry ? 'Eintrag ändern' : 'Von Hand eintragen'}</div>
        </div>
        <DayEditor
          key={entry ? `${entry.kind}${entry.start_time}${entry.end_time}${entry.break_min}` : 'neu'}
          date={date}
          entry={entry}
          target={target}
          defaultBreak={defaultBreak}
          suggest={suggest}
          onDone={() => setMode('stempel')}
        />
        <button className="btn btn-ghost btn-sm" onClick={() => setMode('stempel')}>
          Abbrechen
        </button>
      </section>
    );
  }

  // ── Noch nicht da: Kommen ──
  if (!entry) {
    return (
      <section className="card form clock" aria-label="Kommen">
        <div className="label">{title}</div>
        <button className="clock-btn in" disabled={pending} onClick={() => run(clockIn)}>
          <span className="clock-word">{pending ? '…' : 'Kommen'}</span>
          <span className="clock-sub">Uhrzeit wird gespeichert</span>
        </button>
        {error && <div className="error" role="alert">{error}</div>}
        <button className="btn btn-ghost btn-sm" onClick={() => setMode('hand')}>
          Zeiten von Hand eintragen
        </button>
      </section>
    );
  }

  // ── Da: Gehen ──
  if (open) {
    const worked = Math.max(0, since - (pause && since > defaultBreak ? defaultBreak : 0));
    return (
      <section className="card form clock" aria-label="Gehen">
        <div className="label">{title}</div>
        <div className="row between">
          <div>
            <div className="small muted" style={{ fontWeight: 700 }}>Gekommen um</div>
            <div style={{ fontSize: 28, fontWeight: 800 }}>{hhmm(entry.start_time)}</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div className="small muted" style={{ fontWeight: 700 }}>Bisher</div>
            <div style={{ fontSize: 28, fontWeight: 800 }}>{fmtHM(worked)}</div>
          </div>
        </div>
        <label className="toggle">
          <span>
            <strong>Pause gemacht</strong>
            <br />
            <span className="small muted">{pause ? `${defaultBreak} Min. werden abgezogen` : 'Durchgearbeitet, nichts wird abgezogen'}</span>
          </span>
          <input type="checkbox" checked={pause} onChange={(e) => setPause(e.target.checked)} />
          <span className="switch" aria-hidden="true" />
        </label>
        <button className="clock-btn out" disabled={pending} onClick={() => run(() => clockOut(pause))}>
          <span className="clock-word">{pending ? '…' : 'Gehen'}</span>
          <span className="clock-sub">Feierabend um {nowBerlinHM()}</span>
        </button>
        {error && <div className="error" role="alert">{error}</div>}
        <button className="btn btn-ghost btn-sm" onClick={() => { setKommen(hhmm(entry.start_time)); setMode('kommen'); }}>
          Kommen-Zeit korrigieren
        </button>
      </section>
    );
  }

  // ── Fertig für heute ──
  const diff = actual === null ? 0 : actual - target;
  return (
    <section className="card form" aria-label="Heute">
      <div className="row between">
        <div>
          <div className="label">{title}</div>
          <div style={{ fontSize: 24, fontWeight: 800 }}>
            {entry.kind === 'arbeit' ? `${hhmm(entry.start_time)}–${hhmm(entry.end_time)}` : KIND_LABEL[entry.kind]}
          </div>
          <div className="small muted">
            {entry.kind === 'arbeit' && (entry.break_min > 0 ? `mit ${entry.break_min} Min. Pause · ` : 'ohne Pause · ')}
            {actual !== null && `${fmtHM(actual)} Std.`}
          </div>
        </div>
        <span className={`pill ${diff > 0 ? 'plus' : diff < 0 ? 'minus' : 'zero'}`} style={{ fontSize: 16 }}>
          {fmtHM(diff, true)}
        </span>
      </div>
      <div className="ok">Schönen Feierabend.</div>
      <button className="btn btn-ghost btn-block" onClick={() => setMode('hand')}>
        Ändern
      </button>
    </section>
  );
}
