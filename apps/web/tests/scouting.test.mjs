import test from "node:test";
import assert from "node:assert/strict";
import {
  squadDepth,
  formations,
  importPlanReducer,
  emptyImportPlans,
  defaultScenario,
  mappingTextIssues,
} from "../lib/club.ts";
import { passesAdvanced, initialAdvanced } from "../lib/scouting.ts";
import { parseNotes } from "../lib/shortlist.ts";
import { csvText } from "../lib/export.ts";

test("Long auxiliary notes stay unmapped; mapping one as a player field gives row context and clears when corrected", () => {
  const preview = {
    headers: ["name", "minutes", "notes"],
    rows: [["Parser fixture", "90", "📝".repeat(3000)]],
    source_rows: [5],
  };
  const valid = { player_name: "name", minutes: "minutes" };
  assert.deepEqual(mappingTextIssues(preview, valid), []);
  assert.deepEqual(
    mappingTextIssues(preview, { ...valid, player_name: "notes" }),
    [{ field: "player_name", column: "notes", sourceRow: 5 }],
  );
  assert.deepEqual(mappingTextIssues(preview, valid), []);
  preview.rows[0][2] = "📝".repeat(256);
  assert.deepEqual(
    mappingTextIssues(preview, { ...valid, player_name: "notes" }),
    [],
  );
});

test("Depth uses observed exposure, one slot per player and isolated departure scenarios", () => {
  const players = [
    { player_id: "a", player_name: "A", position_group: "W", minutes: 450 },
    { player_id: "b", player_name: "B", position_group: "W", minutes: 80 },
    { player_id: "c", player_name: "C", position_group: "UNK", minutes: 200 },
    { player_id: "d", player_name: "D", position_group: "ST", minutes: null },
  ];
  const before = squadDepth(players, formations["4-3-3"], 180);
  assert.equal(before.find((p) => p.position === "W").available.length, 1);
  assert.equal(before.find((p) => p.position === "ST").available.length, 0);
  assert.equal(
    squadDepth(players, formations["4-3-3"], 180, "a").find(
      (p) => p.position === "W",
    ).gap,
    4,
  );
  assert.equal(players[0].minutes, 450);
  const reassigned = players.map((p) =>
    p.player_id === "a" ? { ...p, position_group: "ST" } : p,
  );
  const after = squadDepth(reassigned, formations["4-3-3"], 180);
  assert.equal(
    after.reduce((sum, g) => sum + g.available.length, 0),
    1,
  );
  assert.equal(
    after.find((p) => p.position === "ST").available[0].player_id,
    "a",
  );
});

test("Imported duplicate identities and unnamed rows cannot fill squad targets, even across positions or team filters", () => {
  const players = [
    {
      player_id: "row:2",
      source_player_id: "same",
      player_name: "A",
      position_group: "W",
      minutes: 450,
    },
    {
      player_id: "row:3",
      source_player_id: "same",
      player_name: "A",
      position_group: "ST",
      minutes: 300,
    },
    {
      player_id: "row:4",
      source_player_id: null,
      player_name: null,
      position_group: "CB",
      minutes: 300,
    },
    {
      player_id: "row:5",
      source_player_id: "other-team-duplicate",
      player_name: "B",
      position_group: "W",
      minutes: 450,
      issues: ["player_id:duplicate_source_id"],
    },
    {
      player_id: "row:6",
      source_player_id: null,
      player_name: "C",
      position_group: "W",
      minutes: 450,
    },
    {
      player_id: "row:7",
      source_player_id: null,
      player_name: "D",
      position_group: "W",
      minutes: 90,
    },
    {
      player_id: "row:8",
      source_player_id: null,
      player_name: "E",
      position_group: "ST",
      minutes: null,
    },
  ];
  const original = structuredClone(players);
  const groups = squadDepth(players, { W: 2, ST: 2, CB: 2 }, 180);
  assert.deepEqual(
    groups.flatMap((g) => g.available.map((p) => p.player_id)),
    ["row:6"],
  );
  assert.equal(groups.find((g) => g.position === "W").gap, 1);
  const statuses = Object.assign({}, ...groups.map((g) => g.statuses));
  assert.equal(statuses["row:2"], "duplicateIdentity");
  assert.equal(statuses["row:3"], "duplicateIdentity");
  assert.equal(statuses["row:4"], "missingIdentity");
  assert.equal(statuses["row:5"], "duplicateIdentity");
  assert.equal(statuses["row:7"], "belowMinutes");
  assert.equal(statuses["row:8"], "missingMinutes");
  assert.equal(
    squadDepth(players, { W: 2 }, 180, "row:6")[0].statuses["row:6"],
    "absent",
  );
  assert.equal(
    squadDepth(players, { W: 2 }, 180, "row:6")[0].available.length,
    0,
  );
  assert.deepEqual(players, original);
});

