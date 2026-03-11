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

// Mappatura città → { country, region, continent }
const CITY_GEO = {
  "cogne": { country: "Italia", region: "Valle d'Aosta", continent: "Europa" },
  "aosta": { country: "Italia", region: "Valle d'Aosta", continent: "Europa" },
  "torino": { country: "Italia", region: "Piemonte", continent: "Europa" },
  "alba": { country: "Italia", region: "Piemonte", continent: "Europa" },
  "asti": { country: "Italia", region: "Piemonte", continent: "Europa" },
  "barolo": { country: "Italia", region: "Piemonte", continent: "Europa" },
  "cuneo": { country: "Italia", region: "Piemonte", continent: "Europa" },
  "novara": { country: "Italia", region: "Piemonte", continent: "Europa" },
  "milan": { country: "Italia", region: "Lombardia", continent: "Europa" },
  "milano": { country: "Italia", region: "Lombardia", continent: "Europa" },
  "brescia": { country: "Italia", region: "Lombardia", continent: "Europa" },
  "bergamo": { country: "Italia", region: "Lombardia", continent: "Europa" },
  "mantova": { country: "Italia", region: "Lombardia", continent: "Europa" },
  "como": { country: "Italia", region: "Lombardia", continent: "Europa" },
  "venice": { country: "Italia", region: "Veneto", continent: "Europa" },
  "venezia": { country: "Italia", region: "Veneto", continent: "Europa" },
  "verona": { country: "Italia", region: "Veneto", continent: "Europa" },
  "vicenza": { country: "Italia", region: "Veneto", continent: "Europa" },
  "padova": { country: "Italia", region: "Veneto", continent: "Europa" },
  "treviso": { country: "Italia", region: "Veneto", continent: "Europa" },
  "trento": { country: "Italia", region: "Trentino-Alto Adige", continent: "Europa" },
  "bolzano": { country: "Italia", region: "Trentino-Alto Adige", continent: "Europa" },
  "trieste": { country: "Italia", region: "Friuli Venezia Giulia", continent: "Europa" },
  "udine": { country: "Italia", region: "Friuli Venezia Giulia", continent: "Europa" },
  "genova": { country: "Italia", region: "Liguria", continent: "Europa" },
  "sanremo": { country: "Italia", region: "Liguria", continent: "Europa" },
  "firenze": { country: "Italia", region: "Toscana", continent: "Europa" },
  "florence": { country: "Italia", region: "Toscana", continent: "Europa" },
  "siena": { country: "Italia", region: "Toscana", continent: "Europa" },
  "montalcino": { country: "Italia", region: "Toscana", continent: "Europa" },
  "pisa": { country: "Italia", region: "Toscana", continent: "Europa" },
  "lucca": { country: "Italia", region: "Toscana", continent: "Europa" },
  "arezzo": { country: "Italia", region: "Toscana", continent: "Europa" },
  "bologna": { country: "Italia", region: "Emilia-Romagna", continent: "Europa" },
  "modena": { country: "Italia", region: "Emilia-Romagna", continent: "Europa" },
  "parma": { country: "Italia", region: "Emilia-Romagna", continent: "Europa" },
  "ravenna": { country: "Italia", region: "Emilia-Romagna", continent: "Europa" },
  "roma": { country: "Italia", region: "Lazio", continent: "Europa" },
  "rome": { country: "Italia", region: "Lazio", continent: "Europa" },
  "napoli": { country: "Italia", region: "Campania", continent: "Europa" },
  "naples": { country: "Italia", region: "Campania", continent: "Europa" },
  "salerno": { country: "Italia", region: "Campania", continent: "Europa" },
  "palermo": { country: "Italia", region: "Sicilia", continent: "Europa" },
  "catania": { country: "Italia", region: "Sicilia", continent: "Europa" },
  "agrigento": { country: "Italia", region: "Sicilia", continent: "Europa" },
  "bari": { country: "Italia", region: "Puglia", continent: "Europa" },
  "lecce": { country: "Italia", region: "Puglia", continent: "Europa" },
  "cagliari": { country: "Italia", region: "Sardegna", continent: "Europa" },
  "paris": { country: "Francia", region: "Île-de-France", continent: "Europa" },
  "parigi": { country: "Francia", region: "Île-de-France", continent: "Europa" },
  "bordeaux": { country: "Francia", region: "Nouvelle-Aquitaine", continent: "Europa" },
  "lyon": { country: "Francia", region: "Auvergne-Rhône-Alpes", continent: "Europa" },
  "nice": { country: "Francia", region: "Provence-Alpes-Côte d'Azur", continent: "Europa" },
  "strasbourg": { country: "Francia", region: "Grand Est", continent: "Europa" },
  "madrid": { country: "Spagna", region: "Comunidad de Madrid", continent: "Europa" },
  "barcelona": { country: "Spagna", region: "Catalogna", continent: "Europa" },
  "barcellona": { country: "Spagna", region: "Catalogna", continent: "Europa" },
  "london": { country: "Regno Unito", region: "Inghilterra", continent: "Europa" },
  "londra": { country: "Regno Unito", region: "Inghilterra", continent: "Europa" },
  "berlin": { country: "Germania", region: "Berlino", continent: "Europa" },
  "berlino": { country: "Germania", region: "Berlino", continent: "Europa" },
  "amsterdam": { country: "Paesi Bassi", region: "Noord-Holland", continent: "Europa" },
  "new york": { country: "USA", region: "New York", continent: "America" },
  "los angeles": { country: "USA", region: "California", continent: "America" },
  "san francisco": { country: "USA", region: "California", continent: "America" },
  "chicago": { country: "USA", region: "Illinois", continent: "America" },
  "napa": { country: "USA", region: "California", continent: "America" },
  "tokyo": { country: "Giappone", region: "Kantō", continent: "Asia" },
  "osaka": { country: "Giappone", region: "Kansai", continent: "Asia" },
  "dubai": { country: "Emirati Arabi", region: "Dubai", continent: "Asia" },
  "sydney": { country: "Australia", region: "New South Wales", continent: "Oceania" },
};

