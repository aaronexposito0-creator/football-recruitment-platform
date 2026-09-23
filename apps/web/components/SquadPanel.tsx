"use client";
import { teamName } from "../lib/teams";
import { useMemo, useState } from "react";
import type { Catalog, Language } from "../lib/contracts";
import {
  defaultScenario,
  formations,
  parseScenario,
  squadDepth,
  type DepthScenario,
  type DepthStatus,
  type SquadMember,
} from "../lib/club";
import { useStoredState } from "../lib/useStoredState";
import { fmt, positionName, translations } from "../lib/i18n";

interface DepthBoardProps {
  players: SquadMember[];
  lang: Language;
  onSelect?: (id: string) => void;
  onSearch?: (position: string) => void;
}

export function DepthBoard({
  storageKey = null,
  ...props
}: DepthBoardProps & { storageKey?: string | null }) {
  const [scenario, setScenario, storage] = useStoredState(
    storageKey,
    defaultScenario,
    parseScenario,
  );
  return (
    <DepthPlan
      {...props}
      scenario={scenario}
      setScenario={setScenario}
      persistent={storageKey !== null}
      storageError={storage.storageError}
    />
  );
}

/** Shared board; the owner chooses device persistence or import-session memory. */
export function DepthPlan({
  players,
  lang,
  onSelect,
  onSearch,
  scenario,
  setScenario,
  persistent = false,
  storageError = false,
}: DepthBoardProps & {
  scenario: DepthScenario;
  setScenario: (next: DepthScenario) => void;
  persistent?: boolean;
  storageError?: boolean;
}) {
  const t = translations[lang];
  const depthLabels: Record<DepthStatus, string> = {
    counted: "",
    absent: t.depthAbsent,
    missingIdentity: t.depthMissingIdentity,
    duplicateIdentity: t.depthDuplicateIdentity,
    missingMinutes: t.depthMissingMinutes,
    belowMinutes: t.depthBelowMinutes,
  };
  const { shape, targets, minimum, absent, assignments } = scenario;
  const plannedPlayers = players.map((p) => ({
    ...p,
    position_group: assignments[p.player_id] || p.position_group,
  }));
  const groups = squadDepth(plannedPlayers, targets, minimum, absent);
  return (
    <section className="depth-board">
      <div className="section-row">
        <h3>{t.depth}</h3>
        <span className="tag">{t.scenario}</span>
      </div>
      <p className="muted">{t.depthHelp}</p>
      {persistent && <p className="muted">{t.savedScenarioHelp}</p>}
      {storageError && (
        <p className="notice" role="alert">
          {t.storageError}
        </p>
      )}
      <div className="club-controls">
        <label>
          {t.formation}
          <select
            value={shape}
            onChange={(e) => {
              setScenario({
                ...scenario,
                shape: e.target.value,
                targets: { ...formations[e.target.value] },
              });
            }}
          >
            {Object.keys(formations).map((v) => (
              <option key={v}>{v}</option>
            ))}
          </select>
        </label>
        <label>
          {t.minimum}
          <select
            value={minimum}
            onChange={(e) =>
              setScenario({ ...scenario, minimum: Number(e.target.value) })
            }
          >
            {[0, 90, 180, 270, 450].map((v) => (
              <option key={v} value={v}>
                ≥{v} {t.min}
              </option>
            ))}
          </select>
        </label>
        <label>
          {t.simulatedAbsence}
          <select
            value={absent}
            onChange={(e) =>
              setScenario({ ...scenario, absent: e.target.value })
            }
          >
            <option value="">{t.none}</option>
            {players.map((p) => (
              <option key={p.player_id} value={p.player_id}>
                {p.player_name || t.unnamed}
              </option>
            ))}
          </select>
        </label>
      </div>
      <details className="scenario-assignments">
        <summary>{t.assignPositions}</summary>
        <p className="muted">{t.assignmentHelp}</p>
        <div className="mapping-grid">
          {players.map((p) => (
            <label key={p.player_id}>
              {p.player_name || t.unnamed} · {p.position_group}
              <select
                value={assignments[p.player_id] || p.position_group}
                onChange={(e) =>
                  setScenario({
                    ...scenario,
                    assignments: {
                      ...assignments,
                      [p.player_id]: e.target.value,
                    },
                  })
                }
              >
                {[...Object.keys(targets), "UNK"].map((v) => (
                  <option key={v} value={v}>
                    {positionName(v, lang)}
                  </option>
                ))}
              </select>
            </label>
          ))}
        </div>
        <button onClick={() => setScenario({ ...scenario, assignments: {} })}>
          {t.resetAssignments}
        </button>
      </details>
      <div className="depth-grid">
        {groups.map((group) => (
          <article
            className={`depth-card ${group.gap ? "has-gap" : ""}`}
            key={group.position}
          >
            <header>
              <strong>{group.position}</strong>
              <span>{positionName(group.position, lang)}</span>
              <label>
                {t.targetDepth}
                <input
                  type="number"
                  aria-label={`${t.targetDepth} · ${positionName(group.position, lang)}`}
                  min={0}
                  max={10}
                  value={targets[group.position]}
                  onChange={(e) =>
                    setScenario({
                      ...scenario,
                      targets: {
                        ...targets,
                        [group.position]: Math.max(
                          0,
                          Math.min(10, Math.round(Number(e.target.value) || 0)),
                        ),
                      },
                    })
                  }
                />
              </label>
            </header>
            <div className="depth-summary">
              <b>
                {group.available.length}
                <small> / {group.target}</small>
              </b>
              <span>
                {group.gap ? `${group.gap} · ${t.coverageGap}` : t.targetMet}
              </span>
            </div>
            <div className="depth-players">
              {group.roster.map((p) => (
                <div
                  className={
                    group.statuses[p.player_id] !== "counted"
                      ? "scenario-excluded"
                      : ""
                  }
                  key={p.player_id}
                >
                  {onSelect ? (
                    <button onClick={() => onSelect(p.player_id)}>
                      {p.player_name || t.unnamed}
                    </button>
                  ) : (
                    <span>{p.player_name || t.unnamed}</span>
                  )}
                  <div className="depth-evidence">
                    <small>
                      {fmt(
                        p.minutes,
                        lang,
                        p.minutes != null && p.minutes < 10 ? 2 : 0,
                      )}{" "}
                      {t.min}
                    </small>
                    {group.statuses[p.player_id] !== "counted" && (
                      <span className="depth-reason">
                        {depthLabels[group.statuses[p.player_id]]}
                      </span>
                    )}
                  </div>
                </div>
              ))}
              {!group.roster.length && <p>{t.noObservedPlayers}</p>}
            </div>
            {onSearch && group.position !== "GK" && (
              <button
                className="text-button"
                onClick={() => onSearch(group.position)}
              >
                {t.explorePosition} ↗
              </button>
            )}
          </article>
        ))}
      </div>
      {!!plannedPlayers.filter(
        (p) => !Object.keys(targets).includes(p.position_group),
      ).length && <p className="notice">{t.unknownPositionHelp}</p>}
      <button
        onClick={() =>
          setScenario({
            ...defaultScenario,
            targets: { ...defaultScenario.targets },
            assignments: {},
          })
        }
      >
        {t.resetScenario}
      </button>
    </section>
  );
}

