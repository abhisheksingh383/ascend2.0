import { corsHeaders, preflight } from "../_shared/cors.ts";

Deno.serve(async (request) => {
  const early = preflight(request);
  if (early) return early;
  const required = ["GOOGLE_CLIENT_ID", "GITHUB_CLIENT_ID", "RESEND_API_KEY", "STRIPE_SECRET_KEY"];
  const configured = Object.fromEntries(required.map((key) => [key, Boolean(Deno.env.get(key))]));
  return new Response(JSON.stringify({ configured }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
});
