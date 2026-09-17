"""Tests for SVG/HTML/MD/DOCX/ODT container cleaners."""

from __future__ import annotations

import io
import json
import posixpath
import re
import struct
import subprocess
import sys
import zipfile
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[1]
SCRIPTS = ROOT / "service" / "scripts"
sys.path.insert(0, str(SCRIPTS))

import container_meta  # noqa: E402
from container_meta import (  # noqa: E402
    clean_container,
    clean_docx,
    clean_html,
    clean_markdown,
    clean_odt,
    clean_svg,
    inspect_container,
    inspect_html,
    inspect_markdown,
    inspect_svg,
)


def _run(script: str, *args: str) -> subprocess.CompletedProcess:
    return subprocess.run(
        [sys.executable, str(SCRIPTS / script), *args],
        capture_output=True,
        text=True,
        timeout=60,
    )


def test_markdown_frontmatter():
    text = """---
title: Hello
generator: Claude
ai_generated: true
---
Body\u200b text.
"""
    _c2, has_ai, findings, _d = inspect_markdown(text)
    assert has_ai
    assert any("generator" in f or "ai" in f.lower() for f in findings)
    cleaned, actions = clean_markdown(text)
    assert "generator:" not in cleaned
    assert "ai_generated:" not in cleaned
    assert "title: Hello" in cleaned
    assert any("drop" in a for a in actions)


def test_markdown_frontmatter_with_blank_line_does_not_crash():
    """Regression: a blank line inside frontmatter used to raise IndexError."""
    text = "---\ntitle: Demo\n\nauthor: you\n---\nBody\n"
    cleaned, actions = clean_markdown(text)
    assert "title: Demo" in cleaned
    assert "author: you" in cleaned
    assert actions


def test_markdown_drops_nested_children_of_dropped_key():
    """Regression: nested values under a dropped AI key survived the clean."""
    text = (
        "---\n"
        "title: Demo\n"
        "model:\n"
        "  name: claude-opus\n"
        "  version: 4\n"
        "author: you\n"
        "---\nBody\n"
    )
    cleaned, actions = clean_markdown(text)
    assert "claude-opus" not in cleaned      # the leak
    assert "version: 4" not in cleaned
    assert "title: Demo" in cleaned          # siblings untouched
    assert "author: you" in cleaned
    assert any("drop frontmatter key: model" in a for a in actions)


def test_markdown_clean_output_is_no_longer_flagged():
    """Round-trip: re-inspecting a cleaned document reports nothing AI-ish."""
    text = "---\ntitle: Demo\nmodel:\n  name: claude-opus\ngenerator: Claude\n---\nBody\n"
    cleaned, _ = clean_markdown(text)
    _c2, has_ai, findings, _d = inspect_markdown(cleaned)
    assert not has_ai, findings


def test_markdown_preserves_comments_and_non_ai_keys():
    text = "---\n# editorial notes\ntitle: Demo\ntags:\n  - one\n  - two\n---\nBody\n"
    cleaned, _ = clean_markdown(text)
    assert "# editorial notes" in cleaned
    assert "- one" in cleaned and "- two" in cleaned


def test_html_meta_strip():
    html = """<html><head>
<meta name="generator" content="ChatGPT">
<meta name="viewport" content="width=device-width">
<meta name="description" content="ok">
</head><body data-ai-model="gpt">Hi</body></html>"""
    _c2, has_ai, findings, _ = inspect_html(html)
    assert has_ai
    cleaned, actions = clean_html(html)
    assert "ChatGPT" not in cleaned
    assert "viewport" in cleaned
    assert "data-ai-model" not in cleaned
    assert any("drop" in a for a in actions)


def test_html_cms_generator_not_ai():
    html = '<meta name="generator" content="WordPress 6.0">'
    has_c2pa, has_ai, findings, _ = inspect_html(html)
    assert not has_c2pa
    assert not has_ai
    assert any("cms" in f for f in findings)


def test_html_cms_generator_preserved_by_clean():
    html = '<html><head><meta name="generator" content="WordPress 6.0"><meta name="viewport" content="width=device-width"></head></html>'
    cleaned, actions = clean_html(html)
    assert "WordPress" in cleaned
    assert "viewport" in cleaned


def test_html_cms_generator_attribute_names_are_case_insensitive():
    for html in (
        '<META NAME="generator" CONTENT="WordPress 6.0">',
        '<meta Name="generator" Content="WordPress 6.0">',
    ):
        has_c2pa, has_ai, findings, _ = inspect_html(html)
        assert not has_c2pa
        assert not has_ai
        assert any("cms" in finding for finding in findings)
        assert clean_html(html)[0] == html

    ai_html = '<META NAME="generator" CONTENT="Claude">'
    assert inspect_html(ai_html)[1]
    assert clean_html(ai_html)[0] == ""


def test_html_ai_generator_still_dropped():
    html = '<meta name="generator" content="Claude">'
    cleaned, actions = clean_html(html)
    assert "Claude" not in cleaned
    assert any("drop" in a for a in actions)


def test_pdf_stream_byte_collision_not_ai(tmp_path: Path):
    from container_meta import inspect_pdf

    pdf = b"%PDF-1.4\n1 0 obj<< /Length 4 >>stream\nAIGC\nendstream\nendobj\n%%EOF\n"
    src = tmp_path / "collision.pdf"
    src.write_bytes(pdf)
    has_c2pa, has_ai, findings, _ = inspect_pdf(src, pdf)
    assert not has_c2pa
    assert not has_ai


