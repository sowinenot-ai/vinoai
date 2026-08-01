export const handler = async (event) => {
  const headers = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
  };

  if (event.httpMethod === "OPTIONS") return { statusCode: 200, headers, body: "" };
  if (event.httpMethod !== "POST") return { statusCode: 405, headers, body: JSON.stringify({ error: "Method not allowed" }) };

  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_KEY = process.env.SUPABASE_KEY;
  const INVITE_CODE = "EARLYBIRD2024";
  const MAX_EARLY_BIRDS = 10;

  try {
    const { email, code } = JSON.parse(event.body || "{}");

    if (!email) return { statusCode: 400, headers, body: JSON.stringify({ error: "Email mancante" }) };
    if (code !== INVITE_CODE) return { statusCode: 403, headers, body: JSON.stringify({ error: "Codice non valido" }) };

    // Controlla quanti early bird ci sono già
    const countRes = await fetch(
      `${SUPABASE_URL}/rest/v1/premium_users?is_early_bird=eq.true&select=email`,
      { headers: { "apikey": SUPABASE_KEY, "Authorization": `Bearer ${SUPABASE_KEY}` } }
    );
    const existing = await countRes.json();

    // Controlla se l'utente è già early bird
    const alreadyIn = Array.isArray(existing) && existing.some(u => u.email === email);
    if (alreadyIn) {
      return { statusCode: 200, headers, body: JSON.stringify({ success: true, message: "already_active" }) };
    }

    // Controlla se ci sono ancora posti
    if (Array.isArray(existing) && existing.length >= MAX_EARLY_BIRDS) {
      return { statusCode: 200, headers, body: JSON.stringify({ success: false, message: "full" }) };
    }

    // Attiva premium early bird
    await fetch(`${SUPABASE_URL}/rest/v1/premium_users`, {
      method: "POST",
      headers: {
        "apikey": SUPABASE_KEY,
        "Authorization": `Bearer ${SUPABASE_KEY}`,
        "Content-Type": "application/json",
        "Prefer": "resolution=merge-duplicates",
      },
      body: JSON.stringify({
        email,
        status: "active",
        plan_tier: "premium",
        is_early_bird: true,
      }),
    });

    const spotsLeft = MAX_EARLY_BIRDS - existing.length - 1;
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ success: true, message: "activated", spotsLeft }),
    };

  } catch (e) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: e.message }) };
  }
};
