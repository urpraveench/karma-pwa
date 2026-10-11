import { useLayoutEffect, useRef, type ReactNode } from 'react';

const focusableInside = (dialog: HTMLElement) => [...dialog.querySelectorAll<HTMLElement>(
  'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), a[href], summary, [tabindex]:not([tabindex="-1"])',
)].filter(element => element.getClientRects().length > 0);

/** Bottom sheet over a scrim. Tapping the scrim or pressing Escape closes it. */
export function Sheet({ onClose, children, label, labelledBy }: { onClose(): void; children: ReactNode; label: string; labelledBy?: string }) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const scrimRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useLayoutEffect(() => {
    const dialog = dialogRef.current;
    const scrim = scrimRef.current;
    if (!dialog || !scrim) return;
    const returnFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const background = [...(dialog.parentElement?.children || [])]
      .filter((element): element is HTMLElement => element instanceof HTMLElement && element !== dialog && element !== scrim)
      .map(element => ({ element, inert: element.hasAttribute('inert') }));
    background.forEach(({ element }) => element.setAttribute('inert', ''));

    const frame = requestAnimationFrame(() => {
      if (!dialog.contains(document.activeElement)) (focusableInside(dialog)[0] || dialog).focus();
    });
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { event.preventDefault(); onCloseRef.current(); return; }
      if (event.key !== 'Tab') return;
      const items = focusableInside(dialog);
      if (!items.length) { event.preventDefault(); dialog.focus(); return; }
      const first = items[0], last = items[items.length - 1], active = document.activeElement;
      if (event.shiftKey && (active === first || !dialog.contains(active))) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && active === last) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener('keydown', onKey);
    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener('keydown', onKey);
      background.forEach(({ element, inert }) => { if (!inert) element.removeAttribute('inert'); });
      if (returnFocus?.isConnected) returnFocus.focus();
    };
  }, []);
  return (
    <>
      <div ref={scrimRef} className="scrim" onClick={onClose} />
      <div ref={dialogRef} className="sheet" role="dialog" aria-modal="true" aria-label={label} aria-labelledby={labelledBy} tabIndex={-1}>
        <div className="grab" />
        {children}
      </div>
    </>
  );
}
