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
const SCO = "\u{1F3F4}\u{E0067}\u{E0062}\u{E0073}\u{E0063}\u{E0074}\u{E007F}";

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
  ...block(1, "Milli takımlar", [
    ["fifa.world", "Dünya Kupası", "FIFA", "🌍"],
    ["uefa.euro", "Avrupa Şampiyonası", "UEFA", "🇪🇺"],
    ["fifa.worldq.uefa", "Dünya Kupası Elemeleri", "Avrupa", "🌍"],
    ["uefa.euroq", "EURO Elemeleri", "UEFA", "🇪🇺"],
    ["uefa.nations", "Uluslar Ligi", "UEFA", "🇪🇺"],
  ]),
  ...block(1, "Kupalar", [
    ["fifa.cwc", "Kulüpler Dünya Kupası", "FIFA", "🌍"],
    ["uefa.super_cup", "UEFA Süper Kupa", "UEFA", "🇪🇺"],
  ]),
  ...block(2, "Kupalar", [
    ["eng.fa", "FA Cup", "İngiltere", ENG],
    ["eng.league_cup", "Lig Kupası", "İngiltere", ENG],
    ["esp.copa_del_rey", "Kral Kupası", "İspanya", "🇪🇸"],
    ["ita.coppa_italia", "İtalya Kupası", "İtalya", "🇮🇹"],
    ["ger.dfb_pokal", "DFB-Pokal", "Almanya", "🇩🇪"],
    ["fra.coupe_de_france", "Fransa Kupası", "Fransa", "🇫🇷"],
    ["eng.charity", "Community Shield", "İngiltere", ENG],
    ["esp.super_cup", "İspanya Süper Kupası", "İspanya", "🇪🇸"],
    ["ita.super_cup", "İtalya Süper Kupası", "İtalya", "🇮🇹"],
    ["ger.super_cup", "Almanya Süper Kupası", "Almanya", "🇩🇪"],
    ["fra.super_cup", "Fransa Süper Kupası", "Fransa", "🇫🇷"],
    ["fifa.intercontinental_cup", "Kıtalararası Kupa", "FIFA", "🌍"],
  ]),
  ...block(2, "Avrupa", [
    ["por.1", "Liga Portugal", "Portekiz", "🇵🇹"],
    ["ned.1", "Eredivisie", "Hollanda", "🇳🇱"],
    ["eng.2", "Championship", "İngiltere", ENG],
    ["bel.1", "Pro League", "Belçika", "🇧🇪"],
    ["sco.1", "Premiership", "İskoçya", SCO],
    ["gre.1", "Super League", "Yunanistan", "🇬🇷"],
    ["aut.1", "Bundesliga", "Avusturya", "🇦🇹"],
    ["rus.1", "Premier Liga", "Rusya", "🇷🇺"],
  ]),
  ...block(2, "Dünya", [
    ["ksa.1", "Saudi Pro League", "Suudi Arabistan", "🇸🇦"],
    ["usa.1", "MLS", "ABD", "🇺🇸"],
    ["bra.1", "Brasileirão", "Brezilya", "🇧🇷"],
    ["arg.1", "Liga Profesional", "Arjantin", "🇦🇷"],
    ["mex.1", "Liga MX", "Meksika", "🇲🇽"],
    ["conmebol.libertadores", "Copa Libertadores", "Güney Amerika", "🌎"],
    ["conmebol.sudamericana", "Copa Sudamericana", "Güney Amerika", "🌎"],
  ]),
  ...block(2, "Milli takımlar", [
    ["fifa.friendly", "Hazırlık Maçları", "Milli", "🌍"],
    ["conmebol.america", "Copa América", "CONMEBOL", "🌎"],
    ["fifa.worldq.conmebol", "DK Elemeleri", "Güney Amerika", "🌎"],
    ["caf.nations", "Afrika Uluslar Kupası", "CAF", "🌍"],
    ["afc.asian.cup", "Asya Kupası", "AFC", "🌏"],
    ["concacaf.gold", "Gold Cup", "CONCACAF", "🌎"],
    ["uefa.euro_u21", "U21 Avrupa Şampiyonası", "UEFA", "🇪🇺"],
    ["fifa.world.u20", "U20 Dünya Kupası", "FIFA", "🌍"],
  ]),
  ...block(3, "Avrupa", [
    ["ger.2", "2. Bundesliga", "Almanya", "🇩🇪"],
    ["esp.2", "LaLiga 2", "İspanya", "🇪🇸"],
    ["ita.2", "Serie B", "İtalya", "🇮🇹"],
    ["fra.2", "Ligue 2", "Fransa", "🇫🇷"],
    ["eng.3", "League One", "İngiltere", ENG],
    ["eng.4", "League Two", "İngiltere", ENG],
    ["eng.5", "National League", "İngiltere", ENG],
    ["ned.2", "Eerste Divisie", "Hollanda", "🇳🇱"],
    ["sco.2", "Championship", "İskoçya", SCO],
    ["den.1", "Superliga", "Danimarka", "🇩🇰"],
    ["swe.1", "Allsvenskan", "İsveç", "🇸🇪"],
    ["nor.1", "Eliteserien", "Norveç", "🇳🇴"],
    ["por.taca.portugal", "Portekiz Kupası", "Portekiz", "🇵🇹"],
    ["ned.cup", "Hollanda Kupası", "Hollanda", "🇳🇱"],
    ["sco.tennents", "İskoçya Kupası", "İskoçya", SCO],
    ["sco.cis", "İskoçya Lig Kupası", "İskoçya", SCO],
    ["eng.trophy", "EFL Trophy", "İngiltere", ENG],
    ["uefa.champions_qual", "Şampiyonlar Ligi Eleme", "UEFA", "🇪🇺"],
    ["uefa.europa_qual", "Avrupa Ligi Eleme", "UEFA", "🇪🇺"],
    ["uefa.europa.conf_qual", "Konferans Ligi Eleme", "UEFA", "🇪🇺"],
  ]),
  ...block(3, "Dünya", [
    ["bra.2", "Série B", "Brezilya", "🇧🇷"],
    ["bra.copa_do_brazil", "Brezilya Kupası", "Brezilya", "🇧🇷"],
    ["arg.2", "Primera Nacional", "Arjantin", "🇦🇷"],
    ["arg.copa", "Arjantin Kupası", "Arjantin", "🇦🇷"],
    ["mex.2", "Liga de Expansión", "Meksika", "🇲🇽"],
    ["col.1", "Primera A", "Kolombiya", "🇨🇴"],
    ["chi.1", "Primera División", "Şili", "🇨🇱"],
    ["uru.1", "Primera División", "Uruguay", "🇺🇾"],
    ["per.1", "Liga 1", "Peru", "🇵🇪"],
    ["par.1", "Primera División", "Paraguay", "🇵🇾"],
    ["ecu.1", "LigaPro", "Ekvador", "🇪🇨"],
    ["usa.usl.1", "USL Championship", "ABD", "🇺🇸"],
    ["usa.open", "US Open Cup", "ABD", "🇺🇸"],
    ["concacaf.champions", "CONCACAF Şampiyonlar Kupası", "CONCACAF", "🌎"],
    ["concacaf.leagues.cup", "Leagues Cup", "CONCACAF", "🌎"],
    ["jpn.1", "J1 League", "Japonya", "🇯🇵"],
    ["chn.1", "Super League", "Çin", "🇨🇳"],
    ["aus.1", "A-League", "Avustralya", "🇦🇺"],
    ["ind.1", "Super League", "Hindistan", "🇮🇳"],
    ["afc.champions", "AFC Şampiyonlar Ligi", "Asya", "🌏"],
    ["rsa.1", "Premiership", "Güney Afrika", "🇿🇦"],
    ["caf.champions", "CAF Şampiyonlar Ligi", "Afrika", "🌍"],
    ["ksa.kings.cup", "Kral Kupası", "Suudi Arabistan", "🇸🇦"],
  ]),
  ...block(3, "Milli takımlar", [
    ["fifa.worldq.concacaf", "DK Elemeleri", "CONCACAF", "🌎"],
    ["fifa.worldq.afc", "DK Elemeleri", "Asya", "🌏"],
    ["fifa.worldq.caf", "DK Elemeleri", "Afrika", "🌍"],
    ["concacaf.nations.league", "CONCACAF Uluslar Ligi", "CONCACAF", "🌎"],
    ["club.friendly", "Kulüp Hazırlık Maçları", "Dünya", "🌍"],
  ]),
  ...block(3, "Kadınlar", [
    ["fifa.wwc", "Kadınlar Dünya Kupası", "FIFA", "🌍"],
    ["uefa.weuro", "Kadınlar EURO", "UEFA", "🇪🇺"],
    ["uefa.wchampions", "Kadınlar Şampiyonlar Ligi", "UEFA", "🇪🇺"],
    ["eng.w.1", "Women's Super League", "İngiltere", ENG],
    ["esp.w.1", "Liga F", "İspanya", "🇪🇸"],
    ["usa.nwsl", "NWSL", "ABD", "🇺🇸"],
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
