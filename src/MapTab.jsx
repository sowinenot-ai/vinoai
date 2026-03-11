import { useState, useEffect, useRef } from "react";

const BURGUNDY = "#6B1A2A";
const GOLD = "#C9A84C";
const CREAM = "#F5ECD7";
const DARK = "#0D0A08";
const MUTED = "#3A2D28";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_KEY;

async function sbFetch(path) {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` },
  });
  return r.json();
}

async function sbPost(body) {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/restaurants`, {
    method: "POST",
    headers: { "Content-Type": "application/json", apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`, Prefer: "return=representation" },
    body: JSON.stringify(body),
  });
  return r.json();
}

export default function MapTab({ user, isPremium }) {
  const mapRef = useRef(null);
  const leafletMap = useRef(null);
  const markersRef = useRef([]);
  const [restaurants, setRestaurants] = useState([]);
  const [selected, setSelected] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", city: "", address: "", lat: "", lng: "", notes: "", card_quality: "buona", has_sommelier: false });
  const [saving, setSaving] = useState(false);
  const [leafletLoaded, setLeafletLoaded] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [pdfResult, setPdfResult] = useState(null);
  const isAdmin = user?.email === "lanzifederico09@gmail.com";

  useEffect(() => {
    if (window.L) { setLeafletLoaded(true); return; }
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
    document.head.appendChild(link);
    const script = document.createElement("script");
    script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
    script.onload = () => setLeafletLoaded(true);
    document.head.appendChild(script);
    loadRestaurants();
  }, []);

  useEffect(() => {
    if (!leafletLoaded || !mapRef.current || leafletMap.current) return;
    const L = window.L;
    const map = L.map(mapRef.current, { center: [45, 12], zoom: 5 });
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: "© OpenStreetMap"
    }).addTo(map);
    leafletMap.current = map;
    renderMarkers(map, restaurants);
  }, [leafletLoaded]);

  useEffect(() => {
    if (leafletMap.current) renderMarkers(leafletMap.current, restaurants);
  }, [restaurants]);

  async function loadRestaurants() {
    // Carica da entrambe le tabelle
    const [data1, data2] = await Promise.all([
      sbFetch("restaurants?select=*,gems(gem_score,wine_name,classification)&order=created_at.desc"),
      sbFetch("map_restaurants?select=*&order=created_at.desc"),
    ]);
    const r1 = Array.isArray(data1) ? data1 : [];
    const r2 = Array.isArray(data2) ? data2.map(r => ({
      ...r,
      gems: r.gem_score ? [{ gem_score: r.gem_score, wine_name: r.wine_list_notes?.slice(0, 50) }] : []
    })) : [];
    // Unisci evitando duplicati per nome
    const names = new Set(r1.map(r => r.name?.toLowerCase()));
    const merged = [...r1, ...r2.filter(r => !names.has(r.name?.toLowerCase()))];
    setRestaurants(merged);
  }

  function scoreColor(score) {
    if (!score && score !== 0) return GOLD;
    if (score >= 80) return "#FF4444";
    if (score >= 60) return "#FF8C00";
    if (score >= 40) return GOLD;
    return "#888";
  }

  function renderMarkers(map, rests) {
    const L = window.L;
    markersRef.current.forEach(m => map.removeLayer(m));
    markersRef.current = [];
    rests.forEach(r => {
      if (!r.lat || !r.lng) return;
      const gems = r.gems || [];
      const topScore = gems.length ? Math.max(...gems.map(g => g.gem_score || 0)) : null;
      const color = scoreColor(topScore);
      const icon = L.divIcon({
        html: `<div style="width:32px;height:32px;border-radius:50%;background:${color};border:3px solid white;display:flex;align-items:center;justify-content:center;font-size:14px;box-shadow:0 3px 12px rgba(0,0,0,0.4);cursor:pointer;">🍷</div>`,
        className: "", iconSize: [32, 32], iconAnchor: [16, 16],
      });
      const m = L.marker([r.lat, r.lng], { icon }).addTo(map);
      m.on("click", () => setSelected(r));
      markersRef.current.push(m);
    });
  }

  async function geolocate() {
    navigator.geolocation?.getCurrentPosition(async pos => {
      const { latitude: lat, longitude: lng } = pos.coords;
      setForm(f => ({ ...f, lat: lat.toFixed(6), lng: lng.toFixed(6) }));
      try {
        const r = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`);
        const d = await r.json();
        const city = d.address?.city || d.address?.town || d.address?.village || "";
        setForm(f => ({ ...f, city }));
      } catch (e) {}
    });
  }

  async function saveRestaurant() {
    if (!form.name || !form.city || !form.lat || !form.lng) return;
    setSaving(true);
    await sbPost({ name: form.name, city: form.city, address: form.address, lat: parseFloat(form.lat), lng: parseFloat(form.lng), notes: form.notes, card_quality: form.card_quality, has_sommelier: form.has_sommelier });
    setForm({ name: "", city: "", address: "", lat: "", lng: "", notes: "", card_quality: "buona", has_sommelier: false });
    setShowForm(false);
    setSaving(false);
    await loadRestaurants();
  }

  async function handlePdf(e) {
    const file = e.target.files?.[0];
    if (!file || !selected) return;
    setPdfLoading(true);
    setPdfResult(null);
    const reader = new FileReader();
    reader.onload = async ev => {
      const base64 = ev.target.result.split(",")[1];
      try {
        const res = await fetch("/api/pdf-analyze", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ pdf: base64, restaurantName: selected.name, restaurantCity: selected.city }),
        });
        const data = await res.json();
        setPdfResult(data);
      } catch (err) {
        setPdfResult({ error: "Errore nell'analisi" });
      }
      setPdfLoading(false);
    };
    reader.readAsDataURL(file);
  }

  const inp = { background: `${MUTED}55`, border: `1px solid ${GOLD}33`, borderRadius: 8, padding: "9px 13px", color: CREAM, fontFamily: "Georgia, serif", fontSize: 13, outline: "none", width: "100%", boxSizing: "border-box" };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <style>{`.leaflet-container{border-radius:16px;}.leaflet-control-attribution{display:none!important;}`}</style>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 22, fontWeight: 600, margin: 0, color: CREAM }}>🗺️ Mappa Mondiale</h2>
          <p style={{ margin: "2px 0 0", fontSize: 12, color: GOLD + "88" }}>{restaurants.length} ristoranti segnalati</p>
        </div>
        <button onClick={() => setShowForm(s => !s)} style={{ padding: "8px 16px", borderRadius: 20, background: `linear-gradient(135deg, ${BURGUNDY}, #9B2335)`, border: "none", color: CREAM, fontSize: 12, cursor: "pointer", fontFamily: "Georgia, serif" }}>
          + Segnala
        </button>
      </div>

      {/* Form */}
      {showForm && (
        <div style={{ background: `${MUTED}33`, borderRadius: 16, padding: 18, border: `1px solid ${GOLD}22` }}>
          <div style={{ fontSize: 12, color: GOLD, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 12 }}>Segnala ristorante</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
            <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Nome ristorante *" style={inp} />
            <div style={{ display: "flex", gap: 8 }}>
              <input value={form.city} onChange={e => setForm(f => ({ ...f, city: e.target.value }))} placeholder="Città *" style={inp} />
              <input value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} placeholder="Indirizzo" style={inp} />
            </div>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <input value={form.lat} onChange={e => setForm(f => ({ ...f, lat: e.target.value }))} placeholder="Lat *" style={{ ...inp, flex: 1 }} />
              <input value={form.lng} onChange={e => setForm(f => ({ ...f, lng: e.target.value }))} placeholder="Lng *" style={{ ...inp, flex: 1 }} />
              <button onClick={geolocate} title="Usa posizione attuale" style={{ padding: "9px 12px", borderRadius: 8, background: `${MUTED}88`, border: `1px solid ${GOLD}33`, color: GOLD, cursor: "pointer", fontSize: 18 }}>📍</button>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <select value={form.card_quality} onChange={e => setForm(f => ({ ...f, card_quality: e.target.value }))} style={{ ...inp, flex: 1 }}>
                <option value="enorme">Carta enorme (500+ etichette)</option>
                <option value="ottima">Carta ottima (100-500)</option>
                <option value="buona">Carta buona (50-100)</option>
                <option value="standard">Standard</option>
              </select>
              <label style={{ display: "flex", alignItems: "center", gap: 8, padding: "9px 13px", background: `${MUTED}55`, border: `1px solid ${GOLD}33`, borderRadius: 8, color: CREAM, fontSize: 12, cursor: "pointer", whiteSpace: "nowrap" }}>
                <input type="checkbox" checked={form.has_sommelier} onChange={e => setForm(f => ({ ...f, has_sommelier: e.target.checked }))} />
                Sommelier ⭐
              </label>
            </div>
            <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Note sulla carta / sommelier..." rows={2} style={{ ...inp, resize: "vertical" }} />
            <button onClick={saveRestaurant} disabled={saving || !form.name || !form.lat} style={{ padding: "11px", background: `linear-gradient(135deg, ${GOLD}, #8B6914)`, border: "none", borderRadius: 10, color: DARK, fontFamily: "'Cormorant Garamond', serif", fontSize: 15, fontWeight: 700, cursor: "pointer" }}>
              {saving ? "Salvataggio..." : "Salva sulla mappa →"}
            </button>
          </div>
        </div>
      )}

      {/* Mappa */}
      <div ref={mapRef} style={{ width: "100%", height: 360, borderRadius: 16, border: `1px solid ${GOLD}22`, background: "#111" }}>
        {!leafletLoaded && <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", color: CREAM + "44", fontSize: 14 }}>🗺️ Caricamento mappa...</div>}
      </div>

      {/* Ristorante selezionato */}
      {selected && (
        <SelectedRestaurant
          restaurant={selected}
          onClose={() => { setSelected(null); setPdfResult(null); }}
          user={user}
          isPremium={isPremium}
        />
      )}

      {/* Legenda */}
      <div style={{ display: "flex", gap: 16, padding: "10px 14px", background: `${MUTED}22`, borderRadius: 10, flexWrap: "wrap" }}>
        {[["#FF4444", "Gemma estrema"], ["#FF8C00", "Buona opportunità"], [GOLD, "Standard"], ["#888", "Non analizzato"]].map(([c, l]) => (
          <div key={l} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: CREAM + "88" }}>
            <div style={{ width: 10, height: 10, borderRadius: "50%", background: c, flexShrink: 0 }} />{l}
          </div>
        ))}
      </div>
    </div>
  );
}

