import { config } from './config';

// Placeholder until the screens are ported (migration step 4). The production app is still legacy/index.html.
export function App() {
  return (
    <main className="login">
      <h1>TikTym</h1>
      <p className="lead">React version in progress. The logic and storage layers are ported; screens come next.</p>
      <p className="devhint">Backend: <b>{config.backend}</b></p>
    </main>
  );
}
