import { useState, useRef, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";
import CommunityTab from "./CommunityTab";
import CellarTab from "./CellarTab";
import AdminPanel from "./AdminPanel";
import PdfTab from "./PdfTab";
import DiaryTab from "./DiaryTab";
import MapTab from "./MapTab";
import ExperiencesTab from "./ExperiencesTab";
import RestaurantIntel from "./RestaurantIntel";
import CantinTab from "./CantinTab";

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_KEY
);

const BURGUNDY = "#6B1A2A";
const GOLD = "#C9A84C";
const CREAM = "#F5ECD7";
const DARK = "#0D0A08";
const MUTED = "#3A2D28";
const FREE_LIMIT = 3;

const CELLAR_INIT = [
  { id: 1, name: "Barolo DOCG", producer: "Giacomo Conterno", year: 2017, region: "Piemonte", qty: 3, notes: "Aprire dal 2025" },
  { id: 2, name: "Brunello di Montalcino", producer: "Biondi-Santi", year: 2016, region: "Toscana", qty: 2, notes: "Grande annata" },
  { id: 3, name: "Amarone della Valpolicella", producer: "Dal Forno Romano", year: 2015, region: "Veneto", qty: 5, notes: "Per occasioni speciali" }
];

const Spinner = ({ text }) => (
  <div style={{ padding: "40px 20px", textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: 20 }}>
    <div style={{ width: 40, height: 40, border: `3px solid ${GOLD}22`, borderTop: `3px solid ${GOLD}`, borderRadius: "50%", animation: "spin 1s linear infinite" }} />
    <div style={{ color: GOLD, fontSize: 14, fontFamily: "'Cormorant Garamond', serif", letterSpacing: "0.05em" }}>{text}</div>
    <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
  </div>
);

