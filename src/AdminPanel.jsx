import { useState, useEffect } from "react";

const BURGUNDY = "#6B1A2A";
const GOLD = "#C9A84C";
const CREAM = "#F5ECD7";
const DARK = "#0D0A08";
const MUTED = "#3A2D28";

const CATEGORIES = [
  { key: "intervista", label: "🎤 Intervista" },
  { key: "degustazione", label: "🍷 Degustazione" },
  { key: "articolo", label: "📰 Articolo" },
  { key: "guida", label: "🗺️ Guida" },
];

async function callKnowledge(action, data) {
  const res = await fetch("/api/knowledge", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action, data }),
  });
  return res.json();
}

export default function AdminPanel({ user, onClose }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ title: "", content: "", category: "intervista", source: "" });
  const [saved, setSaved] = useState(false);
  const [activeTab, setActiveTab] = useState("testo");
  const [ytUrl, setYtUrl] = useState("");
  const [ytLoading, setYtLoading] = useState(false);
  const [ytResult, setYtResult] = useState(null);
  const [news, setNews] = useState({ title: "", content: "", source: "", date: "" });
  const [newsSaving, setNewsSaving] = useState(false);
  const [newsSaved, setNewsSaved] = useState(false);
  const [bookFile, setBookFile] = useState(null);
  const [bookTitle, setBookTitle] = useState("");
  const [bookAuthor, setBookAuthor] = useState("");
  const [bookLoading, setBookLoading] = useState(false);
  const [bookStatus, setBookStatus] = useState("");
  const [bookDone, setBookDone] = useState(false);

  useEffect(() => { loadItems(); }, []);

  async function loadItems() {
    setLoading(true);
    const res = await callKnowledge("list", {});
    setItems(res.items || []);
    setLoading(false);
  }

  async function saveItem() {
    if (!form.title || !form.content) return;
    setSaving(true);
    await callKnowledge("save", form);
    setForm({ title: "", content: "", category: "intervista", source: "" });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
    await loadItems();
    setSaving(false);
  }

  async function deleteItem(id) {
    await callKnowledge("delete", { id });
    await loadItems();
  }

  async function saveNews() {
    if (!news.title || !news.content) return;
    setNewsSaving(true);
    const dateStr = news.date || new Date().toLocaleDateString("it-IT");
    await callKnowledge("save", {
      title: `📰 NOTIZIA ${dateStr} — ${news.title}`,
      content: `${news.content}${news.source ? "\n\nFonte: " + news.source : ""}`,
      category: "notizia_vino",
      source: news.source || "Admin",
    });
    setNews({ title: "", content: "", source: "", date: "" });
    setNewsSaved(true);
    setTimeout(() => setNewsSaved(false), 2000);
    await loadItems();
    setNewsSaving(false);
  }

  async function saveBook() {
    if (!bookFile || !bookTitle) return;
    setBookLoading(true);
    setBookDone(false);
    try {
      setBookStatus("📤 Caricamento PDF...");
      const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || "https://qnawdmghgwgvhzqzarrw.supabase.co";
      const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_KEY;
      const fileName = `${Date.now()}-${bookFile.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
      const uploadRes = await fetch(`${SUPABASE_URL}/storage/v1/object/pdf-menus/books/${fileName}`, {
        method: "POST",
        headers: { "Authorization": `Bearer ${SUPABASE_KEY}`, "apikey": SUPABASE_KEY, "Content-Type": "application/pdf", "x-upsert": "true" },
        body: bookFile,
      });
      if (!uploadRes.ok) throw new Error("Upload fallito");
      const pdfUrl = `${SUPABASE_URL}/storage/v1/object/public/pdf-menus/books/${fileName}`;

      setBookStatus("🧠 L'AI sta leggendo il libro...");
      const res = await fetch("/api/pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pdfUrl, restaurantName: bookTitle, sectionName: "libro", isBook: true, bookAuthor }),
      });
      const data = await res.json();
      if (!data.result) throw new Error(data.error || "Errore analisi");

      setBookStatus("💾 Salvo nel knowledge base...");
      await callKnowledge("save", {
        title: `📚 ${bookTitle}${bookAuthor ? " — " + bookAuthor : ""}`,
        content: data.result,
        category: "libro_vino",
        source: bookAuthor || "Libro PDF",
      });

      setBookTitle(""); setBookAuthor(""); setBookFile(null);
      setBookDone(true);
      setBookStatus("");
      await loadItems();
    } catch (e) {
      setBookStatus("❌ Errore: " + e.message);
    }
    setBookLoading(false);
  }

  async function importYoutube() {
    if (!ytUrl.trim()) return;
    setYtLoading(true);
    setYtResult(null);
    try {
      const res = await fetch("/api/youtube", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: ytUrl }),
      });
      const data = await res.json();
      setYtResult(data);
      if (data.success) {
        setYtUrl("");
        await loadItems();
      }
    } catch (e) {
      setYtResult({ success: false, error: "Errore di rete" });
    }
    setYtLoading(false);
  }

  const inputStyle = { background: `${MUTED}55`, border: `1px solid ${GOLD}33`, borderRadius: 8, padding: "10px 14px", color: CREAM, fontFamily: "Georgia, serif", fontSize: 13, outline: "none", width: "100%", boxSizing: "border-box" };
  const labelStyle = { color: GOLD, fontSize: 11, fontWeight: "bold", textTransform: "uppercase", letterSpacing: 1, marginBottom: 6, display: "block" };
  const btnStyle = { background: GOLD, color: DARK, border: "none", borderRadius: 8, padding: "10px 20px", fontWeight: "bold", cursor: "pointer", fontFamily: "Georgia, serif", fontSize: 13 };
  const tabBtn = (id, label) => (
    <button 
      onClick={() => setActiveTab(id)}
      style={{ 
        background: activeTab === id ? `${GOLD}22` : "transparent",
        color: activeTab === id ? GOLD : `${CREAM}88`,
        border: `1px solid ${activeTab === id ? GOLD : "transparent"}`,
        borderRadius: 8, padding: "8px 16px", cursor: "pointer", fontSize: 13, fontWeight: activeTab === id ? "bold" : "normal", transition: "all 0.2s"
      }}>
      {label}
    </button>
  );

  const getCategoryIcon = (cat) => {
    if (cat === "notizia_vino") return "📰";
    if (cat === "libro_vino") return "📚";
    if (cat === "intervista") return "🎤";
    if (cat === "degustazione") return "🍷";
    if (cat === "articolo") return "📰";
    if (cat === "guida") return "🗺️";
    return "📄";
  };

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 1000, background: `${DARK}ee`, backdropFilter: "blur(12px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div style={{ width: "100%", maxWidth: 900, maxHeight: "90vh", background: DARK, border: `1px solid ${GOLD}33`, borderRadius: 24, display: "flex", flexDirection: "column", overflow: "hidden", boxShadow: `0 20px 50px rgba(0,0,0,0.5)` }}>
        
        {/* Header */}
        <div style={{ padding: "20px 30px", borderBottom: `1px solid ${GOLD}11`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <h2 style={{ color: GOLD, fontFamily: "'Cormorant Garamond', serif", fontSize: 24, margin: 0 }}>Knowledge Base Admin</h2>
            <div style={{ color: `${CREAM}66`, fontSize: 12 }}>Gestisci la mente del sommelier</div>
          </div>
          <button onClick={onClose} style={{ background: `${MUTED}44`, border: "none", color: CREAM, width: 32, height: 32, borderRadius: 16, cursor: "pointer" }}>✕</button>
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", gap: 8, padding: "15px 30px", borderBottom: `1px solid ${GOLD}11` }}>
          {tabBtn("testo", "✍️ Nuovo Testo")}
          {tabBtn("notizia", "📰 Notizia Flash")}
          {tabBtn("youtube", "📹 Da YouTube")}
          {tabBtn("libro", "📚 Carica Libro")}
        </div>

        <div style={{ flex: 1, overflowY: "auto", padding: 30 }}>
          
          {/* TAB: TESTO LIBERO */}
          {activeTab === "testo" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 15 }}>
                <div>
                  <label style={labelStyle}>Titolo</label>
                  <input style={inputStyle} value={form.title} onChange={e => setForm({...form, title: e.target.value})} placeholder="Es: Guida al Sangiovese" />
                </div>
                <div>
                  <label style={labelStyle}>Categoria</label>
                  <select style={inputStyle} value={form.category} onChange={e => setForm({...form, category: e.target.value})}>
                    {CATEGORIES.map(c => <option key={c.key} value={c.key}>{c.label}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label style={labelStyle}>Fonte / Autore</label>
                <input style={inputStyle} value={form.source} onChange={e => setForm({...form, source: e.target.value})} placeholder="Es: James Suckling" />
              </div>
              <div>
                <label style={labelStyle}>Contenuto</label>
                <textarea style={{ ...inputStyle, height: 200, resize: "none" }} value={form.content} onChange={e => setForm({...form, content: e.target.value})} placeholder="Incolla qui il testo..." />
              </div>
              <button onClick={saveItem} disabled={saving} style={{ ...btnStyle, opacity: saving ? 0.5 : 1 }}>
                {saving ? "Salvataggio..." : saved ? "✅ Salvato!" : "Salva Contenuto"}
              </button>
            </div>
          )}

          {/* TAB: NOTIZIA FLASH */}
          {activeTab === "notizia" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 15 }}>
                <div>
                  <label style={labelStyle}>Titolo Notizia</label>
                  <input style={inputStyle} value={news.title} onChange={e => setNews({...news, title: e.target.value})} placeholder="Es: Vendemmia 2024 record..." />
                </div>
                <div>
                  <label style={labelStyle}>Data (Opzionale)</label>
                  <input style={inputStyle} value={news.date} onChange={e => setNews({...news, date: e.target.value})} placeholder="Es: 15 Ottobre 2024" />
                </div>
              </div>
              <div>
                <label style={labelStyle}>Fonte Originale</label>
                <input style={inputStyle} value={news.source} onChange={e => setNews({...news, source: e.target.value})} placeholder="Es: Wine Spectator" />
              </div>
              <div>
                <label style={labelStyle}>Breve Riassunto Notizia</label>
                <textarea style={{ ...inputStyle, height: 120, resize: "none" }} value={news.content} onChange={e => setNews({...news, content: e.target.value})} placeholder="Incolla qui il contenuto della notizia..." />
              </div>
              <button onClick={saveNews} disabled={newsSaving} style={{ ...btnStyle, opacity: newsSaving ? 0.5 : 1 }}>
                {newsSaving ? "Pubblicazione..." : newsSaved ? "✅ Notizia Salvata!" : "Salva Notizia"}
              </button>
            </div>
          )}

          {/* TAB: YOUTUBE */}
          {activeTab === "youtube" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              <label style={labelStyle}>URL Video YouTube</label>
              <div style={{ display: "flex", gap: 10 }}>
                <input style={inputStyle} value={ytUrl} onChange={e => setYtUrl(e.target.value)} placeholder="https://www.youtube.com/watch?v=..." />
                <button onClick={importYoutube} disabled={ytLoading} style={{ ...btnStyle, whiteSpace: "nowrap" }}>
                  {ytLoading ? "Importazione..." : "Importa Trascrizione"}
                </button>
              </div>
              {ytResult && (
                <div style={{ padding: 15, borderRadius: 12, background: ytResult.success ? `${GOLD}11` : `${BURGUNDY}22`, color: ytResult.success ? CREAM : "#ff8888", fontSize: 13 }}>
                  {ytResult.success ? `✅ Video importato: ${ytResult.title}` : `❌ Errore: ${ytResult.error}`}
                </div>
              )}
              <div style={{ color: `${CREAM}44`, fontSize: 12, fontStyle: "italic" }}>
                L'AI scaricherà la trascrizione automatica, la pulirà e la aggiungerà alla base di conoscenza.
              </div>
            </div>
          )}

          {/* TAB: LIBRO PDF */}
          {activeTab === "libro" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 15 }}>
                <div>
                  <label style={labelStyle}>Titolo Libro</label>
                  <input style={inputStyle} value={bookTitle} onChange={e => setBookTitle(e.target.value)} placeholder="Es: Enciclopedia del Vino" />
                </div>
                <div>
                  <label style={labelStyle}>Autore</label>
                  <input style={inputStyle} value={bookAuthor} onChange={e => setBookAuthor(e.target.value)} placeholder="Es: Hugh Johnson" />
                </div>
              </div>
              <div>
                <label style={labelStyle}>File PDF (Max 50MB)</label>
                <input type="file" accept=".pdf" onChange={e => setBookFile(e.target.files[0])} style={{ ...inputStyle, padding: 8 }} />
              </div>
              
              <button onClick={saveBook} disabled={bookLoading || !bookFile || !bookTitle} style={{ ...btnStyle, opacity: (bookLoading || !bookFile || !bookTitle) ? 0.5 : 1 }}>
                {bookLoading ? "Elaborazione in corso..." : "Analizza e Salva Libro"}
              </button>

              {bookStatus && (
                <div style={{ padding: 15, borderRadius: 12, background: `${GOLD}11`, color: GOLD, fontSize: 13, textAlign: "center", border: `1px solid ${GOLD}22` }}>
                  {bookStatus}
                </div>
              )}
              {bookDone && !bookStatus && (
                <div style={{ padding: 15, borderRadius: 12, background: `${GOLD}22`, color: CREAM, fontSize: 13, textAlign: "center" }}>
                  ✅ Libro elaborato e aggiunto con successo!
                </div>
              )}
              <div style={{ color: `${CREAM}44`, fontSize: 11 }}>
                Nota: Il PDF verrà caricato, letto dall'AI (Vision/Text) e riassunto in blocchi logici ottimizzati per la ricerca.
              </div>
            </div>
          )}

          {/* LISTA ELEMENTI */}
          <div style={{ marginTop: 40, paddingTop: 30, borderTop: `1px solid ${GOLD}22` }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20, color: GOLD, fontWeight: "bold", fontSize: 12, letterSpacing: 1, textTransform: "uppercase" }}>
              Tutti i contenuti ({items.length})
            </div>
            {loading && <div style={{ color: `${CREAM}44`, fontSize: 13 }}>Caricamento...</div>}
            {items.length === 0 && !loading && (
              <div style={{ padding: 20, textAlign: "center", color: `${CREAM}44`, fontSize: 13, background: `${MUTED}22`, borderRadius: 12 }}>
                Nessun contenuto ancora. Inizia aggiungendo un testo, una notizia o un libro!
              </div>
            )}
            {items.map((item, i) => (
              <div key={i} style={{ padding: "12px 16px", background: `${MUTED}22`, borderRadius: 10, border: `1px solid ${GOLD}11`, marginBottom: 8, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 15, color: CREAM, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {getCategoryIcon(item.category)} {item.title}
                  </div>
                  <div style={{ fontSize: 11, color: `${GOLD}88`, marginTop: 2 }}>
                    {item.source} · {new Date(item.created_at).toLocaleDateString("it")}
                  </div>
                </div>
                <button onClick={() => deleteItem(item.id)} style={{ background: "none", border: "none", color: `${BURGUNDY}aa`, cursor: "pointer", fontSize: 18, padding: "0 10px" }}>×</button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
