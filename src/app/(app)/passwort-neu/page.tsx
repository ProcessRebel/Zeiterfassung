'use client';

import { useActionState } from 'react';
import { setNewPassword, type AuthState } from '../../(auth)/actions';

export default function NewPasswordPage() {
  const [state, action, pending] = useActionState<AuthState, FormData>(setNewPassword, undefined);
  return (
    <main className="page">
      <div className="head"><h1>Neues Passwort</h1></div>
      <form action={action} className="card form">
        <div className="field">
          <label htmlFor="password">Neues Passwort</label>
          <input id="password" name="password" type="password" className="input" autoComplete="new-password" minLength={8} placeholder="Mindestens 8 Zeichen" required />
        </div>
        {state?.error && <div className="error" role="alert">{state.error}</div>}
        <button className="btn btn-block" disabled={pending}>{pending ? 'Einen Moment…' : 'Speichern'}</button>
      </form>
    </main>
  );
}
