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
  const [activeTab, setActiveTab] = useState("testo"); // testo | youtube
  const [ytUrl, setYtUrl] = useState("");
  const [ytLoading, setYtLoading] = useState(false);
  const [ytResult, setYtResult] = useState(null);
  const [news, setNews] = useState({ title: "", content: "", source: "", date: "" });
  const [newsSaving, setNewsSaving] = useState(false);
  const [newsSaved, setNewsSaved] = useState(false);
  const [book, setBook] = useState({ title: "", author: "", file: null });
  const [bookLoading, setBookLoading] = useState(false);
  const [bookStatus, setBookStatus] = useState("");
  const [bookRef, setBookRef] = useState(null);
  const [bookFile, setBookFile] = useState(null);
  const [bookTitle, setBookTitle] = useState("");
  const [bookAuthor, setBookAuthor] = useState("");
  const [bookLoading, setBookLoading] = useState(false);
  const [bookStatus, setBookStatus] = useState("");
  const [bookDone, setBookDone] = useState(false);
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
    setBookStatus("📤 Caricamento PDF...");
    const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || "https://qnawdmghgwgvhzqzarrw.supabase.co";
    const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_KEY;
    try {
      // Upload PDF su Supabase Storage
      const fileName = `${Date.now()}-${bookFile.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
      const uploadRes = await fetch(`${SUPABASE_URL}/storage/v1/object/pdf-menus/${fileName}`, {
        method: "POST",
        headers: { "Authorization": `Bearer ${SUPABASE_KEY}`, "apikey": SUPABASE_KEY, "Content-Type": "application/pdf", "x-upsert": "true" },
        body: bookFile,
      });
      if (!uploadRes.ok) throw new Error("Upload fallito");
      const pdfUrl = `${SUPABASE_URL}/storage/v1/object/public/pdf-menus/${fileName}`;
      setBookStatus("🧠 L'AI sta leggendo il libro...");
      // Analizza con Claude via api/pdf
      const analysisRes = await fetch("/api/pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pdfUrl, restaurantName: bookTitle, sectionName: "libro", isBook: true, bookAuthor }),
      });
      const analysisData = await analysisRes.json();
      if (!analysisData.result) throw new Error("Analisi fallita");
      setBookStatus("💾 Salvo nel knowledge base...");
      // Salva nel KB
      await callKnowledge("save", {
        title: `📚 ${bookTitle}${bookAuthor ? " — " + bookAuthor : ""}`,
        content: analysisData.result,
        category: "libro_vino",
        source: bookAuthor || "Libro",
      });
      setBookTitle("");
      setBookAuthor("");
      setBookFile(null);
      setBookDone(true);
      setBookStatus("");
      await loadItems();
    } catch (e) {
      setBookStatus("❌ Errore: " + e.message);
    }
    setBookLoading(false);
  }

  async function uploadBook() {
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
        body: JSON.stringify({
          pdfUrl,
          restaurantName: bookTitle,
          sectionName: "libro",
          isBook: true,
          bookAuthor,
        }),
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
    } catch(e) {
      setBookStatus("❌ Errore: " + e.message);
    }
    setBookLoading(false);
  }

  async function saveBook() {
    if (!book.file || !book.title) return;
    setBookLoading(true);
    setBookStatus("📤 Caricamento PDF...");
    try {
      const SURL = import.meta.env.VITE_SUPABASE_URL || "https://qnawdmghgwgvhzqzarrw.supabase.co";
      const SKEY = import.meta.env.VITE_SUPABASE_KEY;
      const fileName = Date.now() + "-" + book.file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
      const upRes = await fetch(`${SURL}/storage/v1/object/pdf-menus/${fileName}`, {
        method: "POST",
        headers: { "Authorization": `Bearer ${SKEY}`, "apikey": SKEY, "Content-Type": "application/pdf", "x-upsert": "true" },
        body: book.file,
      });
      if (!upRes.ok) throw new Error("Upload fallito");
      const pdfUrl = `${SURL}/storage/v1/object/public/pdf-menus/${fileName}`;
      setBookStatus("🧠 L'AI sta leggendo il libro...");
      const res = await fetch("/api/pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pdfUrl, restaurantName: book.title, sectionName: "libro" }),
      });
      const data = await res.json();
      if (data.result) {
        setBookStatus("💾 Salvo nel knowledge base...");
        await fetch("/api/knowledge", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "save",
            title: `📚 ${book.title}${book.author ? " — " + book.author : ""}`,
            content: data.result,
            category: "libro_vino",
            source: book.author || "Libro",
          }),
        });
        setBookStatus("✅ Libro acquisito! L'AI ora conosce questo contenuto.");
        setBook({ title: "", author: "", file: null });
        if (bookRef) bookRef.value = "";
        await loadItems();
      } else {
        setBookStatus("❌ Errore: " + (data.error || "sconosciuto"));
      }
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

  const inputStyle = {
    background: `${MUTED}55`, border: `1px solid ${GOLD}33`, borderRadius: 8,
    padding: "10px 14px", color: CREAM, fontFamily: "Georgia, serif",
    fontSize: 13, outline: "none", width: "100%", boxSizing: "border-box"
  };

  const getCategoryIcon = (cat) => {
    const icons = { intervista: "🎤", degustazione: "🍷", articolo: "📰", guida: "🗺️", video_youtube: "▶️" };
    return icons[cat] || "📄";
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;600&display=swap');`}</style>

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 24, fontWeight: 600, margin: 0, color: CREAM }}>🧠 Knowledge Base</h2>
          <p style={{ margin: "4px 0 0", fontSize: 12, color: `${GOLD}88` }}>{items.length} contenuti · L'AI impara da questi</p>
        </div>
        <button onClick={onClose} style={{ padding: "6px 14px", borderRadius: 20, background: "transparent", border: `1px solid ${GOLD}44`, color: GOLD, fontSize: 12, cursor: "pointer" }}>← Torna all'app</button>
      </div>

      {/* Tab selector */}
      <div style={{ display: "flex", background: `${MUTED}44`, borderRadius: 10, padding: 4, border: `1px solid ${GOLD}22` }}>
        {[{ key: "testo", label: "✍️ Testo" }, { key: "news", label: "📰 Notizie" }, { key: "libri", label: "📚 Libri PDF" }, { key: "youtube", label: "▶️ YouTube" }].map(t => (
          <button key={t.key} onClick={() => setActiveTab(t.key)} style={{ flex: 1, padding: "9px", borderRadius: 7, background: activeTab === t.key ? `linear-gradient(135deg, ${BURGUNDY}, #9B2335)` : "transparent", border: "none", color: activeTab === t.key ? CREAM : `${CREAM}66`, fontFamily: "Georgia, serif", fontSize: 13, cursor: "pointer", transition: "all 0.2s" }}>{t.label}</button>
        ))}
      </div>

      {/* Tab: Testo */}
      {activeTab === "testo" && (
        <div style={{ background: `${MUTED}33`, borderRadius: 16, padding: 20, border: `1px solid ${GOLD}22` }}>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 12 }}>
            {CATEGORIES.map(c => (
              <button key={c.key} onClick={() => setForm(f => ({ ...f, category: c.key }))} style={{ padding: "6px 12px", borderRadius: 20, background: form.category === c.key ? `linear-gradient(135deg, ${BURGUNDY}, #9B2335)` : `${MUTED}55`, border: `1px solid ${form.category === c.key ? BURGUNDY : `${GOLD}22`}`, color: CREAM, fontSize: 12, cursor: "pointer", fontFamily: "Georgia, serif" }}>{c.label}</button>
            ))}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Titolo (es. 'Intervista a Gaja sul Barbaresco')" style={inputStyle} />
            <input value={form.source} onChange={e => setForm(f => ({ ...f, source: e.target.value }))} placeholder="Fonte (es. 'Angelo Gaja', 'Gambero Rosso')" style={inputStyle} />
            <textarea value={form.content} onChange={e => setForm(f => ({ ...f, content: e.target.value }))} placeholder="Incolla qui il testo dell'intervista, nota di degustazione, o articolo..." rows={7} style={{ ...inputStyle, resize: "vertical", lineHeight: 1.6 }} />
            <button onClick={saveItem} disabled={saving || !form.title || !form.content} style={{ padding: "12px", background: saved ? "#2A7A2A" : `linear-gradient(135deg, ${GOLD}, #8B6914)`, border: "none", borderRadius: 10, color: DARK, fontFamily: "'Cormorant Garamond', serif", fontSize: 15, fontWeight: 700, cursor: "pointer", transition: "all 0.3s" }}>
              {saving ? "Salvataggio..." : saved ? "✓ Salvato!" : "Salva nel database →"}
            </button>
          </div>
        </div>
      )}

      {/* Tab: Notizie */}
      {activeTab === "news" && (
        <div style={{ background: `${MUTED}33`, borderRadius: 16, padding: 20, border: `1px solid ${GOLD}22` }}>
          <div style={{ fontSize: 12, color: GOLD + "88", marginBottom: 16, lineHeight: 1.6 }}>
            Aggiungi le ultime notizie del mondo del vino — l'AI le userà nelle conversazioni per essere sempre aggiornata.
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 10 }}>
              <input value={news.title} onChange={e => setNews(n => ({ ...n, title: e.target.value }))} placeholder="Titolo notizia (es. 'Barolo 2021: annata del secolo')" style={inputStyle} />
              <input value={news.date} onChange={e => setNews(n => ({ ...n, date: e.target.value }))} placeholder="Data (es. 11/03/2026)" style={{ ...inputStyle, width: 140 }} />
            </div>
            <textarea value={news.content} onChange={e => setNews(n => ({ ...n, content: e.target.value }))}
              placeholder="Scrivi o incolla il testo della notizia..." rows={6}
              style={{ ...inputStyle, resize: "vertical", lineHeight: 1.6 }} />
            <input value={news.source} onChange={e => setNews(n => ({ ...n, source: e.target.value }))} placeholder="Fonte (es. 'Decanter', 'Gambero Rosso', 'Wine Spectator')" style={inputStyle} />
            <button onClick={saveNews} disabled={newsSaving || !news.title || !news.content}
              style={{ padding: "12px", background: newsSaved ? "#2A7A2A" : `linear-gradient(135deg, ${GOLD}, #8B6914)`, border: "none", borderRadius: 10, color: DARK, fontFamily: "'Cormorant Garamond', serif", fontSize: 15, fontWeight: 700, cursor: "pointer" }}>
              {newsSaving ? "Salvataggio..." : newsSaved ? "✓ Notizia salvata!" : "📰 Pubblica notizia →"}
            </button>
          </div>
          {/* Ultime notizie salvate */}
          <div style={{ marginTop: 20 }}>
            <div style={{ fontSize: 11, color: GOLD, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 10 }}>Ultime notizie nel database</div>
            {items.filter(i => i.category === "notizia_vino").length === 0 && (
              <div style={{ color: CREAM + "44", fontSize: 13, fontStyle: "italic" }}>Nessuna notizia ancora pubblicata</div>
            )}
            {items.filter(i => i.category === "notizia_vino").slice(0, 5).map(item => (
              <div key={item.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: `1px solid ${GOLD}11` }}>
                <div style={{ color: CREAM + "CC", fontSize: 13 }}>{item.title?.replace(/^📰 NOTIZIA.*?— /, "")}</div>
                <button onClick={() => deleteItem(item.id)} style={{ background: "none", border: "none", color: CREAM + "33", cursor: "pointer", fontSize: 16, padding: "0 4px" }}>✕</button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab: Libri PDF */}
      {activeTab === "libri" && (
        <div style={{ background: `${MUTED}33`, borderRadius: 16, padding: 20, border: `1px solid ${GOLD}22` }}>
          <div style={{ fontSize: 12, color: GOLD + "88", marginBottom: 16, lineHeight: 1.6 }}>
            Carica libri digitali sul vino — Claude li legge, estrae tutto il sapere e lo salva nel database. L'AI impara automaticamente da ogni libro.
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <input value={bookTitle} onChange={e => setBookTitle(e.target.value)} placeholder="Titolo libro *" style={inputStyle} />
            <input value={bookAuthor} onChange={e => setBookAuthor(e.target.value)} placeholder="Autore (es. 'Jancis Robinson', 'Hugh Johnson')" style={inputStyle} />
            <div onClick={() => document.getElementById("bookFileInput").click()}
              style={{ ...inputStyle, cursor: "pointer", display: "flex", alignItems: "center", gap: 10, minHeight: 44 }}>
              <span style={{ fontSize: 20 }}>📎</span>
              <span style={{ color: bookFile ? GOLD : CREAM + "44" }}>
                {bookFile ? `${bookFile.name} (${(bookFile.size/1024/1024).toFixed(1)} MB)` : "Clicca per caricare il PDF..."}
              </span>
              <input id="bookFileInput" type="file" accept=".pdf,application/pdf"
                onChange={e => { setBookFile(e.target.files[0]); setBookDone(false); setBookStatus(""); }}
                style={{ display: "none" }} />
            </div>
            <div style={{ fontSize: 11, color: CREAM + "44", lineHeight: 1.5 }}>
              ⚠️ Max 100 pagine per PDF. Per libri più lunghi, dividi con ilovepdf.com e carica sezione per sezione.
            </div>
            <button onClick={saveBook} disabled={bookLoading || !bookFile || !bookTitle}
              style={{ padding: "12px", background: bookDone ? "#2A7A2A" : bookLoading ? `${MUTED}88` : `linear-gradient(135deg, ${GOLD}, #8B6914)`, border: "none", borderRadius: 10, color: bookLoading ? CREAM : DARK, fontFamily: "'Cormorant Garamond', serif", fontSize: 15, fontWeight: 700, cursor: bookLoading || !bookFile || !bookTitle ? "not-allowed" : "pointer" }}>
              {bookLoading ? (bookStatus || "Elaborazione...") : bookDone ? "✓ Libro salvato nel knowledge base!" : "📚 Carica e impara →"}
            </button>
          </div>

          {/* Libri salvati */}
          <div style={{ marginTop: 20 }}>
            <div style={{ fontSize: 11, color: GOLD, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 10 }}>Libri nel database</div>
            {items.filter(i => i.category === "libro_vino").length === 0 && (
              <div style={{ color: CREAM + "44", fontSize: 13, fontStyle: "italic" }}>Nessun libro ancora caricato</div>
            )}
            {items.filter(i => i.category === "libro_vino").map(item => (
              <div key={item.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: `1px solid ${GOLD}11` }}>
                <div>
                  <div style={{ color: CREAM + "CC", fontSize: 13 }}>{item.title}</div>
                  <div style={{ color: CREAM + "44", fontSize: 11, marginTop: 2 }}>{new Date(item.created_at).toLocaleDateString("it-IT")}</div>
                </div>
                <button onClick={() => deleteItem(item.id)} style={{ background: "none", border: "none", color: CREAM + "33", cursor: "pointer", fontSize: 16 }}>✕</button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab: Libri PDF */}
      {activeTab === "books" && (
        <div style={{ background: `${MUTED}33`, borderRadius: 16, padding: 20, border: `1px solid ${GOLD}22` }}>
          <div style={{ fontSize: 12, color: GOLD + "88", marginBottom: 16, lineHeight: 1.6 }}>
            Carica libri digitali sul vino — l'AI li legge, li riassume e impara da loro. Max 100 pagine per file (dividi con ilovepdf.com se necessario).
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <input value={bookTitle} onChange={e => setBookTitle(e.target.value)} placeholder="Titolo libro *" style={inputStyle} />
            <input value={bookAuthor} onChange={e => setBookAuthor(e.target.value)} placeholder="Autore (es. 'Jancis Robinson', 'Hugh Johnson')" style={inputStyle} />
            <div onClick={() => document.getElementById("bookFileInput").click()}
              style={{ ...inputStyle, cursor: "pointer", display: "flex", alignItems: "center", gap: 10, minHeight: 44 }}>
              <span style={{ fontSize: 20 }}>📎</span>
              <span style={{ color: bookFile ? GOLD : CREAM + "44" }}>
                {bookFile ? `${bookFile.name} (${(bookFile.size/1024/1024).toFixed(1)} MB)` : "Clicca per caricare il PDF..."}
              </span>
              <input id="bookFileInput" type="file" accept=".pdf,application/pdf"
                onChange={e => { setBookFile(e.target.files[0]); setBookDone(false); setBookStatus(""); }}
                style={{ display: "none" }} />
            </div>
            <button onClick={uploadBook} disabled={bookLoading || !bookFile || !bookTitle}
              style={{ padding: "12px", background: bookDone ? "#2A7A2A" : bookLoading ? `${MUTED}88` : `linear-gradient(135deg, ${GOLD}, #8B6914)`, border: "none", borderRadius: 10, color: bookLoading ? CREAM : DARK, fontFamily: "'Cormorant Garamond', serif", fontSize: 15, fontWeight: 700, cursor: bookLoading || !bookFile || !bookTitle ? "not-allowed" : "pointer" }}>
              {bookLoading ? (bookStatus || "Elaborazione...") : bookDone ? "✓ Libro salvato nel database!" : "📚 Carica e impara →"}
            </button>
            {bookStatus && !bookLoading && <div style={{ fontSize: 13, color: bookStatus.startsWith("❌") ? "#E84040" : GOLD, textAlign: "center" }}>{bookStatus}</div>}
          </div>

          {/* Libri salvati */}
          <div style={{ marginTop: 20 }}>
            <div style={{ fontSize: 11, color: GOLD, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 10 }}>
              Libri nel database ({items.filter(i => i.category === "libro_vino").length})
            </div>
            {items.filter(i => i.category === "libro_vino").length === 0 && (
              <div style={{ color: CREAM + "44", fontSize: 13, fontStyle: "italic" }}>Nessun libro ancora caricato</div>
            )}
            {items.filter(i => i.category === "libro_vino").map(item => (
              <div key={item.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: `1px solid ${GOLD}11` }}>
                <div>
                  <div style={{ color: CREAM + "CC", fontSize: 13 }}>{item.title?.replace("📚 ", "")}</div>
                  <div style={{ color: CREAM + "44", fontSize: 11, marginTop: 2 }}>{new Date(item.created_at).toLocaleDateString("it-IT")}</div>
                </div>
                <button onClick={() => deleteItem(item.id)} style={{ background: "none", border: "none", color: CREAM + "33", cursor: "pointer", fontSize: 16, padding: "0 4px" }}>✕</button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab: Libri & PDF */}
      {activeTab === "books" && (
        <div style={{ background: `${MUTED}33`, borderRadius: 16, padding: 20, border: `1px solid ${GOLD}22`, display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ fontSize: 12, color: GOLD + "88", lineHeight: 1.6 }}>
            Carica libri digitali sul vino, guide, manuali di degustazione — l'AI li legge e impara da ogni pagina.
            Max 100 pagine per PDF. Per libri più lunghi, dividi con ilovepdf.com
          </div>
          <input value={book.title} onChange={e => setBook(b => ({ ...b, title: e.target.value }))}
            placeholder="Titolo libro *" style={inputStyle} />
          <input value={book.author} onChange={e => setBook(b => ({ ...b, author: e.target.value }))}
            placeholder="Autore (es. 'Jancis Robinson', 'Hugh Johnson')" style={inputStyle} />
          <div onClick={() => document.getElementById("bookFileInput").click()}
            style={{ ...inputStyle, cursor: "pointer", display: "flex", alignItems: "center", gap: 10, minHeight: 44 }}>
            <span style={{ fontSize: 20 }}>📎</span>
            <span style={{ color: book.file ? GOLD : CREAM + "44" }}>
              {book.file ? `${book.file.name} (${(book.file.size/1024/1024).toFixed(1)} MB)` : "Clicca per selezionare il PDF..."}
            </span>
            <input id="bookFileInput" type="file" accept=".pdf,application/pdf"
              onChange={e => { setBook(b => ({ ...b, file: e.target.files[0] })); setBookStatus(""); }}
              ref={r => setBookRef(r)} style={{ display: "none" }} />
          </div>
          <button onClick={saveBook} disabled={bookLoading || !book.file || !book.title}
            style={{ padding: "13px", background: bookLoading || !book.file || !book.title ? `${MUTED}88` : `linear-gradient(135deg, ${GOLD}, #8B6914)`, border: "none", borderRadius: 10, color: DARK, fontFamily: "'Cormorant Garamond', serif", fontSize: 15, fontWeight: 700, cursor: bookLoading || !book.file || !book.title ? "not-allowed" : "pointer" }}>
            {bookLoading ? (bookStatus || "Elaborazione...") : "📚 Carica e insegna all'AI →"}
          </button>
          {bookStatus && !bookLoading && (
            <div style={{ fontSize: 13, color: bookStatus.startsWith("✅") ? "#4CAF50" : bookStatus.startsWith("❌") ? "#FF4444" : GOLD, textAlign: "center", padding: "8px", background: `${MUTED}33`, borderRadius: 8 }}>
              {bookStatus}
            </div>
          )}
          {/* Libri già caricati */}
          <div style={{ marginTop: 8 }}>
            <div style={{ fontSize: 11, color: GOLD, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 10 }}>Libri nel database</div>
            {items.filter(i => i.category === "libro_vino").length === 0 && (
              <div style={{ color: CREAM + "44", fontSize: 13, fontStyle: "italic" }}>Nessun libro ancora caricato</div>
            )}
            {items.filter(i => i.category === "libro_vino").map(item => (
              <div key={item.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: `1px solid ${GOLD}11` }}>
                <div>
                  <div style={{ color: CREAM + "CC", fontSize: 13 }}>{item.title?.replace("📚 ", "")}</div>
                  <div style={{ color: CREAM + "44", fontSize: 11, marginTop: 2 }}>{new Date(item.created_at).toLocaleDateString("it-IT")}</div>
                </div>
                <button onClick={() => deleteItem(item.id)} style={{ background: "none", border: "none", color: CREAM + "33", cursor: "pointer", fontSize: 16 }}>✕</button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab: YouTube */}}}
      {activeTab === "youtube" && (
        <div style={{ background: `${MUTED}33`, borderRadius: 16, padding: 20, border: `1px solid ${GOLD}22` }}>
          <div style={{ fontSize: 13, color: `${GOLD}88`, marginBottom: 16, lineHeight: 1.6 }}>
            Incolla il link di qualsiasi video YouTube sul vino. Estrarremo automaticamente i sottotitoli e li salveremo nel database.
            <br/>
            <span style={{ color: `${CREAM}55`, fontSize: 12 }}>Funziona con video che hanno sottotitoli automatici o manuali (la maggior parte).</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <input
              value={ytUrl}
              onChange={e => setYtUrl(e.target.value)}
              placeholder="https://www.youtube.com/watch?v=..."
              style={inputStyle}
              onKeyDown={e => e.key === "Enter" && importYoutube()}
            />
            <button onClick={importYoutube} disabled={ytLoading || !ytUrl.trim()} style={{ padding: "12px", background: `linear-gradient(135deg, #CC0000, #990000)`, border: "none", borderRadius: 10, color: CREAM, fontFamily: "'Cormorant Garamond', serif", fontSize: 15, fontWeight: 700, cursor: "pointer", opacity: ytLoading ? 0.7 : 1, transition: "all 0.2s" }}>
              {ytLoading ? "⏳ Importazione in corso..." : "▶️ Importa da YouTube →"}
            </button>

            {ytResult && (
              <div style={{ padding: 16, borderRadius: 10, background: ytResult.success ? "#1A3A1A" : "#3A1A1A", border: `1px solid ${ytResult.success ? "#4A8A4A" : "#8A4A4A"}` }}>
                {ytResult.success ? (
                  <div>
                    <div style={{ color: "#88CC88", fontWeight: 600, marginBottom: 6 }}>✓ Importato con successo!</div>
                    <div style={{ color: CREAM, fontSize: 13 }}><strong>{ytResult.videoTitle}</strong></div>
                    <div style={{ color: `${CREAM}88`, fontSize: 12, marginTop: 4 }}>
                      Canale: {ytResult.channelName} · {ytResult.transcriptLength?.toLocaleString()} caratteri · {ytResult.chunks} chunk{ytResult.chunks > 1 ? "s" : ""} salvati
                    </div>
                  </div>
                ) : (
                  <div>
                    <div style={{ color: "#CC8888", fontWeight: 600, marginBottom: 4 }}>✗ Errore</div>
                    <div style={{ color: `${CREAM}88`, fontSize: 13 }}>{ytResult.error}</div>
                    {ytResult.videoTitle && <div style={{ color: `${CREAM}55`, fontSize: 12, marginTop: 4 }}>Video: {ytResult.videoTitle}</div>}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Suggerimenti */}
          <div style={{ marginTop: 16, padding: 14, background: `${MUTED}22`, borderRadius: 10, border: `1px solid ${GOLD}11` }}>
            <div style={{ fontSize: 12, color: GOLD, marginBottom: 8 }}>💡 Idee di video da importare:</div>
            {["Interviste ai produttori di vino italiani", "Degustazioni di grandi sommelier su YouTube", "Guide alle regioni vinicole italiane", "Wine Spectator, Decanter, Wine Folly", "Vinitaly, Merano Wine Festival"].map((s, i) => (
              <div key={i} style={{ fontSize: 12, color: `${CREAM}55`, padding: "2px 0" }}>· {s}</div>
            ))}
          </div>
        </div>
      )}

      {/* Lista contenuti */}
      <div>
        <div style={{ fontSize: 12, color: GOLD, letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: 10 }}>
          Contenuti salvati ({items.length})
        </div>
        {loading && <div style={{ color: `${CREAM}44`, fontSize: 13 }}>Caricamento...</div>}
        {items.length === 0 && !loading && (
          <div style={{ padding: 20, textAlign: "center", color: `${CREAM}44`, fontSize: 13, background: `${MUTED}22`, borderRadius: 12 }}>
            Nessun contenuto ancora. Inizia aggiungendo la tua prima intervista o un video YouTube!
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
            <button onClick={() => deleteItem(item.id)} style={{ background: "none", border: "none", color: `${CREAM}33`, cursor: "pointer", fontSize: 16, padding: "4px 8px", flexShrink: 0, marginLeft: 8 }}>✕</button>
          </div>
        ))}
      </div>
    </div>
  );
}
