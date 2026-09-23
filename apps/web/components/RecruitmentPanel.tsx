"use client";
import { teamName } from "../lib/teams";
import { fitReason } from "../lib/explanations";
import { useEffect, useRef, useState } from "react";
import type { Brief, Catalog, Fit, Language } from "../lib/contracts";
import { json } from "../lib/api";
import { fmt, positionName, positions, translations } from "../lib/i18n";
import {
  briefSignature,
  initialBriefDraft,
  parseBriefDraft,
  validBrief,
} from "../lib/brief";
import { useStoredState } from "../lib/useStoredState";
import { validateFit } from "../lib/validation";

export function RecruitmentPanel({
  catalog,
  lang,
  api,
  onSelect,
}: {
  catalog: Catalog;
  lang: Language;
  api: boolean;
  onSelect: (id: string) => void;
}) {
  const t = translations[lang];
  const [draft, setDraft, draftStorage] = useStoredState(
    `frp-brief-v1:${catalog.coverage.dataset_id}`,
    initialBriefDraft,
    (raw) => parseBriefDraft(raw, catalog),
  );
  const { position, roleId } = draft;
  const selectedRole = catalog.archetypes?.find((r) => r.id === roleId);
  const [brief, setBrief] = useState<Brief | null>(null);
  const [responseFit, setFit] = useState<Fit | null>(null);
  const requestedBrief = draft.brief || selectedRole?.brief;
  const fit =
    responseFit &&
    requestedBrief &&
    briefSignature(responseFit.brief) === briefSignature(requestedBrief)
      ? responseFit
      : null;
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [eligibleOnly, setEligibleOnly] = useState(true);
  const [resultWindow, setResultWindow] = useState({ key: "", size: 30 });
  const activeRun = useRef<AbortController | null>(null);
  const datasetId = catalog.coverage.dataset_id;
  const invalid = brief?.requirements.some(
    (r) => r.minimum != null && r.maximum != null && r.minimum > r.maximum,
  );
  useEffect(() => {
    if (!draftStorage.ready) return;
    const controller = new AbortController();
    activeRun.current?.abort();
    setBrief(null);
    setFit(null);
    setError(false);
    setDirty(false);
    setBusy(true);
    async function loadBrief() {
      if (controller.signal.aborted) return;
      const next =
        draft.brief ||
        catalog.archetypes.find((role) => role.id === roleId)?.brief;
      if (!next) throw new Error("Missing brief template");
      setBrief(next);
      if (!validBrief(next) || (!api && draft.brief)) {
        setDirty(true);
        return;
      }
      const response = api
        ? await json<Fit>(
            "/api/football/recruitment/fit",
            controller.signal,
            next,
          )
        : await json<Fit>(`/analysis/fit/${roleId}.json`, controller.signal);
      const validated = validateFit(response, datasetId, next);
      if (!controller.signal.aborted) setFit(validated);
    }
    void loadBrief()
      .catch(() => {
        if (!controller.signal.aborted) setError(true);
      })
      .finally(() => {
        if (!controller.signal.aborted) setBusy(false);
      });
    return () => {
      controller.abort();
      activeRun.current?.abort();
    };
  }, [position, roleId, api, datasetId, attempt, draftStorage.ready]);
  async function run() {
    if (!brief || !api || !validBrief(brief)) return;
    activeRun.current?.abort();
    const controller = new AbortController();
    activeRun.current = controller;
    setBusy(true);
    setError(false);
    setFit(null);
    try {
      const response = await json<Fit>(
        "/api/football/recruitment/fit",
        AbortSignal.any([controller.signal, AbortSignal.timeout(10000)]),
        brief,
      );
      const validated = validateFit(response, datasetId, brief);
      if (!controller.signal.aborted) {
        setFit(validated);
        setDirty(false);
      }
    } catch {
      if (!controller.signal.aborted) setError(true);
    } finally {
      if (!controller.signal.aborted) setBusy(false);
    }
  }
  function update(next: Brief) {
    setBrief(next);
    setDraft({ ...draft, brief: next });
    setDirty(true);
    setFit(null);
    setError(false);
  }
  const results = fit?.results.filter((p) => !eligibleOnly || p.eligible) || [];
  const eligibleCount = fit?.results.filter((p) => p.eligible).length || 0;
  const excludedCount = (fit?.results.length || 0) - eligibleCount;
  const resultKey = JSON.stringify([
    datasetId,
    requestedBrief && briefSignature(requestedBrief),
    eligibleOnly,
  ]);
  useEffect(() => {
    setResultWindow({ key: resultKey, size: 30 });
  }, [resultKey]);
  const visibleResults = results.slice(
    0,
    resultWindow.key === resultKey ? resultWindow.size : 30,
  );
  return (
    <div className="recruitment-layout">
      <aside className="card brief-builder">
        <div className="eyebrow">{t.role}</div>
        <h2>{selectedRole?.names[lang] || t.roleName}</h2>
        <p>{t.fitDisclaimer}</p>
        <p className="micro">{t.savedBriefHelp}</p>
        {draftStorage.storageError && (
          <p className="notice" role="alert">
            {t.storageError}
          </p>
        )}
        <label>
          {t.position}
          <select
            value={position}
            onChange={(e) => {
              const role = catalog.archetypes.find(
                (r) => r.position_group === e.target.value,
              );
              if (role)
                setDraft({
                  position: role.position_group,
                  roleId: role.id,
                  brief: null,
                });
            }}
          >
            {Object.keys(positions)
              .filter((p) => p !== "GK")
              .map((p) => (
                <option key={p} value={p}>
                  {positionName(p, lang)}
                </option>
              ))}
          </select>
        </label>
        <label>
          {t.archetype}
          <select
            value={roleId}
            onChange={(e) =>
              setDraft({ ...draft, roleId: e.target.value, brief: null })
            }
          >
            {catalog.archetypes
              ?.filter((r) => r.position_group === position)
              .map((r) => (
                <option key={r.id} value={r.id}>
                  {r.names[lang]}
                </option>
              ))}
          </select>
        </label>
        <p className="micro">{t.archetypeHelp}</p>
        <label>
          {t.minimum}
          <select
            value={brief?.min_minutes ?? 180}
            disabled={!api || busy || !brief}
            onChange={(e) =>
              brief && update({ ...brief, min_minutes: Number(e.target.value) })
            }
          >
            {[180, 270, 450, 600].map((n) => (
              <option key={n} value={n}>
                ≥{n} {t.min}
              </option>
            ))}
          </select>
        </label>
        <div className="brief-min">
          {catalog.coverage.competition} {catalog.coverage.season}
        </div>
        <h3>{t.weights}</h3>
        {brief?.requirements.map((r, i) => (
          <label className="weight" key={r.metric}>
            <span>
              {catalog.metric_catalog[r.metric]?.names[lang]} ·{" "}
              {catalog.metric_catalog[r.metric]?.unit === "%" ? "%" : t.per90}{" "}
              <b>{r.weight}</b>
            </span>
            <input
              aria-label={`${catalog.metric_catalog[r.metric]?.names[lang]} · ${catalog.metric_catalog[r.metric]?.unit === "%" ? "%" : t.per90}`}
              type="range"
              min="0"
              max="5"
              step="1"
              value={r.weight}
              disabled={!api || busy}
              onChange={(e) =>
                update({
                  ...brief,
                  requirements: brief.requirements.map((v, j) =>
                    i === j ? { ...v, weight: Number(e.target.value) } : v,
                  ),
                })
              }
            />
          </label>
        ))}
        <details className="constraints">
          <summary>{t.hardConstraints}</summary>
          <p>{t.constraintHelp}</p>
          {brief?.requirements.map((r, i) => (
            <div className="constraint-row" key={r.metric}>
              <span>
                {catalog.metric_catalog[r.metric]?.names[lang]} ·{" "}
                {catalog.metric_catalog[r.metric]?.unit === "%" ? "%" : t.per90}
              </span>
              {(["minimum", "maximum"] as const).map((bound) => (
                <label key={bound}>
                  {bound === "minimum" ? t.lowerBound : t.upperBound}
                  <input
                    type="number"
                    step="any"
                    disabled={!api || busy}
                    placeholder="—"
                    value={r[bound] ?? ""}
                    aria-label={`${catalog.metric_catalog[r.metric]?.names[lang]} · ${catalog.metric_catalog[r.metric]?.unit === "%" ? "%" : t.per90} · ${bound === "minimum" ? t.lowerBound : t.upperBound}`}
                    onChange={(e) =>
                      update({
                        ...brief,
                        requirements: brief.requirements.map((v, j) =>
                          j === i
                            ? {
                                ...v,
                                [bound]:
                                  e.target.value === ""
                                    ? null
                                    : Number(e.target.value),
                              }
                            : v,
                        ),
                      })
                    }
                  />
                </label>
              ))}
            </div>
          ))}
          <p>{t.unavailableFilters}</p>
        </details>
        {invalid && (
          <p className="notice" role="alert">
            {t.invalidBounds}
          </p>
        )}
        {brief && !brief.requirements.some((r) => r.weight > 0) && (
          <p className="notice" role="alert">
            {t.positiveWeightRequired}
          </p>
        )}
        {api ? (
          <button
            className="primary full"
            disabled={
              busy || invalid || !brief?.requirements.some((r) => r.weight > 0)
            }
            onClick={run}
          >
            {busy ? t.running : t.run}
          </button>
        ) : (
          <p className="notice">{t.offlineBrief}</p>
        )}
        <button
          disabled={busy}
          onClick={() => {
            setDraft({ ...draft, brief: null });
            setAttempt((n) => n + 1);
          }}
        >
          {t.resetBrief}
        </button>
        <details className="metric-definition">
          <summary>{t.methodology}</summary>
          <p>{t.fitHelp}</p>
          <p>{t.fitCalculation}</p>
          <p>{t.fitConfidenceHelp}</p>
          <p>{t.fitCoverageHelp}</p>
        </details>
      </aside>
      <section className="ranking">
        <div className="section-row">
          <h2>{t.recruitment}</h2>
          <span>
            {fit?.population_size ?? "—"} {t.peers}
          </span>
        </div>
        <p className="fine-print">{t.fitDisclaimer}</p>
        <label className="eligibility-toggle">
          <input
            type="checkbox"
            checked={eligibleOnly}
            onChange={(e) => setEligibleOnly(e.target.checked)}
          />
          {t.onlyEligible}
        </label>
        {fit && (
          <p className="fine-print">
            {eligibleCount}{" "}
            {eligibleCount === 1 ? t.eligibleCandidate : t.eligibleCandidates} ·{" "}
            {excludedCount}{" "}
            {excludedCount === 1
              ? t.excludedOne.toLowerCase()
              : t.excluded.toLowerCase()}
          </p>
        )}
        {error && (
          <p role="alert" className="notice">
            {t.error}{" "}
            <button
              onClick={() => (api && brief ? run() : setAttempt((n) => n + 1))}
            >
              {t.retry}
            </button>
          </p>
        )}
        {!fit && !error && (
          <div className="state" role="status">
            {dirty ? (api ? t.run : t.offlineBrief) : t.loading}
          </div>
        )}
        {fit && !results.length && (
          <p className="notice">
            {fit.population_size < 10 ? t.fitSmallReference : t.noFit}
          </p>
        )}
        {!!results.length && (
          <div className="section-row">
            <p className="fine-print" role="status">
              {t.showingCandidates}: {visibleResults.length} / {results.length}
            </p>
            {visibleResults.length < results.length && (
              <button
                onClick={() =>
                  setResultWindow({
                    key: resultKey,
                    size: visibleResults.length + 30,
                  })
                }
              >
                {t.moreCandidates}
              </button>
            )}
          </div>
        )}
        {visibleResults.map((p, i) => (
          <article className="fit-card" key={p.player_id}>
            <div className="fit-card-head">
              <span className="rank-number">
                {String(i + 1).padStart(2, "0")}
              </span>
              <button
                className="player-link"
                onClick={() => onSelect(p.player_id)}
              >
                <strong>{p.player_name}</strong>
                <small>
                  {teamName(p.team_name, lang)} · {positionName(position, lang)}
                </small>
              </button>
              <div className="fit-value" title={t.fitHelp}>
                <strong>{fmt(p.fit_score, lang, 0)}</strong>
                <small>{t.fit}</small>
              </div>
            </div>
            <div className="fit-evidence">
              <span title={t.fitConfidenceHelp}>
                {t.confidence}: <b>{fmt(p.confidence_score, lang, 0)}/100</b>
              </span>
              <span title={t.fitCoverageHelp}>
                {t.briefCoverage}: <b>{fmt(p.data_coverage, lang, 0)}%</b>
              </span>
              <span className={p.eligible ? "" : "amber"}>
                {p.eligible ? t.eligible : t.excludedOne}
              </span>
            </div>
            <details className="why">
              <summary>{t.why}</summary>
              <p className="micro">{t.fitDelta}</p>
              {p.components.map((c) => (
                <div className="contribution" key={c.metric}>
                  <span>
                    {catalog.metric_catalog[c.metric]?.names[lang]}
                    <small>
                      {t.observed}: {fmt(c.observed, lang, 2)}{" "}
                      {catalog.metric_catalog[c.metric]?.unit === "%"
                        ? "%"
                        : t.per90}
                    </small>
                    <small>
                      {t.requirementWeight}: {fmt(c.weight, lang, 0)} ·{" "}
                      {t.requirementScore}:{" "}
                      {c.normalized_score == null
                        ? "—"
                        : `${fmt(c.normalized_score, lang, 2)}/100`}
                    </small>
                  </span>
                  <div className="contribution-bar signed">
                    <i
                      className={c.delta_from_neutral < 0 ? "negative" : ""}
                      style={{
                        left: `${50 + Math.min(c.delta_from_neutral, 0)}%`,
                        width: `${Math.abs(c.delta_from_neutral)}%`,
                      }}
                    />
                  </div>
                  <b>
                    {c.normalized_score == null
                      ? "—"
                      : (c.delta_from_neutral > 0 ? "+" : "") +
                        fmt(c.delta_from_neutral, lang, 1)}
                  </b>
                </div>
              ))}
              {p.reasons.length > 0 && (
                <ul>
                  {p.reasons.map((reason) => (
                    <li key={reason}>{fitReason(reason, catalog, lang)}</li>
                  ))}
                </ul>
              )}
            </details>
          </article>
        ))}
      </section>
    </div>
  );
}
