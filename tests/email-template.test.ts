import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

// The password-reset email body pasted into Firebase › Authentication › Templates (AUTH-29).
const raw = readFileSync('email/password-reset.html', 'utf8');
const body = raw.slice(raw.indexOf('-->') + 3); // the part that gets pasted

describe('password-reset email template (AUTH-29)', () => {
  it("uses Firebase's placeholders for the link and the address", () => {
    expect(body.match(/%LINK%/g)?.length).toBe(3); // button, visible fallback link and its href
    expect(body).toContain('%EMAIL%');
  });

  it('follows the rules email apps need', () => {
    expect(body).not.toMatch(/<svg|<style|<script|<link|class=/i); // Gmail drops these
    for (const [, src] of body.matchAll(/<img[^>]*src="([^"]+)"/g)) expect(src).toMatch(/^https:\/\/.+\.png$/);
    expect(body).toMatch(/<img[^>]*alt="[^"]+"/); // readable with images blocked
    expect(body).toContain('bgcolor="#16302E"'); // the button keeps its colour without CSS support
  });

  it('names the company and a contact', () => {
    expect(body).toContain('Pramal IT Services Private Limited');
    expect(body).toContain('mailto:praveen.cherukuru@gmail.com');
  });
});
