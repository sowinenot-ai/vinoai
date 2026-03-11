import { useState, useEffect } from "react";

const BURGUNDY = "#6B1A2A";
const GOLD = "#C9A84C";
const CREAM = "#F5ECD7";
const DARK = "#0D0A08";
const MUTED = "#3A2D28";
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || "https://qnawdmghgwgvhzqzarrw.supabase.co";
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_KEY;

const COLOR_CONFIG = {
  rosso:     { emoji: "🔴", label: "Rossi",     bg: "#8B1A2F22", border: "#8B1A2F44" },
  bianco:    { emoji: "🟡", label: "Bianchi",   bg: "#C9A84C22", border: "#C9A84C44" },
  rosé:      { emoji: "🌸", label: "Rosé",      bg: "#E8829022", border: "#E8829044" },
  bollicine: { emoji: "🥂", label: "Bollicine", bg: "#88BBDD22", border: "#88BBDD44" },
  dolce:     { emoji: "🍯", label: "Dolci",     bg: "#DAA52022", border: "#DAA52044" },
  altro:     { emoji: "🍾", label: "Altro",     bg: "#88888822", border: "#88888844" },
};

const inp = {
  background: `${MUTED}55`, border: `1px solid ${GOLD}33`, borderRadius: 8,
  padding: "10px 14px", color: CREAM, fontFamily: "Georgia, serif",
  fontSize: 13, outline: "none", width: "100%", boxSizing: "border-box"
};

async function askClaude(prompt) {
  const res = await fetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ messages: [{ role: "user", content: prompt }], jsonMode: true }),
  });
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let text = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    text += decoder.decode(value);
  }
  try {
    const clean = text.replace(/```json|```/g, "").trim();
    return JSON.parse(clean);
  } catch { return null; }
}

