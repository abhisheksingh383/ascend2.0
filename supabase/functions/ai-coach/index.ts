import { corsHeaders, preflight } from "../_shared/cors.ts";

type RequestBody = { feature: "coach" | "challenge" | "review" | "explainer"; prompt: string; context?: unknown };

Deno.serve(async (request) => {
  const early = preflight(request);
  if (early) return early;
  try {
    const body = await request.json() as RequestBody;
    if (!body.prompt?.trim()) throw new Error("A prompt is required.");
    const apiKey = Deno.env.get("GEMINI_API_KEY");
    if (!apiKey) throw new Error("GEMINI_API_KEY is not configured for the ai-coach function.");
    const system = {
      coach: "You are Ascend's supportive productivity coach. Give one practical next action, using the supplied context. Do not diagnose health conditions.",
      challenge: "You generate one programming challenge with requirements, examples, constraints, and a concise rubric. Do not include a solution unless requested.",
      review: "You review code for correctness, security, complexity, and maintainability. Be specific and constructive.",
      explainer: "You are a patient academic tutor. Explain clearly, use a small example, then ask one check-for-understanding question.",
    }[body.feature] + "\nReturn JSON with exactly {\"message\": string, \"actions\": []}. Actions may be {\"type\":\"add_task\"|\"delete_task\"|\"complete_task\", \"taskId\"?: number, \"title\"?: string, \"category\"?: \"Academic\"|\"Coding\"|\"Personal\", \"due\"?: string, \"priority\"?: \"High\"|\"Medium\"|\"Low\", \"reason\"?: string} or {\"type\":\"create_subject\", \"subjectName\": string, \"code\"?: string, \"topics\": string[], \"reason\"?: string}. Only propose actions; never claim an action was completed. For add or complete actions, assess whether the task is realistic for a human and explain the difficulty in reason. For delete actions, include the matching taskId from context.";
    const model = Deno.env.get("GEMINI_MODEL") ?? "gemini-2.0-flash";
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: system }] },
        generationConfig: { temperature: 0.4, responseMimeType: "application/json" },
        contents: [{ role: "user", parts: [{ text: `${body.prompt}\n\nContext:\n${JSON.stringify(body.context ?? {})}` }] }],
      }),
    });
    if (!response.ok) throw new Error(`AI provider returned ${response.status}.`);
    const result = await response.json();
    const raw = result.candidates?.[0]?.content?.parts?.map((part: { text?: string }) => part.text ?? "").join("") ?? "";
    let parsed: { message?: string; actions?: unknown[] } = {};
    try { parsed = JSON.parse(raw) as typeof parsed; } catch { parsed = { message: raw, actions: [] }; }
    return new Response(JSON.stringify({ content: parsed.message ?? raw, actions: Array.isArray(parsed.actions) ? parsed.actions : [] }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (error) {
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "AI request failed." }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
