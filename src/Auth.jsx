import { useState } from "react";
import { createClient } from "@supabase/supabase-js";

const BURGUNDY = "#6B1A2A";
const GOLD = "#C9A84C";
const CREAM = "#F5ECD7";
const DARK = "#0D0A08";
const MUTED = "#3A2D28";

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_KEY
);

export { supabase };

export default function AuthScreen({ onLogin, onGuest }) {
  const [mode, setMode] = useState("login"); // login | register
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const inputStyle = {
    background: `${MUTED}55`,
    border: `1px solid ${GOLD}33`,
    borderRadius: 8,
    padding: "12px 16px",
    color: CREAM,
    fontFamily: "Georgia, serif",
    fontSize: 14,
    outline: "none",
    width: "100%",
    boxSizing: "border-box",
  };

  async function loginWithGoogle() {
    setLoading(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: window.location.origin }
    });
    if (error) setError(error.message);
    setLoading(false);
  }

  async function handleAuth() {
    setError("");
    setMessage("");
    if (!email || !password) return setError("Inserisci tutti i campi");
    setLoading(true);

    try {
      if (mode === "login") {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        onLogin(data.user);
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { name } }
        });
        if (error) throw error;
        setMessage("Controlla la tua email per confermare l'account!");
      }
    } catch (e) {
      setError(e.message);
    }
    setLoading(false);
  }

  return (
    <div style={{ minHeight: "100vh", background: DARK, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div style={{ width: "100%", maxWidth: 400 }}>
        {/* Logo Section */}
        <div style={{ textAlign: "center", marginBottom: 40 }}>
          <div style={{ fontSize: 48, marginBottom: 10 }}>🍷</div>
          <h1 style={{ fontFamily: "'Cormorant Garamond', serif", color: GOLD, fontSize: 32, margin: 0, letterSpacing: "0.1em" }}>SO WINE NOT</h1>
          <p style={{ color: CREAM + "66", fontSize: 13, marginTop: 8, letterSpacing: "0.05em" }}>Il tuo sommelier AI personale</p>
        </div>

        <div style={{ background: `${MUTED}22`, border: `1px solid ${GOLD}11`, borderRadius: 20, padding: 30, boxShadow: "0 10px 40px rgba(0,0,0,0.5)" }}>
          <div style={{ display: "flex", gap: 20, marginBottom: 24, borderBottom: `1px solid ${GOLD}11` }}>
            <button 
              onClick={() => setMode("login")}
              style={{ background: "none", border: "none", color: mode === "login" ? GOLD : CREAM + "44", padding: "0 0 10px 0", fontSize: 14, fontWeight: "bold", borderBottom: mode === "login" ? `2px solid ${GOLD}` : "none", cursor: "pointer" }}
            >
              ACCEDI
            </button>
            <button 
              onClick={() => setMode("register")}
              style={{ background: "none", border: "none", color: mode === "register" ? GOLD : CREAM + "44", padding: "0 0 10px 0", fontSize: 14, fontWeight: "bold", borderBottom: mode === "register" ? `2px solid ${GOLD}` : "none", cursor: "pointer" }}
            >
              REGISTRATI
            </button>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {mode === "register" && (
              <input 
                placeholder="Nome completo" 
                style={inputStyle} 
                value={name} 
                onChange={(e) => setName(e.target.value)} 
              />
            )}
            <input 
              placeholder="Email" 
              type="email" 
              style={inputStyle} 
              value={email} 
              onChange={(e) => setEmail(e.target.value)} 
            />
            <input 
              placeholder="Password" 
              type="password" 
              style={inputStyle} 
              value={password} 
              onChange={(e) => setPassword(e.target.value)} 
            />

            {error && <div style={{ color: "#E84040", fontSize: 12, textAlign: "center" }}>{error}</div>}
            {message && <div style={{ color: GOLD, fontSize: 12, textAlign: "center" }}>{message}</div>}

            <button 
              onClick={handleAuth}
              disabled={loading}
              style={{ padding: "14px", borderRadius: 10, background: `linear-gradient(135deg, ${BURGUNDY}, #9B2335)`, border: "none", color: CREAM, fontFamily: "'Cormorant Garamond', serif", fontSize: 16, cursor: "pointer", marginTop: 4, opacity: loading ? 0.7 : 1, transition: "all 0.2s" }}
            >
              {loading ? "..." : mode === "login" ? "Accedi →" : "Registrati →"}
            </button>
          </div>
        </div>

        {/* Divisore */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 16 }}>
          <div style={{ flex: 1, height: 1, background: `${GOLD}18` }} />
          <span style={{ fontSize: 11, color: CREAM + "33" }}>non vuoi registrarti?</span>
          <div style={{ flex: 1, height: 1, background: `${GOLD}18` }} />
        </div>

        {/* Ospite */}
        <button 
          onClick={onGuest} 
          style={{ width: "100%", padding: "14px", borderRadius: 10, background: `${MUTED}44`, border: `1px solid ${GOLD}33`, color: CREAM + "99", fontFamily: "Georgia, serif", fontSize: 14, cursor: "pointer", marginTop: 10, display: "flex", alignItems: "center", justifyContent: "center", gap: 8, transition: "all 0.2s" }}
        >
          👋 Entra come ospite
          <span style={{ fontSize: 11, color: GOLD }}>PROVA GRATUITA</span>
        </button>

        <p style={{ textAlign: "center", color: CREAM + "22", fontSize: 11, marginTop: 40 }}>
          &copy; {new Date().getFullYear()} So Wine Not. Elevate your wine experience.
        </p>
      </div>
    </div>
  );
}
