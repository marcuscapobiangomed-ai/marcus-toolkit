# Changelog

All notable changes to **claude-watermark-remover** are recorded here.
Versions follow [Semantic Versioning](https://semver.org/). Entries below the
`Unreleased` heading ship in the next tag.

This project is a fork of [watermarks-remover](https://github.com/guillaumemeyer/watermarks-remover);
history at and before v0.5.0 is inherited from upstream.

### Unreleased

- **Fix `inspect` missing Layer A carriers in markdown/HTML**: `inspect_container` never scanned the document body, so a `.md` or `.html` file holding invisible Unicode came back `suspicious: false` while `clean_container` went on to strip it — the same bytes saved as `.txt` were correctly flagged. The scan now runs for exactly the formats `clean_container` scrubs, so inspect predicts clean. Container reports gain `suspicious_total` (the same key `TextInspectReport` uses, so the HTTP `suspicious` flag and the `inspect_file` exit code pick it up) and `layer_a_hits`

### [v0.5.0](https://github.com/haidrrrry/claude-watermark-remover/releases/tag/v0.5.0) — service & Docker distribution, HTTP API, and verification harnesses

**Service / Docker distribution**

- **Skill/service split**: the skill (`skills/remove-claude-marks/`) is now a code-free remote client over HTTP; all implementation moved to `service/scripts/` and runs behind `server.py`, a stdlib HTTP entrypoint (`/health`, `/inspect`, `/clean`, `/capabilities`)
- **HTTP service**: `service/scripts/server.py` exposes the cleaning pipeline over JSON/base64; hardening mirrors the CLIs (size caps, binary guard, atomic writes, loopback default, optional `CLAUDE_WM_SERVER_API_KEY` bearer auth)
- **OpenAPI**: `GET /openapi.json` serves a dynamically generated OpenAPI 3.0.3 spec (built from the route table + live config, so it never drifts from the real endpoints); CI validates it with `openapi-spec-validator`
- **Core Docker image** (`service/Dockerfile`): full cleaning service with exiftool / qpdf / c2patool preinstalled; any CLI stays runnable by overriding the command
- **Docker / compose**: `compose.yaml` brings up the whole infra (`core` always; `markllm` / `markdiffusion` behind `profile: harness`; `ctrlregen` / `synthid` behind `profile: heavy` as local-only builds); services are prefixed `wr-`; harness/heavy services default to `command: ["--help"]` so `docker compose up --profile harness --profile heavy` exits cleanly (one-shot CLIs are run with `docker compose run`); new `make compose-check` / `compose-check.sh` validates the running stack (exit code only)
- **GHCR publishing**: `.github/workflows/release-images.yml` publishes `core`, `markllm`, `markdiffusion` images on `v*` tags; `ctrlregen` / `synthid` are never published (upstream licensing)
- **Env configuration**: `.env.example` + service configuration guide; `docker compose` auto-loads `.env`; `.env` is gitignored (deny-by-default)
- **Repo hygiene**: `.gitignore` and `service/.dockerignore` are now deny-by-default — only explicitly allowed paths can be committed or sent in a build context (image contexts only ship `service/scripts/`, which is all the Dockerfiles COPY)
- Tests: `tests/test_http_server.py` (13 cases) for the HTTP service; all suites re-pointed at `service/scripts/`

**MarkDiffusion image-watermark harness (optional)**

- New optional harness (external `THU-BPM/MarkDiffusion`, Apache-2.0): `markdiffusion_harness.py` with `watermark` / `detect` / `purify` subcommands for nine image schemes (Tree-Ring, Ring-ID, ROBIN, WIND, SFW, Gaussian-Shading, GaussMarker, PRC, SEAL)
- `clean_image.py --remove-pixel diffusion` runs the MarkDiffusion `DiffusionPurification` regeneration attack as an alternative pixel-removal engine (conservative strength 0.3 default)
- `setup_markdiffusion.sh` bootstrap (PyPI pin `1.0.2`; `--checkout` editable clone at pinned commit) + `requirements-markdiffusion.txt` + `Dockerfile.markdiffusion` and Makefile `bootstrap-markdiffusion` / `smoke-markdiffusion` / `docker-markdiffusion-build` / `docker-markdiffusion-help`
- Mock-based tests (`tests/test_markdiffusion_harness.py`) — no torch in CI; `references/markdiffusion.md` reference doc
- Docs: same-scheme-only verification caveat (not a vendor-detector oracle) and blind-regeneration drift caveat in README, SKILL.md, `removal-matrix.md`, `markdiffusion.md`

**MarkLLM text-watermark harness (optional)**

- New optional harness (external `THU-BPM/MarkLLM` checkout, Apache-2.0): `detect_text_watermark.py` with `detect` / `watermark` subcommands for KGW and SynthID schemes
- `rewrite_text.py --markllm-scheme` runs before/after detection around a Layer B rewrite (env-gated; reports `cleared`)
- `setup_markllm.sh` bootstrap + `requirements-markllm.txt` (pinned deps) + `Dockerfile.markllm` and Makefile `bootstrap-markllm` / `smoke-markllm` / `docker-markllm-build` / `docker-markllm-help`
- Hardening: `--offline` cache-only model loading (no HF egress, no remote code), 1 MiB config cap, optional `CLAUDE_WM_MARKLLM_RLIMIT_AS` on the rewrite subprocess, pinned torch in the Dockerfile, and clone-SHA verification in `Dockerfile.markllm`
- Mock-based tests (`tests/test_markllm_detect.py`, 21 cases) — no torch in CI; verification-harness caveat (same-config-only, not a vendor-detector oracle) documented in README, SKILL.md, `removal-matrix.md`, `vendor-notes.md`

**Fixes and polish**

- **Layer B**: `rewrite_text.py` now sends `reasoning_effort: "none"` by default for `openai-compatible` backends (`--reasoning-effort` / `CLAUDE_WM_REWRITE_REASONING_EFFORT`; `off` omits it). Reasoning models like `deepseek-v4-flash` otherwise burn ~100s of chain-of-thought on a one-line rewrite (9,894 vs 12 completion tokens)
- **Fix markllm image build**: `requirements-markllm.txt` pinned `tokenizers==0.23.1`, which conflicts with `transformers==5.15.0` (caps `tokenizers<=0.23.0`; no 0.23.0 release exists) — now pinned `tokenizers==0.22.2`; torch moved to the CPU wheel index (`torch==2.13.0.*`) so the image is CPU-only like `Dockerfile.markdiffusion`
- **Fix ctrlregen image build**: the 2023-era research pins (`safetensors==0.4.3`, `transformers==4.37.2` → `tokenizers<0.19`) ship no Python 3.14 wheels, so the base image is now `python:3.11-slim` (digest-pinned, multi-arch)
- **Fix harness images at runtime**: `Dockerfile.markllm` and `Dockerfile.markdiffusion` never copied `common.py` into `/app` (pre-existing bug) — added
- **WebP**: stdlib-only inspection and metadata cleaning for RIFF `C2PA`, XMP, EXIF, and ICC profile chunks (#37)
- **Filename sanitization**: HTTP service refuses unsafe client-supplied output names
- **Fix markdown frontmatter cleaner** crashing on and leaking nested AI keys (#25)
- **Text tools refuse binary input**; `--force-text` overrides (#24)
- **`--json` no longer suppresses the residual-signal exit code** (#30)
- **`inspect_file` prints the filename** in its output (#50)
- **Preserve mixed-case CMS generator meta tags** (#42)
- **Preserve load-bearing script invisibles, strip PUA** in Layer A (#38, #52)
- **Preserve script joiners, flag emoji, and Arabic Cf marks** in Layer A (#28)
- **Harden website audit against SSRF and gzip bombs** (#49)
- **SECURITY.md** only references the private advisories channel (#51)
- **Windows**: PowerShell ports of the setup bootstraps (#40)
- **Docs**: add stars/forks shields and drop star-history chart; add MarkLLM to README references; pull request template; plan for Docker CLI + API deployment

### [v0.4.0](https://github.com/haidrrrry/claude-watermark-remover/releases/tag/v0.4.0) — pixel removal, finding confidence, Windows & false-positive fixes

**Optional CtrlRegen pixel removal (external backend)**

- Optional pixel-domain watermark removal via an external `mertizci/noai-watermark` checkout: `clean_ctrlregen.py` adapter + `setup_ctrlregen.sh` bootstrap (pinned commit, sparse checkout, venv, SHA verification), plus `Dockerfile.ctrlregen` and `make bootstrap-ctrlregen` / `docker-ctrlregen-build` / `smoke-ctrlregen`
- `clean_image.py --remove-pixel ctrlregen` runs metadata strip → CtrlRegen removal → optional reverse-SynthID before/after score; `inspect_image.py` hints at the flag on a high SynthID score
- Conservative default strength `0.25` (presets 0.15/0.25/0.35/0.5/0.7); the 512×512-native pipeline is auto-tiled by the backend for larger images; the torch subprocess gets higher env-overridable resource caps
- Backend is never bundled: `noai-watermark` ships no LICENSE file (treated as all-rights-reserved), and its auto-install/restart code paths are bypassed by using `CtrlRegenEngine` directly

**Finding confidence and aggregate audits**

- Findings are now classified `confirmed` / `probable` / `informational` / `likely_false_positive`, exposed in text/image/container JSON and human reports
- New `audit_dir.py` (recursive tree) and `audit_website.py` (sitemap discovery + crawl) aggregate reports; documented in SKILL.md

**False-positive fixes**

- DOCX: scan only `docProps`/`customXml`, not the visible body (#14)
- Text Layer A: preserve emoji `VS16`/`ZWJ` after an emoji base; new `--strip-emoji-glue` paranoid flag (#22)
- HTML: treat CMS generator tags as informational, not AI metadata (#13)
- PDF: exclude stream payloads from the AI-marker byte scan (#13)
- Inspect reports note unsupported/best-effort paths

**Windows support**

- Gate POSIX-only `preexec_fn` and `os.fchmod` so writes and optional tools run on Windows (#15, #23)
- Reconfigure stdio to UTF-8 so redirected Windows streams no longer raise on invisible Unicode; Windows CI leg + CLI smoke run (#23)

**Docs and supply chain**

- README CtrlRegen section + research references (CtrlRegen, UnMarker, forensic-stealth caveat), responsible-use disclaimer; SKILL/matrix/vendor-notes/ethics updates
- Dependabot config + security-path CODEOWNERS; bump scipy/numpy/opencv-python/scikit-learn/pywavelets and the base image to Python 3.14-slim
- Mock-based CtrlRegen tests (no torch in CI)

### [v0.3.2](https://github.com/haidrrrry/claude-watermark-remover/releases/tag/v0.3.2) — security hardening (safe writes, HTTP client, CI supply chain)

- **Safe, atomic output writes**: every cleaner now writes via temp-file + atomic rename (`safe_write_bytes` / `safe_write_text`), refuses symlinked destinations, and creates `.bak` backups through the same safe path — pre-placed symlinks (e.g. in `/tmp` or download dirs) can no longer redirect a clean write onto an arbitrary file
- **`rewrite_text.py` HTTP client hardening**: redirects are refused outright, so an API key in the `Authorization` header can never be re-sent to an unvalidated host; non-loopback endpoints are **denied by default** (opt in with `--allow-remote` or `CLAUDE_WM_REWRITE_ALLOW_REMOTE=1`); only http(s) schemes are accepted; `--api-key` was removed — keys are env-only via `CLAUDE_WM_REWRITE_API_KEY`
- **Resource caps**: default max input 1 GiB → 256 MiB, new 64 MiB stdin cap, DOCX/ODT zip budget 512 MiB → 128 MiB, and `RLIMIT_AS`/`RLIMIT_FSIZE` applied to exiftool/c2patool/SynthID subprocesses (all caps env-overridable)
- **Supply chain**: CI actions SHA-pinned with `permissions: contents: read`, pinned dev deps (`requirements-dev.txt`), a `pip-audit` step, and a new CodeQL workflow; the Docker image now runs as an unprivileged user with pip pinned
- **Scorer deps**: Pillow bumped 10.4.0 → 12.3.0 (24 known CVEs); API usage verified against the pinned upstream commit
- Tests: 18 new security regression tests (60 total, all passing)

### [v0.3.1](https://github.com/haidrrrry/claude-watermark-remover/releases/tag/v0.3.1) — stronger Layer B statistical-watermark rewrite

- `rewrite_text.py` default paraphrase now performs an explicit **word-choice + syntax** attack (clause order, connectors, transition words, sentence boundaries, function words) rather than a generic rewrite
- New `--strength humanize`: zero-shot "write like a human" pass targeting formulaic AI-style phrasing
- New `--strength code`: rewrites comments, docstrings, and string literals, and renames local identifiers while preserving behavior and public API names
- Structural pass now emits "natural, varied human prose" instead of AI-typical "clear professional style"
- New `--temperature` (default `0.9`) for both Ollama and OpenAI-compatible backends
- New `--candidates N`: generates N rewrites and selects the most lexically diverged (bigram Jaccard distance) with a length-drift guard
- Stronger model hygiene: prefer local open-weight models and avoid any known-watermarked vendor, not just the suspected origin
- Residual-risk reporting now distinguishes short/highly predictable text (lower risk) from long, high-entropy prose (higher risk)
- Docs updated in `SKILL.md`, `removal-matrix.md`, and `vendor-notes.md`; tests cover new prompts, divergence scoring, and candidate selection

### [v0.3.0](https://github.com/haidrrrry/claude-watermark-remover/releases/tag/v0.3.0) — optional SynthID pixel scoring

- Optional pixel-domain SynthID scorer via an external [`aloshdenny/reverse-SynthID`](https://github.com/aloshdenny/reverse-SynthID) checkout (`score_synthid.py`); surfaced in `inspect_image.py` / `clean_image.py` with `REVERSE_SYNTHID_DIR` or `--synthid-dir`
- `setup_synthid.sh` bootstrap (scorer-only dependencies; `--full` installs upstream requirements); `Dockerfile.synthid` plus `make docker-synthid-build` / `docker-synthid-help`
- Makefile `smoke-synthid` and `bootstrap-synthid` targets
- Tests for the scorer adapter, CLI unavailable path, JSON parsing, and runtime errors
- Docs: detection/scoring only (no pixel removal); upstream code is not bundled and remains under its non-commercial Research License

### [v0.2.0](https://github.com/haidrrrry/claude-watermark-remover/releases/tag/v0.2.0) — c2patool false-positive fix

- `image_meta.py`: `has_manifest` no longer flags `Error: No claim found` / `No JUMBF data found` as a manifest (operator-precedence bug: the negative markers now veto every positive branch)
- New `tests/test_c2patool_report.py` (4 cases: no claim, no JUMBF, genuine manifest, tool absent)
- Docs: fixed `c2patool` links (repo moved to `contentauth/c2pa-rs`); added a disclaimer on the quality cost of text-watermark removal

### [v0.1.0](https://github.com/haidrrrry/claude-watermark-remover/releases/tag/v0.1.0) — packaging polish + provenance honesty

- `Makefile` (`test` / `smoke` / `install-skill`) and `pytest.ini`
- Fixture samples for Markdown, HTML, SVG; PDF degraded-clean test
- Docs: industry **two-layer** model (hard-bound C2PA vs soft binding / SynthID-media)
- README residual-risk table + links to external verify tools
- Reference: Institute of AI PM C2PA/SynthID guide
- Soft-binding and pixel/audio/video watermarks explicitly out of scope in skill/matrix/ethics

### [v0.0.1](https://github.com/haidrrrry/claude-watermark-remover/releases/tag/v0.0.1) — initial multi-vendor release

- Agent skill `remove-ai-marks` (replaces Claude-only `remove-claude-marks`)
- **Layer A:** invisible Unicode / bidi / tag chars / space homoglyphs (`inspect_text` / `clean_text`)
- **Layer B:** rewrite guidance + optional `rewrite_text.py` (print-prompt, Ollama, OpenAI-compatible)
- **Files:** C2PA/AI metadata strip for PNG, JPEG, SVG, PDF, DOCX, ODT, HTML, Markdown
- Unified `inspect_file.py` / `clean_file.py`
- Multi-vendor docs (Claude, Gemini/SynthID-class, OpenAI, open-LLM)
- Stdlib-first scripts; optional `c2patool` / `exiftool`
