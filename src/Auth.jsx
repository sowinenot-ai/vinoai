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
  const [mode, setMode] = useState("login");
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
      options: { redirectTo: window.location.origin },
    });
    if (error) setError(error.message);
    setLoading(false);
  }

  async function handleAuth() {
    setError("");
    setMessage("");
    setLoading(true);

    if (mode === "login") {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) setError(error.message);
      else if (data.user) onLogin(data.user);
    } else {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { name } },
      });
      if (error) setError(error.message);
      else setMessage("Controlla la tua email per confermare l'iscrizione!");
    }
    setLoading(false);
  }

  return (
    <div style={{ minHeight: "100vh", background: DARK, color: CREAM, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div style={{ maxWidth: 400, width: "100%", textAlign: "center" }}>
        <div style={{ fontSize: 60, marginBottom: 10 }}>🍷</div>
        <h1 style={{ fontFamily: "'Cormorant Garamond', serif", color: GOLD, fontSize: 32, letterSpacing: "0.1em", marginBottom: 5 }}>SO WINE NOT</h1>
        <p style={{ color: `${CREAM}88`, fontSize: 14, fontStyle: "italic", marginBottom: 30 }}>Il tuo sommelier personale, ovunque tu sia.</p>

        <div style={{ background: `${MUTED}33`, padding: 30, borderRadius: 20, border: `1px solid ${GOLD}22`, boxShadow: "0 10px 30px rgba(0,0,0,0.5)" }}>
          <div style={{ display: "flex", gap: 10, marginBottom: 24, background: `${DARK}44`, padding: 4, borderRadius: 10 }}>
            <button onClick={() => setMode("login")} style={{ flex: 1, padding: "10px", borderRadius: 8, border: "none", background: mode === "login" ? GOLD : "transparent", color: mode === "login" ? DARK : CREAM, fontWeight: "bold", cursor: "pointer", transition: "all 0.3s" }}>Accedi</button>
            <button onClick={() => setMode("register")} style={{ flex: 1, padding: "10px", borderRadius: 8, border: "none", background: mode === "register" ? GOLD : "transparent", color: mode === "register" ? DARK : CREAM, fontWeight: "bold", cursor: "pointer", transition: "all 0.3s" }}>Registrati</button>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 15 }}>
            {mode === "register" && (
              <input style={inputStyle} placeholder="Il tuo Nome" value={name} onChange={(e) => setName(e.target.value)} />
            )}
            <input style={inputStyle} placeholder="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            <input style={inputStyle} placeholder="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />

            {error && <div style={{ color: "#ff4d4d", fontSize: 12, marginTop: 5 }}>{error}</div>}
            {message && <div style={{ color: GOLD, fontSize: 12, marginTop: 5 }}>{message}</div>}

            <button onClick={handleAuth} disabled={loading} style={{ width: "100%", padding: "14px", borderRadius: 10, background: `linear-gradient(135deg, ${BURGUNDY}, #9B2335)`, border: "none", color: CREAM, fontFamily: "'Cormorant Garamond', serif", fontSize: 16, cursor: "pointer", marginTop: 4, opacity: loading ? 0.7 : 1, transition: "all 0.2s" }}>
              {loading ? "..." : mode === "login" ? "Accedi →" : "Registrati →"}
            </button>
          </div>
        </div>

        {/* Divisore ospite */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 20 }}>
          <div style={{ flex: 1, height: 1, background: `${GOLD}18` }} />
          <span style={{ fontSize: 11, color: CREAM + "33" }}>non vuoi registrarti?</span>
          <div style={{ flex: 1, height: 1, background: `${GOLD}18` }} />
        </div>

        {/* Bottone ospite */}
        <button onClick={onGuest} style={{ width: "100%", padding: "14px", borderRadius: 10, background: `${MUTED}44`, border: `1px solid ${GOLD}22`, color: CREAM + "88", fontFamily: "Georgia, serif", fontSize: 14, cursor: "pointer", marginTop: 10, display: "flex", alignItems: "center", justifyContent: "center", gap: 8, transition: "all 0.2s" }}>
          👋 Entra come ospite
          <span style={{ fontSize: 11, color: GOLD, background: `${GOLD}15`, padding: "2px 6px", borderRadius: 4 }}>FREE</span>
        </button>

        <div style={{ marginTop: 20 }}>
          <button onClick={loginWithGoogle} style={{ background: "none", border: "none", color: `${CREAM}66`, fontSize: 12, cursor: "pointer", textDecoration: "underline" }}>Oppure continua con Google</button>
        </div>
      </div>
    </div>
  );
}