export const handler = async (event, context) => {
  const headers = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
  };

  if (event.httpMethod === "OPTIONS") return { statusCode: 200, headers, body: "" };
  if (event.httpMethod !== "POST") return { statusCode: 405, headers, body: JSON.stringify({ error: "Method not allowed" }) };

  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_KEY = process.env.SUPABASE_KEY;
  const ADMIN_EMAIL = "lanzifederico09@gmail.com";

  try {
    const { action, email } = JSON.parse(event.body || "{}");

    if (!email) return { statusCode: 400, headers, body: JSON.stringify({ error: "Email mancante" }) };

    // Admin è sempre premium
    if (email === ADMIN_EMAIL) return { statusCode: 200, headers, body: JSON.stringify({ premium: true }) };

    if (action === "check") {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/premium_users?email=eq.${encodeURIComponent(email)}&active=eq.true&select=email`,
        { headers: { "apikey": SUPABASE_KEY, "Authorization": `Bearer ${SUPABASE_KEY}` } }
      );
      const data = await res.json();
      return { statusCode: 200, headers, body: JSON.stringify({ premium: Array.isArray(data) && data.length > 0 }) };
    }

    if (action === "activate") {
      await fetch(`${SUPABASE_URL}/rest/v1/premium_users`, {
        method: "POST",
        headers: { "apikey": SUPABASE_KEY, "Authorization": `Bearer ${SUPABASE_KEY}`, "Content-Type": "application/json", "Prefer": "resolution=merge-duplicates" },
        body: JSON.stringify({ email, active: true }),
      });
      return { statusCode: 200, headers, body: JSON.stringify({ success: true }) };
    }

    return { statusCode: 400, headers, body: JSON.stringify({ error: "Azione non valida" }) };
  } catch (e) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: e.message }) };
  }
};
