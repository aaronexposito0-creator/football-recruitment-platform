FROM python:3.12-slim AS build
WORKDIR /app
COPY pyproject.toml requirements.lock ./
COPY core ./core
COPY apps/api ./apps/api
RUN python -m venv /opt/venv && /opt/venv/bin/pip install --no-cache-dir -c requirements.lock .

FROM python:3.12-slim AS runtime
ENV PATH="/opt/venv/bin:$PATH" PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1
WORKDIR /app
RUN groupadd --gid 10001 frp && useradd --uid 10001 --gid frp --no-create-home frp
COPY --from=build /opt/venv /opt/venv
COPY core ./core
COPY apps/api ./apps/api
COPY data/sample/analysis.json ./data/sample/analysis.json
USER 10001:10001
EXPOSE 8000
CMD ["python", "-m", "uvicorn", "apps.api.app.main:app", "--host", "0.0.0.0", "--port", "8000", "--no-access-log", "--limit-concurrency", "16", "--timeout-keep-alive", "5"]
