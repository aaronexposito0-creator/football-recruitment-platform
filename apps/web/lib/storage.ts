import type { Language, Persona } from "./contracts";

export interface Preferences {
  lang: Language;
  theme: string;
  persona: Persona;
}
export const defaultPreferences: Preferences = {
  lang: "es",
  theme: "green",
  persona: "scout",
};
export function parsePreferences(raw: string): Preferences {
  const p = JSON.parse(raw);
  if (!p || typeof p !== "object" || Array.isArray(p))
    throw new Error("Invalid preferences");
  return {
    lang: ["en", "es", "fr"].includes(p.lang) ? p.lang : "es",
    theme: ["green", "dark", "light"].includes(p.theme) ? p.theme : "green",
    persona: [
      "scout",
      "sporting_director",
      "coach",
      "analyst",
      "player",
    ].includes(p.persona)
      ? p.persona
      : "scout",
  };
}
export function parsePlayerIds(raw: string): string[] {
  const p: unknown = JSON.parse(raw);
  if (!Array.isArray(p)) throw new Error("Invalid player list");
  return [
    ...new Set(
      p.filter(
        (v): v is string =>
          typeof v === "string" && /^statsbomb:player:\d+$/.test(v),
      ),
    ),
  ].slice(0, 1000);
}
