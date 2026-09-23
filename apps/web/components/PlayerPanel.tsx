"use client";
import { teamName } from "../lib/teams";

import { useEffect, useState } from "react";
import type { Catalog, Language, Profile, Similarity } from "../lib/contracts";
import { VisualPanel } from "./VisualPanel";
import { loadProfile, loadSimilar } from "../lib/api";
import { fmt, positionName, translations } from "../lib/i18n";
import { evidenceWarning } from "../lib/explanations";
import { metricHelp, metricDenominator } from "../lib/metricHelp";

const chartMetrics = [
  "npxg_per90",
  "xa_per90",
  "progressive_passes_per90",
  "progressive_carries_per90",
  "pressures_per90",
];
const profileTabs = ["profile", "visuals", "evidence", "similarity"] as const;
export function Radar({ profile, lang }: { profile: Profile; lang: Language }) {
  const t = translations[lang];
  const labels = {
    en: [
      "npxG /90",
      "Shot xA /90",
      "Prog. passes /90",
      "Prog. carries /90",
      "Pressures /90",
    ],
    es: [
      "npxG /90",
      "xA de tiro /90",
      "Pases prog. /90",
      "Conduc. prog. /90",
      "Presiones /90",
    ],
    fr: [
      "npxG /90",
      "xA de tir /90",
      "Passes prog. /90",
      "Conduites prog. /90",
      "Pressions /90",
    ],
  }[lang];
  const values = chartMetrics.map(
    (k) =>
      profile.metrics.find((m) => m.key === k)?.favorable_percentile ?? null,
  );
  if (values.some((v) => v == null))
    return <div className="radar-empty">{t.noBenchmark}</div>;
  const point = (i: number, radius: number) => [
    160 + Math.sin((i * 2 * Math.PI) / 5) * radius,
    144 - Math.cos((i * 2 * Math.PI) / 5) * radius,
  ];
  const polygon = (scale: number) =>
    values.map((_, i) => point(i, scale).join(",")).join(" ");
  return (
    <svg
      className="radar"
      viewBox="0 0 320 292"
      role="img"
      aria-label={values
        .map((v, i) => `${labels[i]}: ${fmt(v, lang, 0)}`)
        .join(", ")}
    >
      {[25, 50, 75, 100].map((n) => (
        <polygon
          key={n}
          points={polygon(n)}
          className={n === 50 ? "radar-grid median" : "radar-grid"}
        />
      ))}
      {values.map((_, i) => (
        <line
          key={i}
          x1="160"
          y1="144"
          x2={point(i, 100)[0]}
          y2={point(i, 100)[1]}
          className="radar-axis"
        />
      ))}
      <polygon
        points={values.map((v, i) => point(i, v || 0).join(",")).join(" ")}
        className="radar-area"
      />
      {values.map((v, i) => (
        <circle
          key={i}
          cx={point(i, v || 0)[0]}
          cy={point(i, v || 0)[1]}
          r="4"
          className="radar-point"
        />
      ))}
      {labels.map((label, i) => {
        const [x, y] = point(i, 126);
        return (
          <text
            key={label}
            x={i === 1 ? 314 : i === 4 ? 6 : x}
            y={i === 1 || i === 4 ? y - 8 : y}
            textAnchor={i === 1 ? "end" : i === 4 ? "start" : "middle"}
            className="radar-label"
          >
            {label}
          </text>
        );
      })}
      <text x="160" y="288" textAnchor="middle" className="radar-foot">
        P50 · {t.reference}
      </text>
    </svg>
  );
}

