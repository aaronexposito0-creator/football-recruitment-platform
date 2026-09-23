"use client";
import { useEffect, useMemo, useReducer, useRef, useState } from "react";
import type { Catalog, Language } from "../lib/contracts";
import {
  defaultScenario,
  emptyImportPlans,
  importPlanReducer,
  mappingTextIssues,
  type ClubAnalysis,
  type ImportPreview,
} from "../lib/club";
import { fmt, translations } from "../lib/i18n";
import { DepthPlan } from "./SquadPanel";
import { fieldName as mappedFieldName, importIssue } from "../lib/explanations";
import { validateImportPreview, validateClubAnalysis } from "../lib/validation";
import { csvText } from "../lib/export";

export function MyClubPanel({
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
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [analysis, setAnalysis] = useState<ClubAnalysis | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [decimal, setDecimal] = useState(".");
  const [label, setLabel] = useState("My Club");
  const [metric, setMetric] = useState("shots_per90");
  const [team, setTeam] = useState("");
  const [plans, changePlan] = useReducer(importPlanReducer, emptyImportPlans);
  const requestRef = useRef<AbortController | null>(null);
  const mappingIssues = useMemo(
    () => (preview ? mappingTextIssues(preview, mapping) : []),
    [preview, mapping],
  );
  useEffect(() => () => requestRef.current?.abort(), []);
  const fieldName = (key: string) => mappedFieldName(key, catalog, lang);
  async function request<T>(
    path: string,
    body: BodyInit,
    contentType: string,
  ): Promise<T> {
    requestRef.current?.abort();
    const controller = new AbortController();
    requestRef.current = controller;
    const response = await fetch(`/api/football/my-club/${path}`, {
      method: "POST",
      body,
      headers: { "Content-Type": contentType },
      signal: AbortSignal.any([controller.signal, AbortSignal.timeout(20000)]),
    });
    const result = await response.json();
    controller.signal.throwIfAborted();
    if (!response.ok)
      throw new Error(
        typeof result.detail === "string" ? result.detail : t.importInvalid,
      );
    return result;
  }
  async function upload(file: File) {
    setError("");
    setBusy(true);
    setAnalysis(null);
    setPreview(null);
    try {
      if (file.size > 3 * 1024 * 1024 || !/\.(csv|xlsx)$/i.test(file.name))
        throw new Error(t.uploadLimit);
      const data = await request<ImportPreview>(
        `preview?filename=${encodeURIComponent(file.name)}`,
        file,
        "application/octet-stream",
      );
      validateImportPreview(data, catalog);
      setPreview(data);
      setMapping(data.suggested_mapping);
    } catch (err) {
      if (!requestRef.current?.signal.aborted)
        setError(err instanceof Error ? err.message : t.error);
    } finally {
      setBusy(false);
    }
  }
  async function analyse() {
    if (!preview || mappingIssues.length) return;
    setBusy(true);
    setError("");
    setAnalysis(null);
    try {
      const data = await request<ClubAnalysis>(
        "analyze",
        JSON.stringify({
          headers: preview.headers,
          rows: preview.rows,
          source_rows: preview.source_rows,
          mapping: Object.fromEntries(
            Object.entries(mapping).filter(([, v]) => v),
          ),
          decimal,
          label,
        }),
        "application/json",
      );
      if (data.reference_dataset_id !== catalog.coverage.dataset_id)
        throw new Error(t.datasetChanged);
      validateClubAnalysis(data, catalog);
      setAnalysis(data);
      changePlan({ type: "reset", importId: data.import_id });
      setTeam(data.players[0]?.team_name || "");
    } catch (err) {
      if (!requestRef.current?.signal.aborted)
        setError(err instanceof Error ? err.message : t.error);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="club-panel">
      <section className="card import-intro">
        <span className="eyebrow">{t.ownData}</span>
        <h2>{t.myClub}</h2>
        <p>{t.importIntro}</p>
        <p className="muted">{t.importStorage}</p>
        {!api && <p className="notice">{t.importNeedsAPI}</p>}
        <div className="club-controls">
          <label>
            {t.clubLabel}
            <input
              value={label}
              maxLength={100}
              disabled={busy}
              onChange={(e) => {
                setLabel(e.target.value);
                setAnalysis(null);
                setError("");
              }}
            />
          </label>
          <label>
            {t.uploadFile}
            <input
              type="file"
              accept=".csv,.xlsx"
              disabled={!api || busy}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void upload(file);
                e.target.value = "";
              }}
            />
          </label>
          <label>
            {t.decimalConvention}
            <select
              value={decimal}
              disabled={busy}
              onChange={(e) => {
                setDecimal(e.target.value);
                setAnalysis(null);
                setError("");
              }}
            >
              <option value=".">1234.5</option>
              <option value=",">1234,5</option>
            </select>
          </label>
        </div>
        <p className="muted">
          {t.uploadLimit} · {t.decimalHelp}
        </p>
        <a href="/templates/club_import_blank.csv" download>
          {t.blankTemplate} ↓
        </a>
        <div className="demo-import">
          <button
            disabled={!api || busy}
            onClick={() => {
              setLabel("Spain · Euro 2024");
              setDecimal(".");
              void upload(
                new File(
                  [
                    csvText(
                      catalog.players.filter((p) => p.team_name === "Spain"),
                      catalog,
                    ),
                  ],
                  "spain-euro-2024.csv",
                  { type: "text/csv" },
                ),
              );
            }}
          >
            {t.tryClubDemo}
          </button>
          <p className="muted">{t.clubDemoHelp}</p>
        </div>
      </section>
      {busy && (
        <div className="state" role="status">
          <span className="loader" />
          {t.processingImport}
        </div>
      )}
      {error && (
        <div className="notice" role="alert">
          <strong>{t.importError}</strong>
          <p>{t.importInvalid}</p>
          <details>
            <summary>{t.importTechnicalDetails}</summary>
            <p>{error}</p>
          </details>
          {preview && (
            <button disabled={busy || !!mappingIssues.length} onClick={analyse}>
              {t.retry}
            </button>
          )}
        </div>
      )}
      {preview && (
        <section className="card">
          <div className="section-row">
            <h3>{t.mapping}</h3>
            <span className="tag">
              {preview.row_count} {t.rows}
            </span>
          </div>
          <p>{t.mappingHelp}</p>
          <p className="muted">{t.importNotesHelp}</p>
          {!!mappingIssues.length && (
            <div className="notice" role="alert">
              <p>{t.importLongMapped}</p>
              <ul>
                {mappingIssues.map((issue) => (
                  <li key={issue.field}>
                    {fieldName(issue.field)} ← {issue.column} · {t.sourceRow}{" "}
                    {issue.sourceRow}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {preview.warnings.map((w) => (
            <p key={w} className="notice">
              {w.includes("formula")
                ? t.importFormulaWarning
                : t.importSheetWarning}
            </p>
          ))}
          <div className="mapping-grid">
            {preview.fields.map((field) => (
              <label key={field}>
                {fieldName(field)}
                {field === "player_name" ? " *" : ""}
                <select
                  value={mapping[field] || ""}
                  disabled={busy}
                  onChange={(e) => {
                    setMapping({ ...mapping, [field]: e.target.value });
                    setAnalysis(null);
                    setError("");
                  }}
                >
                  <option value="">{t.notMapped}</option>
                  {preview.headers.map((h) => (
                    <option
                      key={h}
                      disabled={Object.entries(mapping).some(
                        ([k, v]) => k !== field && v === h,
                      )}
                    >
                      {h}
                    </option>
                  ))}
                </select>
              </label>
            ))}
          </div>
          <details>
            <summary>{t.previewRows}</summary>
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>{t.sourceRow}</th>
                    {preview.headers.map((h) => (
                      <th key={h}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {preview.rows.slice(0, 8).map((r, i) => (
                    <tr key={i}>
                      <th>{preview.source_rows[i]}</th>
                      {r.map((v, j) => (
                        <td key={j}>{v ?? "—"}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </details>
          <button
            className="primary"
            disabled={
              busy ||
              !mapping.player_name ||
              !label.trim() ||
              !!mappingIssues.length
            }
            onClick={analyse}
          >
            {t.analyseClub} →
          </button>
        </section>
      )}
      {analysis && (
        <>
          <div className="data-kpis">
            {[
              [t.dataQuality, `${fmt(analysis.data_quality, lang, 0)}%`],
              [t.coverage, `${fmt(analysis.data_coverage, lang, 0)}%`],
              [t.observedPlayers, analysis.players.length],
              [t.rowsWithIssues, analysis.rows_with_issues],
            ].map(([key, value]) => (
              <div className="card" key={key}>
                <strong>{value}</strong>
                <span>{key}</span>
              </div>
            ))}
          </div>
          <section className="card">
            <h3>
              {analysis.label} · {t.importResults}
            </h3>
            <p>{t.importQualityHelp}</p>
            <p className="micro">
              {t.dataQuality}: {fmt(analysis.quality_checks.passed, lang, 0)} /{" "}
              {fmt(analysis.quality_checks.total, lang, 0)}{" "}
              {t.importPassedChecks} = {fmt(analysis.data_quality, lang, 1)}%.
            </p>
            <p className="notice">{t.importComparisonGate}</p>
            <div className="club-controls">
              <label>
                {t.team}
                <select value={team} onChange={(e) => setTeam(e.target.value)}>
                  {[...new Set(analysis.players.map((p) => p.team_name))].map(
                    (v) => (
                      <option key={v}>{v}</option>
                    ),
                  )}
                </select>
              </label>
              <label>
                {t.metric}
                <select
                  value={metric}
                  onChange={(e) => setMetric(e.target.value)}
                >
                  {Object.values(catalog.metric_catalog).map((m) => (
                    <option key={m.key} value={m.key}>
                      {m.names[lang]} · {m.unit === "%" ? "%" : "/90"}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>{t.sourceRow}</th>
                    <th>{t.name}</th>
                    <th>{t.position}</th>
                    <th>{t.minutes}</th>
                    <th>{t.coverage}</th>
                    <th>{t.confidence}</th>
                    <th>
                      {catalog.metric_catalog[metric].names[lang]}{" "}
                      {metric === "pass_completion" ? "%" : "/90"}
                    </th>
                    <th>{t.percentile}</th>
                    <th>{t.importRowChecks}</th>
                  </tr>
                </thead>
                <tbody>
                  {analysis.players
                    .filter((p) => p.team_name === team)
                    .map((p) => (
                      <tr key={p.player_id}>
                        <td>{p.source_row}</td>
                        <th>
                          {p.player_name || `${t.unnamed} · ${p.source_row}`}
                        </th>
                        <td>{p.position_group}</td>
                        <td>{fmt(p.minutes, lang, 1)}</td>
                        <td>{fmt(p.data_coverage, lang, 0)}%</td>
                        <td>{fmt(p.confidence, lang, 0)}</td>
                        <td>{fmt(p.metrics[metric], lang, 2)}</td>
                        <td>
                          {p.benchmark ? (
                            <button
                              onClick={() =>
                                onSelect(p.benchmark!.reference_player_id)
                              }
                              title={p.benchmark.reference_name}
                            >
                              {p.benchmark.percentiles[metric] != null
                                ? `P${fmt(p.benchmark.percentiles[metric], lang, 0)}`
                                : "—"}{" "}
                              ↗
                            </button>
                          ) : (
                            "—"
                          )}
                        </td>
                        <td>
                          {p.issues.length ? (
                            <details>
                              <summary>
                                {p.issues.length} {t.issues}
                              </summary>
                              <ul>
                                {p.issues.map((v) => (
                                  <li key={v}>
                                    {importIssue(v, catalog, lang)}
                                  </li>
                                ))}
                              </ul>
                            </details>
                          ) : (
                            "✓"
                          )}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </section>
          <p className="muted">{t.importPlansHelp}</p>
          <DepthPlan
            key={analysis.import_id + team}
            players={analysis.players.filter((p) => p.team_name === team)}
            lang={lang}
            scenario={
              plans.importId === analysis.import_id
                ? plans.teams.get(team) || defaultScenario
                : defaultScenario
            }
            setScenario={(scenario) =>
              changePlan({
                type: "edit",
                importId: analysis.import_id,
                team,
                scenario,
              })
            }
          />
          <p className="muted">
            Import: {analysis.import_id} · {t.importStorage}
          </p>
        </>
      )}
    </div>
  );
}
