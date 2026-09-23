from typing import Any, Dict

from zipfile import BadZipFile
from xml.etree.ElementTree import ParseError

from defusedxml.common import DefusedXmlException
from fastapi import APIRouter, HTTPException, Request
from pydantic import ValidationError
from starlette.concurrency import run_in_threadpool

from apps.api.app.services.catalog import get_catalog
from core.analytics.imports import MAX_FILE_BYTES, MAX_JSON_BYTES, analyse_import, preview_table
from core.schemas.imports import ClubImport, ClubAnalysisResponse, ImportPreviewResponse

from core.analytics.coverage import calculate_coverage

router = APIRouter(prefix="/my-club", tags=["my-club"])


@router.post("/coverage")
def coverage(values: Dict[str, Any]):
    return calculate_coverage(values)


async def bounded_body(request: Request, limit: int) -> bytes:
    parts = []
    size = 0
    async for chunk in request.stream():
        size += len(chunk)
        if size > limit:
            raise HTTPException(413, "Upload exceeds the allowed size")
        parts.append(chunk)
    return b"".join(parts)


@router.post(
    "/preview",
    response_model=ImportPreviewResponse,
    openapi_extra={
        "requestBody": {
            "required": True,
            "content": {"application/octet-stream": {"schema": {"type": "string", "format": "binary"}}},
        }
    },
)
async def preview(request: Request, filename: str = "squad.csv"):
    content = await bounded_body(request, MAX_FILE_BYTES)
    try:
        return await run_in_threadpool(preview_table, content, filename)
    except (ValueError, TypeError, ParseError, DefusedXmlException, BadZipFile, NotImplementedError) as exc:
        raise HTTPException(422, str(exc)) from exc


@router.post(
    "/analyze",
    response_model=ClubAnalysisResponse,
    openapi_extra={
        "requestBody": {
            "required": True,
            "content": {"application/json": {"schema": ClubImport.model_json_schema()}},
        }
    },
)
async def analyze(request: Request):
    content = await bounded_body(request, MAX_JSON_BYTES)
    try:
        payload = ClubImport.model_validate_json(content)
    except (ValueError, ValidationError) as exc:
        # Do not echo uploaded personal data through validation-error input fields.
        detail = (
            [{"loc": error["loc"], "msg": error["msg"]} for error in exc.errors()]
            if isinstance(exc, ValidationError)
            else str(exc)
        )
        raise HTTPException(422, detail) from exc
    data, _ = get_catalog()
    return await run_in_threadpool(analyse_import, payload, data)
