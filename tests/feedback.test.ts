import { describe, expect, it } from 'vitest';
import { feedbackLink } from '../src/config';

describe('Send feedback link (GTM-02)', () => {
  it('is an email to support with the version and build filled in', () => {
    const link = feedbackLink({ version: '1.2.3', commit: 'abc1234' }, 'support@example.com');
    const url = new URL(link);
    expect(url.protocol).toBe('mailto:');
    expect(url.pathname).toBe('support@example.com');
    expect(url.searchParams.get('subject')).toBe('TikTym feedback (1.2.3)');
    expect(url.searchParams.get('body')).toContain('TikTym 1.2.3, build abc1234');
  });
});
