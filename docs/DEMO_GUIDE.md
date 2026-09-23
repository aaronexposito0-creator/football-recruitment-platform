# Recorrido de demostración

Duración orientativa: cinco minutos. Inicia la aplicación con `python scripts/dev.py --install` o abre la demo ya desplegada. No hace falta una clave de datos. El indicador de estado distingue análisis conectado y análisis real guardado.

## 1. Scout: de una pregunta a evidencia

Busca **Lamine Yamal**. Muestra los 531,0 minutos y los siete partidos del torneo. Explica un denominador abriendo una métrica: los 18 tiros producen aproximadamente 3,05 tiros/90. Su grupo de extremos tiene 30 jugadores con al menos 180 minutos. Cobertura 100% y confianza 59/100 responden a preguntas diferentes.

Abre **Perfiles similares** y despliega una explicación. Las diferencias por dimensión justifican la distancia; no prueban que un jugador pueda ejecutar las mismas tareas tácticas. Guarda un jugador y añade una nota claramente humana.

## 2. Jugador y analista: saber cuándo no concluir

Selecciona todas las participaciones y busca **Jasmin Kurtič**. Tiene aproximadamente 0,56 minutos. La ficha conserva observaciones, pero no ofrece un percentil ni una recomendación de similitud con evidencia insuficiente. Su cobertura no convierte esa exposición en una muestra fiable.

Añade Yamal y Kurtič a comparación. Las celdas sin referencia deben permanecer vacías o expresamente no disponibles. Cambia EN/ES/FR: los datos y las identidades no cambian. Prueba una búsqueda inexistente y después restablece filtros.

## 3. Director deportivo: criterios, no una nota universal

Abre **Encaje de fichajes**, familia de mediocentro, arquetipo de ida y vuelta. En el brief predefinido, Modrić combina Fit alto con evidencia limitada: el grupo es pequeño y solo cubre este torneo. Abre **Por qué este jugador** y relaciona las contribuciones con pesos y métricas.

Con el servicio conectado, cambia un peso y establece un mínimo obligatorio imposible para una métrica. Recalcula: el candidato debe quedar excluido; al mostrar solo elegibles puede quedar una lista vacía. Restaura el arquetipo. Un criterio obligatorio y una preferencia no son lo mismo.

## 4. Entrenador: planificación de exposición

Abre la plantilla de **España**. Son 25 participantes observados, no toda la convocatoria actual. Cambia estructura y mínimo de minutos, simula la salida de Rodri y revisa las exclusiones. Un hueco significa exposición disponible frente al objetivo de planificación, no falta de calidad. Cambia de pantalla y vuelve para comprobar que el escenario se conserva.

## 5. My Club: demostrar el importador con datos reales

Con el servicio conectado, pulsa **Probar con España · Euro 2024**. Esta opción crea un CSV con los 25 jugadores reales del catálogo y lo procesa como cualquier archivo subido. No incluye notas de la lista personal.

Revisa la asignación de columnas y pulsa analizar. Totales y minutos reconstruyen las tasas; el round-trip canonical permite referencias solo donde hay evidencia suficiente. No asignes columnas `/90` como si fuesen totales. Comprueba también que cambiar una asignación invalida el análisis anterior y obliga a recalcular.

Para una tabla propia, usa la plantilla vacía. Deja desconocidos en blanco; cero significa una observación real de cero. No subas datos confidenciales a una demo pública. Los resultados del importador permanecen en memoria hasta recargar.

## Comprobaciones antes de compartir la URL

- Los cinco roles llevan al flujo esperado; adelante/atrás y cambios de idioma conservan el contexto que corresponde.
- Búsqueda vacía, muestra insuficiente y requisitos imposibles muestran estados coherentes.
- CSV y XLSX funcionan desde el selector real; cambios de columnas y decimales no dejan resultados anteriores visibles.
- La descarga CSV termina y se puede reimportar, sin notas interpretadas como fórmulas.
- En móvil se pueden usar filtros, pestañas y tablas sin controles inaccesibles.
- Se mantienen visibles fuente, periodo histórico y las diferencias entre Fit, cobertura y confianza.

Las pruebas HTTP automatizadas y los recorridos de escritorio cubren gran parte de esto. La aceptación del upload/download interactivo, móvil y servicio alojado debe registrarse por separado; no está implícita en un build correcto.
