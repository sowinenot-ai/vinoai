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
      sbFetch("restaurants?select=*,gems(gem_score,wine_name,classification,notes,markup_factor,restaurant_price,retail_price)&order=created_at.desc"),
      sbFetch("map_restaurants?select=*&order=created_at.desc"),
    ]);
    const r1 = Array.isArray(data1) ? data1 : [];
    const r2 = Array.isArray(data2) ? data2.map(r => ({ 
      ...r, 
      gems: r.gem_score ? [{ gem_score: r.gem_score, wine_name: r.wine_list_notes?.slice(0, 50) }] : [] 
    })) : [];
    
    // Unisci evitando duplicati per nome
    const names = new Set();
    const merged = [...r1, ...r2].filter(r => {
      if (names.has(r.name)) return false;
      names.add(r.name);
      return true;
    });
    setRestaurants(merged);
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
          sectionName: "Carta Vini"
        })
      });
      const data = await res.json();
      setPdfResult(data.success ? "Analisi completata!" : "Errore analisi");
      await loadRestaurants();
    } catch (e) { setPdfResult("Errore caricamento"); }
    setPdfLoading(false);
  }

  const scoreColor = s => s >= 90 ? "#4ade80" : s >= 80 ? GOLD : "#f87171";
  const scoreLabel = s => s >= 90 ? "ECCELLENTE" : s >= 80 ? "OTTIMA" : "BUONA";

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", background: DARK, color: CREAM, position: "relative" }}>
      <div ref={mapRef} style={{ flex: 1, minHeight: 400 }} />
      
      {selected && (
        <div style={{ position: "absolute", bottom: 20, left: 20, right: 20, zIndex: 1000, background: DARK, border: `1px solid ${GOLD}44`, borderRadius: 16, padding: 20, maxHeight: "50%", overflowY: "auto", boxShadow: "0 10px 30px rgba(0,0,0,0.8)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <h3 style={{ margin: 0, color: GOLD, fontSize: 20, fontFamily: "'Cormorant Garamond', serif" }}>{selected.name}</h3>
              <p style={{ margin: "4px 0", fontSize: 13, color: CREAM + "88" }}>{selected.address}, {selected.city}</p>
            </div>
            <button onClick={() => setSelected(null)} style={{ background: "none", border: "none", color: CREAM, fontSize: 20, cursor: "pointer" }}>✕</button>
          </div>

          <div style={{ marginTop: 15, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <div style={{ background: `${MUTED}44`, padding: 12, borderRadius: 10, border: `1px solid ${GOLD}11` }}>
              <div style={{ fontSize: 10, color: GOLD, textTransform: "uppercase", letterSpacing: 1 }}>Qualità Carta</div>
              <div style={{ fontSize: 14, fontWeight: 600, marginTop: 4 }}>{selected.card_quality?.toUpperCase() || "N/A"}</div>
            </div>
            <div style={{ background: `${MUTED}44`, padding: 12, borderRadius: 10, border: `1px solid ${GOLD}11` }}>
              <div style={{ fontSize: 10, color: GOLD, textTransform: "uppercase", letterSpacing: 1 }}>Sommelier</div>
              <div style={{ fontSize: 14, fontWeight: 600, marginTop: 4 }}>{selected.has_sommelier ? "SÌ" : "NO"}</div>
            </div>
          </div>

          {selected.notes && (
            <div style={{ marginTop: 15, padding: 12, background: `${GOLD}08`, borderRadius: 10, fontSize: 13, fontStyle: "italic", color: CREAM + "cc", borderLeft: `3px solid ${GOLD}` }}>
              "{selected.notes}"
            </div>
          )}

          {isAdmin && (
            <div style={{ marginTop: 20, borderTop: `1px solid ${GOLD}22`, paddingTop: 15 }}>
              <div style={{ fontSize: 11, color: GOLD, marginBottom: 8, fontWeight: "bold" }}>ADMIN: CARICA CARTA VINI (PDF)</div>
              <input type="file" accept="application/pdf" onChange={handleFileUpload} disabled={pdfLoading} />
              {pdfLoading && <div style={{ fontSize: 12, marginTop: 5 }}>Analisi AI in corso...</div>}
              {pdfResult && <div style={{ fontSize: 12, marginTop: 5, color: GOLD }}>{pdfResult}</div>}
            </div>
          )}
        </div>
      )}

      {isAdmin && !selected && (
        <button onClick={() => setShowForm(!showForm)} style={{ position: "absolute", top: 20, right: 20, zIndex: 1000, background: GOLD, color: DARK, border: "none", borderRadius: 30, padding: "10px 20px", fontWeight: "bold", cursor: "pointer" }}>
          {showForm ? "Chiudi" : "+ Aggiungi Locale"}
        </button>
      )}

      {showForm && (
        <div style={{ position: "absolute", top: 70, right: 20, zIndex: 1000, background: DARK, border: `1px solid ${GOLD}44`, borderRadius: 16, padding: 20, width: 300, display: "flex", flexDirection: "column", gap: 10 }}>
          <input placeholder="Nome" style={{ padding: 8, background: MUTED, border: "none", color: CREAM }} value={form.name} onChange={e => setForm({...form, name: e.target.value})} />
          <input placeholder="Città" style={{ padding: 8, background: MUTED, border: "none", color: CREAM }} value={form.city} onChange={e => setForm({...form, city: e.target.value})} />
          <input placeholder="Indirizzo" style={{ padding: 8, background: MUTED, border: "none", color: CREAM }} value={form.address} onChange={e => setForm({...form, address: e.target.value})} />
          <div style={{ display: "flex", gap: 5 }}>
            <input placeholder="Lat" style={{ padding: 8, background: MUTED, border: "none", color: CREAM, flex: 1 }} value={form.lat} onChange={e => setForm({...form, lat: e.target.value})} />
            <input placeholder="Lng" style={{ padding: 8, background: MUTED, border: "none", color: CREAM, flex: 1 }} value={form.lng} onChange={e => setForm({...form, lng: e.target.value})} />
          </div>
          <button onClick={handleAdd} disabled={saving} style={{ background: GOLD, color: DARK, border: "none", padding: 10, fontWeight: "bold", borderRadius: 8 }}>
            {saving ? "Salvataggio..." : "Salva"}
          </button>
        </div>
      )}
    </div>
  );
}
