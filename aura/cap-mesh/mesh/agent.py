"""
Mesh runtime: CAP-registered agents that hire and pay each other.

Two roles, one class:
  * seller — an agent registers a service and fulfils orders it is hired for.
  * buyer  — an agent discovers a service, negotiates, escrows, receives the
             delivery, verifies it, and clears (settle or dispute).

Both roles run through the CAP backend, so every ``hire`` produces a real,
audited CAP order regardless of which backend is active.

Handlers have the signature ``handler(params: dict, agent: "MeshAgent") -> dict``.
Specialists ignore ``agent``; the concierge uses ``agent.hire(...)`` to
subcontract to the rest of the mesh.
"""

from __future__ import annotations

from typing import Callable, Optional

from cap import CapBackend, CapOrder

Handler = Callable[[dict, "MeshAgent"], dict]
# Verifier decides whether a buyer accepts a seller's delivery.
Verifier = Callable[[dict], bool]


class MeshAgent:
    def __init__(
        self,
        mesh: "Mesh",
        name: str,
        service: str,
        price: int,
        handler: Handler,
    ) -> None:
        self.mesh = mesh
        self.handler = handler
        self.identity = mesh.backend.register_agent(name, service, price)
        mesh.register(self)

    # convenience passthroughs
    @property
    def did(self) -> str:
        return self.identity.did

    @property
    def name(self) -> str:
        return self.identity.name

    # --- seller side ----------------------------------------------------------

    def fulfill(self, order: CapOrder) -> dict:
        """Run this agent's handler for an order it has been hired for."""
        return self.handler(order.params, self)

    # --- buyer side -----------------------------------------------------------

    def hire(
        self,
        service: str,
        params: dict,
        verify: Optional[Verifier] = None,
    ) -> tuple[dict, CapOrder]:
        """
        Hire the best available agent offering ``service`` and drive the full
        CAP order lifecycle. Returns (result, order).

        ``verify`` gates acceptance: if it returns False the buyer DISPUTES the
        order (escrow refunded, seller reputation dinged) instead of settling.
        """
        backend = self.mesh.backend
        listings = backend.discover(service)
        if not listings:
            raise RuntimeError(f"no agent offers service {service!r}")

        seller_did = self._select(listings)
        seller = self.mesh.by_did[seller_did]

        quote = backend.negotiate(self.did, seller_did, service, params)
        order = backend.open_order(self.did, quote, params)
        backend.lock(order)                       # escrow buyer funds

        result = seller.fulfill(order)            # seller does the work
        backend.deliver(order, result)            # LOCKED -> DELIVERED

        accept = True if verify is None else bool(verify(result))
        backend.clear(order, accept=accept)       # -> SETTLED | DISPUTED

        self.mesh.record(order)
        return result, order

    def _select(self, listings: list[dict]) -> str:
        """
        Pick a seller: highest reputation first, then lowest price. This is
        where A2A "depth" lives — buyers prefer agents with proven history.
        """
        backend = self.mesh.backend

        def key(listing: dict):
            rep = backend.reputation(listing["did"])
            return (-rep["score"], listing["price"])

        return min(listings, key=key)["did"]


class Mesh:
    """Registry of agents + audit trail of every order the mesh produced."""

    def __init__(self, backend: CapBackend) -> None:
        self.backend = backend
        self.by_did: dict[str, MeshAgent] = {}
        self.by_service: dict[str, list[MeshAgent]] = {}
        self.orders: list[CapOrder] = []

    def register(self, agent: MeshAgent) -> None:
        self.by_did[agent.did] = agent
        self.by_service.setdefault(agent.identity.service, []).append(agent)

    def record(self, order: CapOrder) -> None:
        self.orders.append(order)

    def agent(self, name: str, service: str, price: int, handler: Handler) -> MeshAgent:
        """Create + register an agent in one call."""
        return MeshAgent(self, name, service, price, handler)
