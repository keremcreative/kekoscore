/** Tarayıcıda seçili saat dilimi (tz çerezi) */
export function clientTz(): string {
  if (typeof document === "undefined") return "Europe/Istanbul";
  return /(?:^|;\s*)tz=us/.test(document.cookie) ? "America/New_York" : "Europe/Istanbul";
}
