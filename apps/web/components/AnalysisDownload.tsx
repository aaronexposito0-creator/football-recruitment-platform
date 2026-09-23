"use client";
import { useEffect, useState } from "react";
import type { Catalog, Language, Player } from "../lib/contracts";
import type { ScoutingNotes } from "../lib/shortlist";
import { csvText } from "../lib/export";
import { translations } from "../lib/i18n";

export function AnalysisDownload({
  players,
  catalog,
  notes,
  lang,
}: {
  players: Player[];
  catalog: Catalog;
  notes: ScoutingNotes;
  lang: Language;
}) {
  const [url, setUrl] = useState("");
  const t = translations[lang];
  useEffect(() => {
    const next = URL.createObjectURL(
      new Blob([csvText(players, catalog, notes)], {
        type: "text/csv;charset=utf-8;",
      }),
    );
    setUrl(next);
    return () => URL.revokeObjectURL(next);
  }, [players, catalog, notes]);
  return url && players.length ? (
    <a
      className="download-action"
      href={url}
      download="Football_Recruitment_Analysis.csv"
    >
      {t.exportShortlist} ↓
    </a>
  ) : (
    <span className="muted">{t.exportShortlist}</span>
  );
}
