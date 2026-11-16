import { corsHeaders, preflight } from "../_shared/cors.ts";

Deno.serve(async (request) => {
  const early = preflight(request);
  if (early) return early;
  try {
    const secret = Deno.env.get("STRIPE_SECRET_KEY");
    const priceId = Deno.env.get("STRIPE_PRO_PRICE_ID");
    if (!secret || !priceId) throw new Error("Stripe is not configured. Set STRIPE_SECRET_KEY and STRIPE_PRO_PRICE_ID.");
    const body = await request.json() as { customerEmail: string };
    const params = new URLSearchParams({ mode: "subscription", "line_items[0][price]": priceId, "line_items[0][quantity]": "1", success_url: `${Deno.env.get("APP_URL")}/?checkout=success`, cancel_url: `${Deno.env.get("APP_URL")}/?checkout=cancelled`, customer_email: body.customerEmail });
    const response = await fetch("https://api.stripe.com/v1/checkout/sessions", { method: "POST", headers: { Authorization: `Basic ${btoa(`${secret}:`)}`, "Content-Type": "application/x-www-form-urlencoded" }, body: params });
    if (!response.ok) throw new Error(`Stripe returned ${response.status}.`);
    const session = await response.json();
    return new Response(JSON.stringify({ url: session.url }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (error) {
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Checkout creation failed." }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
