import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

// Price isn't the pitch (GTM-22): the app's link preview and the Terms summary describe TikTym, not its price.
// The Terms' own section on price ("TikTym is currently free…") is the one place that answers it.
describe('no "free" in the pitch (GTM-22)', () => {
  it('the app page descriptions do not say free (GTM-22)', () => {
    const html = readFileSync('index.html', 'utf8');
    const metas = [...html.matchAll(/<meta (?:name="description"|property="og:description") content="([^"]*)"/g)].map(m => m[1]);
    expect(metas.length).toBe(2);
    for (const m of metas) expect(m).not.toMatch(/\bfree\b/i);
  });
  it('the Terms summary and description do not say free (GTM-22)', () => {
    const html = readFileSync('public/terms/index.html', 'utf8');
    expect(html.match(/<meta name="description" content="([^"]*)"/)![1]).not.toMatch(/\bfree\b/i);
    expect(html.match(/<strong>In short:<\/strong>([^<]*)/)![1]).not.toMatch(/\bfree\b/i);
  });
});
