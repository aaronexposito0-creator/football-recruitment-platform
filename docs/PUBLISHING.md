# Publicación de la demo

Estado verificado el **23-09-2026**: paquete fuente completo preparado desde el workspace existente; **81 tests Python, 36 frontend, typecheck, ESLint, Ruff, formatos, build, 13 grupos HTTP y 3 de arranque de producción aprobados**. También se verificó el ZIP extraído: bytes, CRC y escaneo correctos, auditoría matemática aprobada y **81 tests Python en 13,59 s**, reutilizando las dependencias instaladas. Los tiempos y el alcance exacto están en `HANDOFF_STATE.md` y `validation/PUBLICATION_CHECKS.json`. No se ha creado un repositorio remoto ni una demo pública. Los resultados locales no sustituyen al primer build de contenedor ni al QA de la URL definitiva.

## 0. Extraer el proyecto completo

Descarga `Football_Recruitment_Platform_v0.2_Showcase_Aaron_Exposito.zip` y extrae la carpeta `football-recruitment-platform`. Contiene el proyecto actual: código Python/TypeScript, tests, análisis derivados, capturas, configuración y documentación. El manifiesto `PACKAGE_CONTENTS.sha256` permite comprobar los bytes incluidos. No contiene eventos originales, Parquet privado, uploads, dependencias, entornos virtuales ni builds; estos últimos se generan con los comandos del README.

Publica **el contenido extraído**, con `README.md`, `Dockerfile` y `render.yaml` en la raíz del repositorio. No subas solamente el ZIP ni anides el proyecto bajo otra carpeta. Conserva la configuración de Git/CI incluida en el paquete.

En Linux, desde la carpeta extraída, puedes verificar el contenido con `sha256sum -c PACKAGE_CONTENTS.sha256`. En cualquier sistema con Python 3.12, Node 24 y Git, `python scripts/dev.py --install` instala dependencias y arranca la demo local. No hace falta descargar datos de StatsBomb.

## 1. Revisar la publicación

Desde la raíz y con `.venv` activado:

```bash
python -m scripts.check_publication
python -m scripts.validate_analysis
python -m pytest -q
npm test
npm run typecheck
npm run lint
npm run format:check
npm run build
python -m scripts.verify_stack --standalone
python -m scripts.verify_dev --production
```

El escáner examina también archivos ya añadidos a Git aunque después se incluyan en `.gitignore`. Señala la ubicación, nunca el valor de un secreto. Es una comprobación específica, no una garantía universal. Los datos originales de StatsBomb, entornos, dependencias y uploads no deben añadirse con `git add --force`.

La demo es de investigación **no comercial**. Mantén la atribución y el logo de StatsBomb. MIT cubre el código original; no relicencia datos, agregados ni logo. Revisa `DATA_SOURCES.md` y el acuerdo enlazado. No presentes esta publicación como un servicio operativo con licencia comercial para clubes.

El acuerdo solicita registrar el interés del usuario y facilitar nombre/email al proveedor. Revisa y completa ese trámite directamente con StatsBomb si aún no lo has hecho; no se ha enviado tu información personal ni aceptado condiciones en tu nombre.

## 2. Crear el repositorio en GitHub

1. En tu cuenta `aaronexposito0-creator`, crea un repositorio vacío llamado `football-recruitment-platform`. Elige la visibilidad que quieras publicar. No añadas otro README, licencia o gitignore: ya existen en el proyecto.
2. En el ordenador que contiene este proyecto, abre una terminal en su raíz. Usa autenticación de GitHub mediante el navegador/Git Credential Manager o GitHub Desktop. No pegues tokens en el chat, en URLs ni en archivos del proyecto.
3. Si aún no hay repositorio Git local, ejecuta:

```bash
git init -b main
git add .
python -m scripts.check_publication
git diff --cached --stat
git commit -m "Prepare reproducible football recruitment showcase"
```

4. Copia la URL HTTPS que muestra GitHub para **ese repositorio**. Ejecuta `git remote add origin` seguido de esa URL y después:

```bash
git push -u origin main
```

Si ya existe `origin`, comprueba `git remote -v`; no lo sobrescribas ni uses force-push. GitHub Desktop permite añadir esta carpeta y publicar el mismo historial sin comandos de credenciales.

Si `git commit` pide identidad, configura nombre y correo desde GitHub Desktop → Settings/Options → Git, usando tu correo verificado o el correo privado que muestra GitHub. No inventes un correo ni utilices credenciales como identidad de commit. GitHub Desktop → File → Add local repository permite seleccionar esta carpeta **después de `git init`** y gestionar el commit/push mediante la interfaz. No uses la subida de archivos de la web para miles de archivos ni para omitir por accidente la configuración de CI.

5. Comprueba el workflow **Analysis and application checks**. Incluye Python, TypeScript, ESLint, formatos, auditoría matemática, HTTP real y builds/arranques de contenedores. No etiquetes una release si falla.
6. Copia la descripción y los temas de `SHOWCASE_COPY.md`. Añade la URL de la demo al campo Website solo cuando exista y haya pasado el recorrido de aceptación.

