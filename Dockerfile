# Single-service showcase: real Python API and Next.js, one public port.
FROM node:24-bookworm-slim AS web
WORKDIR /app/apps/web
ENV NEXT_TELEMETRY_DISABLED=1
COPY apps/web/package.json apps/web/package-lock.json ./
RUN npm ci --no-fund --no-audit
COPY apps/web ./
COPY core/reference /app/core/reference
RUN npm run lint && npm run build

FROM python:3.12-slim-bookworm AS api
WORKDIR /app
COPY pyproject.toml requirements.lock ./
COPY core ./core
COPY apps/api ./apps/api
RUN python -m venv /opt/venv && /opt/venv/bin/pip install --no-cache-dir -c requirements.lock .

FROM python:3.12-slim-bookworm AS runtime
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends libstdc++6 libatomic1 && rm -rf /var/lib/apt/lists/* && groupadd --gid 10001 frp && useradd --uid 10001 --gid frp --no-create-home frp
COPY --from=web /usr/local/bin/node /usr/local/bin/node
COPY --from=api /opt/venv /opt/venv
COPY --from=web --chown=frp:frp /app/apps/web/.next/standalone ./
COPY --from=web --chown=frp:frp /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=web --chown=frp:frp /app/apps/web/public ./apps/web/public
COPY core ./core
COPY apps/api ./apps/api
COPY data/sample/analysis.json ./data/sample/analysis.json
COPY scripts/__init__.py scripts/dev.py scripts/serve.py ./scripts/
ENV PATH="/opt/venv/bin:$PATH" PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1 NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 PORT=3000 NODE_OPTIONS="--max-old-space-size=192" FRP_CORS_ORIGINS="" OPENBLAS_NUM_THREADS=1 OMP_NUM_THREADS=1
USER 10001:10001
EXPOSE 3000
CMD ["python", "-m", "scripts.serve"]
