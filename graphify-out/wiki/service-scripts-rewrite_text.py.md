# service/scripts/rewrite_text.py

> 33 nodes · cohesion 0.09

## Key Concepts

- **service/scripts/rewrite_text.py** (32 connections) — `ESCRITOS ARTIGOS V2/claude-watermark-remover/service/scripts/rewrite_text.py`
- **rewrite()** (8 connections) — `ESCRITOS ARTIGOS V2/claude-watermark-remover/service/scripts/rewrite_text.py`
- **_markllm_detect()** (7 connections) — `ESCRITOS ARTIGOS V2/claude-watermark-remover/service/scripts/rewrite_text.py`
- **main()** (6 connections) — `ESCRITOS ARTIGOS V2/claude-watermark-remover/service/scripts/rewrite_text.py`
- **_http_json()** (5 connections) — `ESCRITOS ARTIGOS V2/claude-watermark-remover/service/scripts/rewrite_text.py`
- **_lexical_divergence()** (5 connections) — `ESCRITOS ARTIGOS V2/claude-watermark-remover/service/scripts/rewrite_text.py`
- **_NoRedirect** (4 connections) — `ESCRITOS ARTIGOS V2/claude-watermark-remover/service/scripts/rewrite_text.py`
- **_markllm_preexec()** (4 connections) — `ESCRITOS ARTIGOS V2/claude-watermark-remover/service/scripts/rewrite_text.py`
- **_select_candidate()** (4 connections) — `ESCRITOS ARTIGOS V2/claude-watermark-remover/service/scripts/rewrite_text.py`
- **_venv_python()** (4 connections) — `ESCRITOS ARTIGOS V2/claude-watermark-remover/service/scripts/rewrite_text.py`
- **call_ollama()** (3 connections) — `ESCRITOS ARTIGOS V2/claude-watermark-remover/service/scripts/rewrite_text.py`
- **call_openai_compatible()** (3 connections) — `ESCRITOS ARTIGOS V2/claude-watermark-remover/service/scripts/rewrite_text.py`
- **_check_remote()** (3 connections) — `ESCRITOS ARTIGOS V2/claude-watermark-remover/service/scripts/rewrite_text.py`
- **_tokens()** (3 connections) — `ESCRITOS ARTIGOS V2/claude-watermark-remover/service/scripts/rewrite_text.py`
- **_bigrams()** (2 connections) — `ESCRITOS ARTIGOS V2/claude-watermark-remover/service/scripts/rewrite_text.py`
- **build_prompt()** (2 connections) — `ESCRITOS ARTIGOS V2/claude-watermark-remover/service/scripts/rewrite_text.py`
- **_env()** (2 connections) — `ESCRITOS ARTIGOS V2/claude-watermark-remover/service/scripts/rewrite_text.py`
- **_flag_env()** (2 connections) — `ESCRITOS ARTIGOS V2/claude-watermark-remover/service/scripts/rewrite_text.py`
- **collections_abc** (2 connections)
- **_apply()** (1 connections) — `ESCRITOS ARTIGOS V2/claude-watermark-remover/service/scripts/rewrite_text.py`
- **.redirect_request()** (1 connections) — `ESCRITOS ARTIGOS V2/claude-watermark-remover/service/scripts/rewrite_text.py`
- **Path** (1 connections)
- **Pick the most lexically diverged rewrite, gently guarding extreme length drift.** (1 connections) — `ESCRITOS ARTIGOS V2/claude-watermark-remover/service/scripts/rewrite_text.py`
- **Enforce the rewrite-endpoint allowlist. Default-deny: only loopback endpoints…** (1 connections) — `ESCRITOS ARTIGOS V2/claude-watermark-remover/service/scripts/rewrite_text.py`
- **Refuse HTTP redirects. urllib's default handler re-sends the request headers on…** (1 connections) — `ESCRITOS ARTIGOS V2/claude-watermark-remover/service/scripts/rewrite_text.py`
- *... and 8 more nodes in this community*

## Relationships

- [json](json.md) (8 shared connections)
- [subprocess](subprocess.md) (2 shared connections)
- [re](re.md) (2 shared connections)
- [os](os.md) (1 shared connections)
- [test_rewrite_text.py](test_rewrite_text.py.md) (1 shared connections)
- [scielo_articlemeta.py](scielo_articlemeta.py.md) (1 shared connections)
- [deep_links.py](deep_links.py.md) (1 shared connections)
- [remove-claude-marks/scripts/rewrite_text.py](remove-claude-marks-scripts-rewrite_text.py.md) (1 shared connections)

## Source Files

- `ESCRITOS ARTIGOS V2/claude-watermark-remover/service/scripts/rewrite_text.py`

## Audit Trail

- EXTRACTED: 65 (98%)
- INFERRED: 1 (2%)
- AMBIGUOUS: 0 (0%)

---

*Part of the graphify knowledge wiki. See [index](index.md) to navigate.*