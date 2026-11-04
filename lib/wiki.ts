/**
 * ESPN'in vermediği bilgiler için Wikidata (ücretsiz, anahtarsız):
 *  - teknik direktörler (ESPN futbolda TD bilgisini hiç vermiyor)
 *  - ESPN'de fotoğrafı olmayan oyuncuların fotoğrafı (Wikimedia Commons)
 * Yanıtlar bir hafta önbellekte tutulur; bir şey bulunamazsa sayfa onsuz açılır.
 */

const API = "https://www.wikidata.org/w/api.php";
const WEEK = 604800;
const HEADERS = { accept: "application/json", "user-agent": "kekoscore/1.0 (https://kekoscore.vercel.app; kisisel, reklamsiz skor uygulamasi)" };

// Wikidata kimlikleri
const FOOTBALL_CLUB = "Q476028";
const NATIONAL_TEAM = "Q6979593";
const FOOTBALLER = "Q937857";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type J = any;

export interface Person {
  name: string;
  photo?: string;
  age?: number;
  nationality?: string;
}

async function call(params: Record<string, string>, ms = 4000): Promise<J> {
  const q = new URLSearchParams({ format: "json", formatversion: "2", ...params });
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), ms);
  try {
    const res = await fetch(`${API}?${q}`, { headers: HEADERS, next: { revalidate: WEEK }, signal: ctl.signal });
    if (!res.ok) throw new Error(`Wikidata ${res.status}`);
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}

/** Tam metin arama; haswbstatement ile yalnızca futbol kulübü / futbolcu gibi kayıtlar */
async function search(text: string, filter: string, limit = 3): Promise<string[]> {
  const j = await call({ action: "query", list: "search", srsearch: `${text} ${filter}`, srlimit: String(limit), srnamespace: "0" });
  return (j?.query?.search ?? []).map((s: J) => String(s?.title)).filter((t: string) => /^Q\d+$/.test(t));
}

async function entities(ids: string[]): Promise<Record<string, J>> {
  const out: Record<string, J> = {};
  for (let i = 0; i < ids.length; i += 50) {
    const chunk = ids.slice(i, i + 50);
    const j = await call({ action: "wbgetentities", ids: chunk.join("|"), props: "claims|labels", languages: "tr|en" });
    Object.assign(out, j?.entities ?? {});
  }
  return out;
}

const claims = (e: J, p: string): J[] => (e?.claims?.[p] ?? []).filter((c: J) => c?.rank !== "deprecated");
const itemId = (c: J): string | undefined => c?.mainsnak?.datavalue?.value?.id;
const label = (e: J): string | undefined => e?.labels?.tr?.value ?? e?.labels?.en?.value;

function commons(file?: string, width = 320): string | undefined {
  if (!file) return undefined;
  return `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(file.replace(/ /g, "_"))}?width=${width}`;
}
const photoOf = (e: J) => commons(claims(e, "P18")[0]?.mainsnak?.datavalue?.value);
const birthOf = (e: J): string | undefined => claims(e, "P569")[0]?.mainsnak?.datavalue?.value?.time?.slice(1, 11); // "+1985-03-02T..."

function ageFrom(birth?: string): number | undefined {
  if (!birth || !/^\d{4}-\d{2}-\d{2}$/.test(birth) || birth.endsWith("-00-00")) return undefined;
  const b = new Date(birth + "T00:00:00Z"), n = new Date();
  let a = n.getUTCFullYear() - b.getUTCFullYear();
  if (n.getUTCMonth() < b.getUTCMonth() || (n.getUTCMonth() === b.getUTCMonth() && n.getUTCDate() < b.getUTCDate())) a--;
  return a > 0 && a < 100 ? a : undefined;
}

/** Bitiş tarihi (P582) olmayan, varsa "tercih edilen" TD kaydı; yoksa en son başlayan */
function currentCoachId(team: J): string | undefined {
  const list = claims(team, "P286");
  if (!list.length) return undefined;
  const open = list.filter((c) => !c?.qualifiers?.P582);
  const pool = open.length ? open : list;
  const start = (c: J) => String(c?.qualifiers?.P580?.[0]?.datavalue?.value?.time ?? "");
  const pref = pool.filter((c) => c?.rank === "preferred");
  const best = (pref.length ? pref : pool).sort((a, b) => start(b).localeCompare(start(a)))[0];
  return itemId(best);
}

/** Takımın teknik direktörü (Wikidata'dan) */
export async function teamCoach(teamName: string, national = false): Promise<Person | undefined> {
  try {
    const ids = await search(teamName, `haswbstatement:P31=${national ? NATIONAL_TEAM : FOOTBALL_CLUB}`, 3);
    if (!ids.length) return undefined;
    const teams = await entities(ids);
    const team = ids.map((id) => teams[id]).find((t) => currentCoachId(t));
    const coachId = team && currentCoachId(team);
    if (!coachId) return undefined;
    const c = (await entities([coachId]))[coachId];
    const name = label(c);
    if (!name) return undefined;
    const nat = claims(c, "P27")[0];
    const natId = itemId(nat);
    let nationality: string | undefined;
    if (natId) nationality = label((await entities([natId]).catch(() => ({})) as Record<string, J>)[natId]);
    return { name, photo: photoOf(c), age: ageFrom(birthOf(c)), nationality };
  } catch {
    return undefined;
  }
}

export interface PhotoQuery {
  name: string;
  /** YYYY-MM-DD; aynı adlı başka futbolcuyla karışmasın diye doğum tarihi eşleşmeli */
  dob?: string;
}

/**
 * Birden çok oyuncunun fotoğrafı tek seferde: önce her biri için arama, sonra tüm adayların
 * bilgileri tek istekte. Doğum tarihi verilen oyuncuda tarih tutmalı; verilmeyende tek aday olmalı.
 */
export async function playerPhotos(people: PhotoQuery[]): Promise<(string | undefined)[]> {
  try {
    const hits = await Promise.all(people.map((p) => search(p.name, `haswbstatement:P106=${FOOTBALLER}`, p.dob ? 4 : 2).catch(() => [] as string[])));
    const all = [...new Set(hits.flat())];
    if (!all.length) return people.map(() => undefined);
    const ents = await entities(all);
    return people.map((p, i) => {
      const cands = hits[i].map((id) => ents[id]).filter(Boolean);
      const pick = p.dob ? cands.find((e) => birthOf(e) === p.dob) : cands.length === 1 ? cands[0] : undefined;
      return pick ? photoOf(pick) : undefined;
    });
  } catch {
    return people.map(() => undefined);
  }
}
