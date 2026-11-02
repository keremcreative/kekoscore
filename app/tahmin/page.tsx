import { Tabs } from "@/components/Tabs";
import { Leaderboard } from "@/components/social/Leaderboard";
import { PredictBoard, type BoardMatch } from "@/components/social/Predict";
import { getLeagueLogos, getScoreboardRange } from "@/lib/data";
import { kickoff, shiftDays, shortDate, ymd } from "@/lib/format";
import { LEAGUES } from "@/lib/leagues";
import { initTz } from "@/lib/tz";

export const dynamic = "force-dynamic";
export const metadata = { title: "Tahmin · kekoscore" };

const TABS = [
  { key: "maclar", label: "Tahmin yap" },
  { key: "puan", label: "Puan durumu" },
];

export default async function PredictPage({ searchParams }: { searchParams: Promise<{ sekme?: string }> }) {
  await initTz();
  const tab = (await searchParams).sekme === "puan" ? "puan" : "maclar";
  let items: BoardMatch[] = [];
  if (tab === "maclar") {
    const now = new Date();
    const from = ymd(now), to = ymd(shiftDays(now, 6));
    const [rs, logos] = await Promise.all([Promise.allSettled(LEAGUES.map((l) => getScoreboardRange(l.code, from, to))), getLeagueLogos()]);
    items = LEAGUES.flatMap((l, i) => {
      const r = rs[i];
      return r.status === "fulfilled"
        ? r.value.filter((m) => m.state === "pre" && new Date(m.date) > now && !/postp|ertel|cancel/i.test(m.detail)).map((match) => ({ league: l.code, leagueName: l.name, flag: l.flag, logo: logos[l.code], match }))
        : [];
    })
      .sort((a, b) => a.match.date.localeCompare(b.match.date))
      .slice(0, 120)
      .map((x) => {
        const d = ymd(new Date(x.match.date));
        const day = d === from ? "Bugün" : d === ymd(shiftDays(now, 1)) ? "Yarın" : shortDate(x.match.date);
        return { ...x, day, time: kickoff(x.match.date) };
      });
  }
  return (
    <>
      <h1 className="page-title">Tahmin</h1>
      <Tabs items={TABS} current={tab} base="/tahmin" />
      {tab === "puan" ? <Leaderboard /> : <PredictBoard items={items} />}
    </>
  );
}
