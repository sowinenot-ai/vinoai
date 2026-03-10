export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { pdf, restaurantName, restaurantCity } = req.body;
  if (!pdf) return res.status(400).json({ error: "PDF mancante" });

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 2000,
        messages: [{
          role: "user",
          content: [
            {
              type: "document",
              source: {
                type: "base64",
                media_type: "application/pdf",
                data: pdf,
              },
            },
            {
              type: "text",
              text: `Sei un esperto sommelier e analista di carte vini. Analizza questa carta vini del ristorante "${restaurantName}" (${restaurantCity || "Italia"}).

Fornisci:

1. PANORAMICA CARTA
Numero approssimativo di etichette, qualità generale, punti di forza, regioni/produttori rappresentati.

2. 💎 TOP 5 GEMME NASCOSTE
Per ogni gemma indica:
- Nome vino e annata
- Prezzo in carta
- Prezzo stimato al retail (approssimativo)
- Perché è una gemma (qualità/rarità/prezzo)
- Punteggio Gemma (0-100)

3. ⚠️ VINI DA EVITARE
Segnala 2-3 vini con markup eccessivo o qualità non giustificata dal prezzo.

4. 🌟 CONSIGLIO DEL SOMMELIER
Il miglior abbinamento qualità-prezzo per una serata speciale.

Scrivi in italiano, sii preciso e diretto.`,
            },
          ],
        }],
      }),
    });

    const data = await response.json();
    if (data.error) return res.status(500).json({ error: data.error.message });

    const analysis = data.content?.map(b => b.text || "").join("") || "Analisi non disponibile";
    res.status(200).json({ analysis });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Errore nell'analisi del PDF: " + err.message });
  }
}
