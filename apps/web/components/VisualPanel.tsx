"use client";
import { teamName } from "../lib/teams";
import { useEffect, useId, useState } from "react";
import type { Language, MapKind, VisualProfile } from "../lib/contracts";
import { loadVisuals } from "../lib/api";
import { fmt, translations } from "../lib/i18n";
const centre = (zone: number) => ({
  x: (zone % 6) * 20 + 10,
  y: Math.floor(zone / 6) * 20 + 10,
});
export function VisualPanel({
  id,
  datasetId,
  api,
  lang,
  minutes,
}: {
  id: string;
  datasetId: string;
  api: boolean;
  lang: Language;
  minutes: number;
}) {
  const t = translations[lang],
    arrowId = useId();
  const [data, setData] = useState<VisualProfile | null>(null),
    [error, setError] = useState(false),
    [attempt, setAttempt] = useState(0);
  const [kind, setKind] = useState<MapKind>("shots"),
    [match, setMatch] = useState("all"),
    [flows, setFlows] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    setData(null);
    setError(false);
    setMatch("all");
    loadVisuals(id, api, datasetId, controller.signal)
      .then((value) => {
        if (!controller.signal.aborted) setData(value);
      })
      .catch(() => {
        if (!controller.signal.aborted) setError(true);
      });
    return () => controller.abort();
  }, [id, api, datasetId, attempt]);
  if (error)
    return (
      <div className="state" role="alert">
        {t.error}
        <button onClick={() => setAttempt((n) => n + 1)}>{t.retry}</button>
      </div>
    );
  if (!data || data.player_id !== id || data.dataset_id !== datasetId)
    return (
      <div className="state" role="status">
        {t.loading}
      </div>
    );
  const labels: Record<MapKind, string> = {
    shots: t.shotZones,
    passes: t.passZones,
    progressive_passes: t.progressivePassZones,
    progressive_carries: t.progressiveCarryZones,
    pressures: t.pressureZones,
    tackles_interceptions: t.defensiveZones,
  };
  const selected = data.matches.find((m) => m.match_id === match),
    map = (selected?.maps || data.maps)[kind];
  const exposure = selected?.minutes ?? minutes,
    max = Math.max(...map.cells.map((c) => c.count), 1);
  const canFlow = [
    "passes",
    "progressive_passes",
    "progressive_carries",
  ].includes(kind);
  const topFlows = [...map.flows]
    .sort((a, b) => b.count - a.count || a.from - b.from || a.to - b.to)
    .slice(0, 8);
  const partial =
    (kind === "pressures" &&
      data.incomplete_metrics.includes("pressures_per90")) ||
    (kind.startsWith("progressive_") &&
      data.incomplete_metrics.includes(kind + "_per90"));
  const highest = [...map.cells].sort(
    (a, b) => b.count - a.count || a.zone - b.zone,
  )[0];
  const zoneName = (zone: number) =>
    `Z${zone + 1} · ` +
    [t.defensiveThird, t.middleThird, t.attackingThird][
      Math.floor((zone % 6) / 2)
    ] +
    " · " +
    [t.leftWide, t.leftInside, t.rightInside, t.rightWide][
      Math.floor(zone / 6)
    ];
  return (
    <div className="visual-panel">
      <div className="visual-toolbar">
        <label>
          {t.actionType}
          <select
            value={kind}
            onChange={(e) => setKind(e.target.value as MapKind)}
          >
            {Object.entries(labels).map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label>
          {t.matchContext}
          <select value={match} onChange={(e) => setMatch(e.target.value)}>
            <option value="all">{t.wholeTournament}</option>
            {data.matches.map((m) => (
              <option key={m.match_id} value={m.match_id}>
                {m.date} · {teamName(m.opponent, lang)} · {m.goals_for}–
                {m.goals_against}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="map-context">
        <span>
          {fmt(exposure, lang, 1)} {t.min}
        </span>
        <span>
          {map.located} {t.locatedActions}
        </span>
        {map.events > map.located && (
          <span className="amber">
            {map.events - map.located} {t.unlocated}
          </span>
        )}
        {canFlow && (
          <label>
            <input
              type="checkbox"
              checked={flows}
              onChange={(e) => setFlows(e.target.checked)}
            />
            {t.zoneFlows}
          </label>
        )}
      </div>
      {partial && <p className="notice">{t.partialSpatial}</p>}
      <div className="pitch-heading">
        <strong>{labels[kind]}</strong>
        <span>{t.attackDirection} →</span>
      </div>
      <svg
        className="football-pitch"
        viewBox="-2 -2 124 84"
        role="img"
        aria-label={`${labels[kind]}: ${map.located} ${t.locatedActions}. ${t.spatialMethod}`}
      >
        <defs>
          <marker
            id={arrowId}
            markerWidth="4"
            markerHeight="4"
            refX="3.3"
            refY="2"
            orient="auto"
          >
            <path d="M0 0 L4 2 L0 4" fill="currentColor" />
          </marker>
        </defs>
        <rect
          x="0"
          y="0"
          width="120"
          height="80"
          rx="1"
          className="pitch-surface"
        />
        {Array.from({ length: 24 }, (_, z) => {
          const cell = map.cells.find((c) => c.zone === z);
          return (
            <g key={z}>
              <rect
                x={(z % 6) * 20}
                y={Math.floor(z / 6) * 20}
                width="20"
                height="20"
                className="pitch-cell"
                style={{
                  fillOpacity: cell?.count
                    ? 0.15 + (0.65 * cell.count) / max
                    : 0,
                }}
              >
                <title>
                  {zoneName(z)}: {cell?.count || 0}
                  {kind === "shots" && cell?.xg != null
                    ? " · xG ≈" + fmt(cell.xg, lang, 2)
                    : ""}
                </title>
              </rect>
              {cell && !(canFlow && flows) && (
                <text
                  x={centre(z).x}
                  y={centre(z).y + 1.2}
                  textAnchor="middle"
                  className="pitch-count"
                >
                  {cell.count}
                </text>
              )}
            </g>
          );
        })}
        <g className="pitch-lines">
          <rect x="0" y="0" width="120" height="80" />
          <path d="M60 0V80 M0 18H18V62H0 M120 18H102V62H120 M0 30H6V50H0 M120 30H114V50H120" />
          <ellipse cx="60" cy="40" rx="10.5" ry="10.8" />
          <circle cx="60" cy="40" r=".7" />
          <circle cx="12" cy="40" r=".7" />
          <circle cx="108" cy="40" r=".7" />
        </g>
        {canFlow &&
          flows &&
          topFlows.map((f) => {
            const a = centre(f.from),
              b = centre(f.to),
              x = a.x + (b.x - a.x) * 0.85,
              y = a.y + (b.y - a.y) * 0.85;
            return (
              <g key={`${f.from}-${f.to}`} className="zone-flow">
                <line
                  x1={a.x}
                  y1={a.y}
                  x2={x}
                  y2={y}
                  strokeWidth={
                    0.5 + (f.count / Math.max(topFlows[0].count, 1)) * 1.6
                  }
                  strokeDasharray={
                    kind === "progressive_carries" ? "2 2" : undefined
                  }
                  markerEnd={`url(#${arrowId})`}
                />
                <text x={(a.x + x) / 2} y={(a.y + y) / 2 - 1}>
                  {f.count}
                </text>
                <title>
                  {zoneName(f.from)} → {zoneName(f.to)}: {f.count}
                </title>
              </g>
            );
          })}
      </svg>
      {!map.located && <p className="notice">{t.noLocatedActions}</p>}
      {highest && (
        <p className="spatial-insight">
          <strong>{t.mostActiveZone}: </strong>
          {zoneName(highest.zone)} ·{" "}
          {fmt((100 * highest.count) / map.located, lang, 0)}%{" "}
          {t.ofLocatedActions}
        </p>
      )}
      <p className="fine-print">
        {t.spatialMethod} {canFlow && flows ? t.flowMethod : ""}
      </p>
      <details className="metric-definition">
        <summary>{t.zoneTable}</summary>
        <div className="table-scroll">
          <table className="similar-table">
            <thead>
              <tr>
                <th>{t.zone}</th>
                <th>{t.events}</th>
                <th>{t.per90}</th>
                {kind === "shots" && <th>xG ≈</th>}
              </tr>
            </thead>
            <tbody>
              {map.cells.map((c) => (
                <tr key={c.zone}>
                  <th>
                    {zoneName(c.zone)} · {(c.zone % 6) + 1}
                  </th>
                  <td>{c.count}</td>
                  <td>{fmt((c.count * 90) / exposure, lang, 2)}</td>
                  {kind === "shots" && <td>{fmt(c.xg, lang, 2)}</td>}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </div>
  );
}
