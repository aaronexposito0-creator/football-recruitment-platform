from fastapi import APIRouter

from apps.api.app.services.catalog import get_catalog

router = APIRouter(tags=["system"])


@router.get("/health")
def health():
    return {
        "status": "ok",
        "product": "Football Recruitment Platform",
        "version": "0.2.0",
        "author": "Aarón Expósito",
    }


@router.get("/ready")
def ready():
    """Readiness requires a validated dataset, not merely a running process."""
    data, mode = get_catalog()
    return {"status": "ready", "mode": mode, "players": len(data["players"])}
