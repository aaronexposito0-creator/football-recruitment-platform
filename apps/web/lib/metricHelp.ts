import type { Language, MetricDefinition } from "./contracts";

// Football-facing explanations of the versioned definitions, not alternative calculations.
const help: Record<string, readonly [string, string]> = {
  goals: [
    "Goles procedentes de tiros, incluidos los penaltis durante el partido. Excluye autogoles y tandas.",
    "Buts issus de tirs, y compris les penalties pendant le match. Hors buts contre son camp et séances de tirs au but.",
  ],
  non_penalty_goals: [
    "Goles de tiro excluyendo penaltis, autogoles y tandas.",
    "Buts issus de tirs hors penalties, buts contre son camp et séances de tirs au but.",
  ],
  shots: [
    "Tiros registrados durante el partido y la prórroga, incluidos penaltis. Excluye tandas.",
    "Tirs enregistrés pendant le match et la prolongation, penalties compris. Hors séances de tirs au but.",
  ],
  xg: [
    "Suma del xG que StatsBomb asigna a los tiros. Si falta xG en algún tiro, el agregado queda sin valor. No es un modelo entrenado por esta plataforma.",
    "Somme du xG attribué aux tirs par StatsBomb. Si un tir n’a pas de xG, l’agrégat est indisponible. Le modèle n’est pas entraîné par cette plateforme.",
  ],
  npxg: [
    "Suma del xG de los tiros que no son penaltis. Se retiene el agregado si falta xG en algún tiro aplicable.",
    "Somme du xG des tirs hors penalties. L’agrégat est indisponible si le xG manque pour un tir concerné.",
  ],
  assists: [
    "Pases que la fuente identifica como asistencias de gol. No se deducen asistencias adicionales.",
    "Passes identifiées comme décisives par la source. Aucune passe décisive supplémentaire n’est déduite.",
  ],
  key_passes: [
    "Pases que la fuente vincula a la creación de un tiro, incluidos los que acaban en gol.",
    "Passes que la source associe à la création d’un tir, y compris ceux qui aboutissent à un but.",
  ],
  xa: [
    "Suma del xG de los tiros generados por sus pases, con vínculo verificado en el mismo partido y equipo. Mide el tiro posterior; no estima el peligro de cada pase. Un vínculo incompleto deja el agregado sin valor.",
    "Somme du xG des tirs créés par ses passes, avec un lien vérifié dans le même match et la même équipe. Mesure le tir suivant, pas le danger de chaque passe. Un lien incomplet rend l’agrégat indisponible.",
  ],
  passes: [
    "Pases intentados, incluidas las reanudaciones a balón parado.",
    "Passes tentées, y compris les remises en jeu et coups de pied arrêtés.",
  ],
  completed_passes: [
    "Pases que la fuente registra como completados, incluidas las reanudaciones.",
    "Passes enregistrées comme réussies par la source, remises en jeu comprises.",
  ],
  progressive_passes: [
    "Pases completados en juego abierto que avanzan hacia portería y reducen la distancia al centro de la misma al menos 10 metros y un 25%. Campo de referencia de 105 × 68 m. Excluye reanudaciones.",
    "Passes réussies dans le jeu qui avancent vers le but et réduisent la distance à son centre d’au moins 10 mètres et 25 %. Terrain de référence de 105 × 68 m. Hors remises en jeu.",
  ],
  carries: [
    "Conducciones registradas por la fuente. No equivale a contar cada toque ni cada intento de regate.",
    "Conduites enregistrées par la source. Ne compte pas chaque touche ni chaque tentative de dribble.",
  ],
  progressive_carries: [
    "Conducciones hacia portería que reducen la distancia a su centro al menos 10 metros y un 25%, con la misma geometría que los pases progresivos.",
    "Conduites vers le but réduisant la distance à son centre d’au moins 10 mètres et 25 %, avec la même géométrie que les passes progressives.",
  ],
  passes_into_final_third: [
    "Pases completados en juego abierto que parten de fuera del último tercio y terminan dentro. No incluye conducciones ni reanudaciones.",
    "Passes réussies dans le jeu partant de l’extérieur du dernier tiers et arrivant à l’intérieur. Hors conduites et remises en jeu.",
  ],
  entries_into_box: [
    "Pases completados en juego abierto o conducciones que empiezan fuera del área rival y terminan dentro. Excluye reanudaciones.",
    "Passes réussies dans le jeu ou conduites partant de l’extérieur de la surface adverse et arrivant à l’intérieur. Hors remises en jeu.",
  ],
  pressures: [
    "Acciones de presión registradas; no significa que hayan recuperado el balón. Si un partido no dispone de cobertura de presión, la métrica queda sin valor.",
    "Actions de pression enregistrées ; elles n’impliquent pas une récupération. Si un match n’a pas de couverture des pressions, la métrique est indisponible.",
  ],
  tackles: [
    "Intentos de entrada registrados como duelos. No se presupone que sean ganados.",
    "Tentatives de tacle enregistrées comme duels. Elles ne sont pas supposées gagnées.",
  ],
  interceptions: [
    "Intercepciones registradas por la fuente. No se presupone una recuperación exitosa en cada acción.",
    "Interceptions enregistrées par la source. Chaque action n’est pas supposée aboutir à une récupération réussie.",
  ],
  ball_recoveries: [
    "Recuperaciones de balón registradas sin indicación de recuperación fallida.",
    "Récupérations de balle enregistrées sans indication d’échec.",
  ],
  turnovers: [
    "Pérdidas por desposesión o mal control. Excluye pases fallidos; no representa todas las pérdidas de posesión. El percentil favorable se invierte para favorecer menor volumen.",
    "Pertes par dépossession ou mauvais contrôle. Hors passes ratées ; ne couvre pas toutes les pertes de possession. Le percentile favorable est inversé pour favoriser un volume inférieur.",
  ],
  pass_completion: [
    "100 × pases completados / pases intentados, incluidas las reanudaciones. Sin intentos, el porcentaje queda sin valor; no se convierte en 0%.",
    "100 × passes réussies / passes tentées, remises en jeu comprises. Sans tentative, le pourcentage est indisponible ; il ne devient pas 0 %.",
  ],
};
export function metricHelp(metric: MetricDefinition, lang: Language): string {
  if (lang === "en") return metric.definition;
  return (
    help[metric.key.replace(/_per90$/, "")]?.[lang === "es" ? 0 : 1] ||
    metric.definition
  );
}
export function metricDenominator(
  metric: MetricDefinition,
  lang: Language,
): string {
  if (metric.unit === "%")
    return {
      en: "Denominator: all attempted passes.",
      es: "Denominador: todos los pases intentados.",
      fr: "Dénominateur : toutes les passes tentées.",
    }[lang];
  return {
    en: "Per 90 = observed total × 90 / on-pitch minutes, including added time and extra time.",
    es: "Por 90 = total observado × 90 / minutos jugados, incluidos descuento y prórroga.",
    fr: "Par 90 = total observé × 90 / minutes jouées, temps additionnel et prolongation compris.",
  }[lang];
}
