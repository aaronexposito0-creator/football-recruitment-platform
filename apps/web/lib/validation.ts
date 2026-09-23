import type {
  Catalog,
  Player,
  Profile,
  Similarity,
  MetricDefinition,
  Fit,
  Brief,
  VisualProfile,
} from "./contracts";
import { briefSignature } from "./brief.ts";
import type { ClubAnalysis, ImportPreview } from "./club";
import importMetricBounds from "../../../core/reference/import_metric_bounds.json" with { type: "json" };
import importLimits from "../../../core/reference/import_limits.json" with { type: "json" };

/** Reject broken publications at the network boundary. Never repair football observations. */
function requireValue(condition: unknown): asserts condition {
  if (!condition) throw new Error("Invalid football analysis response");
}
function record(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}
const text = (v: unknown): v is string => typeof v === "string" && v.length > 0;
const finite = (v: unknown): v is number =>
  typeof v === "number" && Number.isFinite(v);
const nonnegative = (v: unknown): v is number => finite(v) && v >= 0;
const count = (v: unknown): v is number =>
  nonnegative(v) && Number.isInteger(v);
const percent = (v: unknown): v is number => nonnegative(v) && v <= 100;
const nullable = (v: unknown, check: (x: unknown) => boolean) =>
  v === null || check(v);
const strings = (v: unknown): v is string[] =>
  Array.isArray(v) && v.every(text);
const numbers = (v: unknown) =>
  record(v) && Object.values(v).every((n) => nullable(n, nonnegative));
const names = (v: unknown) => record(v) && [v.en, v.es, v.fr].every(text);
const closeNumber = (a: number | null, b: number | null) =>
  a === null || b === null
    ? a === b
    : Math.abs(a - b) <= 1e-9 * Math.max(1, Math.abs(b));
const position = (v: unknown) =>
  typeof v === "string" &&
  ["GK", "CB", "FB", "DM", "CM", "AM", "W", "ST", "UNK"].includes(v);

function definition(m: MetricDefinition) {
  requireValue(
    record(m) &&
      text(m.key) &&
      names(m.names) &&
      text(m.family) &&
      text(m.definition) &&
      text(m.denominator) &&
      text(m.unit) &&
      text(m.version) &&
      ["higher", "lower"].includes(m.direction),
  );
}
function player(p: Player, datasetId: string) {
  requireValue(
    record(p) &&
      p.dataset_id === datasetId &&
      [
        p.player_id,
        p.player_name,
        p.display_name,
        p.team_id,
        p.team_name,
        p.competition,
        p.season,
        p.gender,
      ].every(text),
  );
  requireValue(
    position(p.position_group) &&
      nonnegative(p.minutes) &&
      [p.starts, p.appearances, p.event_count].every(count),
  );
  requireValue(
    numbers(p.metrics) &&
      numbers(p.totals) &&
      record(p.position_minutes) &&
      Object.values(p.position_minutes).every(nonnegative),
  );
  requireValue(strings(p.quality_flags) && strings(p.match_ids));
  requireValue(nullable(p.metrics.pass_completion, percent));
}
function sameDataset(actual: unknown, expected: string) {
  if (actual !== expected)
    throw new Error("Dataset changed; reload the catalog");
}

