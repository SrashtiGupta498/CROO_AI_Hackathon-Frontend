"""CAP adapter package — swappable backends behind one interface."""

from __future__ import annotations

import os

from .adapter import (
    AgentIdentity,
    CapBackend,
    CapOrder,
    Handler,
    OrderState,
    Quote,
    UNIT,
)


def get_backend() -> CapBackend:
    """
    Return the configured CAP backend.

    CAP_BACKEND=sim  (default) -> local simulation, runs today.
    CAP_BACKEND=http           -> real CAP SDK (needs CAP_SDK_KEY etc.).
    """
    kind = os.environ.get("CAP_BACKEND", "sim").lower()
    if kind == "sim":
        from .sim_backend import SimBackend
        return SimBackend()
    if kind == "http":
        from .http_backend import HttpBackend
        return HttpBackend()
    raise ValueError(f"unknown CAP_BACKEND={kind!r} (expected 'sim' or 'http')")


__all__ = [
    "AgentIdentity",
    "CapBackend",
    "CapOrder",
    "Handler",
    "OrderState",
    "Quote",
    "UNIT",
    "get_backend",
]
