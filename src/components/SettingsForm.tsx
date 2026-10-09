'use client';

import { useActionState } from 'react';
import { saveSettings, type SettingsState } from '@/app/(app)/actions';
import type { Profile } from '@/lib/zeit';

const DAYS = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];

export function SettingsForm({ profile, first }: { profile: Profile; first: boolean }) {
  const [state, action, pending] = useActionState<SettingsState, FormData>(saveSettings, undefined);
  const bal = Math.abs(profile.start_balance_min);

  return (
    <form action={action} className="form">
      {first && <input type="hidden" name="first" value="1" />}

      <section className="card form">
        <div className="field">
          <label htmlFor="name">Dein Name</label>
          <input id="name" name="name" className="input" defaultValue={profile.name} autoComplete="given-name" />
        </div>
      </section>

      <div className="h2">Überstunden-Übertrag</div>
      <section className="card form">
        <p className="small muted" style={{ margin: 0 }}>
          Wie viele Überstunden hattest du am Startdatum schon? Steht meist auf dem letzten Zettel von 2025. Minusstunden mit „−“.
        </p>
        <div className="field">
          <label htmlFor="start_date">Startdatum</label>
          <input id="start_date" name="start_date" type="date" className="input" defaultValue={profile.start_date} required />
        </div>
        <div className="grid3">
          <div className="field">
            <label htmlFor="balance_sign">Plus/Minus</label>
            <select id="balance_sign" name="balance_sign" className="input" defaultValue={profile.start_balance_min < 0 ? '-' : '+'}>
              <option value="+">+ Plus</option>
              <option value="-">− Minus</option>
            </select>
          </div>
          <div className="field">
            <label htmlFor="balance_h">Stunden</label>
            <input id="balance_h" name="balance_h" className="input" inputMode="numeric" defaultValue={Math.floor(bal / 60)} />
          </div>
          <div className="field">
            <label htmlFor="balance_m">Minuten</label>
            <input id="balance_m" name="balance_m" className="input" inputMode="numeric" defaultValue={bal % 60} />
          </div>
        </div>
      </section>

      <div className="h2">Arbeitszeit</div>
      <section className="card form">
        <div className="grid2">
          <div className="field">
            <label htmlFor="target_h">Soll pro Tag: Std.</label>
            <input id="target_h" name="target_h" className="input" inputMode="numeric" defaultValue={Math.floor(profile.daily_target_min / 60)} />
          </div>
          <div className="field">
            <label htmlFor="target_m">Min.</label>
            <input id="target_m" name="target_m" className="input" inputMode="numeric" defaultValue={profile.daily_target_min % 60} />
          </div>
        </div>
        <div className="field">
          <span className="label">Arbeitstage</span>
          <div className="chips">
            {DAYS.map((d, i) => (
              <label key={d} className="chip-check">
                <input type="checkbox" name="workdays" value={i + 1} defaultChecked={profile.workdays.includes(i + 1)} />
                <span>{d}</span>
              </label>
            ))}
          </div>
        </div>
        <div className="field">
          <label htmlFor="default_break_min">Pause in Minuten (wird abgezogen, wenn „Pause gemacht“ an ist)</label>
          <input id="default_break_min" name="default_break_min" className="input" inputMode="numeric" defaultValue={profile.default_break_min} />
        </div>
        <p className="tiny muted" style={{ margin: 0 }}>Feiertage in München rechnet die App selbst heraus.</p>
      </section>

      <div className="h2">Urlaub (freiwillig)</div>
      <section className="card form">
        <div className="grid2">
          <div className="field">
            <label htmlFor="vacation_days_per_year">Urlaubstage pro Jahr</label>
            <input id="vacation_days_per_year" name="vacation_days_per_year" className="input" inputMode="numeric" defaultValue={profile.vacation_days_per_year ?? ''} placeholder="leer = aus" />
          </div>
          <div className="field">
            <label htmlFor="vacation_carryover_days">Resturlaub aus dem Vorjahr</label>
            <input id="vacation_carryover_days" name="vacation_carryover_days" className="input" inputMode="decimal" defaultValue={profile.vacation_carryover_days || ''} placeholder="0" />
          </div>
        </div>
      </section>

      {state?.error && <div className="error" role="alert">{state.error}</div>}
      {state?.saved && <div className="ok" role="status">Gespeichert.</div>}
      <button className="btn btn-block" disabled={pending}>{pending ? 'Speichert…' : first ? 'Speichern und Zettel nachtragen' : 'Einstellungen speichern'}</button>
    </form>
  );
}
