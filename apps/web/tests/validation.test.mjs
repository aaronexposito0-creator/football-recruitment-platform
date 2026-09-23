import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import {
  validateCatalog,
  validateProfile,
  validateSimilarity,
  validateVisuals,
  validateFit,
} from "../lib/validation.ts";
import {
  loadCatalog,
  loadProfile,
  loadSimilar,
  loadVisuals,
} from "../lib/api.ts";

const root = new URL("../public/analysis/", import.meta.url);
const read = (path) => JSON.parse(readFileSync(new URL(path, root), "utf8"));
const catalog = read("catalog.json");
const dataset = catalog.coverage.dataset_id;
const id = "statsbomb:player:6655";

test("Every published player, similarity, map and fit passes the same boundary as the UI", () => {
  assert.equal(validateCatalog(catalog), catalog);
  for (const p of catalog.players) {
    const file = p.player_id.replaceAll(":", "-") + ".json";
    validateProfile(read(`profiles/${file}`), p.player_id, dataset);
    validateSimilarity(read(`similar/${file}`), p.player_id, dataset);
    validateVisuals(read(`visuals/${file}`), p.player_id, dataset);
  }
  for (const file of readdirSync(new URL("fit/", root))) {
    if (file.endsWith(".json")) validateFit(read(`fit/${file}`), dataset);
  }
});

test("Broken catalog shapes, duplicate identities and nonfinite or overstated evidence are rejected", () => {
  for (const mutate of [
    (c) => {
      delete c.coverage;
    },
    (c) => {
      c.players[1].player_id = c.players[0].player_id;
    },
    (c) => {
      c.players[0].minutes = "90";
    },
    (c) => {
      c.players[0].metrics.shots_per90 = Infinity;
    },
    (c) => {
      c.players[0].dataset_id = "older";
    },
    (c) => {
      c.metric_catalog.shots_per90.names = {};
    },
    (c) => {
      c.scouting_index[c.players[0].player_id].confidence = 101;
    },
  ]) {
    const broken = structuredClone(catalog);
    mutate(broken);
    assert.throws(() => validateCatalog(broken), /Invalid football/);
  }
});

test("A malformed API catalog uses the validated saved publication; two bad sources become an error", async (t) => {
  const original = globalThis.fetch;
  t.after(() => {
    globalThis.fetch = original;
  });
  globalThis.fetch = async (url) =>
    new Response(
      JSON.stringify(url.startsWith("/api/") ? { players: [] } : catalog),
    );
  assert.equal((await loadCatalog()).api, false);
  globalThis.fetch = async () => new Response("{}");
  await assert.rejects(loadCatalog(), /Invalid football/);
});

test("Correct dataset alone cannot authorize another player's profile, similarity or spatial map", async (t) => {
  const original = globalThis.fetch;
  t.after(() => {
    globalThis.fetch = original;
  });
  for (const [folder, loader] of [
    ["profiles", loadProfile],
    ["similar", loadSimilar],
    ["visuals", loadVisuals],
  ]) {
    globalThis.fetch = async () =>
      new Response(
        JSON.stringify(read(`${folder}/statsbomb-player-6655.json`)),
      );
    await assert.rejects(
      loader("statsbomb:player:316046", false, dataset),
      /Invalid football/,
    );
    await loader(id, false, dataset);
  }
});

test("Null is preserved and an unsupported percentile or invented quality cannot enter a profile", () => {
  // Read the actual lowest-exposure profile, independent of provider ID changes.
  const p = [...catalog.players].sort((a, b) => a.minutes - b.minutes)[0];
  const profile = read(`profiles/${p.player_id.replaceAll(":", "-")}.json`);
  assert.equal(
    validateProfile(profile, p.player_id, dataset).metrics.find(
      (m) => m.key === "pass_completion",
    ).value,
    null,
  );
  profile.metrics[0].favorable_percentile = 90;
  profile.metrics[0].percentile = 90;
  assert.throws(
    () => validateProfile(profile, p.player_id, dataset),
    /Invalid football/,
  );
  const normal = read("profiles/statsbomb-player-6655.json");
  normal.player_quality = 92;
  assert.throws(() => validateProfile(normal, id, dataset), /Invalid football/);
});

test("Similarity cannot count sparse, missing or unexplained dimensions as comparable evidence", () => {
  for (const mutate of [
    (r) => {
      r.components[0].cohort_observations = 2;
    },
    (r) => {
      r.components[0].cohort_std = null;
    },
    (r) => {
      r.components[0].status = "missing";
    },
    (r) => {
      r.components[0].standardized_difference = null;
    },
    (r) => {
      r.comparable_metric_count -= 1;
    },
    (r) => {
      r.closest_dimensions.push("unknown_metric");
    },
  ]) {
    const broken = read("similar/statsbomb-player-6655.json");
    mutate(broken.results[0]);
    assert.throws(
      () => validateSimilarity(broken, id, dataset),
      /Invalid football/,
    );
  }
});

test("Fit is bound to the requested brief; changed weights, bounds, exposure or hidden constraints are rejected", () => {
  const fit = read("fit/cm_two_way.json");
  const expected = catalog.archetypes.find((r) => r.id === "cm_two_way").brief;
  validateFit(fit, dataset, expected);
  const reordered = structuredClone(expected);
  reordered.requirements.reverse();
  for (const r of reordered.requirements) {
    if (r.minimum == null) delete r.minimum;
    if (r.maximum == null) delete r.maximum;
  }
  validateFit(fit, dataset, reordered);
  for (const mutate of [
    (b) => {
      b.requirements[0].weight += 1;
    },
    (b) => {
      b.requirements[0].minimum = 1000;
    },
    (b) => {
      b.min_minutes = 450;
    },
    (b) => {
      b.age_max = 23;
    },
    (b) => {
      b.preferred_foot = "Left";
    },
    (b) => {
      b.requirements[0].direction = "lower";
    },
  ]) {
    const different = structuredClone(expected);
    mutate(different);
    assert.throws(
      () => validateFit(fit, dataset, different),
      /Invalid football/,
    );
  }
});

test("Fit components must reproduce the displayed score and weighted coverage, including an empty cohort", () => {
  for (const mutate of [
    (f) => {
      f.results[0].fit_score += 1;
    },
    (f) => {
      f.results[0].components[0].weight += 1;
    },
    (f) => {
      f.results[0].components[0].contribution += 1;
    },
    (f) => {
      f.results[0].components[0].observed = null;
    },
    (f) => {
      f.results[0].data_coverage = 98;
    },
  ]) {
    const broken = read("fit/cm_two_way.json");
    mutate(broken);
    assert.throws(() => validateFit(broken, dataset), /Invalid football/);
  }
  const empty = read("fit/cm_two_way.json");
  empty.results = [];
  empty.population_size = 9;
  validateFit(empty, dataset, empty.brief);
});
