module.exports = function handler(request, response) {
  response.setHeader("Cache-Control", "no-store");
  response.setHeader("Content-Type", "application/javascript; charset=utf-8");
  response.setHeader("X-Content-Type-Options", "nosniff");

  if (request.method !== "GET") {
    response.setHeader("Allow", "GET");
    response.status(405).send("Method not allowed");
    return;
  }

  const { VERCEL_SUPABASE_URL: url, VERCEL_SUPABASE_ANON_KEY: anonKey } = process.env;
  if (!url || !anonKey) {
    response.status(503).send("throw new Error('Supabase is not configured for this deployment.');");
    return;
  }

  response.status(200).send(`window.SUPABASE_CONFIG = Object.freeze(${JSON.stringify({ url, anonKey })});`);
};
