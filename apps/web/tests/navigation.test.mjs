import test from "node:test";
import assert from "node:assert/strict";
import { navigationURL, readNavigation } from "../lib/navigation.ts";
import { initialAdvanced } from "../lib/scouting.ts";

const defaults = {
  query: "",
  position: "",
  team: "",
  minimum: 180,
  advanced: initialAdvanced,
  watchStatus: "",
};
test("Browser history restores each module/player and its own search criteria", () => {
  const state = {
    version: 1,
    datasetId: "ds",
    mode: "players",
    playerId: "statsbomb:player:6655",
    filters: {
      ...defaults,
      query: "fabian",
      position: "DM",
      team: "Spain",
      advanced: { ...initialAdvanced, metric1: "shots_per90", floor1: 90 },
    },
  };
  const url = navigationURL(state.mode, state.playerId);
  assert.deepEqual(
    readNavigation(url, state, "ds", defaults, ["shots_per90"], ["Spain"]),
    state,
  );
  assert.deepEqual(
    readNavigation(
      url,
      state,
      "new-dataset",
      defaults,
      ["shots_per90"],
      ["Spain"],
    ).filters,
    defaults,
  );
  assert.equal(
    readNavigation("?view=shortlist", null, "ds", defaults, [], []).filters
      .minimum,
    0,
  );
});
test("Deep-linked identities are preserved for an explicit missing-player state, never silently rewritten", () => {
  const restored = readNavigation(
    "?view=players&player=statsbomb%3Aplayer%3A999999999",
    null,
    "ds",
    defaults,
    [],
    [],
  );
  assert.equal(restored.playerId, "statsbomb:player:999999999");
  assert.equal(
    readNavigation("?view=constructor", {}, "ds", defaults, [], []).mode,
    "players",
  );
});
test("Stale or malformed history filters cannot mix datasets or request unavailable metrics", () => {
  const state = {
    version: 1,
    datasetId: "ds",
    mode: "players",
    playerId: "statsbomb:player:1",
    filters: {
      ...defaults,
      minimum: -1,
      team: "Unavailable",
      advanced: {
        ...initialAdvanced,
        metric1: "invented_speed",
        minConfidence: 500,
      },
    },
  };
  const restored = readNavigation(
    navigationURL("players", state.playerId),
    state,
    "ds",
    defaults,
    [],
    [],
  );
  assert.equal(restored.filters.minimum, 180);
  assert.equal(restored.filters.team, "");
  assert.equal(restored.filters.advanced.metric1, "");
  assert.equal(restored.filters.advanced.minConfidence, 0);
  assert.equal(
    readNavigation("?view=data", state, "ds", defaults, [], []).mode,
    "data",
  );
});