def test_svg_metadata():
    svg = b"""<?xml version="1.0"?>
<svg xmlns="http://www.w3.org/2000/svg">
  <metadata>c2pa contentcredentials Anthropic</metadata>
  <circle cx="1" cy="1" r="1"/>
</svg>"""
    has_c2pa, has_ai, findings, _ = inspect_svg(svg)
    assert has_c2pa or has_ai
    cleaned, actions = clean_svg(svg)
    assert b"<metadata" not in cleaned.lower() or b"c2pa" not in cleaned.lower()
    assert b"<circle" in cleaned
    assert any("metadata" in a or "drop" in a for a in actions)


def _make_docx_with_app(app_name: str = "Claude AI Writer") -> bytes:
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w") as zf:
        zf.writestr(
            "[Content_Types].xml",
            """<?xml version="1.0"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
  <Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>
  <Override PartName="/customXml/item1.xml" ContentType="application/xml"/>
</Types>""",
        )
        zf.writestr(
            "word/document.xml",
            '<?xml version="1.0"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body><w:p><w:r><w:t>Hello</w:t></w:r></w:p></w:body></w:document>',
        )
        zf.writestr(
            "docProps/app.xml",
            f'<?xml version="1.0"?><Properties><Application>{app_name}</Application></Properties>',
        )
        zf.writestr(
            "customXml/item1.xml",
            '<?xml version="1.0"?><root>c2pa contentcredentials</root>',
        )
    return buf.getvalue()


def test_docx_strips_app_and_customxml(tmp_path: Path):
    data = _make_docx_with_app()
    cleaned, actions = clean_docx(data)
    assert any("customXml" in a or "Application" in a or "drop" in a for a in actions)
    with zipfile.ZipFile(io.BytesIO(cleaned)) as zf:
        names = zf.namelist()
        assert "word/document.xml" in names
        assert not any(n.startswith("customXml/") for n in names)
        app = zf.read("docProps/app.xml").decode()
        assert "Claude" not in app


def _dangling_rels(zip_bytes: bytes) -> list[str]:
    """Return every internal relationship whose target part is missing."""
    bad: list[str] = []
    with zipfile.ZipFile(io.BytesIO(zip_bytes)) as zf:
        names = set(zf.namelist())
        for rels in (n for n in names if n.endswith(".rels")):
            base = posixpath.dirname(posixpath.dirname(rels))
            text = zf.read(rels).decode()
            for m in re.finditer(
                r'<Relationship\b[^>]*Target="([^"]*)"[^>]*/>', text, re.I
            ):
                target, tag = m.group(1), m.group(0)
                if re.search(r"\bTargetMode\s*=", tag, re.I):
                    continue  # external
                if target.startswith("/"):
                    resolved = posixpath.normpath(target.lstrip("/"))
                else:
                    resolved = posixpath.normpath(posixpath.join(base, target))
                if resolved not in ("", ".") and resolved not in names:
                    bad.append(f"{rels} -> {target}")
    return bad


def _make_docx_with_rels() -> bytes:
    """DOCX whose document rels reference customXml, a kept part and a URL."""
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w") as zf:
        zf.writestr(
            "[Content_Types].xml",
            """<?xml version="1.0"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
  <Override PartName="/customXml/item1.xml" ContentType="application/xml"/>
</Types>""",
        )
        zf.writestr(
            "word/document.xml",
            '<?xml version="1.0"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body><w:p><w:r><w:t>Hello</w:t></w:r></w:p></w:body></w:document>',
        )
        zf.writestr(
            "customXml/item1.xml",
            '<?xml version="1.0"?><root>c2pa contentcredentials</root>',
        )
        zf.writestr(
            "word/_rels/document.xml.rels",
            """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="document.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/customXml" Target="../customXml/item1.xml"/>
  <Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/hyperlink" Target="https://example.com/" TargetMode="External"/>
</Relationships>""",
        )
    return buf.getvalue()


def test_docx_dropped_customxml_prunes_dangling_relationships():
    data = _make_docx_with_rels()
    assert _dangling_rels(data) == []
    cleaned, actions = clean_docx(data)
    with zipfile.ZipFile(io.BytesIO(cleaned)) as zf:
        names = zf.namelist()
        assert not any(n.startswith("customXml/") for n in names)
        rels = zf.read("word/_rels/document.xml.rels").decode()
        assert "../customXml/item1.xml" not in rels
        assert 'Target="document.xml"' in rels
        assert 'TargetMode="External"' in rels
    assert _dangling_rels(cleaned) == []
    assert any("prune dangling relationships" in a for a in actions)


def _make_docx_with_body_text(body_text: str = "Claude wrote this.") -> bytes:
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w") as zf:
        zf.writestr(
            "[Content_Types].xml",
            """<?xml version="1.0"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
  <Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>
</Types>""",
        )
        zf.writestr(
            "word/document.xml",
            '<?xml version="1.0"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body><w:p><w:r><w:t>'
            + body_text
            + "</w:t></w:r></w:p></w:body></w:document>",
        )
        zf.writestr(
            "docProps/core.xml",
            '<?xml version="1.0"?><cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties"></cp:coreProperties>',
        )
    return buf.getvalue()


