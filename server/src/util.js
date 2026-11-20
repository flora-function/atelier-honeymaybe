import { waitUntil } from '@neon/functions';
import { config } from './config.js';

// Tells Vercel to rebuild the static site after content changes. Runs after the
// response is sent; waitUntil keeps the function alive long enough to finish it.
export function triggerRebuild() {
  if (!config.deployHook) return;
  waitUntil(
    fetch(config.deployHook, { method: 'POST' })
      .then((r) => { if (!r.ok) console.warn('deploy hook returned', r.status); })
      .catch((err) => console.warn('deploy hook failed:', err.message))
  );
}
