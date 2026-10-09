import { AuthForm } from '../AuthForm';
import { AuthShell } from '../AuthShell';

export const metadata = { title: 'Anmelden · Zeitkonto' };

export default function LoginPage() {
  return (
    <AuthShell tagline="Deine Arbeitszeiten an einem Ort.">
      <AuthForm mode="login" />
    </AuthShell>
  );
}
