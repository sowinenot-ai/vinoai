export const handler = async (event, context) => {
  const headers = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
  };

  if (event.httpMethod === "OPTIONS") return { statusCode: 200, headers, body: "" };
  if (event.httpMethod !== "POST") return { statusCode: 405, headers, body: JSON.stringify({ error: "Method not allowed" }) };

  const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;
  const SITE_URL = process.env.URL || "https://sowinenot.netlify.app";

  try {
    // Crea checkout session Stripe
    const res = await fetch("https://api.stripe.com/v1/checkout/sessions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${STRIPE_SECRET_KEY}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        "mode": "subscription",
        "success_url": `${SITE_URL}?success=true`,
        "cancel_url": `${SITE_URL}?canceled=true`,
        "line_items[0][price_data][currency]": "eur",
        "line_items[0][price_data][product_data][name]": "SoWineNot Premium",
        "line_items[0][price_data][product_data][description]": "Accesso completo a gemme, carte vini e sommelier AI",
        "line_items[0][price_data][recurring][interval]": "month",
        "line_items[0][price_data][unit_amount]": "499",
        "line_items[0][quantity]": "1",
      }).toString(),
    });

    const session = await res.json();
    if (session.error) throw new Error(session.error.message);

    return { statusCode: 200, headers, body: JSON.stringify({ url: session.url }) };
  } catch (e) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: e.message }) };
  }
};
