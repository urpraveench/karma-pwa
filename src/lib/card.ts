import { formatTime, streakStat, type CardStats } from './share';

// Draws the shareable progress card (SHARE-02): 1080×1350, the portrait size LinkedIn and Instagram show in full.

export const CARD = { width: 1080, height: 1350 };
const C = { bg: '#0F1B19', ink: '#E4ECE7', ink2: '#93A89F', line: '#2C433F', gold: '#E6B23C', ok: '#5BC08F' };
const DISPLAY = '"Bricolage Grotesque", ui-rounded, system-ui, sans-serif';
const BODY = '"Figtree", system-ui, -apple-system, "Segoe UI", sans-serif';

/** One line of text, trimmed with "…" to fit `max` pixels. */
function fit(ctx: CanvasRenderingContext2D, text: string, max: number) {
  if (ctx.measureText(text).width <= max) return text;
  let t = text;
  while (t.length > 1 && ctx.measureText(t + '…').width > max) t = t.slice(0, -1);
  return t.trimEnd() + '…';
}

function mark(ctx: CanvasRenderingContext2D, x: number, y: number, size: number) {
  const N = 27, r = size * 0.38;
  for (let i = 0; i < N; i++) {
    const a = (-90 + (i + 1) * 360 / (N + 1)) * Math.PI / 180;
    ctx.fillStyle = i < 18 ? C.ink : C.line;
    ctx.beginPath(); ctx.arc(x + size / 2 + r * Math.cos(a), y + size / 2 + r * Math.sin(a), size * 0.036, 0, Math.PI * 2); ctx.fill();
  }
  ctx.fillStyle = C.gold;
  ctx.beginPath(); ctx.arc(x + size / 2, y + size * 0.12, size * 0.06, 0, Math.PI * 2); ctx.fill();
}

export interface CardOptions { names: boolean }

/** Draws the card onto `canvas` (resized to 1080×1350). */
export async function drawCard(canvas: HTMLCanvasElement, s: CardStats, { names }: CardOptions) {
  await Promise.all([
    document.fonts.load(`800 200px ${DISPLAY}`), document.fonts.load(`700 40px ${BODY}`), document.fonts.load(`400 40px ${BODY}`),
  ]).catch(() => { /* system fonts are fine */ });
  canvas.width = CARD.width; canvas.height = CARD.height;
  const ctx = canvas.getContext('2d')!;
  const L = 90, W = CARD.width - 2 * L;

  ctx.fillStyle = C.bg; ctx.fillRect(0, 0, CARD.width, CARD.height);

  // brand
  mark(ctx, L, 80, 84);
  ctx.fillStyle = C.ink; ctx.font = `800 54px ${DISPLAY}`; ctx.textBaseline = 'middle';
  ctx.fillText('TikTym', L + 104, 124);

  // the month's time
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = C.ink2; ctx.font = `400 44px ${BODY}`;
  ctx.fillText(`${s.month} so far`, L, 330);
  ctx.fillStyle = C.ink; ctx.font = `800 230px ${DISPLAY}`;
  ctx.fillText(formatTime(s.minutes), L - 8, 540);
  ctx.fillStyle = C.ink2; ctx.font = `400 44px ${BODY}`;
  ctx.fillText('of learning and practice', L, 610);

  // streak and active days
  const box = (x: number, value: string, label: string, color: string) => {
    ctx.strokeStyle = C.line; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.roundRect(x, 680, W / 2 - 15, 190, 28); ctx.stroke();
    ctx.fillStyle = color; ctx.font = `800 96px ${DISPLAY}`; ctx.fillText(value, x + 36, 790);
    ctx.fillStyle = C.ink2; ctx.font = `700 34px ${BODY}`; ctx.fillText(label, x + 36, 840);
  };
  const first = streakStat(s);
  box(L, String(first.value), first.label, C.gold);
  box(L + W / 2 + 15, String(s.activeDays), s.activeDays === 1 ? 'active day' : 'active days', C.ok);

  // top practices
  const max = Math.max(1, ...s.top.map(p => p.minutes));
  s.top.forEach((p, i) => {
    const y = 950 + i * 105;
    ctx.fillStyle = p.color; ctx.beginPath(); ctx.arc(L + 14, y - 12, 14, 0, Math.PI * 2); ctx.fill();
    ctx.font = `700 40px ${BODY}`;
    const time = formatTime(p.minutes);
    const timeW = ctx.measureText(time).width;
    ctx.fillStyle = C.ink;
    ctx.fillText(fit(ctx, names ? p.name : `Practice ${i + 1}`, W - timeW - 80), L + 46, y);
    ctx.fillStyle = C.ink2; ctx.textAlign = 'right'; ctx.fillText(time, L + W, y); ctx.textAlign = 'left';
    ctx.fillStyle = C.line; ctx.beginPath(); ctx.roundRect(L + 46, y + 22, W - 46, 14, 7); ctx.fill();
    ctx.fillStyle = p.color; ctx.beginPath(); ctx.roundRect(L + 46, y + 22, Math.max(14, (W - 46) * p.minutes / max), 14, 7); ctx.fill();
  });

  // footer
  ctx.fillStyle = C.ink2; ctx.font = `400 36px ${BODY}`;
  ctx.fillText('One minute, one point', L, CARD.height - 90);
  ctx.fillStyle = C.gold; ctx.font = `700 36px ${BODY}`; ctx.textAlign = 'right';
  ctx.fillText('tiktym.com', L + W, CARD.height - 90);
  ctx.textAlign = 'left';
}

/** A one-line description of the card, for screen readers and the share message. */
export function cardSummary(s: CardStats, names: boolean): string {
  const top = s.top.map((p, i) => `${names ? p.name : `Practice ${i + 1}`} ${formatTime(p.minutes)}`).join(', ');
  const first = streakStat(s);
  return `${s.month} so far: ${formatTime(s.minutes)} of learning and practice, ${first.value} ${first.label}, ${s.activeDays} active days${top ? `. Top: ${top}` : ''}.`;
}
