import { useState, useEffect } from "react";

const BURGUNDY = "#6B1A2A";
const GOLD = "#C9A84C";
const CREAM = "#F5ECD7";
const DARK = "#0D0A08";
const MUTED = "#3A2D28";

const CATEGORIES = [
  { key: "intervista", label: "🎤 Intervista Sommelier" },
  { key: "degustazione", label: "🍷 Nota di Degustazione" },
  { key: "articolo", label: "📰 Articolo / Guida" },
  { key: "guida", label: "🗺️ Guida Regionale" },
  { key: "video", label: "🎬 Video YouTube" },
];

async function callKnowledge(action, data) {
  const res = await fetch("/api/knowledge", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action, data }),
  });
  return res.json();
}

async function importYoutube(url) {
  const res = await fetch("/api/youtube", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url }),
  });
  return res.json();
}

export default function AdminPanel({ user, onClose }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ title: "", content: "", category: "intervista", source: "" });
  const [saved, setSaved] = useState(false);
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [youtubeLoading, setYoutubeLoading] = useState(false);
  const [youtubeResult, setYoutubeResult] = useState("");
  const [inputMode, setInputMode] = useState("text");
  const ADMIN_EMAIL = "lanzifederico09@gmail.com";

  useEffect(() => { loadItems(); }, []);

  async function loadItems() {
    setLoading(true);
    const res = await callKnowledge("list", {});
    setItems(res.items || []);
    setLoading(false);
  }

  async function saveItem() {
    if (!form.title || !form.content) return;
    setSaving(true);
    await callKnowledge("save", form);
    setForm({ title: "", content: "", category: "intervista", source: "" });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
    await loadItems();
    setSaving(false);
  }

  async function handleYoutube() {
    if (!youtubeUrl.trim()) return;
    setYoutubeLoading(true);
    setYoutubeResult("");
    const res = await importYoutube(youtubeUrl);
    if (res.success) {
      setYoutubeResult(`✓ Importato: "${res.title}" di ${res.author}`);
      setYoutubeUrl("");
      await loadItems();
    } else {
      setYoutubeResult("✗ " + (res.error || "Errore importazione"));
    }
    setYoutubeLoading(false);
  }

  async function deleteItem(id) {
    await callKnowledge("delete", { id });
    await loadItems();
  }

  const inputStyle = { background: `${MUTED}55`, border: `1px solid ${GOLD}33`, borderRadius: 8, padding: "10px 14px", color: CREAM, fontFamily: "Georgia, serif", fontSize: 13, outline: "none", width: "100%", boxSizing: "border-box" };

  if (user?.email !== ADMIN_EMAIL) {
    return (
      <div style={{ padding: 32, textAlign: "center", color: CREAM + "66" }}>
        <div style={{ fontSize: 32, marginBottom: 12 }}>🔒</div>
        <p>Area riservata all'amministratore</p>
        <button onClick={onClose} style={{ marginTop: 12, padding: "8px 18px", borderRadius: 20, background: "transparent", border: `1px solid ${GOLD}44`, color: GOLD, fontSize: 12, cursor: "pointer" }}>← Torna all'app</button>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 24, fontWeight: 600, margin: 0, color: CREAM }}>🧠 Knowledge Base</h2>
          <p style={{ margin: "4px 0 0", fontSize: 12, color: GOLD + "88" }}>{items.length} contenuti · L'AI impara da questi</p>
        </div>
        <button onClick={onClose} style={{ padding: "6px 14px", borderRadius: 20, background: "transparent", border: `1px solid ${GOLD}44`, color: GOLD, fontSize: 12, cursor: "pointer" }}>← Torna all'app</button>
      </div>

      {/* Mode toggle */}
      <div style={{ display: "flex", background: `${MUTED}44`, borderRadius: 10, padding: 4, border: `1px solid ${GOLD}22` }}>
        {[{ key: "text", label: "✏️  Testo / Intervista" }, { key: "youtube", label: "▶️  Importa da YouTube" }].map(m => (
          <button key={m.key} onClick={() => setInputMode(m.key)} style={{ flex: 1, padding: "9px", borderRadius: 7, background: inputMode === m.key ? `linear-gradient(135deg, ${BURGUNDY}, #9B2335)` : "transparent", border: "none", color: inputMode === m.key ? CREAM : CREAM + "66", fontFamily: "'Cormorant Garamond', serif", fontSize: 14, cursor: "pointer" }}>{m.label}</button>
        ))}
      </div>

      {/* YouTube import */}
      {inputMode === "youtube" && (
        <div style={{ background: `${MUTED}33`, borderRadius: 16, padding: 20, border: `1px solid ${GOLD}22` }}>
          <div style={{ fontSize: 13, color: GOLD, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 8 }}>▶️ Importa Video YouTube</div>
          <p style={{ margin: "0 0 14px", fontSize: 12, color: CREAM + "66", lineHeight: 1.6 }}>
            Incolla il link di qualsiasi video YouTube sul vino. L'AI estrarrà i sottotitoli, li riassumerà e li salverà nel database. Funziona con interviste, degustazioni, guide e documentari.
          </p>
          <div style={{ display: "flex", gap: 10 }}>
            <input value={youtubeUrl} onChange={e => setYoutubeUrl(e.target.value)} onKeyDown={e => e.key === "Enter" && handleYoutube()} placeholder="https://www.youtube.com/watch?v=..." style={{ ...inputStyle, flex: 1 }} />
            <button onClick={handleYoutube} disabled={youtubeLoading || !youtubeUrl.trim()} style={{ padding: "10px 18px", borderRadius: 8, background: youtubeLoading ? `${MUTED}88` : `linear-gradient(135deg, #CC0000, #990000)`, border: "none", color: CREAM, fontFamily: "'Cormorant Garamond', serif", fontSize: 14, cursor: "pointer", whiteSpace: "nowrap" }}>
              {youtubeLoading ? "⏳ Importo..." : "▶️ Importa"}
            </button>
          </div>
          {youtubeResult && (
            <div style={{ marginTop: 12, padding: "10px 14px", borderRadius: 8, background: youtubeResult.startsWith("✓") ? "#1A3A1A" : "#3A1A1A", border: `1px solid ${youtubeResult.startsWith("✓") ? "#2A6A2A" : BURGUNDY}`, fontSize: 13, color: youtubeResult.startsWith("✓") ? "#88DD88" : "#FF8888" }}>
              {youtubeResult}
            </div>
          )}
          <div style={{ marginTop: 16, padding: "12px 14px", background: `${MUTED}22`, borderRadius: 8, border: `1px solid ${GOLD}11` }}>
            <div style={{ fontSize: 11, color: GOLD + "88", marginBottom: 6 }}>ESEMPI DI VIDEO DA IMPORTARE:</div>
            {["Interviste a produttori (Gaja, Antinori, Sassicaia...)", "Degustazioni di sommelier famosi", "Documentari sul vino italiano", "Guide regionali (Barolo, Brunello, Amarone...)", "Video del Gambero Rosso, Wine Spectator"].map((ex, i) => (
              <div key={i} style={{ fontSize: 12, color: CREAM + "55", padding: "3px 0" }}>• {ex}</div>
            ))}
          </div>
        </div>
      )}

      {/* Text form */}
      {inputMode === "text" && (
        <div style={{ background: `${MUTED}33`, borderRadius: 16, padding: 20, border: `1px solid ${GOLD}22` }}>
          <div style={{ fontSize: 13, color: GOLD, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 14 }}>+ Aggiungi contenuto</div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 12 }}>
            {CATEGORIES.filter(c => c.key !== "video").map(c => (
              <button key={c.key} onClick={() => setForm(f => ({ ...f, category: c.key }))} style={{ padding: "6px 12px", borderRadius: 20, background: form.category === c.key ? `linear-gradient(135deg, ${BURGUNDY}, #9B2335)` : `${MUTED}55`, border: `1px solid ${form.category === c.key ? BURGUNDY : GOLD + "22"}`, color: CREAM, fontSize: 12, cursor: "pointer", fontFamily: "Georgia, serif" }}>{c.label}</button>
            ))}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Titolo (es. 'Intervista a Gaja sul Barbaresco')" style={inputStyle} />
            <input value={form.source} onChange={e => setForm(f => ({ ...f, source: e.target.value }))} placeholder="Fonte (es. 'Angelo Gaja', 'Gambero Rosso', 'Federico')" style={inputStyle} />
            <textarea value={form.content} onChange={e => setForm(f => ({ ...f, content: e.target.value }))} placeholder="Incolla qui il testo dell'intervista, nota di degustazione, o articolo..." rows={8} style={{ ...inputStyle, resize: "vertical", lineHeight: 1.6 }} />
            <button onClick={saveItem} disabled={saving || !form.title || !form.content} style={{ padding: "12px", background: saved ? "#2A7A2A" : `linear-gradient(135deg, ${GOLD}, #8B6914)`, border: "none", borderRadius: 10, color: DARK, fontFamily: "'Cormorant Garamond', serif", fontSize: 15, fontWeight: 700, cursor: "pointer", transition: "all 0.3s" }}>
              {saving ? "Salvataggio..." : saved ? "✓ Salvato!" : "Salva nel database →"}
            </button>
          </div>
        </div>
      )}

      {/* Lista contenuti */}
      <div>
        <div style={{ fontSize: 12, color: GOLD, letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: 10 }}>Contenuti salvati</div>
        {loading && <div style={{ color: CREAM + "44", fontSize: 13 }}>Caricamento...</div>}
        {items.length === 0 && !loading && (
          <div style={{ padding: 20, textAlign: "center", color: CREAM + "44", fontSize: 13, background: `${MUTED}22`, borderRadius: 12 }}>
            Nessun contenuto ancora. Inizia importando un video YouTube o aggiungendo un'intervista!
          </div>
        )}
        {items.map((item, i) => (
          <div key={i} style={{ padding: "12px 16px", background: `${MUTED}22`, borderRadius: 10, border: `1px solid ${GOLD}11`, marginBottom: 8, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 15, color: CREAM }}>{item.title}</div>
              <div style={{ fontSize: 11, color: GOLD + "88", marginTop: 2 }}>
                {CATEGORIES.find(c => c.key === item.category)?.label || item.category} · {item.source} · {new Date(item.created_at).toLocaleDateString("it")}
              </div>
            </div>
            <button onClick={() => deleteItem(item.id)} style={{ background: "none", border: "none", color: CREAM + "33", cursor: "pointer", fontSize: 16, padding: 4, flexShrink: 0 }}>✕</button>
          </div>
        ))}
      </div>
    </div>
  );
}
