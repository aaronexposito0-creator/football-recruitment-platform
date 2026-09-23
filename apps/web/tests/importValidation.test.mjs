import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  validateClubAnalysis,
  validateImportPreview,
} from "../lib/validation.ts";
import { importIssue } from "../lib/explanations.ts";

const catalog = JSON.parse(
  readFileSync(
    new URL("../public/analysis/catalog.json", import.meta.url),
    "utf8",
  ),
);
const source = catalog.players.find(
  (p) => p.player_id === "statsbomb:player:316046",
);
function analysis(verified = false, selected = source) {
  const source = selected;
  const evidence = catalog.scouting_index[source.player_id];
  const importId = "c".repeat(24);
  return {
    import_id: importId,
    label: "Import validation fixture",
    reference_dataset_id: catalog.coverage.dataset_id,
    data_quality: 100,
    quality_checks: { passed: 24, total: 24 },
    data_coverage: evidence.data_coverage,
    rows_with_issues: 0,
    players: [
      {
        player_id: `upload:${importId}:row:2`,
        source_player_id: verified ? source.player_id : null,
        player_name: source.display_name,
        team_name: source.team_name,
        source_row: 2,
        position_group: source.position_group,
        minutes: source.minutes,
        age: null,
        metrics: structuredClone(source.metrics),
        totals: structuredClone(source.totals),
        issues: [],
        data_coverage: evidence.data_coverage,
        confidence: verified ? evidence.confidence : null,
        benchmark: verified
          ? {
              reference_player_id: source.player_id,
              reference_name: source.display_name,
              cohort_size: evidence.cohort_size,
              eligible: evidence.eligible,
              percentiles: structuredClone(evidence.percentiles),
            }
          : null,
      },
    ],
  };
}

test("Import previews reject invalid mappings, dimensions and source-row lineage before rendering", () => {
  const preview = {
    headers: ["player_name", "minutes", "shots"],
    rows: [
      [
        source.display_name,
        String(source.minutes),
        String(source.totals.shots),
      ],
    ],
    row_count: 1,
    source_rows: [2],
    warnings: [],
    file_sha256: "a".repeat(64),
    suggested_mapping: {
      player_name: "player_name",
      minutes: "minutes",
      shots: "shots",
    },
    fields: [
      "player_name",
      "player_id",
      "team_name",
      "position_group",
      "minutes",
      "age",
      "dataset_id",
      ...Object.keys(catalog.metric_catalog)
        .filter((key) => key.endsWith("_per90"))
        .map((key) => key.slice(0, -6)),
    ],
  };
  validateImportPreview(preview, catalog);
  const withNotes = structuredClone(preview);
  withNotes.headers.push("scout_note");
  withNotes.rows[0].push("📝".repeat(4096));
  validateImportPreview(withNotes, catalog);
  withNotes.rows[0][3] += "📝";
  assert.throws(
    () => validateImportPreview(withNotes, catalog),
    /Invalid football/,
  );
  for (const mutate of [
    (p) => {
      p.rows = null;
    },
    (p) => {
      p.rows[0].pop();
    },
    (p) => {
      p.source_rows = [];
    },
    (p) => {
      p.source_rows = [0];
    },
    (p) => {
      p.suggested_mapping.goals = "shots";
    },
    (p) => {
      p.suggested_mapping.player_name = "absent";
    },
    (p) => {
      p.fields.push("invented_speed");
    },
  ]) {
    const broken = structuredClone(preview);
    mutate(broken);
    assert.throws(
      () => validateImportPreview(broken, catalog),
      /Invalid football/,
    );
  }
});

test("Duplicate source identities cannot carry external benchmarks or hide their conflict", () => {
  const a = analysis(true);
  const duplicate = structuredClone(a.players[0]);
  duplicate.player_id = `upload:${a.import_id}:row:3`;
  duplicate.source_row = 3;
  a.players.push(duplicate);
  assert.throws(() => validateClubAnalysis(a, catalog), /Invalid football/);
  for (const p of a.players) {
    p.benchmark = null;
    p.confidence = null;
    p.issues = ["player_id:duplicate_source_id"];
  }
  a.rows_with_issues = 2;
  validateClubAnalysis(a, catalog);
});

test("My Club keeps unknown evidence null and accepts an unchanged canonical benchmark", () => {
  validateClubAnalysis(analysis(), catalog);
  validateClubAnalysis(analysis(true), catalog);
  const incomplete = analysis();
  const row = incomplete.players[0];
  row.minutes = null;
  row.metrics = Object.fromEntries(
    Object.keys(row.metrics).map((key) => [key, null]),
  );
  row.metrics.pass_completion = source.metrics.pass_completion;
  row.data_coverage = incomplete.data_coverage =
    100 / Object.keys(row.metrics).length;
  row.issues = ["minutes:unavailable"];
  incomplete.rows_with_issues = 1;
  validateClubAnalysis(incomplete, catalog);
});

