// Google Analytics for tiktym.com (same GA4 property as the app), on by default (ANA-04): it loads straight away
// unless this visitor opted out, and a notice says so with OK and Opt out. Opting out stops it at once, removes
// the cookies and is remembered. Clicks into the app count as "open_app"; the app's domain is linked, so a visitor
// who moves on to the app counts as one person.
(() => {
  const ID = 'G-JL1YCFLK23';
  const KEY = 'tiktym:analytics';
  const bar = document.querySelector('.consent-bar');
  const read = () => { try { return localStorage.getItem(KEY); } catch { return null; } };
  const save = v => { try { localStorage.setItem(KEY, v); } catch { /* storage blocked: lasts this visit */ } };

  let loaded = false;
  function load() {
    if (loaded) return;
    loaded = true;
    window.dataLayer = window.dataLayer || [];
    window.gtag = function gtag() { window.dataLayer.push(arguments); };
    gtag('js', new Date());
    gtag('config', ID, {
      allow_google_signals: false,
      allow_ad_personalization_signals: false,
      linker: { domains: ['tiktym.com', 'www.tiktym.com', 'app.tiktym.com'] },
    });
    const s = document.createElement('script');
    s.async = true;
    s.src = 'https://www.googletagmanager.com/gtag/js?id=' + ID;
    document.head.appendChild(s);
  }

  document.addEventListener('click', e => {
    const a = e.target.closest('[data-app-link]');
    if (a && loaded) gtag('event', 'open_app', { link_location: a.dataset.appLink || 'page' });
  });

  function optOut() {
    window['ga-disable-' + ID] = true; // gtag stops sending at once
    for (const c of document.cookie.split(';')) {
      const name = c.split('=')[0].trim();
      if (!name.startsWith('_ga')) continue;
      for (const domain of ['', '; domain=' + location.hostname, '; domain=.' + location.hostname])
        document.cookie = name + '=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/' + domain;
    }
  }

  const choice = read();
  if (choice === 'denied') return;
  load();
  if (choice === 'granted' || !bar) return; // seen the notice before
  bar.hidden = false;
  bar.querySelector('[data-allow]').addEventListener('click', () => { save('granted'); bar.hidden = true; });
  bar.querySelector('[data-deny]').addEventListener('click', () => { save('denied'); bar.hidden = true; optOut(); });
})();
