import { describe, expect, it } from 'vitest';
import { audienceRange, broadcastCheck, broadcastEmail, readDraft } from '../functions/src/broadcast';

const ok = { audience: 'everyone', subject: '100 Days, 100 Minutes', title: 'The challenge starts 2 November', body: 'First paragraph.\n\nSecond **bold** line\nwith a break.' };
const UNSUB = 'https://app.tiktym.com/unsubscribe?u=p&k=news&t=x';

describe('email composer drafts (ADMIN-07)', () => {
  it('accepts a full draft, trimmed, with or without a button', () => {
    expect(readDraft({ ...ok, subject: '  Hi  ', extra: 1 })).toEqual({ ...ok, subject: 'Hi' });
    expect(readDraft({ ...ok, button: { label: 'Join', url: 'https://app.tiktym.com/' } })?.button).toEqual({ label: 'Join', url: 'https://app.tiktym.com/' });
    expect(readDraft({ ...ok, button: null })).toEqual(ok);
  });

  it('refuses a missing or unknown audience, empty or long text, and a button without an https link', () => {
    expect(readDraft(null)).toBeNull();
    expect(readDraft({ ...ok, audience: 'me' })).toBeNull();
    expect(readDraft({ ...ok, subject: ' ' })).toBeNull();
    expect(readDraft({ ...ok, title: 'x'.repeat(81) })).toBeNull();
    expect(readDraft({ ...ok, body: 'x'.repeat(5001) })).toBeNull();
    expect(readDraft({ ...ok, button: { label: 'Join', url: 'http://tiktym.com' } })).toBeNull();
    expect(readDraft({ ...ok, button: { label: 'Join', url: 'javascript:alert(1)' } })).toBeNull();
    expect(readDraft({ ...ok, button: { label: '', url: 'https://tiktym.com' } })).toBeNull();
  });

  it('finds each audience: every account, active in the last 7 days, or away 4 days or more', () => {
    expect(audienceRange('everyone', '2026-10-13')).toBeNull();
    expect(audienceRange('active7', '2026-10-13')).toEqual({ from: '2026-10-07' });
    expect(audienceRange('away4', '2026-10-13')).toEqual({ to: '2026-10-09' });
  });

  it('is the TikTym email: greeting, the paragraphs (bold allowed, nothing else as HTML), button, News unsubscribe', () => {
    const e = broadcastEmail({ ...readDraft(ok)!, body: 'Hello <script>x</script>\n\n**Big** news', button: { label: 'Open TikTym', url: 'https://app.tiktym.com/?x=1&y=2' } }, 'Asha', UNSUB);
    expect(e.subject).toBe('100 Days, 100 Minutes');
    expect(e.html).toContain('Hi Asha,');
    expect(e.html).toContain('The challenge starts 2 November');
    expect(e.html).toContain('Hello &lt;script&gt;x&lt;/script&gt;');
    expect(e.html).not.toContain('<script>');
    expect(e.html).toContain('<strong>Big</strong> news');
    expect(e.html).toContain('href="https://app.tiktym.com/?x=1&amp;y=2"');
    expect(e.html).toContain('Added TikTym to your home screen?'); // the button opens the app
    expect(e.html).toContain('News about TikTym switched on');
    expect(e.headers['List-Unsubscribe']).toBe(`<${UNSUB}>`);
    expect(e.text).toContain('Hi Asha,\n\nHello <script>x</script>\n\nBig news\n\nOpen TikTym: https://app.tiktym.com/?x=1&y=2');
    expect(e.text).toContain(`Unsubscribe: ${UNSUB}`);
  });

  it('keeps line breaks inside a paragraph, and leaves out the home-screen hint for a link elsewhere', () => {
    const e = broadcastEmail({ ...readDraft(ok)!, button: { label: 'Read', url: 'https://tiktym.com/updates/' } }, '', UNSUB);
    expect(e.html).toContain('Hi,');
    expect(e.html).toContain('<strong>bold</strong> line<br>with a break.');
    expect(e.html).not.toContain('Added TikTym to your home screen?');
  });
});

describe('broadcast emails respect choices and send once (ADMIN-08, ADMIN-09)', () => {
  const today = '2026-10-13';
  it('sends only with News on, not twice in a day, and never the same broadcast twice', () => {
    expect(broadcastCheck({ settings: {} }, 'b1', today)).toBe('send');
    expect(broadcastCheck({ settings: undefined }, 'b1', today)).toBe('send'); // on by default
    expect(broadcastCheck({ settings: { emails: { news: false } } }, 'b1', today)).toBe('off');
    expect(broadcastCheck({ settings: { emails: { tips: false } }, lastEmailDay: '2026-10-12' }, 'b1', today)).toBe('send');
    expect(broadcastCheck({ settings: {}, lastEmailDay: today }, 'b1', today)).toBe('emailed-today');
    expect(broadcastCheck({ settings: {}, broadcasts: ['b0', 'b1'] }, 'b1', today)).toBe('already-sent');
  });
});

describe('one person (ADMIN-07, ADMIN-08)', () => {
  it('needs a valid email for one person, kept in lower case; other audiences ignore it', () => {
    expect(readDraft({ ...ok, audience: 'person', to: ' Asha@Example.COM ' })).toEqual({ ...ok, audience: 'person', to: 'asha@example.com' });
    expect(readDraft({ ...ok, audience: 'person' })).toBeNull();
    expect(readDraft({ ...ok, audience: 'person', to: 'not-an-email' })).toBeNull();
    expect(readDraft({ ...ok, to: 'asha@example.com' })).toEqual(ok);
  });

  it('still respects News off, but an email to one person goes even if they had another today', () => {
    expect(broadcastCheck({ settings: {}, lastEmailDay: '2026-10-13' }, 'b1', '2026-10-13', true)).toBe('send');
    expect(broadcastCheck({ settings: { emails: { news: false } } }, 'b1', '2026-10-13', true)).toBe('off');
    expect(broadcastCheck({ settings: {}, broadcasts: ['b1'] }, 'b1', '2026-10-13', true)).toBe('already-sent');
  });
});
