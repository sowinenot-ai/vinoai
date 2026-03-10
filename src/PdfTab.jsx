import { useState } from "react";

const BURGUNDY = "#6B1A2A";
const GOLD = "#C9A84C";
const CREAM = "#F5ECD7";
const DARK = "#0D0A08";
const MUTED = "#3A2D28";

export default function PdfTab({ user, isPremium }) {
  const ADMIN_EMAIL = "lanzifederico09@gmail.com";
  const isAdmin = user?.email === ADMIN_EMAIL;
  const canUse = isAdmin || isPremium;

  const [pdfFile, setPdfFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState("");
  const [restaurantName, setRestaurantName] = useState("");

  const inputStyle = {
    background: `${MUTED}55`, border: `1px solid ${GOLD}33`, borderRadius: 8,
    padding: "10px 14px", color: CREAM, fontFamily: "Georgia, serif",
    fontSize: 13, outline: "none", width: "100%", boxSizing: "border-box"
  };

  async function analyzePdf() {
    if (!pdfFile) return;
    setLoading(true);
    setResult("");
    try {
      const base64 = await new Promise((res, rej) => {
        const reader = new FileReader();
        reader.onload = () => res(reader.result.split(",")[1]);
        reader.onerror = rej;
        reader.readAsDataURL(pdfFile);
      });
      const response = await fetch("/api/pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ base64, filename: pdfFile.name, restaurantName }),
      });
      const data = await response.json();
      setResult(data.result || data.error || "Errore nell'analisi");
    } catch (e) {
      setResult("Errore: " + e.message);
    }
    setLoading(false);
  }

  // Paywall per utenti free
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
            <div key={i} style={{ fontSize: 13, color: CREAM + "88", padding: "5px 0", display: "flex", gap: 8 }}>{f}</div>
          ))}
        </div>
        <button onClick={async () => { const r = await fetch("/api/checkout", { method: "POST" }); const d = await r.json(); if (d.url) window.location.href = d.url; }} style={{ padding: "14px 32px", borderRadius: 30, background: `linear-gradient(135deg, ${GOLD}, #A07830)`, border: "none", color: DARK, fontFamily: "'Cormorant Garamond', serif", fontSize: 16, fontWeight: 700, cursor: "pointer" }}>
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
          <input
            value={restaurantName}
            onChange={e => setRestaurantName(e.target.value)}
            placeholder="Nome del ristorante (opzionale)"
            style={inputStyle}
          />
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <label style={{ ...inputStyle, cursor: "pointer", display: "flex", alignItems: "center", gap: 10, flex: 1 }}>
              <span style={{ fontSize: 20 }}>📎</span>
              <span style={{ color: pdfFile ? GOLD : CREAM + "44" }}>
                {pdfFile ? pdfFile.name : "Clicca per caricare il PDF della carta vini..."}
              </span>
              <input type="file" accept=".pdf" onChange={e => { setPdfFile(e.target.files[0]); setResult(""); }} style={{ display: "none" }} />
            </label>
          </div>
          <button
            onClick={analyzePdf}
            disabled={!pdfFile || loading}
            style={{ padding: "14px", background: loading ? `${MUTED}88` : `linear-gradient(135deg, ${BURGUNDY}, #9B2335)`, border: "none", borderRadius: 10, color: CREAM, fontFamily: "'Cormorant Garamond', serif", fontSize: 16, fontWeight: 600, cursor: pdfFile && !loading ? "pointer" : "not-allowed", transition: "all 0.2s" }}
          >
            {loading ? "⏳ Analisi in corso..." : "Analizza la carta dei vini →"}
          </button>
        </div>
      </div>

      {loading && (
        <div style={{ padding: 24, textAlign: "center", color: GOLD, fontFamily: "Georgia, serif", fontStyle: "italic" }}>
          Il sommelier sta analizzando ogni bottiglia...
        </div>
      )}

      {result && (
        <div style={{ background: `${MUTED}22`, borderRadius: 16, padding: 20, border: `1px solid ${GOLD}22` }}>
          <div style={{ fontSize: 12, color: GOLD, letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: 14 }}>
            📊 Risultati Analisi {restaurantName ? `— ${restaurantName}` : ""}
          </div>
          <div style={{ fontSize: 14, color: CREAM, fontFamily: "Georgia, serif", lineHeight: 1.8, whiteSpace: "pre-wrap" }}>
            {result}
          </div>
          <button
            onClick={() => { setResult(""); setPdfFile(null); setRestaurantName(""); }}
            style={{ marginTop: 16, padding: "8px 16px", background: "transparent", border: `1px solid ${GOLD}33`, borderRadius: 20, color: GOLD + "88", fontSize: 12, cursor: "pointer", fontFamily: "Georgia, serif" }}
          >
            Analizza un'altra carta →
          </button>
        </div>
      )}
    </div>
  );
}