export default function CantinTab({ user }) {
  const [wines, setWines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [quickInput, setQuickInput] = useState("");
  const [analyzing, setAnalyzing] = useState(false);
  const [notification, setNotification] = useState(null);
  const [notifLoading, setNotifLoading] = useState(false);
  const [selectedWine, setSelectedWine] = useState(null);
  const [pairingInput, setPairingInput] = useState("");
  const [pairingResult, setPairingResult] = useState("");
  const [pairingLoading, setPairingLoading] = useState(false);
  const [activeSection, setActiveSection] = useState("all");
  const [editWine, setEditWine] = useState(null);

  useEffect(() => { if (user?.email) loadWines(); }, [user?.email]);

  async function loadWines() {
    setLoading(true);
    const res = await fetch(`${SUPABASE_URL}/rest/v1/cellar?user_email=eq.${encodeURIComponent(user.email)}&order=color.asc,name.asc`, {
      headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` }
    });
    const data = await res.json();
    setWines(Array.isArray(data) ? data : []);
    setLoading(false);
  }

  async function addWineFromText() {
    if (!quickInput.trim()) return;
    setAnalyzing(true);
    const data = await askClaude(`Analizza questo vino e restituisci SOLO un JSON con questi campi esatti:
{
  "name": "nome commerciale del vino",
  "producer": "produttore/cantina",
  "year": anno come numero o null,
  "region": "regione es. Barolo, Chianti, Champagne",
  "country": "paese es. Italia, Francia",
  "color": "rosso" o "bianco" o "rosé" o "bollicine" o "dolce" o "altro",
  "grapes": "uvaggio es. Nebbiolo, o Chardonnay, o Sangiovese/Merlot",
  "drink_from": anno consigliato da cui bere come numero,
  "drink_until": anno entro cui bere come numero,
  "ai_score": punteggio potenziale 0-100,
  "notes": "una riga con caratteristiche principali"
}
Vino: "${quickInput}"
Rispondi SOLO con il JSON, niente altro.`);

    if (data) {
      await saveWine({ ...data, qty: 1 });
      setQuickInput("");
    } else {
      alert("Non ho capito il vino, scrivi in modo più chiaro (es. 'Barolo Brunate 2018 Ceretto')");
    }
    setAnalyzing(false);
  }

  async function saveWine(wine) {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/cellar`, {
      method: "POST",
      headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`, "Content-Type": "application/json", Prefer: "return=representation" },
      body: JSON.stringify({ ...wine, user_email: user.email })
    });
    const saved = await res.json();
    if (saved?.[0]) setWines(w => [...w, saved[0]]);
  }

  async function updateQty(id, delta) {
    const wine = wines.find(w => w.id === id);
    if (!wine) return;
    const newQty = Math.max(0, wine.qty + delta);
    if (newQty === 0) {
      if (!confirm("Rimuovere questo vino dalla cantina?")) return;
      await fetch(`${SUPABASE_URL}/rest/v1/cellar?id=eq.${id}`, {
        method: "DELETE", headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` }
      });
      setWines(w => w.filter(x => x.id !== id));
    } else {
      await fetch(`${SUPABASE_URL}/rest/v1/cellar?id=eq.${id}`, {
        method: "PATCH", headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({ qty: newQty })
      });
      setWines(w => w.map(x => x.id === id ? { ...x, qty: newQty } : x));
    }
  }

  async function getSmartNotification() {
    if (wines.length === 0) return;
    setNotifLoading(true);
    setNotification(null);

    // Ottieni meteo e fase lunare
    let meteo = "temperatura mite";
    let ora = new Date().getHours();
    let fasciaOraria = ora < 12 ? "mattina" : ora < 17 ? "pomeriggio" : ora < 21 ? "sera" : "notte";

    const wineList = wines.slice(0, 10).map(w =>
      `${w.name} ${w.year || ""} (${w.color}, ${w.region || ""}, finestra ${w.drink_from || "?"}-${w.drink_until || "?"}, score ${w.ai_score || "?"})`
    ).join("; ");

    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        messages: [{
          role: "user",
          content: `Sei un sommelier esperto. È ${fasciaOraria}, la luna è in fase ${getLunarPhase()}. 
Cantina disponibile: ${wineList}.
Suggerisci UN solo vino da aprire STASERA con motivazione breve e poetica (max 3 righe).
Considera: ora del giorno, fase lunare, finestra di consumo ideale.
Rispondi in italiano, tono elegante, niente markdown.`
        }]
      })
    });
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let text = "";
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      text += decoder.decode(value);
    }
    setNotification(text);
    setNotifLoading(false);
  }

  function getLunarPhase() {
    const phases = ["nuova", "crescente", "piena", "calante"];
    const day = new Date().getDate();
    return phases[Math.floor(day / 8) % 4];
  }

  async function getPairing() {
    if (!pairingInput.trim() || wines.length === 0) return;
    setPairingLoading(true);
    setPairingResult("");

    const wineList = wines.map(w =>
      `${w.name} ${w.year || ""} - ${w.color}, ${w.grapes || ""}, ${w.region || ""} (${w.qty} bott.)`
    ).join("\n");

    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        messages: [{
          role: "user",
          content: `Sei il sommelier di un ristorante 3 stelle Michelin. 
La cantina disponibile è:
${wineList}

Il cliente sta mangiando: "${pairingInput}"

Scegli il vino PERFETTO da questa cantina (solo uno, quello già disponibile) e spiega il pairing in modo che un sommelier stellato sarebbe fiero.
Includi: quale vino scegli, perché, temperatura di servizio, come valorizza il piatto.
Tono: professionale ma appassionato. Niente markdown.`
        }]
      })
    });
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let text = "";
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      text += decoder.decode(value);
      setPairingResult(text);
    }
    setPairingLoading(false);
  }

  // Raggruppa vini per colore
  const grouped = {};
  wines.forEach(w => {
    const key = w.color || "altro";
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(w);
  });

  const sections = Object.keys(COLOR_CONFIG).filter(k => k === "all" || grouped[k]?.length > 0);
  const displayWines = activeSection === "all" ? wines : (grouped[activeSection] || []);
  const totalBottles = wines.reduce((a, b) => a + (b.qty || 0), 0);

  if (loading) return (
    <div style={{ display: "flex", justifyContent: "center", padding: 40 }}>
      <span style={{ color: GOLD, fontSize: 14 }}>🍷 Caricamento cantina...</span>
    </div>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 26, fontWeight: 600, margin: 0, color: CREAM }}>🏺 La mia Cantina</h2>
          <p style={{ margin: "4px 0 0", fontSize: 12, color: GOLD + "88" }}>
            {totalBottles} bottigli{totalBottles === 1 ? "a" : "e"} · {wines.length} etichett{wines.length === 1 ? "a" : "e"}
          </p>
        </div>
        <button onClick={() => setAdding(a => !a)}
          style={{ padding: "9px 18px", borderRadius: 20, background: adding ? `${MUTED}88` : `linear-gradient(135deg, ${BURGUNDY}, #9B2335)`, border: "none", color: CREAM, fontSize: 13, cursor: "pointer" }}>
          {adding ? "✕ Chiudi" : "+ Aggiungi"}
        </button>
      </div>

      {/* Aggiungi vino — input rapido AI */}
      {adding && (
        <div style={{ background: `${MUTED}33`, borderRadius: 16, padding: 18, border: `1px solid ${GOLD}22` }}>
          <div style={{ fontSize: 12, color: GOLD, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 10 }}>
            ✨ Scrivi il nome del vino — l'AI completa tutto
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <input
              value={quickInput}
              onChange={e => setQuickInput(e.target.value)}
              onKeyDown={e => e.key === "Enter" && addWineFromText()}
              placeholder="Es. Barolo Brunate 2018 Ceretto, o Sassicaia 2019..."
              style={{ ...inp, flex: 1 }}
            />
            <button onClick={addWineFromText} disabled={analyzing || !quickInput.trim()}
              style={{ padding: "10px 18px", borderRadius: 8, background: analyzing ? `${MUTED}88` : `linear-gradient(135deg, ${GOLD}, #8B6914)`, border: "none", color: DARK, fontWeight: 700, cursor: analyzing ? "not-allowed" : "pointer", fontSize: 13, whiteSpace: "nowrap" }}>
              {analyzing ? "⏳ AI..." : "→ Aggiungi"}
            </button>
          </div>
          <div style={{ fontSize: 11, color: CREAM + "44", marginTop: 8 }}>
            L'AI riconoscerà colore, uvaggio, regione, paese e finestra di consumo automaticamente
          </div>
        </div>
      )}

      {/* Notifica smart */}
      <div style={{ background: `${MUTED}22`, borderRadius: 14, padding: 16, border: `1px solid ${GOLD}22` }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: notification ? 12 : 0 }}>
          <div style={{ fontSize: 13, color: CREAM + "88" }}>🌙 Cosa aprire stasera?</div>
          <button onClick={getSmartNotification} disabled={notifLoading || wines.length === 0}
            style={{ padding: "7px 16px", borderRadius: 20, background: notifLoading ? `${MUTED}88` : `linear-gradient(135deg, ${BURGUNDY}88, #9B233566)`, border: `1px solid ${GOLD}33`, color: GOLD, fontSize: 12, cursor: notifLoading || wines.length === 0 ? "not-allowed" : "pointer" }}>
            {notifLoading ? "⏳ Analizzo..." : "✦ Chiedi al sommelier"}
          </button>
        </div>
        {notification && (
          <div style={{ fontSize: 13, color: CREAM, lineHeight: 1.8, fontFamily: "Georgia, serif", fontStyle: "italic", borderTop: `1px solid ${GOLD}22`, paddingTop: 12 }}>
            {notification}
          </div>
        )}
      </div>

      {/* Pairing Michelin */}
      <div style={{ background: `${MUTED}22`, borderRadius: 14, padding: 16, border: `1px solid ${GOLD}22` }}>
        <div style={{ fontSize: 12, color: GOLD, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 10 }}>🍽️ Pairing Michelin — cosa stai mangiando?</div>
        <div style={{ display: "flex", gap: 10 }}>
          <input
            value={pairingInput}
            onChange={e => setPairingInput(e.target.value)}
            onKeyDown={e => e.key === "Enter" && getPairing()}
            placeholder="Es. risotto al tartufo, filetto di manzo, branzino al sale..."
            style={{ ...inp, flex: 1 }}
          />
          <button onClick={getPairing} disabled={pairingLoading || !pairingInput.trim() || wines.length === 0}
            style={{ padding: "10px 16px", borderRadius: 8, background: pairingLoading ? `${MUTED}88` : `linear-gradient(135deg, ${BURGUNDY}, #9B2335)`, border: "none", color: CREAM, fontSize: 13, cursor: pairingLoading ? "not-allowed" : "pointer", whiteSpace: "nowrap" }}>
            {pairingLoading ? "⏳" : "→"}
          </button>
        </div>
        {pairingResult && (
          <div style={{ marginTop: 14, fontSize: 13, color: CREAM, lineHeight: 1.9, fontFamily: "Georgia, serif", borderTop: `1px solid ${GOLD}22`, paddingTop: 12, whiteSpace: "pre-wrap" }}>
            {pairingResult}
          </div>
        )}
      </div>

      {/* Filtri per colore */}
      {wines.length > 0 && (
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button onClick={() => setActiveSection("all")}
            style={{ padding: "6px 14px", borderRadius: 20, background: activeSection === "all" ? `linear-gradient(135deg, ${BURGUNDY}, #9B2335)` : `${MUTED}55`, border: "none", color: CREAM, fontSize: 12, cursor: "pointer" }}>
            Tutti ({wines.length})
          </button>
          {Object.entries(COLOR_CONFIG).filter(([k]) => grouped[k]?.length > 0).map(([key, cfg]) => (
            <button key={key} onClick={() => setActiveSection(key)}
              style={{ padding: "6px 14px", borderRadius: 20, background: activeSection === key ? cfg.bg : `${MUTED}33`, border: `1px solid ${activeSection === key ? cfg.border : GOLD + "22"}`, color: CREAM, fontSize: 12, cursor: "pointer" }}>
              {cfg.emoji} {cfg.label} ({grouped[key].length})
            </button>
          ))}
        </div>
      )}

      {/* Lista vini */}
      {wines.length === 0 ? (
        <div style={{ textAlign: "center", padding: "40px 20px", color: CREAM + "44" }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>🏺</div>
          <div style={{ fontSize: 14 }}>La cantina è vuota</div>
          <div style={{ fontSize: 12, marginTop: 6 }}>Aggiungi il tuo primo vino qui sopra</div>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {displayWines.map(wine => {
            const cfg = COLOR_CONFIG[wine.color] || COLOR_CONFIG.altro;
            const now = new Date().getFullYear();
            const isReady = wine.drink_from && now >= wine.drink_from;
            const isPast = wine.drink_until && now > wine.drink_until;
            return (
              <div key={wine.id} onClick={() => setSelectedWine(selectedWine?.id === wine.id ? null : wine)}
                style={{ background: cfg.bg, borderRadius: 14, padding: 14, border: `1px solid ${cfg.border}`, cursor: "pointer" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                      <span style={{ fontSize: 16 }}>{cfg.emoji}</span>
                      <span style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 17, fontWeight: 600, color: CREAM }}>
                        {wine.name} {wine.year ? `· ${wine.year}` : ""}
                      </span>
                      {wine.ai_score && (
                        <span style={{ fontSize: 11, color: GOLD, background: `${GOLD}22`, padding: "2px 8px", borderRadius: 20 }}>
                          ⭐ {wine.ai_score}/100
                        </span>
                      )}
                      {isPast && <span style={{ fontSize: 11, color: "#FF6B6B", background: "#FF6B6B22", padding: "2px 8px", borderRadius: 20 }}>⚠️ Scaduto</span>}
                      {isReady && !isPast && <span style={{ fontSize: 11, color: "#4CAF50", background: "#4CAF5022", padding: "2px 8px", borderRadius: 20 }}>✅ Pronto</span>}
                      {!isReady && wine.drink_from && <span style={{ fontSize: 11, color: CREAM + "55", background: `${MUTED}55`, padding: "2px 8px", borderRadius: 20 }}>⏳ Dal {wine.drink_from}</span>}
                    </div>
                    <div style={{ fontSize: 12, color: CREAM + "88", marginTop: 4 }}>
                      {wine.producer && `${wine.producer} · `}{wine.region && `${wine.region}`}{wine.country && ` · ${wine.country}`}
                    </div>
                    {wine.grapes && <div style={{ fontSize: 11, color: GOLD + "88", marginTop: 2 }}>🍇 {wine.grapes}</div>}
                  </div>
                  {/* Qty controls */}
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }} onClick={e => e.stopPropagation()}>
                    <button onClick={() => updateQty(wine.id, -1)}
                      style={{ width: 28, height: 28, borderRadius: "50%", background: `${MUTED}88`, border: `1px solid ${GOLD}33`, color: CREAM, cursor: "pointer", fontSize: 16, display: "flex", alignItems: "center", justifyContent: "center" }}>−</button>
                    <span style={{ color: CREAM, fontSize: 15, fontWeight: 700, minWidth: 20, textAlign: "center" }}>{wine.qty}</span>
                    <button onClick={() => updateQty(wine.id, +1)}
                      style={{ width: 28, height: 28, borderRadius: "50%", background: `${MUTED}88`, border: `1px solid ${GOLD}33`, color: CREAM, cursor: "pointer", fontSize: 16, display: "flex", alignItems: "center", justifyContent: "center" }}>+</button>
                  </div>
                </div>

                {/* Dettagli espansi */}
                {selectedWine?.id === wine.id && (
                  <div style={{ marginTop: 12, paddingTop: 12, borderTop: `1px solid ${cfg.border}` }}>
                    {wine.notes && <div style={{ fontSize: 13, color: CREAM + "99", lineHeight: 1.7, fontStyle: "italic", marginBottom: 8 }}>"{wine.notes}"</div>}
                    <div style={{ display: "flex", gap: 12, flexWrap: "wrap", fontSize: 12, color: CREAM + "66" }}>
                      {wine.drink_from && <span>📅 Bevi dal {wine.drink_from}</span>}
                      {wine.drink_until && <span>⏰ Entro il {wine.drink_until}</span>}
                    </div>
                    <button onClick={e => { e.stopPropagation(); setPairingInput(`${wine.name} ${wine.year || ""}`); setPairingResult(""); window.scrollTo(0, 0); }}
                      style={{ marginTop: 10, padding: "6px 14px", background: "transparent", border: `1px solid ${GOLD}33`, borderRadius: 20, color: GOLD + "88", fontSize: 12, cursor: "pointer" }}>
                      🍽️ Trova il piatto perfetto →
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
