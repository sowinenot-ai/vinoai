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

  try {
    const { action, title, content, category, source } = JSON.parse(event.body || "{}");

    if (action === "save") {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/knowledge`, {
        method: "POST",
        headers: {
          "apikey": SUPABASE_KEY,
          "Authorization": `Bearer ${SUPABASE_KEY}`,
          "Content-Type": "application/json",
          "Prefer": "return=representation",
        },
        body: JSON.stringify({ title, content, category: category || "generale", source: source || "manuale" }),
      });
      const data = await res.json();
      return { statusCode: 200, headers, body: JSON.stringify({ success: true, data }) };
    }

    if (action === "list") {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/knowledge?select=id,title,category,source,created_at&order=created_at.desc&limit=50`,
        { headers: { "apikey": SUPABASE_KEY, "Authorization": `Bearer ${SUPABASE_KEY}` } }
      );
      const data = await res.json();
      return { statusCode: 200, headers, body: JSON.stringify({ items: data }) };
    }

    return { statusCode: 400, headers, body: JSON.stringify({ error: "Azione non valida" }) };
  } catch (e) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: e.message }) };
  }
};
