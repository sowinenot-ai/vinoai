import { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";
import AuthScreen from "./Auth";
import VinoAI from "./App";

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_KEY
);

export default function AppWrapper() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isPremium, setIsPremium] = useState(false);
  const [isGuest, setIsGuest] = useState(false);
  const [guestQuestions, setGuestQuestions] = useState(0);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) checkPremium(session.user.email);
      else setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        setIsGuest(false);
        checkPremium(session.user.email);
      } else {
        setIsPremium(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  async function checkPremium(email) {
    if (email === "lanzifederico09@gmail.com") {
      setIsPremium(true);
      setLoading(false);
      return;
    }
    try {
      const res = await fetch("/api/premium", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "check", email }),
      });
      const data = await res.json();
      setIsPremium(data.premium || false);
    } catch {}
    setLoading(false);
  }

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", background: "#0D0A08", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ fontSize: 48 }}>🍷</div>
      </div>
    );
  }

  if (!user && !isGuest) {
    return (
      <AuthScreen
        onLogin={setUser}
        onGuest={() => { setIsGuest(true); setGuestQuestions(0); }}
      />
    );
  }

  return (
    <VinoAI
      user={user || { email: "ospite@sowinenot.app", user_metadata: { name: "Ospite" } }}
      supabase={supabase}
      isPremium={isPremium}
      isGuest={isGuest}
      guestQuestions={guestQuestions}
      onGuestQuestion={() => setGuestQuestions(q => q + 1)}
      onGuestSignup={() => setIsGuest(false)}
    />
  );
}