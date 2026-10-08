import { moveAction, movedUrl } from '../lib/moved';

/** Running as an app added to the home screen (Android and desktop report display-mode; iOS sets `standalone`). */
export const installedApp = () =>
  matchMedia('(display-mode: standalone)').matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;

/** "TikTym has moved" in an app installed from the old address (GTM-09); Open shows the new address in the browser. */
export function MovedBar() {
  if (moveAction(location.href, installedApp()) !== 'bar') return null;
  return (
    <div className="update-bar moved-bar" role="status">
      <span>TikTym has moved. Open app.tiktym.com and add it to your home screen.</span>
      <a href={movedUrl(location.href)!} target="_blank" rel="noopener">Open</a>
    </div>
  );
}
