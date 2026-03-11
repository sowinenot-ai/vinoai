import { useState, useEffect, useRef } from "react";

const BURGUNDY = "#6B1A2A";
const GOLD = "#C9A84C";
const CREAM = "#F5ECD7";
const DARK = "#0D0A08";
const MUTED = "#3A2D28";
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || "https://qnawdmghgwgvhzqzarrw.supabase.co";
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_KEY;

const COLOR_MAP = {
  rosso: { icon: "🔴", label: "Rossi", bg: "#8B1A2F" },
  bianco: { icon: "🟡", label: "Bianchi", bg: "#8B7020" },
  rosé: { icon: "🌸", label: "Rosé", bg: "#8B3050" },
  bollicine: { icon: "🥂", label: "Bollicine", bg: "#4A6B8B" },
  dolce: { icon: "🍯", label: "Dolci & Dessert", bg: "#7B5B20" },
};

const inputStyle = {
  background: `${MUTED}55`, border: `1px solid ${GOLD}33`, borderRadius: 8,
  padding: "10px 14px", color: CREAM, fontFamily: "Georgia, serif",
  fontSize: 13, outline: "none", width: "100%", boxSizing: "border-box"
};

async function sbFetch(path, method = "GET", body = null) {
  const opts = {
    method,
    headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`, "Content-Type": "application/json" },
  };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, opts);
  return res.json();
}

export default function CellarTab({ user, isPremium }) {
  const [wines, setWines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [wineName, setWineName] = useState("");
  const [notification, setNotification] = useState(null);
  const [notifLoading, setNotifLoading] = useState(false);
  const [pairingDish, setPairingDish] = useState("");
  const [pairingResult, setPairingResult] = useState("");
  const [pairingLoading, setPairingLoading] = useState(false);
  const [activeSection, setActiveSection] = useState("cantina"); // cantina | pairing | notifiche | upload
  const [uploadFile, setUploadFile] = useState(null);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState("");
  const [expandedWine, setExpandedWine] = useState(null);
  const fileRef = useRef();

  useEffect(() => { loadWines(); }, [user]);

  async function loadWines() {
    if (!user?.email) return;
    setLoading(true);
    const data = await sbFetch(`cellar?user_email=eq.${encodeURIComponent(user.email)}&order=created_at.desc`);
    setWines(Array.isArray(data) ? data : []);
    setLoading(false);
  }

  async function addWineWithAI() {
    if (!wineName.trim()) return;
    setAiLoading(true);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jsonMode: true,
          messages: [{
            role: "user",
            content: `Analizza questo vino e rispondi SOLO con JSON valido, nessun testo prima o dopo:
{
  "name": "nome ufficiale del vino",
  "producer": "produttore/cantina",
  "year": anno numerico o null,
  "region": "regione/denominazione es. Barolo DOCG",
  "country": "paese es. Italia",
  "color": "rosso|bianco|rosé|bollicine|dolce",
  "grapes": "uvaggio es. Nebbiolo, oppure Sangiovese 80% Merlot 20%",
  "drink_from": anno da cui iniziare a bere (numero),
  "drink_until": anno entro cui bere al massimo (numero),
  "ai_score": punteggio potenziale 0-100 basato su produttore e annata,
  "notes": "breve nota su questo vino (1 frase)"
}

Vino da analizzare: "${wineName}"
Anno attuale: ${new Date().getFullYear()}`
          }]
        })
      });
      const raw = await res.text();
      let wineData;
      try {
        const clean = raw.replace(/```json|```/g, "").trim();
        wineData = JSON.parse(clean);
      } catch {
        wineData = { name: wineName, color: "rosso" };
      }

      const toSave = { ...wineData, user_email: user.email, qty: 1 };
      await sbFetch("cellar", "POST", toSave);
      await loadWines();
      setWineName("");
      setAdding(false);
    } catch (e) {
      console.error(e);
    }
    setAiLoading(false);
  }

  async function deleteWine(id) {
    await sbFetch(`cellar?id=eq.${id}`, "DELETE");
    setWines(w => w.filter(x => x.id !== id));
  }

  async function updateQty(id, delta) {
    const wine = wines.find(w => w.id === id);
    if (!wine) return;
    const newQty = Math.max(0, wine.qty + delta);
    if (newQty === 0) { deleteWine(id); return; }
    await sbFetch(`cellar?id=eq.${id}`, "PATCH", { qty: newQty });
    setWines(w => w.map(x => x.id === id ? { ...x, qty: newQty } : x));
  }

  async function getSmartNotification() {
    if (wines.length === 0) return;
    setNotifLoading(true);
    setNotification(null);
    try {
      // Prendi meteo e ora
      const hour = new Date().getHours();
      const month = new Date().getMonth() + 1;
      // Calcola fase lunare approssimativa
      const lunarDay = Math.round((Date.now() / 86400000 + 2451550.1) % 29.53);
      const lunarPhase = lunarDay < 7 ? "luna crescente" : lunarDay < 15 ? "luna piena" : lunarDay < 22 ? "luna calante" : "luna nuova";
      const timeOfDay = hour < 12 ? "mattina" : hour < 18 ? "pomeriggio" : hour < 22 ? "sera" : "notte";
      const season = month <= 2 || month === 12 ? "inverno" : month <= 5 ? "primavera" : month <= 8 ? "estate" : "autunno";

      const wineList = wines.map(w =>
        `${w.name} ${w.year || ""} - ${w.producer || ""} - ${w.color} - ${w.grapes || ""} - ${w.region || ""} - bere entro ${w.drink_until || "N/D"} - score AI: ${w.ai_score || "N/D"}`
      ).join("\n");

      let fullText = "";
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [{
            role: "user",
            content: `Sei un sommelier stellato. Analizza la mia cantina e dimmi QUALE vino aprire STASERA tenendo conto di:
- Ora: ${timeOfDay} (${hour}:00)
- Stagione: ${season}
- Fase lunare: ${lunarPhase} (nota: luna calante = ideale per vini tannici strutturati; luna crescente = ideale per vini freschi e bianchi)
- Mese: ${month}

La mia cantina:
${wineList}

Dimmi in modo appassionato e concreto: quale bottiglia aprire, perché ADESSO è il momento giusto, e cosa mangiarci insieme. Max 4 righe, tono caldo e diretto.`
          }]
        })
      });
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        fullText += decoder.decode(value);
        setNotification(fullText);
      }
    } catch (e) { console.error(e); }
    setNotifLoading(false);
  }

  async function getMichelinPairing() {
    if (!pairingDish.trim() || wines.length === 0) return;
    setPairingLoading(true);
    setPairingResult("");
    try {
      const wineList = wines.map(w =>
        `${w.name} ${w.year || ""} (${w.producer || ""}) - ${w.color} - ${w.grapes || ""} - ${w.region || ""}`
      ).join("\n");

      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [{
            role: "user",
            content: `Sei il sommelier di un ristorante 3 stelle Michelin. 
            
Il cliente sta mangiando: "${pairingDish}"

Dalla sua cantina personale:
${wineList}

Scegli IL vino perfetto per questo piatto spiegando il pairing in modo da sembrare un maestro: struttura, acidità, tannini, come si sposano con il piatto. Se nessun vino è perfetto, dì quello più vicino e perché. Sii preciso, appassionato, tecnico ma comprensibile. Max 5 righe.`
          }]
        })
      });
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let full = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        full += decoder.decode(value);
        setPairingResult(full);
      }
    } catch (e) { console.error(e); }
    setPairingLoading(false);
  }

  async function uploadPairingFile() {
    if (!uploadFile) return;
    setUploadLoading(true);
    setUploadStatus("📤 Caricamento...");
    try {
      // Upload su Supabase Storage
      const fileName = `pairing-${Date.now()}-${uploadFile.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
      const uploadRes = await fetch(`${SUPABASE_URL}/storage/v1/object/pdf-menus/${fileName}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${SUPABASE_KEY}`, apikey: SUPABASE_KEY, "Content-Type": "application/pdf", "x-upsert": "true" },
        body: uploadFile,
      });
      if (!uploadRes.ok) throw new Error("Upload fallito");
      const pdfUrl = `${SUPABASE_URL}/storage/v1/object/public/pdf-menus/${fileName}`;

      setUploadStatus("🧠 L'AI sta studiando i pairing...");
      const res = await fetch("/api/pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pdfUrl, restaurantName: "Knowledge Pairing", sectionName: "Pairing Michelin" }),
      });
      const data = await res.json();

      // Salva nel knowledge base
      setUploadStatus("💾 Salvo nel knowledge base...");
      await fetch("/api/knowledge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "save",
          title: `Pairing Guide — ${uploadFile.name}`,
          content: data.result || "",
          category: "pairing",
          source: `Upload — ${uploadFile.name}`,
        }),
      });

      setUploadStatus("✅ Salvato! L'AI ora conosce questi pairing.");
      setUploadFile(null);
    } catch (e) {
      setUploadStatus("❌ Errore: " + e.message);
    }
    setUploadLoading(false);
  }

  // Raggruppa vini per colore
  const grouped = {};
  wines.forEach(w => {
    const color = w.color || "rosso";
    if (!grouped[color]) grouped[color] = [];
    grouped[color].push(w);
  });

  const totalBottles = wines.reduce((a, b) => a + (b.qty || 1), 0);

  const sections = [
    { key: "cantina", icon: "🏺", label: "Cantina" },
    { key: "pairing", icon: "🍽️", label: "Pairing" },
    { key: "notifiche", icon: "🔔", label: "Quando aprire" },
    { key: "upload", icon: "📚", label: "Studia" },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 26, fontWeight: 600, margin: 0, color: CREAM }}>🏺 La mia Cantina</h2>
          <p style={{ margin: "4px 0 0", fontSize: 12, color: GOLD + "88" }}>{totalBottles} bottiglie · {wines.length} etichette</p>
        </div>
        {activeSection === "cantina" && (
          <button onClick={() => setAdding(a => !a)}
            style={{ padding: "8px 18px", borderRadius: 20, background: adding ? `${MUTED}88` : `linear-gradient(135deg, ${BURGUNDY}, #9B2335)`, border: "none", color: CREAM, fontSize: 13, cursor: "pointer" }}>
            {adding ? "✕" : "+ Aggiungi"}
          </button>
        )}
      </div>

      {/* Nav sezioni */}
      <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 4 }}>
        {sections.map(s => (
          <button key={s.key} onClick={() => setActiveSection(s.key)}
            style={{ padding: "8px 16px", borderRadius: 20, background: activeSection === s.key ? `linear-gradient(135deg, ${BURGUNDY}, #9B2335)` : `${MUTED}44`, border: `1px solid ${activeSection === s.key ? BURGUNDY : GOLD + "22"}`, color: CREAM, fontSize: 12, cursor: "pointer", whiteSpace: "nowrap", flexShrink: 0 }}>
            {s.icon} {s.label}
          </button>
        ))}
      </div>

      {/* ===== CANTINA ===== */}
      {activeSection === "cantina" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>

          {/* Form aggiungi */}
          {adding && (
            <div style={{ background: `${MUTED}44`, borderRadius: 16, padding: 18, border: `1px solid ${GOLD}33` }}>
              <div style={{ fontSize: 13, color: GOLD + "88", marginBottom: 12 }}>Scrivi solo il nome del vino — l'AI compila tutto automaticamente ✨</div>
              <div style={{ display: "flex", gap: 8 }}>
                <input value={wineName} onChange={e => setWineName(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && addWineWithAI()}
                  placeholder="Es. Barolo Brunate 2018 Ceretto..." style={{ ...inputStyle, flex: 1 }} />
                <button onClick={addWineWithAI} disabled={aiLoading || !wineName.trim()}
                  style={{ padding: "10px 20px", borderRadius: 8, background: aiLoading || !wineName.trim() ? `${MUTED}88` : `linear-gradient(135deg, ${GOLD}, #8B6914)`, border: "none", color: DARK, fontWeight: 700, fontSize: 13, cursor: aiLoading ? "not-allowed" : "pointer", whiteSpace: "nowrap" }}>
                  {aiLoading ? "🧠..." : "Aggiungi →"}
                </button>
              </div>
              {aiLoading && (
                <div style={{ fontSize: 12, color: GOLD + "88", marginTop: 8 }}>🤖 L'AI sta analizzando il vino: uvaggio, zona, finestra di consumo...</div>
              )}
            </div>
          )}

          {/* Lista vini per colore */}
          {loading && <div style={{ textAlign: "center", padding: 30, color: CREAM + "44" }}>Caricamento cantina...</div>}
          {!loading && wines.length === 0 && (
            <div style={{ textAlign: "center", padding: 40, color: CREAM + "44" }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>🍾</div>
              <div>La tua cantina è vuota</div>
              <div style={{ fontSize: 12, marginTop: 6, color: CREAM + "33" }}>Aggiungi il tuo primo vino ↑</div>
            </div>
          )}

          {Object.entries(COLOR_MAP).map(([colorKey, colorInfo]) => {
            const group = grouped[colorKey];
            if (!group?.length) return null;
            return (
              <div key={colorKey}>
                <div style={{ fontSize: 11, color: GOLD, letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: 8 }}>
                  {colorInfo.icon} {colorInfo.label} ({group.length})
                </div>
                {group.map(w => (
                  <div key={w.id} style={{ background: `${MUTED}22`, borderRadius: 12, marginBottom: 8, border: `1px solid ${GOLD}18`, overflow: "hidden" }}>
                    {/* Riga principale */}
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 16px" }}>
                      <div onClick={() => setExpandedWine(expandedWine === w.id ? null : w.id)} style={{ flex: 1, cursor: "pointer" }}>
                        <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 16, fontWeight: 600, color: CREAM }}>
                          {w.name} {w.year && <span style={{ color: GOLD }}>{w.year}</span>}
                        </div>
                        <div style={{ fontSize: 12, color: GOLD + "88", marginTop: 2 }}>
                          {w.producer}{w.region ? ` · ${w.region}` : ""}
                        </div>
                        {w.grapes && <div style={{ fontSize: 11, color: CREAM + "55", marginTop: 2 }}>{w.grapes}</div>}
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        {/* Punteggio AI */}
                        {w.ai_score && (
                          <span style={{ fontSize: 11, color: w.ai_score >= 80 ? "#E84040" : w.ai_score >= 60 ? "#FF8C00" : GOLD, fontWeight: 700 }}>
                            {w.ai_score}/100
                          </span>
                        )}
                        {/* Qty */}
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          <button onClick={() => updateQty(w.id, -1)} style={{ width: 24, height: 24, borderRadius: "50%", background: `${MUTED}88`, border: `1px solid ${GOLD}33`, color: CREAM, cursor: "pointer", fontSize: 14, display: "flex", alignItems: "center", justifyContent: "center" }}>−</button>
                          <span style={{ color: GOLD, fontWeight: 700, fontSize: 14, minWidth: 16, textAlign: "center" }}>{w.qty}</span>
                          <button onClick={() => updateQty(w.id, 1)} style={{ width: 24, height: 24, borderRadius: "50%", background: `${MUTED}88`, border: `1px solid ${GOLD}33`, color: CREAM, cursor: "pointer", fontSize: 14, display: "flex", alignItems: "center", justifyContent: "center" }}>+</button>
                        </div>
                      </div>
                    </div>
                    {/* Dettaglio espandibile */}
                    {expandedWine === w.id && (
                      <div style={{ borderTop: `1px solid ${GOLD}11`, padding: "12px 16px", background: `${MUTED}11` }}>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, fontSize: 12 }}>
                          {w.country && <div style={{ color: CREAM + "88" }}>🌍 {w.country}</div>}
                          {w.drink_from && <div style={{ color: CREAM + "88" }}>📅 Bevi dal {w.drink_from}</div>}
                          {w.drink_until && <div style={{ color: w.drink_until <= new Date().getFullYear() ? "#E84040" : CREAM + "88" }}>⏳ Entro il {w.drink_until}</div>}
                          {w.grapes && <div style={{ color: CREAM + "88" }}>🍇 {w.grapes}</div>}
                        </div>
                        {w.notes && <div style={{ marginTop: 8, fontSize: 12, color: CREAM + "66", fontStyle: "italic" }}>"{w.notes}"</div>}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      )}

      {/* ===== PAIRING MICHELIN ===== */}
      {activeSection === "pairing" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ background: `${MUTED}33`, borderRadius: 16, padding: 20, border: `1px solid ${GOLD}22` }}>
            <div style={{ fontSize: 14, color: CREAM + "88", marginBottom: 14, lineHeight: 1.6 }}>
              Dicci cosa stai mangiando — troveremo il vino perfetto dalla tua cantina con la precisione di un sommelier Michelin ⭐⭐⭐
            </div>
            <textarea value={pairingDish} onChange={e => setPairingDish(e.target.value)}
              placeholder="Es. risotto ai funghi porcini con burro di malga e tartufo nero..."
              rows={3} style={{ ...inputStyle, resize: "none", marginBottom: 10 }} />
            <button onClick={getMichelinPairing} disabled={pairingLoading || !pairingDish.trim() || wines.length === 0}
              style={{ width: "100%", padding: "13px", borderRadius: 10, background: pairingLoading || !pairingDish.trim() || wines.length === 0 ? `${MUTED}88` : `linear-gradient(135deg, ${BURGUNDY}, #9B2335)`, border: "none", color: CREAM, fontFamily: "'Cormorant Garamond', serif", fontSize: 16, fontWeight: 600, cursor: "pointer" }}>
              {pairingLoading ? "🍷 Il sommelier sta scegliendo..." : "Trova il vino perfetto →"}
            </button>
            {wines.length === 0 && <div style={{ fontSize: 12, color: GOLD + "66", textAlign: "center", marginTop: 8 }}>⚠️ Aggiungi prima dei vini alla cantina</div>}
          </div>
          {pairingResult && (
            <div style={{ background: `${MUTED}22`, borderRadius: 14, padding: 20, border: `1px solid ${GOLD}33`, borderLeft: `3px solid ${GOLD}`, color: CREAM, fontSize: 14, lineHeight: 1.9, fontFamily: "Georgia, serif", whiteSpace: "pre-wrap" }}>
              {pairingResult}
            </div>
          )}
        </div>
      )}

      {/* ===== NOTIFICHE SMART ===== */}
      {activeSection === "notifiche" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ background: `${MUTED}33`, borderRadius: 16, padding: 20, border: `1px solid ${GOLD}22`, textAlign: "center" }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>🌙</div>
            <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 20, color: CREAM, marginBottom: 8 }}>Cosa aprire stasera?</div>
            <div style={{ fontSize: 13, color: CREAM + "66", marginBottom: 18, lineHeight: 1.6 }}>
              L'AI analizza la tua cantina tenendo conto di luna, stagione, ora e annate per dirti quale bottiglia è perfetta adesso
            </div>
            <button onClick={getSmartNotification} disabled={notifLoading || wines.length === 0}
              style={{ padding: "14px 32px", borderRadius: 30, background: notifLoading || wines.length === 0 ? `${MUTED}88` : `linear-gradient(135deg, ${BURGUNDY}, #9B2335)`, border: "none", color: CREAM, fontFamily: "'Cormorant Garamond', serif", fontSize: 16, fontWeight: 600, cursor: "pointer" }}>
              {notifLoading ? "🌙 Analisi astrale in corso..." : "✨ Dimmi cosa aprire"}
            </button>
            {wines.length === 0 && <div style={{ fontSize: 12, color: GOLD + "66", marginTop: 10 }}>⚠️ Aggiungi prima dei vini alla cantina</div>}
          </div>
          {notification && (
            <div style={{ background: `${MUTED}22`, borderRadius: 14, padding: 20, border: `1px solid ${GOLD}33`, borderLeft: `3px solid ${GOLD}`, color: CREAM, fontSize: 14, lineHeight: 1.9, fontFamily: "Georgia, serif", whiteSpace: "pre-wrap" }}>
              {notification}
            </div>
          )}
        </div>
      )}

      {/* ===== UPLOAD PAIRING FILES ===== */}
      {activeSection === "upload" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ background: `${MUTED}33`, borderRadius: 16, padding: 20, border: `1px solid ${GOLD}22` }}>
            <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 18, color: CREAM, marginBottom: 8 }}>📚 Insegna all'AI i tuoi pairing</div>
            <div style={{ fontSize: 13, color: CREAM + "66", marginBottom: 16, lineHeight: 1.7 }}>
              Carica guide di pairing, note di degustazione, libri, menu Michelin in PDF — l'AI li studia e migliora i suoi consigli per sempre
            </div>
            <div onClick={() => fileRef.current?.click()}
              style={{ ...inputStyle, cursor: "pointer", display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
              <span style={{ fontSize: 20 }}>📎</span>
              <span style={{ color: uploadFile ? GOLD : CREAM + "44" }}>
                {uploadFile ? `${uploadFile.name} (${(uploadFile.size / 1024 / 1024).toFixed(1)} MB)` : "Clicca per caricare PDF..."}
              </span>
              <input ref={fileRef} type="file" accept=".pdf" onChange={e => { setUploadFile(e.target.files[0]); setUploadStatus(""); }} style={{ display: "none" }} />
            </div>
            <button onClick={uploadPairingFile} disabled={!uploadFile || uploadLoading}
              style={{ width: "100%", padding: "13px", borderRadius: 10, background: !uploadFile || uploadLoading ? `${MUTED}88` : `linear-gradient(135deg, ${GOLD}, #8B6914)`, border: "none", color: DARK, fontFamily: "'Cormorant Garamond', serif", fontSize: 16, fontWeight: 700, cursor: !uploadFile || uploadLoading ? "not-allowed" : "pointer" }}>
              {uploadLoading ? (uploadStatus || "Caricamento...") : "Carica e studia →"}
            </button>
            {uploadStatus && !uploadLoading && (
              <div style={{ marginTop: 12, fontSize: 13, color: uploadStatus.startsWith("✅") ? "#4CAF88" : GOLD + "88", textAlign: "center" }}>
                {uploadStatus}
              </div>
            )}
          </div>
          <div style={{ fontSize: 12, color: CREAM + "33", lineHeight: 1.7, textAlign: "center" }}>
            Esempi: guide abbinamenti ALMA, note degustazione Marchesi, menu degustazione Le Calandre, libri di pairing...
          </div>
        </div>
      )}
    </div>
  );
}
