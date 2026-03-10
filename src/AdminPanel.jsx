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
];

async function callKnowledge(action, data) {
  const res = await fetch("/api/knowledge", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action, data }),
  });
  return res.json();
}

export default function AdminPanel({ user, onClose }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ title: "", content: "", category: "intervista", source: "" });
  const [saved, setSaved] = useState(false);
  const ADMIN_EMAIL = "lanzifederico09@gmail.com"; // cambia con la tua email

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

      {/* Form nuovo contenuto */}
      <div style={{ background: `${MUTED}33`, borderRadius: 16, padding: 20, border: `1px solid ${GOLD}22` }}>
        <div style={{ fontSize: 13, color: GOLD, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 14 }}>+ Aggiungi contenuto</div>

        {/* Category selector */}
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 12 }}>
          {CATEGORIES.map(c => (
            <button key={c.key} onClick={() => setForm(f => ({ ...f, category: c.key }))} style={{ padding: "6px 12px", borderRadius: 20, background: form.category === c.key ? `linear-gradient(135deg, ${BURGUNDY}, #9B2335)` : `${MUTED}55`, border: `1px solid ${form.category === c.key ? BURGUNDY : GOLD + "22"}`, color: CREAM, fontSize: 12, cursor: "pointer", fontFamily: "Georgia, serif" }}>{c.label}</button>
          ))}
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Titolo (es. 'Intervista a Gaja sul Barbaresco')" style={inputStyle} />
          <input value={form.source} onChange={e => setForm(f => ({ ...f, source: e.target.value }))} placeholder="Fonte (es. 'Angelo Gaja', 'Gambero Rosso', 'Federico')" style={inputStyle} />
          <textarea value={form.content} onChange={e => setForm(f => ({ ...f, content: e.target.value }))} placeholder="Incolla qui il testo dell'intervista, nota di degustazione, o articolo..." rows={8} style={{ ...inputStyle, resize: "vertical", lineHeight: 1.6 }} />
          <button onClick={saveItem} disabled={saving || !form.title || !form.content} style={{ padding: "12px", background: saved ? `#2A7A2A` : `linear-gradient(135deg, ${GOLD}, #8B6914)`, border: "none", borderRadius: 10, color: DARK, fontFamily: "'Cormorant Garamond', serif", fontSize: 15, fontWeight: 700, cursor: "pointer", transition: "all 0.3s" }}>
            {saving ? "Salvataggio..." : saved ? "✓ Salvato!" : "Salva nel database →"}
          </button>
        </div>
      </div>

      {/* Lista contenuti */}
      <div>
        <div style={{ fontSize: 12, color: GOLD, letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: 10 }}>Contenuti salvati</div>
        {loading && <div style={{ color: CREAM + "44", fontSize: 13 }}>Caricamento...</div>}
        {items.length === 0 && !loading && (
          <div style={{ padding: 20, textAlign: "center", color: CREAM + "44", fontSize: 13, background: `${MUTED}22`, borderRadius: 12 }}>
            Nessun contenuto ancora. Inizia aggiungendo la tua prima intervista!
          </div>
        )}
        {items.map((item, i) => (
          <div key={i} style={{ padding: "12px 16px", background: `${MUTED}22`, borderRadius: 10, border: `1px solid ${GOLD}11`, marginBottom: 8, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 15, color: CREAM }}>{item.title}</div>
              <div style={{ fontSize: 11, color: GOLD + "88", marginTop: 2 }}>
                {CATEGORIES.find(c => c.key === item.category)?.label} · {item.source} · {new Date(item.created_at).toLocaleDateString("it")}
              </div>
            </div>
            <button onClick={() => deleteItem(item.id)} style={{ background: "none", border: "none", color: CREAM + "33", cursor: "pointer", fontSize: 16, padding: 4, flexShrink: 0 }}>✕</button>
          </div>
        ))}
      </div>
    </div>
  );
}
