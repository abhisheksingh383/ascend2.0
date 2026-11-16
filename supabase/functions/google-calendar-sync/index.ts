import { corsHeaders, preflight } from "../_shared/cors.ts";

Deno.serve(async (request) => {
  const early = preflight(request);
  if (early) return early;
  try {
    const token = request.headers.get("x-google-access-token");
    if (!token) throw new Error("Connect Google Calendar before syncing.");
    const response = await fetch("https://www.googleapis.com/calendar/v3/calendars/primary/events?maxResults=50&singleEvents=true&orderBy=startTime", {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!response.ok) throw new Error(`Google Calendar returned ${response.status}.`);
    const data = await response.json();
    return new Response(JSON.stringify({ events: data.items ?? [] }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (error) {
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Calendar sync failed." }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
