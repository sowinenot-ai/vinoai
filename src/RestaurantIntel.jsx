import { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";

const BURGUNDY = "#6B1A2A";
const GOLD = "#C9A84C";
const CREAM = "#F5ECD7";
const MUTED = "#3A2D28";

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_KEY
);

export default function RestaurantIntel({ city, onClose }) {
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState("");
  const [localExperiences, setLocalExperiences] = useState([]);
  const [localRestaurant, setLocalRestaurant] = useState(null);
  const [searched, setSearched] = useState(false);

  async function findRestaurant(name) {
    const restaurantName = name || search;
    if (!restaurantName.trim()) return;
    setLoading(true);
    setResult("");
    setLocalExperiences([]);
    setLocalRestaurant(null);
    setSearched(true);

    // 1. Cerca nel nostro DB locale
    const [expRes, mapRes] = await Promise.all([
      supabase.from("experiences")
        .select("*")
        .ilike("restaurant", `%${restaurantName}%`)
        .order("created_at", { ascending: false })
        .limit(5),
      supabase.from("map_restaurants")
        .select("*")
        .ilike("name", `%${restaurantName}%`)
        .limit(1)
    ]);
    setLocalExperiences(expRes.data || []);
    setLocalRestaurant(mapRes.data?.[0] || null);

    // 2. Cerca online con AI + web search
    try {
      const res = await fetch("/api/restaurant-intel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ restaurantName, city }),
      });
      const data = await res.json();
      setResult(data.result || data.error || "Nessuna informazione trovata");
    } catch (e) {
      setResult("Errore nella ricerca: " + e.message);
    }
    setLoading(false);
  }

  const stars = (r) => "⭐".repeat(Math.round((r || 5) / 2));

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", zIndex: 1000, display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
      <div style={{ background: "#1A0F0A", borderRadius: "20px 20px 0 0", width: "100%", maxWidth: 600, maxHeight: "90vh", overflowY: "auto", padding: 24, border: `1px solid ${GOLD}22` }}>
        
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <div>
            <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 22, color: CREAM, fontWeight: 600 }}>🔍 Intel Ristorante</div>
            {city && <div style={{ fontSize: 12, color: GOLD + "88", marginTop: 2 }}>📍 {city}</div>}
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", color: CREAM + "66", fontSize: 22, cursor: "pointer" }}>✕</button>
        </div>

        {/* Search box */}
        <div style={{ display: "flex", gap: 10, marginBottom: 20 }}>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            onKeyDown={e => e.key === "Enter" && findRestaurant()}
            placeholder="Nome del ristorante..."
            style={{ flex: 1, background: `${MUTED}55`, border: `1px solid ${GOLD}33`, borderRadius: 10, padding: "12px 16px", color: CREAM, fontFamily: "Georgia, serif", fontSize: 14, outline: "none" }}
          />
          <button onClick={() => findRestaurant()} disabled={loading || !search.trim()}
            style={{ padding: "12px 20px", background: `linear-gradient(135deg, ${BURGUNDY}, #9B2335)`, border: "none", borderRadius: 10, color: CREAM, fontFamily: "'Cormorant Garamond', serif", fontSize: 15, cursor: "pointer", whiteSpace: "nowrap" }}>
            {loading ? "⏳" : "Cerca →"}
          </button>
        </div>

        {loading && (
          <div style={{ textAlign: "center", padding: 30 }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>🔍</div>
            <div style={{ color: GOLD, fontFamily: "Georgia, serif", fontSize: 14 }}>Sto cercando la carta dei vini online...</div>
            <div style={{ color: CREAM + "55", fontSize: 12, marginTop: 6 }}>Controllo database, recensioni e sito del ristorante</div>
          </div>
        )}

        {/* Esperienze dal nostro DB */}
        {!loading && localExperiences.length > 0 && (
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 12, color: GOLD, letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: 12 }}>
              📖 Esperienze della community ({localExperiences.length})
            </div>
            {localExperiences.map(exp => (
              <div key={exp.id} style={{ background: `${MUTED}33`, borderRadius: 12, padding: 14, marginBottom: 8, border: `1px solid ${GOLD}22` }}>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <div style={{ color: GOLD, fontSize: 14, fontWeight: 600 }}>🍷 {exp.wine_name || "Vino"}</div>
                  <div style={{ fontSize: 12 }}>{stars(exp.rating)}</div>
                </div>
                <div style={{ color: CREAM + "99", fontSize: 13, marginTop: 6, lineHeight: 1.5 }}>{exp.content?.slice(0, 120)}...</div>
                <div style={{ color: CREAM + "44", fontSize: 11, marginTop: 4 }}>— {exp.user_name || "Anonimo"}</div>
              </div>
            ))}
          </div>
        )}

        {/* Info dalla mappa */}
        {!loading && localRestaurant && (
          <div style={{ background: `${MUTED}33`, borderRadius: 12, padding: 14, marginBottom: 20, border: `1px solid ${GOLD}44` }}>
            <div style={{ fontSize: 12, color: GOLD, letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: 8 }}>⭐ Nel nostro database</div>
            {localRestaurant.sommelier_notes && <div style={{ color: CREAM + "CC", fontSize: 13, lineHeight: 1.6 }}>🍷 {localRestaurant.sommelier_notes}</div>}
            {localRestaurant.wine_list_notes && <div style={{ color: CREAM + "99", fontSize: 13, marginTop: 6, lineHeight: 1.6 }}>📋 {localRestaurant.wine_list_notes?.slice(0, 200)}</div>}
            {localRestaurant.gem_score && <div style={{ color: GOLD, fontSize: 13, marginTop: 6 }}>💎 Punteggio gemme: {localRestaurant.gem_score}/100</div>}
          </div>
        )}

        {/* Risultati AI online */}
        {!loading && result && (
          <div style={{ background: `${MUTED}22`, borderRadius: 12, padding: 16, border: `1px solid ${GOLD}22` }}>
            <div style={{ fontSize: 12, color: GOLD, letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: 12 }}>🌐 Ricerca online</div>
            <div style={{ color: CREAM, fontSize: 14, fontFamily: "Georgia, serif", lineHeight: 1.8, whiteSpace: "pre-wrap" }}>
              {result.split("\n").map((line, i) => (
                <span key={i}>{line}{i < result.split("\n").length - 1 && <br />}</span>
              ))}
            </div>
          </div>
        )}

        {!loading && searched && !result && localExperiences.length === 0 && (
          <div style={{ textAlign: "center", padding: 20, color: CREAM + "55" }}>
            <div style={{ fontSize: 32 }}>🍷</div>
            <div style={{ marginTop: 8 }}>Nessuna informazione trovata per questo ristorante</div>
          </div>
        )}
      </div>
    </div>
  );
}
