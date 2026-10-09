/** Uhr-Symbol: Kreis mit Zeigern, in Teal */
export function Logo({ size = 72 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true">
      <rect width="64" height="64" rx="16" fill="#17231f" />
      <circle cx="32" cy="32" r="19" fill="none" stroke="#8fe0b1" strokeWidth="5" />
      <path d="M32 21v11l8 5" fill="none" stroke="#f5f2ec" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
