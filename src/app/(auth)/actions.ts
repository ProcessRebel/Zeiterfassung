'use server';

import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { createClient, isConfigured } from '@/lib/supabase/server';

export type AuthState = { error?: string; info?: string } | undefined;

function translate(msg: string) {
  if (/invalid login credentials/i.test(msg)) return 'E-Mail oder Passwort stimmt nicht.';
  if (/email not confirmed/i.test(msg)) return 'Bitte bestätige zuerst deine E-Mail-Adresse (Link in deinem Postfach).';
  if (/already registered|already exists/i.test(msg)) return 'Mit dieser E-Mail gibt es schon ein Konto. Melde dich einfach an.';
  if (/password should be at least/i.test(msg)) return 'Das Passwort braucht mindestens 8 Zeichen.';
  if (/rate limit/i.test(msg)) return 'Zu viele Versuche. Warte kurz und probier es nochmal.';
  return msg;
}

export async function login(_: AuthState, form: FormData): Promise<AuthState> {
  if (!isConfigured) return { error: 'Supabase ist noch nicht verbunden.' };
  const email = String(form.get('email') ?? '').trim();
  const password = String(form.get('password') ?? '');
  if (!email || !password) return { error: 'Bitte E-Mail und Passwort eingeben.' };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { error: translate(error.message) };
  redirect('/');
}

export async function register(_: AuthState, form: FormData): Promise<AuthState> {
  if (!isConfigured) return { error: 'Supabase ist noch nicht verbunden.' };
  const name = String(form.get('name') ?? '').trim();
  const email = String(form.get('email') ?? '').trim();
  const password = String(form.get('password') ?? '');
  if (!name) return { error: 'Wie heißt du?' };
  if (!email) return { error: 'Bitte gib deine E-Mail-Adresse ein.' };
  if (password.length < 8) return { error: 'Das Passwort braucht mindestens 8 Zeichen.' };

  const origin = (await headers()).get('origin') ?? '';
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { name }, emailRedirectTo: `${origin}/auth/callback` },
  });
  if (error) return { error: translate(error.message) };

  // Ist die E-Mail-Bestätigung in Supabase aktiv, gibt es noch keine Sitzung.
  if (!data.session) {
    return { info: `Fast geschafft, ${name}! Wir haben dir eine Mail an ${email} geschickt. Tipp auf den Link darin, dann geht es los.` };
  }
  redirect('/einstellungen?start=1');
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect('/login');
}

export async function requestReset(_: AuthState, form: FormData): Promise<AuthState> {
  if (!isConfigured) return { error: 'Supabase ist noch nicht verbunden.' };
  const email = String(form.get('email') ?? '').trim();
  if (!email) return { error: 'Bitte gib deine E-Mail-Adresse ein.' };
  const origin = (await headers()).get('origin') ?? '';
  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${origin}/auth/callback?next=/passwort-neu`,
  });
  if (error) return { error: translate(error.message) };
  return { info: `Wenn es ein Konto mit ${email} gibt, ist jetzt eine Mail unterwegs. Tipp auf den Link darin und vergib ein neues Passwort.` };
}

export async function setNewPassword(_: AuthState, form: FormData): Promise<AuthState> {
  const password = String(form.get('password') ?? '');
  if (password.length < 8) return { error: 'Das Passwort braucht mindestens 8 Zeichen.' };
  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password });
  if (error) return { error: translate(error.message) };
  redirect('/');
}
