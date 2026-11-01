"use client";
import type { Session } from "@supabase/supabase-js";
import { useEffect, useState } from "react";
import { supabase, supabaseConfigured } from "@/lib/supabase";

export interface Me {
  id: string;
  username: string;
}

/** Giriş durumu ve kullanıcı adı. loading=true iken henüz bilinmiyor. */
export function useSession() {
  const [session, setSession] = useState<Session | null>(null);
  const [me, setMe] = useState<Me | null>(null);
  const [loading, setLoading] = useState(supabaseConfigured);

  useEffect(() => {
    if (!supabaseConfigured) return;
    const sb = supabase();
    sb.auth.getSession().then(({ data }) => {
      setSession(data.session);
      if (!data.session) setLoading(false);
    });
    const { data } = sb.auth.onAuthStateChange((_e, s) => {
      setSession(s);
      if (!s) {
        setMe(null);
        setLoading(false);
      }
    });
    return () => data.subscription.unsubscribe();
  }, []);

  const uid = session?.user.id;
  useEffect(() => {
    if (!uid) return;
    let alive = true;
    // Profil, kayıttan hemen sonra tetikleyiciyle oluşur; birkaç kez dene
    (async () => {
      for (let i = 0; i < 5 && alive; i++) {
        const { data } = await supabase().from("profiles").select("id, username").eq("id", uid).maybeSingle();
        if (data) {
          if (alive) setMe(data as Me);
          break;
        }
        await new Promise((r) => setTimeout(r, 400));
      }
      if (alive) setLoading(false);
    })();
    return () => {
      alive = false;
    };
  }, [uid]);

  return { session, me, loading };
}
