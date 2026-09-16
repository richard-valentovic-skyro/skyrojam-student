/* Deployment configuration. The only file that differs between environments.

   API_BASE empty  -> MOCK MODE: the app runs entirely on the fixtures in
                      data.js, with no server. Useful for design work and for
                      opening the pages straight from disk.
   API_BASE set    -> every read and write goes to that origin. Nothing else
                      in the app changes.

   api.prengo.sbs is a Cloudflare tunnel to the Bun/Elysia backend. */
window.SKYRO = window.SKYRO || {};
window.SKYRO.CONFIG = {
  API_BASE: "https://api.prengo.sbs"
};