export function SquadPanel({
  catalog,
  lang,
  onSelect,
  onSearch,
}: {
  catalog: Catalog;
  lang: Language;
  onSelect: (id: string) => void;
  onSearch: (position: string) => void;
}) {
  const t = translations[lang];
  const teams = useMemo(
    () =>
      [...new Set(catalog.players.map((p) => p.team_name))].sort((a, b) =>
        teamName(a, lang).localeCompare(teamName(b, lang), lang),
      ),
    [catalog, lang],
  );
  const [team, setTeam] = useState(
    teams.includes("Spain") ? "Spain" : teams[0],
  );
  const players = catalog.players.filter((p) => p.team_name === team);
  const minutes = players.reduce((a, p) => a + p.minutes, 0);
  const signals = Object.keys(formations["4-3-3"])
    .filter((pos) => pos !== "GK")
    .flatMap((pos) => {
      const peers = players.filter(
        (p) =>
          p.position_group === pos &&
          catalog.scouting_index[p.player_id]?.eligible,
      );
      if (peers.length < 2) return [];
      return [
        "npxg_per90",
        "xa_per90",
        "progressive_passes_per90",
        "progressive_carries_per90",
      ].flatMap((metric) => {
        const values = peers
          .map((p) => catalog.scouting_index[p.player_id].percentiles[metric])
          .filter((v): v is number => v != null);
        return values.length === peers.length && values.every((v) => v <= 25)
          ? [{ pos, metric, count: values.length }]
          : [];
      });
    });
  return (
    <div className="club-panel">
      <section className="card squad-intro">
        <div>
          <span className="eyebrow">{t.squadLens}</span>
          <h2>{teamName(team, lang)}</h2>
          <p>{t.squadScope}</p>
        </div>
        <label>
          {t.team}
          <select value={team} onChange={(e) => setTeam(e.target.value)}>
            {teams.map((v) => (
              <option key={v} value={v}>
                {teamName(v, lang)}
              </option>
            ))}
          </select>
        </label>
      </section>
      <div className="data-kpis">
        {[
          [t.observedPlayers, players.length],
          [t.minutes, fmt(minutes, lang, 0)],
          [
            t.benchmarkPlayerCount,
            players.filter((p) => catalog.scouting_index[p.player_id]?.eligible)
              .length,
          ],
          [t.matches, new Set(players.flatMap((p) => p.match_ids)).size],
        ].map(([label, value]) => (
          <div className="card" key={label}>
            <strong>{value}</strong>
            <span>{label}</span>
          </div>
        ))}
      </div>
      <DepthBoard
        key={catalog.coverage.dataset_id + team}
        storageKey={`frp-squad-v1:${catalog.coverage.dataset_id}:${team}`}
        players={players.map((p) => ({ ...p, player_name: p.display_name }))}
        lang={lang}
        onSelect={onSelect}
        onSearch={onSearch}
      />
      <section className="card">
        <h3>{t.squadReview}</h3>
        <p>{t.squadReviewHelp}</p>
        {signals.length ? (
          <ul>
            {signals.map((s) => (
              <li key={s.pos + s.metric}>
                {positionName(s.pos, lang)} ·{" "}
                {catalog.metric_catalog[s.metric].names[lang]} · {s.count}{" "}
                {t.playersBelow25}
              </li>
            ))}
          </ul>
        ) : (
          <p className="muted">{t.noCommonSignal}</p>
        )}
      </section>
    </div>
  );
}