function getGeo(city) {
  if (!city) return { country: "Sconosciuto", region: "Sconosciuto", continent: "Mondo" };
  const key = city.toLowerCase().trim();
  if (CITY_GEO[key]) return CITY_GEO[key];
  for (const [k, v] of Object.entries(CITY_GEO)) {
    if (key.includes(k) || k.includes(key)) return v;
  }
  // Default Italia se non trovato
  return { country: "Italia", region: "Altra regione", continent: "Europa" };
}

// Unifica ristoranti con stesso nome (case-insensitive)
function mergeRestaurants(list) {
  const map = new Map();
  for (const r of list) {
    const key = (r.name || "").toLowerCase().trim();
    if (!key) continue;
    if (!map.has(key)) {
      map.set(key, { ...r, gems: Array.isArray(r.gems) ? [...r.gems] : [], _allNames: [r.name] });
    } else {
      const ex = map.get(key);
      const existingIds = new Set(ex.gems.map(g => g.id || g.wine_name));
      for (const g of (r.gems || [])) {
        if (!existingIds.has(g.id || g.wine_name)) ex.gems.push(g);
      }
      if (!ex.lat && r.lat) { ex.lat = r.lat; ex.lng = r.lng; }
      if (!ex._allNames.includes(r.name)) ex._allNames.push(r.name);
      if (!ex.has_sommelier && r.has_sommelier) { ex.has_sommelier = true; ex.sommelier_notes = r.sommelier_notes; }
    }
  }
  return Array.from(map.values());
}

