import { useState, useEffect } from "react";

const BURGUNDY = "#6B1A2A";
const GOLD = "#C9A84C";
const CREAM = "#F5ECD7";
const DARK = "#0D0A08";
const MUTED = "#3A2D28";
const ADMIN_EMAIL = "lanzifederico09@gmail.com";

const EXPERIENCE_TYPES = [
  { key: "degustazione", label: "🍷 Degustazione", placeholder: "Dove hai degustato? Cosa hai assaggiato? Descrivi profumi, gusto, sensazioni..." },
  { key: "cantina", label: "🏰 Visita Cantina", placeholder: "Quale cantina hai visitato? Chi hai incontrato? Cosa ti ha colpito di più?" },
  { key: "ristorante", label: "🍽️ Cena al Ristorante", placeholder: "Dove hai cenato? Che vino hai scelto? Come era la carta? Il sommelier era bravo?" },
  { key: "scoperta", label: "💎 Scoperta", placeholder: "Hai trovato una perla nascosta? Un vino straordinario a prezzo onesto? Racconta tutto..." },
  { key: "viaggio", label: "✈️ Viaggio Enologico", placeholder: "Che zona hai visitato? Quali produttori? Cosa hai imparato su quel territorio?" },
  { key: "nota", label: "📝 Nota Personale", placeholder: "Un pensiero, un'osservazione, una riflessione sul mondo del vino..." },
];

async function callKnowledge(action, data) {
  const res = await fetch("/api/knowledge", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action, data }),
  });
  return res.json();
}

export default function DiaryTab({ user }) {
  const isAdmin = user?.email === ADMIN_EMAIL;
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [type, setType] = useState("degustazione");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [showForm, setShowForm] = useState(false);

  useEffect(() => { if (isAdmin) loadEntries(); }, []);

  async function loadEntries() {
    setLoading(true);
    const res = await callKnowledge("list", {});
    const mine = (res.items || []).filter(i => i.source === "Federico — Diario Personale");
    setEntries(mine);
    setLoading(false);
  }

  async function saveEntry() {
    if (!title || !content) return;
    setSaving(true);
    const selectedType = EXPERIENCE_TYPES.find(t => t.key === type);
    await callKnowledge("save", {
      title: `${selectedType.label} — ${title} (${date})`,
      content: content,
      category: type,
      source: "Federico — Diario Personale",
    });
    setTitle("");
    setContent("");
    setDate(new Date().toISOString().split("T")[0]);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
    setShowForm(false);
    await loadEntries();
    setSaving(false);
  }

  const inputStyle = {
    background: `${MUTED}55`, border: `1px solid ${GOLD}33`, borderRadius: 8,
    padding: "10px 14px", color: CREAM, fontFamily: "Georgia, serif",
    fontSize: 13, outline: "none", width: "100%", boxSizing: "border-box"
  };

  if (!isAdmin) {
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "60px 24px", textAlign: "center", gap: 16 }}>
        <div style={{ fontSize: 48 }}>📔</div>
        <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 22, color: CREAM }}>Il Diario di Federico</div>
        <div style={{ fontSize: 13, color: CREAM + "55", maxWidth: 300, lineHeight: 1.7 }}>Le esperienze personali del fondatore di SoWineNot — degustazioni, cantine, scoperte e riflessioni sul mondo del vino.</div>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 26, fontWeight: 600, margin: 0, color: CREAM }}>📔 Il Mio Diario</h2>
          <p style={{ margin: "4px 0 0", fontSize: 12, color: GOLD + "88" }}>{entries.length} esperienze salvate · Tutto ciò che scrivi diventa conoscenza dell'AI</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} style={{ padding: "10px 18px", borderRadius: 20, background: showForm ? "transparent" : `linear-gradient(135deg, ${BURGUNDY}, #9B2335)`, border: `1px solid ${showForm ? GOLD + "44" : BURGUNDY}`, color: showForm ? GOLD : CREAM, fontSize: 13, cursor: "pointer", fontFamily: "'Cormorant Garamond', serif" }}>
          {showForm ? "Annulla" : "+ Nuova Esperienza"}
        </button>
      </div>

      {/* Form */}
      {showForm && (
        <div style={{ background: `${MUTED}33`, borderRadius: 16, padding: 20, border: `1px solid ${GOLD}22`, animation: "fadeUp 0.3s ease" }}>
          {/* Type selector */}
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 16 }}>
            {EXPERIENCE_TYPES.map(t => (
              <button key={t.key} onClick={() => setType(t.key)} style={{ padding: "6px 12px", borderRadius: 20, background: type === t.key ? `linear-gradient(135deg, ${BURGUNDY}, #9B2335)` : `${MUTED}55`, border: `1px solid ${type === t.key ? BURGUNDY : GOLD + "22"}`, color: CREAM, fontSize: 12, cursor: "pointer", fontFamily: "Georgia, serif" }}>{t.label}</button>
            ))}
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={{ display: "flex", gap: 10 }}>
              <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Titolo breve (es. 'Barolo di Conterno', 'Cena da Cracco'...)" style={{ ...inputStyle, flex: 1 }} />
              <input type="date" value={date} onChange={e => setDate(e.target.value)} style={{ ...inputStyle, width: 150, flex: "none" }} />
            </div>
            <textarea
              value={content}
              onChange={e => setContent(e.target.value)}
              placeholder={EXPERIENCE_TYPES.find(t => t.key === type)?.placeholder}
              rows={8}
              style={{ ...inputStyle, resize: "vertical", lineHeight: 1.7 }}
            />
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ fontSize: 11, color: CREAM + "33" }}>
                {content.length > 0 && `${content.length} caratteri · L'AI userà questo testo per rispondere agli utenti`}
              </div>
              <button onClick={saveEntry} disabled={saving || !title || !content} style={{ padding: "12px 24px", background: saved ? "#2A7A2A" : `linear-gradient(135deg, ${GOLD}, #8B6914)`, border: "none", borderRadius: 10, color: DARK, fontFamily: "'Cormorant Garamond', serif", fontSize: 15, fontWeight: 700, cursor: "pointer" }}>
                {saving ? "Salvo..." : saved ? "✓ Salvato!" : "Salva nel database →"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Timeline entries */}
      {loading && <div style={{ color: CREAM + "44", fontSize: 13, textAlign: "center" }}>Caricamento...</div>}

      {entries.length === 0 && !loading && !showForm && (
        <div style={{ padding: 32, textAlign: "center", color: CREAM + "44", fontSize: 14, background: `${MUTED}22`, borderRadius: 16, border: `1px solid ${GOLD}11`, lineHeight: 1.8 }}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>📔</div>
          Il tuo diario è ancora vuoto.<br/>
          <span style={{ color: GOLD + "88" }}>Ogni esperienza che scrivi arricchisce l'AI.</span>
        </div>
      )}

      {entries.map((entry, i) => {
        const typeInfo = EXPERIENCE_TYPES.find(t => entry.category === t.key) || { label: "📝" };
        return (
          <div key={i} style={{ padding: "16px 20px", background: `${MUTED}22`, borderRadius: 14, border: `1px solid ${GOLD}11`, position: "relative" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
              <div>
                <span style={{ fontSize: 12, color: GOLD + "88", background: `${BURGUNDY}44`, padding: "2px 10px", borderRadius: 20, marginRight: 8 }}>{typeInfo.label}</span>
                <span style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 16, color: CREAM }}>{entry.title}</span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
