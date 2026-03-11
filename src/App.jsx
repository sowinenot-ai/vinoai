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
  { id: 3, name: "Amarone della Valpolicella", producer: "Dal Forno Romano", year: 2015, region: "Veneto", qty: 1, notes: "Regalo speciale" },
];

const SUGGESTIONS = [
  { icon: "🍝", text: "Che vino abbino alla pasta al tartufo?" },
  { icon: "📸", text: "Analizza questo vino: Barolo Brunate 2018 Ceretto" },
  { icon: "🎁", text: "Consigliami un vino da regalo sotto i 30€" },
  { icon: "🌡️", text: "Quando aprire un Amarone della Valpolicella 2015?" },
  { icon: "🇫🇷", text: "Differenza tra Borgogna e Barolo?" },
  { icon: "🥩", text: "Miglior vino per una bistecca fiorentina?" },
];

async function askClaude(messages, onChunk) {
  const res = await fetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ messages }),
  });
  if (!res.ok) throw new Error("Errore server");
  const reader = res.body.getReader();
  const decoder = new TextDecoder("utf-8", { fatal: false });
  let fullText = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) {
      const last = decoder.decode(new Uint8Array(0), { stream: false });
      if (last) { fullText += last; if (onChunk) onChunk(fullText); }
      break;
    }
    const chunk = decoder.decode(value, { stream: true });
    fullText += chunk;
    if (onChunk) onChunk(fullText);
  }
  return fullText;
}

async function analyzeGem(payload) {
  const res = await fetch("/api/gems", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (data.error) throw new Error(data.error);
  return data.reply;
}

function Spinner({ text = "Il sommelier sta riflettendo..." }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, color: GOLD, fontFamily: "'Cormorant Garamond', serif", fontStyle: "italic" }}>
      <div style={{ width: 18, height: 18, border: `2px solid ${GOLD}`, borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
      {text}
    </div>
  );
}

function ChatBubble({ msg }) {
  // (wineAction handled in parent)
  const isUser = msg.role === "user";
  return (
    <div style={{ display: "flex", justifyContent: isUser ? "flex-end" : "flex-start", marginBottom: 16, animation: "fadeUp 0.3s ease" }}>
      {!isUser && (
        <div style={{ width: 36, height: 36, borderRadius: "50%", background: `linear-gradient(135deg, ${BURGUNDY}, #9B2335)`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, flexShrink: 0, marginRight: 10, marginTop: 2, border: `1px solid ${GOLD}33` }}>🍷</div>
      )}
      <div style={{ maxWidth: "72%", background: isUser ? `linear-gradient(135deg, ${BURGUNDY}, #9B2335)` : `${MUTED}88`, border: `1px solid ${isUser ? BURGUNDY : GOLD + "33"}`, borderRadius: isUser ? "18px 18px 4px 18px" : "18px 18px 18px 4px", padding: "12px 16px", color: isUser ? CREAM : "#E8D9BF", fontFamily: "Georgia, serif", fontSize: 14.5, lineHeight: 1.75, backdropFilter: "blur(8px)" }}>
        {msg.image && <img src={msg.image} alt="carta vini" style={{ maxWidth: "100%", borderRadius: 8, marginBottom: 8, display: "block" }} />}
        {msg.content.split("\n").map((line, i) => (
          <span key={i}>{line}{i < msg.content.split("\n").length - 1 && <br />}</span>
        ))}
      </div>
    </div>
  );
}

function TabButton({ active, onClick, children, icon, badge }) {
  return (
    <button onClick={onClick} style={{ display: "flex", alignItems: "center", gap: 6, padding: "10px 18px", borderRadius: 30, background: active ? `linear-gradient(135deg, ${BURGUNDY}, #9B2335)` : "transparent", border: `1px solid ${active ? BURGUNDY : GOLD + "44"}`, color: active ? CREAM : GOLD + "99", fontFamily: "'Cormorant Garamond', serif", fontSize: 14, fontWeight: active ? 600 : 400, cursor: "pointer", transition: "all 0.25s ease", letterSpacing: "0.04em", position: "relative" }}>
      <span>{icon}</span> {children}
      {badge && <span style={{ position: "absolute", top: -6, right: -6, background: GOLD, color: DARK, fontSize: 10, fontWeight: 700, borderRadius: "50%", width: 18, height: 18, display: "flex", alignItems: "center", justifyContent: "center" }}>{badge}</span>}
    </button>
  );
}

