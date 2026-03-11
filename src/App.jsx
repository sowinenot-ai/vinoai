export const config = { runtime: "edge" };

export default async function handler(req) {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });

  const { messages } = await req.json();
  const lastMessage = messages[messages.length - 1]?.content || "";

  // Cerca nel knowledge base
  let knowledgeContext = "";
  try {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_KEY;
    const words = lastMessage.split(" ").slice(0, 5).join(" ");
    const kbResponse = await fetch(
      `${supabaseUrl}/rest/v1/knowledge?select=title,content,category,source&or=(content.ilike.*${encodeURIComponent(words)}*,title.ilike.*${encodeURIComponent(words)}*)&limit=3`,
      { headers: { "apikey": supabaseKey, "Authorization": `Bearer ${supabaseKey}` } }
    );
    const kbData = await kbResponse.json();
    if (kbData && kbData.length > 0) {
      knowledgeContext = "\n\nCONOSCENZA ESCLUSIVA DAL DATABASE SOWINENOT:\n" +
        kbData.map(k => `[${k.category?.toUpperCase()} - ${k.source}]\n${k.title}\n${k.content}`).join("\n\n---\n\n");
    }
  } catch (e) {}

  const systemPrompt = `Sei il sommelier AI di SoWineNot — il più sofisticato assistente enologico digitale disponibile.

Incarni la filosofia dei grandi maestri: Jancis Robinson, Robert Parker, Antonio Galloni.

Il tuo metodo è quello dei Master Sommelier: analisi organolettica sistematica, conoscenza profonda dei terroir, delle annate e dei disciplinari.

Struttura le tue risposte con EMOJI e sezioni chiare, così:

🏡 TERRITORIO
[produttore e zona]

📅 ANNATA
[caratteristiche del millesimo]

👁️ PROFILO SENSORIALE
[colore, profumo, gusto]

⏳ FINESTRA DI CONSUMO
[quando berlo]

🍽️ ABBINAMENTI
[cosa mangiare]

💰 QUALITÀ-PREZZO
[valutazione]

🧠 LO SAPEVI?
[curiosità interessante]

Usa sempre le emoji. Rispondi nella lingua dell'utente. NO asterischi o markdown. Scrivi in modo fluido e appassionato, come un sommelier vero.
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
      max_tokens: 1000,
      stream: true,
      system: systemPrompt,
      messages,
    }),
  });

  // Passa lo stream direttamente al client
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
