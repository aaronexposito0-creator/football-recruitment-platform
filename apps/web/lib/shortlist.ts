export const shortlistStatuses = [
  "watch",
  "review",
  "priority",
  "archived",
] as const;
export interface ScoutingNote {
  status: (typeof shortlistStatuses)[number];
  note: string;
  updated_at: string;
}
export type ScoutingNotes = Record<string, ScoutingNote>;
export function parseNotes(raw: string): ScoutingNotes {
  const data: unknown = JSON.parse(raw);
  if (!data || typeof data !== "object" || Array.isArray(data))
    throw new Error("Invalid notebook");
  const out: ScoutingNotes = {};
  for (const [id, value] of Object.entries(data).slice(0, 1000)) {
    if (
      !/^statsbomb:player:\d+$/.test(id) ||
      !value ||
      typeof value !== "object"
    )
      continue;
    const record = value as Record<string, unknown>;
    if (
      typeof record.note !== "string" ||
      !shortlistStatuses.includes(record.status as ScoutingNote["status"])
    )
      continue;
    out[id] = {
      status: record.status as ScoutingNote["status"],
      note: record.note.slice(0, 3000),
      updated_at:
        typeof record.updated_at === "string"
          ? record.updated_at.slice(0, 40)
          : "",
    };
  }
  return out;
}