def test_docx_body_vendor_word_is_not_ai_metadata():
    from container_meta import inspect_docx

    data = _make_docx_with_body_text()
    has_c2pa, has_ai, findings, _ = inspect_docx(data)
    assert not has_c2pa
    assert not has_ai
    assert not any("Claude" in f for f in findings)


def test_docx_metadata_vendor_word_is_still_flagged():
    from container_meta import inspect_docx

    data = _make_docx_with_app("Claude AI Writer")
    has_c2pa, has_ai, findings, _ = inspect_docx(data)
    assert has_ai
    assert any("Claude" in f for f in findings)


def _make_docx_with_docprops() -> bytes:
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w") as zf:
        zf.writestr(
            "[Content_Types].xml",
            """<?xml version="1.0"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
  <Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>
  <Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/>
  <Override PartName="/docProps/custom.xml" ContentType="application/vnd.openxmlformats-officedocument.custom-properties+xml"/>
</Types>""",
        )
        zf.writestr(
            "word/document.xml",
            '<?xml version="1.0"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body><w:p><w:r><w:t>Hello</w:t></w:r></w:p></w:body></w:document>',
        )
        zf.writestr(
            "docProps/core.xml",
            """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/">
  <dc:title>My Document</dc:title>
  <dc:creator>ChatGPT</dc:creator>
  <cp:lastModifiedBy>Claude</cp:lastModifiedBy>
  <dc:description>Generated by AI</dc:description>
  <cp:keywords>ai, model</cp:keywords>
  <dc:subject>artificial intelligence</dc:subject>
  <cp:category>report</cp:category>
</cp:coreProperties>""",
        )
        zf.writestr(
            "docProps/app.xml",
            """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties">
  <Application>ChatGPT</Application>
  <AppVersion>16.0</AppVersion>
  <Company>OpenAI</Company>
  <Manager>Someone</Manager>
</Properties>""",
        )
        zf.writestr(
            "docProps/custom.xml",
            """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/custom-properties" xmlns:vt="http://schemas.openxmlformats.org/officeDocument/2006/docPropsVTypes">
  <property fmtid="{D5CDD505-2E9C-101B-9397-08002B2CF9AE}" pid="2" name="Client"><vt:lpwstr>Acme</vt:lpwstr></property>
</Properties>""",
        )
    return buf.getvalue()


def _make_docx_with_invisible_body() -> bytes:
    buf = io.BytesIO()
    document = (
        '<?xml version="1.0"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">'
        "<w:body>"
        "<w:p><w:r><w:t>Hello\u200b world\u2060 with\u00a0space </w:t></w:r></w:p>"
        '<w:p><w:r><w:instrText xml:space="preserve"> FIELD \u200b KEEP </w:instrText></w:r></w:p>'
        '<w:p><w:r><w:t xml:space="preserve">keep\u200bme </w:t></w:r></w:p>'
        "</w:body></w:document>"
    )
    with zipfile.ZipFile(buf, "w") as zf:
        zf.writestr(
            "[Content_Types].xml",
            """<?xml version="1.0"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
  <Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>
</Types>""",
        )
        zf.writestr("word/document.xml", document)
        zf.writestr(
            "docProps/core.xml",
            '<?xml version="1.0"?><cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties"></cp:coreProperties>',
        )
    return buf.getvalue()


def test_docx_scrubs_docprops_provenance_fields_unconditionally():
    import xml.etree.ElementTree as ET

    data = _make_docx_with_docprops()
    cleaned, actions = clean_docx(data)

    with zipfile.ZipFile(io.BytesIO(cleaned)) as zf:
        names = zf.namelist()
        assert "docProps/core.xml" in names
        assert "docProps/app.xml" in names
        assert "docProps/custom.xml" not in names
        ct = zf.read("[Content_Types].xml").decode()
        assert 'PartName="/docProps/custom.xml"' not in ct

        core = zf.read("docProps/core.xml").decode()
        app = zf.read("docProps/app.xml").decode()

    # Every provenance field is emptied...
    for field in ("dc:creator", "cp:lastModifiedBy", "dc:description", "cp:keywords", "dc:subject", "cp:category"):
        assert f"<{field}></{field}>" in core or f"<{field}/>" in core
    for field in ("Application", "AppVersion", "Company", "Manager"):
        assert f"<{field}></{field}>" in app or f"<{field}/>" in app
    # ...while dc:title survives
    assert "<dc:title>My Document</dc:title>" in core
    assert "ChatGPT" not in core
    assert "Generated by AI" not in core
    assert "OpenAI" not in app

    # The output docProps remain well-formed XML.
    ET.fromstring(core)
    ET.fromstring(app)

    assert any("scrub docProps/core.xml field dc:creator" in a for a in actions)
    assert any("drop part docProps/custom.xml" in a for a in actions)


def test_docx_docprops_scrub_clears_residual_warning(tmp_path: Path):
    src = tmp_path / "in.docx"
    src.write_bytes(_make_docx_with_docprops())
    dest = tmp_path / "out.docx"
    result = clean_container(src, dest)
    assert result["format"] == "docx"
    assert not result["still_has_ai_metadata"]
    assert not any("docProps/core.xml" in f for f in result["post_findings"])


