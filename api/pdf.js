export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { pdfUrl, restaurantName, sectionName, isBook, bookAuthor } = req.body;
  if (!pdfUrl) return res.status(400).json({ error: "URL PDF mancante" });

  const promptText = isBook
    ? `Sei un Master Sommelier e esperto enologico. Stai leggendo il libro "${restaurantName}"${bookAuthor ? " di " + bookAuthor : ""}.

Estrai e organizza tutto il sapere enologico utile in queste sezioni:

CONCETTI CHIAVE
I principi fondamentali spiegati nel libro.

TERRITORI E PRODUTTORI
Zone vinicole, denominazioni, produttori citati con caratteristiche distintive.

UVAGGI E VITIGNI
Varietà di uve trattate, con profili aromatici e zone di produzione.

ABBINAMENTI CIBO-VINO
Tutte le indicazioni di pairing presenti nel libro.

ANNATE E MILLESIMI
Valutazioni di annate storiche se presenti.

TECNICHE DI DEGUSTAZIONE
Metodologie e vocabolario della degustazione.

CONSIGLI PRATICI
Tutto ciò che un sommelier dovrebbe sapere da questo libro.

Questo contenuto sarà usato da un AI sommelier per rispondere ai clienti in modo preciso ed esperto. Rispondi in italiano. Sii esaustivo, organizzato e preciso. Questo è materiale di studio professionale.`
    : `Sei un esperto sommelier e analista di carte dei vini.${restaurantName ? " Stai analizzando la carta di " + restaurantName + (sectionName && sectionName !== "Intera carta" ? " — sezione: " + sectionName : "") + "." : ""} Analizza questa carta dei vini e fornisci:

PANORAMICA CARTA
Quante etichette ci sono? Quali regioni sono rappresentate? Qual è la filosofia della carta?

PERLE NASCOSTE
Identifica i 3-5 vini con il miglior rapporto qualità/prezzo. Per ogni perla: nome vino, prezzo carta, stima prezzo retail, markup factor, e perché è una perla.

VINI OVERPRICED
Segnala i 2-3 vini con markup eccessivo (oltre 3 volte il prezzo retail).

HIGHLIGHTS
I vini più interessanti o rari presenti in carta.

VALUTAZIONE COMPLESSIVA
Punteggio da 0 a 100 e commento sulla qualità della selezione.

Rispondi in italiano. Niente asterischi o markdown. Sii preciso e diretto.`;

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
        max_tokens: 4000,
        messages: [{
          role: "user",
          content: [
            {
              type: "document",
              source: { type: "url", url: pdfUrl },
            },
            {
              type: "text",
              text: `Sei un esperto sommelier e analista di carte dei vini.${restaurantName ? ` Stai analizzando la carta di ${restaurantName}.` : ""} Analizza questa carta dei vini e fornisci:

PANORAMICA CARTA
Quante etichette ci sono? Quali regioni sono rappresentate? Qual è la filosofia della carta?

PERLE NASCOSTE
Identifica i 3-5 vini con il miglior rapporto qualità/prezzo. Per ogni perla: nome vino, prezzo carta, stima prezzo retail, markup factor, e perché è una perla.

VINI OVERPRICED
Segnala i 2-3 vini con markup eccessivo (oltre 3 volte il prezzo retail).

HIGHLIGHTS
I vini più interessanti o rari presenti in carta.

VALUTAZIONE COMPLESSIVA
Punteggio da 0 a 100 e commento sulla qualità della selezione.

Rispondi in italiano. Niente asterischi o markdown. Sii preciso e diretto.`,
            },
          ],
        }],
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      return res.status(500).json({ error: "Errore API: " + response.status + " — " + errText.slice(0, 200) });
    }

    const data = await response.json();
    const result = data.content?.map(b => b.text || "").join("") || "Nessun risultato";
    res.status(200).json({ result });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Errore: " + err.message });
  }
}