function SelectedRestaurant({ restaurant: r, onClose, user, isPremium }) {
  const [expanded, setExpanded] = useState(false);
  const [pdfs, setPdfs] = useState([]);
  const [loadingPdfs, setLoadingPdfs] = useState(false);
  const [selectedPdf, setSelectedPdf] = useState(null);
  const [clientScore, setClientScore] = useState(null);
  const gems = r.gems || [];
  const gemCount = gems.length;
  const appScore = r.gem_score || (gems.length ? Math.max(...gems.map(g => g.gem_score || 0)) : null);

  function scoreColor(s) {
    if (!s) return "#888";
    if (s >= 80) return "#E84040";
    if (s >= 60) return "#FF8C00";
    if (s >= 40) return GOLD;
    return "#888";
  }

  function scoreLabel(s) {
    if (!s) return "";
    if (s >= 80) return "💎 Eccellente";
    if (s >= 60) return "⭐ Ottima";
    if (s >= 40) return "👍 Buona";
    return "📍 Da scoprire";
  }

  useEffect(() => {
    // Carica punteggio clienti dalle esperienze
    const SUPABASE_URL2 = import.meta.env.VITE_SUPABASE_URL || "https://qnawdmghgwgvhzqzarrw.supabase.co";
    const SUPABASE_KEY2 = import.meta.env.VITE_SUPABASE_KEY;
    fetch(`${SUPABASE_URL2}/rest/v1/experiences?restaurant=ilike.*${encodeURIComponent(r.name)}*&select=rating`, {
      headers: { apikey: SUPABASE_KEY2, Authorization: `Bearer ${SUPABASE_KEY2}` }
    }).then(res => res.json()).then(data => {
      if (data?.length > 0) {
        const avg = data.reduce((a, b) => a + (b.rating || 5), 0) / data.length;
        setClientScore({ avg: Math.round(avg * 10) / 10, count: data.length });
      }
    }).catch(() => {});
    loadPdfs();
  }, [r.name]);

  async function loadPdfs() {
    setLoadingPdfs(true);
    const res = await fetch(`${SUPABASE_URL}/rest/v1/restaurant_pdfs?restaurant_name=eq.${encodeURIComponent(r.name)}&order=created_at.desc`, {
      headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` }
    });
    const data = await res.json();
    setPdfs(Array.isArray(data) ? data : []);
    setLoadingPdfs(false);
  }

  return (
    <div style={{ background: `${MUTED}33`, borderRadius: 16, border: `1px solid ${GOLD}33`, overflow: "hidden" }}>

      {/* HEADER — nome cliccabile + badge */}
      <div style={{ padding: "16px 18px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div style={{ flex: 1 }}>

            {/* Nome cliccabile */}
            <div onClick={() => setExpanded(e => !e)}
              style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 22, fontWeight: 600, color: CREAM, cursor: "pointer", display: "flex", alignItems: "center", gap: 8 }}>
              {r.name}
              <span style={{ fontSize: 14, color: GOLD + "66" }}>{expanded ? "▲" : "▼"}</span>
            </div>

            {/* Città */}
            <div style={{ fontSize: 12, color: GOLD + "88", marginTop: 3 }}>
              📍 {r.city}{r.address && r.address !== r.city ? ` · ${r.address}` : ""}
              {r.has_sommelier && <span style={{ marginLeft: 8, color: GOLD }}>⭐ Sommelier</span>}
            </div>

            {/* Badge punteggi + gemme */}
            <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
              {appScore && (
                <span style={{ fontSize: 12, color: scoreColor(appScore), background: `${scoreColor(appScore)}18`, padding: "4px 12px", borderRadius: 20, fontWeight: 700, border: `1px solid ${scoreColor(appScore)}44` }}>
                  🤖 App {appScore}/100
                </span>
              )}
              {clientScore && (
                <span style={{ fontSize: 12, color: "#4CAF88", background: "#4CAF8818", padding: "4px 12px", borderRadius: 20, fontWeight: 700, border: "1px solid #4CAF8844" }}>
                  👥 Clienti {clientScore.avg}/10 ({clientScore.count})
                </span>
              )}
              {gemCount > 0 && (
                <span style={{ fontSize: 12, color: GOLD, background: `${GOLD}18`, padding: "4px 12px", borderRadius: 20, border: `1px solid ${GOLD}44` }}>
                  💎 {gemCount} gemm{gemCount === 1 ? "a" : "e"}
                </span>
              )}
              {pdfs.length > 0 && (
                <span style={{ fontSize: 12, color: CREAM + "88", background: `${MUTED}55`, padding: "4px 12px", borderRadius: 20, border: `1px solid ${GOLD}22` }}>
                  📄 {pdfs.length} cart{pdfs.length === 1 ? "a" : "e"}
                </span>
              )}
            </div>

            {/* Preview carta sotto il nome */}
            {r.wine_list_notes && !expanded && (
              <div style={{ fontSize: 12, color: CREAM + "66", marginTop: 8, lineHeight: 1.5, fontStyle: "italic" }}>
                "{r.wine_list_notes.slice(0, 100)}..."
              </div>
            )}
          </div>

          <button onClick={onClose} style={{ background: "none", border: "none", color: CREAM + "44", cursor: "pointer", fontSize: 20, marginLeft: 8 }}>✕</button>
        </div>
      </div>

      {/* DETTAGLI — visibili solo dopo click sul nome */}
      {expanded && (
        <div style={{ borderTop: `1px solid ${GOLD}22`, padding: "16px 18px", display: "flex", flexDirection: "column", gap: 16 }}>

          {/* Gemme nascoste — solo premium */}
          {gems.length > 0 && (
            <div>
              <div style={{ fontSize: 11, color: GOLD, letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: 10 }}>💎 Gemme Nascoste</div>
              {isPremium || user?.email === "lanzifederico09@gmail.com" ? (
                gems.map((g, i) => (
                  <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: `1px solid ${GOLD}11` }}>
                    <div>
                      <div style={{ color: CREAM, fontSize: 13 }}>🍷 {g.wine_name || "Vino"}</div>
                      {g.classification && <div style={{ color: CREAM + "55", fontSize: 11, marginTop: 2 }}>{g.classification}</div>}
                    </div>
                    <span style={{ color: scoreColor(g.gem_score), fontWeight: 700, fontSize: 14, background: `${scoreColor(g.gem_score)}18`, padding: "3px 10px", borderRadius: 20 }}>
                      {g.gem_score}/100
                    </span>
                  </div>
                ))
              ) : (
                <div style={{ background: `${MUTED}44`, borderRadius: 12, padding: 16, border: `1px solid ${GOLD}22`, textAlign: "center" }}>
                  <div style={{ fontSize: 24, marginBottom: 8 }}>🔒</div>
                  <div style={{ color: CREAM + "88", fontSize: 13, marginBottom: 12 }}>
                    {gems.length} gemm{gems.length === 1 ? "a nascosta" : "e nascoste"} — solo per utenti Premium
                  </div>
                  <button onClick={async () => { const r = await fetch("/api/checkout", { method: "POST" }); const d = await r.json(); if (d.url) window.location.href = d.url; }}
                    style={{ padding: "8px 20px", borderRadius: 20, background: `linear-gradient(135deg, ${GOLD}, #A07830)`, border: "none", color: DARK, fontFamily: "'Cormorant Garamond', serif", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
                    ⭐ Passa a Premium — €4.99/mese
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Note sommelier */}
          {(r.notes || r.sommelier_notes) && (
            <div style={{ fontSize: 13, color: CREAM + "99", lineHeight: 1.7, fontStyle: "italic", borderLeft: `2px solid ${GOLD}44`, paddingLeft: 12 }}>
              "{r.notes || r.sommelier_notes}"
            </div>
          )}

          {/* Carte dei vini */}
          <div>
            <div style={{ fontSize: 11, color: GOLD, letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: 10 }}>📄 Carte dei Vini Analizzate</div>
            {loadingPdfs && <div style={{ color: CREAM + "55", fontSize: 13 }}>Caricamento...</div>}
            {!loadingPdfs && pdfs.length === 0 && (
              <div style={{ color: CREAM + "33", fontSize: 13, fontStyle: "italic" }}>Nessuna carta ancora caricata</div>
            )}
            {pdfs.map(pdf => (
              <div key={pdf.id} style={{ background: `${MUTED}22`, borderRadius: 12, padding: 14, marginBottom: 8, border: `1px solid ${GOLD}22` }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <div style={{ color: GOLD, fontSize: 14, fontWeight: 600 }}>📋 {pdf.section_name || "Carta completa"}</div>
                    <div style={{ color: CREAM + "44", fontSize: 11, marginTop: 2 }}>{new Date(pdf.created_at).toLocaleDateString("it-IT")}</div>
                  </div>
                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    {pdf.gem_score && (
                      <span style={{ color: scoreColor(pdf.gem_score), fontSize: 13, fontWeight: 700 }}>
                        {scoreLabel(pdf.gem_score)}
                      </span>
                    )}
                    <button onClick={() => setSelectedPdf(selectedPdf?.id === pdf.id ? null : pdf)}
                      style={{ padding: "6px 14px", background: selectedPdf?.id === pdf.id ? `linear-gradient(135deg, ${BURGUNDY}, #9B2335)` : `${MUTED}55`, border: `1px solid ${GOLD}33`, borderRadius: 20, color: CREAM, fontSize: 12, cursor: "pointer" }}>
                      {selectedPdf?.id === pdf.id ? "▲ Chiudi" : "▼ Vedi carta"}
                    </button>
                  </div>
                </div>
                {selectedPdf?.id === pdf.id && (
                  <div style={{ marginTop: 12, fontSize: 13, color: CREAM + "CC", lineHeight: 1.9, whiteSpace: "pre-wrap", borderTop: `1px solid ${GOLD}11`, paddingTop: 12 }}>
                    {pdf.analysis}
                  </div>
                )}
              </div>
            ))}
          </div>

        </div>
      )}
    </div>
  );
}
