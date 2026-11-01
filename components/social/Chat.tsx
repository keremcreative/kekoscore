"use client";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { supabase, supabaseConfigured } from "@/lib/supabase";
import { AuthForm } from "./AuthForm";
import { useSession, type Me } from "./useSession";

interface Msg {
  id: number;
  user_id: string;
  body: string;
  created_at: string;
}

const ROOM = "genel";
const time = (iso: string) =>
  new Intl.DateTimeFormat("tr-TR", { timeZone: "Europe/Istanbul", hour: "2-digit", minute: "2-digit" }).format(new Date(iso));
const day = (iso: string) =>
  new Intl.DateTimeFormat("tr-TR", { timeZone: "Europe/Istanbul", day: "numeric", month: "long", weekday: "long" }).format(new Date(iso));

export function Chat() {
  const { me, session, loading } = useSession();
  if (!supabaseConfigured) return <SetupNotice />;
  if (loading) return <p className="empty">Yükleniyor…</p>;
  if (!session) return <AuthForm />;
  if (!me) return <p className="notice error">Profil bulunamadı. Çıkış yapıp tekrar dene.</p>;
  return <Room me={me} />;
}

function SetupNotice() {
  return (
    <section className="card">
      <p className="empty">Sohbet henüz kurulmadı. Supabase bağlantısı eklendiğinde burada açılacak.</p>
    </section>
  );
}

function Room({ me }: { me: Me }) {
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [names, setNames] = useState<Record<string, string>>({ [me.id]: me.username });
  const [text, setText] = useState("");
  const [error, setError] = useState("");
  const [ready, setReady] = useState(false);
  const bottom = useRef<HTMLDivElement>(null);
  const namesRef = useRef(names);
  namesRef.current = names;

  const loadNames = useCallback(async (ids: string[]) => {
    const missing = [...new Set(ids)].filter((id) => !namesRef.current[id]);
    if (!missing.length) return;
    const { data } = await supabase().from("profiles").select("id, username").in("id", missing);
    if (data) setNames((n) => ({ ...n, ...Object.fromEntries(data.map((p) => [p.id, p.username])) }));
  }, []);

  useEffect(() => {
    const sb = supabase();
    let alive = true;
    sb.from("messages")
      .select("id, user_id, body, created_at")
      .eq("room", ROOM)
      .order("created_at", { ascending: false })
      .limit(150)
      .then(({ data, error }) => {
        if (!alive) return;
        if (error) setError("Mesajlar yüklenemedi.");
        const list = ((data ?? []) as Msg[]).reverse();
        setMsgs(list);
        loadNames(list.map((m) => m.user_id));
        setReady(true);
      });
    const ch = sb
      .channel(`room:${ROOM}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages", filter: `room=eq.${ROOM}` }, (p) => {
        const m = p.new as Msg;
        setMsgs((list) => (list.some((x) => x.id === m.id) ? list : [...list, m]));
        loadNames([m.user_id]);
      })
      .on("postgres_changes", { event: "DELETE", schema: "public", table: "messages" }, (p) => {
        setMsgs((list) => list.filter((x) => x.id !== (p.old as Msg).id));
      })
      .subscribe();
    return () => {
      alive = false;
      sb.removeChannel(ch);
    };
  }, [loadNames]);

  useLayoutEffect(() => {
    bottom.current?.scrollIntoView({ block: "end" });
  }, [msgs.length, ready]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    const body = text.trim();
    if (!body) return;
    setText("");
    setError("");
    const { data, error } = await supabase().from("messages").insert({ room: ROOM, body }).select("id, user_id, body, created_at").single();
    if (error) {
      setError("Mesaj gönderilemedi.");
      setText(body);
    } else if (data) {
      setMsgs((list) => (list.some((x) => x.id === data.id) ? list : [...list, data as Msg]));
    }
  }

  async function remove(id: number) {
    if (!confirm("Mesaj silinsin mi?")) return;
    const { error } = await supabase().from("messages").delete().eq("id", id);
    if (!error) setMsgs((list) => list.filter((x) => x.id !== id));
  }

  return (
    <div className="chat">
      <div className="chat-head">
        <span>
          <b>@{me.username}</b> olarak sohbettesin
        </span>
        <button className="link-btn" onClick={() => supabase().auth.signOut()}>
          Çıkış
        </button>
      </div>
      {ready && msgs.length === 0 && <p className="empty">İlk mesajı sen yaz.</p>}
      <div className="msgs">
        {msgs.map((m, i) => {
          const mine = m.user_id === me.id;
          const prev = msgs[i - 1];
          const newDay = !prev || day(prev.created_at) !== day(m.created_at);
          const sameAuthor = prev && !newDay && prev.user_id === m.user_id;
          return (
            <div key={m.id}>
              {newDay && <div className="day-sep">{day(m.created_at)}</div>}
              <div className={`msg${mine ? " mine" : ""}${sameAuthor ? " cont" : ""}`}>
                {!mine && !sameAuthor && <span className="who">{names[m.user_id] ?? "…"}</span>}
                <div className="bubble" onDoubleClick={mine ? () => remove(m.id) : undefined}>
                  {m.body}
                  <span className="t">{time(m.created_at)}</span>
                </div>
              </div>
            </div>
          );
        })}
        <div ref={bottom} />
      </div>
      {error && <p className="form-error">{error}</p>}
      <form className="composer" onSubmit={send}>
        <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Mesaj yaz…" maxLength={1000} enterKeyHint="send" />
        <button className="btn primary" disabled={!text.trim()} aria-label="Gönder">
          ➤
        </button>
      </form>
    </div>
  );
}
