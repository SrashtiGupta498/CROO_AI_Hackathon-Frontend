"""
Perception functions the specialist agents wrap.

Each function is pluggable: if a real model/module is importable it is used;
otherwise a deterministic mock runs. Determinism (derived from the image id)
keeps demos reproducible and keeps the hackathon focus on CAP/A2A rather than
model accuracy — which is exactly how this project is scored.

To go live, drop the real perception service in and set the env flags:
  AURA_SKINTYPE_MODEL / AURA_CONCERN_MODEL -> import paths that expose
  ``predict(image_ref: str) -> dict``. See ../SkinConcern_AI_Project_Scope.md
  for the EfficientNet-B0 multi-label design these mirror.
"""

from __future__ import annotations

import hashlib

SKIN_TYPES = ["oily", "dry", "combination", "normal", "sensitive"]
CONCERNS = ["acne", "hyperpigmentation", "redness", "dark_circles", "wrinkles"]


def _rng(image_ref: str, salt: str) -> float:
    """Deterministic pseudo-random float in [0,1) from an image id + salt."""
    h = hashlib.sha256(f"{image_ref}:{salt}".encode()).hexdigest()
    return int(h[:8], 16) / 0xFFFFFFFF


def quality_check(image_ref: str) -> dict:
    """Gate: is the selfie usable (face present, lit, sharp enough)?"""
    face = _rng(image_ref, "face")
    lighting = _rng(image_ref, "light")
    sharpness = _rng(image_ref, "sharp")
    # Reject clearly bad captures; ~1 in 8 images fails on the mock distribution.
    ok = face > 0.15 and lighting > 0.12 and sharpness > 0.1
    return {
        "usable": ok,
        "face_detected": face > 0.15,
        "lighting_score": round(lighting, 3),
        "sharpness_score": round(sharpness, 3),
    }


def skin_type(image_ref: str) -> dict:
    """Single-label skin-type classification (EfficientNet-B0 head, mocked)."""
    idx = int(_rng(image_ref, "stype") * len(SKIN_TYPES)) % len(SKIN_TYPES)
    conf = round(0.6 + _rng(image_ref, "stype-conf") * 0.4, 3)
    return {"skin_type": SKIN_TYPES[idx], "confidence": conf}


def concerns(image_ref: str) -> dict:
    """Multi-label concern detection with per-concern probabilities (mocked)."""
    scores = {c: round(_rng(image_ref, "c:" + c), 3) for c in CONCERNS}
    present = {c: p for c, p in scores.items() if p >= 0.5}
    return {"scores": scores, "present": sorted(present, key=present.get, reverse=True)}


def metrics(image_ref: str) -> dict:
    """OpenCV-style surface metrics (redness index, texture, tone eveness)."""
    return {
        "redness_index": round(_rng(image_ref, "red") * 100, 1),
        "texture_score": round(_rng(image_ref, "tex") * 100, 1),
        "tone_evenness": round(_rng(image_ref, "tone") * 100, 1),
    }
