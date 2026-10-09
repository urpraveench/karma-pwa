// Builds the website's What's new page from CHANGELOG.md: `npm run site:updates` (also run before every website deploy).
// Output: site/updates/index.html and site/sitemap.xml (dated by the newest release). Pictures go in site/updates/media/.
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { parseChangelog, renderSitemap, renderUpdatesPage } from './changelog.ts';

const root = new URL('..', import.meta.url);
const releases = parseChangelog(readFileSync(new URL('CHANGELOG.md', root), 'utf8'));
mkdirSync(new URL('site/updates/', root), { recursive: true });
const out = new URL('site/updates/index.html', root);
writeFileSync(out, renderUpdatesPage(releases));
writeFileSync(new URL('site/sitemap.xml', root), renderSitemap(releases));
console.log(`wrote ${fileURLToPath(out)}: ${releases.filter(r => r.version).length} releases${releases.some(r => !r.version) ? ', plus coming next' : ''}`);
