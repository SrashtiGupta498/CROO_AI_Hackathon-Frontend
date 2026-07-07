"""
Thin stdin/stdout bridge so a non-Python process (the Node CAP provider) can run
one Aura analysis without importing Python.

Usage:
    echo '{"image_ref": "abc", "goal": "reduce acne"}' | python -m mesh.analyze_cli

Contract:
  * stdin  : one JSON object of order requirements (may be empty / "{}").
  * stdout : one JSON object — the analysis report from ``service.run_analysis``.
  * exit 0 on success; exit 1 with ``{"error": "..."}`` on stdout on failure.

Must be run with ``cap-mesh/`` on the path (i.e. cwd = cap-mesh, invoked as
``python -m mesh.analyze_cli``) so both ``mesh`` and ``cap`` import cleanly.
"""

from __future__ import annotations

import json
import sys


def main() -> int:
    raw = sys.stdin.read().strip()
    try:
        params = json.loads(raw) if raw else {}
        if not isinstance(params, dict):
            params = {"goal": str(params)}
    except json.JSONDecodeError:
        # Requirements weren't JSON — treat the whole string as a free-text goal.
        params = {"goal": raw}

    try:
        from mesh.service import run_analysis

        report = run_analysis(params)
        json.dump(report, sys.stdout)
        return 0
    except Exception as exc:  # noqa: BLE001 — surface any failure as JSON
        json.dump({"error": f"{type(exc).__name__}: {exc}"}, sys.stdout)
        return 1


if __name__ == "__main__":
    sys.exit(main())
