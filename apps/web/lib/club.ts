import importLimits from "../../../core/reference/import_limits.json" with { type: "json" };

export const formations: Record<string, Record<string, number>> = {
  "4-3-3": { GK: 2, CB: 4, FB: 4, DM: 2, CM: 4, AM: 0, W: 4, ST: 2 },
  "4-2-3-1": { GK: 2, CB: 4, FB: 4, DM: 4, CM: 0, AM: 2, W: 4, ST: 2 },
  "3-4-2-1": { GK: 2, CB: 6, FB: 4, DM: 0, CM: 4, AM: 4, W: 0, ST: 2 },
};
export interface DepthScenario {
  shape: string;
  targets: Record<string, number>;
  minimum: number;
  absent: string;
  assignments: Record<string, string>;
}
export const defaultScenario: DepthScenario = {
  shape: "4-3-3",
  targets: { ...formations["4-3-3"] },
  minimum: 180,
  absent: "",
  assignments: {},
};
export interface ImportPlanState {
  importId: string;
  teams: Map<string, DepthScenario>;
}
export const emptyImportPlans: ImportPlanState = {
  importId: "",
  teams: new Map(),
};
export function importPlanReducer(
  state: ImportPlanState,
  action:
    | { type: "reset"; importId: string }
    | { type: "edit"; importId: string; team: string; scenario: DepthScenario },
): ImportPlanState {
  if (action.type === "reset")
    return { importId: action.importId, teams: new Map() };
  // A late edit from an older analysis cannot alter the active import's plans.
  if (action.importId !== state.importId) return state;
  return {
    ...state,
    teams: new Map(state.teams).set(action.team, action.scenario),
  };
}
export function parseScenario(raw: string): DepthScenario {
  const p = JSON.parse(raw);
  if (!p || typeof p !== "object" || !Object.hasOwn(formations, p.shape))
    throw new Error("Invalid scenario");
  const targets: Record<string, number> = {};
  for (const pos of Object.keys(defaultScenario.targets)) {
    const n = p.targets?.[pos];
    if (!Number.isInteger(n) || n < 0 || n > 10)
      throw new Error("Invalid positional target");
    targets[pos] = n;
  }
  if (
    ![0, 90, 180, 270, 450].includes(p.minimum) ||
    typeof p.absent !== "string"
  )
    throw new Error("Invalid exposure scenario");
  const assignments: Record<string, string> = {};
  for (const [id, pos] of Object.entries(p.assignments || {}).slice(0, 1000)) {
    if (
      /^statsbomb:player:\d+$/.test(id) &&
      typeof pos === "string" &&
      [...Object.keys(targets), "UNK"].includes(pos)
    )
      assignments[id] = pos;
  }
  return {
    shape: p.shape,
    targets,
    minimum: p.minimum,
    absent: /^statsbomb:player:\d+$/.test(p.absent) ? p.absent : "",
    assignments,
  };
}
export interface SquadMember {
  player_id: string;
  source_player_id?: string | null;
  player_name: string | null;
  team_name: string;
  position_group: string;
  minutes: number | null;
  issues?: string[];
}
export type DepthStatus =
  | "counted"
  | "absent"
  | "missingIdentity"
  | "duplicateIdentity"
  | "missingMinutes"
  | "belowMinutes";
export function squadDepth(
  players: SquadMember[],
  targets: Record<string, number>,
  minimum: number,
  absent = "",
) {
  // Row IDs isolate imported observations; they are not distinct player identities.
  // Keep conflicts visible without choosing which duplicate represents the player.
  const identities = new Map<string, number>();
  for (const p of players) {
    const id = p.source_player_id || p.player_id;
    identities.set(id, (identities.get(id) || 0) + 1);
  }
  function status(p: SquadMember): DepthStatus {
    if (
      identities.get(p.source_player_id || p.player_id)! > 1 ||
      p.issues?.includes("player_id:duplicate_source_id")
    )
      return "duplicateIdentity";
    if (!p.player_name?.trim()) return "missingIdentity";
    if (p.player_id === absent) return "absent";
    if (p.minutes == null) return "missingMinutes";
    if (p.minutes < minimum) return "belowMinutes";
    return "counted";
  }
  return Object.entries(targets).map(([position, target]) => {
    const roster = players
      .filter((p) => p.position_group === position)
      .sort(
        (a, b) =>
          (b.minutes ?? -1) - (a.minutes ?? -1) ||
          a.player_id.localeCompare(b.player_id),
      );
    const statuses = Object.fromEntries(
      roster.map((p) => [p.player_id, status(p)]),
    );
    const available = roster.filter((p) => statuses[p.player_id] === "counted");
    return {
      position,
      target,
      roster,
      available,
      statuses,
      gap: Math.max(0, target - available.length),
    };
  });
}
export interface ImportPreview {
  headers: string[];
  rows: (string | null)[][];
  source_rows: number[];
  suggested_mapping: Record<string, string>;
  warnings: string[];
  file_sha256: string;
  row_count: number;
  fields: string[];
}
/** Report column/row context only; never echo the contents of a user's note. */
export function mappingTextIssues(
  preview: ImportPreview,
  mapping: Record<string, string>,
) {
  return Object.entries(mapping).flatMap(([field, column]) => {
    const index = preview.headers.indexOf(column);
    if (index < 0) return [];
    const row = preview.rows.findIndex((cells) => {
      const cell = cells[index];
      return (
        cell !== null && [...cell].length > importLimits.mapped_cell_characters
      );
    });
    return row < 0
      ? []
      : [{ field, column, sourceRow: preview.source_rows[row] }];
  });
}
export interface ImportedPlayer extends SquadMember {
  source_player_id: string | null;
  age: number | null;
  data_coverage: number;
  confidence: number | null;
  source_row: number;
  metrics: Record<string, number | null>;
  totals: Record<string, number | null>;
  issues: string[];
  benchmark: {
    reference_player_id: string;
    reference_name: string;
    cohort_size: number;
    eligible: boolean;
    percentiles: Record<string, number | null>;
  } | null;
}
export interface ClubAnalysis {
  import_id: string;
  label: string;
  players: ImportedPlayer[];
  data_quality: number;
  quality_checks: { passed: number; total: number };
  data_coverage: number;
  rows_with_issues: number;
  reference_dataset_id: string;
}
