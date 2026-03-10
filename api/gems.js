export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { label, vintage, price, imageBase64 } = req.body;

  let userContent;
  if (imageBase64) {
    userContent = [
      { type: "image", source: { type: "base64", media_type: "image/jpeg", data: imageBase64 } },
      { type: "text", text: "Analizza questa carta dei vini. Per ogni vino che riesci a leggere, identificalo e calcolane il valore secondo il sistema di classificazione." },
    ];
  } else {
    userContent = `Analizza questo vino dalla carta di un ristorante:\nVino: ${label}\nAnnata: ${vintage}\nPrezzo al ristorante: ${price}€`;
  }

  const systemPrompt = `Sei un esperto analista di carte dei vini con conoscenza enciclopedica dei prezzi retail mondiali.

Il tuo compito è calcolare il "Punteggio Gemma" di un vino in carta (0-100).

SISTEMA DI CLASSIFICAZIONE:
Calcola il Markup Factor (MF) = Prezzo Ristorante / Prezzo Retail Medio stimato.
- PERLA ESTREMA (MF ≤ 1.1): quasi quanto in enoteca. Alert massimo.
- BUONA OPPORTUNITA (MF ≤ 1.6): ricarico onestissimo. Da consigliare se qualità alta.
- STANDARD (MF ≤ 2.5): ricarico normale di mercato.
- OVERPRICED (MF > 3.0): da evitare salvo etichette introvabili.

PUNTEGGIO GEMMA (0-100):
- 40 punti: risparmio economico (markup basso)
- 35 punti: qualità critica (Parker/Vinous/Decanter)
- 15 punti: rarità e reperibilità
- 10 punti: penalità se incerto sul prezzo retail

FATTORE RARITÀ: se annata storica o fuori commercio, ignora parzialmente il MF e considera reperibilità.
INCERTEZZA: se non sei sicuro del prezzo retail, segnalalo e aggiungi margine errore 20%.

Rispondi SEMPRE in questo formato, senza asterischi o markdown:

VINO: [nome e annata]
PREZZO RISTORANTE: [€]
PREZZO RETAIL STIMATO: [€] (range: [min]-[max]€)
MARKUP FACTOR: [numero]x
CLASSIFICAZIONE: [categoria]
PUNTEGGIO GEMMA: [0-100]/100
CONFIDENZA STIMA: [ALTA/MEDIA/BASSA]

VALUTAZIONE:
[2-3 righe di analisi del valore, tono diretto e concreto]

RACCOMANDAZIONE: [emoji + consiglio diretto in una riga]

— Lo sapevi? [curiosità breve e divertente su questo vino o produttore]`;

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
        messages: [{ role: "user", content: userContent }],
      }),
    });

    const data = await response.json();
    const text = data.content?.map((b) => b.text || "").join("") || JSON.stringify(data);
    res.status(200).json({ reply: text });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Errore del server" });
  }
}
