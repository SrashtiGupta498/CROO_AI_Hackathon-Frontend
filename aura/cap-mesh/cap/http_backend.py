"""
Real CAP backend — placeholder.

STATUS: intentionally not the on-chain path. CROO's only published SDK is
Node.js (`@croo-network/sdk`), and the real, on-chain edge of Aura lives in
`../../cap-provider` (a Node process using that SDK). This Python `SimBackend`
remains the source of truth for the *internal* agent mesh (the concierge paying
specialists per scan), which the Node provider invokes per paid order via
`mesh.analyze_cli`.

Reality vs. the earlier plan (corrected after reading the real SDK):
  * There is no Python CAP SDK and no documented public REST contract to call
    directly from Python — so the endpoints previously guessed here (e.g.
    `/agents/register`, `/orders/{id}/lock`) do not exist.
  * Registration is NOT a code call: an agent's AA wallet + DID and its priced
    service are created in the CROO Dashboard, which issues the SDK-Key.
  * The runtime lifecycle is: negotiate -> acceptNegotiation (backend submits
    createOrder on-chain) -> payOrder (escrow) -> deliverOrder -> order
    completed (settles in USDC on Base); rejectOrder refunds.

If a first-class Python on-chain backend is ever needed, implement it against
CROO's HTTP API with the `X-SDK-Key` header (mirroring `@croo-network/sdk`),
then flip CAP_BACKEND=http. Until then the Node provider is the on-chain path
and CAP_BACKEND stays `sim`.
"""

from __future__ import annotations

import os

from .adapter import AgentIdentity, CapBackend, CapOrder, Quote


_NOT_WIRED = (
    "HttpBackend is not the on-chain path. CROO's SDK is Node.js "
    "(@croo-network/sdk) and the real settlement edge is ../../cap-provider. "
    "Run the Python mesh with CAP_BACKEND=sim; run cap-provider for on-chain."
)


class HttpBackend(CapBackend):
    def __init__(self) -> None:
        self.api_base = os.environ.get("CAP_API_BASE", "https://api.croo.network")
        self.sdk_key = os.environ.get("CAP_SDK_KEY", "")
        self.wallet_key = os.environ.get("CAP_WALLET_KEY", "")
        self.rpc_url = os.environ.get("BASE_RPC_URL", "")
        if not self.sdk_key:
            raise RuntimeError(
                "CAP_SDK_KEY is not set. Export your Pioneers-Program SDK-Key, "
                "or run with CAP_BACKEND=sim."
            )

    def register_agent(self, name: str, service: str, price: int) -> AgentIdentity:
        # TODO: POST {api_base}/agents/register  (deploy wallet + register service)
        raise NotImplementedError(_NOT_WIRED)

    def discover(self, service: str) -> list[dict]:
        # TODO: GET {api_base}/clearinghouse/discover?service=...
        raise NotImplementedError(_NOT_WIRED)

    def negotiate(self, buyer_did, seller_did, service, params) -> Quote:
        # TODO: POST {api_base}/orders/negotiate
        raise NotImplementedError(_NOT_WIRED)

    def open_order(self, buyer_did, quote, params) -> CapOrder:
        # TODO: POST {api_base}/orders  (create)
        raise NotImplementedError(_NOT_WIRED)

    def lock(self, order: CapOrder) -> CapOrder:
        # TODO: POST {api_base}/orders/{id}/lock  -> Base escrow tx hash
        raise NotImplementedError(_NOT_WIRED)

    def deliver(self, order: CapOrder, result) -> CapOrder:
        # TODO: POST {api_base}/orders/{id}/deliver
        raise NotImplementedError(_NOT_WIRED)

    def clear(self, order: CapOrder, accept: bool = True) -> CapOrder:
        # TODO: POST {api_base}/orders/{id}/clear  -> Base settlement tx hash
        raise NotImplementedError(_NOT_WIRED)

    def reputation(self, did: str) -> dict:
        # TODO: GET {api_base}/agents/{did}/reputation
        raise NotImplementedError(_NOT_WIRED)

    def balance(self, did: str) -> int:
        # TODO: read wallet balance via BASE_RPC_URL
        raise NotImplementedError(_NOT_WIRED)

    def ledger(self) -> list[dict]:
        # TODO: GET {api_base}/agents/me/orders
        raise NotImplementedError(_NOT_WIRED)