def test_docx_layer_a_strips_invisible_body_chars():
    data = _make_docx_with_invisible_body()
    cleaned, actions = clean_docx(data)
    assert any(a.startswith("layer A text: removed=") for a in actions)
    with zipfile.ZipFile(io.BytesIO(cleaned)) as zf:
        doc = zf.read("word/document.xml").decode()
        # ZWSP / word joiner / NBSP removed from w:t runs...
        assert "Hello\u200b" not in doc
        assert "world\u2060" not in doc
        assert "with\u00a0space" not in doc
        # ...NBSP was replaced with a regular space, trailing space keeps preserve
        assert '<w:t xml:space="preserve">Hello world with space </w:t>' in doc
        # field codes are never touched
        assert " FIELD \u200b KEEP " in doc
        # existing xml:space is retained on cleaned runs
        assert '<w:t xml:space="preserve">keepme </w:t>' in doc


def test_docx_layer_a_can_be_disabled():
    data = _make_docx_with_invisible_body()
    cleaned, actions = clean_docx(data, also_layer_a_text=False)
    assert not any(a.startswith("layer A text:") for a in actions)
    with zipfile.ZipFile(io.BytesIO(cleaned)) as zf:
        assert "Hello\u200b" in zf.read("word/document.xml").decode()


def test_docx_layer_a_via_clean_container(tmp_path: Path):
    src = tmp_path / "in.docx"
    src.write_bytes(_make_docx_with_invisible_body())
    dest = tmp_path / "out.docx"
    result = clean_container(src, dest)
    assert any(a.startswith("layer A text: removed=") for a in result["actions"])
    with zipfile.ZipFile(dest) as zf:
        doc = zf.read("word/document.xml").decode()
        assert "Hello\u200b" not in doc
        assert " FIELD \u200b KEEP " in doc


def _make_odt_with_invisible_text() -> bytes:
    buf = io.BytesIO()
    content = (
        '<?xml version="1.0"?><office:document-content xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office:1.0" '
        'xmlns:text="urn:oasis:names:tc:opendocument:xmlns:text:1.0">'
        "<office:body><office:text>"
        '<text:p text:style-name="P1">Hello\u200b <text:span>world\u2060</text:span>!</text:p>'
        "</office:text></office:body></office:document-content>"
    )
    with zipfile.ZipFile(buf, "w") as zf:
        zf.writestr("mimetype", "application/vnd.oasis.opendocument.text")
        zf.writestr("meta.xml", '<?xml version="1.0"?><office:document-meta/>')
        zf.writestr("content.xml", content)
        zf.writestr("META-INF/manifest.xml", '<?xml version="1.0"?><manifest:manifest/>')
    return buf.getvalue()


def test_odt_layer_a_strips_invisible_text():
    data = _make_odt_with_invisible_text()
    cleaned, actions = clean_odt(data)
    assert any(a.startswith("layer A text: removed=") for a in actions)
    with zipfile.ZipFile(io.BytesIO(cleaned)) as zf:
        content = zf.read("content.xml").decode()
        assert "\u200b" not in content
        assert "\u2060" not in content
        assert "<text:span>world</text:span>" in content


def _make_odt(generator: str = "Anthropic Claude") -> bytes:
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w") as zf:
        zf.writestr("mimetype", "application/vnd.oasis.opendocument.text")
        zf.writestr(
            "meta.xml",
            f'<?xml version="1.0"?><office:document-meta xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office:1.0" xmlns:meta="urn:oasis:names:tc:opendocument:xmlns:meta:1.0"><meta:generator>{generator}</meta:generator></office:document-meta>',
        )
        zf.writestr(
            "content.xml",
            '<?xml version="1.0"?><office:document-content xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office:1.0"/>',
        )
        zf.writestr(
            "META-INF/manifest.xml",
            '<?xml version="1.0"?><manifest:manifest xmlns:manifest="urn:oasis:names:tc:opendocument:xmlns:manifest:1.0"/>',
        )
    return buf.getvalue()


def test_odt_drops_generator(tmp_path: Path):
    data = _make_odt()
    cleaned, actions = clean_odt(data)
    assert any("generator" in a for a in actions)
    with zipfile.ZipFile(io.BytesIO(cleaned)) as zf:
        meta = zf.read("meta.xml").decode()
        assert "Claude" not in meta
        assert "meta:generator" not in meta or "Anthropic" not in meta


def test_clean_container_markdown_file(tmp_path: Path):
    src = tmp_path / "x.md"
    src.write_text("---\ngenerator: OpenAI\n---\nHi\u200b\n", encoding="utf-8")
    dest = tmp_path / "x.cleaned.md"
    result = clean_container(src, dest)
    assert dest.is_file()
    body = dest.read_text(encoding="utf-8")
    assert "generator" not in body
    assert "\u200b" not in body
    assert result["format"] == "markdown"


def test_inspect_container_reports_layer_a_body_text(tmp_path: Path):
    """inspect must flag invisible carriers that clean would strip.

    Regression: markdown/html routed to the container inspector, which never
    ran the Layer A scan, so identical bytes were reported suspicious as .txt
    and clean as .md while clean_container() went on to remove them.
    """
    body = "Hello​world‌ test⁠end.\n"
    for name in ("x.md", "x.html"):
        src = tmp_path / name
        src.write_text(body, encoding="utf-8")
        report = inspect_container(src)
        assert report.layer_a_total == 3, name
        assert report.to_dict()["suspicious_total"] == 3, name
        codepoints = {h["codepoint"] for h in report.layer_a_hits}
        assert {"U+200B", "U+200C", "U+2060"} <= codepoints, name
        assert any(f.startswith("layer-a:") for f in report.findings), name


