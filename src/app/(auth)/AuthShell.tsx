import { Logo } from '@/components/Logo';
import { isConfigured } from '@/lib/supabase/server';

export function AuthShell({ children, tagline }: { children: React.ReactNode; tagline: string }) {
  return (
    <main className="auth">
      <div className="auth-hero">
        <Logo size={84} />
        <div className="logo">Zeitkonto</div>
        <div className="muted" style={{ fontSize: 17, fontWeight: 700 }}>{tagline}</div>
      </div>
      {!isConfigured && (
        <div className="note">
          <span>
            <strong>Noch nicht verbunden.</strong> Trag <code>NEXT_PUBLIC_SUPABASE_URL</code> und <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code> ein (siehe README).
          </span>
        </div>
      )}
      <div className="card">{children}</div>
    </main>
  );
}
