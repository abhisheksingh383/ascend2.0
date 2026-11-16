import { corsHeaders, preflight } from "../_shared/cors.ts";

type RequestBody = { feature: "coach" | "challenge" | "review" | "explainer"; prompt: string; context?: unknown };

Deno.serve(async (request) => {
  const early = preflight(request);
  if (early) return early;
  try {
    const body = await request.json() as RequestBody;
    if (!body.prompt?.trim()) throw new Error("A prompt is required.");
    const apiKey = Deno.env.get("OPENAI_API_KEY");
    if (!apiKey) throw new Error("OPENAI_API_KEY is not configured for the ai-coach function.");
    const system = {
      coach: "You are Ascend's supportive productivity coach. Give one practical next action, using the supplied context. Do not diagnose health conditions.",
      challenge: "You generate one programming challenge with requirements, examples, constraints, and a concise rubric. Do not include a solution unless requested.",
      review: "You review code for correctness, security, complexity, and maintainability. Be specific and constructive.",
      explainer: "You are a patient academic tutor. Explain clearly, use a small example, then ask one check-for-understanding question.",
    }[body.feature];
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: Deno.env.get("OPENAI_MODEL") ?? "gpt-4o-mini",
        temperature: 0.4,
        messages: [{ role: "system", content: system }, { role: "user", content: `${body.prompt}\n\nContext:\n${JSON.stringify(body.context ?? {})}` }],
      }),
    });
    if (!response.ok) throw new Error(`AI provider returned ${response.status}.`);
    const result = await response.json();
    return new Response(JSON.stringify({ content: result.choices?.[0]?.message?.content ?? "" }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (error) {
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "AI request failed." }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
