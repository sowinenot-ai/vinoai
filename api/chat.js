export const config = { runtime: "edge" };

export default async function handler(req) {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });

  const { messages, jsonMode } = await req.json();

  // Se modalità JSON (estrazione info ristorante) — risposta semplice non streaming
  if (jsonMode) {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 200,
        system: "Rispondi SOLO con JSON valido, nessun testo aggiuntivo.",
        messages,
      }),
    });
    const data = await response.json();
    const reply = data.content?.[0]?.text || "{}";
    return new Response(JSON.stringify({ reply }), {
      headers: { "Content-Type": "application/json" },
    });
  }

  // Cerca nel knowledge base (solo se l'ultimo messaggio è testo)
  let knowledgeContext = "";
  try {
    const lastMsg = messages[messages.length - 1];
    const lastText = typeof lastMsg?.content === "string"
      ? lastMsg.content
      : lastMsg?.content?.find(b => b.type === "text")?.text || "";
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_KEY;
    const words = lastText.split(" ").slice(0, 5).join(" ");
    if (words.length > 3) {
      const kbResponse = await fetch(
        `${supabaseUrl}/rest/v1/knowledge?select=title,content,category,source&or=(content.ilike.*${encodeURIComponent(words)}*,title.ilike.*${encodeURIComponent(words)}*)&limit=3`,
        { headers: { "apikey": supabaseKey, "Authorization": `Bearer ${supabaseKey}` } }
      );
      const kbData = await kbResponse.json();
      if (kbData && kbData.length > 0) {
        knowledgeContext = "\n\nCONOSCENZA ESCLUSIVA DAL DATABASE SOWINENOT:\n" +
          kbData.map(k => `[${k.category?.toUpperCase()} - ${k.source}]\n${k.title}\n${k.content}`).join("\n\n---\n\n");
      }
    }
  } catch (e) {}

  const systemPrompt = `Sei il sommelier AI di SoWineNot — il più sofisticato assistente enologico digitale disponibile.

Incarni la filosofia dei grandi maestri: Jancis Robinson, Robert Parker, Antonio Galloni.

Quando ti inviano la FOTO di una carta dei vini, analizzala come un Master Sommelier:
📋 PANORAMICA CARTA — quante etichette, quali regioni
💎 PERLE NASCOSTE — i 3 vini con miglior rapporto qualità/prezzo, con stima del markup
⚠️ VINI OVERPRICED — quelli da evitare
⭐ HIGHLIGHTS — le bottiglie più interessanti o rare
📊 VOTO COMPLESSIVO — punteggio da 0 a 100

Per domande su singoli vini, struttura così:
🏡 TERRITORIO — produttore e zona
📅 ANNATA — caratteristiche del millesimo
👁️ PROFILO SENSORIALE — colore, profumo, gusto
⏳ FINESTRA DI CONSUMO — quando berlo
🍽️ ABBINAMENTI — cosa mangiare
💰 QUALITÀ-PREZZO — valutazione
🧠 LO SAPEVI? — curiosità interessante

Usa sempre le emoji. Rispondi nella lingua dell'utente. NO asterischi o markdown. Scrivi in modo fluido e appassionato.
${knowledgeContext ? knowledgeContext + "\n\nUsa queste informazioni esclusive per arricchire le tue risposte quando pertinenti." : ""}`;

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": process.env.ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-6",
      max_tokens: 1500,
      stream: true,
      system: systemPrompt,
      messages,
    }),
  });

  const stream = new ReadableStream({
    async start(controller) {
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value);
          const lines = chunk.split("\n");
          for (const line of lines) {
            if (line.startsWith("data: ")) {
              const data = line.slice(6);
              if (data === "[DONE]") continue;
              try {
                const parsed = JSON.parse(data);
                if (parsed.type === "content_block_delta" && parsed.delta?.text) {
                  controller.enqueue(new TextEncoder().encode(parsed.delta.text));
                }
              } catch {}
            }
          }
        }
      } finally {
        controller.close();
      }
    }
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-cache",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
