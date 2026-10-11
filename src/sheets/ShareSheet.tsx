import { useEffect, useMemo, useRef, useState } from 'react';
import { Sheet } from '../components/Sheet';
import { track } from '../lib/analytics';
import { count } from '../lib/stats';
import { CARD, cardSummary, drawCard } from '../lib/card';
import { cardStats } from '../lib/share';
import { useApp } from '../state/app';
import { useFeedback } from '../ui/feedback';

/** Preview and share the progress card (SHARE-02, SHARE-03, SHARE-04). */
export function ShareSheet() {
  const { data, c, T, closeSheet } = useApp();
  const { toast } = useFeedback();
  const stats = useMemo(() => cardStats(data, c, T), [data, c, T]);
  const [names, setNames] = useState(true);
  const [png, setPng] = useState<Blob | null>(null);
  const [url, setUrl] = useState('');
  const canvas = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    let alive = true, made = '';
    canvas.current ||= document.createElement('canvas');
    void drawCard(canvas.current, stats, { names }).then(() => canvas.current!.toBlob(b => {
      if (!alive || !b) return;
      made = URL.createObjectURL(b);
      setPng(b); setUrl(made);
    }, 'image/png'));
    return () => { alive = false; if (made) URL.revokeObjectURL(made); };
  }, [stats, names]);

  const summary = cardSummary(stats, names);
  const fileName = `tiktym-progress-${T.slice(0, 7)}.png`;
  const file = png ? new File([png], fileName, { type: 'image/png' }) : null;
  const canShare = !!file && typeof navigator.canShare === 'function' && navigator.canShare({ files: [file] });

  async function share() {
    if (!file) return;
    try {
      await navigator.share({ files: [file], title: 'My TikTym progress', text: '100 minutes a day for a productive life. tiktym.com' });
      track('share_progress', { method: 'share' }); count('cardsShared');
    } catch (e) {
      if ((e as Error).name !== 'AbortError') toast("Couldn't open sharing here. Try Download instead.");
    }
  }
  function download() {
    if (!url) return;
    const a = document.createElement('a'); a.href = url; a.download = fileName; a.click();
    track('share_progress', { method: 'download' }); count('cardsShared');
  }

  return (
    <Sheet onClose={closeSheet} label="Share your progress">
      <h2>Share your progress</h2>
      <div className="card-preview">
        {url ? <img src={url} alt={summary} width={CARD.width} height={CARD.height} /> : <div className="card-wait">Drawing your card…</div>}
      </div>
      <button className="li toggle" type="button" aria-pressed={names} onClick={() => setNames(v => !v)}>
        <span className="t">Show practice names<small>Off shows them as Practice 1, 2, 3</small></span>
        <span className={`switch${names ? ' on' : ''}`} aria-hidden="true"><i /></span>
      </button>
      <div className={canShare ? 'row2' : ''} style={{ marginTop: 14 }}>
        {canShare && <button className="btn" type="button" onClick={share} disabled={!file}>Share</button>}
        <button className={`btn${canShare ? ' btn-2' : ''}`} type="button" onClick={download} disabled={!url}>Download</button>
      </div>
    </Sheet>
  );
}
