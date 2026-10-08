import type { Locator, Page } from '@playwright/test';

export interface LowContrast { text: string; ratio: number; need: number; color: string; background: string }

/**
 * Every visible piece of text under `root` whose contrast with what's behind it is below WCAG AA: 4.5:1, or 3:1 for
 * large text (24px, or 18.66px bold). Colours are read from the page as rendered, after opacity and translucent
 * backgrounds; disabled controls are exempt, as WCAG allows. Text over an image or gradient is skipped.
 */
export async function lowContrast(page: Page, root: Locator | string = 'body'): Promise<LowContrast[]> {
  const handle = typeof root === 'string' ? page.locator(root) : root;
  return handle.evaluate((rootEl: Element) => {
    const ctx = document.createElement('canvas').getContext('2d', { willReadFrequently: true })!;
    const rgba = (css: string): [number, number, number, number] => {
      ctx.clearRect(0, 0, 1, 1); ctx.fillStyle = '#0000'; ctx.fillStyle = css; ctx.fillRect(0, 0, 1, 1);
      const [r, g, b, a] = ctx.getImageData(0, 0, 1, 1).data;
      return [r, g, b, a / 255];
    };
    const over = (top: number[], a: number, under: number[]) => top.slice(0, 3).map((c, i) => c * a + under[i] * (1 - a));
    const lum = (c: number[]) => {
      const [r, g, b] = c.map(v => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; });
      return 0.2126 * r + 0.7152 * g + 0.0722 * b;
    };
    const hex = (c: number[]) => '#' + c.map(v => Math.round(v).toString(16).padStart(2, '0')).join('');

    /** The solid colour behind `el`, or null when an image or gradient is involved. */
    function backdrop(el: Element): number[] | null {
      const layers: [number[], number][] = [];
      for (let e: Element | null = el; e; e = e.parentElement) {
        const s = getComputedStyle(e);
        if (s.backgroundImage !== 'none') return null;
        const [r, g, b, a] = rgba(s.backgroundColor);
        if (a > 0) layers.push([[r, g, b], a]);
        if (a >= 1) break;
      }
      let base = [255, 255, 255];
      for (const [c, a] of layers.reverse()) base = over(c, a, base);
      return base;
    }
    const opacity = (el: Element) => { let o = 1; for (let e: Element | null = el; e; e = e.parentElement) o *= parseFloat(getComputedStyle(e).opacity); return o; };

    const out: { text: string; ratio: number; need: number; color: string; background: string }[] = [];
    for (const el of [rootEl, ...rootEl.querySelectorAll('*')]) {
      const text = [...el.childNodes].filter(n => n.nodeType === Node.TEXT_NODE).map(n => n.textContent!.trim()).join(' ').trim();
      if (!text) continue;
      const r = el.getBoundingClientRect(), s = getComputedStyle(el);
      if (!r.width || !r.height || s.visibility === 'hidden' || s.display === 'none') continue;
      if (el.closest(':disabled, [aria-disabled="true"]')) continue;
      const bg = backdrop(el);
      if (!bg) continue;
      const [cr, cg, cb, ca] = rgba(s.color);
      const fg = over([cr, cg, cb], ca * opacity(el), bg);
      const [l1, l2] = [lum(fg), lum(bg)].sort((a, b) => b - a);
      const ratio = (l1 + 0.05) / (l2 + 0.05);
      const size = parseFloat(s.fontSize), bold = parseInt(s.fontWeight, 10) >= 700;
      const need = size >= 24 || (bold && size >= 18.66) ? 3 : 4.5;
      if (ratio < need) out.push({ text: text.slice(0, 50), ratio: Math.round(ratio * 100) / 100, need, color: hex(fg), background: hex(bg) });
    }
    return out;
  });
}
