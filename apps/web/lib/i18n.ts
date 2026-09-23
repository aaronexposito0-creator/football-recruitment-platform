import type { Language, Persona } from "./contracts";

const words = {
  allStatuses: ["All statuses", "Todos los estados", "Tous les statuts"],
  savedPlayerUnavailable: [
    "Saved player outside the active data",
    "Jugador guardado fuera de los datos activos",
    "Joueur enregistré absent des données actives",
  ],
  savedOutsideDataset: [
    "saved players are outside the active data. Their notes are retained; they cannot be assessed here.",
    "jugadores guardados no figuran en los datos activos. Conservamos sus notas, pero no podemos evaluarlos aquí.",
    "joueurs enregistrés sont absents des données actives. Leurs notes sont conservées ; ils ne peuvent pas être évalués ici.",
  ],
  benchmarkWithheld: [
    "Percentiles withheld",
    "Percentiles no publicados",
    "Percentiles non publiés",
  ],
  resetSearch: [
    "Reset search",
    "Restablecer búsqueda",
    "Réinitialiser la recherche",
  ],
  findPlayers: ["Find players", "Buscar jugadores", "Chercher des joueurs"],
  clubTeam: ["Team / club", "Equipo / club", "Équipe / club"],
  issuePosition: [
    "position not recognised",
    "posición no reconocida",
    "poste non reconnu",
  ],
  issueMissing: [
    "value unavailable",
    "dato no disponible",
    "valeur indisponible",
  ],
  issueNumber: [
    "check the number and decimal convention",
    "revisa el número y el separador decimal",
    "vérifiez le nombre et le séparateur décimal",
  ],
  issueRange: [
    "outside the supported range",
    "fuera del rango admitido",
    "hors de la plage admise",
  ],
  issueInteger: [
    "a count must be a whole number",
    "un recuento debe ser un número entero",
    "un compte doit être un nombre entier",
  ],
  issueZeroMinutes: [
    "events recorded but no playing time",
    "hay acciones registradas sin tiempo de juego",
    "actions enregistrées sans temps de jeu",
  ],
  issueDuplicate: [
    "identifier appears in multiple rows; rows were not merged",
    "el identificador se repite; las filas no se han fusionado",
    "identifiant répété ; les lignes n’ont pas été fusionnées",
  ],
  issueExceeds: ["cannot exceed", "no puede superar", "ne peut pas dépasser"],
  cannotVerifyBound: [
    "not enough data to verify the required bound",
    "faltan datos para comprobar el límite obligatorio",
    "données insuffisantes pour vérifier la limite requise",
  ],
  belowRequired: [
    "below your required minimum",
    "por debajo del mínimo que has exigido",
    "en dessous du minimum demandé",
  ],
  aboveAllowed: [
    "above your allowed maximum",
    "por encima del máximo que has permitido",
    "au-dessus du maximum autorisé",
  ],
  belowMinutes: [
    "not enough playing time for this brief",
    "no alcanza los minutos exigidos en este perfil",
    "temps de jeu insuffisant pour ce profil",
  ],
  ageUnavailable: [
    "age is unknown or outside the requested range",
    "la edad es desconocida o queda fuera del rango solicitado",
    "âge inconnu ou hors de la plage demandée",
  ],
  footUnavailable: [
    "preferred foot is unknown or does not match",
    "el pie preferido es desconocido o no coincide",
    "pied préféré inconnu ou différent",
  ],
  positionMismatch: [
    "position does not match the brief",
    "la posición no coincide con el perfil buscado",
    "poste différent du profil recherché",
  ],
  constraintNotMet: [
    "a required condition could not be verified",
    "no se ha podido verificar una condición obligatoria",
    "une condition requise n’a pas pu être vérifiée",
  ],
  importTechnicalDetails: [
    "File diagnostic details",
    "Detalle del diagnóstico del archivo",
    "Détail du diagnostic du fichier",
  ],
  importFormulaWarning: [
    "Formula cells are omitted. Replace them with observed numeric values if they are needed.",
    "Se omiten las celdas con fórmulas. Sustitúyelas por valores numéricos observados si las necesitas.",
    "Les cellules de formule sont exclues. Remplacez-les par des valeurs numériques observées si nécessaire.",
  ],
  importSheetWarning: [
    "Only the workbook’s active worksheet is used. Export each squad sheet separately.",
    "Se utiliza solo la hoja activa del libro. Exporta cada hoja de plantilla por separado.",
    "Seule la feuille active est utilisée. Exportez chaque feuille d’effectif séparément.",
  ],
  otherTeams: [
    "Other teams only",
    "Solo otras selecciones",
    "Autres équipes uniquement",
  ],
  candidateMinutes: [
    "Candidate minutes",
    "Minutos del candidato",
    "Minutes du candidat",
  ],
  replacementHelp: [
    "Up to 12 closest profiles from the eligible cohort. Candidate filters keep the original scaling and similarity scores. Statistical likeness is a starting point for a replacement review, not proof of tactical interchangeability.",
    "Hasta 12 perfiles más próximos de la cohorte válida. Los filtros conservan la escala y las puntuaciones originales. El parecido estadístico inicia la revisión de un relevo; no demuestra que sean intercambiables tácticamente.",
    "Jusqu’à 12 profils les plus proches de la cohorte valide. Les filtres conservent l’échelle et les scores initiaux. La ressemblance statistique amorce l’examen d’un remplaçant ; elle ne prouve pas l’interchangeabilité tactique.",
  ],
  assignPositions: [
    "Assign positions for this scenario",
    "Asignar posiciones para este escenario",
    "Attribuer les postes pour ce scénario",
  ],
  assignmentHelp: [
    "A planning assignment counts a player in one chosen slot. It does not edit the observed position, match exposure or percentile cohort. Use it to express your own tactical hypothesis.",
    "La asignación cuenta a cada jugador en un puesto elegido. No modifica su posición observada, sus minutos ni su cohorte de percentiles. Sirve para expresar tu hipótesis táctica.",
    "L’affectation compte chaque joueur dans un seul poste choisi. Elle ne modifie ni son poste observé, ni ses minutes, ni sa cohorte de percentiles. Elle exprime votre hypothèse tactique.",
  ],
  resetAssignments: [
    "Restore observed positions",
    "Restaurar posiciones observadas",
    "Rétablir les postes observés",
  ],
  scoutingNotes: [
    "Scouting notebook",
    "Cuaderno de scouting",
    "Carnet de recrutement",
  ],
  manualObservation: [
    "Your observation",
    "Tu observación",
    "Votre observation",
  ],
  notesHelp: [
    "Keep the match, minute and source with your observation. Notes and review status are personal assessments; they do not modify the computed metrics or scores.",
    "Anota partido, minuto y fuente junto a tu observación. Las notas y el estado son valoraciones personales; no modifican métricas ni puntuaciones calculadas.",
    "Précisez match, minute et source avec votre observation. Notes et statut sont des appréciations personnelles ; ils ne modifient ni les métriques ni les scores calculés.",
  ],
  reviewStatus: ["Review status", "Estado de revisión", "Statut de suivi"],
  playerMissing: [
    "The player in this link is not available in the active dataset. No substitute profile has been selected.",
    "El jugador del enlace no está disponible en el dataset activo. No se ha seleccionado otra ficha en su lugar.",
    "Le joueur de ce lien n’est pas disponible dans le jeu de données actif. Aucune autre fiche n’a été sélectionnée à sa place.",
  ],
  reconnecting: [
    "Checking analysis server",
    "Comprobando servidor de análisis",
    "Vérification du serveur d’analyse",
  ],
  reconnectFailed: [
    "Could not reconnect. The previously loaded dataset remains visible; try again using the dataset status button.",
    "No se ha podido reconectar. Sigues viendo el dataset cargado anteriormente; puedes reintentarlo con su botón de estado.",
    "Reconnexion impossible. Le jeu de données précédemment chargé reste visible ; réessayez avec son bouton d’état.",
  ],
  exportShortlist: [
    "Export full shortlist CSV",
    "Exportar lista completa CSV",
    "Exporter toute la liste CSV",
  ],
  savedBriefHelp: [
    "Your criteria are saved on this device for this dataset. Opening a player does not discard this brief.",
    "Tus criterios se guardan en este dispositivo para este dataset. Abrir una ficha no descarta el brief.",
    "Vos critères sont enregistrés sur cet appareil pour ce jeu de données. Consulter un joueur ne supprime pas ce profil.",
  ],
  resetBrief: [
    "Restore archetype criteria",
    "Restaurar criterios del arquetipo",
    "Rétablir les critères de l’archétype",
  ],
  positiveWeightRequired: [
    "Give at least one preference a weight above zero.",
    "Asigna un peso mayor que cero al menos a una preferencia.",
    "Attribuez un poids supérieur à zéro à au moins une préférence.",
  ],
  savedScenarioHelp: [
    "This plan is saved on this device for this team and dataset. It never changes the observed positions or minutes.",
    "Este plan se guarda en este dispositivo para esta selección y dataset. Nunca cambia las posiciones ni los minutos observados.",
    "Ce plan est enregistré sur cet appareil pour cette sélection et ce jeu de données. Les postes et minutes observés restent inchangés.",
  ],
  resetScenario: [
    "Reset this plan",
    "Restablecer este plan",
    "Réinitialiser ce plan",
  ],
  storageError: [
    "Some saved choices could not be restored or saved on this device. This session still works; export your shortlist before closing.",
    "No se han podido recuperar o guardar algunos cambios en este dispositivo. Puedes seguir trabajando; exporta tu lista antes de cerrar.",
    "Certains choix n’ont pas pu être restaurés ou enregistrés sur cet appareil. La session reste utilisable ; exportez votre liste avant de fermer.",
  ],
  filterReviewStatus: [
    "Filter by status",
    "Filtrar por estado",
    "Filtrer par statut",
  ],
  sourceRow: ["File row", "Fila del archivo", "Ligne du fichier"],
  watch: ["Watch", "En seguimiento", "À suivre"],
  reviewVideo: ["Review video", "Revisar vídeo", "Vidéo à revoir"],
  priority: [
    "Priority for review",
    "Prioridad de revisión",
    "Priorité d’examen",
  ],
  archived: ["Archived", "Archivado", "Archivé"],
  observation: [
    "Observation and next action",
    "Observación y siguiente acción",
    "Observation et prochaine action",
  ],
  observationPrompt: [
    "Match / minute / evidence / unanswered question…",
    "Partido / minuto / evidencia / pregunta pendiente…",
    "Match / minute / preuve / question en suspens…",
  ],
  age: ["Age", "Edad", "Âge"],
  metric: ["Metric", "Métrica", "Métrique"],
  datasetChanged: [
    "The reference dataset changed. Reload before importing.",
    "El dataset de referencia ha cambiado. Recarga antes de importar.",
    "Le jeu de référence a changé. Rechargez avant d’importer.",
  ],
  squad: [
    "Squad intelligence",
    "Inteligencia de plantilla",
    "Analyse d’effectif",
  ],
  myClub: ["My Club", "Mi Club", "Mon Club"],
  depth: [
    "Positional depth",
    "Profundidad por posición",
    "Profondeur par poste",
  ],
  scenario: [
    "Planning scenario",
    "Escenario de planificación",
    "Scénario de planification",
  ],
  depthHelp: [
    "Count each player once in the position assigned in this plan, initially their observed dominant position. Targets start with two players per starting slot. Unnamed rows and conflicting player IDs cannot fill a target. A gap describes available exposure, not player quality or transfer urgency.",
    "Cada jugador cuenta una vez en la posición asignada al plan; inicialmente se utiliza la posición dominante observada. Los objetivos parten de dos jugadores por puesto del once. Las filas sin nombre o con IDs duplicados no cubren un puesto. Un déficit describe la participación disponible, no la calidad ni la urgencia de fichar.",
    "Chaque joueur compte une fois au poste choisi dans le plan, initialement son poste dominant observé. Les objectifs partent de deux joueurs par place de titulaire. Les lignes sans nom ou avec un identifiant en doublon ne remplissent pas d’objectif. Un écart décrit l’exposition disponible, ni la qualité ni l’urgence d’un transfert.",
  ],
  depthAbsent: ["Simulated departure", "Salida simulada", "Départ simulé"],
  depthMissingIdentity: [
    "Name missing · not counted",
    "Sin nombre · no cuenta",
    "Sans nom · non compté",
  ],
  depthDuplicateIdentity: [
    "Duplicate ID · not counted",
    "ID duplicado · no cuenta",
    "Identifiant en doublon · non compté",
  ],
  depthMissingMinutes: [
    "Minutes unknown · not counted",
    "Minutos desconocidos · no cuenta",
    "Minutes inconnues · non compté",
  ],
  depthBelowMinutes: [
    "Below minimum minutes",
    "Por debajo del mínimo",
    "Sous le minimum de minutes",
  ],
  formation: ["Starting structure", "Estructura inicial", "Structure initiale"],
  simulatedAbsence: [
    "Simulate one departure",
    "Simular una salida",
    "Simuler un départ",
  ],
  none: ["None", "Ninguna", "Aucun"],
  targetDepth: ["Target", "Objetivo", "Objectif"],
  coverageGap: [
    "exposure gap",
    "déficit de participación",
    "déficit d’exposition",
  ],
  targetMet: [
    "Exposure target met",
    "Objetivo de participación cubierto",
    "Objectif d’exposition atteint",
  ],
  noObservedPlayers: [
    "No observed players in this position.",
    "Sin jugadores observados en esta posición.",
    "Aucun joueur observé à ce poste.",
  ],
  explorePosition: [
    "Explore this position",
    "Explorar esta posición",
    "Explorer ce poste",
  ],
  unknownPositionHelp: [
    "Players with unknown positions remain in the roster but cannot fill a positional target.",
    "Los jugadores sin posición conocida permanecen en la lista, pero no cubren un objetivo posicional.",
    "Les joueurs sans poste connu restent dans l’effectif mais ne remplissent pas d’objectif par poste.",
  ],
  squadLens: [
    "SQUAD · EXPOSURE · REPLACEMENTS",
    "PLANTILLA · PARTICIPACIÓN · RELEVOS",
    "EFFECTIF · EXPOSITION · RELÈVE",
  ],
  squadScope: [
    "National-team participation in Euro 2024. This is not a complete registered squad or a current club roster. Unused substitutes are absent; dominant positions reflect this tournament.",
    "Participación de la selección en la Euro 2024. No es la convocatoria completa ni la plantilla actual de un club. No aparecen suplentes sin minutos; la posición dominante corresponde a este torneo.",
    "Participation de la sélection à l’Euro 2024. Ce n’est ni la liste complète des inscrits ni l’effectif actuel d’un club. Les remplaçants sans minutes sont absents ; le poste dominant correspond à ce tournoi.",
  ],
  observedPlayers: [
    "Observed players",
    "Jugadores observados",
    "Joueurs observés",
  ],
  benchmarkPlayerCount: [
    "With a valid benchmark",
    "Con referencia válida",
    "Avec référence valide",
  ],
  squadReview: [
    "Shared review signals",
    "Señales compartidas para revisar",
    "Signaux communs à examiner",
  ],
  squadReviewHelp: [
    "Shown only when at least two benchmark-eligible players in the same position are all at P25 or below in a listed metric. These are event-volume observations; match context and tactical instructions can explain them.",
    "Solo se muestran cuando al menos dos jugadores comparables de la misma posición están todos en P25 o menos en una métrica. Son observaciones de volumen; el contexto y las instrucciones tácticas pueden explicarlas.",
    "Affichés uniquement lorsque deux joueurs comparables ou plus d’un même poste sont tous à P25 ou moins. Il s’agit de volumes d’actions ; le contexte et les consignes tactiques peuvent les expliquer.",
  ],
  playersBelow25: ["players at ≤P25", "jugadores en ≤P25", "joueurs à ≤P25"],
  noCommonSignal: [
    "No shared signal meets this rule. This does not establish that the squad has no weaknesses.",
    "Ninguna señal compartida cumple esta regla. Esto no demuestra que la plantilla carezca de debilidades.",
    "Aucun signal commun ne satisfait cette règle. Cela ne prouve pas l’absence de faiblesses.",
  ],
  ownData: [
    "YOUR DATA · SEPARATE PROVENANCE",
    "TUS DATOS · PROCEDENCIA SEPARADA",
    "VOS DONNÉES · PROVENANCE DISTINCTE",
  ],
  importIntro: [
    "Bring a squad table, review column mapping, inspect missing evidence and plan positional depth. Import raw totals and minutes; per-90 rates are calculated from those denominators.",
    "Carga una tabla de plantilla, revisa las columnas, inspecciona la evidencia que falta y planifica la profundidad posicional. Importa totales y minutos; las tasas por 90 se calculan con esos denominadores.",
    "Importez un tableau d’effectif, vérifiez les colonnes, examinez les données manquantes et planifiez la profondeur. Importez des totaux et des minutes ; les taux par 90 sont calculés avec ces dénominateurs.",
  ],
  importStorage: [
    "Processed by this application’s analysis server in memory. No uploaded file is saved. Results remain in this browser session until reload.",
    "Procesado en memoria por el servidor de análisis de esta aplicación. No se guarda el archivo. Los resultados permanecen en esta sesión del navegador hasta recargar.",
    "Traitement en mémoire par le serveur d’analyse de cette application. Aucun fichier importé n’est enregistré. Les résultats restent dans cette session jusqu’au rechargement.",
  ],
  importPlansHelp: [
    "Each team keeps its plan while you switch teams or views. Plans stay in memory and reset when you analyse a file again or reload.",
    "Cada equipo conserva su plan al cambiar de equipo o pantalla. Los planes permanecen en memoria y se reinician al volver a analizar un archivo o recargar.",
    "Chaque équipe conserve son plan quand vous changez d’équipe ou de vue. Les plans restent en mémoire et sont réinitialisés lors d’une nouvelle analyse ou d’un rechargement.",
  ],
  importNeedsAPI: [
    "File analysis is temporarily unavailable. You can still explore the published player analysis. Use the data status button to reconnect and try again.",
    "El análisis de archivos no está disponible temporalmente. Puedes seguir explorando los análisis de jugadores. Usa el botón de estado de los datos para reconectar y volver a intentarlo.",
    "L’analyse de fichiers est temporairement indisponible. Vous pouvez toujours consulter les analyses des joueurs. Utilisez le bouton d’état des données pour vous reconnecter et réessayer.",
  ],
  tryClubDemo: [
    "Try with Spain · Euro 2024",
    "Probar con España · Euro 2024",
    "Essayer avec l’Espagne · Euro 2024",
  ],
  clubDemoHelp: [
    "Real StatsBomb research summaries from this dataset, processed through the same import checks as your files. Review the mapping, then analyse. No personal notes are included.",
    "Resúmenes reales de investigación de StatsBomb del dataset activo, con las mismas comprobaciones que tus archivos. Revisa las columnas y pulsa analizar. No incluyen notas personales.",
    "Résumés réels de recherche StatsBomb du jeu actif, soumis aux mêmes vérifications que vos fichiers. Vérifiez les colonnes, puis analysez. Aucune note personnelle n’est incluse.",
  ],
  clubLabel: ["Import label", "Nombre de la importación", "Nom de l’import"],
  uploadFile: [
    "Select CSV / XLSX",
    "Seleccionar CSV / XLSX",
    "Choisir CSV / XLSX",
  ],
  uploadLimit: [
    "CSV / XLSX · up to 3 MiB, 2,000 rows and 60 columns",
    "CSV / XLSX · hasta 3 MiB, 2.000 filas y 60 columnas",
    "CSV / XLSX · jusqu’à 3 Mio, 2 000 lignes et 60 colonnes",
  ],
  decimalConvention: [
    "Decimal convention",
    "Separador decimal",
    "Séparateur décimal",
  ],
  decimalHelp: [
    "No thousands separators. Blank is unknown; 0 is an observed zero.",
    "Sin separadores de miles. Vacío significa desconocido; 0 es un cero observado.",
    "Sans séparateur de milliers. Vide signifie inconnu ; 0 est un zéro observé.",
  ],
  blankTemplate: [
    "Download blank template",
    "Descargar plantilla vacía",
    "Télécharger le modèle vide",
  ],
  processingImport: [
    "Checking and analysing the file…",
    "Comprobando y analizando el archivo…",
    "Vérification et analyse du fichier…",
  ],
  importError: [
    "The import could not be completed",
    "No se pudo completar la importación",
    "L’import n’a pas pu être terminé",
  ],
  importInvalid: [
    "Review the column mapping and file limits.",
    "Revisa la asignación de columnas y los límites del archivo.",
    "Vérifiez les colonnes et les limites du fichier.",
  ],
  mapping: [
    "Review the column mapping",
    "Revisar asignación de columnas",
    "Vérifier les colonnes",
  ],
  mappingHelp: [
    "Map counts and sums, not existing per-90 rates. Only the player name is required. Unknown positions use UNK; recognised groups are GK, CB, FB, DM, CM, AM, W and ST.",
    "Asigna recuentos y sumas, no tasas por 90 ya calculadas. Solo el nombre es obligatorio. Posiciones desconocidas: UNK; grupos reconocidos: GK, CB, FB, DM, CM, AM, W y ST.",
    "Associez des comptes et des sommes, pas des taux par 90 déjà calculés. Seul le nom est requis. Postes inconnus : UNK ; groupes reconnus : GK, CB, FB, DM, CM, AM, W et ST.",
  ],
  importNotesHelp: [
    "Notes can stay in the file. Leave them unmapped: they do not become player measurements or update your scouting notebook.",
    "Las notas pueden permanecer en el archivo. Déjalas sin asignar: no se convierten en métricas ni actualizan tu cuaderno de scouting.",
    "Les notes peuvent rester dans le fichier. Ne les associez pas : elles ne deviennent pas des mesures et ne modifient pas votre carnet d’observation.",
  ],
  importLongMapped: [
    "This column contains text too long for a player data field. Check the column assignment below.",
    "Esta columna contiene texto demasiado largo para un dato de jugador. Revisa la asignación indicada abajo.",
    "Cette colonne contient un texte trop long pour une donnée de joueur. Vérifiez l’association indiquée ci-dessous.",
  ],
  notMapped: ["Not mapped", "Sin asignar", "Non associé"],
  previewRows: [
    "Preview first 8 rows",
    "Ver las primeras 8 filas",
    "Voir les 8 premières lignes",
  ],
  analyseClub: [
    "Analyse this squad",
    "Analizar esta plantilla",
    "Analyser cet effectif",
  ],
  rows: ["rows", "filas", "lignes"],
  dataQuality: [
    "Structural data quality",
    "Calidad estructural del dato",
    "Qualité structurelle des données",
  ],
  rowsWithIssues: ["Rows to review", "Filas que revisar", "Lignes à examiner"],
  importResults: [
    "Import results",
    "Resultado de la importación",
    "Résultats de l’import",
  ],
  importQualityHelp: [
    "Quality checks names, positions, minutes, mapped numeric cells and duplicate IDs. Coverage measures the 21 available event metrics. Neither verifies the original observation. Invalid values are withheld and listed by row.",
    "La calidad comprueba nombres, posiciones, minutos, celdas numéricas asignadas e IDs duplicados. La cobertura mide las 21 métricas de eventos disponibles. Ninguna verifica la observación original. Los valores inválidos se omiten y se detallan por fila.",
    "La qualité vérifie noms, postes, minutes, cellules numériques associées et IDs dupliqués. La couverture mesure les 21 métriques disponibles. Aucune ne vérifie l’observation originale. Les valeurs invalides sont exclues et détaillées par ligne.",
  ],
  importPassedChecks: [
    "checks passed",
    "controles superados",
    "contrôles réussis",
  ],
  importRowChecks: [
    "Row checks",
    "Controles de la fila",
    "Contrôles de la ligne",
  ],
  importComparisonGate: [
    "External percentiles and confidence are withheld unless the row matches an unchanged canonical player in the loaded dataset, with identical position, minutes and observed totals. Other sources or seasons require a validated harmonisation method.",
    "Los percentiles externos y la confianza se omiten salvo que la fila coincida con un jugador canónico del dataset cargado, con idéntica posición, minutos y totales observados. Otras fuentes o temporadas requieren una armonización validada.",
    "Les percentiles externes et la confiance sont masqués sauf correspondance avec un joueur canonique du jeu chargé, avec poste, minutes et totaux observés identiques. D’autres sources ou saisons nécessitent une harmonisation validée.",
  ],
  sourceID: [
    "Source player ID",
    "ID del jugador en origen",
    "ID source du joueur",
  ],
  unnamed: ["Missing name", "Nombre no disponible", "Nom manquant"],
  issues: ["issues", "incidencias", "anomalies"],
  visuals: ["Zones", "Zonas", "Zones"],
  shotZones: ["Shot zones", "Zonas de tiro", "Zones de tir"],
  passZones: ["Pass origins", "Origen de los pases", "Origine des passes"],
  progressivePassZones: [
    "Progressive passes",
    "Pases progresivos",
    "Passes progressives",
  ],
  progressiveCarryZones: [
    "Progressive carries",
    "Conducciones progresivas",
    "Conduites progressives",
  ],
  pressureZones: [
    "Pressure activity",
    "Actividad de presión",
    "Activité de pression",
  ],
  defensiveZones: [
    "Tackles & interceptions",
    "Entradas e intercepciones",
    "Tacles et interceptions",
  ],
  actionType: ["Action type", "Tipo de acción", "Type d’action"],
  matchContext: ["Match context", "Contexto del partido", "Contexte du match"],
  wholeTournament: ["Whole tournament", "Todo el torneo", "Tout le tournoi"],
  locatedActions: [
    "located actions",
    "acciones localizadas",
    "actions localisées",
  ],
  unlocated: ["without a location", "sin ubicación", "sans position"],
  zoneFlows: [
    "Main zone-to-zone flows",
    "Principales flujos entre zonas",
    "Principaux flux entre zones",
  ],
  attackDirection: [
    "Attacking direction",
    "Dirección de ataque",
    "Sens de l’attaque",
  ],
  spatialMethod: [
    "Counts in a coarse 6×4 grid. Coordinates are zone centres. Event volumes depend on opportunity; these are not measures of defensive success.",
    "Recuentos en una cuadrícula de 6×4. Las coordenadas corresponden al centro de cada zona. El volumen depende de las oportunidades; no mide éxito defensivo.",
    "Comptages sur une grille de 6×4. Les coordonnées sont les centres des zones. Les volumes dépendent des opportunités et ne mesurent pas la réussite défensive.",
  ],
  flowMethod: [
    "Eight largest flows. Pass flows include completed open-play passes only. Arrows connect zone centres, not individual trajectories.",
    "Ocho flujos principales. En pases, solo se incluyen los completados en juego abierto. Las flechas conectan centros de zonas, no trayectorias individuales.",
    "Huit flux principaux. Passes réussies en jeu ouvert uniquement. Les flèches relient les centres des zones, pas les trajectoires individuelles.",
  ],
  partialSpatial: [
    "Spatial coverage is incomplete; the map contains observed actions only.",
    "La cobertura espacial es incompleta; el mapa contiene solo las acciones observadas.",
    "Couverture spatiale incomplète ; seules les actions observées sont affichées.",
  ],
  noLocatedActions: [
    "No located actions of this type in the selected exposure.",
    "No hay acciones localizadas de este tipo en el periodo seleccionado.",
    "Aucune action localisée de ce type sur la période sélectionnée.",
  ],
  mostActiveZone: [
    "Most active zone",
    "Zona de mayor actividad",
    "Zone la plus active",
  ],
  ofLocatedActions: [
    "of located actions",
    "de las acciones localizadas",
    "des actions localisées",
  ],
  zoneTable: [
    "View zone counts",
    "Ver recuentos por zona",
    "Voir les comptages par zone",
  ],
  zone: ["Zone", "Zona", "Zone"],
  defensiveThird: ["Defensive third", "Tercio defensivo", "Tiers défensif"],
  middleThird: ["Middle third", "Tercio medio", "Tiers central"],
  attackingThird: ["Attacking third", "Último tercio", "Dernier tiers"],
  leftWide: ["left flank", "banda izquierda", "couloir gauche"],
  leftInside: ["inside left", "interior izquierdo", "intérieur gauche"],
  rightInside: ["inside right", "interior derecho", "intérieur droit"],
  rightWide: ["right flank", "banda derecha", "couloir droit"],

  advancedSearch: ["Advanced search", "Búsqueda avanzada", "Recherche avancée"],
  archetype: [
    "Behaviour archetype",
    "Arquetipo de comportamiento",
    "Archétype de comportement",
  ],
  archetypeStart: [
    "Start filters from an archetype",
    "Iniciar filtros desde un arquetipo",
    "Initialiser les filtres depuis un archétype",
  ],
  chooseArchetype: [
    "Choose a starting point…",
    "Elige un punto de partida…",
    "Choisir un point de départ…",
  ],
  archetypeHelp: [
    "Curated hypotheses about event behaviour. They are not learned roles or proof of tactical suitability.",
    "Hipótesis diseñadas sobre el comportamiento en eventos. No son roles aprendidos ni prueban adecuación táctica.",
    "Hypothèses définies sur les événements. Ni rôles appris ni preuve d’adéquation tactique.",
  ],
  signal: ["Signal", "Señal", "Signal"],
  noFilter: ["No filter", "Sin filtro", "Aucun filtre"],
  minimumPercentile: [
    "Minimum favorable percentile",
    "Percentil favorable mínimo",
    "Percentile favorable minimum",
  ],
  minimumConfidence: [
    "Minimum evidence confidence",
    "Confianza mínima de la evidencia",
    "Confiance minimale des données",
  ],
  sortBy: ["Sort by", "Ordenar por", "Trier par"],
  name: ["Name", "Nombre", "Nom"],
  fullMetricCoverage: [
    "All 21 metrics available",
    "Las 21 métricas disponibles",
    "21 métriques disponibles",
  ],
  benchmarkEligible: [
    "Only benchmark-eligible players",
    "Solo jugadores con comparativa válida",
    "Uniquement les joueurs comparables",
  ],
  resetAdvanced: [
    "Reset advanced filters",
    "Restablecer filtros avanzados",
    "Réinitialiser les filtres avancés",
  ],

  players: [
    "Player intelligence",
    "Inteligencia de jugadores",
    "Analyse des joueurs",
  ],
  recruitment: [
    "Recruitment fit",
    "Encaje de fichajes",
    "Adéquation recrutement",
  ],
  compare: ["Compare", "Comparar", "Comparer"],
  shortlist: ["Shortlist", "Lista de seguimiento", "Liste de suivi"],
  data: ["Data & methodology", "Datos y metodología", "Données et méthode"],
  research: [
    "OPEN DATA RESEARCH",
    "INVESTIGACIÓN CON DATOS ABIERTOS",
    "RECHERCHE EN DONNÉES OUVERTES",
  ],
  historical: [
    "Historical tournament · not current form",
    "Torneo histórico · no representa la forma actual",
    "Tournoi historique · pas la forme actuelle",
  ],
  search: [
    "Search player or national team…",
    "Busca un jugador o una selección…",
    "Rechercher un joueur ou une sélection…",
  ],
  position: ["Position family", "Familia de posición", "Famille de poste"],
  allPositions: ["All positions", "Todas las posiciones", "Tous les postes"],
  team: ["National team", "Selección", "Sélection"],
  allTeams: ["All teams", "Todas las selecciones", "Toutes les sélections"],
  minimum: ["Minimum minutes", "Mínimo de minutos", "Minutes minimum"],
  allMinutes: [
    "All appearances",
    "Todas las participaciones",
    "Toutes les participations",
  ],
  results: ["players", "jugadores", "joueurs"],
  resultOne: ["player", "jugador", "joueur"],
  minutes: ["Minutes", "Minutos", "Minutes"],
  appearances: ["Appearances", "Partidos", "Matchs"],
  starts: ["Starts", "Titularidades", "Titularisations"],
  goals: ["Goals", "Goles", "Buts"],
  assists: ["Assists", "Asistencias", "Passes décisives"],
  cohort: [
    "Comparison cohort",
    "Grupo de comparación",
    "Groupe de comparaison",
  ],
  peers: ["peers", "comparables", "comparables"],
  min: ["min", "min", "min"],
  per90: ["Per 90", "Por 90", "Par 90"],
  percentile: [
    "Peer percentile",
    "Percentil del grupo",
    "Percentile du groupe",
  ],
  coverage: [
    "Metric coverage",
    "Cobertura de métricas",
    "Couverture des métriques",
  ],
  confidence: [
    "Evidence confidence",
    "Confianza de la evidencia",
    "Confiance des données",
  ],
  confidenceHelp: [
    "Evidence depth across all 21 metrics, adjusted for minutes (up to 900) and the reference sample of each metric (up to 30 players). Metrics with fewer than 10 observations do not add confidence. This is not a probability or a player rating.",
    "Profundidad de evidencia entre las 21 métricas, ajustada por minutos (hasta 900) y por la muestra de cada métrica (hasta 30 jugadores). Una métrica con menos de 10 observaciones no aporta confianza. No es una probabilidad ni una valoración del jugador.",
    "Profondeur des données sur les 21 métriques, ajustée par le temps de jeu (jusqu’à 900 minutes) et l’échantillon de chacune (jusqu’à 30 joueurs). Une métrique avec moins de 10 observations n’ajoute pas de confiance. Ce n’est ni une probabilité ni une note du joueur.",
  ],
  coverageHelp: [
    "Observed metrics out of the 21 event metrics in this profile. Tracking, market and current-club context are excluded.",
    "Métricas observadas entre las 21 métricas de eventos de esta ficha. Excluye tracking, mercado y club actual.",
    "Métriques observées parmi les 21 métriques événementielles. Tracking, marché et club actuel sont exclus.",
  ],
  fitHelp: [
    "Compatibility with the weighted requirements. Fit, player quality, confidence and hard-filter eligibility are separate.",
    "Compatibilidad con los requisitos y sus pesos. Encaje, calidad, confianza y cumplimiento de filtros son conceptos separados.",
    "Compatibilité avec les exigences pondérées. Adéquation, qualité, confiance et admissibilité sont séparées.",
  ],
  fitConfidenceHelp: [
    "Evidence supporting this brief: weighted share of scored requirements × exposure (up to 900 minutes), adjusted separately for each metric's reference sample (up to 30 players). At least 10 observations are required per metric; the reference always uses ≥180 minutes. This is not a success probability or player rating.",
    "Evidencia que sostiene este brief: proporción ponderada de requisitos evaluados × exposición (hasta 900 minutos), ajustada por la muestra de cada métrica (hasta 30 jugadores). Se exigen 10 observaciones por métrica; la referencia siempre utiliza ≥180 minutos. No es una probabilidad de éxito ni una valoración del jugador.",
    "Données étayant ce profil : part pondérée des critères évalués × temps de jeu (jusqu’à 900 minutes), ajustée par l’échantillon de chaque métrique (jusqu’à 30 joueurs). Il faut 10 observations par métrique ; la référence utilise toujours ≥180 minutes. Ce n’est ni une probabilité de réussite ni une note du joueur.",
  ],
  briefCoverage: [
    "Brief coverage",
    "Cobertura del perfil buscado",
    "Couverture du profil recherché",
  ],
  requirementScore: [
    "Requirement score",
    "Puntuación del requisito",
    "Score du critère",
  ],
  requirementWeight: ["Weight", "Peso", "Poids"],
  fitCalculation: [
    "Fit = sum(weight × requirement score) / sum(scored weights). Each available higher/lower preference uses score = 100 / (1 + exp(−1.25 × z)), where z compares the observation with the reference mean and population standard deviation; lower-is-preferred reverses its sign. The reference always uses the same position and tournament, ≥180 minutes and ≥10 observations per metric. Missing evidence is not imputed. Hard limits change eligibility, not the score.",
    "Fit = suma(peso × puntuación del requisito) / suma de pesos puntuados. Cada preferencia de más/menos usa puntuación = 100 / (1 + exp(−1,25 × z)), donde z compara el dato con la media y la desviación típica poblacional del grupo; si se prefiere menos, se invierte el signo. La referencia siempre usa la misma posición y torneo, ≥180 minutos y ≥10 observaciones por métrica. No se rellenan datos ausentes. Los límites obligatorios cambian la elegibilidad, no la puntuación.",
    "Fit = somme(poids × score du critère) / somme des poids évalués. Chaque préférence plus/moins utilise score = 100 / (1 + exp(−1,25 × z)), où z compare la valeur à la moyenne et à l’écart-type de la population de référence ; une préférence pour moins inverse le signe. La référence conserve le même poste et tournoi, ≥180 minutes et ≥10 observations par métrique. Les valeurs manquantes ne sont pas imputées. Les limites obligatoires changent l’éligibilité, pas le score.",
  ],
  profile: ["Profile", "Perfil", "Profil"],
  evidence: ["Evidence", "Evidencia", "Données"],
  similarity: ["Similar profiles", "Perfiles similares", "Profils similaires"],
  statistical: [
    "Similar statistical behaviour within this cohort. Not a replacement recommendation.",
    "Comportamiento estadístico similar en este grupo. No equivale a recomendar un sustituto.",
    "Comportement statistique similaire dans ce groupe. Pas une recommandation de remplacement.",
  ],
  strengths: [
    "High cohort signals",
    "Señales altas en el grupo",
    "Signaux élevés du groupe",
  ],
  review: ["Signals to review", "Señales para revisar", "Signaux à examiner"],
  signalsUnavailable: [
    "There is not enough comparable evidence to assess these signals.",
    "No hay evidencia comparable suficiente para evaluar estas señales.",
    "Les données comparables ne suffisent pas pour évaluer ces signaux.",
  ],
  noSignals: [
    "No qualifying signals in this sample.",
    "No hay señales que superen el umbral en esta muestra.",
    "Aucun signal ne dépasse le seuil.",
  ],
  missing: [
    "Unavailable context",
    "Contexto no disponible",
    "Contexte indisponible",
  ],
  missingText: [
    "Age, preferred foot, contracts, transfer values, injuries, current club and tracking are unavailable.",
    "No hay edad, pie preferido, contratos, valor de traspaso, lesiones, club actual ni tracking.",
    "Âge, pied préféré, contrats, valeur de transfert, blessures, club actuel et tracking sont indisponibles.",
  ],
  sampleWarning: [
    "A tournament is a short, selected sample. Team role, opponents and possession affect these numbers. Combine them with video and scouting.",
    "Un torneo es una muestra corta y seleccionada. El rol, los rivales y la posesión influyen. Combina las cifras con vídeo y scouting.",
    "Un tournoi est un échantillon court et sélectionné. Rôle, adversaires et possession influencent les chiffres. Complétez par la vidéo et le scouting.",
  ],
  noBenchmark: [
    "Benchmark withheld: requires 180 minutes, 10 comparable players and a supported outfield position.",
    "Comparativa no publicada: exige 180 minutos, 10 comparables y una posición de campo compatible.",
    "Comparaison non publiée : exige 180 minutes, 10 comparables et un poste de champ pris en charge.",
  ],
  rankHelp: [
    "Midrank within the same competition, season, gender and dominant position. Bars reverse direction for control losses. More volume does not always mean better football.",
    "Rango medio en la misma competición, temporada, género y posición dominante. La barra se invierte para pérdidas de control. Más volumen no siempre significa mejor fútbol.",
    "Rang moyen dans la même compétition, saison, catégorie et au même poste dominant. Barre inversée pour les pertes de contrôle. Plus de volume ne signifie pas toujours mieux jouer.",
  ],
  addedTime: [
    "Minutes include stoppage and extra time; breaks and shootouts are excluded.",
    "Incluye descuento y prórroga; excluye descansos y tandas de penaltis.",
    "Inclut temps additionnel et prolongations, sans pauses ni tirs au but.",
  ],
  saved: ["Saved", "Guardado", "Enregistré"],
  save: ["Save player", "Guardar jugador", "Suivre ce joueur"],
  remove: ["Remove", "Quitar", "Retirer"],
  addCompare: [
    "Add to comparison",
    "Añadir a comparación",
    "Ajouter à la comparaison",
  ],
  inCompare: ["In comparison", "En comparación", "Dans la comparaison"],
  clear: ["Clear", "Vaciar", "Vider"],
  empty: [
    "No players match these filters.",
    "Ningún jugador cumple estos filtros.",
    "Aucun joueur ne correspond aux filtres.",
  ],
  emptyShortlist: [
    "Save players from a profile to build your shortlist.",
    "Guarda jugadores desde sus fichas para crear tu lista.",
    "Enregistrez des joueurs depuis leur fiche.",
  ],
  localOnly: [
    "Saved on this browser. No account or cloud synchronization.",
    "Guardado en este navegador. Sin cuenta ni sincronización en la nube.",
    "Enregistré dans ce navigateur. Sans compte ni synchronisation.",
  ],
  export: [
    "Export analysis CSV",
    "Exportar análisis CSV",
    "Exporter l’analyse CSV",
  ],
  compareIntro: [
    "Up to three players. Percentiles are relative to each player’s own position cohort.",
    "Hasta tres jugadores. Cada percentil es relativo al grupo de posición de su jugador.",
    "Trois joueurs maximum. Chaque percentile est relatif au groupe de poste du joueur.",
  ],
  compareEmpty: [
    "Open a profile and add players to comparison.",
    "Abre una ficha y añade jugadores a la comparación.",
    "Ouvrez une fiche et ajoutez des joueurs.",
  ],
  compareLimit: [
    "Comparison holds three players. Remove one to add another.",
    "La comparación admite tres jugadores. Quita uno para añadir otro.",
    "Trois joueurs maximum. Retirez-en un pour en ajouter un autre.",
  ],
  role: ["Role brief", "Perfil buscado", "Profil recherché"],
  roleName: [
    "Progression & creation",
    "Progresión y creación",
    "Progression et création",
  ],
  weights: [
    "Requirement weights",
    "Pesos de los requisitos",
    "Poids des exigences",
  ],
  run: ["Rank candidates", "Ordenar candidatos", "Classer les candidats"],
  running: ["Calculating…", "Calculando…", "Calcul en cours…"],
  fit: ["Fit score", "Encaje", "Adéquation"],
  why: ["Why this player?", "¿Por qué este jugador?", "Pourquoi ce joueur ?"],
  contribution: [
    "Contribution to fit",
    "Aportación al encaje",
    "Contribution au score",
  ],
  eligible: ["Eligible", "Cumple los filtros", "Admissible"],
  eligibleCandidate: [
    "eligible candidate",
    "candidato que cumple los filtros",
    "candidat admissible",
  ],
  eligibleCandidates: [
    "eligible candidates",
    "candidatos que cumplen los filtros",
    "candidats admissibles",
  ],
  showingCandidates: [
    "Candidates shown",
    "Candidatos mostrados",
    "Candidats affichés",
  ],
  moreCandidates: [
    "Show more candidates",
    "Mostrar más candidatos",
    "Afficher plus de candidats",
  ],
  fitDisclaimer: [
    "Role requirements only. Not a universal player rating or a model of fit to a club’s tactics.",
    "Solo mide requisitos del rol. No es una valoración universal ni un modelo de encaje con la táctica de un club.",
    "Exigences du rôle uniquement. Ni note universelle ni modèle d’adéquation tactique à un club.",
  ],
  offlineBrief: [
    "Saved analysis uses a fixed brief. Connect the analysis service to edit requirements.",
    "El análisis guardado utiliza perfiles fijos. Conecta el motor de análisis para editar los requisitos.",
    "L’analyse enregistrée utilise des profils fixes. Connectez le service d’analyse pour modifier les exigences.",
  ],
  noFit: [
    "No candidate meets the mandatory requirements. Review the constraints or show excluded candidates to see why.",
    "Ningún candidato cumple los requisitos obligatorios. Revisa los límites o muestra los excluidos para ver el motivo.",
    "Aucun candidat ne remplit les exigences obligatoires. Revoyez les contraintes ou affichez les exclus pour comprendre pourquoi.",
  ],
  fitSmallReference: [
    "Not enough comparable players to calculate Fit: at least 10 in the same position with 180 minutes are required.",
    "No hay suficientes comparables para calcular el encaje: se necesitan al menos 10 de la misma posición con 180 minutos.",
    "Pas assez de joueurs comparables pour calculer l’adéquation : il en faut au moins 10 au même poste avec 180 minutes.",
  ],
  api: [
    "Analysis connected",
    "Motor de análisis conectado",
    "Analyse connectée",
  ],
  snapshot: [
    "Saved real analysis",
    "Análisis real guardado",
    "Analyse réelle enregistrée",
  ],
  snapshotHelp: [
    "The saved view uses the same real observations. Click to reconnect and enable editable briefs and file imports.",
    "La consulta guardada utiliza las mismas observaciones reales. Pulsa para reconectar y activar perfiles editables e importación de archivos.",
    "La vue enregistrée utilise les mêmes observations réelles. Cliquez pour reconnecter et activer les profils modifiables et les imports.",
  ],
  loading: [
    "Loading real player analysis…",
    "Cargando análisis de jugadores reales…",
    "Chargement des analyses réelles…",
  ],
  error: [
    "Could not load this analysis.",
    "No se ha podido cargar este análisis.",
    "Impossible de charger cette analyse.",
  ],
  retry: ["Try again", "Reintentar", "Réessayer"],
  source: ["Data source", "Fuente", "Source"],
  matches: ["Matches", "Partidos", "Matchs"],
  events: ["Events", "Eventos", "Événements"],
  teams: ["National teams", "Selecciones", "Sélections"],
  scope: ["Coverage scope", "Alcance de la cobertura", "Périmètre couvert"],
  scopeText: [
    "Coverage is measured against available matches listed by StatsBomb at the pinned revision, not worldwide or current-player coverage.",
    "Se compara con los partidos disponibles de StatsBomb en la revisión fijada. No mide la cobertura mundial ni la de jugadores actuales.",
    "Couverture des matchs disponibles chez StatsBomb à la révision fixée, pas du football mondial ni des joueurs actuels.",
  ],
  methodological: [
    "Analytical safeguards",
    "Criterios de integridad",
    "Garanties analytiques",
  ],
  methodology: ["Methodology", "Metodología", "Méthodologie"],
  formula: [
    "Definition & denominator",
    "Definición y denominador",
    "Définition et dénominateur",
  ],
  supported: [
    "Available analysis",
    "Análisis disponibles",
    "Analyses disponibles",
  ],
  supportedText: [
    "Real player search, event profiles, explained similarity, curated role briefs, comparison, scouting notes, zone visualisations, squad planning and CSV/XLSX imports with evidence checks.",
    "Búsqueda real, fichas de eventos, similitud explicada, perfiles de rol, comparación, notas de scouting, visualizaciones por zonas, planificación de plantilla e importación CSV/XLSX con controles de evidencia.",
    "Recherche réelle, profils événementiels, similarité expliquée, profils de rôle, comparaison, notes, visualisations par zones, planification d’effectif et imports CSV/XLSX contrôlés.",
  ],
  roadmap: [
    "Limits of these observations",
    "Límites de estas observaciones",
    "Limites de ces observations",
  ],
  roadmapText: [
    "No current-club, contract, injury or market information. No tracking or league-strength adjustment. Archetypes are curated hypotheses, not learned tactical roles. Cross-source comparisons need validated harmonisation.",
    "Sin información de club actual, contratos, lesiones o mercado. Sin tracking ni ajuste de fuerza de liga. Los arquetipos son hipótesis diseñadas, no roles tácticos aprendidos. Comparar fuentes exige armonización validada.",
    "Pas de club actuel, contrats, blessures ou marché. Pas de tracking ni d’ajustement de niveau des ligues. Les archétypes sont des hypothèses conçues, pas des rôles tactiques appris. Comparer des sources exige une harmonisation validée.",
  ],
  sourceTerms: [
    "StatsBomb terms",
    "Condiciones de StatsBomb",
    "Conditions StatsBomb",
  ],
  credits: [
    "Data: StatsBomb · Independent analysis by Aarón Expósito",
    "Datos: StatsBomb · Análisis independiente de Aarón Expósito",
    "Données : StatsBomb · Analyse indépendante par Aarón Expósito",
  ],
  noncommercial: [
    "Free, non-commercial research demo. Provider terms restrict raw-data redistribution and commercial exploitation.",
    "Demo gratuita de investigación no comercial. La licencia restringe la redistribución de datos y la explotación comercial.",
    "Démo gratuite de recherche non commerciale. Les conditions limitent redistribution et exploitation commerciale.",
  ],
  author: ["Created by", "Creado por", "Créé par"],
  language: ["Language", "Idioma", "Langue"],
  theme: ["Appearance", "Apariencia", "Apparence"],
  persona: ["Workspace", "Espacio de trabajo", "Espace de travail"],
  green: ["Tactical Green", "Verde táctico", "Vert tactique"],
  dark: ["Stadium Dark", "Estadio oscuro", "Stade sombre"],
  light: ["Classic Light", "Claro clásico", "Clair classique"],
  finishing: ["Finishing", "Finalización", "Finition"],
  creation: ["Creation", "Creación", "Création"],
  progression: ["Progression", "Progresión", "Progression"],
  possession: ["Possession", "Posesión", "Possession"],
  defending: ["Defending", "Defensa", "Défense"],
  positionNote: [
    "Position follows the greatest on-pitch exposure in this tournament, not a permanent career role.",
    "La posición corresponde al mayor tiempo jugado en este torneo, no a un rol permanente.",
    "Poste déterminé par le temps de jeu dominant dans ce tournoi, pas par un rôle permanent.",
  ],
  mixed: [
    "Mixed position exposure",
    "Participación en varias posiciones",
    "Temps de jeu à plusieurs postes",
  ],
  noSimilar: [
    "Similarity withheld: insufficient comparable evidence.",
    "Similitud no publicada: evidencia comparable insuficiente.",
    "Similarité non publiée : données insuffisantes.",
  ],
  reference: ["Reference", "Referencia", "Référence"],
  availability: [
    "Coverage & reliability",
    "Cobertura y fiabilidad",
    "Couverture et fiabilité",
  ],
  details: [
    "Show technical lineage",
    "Ver trazabilidad técnica",
    "Traçabilité technique",
  ],
  revision: ["Source revision", "Revisión de origen", "Révision source"],
  featureVersion: [
    "Feature version",
    "Versión de métricas",
    "Version des métriques",
  ],
  checkPass: [
    "Scorelines and minutes validated for every ingested match.",
    "Marcadores y minutos validados en todos los partidos procesados.",
    "Scores et minutes validés pour chaque match traité.",
  ],
  qualityNotes: [
    "Provider quality notes",
    "Observaciones del proveedor",
    "Observations fournisseur",
  ],
  fixedCohort: [
    "Percentile reference: ≥180 minutes. Search filters do not change the benchmark.",
    "Referencia: ≥180 minutos. Los filtros de búsqueda no cambian el grupo.",
    "Référence : ≥180 minutes. Les filtres ne changent pas le groupe.",
  ],
  selectionOutside: [
    "The selected profile is outside the active search filters.",
    "La ficha seleccionada no coincide con los filtros activos.",
    "La fiche sélectionnée ne correspond pas aux filtres actifs.",
  ],
  observed: ["Observed", "Observado", "Observé"],
  hardConstraints: [
    "Hard constraints",
    "Filtros obligatorios",
    "Contraintes obligatoires",
  ],
  constraintHelp: [
    "These bounds exclude candidates even if their weighted fit is high. Missing evidence cannot pass a hard constraint.",
    "Estos límites excluyen candidatos aunque su encaje ponderado sea alto. Un dato ausente no supera un requisito obligatorio.",
    "Ces limites excluent un candidat même si son score est élevé. Une donnée absente ne valide pas une contrainte.",
  ],
  lowerBound: ["Minimum", "Mínimo", "Minimum"],
  upperBound: ["Maximum", "Máximo", "Maximum"],
  invalidBounds: [
    "A minimum exceeds its maximum.",
    "Un mínimo supera su máximo.",
    "Un minimum dépasse son maximum.",
  ],
  onlyEligible: [
    "Show eligible candidates only",
    "Mostrar solo candidatos que cumplen los filtros",
    "Afficher seulement les candidats admissibles",
  ],
  excluded: [
    "Excluded by constraints",
    "Excluidos por filtros",
    "Exclus par contraintes",
  ],
  excludedOne: [
    "Excluded by constraints",
    "Excluido por filtros",
    "Exclu par contraintes",
  ],
  unavailableFilters: [
    "Age and preferred-foot filters require an additional verified source. Neither field is inferred.",
    "Filtrar por edad o pie requiere otra fuente verificada. No se infiere ninguno de estos datos.",
    "Les filtres âge et pied exigent une source vérifiée supplémentaire. Aucune inférence de ces données.",
  ],
  fitCoverageHelp: [
    "Weighted share of the brief with comparable observations. This denominator differs from the 21-metric profile coverage.",
    "Fracción ponderada del perfil buscado con observaciones comparables. El denominador difiere de las 21 métricas de la ficha.",
    "Part pondérée du profil recherché disposant de données comparables. Dénominateur distinct des 21 métriques de la fiche.",
  ],
  back: ["Back to players", "Volver a jugadores", "Retour aux joueurs"],
  whySimilar: [
    "Why are they similar?",
    "¿Por qué son similares?",
    "Pourquoi sont-ils similaires ?",
  ],
  closest: [
    "Closest dimensions",
    "Dimensiones más próximas",
    "Dimensions les plus proches",
  ],
  differences: [
    "Largest differences",
    "Mayores diferencias",
    "Différences principales",
  ],
  target: ["Selected player", "Jugador seleccionado", "Joueur sélectionné"],
  candidate: ["Candidate", "Candidato", "Candidat"],
  difference: [
    "Difference (standard deviations)",
    "Diferencia (desviaciones típicas)",
    "Écart (écarts-types)",
  ],
  distanceShare: [
    "Share of distance",
    "Peso en la distancia",
    "Part de la distance",
  ],
  similarityHelp: [
    "Score = 100 / (1 + RMS standardized distance). At least three shared metrics are needed; each must vary across at least 10 observed reference players. Neither probability nor quality.",
    "Índice = 100 / (1 + distancia RMS estandarizada). Se necesitan al menos tres métricas compartidas; cada una debe variar entre al menos 10 jugadores de referencia observados. No es probabilidad ni calidad.",
    "Indice = 100 / (1 + distance RMS standardisée). Il faut au moins trois métriques partagées ; chacune doit varier parmi au moins 10 joueurs de référence observés. Ni probabilité ni qualité.",
  ],
  referencePlayers: [
    "Reference players",
    "Jugadores de referencia",
    "Joueurs de référence",
  ],
  skipContent: ["Skip to content", "Ir al contenido", "Aller au contenu"],
  updatingSearch: [
    "Updating results…",
    "Actualizando resultados…",
    "Mise à jour des résultats…",
  ],
  similarityMissing: [
    "Not observed for both players",
    "Sin observación en ambos jugadores",
    "Non observé chez les deux joueurs",
  ],
  similarityConstant: [
    "No variation in the reference",
    "Sin variación en la referencia",
    "Aucune variation dans la référence",
  ],
  similaritySparse: [
    "Fewer than 10 reference observations",
    "Menos de 10 observaciones de referencia",
    "Moins de 10 observations de référence",
  ],
  fitDelta: [
    "Points above / below neutral fit (50)",
    "Puntos por encima / debajo del encaje neutro (50)",
    "Points au-dessus / en dessous du score neutre (50)",
  ],
} as const;
export type Translation = { [K in keyof typeof words]: string };
export const translations = Object.fromEntries(
  (["en", "es", "fr"] as const).map((lang, i) => [
    lang,
    Object.fromEntries(
      Object.entries(words).map(([key, values]) => [key, values[i]]),
    ),
  ]),
) as Record<Language, Translation>;
const positionsRaw = {
  GK: ["Goalkeeper", "Portero", "Gardien"],
  CB: ["Centre-back", "Central", "Défenseur central"],
  FB: ["Full-back / wing-back", "Lateral / carrilero", "Latéral / piston"],
  DM: ["Defensive midfield", "Mediocentro defensivo", "Milieu défensif"],
  CM: ["Central midfield", "Mediocentro", "Milieu central"],
  AM: ["Attacking midfield", "Mediapunta", "Milieu offensif"],
  W: ["Wide midfield / wing", "Banda / extremo", "Milieu excentré / ailier"],
  ST: ["Forward", "Delantero", "Attaquant"],
};
function trMap<T extends string>(
  value: Record<T, string[]>,
): Record<T, Record<Language, string>> {
  return Object.fromEntries(
    Object.entries(value).map(([k, v]) => [
      k,
      {
        en: (v as string[])[0],
        es: (v as string[])[1],
        fr: (v as string[])[2],
      },
    ]),
  ) as Record<T, Record<Language, string>>;
}
export const positions = trMap(positionsRaw);
export const personas = trMap<Persona>({
  sporting_director: [
    "Sporting Director",
    "Director deportivo",
    "Directeur sportif",
  ],
  scout: ["Scout", "Scout", "Recruteur"],
  coach: ["Coach", "Entrenador", "Entraîneur"],
  analyst: ["Analyst", "Analista", "Analyste"],
  player: ["Player", "Jugador", "Joueur"],
});
export function fmt(
  value: number | null | undefined,
  lang: Language,
  digits = 1,
): string {
  return value == null
    ? "—"
    : new Intl.NumberFormat(lang, {
        maximumFractionDigits: digits,
        minimumFractionDigits: digits,
      }).format(value);
}
export function positionName(key: string, lang: Language): string {
  if (key === "UNK")
    return {
      en: "Unverified position",
      es: "Posición sin verificar",
      fr: "Poste non vérifié",
    }[lang];
  return positions[key as keyof typeof positions]?.[lang] || key;
}