export function validateCatalog(raw: unknown): Catalog {
  const c = raw as Catalog;
  requireValue(
    record(c) &&
      record(c.coverage) &&
      Array.isArray(c.players) &&
      record(c.metric_catalog) &&
      record(c.scouting_index) &&
      Array.isArray(c.archetypes),
  );
  const coverage = c.coverage;
  requireValue(
    [
      coverage.dataset_id,
      coverage.source,
      coverage.competition,
      coverage.season,
      coverage.source_revision,
      coverage.feature_version,
      coverage.license_url,
      coverage.usage,
      coverage.date_from,
      coverage.date_to,
    ].every(text),
  );
  requireValue(
    [
      coverage.matches_ingested,
      coverage.matches_available,
      coverage.players,
      coverage.events,
      coverage.teams,
    ].every(count) &&
      percent(coverage.coverage_pct) &&
      typeof coverage.is_partial === "boolean",
  );
  requireValue(
    coverage.matches_ingested <= coverage.matches_available &&
      c.players.length === coverage.players,
  );
  requireValue(
    Array.isArray(coverage.quality) &&
      coverage.quality.every(
        (q) =>
          record(q) &&
          count(q.match_id) &&
          strings(q.warnings) &&
          typeof q.minutes_valid === "boolean" &&
          typeof q.scoreline_reconciled === "boolean",
      ),
  );
  const keys = Object.keys(c.metric_catalog);
  requireValue(keys.length > 0);
  for (const key of keys) {
    definition(c.metric_catalog[key]);
    requireValue(c.metric_catalog[key].key === key);
  }
  const ids = new Set<string>();
  for (const p of c.players) {
    player(p, coverage.dataset_id);
    requireValue(
      !ids.has(p.player_id) &&
        keys.every((key) => Object.hasOwn(p.metrics, key)),
    );
    ids.add(p.player_id);
    const s = c.scouting_index[p.player_id];
    requireValue(
      record(s) &&
        percent(s.data_coverage) &&
        percent(s.confidence) &&
        s.confidence <= s.data_coverage + 1e-8 &&
        count(s.cohort_size) &&
        typeof s.eligible === "boolean" &&
        record(s.percentiles),
    );
    requireValue(keys.every((key) => nullable(s.percentiles[key], percent)));
    requireValue(
      s.eligible ||
        (s.confidence === 0 &&
          Object.values(s.percentiles).every((v) => v === null)),
    );
  }
  for (const a of c.archetypes) {
    requireValue(
      record(a) &&
        text(a.id) &&
        names(a.names) &&
        position(a.position_group) &&
        record(a.brief),
    );
    requireValue(
      text(a.brief.role_name) &&
        strings(a.brief.position_groups) &&
        nonnegative(a.brief.min_minutes) &&
        Array.isArray(a.brief.requirements),
    );
    requireValue(
      a.brief.requirements.every(
        (r) =>
          record(r) &&
          keys.includes(r.metric) &&
          nonnegative(r.weight) &&
          ["higher", "lower", "target"].includes(r.direction),
      ),
    );
  }
  return c;
}

export function validateProfile(
  raw: unknown,
  id: string,
  datasetId: string,
): Profile {
  const p = raw as Profile;
  requireValue(record(p) && record(p.lineage));
  sameDataset(p.lineage.dataset_id, datasetId);
  player(p.player, datasetId);
  requireValue(p.player.player_id === id);
  requireValue(
    record(p.cohort) &&
      [p.cohort.size, p.cohort.minimum_players].every(count) &&
      nonnegative(p.cohort.minimum_minutes) &&
      typeof p.cohort.eligible === "boolean" &&
      position(p.cohort.position_group),
  );
  requireValue(
    Array.isArray(p.metrics) &&
      p.metrics.length === Object.keys(p.player.metrics).length,
  );
  const keys = new Set<string>();
  for (const m of p.metrics) {
    definition(m);
    requireValue(!keys.has(m.key) && Object.hasOwn(p.player.metrics, m.key));
    keys.add(m.key);
    requireValue(
      nullable(m.value, nonnegative) &&
        nullable(m.percentile, percent) &&
        nullable(m.favorable_percentile, percent) &&
        count(m.cohort_observations),
    );
    requireValue(m.value === p.player.metrics[m.key]);
    requireValue((m.percentile === null) === (m.favorable_percentile === null));
    requireValue(
      m.favorable_percentile === null ||
        (p.cohort.eligible &&
          m.value !== null &&
          m.cohort_observations >= p.cohort.minimum_players),
    );
  }
  const e = p.evidence;
  requireValue(
    record(e) &&
      percent(e.data_coverage) &&
      percent(e.confidence_score) &&
      e.confidence_score <= e.data_coverage + 1e-8 &&
      nonnegative(e.minutes) &&
      count(e.events),
  );
  requireValue(
    [e.missing_context, e.warnings, e.strengths, e.review_areas].every(strings),
  );
  requireValue(
    [...e.strengths, ...e.review_areas].every((key) =>
      p.metrics.some((m) => m.key === key && m.favorable_percentile !== null),
    ),
  );
  requireValue(p.cohort.eligible || e.confidence_score === 0);
  requireValue(p.fit_score === null && p.player_quality === null);
  requireValue(
    [
      p.lineage.source_revision,
      p.lineage.source_url,
      p.lineage.license_url,
      p.lineage.feature_version,
    ].every(text),
  );
  return p;
}

