import type { Catalog, Player } from "./contracts";
import type { ScoutingNotes } from "./shortlist";

export function csvText(
  players: Player[],
  catalog: Catalog,
  notes: ScoutingNotes = {},
): string {
  const metrics = Object.keys(catalog.metric_catalog);
  const totals = metrics
    .filter((k) => k.endsWith("_per90"))
    .map((k) => k.slice(0, -6));
  const headers = [
    "player_id",
    "player_name",
    "team_in_tournament",
    "position_group",
    "minutes_including_added_time",
    "appearances",
    "source",
    "dataset_id",
    "source_revision",
    "license_url",
    "review_status",
    "scout_note",
    "note_updated_at",
    ...totals,
    ...metrics,
  ];
  const rows = players.map((p) => [
    p.player_id,
    p.player_name,
    p.team_name,
    p.position_group,
    p.minutes,
    p.appearances,
    "StatsBomb",
    p.dataset_id,
    catalog.coverage.source_revision,
    catalog.coverage.license_url,
    notes[p.player_id]?.status,
    notes[p.player_id]?.note,
    notes[p.player_id]?.updated_at,
    ...totals.map((k) => p.totals?.[k]),
    ...metrics.map((k) => p.metrics[k]),
  ]);
  const cell = (value: unknown) => {
    let text = value == null ? "" : String(value);
    if (typeof value === "string" && /^[\s]*[=+@-]/.test(text))
      text = "'" + text;
    return '"' + text.replaceAll('"', '""') + '"';
  };
  return (
    "\ufeff" +
    [headers, ...rows].map((row) => row.map(cell).join(",")).join("\r\n")
  );
}
