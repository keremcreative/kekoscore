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
const WAL = "\u{1F3F4}\u{E0067}\u{E0062}\u{E0077}\u{E006C}\u{E0073}\u{E007F}";
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
    ["tur.2", "1. Lig", "Türkiye", "🇹🇷"],
    ["por.1", "Liga Portugal", "Portekiz", "🇵🇹"],
    ["ned.1", "Eredivisie", "Hollanda", "🇳🇱"],
    ["eng.2", "Championship", "İngiltere", ENG],
    ["bel.1", "Pro League", "Belçika", "🇧🇪"],
    ["sco.1", "Premiership", "İskoçya", SCO],
    ["gre.1", "Super League", "Yunanistan", "🇬🇷"],
    ["aut.1", "Bundesliga", "Avusturya", "🇦🇹"],
    ["rus.1", "Premier Liga", "Rusya", "🇷🇺"],
    ["sui.1", "Super League", "İsviçre", "🇨🇭"],
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
    ["ita.3", "Serie C", "İtalya", "🇮🇹"],
    ["ned.3", "Tweede Divisie", "Hollanda", "🇳🇱"],
    ["sco.3", "League One", "İskoçya", SCO],
    ["sco.4", "League Two", "İskoçya", SCO],
    ["sco.challenge", "Challenge Cup", "İskoçya", SCO],
    ["aut.2", "2. Liga", "Avusturya", "🇦🇹"],
    ["sui.2", "Challenge League", "İsviçre", "🇨🇭"],
    ["den.2", "1. Division", "Danimarka", "🇩🇰"],
    ["swe.2", "Superettan", "İsveç", "🇸🇪"],
    ["nor.2", "1. Divisjon", "Norveç", "🇳🇴"],
    ["fin.1", "Veikkausliiga", "Finlandiya", "🇫🇮"],
    ["isr.1", "Premier League", "İsrail", "🇮🇱"],
    ["cyp.1", "1. Lig", "Kıbrıs", "🇨🇾"],
    ["cze.1", "1. Lig", "Çekya", "🇨🇿"],
    ["rou.1", "Liga 1", "Romanya", "🇷🇴"],
    ["irl.1", "Premier Division", "İrlanda", "🇮🇪"],
    ["nir.1", "Premiership", "Kuzey İrlanda", "🇬🇧"],
    ["wal.1", "Cymru Premier", "Galler", WAL],
    ["ned.supercup", "Hollanda Süper Kupası", "Hollanda", "🇳🇱"],
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
    ["bra.3", "Série C", "Brezilya", "🇧🇷"],
    ["bra.camp.paulista", "Paulista", "Brezilya", "🇧🇷"],
    ["bra.camp.carioca", "Carioca", "Brezilya", "🇧🇷"],
    ["bra.camp.mineiro", "Mineiro", "Brezilya", "🇧🇷"],
    ["bra.camp.gaucho", "Gaúcho", "Brezilya", "🇧🇷"],
    ["arg.3", "Primera B", "Arjantin", "🇦🇷"],
    ["uru.2", "Segunda División", "Uruguay", "🇺🇾"],
    ["col.copa", "Kolombiya Kupası", "Kolombiya", "🇨🇴"],
    ["chi.copa_chi", "Şili Kupası", "Şili", "🇨🇱"],
    ["ven.1", "Liga FUTVE", "Venezuela", "🇻🇪"],
    ["bol.1", "División Profesional", "Bolivya", "🇧🇴"],
    ["hon.1", "Liga Nacional", "Honduras", "🇭🇳"],
    ["crc.1", "Primera División", "Kosta Rika", "🇨🇷"],
    ["gua.1", "Liga Nacional", "Guatemala", "🇬🇹"],
    ["slv.1", "Primera División", "El Salvador", "🇸🇻"],
    ["usa.usl.l1", "USL League One", "ABD", "🇺🇸"],
    ["conmebol.recopa", "Recopa Sudamericana", "Güney Amerika", "🌎"],
    ["concacaf.central.american.cup", "Orta Amerika Kupası", "CONCACAF", "🌎"],
    ["campeones.cup", "Campeones Cup", "CONCACAF", "🌎"],
    ["ind.2", "I-League", "Hindistan", "🇮🇳"],
    ["idn.1", "Super League", "Endonezya", "🇮🇩"],
    ["tha.1", "Thai League 1", "Tayland", "🇹🇭"],
    ["mys.1", "Super League", "Malezya", "🇲🇾"],
    ["sgp.1", "Premier League", "Singapur", "🇸🇬"],
    ["afc.cup", "AFC Kupası", "Asya", "🌏"],
    ["caf.confed", "CAF Konfederasyon Kupası", "Afrika", "🌍"],
    ["nga.1", "Professional League", "Nijerya", "🇳🇬"],
    ["gha.1", "Premier League", "Gana", "🇬🇭"],
    ["ken.1", "Premier League", "Kenya", "🇰🇪"],
    ["uga.1", "Premier League", "Uganda", "🇺🇬"],
    ["zam.1", "Super League", "Zambiya", "🇿🇲"],
    ["zim.1", "Premier Soccer League", "Zimbabve", "🇿🇼"],
  ]),
  ...block(3, "Milli takımlar", [
    ["fifa.worldq.concacaf", "DK Elemeleri", "CONCACAF", "🌎"],
    ["fifa.worldq.afc", "DK Elemeleri", "Asya", "🌏"],
    ["fifa.worldq.caf", "DK Elemeleri", "Afrika", "🌍"],
    ["concacaf.nations.league", "CONCACAF Uluslar Ligi", "CONCACAF", "🌎"],
    ["fifa.worldq.ofc", "DK Elemeleri", "Okyanusya", "🌏"],
    ["caf.nations_qual", "Afrika Uluslar Kupası Elemeleri", "CAF", "🌍"],
    ["concacaf.gold_qual", "Gold Cup Elemeleri", "CONCACAF", "🌎"],
    ["fifa.world.u17", "U17 Dünya Kupası", "FIFA", "🌍"],
    ["uefa.euro.u19", "U19 Avrupa Şampiyonası", "UEFA", "🇪🇺"],
    ["uefa.euro_u21_qual", "U21 EURO Elemeleri", "UEFA", "🇪🇺"],
    ["fifa.olympics", "Olimpiyatlar", "FIFA", "🌍"],
    ["global.gulf_cup", "Körfez Kupası", "Asya", "🌏"],
    ["aff.championship", "ASEAN Şampiyonası", "Asya", "🌏"],
    ["club.friendly", "Kulüp Hazırlık Maçları", "Dünya", "🌍"],
  ]),
  ...block(3, "Kadınlar", [
    ["fifa.wwc", "Kadınlar Dünya Kupası", "FIFA", "🌍"],
    ["uefa.weuro", "Kadınlar EURO", "UEFA", "🇪🇺"],
    ["uefa.wchampions", "Kadınlar Şampiyonlar Ligi", "UEFA", "🇪🇺"],
    ["eng.w.1", "Women's Super League", "İngiltere", ENG],
    ["esp.w.1", "Liga F", "İspanya", "🇪🇸"],
    ["usa.nwsl", "NWSL", "ABD", "🇺🇸"],
    ["fra.w.1", "Première Ligue", "Fransa", "🇫🇷"],
    ["ned.w.1", "Vrouwen Eredivisie", "Hollanda", "🇳🇱"],
    ["aus.w.1", "A-League Women", "Avustralya", "🇦🇺"],
    ["mex.w.1", "Liga MX Femenil", "Meksika", "🇲🇽"],
    ["uefa.w.nations", "Kadınlar Uluslar Ligi", "UEFA", "🇪🇺"],
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
