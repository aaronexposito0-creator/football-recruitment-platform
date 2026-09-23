# Textos de presentación

Textos preparados para copiar; no se han publicado en GitHub ni en LinkedIn. Añade enlaces reales solo después del despliegue. Evita afirmar que existe una demo pública mientras no esté verificada.

Al publicar análisis o capturas, adjunta una vista con el logo y la atribución de StatsBomb visibles; conserva el carácter de investigación no comercial. La descripción de texto no sustituye ese requisito de acreditación.

## Descripción breve del repositorio

Explainable football recruitment research with real Euro 2024 data, reproducible Python pipelines, FastAPI and Next.js. Player profiles, similarity, weighted fit and squad analysis with traceable evidence.

## Temas de GitHub

`football-analytics`, `sports-analytics`, `data-engineering`, `python`, `fastapi`, `nextjs`, `typescript`, `polars`, `duckdb`, `parquet`, `explainable-ai`, `recruitment`

## Presentación breve en español

Football Recruitment Platform es un producto de investigación que he desarrollado para conectar ingeniería de datos, análisis de fútbol y una interfaz utilizable por perfiles deportivos. Parte de observaciones reales de Euro 2024 y permite buscar jugadores, inspeccionar métricas comparables, explicar similitud, definir criterios de fichaje y explorar profundidad de plantilla.

La parte central es la trazabilidad: minutos reconstruidos, denominadores explícitos, cohortes comparables y resultados que indican qué información falta. Fit Score, calidad del jugador, confianza y cobertura no son conceptos intercambiables.

El stack combina Python, Polars, Parquet, DuckDB, FastAPI, Next.js y TypeScript. Incluye pruebas de cálculo, contratos de datos, integración HTTP y una instalación reproducible. StatsBomb proporciona los datos; el trabajo de aplicación y análisis es propio y respeta el marco de investigación no comercial.

## Borrador de LinkedIn

He estado construyendo Football Recruitment Platform para resolver una pregunta concreta: ¿cómo pasar de eventos de fútbol a una recomendación que se pueda explicar y revisar?

El proyecto utiliza observaciones reales de Euro 2024: 51 partidos, 187.924 eventos y 493 jugadores con participación. He trabajado el recorrido completo: ingesta reproducible, modelo canónico, minutos, métricas por 90, cohortes, percentiles, API e interfaz.

La plataforma permite buscar y comparar jugadores, explorar similitud, construir briefs de fichaje y revisar escenarios de plantilla. My Club incorpora CSV/XLSX con comprobaciones de calidad y mantiene separados los datos que no admiten una comparación válida.

Una decisión de diseño ha guiado todo el trabajo: un Fit alto no significa un jugador mejor, y una cobertura alta no implica evidencia suficiente. Cada resultado debe enseñar sus criterios, su referencia y sus límites.

Python · Polars · DuckDB · Parquet · FastAPI · Next.js · TypeScript.

Datos: StatsBomb Open Data. Análisis de investigación no comercial; no es un servicio con licencia comercial para clubes.

Me interesa seguir desarrollando esta combinación de ingeniería, análisis de datos y producto, especialmente en entornos donde los resultados deban ser útiles y defendibles ante profesionales.

## Explicación de 45 segundos en una entrevista

“Construí una plataforma completa para transformar eventos de fútbol en perfiles y criterios de búsqueda explicables. El reto principal no fue dibujar un dashboard: fue garantizar que minutos, denominadores, cohortes y datos ausentes significaran lo mismo en la pipeline, la API y el frontend. Por eso una importación incompatible no recibe percentiles del torneo y un jugador con poca exposición no obtiene una recomendación artificialmente segura. Puedo enseñar tanto el recorrido de usuario como la reproducción de los cálculos y los tests de integración.”

## Afirmaciones que deben evitarse

No atribuirse la recogida de los eventos, el modelo xG del proveedor, validación por clubes, mejora de resultados deportivos, predicción de fichajes, cobertura de ligas actuales, uso de tracking ni un modelo aprendido de roles. No presentar una captura o una prueba HTTP como validación completa de móvil o de despliegue.
