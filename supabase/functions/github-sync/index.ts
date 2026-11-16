import { corsHeaders, preflight } from "../_shared/cors.ts";

Deno.serve(async (request) => {
  const early = preflight(request);
  if (early) return early;
  try {
    const token = request.headers.get("x-github-access-token");
    if (!token) throw new Error("Connect GitHub before syncing.");
    const response = await fetch("https://api.github.com/user/events?per_page=30", {
      headers: { Authorization: `Bearer ${token}`, Accept: "application/vnd.github+json", "User-Agent": "Ascend" },
    });
    if (!response.ok) throw new Error(`GitHub returned ${response.status}.`);
    return new Response(JSON.stringify({ events: await response.json() }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (error) {
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "GitHub sync failed." }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
