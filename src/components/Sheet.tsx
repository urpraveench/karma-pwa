import type { ReactNode } from 'react';

/** Bottom sheet over a scrim. Tapping the scrim closes it; Escape is handled by the shell. */
export function Sheet({ onClose, children }: { onClose(): void; children: ReactNode }) {
  return (
    <>
      <div className="scrim" onClick={onClose} />
      <div className="sheet" role="dialog" aria-modal="true">
        <div className="grab" />
        {children}
      </div>
    </>
  );
}
