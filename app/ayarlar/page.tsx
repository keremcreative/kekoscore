import { Announce } from "@/components/social/Announce";
import { NotifSettings } from "@/components/social/NotifSettings";
import { TzSwitch } from "@/components/TzSwitch";
import { initTz } from "@/lib/tz";

export const metadata = { title: "Ayarlar · kekoscore" };

export default async function Settings() {
  const tz = await initTz();
  return (
    <>
      <h1 className="page-title">Ayarlar</h1>
      <NotifSettings />
      <section className="card settings-row">
        <span>
          <b>Saat dilimi</b>
          <small>Maç saatleri Türkiye ya da ABD (Doğu) saatiyle</small>
        </span>
        <TzSwitch value={tz} />
      </section>
      <Announce />
    </>
  );
}
