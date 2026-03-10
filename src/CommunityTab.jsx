import { useState } from "react";

const BURGUNDY = "#6B1A2A";
const GOLD = "#C9A84C";
const CREAM = "#F5ECD7";
const DARK = "#0D0A08";
const MUTED = "#3A2D28";

async function callCommunity(action, data) {
  const res = await fetch("/api/community", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action, data }),
  });
  return res.json();
}

export default function CommunityTab({ askClaude }) {
  const [view, setView] = useState("home"); // home | search | restaurant | add_visit | top
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(false);
  const [userName, setUserName] = useState(localStorage.getItem("vinoai_name") || "");
  const [nameSet, setNameSet] = useState(!!localStorage.getItem("vinoai_name"));

  // Visita form
  const [visitForm, setVisitForm] = useState({ restaurant_name: "", city: "", food_ordered: "", wine_ordered: "", experience: "" });
  const [visitSaved, setVisitSaved] = useState(false);

  // AI chat nel ristorante
  const [aiInput, setAiInput] = useState("");
  const [aiResult, setAiResult] = useState("");
  const [aiLoading, setAiLoading] = useState(false);

  const inputStyle = { background: `${MUTED}55`, border: `1px solid ${GOLD}33`, borderRadius: 8, padding: "10px 14px", color: CREAM, fontFamily: "Georgia, serif", fontSize: 14, outline: "none", width: "100%", boxSizing: "border-box" };

  function saveName() {
    if (!userName.trim()) return;
    localStorage.setItem("vinoai_name", userName.trim());
    setNameSet(true);
  }

  async function searchRestaurants() {
    if (!query.trim()) return;
    setLoading(true);
    const res = await callCommunity("search_restaurants", { query });
    setResults(res.restaurants || []);
    setView("search");
    setLoading(false);
  }

  async function openRestaurant(name) {
    setLoading(true);
    const res = await callCommunity("get_restaurant", { restaurant_name: name });
    setSelected(res.restaurant);
    setView("restaurant");
    setLoading(false);
  }

  async function saveVisit() {
    if (!visitForm.restaurant_name || !visitForm.experience) return;
    setLoading(true);
    await callCommunity("save_visit", { ...visitForm, user_name: userName });
    setVisitSaved(true);
    setLoading(false);
  }

  async function loadTop() {
    setLoading(true);
    const res = await callCommunity("top_restaurants", {});
    setResults(res.restaurants || []);
    setView("top");
    setLoading(false);
  }

  async function askAI() {
    if (!aiInput.trim() || aiLoading) return;
    setAiLoading(true);
    const context = selected
      ? `Sono al ristorante "${selected.name}" a ${selected.city || ""}. ${selected.gems?.length > 0 ? `Gemme già trovate: ${selected.gems.map(g => g.wine_name).join(", ")}.` : ""} `
      : "";
    const reply = await askClaude([{ role: "user", content: context + aiInput }]);
    setAiResult(reply);
    setAiLoading(false);
  }

  if (!nameSet) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        <div>
          <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 24, fontWeight: 600, margin: "0 0 6px", color: CREAM }}>🌍 Community</h2>
          <p style={{ margin: 0, fontSize: 13, color: CREAM + "66", fontStyle: "italic" }}>Prima di tutto, come ti chiami?</p>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <input value={userName} onChange={e => setUserName(e.target.value)} onKeyDown={e => e.key === "Enter" && saveName()} placeholder="Il tuo nome o nickname..." style={{ ...inputStyle, flex: 1 }} />
          <button onClick={saveName} style={{ padding: "10px 20px", borderRadius: 8, background: `linear-gradient(135deg, ${BURGUNDY}, #9B2335)`, border: "none", color: CREAM, fontFamily: "'Cormorant Garamond', serif", fontSize: 15, cursor: "pointer" }}>Entra →</button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 24, fontWeight: 600, margin: 0, color: CREAM }}>🌍 Community</h2>
          <p style={{ margin: "2px 0 0", fontSize: 12, color: GOLD + "88" }}>Ciao {userName} — condividi le tue gemme</p>
        </div>
        {view !== "home" && (
          <button onClick={() => { setView("home"); setResults([]); setSelected(null); setVisitSaved(false); setAiResult(""); }} style={{ padding: "6px 14px", borderRadius: 20, background: "transparent", border: `1px solid ${GOLD}44`, color: GOLD, fontSize: 12, cursor: "pointer", fontFamily: "Georgia, serif" }}>← Indietro</button>
        )}
      </div>

      {/* HOME */}
      {view === "home" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>

          {/* Cerca ristorante */}
          <div style={{ display: "flex", gap: 10 }}>
            <input value={query} onChange={e => setQuery(e.target.value)} onKeyDown={e => e.key === "Enter" && searchRestaurants()} placeholder="Cerca un ristorante..." style={{ ...inputStyle, flex: 1 }} />
            <button onClick={searchRestaurants} disabled={loading} style={{ padding: "10px 18px", borderRadius: 8, background: `linear-gradient(135deg, ${BURGUNDY}, #9B2335)`, border: "none", color: CREAM, fontFamily: "'Cormorant Garamond', serif", fontSize: 14, cursor: "pointer" }}>Cerca</button>
          </div>

          {/* Azioni rapide */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 4 }}>
            {[
              { icon: "🍽️", label: "Sono al ristorante", desc: "Racconta la tua visita", action: () => setView("add_visit") },
              { icon: "💎", label: "Top gemme", desc: "I migliori ristoranti", action: loadTop },
            ].map((item, i) => (
              <button key={i} onClick={item.action} style={{ padding: "16px", borderRadius: 12, background: `${MUTED}44`, border: `1px solid ${GOLD}22`, color: CREAM, cursor: "pointer", textAlign: "left", transition: "all 0.2s" }}>
                <div style={{ fontSize: 24, marginBottom: 6 }}>{item.icon}</div>
                <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 15, fontWeight: 600 }}>{item.label}</div>
                <div style={{ fontSize: 11, color: CREAM + "66", marginTop: 3 }}>{item.desc}</div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* SEARCH RESULTS */}
      {view === "search" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <p style={{ margin: 0, fontSize: 13, color: CREAM + "66" }}>{results.length} ristoranti trovati per "{query}"</p>
          {results.length === 0 && (
            <div style={{ padding: 20, background: `${MUTED}33`, borderRadius: 12, border: `1px solid ${GOLD}22`, textAlign: "center" }}>
              <div style={{ fontSize: 24, marginBottom: 8 }}>🍽️</div>
              <p style={{ margin: 0, color: CREAM + "88", fontSize: 13 }}>Nessun ristorante trovato.<br />Sii il primo ad aggiungerlo!</p>
              <button onClick={() => { setVisitForm(f => ({ ...f, restaurant_name: query })); setView("add_visit"); }} style={{ marginTop: 12, padding: "8px 18px", borderRadius: 20, background: `linear-gradient(135deg, ${BURGUNDY}, #9B2335)`, border: "none", color: CREAM, fontFamily: "'Cormorant Garamond', serif", fontSize: 13, cursor: "pointer" }}>Aggiungi tu →</button>
            </div>
          )}
          {results.map((r, i) => (
            <button key={i} onClick={() => openRestaurant(r.name)} style={{ padding: "14px 16px", borderRadius: 12, background: `${MUTED}33`, border: `1px solid ${GOLD}22`, color: CREAM, cursor: "pointer", textAlign: "left", transition: "all 0.2s" }}>
              <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 16, fontWeight: 600 }}>{r.name}</div>
              <div style={{ fontSize: 12, color: GOLD + "88", marginTop: 3 }}>{r.city}</div>
              <div style={{ display: "flex", gap: 12, marginTop: 8 }}>
                <span style={{ fontSize: 12, color: GOLD }}>💎 {r.gems?.length || 0} gemme</span>
                <span style={{ fontSize: 12, color: CREAM + "66" }}>🍽️ {r.visits?.length || 0} visite</span>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* RESTAURANT DETAIL */}
      {view === "restaurant" && selected && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ padding: "16px", background: `${MUTED}44`, borderRadius: 12, border: `1px solid ${GOLD}33` }}>
            <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 22, fontWeight: 600, color: CREAM }}>{selected.name}</div>
            <div style={{ fontSize: 12, color: GOLD + "88", marginTop: 2 }}>{selected.city}</div>
            <div style={{ display: "flex", gap: 16, marginTop: 10 }}>
              <span style={{ fontSize: 13, color: GOLD }}>💎 {selected.gems?.length || 0} gemme</span>
              <span style={{ fontSize: 13, color: CREAM + "66" }}>🍽️ {selected.visits?.length || 0} visite</span>
            </div>
          </div>

          {/* Gemme */}
          {selected.gems?.length > 0 && (
            <div>
              <div style={{ fontSize: 12, color: GOLD, letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: 8 }}>💎 Gemme Nascoste</div>
              {selected.gems.sort((a, b) => b.gem_score - a.gem_score).map((g, i) => (
                <div key={i} style={{ padding: "12px 14px", background: `${MUTED}33`, borderRadius: 10, border: `1px solid ${GOLD}22`, marginBottom: 8 }}>
                  <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 15, fontWeight: 600, color: CREAM }}>{g.wine_name} {g.vintage}</div>
                  <div style={{ display: "flex", gap: 10, marginTop: 6 }}>
                    <span style={{ fontSize: 12, color: GOLD }}>💎 {g.gem_score}/100</span>
                    <span style={{ fontSize: 12, color: CREAM + "66" }}>{g.classification}</span>
                    {g.restaurant_price && <span style={{ fontSize: 12, color: CREAM + "66" }}>€{g.restaurant_price}</span>}
                  </div>
                  <div style={{ fontSize: 11, color: CREAM + "44", marginTop: 4 }}>— {g.user_name}</div>
                </div>
              ))}
            </div>
          )}

          {/* Esperienze */}
          {selected.visits?.length > 0 && (
            <div>
              <div style={{ fontSize: 12, color: GOLD, letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: 8 }}>🍽️ Esperienze</div>
              {selected.visits.slice(0, 5).map((v, i) => (
                <div key={i} style={{ padding: "12px 14px", background: `${MUTED}22`, borderRadius: 10, border: `1px solid ${GOLD}11`, marginBottom: 8, borderLeft: `2px solid ${GOLD}44` }}>
                  <div style={{ fontSize: 13, color: "#E8D9BF", lineHeight: 1.6, fontStyle: "italic" }}>"{v.experience}"</div>
                  {v.food_ordered && <div style={{ fontSize: 11, color: CREAM + "55", marginTop: 4 }}>Piatto: {v.food_ordered}</div>}
                  <div style={{ fontSize: 11, color: CREAM + "44", marginTop: 2 }}>— {v.user_name}</div>
                </div>
              ))}
            </div>
          )}

          {/* Chiedi all'AI */}
          <div style={{ background: `${MUTED}33`, borderRadius: 12, padding: 16, border: `1px solid ${GOLD}22` }}>
            <div style={{ fontSize: 12, color: GOLD, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 10 }}>🍷 Chiedi al Sommelier</div>
            <div style={{ display: "flex", gap: 8 }}>
              <input value={aiInput} onChange={e => setAiInput(e.target.value)} onKeyDown={e => e.key === "Enter" && askAI()} placeholder={`Sono da ${selected.name}, mangio... ci sono gemme?`} style={{ ...inputStyle, flex: 1, fontSize: 13 }} />
              <button onClick={askAI} disabled={aiLoading} style={{ padding: "10px 16px", borderRadius: 8, background: `linear-gradient(135deg, ${BURGUNDY}, #9B2335)`, border: "none", color: CREAM, fontFamily: "'Cormorant Garamond', serif", fontSize: 14, cursor: "pointer", whiteSpace: "nowrap" }}>{aiLoading ? "..." : "Chiedi"}</button>
            </div>
            {aiResult && <div style={{ marginTop: 12, fontSize: 13, color: "#E8D9BF", lineHeight: 1.7, whiteSpace: "pre-wrap", borderTop: `1px solid ${GOLD}22`, paddingTop: 12 }}>{aiResult}</div>}
          </div>

          <button onClick={() => { setVisitForm(f => ({ ...f, restaurant_name: selected.name, city: selected.city || "" })); setView("add_visit"); }} style={{ width: "100%", padding: "12px", background: `linear-gradient(135deg, ${BURGUNDY}88, #9B233566)`, border: `1px solid ${BURGUNDY}`, borderRadius: 12, color: CREAM, fontFamily: "'Cormorant Garamond', serif", fontSize: 14, cursor: "pointer" }}>
            + Aggiungi la tua visita
          </button>
        </div>
      )}

      {/* ADD VISIT */}
      {view === "add_visit" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div>
            <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 18, fontWeight: 600, color: CREAM, marginBottom: 4 }}>🍽️ Racconta la tua visita</div>
            <p style={{ margin: 0, fontSize: 12, color: CREAM + "66" }}>Le tue esperienze aiutano altri appassionati</p>
          </div>
          {visitSaved ? (
            <div style={{ padding: 20, background: `${MUTED}44`, borderRadius: 12, border: `1px solid ${GOLD}44`, textAlign: "center" }}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>🎉</div>
              <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 18, color: CREAM }}>Visita salvata!</div>
              <p style={{ margin: "8px 0 0", fontSize: 13, color: CREAM + "66" }}>Grazie per aver contribuito alla community</p>
            </div>
          ) : (
            <>
              <input value={visitForm.restaurant_name} onChange={e => setVisitForm(f => ({ ...f, restaurant_name: e.target.value }))} placeholder="Nome ristorante *" style={inputStyle} />
              <input value={visitForm.city} onChange={e => setVisitForm(f => ({ ...f, city: e.target.value }))} placeholder="Città" style={inputStyle} />
              <input value={visitForm.food_ordered} onChange={e => setVisitForm(f => ({ ...f, food_ordered: e.target.value }))} placeholder="Cosa hai mangiato?" style={inputStyle} />
              <input value={visitForm.wine_ordered} onChange={e => setVisitForm(f => ({ ...f, wine_ordered: e.target.value }))} placeholder="Quale vino hai ordinato?" style={inputStyle} />
              <textarea value={visitForm.experience} onChange={e => setVisitForm(f => ({ ...f, experience: e.target.value }))} placeholder="Racconta la tua esperienza con il vino... *" rows={3} style={{ ...inputStyle, resize: "none", lineHeight: 1.5 }} />
              <button onClick={saveVisit} disabled={loading || !visitForm.restaurant_name || !visitForm.experience} style={{ width: "100%", padding: "13px", background: `linear-gradient(135deg, ${BURGUNDY}, #9B2335)`, border: "none", borderRadius: 12, color: CREAM, fontFamily: "'Cormorant Garamond', serif", fontSize: 15, cursor: "pointer", opacity: loading ? 0.6 : 1 }}>
                {loading ? "Salvataggio..." : "Salva visita →"}
              </button>
            </>
          )}
        </div>
      )}

      {/* TOP RESTAURANTS */}
      {view === "top" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <p style={{ margin: 0, fontSize: 13, color: CREAM + "66" }}>Ristoranti con le gemme migliori</p>
          {results.length === 0 && (
            <div style={{ padding: 20, textAlign: "center", color: CREAM + "66", fontSize: 13 }}>
              Ancora nessuna gemma salvata dalla community.
            </div>
          )}
          {results.map((r, i) => (
            <button key={i} onClick={() => openRestaurant(r.name)} style={{ padding: "14px 16px", borderRadius: 12, background: `${MUTED}33`, border: `1px solid ${GOLD}22`, color: CREAM, cursor: "pointer", textAlign: "left", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 14, color: GOLD, fontFamily: "'Cormorant Garamond', serif", fontWeight: 600 }}>#{i + 1}</span>
                  <span style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 16, fontWeight: 600 }}>{r.name}</span>
                </div>
                <div style={{ fontSize: 12, color: CREAM + "66", marginTop: 2 }}>{r.city} · {r.gem_count} gemme</div>
              </div>
              <div style={{ padding: "6px 12px", borderRadius: 20, background: `${BURGUNDY}44`, border: `1px solid ${BURGUNDY}88`, fontSize: 13, color: GOLD, fontFamily: "'Cormorant Garamond', serif" }}>
                💎 {r.avg_score}
              </div>
            </button>
          ))}
        </div>
      )}

    </div>
  );
}
