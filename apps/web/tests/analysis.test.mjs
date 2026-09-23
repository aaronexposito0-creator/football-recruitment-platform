import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { csvText } from "../lib/export.ts";
import {
  loadCatalog,
  loadProfile,
  loadSimilar,
  loadComparison,
} from "../lib/api.ts";

const catalog = {
  metric_catalog: { pressures_per90: {}, xa_per90: {} },
  coverage: {
    source_revision: "rev",
    license_url: "https://example.test/terms",
  },
};

test("CSV preserves missing values, Unicode and quotes, and defuses spreadsheet formulas", () => {
  const player = {
    player_id: "test",
    player_name: '=HYPERLINK("x")',
    team_name: "Aarón, Équipe",
    position_group: "CM",
    minutes: 90,
    appearances: 1,
    dataset_id: "ds",
    metrics: { pressures_per90: -1, xa_per90: null },
  };
  const text = csvText([player], catalog);
  assert.ok(text.startsWith("\ufeff"));
  assert.ok(text.includes('"\'=HYPERLINK(""x"")"'));
  assert.ok(text.includes('"Aarón, Équipe"'));
  assert.ok(text.endsWith('"-1",""'));
  assert.ok(text.includes("source_revision"));
});

test("Catalog uses the API when healthy and labels saved real analysis after failure", async (t) => {
  const actualCatalog = readFileSync(
    new URL("../public/analysis/catalog.json", import.meta.url),
    "utf8",
  );
  const original = globalThis.fetch;
  t.after(() => {
    globalThis.fetch = original;
  });
  globalThis.fetch = async () => new Response(actualCatalog);
  assert.equal((await loadCatalog()).api, true);
  globalThis.fetch = async (url) =>
    url.startsWith("/api/")
      ? new Response("", { status: 503 })
      : new Response(actualCatalog);
  assert.equal((await loadCatalog()).api, false);
});

test("Profiles and similarity refuse fallback from a different dataset", async (t) => {
  const original = globalThis.fetch;
  t.after(() => {
    globalThis.fetch = original;
  });
  globalThis.fetch = async (url) =>
    url.startsWith("/api/")
      ? new Response("", { status: 503 })
      : new Response(
          JSON.stringify({
            lineage: { dataset_id: "old" },
            dataset_id: "old",
            results: [],
          }),
        );
  await assert.rejects(
    loadProfile("statsbomb:player:1", true, "new"),
    /Dataset changed/,
  );
  await assert.rejects(
    loadSimilar("statsbomb:player:1", true, "new"),
    /Dataset changed/,
  );
});

test("A cancelled player selection cannot trigger a stale fallback", async (t) => {
  const original = globalThis.fetch;
  t.after(() => {
    globalThis.fetch = original;
  });
  let calls = 0;
  const controller = new AbortController();
  controller.abort();
  globalThis.fetch = async () => {
    calls++;
    throw new DOMException("Aborted", "AbortError");
  };
  await assert.rejects(
    loadProfile("statsbomb:player:1", true, "ds", controller.signal),
    /Aborted/,
  );
  assert.equal(calls, 1);
});

test("Missing saved similarity is an error, not an empty successful recommendation", async (t) => {
  const original = globalThis.fetch;
  t.after(() => {
    globalThis.fetch = original;
  });
  globalThis.fetch = async () => new Response("", { status: 404 });
  await assert.rejects(loadSimilar("statsbomb:player:1", false, "ds"), /404/);
});

test("A missing or failed comparison stays removable without hiding valid players; cancellation cannot publish stale columns", async (t) => {
  const original = globalThis.fetch;
  t.after(() => {
    globalThis.fetch = original;
  });
  const data = JSON.parse(
    readFileSync(
      new URL("../public/analysis/catalog.json", import.meta.url),
      "utf8",
    ),
  );
  const good = "statsbomb:player:6655",
    failed = "statsbomb:player:316046",
    missing = "statsbomb:player:0";
  const profile = readFileSync(
    new URL(
      "../public/analysis/profiles/statsbomb-player-6655.json",
      import.meta.url,
    ),
    "utf8",
  );
  const calls = [];
  globalThis.fetch = async (url) => {
    calls.push(url);
    return url.includes("6655")
      ? new Response(profile)
      : new Response("", { status: 503 });
  };
  const entries = {};
  await loadComparison(
    [good, failed, missing],
    data,
    false,
    new AbortController().signal,
    (id, entry) => {
      entries[id] = entry;
    },
  );
  assert.equal(entries[good].status, "ready");
  assert.equal(entries[failed].status, "error");
  assert.equal(entries[missing].status, "missing");
  assert.equal(calls.length, 2);
  const controller = new AbortController();
  globalThis.fetch = async () => {
    controller.abort();
    return new Response(profile);
  };
  const stale = [];
  await loadComparison([good], data, false, controller.signal, (id) =>
    stale.push(id),
  );
  assert.deepEqual(stale, []);
});
