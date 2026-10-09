'use client';

import { useState } from 'react';
import { DayEditor } from './DayEditor';
import { fmtHM, hhmm, KIND_LABEL, type Entry } from '@/lib/zeit';

type Props = {
  date: string;
  title: string;
  entry: Entry | null;
  target: number;
  actual: number | null;
  defaultBreak: number;
  suggest: { start: string; end: string; pause: boolean } | null;
};

export function TodayCard({ date, title, entry, target, actual, defaultBreak, suggest }: Props) {
  const [editing, setEditing] = useState(!entry);
  const [justSaved, setJustSaved] = useState(false);

  if (entry && !editing) {
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
        {justSaved && <div className="ok">Gespeichert.</div>}
        <button className="btn btn-ghost btn-block" onClick={() => setEditing(true)}>
          Ändern
        </button>
      </section>
    );
  }

  return (
    <section className="card form" aria-label="Heute eintragen">
      <div>
        <div className="label">{title}</div>
        <div style={{ fontSize: 22, fontWeight: 800 }}>{entry ? 'Eintrag ändern' : 'Heute eintragen'}</div>
      </div>
      <DayEditor
        key={entry ? `${entry.kind}${entry.start_time}${entry.end_time}${entry.break_min}` : 'neu'}
        date={date}
        entry={entry}
        target={target}
        defaultBreak={defaultBreak}
        suggest={suggest}
        onDone={(r) => {
          setEditing(r === 'deleted');
          setJustSaved(r === 'saved');
        }}
      />
      {entry && (
        <button className="btn btn-ghost btn-sm" onClick={() => setEditing(false)}>
          Abbrechen
        </button>
      )}
    </section>
  );
}