export default function VinoAI({ user, supabase, isPremium = false }) {
  const [tab, setTab] = useState("chat");
  const [messages, setMessages] = useState([{ role: "assistant", content: "Benvenuto. Sono il tuo sommelier personale. Chiedimi tutto sul mondo del vino: abbinamenti, annate, cantine, o cosa aprire stasera." }]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [chatImage, setChatImage] = useState(null); // { base64, preview }
  const imageInputRef = useRef();
  const [cellar, setCellar] = useState(CELLAR_INIT);
  const [newWine, setNewWine] = useState({ name: "", producer: "", year: "", region: "", qty: 1, notes: "" });
  const [addingWine, setAddingWine] = useState(false);
  const [cellarAdvice, setCellarAdvice] = useState("");
  const [cellarLoading, setCellarLoading] = useState(false);
  const [gemAnalyses, setGemAnalyses] = useState(0);
  const [showAdmin, setShowAdmin] = useState(false);
  const [geoWelcome, setGeoWelcome] = useState("");
  const [geoCity, setGeoCity] = useState("");
  const [showIntel, setShowIntel] = useState(false);
  const [wineAction, setWineAction] = useState(null); // { wineName, advice }
  const bottomRef = useRef();

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, loading]);

  useEffect(() => {
    navigator.geolocation?.getCurrentPosition(async pos => {
      try {
        const { latitude: lat, longitude: lng } = pos.coords;
        const r = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`);
        const d = await r.json();
        const city = d.address?.city || d.address?.town || d.address?.village || d.address?.county || "";
        const region = d.address?.state || "";
        if (city) {
          setGeoCity(`${city}${region ? `, ${region}` : ""}`);
          setGeoWelcome(`📍 Vedo che sei a ${city}${region ? `, ${region}` : ""} — scopri i migliori ristoranti vicino a te nella Mappa!`);
        }
      } catch (e) {}
    }, () => {});
  }, []);

  async function handleImageUpload(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const base64 = ev.target.result.split(",")[1];
      const preview = ev.target.result;
      setChatImage({ base64, preview, mediaType: file.type, file });
    };
    reader.readAsDataURL(file);
  }

  async function saveMenuPhotoToMap(imageToSend, analysisText) {
    try {
      // 1. Upload foto su Supabase Storage
      const fileName = `menu-${Date.now()}.jpg`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("menu-photos")
        .upload(fileName, imageToSend.file, { contentType: imageToSend.mediaType, upsert: true });
      if (uploadError) { console.error("Upload error:", uploadError); return; }

      const { data: urlData } = supabase.storage.from("menu-photos").getPublicUrl(fileName);
      const photoUrl = urlData.publicUrl;

      // 2. Chiedi all'AI di estrarre nome ristorante e città dalla foto
      const extractRes = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [{
            role: "user",
            content: [
              { type: "image", source: { type: "base64", media_type: imageToSend.mediaType, data: imageToSend.base64 } },
              { type: "text", text: "Guarda questa carta dei vini. Rispondi SOLO con un JSON così: {\"name\": \"nome ristorante o hotel\", \"city\": \"città\", \"found\": true}. Se non riesci a identificare il ristorante: {\"found\": false}" }
            ]
          }],
          jsonMode: true
        }),
      });
      const extractData = await extractRes.json();
      let info = null;
      try { info = JSON.parse(extractData.reply || extractData.result || "{}"); } catch {}

      if (!info?.found || !info?.name) return;

      // 3. Geocodifica città → lat/lng
      let lat = null, lng = null;
      try {
        const geoRes = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(info.city || info.name)}&format=json&limit=1`);
        const geoData = await geoRes.json();
        if (geoData[0]) { lat = parseFloat(geoData[0].lat); lng = parseFloat(geoData[0].lon); }
      } catch {}

      // 4. Salva in map_restaurants
      await supabase.from("map_restaurants").upsert({
        name: info.name,
        city: info.city || "",
        address: info.city || "",
        lat,
        lng,
        wine_list_notes: analysisText?.slice(0, 500) || "",
        photo_url: photoUrl,
        reported_by: user?.email || "anonymous",
        gem_score: 50,
      }, { onConflict: "name" });

      console.log("✅ Ristorante salvato in mappa:", info.name);
    } catch (e) {
      console.error("Errore salvataggio mappa:", e);
    }
  }

  async function sendMessage(text) {
    const userText = text || input.trim();
    if ((!userText && !chatImage) || loading) return;
    setInput("");
    const imageToSend = chatImage;
    setChatImage(null);

    const userMsg = {
      role: "user",
      content: userText || "Analizza questa carta dei vini e dimmi le perle nascoste",
      image: imageToSend ? imageToSend.preview : null,
    };
    const newMsgs = [...messages, userMsg];
    setMessages(newMsgs);
    setLoading(true);
    try {
      const apiMsgs = newMsgs.map(m => {
        if (m.image && imageToSend) {
          return {
            role: "user",
            content: [
              { type: "image", source: { type: "base64", media_type: imageToSend.mediaType, data: imageToSend.base64 } },
              { type: "text", text: m.content }
            ]
          };
        }
        return { role: m.role, content: m.content };
      });
      // Aggiungi messaggio vuoto e aggiornalo in streaming
      setMessages(prev => [...prev, { role: "assistant", content: "" }]);
      const reply = await askClaude(apiMsgs, (partial) => {
        setMessages(prev => {
          const updated = [...prev];
          updated[updated.length - 1] = { role: "assistant", content: partial };
          return updated;
        });
      });

      // Salva foto e ristorante in mappa in background
      if (imageToSend) saveMenuPhotoToMap(imageToSend, reply);

      // Rileva se l'utente ha comprato un vino
      const userTextLower = userText.toLowerCase();
      const buyKeywords = ["ho comprato","comprato","ho preso","ho acquistato","ho trovato","ho portato a casa","ho preso una bottiglia","mi sono comprato"];
      const hasBought = buyKeywords.some(k => userTextLower.includes(k));
      if (hasBought) {
        // Estrai nome vino con AI
        try {
          const extractRes = await fetch("/api/chat", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              jsonMode: true,
              messages: [{ role: "user", content: `Dal testo: "${userText}" — estrai SOLO il nome del vino menzionato. Rispondi SOLO con JSON: {"wine":"nome vino","year":"annata o null"}` }]
            })
          });
          const extractData = await extractRes.json();
          const extracted = JSON.parse(extractData.reply || "{}");
          if (extracted.wine) {
            setWineAction({ wineName: extracted.wine, year: extracted.year, advice: reply });
          }
        } catch {}
      }

    } catch {
      setMessages(prev => [...prev, { role: "assistant", content: "Scusa, si è verificato un errore. Riprova." }]);
    }
    setLoading(false);
  }

  async function getCellarAdvice() {
    if (cellarLoading || cellar.length === 0) return;
    setCellarLoading(true);
    const wineList = cellar.map(w => `${w.name} ${w.year} di ${w.producer} (${w.region}), ${w.qty} bottiglie. Note: ${w.notes}`).join("; ");
    try {
      const reply = await askClaude([{ role: "user", content: `Sono il proprietario di questa cantina: ${wineList}. Dammi 3 consigli pratici su quando aprire queste bottiglie e come valorizzare al meglio la mia collezione.` }]);
      setCellarAdvice(reply);
    } catch { setCellarAdvice("Errore nel recupero dei consigli."); }
    setCellarLoading(false);
  }

  function addWine() {
    if (!newWine.name || !newWine.year) return;
    setCellar(prev => [...prev, { ...newWine, id: Date.now(), year: parseInt(newWine.year), qty: parseInt(newWine.qty) || 1 }]);
    setNewWine({ name: "", producer: "", year: "", region: "", qty: 1, notes: "" });
    setAddingWine(false);
  }

  const inputStyle = { background: `${MUTED}55`, border: `1px solid ${GOLD}33`, borderRadius: 8, padding: "8px 12px", color: CREAM, fontFamily: "Georgia, serif", fontSize: 13, outline: "none", width: "100%", boxSizing: "border-box" };
  const remaining = Math.max(0, FREE_LIMIT - gemAnalyses);

  return (
    <div style={{ minHeight: "100vh", background: DARK, backgroundImage: `radial-gradient(ellipse at 20% 20%, #2A0A1488 0%, transparent 60%), radial-gradient(ellipse at 80% 80%, #1A0A0566 0%, transparent 60%)`, fontFamily: "Georgia, serif", color: CREAM, display: "flex", flexDirection: "column" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,600;1,300;1,400&display=swap');
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadeUp { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes shimmer { 0%,100% { opacity: 0.6; } 50% { opacity: 1; } }
        @keyframes pulse { 0%,100% { transform: scale(1); } 50% { transform: scale(1.02); } }
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: ${GOLD}44; border-radius: 2px; }
        textarea:focus, input:focus { border-color: ${GOLD}88 !important; }
        button:hover { opacity: 0.85; transform: translateY(-1px); }
      `}</style>

      <header style={{ padding: "24px 32px 16px", borderBottom: `1px solid ${GOLD}22`, background: `linear-gradient(180deg, #1A0A0888 0%, transparent 100%)`, backdropFilter: "blur(12px)", position: "sticky", top: 0, zIndex: 10 }}>
        <div style={{ maxWidth: 800, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ fontSize: 28, width: 48, height: 48, display: "flex", alignItems: "center", justifyContent: "center", background: `linear-gradient(135deg, ${BURGUNDY}, #C0392B)`, borderRadius: 12, border: `1px solid ${GOLD}44`, boxShadow: `0 4px 20px ${BURGUNDY}66` }}>🍷</div>
            <div>
              <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 26, fontWeight: 600, letterSpacing: "0.08em", color: CREAM }}>VinoAI</div>
              <div style={{ fontSize: 10, color: GOLD, letterSpacing: "0.25em", textTransform: "uppercase", marginTop: -2 }}>Il tuo sommelier personale</div>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}><div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <div onClick={() => setShowAdmin(true)} style={{ padding: "4px 14px", borderRadius: 20, border: `1px solid ${GOLD}44`, fontSize: 11, color: GOLD, letterSpacing: "0.15em", textTransform: "uppercase", animation: "shimmer 2s ease infinite", cursor: "pointer" }}>✦ AI Attiva</div>
          </div><button onClick={async () => { const r = await fetch("/api/checkout", {method:"POST"}); const d = await r.json(); if(d.url) window.location.href = d.url; }} style={{ padding: "6px 14px", borderRadius: 20, background: `linear-gradient(135deg, ${GOLD}, #A07830)`, border: "none", color: DARK, fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "'Cormorant Garamond', serif", letterSpacing: "0.1em" }}>⭐ Premium</button>
          <button onClick={async () => { await supabase.auth.signOut(); window.location.reload(); }} style={{ padding: "6px 12px", borderRadius: 20, background: "transparent", border: `1px solid ${CREAM}22`, color: CREAM + "55", fontSize: 11, cursor: "pointer", fontFamily: "'Cormorant Garamond', serif" }}>Esci</button></div>
        </div>
      </header>

      <div style={{ padding: "16px 32px 0", maxWidth: 800, margin: "0 auto", width: "100%" }}>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <TabButton active={tab === "chat"} onClick={() => setTab("chat")} icon="💬">Sommelier</TabButton>
          <TabButton active={tab === "cellar"} onClick={() => setTab("cellar")} icon="🏺">Cantina</TabButton>
          <TabButton active={tab === "pairing"} onClick={() => setTab("pairing")} icon="🍽️">Abbinamenti</TabButton>
          <TabButton active={tab === "gems"} onClick={() => setTab("gems")} icon="💎" badge={remaining > 0 ? remaining : null}>Perle Nascoste</TabButton>
          <TabButton active={tab === "community"} onClick={() => setTab("community")} icon="🌍">Community</TabButton>
          <TabButton active={tab === "map"} onClick={() => setTab("map")} icon="🗺️">Mappa</TabButton>
          <TabButton active={tab === "experiences"} onClick={() => setTab("experiences")} icon="📖">Esperienze</TabButton>
          <TabButton active={tab === "pdf"} onClick={() => setTab("pdf")} icon="📄">Analisi PDF</TabButton>
          <TabButton active={tab === "diary"} onClick={() => setTab("diary")} icon="📔">Il Mio Diario</TabButton>
        </div>
      </div>

      {geoWelcome && (
        <div style={{ padding: "8px 32px 0", maxWidth: 800, margin: "0 auto", width: "100%" }}>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <div onClick={() => { setTab("map"); setGeoWelcome(""); }} style={{ flex: 1, padding: "9px 16px", background: "#6B1A2A44", borderRadius: 10, border: "1px solid #C9A84C33", fontSize: 12, color: "#C9A84C", cursor: "pointer" }}>
              {geoWelcome} — <span style={{ textDecoration: "underline" }}>Vai alla Mappa</span>
            </div>
            <button onClick={() => setShowIntel(true)} style={{ padding: "9px 14px", background: "linear-gradient(135deg, #6B1A2A, #9B2335)", border: "1px solid #C9A84C44", borderRadius: 10, color: "#F5ECD7", fontSize: 12, cursor: "pointer", whiteSpace: "nowrap", fontFamily: "Georgia, serif" }}>
              🔍 Cerca ristorante
            </button>
          </div>
        </div>
      )}

      <main style={{ flex: 1, padding: "20px 32px 32px", maxWidth: 800, margin: "0 auto", width: "100%", display: "flex", flexDirection: "column" }}>

        {tab === "chat" && (
          <div style={{ display: "flex", flexDirection: "column", flex: 1, gap: 16 }}>
            {messages.length <= 1 && (
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 8 }}>
                {SUGGESTIONS.map((s, i) => (
                  <button key={i} onClick={() => sendMessage(s.text)} style={{ padding: "8px 14px", borderRadius: 20, background: `${MUTED}66`, border: `1px solid ${GOLD}33`, color: CREAM + "CC", fontSize: 12, cursor: "pointer", fontFamily: "Georgia, serif", transition: "all 0.2s", display: "flex", alignItems: "center", gap: 6 }}>
                    {s.icon} {s.text}
                  </button>
                ))}
              </div>
            )}
            <div style={{ flex: 1, overflowY: "auto", padding: "16px", background: `${MUTED}22`, borderRadius: 16, border: `1px solid ${GOLD}11`, minHeight: 320, maxHeight: 460 }}>
              {messages.map((m, i) => <ChatBubble key={i} msg={m} />)}
              {loading && <div style={{ padding: "8px 0 0 46px" }}><Spinner /></div>}
              <div ref={bottomRef} />
            </div>

            {/* Banner acquisto vino */}
            {wineAction && (
              <div style={{ background: `linear-gradient(135deg, ${MUTED}88, ${MUTED}44)`, border: `1px solid ${GOLD}44`, borderRadius: 14, padding: "14px 16px", display: "flex", flexDirection: "column", gap: 10 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <div style={{ color: GOLD, fontSize: 14, fontWeight: 600 }}>🍾 {wineAction.wineName}{wineAction.year ? ` ${wineAction.year}` : ""}</div>
                    <div style={{ color: CREAM + "88", fontSize: 12, marginTop: 2 }}>Cosa vuoi fare con questa bottiglia?</div>
                  </div>
                  <button onClick={() => setWineAction(null)} style={{ background: "none", border: "none", color: CREAM + "44", cursor: "pointer", fontSize: 16 }}>✕</button>
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button onClick={() => {
                    setWineAction(null);
                    sendMessage(`Voglio bere stasera il ${wineAction.wineName}${wineAction.year ? " " + wineAction.year : ""}. È il momento giusto? Con cosa lo abbino?`);
                  }} style={{ flex: 1, padding: "10px", borderRadius: 10, background: `linear-gradient(135deg, ${BURGUNDY}, #9B2335)`, border: "none", color: CREAM, fontFamily: "'Cormorant Garamond', serif", fontSize: 14, cursor: "pointer" }}>
                    🍷 Beviamolo stasera
                  </button>
                  <button onClick={async () => {
                    setWineAction(null);
                    // Aggiungi in cantina via Supabase
                    const SURL = import.meta.env.VITE_SUPABASE_URL || "https://qnawdmghgwgvhzqzarrw.supabase.co";
                    const SKEY = import.meta.env.VITE_SUPABASE_KEY;
                    await fetch(`${SURL}/rest/v1/cellar`, {
                      method: "POST",
                      headers: { "apikey": SKEY, "Authorization": `Bearer ${SKEY}`, "Content-Type": "application/json" },
                      body: JSON.stringify({ user_email: user?.email, name: wineAction.wineName, year: wineAction.year ? parseInt(wineAction.year) : null, qty: 1 })
                    });
                    sendMessage(`Ho messo in cantina il ${wineAction.wineName}${wineAction.year ? " " + wineAction.year : ""}. Quando sarà al meglio? Quanto tempo posso aspettare?`);
                  }} style={{ flex: 1, padding: "10px", borderRadius: 10, background: `${GOLD}22`, border: `1px solid ${GOLD}44`, color: GOLD, fontFamily: "'Cormorant Garamond', serif", fontSize: 14, cursor: "pointer" }}>
                    🏺 Metti in cantina
                  </button>
                </div>
              </div>
            )}

            <div style={{ display: "flex", gap: 10, alignItems: "flex-end" }}>
              {chatImage && (
                <div style={{ position: "relative" }}>
                  <img src={chatImage.preview} alt="preview" style={{ width: 52, height: 52, objectFit: "cover", borderRadius: 10, border: `2px solid ${GOLD}` }} />
                  <button onClick={() => setChatImage(null)} style={{ position: "absolute", top: -6, right: -6, background: BURGUNDY, border: "none", borderRadius: "50%", width: 18, height: 18, color: CREAM, fontSize: 10, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>✕</button>
                </div>
              )}
              <textarea value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } }} placeholder={chatImage ? "Aggiungi un messaggio (opzionale)..." : "Chiedi al tuo sommelier..."} rows={2} style={{ ...inputStyle, resize: "none", flex: 1, padding: "12px 16px", borderRadius: 12, lineHeight: 1.5, fontSize: 14 }} />
              <input ref={imageInputRef} type="file" accept="image/*" capture="environment" onChange={handleImageUpload} style={{ display: "none" }} />
              <button onClick={() => imageInputRef.current?.click()} title="Fotografa la carta dei vini" style={{ padding: "12px 14px", borderRadius: 12, background: chatImage ? `linear-gradient(135deg, ${GOLD}, #A07830)` : `${MUTED}88`, border: `1px solid ${GOLD}44`, color: CREAM, cursor: "pointer", fontSize: 18, flexShrink: 0 }}>📷</button>
              <button onClick={() => sendMessage()} disabled={loading || (!input.trim() && !chatImage)} style={{ padding: "12px 22px", borderRadius: 12, background: loading || (!input.trim() && !chatImage) ? `${MUTED}88` : `linear-gradient(135deg, ${BURGUNDY}, #9B2335)`, border: `1px solid ${BURGUNDY}`, color: CREAM, cursor: loading ? "not-allowed" : "pointer", fontFamily: "'Cormorant Garamond', serif", fontSize: 15, transition: "all 0.2s", whiteSpace: "nowrap" }}>Invia →</button>
            </div>
          </div>
        )}

        {tab === "cellar" && <CellarTab user={user} isPremium={isPremium} />}

        {tab === "pairing" && <PairingTab askClaude={askClaude} />}
        {tab === "gems" && <GemsTab analyzeGem={analyzeGem} gemAnalyses={gemAnalyses} setGemAnalyses={setGemAnalyses} freeLimit={FREE_LIMIT} />}
        {tab === "community" && <CommunityTab askClaude={askClaude} />}
        {tab === "map" && <MapTab user={user} isPremium={isPremium} />}
        {tab === "experiences" && <ExperiencesTab user={user} />}
        {tab === "pdf" && <PdfTab user={user} isPremium={isPremium} />}
        {tab === "diary" && <DiaryTab user={user} />}

      </main>

      {showIntel && <RestaurantIntel city={geoCity} onClose={() => setShowIntel(false)} />}
      {showAdmin && <AdminPanel user={user} onClose={() => setShowAdmin(false)} />}
    </div>
  );
}

