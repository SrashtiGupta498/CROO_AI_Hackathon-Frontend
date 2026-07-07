"""
Local simulation backend for CAP.

Runs the *exact* CAP order lifecycle (negotiate -> lock -> deliver -> clear ->
settle | dispute) with in-memory wallets, escrow, deterministic DIDs/wallets,
and synthetic Base tx hashes. It lets the whole mesh run end-to-end today,
before real Pioneers-Program credentials are wired in.

Everything here is deliberately behind the ``CapBackend`` interface so that
swapping in ``HttpBackend`` (the real SDK) is a one-line change in factory.py.
"""

from __future__ import annotations

import hashlib
import time
import uuid

from .adapter import (
    AgentIdentity,
    CapBackend,
    CapOrder,
    OrderState,
    Quote,
    UNIT,
)

# Starting wallet balance granted to each agent in the sim so buyers can pay.
_FAUCET = 1_000 * UNIT


def _addr(seed: str) -> str:
    """Deterministic 0x Base-style address from a seed string."""
    return "0x" + hashlib.sha256(seed.encode()).hexdigest()[:40]


def _txhash(*parts: str) -> str:
    """Synthetic 32-byte tx hash, stands in for a real Base settlement tx."""
    return "0x" + hashlib.sha256("|".join(parts).encode()).hexdigest()


class SimBackend(CapBackend):
    def __init__(self) -> None:
        self._agents: dict[str, AgentIdentity] = {}          # did -> identity
        self._by_service: dict[str, list[str]] = {}          # service -> [did]
        self._wallets: dict[str, int] = {}                   # did -> balance (UNIT)
        self._escrow: dict[str, int] = {}                    # order_id -> held amount
        self._orders: dict[str, CapOrder] = {}               # order_id -> order
        self._rep: dict[str, dict] = {}                      # did -> counters

    # --- identity / discovery -------------------------------------------------

    def register_agent(self, name: str, service: str, price: int) -> AgentIdentity:
        did = f"did:cap:base:{_addr(name + ':' + service)}"
        identity = AgentIdentity(
            name=name,
            did=did,
            wallet=_addr("wallet:" + did),
            sdk_key="cap_sk_" + uuid.uuid4().hex,
            service=service,
            price=price,
        )
        self._agents[did] = identity
        self._by_service.setdefault(service, []).append(did)
        self._wallets[did] = _FAUCET
        self._rep[did] = {"orders": 0, "settled": 0, "disputed": 0, "earned": 0}
        return identity

    def discover(self, service: str) -> list[dict]:
        return [self._agents[d].public() for d in self._by_service.get(service, [])]

    # --- order lifecycle ------------------------------------------------------

    def negotiate(self, buyer_did: str, seller_did: str, service: str,
                  params: dict) -> Quote:
        seller = self._agents[seller_did]
        # Trivial negotiation policy: accept the seller's list price. A real
        # backend could counter-offer based on load, reputation, or params.
        return Quote(seller_did=seller_did, service=service, amount=seller.price)

    def open_order(self, buyer_did: str, quote: Quote, params: dict) -> CapOrder:
        order = CapOrder(
            order_id="ord_" + uuid.uuid4().hex[:12],
            buyer_did=buyer_did,
            seller_did=quote.seller_did,
            service=quote.service,
            amount=quote.amount,
            params=params,
        )
        self._orders[order.order_id] = order
        self._rep[buyer_did]["orders"] += 1
        self._mark(order, OrderState.NEGOTIATING)
        return order

    def lock(self, order: CapOrder) -> CapOrder:
        self._require(order, OrderState.NEGOTIATING)
        if self._wallets[order.buyer_did] < order.amount:
            raise RuntimeError(
                f"buyer {order.buyer_did} has insufficient balance to lock "
                f"{order.amount} for order {order.order_id}"
            )
        # Move funds from buyer wallet into per-order escrow.
        self._wallets[order.buyer_did] -= order.amount
        self._escrow[order.order_id] = order.amount
        order.escrow_tx = _txhash("lock", order.order_id)
        self._mark(order, OrderState.LOCKED)
        return order

    def deliver(self, order: CapOrder, result) -> CapOrder:
        self._require(order, OrderState.LOCKED)
        order.result = result
        self._mark(order, OrderState.DELIVERED)
        return order

    def clear(self, order: CapOrder, accept: bool = True) -> CapOrder:
        self._require(order, OrderState.DELIVERED)
        held = self._escrow.pop(order.order_id, 0)
        if accept:
            # Release escrow to the seller + record reputation.
            self._wallets[order.seller_did] += held
            order.tx_hash = _txhash("settle", order.order_id)
            self._rep[order.seller_did]["settled"] += 1
            self._rep[order.seller_did]["earned"] += held
            self._mark(order, OrderState.SETTLED)
        else:
            # Refund the buyer; ding the seller's reputation.
            self._wallets[order.buyer_did] += held
            order.tx_hash = _txhash("refund", order.order_id)
            self._rep[order.seller_did]["disputed"] += 1
            self._mark(order, OrderState.DISPUTED)
        return order

    # --- reputation / accounting ---------------------------------------------

    def reputation(self, did: str) -> dict:
        r = self._rep.get(did, {"orders": 0, "settled": 0, "disputed": 0, "earned": 0})
        total = r["settled"] + r["disputed"]
        score = round(r["settled"] / total, 3) if total else 1.0
        return {**r, "score": score}

    def balance(self, did: str) -> int:
        return self._wallets.get(did, 0)

    def ledger(self) -> list[dict]:
        return [o.to_dict() for o in self._orders.values()]

    # --- internals ------------------------------------------------------------

    def _mark(self, order: CapOrder, state: OrderState) -> None:
        order.state = state
        order.history.append({"state": state.value, "at": time.time()})

    def _require(self, order: CapOrder, expected: OrderState) -> None:
        if order.state != expected:
            raise RuntimeError(
                f"order {order.order_id} is {order.state.value}, "
                f"expected {expected.value}"
            )
