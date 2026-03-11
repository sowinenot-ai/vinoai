import { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";

const BURGUNDY = "#6B1A2A";
const GOLD = "#C9A84C";
const CREAM = "#F5ECD7";
const DARK = "#0D0A08";
const MUTED = "#3A2D28";

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_KEY
);

export default function ExperiencesTab({ user }) {
  const [experiences, setExperiences] = useState([]);
  const [writing, setWriting] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    restaurant: "", city: "", wine_name: "", vintage: "",
    content: "", rating: 5, user_name: ""
  });

  const inputStyle = {
    background: `${MUTED}55`, border: `1px solid ${GOLD}33`, borderRadius: 8,
    padding: "10px 14px", color: CREAM, fontFamily: "Georgia, serif",
    fontSize: 13, outline: "none", width: "100%", boxSizing: "border-box"
  };

  useEffect(() => { loadExperiences(); }, []);

  async function loadExperiences() {
    setLoading(true);
    const { data } = await supabase
      .from("experiences")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50);
    setExperiences(data || []);
    setLoading(false);
  }

  async function saveExperience() {
    if (!form.content.trim()) return;
    setSaving(true);
    try {
      const record = {
        ...form,
        user_email: user?.email || "anonymous",
        user_name: form.user_name || user?.email?.split("@")[0] || "Anonimo",
      };
      await supabase.from("experiences").insert(record);

      // Salva anche nel knowledge base così l'AI impara
      await fetch("/api/knowledge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "save",
          title: `Esperienza: ${form.wine_name || "vino"} @ ${form.restaurant || "ristorante"}`,
          content: `Utente: ${form.user_name || "Anonimo"}\nRistorante: ${form.restaurant}${form.city ? `, ${form.city}` : ""}\nVino: ${form.wine_name}${form.vintage ? ` ${form.vintage}` : ""}\nValutazione: ${form.rating}/10\n\n${form.content}`,
          category: "esperienza",
          source: `Community — ${form.user_name || "Anonimo"}`,
        }),
      });

      setForm({ restaurant: "", city: "", wine_name: "", vintage: "", content: "", rating: 5, user_name: "" });
      setWriting(false);
      loadExperiences();
    } catch (e) {
      alert("Errore nel salvataggio: " + e.message);
    }
    setSaving(false);
  }

  const stars = (rating) => "⭐".repeat(Math.round(rating / 2));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 26, fontWeight: 600, margin: 0, color: CREAM }}>📖 Esperienze della Community</h2>
          <p style={{ margin: "6px 0 0", fontSize: 13, color: CREAM + "66" }}>Condividi le tue scoperte — l'AI impara da ogni esperienza</p>
        </div>
        {!writing && (
          <button onClick={() => setWriting(true)}
            style={{ padding: "10px 20px", borderRadius: 20, background: `linear-gradient(135deg, ${BURGUNDY}, #9B2335)`, border: "none", color: CREAM, fontFamily: "'Cormorant Garamond', serif", fontSize: 14, cursor: "pointer", whiteSpace: "nowrap" }}>
            + Scrivi
          </button>
        )}
      </div>

      {writing && (
        <div style={{ background: `${MUTED}33`, borderRadius: 16, padding: 20, border: `1px solid ${GOLD}44` }}>
          <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 18, color: GOLD, marginBottom: 16 }}>✍️ La tua esperienza</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <input value={form.user_name} onChange={e => setForm({...form, user_name: e.target.value})}
              placeholder="Il tuo nome (opzionale)" style={inputStyle} />
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <input value={form.restaurant} onChange={e => setForm({...form, restaurant: e.target.value})}
                placeholder="Ristorante" style={inputStyle} />
              <input value={form.city} onChange={e => setForm({...form, city: e.target.value})}
                placeholder="Città" style={inputStyle} />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <input value={form.wine_name} onChange={e => setForm({...form, wine_name: e.target.value})}
                placeholder="Nome del vino" style={inputStyle} />
              <input value={form.vintage} onChange={e => setForm({...form, vintage: e.target.value})}
                placeholder="Annata" style={inputStyle} />
            </div>
            <textarea value={form.content} onChange={e => setForm({...form, content: e.target.value})}
              placeholder="Racconta la tua esperienza — il vino, il posto, le sensazioni, i piatti abbinati..." rows={5}
              style={{ ...inputStyle, resize: "vertical", lineHeight: 1.6 }} />
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <span style={{ color: CREAM + "88", fontSize: 13 }}>Voto:</span>
              {[2,4,6,8,10].map(v => (
                <button key={v} onClick={() => setForm({...form, rating: v})}
                  style={{ background: form.rating >= v ? GOLD : `${MUTED}55`, border: "none", borderRadius: 4, padding: "4px 8px", cursor: "pointer", fontSize: 16 }}>
                  ⭐
                </button>
              ))}
              <span style={{ color: GOLD, fontSize: 13 }}>{form.rating}/10</span>
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={saveExperience} disabled={saving || !form.content.trim()}
                style={{ flex: 1, padding: "12px", background: `linear-gradient(135deg, ${BURGUNDY}, #9B2335)`, border: "none", borderRadius: 10, color: CREAM, fontFamily: "'Cormorant Garamond', serif", fontSize: 15, cursor: "pointer" }}>
                {saving ? "Salvando..." : "Pubblica esperienza 🍷"}
              </button>
              <button onClick={() => setWriting(false)}
                style={{ padding: "12px 20px", background: `${MUTED}55`, border: `1px solid ${GOLD}22`, borderRadius: 10, color: CREAM + "88", fontSize: 14, cursor: "pointer" }}>
                Annulla
              </button>
            </div>
          </div>
        </div>
      )}

      {loading && <div style={{ textAlign: "center", color: GOLD, padding: 20 }}>Caricamento...</div>}

      {experiences.map(exp => (
        <div key={exp.id} style={{ background: `${MUTED}22`, borderRadius: 16, padding: 20, border: `1px solid ${GOLD}22` }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
            <div>
              {exp.wine_name && <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 18, color: GOLD, fontWeight: 600 }}>🍷 {exp.wine_name}{exp.vintage ? ` ${exp.vintage}` : ""}</div>}
              {exp.restaurant && <div style={{ fontSize: 13, color: CREAM + "88", marginTop: 2 }}>📍 {exp.restaurant}{exp.city ? `, ${exp.city}` : ""}</div>}
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 14 }}>{stars(exp.rating)}</div>
              <div style={{ fontSize: 11, color: CREAM + "55", marginTop: 2 }}>{exp.user_name || "Anonimo"}</div>
            </div>
          </div>
          <div style={{ fontSize: 14, color: CREAM + "CC", lineHeight: 1.75, fontFamily: "Georgia, serif" }}>{exp.content}</div>
          <div style={{ fontSize: 11, color: CREAM + "44", marginTop: 10 }}>
            {new Date(exp.created_at).toLocaleDateString("it-IT", { day: "numeric", month: "long", year: "numeric" })}
          </div>
        </div>
      ))}

      {!loading && experiences.length === 0 && (
        <div style={{ textAlign: "center", padding: "40px 20px", color: CREAM + "55" }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>📖</div>
          <div>Nessuna esperienza ancora — sii il primo a condividere!</div>
        </div>
      )}
    </div>
  );
}
