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
 * Ana sayfada, tahminde ve Ligler sayfasında bu sırayla (popülerliğe göre) gösterilir: önce Süper Lig,
 * sonra büyük 5 lig, Avrupa kupaları, milli turnuvalar, sonra en çok izlenenden aza diğer ligler. Kodlar ESPN'in lig kodlarıdır.
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
  ...block(1, "Milli takımlar", [
    ["fifa.world", "Dünya Kupası", "FIFA", "🌍"],
    ["uefa.euro", "Avrupa Şampiyonası", "UEFA", "🇪🇺"],
    // Milli maç arası (Eylül, Ekim, Kasım, Mart, Haziran) müsabakaları. Maç yokken ana sayfada görünmezler.
    ["uefa.nations", "Uluslar Ligi", "UEFA", "🇪🇺"],
    ["fifa.worldq.uefa", "Dünya Kupası Elemeleri", "UEFA", "🇪🇺"],
    ["uefa.euroq", "EURO Elemeleri", "UEFA", "🇪🇺"],
    ["conmebol.america", "Copa América", "CONMEBOL", "🌎"],
    ["caf.nations", "Afrika Uluslar Kupası", "CAF", "🌍"],
    ["fifa.friendly", "Milli Hazırlık Maçları", "FIFA", "🌍"],
    ["fifa.worldq.conmebol", "Dünya Kupası Elemeleri", "CONMEBOL", "🌎"],
    ["caf.nations_qual", "Afrika Uluslar Kupası Elemeleri", "CAF", "🌍"],
    ["concacaf.nations.league", "CONCACAF Uluslar Ligi", "CONCACAF", "🌎"],
  ]),
  ...block(1, "Dünya", [
    ["conmebol.libertadores", "Copa Libertadores", "Güney Amerika", "🌎"],
    ["por.1", "Liga Portugal", "Portekiz", "🇵🇹"],
    ["ned.1", "Eredivisie", "Hollanda", "🇳🇱"],
    ["ksa.1", "Saudi Pro League", "Suudi Arabistan", "🇸🇦"],
    ["bra.1", "Brasileirão", "Brezilya", "🇧🇷"],
    ["usa.1", "MLS", "ABD", "🇺🇸"],
    ["arg.1", "Liga Profesional", "Arjantin", "🇦🇷"],
    ["mex.1", "Liga MX", "Meksika", "🇲🇽"],
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

/**
 * Lig sıralaması (ana sayfa, tahmin…): popülerliğe göre, LEAGUES listesindeki sırayla.
 * Süper Lig, 5 büyük lig, Avrupa kupaları, milli turnuvalar, sonra diğer ligler.
 */
const RANK = new Map(LEAGUES.map((l, i) => [l.code, i]));
export function compareLeagues(a: string, b: string): number {
  return (RANK.get(a) ?? 999) - (RANK.get(b) ?? 999);
}

/** Takım sayfasında maçın hangi turnuvadan olduğunu gösteren kısa ad */
const COMP_SHORT: Record<string, string> = {
  "uefa.champions": "ŞL",
  "uefa.europa": "UEL",
  "uefa.europa.conf": "UECL",
  "eng.fa": "FA Cup",
  "eng.league_cup": "Lig K.",
  "esp.copa_del_rey": "Kral K.",
  "ita.coppa_italia": "İt. K.",
  "ger.dfb_pokal": "DFB K.",
  "fra.coupe_de_france": "Fr. K.",
  "conmebol.libertadores": "Lib.",
};
export const compShort = (code: string) => COMP_SHORT[code] ?? leagueByCode(code)?.name ?? "Kupa";
