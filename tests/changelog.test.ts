import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { inline, parseChangelog, renderUpdatesPage } from '../scripts/changelog';

const SAMPLE = `# What's new
<!-- notes for whoever edits this
## not a release -->

## Coming next

- **A** soon

## 1.2.0 · 9 October 2026 · Big thing

![The new screen](media/big.jpg)

Intro line.
- **One** <script>
- Two

## 1.1.0 · 8 October 2026
- Small
`;

describe('the What\'s new page (GTM-11, GTM-12)', () => {
  it('reads coming next, then releases with version, date, title, picture, paragraphs and items', () => {
    const r = parseChangelog(SAMPLE);
    expect(r.map(x => x.version)).toEqual([null, '1.2.0', '1.1.0']);
    expect(r[0]).toMatchObject({ title: 'Coming in the next update', items: ['**A** soon'] });
    expect(r[1]).toMatchObject({ date: '9 October 2026', title: 'Big thing', image: { src: 'media/big.jpg', alt: 'The new screen' }, paragraphs: ['Intro line.'], items: ['**One** <script>', 'Two'] });
    expect(r[2].title).toBe('Version 1.1.0'); // no title given
  });

  it('leaves out an empty "Coming next"', () => {
    expect(parseChangelog('## Coming next\n\n## 1.0.0 · 8 October 2026 · Hi\n- x').map(r => r.version)).toEqual(['1.0.0']);
  });

  it('escapes text, keeps **bold**, and makes picture paths absolute', () => {
    expect(inline('**One** <script> & "x"')).toBe('<strong>One</strong> &lt;script&gt; &amp; &quot;x&quot;');
    const html = renderUpdatesPage(parseChangelog(SAMPLE));
    expect(html).toContain('<img src="/updates/media/big.jpg" alt="The new screen"');
    expect(html).toContain('id="v1.2.0"');
    expect(html).not.toContain('<script>\n'); // the item's "<script>" is text
    expect(html).toContain('&lt;script&gt;');
  });

  it('the published page matches CHANGELOG.md, so it is never out of date (run npm run site:updates)', () => {
    const fromChangelog = renderUpdatesPage(parseChangelog(readFileSync('CHANGELOG.md', 'utf8')));
    expect(readFileSync('site/updates/index.html', 'utf8')).toBe(fromChangelog);
  });

  it('the newest release in CHANGELOG.md is the app\'s current version', () => {
    const newest = parseChangelog(readFileSync('CHANGELOG.md', 'utf8')).find(r => r.version)!;
    expect(newest.version).toBe(JSON.parse(readFileSync('package.json', 'utf8')).version);
  });
});
