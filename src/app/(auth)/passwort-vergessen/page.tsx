'use client';

import Link from 'next/link';
import { useActionState } from 'react';
import { requestReset, type AuthState } from '../actions';
import { Logo } from '@/components/Logo';

export default function ForgotPage() {
  const [state, action, pending] = useActionState<AuthState, FormData>(requestReset, undefined);
  return (
    <main className="auth">
      <div className="auth-hero">
        <Logo size={72} />
        <div className="logo">Passwort vergessen</div>
      </div>
      <div className="card">
        {state?.info ? (
          <p style={{ margin: 0 }}>{state.info}</p>
        ) : (
          <form action={action}>
            <div className="field">
              <label htmlFor="email">E-Mail</label>
              <input id="email" name="email" type="email" className="input" autoComplete="email" inputMode="email" required />
            </div>
            {state?.error && <div className="error" role="alert">{state.error}</div>}
            <button className="btn btn-block" disabled={pending}>{pending ? 'Einen Moment…' : 'Link schicken'}</button>
          </form>
        )}
      </div>
      <p className="small muted" style={{ textAlign: 'center', margin: 0 }}>
        <Link href="/login" style={{ fontWeight: 700, color: 'var(--teal)' }}>Zurück zur Anmeldung</Link>
      </p>
    </main>
  );
}
