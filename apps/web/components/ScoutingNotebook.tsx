"use client";
import type { Language } from "../lib/contracts";
import type { ScoutingNote } from "../lib/shortlist";
import { shortlistStatuses } from "../lib/shortlist";
import { translations } from "../lib/i18n";

export function ScoutingNotebook({
  name,
  value,
  lang,
  onChange,
}: {
  name: string;
  value: ScoutingNote | undefined;
  lang: Language;
  onChange: (value: ScoutingNote) => void;
}) {
  const t = translations[lang];
  const current = value || { status: "watch", note: "", updated_at: "" };
  const update = (change: Partial<ScoutingNote>) =>
    onChange({ ...current, ...change, updated_at: new Date().toISOString() });
  return (
    <section className="card scouting-notebook">
      <div className="section-row">
        <h3>
          {t.scoutingNotes} · {name}
        </h3>
        <span className="tag">{t.manualObservation}</span>
      </div>
      <p>{t.notesHelp}</p>
      <label>
        {t.reviewStatus}
        <select
          value={current.status}
          onChange={(e) =>
            update({ status: e.target.value as ScoutingNote["status"] })
          }
        >
          {shortlistStatuses.map((v) => (
            <option key={v} value={v}>
              {t[v === "review" ? "reviewVideo" : v]}
            </option>
          ))}
        </select>
      </label>
      <label>
        {t.observation}
        <textarea
          value={current.note}
          maxLength={3000}
          rows={4}
          placeholder={t.observationPrompt}
          onChange={(e) => update({ note: e.target.value })}
        />
      </label>
      <small>
        {current.note.length}/3000 · {t.localOnly}
      </small>
    </section>
  );
}
