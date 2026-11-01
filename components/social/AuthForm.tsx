"use client";
import { useState } from "react";
import { googleEnabled, supabase, USERNAME_RE, usernameToEmail } from "@/lib/supabase";

function trError(msg: string) {
  if (/invalid login credentials/i.test(msg)) return "Kullanıcı adı ya da şifre yanlış.";
  if (/already registered|already exists/i.test(msg)) return "Bu kullanıcı adı alınmış.";
  if (/password should be at least/i.test(msg)) return "Şifre en az 6 karakter olmalı.";
  if (/email.*invalid|invalid.*email/i.test(msg)) return "Kayıt şu an yapılamıyor (e-posta ayarı). Kerem'e haber ver.";
  if (/email not confirmed/i.test(msg)) return "Hesap onay bekliyor: Supabase'de e-posta onayını kapatmak gerekiyor.";
  return msg;
}

export function AuthForm({ title = "Sohbete katıl" }: { title?: string }) {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const u = username.trim().toLowerCase();
    if (!USERNAME_RE.test(u)) return setError("Kullanıcı adı 3-20 karakter olmalı: küçük harf, rakam, _ veya . (Türkçe karakter olmadan)");
    if (password.length < 6) return setError("Şifre en az 6 karakter olmalı.");
    if (mode === "signup" && password !== password2) return setError("Şifreler aynı değil.");
    setBusy(true);
    const sb = supabase();
    try {
      if (mode === "signup") {
        const { data: taken } = await sb.rpc("username_taken", { name: u });
        if (taken) throw new Error("Bu kullanıcı adı alınmış.");
        const { error } = await sb.auth.signUp({ email: usernameToEmail(u), password, options: { data: { username: u } } });
        if (error) throw error;
      } else {
        const { error } = await sb.auth.signInWithPassword({ email: usernameToEmail(u), password });
        if (error) throw error;
      }
    } catch (err) {
      setError(trError((err as Error).message));
    } finally {
      setBusy(false);
    }
  }

  async function google() {
    setError("");
    const { error } = await supabase().auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: window.location.href },
    });
    if (error) setError(trError(error.message));
  }

  return (
    <section className="card auth">
      <h2>{title}</h2>
      <div className="tabs">
        <button type="button" className={mode === "login" ? "on" : ""} onClick={() => setMode("login")}>
          Giriş yap
        </button>
        <button type="button" className={mode === "signup" ? "on" : ""} onClick={() => setMode("signup")}>
          Kayıt ol
        </button>
      </div>
      <form onSubmit={submit}>
        <label>
          Kullanıcı adı
          <input value={username} onChange={(e) => setUsername(e.target.value)} autoCapitalize="none" autoCorrect="off" autoComplete="username" placeholder="ornek: kerem" />
        </label>
        <label>
          Şifre
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete={mode === "signup" ? "new-password" : "current-password"} />
        </label>
        {mode === "signup" && (
          <label>
            Şifre (tekrar)
            <input type="password" value={password2} onChange={(e) => setPassword2(e.target.value)} autoComplete="new-password" />
          </label>
        )}
        {error && <p className="form-error">{error}</p>}
        <button className="btn primary" disabled={busy}>
          {busy ? "Bekle…" : mode === "signup" ? "Kayıt ol" : "Giriş yap"}
        </button>
      </form>
      {googleEnabled && (
        <>
          <div className="or">ya da</div>
          <button type="button" className="btn" onClick={google}>
            <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden>
              <path fill="#4285F4" d="M22.6 12.2c0-.8-.1-1.5-.2-2.2H12v4.2h6c-.3 1.4-1 2.5-2.2 3.3v2.8h3.6c2-1.9 3.2-4.7 3.2-8.1z" />
              <path fill="#34A853" d="M12 23c3 0 5.5-1 7.4-2.7l-3.6-2.8c-1 .7-2.3 1.1-3.8 1.1-2.9 0-5.4-2-6.3-4.6H2v2.9C3.8 20.5 7.6 23 12 23z" />
              <path fill="#FBBC05" d="M5.7 14c-.2-.7-.4-1.3-.4-2s.1-1.4.4-2V7.1H2C1.4 8.6 1 10.2 1 12s.4 3.4 1 4.9L5.7 14z" />
              <path fill="#EA4335" d="M12 5.4c1.6 0 3.1.6 4.2 1.7l3.2-3.2C17.5 2.1 15 1 12 1 7.6 1 3.8 3.5 2 7.1L5.7 10c.9-2.6 3.4-4.6 6.3-4.6z" />
            </svg>
            Google ile devam et
          </button>
        </>
      )}
    </section>
  );
}
