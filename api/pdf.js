export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { base64, filename } = req.body;
  if (!base64) return res.status(400).json({ error: "PDF mancante" });

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
        max_tokens: 3000,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "document",
                source: {
                  type: "base64",
                  media_type: "application/pdf",
                  data: base64,
                },
              },
              {
                type: "text",
                text: `Sei un esperto sommelier e analista di carte dei vini. Analizza questa carta dei vini e fornisci:

1. **PANORAMICA CARTA** — Quante etichette ci sono? Quali regioni sono rappresentate? Qual è la filosofia della carta?

2. **💎 PERLE NASCOSTE** — Identifica i 3-5 vini con il miglior rapporto qualità/prezzo. Per ogni perla: nome vino, prezzo carta, stima prezzo retail, markup factor, e perché è una perla.

3. **⚠️ VINI OVERPRICED** — Segnala i 2-3 vini con markup eccessivo (>3x il prezzo retail).

4. **⭐ HIGHLIGHTS** — I vini più interessanti/rari presenti.

5. **VALUTAZIONE COMPLESSIVA** — Punteggio 0-100 e commento sulla qualità della selezione.

Rispondi in italiano, senza asterischi o markdown. Sii preciso e diretto.`,
              },
            ],
          },
        ],
      }),
    });

    const data = await response.json();

    if (data.error) {
      return res.status(500).json({ error: data.error.message || "Errore API" });
    }

    const result = data.content?.map((b) => b.text || "").join("") || "Nessun risultato";
    res.status(200).json({ result });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Errore analisi PDF: " + err.message });
  }
}
