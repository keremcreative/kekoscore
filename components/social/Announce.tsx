"use client";
import { useState } from "react";
import { isAdmin } from "@/lib/admin";
import { supabase } from "@/lib/supabase";
import { useSession } from "./useSession";

/** Yalnızca yöneticilere görünen "Duyuru gönder" kartı (asıl yetki kontrolü sunucuda) */
export function Announce() {
  const { me } = useSession();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [url, setUrl] = useState("");
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);
  if (!me || !isAdmin(me.username)) return null;

  async function send(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() && !body.trim()) return;
    if (!confirm("Bildirim herkese gönderilsin mi?")) return;
    setBusy(true);
    setStatus("");
    try {
      const { data } = await supabase().auth.getSession();
      const r = await fetch("/api/duyuru", {
        method: "POST",
        headers: { "content-type": "application/json", authorization: `Bearer ${data.session?.access_token ?? ""}` },
        body: JSON.stringify({ title, body, url: url.trim() || undefined }),
      });
      const j = (await r.json().catch(() => ({}))) as { sent?: number; devices?: number; users?: number; error?: string };
      if (!r.ok || j.error) setStatus(`Gönderilemedi: ${j.error ?? r.status}`);
      else {
        setStatus(`Gönderildi: ${j.users} kişi, ${j.sent}/${j.devices} cihaz.`);
        setTitle("");
        setBody("");
        setUrl("");
      }
    } catch (err) {
      setStatus("Gönderilemedi: " + (err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="card announce">
      <div className="section-title">📣 Duyuru gönder (yönetici)</div>
      <form onSubmit={send}>
        <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Başlık (ör. Derbi akşamı!)" maxLength={80} />
        <textarea value={body} onChange={(e) => setBody(e.target.value)} placeholder="Mesaj" maxLength={300} rows={3} />
        <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="Açılacak sayfa (isteğe bağlı, ör. /sohbet)" />
        <button className="btn primary" disabled={busy || (!title.trim() && !body.trim())}>
          {busy ? "Gönderiliyor…" : "Herkese gönder"}
        </button>
        {status && <p className="push-hint">{status}</p>}
      </form>
    </section>
  );
}
