"""
Remedy / RAG generation for the remedy agent.

Uses Gemini if GEMINI_API_KEY is set (mirrors the frontend's geminiService.ts),
otherwise falls back to a deterministic organic-remedy lookup so the mesh runs
offline. Either way the output shape is identical, so the agent contract is
stable regardless of provider availability.
"""

from __future__ import annotations

import os

# Deterministic fallback map: concern -> natural remedy blurb.
_REMEDIES = {
    "acne": "Spot-treat with diluted tea-tree oil; cleanse with raw honey + green tea.",
    "hyperpigmentation": "Brighten with licorice-root extract and vitamin-C rich rosehip oil.",
    "redness": "Calm with aloe vera gel and a chamomile compress; avoid hot water.",
    "dark_circles": "Cold cucumber compress; caffeine-rich green-tea eye dabs at night.",
    "wrinkles": "Nightly rosehip + squalane; gua-sha facial massage to boost circulation.",
    "_default": "Gentle oat cleanser, jojoba moisturiser, and daily mineral SPF.",
}


def _fallback(concerns: list[str], skin_type: str) -> str:
    lines = [_REMEDIES.get(c, _REMEDIES["_default"]) for c in (concerns or ["_default"])]
    return f"For {skin_type} skin: " + " ".join(dict.fromkeys(lines))


def generate(concerns: list[str], skin_type: str) -> dict:
    """Return {'advice': str, 'source': 'gemini'|'fallback'}."""
    api_key = os.environ.get("GEMINI_API_KEY") or os.environ.get("API_KEY")
    if api_key:
        try:
            from google import genai  # type: ignore

            client = genai.Client(api_key=api_key)
            prompt = (
                f"Skin type: {skin_type}. Concerns: {', '.join(concerns) or 'none'}. "
                "Give a short natural remedy + AM/PM routine using organic "
                "ingredients, under 100 words, holistic and safe."
            )
            resp = client.models.generate_content(
                model="gemini-3-flash-preview", contents=prompt
            )
            return {"advice": resp.text.strip(), "source": "gemini"}
        except Exception:
            pass  # fall through to deterministic remedy
    return {"advice": _fallback(concerns, skin_type), "source": "fallback"}