export default function VinoAI({ user, isPremium, isGuest, guestQuestions, onGuestQuestion, onGuestSignup }) {
  const [mode, setMode] = useState("manual");
  const [label, setLabel] = useState("");
  const [price, setPrice] = useState("");
  const [image, setImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [tab, setTab] = useState("analizza");
  const [showAdmin, setShowAdmin] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const fileInputRef = useRef(null);

  const isAdmin = user?.email === "lanzifederico09@gmail.com";
  const guestLimitReached = isGuest && guestQuestions >= FREE_LIMIT;

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImage(file);
      const reader = new FileReader();
      reader.onloadend = () => setImagePreview(reader.result);
      reader.readAsDataURL(file);
    }
  };

  const analyze = async () => {
    if (guestLimitReached) {
      alert("Hai raggiunto il limite di prove gratuite. Registrati per continuare!");
      onGuestSignup();
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      let analysisData;
      if (mode === "manual") {
        const res = await fetch("/api/analyze", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ label, price })
        });
        analysisData = await res.json();
      } else {
        const formData = new FormData();
        formData.append("image", image);
        const res = await fetch("/api/vision", {
          method: "POST",
          body: formData
        });
        analysisData = await res.json();
      }
      
      setResult(analysisData);
      if (isGuest) onGuestQuestion();
    } catch (err) {
      setResult({ error: "Il sommelier è momentaneamente occupato. Riprova tra poco." });
    }
    setLoading(false);
  };

  const renderTab = () => {
    if (guestLimitReached && tab !== "analizza") {
      return (
        <div style={{ padding: 40, textAlign: "center", display: "flex", flexDirection: "column", gap: 20, alignItems: "center", justifyContent: "center", height: "60vh" }}>
           <div style={{ fontSize: 50 }}>🔐</div>
           <h2 style={{ fontFamily: "'Cormorant Garamond', serif", color: GOLD }}>Contenuto Esclusivo</h2>
           <p style={{ color: `${CREAM}88`, fontSize: 14 }}>Registrati gratuitamente per sbloccare la mappa dei locali, il diario e la community.</p>
           <button onClick={onGuestSignup} style={{ padding: "14px 24px", background: GOLD, border: "none", borderRadius: 12, color: DARK, fontWeight: "bold", cursor: "pointer" }}>
             REGISTRATI ORA
           </button>
        </div>
      );
    }

    switch(tab) {
      case "community": return <CommunityTab user={user} isPremium={isPremium} />;
      case "cantina": return <CantinTab user={user} isPremium={isPremium} />;
      case "mappa": return <MapTab user={user} isPremium={isPremium} />;
      case "pdf": return <PdfTab user={user} isPremium={isPremium} />;
      case "diario": return <DiaryTab user={user} isPremium={isPremium} />;
      case "esperienze": return <ExperiencesTab user={user} isPremium={isPremium} />;
      case "intel": return <RestaurantIntel user={user} isPremium={isPremium} />;
      default: return null;
    }
  };

  return (
    <div style={{ minHeight: "100vh", background: DARK, color: CREAM, fontFamily: "Georgia, serif", display: "flex", flexDirection: "column" }}>
      {/* Header */}
      <div style={{ padding: "20px", borderBottom: `1px solid ${GOLD}22`, display: "flex", justifyContent: "space-between", alignItems: "center", background: `${DARK}EE`, backdropFilter: "blur(10px)", position: "sticky", top: 0, zIndex: 1000 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ fontSize: 24 }}>🍷</div>
          <div>
            <h1 style={{ margin: 0, fontSize: 18, fontFamily: "'Cormorant Garamond', serif", color: GOLD, letterSpacing: "0.1em" }}>SO WINE NOT</h1>
            <div style={{ fontSize: 10, color: `${CREAM}66`, letterSpacing: "0.05em" }}>AI SOMMELIER</div>
          </div>
        </div>
        
        <div style={{ display: "flex", gap: 15, alignItems: "center" }}>
          {isAdmin && (
            <button onClick={() => setShowAdmin(true)} style={{ background: "none", border: `1px solid ${GOLD}44`, color: GOLD, padding: "6px 12px", borderRadius: 20, fontSize: 11, cursor: "pointer" }}>
              ⚙️ ADMIN
            </button>
          )}
          <button onClick={() => setIsMenuOpen(!isMenuOpen)} style={{ background: "none", border: "none", color: GOLD, fontSize: 24, cursor: "pointer" }}>☰</button>
        </div>
      </div>

      {/* Main Content */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", maxWidth: 600, margin: "0 auto", width: "100%" }}>
        {tab === "analizza" ? (
          <div style={{ padding: "24px" }}>
            {!loading && !result && (
              <>
                <div style={{ textAlign: "center", marginBottom: 32 }}>
                  <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 28, color: CREAM, marginBottom: 8 }}>Scova il Vero Valore</h2>
                  <p style={{ color: `${CREAM}88`, fontSize: 14, fontStyle: "italic" }}>Inserisci un vino per scoprire se è un affare o un sovrapprezzo.</p>
                </div>

                <div style={{ display: "flex", background: `${MUTED}33`, borderRadius: 12, padding: 4, marginBottom: 24, border: `1px solid ${GOLD}11` }}>
                  <button onClick={() => setMode("manual")} style={{ flex: 1, padding: "10px", border: "none", borderRadius: 8, background: mode === "manual" ? GOLD : "none", color: mode === "manual" ? DARK : CREAM, fontSize: 13, fontWeight: 700, cursor: "pointer", transition: "all 0.3s" }}>✍️ Manuale</button>
                  <button onClick={() => setMode("photo")} style={{ flex: 1, padding: "10px", border: "none", borderRadius: 8, background: mode === "photo" ? GOLD : "none", color: mode === "photo" ? DARK : CREAM, fontSize: 13, fontWeight: 700, cursor: "pointer", transition: "all 0.3s" }}>📸 Foto</button>
                </div>

                {mode === "manual" ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: 16, marginBottom: 24 }}>
                    <input placeholder="Nome Vino, Produttore, Annata..." value={label} onChange={e => setLabel(e.target.value)} style={{ padding: "16px", borderRadius: 12, background: `${MUTED}33`, border: `1px solid ${GOLD}22`, color: CREAM, fontSize: 15 }} />
                    <input placeholder="Prezzo al ristorante (€)" type="number" value={price} onChange={e => setPrice(e.target.value)} style={{ padding: "16px", borderRadius: 12, background: `${MUTED}33`, border: `1px solid ${GOLD}22`, color: CREAM, fontSize: 15 }} />
                  </div>
                ) : (
                  <div style={{ marginBottom: 24, textAlign: "center" }}>
                    <button onClick={() => fileInputRef.current.click()} style={{ width: "100%", padding: "24px", borderRadius: 12, background: `${MUTED}33`, border: `2px dashed ${GOLD}44`, color: GOLD, fontFamily: "'Cormorant Garamond', serif", fontSize: 15, cursor: "pointer" }}>
                      {imagePreview ? "📸 Foto caricata — clicca per cambiare" : "📸 Fotografa la carta dei vini"}
                    </button>
                    {imagePreview && <img src={imagePreview} alt="Carta" style={{ borderRadius: 12, maxHeight: 200, objectFit: "cover", border: `1px solid ${GOLD}33`, marginTop: 12, width: "100%" }} />}
                    <input type="file" accept="image/*" capture="environment" hidden ref={fileInputRef} onChange={handleImageChange} />
                  </div>
                )}

                <button onClick={analyze} disabled={loading || (mode === "manual" && (!label || !price)) || (mode === "photo" && !image)} style={{ width: "100%", padding: "16px", background: `linear-gradient(135deg, #8B6914, ${GOLD})`, border: "none", borderRadius: 12, color: DARK, fontFamily: "'Cormorant Garamond', serif", fontSize: 16, fontWeight: 700, cursor: "pointer", letterSpacing: "0.05em", opacity: loading ? 0.6 : 1 }}>
                  {loading ? "💎 Analisi in corso..." : "💎 Trova le Perle Nascoste"}
                </button>
                
                {isGuest && (
                  <div style={{ marginTop: 20, textAlign: "center", color: GOLD, fontSize: 12, fontWeight: 600, letterSpacing: "0.05em" }}>
                    PROVE RIMANENTI: {Math.max(0, FREE_LIMIT - guestQuestions)}
                  </div>
                )}
              </>
            )}

            {loading && <Spinner text="Il sommelier analizza il valore del vino..." />}

            {result && !loading && (
              <div style={{ animation: "fadeIn 0.5s ease-out" }}>
                <div style={{ background: `${MUTED}44`, borderRadius: 20, border: `1px solid ${GOLD}33`, padding: "24px", marginBottom: 20 }}>
                   <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
                     <h3 style={{ margin: 0, color: GOLD, fontSize: 22, fontFamily: "'Cormorant Garamond', serif", flex: 1 }}>{result.wine_name}</h3>
                     <div style={{ background: result.gem_score >= 70 ? BURGUNDY : MUTED, padding: "8px 12px", borderRadius: 12, textAlign: "center", minWidth: 60 }}>
                       <div style={{ fontSize: 10, color: `${CREAM}88` }}>SCORE</div>
                       <div style={{ fontSize: 20, fontWeight: 800, color: result.gem_score >= 70 ? "#FFB5C2" : GOLD }}>{result.gem_score}</div>
                     </div>
                   </div>

                   <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 20 }}>
                     <div style={{ padding: 12, background: `${DARK}44`, borderRadius: 12, border: `1px solid ${GOLD}11` }}>
                       <div style={{ fontSize: 10, color: `${CREAM}66` }}>AL RISTORANTE</div>
                       <div style={{ fontSize: 18, color: CREAM, fontWeight: 700 }}>€{result.restaurant_price}</div>
                     </div>
                     <div style={{ padding: 12, background: `${DARK}44`, borderRadius: 12, border: `1px solid ${GOLD}11` }}>
                       <div style={{ fontSize: 10, color: `${CREAM}66` }}>VALORE RETAIL</div>
                       <div style={{ fontSize: 18, color: GOLD, fontWeight: 700 }}>€{result.retail_price}</div>
                     </div>
                   </div>

                   <div style={{ fontSize: 14, color: `${CREAM}CC`, lineHeight: 1.6, padding: 15, background: `${GOLD}08`, borderRadius: 12, fontStyle: "italic" }}>
                     "{result.notes}"
                   </div>
                </div>
                <button onClick={() => { setResult(null); setLabel(""); setPrice(""); setImage(null); setImagePreview(null); }} style={{ width: "100%", padding: "16px", background: "none", border: `1px solid ${GOLD}44`, borderRadius: 12, color: GOLD, cursor: "pointer" }}>Analizza un altro vino</button>
              </div>
            )}
          </div>
        ) : renderTab()}
      </div>

      {/* Admin Panel Overlay */}
      {showAdmin && <AdminPanel user={user} onClose={() => setShowAdmin(false)} />}

      {/* Navigation Bar */}
      <div style={{ padding: "10px 5px", borderTop: `1px solid ${GOLD}22`, display: "flex", justifyContent: "space-around", background: `${DARK}F5`, backdropFilter: "blur(15px)", position: "sticky", bottom: 0, zIndex: 1000, paddingBottom: "calc(10px + env(safe-area-inset-bottom))" }}>
        {[
          { id: "analizza", icon: "💎", label: "Analizza" },
          { id: "mappa", icon: "📍", label: "Mappa" },
          { id: "diario", icon: "📖", label: "Diario" },
          { id: "community", icon: "🥂", label: "Feed" },
          { id: "cantina", icon: "📦", label: "Cantina" }
        ].map(t => (
          <button
            key={t.id}
            onClick={() => { if (!guestLimitReached || t.id === "analizza") { setTab(t.id); setResult(null); } }}
            style={{ background: "none", border: "none", display: "flex", flexDirection: "column", alignItems: "center", gap: 4, cursor: guestLimitReached && t.id !== "analizza" ? "not-allowed" : "pointer", opacity: tab === t.id ? 1 : guestLimitReached && t.id !== "analizza" ? 0.15 : 0.4, transition: "all 0.2s" }}>
            <span style={{ fontSize: 20 }}>{t.icon}</span>
            <span style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase", color: GOLD }}>{t.label}</span>
          </button>
        ))}
      </div>

      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </div>
  );
}