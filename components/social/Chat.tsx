"use client";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { supabase, supabaseConfigured } from "@/lib/supabase";
import { clientTz } from "@/lib/tzClient";
import { AuthForm } from "./AuthForm";
import { PushToggle } from "./PushToggle";
import { useSession, type Me } from "./useSession";

interface Msg {
  id: number;
  user_id: string;
  body: string;
  created_at: string;
}

const ROOM = "genel";
const time = (iso: string) =>
  new Intl.DateTimeFormat("tr-TR", { timeZone: clientTz(), hour: "2-digit", minute: "2-digit" }).format(new Date(iso));
const day = (iso: string) =>
  new Intl.DateTimeFormat("tr-TR", { timeZone: clientTz(), day: "numeric", month: "long", weekday: "long" }).format(new Date(iso));

function readStored(key: string): number {
  try {
    return Number(localStorage.getItem(key)) || 0;
  } catch {
    return 0;
  }
}

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
  const [firstUnread, setFirstUnread] = useState<number | null>(null);
  const [newBelow, setNewBelow] = useState(0);
  const atBottom = useRef(true);
  const userMoved = useRef(false);
  const readKey = `kk-chat-read:${me.id}`;
  const lastRead = useRef<number>(readStored(readKey));
  const namesRef = useRef(names);
  namesRef.current = names;
  const msgsRef = useRef(msgs);
  msgsRef.current = msgs;

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
        const lr = lastRead.current;
        // İlk kez açanlar için her şey okunmuş sayılır; sonra en alttan başlar
        const unread = lr > 0 ? list.find((m) => m.id > lr && m.user_id !== me.id) : undefined;
        setFirstUnread(unread?.id ?? null);
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
  }, [loadNames, me.id]);

  const markRead = useCallback(() => {
    const last = msgsRef.current[msgsRef.current.length - 1];
    if (last && last.id > lastRead.current) {
      lastRead.current = last.id;
      try {
        localStorage.setItem(readKey, String(last.id));
      } catch {}
    }
  }, [readKey]);

  // Kaydırma durumunu izle: en alttaysak okundu say, kullanıcı elle kaydırdıysa açılış konumlandırmasını bırak
  useEffect(() => {
    const onScroll = () => {
      atBottom.current = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 140;
      if (atBottom.current) {
        setNewBelow(0);
        if (ready) markRead();
      }
    };
    const moved = () => (userMoved.current = true);
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("touchstart", moved, { passive: true });
    window.addEventListener("wheel", moved, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("touchstart", moved);
      window.removeEventListener("wheel", moved);
    };
  }, [ready, markRead]);

  // Açılış: okunmamış varsa ilk okunmamışa, yoksa en alta. İsimler/görseller yüklenip
  // sayfa uzadıkça birkaç kez yeniden konumla (kullanıcı dokunana kadar).
  useLayoutEffect(() => {
    if (!ready) return;
    const place = () => {
      if (userMoved.current) return;
      const el = firstUnread !== null ? document.getElementById("okunmamis") : null;
      if (el) {
        const top = document.querySelector(".topbar")?.getBoundingClientRect().height ?? 0;
        window.scrollTo(0, el.getBoundingClientRect().top + window.scrollY - top - 12);
      } else {
        window.scrollTo(0, document.documentElement.scrollHeight);
        markRead();
      }
    };
    place();
    const timers = [50, 200, 500, 1000].map((t) => setTimeout(place, t));
    return () => timers.forEach(clearTimeout);
  }, [ready, firstUnread, markRead]);

  // Yeni mesaj gelince: en alttaysak aşağı kaydır, değilsek "yeni mesaj" düğmesi göster
  const prevLen = useRef(0);
  useLayoutEffect(() => {
    const added = msgs.length - prevLen.current;
    prevLen.current = msgs.length;
    if (!ready || added <= 0 || added === msgs.length) return;
    const last = msgs[msgs.length - 1];
    if (atBottom.current || last.user_id === me.id) {
      window.scrollTo({ top: document.documentElement.scrollHeight, behavior: "smooth" });
      markRead();
    } else {
      setNewBelow((n) => n + added);
    }
  }, [msgs, ready, me.id, markRead]);

  function jumpDown() {
    setNewBelow(0);
    window.scrollTo({ top: document.documentElement.scrollHeight, behavior: "smooth" });
  }

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
      notify(data.id);
    }
  }

  // Diğerlerine bildirim; başarısız olsa da sohbeti etkilemesin
  async function notify(messageId: number) {
    const { data } = await supabase().auth.getSession();
    const token = data.session?.access_token;
    if (!token) return;
    fetch("/api/notify", {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
      body: JSON.stringify({ messageId }),
      keepalive: true,
    }).catch(() => {});
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
      <PushToggle />
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
              {m.id === firstUnread && (
                <div className="unread-sep" id="okunmamis">
                  <span>Okunmamış mesajlar</span>
                </div>
              )}
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
      </div>
      {newBelow > 0 && (
        <button className="new-below" onClick={jumpDown}>
          ↓ {newBelow} yeni mesaj
        </button>
      )}
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