test("Imported plans survive team navigation but a new analysis clears them and rejects stale edits", () => {
  let state = importPlanReducer(emptyImportPlans, {
    type: "reset",
    importId: "import-a",
  });
  const alpha = {
    ...defaultScenario,
    minimum: 450,
    absent: "upload:import-a:row:2",
    targets: { ...defaultScenario.targets, W: 3 },
  };
  const beta = {
    ...defaultScenario,
    shape: "4-2-3-1",
    targets: { ...formations["4-2-3-1"] },
  };
  state = importPlanReducer(state, {
    type: "edit",
    importId: "import-a",
    team: "A",
    scenario: alpha,
  });
  state = importPlanReducer(state, {
    type: "edit",
    importId: "import-a",
    team: "constructor",
    scenario: beta,
  });
  const restored = state.teams.get("A");
  const depth = squadDepth(
    [
      {
        player_id: "upload:import-a:row:2",
        player_name: "Parser A",
        position_group: "W",
        minutes: 500,
      },
      {
        player_id: "upload:import-a:row:3",
        player_name: "Parser B",
        position_group: "W",
        minutes: 300,
      },
      {
        player_id: "upload:import-a:row:4",
        player_name: "Parser C",
        position_group: "W",
        minutes: 600,
      },
    ],
    restored.targets,
    restored.minimum,
    restored.absent,
  );
  assert.equal(depth.find((g) => g.position === "W").available.length, 1);
  assert.equal(depth.find((g) => g.position === "W").gap, 2);
  assert.equal(state.teams.get("constructor").targets.DM, 4);
  assert.equal(emptyImportPlans.teams.size, 0);
  const reset = importPlanReducer(state, {
    type: "reset",
    importId: "import-b",
  });
  const late = importPlanReducer(reset, {
    type: "edit",
    importId: "import-a",
    team: "A",
    scenario: alpha,
  });
  assert.equal(late.importId, "import-b");
  assert.equal(late.teams.size, 0);
  assert.equal(state.teams.size, 2);
});

test("Advanced search never passes a missing percentile through a floor or a missing confidence", () => {
  const summary = {
    eligible: true,
    data_coverage: 100,
    confidence: 40,
    percentiles: { shots_per90: 80, xa_per90: null },
  };
  assert.equal(
    passesAdvanced(summary, {
      ...initialAdvanced,
      metric1: "shots_per90",
      floor1: 80,
    }),
    true,
  );
  assert.equal(
    passesAdvanced(summary, {
      ...initialAdvanced,
      metric1: "xa_per90",
      floor1: 0,
    }),
    false,
  );
  assert.equal(
    passesAdvanced(summary, { ...initialAdvanced, minConfidence: 41 }),
    false,
  );
  assert.equal(
    passesAdvanced(undefined, { ...initialAdvanced, benchmarkOnly: true }),
    false,
  );
});

test("Scouting notes have bounded content, explicit status and formula-safe CSV export", () => {
  const notes = parseNotes(
    JSON.stringify({
      "statsbomb:player:1": {
        status: "priority",
        note: "=SUM(A1:A9)",
        updated_at: "2026-09-10",
      },
      foreign: { status: "priority", note: "x" },
      "statsbomb:player:2": { status: "invented", note: "x" },
    }),
  );
  assert.equal(Object.keys(notes).length, 1);
  const text = csvText(
    [
      {
        player_id: "statsbomb:player:1",
        metrics: { shots_per90: 2 },
        totals: { shots: 4 },
      },
    ],
    { metric_catalog: { shots_per90: {} }, coverage: {} },
    notes,
  );
  assert.ok(text.includes("'="));
  assert.ok(text.includes('"priority"'));
  assert.ok(text.endsWith('"4","2"'));
});
