import { useState, useRef, useEffect } from "react";

const BURGUNDY = "#6B1A2A";
const GOLD = "#C9A84C";
const CREAM = "#F5ECD7";
const DARK = "#0D0A08";
const MUTED = "#3A2D28";
const ADMIN_EMAIL = "lanzifederico09@gmail.com";
const SUPABASE_URL = "https://qnawdmghgwgvhzqzarrw.supabase.co";
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_KEY;

const SECTIONS = ["Intera carta", "Bollicine & Champagne", "Vini bianchi", "Vini rossi", "Vini dolci & dessert", "Vini naturali", "Vini al calice", "Spirits & altro"];

export default function PdfTab({ user, isPremium }) {
  const isAdmin = user?.email === ADMIN_EMAIL;
  const canUse = isAdmin || isPremium;
  const [pdfFile, setPdfFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("");
  const [result, setResult] = useState("");
  const [restaurantName, setRestaurantName] = useState("");
  const [city, setCity] = useState("");
  const [section, setSection] = useState("Intera carta");
  const [restaurantPdfs, setRestaurantPdfs] = useState([]);
  const [selectedRestaurant, setSelectedRestaurant] = useState(null);
  const [view, setView] = useState("upload"); // "upload" | "library"
  const [allRestaurants, setAllRestaurants] = useState([]);
  const fileRef = useRef();

  const inputStyle = {
    background: `${MUTED}55`, border: `1px solid ${GOLD}33`, borderRadius: 8,
    padding: "10px 14px", color: CREAM, fontFamily: "Georgia, serif",
    fontSize: 13, outline: "none", width: "100%", boxSizing: "border-box"
  };

  useEffect(() => { if (canUse) loadLibrary(); }, [canUse]);

  async function loadLibrary() {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/restaurant_pdfs?select=restaurant_name,city,created_at&order=restaurant_name.asc`, {
      headers: { "apikey": SUPABASE_KEY, "Authorization": `Bearer ${SUPABASE_KEY}` }
    });
    const data = await res.json();
    // Raggruppa per ristorante
    const grouped = {};
    (data || []).forEach(r => {
      if (!grouped[r.restaurant_name]) grouped[r.restaurant_name] = { name: r.restaurant_name, city: r.city, count: 0 };
      grouped[r.restaurant_name].count++;
    });
    setAllRestaurants(Object.values(grouped));
  }

  async function loadRestaurantPdfs(name) {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/restaurant_pdfs?restaurant_name=eq.${encodeURIComponent(name)}&order=created_at.desc`, {
      headers: { "apikey": SUPABASE_KEY, "Authorization": `Bearer ${SUPABASE_KEY}` }
    });
    const data = await res.json();
    setRestaurantPdfs(data || []);
    setSelectedRestaurant(name);
  }

  async function uploadToSupabase(file) {
    const fileName = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
    const res = await fetch(`${SUPABASE_URL}/storage/v1/object/pdf-menus/${fileName}`, {
      method: "POST",
      headers: { "Authorization": `Bearer ${SUPABASE_KEY}`, "apikey": SUPABASE_KEY, "Content-Type": "application/pdf", "x-upsert": "true" },
      body: file,
    });
    if (!res.ok) throw new Error("Upload fallito: " + await res.text());
    return `${SUPABASE_URL}/storage/v1/object/public/pdf-menus/${fileName}`;
  }

  async function analyzePdf() {
    if (!pdfFile) return;
    setLoading(true);
    setResult("");
    try {
      setStatus("📤 Caricamento PDF...");
      const pdfUrl = await uploadToSupabase(pdfFile);

      setStatus("🧠 Il sommelier sta analizzando...");
      const response = await fetch("/api/pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pdfUrl, restaurantName, sectionName: section }),
      });
      const data = await response.json();
      const analysisText = data.result || data.error || "Errore";
      setResult(analysisText);

      if (data.result) {
        setStatus("💾 Salvo nel database...");

        // Salva in restaurant_pdfs
        await fetch(`${SUPABASE_URL}/rest/v1/restaurant_pdfs`, {
          method: "POST",
          headers: { "apikey": SUPABASE_KEY, "Authorization": `Bearer ${SUPABASE_KEY}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            restaurant_name: restaurantName || "Sconosciuto",
            city: city || "",
            pdf_url: pdfUrl,
            section_name: section,
            analysis: analysisText,
            gem_score: extractScore(analysisText),
            uploaded_by: user?.email || "anonymous",
          }),
        });

        // Salva nel knowledge base
        await fetch("/api/knowledge", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "save",
            title: `Carta vini ${section} — ${restaurantName}${city ? ` (${city})` : ""}`,
            content: analysisText,
            category: "carta_vini",
            source: `PDF — ${restaurantName}`,
          }),
        });

        // Aggiorna mappa con geocodifica
        saveToMap(analysisText, pdfUrl);
        loadLibrary();
      }
      setStatus("");
    } catch (e) {
      setResult("Errore: " + e.message);
      setStatus("");
    }
    setLoading(false);
  }

  async function saveToMap(analysisText, pdfUrl) {
    try {
      let lat = null, lng = null;
      const query = encodeURIComponent(`${restaurantName} ${city}`.trim());
      const geoRes = await fetch(`https://nominatim.openstreetmap.org/search?q=${query}&format=json&limit=1`);
      const geoData = await geoRes.json();
      if (geoData[0]) { lat = parseFloat(geoData[0].lat); lng = parseFloat(geoData[0].lon); }
      await fetch(`${SUPABASE_URL}/rest/v1/map_restaurants`, {
        method: "POST",
        headers: { "apikey": SUPABASE_KEY, "Authorization": `Bearer ${SUPABASE_KEY}`, "Content-Type": "application/json", "Prefer": "resolution=merge-duplicates" },
        body: JSON.stringify({ name: restaurantName, city, address: city, lat, lng, wine_list_notes: analysisText?.slice(0, 800), photo_url: pdfUrl, reported_by: user?.email, gem_score: extractScore(analysisText) }),
      });
    } catch (e) { console.error(e); }
  }

  function extractScore(text) {
    const match = text?.match(/punteggio[:\s]+(\d+)/i) || text?.match(/(\d+)\s*\/\s*100/i);
    return match ? Math.min(100, parseInt(match[1])) : 50;
  }

  if (!canUse) {
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "60px 24px", textAlign: "center", gap: 20 }}>
        <div style={{ fontSize: 56 }}>📄</div>
        <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 28, fontWeight: 600, color: CREAM }}>Analisi Carta dei Vini</div>
        <div style={{ fontSize: 14, color: CREAM + "88", maxWidth: 320, lineHeight: 1.7 }}>Carica il PDF di qualsiasi carta. L'AI trova perle nascoste, vini overpriced e salva tutto per la community.</div>
        <button onClick={async () => { const r = await fetch("/api/checkout", { method: "POST" }); const d = await r.json(); if (d.url) window.location.href = d.url; }}
          style={{ padding: "14px 32px", borderRadius: 30, background: `linear-gradient(135deg, ${GOLD}, #A07830)`, border: "none", color: DARK, fontFamily: "'Cormorant Garamond', serif", fontSize: 16, fontWeight: 700, cursor: "pointer" }}>
          ⭐ Passa a Premium — €4.99/mese
        </button>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Header + toggle */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 26, fontWeight: 600, margin: 0, color: CREAM }}>📄 Analisi Carta dei Vini</h2>
          <p style={{ margin: "6px 0 0", fontSize: 13, color: CREAM + "66" }}>Ogni sezione viene salvata — l'AI impara da tutte le carte</p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={() => setView("upload")} style={{ padding: "8px 14px", borderRadius: 20, background: view === "upload" ? `linear-gradient(135deg, ${BURGUNDY}, #9B2335)` : `${MUTED}55`, border: "none", color: CREAM, fontSize: 12, cursor: "pointer" }}>📤 Carica</button>
          <button onClick={() => setView("library")} style={{ padding: "8px 14px", borderRadius: 20, background: view === "library" ? `linear-gradient(135deg, ${BURGUNDY}, #9B2335)` : `${MUTED}55`, border: "none", color: CREAM, fontSize: 12, cursor: "pointer" }}>📚 Libreria {allRestaurants.length > 0 ? `(${allRestaurants.length})` : ""}</button>
        </div>
      </div>

      {/* UPLOAD VIEW */}
      {view === "upload" && (
        <div style={{ background: `${MUTED}33`, borderRadius: 16, padding: 20, border: `1px solid ${GOLD}22` }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <input value={restaurantName} onChange={e => setRestaurantName(e.target.value)} placeholder="Nome ristorante *" style={inputStyle} />
              <input value={city} onChange={e => setCity(e.target.value)} placeholder="Città" style={inputStyle} />
            </div>
            <select value={section} onChange={e => setSection(e.target.value)} style={{ ...inputStyle, cursor: "pointer" }}>
              {SECTIONS.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <div onClick={() => fileRef.current?.click()} style={{ ...inputStyle, cursor: "pointer", display: "flex", alignItems: "center", gap: 10, minHeight: 44 }}>
              <span style={{ fontSize: 20 }}>📎</span>
              <span style={{ color: pdfFile ? GOLD : CREAM + "44" }}>
                {pdfFile ? `${pdfFile.name} (${(pdfFile.size / 1024 / 1024).toFixed(1)} MB)` : "Clicca per caricare il PDF..."}
              </span>
              <input ref={fileRef} type="file" accept=".pdf,application/pdf" onChange={e => { setPdfFile(e.target.files[0]); setResult(""); }} style={{ display: "none" }} />
            </div>
            <button onClick={analyzePdf} disabled={!pdfFile || loading || !restaurantName}
              style={{ padding: "14px", background: !pdfFile || loading || !restaurantName ? `${MUTED}88` : `linear-gradient(135deg, ${BURGUNDY}, #9B2335)`, border: "none", borderRadius: 10, color: CREAM, fontFamily: "'Cormorant Garamond', serif", fontSize: 16, fontWeight: 600, cursor: pdfFile && !loading && restaurantName ? "pointer" : "not-allowed" }}>
              {loading ? (status || "Analisi in corso...") : `Analizza ${section} →`}
            </button>
            {!restaurantName && <div style={{ fontSize: 12, color: GOLD + "88", textAlign: "center" }}>⚠️ Inserisci il nome del ristorante per salvare nella libreria</div>}
          </div>
        </div>
      )}

      {/* LIBRARY VIEW */}
      {view === "library" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {selectedRestaurant ? (
            <>
              <button onClick={() => { setSelectedRestaurant(null); setRestaurantPdfs([]); }} style={{ alignSelf: "flex-start", background: "none", border: `1px solid ${GOLD}33`, borderRadius: 20, padding: "6px 14px", color: GOLD + "88", fontSize: 12, cursor: "pointer" }}>← Tutti i ristoranti</button>
              <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 20, color: CREAM }}>{selectedRestaurant}</div>
              {restaurantPdfs.map(pdf => (
                <div key={pdf.id} style={{ background: `${MUTED}22`, borderRadius: 12, padding: 16, border: `1px solid ${GOLD}22` }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                    <div style={{ color: GOLD, fontSize: 14, fontWeight: 600 }}>📋 {pdf.section_name || "Carta completa"}</div>
                    <div style={{ fontSize: 12, color: CREAM + "44" }}>{new Date(pdf.created_at).toLocaleDateString("it-IT")}</div>
                  </div>
                  {pdf.gem_score && <div style={{ fontSize: 13, color: GOLD + "88", marginBottom: 8 }}>💎 Punteggio: {pdf.gem_score}/100</div>}
                  <div style={{ fontSize: 13, color: CREAM + "99", lineHeight: 1.7, whiteSpace: "pre-wrap" }}>{pdf.analysis?.slice(0, 400)}...</div>
                  <button onClick={() => { setResult(pdf.analysis); setView("upload"); }}
                    style={{ marginTop: 10, padding: "6px 14px", background: "transparent", border: `1px solid ${GOLD}33`, borderRadius: 20, color: GOLD + "88", fontSize: 12, cursor: "pointer" }}>
                    Vedi analisi completa →
                  </button>
                </div>
              ))}
              <button onClick={() => { setRestaurantName(selectedRestaurant); setView("upload"); }}
                style={{ padding: "12px", background: `${MUTED}55`, border: `1px solid ${GOLD}33`, borderRadius: 10, color: GOLD, fontSize: 14, cursor: "pointer", fontFamily: "'Cormorant Garamond', serif" }}>
                + Aggiungi un'altra sezione per {selectedRestaurant}
              </button>
            </>
          ) : (
            <>
              {allRestaurants.length === 0 && <div style={{ textAlign: "center", padding: 30, color: CREAM + "55" }}>Nessuna carta ancora caricata</div>}
              {allRestaurants.map(r => (
                <div key={r.name} onClick={() => loadRestaurantPdfs(r.name)}
                  style={{ background: `${MUTED}22`, borderRadius: 12, padding: 16, border: `1px solid ${GOLD}22`, cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <div style={{ color: CREAM, fontSize: 15, fontFamily: "'Cormorant Garamond', serif" }}>{r.name}</div>
                    {r.city && <div style={{ color: CREAM + "66", fontSize: 12, marginTop: 2 }}>📍 {r.city}</div>}
                  </div>
                  <div style={{ background: `${GOLD}22`, borderRadius: 20, padding: "4px 12px", color: GOLD, fontSize: 12 }}>
                    {r.count} {r.count === 1 ? "sezione" : "sezioni"}
                  </div>
                </div>
              ))}
            </>
          )}
        </div>
      )}

      {/* RISULTATI */}
      {result && (
        <div style={{ background: `${MUTED}22`, borderRadius: 16, padding: 20, border: `1px solid ${GOLD}22` }}>
          <div style={{ fontSize: 12, color: GOLD, letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: 14 }}>
            📊 {section} {restaurantName ? `— ${restaurantName}` : ""}
            {restaurantName && <span style={{ marginLeft: 10, color: "#4CAF50", fontSize: 11 }}>✅ Salvato nella libreria</span>}
          </div>
          <div style={{ fontSize: 14, color: CREAM, fontFamily: "Georgia, serif", lineHeight: 1.8, whiteSpace: "pre-wrap" }}>{result}</div>
          <button onClick={() => { setResult(""); setPdfFile(null); }}
            style={{ marginTop: 16, padding: "8px 16px", background: "transparent", border: `1px solid ${GOLD}33`, borderRadius: 20, color: GOLD + "88", fontSize: 12, cursor: "pointer" }}>
            Analizza un'altra sezione →
          </button>
        </div>
      )}
    </div>
  );
}
