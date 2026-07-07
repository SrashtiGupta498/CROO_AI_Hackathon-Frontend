"""
CAP adapter — the single seam between the Aura agent mesh and the CROO Agent
Protocol (CAP).

Every protocol interaction the mesh performs (registering an agent, discovering
peers, and driving an order through its lifecycle) goes through the abstract
``CapBackend`` defined here. That gives us one place to swap the local ``sim``
backend for the real CAP SDK once Pioneers-Program credentials + the SDK
reference are in hand — no agent code changes.

CAP order lifecycle (per the CAP docs):

    NEGOTIATE -> LOCK -> DELIVER -> CLEAR -> (verify) -> SETTLE (+reputation)
                                                       \-> DISPUTE

Terms:
  - DID     : each agent's decentralized identity on Base.
  - wallet  : each agent's on-chain wallet address; escrow + settlement move here.
  - order   : one A2A transaction (buyer hires seller for a service).
"""

from __future__ import annotations

from abc import ABC, abstractmethod
from dataclasses import dataclass, field, asdict
from enum import Enum
from typing import Any, Callable, Optional


class OrderState(str, Enum):
    """States a CAP order moves through. String-valued so they serialize cleanly."""

    NEGOTIATING = "negotiating"
    LOCKED = "locked"        # buyer funds held in escrow
    DELIVERED = "delivered"  # seller returned a result, awaiting buyer verification
    CLEARED = "cleared"      # buyer accepted the delivery
    SETTLED = "settled"      # payment released to seller + reputation updated
    DISPUTED = "disputed"    # buyer rejected the delivery; escrow refunded


# Terminal states — no further transitions are allowed.
TERMINAL_STATES = frozenset({OrderState.SETTLED, OrderState.DISPUTED})


@dataclass
class AgentIdentity:
    """What CAP hands back when an agent registers a service."""

    name: str
    did: str            # e.g. "did:cap:base:0xabc..."
    wallet: str         # 0x-prefixed Base address
    sdk_key: str        # per-agent SDK key issued by CAP
    service: str        # the service tag other agents discover it by
    price: int          # asking price in the smallest settlement unit (see UNIT)

    def public(self) -> dict:
        """The subset safe to expose in a discovery listing (no sdk_key)."""
        return {
            "name": self.name,
            "did": self.did,
            "wallet": self.wallet,
            "service": self.service,
            "price": self.price,
        }


@dataclass
class Quote:
    """Result of a NEGOTIATE step."""

    seller_did: str
    service: str
    amount: int
    terms: str = "per-call, settle-on-clear"


@dataclass
class CapOrder:
    """A single A2A order and the audit trail of its lifecycle."""

    order_id: str
    buyer_did: str
    seller_did: str
    service: str
    amount: int
    params: dict = field(default_factory=dict)
    state: OrderState = OrderState.NEGOTIATING
    result: Any = None
    tx_hash: Optional[str] = None          # settlement tx on Base
    escrow_tx: Optional[str] = None        # lock tx
    history: list[dict] = field(default_factory=list)  # [{state, at}]

    def to_dict(self) -> dict:
        d = asdict(self)
        d["state"] = self.state.value
        return d


# Settlement amounts are integers in the smallest unit to avoid float rounding
# in payment math. 1_000_000 == 1.0 settlement token (6 decimals, USDC-style).
UNIT = 1_000_000


class CapBackend(ABC):
    """
    Abstract CAP backend. Implementations: ``SimBackend`` (local, runs today)
    and ``HttpBackend`` (real CAP SDK, filled in once credentials land).

    An agent uses this in two roles:
      * as a *seller*  — calls ``register_agent`` once, then serves ``deliver``.
      * as a *buyer*   — ``discover`` -> ``negotiate`` -> ``open_order`` ->
                         ``lock`` -> (seller delivers) -> ``clear``.
    """

    # --- identity / discovery -------------------------------------------------

    @abstractmethod
    def register_agent(self, name: str, service: str, price: int) -> AgentIdentity:
        """Register a service with CAP; returns a DID + wallet + sdk_key."""

    @abstractmethod
    def discover(self, service: str) -> list[dict]:
        """Return public listings of agents offering ``service`` (may be empty)."""

    # --- order lifecycle ------------------------------------------------------

    @abstractmethod
    def negotiate(self, buyer_did: str, seller_did: str, service: str,
                  params: dict) -> Quote:
        """Agree a price/terms with a seller before committing funds."""

    @abstractmethod
    def open_order(self, buyer_did: str, quote: Quote, params: dict) -> CapOrder:
        """Create the order record in the NEGOTIATING state."""

    @abstractmethod
    def lock(self, order: CapOrder) -> CapOrder:
        """Escrow the buyer's funds. NEGOTIATING -> LOCKED."""

    @abstractmethod
    def deliver(self, order: CapOrder, result: Any) -> CapOrder:
        """Seller attaches its result. LOCKED -> DELIVERED."""

    @abstractmethod
    def clear(self, order: CapOrder, accept: bool = True) -> CapOrder:
        """
        Buyer verifies the delivery.
        accept=True  -> SETTLED  (release escrow to seller, bump reputation)
        accept=False -> DISPUTED (refund escrow to buyer)
        """

    # --- reputation / accounting ---------------------------------------------

    @abstractmethod
    def reputation(self, did: str) -> dict:
        """Return {orders, settled, disputed, score, earned} for an agent."""

    @abstractmethod
    def balance(self, did: str) -> int:
        """Wallet balance in UNITs."""

    @abstractmethod
    def ledger(self) -> list[dict]:
        """All orders seen by this backend, for audit / demo output."""


# A perception/inference function wrapped by an agent: params dict -> result dict.
Handler = Callable[[dict], dict]
