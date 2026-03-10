export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { action, data } = req.body;

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_KEY;

  try {
    // Salva un nuovo contenuto nel knowledge base
    if (action === "save") {
      const { title, content, category, source } = data;

      // Genera embedding con OpenAI (o Anthropic non supporta embeddings, usiamo un workaround)
      // Utilizziamo la text-embedding-ada-002 di OpenAI oppure salviamo senza embedding per ora
      // e usiamo full-text search di Postgres
      
      const response = await fetch(`${supabaseUrl}/rest/v1/knowledge`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "apikey": supabaseKey,
          "Authorization": `Bearer ${supabaseKey}`,
          "Prefer": "return=representation",
        },
        body: JSON.stringify({ title, content, category, source }),
      });

      const saved = await response.json();
      return res.status(200).json({ success: true, id: saved[0]?.id });
    }

    // Cerca nel knowledge base (full-text search)
    if (action === "search") {
      const { query } = data;
      
      const response = await fetch(
        `${supabaseUrl}/rest/v1/knowledge?select=*&content=ilike.*${encodeURIComponent(query)}*&limit=5`,
        {
          headers: {
            "apikey": supabaseKey,
            "Authorization": `Bearer ${supabaseKey}`,
          },
        }
      );
      const results = await response.json();
      return res.status(200).json({ results });
    }

    // Lista tutti i contenuti (per admin)
    if (action === "list") {
      const response = await fetch(
        `${supabaseUrl}/rest/v1/knowledge?select=id,title,category,source,created_at&order=created_at.desc`,
        {
          headers: {
            "apikey": supabaseKey,
            "Authorization": `Bearer ${supabaseKey}`,
          },
        }
      );
      const items = await response.json();
      return res.status(200).json({ items });
    }

    // Elimina un contenuto
    if (action === "delete") {
      const { id } = data;
      await fetch(`${supabaseUrl}/rest/v1/knowledge?id=eq.${id}`, {
        method: "DELETE",
        headers: {
          "apikey": supabaseKey,
          "Authorization": `Bearer ${supabaseKey}`,
        },
      });
      return res.status(200).json({ success: true });
    }

    return res.status(400).json({ error: "Azione non valida" });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
}
