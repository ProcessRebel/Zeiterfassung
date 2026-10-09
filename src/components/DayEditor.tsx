'use client';

import { useState, useTransition } from 'react';
import { deleteEntry, saveEntry } from '@/app/(app)/actions';
import { actualFor, fmtHM, hhmm, KIND_LABEL, type Entry, type Kind } from '@/lib/zeit';

type Props = {
  date: string;
  entry: Entry | null;
  target: number; // Soll an diesem Tag in Minuten
  defaultBreak: number;
  suggest?: { start: string; end: string; pause: boolean } | null;
  onDone?: (result: 'saved' | 'deleted', entry: Entry | null) => void;
  nextLabel?: string | null; // zeigt "Speichern & weiter"
  onNext?: (entry: Entry) => void;
};

const KINDS: Kind[] = ['arbeit', 'urlaub', 'krank', 'ausgleich'];

export function DayEditor({ date, entry, target, defaultBreak, suggest, onDone, nextLabel, onNext }: Props) {
  const [kind, setKind] = useState<Kind>(entry?.kind ?? 'arbeit');
  const [start, setStart] = useState(hhmm(entry?.start_time) || suggest?.start || '');
  const [end, setEnd] = useState(hhmm(entry?.end_time) || suggest?.end || '');
  const breakLen = entry && entry.break_min > 0 ? entry.break_min : defaultBreak;
  const [pause, setPause] = useState(entry ? entry.break_min > 0 : suggest?.pause ?? true);
  const [note, setNote] = useState(entry?.note ?? '');
  const [error, setError] = useState<string | null>(null);
  const [pending, start_] = useTransition();

  const draft: Entry = {
    work_date: date,
    kind,
    start_time: start || null,
    end_time: end || null,
    break_min: pause ? breakLen : 0,
    note,
  };
  const timesOk = kind !== 'arbeit' || (start && end && end > start);
  const actual = timesOk ? actualFor(draft, target) : null;
  const diff = actual === null ? null : actual - target;

  function submit(then?: 'next') {
    setError(null);
    start_(async () => {
      const res = await saveEntry({
        work_date: date,
        kind,
        start_time: start,
        end_time: end,
        break_min: pause ? breakLen : 0,
        note,
      });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      if (then === 'next' && onNext) onNext(draft);
      else onDone?.('saved', draft);
    });
  }

  function remove() {
    if (!confirm('Eintrag für diesen Tag löschen?')) return;
    start_(async () => {
      const res = await deleteEntry(date);
      if (!res.ok) setError(res.error);
      else onDone?.('deleted', null);
    });
  }

  return (
    <div className="form">
      <div className="seg" role="radiogroup" aria-label="Art des Tages">
        {KINDS.map((k) => (
          <button key={k} type="button" role="radio" aria-checked={kind === k} className={kind === k ? 'on' : ''} onClick={() => setKind(k)}>
            {k === 'ausgleich' ? 'Frei (Ü)' : KIND_LABEL[k].replace('Gearbeitet', 'Arbeit')}
          </button>
        ))}
      </div>

      {kind === 'arbeit' && (
        <>
          <div className="grid2">
            <div className="field">
              <label htmlFor={`von-${date}`}>Von</label>
              <input id={`von-${date}`} type="time" className="input" value={start} onChange={(e) => setStart(e.target.value)} step={300} />
            </div>
            <div className="field">
              <label htmlFor={`bis-${date}`}>Bis</label>
              <input id={`bis-${date}`} type="time" className="input" value={end} onChange={(e) => setEnd(e.target.value)} step={300} />
            </div>
          </div>
          <label className="toggle">
            <span>
              <strong>Pause gemacht</strong>
              <br />
              <span className="small muted">{pause ? `${breakLen} Min. werden abgezogen` : 'Durchgearbeitet, nichts wird abgezogen'}</span>
            </span>
            <input type="checkbox" checked={pause} onChange={(e) => setPause(e.target.checked)} />
            <span className="switch" aria-hidden="true" />
          </label>
        </>
      )}

      {kind !== 'arbeit' && (
        <p className="small muted" style={{ margin: 0 }}>
          {kind === 'ausgleich'
            ? `Ein freier Tag aus dem Überstundenkonto. Es werden ${fmtHM(target)} Std. abgezogen.`
            : `Zählt wie ein normaler Arbeitstag (${fmtHM(target)} Std.). Das Konto bleibt gleich.`}
        </p>
      )}

      <div className="field">
        <label htmlFor={`notiz-${date}`}>Notiz (freiwillig)</label>
        <input id={`notiz-${date}`} className="input" value={note} onChange={(e) => setNote(e.target.value)} maxLength={300} placeholder="z. B. Mailing BluePrint, Inventur" />
      </div>

      <div className="result" aria-live="polite">
        <span className="small muted">
          {actual === null ? 'Beginn und Ende fehlen' : <>Zeit <b style={{ color: 'var(--ink)' }}>{fmtHM(actual)}</b> · Soll {fmtHM(target)}</>}
        </span>
        <span className={`val ${diff === null ? '' : ''}`} style={{ color: diff === null ? 'var(--faint)' : diff > 0 ? 'var(--plus)' : diff < 0 ? 'var(--minus)' : 'var(--muted)' }}>
          {diff === null ? '–' : fmtHM(diff, true)}
        </span>
      </div>

      {error && <div className="error" role="alert">{error}</div>}

      <div className="row">
        {nextLabel && onNext ? (
          <>
            <button type="button" className="btn btn-ghost" disabled={pending || !timesOk} onClick={() => submit()}>
              Speichern
            </button>
            <button type="button" className="btn grow" disabled={pending || !timesOk} onClick={() => submit('next')}>
              {pending ? 'Speichert…' : nextLabel}
            </button>
          </>
        ) : (
          <button type="button" className="btn grow" disabled={pending || !timesOk} onClick={() => submit()}>
            {pending ? 'Speichert…' : entry ? 'Änderung speichern' : 'Speichern'}
          </button>
        )}
      </div>
      {entry && (
        <button type="button" className="btn btn-danger btn-sm" style={{ alignSelf: 'flex-start' }} disabled={pending} onClick={remove}>
          Eintrag löschen
        </button>
      )}
    </div>
  );
}
