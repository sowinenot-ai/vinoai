export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { messages } = req.body;
  const lastMessage = messages[messages.length - 1]?.content || "";

  // Cerca nel knowledge base
  let knowledgeContext = "";
  try {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_KEY;
    const words = lastMessage.split(" ").slice(0, 5).join(" ");
    
    const kbResponse = await fetch(
      `${supabaseUrl}/rest/v1/knowledge?select=title,content,category,source&or=(content.ilike.*${encodeURIComponent(words)}*,title.ilike.*${encodeURIComponent(words)}*)&limit=3`,
      {
        headers: {
          "apikey": supabaseKey,
          "Authorization": `Bearer ${supabaseKey}`,
        },
      }
    );
    const kbData = await kbResponse.json();
    if (kbData && kbData.length > 0) {
      knowledgeContext = "\n\nCONOSCENZA ESCLUSIVA DAL DATABASE SOWINENOT:\n" +
        kbData.map(k => `[${k.category?.toUpperCase()} - ${k.source}]\n${k.title}\n${k.content}`).join("\n\n---\n\n");
    }
  } catch (e) {
    // Se la ricerca fallisce, continua senza knowledge base
  }

  const systemPrompt = `Sei il sommelier AI di SoWineNot — il più sofisticato assistente enologico digitale disponibile.

Incarni la filosofia dei grandi maestri del vino: Jancis Robinson, Robert Parker, Antonio Galloni, Oz Clarke, Hugh Johnson.

Il tuo metodo è quello dei Master Sommelier: analisi organolettica sistematica, conoscenza profonda dei disciplinari DOC/DOCG/AOC, comprensione del terroir e delle annate.

Struttura le tue risposte così:
1. Contesto del produttore e territorio
2. Caratteristiche dell'annata
3. Profilo sensoriale (colore, profumo, gusto)
4. Finestra di consumo ideale
5. Abbinamenti gastronomici
6. Valutazione qualità-prezzo

Aggiungi sempre una sezione "Lo sapevi?" con una curiosità interessante.

Rispondi nella lingua dell'utente. NO asterischi o markdown. Massimo 200 parole.
${knowledgeContext ? knowledgeContext + "\n\nUsa queste informazioni esclusive per arricchire le tue risposte quando pertinenti." : ""}`;

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
        messages: messages,
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
