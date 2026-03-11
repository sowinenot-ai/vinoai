import { useState, useRef } from "react";

const BURGUNDY = "#6B1A2A";
const GOLD = "#C9A84C";
const CREAM = "#F5ECD7";
const DARK = "#0D0A08";
const MUTED = "#3A2D28";
const ADMIN_EMAIL = "lanzifederico09@gmail.com";
const SUPABASE_URL = "https://qnawdmghgwgvhzqzarrw.supabase.co";
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_KEY;

export default function PdfTab({ user, isPremium }) {
  const isAdmin = user?.email === ADMIN_EMAIL;
  const canUse = isAdmin || isPremium;
  const [pdfFile, setPdfFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("");
  const [result, setResult] = useState("");
  const [restaurantName, setRestaurantName] = useState("");
  const fileRef = useRef();

  const inputStyle = {
    background: `${MUTED}55`, border: `1px solid ${GOLD}33`, borderRadius: 8,
    padding: "10px 14px", color: CREAM, fontFamily: "Georgia, serif",
    fontSize: 13, outline: "none", width: "100%", boxSizing: "border-box"
  };

  async function uploadToSupabase(file) {
    const fileName = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
    const uploadUrl = `${SUPABASE_URL}/storage/v1/object/pdf-menus/${fileName}`;
    const res = await fetch(uploadUrl, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${SUPABASE_KEY}`,
        "apikey": SUPABASE_KEY,
        "Content-Type": "application/pdf",
        "x-upsert": "true",
      },
      body: file,
    });
    if (!res.ok) {
      const err = await res.text();
      throw new Error("Upload fallito: " + err);
    }
    return `${SUPABASE_URL}/storage/v1/object/public/pdf-menus/${fileName}`;
  }

  async function analyzePdf() {
    if (!pdfFile) return;
    setLoading(true);
    setResult("");
    try {
      setStatus("📤 Caricamento PDF su Supabase...");
      const publicUrl = await uploadToSupabase(pdfFile);
      console.log("PDF caricato:", publicUrl);

      setStatus("🧠 Il sommelier sta analizzando ogni bottiglia...");
      const response = await fetch("/api/pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pdfUrl: publicUrl, restaurantName }),
      });
      const data = await response.json();
      setResult(data.result || data.error || "Errore nell'analisi");
      setStatus("");
    } catch (e) {
      setResult("Errore: " + e.message);
      setStatus("");
    }
    setLoading(false);
  }

  if (!canUse) {
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "60px 24px", textAlign: "center", gap: 20 }}>
        <div style={{ fontSize: 56 }}>📄</div>
        <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 28, fontWeight: 600, color: CREAM }}>Analisi Carta dei Vini</div>
        <div style={{ fontSize: 14, color: CREAM + "88", maxWidth: 320, lineHeight: 1.7 }}>
          Carica il PDF di qualsiasi carta dei vini. L'AI identifica perle nascoste, vini overpriced e valuta la qualità complessiva.
        </div>
        <div style={{ background: `${MUTED}33`, borderRadius: 16, padding: 20, border: `1px solid ${GOLD}22`, maxWidth: 320, width: "100%", textAlign: "left" }}>
          {["💎 Perle nascoste con markup factor", "⚠️ Vini overpriced segnalati", "⭐ Highlights della carta", "📊 Punteggio qualità complessivo", "🍷 Consigli del sommelier AI"].map((f, i) => (
            <div key={i} style={{ fontSize: 13, color: CREAM + "88", padding: "5px 0" }}>{f}</div>
          ))}
        </div>
        <button onClick={async () => { const r = await fetch("/api/checkout", { method: "POST" }); const d = await r.json(); if (d.url) window.location.href = d.url; }}
          style={{ padding: "14px 32px", borderRadius: 30, background: `linear-gradient(135deg, ${GOLD}, #A07830)`, border: "none", color: DARK, fontFamily: "'Cormorant Garamond', serif", fontSize: 16, fontWeight: 700, cursor: "pointer" }}>
          ⭐ Passa a Premium — €4.99/mese
        </button>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div>
        <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 26, fontWeight: 600, margin: 0, color: CREAM }}>📄 Analisi Carta dei Vini</h2>
        <p style={{ margin: "6px 0 0", fontSize: 13, color: CREAM + "66" }}>Carica il PDF — l'AI trova le perle nascoste e i vini overpriced</p>
      </div>

      <div style={{ background: `${MUTED}33`, borderRadius: 16, padding: 20, border: `1px solid ${GOLD}22` }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <input value={restaurantName} onChange={e => setRestaurantName(e.target.value)}
            placeholder="Nome del ristorante (opzionale)" style={inputStyle} />
          
          <div onClick={() => fileRef.current?.click()}
            style={{ ...inputStyle, cursor: "pointer", display: "flex", alignItems: "center", gap: 10, minHeight: 44 }}>
            <span style={{ fontSize: 20 }}>📎</span>
            <span style={{ color: pdfFile ? GOLD : CREAM + "44" }}>
              {pdfFile ? `${pdfFile.name} (${(pdfFile.size / 1024 / 1024).toFixed(1)} MB)` : "Clicca per caricare il PDF della carta vini..."}
            </span>
            <input ref={fileRef} type="file" accept=".pdf,application/pdf"
              onChange={e => { setPdfFile(e.target.files[0]); setResult(""); }}
              style={{ display: "none" }} />
          </div>

          <button onClick={analyzePdf} disabled={!pdfFile || loading}
            style={{ padding: "14px", background: loading ? `${MUTED}88` : `linear-gradient(135deg, ${BURGUNDY}, #9B2335)`, border: "none", borderRadius: 10, color: CREAM, fontFamily: "'Cormorant Garamond', serif", fontSize: 16, fontWeight: 600, cursor: pdfFile && !loading ? "pointer" : "not-allowed" }}>
            {loading ? (status || "Analisi in corso...") : "Analizza la carta dei vini →"}
          </button>
        </div>
      </div>

      {result && (
        <div style={{ background: `${MUTED}22`, borderRadius: 16, padding: 20, border: `1px solid ${GOLD}22` }}>
          <div style={{ fontSize: 12, color: GOLD, letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: 14 }}>
            📊 Risultati Analisi {restaurantName ? `— ${restaurantName}` : ""}
          </div>
          <div style={{ fontSize: 14, color: CREAM, fontFamily: "Georgia, serif", lineHeight: 1.8, whiteSpace: "pre-wrap" }}>
            {result}
          </div>
          <button onClick={() => { setResult(""); setPdfFile(null); setRestaurantName(""); setStatus(""); }}
            style={{ marginTop: 16, padding: "8px 16px", background: "transparent", border: `1px solid ${GOLD}33`, borderRadius: 20, color: GOLD + "88", fontSize: 12, cursor: "pointer", fontFamily: "Georgia, serif" }}>
            Analizza un'altra carta →
          </button>
        </div>
      )}
    </div>
  );
}
