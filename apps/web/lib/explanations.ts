import type { Catalog, Language } from "./contracts";
import { translations } from "./i18n.ts";

export function evidenceWarning(code: string, lang: Language): string {
  const warnings: Record<string, readonly string[]> = {
    below_minimum_minutes: [
      "Fewer than 180 minutes: rates are shown, but no benchmark or similarity is assigned.",
      "Menos de 180 minutos: se muestran las tasas observadas, sin percentiles ni similitud.",
      "Moins de 180 minutes : les taux observés sont affichés, sans percentiles ni similarité.",
    ],
    insufficient_peers: [
      "Fewer than 10 comparable players: the reference sample is too small.",
      "Menos de 10 jugadores comparables: la muestra de referencia es insuficiente.",
      "Moins de 10 joueurs comparables : échantillon de référence insuffisant.",
    ],
    position_model_unavailable: [
      "This position has no supported benchmark model.",
      "Esta posición no dispone de un modelo de comparación compatible.",
      "Ce poste ne dispose pas d’un modèle de comparaison compatible.",
    ],
    partial_competition_coverage: [
      "Some matches from the selected competition are missing.",
      "Faltan partidos de la competición seleccionada.",
      "Certains matchs de la compétition sélectionnée sont absents.",
    ],
    mixed_position_exposure: [
      "No position accounts for 60% of this player's minutes. Review the position breakdown before interpreting the cohort.",
      "Ninguna posición representa el 60% de sus minutos. Revisa el reparto por posiciones antes de interpretar el grupo.",
      "Aucun poste ne représente 60 % de ses minutes. Consultez la répartition avant d’interpréter le groupe.",
    ],
    unresolved_assisted_shot: [
      "At least one creating pass could not be linked to a verified shot. Assisted-shot xG is withheld for the affected exposure.",
      "Al menos un pase creador no pudo vincularse a un tiro verificado. Se retiene el xG de tiros asistidos de la exposición afectada.",
      "Au moins une passe créatrice n’a pas pu être reliée à un tir vérifié. Le xG des tirs assistés concerné est indisponible.",
    ],
    insufficient_metric_reference: [
      "Some observed metrics have fewer than 10 reference observations. They receive no percentile and do not add confidence.",
      "Algunas métricas observadas tienen menos de 10 referencias. No reciben percentil ni aportan confianza.",
      "Certaines métriques observées ont moins de 10 références. Elles n’ont pas de percentile et n’ajoutent pas de confiance.",
    ],
  };
  return (
    warnings[code]?.[{ en: 0, es: 1, fr: 2 }[lang]] ||
    translations[lang].sampleWarning
  );
}

export function fieldName(
  key: string,
  catalog: Catalog,
  lang: Language,
): string {
  const t = translations[lang];
  return (
    (
      {
        player_name: t.name,
        player_id: t.sourceID,
        team_name: t.clubTeam,
        position_group: t.position,
        minutes: t.minutes,
        age: t.age,
        dataset_id: "Dataset ID",
      } as Record<string, string>
    )[key] ||
    catalog.metric_catalog[key + "_per90"]?.names[lang] ||
    key
  );
}
export function importIssue(
  issue: string,
  catalog: Catalog,
  lang: Language,
): string {
  const t = translations[lang];
  const [field, code] = issue.split(":");
  const name = fieldName(field, catalog, lang);
  const reasons: Record<string, string> = {
    unknown_position: t.issuePosition,
    missing_or_invalid: t.issueMissing,
    invalid_number: t.issueNumber,
    out_of_range: t.issueRange,
    count_must_be_integer: t.issueInteger,
    zero_with_events: t.issueZeroMinutes,
    unavailable: t.issueMissing,
    duplicate_source_id: t.issueDuplicate,
  };
  if (code?.startsWith("exceeds_"))
    return `${name}: ${t.issueExceeds} ${code
      .slice(8)
      .split("+")
      .map((term) => fieldName(term, catalog, lang))
      .join(" + ")}`;
  return `${name}: ${reasons[code] || t.importInvalid}`;
}
export function fitReason(
  reason: string,
  catalog: Catalog,
  lang: Language,
): string {
  const t = translations[lang];
  const metric = Object.keys(catalog.metric_catalog).find((k) =>
    reason.includes(k),
  );
  if (metric) {
    const name = catalog.metric_catalog[metric].names[lang];
    if (reason.startsWith("Cannot verify"))
      return `${name}: ${t.cannotVerifyBound}`;
    return `${name}: ${reason.includes("below required") ? t.belowRequired : t.aboveAllowed}`;
  }
  if (reason.startsWith("minutes")) return t.belowMinutes;
  if (reason.startsWith("age")) return t.ageUnavailable;
  if (reason.startsWith("preferred foot")) return t.footUnavailable;
  if (reason.startsWith("position")) return t.positionMismatch;
  return t.constraintNotMet;
}
