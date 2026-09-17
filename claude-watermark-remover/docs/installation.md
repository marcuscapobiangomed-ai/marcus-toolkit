# Installation

Every path here is local. Nothing uploads your files, and none of it needs an API key.

## Requirements

`python3` on PATH. The project targets 3.10+; the core inspect and clean paths also run on
3.9. No pip packages are needed for anything in this page except the test suite.

## As a CLI

```bash
git clone https://github.com/haidrrrry/claude-watermark-remover.git
cd claude-watermark-remover

python3 service/scripts/inspect_file.py draft.md
python3 service/scripts/clean_file.py draft.md -o draft.cleaned.md
```

That is the whole install. There is no build step.

Useful entry points:

| Script | Purpose |
| --- | --- |
| `inspect_file.py` | Report marks in any supported file. Exits non-zero when it finds some |
| `clean_file.py` | Strip marks, routing by extension then magic bytes |
| `inspect_text.py` / `clean_text.py` | Text-only Layer A, with `--stats` |
| `rewrite_text.py` | Layer B prompt hook. Prints the prompt by default |
| `audit_dir.py` | Aggregate report across a directory tree |

## As a Claude Code skill

```bash
make install-claude-skill
```

This syncs the bundled scripts and symlinks the skill into `~/.claude/skills/`. Restart
Claude Code, then invoke `/remove-claude-marks`, or just ask it to strip AI watermarks from
a file.

The skill is self-contained: it bundles its own copy of the cleaning scripts under
`skills/remove-claude-marks/scripts/`, so there is no service to start.

Because the install is a symlink, edits in the repo take effect immediately. After changing
anything in `service/scripts/`, run `make sync-skill` to refresh the bundled copies.
`tests/test_skill_bundle.py` fails if you forget.

## As a Claude Code plugin

[`.claude-plugin/plugin.json`](../.claude-plugin/plugin.json) declares the same skill as a
plugin, so a marketplace entry pointing at this repo installs it in one step.

## As a Cursor skill

A text-only variant, scoped to manuscripts, documentation and web copy. It excludes image,
C2PA and service tooling.

```bash
python3 install_skill.py          # installs to ~/.cursor/skills/
```

On Windows use `py install_skill.py`. Existing installs are preserved unless you pass
`--force`; replacement is staged first and the previous install is kept as a backup.

Optionally add the project rule:

```bash
mkdir -p /path/to/project/.cursor/rules
cp integrations/cursor/clean-user-facing-text.mdc \
  /path/to/project/.cursor/rules/clean-user-facing-text.mdc
```

## As a local HTTP service

For a shared deployment, a host without Python, or the heavy backends.

```bash
make serve        # http://127.0.0.1:8765
```

Binds to loopback only by default. Set `CLAUDE_WM_SERVER_API_KEY` to require
`Authorization: Bearer <key>` on every request. The full contract is served at
`/openapi.json`.

```bash
curl -s http://127.0.0.1:8765/health
curl -s http://127.0.0.1:8765/capabilities
```

## With Docker

```bash
docker compose up --build -d                        # core service
docker compose --profile harness up --build -d      # + MarkLLM / MarkDiffusion
docker compose --profile heavy up --build -d        # + CtrlRegen / SynthID
```

The core image runs read-only, as an unprivileged user, with loopback-only port mapping.

The `heavy` and `harness` images bake in upstream code that is not publicly
redistributable, so they build locally and are never published.

## Optional system tools

Auto-detected when present, and degraded gracefully when absent.

| Tool | Role |
| --- | --- |
| [`qpdf`](https://qpdf.sourceforge.io/) | Structural PDF rebuild. **Required** for a real PDF strip |
| [`exiftool`](https://exiftool.org/) | Residual metadata strip, especially PDF |
| [`c2patool`](https://github.com/contentauth/c2pa-rs/tree/main/cli) | Inspect C2PA manifests |

```bash
brew install qpdf exiftool                          # macOS
sudo apt install qpdf libimage-exiftool-perl        # Debian / Ubuntu
```

Check what is visible:

```bash
for t in qpdf exiftool c2patool; do
  command -v "$t" >/dev/null && echo "$t: yes" || echo "$t: no"
done
```

## Running the tests

The only step that needs pip.

```bash
python3 -m venv .venv
.venv/bin/pip install -r requirements-dev.txt
.venv/bin/python -m pytest        # or: make test
make smoke                        # quick CLI pass over fixtures
```
