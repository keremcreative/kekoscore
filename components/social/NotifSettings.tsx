"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase, supabaseConfigured } from "@/lib/supabase";
import { PushToggle } from "./PushToggle";
import { useSession } from "./useSession";

type Key = "big_tr" | "big_eu" | "fav" | "chat";
type Prefs = Record<Key, boolean>;
const DEFAULTS: Prefs = { big_tr: true, big_eu: true, fav: true, chat: true };

const ROWS: { key: Key; title: string; sub: string }[] = [
  { key: "big_tr", title: "Türk büyükleri ve Milli Takım", sub: "Galatasaray, Fenerbahçe, Beşiktaş, Trabzonspor, Türkiye · maçtan 30 dk önce" },
  { key: "big_eu", title: "Avrupa devleri", sub: "Real Madrid, Barcelona, City, Liverpool, Bayern, PSG, Inter… · maçtan 30 dk önce" },
  { key: "fav", title: "Favori takımlarım", sub: "30 dk kala, maç başladı, her gol ve maç sonu" },
  { key: "chat", title: "Sohbet", sub: "Arkadaşların yeni mesaj yazınca" },
];

/** Ayarlar sayfasındaki bildirim kartı: cihaz izni + hangi bildirimlerin geleceği */
export function NotifSettings() {
  const { me, loading } = useSession();
  const [prefs, setPrefs] = useState<Prefs>(DEFAULTS);
  const [on, setOn] = useState(false);
  const [saving, setSaving] = useState<Key | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!me) return;
    supabase()
      .from("notif_prefs")
      .select("big_tr, big_eu, fav, chat")
      .eq("user_id", me.id)
      .maybeSingle()
      .then(({ data }) => data && setPrefs({ ...DEFAULTS, ...(data as Prefs) }));
  }, [me]);

  if (!supabaseConfigured || loading) return null;

  async function toggle(k: Key) {
    if (!me) return;
    const next = { ...prefs, [k]: !prefs[k] };
    setPrefs(next);
    setSaving(k);
    setError("");
    const { error } = await supabase()
      .from("notif_prefs")
      .upsert({ user_id: me.id, ...next, updated_at: new Date().toISOString() }, { onConflict: "user_id" });
    setSaving(null);
    if (error) {
      setPrefs(prefs);
      setError("Kaydedilemedi. (Supabase'de hatirlatma.sql çalıştırıldı mı?)");
    }
  }

  return (
    <section className="card notif">
      <div className="section-title">🔔 Bildirimler</div>
      <PushToggle offLabel="🔕 Bu cihazda bildirimler kapalı" onChange={setOn} />
      {!me ? (
        <p className="push-hint">
          Giriş yapmadan da büyük maç hatırlatmaları ve duyurular gelir. Favori takım bildirimleri ve ayrıntılı seçim için{" "}
          <Link href="/sohbet">Sohbet</Link> ekranından giriş yap.
        </p>
      ) : (
        <>
          <div className={`notif-rows${on ? "" : " off"}`}>
            {ROWS.map((r) => (
              <label key={r.key} className="notif-row">
                <span>
                  <b>{r.title}</b>
                  <small>{r.sub}</small>
                </span>
                <input type="checkbox" className="switch" checked={prefs[r.key]} disabled={saving === r.key} onChange={() => toggle(r.key)} />
              </label>
            ))}
          </div>
          {error && <p className="form-error">{error}</p>}
        </>
      )}
    </section>
  );
}