def test_inspect_container_clean_leaves_no_layer_a(tmp_path: Path):
    """The post-clean re-inspect must come back with nothing left."""
    src = tmp_path / "x.md"
    src.write_text("Hi​‌there\n", encoding="utf-8")
    dest = tmp_path / "x.cleaned.md"
    clean_container(src, dest)
    assert inspect_container(dest).layer_a_total == 0


def test_inspect_container_clean_file_stays_clean(tmp_path: Path):
    """No false positives on ordinary prose."""
    src = tmp_path / "x.md"
    src.write_text("# Title\n\nOrdinary prose, nothing hidden.\n", encoding="utf-8")
    report = inspect_container(src)
    assert report.layer_a_total == 0
    assert report.layer_a_hits == []


def test_inspect_container_svg(tmp_path: Path):
    src = tmp_path / "a.svg"
    src.write_bytes(
        b'<svg xmlns="http://www.w3.org/2000/svg"><metadata>c2pa</metadata></svg>'
    )
    report = inspect_container(src)
    assert report.format == "svg"
    assert report.has_c2pa or report.has_ai_metadata


def test_fixtures_md_html_svg_roundtrip(tmp_path: Path):
    root = Path(__file__).resolve().parents[1] / "tests" / "fixtures"
    for name in ("sample_ai.md", "sample_ai.html", "sample_meta.svg"):
        src = root / name
        dest = tmp_path / f"{name}.cleaned{src.suffix}"
        result = clean_container(src, dest)
        assert dest.is_file()
        assert result["format"] in ("markdown", "html", "svg")
        # AI-ish keys/tags should be reduced
        body = dest.read_bytes().lower()
        assert b"chatgpt" not in body
        assert b"generator: claude" not in body


def test_pdf_degraded_clean_without_crash(tmp_path: Path):
    """Minimal PDF with an XMP packet; clean should not raise (may be degraded)."""
    from container_meta import clean_pdf, inspect_pdf

    xmp = (
        b"<?xpacket begin='' id='W5M0MpCehiHzreSzNTczkc9d'?>"
        b"<x:xmpmeta xmlns:x='adobe:ns:meta/'>"
        b"<rdf:RDF xmlns:rdf='http://www.w3.org/1999/02/22-rdf-syntax-ns#'>"
        b"<rdf:Description>"
        b"<digitalSourceType>trainedAlgorithmicMedia</digitalSourceType>"
        b"</rdf:Description></rdf:RDF></x:xmpmeta>"
        b"<?xpacket end='w'?>"
    )
    # Minimal-ish PDF skeleton (not renderable; enough for byte-level tools)
    pdf = (
        b"%PDF-1.4\n"
        b"1 0 obj<<>>endobj\n"
        b"trailer<<>>\n"
        + xmp
        + b"\n%%EOF\n"
    )
    src = tmp_path / "t.pdf"
    dest = tmp_path / "t.cleaned.pdf"
    src.write_bytes(pdf)
    has_c2pa, has_ai, findings, _ = inspect_pdf(src, pdf)
    assert has_ai or has_c2pa or findings
    actions, meta = clean_pdf(src, dest)
    assert dest.is_file()
    assert actions
    assert meta.get("mode") in ("exiftool", "stdlib-xmp", "copy")


def test_clean_container_accepts_explicit_fmt(tmp_path: Path):
    """A .bak source with no detectable magic bytes still cleans when fmt is pinned."""
    src = tmp_path / "backup.md.bak"
    src.write_text("---\ngenerator: OpenAI\n---\nHi\u200b\n", encoding="utf-8")
    dest = tmp_path / "out.md"
    result = clean_container(src, dest, fmt="markdown")
    assert result["format"] == "markdown"
    body = dest.read_text(encoding="utf-8")
    assert "generator" not in body
    assert "\u200b" not in body


@pytest.mark.parametrize(
    "ext,make_bytes",
    [
        ("md", lambda: (Path(__file__).resolve().parent / "fixtures" / "sample_ai.md").read_bytes()),
        ("html", lambda: (Path(__file__).resolve().parent / "fixtures" / "sample_ai.html").read_bytes()),
        ("svg", lambda: (Path(__file__).resolve().parent / "fixtures" / "sample_meta.svg").read_bytes()),
        ("docx", _make_docx_with_app),
        ("odt", _make_odt),
    ],
)
def test_clean_file_in_place_for_every_container_ext(tmp_path: Path, ext: str, make_bytes):
    path = tmp_path / f"a.{ext}"
    path.write_bytes(make_bytes())
    r = _run("clean_file.py", str(path), "--in-place", "--json")
    assert r.returncode == 0, r.stderr
    assert path.with_suffix(path.suffix + ".bak").is_file()
    data = json.loads(r.stdout)
    assert data["kind"] == "container"
    assert data["format"] == {"docx": "docx", "odt": "odt", "svg": "svg", "md": "markdown", "html": "html"}[ext]


# --- RSID / w14:docId editing-session fingerprints ------------------------


