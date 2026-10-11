// Icons and small brand marks, as SVG components.

const stroke = { fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round' } as const;

export const Icon = {
  today: () => <svg viewBox="0 0 24 24" {...stroke}><circle cx="12" cy="12" r="8" /><circle cx="12" cy="4" r="1.6" fill="currentColor" /></svg>,
  insights: () => <svg viewBox="0 0 24 24" {...stroke}><path d="M5 20V11M12 20V5M19 20v-6" /></svg>,
  history: () => <svg viewBox="0 0 24 24" {...stroke}><path d="M4 6h16M4 12h16M4 18h10" /></svg>,
  setup: () => <svg viewBox="0 0 24 24" {...stroke}><path d="M4 7h10M18 7h2M4 17h4M12 17h8" /><circle cx="16" cy="7" r="2" /><circle cx="10" cy="17" r="2" /></svg>,
  plus: () => <svg viewBox="0 0 24 24" {...stroke} strokeWidth={2.4}><path d="M12 5v14M5 12h14" /></svg>,
  mic: () => <svg viewBox="0 0 24 24" {...stroke}><rect x="8" y="3" width="8" height="12" rx="4" /><path d="M5 11a7 7 0 0 0 14 0M12 18v3M8 21h8" /></svg>,
  play: () => <svg viewBox="0 0 24 24" fill="currentColor"><path d="M7 4.5v15a1 1 0 0 0 1.5.86l12.4-7.5a1 1 0 0 0 0-1.72L8.5 3.64A1 1 0 0 0 7 4.5z" /></svg>,
  pause: () => <svg viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4.5" width="4" height="15" rx="1.2" /><rect x="14" y="4.5" width="4" height="15" rx="1.2" /></svg>,
  up: () => <svg viewBox="0 0 24 24" {...stroke} strokeWidth={2.2} strokeLinejoin="round"><path d="M6 15l6-6 6 6" /></svg>,
  down: () => <svg viewBox="0 0 24 24" {...stroke} strokeWidth={2.2} strokeLinejoin="round"><path d="M6 9l6 6 6-6" /></svg>,
  /** iOS Share: a square with an arrow out of the top */
  share: () => <svg viewBox="0 0 24 24" {...stroke}><path d="M12 3v12M8 7l4-4 4 4M7 10H6a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-7a2 2 0 0 0-2-2h-1" /></svg>,
  /** iOS Add to Home Screen: a plus in a rounded square */
  addSquare: () => <svg viewBox="0 0 24 24" {...stroke}><rect x="4" y="4" width="16" height="16" rx="4" /><path d="M12 8.5v7M8.5 12h7" /></svg>,
  x: () => <svg viewBox="0 0 24 24" {...stroke}><path d="M6 6l12 12M18 6L6 18" /></svg>,
  /** A streak shield (CALC-14); filled when held, via CSS `fill` */
  shield: () => <svg viewBox="0 0 24 24" {...stroke} strokeLinejoin="round"><path d="M12 3l7 2.8v5.4c0 4.4-2.9 8.2-7 9.8-4.1-1.6-7-5.4-7-9.8V5.8L12 3z" /></svg>,
};

/** The app mark: a ring of 27 beads with the first `filled` coloured in. */
export function Mark({ className, filled = 18, color = 'var(--ink)' }: { className: string; filled?: number; color?: string }) {
  const N = 27;
  return (
    <svg className={className} viewBox="0 0 100 100" aria-hidden="true">
      {Array.from({ length: N }, (_, i) => {
        const a = (-90 + (i + 1) * 360 / (N + 1)) * Math.PI / 180;
        return <circle key={i} cx={(50 + 38 * Math.cos(a)).toFixed(1)} cy={(50 + 38 * Math.sin(a)).toFixed(1)} r="3.6" fill={i < filled ? color : 'var(--line)'} />;
      })}
      <circle cx="50" cy="12" r="6" fill="var(--gold)" />
    </svg>
  );
}

export const GoogleLogo = () => (
  <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
    <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
    <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
    <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z" />
    <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
  </svg>
);