export function PlayerPanel({
  id,
  catalog,
  api,
  lang,
  saved,
  compared,
  onSave,
  onCompare,
  onSelect,
}: {
  id: string;
  catalog: Catalog;
  api: boolean;
  lang: Language;
  saved: boolean;
  compared: boolean;
  onSave: () => void;
  onCompare: () => void;
  onSelect: (id: string) => void;
}) {
  const t = translations[lang];
  const [profile, setProfile] = useState<Profile | null>(null);
  const [similar, setSimilar] = useState<Similarity | null>(null);
  const [error, setError] = useState(false);
  const [similarError, setSimilarError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [tab, setTab] = useState<(typeof profileTabs)[number]>("profile");
  const [otherTeams, setOtherTeams] = useState(false);
  const [similarMinutes, setSimilarMinutes] = useState(180);
  const [similarConfidence, setSimilarConfidence] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setProfile(null);
    setSimilar(null);
    setError(false);
    setSimilarError(false);
    loadProfile(id, api, catalog.coverage.dataset_id, controller.signal)
      .then((value) => {
        if (!controller.signal.aborted) setProfile(value);
      })
      .catch(() => {
        if (!controller.signal.aborted) setError(true);
      });
    loadSimilar(id, api, catalog.coverage.dataset_id, controller.signal)
      .then((value) => {
        if (!controller.signal.aborted) setSimilar(value);
      })
      .catch(() => {
        if (!controller.signal.aborted) setSimilarError(true);
      });
    return () => controller.abort();
  }, [id, api, catalog.coverage.dataset_id, attempt]);
  if (error)
    return (
      <div className="state" role="alert">
        <p>{t.error}</p>
        <button onClick={() => setAttempt((v) => v + 1)}>{t.retry}</button>
      </div>
    );
  if (
    !profile ||
    profile.player.player_id !== id ||
    profile.lineage.dataset_id !== catalog.coverage.dataset_id
  )
    return (
      <div className="state" role="status">
        <span className="loader" />
        {t.loading}
      </div>
    );
  const p = profile.player;
  const replacementCandidates =
    similar?.results.filter((r) => {
      const candidate = catalog.players.find(
        (c) => c.player_id === r.player_id,
      );
      return (
        candidate &&
        (!otherTeams || candidate.team_name !== p.team_name) &&
        candidate.minutes >= similarMinutes &&
        (catalog.scouting_index[r.player_id]?.confidence || 0) >=
          similarConfidence
      );
    }) || [];
  const families = [
    "finishing",
    "creation",
    "progression",
    "possession",
    "defending",
  ] as const;
  return (
    <article className="player-panel">
      <section className="profile-head">
        <div className="profile-title">
          <div className="eyebrow">
            {teamName(p.team_name, lang)} <span>/</span> {p.competition}{" "}
            {p.season}
          </div>
          <h2>{p.display_name}</h2>
          {p.display_name !== p.player_name && (
            <p className="full-name">{p.player_name}</p>
          )}
          <div className="identity">
            <span className="position-tag">{p.position_group}</span>
            <span>{positionName(p.position_group, lang)}</span>
          </div>
          <div className="profile-actions">
            <button
              className={saved ? "primary saved" : "primary"}
              onClick={onSave}
              aria-pressed={saved}
            >
              {saved ? "✓ " + t.saved : "+ " + t.save}
            </button>
            <button onClick={onCompare} aria-pressed={compared}>
              {compared ? "✓ " + t.inCompare : t.addCompare}
            </button>
          </div>
          <div className="headline-stats">
            {[
              [t.minutes, fmt(p.minutes, lang, p.minutes < 10 ? 2 : 1)],
              [t.appearances, p.appearances],
              [t.goals, p.totals.goals],
              [t.assists, p.totals.assists],
            ].map(([label, value]) => (
              <div key={String(label)}>
                <strong>{value ?? "—"}</strong>
                <span>{label}</span>
              </div>
            ))}
          </div>
          <p className="micro">{t.addedTime}</p>
        </div>
        <div className="radar-wrap">
          <div className="eyebrow">{t.percentile}</div>
          <Radar profile={profile} lang={lang} />
        </div>
      </section>
      <div className="evidence-strip">
        <div>
          <span>{t.cohort}</span>
          <strong>
            {profile.cohort.size}{" "}
            <small>
              {t.peers} · ≥{profile.cohort.minimum_minutes} {t.min}
            </small>
          </strong>
        </div>
        <div title={t.coverageHelp}>
          <span>{t.coverage} ⓘ</span>
          <strong>
            {fmt(profile.evidence.data_coverage, lang, 0)}
            <small>%</small>
          </strong>
        </div>
        <div title={t.confidenceHelp}>
          <span>{t.confidence} ⓘ</span>
          <strong className="amber">
            {fmt(profile.evidence.confidence_score, lang, 0)}
            <small>/100</small>
          </strong>
        </div>
      </div>
      <div className="tabs" role="tablist" aria-label={t.profile}>
        {profileTabs.map((k) => (
          <button
            id={`tab-${k}`}
            key={k}
            role="tab"
            tabIndex={tab === k ? 0 : -1}
            aria-selected={tab === k}
            aria-controls="profile-content"
            className={tab === k ? "selected" : ""}
            onClick={() => setTab(k)}
            onKeyDown={(event) => {
              const current = profileTabs.indexOf(k);
              const next =
                event.key === "ArrowRight"
                  ? (current + 1) % profileTabs.length
                  : event.key === "ArrowLeft"
                    ? (current + profileTabs.length - 1) % profileTabs.length
                    : event.key === "Home"
                      ? 0
                      : event.key === "End"
                        ? profileTabs.length - 1
                        : null;
              if (next === null) return;
              event.preventDefault();
              setTab(profileTabs[next]);
              const tabs =
                event.currentTarget.parentElement?.querySelectorAll<HTMLButtonElement>(
                  '[role="tab"]',
                );
              tabs?.[next]?.focus();
            }}
          >
            {t[k]}
          </button>
        ))}
      </div>
      <div
        id="profile-content"
        role="tabpanel"
        tabIndex={0}
        aria-labelledby={`tab-${tab}`}
      >
        {tab === "profile" && (
          <>
            {!profile.cohort.eligible && (
              <p className="notice">{t.noBenchmark}</p>
            )}
            <p className="fine-print">{t.rankHelp}</p>
            <div className="metrics-grid">
              {families.map((family) => (
                <section className="metric-family" key={family}>
                  <div className="section-row">
                    <h3>{t[family]}</h3>
                    <span>{t.per90} / %</span>
                  </div>
                  {profile.metrics
                    .filter(
                      (m) =>
                        m.family === family &&
                        ![
                          "completed_passes_per90",
                          "non_penalty_goals_per90",
                          "passes_per90",
                          "carries_per90",
                        ].includes(m.key),
                    )
                    .map((m) => (
                      <div className="metric-row" key={m.key}>
                        <div className="metric-label">
                          <span>{m.names[lang]}</span>
                          <strong>
                            {fmt(m.value, lang, m.unit === "%" ? 1 : 2)}
                            {m.unit === "%" && m.value != null ? "%" : ""}
                          </strong>
                        </div>
                        <div className="bar-row">
                          <div className="percentile-track">
                            <span
                              style={{
                                width: `${m.favorable_percentile ?? 0}%`,
                              }}
                              className={
                                m.favorable_percentile != null &&
                                m.favorable_percentile >= 75
                                  ? "high"
                                  : ""
                              }
                            />
                            <i />
                          </div>
                          <b>
                            {m.favorable_percentile == null
                              ? "—"
                              : "P" + Math.round(m.favorable_percentile)}
                          </b>
                        </div>
                        <details className="metric-definition">
                          <summary>{t.formula}</summary>
                          <p>{metricHelp(m, lang)}</p>
                          <p>{metricDenominator(m, lang)}</p>
                          <p>
                            {m.cohort_observations} {t.peers} · {m.version}
                          </p>
                        </details>
                      </div>
                    ))}
                </section>
              ))}
            </div>
          </>
        )}
        {tab === "visuals" && (
          <VisualPanel
            id={id}
            datasetId={catalog.coverage.dataset_id}
            api={api}
            lang={lang}
            minutes={p.minutes}
          />
        )}
        {tab === "evidence" && (
          <div className="evidence-content">
            <p className="notice">{t.sampleWarning}</p>
            {profile.evidence.warnings.length > 0 && (
              <ul className="notice">
                {profile.evidence.warnings.map((warning) => (
                  <li key={warning}>{evidenceWarning(warning, lang)}</li>
                ))}
              </ul>
            )}
            <div className="signals-grid">
              {(["strengths", "review"] as const).map((kind, i) => (
                <section className="card" key={kind}>
                  <h3>{t[kind]}</h3>
                  {(i === 0
                    ? profile.evidence.strengths
                    : profile.evidence.review_areas
                  ).map((metric) => (
                    <div className="signal" key={metric}>
                      <span>{catalog.metric_catalog[metric]?.names[lang]}</span>
                      <b>
                        P
                        {Math.round(
                          profile.metrics.find((m) => m.key === metric)
                            ?.favorable_percentile ?? 0,
                        )}
                      </b>
                    </div>
                  ))}
                  {!(
                    i === 0
                      ? profile.evidence.strengths
                      : profile.evidence.review_areas
                  ).length && (
                    <p>
                      {profile.metrics.some(
                        (m) => m.favorable_percentile != null,
                      )
                        ? t.noSignals
                        : t.signalsUnavailable}
                    </p>
                  )}
                </section>
              ))}
            </div>
            <section className="card">
              <h3>{t.availability}</h3>
              <p>{t.coverageHelp}</p>
              <p>{t.confidenceHelp}</p>
              <p>
                {fmt(p.event_count, lang, 0)} {t.events.toLowerCase()} ·{" "}
                {p.starts} {t.starts.toLowerCase()}
              </p>
            </section>
            <section className="card">
              <h3>{t.position}</h3>
              <p>{t.positionNote}</p>
              {Object.entries(p.position_minutes)
                .sort((a, b) => b[1] - a[1])
                .map(([pos, minutes]) => (
                  <div className="signal" key={pos}>
                    <span>{positionName(pos, lang)}</span>
                    <b>
                      {fmt(minutes, lang, 1)} {t.min}
                    </b>
                  </div>
                ))}
            </section>
            <section className="card">
              <h3>{t.missing}</h3>
              <p>{t.missingText}</p>
            </section>
            <details className="lineage">
              <summary>{t.details}</summary>
              <dl>
                <dt>Dataset</dt>
                <dd>{profile.lineage.dataset_id}</dd>
                <dt>{t.revision}</dt>
                <dd>{profile.lineage.source_revision}</dd>
                <dt>{t.featureVersion}</dt>
                <dd>{profile.lineage.feature_version}</dd>
              </dl>
              <a
                href={profile.lineage.license_url}
                target="_blank"
                rel="noreferrer"
              >
                {t.sourceTerms} ↗
              </a>
            </details>
          </div>
        )}
        {tab === "similarity" && (
          <div className="similar-content">
            <p className="fine-print">{t.statistical}</p>
            <p className="fine-print">{t.similarityHelp}</p>
            <div className="club-controls replacement-controls">
              <label>
                <span>{t.otherTeams}</span>
                <input
                  type="checkbox"
                  checked={otherTeams}
                  onChange={(e) => setOtherTeams(e.target.checked)}
                />
              </label>
              <label>
                {t.candidateMinutes}
                <select
                  value={similarMinutes}
                  onChange={(e) => setSimilarMinutes(Number(e.target.value))}
                >
                  {[180, 270, 450].map((n) => (
                    <option key={n} value={n}>
                      ≥{n} {t.min}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                {t.confidence}
                <select
                  value={similarConfidence}
                  onChange={(e) => setSimilarConfidence(Number(e.target.value))}
                >
                  {[0, 25, 50, 75].map((n) => (
                    <option key={n} value={n}>
                      ≥{n}/100
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <p className="fine-print">{t.replacementHelp}</p>
            {similarError ? (
              <div role="alert" className="notice">
                {t.error}{" "}
                <button onClick={() => setAttempt((v) => v + 1)}>
                  {t.retry}
                </button>
              </div>
            ) : !similar ||
              similar.target !== id ||
              similar.dataset_id !== catalog.coverage.dataset_id ? (
              <p role="status">{t.loading}</p>
            ) : !replacementCandidates.length ? (
              <p className="notice">
                {similar.results.length ? t.empty : t.noSimilar}
              </p>
            ) : (
              replacementCandidates.slice(0, 12).map((r, i) => (
                <section className="similar-card" key={r.player_id}>
                  <button
                    className="similar-row"
                    onClick={() => onSelect(r.player_id)}
                  >
                    <span className="rank-number">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <span>
                      <strong>{r.player_name}</strong>
                      <small>
                        {teamName(
                          catalog.players.find(
                            (p) => p.player_id === r.player_id,
                          )?.team_name || "",
                          lang,
                        )}{" "}
                        · {r.comparable_metric_count} / {r.components.length}
                        {" · "}
                        {fmt(
                          catalog.scouting_index[r.player_id]?.confidence,
                          lang,
                          0,
                        )}
                        /100 {t.confidence}
                      </small>
                    </span>
                    <b>
                      {fmt(r.similarity, lang, 0)}
                      <small>/100</small>
                    </b>
                    <span>↗</span>
                  </button>
                  <details className="why">
                    <summary>{t.whySimilar}</summary>
                    <p>
                      <strong>{t.closest}: </strong>
                      {r.closest_dimensions
                        .map((k) => catalog.metric_catalog[k]?.names[lang] || k)
                        .join(" · ")}
                    </p>
                    <p>
                      <strong>{t.differences}: </strong>
                      {r.largest_differences
                        .map((k) => catalog.metric_catalog[k]?.names[lang] || k)
                        .join(" · ")}
                    </p>
                    <div className="table-scroll">
                      <table className="similar-table">
                        <thead>
                          <tr>
                            <th>{t.per90} / %</th>
                            <th>{t.target}</th>
                            <th>{t.candidate}</th>
                            <th>{t.referencePlayers}</th>
                            <th title={t.difference}>Δ / σ</th>
                            <th>{t.distanceShare}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {r.components.map((c) => (
                            <tr key={c.metric}>
                              <th>
                                {catalog.metric_catalog[c.metric]?.names[lang]}
                                {c.status !== "compared" && (
                                  <small className="fine-print">
                                    {c.status === "missing"
                                      ? t.similarityMissing
                                      : c.status === "constant_reference"
                                        ? t.similarityConstant
                                        : t.similaritySparse}
                                  </small>
                                )}
                              </th>
                              <td>{fmt(c.target_value, lang, 2)}</td>
                              <td>{fmt(c.candidate_value, lang, 2)}</td>
                              <td>{c.cohort_observations}</td>
                              <td>{fmt(c.standardized_difference, lang, 2)}</td>
                              <td>
                                {fmt(c.distance_share_pct, lang, 1)}
                                {c.distance_share_pct != null ? "%" : ""}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </details>
                </section>
              ))
            )}
          </div>
        )}
      </div>
    </article>
  );
}