export function validateSimilarity(
  raw: unknown,
  id: string,
  datasetId: string,
): Similarity {
  const s = raw as Similarity;
  requireValue(record(s));
  sameDataset(s.dataset_id, datasetId);
  requireValue(s.target === id && Array.isArray(s.results));
  const ids = new Set([id]);
  for (const r of s.results) {
    requireValue(
      record(r) &&
        text(r.player_id) &&
        !ids.has(r.player_id) &&
        text(r.player_name) &&
        percent(r.similarity) &&
        percent(r.coverage) &&
        count(r.comparable_metric_count) &&
        r.comparable_metric_count >= 3,
    );
    ids.add(r.player_id);
    requireValue(
      strings(r.closest_dimensions) &&
        strings(r.largest_differences) &&
        Array.isArray(r.components),
    );
    requireValue(
      r.components.every(
        (d) =>
          record(d) &&
          text(d.metric) &&
          [
            "compared",
            "missing",
            "constant_reference",
            "insufficient_reference",
          ].includes(d.status) &&
          count(d.cohort_observations) &&
          nullable(d.cohort_std, nonnegative) &&
          nullable(d.target_value, nonnegative) &&
          nullable(d.candidate_value, nonnegative) &&
          nullable(d.standardized_difference, finite) &&
          nullable(d.distance_share_pct, percent),
      ),
    );
    const compared = r.components.filter((d) => d.status === "compared");
    requireValue(
      compared.length === r.comparable_metric_count &&
        new Set(r.components.map((d) => d.metric)).size ===
          r.components.length &&
        compared.every(
          (d) =>
            d.cohort_observations >= 10 &&
            d.cohort_std != null &&
            d.cohort_std > 0 &&
            d.target_value != null &&
            d.candidate_value != null &&
            d.standardized_difference != null &&
            d.distance_share_pct != null,
        ) &&
        r.components
          .filter((d) => d.status !== "compared")
          .every(
            (d) =>
              d.standardized_difference === null &&
              d.distance_share_pct === null,
          ) &&
        [...r.closest_dimensions, ...r.largest_differences].every((key) =>
          compared.some((d) => d.metric === key),
        ),
    );
  }
  return s;
}

