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

export default function AuthScreen({ onLogin }) {
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
      options: { redirectTo: window.location.origin },
    });
    if (error) setError(error.message);
    setLoading(false);
  }

  async function loginWithEmail() {
    if (!email || !password) return;
    setLoading(true);
    setError("");
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) setError("Email o password non corretti");
    else onLogin(data.user);
    setLoading(false);
  }

  async function registerWithEmail() {
    if (!email || !password || !name) return;
    setLoading(true);
    setError("");
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: name } },
    });
    if (error) setError(error.message);
    else setMessage("Controlla la tua email per confermare la registrazione!");
    setLoading(false);
  }

  return (
    <div style={{ minHeight: "100vh", background: DARK, backgroundImage: `radial-gradient(ellipse at 20% 20%, #2A0A1488 0%, transparent 60%), radial-gradient(ellipse at 80% 80%, #1A0A0566 0%, transparent 60%)`, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,600;1,300;1,400&display=swap');
        * { box-sizing: border-box; }
        input:focus { border-color: ${GOLD}88 !important; }
        button:hover { opacity: 0.85; transform: translateY(-1px); }
        @keyframes fadeUp { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>

      <div style={{ width: "100%", maxWidth: 400, animation: "fadeUp 0.4s ease" }}>
        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: 40 }}>
          <div style={{ width: 72, height: 72, borderRadius: 20, background: `linear-gradient(135deg, ${BURGUNDY}, #C0392B)`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 36, margin: "0 auto 16px", border: `1px solid ${GOLD}44`, boxShadow: `0 8px 32px ${BURGUNDY}66` }}>🍷</div>
          <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 36, fontWeight: 600, color: CREAM, letterSpacing: "0.06em" }}>SoWineNot</div>
          <div style={{ fontSize: 12, color: GOLD, letterSpacing: "0.25em", textTransform: "uppercase", marginTop: 4 }}>Il tuo sommelier personale</div>
        </div>

        {/* Card */}
        <div style={{ background: `${MUTED}33`, borderRadius: 20, padding: 32, border: `1px solid ${GOLD}22`, backdropFilter: "blur(12px)" }}>

          {/* Mode toggle */}
          <div style={{ display: "flex", background: `${MUTED}44`, borderRadius: 10, padding: 4, marginBottom: 24, border: `1px solid ${GOLD}22` }}>
            {[{ key: "login", label: "Accedi" }, { key: "register", label: "Registrati" }].map(m => (
              <button key={m.key} onClick={() => { setMode(m.key); setError(""); setMessage(""); }} style={{ flex: 1, padding: "8px", borderRadius: 7, background: mode === m.key ? `linear-gradient(135deg, ${BURGUNDY}, #9B2335)` : "transparent", border: "none", color: mode === m.key ? CREAM : CREAM + "66", fontFamily: "'Cormorant Garamond', serif", fontSize: 15, cursor: "pointer", transition: "all 0.2s" }}>{m.label}</button>
            ))}
          </div>

          {/* Google button */}
          <button onClick={loginWithGoogle} disabled={loading} style={{ width: "100%", padding: "13px", borderRadius: 10, background: "white", border: "none", color: "#333", fontFamily: "Georgia, serif", fontSize: 14, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 10, marginBottom: 20, fontWeight: 500, transition: "all 0.2s" }}>
            <svg width="18" height="18" viewBox="0 0 48 48">
              <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
              <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
              <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
              <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.18 1.48-4.97 2.35-8.16 2.35-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
            </svg>
            Continua con Google
          </button>

          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
            <div style={{ flex: 1, height: 1, background: `${GOLD}22` }} />
            <span style={{ fontSize: 12, color: CREAM + "44" }}>oppure</span>
            <div style={{ flex: 1, height: 1, background: `${GOLD}22` }} />
          </div>

          {/* Form */}
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {mode === "register" && (
              <input value={name} onChange={e => setName(e.target.value)} placeholder="Il tuo nome" style={inputStyle} />
            )}
            <input value={email} onChange={e => setEmail(e.target.value)} placeholder="Email" type="email" style={inputStyle} />
            <input value={password} onChange={e => setPassword(e.target.value)} placeholder="Password" type="password" style={inputStyle} onKeyDown={e => e.key === "Enter" && (mode === "login" ? loginWithEmail() : registerWithEmail())} />

            {error && <div style={{ fontSize: 12, color: "#FF8888", textAlign: "center" }}>{error}</div>}
            {message && <div style={{ fontSize: 12, color: GOLD, textAlign: "center" }}>{message}</div>}

            <button onClick={mode === "login" ? loginWithEmail : registerWithEmail} disabled={loading} style={{ width: "100%", padding: "13px", borderRadius: 10, background: `linear-gradient(135deg, ${BURGUNDY}, #9B2335)`, border: "none", color: CREAM, fontFamily: "'Cormorant Garamond', serif", fontSize: 16, cursor: "pointer", marginTop: 4, opacity: loading ? 0.7 : 1, transition: "all 0.2s" }}>
              {loading ? "..." : mode === "login" ? "Accedi →" : "Registrati →"}
            </button>
          </div>
        </div>

        <p style={{ textAlign: "center", fontSize: 11, color: CREAM + "33", marginTop: 20 }}>
          Accedendo accetti i termini di servizio di SoWineNot
        </p>
      </div>
    </div>
  );
}
