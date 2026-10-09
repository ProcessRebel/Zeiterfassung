import { logout } from '../../(auth)/actions';
import { SettingsForm } from '@/components/SettingsForm';
import { getEntries, getSession } from '@/lib/data';
import { dateDE } from '@/lib/zeit';

export const metadata = { title: 'Mehr · Zeitkonto' };

export default async function SettingsPage({ searchParams }: { searchParams: Promise<{ start?: string }> }) {
  const sp = await searchParams;
  const [{ profile }, entries] = await Promise.all([getSession(), getEntries()]);
  const first = sp.start === '1';
  const nachtrag = entries.filter((e) => e.source === 'nachtrag').length;

  return (
    <main className="page">
      <div className="head">
        <h1>{first ? 'Willkommen' : 'Mehr'}</h1>
      </div>

      {first && (
        <div className="note info">
          <span className="small">
            Zwei Dinge einmalig: Trag deinen <strong>Überstunden-Übertrag</strong> zum Startdatum ein und prüf die Arbeitszeit. Danach geht es direkt
            zum Nachtragen deiner Zettel.
          </span>
        </div>
      )}

      <SettingsForm profile={profile} first={first} />

      <div className="h2">Daten mitnehmen</div>
      <section className="card form">
        <p className="small muted" style={{ margin: 0 }}>
          {entries.length} Einträge seit {dateDE(profile.start_date)}, davon {nachtrag} nachgetragen. Die Dateien lassen sich in Excel öffnen oder später in ein
          Zeiterfassungssystem übernehmen.
        </p>
        <a className="btn btn-soft btn-block" href="/export?format=excel" download>
          Für Excel (alle Tage mit Summen)
        </a>
        <a className="btn btn-ghost btn-block" href="/export?format=import" download>
          Für ein Zeiterfassungssystem (Standard-CSV)
        </a>
      </section>

      <div className="h2">So wird gerechnet</div>
      <section className="card small" style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <span><strong>Arbeitstag:</strong> Bis − Von − Pause. Was über dem Soll liegt, kommt aufs Konto.</span>
        <span><strong>Urlaub, Krank:</strong> zählen wie ein normaler Tag, das Konto bleibt gleich.</span>
        <span><strong>Frei (Ü):</strong> freier Tag aus dem Überstundenkonto, das Tagessoll wird abgezogen.</span>
        <span><strong>Wochenende, Feiertag:</strong> Soll 0, jede Arbeitsstunde ist Plus.</span>
        <span><strong>Ohne Eintrag:</strong> zählt nicht, bis er nachgetragen ist.</span>
      </section>

      <form action={logout}>
        <button className="btn btn-ghost btn-block">Abmelden</button>
      </form>
    </main>
  );
}
