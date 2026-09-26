"""The skill bundles copies of the service scripts. Keep them honest.

`skills/remove-claude-marks/scripts/` exists so the skill runs with no service,
no venv and no pip install. That convenience costs a second copy of each module,
and a copy that drifts from `service/scripts/` is worse than no copy at all:
the skill would silently clean with stale vendor lists. These tests fail the
moment the two diverge, and `make sync-skill` is the fix.
"""

from __future__ import annotations

import ast
import subprocess
import sys
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[1]
SERVICE = ROOT / "service" / "scripts"
BUNDLE = ROOT / "skills" / "remove-claude-marks" / "scripts"

# Entry points the SKILL.md tells the agent to run.
ENTRY_POINTS = [
    "inspect_file.py",
    "clean_file.py",
    "inspect_text.py",
    "clean_text.py",
]

# Deliberately absent: the server and the heavy/optional backends.
EXCLUDED = {
    "server.py",
    "audit_dir.py",
    "audit_lib.py",
    "audit_website.py",
    "clean_ctrlregen.py",
    "detect_text_watermark.py",
    "markdiffusion_harness.py",
    "score_synthid.py",
}


def _bundled() -> set[str]:
    return {p.name for p in BUNDLE.glob("*.py")}


def test_bundle_exists():
    assert BUNDLE.is_dir(), "skill script bundle is missing"
    assert _bundled(), "skill script bundle is empty"


@pytest.mark.parametrize("name", sorted(_bundled()))
def test_bundled_file_matches_service_copy(name: str):
    service_copy = SERVICE / name
    assert service_copy.is_file(), f"{name} is bundled but no longer in service/scripts"
    assert (BUNDLE / name).read_bytes() == service_copy.read_bytes(), (
        f"{name} has drifted from service/scripts/{name}. Run: make sync-skill"
    )


def test_bundle_excludes_server_and_heavy_backends():
    leaked = _bundled() & EXCLUDED
    assert not leaked, f"bundle should not ship {sorted(leaked)}"


def test_bundle_is_import_closed():
    """Every local import a bundled module makes must also be bundled."""
    names = {p.stem for p in BUNDLE.glob("*.py")}
    for path in BUNDLE.glob("*.py"):
        tree = ast.parse(path.read_text(encoding="utf-8"))
        for node in ast.walk(tree):
            if isinstance(node, ast.ImportFrom) and node.module:
                target = node.module
            elif isinstance(node, ast.Import):
                target = node.names[0].name
            else:
                continue
            if (SERVICE / f"{target}.py").is_file():
                assert target in names, (
                    f"{path.name} imports {target}, which is not bundled"
                )


@pytest.mark.parametrize("entry", ENTRY_POINTS)
def test_entry_point_runs_from_bundle(entry: str):
    result = subprocess.run(
        [sys.executable, str(BUNDLE / entry), "--help"],
        capture_output=True,
        text=True,
        timeout=60,
    )
    assert result.returncode == 0, result.stderr


def test_bundle_cleans_without_any_service(tmp_path: Path):
    """End to end through the bundle alone: no server, no network, no venv."""
    src = tmp_path / "ai.md"
    src.write_text(
        "---\ntitle: Notes\ngenerator: ChatGPT\ncursor: v0.42\n---\n\nHello​ world\n",
        encoding="utf-8",
    )
    out = tmp_path / "ai.cleaned.md"

    result = subprocess.run(
        [sys.executable, str(BUNDLE / "clean_file.py"), str(src), "-o", str(out)],
        capture_output=True,
        text=True,
        timeout=60,
    )

    assert result.returncode == 0, result.stderr
    cleaned = out.read_text(encoding="utf-8")
    assert "ChatGPT" not in cleaned
    assert "generator" not in cleaned
    assert "​" not in cleaned, "invisible carrier survived"
    assert "Hello world" in cleaned
