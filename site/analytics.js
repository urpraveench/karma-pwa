// Google Analytics for tiktym.com, only after the visitor chooses Allow (same GA4 property as the app).
// Nothing loads before that. Clicks on links into the app are counted as "open_app", and the app's domain is
// linked, so a visitor who moves on to the app counts as one person.
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

  const choice = read();
  if (choice === 'granted') { load(); return; }
  if (choice === 'denied' || !bar) return;
  bar.hidden = false;
  bar.querySelector('[data-allow]').addEventListener('click', () => { save('granted'); bar.hidden = true; load(); });
  bar.querySelector('[data-deny]').addEventListener('click', () => { save('denied'); bar.hidden = true; });
})();
