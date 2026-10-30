import { describe, expect, test } from 'bun:test';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { AcceptInvitePage, InvitationSuccess } from './AcceptInvitePage';

function renderInvite(path: string): string {
  return renderToStaticMarkup(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/invite/accept" element={<AcceptInvitePage />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('public invitation page', () => {
  test('renders outside authentication guards and reports a missing token', () => {
    const html = renderInvite('/invite/accept');

    expect(html).toContain('Invitation unavailable');
    expect(html).toContain('missing its token');
    expect(html).toContain('Back to sign in');
    expect(html).not.toContain('Checking your invitation');
  });

  test('treats a blank token as missing', () => {
    const html = renderInvite('/invite/accept?token=%20%20');

    expect(html).toContain('Invitation unavailable');
    expect(html).not.toContain('Checking your invitation');
  });

  test('shows a loading state while a token is being previewed', () => {
    const token = 'a'.repeat(64);
    const html = renderInvite(`/invite/accept?token=${token}`);

    expect(html).toContain('Checking your invitation');
    expect(html).toContain('aria-busy="true"');
    // The token must never be rendered into the page.
    expect(html).not.toContain(token);
  });

  test('confirms account creation and offers the sign-in route', () => {
    const html = renderToStaticMarkup(
      <MemoryRouter initialEntries={['/invite/accept']}>
        <InvitationSuccess name="Ada Obi" email="ada@example.com" />
      </MemoryRouter>,
    );

    expect(html).toContain('Your account is ready');
    expect(html).toContain('ada@example.com');
    expect(html).toContain('href="/signin"');
    expect(html).toContain('Go to sign in');
  });
});
