import Image from "next/image";
import type { Catalog, Language } from "../lib/contracts";
import { fmt, translations } from "../lib/i18n";

export function DataPanel({
  catalog,
  lang,
}: {
  catalog: Catalog;
  lang: Language;
}) {
  const t = translations[lang];
  const c = catalog.coverage;
  return (
    <div className="data-panel">
      <h2>{t.data}</h2>
      <div className="data-kpis">
        {[
          [t.matches, `${c.matches_ingested}/${c.matches_available}`],
          [t.events, fmt(c.events, lang, 0)],
          [t.results, c.players],
          [t.teams, c.teams],
        ].map(([label, value]) => (
          <div className="card" key={label}>
            <strong>{value}</strong>
            <span>{label}</span>
          </div>
        ))}
      </div>
      <section className="card">
        <div className="section-row">
          <h3>{t.scope}</h3>
          <span className="tag">{fmt(c.coverage_pct, lang, 0)}%</span>
        </div>
        <p>
          {c.competition} {c.season} · {c.date_from} → {c.date_to}
        </p>
        <p>{t.scopeText}</p>
        <p className="valid">✓ {t.checkPass}</p>
      </section>
      <div className="signals-grid">
        <section className="card">
          <h3>{t.methodological}</h3>
          <p>{t.addedTime}</p>
          <p>{t.rankHelp}</p>
          <p>{t.confidenceHelp}</p>
          <p>{t.fitHelp}</p>
        </section>
        <section className="card">
          <h3>{t.source}</h3>
          <a
            href="https://github.com/hudl/open-data"
            target="_blank"
            rel="noreferrer"
          >
            <Image
              className="source-logo"
              src="/credits/statsbomb.png"
              alt="StatsBomb"
              width={5885}
              height={943}
              unoptimized
            />
          </a>
          <p>{t.noncommercial}</p>
          <a href={c.license_url} target="_blank" rel="noreferrer">
            {t.sourceTerms} ↗
          </a>
          <p>{t.credits}</p>
        </section>
      </div>
      <details className="lineage">
        <summary>{t.details}</summary>
        <dl>
          <dt>Dataset</dt>
          <dd>{c.dataset_id}</dd>
          <dt>{t.revision}</dt>
          <dd>{c.source_revision}</dd>
          <dt>{t.featureVersion}</dt>
          <dd>{c.feature_version}</dd>
        </dl>
        <h4>{t.qualityNotes}</h4>
        {c.quality
          .filter((q) => q.warnings.length)
          .map((q) => (
            <p key={q.match_id} lang="en">
              {q.match_id}: {q.warnings.join("; ")}
            </p>
          ))}
      </details>
      <div className="signals-grid">
        <section className="card">
          <h3>{t.supported}</h3>
          <p>{t.supportedText}</p>
        </section>
        <section className="card">
          <h3>{t.roadmap}</h3>
          <p>{t.roadmapText}</p>
        </section>
      </div>
    </div>
  );
}
