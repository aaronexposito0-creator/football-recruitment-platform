"use client";
import { teamName } from "../lib/teams";
import { useEffect, useState } from "react";
import type { Catalog, Language } from "../lib/contracts";
import { loadComparison, type ComparisonEntry } from "../lib/api";
import { fmt, positionName, translations } from "../lib/i18n";

export function Comparison({
  ids,
  catalog,
  api,
  lang,
  onRemove,
  onSelect,
}: {
  ids: string[];
  catalog: Catalog;
  api: boolean;
  lang: Language;
  onRemove: (id: string) => void;
  onSelect: (id: string) => void;
}) {
  const t = translations[lang];
  const [entries, setEntries] = useState<Record<string, ComparisonEntry>>({});
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setEntries({});
    void loadComparison(ids, catalog, api, controller.signal, (id, entry) => {
      setEntries((current) => ({ ...current, [id]: entry }));
    });
    return () => controller.abort();
  }, [ids, api, catalog.coverage.dataset_id, attempt]);
  return (
    <section className="comparison">
      <h2>{t.compare}</h2>
      <p>{t.compareIntro}</p>
      {!ids.length && <div className="state">{t.compareEmpty}</div>}
      {!!ids.length && (
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>{t.profile}</th>
                {ids.map((id, index) => {
                  const entry = entries[id];
                  const p = catalog.players.find(
                    (player) => player.player_id === id,
                  );
                  return (
                    <th key={id}>
                      {p ? (
                        <>
                          <button
                            className="player-link"
                            onClick={() => onSelect(id)}
                          >
                            {p.display_name}
                          </button>
                          <small>
                            {teamName(p.team_name, lang)} ·{" "}
                            {positionName(p.position_group, lang)}
                          </small>
                        </>
                      ) : (
                        <span>{t.savedPlayerUnavailable}</span>
                      )}
                      <button
                        className="text-button"
                        aria-label={`${t.remove} · ${p?.display_name || index + 1}`}
                        onClick={() => onRemove(id)}
                      >
                        {t.remove}
                      </button>
                      {(!entry || entry.status === "loading") && (
                        <p role="status">{t.loading}</p>
                      )}
                      {entry?.status === "error" && (
                        <p role="alert">
                          {t.error}{" "}
                          <button onClick={() => setAttempt((n) => n + 1)}>
                            {t.retry}
                          </button>
                        </p>
                      )}
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              <tr>
                <th>{t.minutes}</th>
                {ids.map((id) => {
                  const p = entries[id]?.profile;
                  return (
                    <td key={id}>
                      {fmt(
                        p?.player.minutes,
                        lang,
                        (p?.player.minutes ?? 0) < 10 ? 2 : 1,
                      )}
                    </td>
                  );
                })}
              </tr>
              <tr>
                <th>{t.confidence}</th>
                {ids.map((id) => (
                  <td key={id} title={t.confidenceHelp}>
                    {entries[id]?.profile
                      ? `${fmt(entries[id].profile?.evidence.confidence_score, lang, 0)}/100`
                      : "—"}
                  </td>
                ))}
              </tr>
              <tr>
                <th>{t.coverage}</th>
                {ids.map((id) => (
                  <td key={id} title={t.coverageHelp}>
                    {entries[id]?.profile
                      ? `${fmt(entries[id].profile?.evidence.data_coverage, lang, 0)}%`
                      : "—"}
                  </td>
                ))}
              </tr>
              <tr>
                <th>{t.cohort}</th>
                {ids.map((id) => {
                  const p = entries[id]?.profile;
                  return (
                    <td key={id}>
                      {p ? (
                        <>
                          {p.cohort.size} {t.peers}
                          <small>
                            {p.cohort.eligible
                              ? `≥${p.cohort.minimum_minutes} ${t.min}`
                              : t.benchmarkWithheld}
                          </small>
                        </>
                      ) : (
                        "—"
                      )}
                    </td>
                  );
                })}
              </tr>
              {Object.entries(catalog.metric_catalog).map(([key, metric]) => (
                <tr key={key}>
                  <th>
                    {metric.names[lang]}{" "}
                    <small>{metric.unit === "%" ? "%" : t.per90}</small>
                  </th>
                  {ids.map((id) => {
                    const m = entries[id]?.profile?.metrics.find(
                      (m) => m.key === key,
                    );
                    return (
                      <td key={id}>
                        <strong>{fmt(m?.value, lang, 2)}</strong>
                        <span className="table-percentile">
                          {m?.favorable_percentile == null
                            ? "—"
                            : "P" + Math.round(m.favorable_percentile)}
                        </span>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
