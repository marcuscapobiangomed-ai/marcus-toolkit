# Documentation

Guides for **claude-watermark-remover**, a local tool that removes AI provenance marks from
text, images and documents.

Start with the [project README](../README.md) for install and a quick tour.

## Guides

| Page | Covers |
| --- | --- |
| [Installation](installation.md) | CLI, Claude Code skill, Cursor skill, Docker, optional system tools |
| [Vendor coverage](vendor-coverage.md) | Which AI tools are detected, the two-tier matching, adding a vendor |
| [FAQ](faq.md) | What an AI watermark is, what removal can and cannot do, troubleshooting |
| [Changelog](../CHANGELOG.md) | Release history |

## Reference material

Deeper background ships with the agent skill:

| Page | Covers |
| --- | --- |
| [Mark classes](../skills/remove-claude-marks/references/mark-classes.md) | Unicode, sampling, C2PA, container metadata |
| [Vendor notes](../skills/remove-claude-marks/references/vendor-notes.md) | Public, class-level detail per vendor with sources |
| [Removal matrix](../skills/remove-claude-marks/references/removal-matrix.md) | Which layer applies to which input |
| [Ethics](../skills/remove-claude-marks/references/ethics.md) | Intended use and honest reporting |
| [How Claude marks content](../skills/remove-claude-marks/references/how-claude-marks.md) | Anthropic-specific detail |
| [MarkDiffusion](../skills/remove-claude-marks/references/markdiffusion.md) | Optional image-watermark harness |

## Project docs

| Page | Covers |
| --- | --- |
| [Contributing](../CONTRIBUTING.md) | Repo layout, workflow, review |
| [Security policy](../SECURITY.md) | Reporting vulnerabilities, scope |
| [Code of conduct](../CODE_OF_CONDUCT.md) | Community expectations |

## Design notes

| Page | Covers |
| --- | --- |
| [Deployment: Docker, CLI, API](plans/ideas/deployment-docker-cli-api.md) | Distribution design sketch |
