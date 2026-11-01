export interface League {
  code: string; // ESPN slug
  name: string;
  country: string;
  flag: string;
}

/** Ana sayfada sırasıyla gösterilen ligler. İstediğin gibi ekle/çıkar. */
export const LEAGUES: League[] = [
  { code: "tur.1", name: "Süper Lig", country: "Türkiye", flag: "🇹🇷" },
  { code: "uefa.champions", name: "Şampiyonlar Ligi", country: "UEFA", flag: "🇪🇺" },
  { code: "uefa.europa", name: "Avrupa Ligi", country: "UEFA", flag: "🇪🇺" },
  { code: "uefa.europa.conf", name: "Konferans Ligi", country: "UEFA", flag: "🇪🇺" },
  { code: "eng.1", name: "Premier League", country: "İngiltere", flag: "\u{1F3F4}\u{E0067}\u{E0062}\u{E0065}\u{E006E}\u{E0067}\u{E007F}" },
  { code: "esp.1", name: "LaLiga", country: "İspanya", flag: "🇪🇸" },
  { code: "ita.1", name: "Serie A", country: "İtalya", flag: "🇮🇹" },
  { code: "ger.1", name: "Bundesliga", country: "Almanya", flag: "🇩🇪" },
  { code: "fra.1", name: "Ligue 1", country: "Fransa", flag: "🇫🇷" },
];

export const leagueByCode = (code: string) => LEAGUES.find((l) => l.code === code);

