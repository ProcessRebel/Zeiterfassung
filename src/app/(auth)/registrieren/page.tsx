import { AuthForm } from '../AuthForm';
import { AuthShell } from '../AuthShell';

export const metadata = { title: 'Registrieren · Zeitkonto' };

export default function RegisterPage() {
  return (
    <AuthShell tagline="Einmal anlegen, dann nur noch eintragen.">
      <AuthForm mode="register" />
    </AuthShell>
  );
}
