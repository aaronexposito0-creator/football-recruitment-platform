import type { Brief, Catalog } from "./contracts";

export interface BriefDraft {
  position: string;
  roleId: string;
  brief: Brief | null;
}
export const initialBriefDraft: BriefDraft = {
  position: "CM",
  roleId: "cm_two_way",
  brief: null,
};
/** Restore user inputs only. Rankings are always recomputed for the current dataset. */
export function parseBriefDraft(raw: string, catalog: Catalog): BriefDraft {
  const value = JSON.parse(raw);
  const role = catalog.archetypes.find(
    (r) => r.id === value?.roleId && r.position_group === value?.position,
  );
  if (!role) throw new Error("Unknown saved role");
  if (value.brief == null)
    return { position: role.position_group, roleId: role.id, brief: null };
  const b = value.brief;
  if (
    !b ||
    typeof b !== "object" ||
    ![180, 270, 450, 600].includes(b.min_minutes) ||
    !Array.isArray(b.requirements) ||
    !b.requirements.length ||
    b.requirements.length > 40
  )
    throw new Error("Invalid saved brief");
  const seen = new Set<string>();
  const requirements = b.requirements.map((r: Record<string, unknown>) => {
    if (
      !r ||
      typeof r.metric !== "string" ||
      !Object.hasOwn(catalog.metric_catalog, r.metric) ||
      seen.has(r.metric) ||
      typeof r.weight !== "number" ||
      !Number.isFinite(r.weight) ||
      r.weight < 0 ||
      r.weight > 5 ||
      !["higher", "lower"].includes(String(r.direction))
    )
      throw new Error("Invalid saved requirement");
    seen.add(r.metric);
    for (const bound of [r.minimum, r.maximum])
      if (
        bound != null &&
        (typeof bound !== "number" || !Number.isFinite(bound))
      )
        throw new Error("Invalid saved bound");
    return {
      metric: r.metric,
      weight: r.weight,
      direction: String(r.direction),
      minimum: r.minimum as number | null | undefined,
      maximum: r.maximum as number | null | undefined,
    };
  });
  return {
    position: role.position_group,
    roleId: role.id,
    brief: {
      role_name: role.names.en,
      position_groups: [role.position_group],
      min_minutes: b.min_minutes,
      requirements,
    },
  };
}
export function validBrief(brief: Brief): boolean {
  return (
    brief.requirements.some((r) => r.weight > 0) &&
    brief.requirements.every(
      (r) => r.minimum == null || r.maximum == null || r.minimum <= r.maximum,
    )
  );
}

/** Compare the entire requested calculation, normalizing omitted API defaults.
 * Reordered requirements are equivalent; changed weights or constraints are not.
 */
export function briefSignature(brief: Brief): string {
  return JSON.stringify({
    role_name: brief.role_name,
    positions: [...brief.position_groups].sort(),
    minutes: brief.min_minutes,
    age_min: brief.age_min ?? null,
    age_max: brief.age_max ?? null,
    foot: brief.preferred_foot ?? null,
    league: brief.league_context_weight ?? 0,
    requirements: brief.requirements
      .map((r) => ({
        metric: r.metric,
        weight: r.weight,
        direction: r.direction ?? "higher",
        minimum: r.minimum ?? null,
        maximum: r.maximum ?? null,
        target: r.target ?? null,
        tolerance: r.tolerance ?? null,
      }))
      .sort((a, b) => a.metric.localeCompare(b.metric)),
  });
}
