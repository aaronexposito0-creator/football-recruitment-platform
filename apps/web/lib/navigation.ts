import type { Mode } from "./contracts";
import type { AdvancedFilters } from "./scouting";

export const workspaceModes: Mode[] = [
  "players",
  "recruitment",
  "compare",
  "shortlist",
  "squad",
  "myClub",
  "data",
];
export interface ExplorerState {
  query: string;
  position: string;
  team: string;
  minimum: number;
  advanced: AdvancedFilters;
  watchStatus: string;
}
export interface NavigationState {
  version: 1;
  datasetId: string;
  mode: Mode;
  playerId: string;
  filters: ExplorerState;
}
export function navigationURL(mode: Mode, playerId: string): string {
  const params = new URLSearchParams({ view: mode });
  if (playerId) params.set("player", playerId);
  return `?${params.toString()}`;
}
/** History filters belong to one dataset. The URL owns the module/player identity. */
export function readNavigation(
  search: string,
  stored: unknown,
  datasetId: string,
  defaults: ExplorerState,
  metricKeys: string[],
  teams: string[],
): NavigationState {
  const params = new URLSearchParams(search);
  const view = params.get("view");
  const mode = workspaceModes.includes(view as Mode)
    ? (view as Mode)
    : "players";
  const playerId = (params.get("player") || "").slice(0, 128);
  const result: NavigationState = {
    version: 1,
    datasetId,
    mode,
    playerId,
    filters: {
      ...defaults,
      minimum: mode === "shortlist" ? 0 : defaults.minimum,
      advanced: { ...defaults.advanced },
    },
  };
  if (!stored || typeof stored !== "object") return result;
  const record = stored as Partial<NavigationState>;
  if (
    record.version !== 1 ||
    record.datasetId !== datasetId ||
    record.mode !== mode ||
    record.playerId !== playerId ||
    !record.filters ||
    typeof record.filters !== "object"
  )
    return result;
  const f = record.filters;
  const a = f.advanced;
  result.filters.query =
    typeof f.query === "string" ? f.query.slice(0, 120) : "";
  result.filters.position = [
    "GK",
    "CB",
    "FB",
    "DM",
    "CM",
    "AM",
    "W",
    "ST",
  ].includes(f.position)
    ? f.position
    : "";
  result.filters.team = teams.includes(f.team) ? f.team : "";
  result.filters.minimum = [0, 90, 180, 270, 450].includes(f.minimum)
    ? f.minimum
    : result.filters.minimum;
  result.filters.watchStatus = [
    "watch",
    "review",
    "priority",
    "archived",
  ].includes(f.watchStatus)
    ? f.watchStatus
    : "";
  if (a && typeof a === "object") {
    result.filters.advanced = {
      metric1: metricKeys.includes(a.metric1) ? a.metric1 : "",
      metric2: metricKeys.includes(a.metric2) ? a.metric2 : "",
      floor1: [25, 50, 60, 75, 90].includes(a.floor1)
        ? a.floor1
        : defaults.advanced.floor1,
      floor2: [25, 50, 60, 75, 90].includes(a.floor2)
        ? a.floor2
        : defaults.advanced.floor2,
      minConfidence: [0, 20, 40, 60, 80].includes(a.minConfidence)
        ? a.minConfidence
        : 0,
      completeOnly: a.completeOnly === true,
      benchmarkOnly: a.benchmarkOnly === true,
      sortBy: ["minutes", "confidence", "name"].includes(a.sortBy)
        ? a.sortBy
        : "minutes",
    };
  }
  return result;
}
