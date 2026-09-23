import type { Language, Player } from "./contracts";

// Presentation aliases only. Provider names/IDs remain the filter and storage keys.
import names from "../../../core/reference/team_names.json" with { type: "json" };
const nationalTeams: Record<string, readonly string[]> = names;
export function teamName(sourceName: string, language: Language): string {
  return Object.hasOwn(nationalTeams, sourceName)
    ? nationalTeams[sourceName][{ en: 0, es: 1, fr: 2 }[language]]
    : sourceName;
}
function searchKey(value: string): string {
  const letters: Record<string, string> = {
    ł: "l",
    ø: "o",
    đ: "d",
    ð: "d",
    ß: "ss",
    æ: "ae",
    œ: "oe",
    ı: "i",
  };
  return value
    .normalize("NFKD")
    .toLowerCase()
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[łøđðßæœı]/g, (letter) => letters[letter])
    .replace(/\s+/g, " ")
    .trim();
}
export function matchesPlayerSearch(
  player: Pick<Player, "player_name" | "display_name" | "team_name">,
  query: string,
): boolean {
  const teamAliases = Object.hasOwn(nationalTeams, player.team_name)
    ? nationalTeams[player.team_name]
    : [player.team_name];
  return searchKey(
    [player.player_name, player.display_name, ...teamAliases].join(" "),
  ).includes(searchKey(query));
}
