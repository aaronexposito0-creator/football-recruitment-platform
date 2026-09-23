import type { ScoutingSummary } from "./contracts";
export interface AdvancedFilters {
  metric1: string;
  floor1: number;
  metric2: string;
  floor2: number;
  minConfidence: number;
  completeOnly: boolean;
  benchmarkOnly: boolean;
  sortBy: "minutes" | "confidence" | "name";
}
export const initialAdvanced: AdvancedFilters = {
  metric1: "",
  floor1: 75,
  metric2: "",
  floor2: 60,
  minConfidence: 0,
  completeOnly: false,
  benchmarkOnly: false,
  sortBy: "minutes",
};
export function passesAdvanced(
  summary: ScoutingSummary | undefined,
  filters: AdvancedFilters,
): boolean {
  if (
    filters.minConfidence &&
    (summary?.confidence ?? 0) < filters.minConfidence
  )
    return false;
  if (filters.completeOnly && summary?.data_coverage !== 100) return false;
  if (filters.benchmarkOnly && !summary?.eligible) return false;
  return [
    [filters.metric1, filters.floor1],
    [filters.metric2, filters.floor2],
  ].every(([metric, floor]) => {
    if (!metric) return true;
    const value = summary?.percentiles[String(metric)];
    return value != null && value >= Number(floor);
  });
}