def _make_docx_with_rsid_and_docid() -> bytes:
    buf = io.BytesIO()
    document = (
        '<?xml version="1.0"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">'
        '<w:body>'
        '<w:p w:rsidR="00FC693F" w:rsidRPr="0006063C"><w:r><w:t>Hello world</w:t></w:r></w:p>'
        '<w:sectPr w:rsidSect="00034616"/>'
        "</w:body></w:document>"
    )
    settings = (
        '<?xml version="1.0"?>'
        '<w:settings xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" '
        'xmlns:w14="http://schemas.microsoft.com/office/word/2010/wordml">'
        '<w:zoom w:val="bestFit"/>'
        '<w:rsids><w:rsidRoot w:val="00B47730"/><w:rsid w:val="00034616"/><w:rsid w:val="00FC693F"/></w:rsids>'
        '<w14:docId w14:val="24062061"/>'
        "</w:settings>"
    )
    with zipfile.ZipFile(buf, "w") as zf:
        zf.writestr(
            "[Content_Types].xml",
            """<?xml version="1.0"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
  <Override PartName="/word/settings.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.settings+xml"/>
</Types>""",
        )
        zf.writestr("word/document.xml", document)
        zf.writestr("word/settings.xml", settings)
    return buf.getvalue()


def test_docx_strips_rsid_and_docid():
    import xml.etree.ElementTree as ET

    data = _make_docx_with_rsid_and_docid()
    cleaned, actions = clean_docx(data)

    with zipfile.ZipFile(io.BytesIO(cleaned)) as zf:
        document = zf.read("word/document.xml").decode()
        settings = zf.read("word/settings.xml").decode()

    assert "w:rsid" not in document
    assert "w:rsid" not in settings
    assert "docId" not in settings
    assert "<w:rsids>" not in settings

    # Visible content and unrelated settings survive untouched.
    assert "<w:t>Hello world</w:t>" in document
    assert '<w:zoom w:val="bestFit"/>' in settings

    # Both parts stay well-formed XML.
    ET.fromstring(document)
    ET.fromstring(settings)

    assert any("scrub editing-session fingerprints (RSID/docId)" in a for a in actions)


def test_docx_rsid_scrub_runs_even_with_layer_a_disabled():
    """RSID/docId scrub is a separate concern from the Layer A text pass and
    must not be gated by ``also_layer_a_text``."""
    data = _make_docx_with_rsid_and_docid()
    cleaned, actions = clean_docx(data, also_layer_a_text=False)

    with zipfile.ZipFile(io.BytesIO(cleaned)) as zf:
        document = zf.read("word/document.xml").decode()
        settings = zf.read("word/settings.xml").decode()

    assert "w:rsid" not in document
    assert "w:rsid" not in settings
    assert "docId" not in settings
    assert not any(a.startswith("layer A text:") for a in actions)
    assert any("scrub editing-session fingerprints (RSID/docId)" in a for a in actions)


# --- Embedded image metadata (word/media/) --------------------------------


def _minimal_jpeg_with_exif() -> bytes:
    """Minimal JPEG: SOI, APP0 JFIF, APP1 EXIF-shaped payload, SOS stub, EOI."""
    app0 = b"JFIF\x00\x01\x01\x00\x00\x01\x00\x01\x00\x00"
    app0_seg = b"\xff\xe0" + struct.pack(">H", len(app0) + 2) + app0
    app1 = b"Exif\x00\x00fake-tiff-header-software-tag-Photoshop"
    app1_seg = b"\xff\xe1" + struct.pack(">H", len(app1) + 2) + app1
    sos_payload = b"\x03\x01\x00\x02\x11\x03\x11\x00\x3f\x00"
    sos = b"\xff\xda" + struct.pack(">H", len(sos_payload) + 2) + sos_payload
    entropy = b"\x00\x00"
    return b"\xff\xd8" + app0_seg + app1_seg + sos + entropy + b"\xff\xd9"


def _make_docx_with_media(media_name: str, media_bytes: bytes, content_type: str) -> bytes:
    buf = io.BytesIO()
    document = (
        '<?xml version="1.0"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">'
        "<w:body><w:p><w:r><w:t>Body with an embedded image.</w:t></w:r></w:p></w:body></w:document>"
    )
    with zipfile.ZipFile(buf, "w") as zf:
        zf.writestr(
            "[Content_Types].xml",
            f"""<?xml version="1.0"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="xml" ContentType="application/xml"/>
  <Default Extension="{media_name.rsplit('.', 1)[-1]}" ContentType="{content_type}"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>""",
        )
        zf.writestr("word/document.xml", document)
        zf.writestr(
            "word/_rels/document.xml.rels",
            f"""<?xml version="1.0"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/{media_name}"/>
</Relationships>""",
        )
        zf.writestr(f"word/media/{media_name}", media_bytes)
    return buf.getvalue()


def test_docx_cleans_embedded_jpeg_metadata():
    jpeg = _minimal_jpeg_with_exif()
    assert b"Photoshop" in jpeg  # sanity: fixture actually carries the marker

    data = _make_docx_with_media("photo.jpeg", jpeg, "image/jpeg")
    cleaned, actions = clean_docx(data)

    with zipfile.ZipFile(io.BytesIO(cleaned)) as zf:
        out_jpeg = zf.read("word/media/photo.jpeg")
        document = zf.read("word/document.xml").decode()

    assert b"Photoshop" not in out_jpeg
    assert b"Exif" not in out_jpeg
    # Structurally still a valid-looking JPEG (SOI...EOI).
    assert out_jpeg.startswith(b"\xff\xd8")
    assert out_jpeg.endswith(b"\xff\xd9")
    # Unrelated body text is untouched.
    assert "Body with an embedded image." in document

    assert any("strip jpeg metadata in word/media/photo.jpeg" in a for a in actions)


