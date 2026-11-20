import { defineConfig } from "@neon/config/v1";

export default defineConfig({
  // Declare your Neon services here
  auth: false,
  functions: {
    // The art/shop API + /admin page. Slug is permanent and becomes part of the URL.
    api: {
      name: "honeymaybe api",
      source: "server/src/index.js",
      // Secrets come from server/.env: `neon deploy --env server/.env`
      env: {
        ADMIN_TOKEN: { value: process.env.ADMIN_TOKEN, required: true },
        CLIENT_ORIGIN: { value: process.env.CLIENT_ORIGIN, required: false },
        DEPLOY_HOOK_URL: { value: process.env.DEPLOY_HOOK_URL, required: false },
        STORAGE_PUBLIC_URL: { value: process.env.STORAGE_PUBLIC_URL, required: false },
      },
    },
  },
  buckets: {
    // Unused default bucket from `neon init` (access can't be changed in place).
    assets: { access: "private" },
    // Art images are loaded by visitors' browsers, so they must be publicly readable.
    // Writes still require credentials.
    art: { access: "public_read" },
  },
  // Branch policy: per-branch tuning
  branch: (branch) => {
    if (branch.isDefault) {
      // Default branch: no overrides, uses project defaults
      return {};
    }
    if (!branch.exists) {
      // New non-default branches: auto-expire
      // Run `neon checkout <name>` to create a new branch with these settings
      return { ttl: "7d" };
    }
    // Existing branch: no changes
    return {};
  },
});