// ============================================================
// MAIN MAPTAB
// ============================================================
export default function MapTab({ user, isPremium }) {
  const mapRef = useRef(null);
  const leafletMap = useRef(null);
  const markersRef = useRef([]);
  const [restaurants, setRestaurants] = useState([]);
  const [selected, setSelected] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", city: "", address: "", lat: "", lng: "", notes: "", card_quality: "buona", has_sommelier: false, sommelier_name: "" });
  const [saving, setSaving] = useState(false);
  const [leafletLoaded, setLeafletLoaded] = useState(false);
  const [browseOpen, setBrowseOpen] = useState(false);
  const isAdmin = user?.email === "lanzifederico09@gmail.com";
  const canSeeGems = isPremium || isAdmin;

  useEffect(() => {
    loadRestaurants();
    if (window.L) { setLeafletLoaded(true); return; }
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
    document.head.appendChild(link);
    const script = document.createElement("script");
    script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
    script.onload = () => setLeafletLoaded(true);
    document.head.appendChild(script);
  }, []);

  useEffect(() => {
    if (!leafletLoaded || !mapRef.current || leafletMap.current) return;
    const L = window.L;
    const map = L.map(mapRef.current, { center: [45, 12], zoom: 5 });
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 19 }).addTo(map);
    leafletMap.current = map;
    renderMarkers(map, restaurants);
  }, [leafletLoaded]);

  useEffect(() => {
    if (leafletMap.current) renderMarkers(leafletMap.current, restaurants);
  }, [restaurants]);

  async function loadRestaurants() {
    const [d1, d2] = await Promise.all([
      sbFetch("restaurants?select=*,gems(id,gem_score,wine_name,classification,notes,markup_factor,restaurant_price,retail_price)&order=created_at.desc"),
      sbFetch("map_restaurants?select=*&order=created_at.desc"),
    ]);
    const r1 = Array.isArray(d1) ? d1 : [];
    const r2 = Array.isArray(d2) ? d2.map(r => ({ ...r, gems: [] })) : [];
    setRestaurants(mergeRestaurants([...r1, ...r2]));
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
      } catch {}
    });
  }

  async function saveRestaurant() {
    if (!form.name || !form.city || !form.lat || !form.lng) return;
    setSaving(true);
    await sbPost({ name: form.name, city: form.city, address: form.address, lat: parseFloat(form.lat), lng: parseFloat(form.lng), notes: form.notes, card_quality: form.card_quality, has_sommelier: form.has_sommelier || !!form.sommelier_name, sommelier_notes: form.sommelier_name });
    setForm({ name: "", city: "", address: "", lat: "", lng: "", notes: "", card_quality: "buona", has_sommelier: false, sommelier_name: "" });
    setShowForm(false);
    setSaving(false);
    await loadRestaurants();
  }

  const inp = { background: `${MUTED}55`, border: `1px solid ${GOLD}33`, borderRadius: 8, padding: "10px 13px", color: CREAM, fontFamily: "Georgia, serif", fontSize: 13, outline: "none", width: "100%", boxSizing: "border-box" };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <style>{`.leaflet-container{border-radius:16px;}.leaflet-control-attribution{display:none!important;}`}</style>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 22, fontWeight: 600, margin: 0, color: CREAM }}>🗺️ Mappa Mondiale</h2>
          <p style={{ margin: "4px 0 0", fontSize: 12, color: `${GOLD}88` }}>{restaurants.length} ristoranti · clicca un pin per i dettagli</p>
        </div>
        {isAdmin && (
          <button onClick={() => setShowForm(f => !f)} style={{ padding: "8px 16px", borderRadius: 20, background: showForm ? `${MUTED}88` : `linear-gradient(135deg, ${BURGUNDY}, #9B2335)`, border: `1px solid ${GOLD}33`, color: CREAM, fontSize: 12, cursor: "pointer" }}>
            {showForm ? "✕ Chiudi" : "+ Aggiungi"}
          </button>
        )}
      </div>

      {showForm && isAdmin && (
        <div style={{ background: `${MUTED}33`, borderRadius: 16, padding: 18, border: `1px solid ${GOLD}22`, display: "flex", flexDirection: "column", gap: 10 }}>
          <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Nome ristorante *" style={inp} />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <input value={form.city} onChange={e => setForm(f => ({ ...f, city: e.target.value }))} placeholder="Città *" style={inp} />
            <input value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} placeholder="Indirizzo" style={inp} />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <input value={form.lat} onChange={e => setForm(f => ({ ...f, lat: e.target.value }))} placeholder="Latitudine *" style={inp} />
            <input value={form.lng} onChange={e => setForm(f => ({ ...f, lng: e.target.value }))} placeholder="Longitudine *" style={inp} />
          </div>
          <button onClick={geolocate} style={{ padding: "9px", background: `${MUTED}55`, border: `1px solid ${GOLD}22`, borderRadius: 8, color: CREAM, fontSize: 12, cursor: "pointer" }}>📍 Usa posizione attuale</button>
          <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 10 }}>
            <select value={form.card_quality} onChange={e => setForm(f => ({ ...f, card_quality: e.target.value }))} style={{ ...inp }}>
              <option value="standard">Standard</option>
              <option value="buona">Buona (50-100 etichette)</option>
              <option value="ottima">Ottima (100-500)</option>
              <option value="enorme">Enorme (500+)</option>
            </select>
            <label style={{ display: "flex", alignItems: "center", gap: 8, padding: "9px 13px", background: `${MUTED}55`, border: `1px solid ${GOLD}33`, borderRadius: 8, color: CREAM, fontSize: 12, cursor: "pointer" }}>
              <input type="checkbox" checked={form.has_sommelier} onChange={e => setForm(f => ({ ...f, has_sommelier: e.target.checked }))} />
              Sommelier ⭐
            </label>
          </div>
          {form.has_sommelier && (
            <input value={form.sommelier_name} onChange={e => setForm(f => ({ ...f, sommelier_name: e.target.value }))} placeholder="Nome del sommelier" style={inp} />
          )}
          <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Note sulla carta / sommelier..." rows={2} style={{ ...inp, resize: "vertical" }} />
          <button onClick={saveRestaurant} disabled={saving || !form.name || !form.lat} style={{ padding: "11px", background: `linear-gradient(135deg, ${GOLD}, #8B6914)`, border: "none", borderRadius: 10, color: DARK, fontFamily: "'Cormorant Garamond', serif", fontSize: 15, fontWeight: 700, cursor: "pointer" }}>
            {saving ? "Salvataggio..." : "Salva sulla mappa →"}
          </button>
        </div>
      )}

      <div ref={mapRef} style={{ width: "100%", height: 360, borderRadius: 16, border: `1px solid ${GOLD}22`, background: "#111" }}>
        {!leafletLoaded && <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", color: `${CREAM}44`, fontSize: 14 }}>🗺️ Caricamento mappa...</div>}
      </div>

      {selected && (
        <SelectedRestaurant restaurant={selected} onClose={() => setSelected(null)} canSeeGems={canSeeGems} />
      )}

      <div style={{ display: "flex", gap: 16, padding: "10px 14px", background: `${MUTED}22`, borderRadius: 10, flexWrap: "wrap" }}>
        {[["#E84040", "Gemma estrema"], ["#FF8C00", "Buona opportunità"], [GOLD, "Standard"], ["#888", "Non analizzato"]].map(([c, l]) => (
          <div key={l} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: `${CREAM}88` }}>
            <div style={{ width: 10, height: 10, borderRadius: "50%", background: c }} />{l}
          </div>
        ))}
      </div>

      {/* SFOGLIA PER ZONA */}
      <div style={{ border: `1px solid ${GOLD}33`, borderRadius: 14, overflow: "hidden" }}>
        <button onClick={() => setBrowseOpen(o => !o)}
          style={{ width: "100%", padding: "14px 18px", background: browseOpen ? `linear-gradient(135deg, ${BURGUNDY}, #9B2335)` : `${MUTED}44`, border: "none", color: CREAM, fontSize: 15, cursor: "pointer", fontFamily: "'Cormorant Garamond', serif", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span>🌍 Sfoglia per zona</span>
          <span style={{ fontSize: 12, color: `${GOLD}88` }}>{restaurants.length} ristoranti {browseOpen ? "▲" : "▼"}</span>
        </button>
        {browseOpen && (
          <div style={{ background: `${MUTED}22`, padding: 16 }}>
            <GeoBrowser restaurants={restaurants} canSeeGems={canSeeGems}
              onSelectOnMap={r => {
                setSelected(r);
                setBrowseOpen(false);
                if (leafletMap.current && r.lat && r.lng) leafletMap.current.setView([r.lat, r.lng], 14);
                window.scrollTo({ top: 0, behavior: "smooth" });
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================
// SELECTED RESTAURANT (popup dopo click pin mappa)
// ============================================================
function SelectedRestaurant({ restaurant: r, onClose, canSeeGems }) {
  const [pdfs, setPdfs] = useState([]);
  const [loadingPdfs, setLoadingPdfs] = useState(true);
  const gems = r.gems || [];

  useEffect(() => {
    async function load() {
      setLoadingPdfs(true);
      try {
        const stopWords = new Set(["hotel", "ristorante", "osteria", "trattoria", "enoteca", "della", "dello", "del", "the"]);
        const allNames = r._allNames || [r.name];
        const wordSet = new Set();
        for (const name of allNames) {
          name.toLowerCase().split(" ").filter(w => w.length > 2 && !stopWords.has(w)).forEach(w => wordSet.add(w));
        }
        const searches = [];
        if (r.city) searches.push(
          fetch(`${SUPABASE_URL}/rest/v1/restaurant_pdfs?city=ilike.*${encodeURIComponent(r.city)}*&order=created_at.desc`,
            { headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` } }).then(res => res.json()).catch(() => [])
        );
        for (const w of wordSet) searches.push(
          fetch(`${SUPABASE_URL}/rest/v1/restaurant_pdfs?restaurant_name=ilike.*${encodeURIComponent(w)}*&order=created_at.desc`,
            { headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` } }).then(res => res.json()).catch(() => [])
        );
        const results = await Promise.all(searches);
        const seen = new Set();
        setPdfs(results.flat().filter(p => { if (!p?.id || seen.has(p.id)) return false; seen.add(p.id); return true; }));
      } catch { setPdfs([]); }
      setLoadingPdfs(false);
    }
    load();
  }, [r.name]);

  return (
    <div style={{ background: `${MUTED}33`, borderRadius: 16, border: `1px solid ${GOLD}33`, overflow: "hidden" }}>
      <div style={{ padding: "16px 18px", display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <h3 style={{ margin: 0, color: CREAM, fontSize: 20, fontFamily: "'Cormorant Garamond', serif", fontWeight: 600 }}>{r.name}</h3>
          <p style={{ margin: "4px 0 0", fontSize: 12, color: `${CREAM}66` }}>{r.city}{r.address ? ` · ${r.address}` : ""}</p>
          <div style={{ display: "flex", gap: 6, marginTop: 8, flexWrap: "wrap" }}>
            {gems.length > 0 && <span style={{ fontSize: 11, padding: "2px 10px", borderRadius: 20, background: `${GOLD}18`, color: GOLD, border: `1px solid ${GOLD}33` }}>💎 {gems.length} gemme</span>}
            {r.has_sommelier && <span style={{ fontSize: 11, padding: "2px 10px", borderRadius: 20, background: "#88CCFF18", color: "#88CCFF", border: "1px solid #88CCFF33" }}>⭐ {r.sommelier_notes || "Sommelier"}</span>}
            {!loadingPdfs && pdfs.length > 0 && <span style={{ fontSize: 11, padding: "2px 10px", borderRadius: 20, background: `${MUTED}55`, color: `${CREAM}88`, border: `1px solid ${GOLD}22` }}>📄 {pdfs.length} carte</span>}
          </div>
        </div>
        <button onClick={onClose} style={{ background: "none", border: "none", color: `${CREAM}44`, fontSize: 22, cursor: "pointer" }}>✕</button>
      </div>

      <div style={{ padding: "0 18px 18px", display: "flex", flexDirection: "column", gap: 14 }}>
        {gems.length > 0 && (
          <div>
            <div style={{ fontSize: 11, color: GOLD, letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 10 }}>💎 Gemme Nascoste</div>
            {canSeeGems ? gems.map((g, i) => (
              <div key={i} style={{ padding: "10px 0", borderBottom: `1px solid ${GOLD}11` }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ color: CREAM, fontSize: 14, fontFamily: "'Cormorant Garamond', serif", fontWeight: 600 }}>🍷 {g.wine_name || "Vino"}</div>
                    {g.classification && <div style={{ color: `${GOLD}77`, fontSize: 11, marginTop: 2 }}>{g.classification}</div>}
                    {g.restaurant_price && (
                      <div style={{ color: `${CREAM}66`, fontSize: 12, marginTop: 4 }}>
                        💶 Carta: €{g.restaurant_price}{g.retail_price ? ` · Retail: ~€${g.retail_price}` : ""}
                        {g.markup_factor && <span style={{ color: g.markup_factor <= 2.5 ? "#4CAF50" : "#FF8C00", marginLeft: 6 }}>({g.markup_factor}x)</span>}
                      </div>
                    )}
                    {g.notes && <div style={{ color: `${CREAM}88`, fontSize: 12, marginTop: 6, fontStyle: "italic", borderLeft: `2px solid ${GOLD}44`, paddingLeft: 8 }}>{g.notes}</div>}
                  </div>
                  <span style={{ color: scoreColor(g.gem_score), fontWeight: 700, fontSize: 13, background: `${scoreColor(g.gem_score)}18`, padding: "3px 10px", borderRadius: 20, flexShrink: 0 }}>{g.gem_score}/100</span>
                </div>
              </div>
            )) : (
              <div style={{ textAlign: "center", padding: 14, background: `${MUTED}44`, borderRadius: 10 }}>
                <div style={{ fontSize: 22, marginBottom: 6 }}>🔒</div>
                <div style={{ color: `${CREAM}66`, fontSize: 12, marginBottom: 10 }}>{gems.length} gemme nascoste — solo Premium</div>
                <button onClick={async () => { const res = await fetch("/api/checkout", { method: "POST" }); const d = await res.json(); if (d.url) window.location.href = d.url; }}
                  style={{ padding: "7px 18px", borderRadius: 20, background: `linear-gradient(135deg, ${GOLD}, #A07830)`, border: "none", color: DARK, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
                  ⭐ Premium — €4.99/mese
                </button>
              </div>
            )}
          </div>
        )}

        <div>
          <div style={{ fontSize: 11, color: GOLD, letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 8 }}>📄 Carte dei Vini</div>
          {loadingPdfs ? <div style={{ color: `${CREAM}44`, fontSize: 12 }}>Caricamento...</div>
            : pdfs.length === 0 ? <div style={{ color: `${CREAM}33`, fontSize: 12, fontStyle: "italic" }}>Nessuna carta caricata</div>
            : pdfs.map(pdf => (
              <div key={pdf.id} style={{ padding: "8px 12px", background: `${MUTED}22`, borderRadius: 8, marginBottom: 6, border: `1px solid ${GOLD}11` }}>
                <div style={{ color: GOLD, fontSize: 13 }}>📋 {pdf.section_name || "Carta completa"}</div>
                <div style={{ color: `${CREAM}44`, fontSize: 11, marginTop: 2 }}>{new Date(pdf.created_at).toLocaleDateString("it-IT")}</div>
              </div>
            ))}
        </div>

        {(r.notes || r.sommelier_notes || r.wine_list_notes) && (
          <div style={{ fontSize: 13, color: `${CREAM}77`, lineHeight: 1.6, fontStyle: "italic", borderLeft: `2px solid ${GOLD}33`, paddingLeft: 10 }}>
            {(r.notes || r.sommelier_notes || r.wine_list_notes)?.slice(0, 300)}
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================
// GEO BROWSER — Continente → Nazione → Regione → Città → Ristoranti
// ============================================================
function GeoBrowser({ restaurants, canSeeGems, onSelectOnMap }) {
  const [level, setLevel] = useState("continent");
  const [selContinent, setSelContinent] = useState(null);
  const [selCountry, setSelCountry] = useState(null);
  const [selRegion, setSelRegion] = useState(null);
  const [selCity, setSelCity] = useState(null);

  const enriched = restaurants.map(r => ({ ...r, _geo: getGeo(r.city) }));

  const continents = [...new Set(enriched.map(r => r._geo.continent))].sort();
  const countries = [...new Set(enriched.filter(r => r._geo.continent === selContinent).map(r => r._geo.country))].sort();
  const regions = [...new Set(enriched.filter(r => r._geo.country === selCountry).map(r => r._geo.region))].sort();
  const cities = [...new Set(enriched.filter(r => r._geo.region === selRegion).map(r => r.city).filter(Boolean))].sort();
  const cityRests = enriched.filter(r => {
    const rc = (r.city || "").toLowerCase();
    const sc = (selCity || "").toLowerCase();
    return rc === sc || rc.includes(sc) || sc.includes(rc);
  });

  const crumbs = [
    { label: "🌍 Mondo", onClick: () => { setLevel("continent"); setSelContinent(null); setSelCountry(null); setSelRegion(null); setSelCity(null); } },
    selContinent && { label: `🗺️ ${selContinent}`, onClick: () => { setLevel("country"); setSelCountry(null); setSelRegion(null); setSelCity(null); } },
    selCountry && { label: `🏳️ ${selCountry}`, onClick: () => { setLevel("region"); setSelRegion(null); setSelCity(null); } },
    selRegion && { label: `📍 ${selRegion}`, onClick: () => { setLevel("city"); setSelCity(null); } },
    selCity && { label: `🏙️ ${selCity}`, onClick: () => setLevel("restaurants") },
  ].filter(Boolean);

  const rowBtn = { padding: "13px 16px", background: `${MUTED}33`, border: `1px solid ${GOLD}22`, borderRadius: 12, color: CREAM, cursor: "pointer", textAlign: "left", display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%", marginBottom: 6 };

  function GemCount({ items }) {
    const total = items.reduce((s, r) => s + (r.gems?.length || 0), 0);
    return total > 0 && canSeeGems ? <span style={{ fontSize: 11, color: GOLD }}> · 💎 {total} gemme</span> : null;
  }

  return (
    <div>
      {/* Breadcrumb */}
      <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12, marginBottom: 12, flexWrap: "wrap" }}>
        {crumbs.map((c, i) => (
          <span key={i} style={{ display: "flex", alignItems: "center", gap: 4 }}>
            {i > 0 && <span style={{ color: `${GOLD}44` }}>›</span>}
            <button onClick={c.onClick} style={{ background: "none", border: "none", color: i === crumbs.length - 1 ? CREAM : `${GOLD}88`, cursor: "pointer", fontFamily: "Georgia, serif", padding: "2px 4px", fontSize: 12, fontWeight: i === crumbs.length - 1 ? 600 : 400 }}>
              {c.label}
            </button>
          </span>
        ))}
      </div>

      {/* CONTINENTI */}
      {level === "continent" && continents.map(cont => {
        const items = enriched.filter(r => r._geo.continent === cont);
        return (
          <button key={cont} style={rowBtn} onClick={() => { setSelContinent(cont); setLevel("country"); }}>
            <div>
              <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 17, fontWeight: 600 }}>🌍 {cont}</div>
              <div style={{ fontSize: 12, color: `${CREAM}55`, marginTop: 3 }}>{items.length} ristorante{items.length !== 1 ? "i" : ""}<GemCount items={items} /></div>
            </div>
            <span style={{ color: `${GOLD}66`, fontSize: 18 }}>›</span>
          </button>
        );
      })}

      {/* NAZIONI */}
      {level === "country" && countries.map(country => {
        const items = enriched.filter(r => r._geo.country === country);
        return (
          <button key={country} style={rowBtn} onClick={() => { setSelCountry(country); setLevel("region"); }}>
            <div>
              <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 17, fontWeight: 600 }}>🏳️ {country}</div>
              <div style={{ fontSize: 12, color: `${CREAM}55`, marginTop: 3 }}>{items.length} ristorante{items.length !== 1 ? "i" : ""}<GemCount items={items} /></div>
            </div>
            <span style={{ color: `${GOLD}66`, fontSize: 18 }}>›</span>
          </button>
        );
      })}

      {/* REGIONI */}
      {level === "region" && regions.map(region => {
        const items = enriched.filter(r => r._geo.region === region);
        return (
          <button key={region} style={rowBtn} onClick={() => { setSelRegion(region); setLevel("city"); }}>
            <div>
              <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 17, fontWeight: 600 }}>📍 {region}</div>
              <div style={{ fontSize: 12, color: `${CREAM}55`, marginTop: 3 }}>{items.length} ristorante{items.length !== 1 ? "i" : ""}<GemCount items={items} /></div>
            </div>
            <span style={{ color: `${GOLD}66`, fontSize: 18 }}>›</span>
          </button>
        );
      })}

      {/* CITTÀ */}
      {level === "city" && cities.map(city => {
        const items = enriched.filter(r => r.city?.toLowerCase() === city.toLowerCase());
        return (
          <button key={city} style={rowBtn} onClick={() => { setSelCity(city); setLevel("restaurants"); }}>
            <div>
              <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 17, fontWeight: 600 }}>🏙️ {city}</div>
              <div style={{ fontSize: 12, color: `${CREAM}55`, marginTop: 3 }}>{items.length} ristorante{items.length !== 1 ? "i" : ""}<GemCount items={items} /></div>
            </div>
            <span style={{ color: `${GOLD}66`, fontSize: 18 }}>›</span>
          </button>
        );
      })}

      {/* RISTORANTI */}
      {level === "restaurants" && (
        cityRests.length === 0
          ? <div style={{ color: `${CREAM}44`, fontSize: 13, padding: 8 }}>Nessun ristorante a {selCity}</div>
          : cityRests.map(r => (
            <RestaurantRow key={r.id} r={r} gems={r.gems || []} topScore={(r.gems || []).length ? Math.max(...(r.gems || []).map(g => g.gem_score || 0)) : null}
              canSeeGems={canSeeGems} onSelectOnMap={onSelectOnMap} />
          ))
      )}
    </div>
  );
}

// ============================================================
// RESTAURANT ROW — card espandibile
// ============================================================
function RestaurantRow({ r, gems, topScore, canSeeGems, onSelectOnMap }) {
  const [open, setOpen] = useState(false);
  const [pdfs, setPdfs] = useState(null);

  async function loadPdfs() {
    if (pdfs !== null) return;
    const stopWords = new Set(["hotel", "ristorante", "osteria", "trattoria", "enoteca", "della", "dello", "del", "the"]);
    const allNames = r._allNames || [r.name];
    const wordSet = new Set();
    for (const name of allNames) {
      name.toLowerCase().split(" ").filter(w => w.length > 2 && !stopWords.has(w)).forEach(w => wordSet.add(w));
    }
    const searches = [];
    if (r.city) searches.push(
      fetch(`${SUPABASE_URL}/rest/v1/restaurant_pdfs?city=ilike.*${encodeURIComponent(r.city)}*&order=created_at.desc`,
        { headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` } }).then(res => res.json()).catch(() => [])
    );
    for (const w of wordSet) searches.push(
      fetch(`${SUPABASE_URL}/rest/v1/restaurant_pdfs?restaurant_name=ilike.*${encodeURIComponent(w)}*&order=created_at.desc`,
        { headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` } }).then(res => res.json()).catch(() => [])
    );
    const results = await Promise.all(searches);
    const seen = new Set();
    setPdfs(results.flat().filter(p => { if (!p?.id || seen.has(p.id)) return false; seen.add(p.id); return true; }));
  }

  return (
    <div style={{ background: `${MUTED}22`, borderRadius: 12, border: `1px solid ${GOLD}22`, overflow: "hidden", marginBottom: 6 }}>
      <div onClick={() => { if (!open) loadPdfs(); setOpen(o => !o); }}
        style={{ padding: "13px 16px", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 17, color: CREAM, fontWeight: 600 }}>🍷 {r.name}</div>
          <div style={{ display: "flex", gap: 6, marginTop: 6, flexWrap: "wrap" }}>
            {topScore && <span style={{ fontSize: 11, color: scoreColor(topScore), background: `${scoreColor(topScore)}18`, padding: "2px 9px", borderRadius: 20, border: `1px solid ${scoreColor(topScore)}33` }}>🤖 {topScore}/100</span>}
            {gems.length > 0 && <span style={{ fontSize: 11, color: GOLD, background: `${GOLD}18`, padding: "2px 9px", borderRadius: 20, border: `1px solid ${GOLD}33` }}>💎 {gems.length} gemm{gems.length === 1 ? "a" : "e"}</span>}
            {r.has_sommelier && <span style={{ fontSize: 11, color: "#88CCFF", background: "#88CCFF18", padding: "2px 9px", borderRadius: 20, border: "1px solid #88CCFF33" }}>⭐ {r.sommelier_notes || "Sommelier"}</span>}
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center", marginLeft: 8 }}>
          {r.lat && r.lng && (
            <button onClick={e => { e.stopPropagation(); onSelectOnMap(r); }}
              style={{ padding: "5px 11px", background: `${BURGUNDY}88`, border: `1px solid ${GOLD}33`, borderRadius: 20, color: CREAM, fontSize: 11, cursor: "pointer", whiteSpace: "nowrap" }}>
              📍 Mappa
            </button>
          )}
          <span style={{ color: `${GOLD}66`, fontSize: 16 }}>{open ? "▲" : "▼"}</span>
        </div>
      </div>

      {open && (
        <div style={{ borderTop: `1px solid ${GOLD}11`, padding: "14px 16px", display: "flex", flexDirection: "column", gap: 14 }}>
          {gems.length > 0 && (
            <div>
              <div style={{ fontSize: 11, color: GOLD, letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 10 }}>💎 Gemme Nascoste</div>
              {canSeeGems ? gems.map((g, i) => (
                <div key={i} style={{ padding: "10px 0", borderBottom: `1px solid ${GOLD}11` }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ color: CREAM, fontSize: 14, fontFamily: "'Cormorant Garamond', serif", fontWeight: 600 }}>🍷 {g.wine_name || "Vino"}</div>
                      {g.classification && <div style={{ color: `${GOLD}77`, fontSize: 11, marginTop: 2 }}>{g.classification}</div>}
                      {g.restaurant_price && (
                        <div style={{ color: `${CREAM}66`, fontSize: 12, marginTop: 4 }}>
                          💶 Carta: €{g.restaurant_price}{g.retail_price ? ` · Retail: ~€${g.retail_price}` : ""}
                          {g.markup_factor && <span style={{ color: g.markup_factor <= 2.5 ? "#4CAF50" : "#FF8C00", marginLeft: 6 }}>({g.markup_factor}x)</span>}
                        </div>
                      )}
                      {g.notes && <div style={{ color: `${CREAM}88`, fontSize: 12, marginTop: 6, fontStyle: "italic", borderLeft: `2px solid ${GOLD}44`, paddingLeft: 8 }}>{g.notes}</div>}
                    </div>
                    <span style={{ color: scoreColor(g.gem_score), fontWeight: 700, fontSize: 13, background: `${scoreColor(g.gem_score)}18`, padding: "3px 10px", borderRadius: 20, flexShrink: 0 }}>{g.gem_score}/100</span>
                  </div>
                </div>
              )) : (
                <div style={{ textAlign: "center", padding: 14, background: `${MUTED}44`, borderRadius: 10 }}>
                  <div style={{ fontSize: 20, marginBottom: 6 }}>🔒</div>
                  <div style={{ color: `${CREAM}66`, fontSize: 12 }}>{gems.length} gemme — solo Premium</div>
                </div>
              )}
            </div>
          )}
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
        </div>
      )}
    </div>
  );
}