def test_docx_media_unknown_format_left_untouched():
    junk = b"NOT-AN-IMAGE-JUST-SOME-BYTES" * 4
    data = _make_docx_with_media("mystery.bin", junk, "application/octet-stream")
    cleaned, actions = clean_docx(data)

    with zipfile.ZipFile(io.BytesIO(cleaned)) as zf:
        out_bytes = zf.read("word/media/mystery.bin")

    assert out_bytes == junk
    assert not any("word/media/mystery.bin" in a for a in actions)


def test_docx_media_strip_exception_is_swallowed(monkeypatch: pytest.MonkeyPatch):
    """A crash inside the per-format stripper must not take down the whole
    DOCX clean — the image is left byte-identical instead."""

    def _boom(data: bytes, **kwargs):
        raise RuntimeError("simulated decoder crash")

    monkeypatch.setattr(container_meta, "strip_jpeg", _boom)

    jpeg = _minimal_jpeg_with_exif()
    data = _make_docx_with_media("photo.jpeg", jpeg, "image/jpeg")
    cleaned, actions = clean_docx(data)

    with zipfile.ZipFile(io.BytesIO(cleaned)) as zf:
        out_jpeg = zf.read("word/media/photo.jpeg")
        names = zf.namelist()

    assert out_jpeg == jpeg  # left untouched, not corrupted
    assert "word/media/photo.jpeg" in names
    assert not any("strip jpeg metadata" in a for a in actions)


# --- word/media/ coverage across every embeddable raster format -----------


def _png_chunk_crc(ctype: bytes, payload: bytes) -> bytes:
    import zlib

    crc = zlib.crc32(ctype)
    crc = zlib.crc32(payload, crc) & 0xFFFFFFFF
    return struct.pack(">I", len(payload)) + ctype + payload + struct.pack(">I", crc)


def _minimal_png_with_c2pa() -> bytes:
    import zlib

    sig = b"\x89PNG\r\n\x1a\n"
    ihdr = struct.pack(">IIBBBBB", 1, 1, 8, 2, 0, 0, 0)
    idat = zlib.compress(b"\x00\x00\x00")
    text = b"Comment\x00c2pa contentcredentials"
    return (
        sig
        + _png_chunk_crc(b"IHDR", ihdr)
        + _png_chunk_crc(b"tEXt", text)
        + _png_chunk_crc(b"IDAT", idat)
        + _png_chunk_crc(b"IEND", b"")
    )


def _webp_chunk(fourcc: bytes, payload: bytes) -> bytes:
    padding = b"\x00" if len(payload) & 1 else b""
    return fourcc + struct.pack("<I", len(payload)) + payload + padding


def _minimal_webp_with_exif() -> bytes:
    body = (
        b"WEBP"
        + _webp_chunk(b"VP8 ", b"\x00" * 10)
        + _webp_chunk(b"EXIF", b"fake-exif-Photoshop-marker")
    )
    return b"RIFF" + struct.pack("<I", len(body)) + body


def _isobmff_box(fourcc: bytes, payload: bytes) -> bytes:
    return struct.pack(">I", len(payload) + 8) + fourcc + payload


def _minimal_avif_with_c2pa() -> bytes:
    ftyp = _isobmff_box(b"ftyp", b"avif\x00\x00\x00\x00avifmif1")
    top_jumb = _isobmff_box(b"jumb", b"c2pa.claim.v1 contentcredentials")
    mdat = _isobmff_box(b"mdat", b"pixel-data")
    return ftyp + top_jumb + mdat


def _minimal_heic_with_c2pa() -> bytes:
    ftyp = _isobmff_box(b"ftyp", b"heic\x00\x00\x00\x00mif1heic")
    top_jumb = _isobmff_box(b"jumb", b"c2pa.claim.v1 contentcredentials")
    mdat = _isobmff_box(b"mdat", b"pixel-data")
    return ftyp + top_jumb + mdat


@pytest.mark.parametrize(
    "media_name,builder,content_type,marker,fmt_label",
    [
        ("art.png", _minimal_png_with_c2pa, "image/png", b"c2pa", "png"),
        ("photo.jpeg", _minimal_jpeg_with_exif, "image/jpeg", b"Photoshop", "jpeg"),
        ("icon.webp", _minimal_webp_with_exif, "image/webp", b"Photoshop", "webp"),
        ("shot.avif", _minimal_avif_with_c2pa, "image/avif", b"c2pa", "avif"),
        ("shot.heic", _minimal_heic_with_c2pa, "image/heic", b"c2pa", "heic"),
    ],
)
def test_docx_cleans_embedded_media_every_format(media_name, builder, content_type, marker, fmt_label):
    media_bytes = builder()
    assert marker in media_bytes  # sanity: fixture actually carries the marker

    data = _make_docx_with_media(media_name, media_bytes, content_type)
    cleaned, actions = clean_docx(data)

    with zipfile.ZipFile(io.BytesIO(cleaned)) as zf:
        out_bytes = zf.read(f"word/media/{media_name}")
        document = zf.read("word/document.xml").decode()

    assert marker not in out_bytes, f"{fmt_label}: marker survived cleaning"
    assert "Body with an embedded image." in document
    assert any(f"strip {fmt_label} metadata in word/media/{media_name}" in a for a in actions)


# --- --in-place combined with RSID/docId + embedded-image cleaning --------


