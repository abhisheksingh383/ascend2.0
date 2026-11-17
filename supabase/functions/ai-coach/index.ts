import { corsHeaders, preflight } from "../_shared/cors.ts";

type RequestBody = { feature: "coach" | "challenge" | "review" | "explainer"; prompt: string; context?: unknown };

Deno.serve(async (request) => {
  const early = preflight(request);
  if (early) return early;
  try {
    const body = await request.json() as RequestBody;
    if (!body.prompt?.trim()) throw new Error("A prompt is required.");
    const apiKey = Deno.env.get("GROQ_API_KEY");
    if (!apiKey) throw new Error("GROQ_API_KEY is not configured for the ai-coach function.");

    const system = {
      coach: "You are Ascend's supportive productivity coach. Give one practical next action, using the supplied context. Do not diagnose health conditions.",
      challenge: "You generate one programming challenge with requirements, examples, constraints, and a concise rubric. Do not include a solution unless requested.",
      review: "You review code for correctness, security, complexity, and maintainability. Be specific and constructive.",
      explainer: "You are a patient academic tutor. Explain clearly, use a small example, then ask one check-for-understanding question.",
    }[body.feature] + "\nReturn JSON with exactly {\"message\": string, \"actions\": []}. Actions may be {\"type\":\"add_task\"|\"delete_task\"|\"complete_task\", \"taskId\"?: number, \"title\"?: string, \"category\"?: \"Academic\"|\"Coding\"|\"Personal\", \"due\"?: string, \"priority\"?: \"High\"|\"Medium\"|\"Low\", \"reason\"?: string} or {\"type\":\"create_subject\", \"subjectName\": string, \"code\"?: string, \"topics\": string[], \"reason\"?: string}. Only propose actions; never claim an action was completed. For add or complete actions, assess whether the task is realistic for a human and explain the difficulty in reason. For delete actions, include the matching taskId from context.";

    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "llama-3.1-8b-instant",
        temperature: 0.4,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: system },
          { role: "user", content: `${body.prompt}\n\nContext:\n${JSON.stringify(body.context ?? {})}` },
        ],
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("Groq API error:", response.status, errText);
      throw new Error(`AI provider returned ${response.status}: ${errText}`);
    }

    const result = await response.json();
    const raw = result.choices?.[0]?.message?.content ?? "";
    let parsed: { message?: string; actions?: unknown[] } = {};
    try { parsed = JSON.parse(raw) as typeof parsed; } catch { parsed = { message: raw, actions: [] }; }

    return new Response(
      JSON.stringify({ content: parsed.message ?? raw, actions: Array.isArray(parsed.actions) ? parsed.actions : [] }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "AI request failed." }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});