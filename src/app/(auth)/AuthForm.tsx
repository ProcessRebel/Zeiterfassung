'use client';

import Link from 'next/link';
import { useActionState } from 'react';
import { login, register, type AuthState } from './actions';

export function AuthForm({ mode }: { mode: 'login' | 'register' }) {
  const [state, action, pending] = useActionState<AuthState, FormData>(mode === 'login' ? login : register, undefined);
  const isRegister = mode === 'register';

  if (state?.info) {
    return (
      <div>
        <div className="h2">Check dein Postfach</div>
        <p style={{ margin: 0 }}>{state.info}</p>
      </div>
    );
  }

  return (
    <form action={action}>
      <div className="seg" style={{ ['--n' as string]: 2 }}>
        <Link href="/login" className={isRegister ? '' : 'on'}>Anmelden</Link>
        <Link href="/registrieren" className={isRegister ? 'on' : ''}>Registrieren</Link>
      </div>

      {isRegister && (
        <div className="field">
          <label htmlFor="name">Dein Name</label>
          <input id="name" name="name" className="input" autoComplete="given-name" placeholder="z. B. Natascha" required />
        </div>
      )}
      <div className="field">
        <label htmlFor="email">E-Mail</label>
        <input id="email" name="email" type="email" className="input" autoComplete="email" inputMode="email" placeholder="name@beispiel.de" required />
      </div>
      <div className="field">
        <label htmlFor="password">Passwort</label>
        <input
          id="password"
          name="password"
          type="password"
          className="input"
          autoComplete={isRegister ? 'new-password' : 'current-password'}
          minLength={isRegister ? 8 : undefined}
          placeholder={isRegister ? 'Mindestens 8 Zeichen' : ''}
          required
        />
      </div>

      {state?.error && <div className="error" role="alert">{state.error}</div>}
      {!isRegister && (
        <Link href="/passwort-vergessen" className="small" style={{ fontWeight: 700, color: 'var(--muted)', alignSelf: 'flex-end' }}>
          Passwort vergessen?
        </Link>
      )}

      <button className="btn btn-block" disabled={pending}>
        {pending ? 'Einen Moment…' : isRegister ? 'Konto erstellen' : 'Anmelden'}
      </button>
      <p className="small muted" style={{ margin: 0, textAlign: 'center' }}>
        {isRegister ? (
          <>Schon dabei? <Link href="/login" style={{ fontWeight: 700, color: 'var(--teal)' }}>Hier anmelden</Link></>
        ) : (
          <>Noch kein Konto? <Link href="/registrieren" style={{ fontWeight: 700, color: 'var(--teal)' }}>Jetzt registrieren</Link></>
        )}
      </p>
    </form>
  );
}
