/**
 * Canlı anlatım ve momentum. ESPN "baskı" verisi vermiyor; momentumu anlatımdaki hücum
 * olaylarından (gol, isabetli şut, şut, korner) dakika dakika hesaplıyoruz: her olay
 * kendi dakikasında en güçlü, sonraki birkaç dakikada sönümlenerek etki eder.
 */

export type PlayKind = "goal" | "own-goal" | "penalty" | "shot-on" | "shot" | "corner" | "foul" | "offside" | "yellow" | "red" | "sub" | "period" | "other";

export interface Play {
  minute: string; // "45'+2'"
  min: number; // 47
  kind: PlayKind;
  side?: "home" | "away";
  text: string;
}

export interface MomentumPoint {
  min: number;
  /** -1 (deplasman baskısı) … +1 (ev sahibi baskısı) */
  v: number;
}

const WEIGHT: Partial<Record<PlayKind, number>> = { goal: 3, penalty: 3, "shot-on": 2, shot: 1.2, corner: 0.9, offside: 0.3 };
const DECAY = [1, 0.7, 0.45, 0.25, 0.12];

/** "45'+2'" -> 47, "90'+5'" -> 95, "67'" -> 67 */
export function minuteNum(s: string): number {
  const m = s.match(/(\d+)'?\s*(?:\+\s*(\d+))?/);
  return m ? Number(m[1]) + Number(m[2] ?? 0) : 0;
}

export function momentum(plays: Play[], upTo?: number): MomentumPoint[] {
  const attacks = plays.filter((p) => p.side && WEIGHT[p.kind]);
  if (attacks.length < 3) return [];
  const last = Math.max(upTo ?? 0, ...plays.map((p) => p.min), 1);
  const end = Math.min(Math.max(last, 1), 130);
  const raw = new Array(end + 1).fill(0);
  for (const p of attacks) {
    // Kendi kalesine gol rakibin baskısı sayılır; ESPN takım olarak golü atan tarafı verir
    const sign = p.side === "home" ? 1 : -1;
    DECAY.forEach((d, i) => {
      const m = p.min + i;
      if (m >= 1 && m <= end) raw[m] += sign * WEIGHT[p.kind]! * d;
    });
  }
  const max = Math.max(...raw.map(Math.abs), 1.5);
  return raw.slice(1).map((v, i) => ({ min: i + 1, v: Math.max(-1, Math.min(1, v / max)) }));
}

// ESPN anlatımı İngilizce: sık geçen kalıpları Türkçeleştir
const TR: [RegExp, string][] = [
  [/^Goal!\s*/i, "GOL! "],
  [/^Own Goal by\s*/i, "Kendi kalesine gol: "],
  [/^Attempt saved\.\s*/i, "Kurtarış. "],
  [/^Attempt missed\.\s*/i, "Şut dışarıda. "],
  [/^Attempt blocked\.\s*/i, "Şut blokta. "],
  [/^Penalty saved!\s*/i, "Penaltı kurtarıldı! "],
  [/^Penalty missed!\s*/i, "Penaltı kaçtı! "],
  [/^Corner,\s*/i, "Korner, "],
  [/^Foul by\s*/i, "Faul: "],
  [/^Offside,\s*/i, "Ofsayt, "],
  [/^Substitution,\s*/i, "Oyuncu değişikliği, "],
  [/^Hand ball by\s*/i, "Elle oynama: "],
  [/^Delay in match\b.*/i, "Oyun durdu."],
  [/^Delay over\..*/i, "Oyun yeniden başladı."],
  [/^First Half begins\.?/i, "İlk yarı başladı."],
  [/^First Half ends,?/i, "İlk yarı bitti:"],
  [/^Second Half begins\b.*/i, "İkinci yarı başladı."],
  [/^Second Half ends,?/i, "İkinci yarı bitti:"],
  [/^Match ends,?/i, "Maç bitti:"],
  [/^Lineups are announced.*/i, "Kadrolar açıklandı, oyuncular ısınıyor."],
  [/ is shown the yellow card/i, " sarı kart gördü"],
  [/ is shown the red card/i, " kırmızı kart gördü"],
  [/ wins a free kick in the attacking half\./i, " rakip yarı sahada serbest vuruş kazandı."],
  [/ wins a free kick in the defensive half\./i, " kendi yarı sahasında serbest vuruş kazandı."],
  [/ wins a free kick\b/i, " serbest vuruş kazandı"],
  [/Conceded by /i, "yaptıran: "],
  [/ replaces /i, " oyuna girdi, çıkan: "],
  [/ because of an injury/i, " (sakatlık)"],
];
export const trText = (s: string) => TR.reduce((acc, [re, to]) => acc.replace(re, to), s.trim());

/** Anlatım metninden olay türü (ESPN play.type yoksa) */
export function kindFromText(text: string, type = ""): PlayKind {
  const t = `${type} ${text}`.toLowerCase();
  if (/own goal/.test(t)) return "own-goal";
  if (/^goal!|\bgoal\b.*(scored|!)|type: goal|penalty - scored/.test(t) || /^goal/.test(type.toLowerCase())) return /penalty/.test(t) ? "penalty" : "goal";
  if (/attempt saved|shot on target|penalty saved/.test(t)) return "shot-on";
  if (/attempt missed|attempt blocked|shot off target|shot blocked|hits the (bar|post)|penalty missed/.test(t)) return "shot";
  if (/^corner|corner kick/.test(t)) return "corner";
  if (/red card|second yellow/.test(t)) return "red";
  if (/yellow card/.test(t)) return "yellow";
  if (/substitution/.test(t)) return "sub";
  if (/offside/.test(t)) return "offside";
  if (/^foul|foul by/.test(t)) return "foul";
  if (/half begins|half ends|match ends|kickoff|halftime|end regular/.test(t)) return "period";
  return "other";
}
