"use client";

import { useDeferredValue, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import type { Catalog, Language, Mode, Persona } from "../lib/contracts";
import { loadCatalog } from "../lib/api";
import { teamName, matchesPlayerSearch } from "../lib/teams";
import {
  fmt,
  personas,
  positions,
  positionName,
  translations,
} from "../lib/i18n";
import { AnalysisDownload } from "./AnalysisDownload";
import {
  workspaceModes as modes,
  navigationURL,
  readNavigation,
  type ExplorerState,
  type NavigationState,
} from "../lib/navigation";
import { PlayerPanel } from "./PlayerPanel";
import { RecruitmentPanel } from "./RecruitmentPanel";
import { Comparison } from "./Comparison";
import { AdvancedSearch } from "./AdvancedSearch";
import { initialAdvanced, passesAdvanced } from "../lib/scouting";
import { DataPanel } from "./DataPanel";
import { SquadPanel } from "./SquadPanel";
import { MyClubPanel } from "./MyClubPanel";
import { ScoutingNotebook } from "./ScoutingNotebook";
import { useStoredState } from "../lib/useStoredState";
import {
  defaultPreferences,
  parsePlayerIds,
  parsePreferences,
} from "../lib/storage";
import {
  parseNotes,
  shortlistStatuses,
  type ScoutingNotes,
} from "../lib/shortlist";

const defaultExplorer: ExplorerState = {
  query: "",
  position: "",
  team: "",
  minimum: 180,
  advanced: initialAdvanced,
  watchStatus: "",
};
const navigationGlyph: Record<Mode, string> = {
  players: "01",
  recruitment: "02",
  compare: "03",
  shortlist: "04",
  squad: "05",
  myClub: "06",
  data: "07",
};

export function Workspace() {
  const [catalog, setCatalog] = useState<Catalog | null>(null);
  const [api, setApi] = useState(false);
  const [error, setError] = useState(false);
  const [connecting, setConnecting] = useState(true);
  const [reload, setReload] = useState(0);
  const [preferences, setPreferences, prefStorage] = useStoredState(
    "frp-preferences-v2",
    defaultPreferences,
    parsePreferences,
  );
  const { lang, theme, persona } = preferences;
  const [mode, setMode] = useState<Mode>("players");
  const [selected, setSelected] = useState("");
  const [missingPlayer, setMissingPlayer] = useState(false);
  const [navigationDataset, setNavigationDataset] = useState("");
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query);
  const searchPending = query !== deferredQuery;
  const [position, setPosition] = useState("");
  const [team, setTeam] = useState("");
  const [minimum, setMinimum] = useState(180);
  const [advanced, setAdvanced] = useState({ ...initialAdvanced });
  const [shortlist, setShortlist, shortlistStorage] = useStoredState<string[]>(
    "frp-shortlist-v2",
    [],
    parsePlayerIds,
  );
  const [notes, setNotes, noteStorage] = useStoredState<ScoutingNotes>(
    "frp-scout-notes-v1",
    {},
    parseNotes,
  );
  const [watchStatus, setWatchStatus] = useState("");
  const [compared, setCompared, comparisonStorage] = useStoredState<string[]>(
    "frp-comparison-v1",
    [],
    (raw) => parsePlayerIds(raw).slice(0, 3),
  );
  const [message, setMessage] = useState("");
  const t = translations[lang];

  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dataset.theme = theme;
  }, [lang, theme]);
  useEffect(() => {
    let cancelled = false;
    setError(false);
    setConnecting(true);
    loadCatalog()
      .then(({ catalog, api }) => {
        if (cancelled) return;
        setCatalog(catalog);
        setApi(api);
      })
      .catch(() => {
        if (!cancelled) setError(true);
      })
      .finally(() => {
        if (!cancelled) setConnecting(false);
      });
    return () => {
      cancelled = true;
    };
  }, [reload]);
  function currentNavigation(): NavigationState {
    return {
      version: 1,
      datasetId: catalog?.coverage.dataset_id || "",
      mode,
      playerId: selected,
      filters: { query, position, team, minimum, advanced, watchStatus },
    };
  }
  function applyNavigation(next: NavigationState, data: Catalog) {
    setMode(next.mode);
    const player = next.playerId
      ? data.players.find((p) => p.player_id === next.playerId)
      : data.players.find((p) => p.display_name === "Lamine Yamal") ||
        data.players[0];
    setSelected(player?.player_id || "");
    setMissingPlayer(Boolean(next.playerId && !player));
    setQuery(next.filters.query);
    setPosition(next.filters.position);
    setTeam(next.filters.team);
    setMinimum(next.filters.minimum);
    setAdvanced(next.filters.advanced);
    setWatchStatus(next.filters.watchStatus);
  }
  useEffect(() => {
    if (!catalog) return;
    const restore = () => {
      const next = readNavigation(
        window.location.search,
        window.history.state?.frp,
        catalog.coverage.dataset_id,
        defaultExplorer,
        Object.keys(catalog.metric_catalog),
        [...new Set(catalog.players.map((p) => p.team_name))],
      );
      applyNavigation(next, catalog);
      setNavigationDataset(catalog.coverage.dataset_id);
    };
    restore();
    window.addEventListener("popstate", restore);
    return () => window.removeEventListener("popstate", restore);
  }, [catalog]);
  useEffect(() => {
    if (
      !catalog ||
      navigationDataset !== catalog.coverage.dataset_id ||
      missingPlayer
    )
      return;
    const current = currentNavigation();
    window.history.replaceState(
      { ...window.history.state, frp: current },
      "",
      navigationURL(mode, selected),
    );
  }, [
    catalog,
    navigationDataset,
    mode,
    selected,
    missingPlayer,
    query,
    position,
    team,
    minimum,
    advanced,
    watchStatus,
  ]);
  function pushNavigation(next: NavigationState) {
    if (!catalog) return;
    if (!missingPlayer)
      window.history.replaceState(
        { ...window.history.state, frp: currentNavigation() },
        "",
        navigationURL(mode, selected),
      );
    if (next.mode !== mode || next.playerId !== selected || missingPlayer)
      window.history.pushState(
        { ...window.history.state, frp: next },
        "",
        navigationURL(next.mode, next.playerId),
      );
    applyNavigation(next, catalog);
    window.scrollTo({ top: 0 });
  }
  useEffect(() => {
    if (message) {
      const timer = setTimeout(() => setMessage(""), 4500);
      return () => clearTimeout(timer);
    }
  }, [message]);
  const teams = useMemo(
    () =>
      [...new Set(catalog?.players.map((p) => p.team_name) || [])].sort(
        (a, b) => teamName(a, lang).localeCompare(teamName(b, lang), lang),
      ),
    [catalog, lang],
  );
  const visible = useMemo(
    () =>
      (catalog?.players || [])
        .filter(
          (p) =>
            (mode !== "shortlist" || shortlist.includes(p.player_id)) &&
            (mode !== "shortlist" ||
              !watchStatus ||
              (notes[p.player_id]?.status || "watch") === watchStatus) &&
            passesAdvanced(catalog?.scouting_index?.[p.player_id], advanced) &&
            p.minutes >= minimum &&
            (!position || p.position_group === position) &&
            (!team || p.team_name === team) &&
            matchesPlayerSearch(p, deferredQuery),
        )
        .sort((a, b) =>
          advanced.sortBy === "name"
            ? a.display_name.localeCompare(b.display_name)
            : advanced.sortBy === "confidence"
              ? (catalog?.scouting_index?.[b.player_id]?.confidence || 0) -
                  (catalog?.scouting_index?.[a.player_id]?.confidence || 0) ||
                a.player_id.localeCompare(b.player_id)
              : b.minutes - a.minutes || a.player_id.localeCompare(b.player_id),
        ),
    [
      catalog,
      shortlist,
      mode,
      minimum,
      position,
      team,
      deferredQuery,
      advanced,
      notes,
      watchStatus,
    ],
  );
  const savedPlayers = useMemo(
    () => catalog?.players.filter((p) => shortlist.includes(p.player_id)) || [],
    [catalog, shortlist],
  );
  function selectPlayer(id: string) {
    pushNavigation({ ...currentNavigation(), mode: "players", playerId: id });
  }
  function toggleSave() {
    setShortlist((values) =>
      values.includes(selected)
        ? values.filter((v) => v !== selected)
        : [...values, selected],
    );
  }
  function toggleCompare() {
    if (compared.includes(selected))
      setCompared((ids) => ids.filter((id) => id !== selected));
    else if (compared.length < 3) setCompared((ids) => [...ids, selected]);
    else setMessage(t.compareLimit);
  }
  function navigate(next: Mode) {
    const target = { ...currentNavigation(), mode: next };
    if (next === "shortlist") {
      target.filters = {
        ...defaultExplorer,
        minimum: 0,
        advanced: { ...initialAdvanced },
      };
      if (!shortlist.includes(selected) && savedPlayers[0])
        target.playerId = savedPlayers[0].player_id;
    }
    pushNavigation(target);
  }
  function resetSearch() {
    setQuery("");
    setPosition("");
    setTeam("");
    setMinimum(mode === "shortlist" ? 0 : 180);
    setAdvanced({ ...initialAdvanced });
    setWatchStatus("");
  }
  function changePersona(value: Persona) {
    setPreferences((p) => ({ ...p, persona: value }));
    navigate(
      value === "sporting_director"
        ? "recruitment"
        : value === "coach"
          ? "squad"
          : value === "analyst"
            ? "data"
            : "players",
    );
  }
  return (
    <div className="shell">
      <a className="skip-link" href="#main-content">
        {t.skipContent}
      </a>
      <aside className="sidebar">
        <Link
          className="brand"
          href="/"
          aria-label="Football Recruitment Platform"
          onClick={(event) => {
            if (
              event.metaKey ||
              event.ctrlKey ||
              event.shiftKey ||
              event.altKey
            )
              return;
            event.preventDefault();
            navigate("players");
          }}
        >
          <span className="brand-mark">
            FR<span>↗</span>
          </span>
          <span>
            FOOTBALL
            <br />
            <b>RECRUITMENT</b>
          </span>
        </Link>
        <div className="workspace-label">{personas[persona][lang]}</div>
        <nav aria-label={t.persona}>
          {modes.map((k) => (
            <button
              key={k}
              className={mode === k ? "active" : ""}
              onClick={() => navigate(k)}
              aria-current={mode === k ? "page" : undefined}
            >
              <span className="nav-index">{navigationGlyph[k]}</span>
              {t[k]}
              {k === "shortlist" && !!shortlist.length && (
                <b className="nav-count">{shortlist.length}</b>
              )}
              {k === "compare" && !!compared.length && (
                <b className="nav-count">{compared.length}</b>
              )}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <span className="version">V0.2 · OPEN FOOTBALL</span>
          <p>
            {t.author}
            <br />
            <strong>Aarón Expósito</strong>
          </p>
          <div className="author-links">
            <a
              href="https://www.linkedin.com/in/aaronexpositomonar"
              target="_blank"
              rel="noreferrer"
            >
              LinkedIn ↗
            </a>
            <a
              href="https://github.com/aaronexposito0-creator"
              target="_blank"
              rel="noreferrer"
            >
              GitHub ↗
            </a>
            <a
              href="https://www.instagram.com/aaron__ex/"
              target="_blank"
              rel="noreferrer"
            >
              @aaron__ex ↗
            </a>
          </div>
        </div>
      </aside>
      <div className="workspace-main">
        <header className="topbar">
          <div>
            <span className="eyebrow">{t.research}</span>
            <h1>{t[mode]}</h1>
          </div>
          <div className="preferences">
            <label className="sr-only" htmlFor="persona">
              {t.persona}
            </label>
            <select
              id="persona"
              value={persona}
              onChange={(e) => changePersona(e.target.value as Persona)}
            >
              {Object.entries(personas).map(([key, label]) => (
                <option key={key} value={key}>
                  {label[lang]}
                </option>
              ))}
            </select>
            <label className="sr-only" htmlFor="language">
              {t.language}
            </label>
            <select
              id="language"
              value={lang}
              onChange={(e) =>
                setPreferences((p) => ({
                  ...p,
                  lang: e.target.value as Language,
                }))
              }
            >
              <option value="en">EN</option>
              <option value="es">ES</option>
              <option value="fr">FR</option>
            </select>
            <label className="sr-only" htmlFor="theme">
              {t.theme}
            </label>
            <select
              id="theme"
              value={theme}
              onChange={(e) =>
                setPreferences((p) => ({ ...p, theme: e.target.value }))
              }
            >
              <option value="green">{t.green}</option>
              <option value="dark">{t.dark}</option>
              <option value="light">{t.light}</option>
            </select>
          </div>
        </header>
        <main id="main-content" tabIndex={-1}>
          {missingPlayer && (
            <p className="notice" role="alert">
              {t.playerMissing}{" "}
              <button
                onClick={() => {
                  const first = catalog?.players[0];
                  if (first) selectPlayer(first.player_id);
                }}
              >
                {t.findPlayers}
              </button>
            </p>
          )}
          {error && catalog && (
            <p className="notice" role="alert">
              {t.reconnectFailed}
            </p>
          )}
          {catalog &&
            mode === "shortlist" &&
            shortlist.length > savedPlayers.length && (
              <p className="notice" role="status">
                {shortlist.length - savedPlayers.length} {t.savedOutsideDataset}
              </p>
            )}
          {[prefStorage, shortlistStorage, noteStorage, comparisonStorage].some(
            (s) => s.storageError,
          ) && (
            <p className="notice" role="alert">
              {t.storageError}
            </p>
          )}
          {catalog && (
            <div className="dataset-bar">
              <div>
                <strong>
                  {catalog.coverage.competition} {catalog.coverage.season}
                </strong>
                <span>{t.historical}</span>
              </div>
              <div>
                <span className="coverage-badge">
                  {catalog.coverage.matches_ingested}/
                  {catalog.coverage.matches_available} {t.matches.toLowerCase()}
                </span>
                <button
                  className="data-mode"
                  title={t.snapshotHelp}
                  disabled={connecting}
                  aria-busy={connecting}
                  onClick={() => setReload((n) => n + 1)}
                >
                  {connecting ? t.reconnecting : api ? t.api : t.snapshot} ⟳
                </button>
              </div>
            </div>
          )}
          {error && !catalog ? (
            <div className="state" role="alert">
              <p>{t.error}</p>
              <button onClick={() => setReload((n) => n + 1)}>{t.retry}</button>
            </div>
          ) : !catalog ? (
            <div className="state" role="status">
              <span className="loader" />
              {t.loading}
            </div>
          ) : (
            <>
              {(mode === "players" || mode === "shortlist") && (
                <>
                  {mode === "shortlist" && (
                    <div className="shortlist-toolbar">
                      <p>{t.localOnly}</p>
                      <label>
                        {t.filterReviewStatus}
                        <select
                          value={watchStatus}
                          onChange={(e) => setWatchStatus(e.target.value)}
                        >
                          <option value="">{t.allStatuses}</option>
                          {shortlistStatuses.map((status) => (
                            <option key={status} value={status}>
                              {t[status === "review" ? "reviewVideo" : status]}
                            </option>
                          ))}
                        </select>
                      </label>
                      <AnalysisDownload
                        players={savedPlayers}
                        catalog={catalog}
                        notes={notes}
                        lang={lang}
                      />
                    </div>
                  )}
                  <div className="filters">
                    <label className="search-field">
                      <span className="sr-only">{t.search}</span>
                      <span aria-hidden="true">⌕</span>
                      <input
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder={t.search}
                      />
                    </label>
                    <label>
                      {t.position}
                      <select
                        value={position}
                        onChange={(e) => setPosition(e.target.value)}
                      >
                        <option value="">{t.allPositions}</option>
                        {Object.keys(positions).map((pos) => (
                          <option key={pos} value={pos}>
                            {positionName(pos, lang)}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label>
                      {t.team}
                      <select
                        value={team}
                        onChange={(e) => setTeam(e.target.value)}
                      >
                        <option value="">{t.allTeams}</option>
                        {teams.map((name) => (
                          <option key={name} value={name}>
                            {teamName(name, lang)}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label>
                      {t.minimum}
                      <select
                        value={minimum}
                        onChange={(e) => setMinimum(Number(e.target.value))}
                      >
                        {[0, 90, 180, 270, 450].map((n) => (
                          <option key={n} value={n}>
                            {n === 0 ? t.allMinutes : `≥${n} ${t.min}`}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>
                  <AdvancedSearch
                    catalog={catalog}
                    lang={lang}
                    value={advanced}
                    onChange={setAdvanced}
                    onPosition={setPosition}
                  />
                  <div className="explorer">
                    <aside className="player-list">
                      <div className="list-heading">
                        <strong>
                          {searchPending
                            ? t.updatingSearch
                            : `${visible.length} ${visible.length === 1 ? t.resultOne : t.results}`}
                        </strong>
                        <span>
                          {advanced.sortBy === "name"
                            ? t.name
                            : advanced.sortBy === "confidence"
                              ? t.confidence
                              : t.minutes}{" "}
                          {advanced.sortBy === "name" ? "↑" : "↓"}
                        </span>
                      </div>
                      <div className="list-scroll" aria-busy={searchPending}>
                        {searchPending && (
                          <p className="list-empty" role="status">
                            {t.updatingSearch}
                          </p>
                        )}
                        {!searchPending &&
                          visible.map((p) => (
                            <button
                              key={p.player_id}
                              className={`player-row ${p.player_id === selected ? "active" : ""}`}
                              onClick={() => {
                                pushNavigation({
                                  ...currentNavigation(),
                                  playerId: p.player_id,
                                });
                              }}
                              aria-pressed={p.player_id === selected}
                            >
                              <span className="initials">
                                {p.display_name
                                  .split(" ")
                                  .map((n) => n[0])
                                  .slice(0, 2)
                                  .join("")}
                              </span>
                              <span className="player-row-info">
                                <strong>{p.display_name}</strong>
                                <small>
                                  {teamName(p.team_name, lang)} ·{" "}
                                  {p.position_group}
                                  {shortlist.includes(p.player_id)
                                    ? " · ★"
                                    : ""}
                                </small>
                              </span>
                              <span className="player-row-minutes">
                                {fmt(p.minutes, lang, p.minutes < 10 ? 2 : 0)}
                                <small>{t.min}</small>
                              </span>
                            </button>
                          ))}
                        {!searchPending && !visible.length && (
                          <div className="list-empty">
                            <p>
                              {mode === "shortlist" && !shortlist.length
                                ? t.emptyShortlist
                                : t.empty}
                            </p>
                            <button onClick={resetSearch}>
                              {t.resetSearch}
                            </button>
                          </div>
                        )}
                      </div>
                      <p className="list-foot">{t.fixedCohort}</p>
                    </aside>
                    {selected &&
                      (mode !== "shortlist" || savedPlayers.length > 0) && (
                        <div className="profile-column">
                          {!searchPending &&
                            !visible.some((p) => p.player_id === selected) && (
                              <p className="notice">{t.selectionOutside}</p>
                            )}
                          <PlayerPanel
                            id={selected}
                            catalog={catalog}
                            api={api}
                            lang={lang}
                            saved={shortlist.includes(selected)}
                            compared={compared.includes(selected)}
                            onSave={toggleSave}
                            onCompare={toggleCompare}
                            onSelect={selectPlayer}
                          />
                          {mode === "shortlist" &&
                            shortlist.includes(selected) && (
                              <ScoutingNotebook
                                name={
                                  catalog.players.find(
                                    (p) => p.player_id === selected,
                                  )?.display_name || ""
                                }
                                value={notes[selected]}
                                lang={lang}
                                onChange={(value) =>
                                  setNotes((current) => ({
                                    ...current,
                                    [selected]: value,
                                  }))
                                }
                              />
                            )}
                        </div>
                      )}
                    {mode === "shortlist" && savedPlayers.length === 0 && (
                      <div className="state">
                        <h2>{t.shortlist}</h2>
                        <p>{t.emptyShortlist}</p>
                        <button onClick={() => navigate("players")}>
                          {t.findPlayers} →
                        </button>
                      </div>
                    )}
                  </div>
                </>
              )}
              <div hidden={mode !== "recruitment"}>
                <RecruitmentPanel
                  key={catalog.coverage.dataset_id}
                  catalog={catalog}
                  lang={lang}
                  api={api}
                  onSelect={selectPlayer}
                />
              </div>
              {mode === "compare" && (
                <Comparison
                  key={catalog.coverage.dataset_id}
                  ids={compared}
                  catalog={catalog}
                  api={api}
                  lang={lang}
                  onRemove={(id) =>
                    setCompared((ids) => ids.filter((v) => v !== id))
                  }
                  onSelect={selectPlayer}
                />
              )}
              {mode === "data" && <DataPanel catalog={catalog} lang={lang} />}
              <div hidden={mode !== "squad"}>
                <SquadPanel
                  key={catalog.coverage.dataset_id}
                  catalog={catalog}
                  lang={lang}
                  onSelect={selectPlayer}
                  onSearch={(pos) => {
                    pushNavigation({
                      ...currentNavigation(),
                      mode: "players",
                      filters: {
                        ...defaultExplorer,
                        position: pos,
                        advanced: { ...initialAdvanced },
                      },
                    });
                  }}
                />
              </div>
              <div hidden={mode !== "myClub"}>
                <MyClubPanel
                  key={catalog.coverage.dataset_id}
                  catalog={catalog}
                  lang={lang}
                  api={api}
                  onSelect={selectPlayer}
                />
              </div>
            </>
          )}
          <footer className="footer">
            <a
              href="https://github.com/hudl/open-data"
              target="_blank"
              rel="noreferrer"
            >
              <Image
                src="/credits/statsbomb.png"
                alt="StatsBomb"
                width={5885}
                height={943}
                unoptimized
              />
            </a>
            <div>
              {t.credits}
              <small>{t.noncommercial}</small>
            </div>
            <span>V0.2</span>
          </footer>
        </main>
      </div>
      {message && (
        <div className="toast" role="status">
          {message}
        </div>
      )}
    </div>
  );
}