function PairingTab({ askClaude }) {
  const [food, setFood] = useState(""); const [result, setResult] = useState(""); const [loading, setLoading] = useState(false); const [mode, setMode] = useState("food");
  const FOOD_EXAMPLES = ["Pasta al tartufo bianco", "Ossobuco alla milanese", "Salmone al forno", "Tiramisù", "Pizza Margherita"];
  const WINE_EXAMPLES = ["Barolo 2016", "Pinot Grigio del Trentino", "Chianti Classico Riserva", "Prosecco di Valdobbiadene"];
  async function getPairing() {
    if (!food.trim() || loading) return; setLoading(true); setResult("");
    try { setResult(await askClaude([{ role: "user", content: mode === "food" ? `Suggerisci i 3 vini ideali da abbinare a: "${food}". Per ognuno: nome specifico, produttore consigliato, prezzo indicativo e motivo dell'abbinamento.` : `Ho il vino: "${food}". Suggerisci 4 piatti perfetti da abbinare, con una breve spiegazione per ognuno.` }])); } catch { setResult("Errore. Riprova."); }
    setLoading(false);
  }
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div><h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 24, fontWeight: 600, margin: "0 0 6px", color: CREAM }}>Abbinamenti Perfetti</h2><p style={{ margin: 0, fontSize: 13, color: CREAM + "66", fontStyle: "italic" }}>Dì cosa mangi e ti suggerisco il vino. O viceversa.</p></div>
      <div style={{ display: "flex", background: `${MUTED}44`, borderRadius: 10, padding: 4, border: `1px solid ${GOLD}22` }}>
        {[{ key: "food", label: "🍽️  Ho un piatto" }, { key: "wine", label: "🍷  Ho un vino" }].map(m => (
          <button key={m.key} onClick={() => { setMode(m.key); setFood(""); setResult(""); }} style={{ flex: 1, padding: "9px", borderRadius: 7, background: mode === m.key ? `linear-gradient(135deg, ${BURGUNDY}, #9B2335)` : "transparent", border: "none", color: mode === m.key ? CREAM : CREAM + "66", fontFamily: "'Cormorant Garamond', serif", fontSize: 14, cursor: "pointer" }}>{m.label}</button>
        ))}
      </div>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>{(mode === "food" ? FOOD_EXAMPLES : WINE_EXAMPLES).map((ex, i) => (<button key={i} onClick={() => setFood(ex)} style={{ padding: "6px 12px", borderRadius: 16, background: food === ex ? `${BURGUNDY}88` : `${MUTED}55`, border: `1px solid ${food === ex ? BURGUNDY : GOLD + "22"}`, color: CREAM + "CC", fontSize: 12, cursor: "pointer", fontFamily: "Georgia, serif" }}>{ex}</button>))}</div>
      <div style={{ display: "flex", gap: 10 }}>
        <input value={food} onChange={e => setFood(e.target.value)} onKeyDown={e => e.key === "Enter" && getPairing()} placeholder={mode === "food" ? "Es: Tagliatelle al ragù..." : "Es: Amarone 2015..."} style={{ flex: 1, background: `${MUTED}55`, border: `1px solid ${GOLD}33`, borderRadius: 10, padding: "12px 16px", color: CREAM, fontFamily: "Georgia, serif", fontSize: 14, outline: "none" }} />
        <button onClick={getPairing} disabled={loading || !food.trim()} style={{ padding: "12px 22px", borderRadius: 10, background: loading || !food.trim() ? `${MUTED}88` : `linear-gradient(135deg, ${BURGUNDY}, #9B2335)`, border: `1px solid ${BURGUNDY}`, color: CREAM, fontFamily: "'Cormorant Garamond', serif", fontSize: 15, cursor: "pointer" }}>{loading ? "..." : "Abbina →"}</button>
      </div>
      {loading && <Spinner text="Selezione abbinamento in corso..." />}
      {result && <div style={{ background: `${MUTED}44`, borderRadius: 16, padding: 24, border: `1px solid ${GOLD}33`, borderLeft: `3px solid ${GOLD}`, color: "#E8D9BF", fontSize: 14, lineHeight: 1.8, fontFamily: "Georgia, serif", whiteSpace: "pre-wrap" }}>{result}</div>}
    </div>
  );
}

