export const handler = async (event, context) => {
  const headers = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
  };

  if (event.httpMethod === "OPTIONS") return { statusCode: 200, headers, body: "" };
  if (event.httpMethod !== "POST") return { statusCode: 405, headers, body: JSON.stringify({ error: "Method not allowed" }) };

  const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

  try {
    const { pdfUrl, restaurantName, sectionName } = JSON.parse(event.body || "{}");
    if (!pdfUrl) return { statusCode: 400, headers, body: JSON.stringify({ error: "URL PDF mancante" }) };

    const section = sectionName || "Intera carta";
    const name = restaurantName || "Ristorante";

    const systemPrompt = `Sei un Master Sommelier che analizza carte dei vini per SoWineNot.

Analizza la sezione "${section}" della carta de "${name}".

Struttura la risposta così:

📊 PANORAMICA
Descrivi brevemente la sezione analizzata.

💎 PERLE NASCOSTE (top 3)
Per ogni vino: nome, annata, prezzo carta, prezzo retail stimato, markup factor, motivo per cui è una gemma.

⚠️ DA EVITARE
Vini overpriced con spiegazione.

⭐ HIGHLIGHTS
Le bottiglie più interessanti o rare.

📈 VOTO COMPLESSIVO: XX/100
Breve giudizio sulla qualità della selezione.

Usa emoji. Sii preciso e appassionato.`;

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 2000,
        system: systemPrompt,
        messages: [{
          role: "user",
          content: [{
            type: "document",
            source: { type: "url", url: pdfUrl },
          }, {
            type: "text",
            text: `Analizza questa carta dei vini — sezione: ${section}`,
          }],
        }],
      }),
    });

    const data = await response.json();
    const result = data.content?.[0]?.text || "Errore nell'analisi";
    return { statusCode: 200, headers, body: JSON.stringify({ result }) };
  } catch (e) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: e.message }) };
  }
};
