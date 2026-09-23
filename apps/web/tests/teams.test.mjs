import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { matchesPlayerSearch, teamName } from "../lib/teams.ts";

test("Every real team can be searched in EN/ES/FR while provider keys stay unchanged", () => {
  const catalog = JSON.parse(
    readFileSync(
      new URL("../public/analysis/catalog.json", import.meta.url),
      "utf8",
    ),
  );
  for (const name of new Set(catalog.players.map((p) => p.team_name))) {
    const player = catalog.players.find((p) => p.team_name === name);
    for (const lang of ["en", "es", "fr"]) {
      assert.equal(
        matchesPlayerSearch(player, teamName(name, lang)),
        true,
        `${name}/${lang}`,
      );
      assert.equal(player.team_name, name);
    }
  }
  assert.equal(teamName("Spain", "es"), "España");
  assert.equal(teamName("Spain", "fr"), "Espagne");
  assert.equal(teamName("Club del usuario", "fr"), "Club del usuario");
  assert.equal(
    catalog.players.filter((p) => matchesPlayerSearch(p, "España")).length,
    25,
  );
});

test("Names tolerate accents, non-decomposing letters and pasted whitespace without changing observations", () => {
  const player = {
    player_name: "Łukáš Fixture",
    display_name: "Łukáš Fixture",
    team_name: "Czech Republic",
  };
  for (const query of [
    "lukas",
    "  Lukáš   Fixture  ",
    "Chequia",
    "República Checa",
    "Tchéquie",
  ]) {
    assert.equal(matchesPlayerSearch(player, query), true);
  }
  assert.equal(matchesPlayerSearch(player, "España"), false);
});
