# Zeitkonto ⏱️

Arbeitszeiten eintragen und das Überstundenkonto im Blick behalten. Gebaut als Web-App (PWA) für den Home-Bildschirm: Next.js 15 + Supabase (EU) + Vercel, derselbe Aufbau wie Schneggo.

## Was die App kann

| Bereich | Was geht |
| --- | --- |
| **Heute** | Überstundenkonto groß oben, heutigen Tag eintragen (Von, Bis, „Pause gemacht“), Wochenübersicht |
| **Monat** | Alle Tage eines Monats, fehlende Tage gelb markiert. Antippen, eintragen, „Speichern & nächster Tag“. Die Zeiten vom Vortag sind vorausgefüllt. |
| **Nachtragen** | Springt automatisch zum ersten fehlenden Tag seit dem Startdatum und arbeitet sich Tag für Tag und Monat für Monat durch |
| **Arten** | Arbeit · Urlaub · Krank · Frei (Ü) = freier Tag aus dem Überstundenkonto |
| **Mehr** | Übertrag zum Startdatum, Soll pro Tag, Arbeitstage, Pausenlänge, Urlaubsanspruch, Export, Abmelden |
| **Export** | Excel-CSV (alle Tage mit laufendem Konto) und Standard-CSV für ein späteres Zeiterfassungssystem |

### So wird gerechnet

- **Arbeitstag:** Bis − Von − Pause. Ist „Pause gemacht“ aus, wird nichts abgezogen, und die durchgearbeitete Pause landet als Plus auf dem Konto.
- **Soll:** Montag bis Freitag je 5 Stunden (einstellbar). Feiertage in München (Bayern inklusive Mariä Himmelfahrt) rechnet die App selbst heraus.
- **Urlaub, Krank:** zählen wie ein normaler Tag, das Konto bleibt gleich.
- **Frei (Ü):** Das Tagessoll wird vom Konto abgezogen.
- **Wochenende, Feiertag:** Soll 0, jede Arbeitsstunde ist Plus.
- **Konto** = Übertrag zum Startdatum + Summe aller (Ist − Soll) bis heute. Tage ohne Eintrag zählen nicht, solange sie fehlen.

Die Rechenregeln stehen in `src/lib/zeit.ts` und werden mit `npm test` geprüft.

## Einrichtung (ca. 20 Minuten)

> Am besten mit einer **CheckPoint-Mailadresse** für Supabase und Vercel, nicht mit einem privaten Konto. So bleiben die Daten bei der Firma.

### 1. Supabase-Projekt

1. Auf [supabase.com](https://supabase.com) ein **neues** Projekt anlegen (nicht das von Schneggo), Region **Frankfurt (eu-central-1)**.
2. **SQL Editor** → **New query** → den kompletten Inhalt von [`supabase/migrations/0001_zeitkonto.sql`](supabase/migrations/0001_zeitkonto.sql) einfügen → **Run**.
3. **Authentication → Sign In / Providers → Email**: aktiviert lassen. „Confirm email“ kann aus bleiben, dann kann sich Natascha sofort anmelden.
4. **Project Settings → API** (oder oben **Connect**): `Project URL` und den `anon`/`publishable` Key kopieren.

### 2. Vercel

1. Auf [vercel.com](https://vercel.com) mit GitHub anmelden → **Add New → Project** → Repo `zeitkonto` importieren.
2. Unter **Environment Variables** eintragen:
   - `NEXT_PUBLIC_SUPABASE_URL` = Project URL
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = anon/publishable Key
3. **Deploy**. Die Adresse sieht etwa so aus: `zeitkonto-xyz.vercel.app`.

### 3. Supabase die App-Adresse mitteilen

In Supabase **Authentication → URL Configuration**:
- **Site URL**: `https://DEINE-APP.vercel.app`
- **Redirect URLs**: `https://DEINE-APP.vercel.app/auth/callback`

Das ist für „Passwort vergessen“ nötig.

### 4. Natascha richtet sich ein

1. Adresse auf dem Handy öffnen (iPhone: **Safari**, Android: **Chrome**).
2. iPhone: **Teilen → Zum Home-Bildschirm**. Android: **⋮ → Zum Startbildschirm hinzufügen**.
3. **Registrieren** mit Name, E-Mail und Passwort.
4. Den **Überstunden-Übertrag** zum 01.01.2026 eintragen, dann geht es direkt zum Nachtragen.

### 5. Registrierung schließen (wichtig)

Sobald Nataschas Konto existiert: Supabase **Authentication → Sign In / Providers → „Allow new users to sign up“ ausschalten.** Sonst könnte sich jeder mit der Adresse ein eigenes (leeres) Konto anlegen. Ihre Daten sähe er trotzdem nicht, dafür sorgt Row Level Security.

## Datenschutz

- Die Daten liegen im eigenen Supabase-Projekt in Frankfurt, die App läuft auf Vercel in Frankfurt (`fra1`).
- Row Level Security: Jede Person sieht und ändert nur ihre eigenen Zeilen. Wer nur Zugang zur App hat, sieht keine fremden Zeiten.
- Wer das **Supabase-Dashboard** öffnen kann, sieht dagegen alle Daten. Deshalb gehört der Dashboard-Zugang nur in die Hand, die das auch darf.
- Schriften sind lokal eingebunden (keine Google-Fonts-Anfragen). Keine Tracker, keine externen Dienste.
- Die App ist für Suchmaschinen gesperrt (`robots.txt` + `noindex`).

## Später: Umzug in ein Zeiterfassungssystem

**Mehr → Für ein Zeiterfassungssystem** liefert eine CSV mit einer Zeile pro Tag:

```
person,date,type,start,end,break_minutes,worked_minutes,target_minutes,balance_minutes,note,source
```

- `type`: `arbeit`, `urlaub`, `krank`, `ausgleich` (freier Tag aus dem Überstundenkonto); die letzte Zeile `uebertrag` enthält den Startsaldo.
- `source`: `nachtrag` (vom Zettel übertragen) oder `laufend` (am selben Tag eingetragen). So bleibt erkennbar, welche Werte rekonstruiert sind.

Fast jedes System (Personio, clockin, Papershift, ZEP …) importiert Datum, Beginn, Ende und Pause. Den Startsaldo trägt man dort meist einmal von Hand ein.

## Lokal entwickeln

```bash
cp .env.example .env.local   # Werte eintragen
npm install
npm run dev                  # http://localhost:3000
npm test                     # Rechenregeln prüfen
```
