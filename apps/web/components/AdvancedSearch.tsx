"use client";
import type { Catalog, Language } from "../lib/contracts";
import { initialAdvanced, type AdvancedFilters } from "../lib/scouting";
import { translations } from "../lib/i18n";
export function AdvancedSearch({
  catalog,
  lang,
  value,
  onChange,
  onPosition,
}: {
  catalog: Catalog;
  lang: Language;
  value: AdvancedFilters;
  onChange: (v: AdvancedFilters) => void;
  onPosition: (v: string) => void;
}) {
  const t = translations[lang];
  function preset(id: string) {
    const role = catalog.archetypes?.find((r) => r.id === id);
    if (!role) return;
    const req = [...role.brief.requirements].sort(
      (a, b) => b.weight - a.weight,
    );
    onPosition(role.position_group);
    onChange({
      ...value,
      metric1: req[0].metric,
      floor1: 60,
      metric2: req[1]?.metric || "",
      floor2: 60,
      benchmarkOnly: true,
    });
  }
  return (
    <details className="advanced-search">
      <summary>{t.advancedSearch}</summary>
      <p>{t.fixedCohort}</p>
      <div className="advanced-grid">
        <label>
          {t.archetypeStart}
          <select
            defaultValue=""
            onChange={(e) => {
              preset(e.target.value);
              e.target.value = "";
            }}
          >
            <option value="">{t.chooseArchetype}</option>
            {catalog.archetypes?.map((r) => (
              <option key={r.id} value={r.id}>
                {r.names[lang]} · {r.position_group}
              </option>
            ))}
          </select>
        </label>
        {([1, 2] as const).map((n) => (
          <div className="percentile-filter" key={n}>
            <label>
              {t.signal} {n}
              <select
                value={value[n === 1 ? "metric1" : "metric2"]}
                onChange={(e) =>
                  onChange({
                    ...value,
                    [n === 1 ? "metric1" : "metric2"]: e.target.value,
                  })
                }
              >
                <option value="">{t.noFilter}</option>
                {Object.values(catalog.metric_catalog).map((m) => (
                  <option key={m.key} value={m.key}>
                    {m.names[lang]} · {m.unit === "%" ? "%" : "/90"}
                  </option>
                ))}
              </select>
            </label>
            <label>
              {t.minimumPercentile}
              <select
                aria-label={`${t.minimumPercentile} · ${t.signal} ${n}`}
                disabled={!value[n === 1 ? "metric1" : "metric2"]}
                value={value[n === 1 ? "floor1" : "floor2"]}
                onChange={(e) =>
                  onChange({
                    ...value,
                    [n === 1 ? "floor1" : "floor2"]: Number(e.target.value),
                  })
                }
              >
                {[25, 50, 60, 75, 90].map((p) => (
                  <option key={p} value={p}>
                    P{p}+
                  </option>
                ))}
              </select>
            </label>
          </div>
        ))}
        <label>
          {t.minimumConfidence}
          <select
            value={value.minConfidence}
            onChange={(e) =>
              onChange({ ...value, minConfidence: Number(e.target.value) })
            }
          >
            {[0, 20, 40, 60, 80].map((n) => (
              <option key={n} value={n}>
                ≥{n}/100
              </option>
            ))}
          </select>
        </label>
        <label>
          {t.sortBy}
          <select
            value={value.sortBy}
            onChange={(e) =>
              onChange({
                ...value,
                sortBy: e.target.value as AdvancedFilters["sortBy"],
              })
            }
          >
            <option value="minutes">{t.minutes}</option>
            <option value="confidence">{t.confidence}</option>
            <option value="name">{t.name}</option>
          </select>
        </label>
        <div className="advanced-checks">
          <label>
            <input
              type="checkbox"
              checked={value.completeOnly}
              onChange={(e) =>
                onChange({ ...value, completeOnly: e.target.checked })
              }
            />
            {t.fullMetricCoverage}
          </label>
          <label>
            <input
              type="checkbox"
              checked={value.benchmarkOnly}
              onChange={(e) =>
                onChange({ ...value, benchmarkOnly: e.target.checked })
              }
            />
            {t.benchmarkEligible}
          </label>
          <button onClick={() => onChange({ ...initialAdvanced })}>
            {t.resetAdvanced}
          </button>
        </div>
      </div>
      <p className="micro">
        {t.archetypeHelp} {t.unavailableFilters}
      </p>
    </details>
  );
}
