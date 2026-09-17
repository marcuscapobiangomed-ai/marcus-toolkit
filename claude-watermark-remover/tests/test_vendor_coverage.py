"""Vendor coverage: which AI tools are detected, and which words are not.

The detector splits vendor names into two tiers. Strict tokens are distinctive
enough to match anywhere, including raw blobs. Loose tokens are real AI tools
whose names are also ordinary words, so they only count inside a structure that
already declares a generator. These tests pin both halves: the loose tier must
stay out of free-text scans, or every stylesheet setting a cursor gets flagged.
"""

from __future__ import annotations

import sys
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[1]
SCRIPTS = ROOT / "service" / "scripts"
sys.path.insert(0, str(SCRIPTS))

from container_meta import (  # noqa: E402
    AI_FRONTMATTER_KEYS,
    _is_cms_generator_meta,
    inspect_html,
    inspect_markdown,
)
from image_meta import (  # noqa: E402
    AI_META_HINTS,
    AI_VENDOR_TOKENS_LOOSE,
    AI_VENDOR_TOKENS_STRICT,
)

# Tools that mark documents through a generator tag.
GENERATOR_VENDORS = [
    "ChatGPT",
    "Claude",
    "Gemini",
    "Copilot",
    "Cursor",
    "Windsurf",
    "Codeium",
    "Midjourney",
    "DALL-E",
    "Stable Diffusion",
    "Adobe Firefly",
    "Perplexity",
    "DeepSeek",
    "Grok",
    "Replit",
    "ComfyUI",
]


@pytest.mark.parametrize("vendor", GENERATOR_VENDORS)
def test_generator_meta_flags_vendor(vendor: str):
    html = f'<html><head><meta name="generator" content="{vendor}"></head><body>x</body></html>'
    _c2pa, has_ai, _findings, _details = inspect_html(html)
    assert has_ai, f"{vendor} generator tag was not flagged"


@pytest.mark.parametrize(
    "cms",
    ["WordPress 6.5", "Hugo 0.120", "Jekyll", "Elementor 3.2", "Docusaurus"],
)
def test_cms_generator_is_not_ai(cms: str):
    tag = f'<meta name="generator" content="{cms}">'
    assert _is_cms_generator_meta(tag), f"{cms} was misread as an AI generator"


# Each of these is a loose-tier vendor name used in its ordinary English sense.
# None may trip the detector on its own.
INNOCENT_PROSE = [
    "a { cursor: pointer; }",
    "magnetic flux density rises",
    "a llama farm in Peru",
    "the mistral wind blows south",
    "firefly larvae glow faintly",
    "Jasper is a variety of chalcedony",
    "to grok something is to understand it",
    "the Gemini program flew twelve missions",
    "sora is a Japanese word for sky",
    "perplexity is a measure of a language model",
]


@pytest.mark.parametrize("prose", INNOCENT_PROSE)
def test_loose_vendor_words_in_prose_do_not_flag(prose: str):
    html = f"<html><head></head><body><p>{prose}</p></body></html>"
    _c2pa, has_ai, _findings, _details = inspect_html(html)
    assert not has_ai, f"false positive on: {prose}"


def test_loose_tokens_absent_from_blob_regex():
    """The loose tier must never reach the regex that scans raw blobs."""
    from container_meta import AI_META_NAME_RE

    # Tokens present in both tiers (e.g. perplexity / perplexity.ai) are
    # exempt: the strict spelling is what AI_META_NAME_RE carries.
    strict_bare = {t.replace(r".?", "") for t in AI_VENDOR_TOKENS_STRICT}
    for token in AI_VENDOR_TOKENS_LOOSE:
        bare = token.replace(r".?", "")
        if any(bare in s for s in strict_bare):
            continue
        assert not AI_META_NAME_RE.search(bare), f"loose token {bare!r} leaked into blob regex"


@pytest.mark.parametrize(
    "key",
    ["chatgpt", "claude", "cursor", "midjourney", "copilot", "gemini", "windsurf"],
)
def test_vendor_names_are_frontmatter_keys(key: str):
    assert key in AI_FRONTMATTER_KEYS


def test_frontmatter_vendor_key_flags():
    text = "---\ntitle: Notes\ncursor: v0.42\n---\n\nBody.\n"
    _c2pa, has_ai, findings, _details = inspect_markdown(text)
    assert has_ai
    assert any("cursor" in f for f in findings)


def test_clean_frontmatter_is_not_flagged():
    text = "---\ntitle: Notes\nauthor: Sam\ndate: 2026-08-16\n---\n\nBody.\n"
    _c2pa, has_ai, _findings, _details = inspect_markdown(text)
    assert not has_ai


@pytest.mark.parametrize(
    "literal",
    [b"ChatGPT", b"Midjourney", b"Stable Diffusion", b"ComfyUI", b"DALL-E", b"ElevenLabs"],
)
def test_image_byte_hints_cover_generators(literal: bytes):
    assert literal in AI_META_HINTS


@pytest.mark.parametrize("editor", [b"Cursor", b"Windsurf", b"Codeium"])
def test_code_editors_excluded_from_image_byte_hints(editor: bytes):
    """Editors mark documents, not pixels; their names are too common for a byte scan."""
    assert editor not in AI_META_HINTS
