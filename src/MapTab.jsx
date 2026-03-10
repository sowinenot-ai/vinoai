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
    L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
      subdomains: "abcd", maxZoom: 19,
    }).addTo(map);
    leafletMap.current = map;
    renderMarkers(map, restaurants);
  }, [leafletLoaded]);

  useEffect(() => {
    if (leafletMap.current) renderMarkers(leafletMap.current, restaurants);
  }, [restaurants]);

  async function loadRestaurants() {
    const data = await sbFetch("restaurants?select=*,gems(gem_score,wine_name,classification)&order=created_at.desc");
    if (Array.isArray(data)) setRestaurants(data);
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
        html: `<div style="width:28px;height:28px;border-radius:50%;background:${DARK};border:2.5px solid ${color};display:flex;align-items:center;justify-content:center;font-size:13px;box-shadow:0 2px 10px rgba(0,0,0,0.6);cursor:pointer;">🍷</div>`,
        className: "", iconSize: [28, 28], iconAnchor: [14, 14],
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
        <div style={{ background: `${MUTED}33`, borderRadius: 16, padding: 18, border: `1px solid ${GOLD}33` }}>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 20, fontWeight: 600, color: CREAM }}>{selected.name}</div>
              <div style={{ fontSize: 12, color: GOLD + "88", marginTop: 2 }}>{selected.city}{selected.address ? ` · ${selected.address}` : ""}</div>
              <div style={{ display: "flex", gap: 10, marginTop: 6, flexWrap: "wrap" }}>
                {selected.has_sommelier && <span style={{ fontSize: 11, color: GOLD, background: `${GOLD}22`, padding: "2px 8px", borderRadius: 20 }}>⭐ Sommelier eccellente</span>}
                {selected.card_quality && <span style={{ fontSize: 11, color: CREAM + "88", background: `${MUTED}55`, padding: "2px 8px", borderRadius: 20 }}>📋 {selected.card_quality}</span>}
              </div>
              {selected.notes && <p style={{ fontSize: 13, color: CREAM + "88", marginTop: 8, lineHeight: 1.6 }}>{selected.notes}</p>}
            </div>
            <button onClick={() => { setSelected(null); setPdfResult(null); }} style={{ background: "none", border: "none", color: CREAM + "33", cursor: "pointer", fontSize: 20, padding: 4 }}>✕</button>
          </div>

          {selected.gems?.length > 0 && (
            <div style={{ marginTop: 12, borderTop: `1px solid ${GOLD}22`, paddingTop: 12 }}>
              <div style={{ fontSize: 11, color: GOLD, letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: 8 }}>💎 Gemme nascoste</div>
              {selected.gems.slice(0, 4).map((g, i) => (
                <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "5px 0", borderBottom: `1px solid ${GOLD}11`, fontSize: 13 }}>
                  <span style={{ color: CREAM }}>{g.wine_name}</span>
                  <span style={{ color: scoreColor(g.gem_score), fontWeight: 700 }}>{g.gem_score}/100</span>
                </div>
              ))}
            </div>
          )}

          {/* PDF upload — admin + premium */}
          {(isPremium || isAdmin) && (
            <div style={{ marginTop: 14, borderTop: `1px solid ${GOLD}22`, paddingTop: 14 }}>
              <div style={{ fontSize: 11, color: GOLD, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 8 }}>📄 Analizza carta vini PDF</div>
              <label style={{ display: "flex", alignItems: "center", gap: 10, padding: "11px 14px", background: `${MUTED}44`, borderRadius: 10, border: `1px dashed ${GOLD}44`, cursor: pdfLoading ? "default" : "pointer" }}>
                <span style={{ fontSize: 22 }}>📥</span>
                <div>
                  <div style={{ fontSize: 13, color: CREAM + "cc" }}>{pdfLoading ? "⏳ Analisi in corso..." : "Carica il PDF della carta"}</div>
                  <div style={{ fontSize: 11, color: CREAM + "44" }}>L'AI trova le gemme nascoste e controlla i prezzi</div>
                </div>
                <input type="file" accept=".pdf" onChange={handlePdf} style={{ display: "none" }} disabled={pdfLoading} />
              </label>
              {pdfResult && (
                <div style={{ marginTop: 12, padding: 14, background: `${MUTED}22`, borderRadius: 10, border: `1px solid ${GOLD}22`, fontSize: 13, color: CREAM + "cc", lineHeight: 1.7, whiteSpace: "pre-wrap" }}>
                  {pdfResult.error ? <span style={{ color: "#FF8888" }}>{pdfResult.error}</span> : pdfResult.analysis}
                </div>
              )}
            </div>
          )}
        </div>
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