export function validateFit(
  raw: unknown,
  datasetId: string,
  expectedBrief?: Brief,
): Fit {
  const f = raw as Fit;
  requireValue(record(f));
  sameDataset(f.dataset_id, datasetId);
  requireValue(Array.isArray(f.results) && count(f.population_size));
  const brief = f.brief;
  requireValue(
    record(brief) &&
      text(brief.role_name) &&
      strings(brief.position_groups) &&
      brief.position_groups.length === 1 &&
      position(brief.position_groups[0]) &&
      !["GK", "UNK"].includes(brief.position_groups[0]) &&
      count(brief.min_minutes) &&
      Array.isArray(brief.requirements) &&
      brief.requirements.length > 0 &&
      brief.requirements.every(
        (r) =>
          record(r) &&
          text(r.metric) &&
          nonnegative(r.weight) &&
          ["higher", "lower", "target"].includes(r.direction) &&
          [r.minimum, r.maximum, r.target, r.tolerance].every(
            (v) => v == null || finite(v),
          ),
      ) &&
      new Set(brief.requirements.map((r) => r.metric)).size ===
        brief.requirements.length &&
      brief.requirements.some((r) => r.weight > 0),
  );
  requireValue(
    f.minimum_minutes === 180 &&
      f.requested_minimum_minutes === brief.min_minutes,
  );
  if (expectedBrief)
    requireValue(briefSignature(brief) === briefSignature(expectedBrief));
  const ids = new Set<string>();
  for (const r of f.results) {
    requireValue(
      record(r) &&
        [r.player_id, r.player_name, r.team_name].every(text) &&
        !ids.has(r.player_id),
    );
    ids.add(r.player_id);
    requireValue(
      nullable(r.fit_score, percent) &&
        percent(r.data_coverage) &&
        percent(r.confidence_score) &&
        r.confidence_score <= r.data_coverage + 1e-8 &&
        typeof r.eligible === "boolean" &&
        strings(r.reasons) &&
        Array.isArray(r.components),
    );
    requireValue(
      r.components.every(
        (m) =>
          record(m) &&
          text(m.metric) &&
          text(m.status) &&
          nullable(m.observed, nonnegative) &&
          nullable(m.normalized_score, percent) &&
          nonnegative(m.weight) &&
          finite(m.contribution) &&
          finite(m.delta_from_neutral),
      ),
    );
    requireValue(r.fit_score !== null || r.confidence_score === 0);
    requireValue(
      r.components.length === brief.requirements.length &&
        new Set(r.components.map((c) => c.metric)).size ===
          r.components.length &&
        r.components.every((c) =>
          brief.requirements.some(
            (r) => c.metric === r.metric && c.weight === r.weight,
          ),
        ),
    );
    const scored = r.components.filter((c) => c.normalized_score !== null);
    requireValue(scored.every((c) => c.observed !== null));
    const weight = scored.reduce((sum, c) => sum + c.weight, 0);
    const totalWeight = brief.requirements.reduce(
      (sum, r) => sum + r.weight,
      0,
    );
    requireValue(
      Math.abs(r.data_coverage - (100 * weight) / totalWeight) <= 0.01,
    );
    if (weight === 0) requireValue(r.fit_score === null);
    else {
      const points =
        scored.reduce(
          (sum, c) => sum + c.weight * (c.normalized_score ?? 0),
          0,
        ) / weight;
      requireValue(
        r.fit_score !== null &&
          Math.abs(r.fit_score - points) <= 0.01 &&
          Math.abs(
            r.components.reduce((sum, c) => sum + c.contribution, 0) - points,
          ) <= 0.01,
      );
    }
  }
  return f;
}

export function validateVisuals(
  raw: unknown,
  id: string,
  datasetId: string,
): VisualProfile {
  const v = raw as VisualProfile;
  requireValue(record(v));
  sameDataset(v.dataset_id, datasetId);
  requireValue(
    v.player_id === id &&
      strings(v.incomplete_metrics) &&
      Array.isArray(v.matches),
  );
  const mapSet = (maps: VisualProfile["maps"]) => {
    requireValue(record(maps));
    for (const key of [
      "shots",
      "passes",
      "progressive_passes",
      "progressive_carries",
      "pressures",
      "tackles_interceptions",
    ] as const) {
      const m = maps[key];
      requireValue(
        record(m) &&
          count(m.events) &&
          count(m.located) &&
          m.located <= m.events &&
          Array.isArray(m.cells) &&
          Array.isArray(m.flows),
      );
      requireValue(
        m.cells.every(
          (c) =>
            record(c) &&
            count(c.zone) &&
            c.zone < 24 &&
            count(c.count) &&
            count(c.completed) &&
            c.completed <= c.count &&
            (c.xg === undefined || nullable(c.xg, nonnegative)),
        ),
      );
      requireValue(m.cells.reduce((sum, c) => sum + c.count, 0) === m.located);
      requireValue(
        m.flows.every(
          (f) =>
            record(f) &&
            count(f.from) &&
            f.from < 24 &&
            count(f.to) &&
            f.to < 24 &&
            count(f.count),
        ),
      );
    }
  };
  mapSet(v.maps);
  for (const m of v.matches) {
    requireValue(
      record(m) &&
        [m.match_id, m.date, m.opponent].every(text) &&
        [m.goals_for, m.goals_against].every(count) &&
        nonnegative(m.minutes),
    );
    mapSet(m.maps);
  }
  return v;
}

