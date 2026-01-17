"""
API Routers for Mobile API Gateway.
"""

from .health import router as health_router
from .sync import router as sync_router
from .users import router as users_router
from .briefings import router as briefings_router
from .auth import router as auth_router
from .contacts import router as contacts_router
from .onboarding import router as onboarding_router

__all__ = [
    "health_router",
    "sync_router",
    "users_router",
    "briefings_router",
    "auth_router",
    "contacts_router",
    "onboarding_router",
]
