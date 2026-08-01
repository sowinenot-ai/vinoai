export const handler = async (event) => {
  const headers = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
  };

  if (event.httpMethod !== "POST") {
    return { statusCode: 405, headers, body: JSON.stringify({ error: "Method not allowed" }) };
  }

  const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;
  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_KEY = process.env.SUPABASE_KEY;

  try {
    const stripeEvent = JSON.parse(event.body || "{}");

    // Pagamento completato → attiva premium
    if (stripeEvent.type === "checkout.session.completed") {
      const session = stripeEvent.data.object;
      const customerEmail = session.customer_details?.email;
      const customerId = session.customer;
      const subscriptionId = session.subscription;
      const periodEnd = session.expires_at
        ? new Date(session.expires_at * 1000).toISOString()
        : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

      if (customerEmail) {
        await fetch(`${SUPABASE_URL}/rest/v1/premium_users`, {
          method: "POST",
          headers: {
            "apikey": SUPABASE_KEY,
            "Authorization": `Bearer ${SUPABASE_KEY}`,
            "Content-Type": "application/json",
            "Prefer": "resolution=merge-duplicates",
          },
          body: JSON.stringify({
            email: customerEmail,
            stripe_customer_id: customerId,
            stripe_subscription_id: subscriptionId,
            status: "active",
            plan_tier: "premium",
            current_period_end: periodEnd,
          }),
        });
        console.log(`✅ Premium attivato: ${customerEmail}`);
      }
    }

    // Abbonamento cancellato → disattiva premium
    if (stripeEvent.type === "customer.subscription.deleted") {
      const subscription = stripeEvent.data.object;
      const customerId = subscription.customer;

      // Cerca email del cliente su Stripe
      const customerRes = await fetch(`https://api.stripe.com/v1/customers/${customerId}`, {
        headers: { "Authorization": `Bearer ${STRIPE_SECRET_KEY}` },
      });
      const customer = await customerRes.json();
      const customerEmail = customer.email;

      if (customerEmail) {
        await fetch(
          `${SUPABASE_URL}/rest/v1/premium_users?email=eq.${encodeURIComponent(customerEmail)}`,
          {
            method: "PATCH",
            headers: {
              "apikey": SUPABASE_KEY,
              "Authorization": `Bearer ${SUPABASE_KEY}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ status: "canceled" }),
          }
        );
        console.log(`❌ Premium disattivato: ${customerEmail}`);
      }
    }

    return { statusCode: 200, headers, body: JSON.stringify({ received: true }) };

  } catch (e) {
    console.error("Webhook error:", e);
    return { statusCode: 500, headers, body: JSON.stringify({ error: e.message }) };
  }
};
