const endpoint = (process.env.AWS_ENDPOINT_URL_S3 || '').replace(/\/$/, '');
const bucket = process.env.STORAGE_BUCKET || 'art'; // declared in ../neon.ts

export const config = {
  adminToken: process.env.ADMIN_TOKEN || '',
  // Optional: browsers on this origin may call the API (the Astro build fetches server-side, so not required).
  clientOrigin: process.env.CLIENT_ORIGIN || '',
  // Neon Postgres: pooled URL for the app, direct URL for schema setup.
  databaseUrl: process.env.DATABASE_URL || '',
  databaseUrlDirect: process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL || '',
  // Neon Object Storage (S3-compatible, path-style). Credentials come from the
  // standard AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY env vars.
  storage: {
    endpoint,
    region: process.env.AWS_REGION || '',
    bucket,
    // Objects in a public_read bucket are anonymously readable at this base URL.
    // Override with STORAGE_PUBLIC_URL to put a CDN / custom domain in front.
    publicUrl: (process.env.STORAGE_PUBLIC_URL || `${endpoint}/${bucket}`).replace(/\/$/, ''),
  },
  // Optional: Vercel deploy hook URL, pinged after art changes to rebuild the site
  deployHook: process.env.DEPLOY_HOOK_URL || '',
};

const missing = [
  ['DATABASE_URL', config.databaseUrl],
  ['AWS_ENDPOINT_URL_S3', endpoint],
  ['AWS_REGION', config.storage.region],
  ['AWS_ACCESS_KEY_ID', process.env.AWS_ACCESS_KEY_ID],
  ['AWS_SECRET_ACCESS_KEY', process.env.AWS_SECRET_ACCESS_KEY],
].filter(([, v]) => !v).map(([k]) => k);
if (missing.length) {
  throw new Error(`Missing required env vars: ${missing.join(', ')} (run \`neon env pull\` in the project root)`);
}
if (!config.adminToken || config.adminToken === 'change-me') {
  throw new Error('ADMIN_TOKEN is missing or still "change-me"');
}