def _make_docx_with_rsid_docid_and_media() -> bytes:
    """A single fixture exercising both new code paths at once, the way a
    real manuscript combines editing-session fingerprints with embedded
    figures."""
    buf = io.BytesIO()
    document = (
        '<?xml version="1.0"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">'
        '<w:body>'
        '<w:p w:rsidR="00FC693F"><w:r><w:t>Body with rsid and a figure.</w:t></w:r></w:p>'
        "</w:body></w:document>"
    )
    settings = (
        '<?xml version="1.0"?>'
        '<w:settings xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" '
        'xmlns:w14="http://schemas.microsoft.com/office/word/2010/wordml">'
        '<w:rsids><w:rsidRoot w:val="00B47730"/><w:rsid w:val="00FC693F"/></w:rsids>'
        '<w14:docId w14:val="24062061"/>'
        "</w:settings>"
    )
    jpeg = _minimal_jpeg_with_exif()
    with zipfile.ZipFile(buf, "w") as zf:
        zf.writestr(
            "[Content_Types].xml",
            """<?xml version="1.0"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="xml" ContentType="application/xml"/>
  <Default Extension="jpeg" ContentType="image/jpeg"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
  <Override PartName="/word/settings.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.settings+xml"/>
</Types>""",
        )
        zf.writestr("word/document.xml", document)
        zf.writestr("word/settings.xml", settings)
        zf.writestr(
            "word/_rels/document.xml.rels",
            """<?xml version="1.0"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/figure.jpeg"/>
</Relationships>""",
        )
        zf.writestr("word/media/figure.jpeg", jpeg)
    return buf.getvalue()


def test_docx_in_place_cleans_fingerprints_and_media_keeps_backup(tmp_path: Path):
    src = tmp_path / "manuscript.docx"
    src.write_bytes(_make_docx_with_rsid_docid_and_media())

    r = _run("clean_file.py", str(src), "--in-place", "--json")
    assert r.returncode == 0, r.stderr
    data = json.loads(r.stdout)
    assert data["format"] == "docx"
    assert any("scrub editing-session fingerprints" in a for a in data["actions"])
    assert any("strip jpeg metadata in word/media/figure.jpeg" in a for a in data["actions"])

    bak = src.with_suffix(src.suffix + ".bak")
    assert bak.is_file()

    # The .bak is an exact, untouched copy of the original — fingerprints and
    # EXIF still present there, proving --in-place didn't clean the backup.
    with zipfile.ZipFile(bak) as zf:
        assert "w:rsid" in zf.read("word/settings.xml").decode()
        assert b"Photoshop" in zf.read("word/media/figure.jpeg")

    # The file at the original path is now the cleaned version.
    with zipfile.ZipFile(src) as zf:
        settings = zf.read("word/settings.xml").decode()
        document = zf.read("word/document.xml").decode()
        photo = zf.read("word/media/figure.jpeg")
    assert "w:rsid" not in settings
    assert "docId" not in settings
    assert b"Photoshop" not in photo
    assert "Body with rsid and a figure." in document


# --- RSID in comments.xml / footnotes.xml ----------------------------------


def _make_docx_with_rsid_in_comments_and_footnotes() -> bytes:
    buf = io.BytesIO()
    document = (
        '<?xml version="1.0"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">'
        '<w:body><w:p w:rsidR="00FC693F"><w:r><w:t>Main body.</w:t></w:r></w:p></w:body></w:document>'
    )
    comments = (
        '<?xml version="1.0"?>'
        '<w:comments xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">'
        '<w:comment w:id="0" w:rsidR="00034616"><w:p w:rsidR="00034616"><w:r><w:t>A reviewer note.</w:t></w:r></w:p></w:comment>'
        "</w:comments>"
    )
    footnotes = (
        '<?xml version="1.0"?>'
        '<w:footnotes xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">'
        '<w:footnote w:id="1" w:type="normal"><w:p w:rsidR="00CB0664"><w:r><w:t>A footnote.</w:t></w:r></w:p></w:footnote>'
        "</w:footnotes>"
    )
    with zipfile.ZipFile(buf, "w") as zf:
        zf.writestr(
            "[Content_Types].xml",
            """<?xml version="1.0"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
  <Override PartName="/word/comments.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.comments+xml"/>
  <Override PartName="/word/footnotes.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.footnotes+xml"/>
</Types>""",
        )
        zf.writestr("word/document.xml", document)
        zf.writestr("word/comments.xml", comments)
        zf.writestr("word/footnotes.xml", footnotes)
    return buf.getvalue()


def test_docx_strips_rsid_from_comments_and_footnotes():
    import xml.etree.ElementTree as ET

    data = _make_docx_with_rsid_in_comments_and_footnotes()
    cleaned, actions = clean_docx(data)

    with zipfile.ZipFile(io.BytesIO(cleaned)) as zf:
        comments = zf.read("word/comments.xml").decode()
        footnotes = zf.read("word/footnotes.xml").decode()

    assert "w:rsid" not in comments
    assert "w:rsid" not in footnotes
    # Visible reviewer/footnote text is untouched — only the fingerprint
    # attributes are gone.
    assert "A reviewer note." in comments
    assert "A footnote." in footnotes

    ET.fromstring(comments)
    ET.fromstring(footnotes)

    assert any("scrub editing-session fingerprints (RSID/docId)" in a for a in actions)
