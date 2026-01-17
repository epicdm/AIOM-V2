"""
Health Check Router.

Provides endpoints for monitoring the gateway's health status.
"""

from datetime import datetime
from typing import Dict

from fastapi import APIRouter, Depends

from ..config import settings
from ..models.responses import HealthResponse
from ..services.database import get_database

router = APIRouter(prefix="/health", tags=["Health"])


@router.get(
    "",
    response_model=HealthResponse,
    summary="Health Check",
    description="Check the health status of the Mobile API Gateway and its dependencies.",
)
async def health_check() -> HealthResponse:
    """
    Perform a comprehensive health check.

    Returns the status of:
    - Gateway service
    - Database connection
    - Compression status
    - Offline sync status
    """
    services: Dict[str, str] = {}

    # Check database
    try:
        db = get_database()
        is_healthy = await db.health_check()
        services["database"] = "healthy" if is_healthy else "unhealthy"
    except Exception as e:
        services["database"] = f"error: {str(e)}"

    # Check main app connectivity
    try:
        import httpx

        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{settings.main_app_url}/api/auth/get-session",
                timeout=5.0,
            )
            services["main_app"] = (
                "healthy" if response.status_code in [200, 401] else "degraded"
            )
    except Exception:
        services["main_app"] = "unavailable"

    # Overall status
    all_healthy = all(
        status in ["healthy", "unavailable"] for status in services.values()
    )

    return HealthResponse(
        status="healthy" if all_healthy else "degraded",
        version=settings.app_version,
        timestamp=datetime.utcnow(),
        services=services,
        compression_enabled=True,
        offline_sync_enabled=True,
    )


@router.get(
    "/ready",
    summary="Readiness Check",
    description="Check if the service is ready to accept traffic.",
)
async def readiness_check() -> dict:
    """
    Quick readiness check for Kubernetes probes.
    """
    # Check database
    try:
        db = get_database()
        is_healthy = await db.health_check()
        if not is_healthy:
            return {"status": "not_ready", "reason": "database_unavailable"}
    except Exception:
        return {"status": "not_ready", "reason": "database_error"}

    return {"status": "ready"}


@router.get(
    "/live",
    summary="Liveness Check",
    description="Check if the service is alive.",
)
async def liveness_check() -> dict:
    """
    Simple liveness check for Kubernetes probes.
    """
    return {"status": "alive", "timestamp": datetime.utcnow().isoformat()}
