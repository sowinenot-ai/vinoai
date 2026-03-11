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

function scoreColor(score) {
  if (!score && score !== 0) return "#888";
  if (score >= 80) return "#E84040";
  if (score >= 60) return "#FF8C00";
  if (score >= 40) return GOLD;
  return "#888";
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
  const [pdfs, setPdfs] = useState(null);
  const [gems, setGems] = useState(null);

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
  }, [leafletLoaded, restaurants]);

  useEffect(() => {
    if (selected) {
      loadDetails(selected.id);
    } else {
      setPdfs(null);
      setGems(null);
    }
  }, [selected]);

  async function loadRestaurants() {
    const data = await sbFetch("map_restaurants?select=*&order=created_at.desc");
    setRestaurants(Array.isArray(data) ? data : []);
  }

  async function loadDetails(restaurantId) {
    const [pdfData, gemData] = await Promise.all([
      sbFetch(`pdf_analyses?restaurant_id=eq.${restaurantId}&order=created_at.desc`),
      sbFetch(`gems?restaurant_id=eq.${restaurantId}&order=gem_score.desc`)
    ]);
    setPdfs(Array.isArray(pdfData) ? pdfData : []);
    setGems(Array.isArray(gemData) ? gemData : []);
  }

  function renderMarkers(map, data) {
    const L = window.L;
    markersRef.current.forEach(m => m.remove());
    markersRef.current = [];

    data.forEach(r => {
      if (!r.lat || !r.lng) return;
      const marker = L.marker([r.lat, r.lng]).addTo(map);
      marker.on("click", () => setSelected(r));
      markersRef.current.push(marker);
    });
  }

  async function handleAdd() {
    if (!form.name || !form.lat || !form.lng) return;
    setSaving(true);
    try {
      await sbPost(form);
      setForm({ name: "", city: "", address: "", lat: "", lng: "", notes: "", card_quality: "buona", has_sommelier: false });
      setShowForm(false);
      await loadRestaurants();
    } catch (e) { alert("Errore"); }
    setSaving(false);
  }

  async function handleFileUpload(e) {
    const file = e.target.files[0];
    if (!file || !selected) return;
    setPdfLoading(true);
    setPdfResult(null);
    try {
      const fileName = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
      await fetch(`${SUPABASE_URL}/storage/v1/object/pdf-menus/${fileName}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${SUPABASE_KEY}`, apikey: SUPABASE_KEY, "Content-Type": "application/pdf" },
        body: file
      });
      const res = await fetch("/api/pdf", {
        method: "POST",
        body: JSON.stringify({ 
          pdfUrl: `${SUPABASE_URL}/storage/v1/object/public/pdf-menus/${fileName}`,
          restaurantName: selected.name,
          restaurantId: selected.id,
          sectionName: "Carta Vini"
        })
      });
      const data = await res.json();
      setPdfResult(data.success ? "Analisi completata!" : "Errore analisi");
      loadDetails(selected.id);
    } catch (e) { setPdfResult("Errore caricamento"); }
    setPdfLoading(false);
  }

  const r = selected;

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", background: DARK, color: CREAM, position: "relative" }}>
      <div ref={mapRef} style={{ flex: 1, minHeight: 400 }} />
      
      {selected && (
        <div style={{ position: "absolute", bottom: 20, left: 20, right: 20, zIndex: 1000, background: DARK, border: `1px solid ${GOLD}44`, borderRadius: 16, padding: 20, maxHeight: "65%", overflowY: "auto", boxShadow: "0 10px 40px rgba(0,0,0,0.9)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 15 }}>
            <div>
              <h3 style={{ margin: 0, color: GOLD, fontSize: 24, fontFamily: "'Cormorant Garamond', serif" }}>{r.name}</h3>
              <p style={{ margin: "4px 0", fontSize: 13, color: `${CREAM}88` }}>{r.city}{r.address ? ` · ${r.address}` : ""}</p>
            </div>
            <button onClick={() => setSelected(null)} style={{ background: "none", border: "none", color: CREAM, fontSize: 22, cursor: "pointer", padding: 5 }}>✕</button>
          </div>

          <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
            <div style={{ background: `${MUTED}44`, padding: "6px 12px", borderRadius: 20, border: `1px solid ${GOLD}22`, fontSize: 11, color: GOLD, fontWeight: 700, textTransform: "uppercase" }}>
              {r.card_quality || "Qualità N/D"}
            </div>
            {r.has_sommelier && (
              <div style={{ background: `${BURGUNDY}33`, padding: "6px 12px", borderRadius: 20, border: `1px solid ${BURGUNDY}66`, fontSize: 11, color: "#FFB5C2", fontWeight: 700 }}>
                🍷 SOMMELIER
              </div>
            )}
          </div>

          {/* Sezione Perle (Gems) */}
          <div style={{ marginBottom: 25 }}>
            <div style={{ fontSize: 11, color: GOLD, letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 12, fontWeight: 700 }}>✨ Perle AI (Gemme Nascoste)</div>
            {gems === null && <div style={{ color: `${CREAM}44`, fontSize: 12 }}>Caricamento gemme...</div>}
            {gems !== null && (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {gems.length === 0 ? (
                  <div style={{ color: `${CREAM}33`, fontSize: 12, fontStyle: "italic" }}>Nessuna gemma individuata in questa carta</div>
                ) : (isPremium || isAdmin) ? (
                  gems.map(gem => (
                    <div key={gem.id} style={{ padding: 12, background: `linear-gradient(135deg, ${MUTED}33, ${DARK})`, borderRadius: 12, borderLeft: `3px solid ${scoreColor(gem.gem_score)}` }}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                        <div style={{ color: CREAM, fontSize: 14, fontWeight: 600 }}>{gem.wine_name}</div>
                        <div style={{ color: scoreColor(gem.gem_score), fontWeight: 800, fontSize: 13 }}>{gem.gem_score}</div>
                      </div>
                      <div style={{ color: GOLD, fontSize: 11, textTransform: "uppercase", marginBottom: 6 }}>{gem.classification}</div>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <div style={{ color: `${CREAM}88`, fontSize: 12 }}>{gem.restaurant_price}€ <span style={{ fontSize: 10 }}>(vs {gem.retail_price}€)</span></div>
                        <div style={{ color: `${CREAM}66`, fontSize: 11 }}>Markup: {gem.markup_factor}x</div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div style={{ padding: 20, background: `linear-gradient(to bottom, ${GOLD}11, transparent)`, borderRadius: 12, border: `1px solid ${GOLD}22`, textAlign: "center" }}>
                    <div style={{ color: GOLD, fontSize: 14, fontWeight: 700, marginBottom: 8 }}>Contenuto Esclusivo</div>
                    <div style={{ color: `${CREAM}66`, fontSize: 12 }}>{gems.length} gemme — solo Premium</div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Carte PDF */}
          <div>
            <div style={{ fontSize: 11, color: GOLD, letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 8 }}>📄 Carte dei Vini</div>
            {pdfs === null && <div style={{ color: `${CREAM}44`, fontSize: 12 }}>Caricamento...</div>}
            {pdfs !== null && pdfs.length === 0 && <div style={{ color: `${CREAM}33`, fontSize: 12, fontStyle: "italic" }}>Nessuna carta caricata</div>}
            {pdfs !== null && pdfs.map(pdf => (
              <div key={pdf.id} style={{ padding: "8px 12px", background: `${MUTED}22`, borderRadius: 8, marginBottom: 6, border: `1px solid ${GOLD}11` }}>
                <div style={{ color: GOLD, fontSize: 13 }}>📋 {pdf.section_name || "Carta completa"}</div>
                <div style={{ color: `${CREAM}44`, fontSize: 11, marginTop: 2 }}>{new Date(pdf.created_at).toLocaleDateString("it-IT")}</div>
              </div>
            ))}
          </div>

          {/* Note */}
          {(r.notes || r.wine_list_notes) && (
            <div style={{ fontSize: 12, color: `${CREAM}66`, lineHeight: 1.6, fontStyle: "italic", marginTop: 20, borderTop: `1px solid ${GOLD}11`, paddingTop: 12 }}>
              {r.notes || r.wine_list_notes}
            </div>
          )}

          {/* Admin Upload */}
          {isAdmin && (
            <div style={{ borderTop: `1px solid ${GOLD}22`, paddingTop: 15, marginTop: 20 }}>
              <div style={{ fontSize: 11, color: GOLD, marginBottom: 10, fontWeight: "bold" }}>ADMIN: CARICA CARTA VINI (PDF)</div>
              <input type="file" accept="application/pdf" onChange={handleFileUpload} disabled={pdfLoading} style={{ fontSize: 12 }} />
              {pdfLoading && <div style={{ fontSize: 12, marginTop: 8, color: GOLD }}>Analisi AI in corso...</div>}
              {pdfResult && <div style={{ fontSize: 12, marginTop: 8, color: GOLD, fontWeight: "bold" }}>{pdfResult}</div>}
            </div>
          )}
        </div>
      )}

      {isAdmin && !selected && (
        <button onClick={() => setShowForm(!showForm)} style={{ position: "absolute", top: 20, right: 20, zIndex: 1000, background: GOLD, color: DARK, border: "none", borderRadius: 30, padding: "10px 20px", fontWeight: "bold", cursor: "pointer", boxShadow: "0 4px 15px rgba(0,0,0,0.5)" }}>
          {showForm ? "Chiudi" : "+ Aggiungi Locale"}
        </button>
      )}

      {showForm && (
        <div style={{ position: "absolute", top: 75, right: 20, zIndex: 1000, background: DARK, border: `1px solid ${GOLD}44`, borderRadius: 16, padding: 20, width: 300, display: "flex", flexDirection: "column", gap: 12, boxShadow: "0 10px 30px rgba(0,0,0,0.8)" }}>
          <div style={{ fontSize: 12, color: GOLD, fontWeight: "bold" }}>NUOVO PUNTO MAPPA</div>
          <input placeholder="Nome Locale" style={{ padding: 10, background: `${MUTED}44`, border: `1px solid ${GOLD}22`, color: CREAM, borderRadius: 8 }} value={form.name} onChange={e => setForm({...form, name: e.target.value})} />
          <input placeholder="Città" style={{ padding: 10, background: `${MUTED}44`, border: `1px solid ${GOLD}22`, color: CREAM, borderRadius: 8 }} value={form.city} onChange={e => setForm({...form, city: e.target.value})} />
          <div style={{ display: "flex", gap: 8 }}>
            <input placeholder="Lat" style={{ padding: 10, background: `${MUTED}44`, border: `1px solid ${GOLD}22`, color: CREAM, borderRadius: 8, flex: 1 }} value={form.lat} onChange={e => setForm({...form, lat: e.target.value})} />
            <input placeholder="Lng" style={{ padding: 10, background: `${MUTED}44`, border: `1px solid ${GOLD}22`, color: CREAM, borderRadius: 8, flex: 1 }} value={form.lng} onChange={e => setForm({...form, lng: e.target.value})} />
          </div>
          <button onClick={handleAdd} disabled={saving} style={{ background: GOLD, color: DARK, border: "none", padding: 12, fontWeight: "bold", borderRadius: 8, cursor: "pointer" }}>
            {saving ? "SALVATAGGIO..." : "SALVA LOCALE"}
          </button>
        </div>
      )}
    </div>
  );
}