/** Imports are untrusted observations; validate before putting them in UI state. */
export function validateImportPreview(
  raw: unknown,
  catalog: Catalog,
): ImportPreview {
  const p = raw as ImportPreview;
  requireValue(
    record(p) &&
      strings(p.headers) &&
      p.headers.length > 0 &&
      p.headers.length <= 60 &&
      new Set(p.headers.map((h) => h.toLowerCase())).size ===
        p.headers.length &&
      p.headers.every((h) => [...h].length <= 100) &&
      Array.isArray(p.rows) &&
      count(p.row_count) &&
      p.row_count > 0 &&
      p.row_count <= 2000 &&
      p.row_count === p.rows.length &&
      Array.isArray(p.source_rows) &&
      p.source_rows.length === p.rows.length &&
      strings(p.warnings) &&
      strings(p.fields) &&
      record(p.suggested_mapping) &&
      typeof p.file_sha256 === "string" &&
      /^[a-f0-9]{64}$/.test(p.file_sha256),
  );
  const fields = new Set([
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
  ]);
  requireValue(
    p.fields.length === fields.size &&
      new Set(p.fields).size === fields.size &&
      p.fields.every((f) => fields.has(f)),
  );
  requireValue(
    p.rows.every(
      (row) =>
        Array.isArray(row) &&
        row.length === p.headers.length &&
        row.every(
          (cell) =>
            cell === null ||
            (typeof cell === "string" &&
              [...cell].length <= importLimits.preview_cell_characters),
        ),
    ),
  );
  requireValue(
    p.source_rows.every(
      (row, index) =>
        count(row) &&
        row > 0 &&
        row <= 2001 &&
        (index === 0 || row > p.source_rows[index - 1]),
    ),
  );
  requireValue(
    Object.entries(p.suggested_mapping).every(
      ([field, header]) => fields.has(field) && p.headers.includes(header),
    ) &&
      new Set(Object.values(p.suggested_mapping)).size ===
        Object.keys(p.suggested_mapping).length,
  );
  return p;
}

