import { describe, expect, it } from 'vitest';
import { draftOf, EMPTY_FORM, formProblem, peopleText } from '../src/admin/email';

const full = { ...EMPTY_FORM, subject: ' News ', title: 'Heading', body: 'Text' };

describe('email composer form (ADMIN-07)', () => {
  it('says what to fix first, mirroring the server', () => {
    expect(formProblem(EMPTY_FORM)).toBe('Write a subject.');
    expect(formProblem({ ...full, title: '' })).toBe('Write a heading.');
    expect(formProblem({ ...full, body: ' ' })).toBe('Write the text.');
    expect(formProblem({ ...full, subject: 'x'.repeat(121) })).toBe('Keep the subject to 120 characters.');
    expect(formProblem({ ...full, buttonUrl: 'https://tiktym.com' })).toBe('Give the button a label, or clear its link.');
    expect(formProblem({ ...full, buttonLabel: 'Open' })).toBe('The button link must start with https://');
    expect(formProblem({ ...full, buttonLabel: 'Open', buttonUrl: 'http://tiktym.com' })).toBe('The button link must start with https://');
    expect(formProblem({ ...full, buttonLabel: 'Open', buttonUrl: 'https://app.tiktym.com/' })).toBeNull();
    expect(formProblem(full)).toBeNull();
  });

  it('sends a trimmed draft, with the button only when it has a label', () => {
    expect(draftOf(full)).toEqual({ audience: 'everyone', subject: 'News', title: 'Heading', body: 'Text' });
    expect(draftOf({ ...full, audience: 'away4', buttonLabel: ' Open ', buttonUrl: ' https://app.tiktym.com/ ' }))
      .toEqual({ audience: 'away4', subject: 'News', title: 'Heading', body: 'Text', button: { label: 'Open', url: 'https://app.tiktym.com/' } });
  });

  it('counts people', () => {
    expect(peopleText(1)).toBe('up to 1 person');
    expect(peopleText(1250)).toBe('up to 1,250 people');
  });
});

describe('email to one person (ADMIN-07)', () => {
  it('asks for their email first, and sends it with the draft', () => {
    expect(formProblem({ ...full, audience: 'person' })).toBe('Enter the email their TikTym account uses.');
    expect(formProblem({ ...full, audience: 'person', to: 'asha@x' })).toBe('Enter the email their TikTym account uses.');
    expect(formProblem({ ...full, audience: 'person', to: 'asha@example.com' })).toBeNull();
    expect(draftOf({ ...full, audience: 'person', to: ' Asha@Example.com ' })).toMatchObject({ audience: 'person', to: 'asha@example.com' });
    expect(draftOf({ ...full, to: 'asha@example.com' })).not.toHaveProperty('to');
  });
});
