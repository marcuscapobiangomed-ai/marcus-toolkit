# test_docx_media_strip_exception_is_swallowed

> 9 nodes · cohesion 0.25

## Key Concepts

- **test_docx_media_strip_exception_is_swallowed()** (6 connections) — `ESCRITOS ARTIGOS V2/claude-watermark-remover/tests/test_container_meta.py`
- **_make_docx_with_media()** (5 connections) — `ESCRITOS ARTIGOS V2/claude-watermark-remover/tests/test_container_meta.py`
- **_minimal_jpeg_with_exif()** (5 connections) — `ESCRITOS ARTIGOS V2/claude-watermark-remover/tests/test_container_meta.py`
- **test_docx_cleans_embedded_jpeg_metadata()** (3 connections) — `ESCRITOS ARTIGOS V2/claude-watermark-remover/tests/test_container_meta.py`
- **test_docx_media_unknown_format_left_untouched()** (2 connections) — `ESCRITOS ARTIGOS V2/claude-watermark-remover/tests/test_container_meta.py`
- **_boom()** (1 connections) — `ESCRITOS ARTIGOS V2/claude-watermark-remover/tests/test_container_meta.py`
- **MonkeyPatch** (1 connections)
- **Minimal JPEG: SOI, APP0 JFIF, APP1 EXIF-shaped payload, SOS stub, EOI.** (1 connections) — `ESCRITOS ARTIGOS V2/claude-watermark-remover/tests/test_container_meta.py`
- **A crash inside the per-format stripper must not take down the whole DOCX clean…** (1 connections) — `ESCRITOS ARTIGOS V2/claude-watermark-remover/tests/test_container_meta.py`

## Relationships

- [test_container_meta.py](test_container_meta.py.md) (5 shared connections)
- [_make_docx_with_rsid_docid_and_media](_make_docx_with_rsid_docid_and_media.md) (2 shared connections)

## Source Files

- `ESCRITOS ARTIGOS V2/claude-watermark-remover/tests/test_container_meta.py`

## Audit Trail

- EXTRACTED: 14 (88%)
- INFERRED: 2 (12%)
- AMBIGUOUS: 0 (0%)

---

*Part of the graphify knowledge wiki. See [index](index.md) to navigate.*