export const handler = async (event) => {
  const headers = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
  };

  if (event.httpMethod === "OPTIONS") return { statusCode: 200, headers, body: "" };
  if (event.httpMethod !== "POST") return { statusCode: 405, headers, body: JSON.stringify({ error: "Method not allowed" }) };

  const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_KEY = process.env.SUPABASE_KEY;

  try {
    const { restaurantName, city } = JSON.parse(event.body || "{}");
    if (!restaurantName) return { statusCode: 400, headers, body: JSON.stringify({ error: "Nome ristorante mancante" }) };

    // Cerca nel database locale prima
    const dbRes = await fetch(
      `${SUPABASE_URL}/rest/v1/restaurants?name=ilike.*${encodeURIComponent(restaurantName)}*&select=*,gems(*)&limit=1`,
      { headers: { "apikey": SUPABASE_KEY, "Authorization": `Bearer ${SUPABASE_KEY}` } }
    );
    const dbData = await dbRes.json();

    // Cerca anche i PDF
    const pdfRes = await fetch(
      `${SUPABASE_URL}/rest/v1/restaurant_pdfs?restaurant_name=ilike.*${encodeURIComponent(restaurantName)}*&select=*&limit=5`,
      { headers: { "apikey": SUPABASE_KEY, "Authorization": `Bearer ${SUPABASE_KEY}` } }
    );
    const pdfData = await pdfRes.json();

    // Genera analisi con AI
    const prompt = `Sei un esperto di ristoranti e vini. Fornisci informazioni su "${restaurantName}"${city ? ` a ${city}` : ""}. 
    
Struttura così:
🏆 REPUTAZIONE — cosa si sa di questo ristorante
🍷 CARTA DEI VINI — cosa ti aspetti dalla carta
💡 CONSIGLI — cosa ordinare e cosa evitare
⭐ VOTO ATTESO — da 1 a 10

Sii diretto e conciso.`;

    const aiRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 600,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    const aiData = await aiRes.json();
    const analysis = aiData.content?.[0]?.text || "";

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        restaurant: dbData?.[0] || null,
        pdfs: Array.isArray(pdfData) ? pdfData : [],
        analysis,
      }),
    };
  } catch (e) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: e.message }) };
  }
};
