"""Eye-tracking backend package."""

from .router import router, shutdown_tracker

__all__ = ["router", "shutdown_tracker"]