function GemsTab({ analyzeGem, gemAnalyses, setGemAnalyses, freeLimit }) {
  const [mode, setMode] = useState("manual");
  const [label, setLabel] = useState(""); const [vintage, setVintage] = useState(""); const [price, setPrice] = useState("");
  const [image, setImage] = useState(null); const [imagePreview, setImagePreview] = useState(null);
  const [result, setResult] = useState(""); const [loading, setLoading] = useState(false);
  const fileRef = useRef();
  const remaining = Math.max(0, freeLimit - gemAnalyses);
  const isPremium = gemAnalyses >= freeLimit;

  function handlePhoto(e) {
    const file = e.target.files[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => { setImage(ev.target.result.split(",")[1]); setImagePreview(ev.target.result); };
    reader.readAsDataURL(file);
  }

  async function analyze() {
    if (isPremium || loading) return;
    if (mode === "manual" && (!label || !price)) return;
    if (mode === "photo" && !image) return;
    setLoading(true); setResult("");
    try {
      const payload = mode === "photo" ? { imageBase64: image } : { label, vintage: parseInt(vintage) || new Date().getFullYear(), price: parseFloat(price) };
      setResult(await analyzeGem(payload));
      setGemAnalyses(prev => prev + 1);
    } catch { setResult("Errore nell'analisi. Riprova."); }
    setLoading(false);
  }

  const iStyle = { background: `${MUTED}55`, border: `1px solid ${GOLD}33`, borderRadius: 8, padding: "10px 14px", color: CREAM, fontFamily: "Georgia, serif", fontSize: 14, outline: "none", width: "100%", boxSizing: "border-box" };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div>
        <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 24, fontWeight: 600, margin: "0 0 6px", color: CREAM }}>💎 Perle Nascoste</h2>
        <p style={{ margin: 0, fontSize: 13, color: CREAM + "66", fontStyle: "italic" }}>Sei al ristorante? Analizza la carta e scopri i vini con il miglior rapporto qualità-prezzo.</p>
      </div>

      <div style={{ padding: "12px 16px", borderRadius: 12, background: remaining > 0 ? `${MUTED}44` : `${BURGUNDY}33`, border: `1px solid ${remaining > 0 ? GOLD + "33" : BURGUNDY}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ fontSize: 13, color: remaining > 0 ? GOLD : "#FF8888" }}>
          {remaining > 0 ? `✦ ${remaining} analisi gratuite rimanenti su ${freeLimit}` : "⚠️ Analisi gratuite esaurite"}
        </div>
        {remaining === 0 && <button onClick={async () => { const r = await fetch("/api/checkout", {method:"POST"}); const d = await r.json(); if(d.url) window.location.href = d.url; }} style={{ padding: "6px 16px", borderRadius: 20, background: `linear-gradient(135deg, ${GOLD}, #A07830)`, border: "none", color: DARK, fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "'Cormorant Garamond', serif" }}>Passa a Premium →</button>}
      </div>

      {!isPremium && (
        <>
          <div style={{ display: "flex", background: `${MUTED}44`, borderRadius: 10, padding: 4, border: `1px solid ${GOLD}22` }}>
            {[{ key: "manual", label: "✏️  Digita manualmente" }, { key: "photo", label: "📸  Fotografa la carta" }].map(m => (
              <button key={m.key} onClick={() => { setMode(m.key); setResult(""); setImage(null); setImagePreview(null); }} style={{ flex: 1, padding: "9px", borderRadius: 7, background: mode === m.key ? `linear-gradient(135deg, ${BURGUNDY}, #9B2335)` : "transparent", border: "none", color: mode === m.key ? CREAM : CREAM + "66", fontFamily: "'Cormorant Garamond', serif", fontSize: 14, cursor: "pointer" }}>{m.label}</button>
            ))}
          </div>

          {mode === "manual" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <input value={label} onChange={e => setLabel(e.target.value)} placeholder="Nome del vino (es. Sassicaia 2019) *" style={iStyle} />
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <input value={vintage} onChange={e => setVintage(e.target.value)} placeholder="Annata" type="number" style={iStyle} />
                <input value={price} onChange={e => setPrice(e.target.value)} placeholder="Prezzo carta € *" type="number" style={iStyle} />
              </div>
            </div>
          )}

          {mode === "photo" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <input ref={fileRef} type="file" accept="image/*" capture="environment" onChange={handlePhoto} style={{ display: "none" }} />
              <button onClick={() => fileRef.current.click()} style={{ padding: "24px", borderRadius: 12, background: `${MUTED}33`, border: `2px dashed ${GOLD}44`, color: GOLD, fontFamily: "'Cormorant Garamond', serif", fontSize: 15, cursor: "pointer" }}>
                {imagePreview ? "📸 Foto caricata — clicca per cambiare" : "📸 Fotografa la carta dei vini"}
              </button>
              {imagePreview && <img src={imagePreview} alt="Carta" style={{ borderRadius: 12, maxHeight: 200, objectFit: "cover", border: `1px solid ${GOLD}33` }} />}
            </div>
          )}

          <button onClick={analyze} disabled={loading || (mode === "manual" && (!label || !price)) || (mode === "photo" && !image)} style={{ width: "100%", padding: "16px", background: `linear-gradient(135deg, #8B6914, ${GOLD})`, border: "none", borderRadius: 12, color: DARK, fontFamily: "'Cormorant Garamond', serif", fontSize: 16, fontWeight: 700, cursor: "pointer", letterSpacing: "0.05em", animation: "pulse 2s ease infinite", opacity: loading ? 0.6 : 1 }}>
            {loading ? "💎 Analisi in corso..." : "💎 Trova le Perle Nascoste"}
          </button>
        </>
      )}

      {loading && <Spinner text="Il sommelier analizza il valore del vino..." />}
      {result && <div style={{ background: `${MUTED}44`, borderRadius: 16, padding: 24, border: `1px solid ${GOLD}44`, borderLeft: `3px solid ${GOLD}`, color: "#E8D9BF", fontSize: 14, lineHeight: 1.9, fontFamily: "Georgia, serif", animation: "fadeUp 0.4s ease", whiteSpace: "pre-wrap" }}>{result}</div>}
    </div>
  );
}