La conexión de GitHub volvió a reconocer `aaronexposito0-creator` el 23-09-2026. La búsqueda y el listado de repositorios accesibles del propietario no encontraron este proyecto. No se inspeccionaron contenidos ni se escribieron cambios en otros repositorios. Las operaciones expuestas permiten trabajar con repositorios existentes, pero no crear uno.

Si quieres que el agente continúe la subida, crea primero ese repositorio vacío y dale acceso mediante la conexión de GitHub, limitado a ese repositorio. La autorización concreta será: **«Sube el contenido íntegro del ZIP verificado a `aaronexposito0-creator/football-recruitment-platform`, con los commits necesarios en `main`, solo si está vacío; no modifiques otros repositorios ni hagas force-push»**. Esa autorización permite intentarlo con las operaciones disponibles; no implica que ya se haya publicado. Si el repositorio contiene commits o archivos, se debe revisar su estado antes de escribir. No hace falta compartir ningún token en el chat.

## 3. Demo completa gratuita en Render

Se incluye `render.yaml` con **un solo Web Service, `runtime: docker`, `plan: free`** y despliegues automáticos condicionados a los checks. Usa el `Dockerfile` de la raíz, no el del frontend por separado.

El contenedor inicia Next.js y FastAPI mediante `python -m scripts.serve`. Solo Next escucha en el puerto público. FastAPI escucha en loopback; el navegador accede mediante el proxy de Next. No se requiere base de datos, disco persistente, clave API ni descarga de StatsBomb. `/api/football/data/coverage` comprueba que ambos procesos pueden servir el dataset. Un fallo de proceso termina ambos; el proveedor puede reiniciar el servicio.

1. Inicia sesión en Render por su interfaz. Si no tienes cuenta, completa tú el registro y la aceptación de términos. No compartas contraseñas ni tokens en el chat.
2. Conecta GitHub y autoriza **solo el repositorio de este proyecto**.
3. Selecciona **New → Blueprint**, el repositorio y la rama `main`. Revisa que solo se vaya a crear el servicio definido y que el plan sea **Free**. No añadas bases de datos ni discos.
4. Si prefieres **New → Web Service**, selecciona el mismo repositorio, lenguaje Docker, Dockerfile `./Dockerfile`, región Frankfurt, plan Free y health check `/api/football/data/coverage`. Deja vacío Docker Command: la imagen incluye su arranque.
5. No necesitas añadir secretos. El host suministra `PORT`; el supervisor configura la dirección privada de FastAPI. Mantén `NEXT_TELEMETRY_DISABLED=1` y la imagen predeterminada.
6. Espera a **Live**, abre la URL que Render asigne y recorre `DEMO_GUIDE.md`, incluida la muestra de My Club, un brief modificado y un móvil. Comprueba que el indicador del dataset muestra análisis conectado. No publiques la URL como demo completa si solamente funciona el modo guardado.
7. Añade esa URL real al README, al Website del repositorio y a tu presentación de LinkedIn. No inventes el subdominio por adelantado.

No selecciones Static Site ni uses el Dockerfile de `apps/web` como servicio único: las importaciones y los briefs editables requieren el Python real incluido en el Dockerfile de la raíz. Si GitHub CI todavía no ha finalizado, espera a sus checks antes del despliegue manual.

### Límites del plan gratuito

Verificados en la documentación oficial el 23-09-2026: suspensión tras 15 minutos sin tráfico, arranque posterior de aproximadamente un minuto, 750 horas gratuitas compartidas por workspace, límites de ancho de banda y minutos de build. No es un SLA de producción. Abre la demo antes de una entrevista y conserva la ejecución local como respaldo; no uses pings para eludir la suspensión.

Para mantener coste cero, utiliza exclusivamente Free, evita añadir un medio de pago y revisa cualquier presupuesto/límite de gasto ya configurado en una cuenta existente. Render documenta que, sin medio de pago, se suspenden servicios o builds al agotar cuotas en lugar de cobrar excesos. Si el proveedor solicita un plan de pago para continuar, detente: no es un requisito del proyecto.

