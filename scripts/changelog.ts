// CHANGELOG.md → the website's What's new page (GTM-11, GTM-12). Pure functions, so they're unit-tested;
// scripts/site-updates.mjs reads the file and writes site/updates/index.html.

export interface Release {
  /** null for "Coming next": changes made but not released yet. */
  version: string | null;
  date: string;
  title: string;
  image: { src: string; alt: string } | null;
  items: string[];
  paragraphs: string[];
}

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
/** Escapes text, then turns **bold** into <strong> and [text](https://…) into a link that opens in a new tab. */
export const inline = (s: string) => esc(s)
  .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
  .replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');

/** Releases in file order (newest first). Skips the title, the comment and anything before the first "## ". */
export function parseChangelog(md: string): Release[] {
  const out: Release[] = [];
  const text = md.replace(/<!--[\s\S]*?-->/g, '');
  for (const raw of text.split('\n')) {
    const line = raw.trim();
    if (line.startsWith('## ')) {
      const head = line.slice(3).trim();
      if (/^coming next$/i.test(head)) { out.push({ version: null, date: '', title: 'Coming in the next update', image: null, items: [], paragraphs: [] }); continue; }
      const [version = '', date = '', ...rest] = head.split(' · ').map(p => p.trim());
      out.push({ version, date, title: rest.join(' · ') || `Version ${version}`, image: null, items: [], paragraphs: [] });
      continue;
    }
    const cur = out[out.length - 1];
    if (!cur || !line) continue;
    const img = line.match(/^!\[(.*)\]\((.+)\)$/);
    if (img) cur.image = { alt: img[1], src: img[2] };
    else if (line.startsWith('- ')) cur.items.push(line.slice(2).trim());
    else cur.paragraphs.push(line);
  }
  return out.filter(r => r.version !== null || r.items.length || r.paragraphs.length);
}

/** Pictures live in site/updates/media/; the page is served at /updates (no trailing slash), so paths are made absolute. */
const mediaSrc = (src: string) => /^(https?:)?\//.test(src) ? src : '/updates/' + src.replace(/^\.\//, '');

function releaseHtml(r: Release): string {
  const coming = r.version ? '' : '\n      <p class="eyebrow">Coming soon</p>';
  const meta = r.version ? `\n      <p class="u-meta">Version ${esc(r.version)} · ${esc(r.date)}</p>` : '';
  const img = r.image ? `\n      <figure class="u-shot"><img src="${esc(mediaSrc(r.image.src))}" alt="${esc(r.image.alt)}" loading="lazy" width="390" height="844"></figure>` : '';
  const paras = r.paragraphs.map(p => `\n      <p>${inline(p)}</p>`).join('');
  const items = r.items.length ? `\n      <ul>${r.items.map(i => `\n        <li>${inline(i)}</li>`).join('')}\n      </ul>` : '';
  return `    <article class="u-release${r.version ? '' : ' u-next'}"${r.version ? ` id="v${esc(r.version)}"` : ''}>${coming}
      <h2>${inline(r.title)}</h2>${meta}${img}${paras}${items}
    </article>`;
}

/** The whole page, sharing the website's look, header, footer and analytics consent. */
export function renderUpdatesPage(releases: Release[]): string {
  return `<!doctype html>
<html lang="en-IN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>What's new in TikTym</title>
<meta name="description" content="Every TikTym update, newest first: what changed, in plain words.">
<link rel="canonical" href="https://tiktym.com/updates/">
<meta name="theme-color" content="#EDF0EA" media="(prefers-color-scheme: light)">
<meta name="theme-color" content="#0F1B19" media="(prefers-color-scheme: dark)">
<link rel="icon" href="/icons/icon.svg" type="image/svg+xml">
<link rel="apple-touch-icon" href="/icons/icon-192.png">
<meta property="og:type" content="website">
<meta property="og:site_name" content="TikTym">
<meta property="og:url" content="https://tiktym.com/updates/">
<meta property="og:title" content="What's new in TikTym">
<meta property="og:description" content="Every TikTym update, newest first.">
<meta property="og:image" content="https://tiktym.com/og.png">
<meta name="twitter:card" content="summary_large_image">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,700;12..96,800&family=Figtree:wght@400;600;700&display=swap" rel="stylesheet">
<link rel="stylesheet" href="/style.css">
</head>
<body>
<!-- Generated from CHANGELOG.md by scripts/site-updates.mjs (npm run site:updates). Edit the changelog, not this file. -->

<header class="top">
  <div class="wrap">
    <a class="brand" href="/"><img src="/icons/icon.svg" alt="" width="30" height="30">TikTym</a>
    <nav aria-label="Sections">
      <a href="/">Home</a>
      <a href="/updates/" aria-current="page">What's new</a>
    </nav>
    <a class="btn small" href="https://app.tiktym.com/" data-app-link="updates-header">Open TikTym</a>
  </div>
</header>

<main>
<section class="updates">
  <div class="wrap">
    <p class="eyebrow">Updates</p>
    <h1>What's new in TikTym</h1>
    <p class="lead">Every update people would notice, newest first. Most of them start with feedback, so <a href="mailto:praveen.cherukuru@gmail.com">tell us what you'd like next</a>.</p>
${releases.map(releaseHtml).join('\n')}
  </div>
</section>
</main>

<footer>
  <div class="wrap">
    <span>© 2026 TikTym · Made in India</span>
    <nav aria-label="Legal and contact">
      <a href="/updates/">What's new</a>
      <a href="https://app.tiktym.com/terms/">Terms</a>
      <a href="https://app.tiktym.com/privacy/">Privacy</a>
      <a href="mailto:praveen.cherukuru@gmail.com">Contact</a>
      <a href="https://www.linkedin.com/company/tiktym/" target="_blank" rel="noopener">LinkedIn</a>
    </nav>
  </div>
</footer>

<div class="consent-bar" role="region" aria-label="Analytics notice" hidden>
  <p>We count visits with Google Analytics to see what's useful. No advertising. <a href="https://app.tiktym.com/privacy/">Privacy Policy</a></p>
  <div><button type="button" class="btn small ghost" data-deny>Opt out</button><button type="button" class="btn small" data-allow>OK</button></div>
</div>
<script src="/analytics.js" defer></script>
</body>
</html>
`;
}

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
/** "9 October 2026" → "2026-10-09"; null if it isn't a date like that. */
export function isoDate(d: string): string | null {
  const m = d.trim().match(/^(\d{1,2}) ([A-Z][a-z]+) (\d{4})$/);
  const month = m ? MONTHS.indexOf(m[2]) + 1 : 0;
  return m && month ? `${m[3]}-${String(month).padStart(2, '0')}-${m[1].padStart(2, '0')}` : null;
}

/** sitemap.xml for tiktym.com (GTM-15): the home page and What's new, dated by the newest release. */
export function renderSitemap(releases: Release[]): string {
  const newest = releases.find(r => r.version);
  const lastmod = newest ? isoDate(newest.date) : null;
  const url = (loc: string) => `  <url>\n    <loc>${loc}</loc>${lastmod ? `\n    <lastmod>${lastmod}</lastmod>` : ''}\n  </url>`;
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${url('https://tiktym.com/')}
${url('https://tiktym.com/updates/')}
</urlset>
`;
}