for (const source of [
  catalog.players.find((p) => p.display_name === "Lamine Yamal"),
  catalog.players.find((p) => p.display_name === "Luka Modrić"),
])
  test(`A partial verified import reproduces its own evidence: ${source.display_name}`, () => {
    const evidence = catalog.scouting_index[source.player_id];
    const a = analysis(true, source);
    const p = a.players[0];
    const key = "shots_per90";
    for (const metric of Object.keys(p.metrics))
      if (metric !== key) p.metrics[metric] = null;
    for (const total of Object.keys(p.totals))
      if (total !== "shots") p.totals[total] = null;
    p.benchmark.percentiles = { [key]: evidence.percentiles[key] };
    p.data_coverage = a.data_coverage = 100 / Object.keys(p.metrics).length;
    const peers = catalog.players.filter(
      (other) =>
        other.dataset_id === source.dataset_id &&
        other.competition_id === source.competition_id &&
        other.season_id === source.season_id &&
        other.gender === source.gender &&
        other.position_group === source.position_group &&
        other.minutes >= 180 &&
        other.metrics[key] !== null,
    );
    const expected =
      (100 * Math.min(p.minutes / 900, 1) * Math.min(peers.length / 30, 1)) /
      Object.keys(p.metrics).length;
    p.confidence = expected;
    validateClubAnalysis(a, catalog);
    // Both incorrect numbers pass the old coverage/full-source upper bounds.
    for (const wrong of [p.data_coverage, expected / 2]) {
      p.confidence = wrong;
      assert.throws(() => validateClubAnalysis(a, catalog), /Invalid football/);
    }
  });

test("My Club cannot present malformed players, invented rates or unverified confidence and percentiles", () => {
  for (const mutate of [
    (a) => {
      a.players = null;
    },
    (a) => {
      a.reference_dataset_id = "old";
    },
    (a) => {
      a.players[0].player_id = source.player_id;
    },
    (a) => {
      a.players[0].metrics.shots_per90 = 900;
    },
    (a) => {
      a.players[0].minutes = null;
    },
    (a) => {
      a.players[0].confidence = 99;
    },
    (a) => {
      a.data_coverage = 95;
    },
    (a) => {
      a.data_quality = 99;
    },
    (a) => {
      a.quality_checks.total = 0;
    },
    (a) => {
      a.quality_checks.passed = 25;
    },
    (a) => {
      a.players[0].benchmark = analysis(true).players[0].benchmark;
      a.players[0].benchmark.percentiles.shots_per90 = 100;
    },
  ]) {
    const broken = analysis();
    mutate(broken);
    assert.throws(
      () => validateClubAnalysis(broken, catalog),
      /Invalid football|Dataset changed/,
    );
  }
});

test("Arithmetically correct per90 cannot legitimise impossible imported subtotals", () => {
  for (const [field, upper] of [
    ["non_penalty_goals", "shots"],
    ["npxg", "shots"],
    ["progressive_passes", "passes"],
    ["xa", "passes"],
    ["assists", "passes"],
    ["passes_into_final_third", "passes"],
  ]) {
    const a = analysis();
    const p = a.players[0];
    p.minutes = 90;
    p.totals = Object.fromEntries(
      Object.keys(p.totals).map((key) => [key, null]),
    );
    p.metrics = Object.fromEntries(
      Object.keys(p.metrics).map((key) => [key, null]),
    );
    p.totals[field] = p.metrics[field + "_per90"] = 4;
    p.totals[upper] = p.metrics[upper + "_per90"] = 3;
    p.data_coverage = a.data_coverage = 200 / 21;
    a.quality_checks = { passed: 5, total: 5 };
    assert.throws(() => validateClubAnalysis(a, catalog), /Invalid football/);
    p.totals[field] = p.metrics[field + "_per90"] = 2;
    validateClubAnalysis(a, catalog);
  }
  const a = analysis();
  const p = a.players[0];
  const impossible = p.totals.passes + p.totals.carries + 1;
  p.totals.entries_into_box = impossible;
  p.metrics.entries_into_box_per90 = (impossible * 90) / p.minutes;
  assert.throws(() => validateClubAnalysis(a, catalog), /Invalid football/);
  for (const lang of ["en", "es", "fr"]) {
    const explanation = importIssue(
      "entries_into_box:exceeds_passes+carries",
      catalog,
      lang,
    );
    assert.ok(
      explanation.includes(catalog.metric_catalog.passes_per90.names[lang]),
    );
    assert.ok(
      explanation.includes(catalog.metric_catalog.carries_per90.names[lang]),
    );
    assert.ok(!explanation.includes("exceeds_"));
  }
});