Fuentes: [Render Free](https://render.com/docs/free), [Docker](https://render.com/docs/docker), [Blueprint](https://render.com/docs/blueprint-spec). Las condiciones de hosting pueden cambiar. Hugging Face no se propone como alternativa gratuita: su documentación actual exige plan de pago para crear Spaces Docker/Gradio.

## 4. Verificación de contenedores y alternativa local

Docker no estaba disponible en el entorno de desarrollo; los comandos siguientes y el workflow están preparados, pero no se declara un build Docker ejecutado hasta comprobarlo.

Un contenedor, como en Render:

```bash
docker build -t frp-showcase .
docker run --rm --name frp-showcase --memory=512m --pids-limit=128 --read-only --tmpfs /tmp:rw,size=64m --cap-drop ALL --security-opt no-new-privileges -p 127.0.0.1:3000:3000 frp-showcase
```

La memoria limitada debe probarse también con My Club y concurrencia en el host; no se garantiza capacidad de carga a partir de un smoke test. Esta instancia es para una demo pequeña, no para tráfico comercial.

Dos contenedores en infraestructura propia:

```bash
docker compose config --quiet
docker compose up --build --detach --wait
docker compose ps
docker compose down
```

Compose publica solo Next en `127.0.0.1:3000`; FastAPI no tiene puerto público. En un servidor propio coloca un proxy HTTPS delante del frontend. No expongas el backend ni uses `next dev` en Internet. Mantén límites de cuerpo, tiempos de espera y controles de tráfico en el proxy del host. Nunca copies la caché privada a la imagen.

## Operación y privacidad

- No se guardan archivos subidos en el servidor; se procesan en memoria. El arranque de producción desactiva los access logs de FastAPI para no registrar nombres de archivos. Configura los logs del proveedor para no registrar cuerpos ni notas.
- No hay cuentas ni permisos por rol. Las listas y notas pertenecen al almacenamiento del navegador. No uses la demo pública para información confidencial de un club.
- La muestra de My Club exporta las observaciones reales del catálogo activo, sin notas personales, y entra por el mismo parser CSV y las mismas validaciones.
- La publicación incluye cabeceras de protección frente a framing, MIME sniffing y permisos innecesarios. Los POST desde otro sitio se rechazan; esto no es autenticación ni protección completa frente a abuso. Los límites de concurrencia y tamaño reducen consumo, pero no equivalen a una prueba de carga.
- Antes de anunciarla: build del contenedor, URL HTTPS, My Club interactivo, brief personalizado, móvil, descarga CSV, errores/reintentos y recorrido de todos los roles. Registra lo observado en `HANDOFF_STATE.md`.

## 5. Prueba de aceptación desde tu móvil

Abre la **URL HTTPS real asignada por Render** en Chrome o Safari, fuera del navegador integrado de LinkedIn. Espera a que termine el arranque del servicio; si solo aparece «Análisis real guardado», pulsa el estado para reconectar y comprueba Render → Logs. No des por validado My Club mientras el motor siga desconectado.

| Paso | Qué hacer en el móvil | Resultado que debes comprobar |
| --- | --- | --- |
| Navegación | Prueba vertical y horizontal; cambia los cinco roles | Accedes a menús, filtros y botones; las tablas se pueden desplazar dentro de su zona |
| Perfil real | Busca Yamal y abre su ficha | 531,0 minutos, siete apariciones, cohorte de 30, cobertura 100% y confianza 59/100 |
| Muestra pequeña | Selecciona todas las participaciones y busca Kurtič | Aproximadamente 0,56 minutos; no aparecen percentiles ni similitud sin evidencia |
| Vacíos | Busca un nombre inexistente y restablece filtros | Cero resultados y recuperación sin jugadores antiguos presentados como resultados actuales |
| Similitud | Abre y despliega la primera explicación | Valores, referencia y diferencias visibles; el score no se presenta como calidad |
| Fit | Director → cambia un peso y recalcula; añade un límite obligatorio imposible | Respuesta del servicio conectado, explicación coherente y exclusiones/estado vacío; restaura el arquetipo |
| Lista | Guarda Yamal, escribe una nota de prueba, cambia ES/EN/FR y recarga | Jugador, nota y estado se conservan en ese navegador; después retira la nota de prueba |
| Comparación | Añade Yamal y Kurtič | La tabla permite leer ambos; no rellena con percentiles los datos insuficientes |
| Plantilla | España → simula salida de Rodri, cambia de módulo y vuelve | El escenario se conserva y no se convierte en una recomendación automática de fichaje |
| My Club | Pulsa «Probar con España · Euro 2024», revisa columnas y analiza | 25 participantes reales; tasas reconstruidas y evidencia acorde a sus minutos |
| Archivo | Exporta CSV de la lista y comprueba Descargas; vuelve a seleccionarlo en My Club | Descarga real y posterior preview; columnas `/90` no se mapean como totales |
| Recarga | Recarga estando en My Club | El import se borra, conforme a su aviso; no afirma guardado en la nube |

Para XLSX utiliza una tabla de prueba sin información confidencial, con nombres/minutos/totales de los que tengas permiso. Prueba una columna desconocida, un valor ausente y un denominador cero; lo desconocido debe seguir sin dato ni referencia externa inventada. Los XLSX malformados deben rechazarse con un error recuperable.

Si algo falla, conserva la URL, rol, idioma, pasos y una captura del error. Comparte únicamente logs sin secretos ni contenidos de archivos personales. No cambies automáticamente a un plan de pago para resolverlo.

## Comprobaciones que siguen sin ejecutarse

En el entorno de preparación no había Docker ni una sesión de Render. Quedan pendientes: builds/arranques de contenedores, ejecución real de GitHub Actions, despliegue/HTTPS del host, recursos bajo el límite de 512 MiB, My Club y Fit interactivos con backend alojado, viewport táctil móvil y finalización de descargas en navegador. Windows tampoco se ha validado. El QA de escritorio con análisis guardado y las pruebas HTTP reales están documentados, pero no sustituyen estas comprobaciones.
