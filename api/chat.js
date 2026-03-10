export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { messages } = req.body;

  const systemPrompt = `Sei VinoAI, un sommelier esperto e appassionato con decenni di esperienza nelle migliori cantine d'Italia e del mondo. 
Rispondi SEMPRE nella stessa lingua usata dall'utente, con un tono elegante ma accessibile e capile da tutti gli utenti. 
Sei specializzato in:
- Riconoscimento e analisi di vini da descrizioni o immagini
- Abbinamenti cibo-vino con spiegazioni dettagliate
- Consigli d'acquisto per ogni budget
- Gestione della cantina personale
- Curiosità, storia e cultura del vino

Quando descrivi un vino, usa un linguaggio sensoriale ricco: colori, profumi, sapori, retrogusto. 
Sii sempre concreto: dai nomi di produttori, annate specifiche, prezzi indicativi.
Tieni le risposte concise ma preziose - massimo 150 parole a meno che non ti venga chiesto di approfondire.`;

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
        max_tokens: 1000,
        system: systemPrompt,
        messages,
      }),
    });

    const data = await response.json();
    const text = data.content?.map((b) => b.text || "").join("") || "Errore nella risposta.";
    res.status(200).json({ reply: text });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Errore del server" });
  }
}
