import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { parsePreferences, parsePlayerIds } from "../lib/storage.ts";
import { parseScenario, defaultScenario } from "../lib/club.ts";
import { parseBriefDraft, validBrief } from "../lib/brief.ts";
import { parseNotes } from "../lib/shortlist.ts";
import { metricHelp, metricDenominator } from "../lib/metricHelp.ts";

test("Saved user choices validate their own records, reject corruption and never accept prototype/persona names", () => {
  assert.equal(
    parsePreferences('{"persona":"__proto__","lang":"fr","theme":"light"}')
      .persona,
    "scout",
  );
  assert.equal(parsePreferences('{"lang":"fr"}').lang, "fr");
  for (const parse of [parsePreferences, parsePlayerIds, parseNotes])
    assert.throws(() => parse("null"));
  assert.deepEqual(
    parsePlayerIds(
      '["statsbomb:player:1","statsbomb:player:1","foreign",null]',
    ),
    ["statsbomb:player:1"],
  );
  assert.throws(() => parseNotes("{"));
  // A corrupt notebook does not affect parsing the independent player-list record.
  assert.deepEqual(parsePlayerIds('["statsbomb:player:2"]'), [
    "statsbomb:player:2",
  ]);
});

test("Saved squad plans retain user assignments and validate depth targets without storing observations", () => {
  const state = {
    ...defaultScenario,
    absent: "statsbomb:player:1",
    assignments: { "statsbomb:player:2": "CM", foreign: "ST" },
  };
  const restored = parseScenario(JSON.stringify(state));
  assert.equal(restored.absent, "statsbomb:player:1");
  assert.deepEqual(restored.assignments, { "statsbomb:player:2": "CM" });
  assert.equal(restored.minimum, 180);
  assert.throws(() =>
    parseScenario(
      JSON.stringify({ ...state, targets: { ...state.targets, ST: -1 } }),
    ),
  );
  assert.throws(() =>
    parseScenario(JSON.stringify({ ...state, shape: "constructor" })),
  );
});

test("Saved recruitment briefs restore valid inputs, exclude scores and cannot introduce unsupported metrics", () => {
  const catalog = JSON.parse(
    readFileSync(
      new URL("../public/analysis/catalog.json", import.meta.url),
      "utf8",
    ),
  );
  const templates = JSON.parse(
    readFileSync(
      new URL("../public/analysis/templates.json", import.meta.url),
      "utf8",
    ),
  );
  const brief = structuredClone(templates.cm_two_way);
  brief.min_minutes = 450;
  brief.requirements[0].weight = 5;
  brief.requirements[0].minimum = 2;
  const restored = parseBriefDraft(
    JSON.stringify({
      position: "CM",
      roleId: "cm_two_way",
      brief,
      fit_score: 100,
    }),
    catalog,
  );
  assert.equal(restored.brief.min_minutes, 450);
  assert.equal(restored.brief.requirements[0].minimum, 2);
  assert.equal("fit_score" in restored, false);
  assert.equal(validBrief(restored.brief), true);
  restored.brief.requirements.forEach((r) => (r.weight = 0));
  assert.equal(validBrief(restored.brief), false);
  brief.requirements[0].metric = "invented_speed";
  assert.throws(() =>
    parseBriefDraft(
      JSON.stringify({ position: "CM", roleId: "cm_two_way", brief }),
      catalog,
    ),
  );
});

test("Every supported metric has a Spanish and French explanation and the correct denominator kind", () => {
  const catalog = JSON.parse(
    readFileSync(
      new URL("../public/analysis/catalog.json", import.meta.url),
      "utf8",
    ),
  );
  for (const metric of Object.values(catalog.metric_catalog)) {
    for (const lang of ["es", "fr"]) {
      assert.notEqual(
        metricHelp(metric, lang),
        metric.definition,
        metric.key + ":" + lang,
      );
      assert.equal(
        metricDenominator(metric, lang).includes("90"),
        metric.unit !== "%",
      );
    }
  }
});
