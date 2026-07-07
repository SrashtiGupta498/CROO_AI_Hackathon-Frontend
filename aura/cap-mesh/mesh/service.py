"""
Aura analysis service — the single callable the CAP edge invokes per order.

``run_analysis(params)`` builds a small in-process agent mesh (a concierge that
hires four specialist agents) over the local ``SimBackend`` and returns a
structured skin report plus the internal A2A audit trail. Running the mesh here
— even for a single external order — is deliberate: it demonstrates real
agent-to-agent composition (the concierge *pays* each specialist per micro-task)
and produces the same verifiable signals the CAP layer settles against.

Shape of the returned report (stable — the CAP deliverable serializes this):

    {
      "usable": bool,                     # quality gate result
      "quality": {...},                   # measured sharpness/lighting/face
      "skin_type": {"skin_type", "confidence"},
      "concerns": {"scores", "present"},
      "metrics": {"redness_index", "texture_score", "tone_evenness"},
      "advice": str,                      # grounded routine
      "source": "gemini" | "fallback",
      "disclaimer": str,
      "a2a": {"orders", "settled", "spend", "ledger"}   # proof of composition
    }

The perception + remedy functions are the same ones the specialists wrap
(``mesh.perception``, ``mesh.remedy``), so there is one source of truth for the
analysis regardless of whether it is called by a human (H2A) or another agent
(A2A) through CAP.
"""

from __future__ import annotations

from typing import Any

from cap import get_backend
from mesh import perception, remedy
from mesh.agent import Mesh

# Cosmetic-only guidance — mirrored on every surface (see PROJECT_DESCRIPTION.md).
DISCLAIMER = (
    "Cosmetic guidance only — not a medical diagnosis. "
    "See a dermatologist for any medical concern."
)

# Per-specialist asking prices (smallest settlement unit; see cap.adapter.UNIT).
# These are the *internal* A2A micro-payments the concierge makes per scan.
_PRICES = {
    "quality": 2_000,
    "skin_type": 5_000,
    "concerns": 5_000,
    "metrics": 3_000,
    "remedy": 8_000,
}


def _build_mesh() -> Mesh:
    """Register the concierge + specialists on a fresh backend."""
    mesh = Mesh(get_backend())

    # --- specialist sellers: each wraps one perception/remedy function --------
    mesh.agent(
        "aura-quality", "quality", _PRICES["quality"],
        lambda p, a: perception.quality_check(p["image_ref"]),
    )
    mesh.agent(
        "aura-skintype", "skin_type", _PRICES["skin_type"],
        lambda p, a: perception.skin_type(p["image_ref"]),
    )
    mesh.agent(
        "aura-concerns", "concerns", _PRICES["concerns"],
        lambda p, a: perception.concerns(p["image_ref"]),
    )
    mesh.agent(
        "aura-metrics", "metrics", _PRICES["metrics"],
        lambda p, a: perception.metrics(p["image_ref"]),
    )
    mesh.agent(
        "aura-remedy", "remedy", _PRICES["remedy"],
        lambda p, a: remedy.generate(p.get("concerns", []), p.get("skin_type", "normal")),
    )

    # --- concierge: the service the external CAP order actually hires ----------
    mesh.agent("aura-concierge", "skin-analysis", 30_000, _concierge)
    return mesh


def _concierge(params: dict, agent) -> dict:
    """
    Orchestrate one scan by hiring specialists over CAP. This is the A2A story:
    the concierge discovers, pays, and verifies each specialist per micro-task.
    """
    image_ref = params.get("image_ref") or "anonymous"

    # Quality gate first — reject a bad capture before spending on analysis.
    # We DISPUTE (refund) the quality order only if the seller misbehaves; an
    # honest "unusable" verdict is a valid, paid result.
    quality, _ = agent.hire("quality", {"image_ref": image_ref})
    if not quality.get("usable"):
        return {"usable": False, "quality": quality}

    skin, _ = agent.hire(
        "skin_type", {"image_ref": image_ref},
        verify=lambda r: 0.0 <= r.get("confidence", 0) <= 1.0,
    )
    conc, _ = agent.hire(
        "concerns", {"image_ref": image_ref},
        verify=lambda r: "scores" in r,
    )
    met, _ = agent.hire("metrics", {"image_ref": image_ref})

    rem, _ = agent.hire(
        "remedy",
        {"concerns": conc.get("present", []), "skin_type": skin["skin_type"]},
        verify=lambda r: bool(r.get("advice")),
    )

    return {
        "usable": True,
        "quality": quality,
        "skin_type": skin,
        "concerns": conc,
        "metrics": met,
        "advice": rem["advice"],
        "source": rem["source"],
    }


def run_analysis(params: dict[str, Any]) -> dict[str, Any]:
    """
    Entry point the CAP provider calls per paid order.

    ``params`` is the caller's parsed ``requirements`` — typically
    ``{"image_ref": <objectKey|url|id>, "goal": <text>}``. ``image_ref`` is
    optional; when absent a deterministic per-order seed keeps demos reproducible.
    """
    mesh = _build_mesh()
    concierge = mesh.by_service["skin-analysis"][0]

    # A "user" buyer places the order with the concierge — the H2A/A2A entry.
    user = mesh.agent("aura-user", "buyer", 0, lambda p, a: {})
    report, order = user.hire("skin-analysis", params)

    # Attach the internal A2A audit trail — verifiable proof of composition.
    ledger = mesh.backend.ledger()
    settled = [o for o in ledger if o["state"] == "settled"]
    report["disclaimer"] = DISCLAIMER
    report["a2a"] = {
        "orders": len(ledger),
        "settled": len(settled),
        "spend": sum(o["amount"] for o in settled),
        "entry_order_id": order.order_id,
        "ledger": [
            {
                "order_id": o["order_id"],
                "service": o["service"],
                "amount": o["amount"],
                "state": o["state"],
                "settle_tx": o["tx_hash"],
            }
            for o in ledger
        ],
    }
    return report
