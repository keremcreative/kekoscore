export interface League {
  code: string; // ESPN slug
  name: string;
  country: string;
  flag: string;
  /** 1: ana ligler (bantta, tahminde, açık gelir) · 2: önemli · 3: diğer (ana sayfada kapalı gelir) */
  tier?: 1 | 2 | 3;
  /** Ligler sayfasındaki başlık */
  group?: string;
}

const ENG = "\u{1F3F4}\u{E0067}\u{E0062}\u{E0065}\u{E006E}\u{E0067}\u{E007F}";

type Row = [code: string, name: string, country: string, flag: string];
const block = (tier: 1 | 2 | 3, group: string, rows: Row[]): League[] =>
  rows.map(([code, name, country, flag]) => ({ code, name, country, flag, tier, group }));

/**
 * Ana sayfada ve Ligler sayfasında bu sırayla gösterilir: önce Süper Lig, sonra büyük 5 lig,
 * sonra Avrupa kupaları ve geri kalanlar önem sırasına göre. Kodlar ESPN'in lig kodlarıdır.
 */
export const LEAGUES: League[] = [
  ...block(1, "Öne çıkanlar", [
    ["tur.1", "Süper Lig", "Türkiye", "🇹🇷"],
    ["eng.1", "Premier League", "İngiltere", ENG],
    ["esp.1", "LaLiga", "İspanya", "🇪🇸"],
    ["ita.1", "Serie A", "İtalya", "🇮🇹"],
    ["ger.1", "Bundesliga", "Almanya", "🇩🇪"],
    ["fra.1", "Ligue 1", "Fransa", "🇫🇷"],
    ["uefa.champions", "Şampiyonlar Ligi", "UEFA", "🇪🇺"],
    ["uefa.europa", "Avrupa Ligi", "UEFA", "🇪🇺"],
    ["uefa.europa.conf", "Konferans Ligi", "UEFA", "🇪🇺"],
  ]),
  ...block(1, "Dünya", [
    ["conmebol.libertadores", "Copa Libertadores", "Güney Amerika", "🌎"],
    ["bra.1", "Brasileirão", "Brezilya", "🇧🇷"],
    ["ksa.1", "Saudi Pro League", "Suudi Arabistan", "🇸🇦"],
    ["arg.1", "Liga Profesional", "Arjantin", "🇦🇷"],
    ["usa.1", "MLS", "ABD", "🇺🇸"],
    ["ned.1", "Eredivisie", "Hollanda", "🇳🇱"],
    ["por.1", "Liga Portugal", "Portekiz", "🇵🇹"],
    ["mex.1", "Liga MX", "Meksika", "🇲🇽"],
  ]),
  ...block(1, "Milli takımlar", [
    ["fifa.world", "Dünya Kupası", "FIFA", "🌍"],
    ["uefa.euro", "Avrupa Şampiyonası", "UEFA", "🇪🇺"],
    ["conmebol.america", "Copa América", "CONMEBOL", "🌎"],
    ["caf.nations", "Afrika Uluslar Kupası", "CAF", "🌍"],
  ]),
];

const BY_CODE = new Map(LEAGUES.map((l) => [l.code, l]));
export const leagueByCode = (code: string) => BY_CODE.get(code);

/** Bant, tahmin gibi yoğun sayfalarda kullanılan ana ligler */
export const MAIN_LEAGUES = LEAGUES.filter((l) => l.tier === 1);
/** Tahmin ekranındaki ligler: ana + önemli */
export const PREDICT_LEAGUES = LEAGUES.filter((l) => (l.tier ?? 3) <= 2);

/** Ligler sayfasındaki grup sırası */
export const LEAGUE_GROUPS = ["Öne çıkanlar", "Kupalar", "Avrupa", "Dünya", "Milli takımlar", "Kadınlar"];

/** Her zaman en üstte duran ligler (bu sırayla): Süper Lig, sonra 5 büyük lig */
export const CORE_LEAGUES = ["tur.1", "eng.1", "esp.1", "ita.1", "ger.1", "fra.1"];
/** Lig sıralaması: önce CORE_LEAGUES, sonra diğerleri ülkeye ve ada göre A-Z (ana sayfayla aynı) */
export function compareLeagues(a: string, b: string): number {
  const ia = CORE_LEAGUES.indexOf(a), ib = CORE_LEAGUES.indexOf(b);
  if (ia >= 0 || ib >= 0) return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib);
  const la = BY_CODE.get(a), lb = BY_CODE.get(b);
  return (la?.country ?? "").localeCompare(lb?.country ?? "", "tr") || (la?.name ?? a).localeCompare(lb?.name ?? b, "tr");
}