export function validateClubAnalysis(
  raw: unknown,
  catalog: Catalog,
): ClubAnalysis {
  const a = raw as ClubAnalysis;
  requireValue(record(a));
  sameDataset(a.reference_dataset_id, catalog.coverage.dataset_id);
  requireValue(
    typeof a.import_id === "string" &&
      /^[a-f0-9]{24}$/.test(a.import_id) &&
      text(a.label) &&
      percent(a.data_quality) &&
      record(a.quality_checks) &&
      count(a.quality_checks.passed) &&
      count(a.quality_checks.total) &&
      a.quality_checks.total > 0 &&
      a.quality_checks.passed <= a.quality_checks.total &&
      closeNumber(
        a.data_quality,
        (100 * a.quality_checks.passed) / a.quality_checks.total,
      ) &&
      percent(a.data_coverage) &&
      count(a.rows_with_issues) &&
      Array.isArray(a.players) &&
      a.players.length > 0 &&
      a.players.length <= 2000 &&
      a.rows_with_issues <= a.players.length,
  );
  const keys = Object.keys(catalog.metric_catalog);
  const identities = new Set<string>();
  const sourceCounts = new Map<string, number>();
  const referenceCounts = new Map<string, Record<string, number>>();
  for (const p of a.players) {
    requireValue(
      record(p) &&
        count(p.source_row) &&
        p.source_row > 0 &&
        p.source_row <= 2001 &&
        p.player_id === `upload:${a.import_id}:row:${p.source_row}` &&
        !identities.has(p.player_id) &&
        nullable(p.source_player_id, text) &&
        nullable(p.player_name, text) &&
        text(p.team_name) &&
        position(p.position_group) &&
        nullable(p.minutes, nonnegative) &&
        nullable(p.age, count) &&
        strings(p.issues) &&
        numbers(p.metrics) &&
        numbers(p.totals) &&
        keys.length === Object.keys(p.metrics).length &&
        keys.every((key) => Object.hasOwn(p.metrics, key)) &&
        percent(p.data_coverage) &&
        nullable(p.confidence, percent),
    );
    identities.add(p.player_id);
    if (p.source_player_id)
      sourceCounts.set(
        p.source_player_id,
        (sourceCounts.get(p.source_player_id) || 0) + 1,
      );
    for (const key of keys) {
      let expected: number | null;
      if (key.endsWith("_per90")) {
        const total = p.totals[key.slice(0, -6)];
        requireValue(nullable(total, nonnegative));
        expected =
          p.minutes && total !== null ? (total * 90) / p.minutes : null;
      } else {
        requireValue(key === "pass_completion");
        expected =
          p.totals.passes && p.totals.completed_passes !== null
            ? (100 * p.totals.completed_passes) / p.totals.passes
            : null;
      }
      requireValue(closeNumber(p.metrics[key], expected));
    }
    for (const [smaller, upperBounds] of Object.entries(importMetricBounds)) {
      for (const terms of upperBounds) {
        const value = p.totals[smaller];
        const observed = terms.map((term) => p.totals[term]);
        if (value !== null && observed.every((v): v is number => v !== null))
          requireValue(value <= observed.reduce((sum, v) => sum + v, 0) + 1e-8);
      }
    }
    const observed = keys.filter((key) => p.metrics[key] !== null);
    requireValue(
      closeNumber(p.data_coverage, (100 * observed.length) / keys.length),
    );
    if (p.benchmark === null) requireValue(p.confidence === null);
    else {
      const b = p.benchmark;
      requireValue(
        record(b) &&
          text(b.reference_player_id) &&
          text(b.reference_name) &&
          count(b.cohort_size) &&
          typeof b.eligible === "boolean" &&
          numbers(b.percentiles),
      );
      const reference = catalog.players.find(
        (r) => r.player_id === b.reference_player_id,
      );
      const evidence = catalog.scouting_index[b.reference_player_id];
      requireValue(
        reference &&
          evidence &&
          p.source_player_id === reference.player_id &&
          !p.issues.includes("player_id:duplicate_source_id") &&
          reference.display_name === b.reference_name &&
          reference.position_group === p.position_group &&
          closeNumber(p.minutes, reference.minutes) &&
          b.cohort_size === evidence.cohort_size &&
          b.eligible === evidence.eligible &&
          observed.length > 0 &&
          Object.keys(b.percentiles).length === observed.length &&
          observed.every(
            (key) =>
              closeNumber(p.metrics[key], reference.metrics[key]) &&
              Object.hasOwn(b.percentiles, key) &&
              closeNumber(b.percentiles[key], evidence.percentiles[key]),
          ),
      );
      if (b.eligible) {
        const context = JSON.stringify([
          reference.dataset_id,
          reference.competition_id,
          reference.season_id,
          reference.gender,
          reference.position_group,
        ]);
        let counts = referenceCounts.get(context);
        if (!counts) {
          counts = Object.fromEntries(keys.map((key) => [key, 0]));
          for (const peer of catalog.players) {
            if (
              peer.dataset_id === reference.dataset_id &&
              peer.competition_id === reference.competition_id &&
              peer.season_id === reference.season_id &&
              peer.gender === reference.gender &&
              peer.position_group === reference.position_group &&
              peer.minutes >= 180
            )
              for (const key of keys)
                if (peer.metrics[key] !== null) counts[key] += 1;
          }
          referenceCounts.set(context, counts);
        }
        const support = observed.reduce(
          (sum, key) =>
            sum +
            (b.percentiles[key] !== null && counts[key] >= 10
              ? Math.min(counts[key] / 30, 1)
              : 0),
          0,
        );
        const expectedConfidence =
          (100 * Math.min((p.minutes ?? 0) / 900, 1) * support) / keys.length;
        requireValue(closeNumber(p.confidence, expectedConfidence));
      } else requireValue(p.confidence === null);
    }
  }
  for (const p of a.players) {
    if (p.source_player_id && sourceCounts.get(p.source_player_id)! > 1)
      requireValue(
        p.issues.includes("player_id:duplicate_source_id") &&
          p.benchmark === null &&
          p.confidence === null,
      );
  }
  requireValue(
    a.rows_with_issues ===
      a.players.filter((p) => p.issues.length > 0).length &&
      closeNumber(
        a.data_coverage,
        a.players.reduce((sum, p) => sum + p.data_coverage, 0) /
          a.players.length,
      ),
  );
  return a;
}
