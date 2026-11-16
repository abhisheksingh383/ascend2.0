import { corsHeaders, preflight } from "../_shared/cors.ts";

Deno.serve(async (request) => {
  const early = preflight(request);
  if (early) return early;
  try {
    const apiKey = Deno.env.get("RESEND_API_KEY");
    if (!apiKey) throw new Error("RESEND_API_KEY is not configured.");
    const body = await request.json() as { to: string; subject: string; html: string };
    if (!body.to || !body.subject || !body.html) throw new Error("to, subject, and html are required.");
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: Deno.env.get("REMINDER_FROM_EMAIL") ?? "Ascend <reminders@example.com>", ...body }),
    });
    if (!response.ok) throw new Error(`Resend returned ${response.status}.`);
    return new Response(JSON.stringify(await response.json()), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (error) {
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Reminder delivery failed." }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
