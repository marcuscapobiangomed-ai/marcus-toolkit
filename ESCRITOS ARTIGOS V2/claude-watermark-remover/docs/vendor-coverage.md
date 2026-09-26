# Vendor coverage

Which AI tools this project detects, how the matching avoids false positives, and how
to add a tool that is missing.

The canonical lists live in
[`service/scripts/image_meta.py`](../service/scripts/image_meta.py). This page explains
them; if the two ever disagree, the code is right.

## The two tiers

Vendor names fall into two groups, and the split is the whole reason the detector is
usable on real files.

**Strict tokens** are distinctive enough that seeing them anywhere means something.
`chatgpt`, `midjourney`, `synthid` do not appear in ordinary prose or markup by accident.
These match everywhere: metadata keys, metadata values, XMP packets, and raw byte scans.

**Loose tokens** are real AI tools whose names are also ordinary English words or common
identifiers. `cursor` appears in every stylesheet. `flux` is a physics term. `llama` is an
animal, `firefly` an insect, `grok` a verb, `sora` a Japanese word, `jasper` a mineral.
Matching these in a free-text scan would flag half the web. So they match **only** inside a
structure that already declares a generator:

- the `content` of a `<meta name="generator">` tag
- a YAML frontmatter key

A document that merely contains the word "cursor" is never flagged. A document that says
`<meta name="generator" content="Cursor">` is.

## Strict tokens (29)

Matched anywhere, including raw blobs. Written as regex fragments, so `.?` absorbs the
separator variants vendors actually ship (`DALL-E`, `DALL·E`, `DALLE`).

| Category | Tokens |
| --- | --- |
| Chat / LLM | `chatgpt`, `openai`, `claude`, `anthropic`, `gemini`, `deepseek`, `perplexity.?ai` |
| Watermarking | `synthid` |
| Coding | `copilot` |
| Image generation | `midjourney`, `dall.?e`, `stable.?diffusion`, `stability.?ai`, `adobe.?firefly`, `ideogram`, `leonardo.?ai`, `runwayml`, `dreamstudio`, `nightcafe`, `craiyon` |
| Local image stacks | `comfyui`, `invokeai`, `automatic1111` |
| Audio / video | `elevenlabs` |
| Writing | `novelai`, `notion.?ai`, `writesonic`, `quillbot`, `jasper.?ai` |

## Loose tokens (20)

Generator-scoped only, never matched in free text.

`cursor`, `windsurf`, `codeium`, `tabnine`, `replit`, `devin`, `cline`, `aider`, `grok`,
`perplexity`, `llama`, `mistral`, `qwen`, `sora`, `veo`, `imagen`, `firefly`, `flux`,
`jasper`, `gpt`

Several appear in both tiers at different specificity. `perplexity.?ai` is strict because
the `.ai` makes it unambiguous, while bare `perplexity` is loose because it is also a
standard information-theory term. Same pattern for `jasper.?ai` / `jasper` and
`adobe.?firefly` / `firefly`.

## Where marks actually land

| Tool family | Typical location |
| --- | --- |
| ChatGPT, Claude, Gemini, Grok, DeepSeek, Perplexity | Frontmatter key, generator meta, export headers |
| Copilot, Cursor, Windsurf, Codeium, Tabnine, Replit | Generator meta and frontmatter in exported or scaffolded docs |
| Midjourney, DALL·E, Stable Diffusion, ComfyUI, InvokeAI, AUTOMATIC1111 | PNG `tEXt` chunks, EXIF `Software`, XMP |
| Adobe Firefly, Ideogram, Leonardo.Ai, RunwayML, NightCafe, Craiyon | XMP and C2PA assertions |
| ElevenLabs, NovelAI, Notion AI, Writesonic, QuillBot | Document properties and export metadata |

## Byte-level image hints

A separate list of 46 literal byte strings drives the image scanner, covering the vendor
names above plus structural markers: `c2pa`, `contentcredentials`, `digitalSourceType`,
`trainedAlgorithmicMedia`, `AIGC`, `GenAI`, `dcterms:provenance`.

The code-editor assistants (Cursor, Windsurf, Codeium) are **deliberately excluded** from
this list. They mark documents, not pixels, and their names are too common to risk against
raw image bytes.

## Confidence labels

Every finding carries one of four labels. They are a heuristic about signal strength, not a
verdict:

| Label | Meaning |
| --- | --- |
| `confirmed` | A recognised provenance structure: a C2PA/JUMBF manifest, or a parsed field like `digitalSourceType` |
| `probable` | A vendor marker inside a recognised metadata structure |
| `informational` | Context only: a CMS generator, an XMP packet being present |
| `likely_false_positive` | A raw whole-file byte scan, which can collide with compressed data |

Treat `likely_false_positive` as noise unless something else corroborates it.

## Adding a vendor

1. Decide the tier. Ask: *would this word ever appear in ordinary prose or markup?* If yes,
   it is loose. If unsure, make it loose — a missed detection is cheaper than a detector
   nobody trusts.
2. Add it to `AI_VENDOR_TOKENS_STRICT` or `AI_VENDOR_TOKENS_LOOSE` in
   [`service/scripts/image_meta.py`](../service/scripts/image_meta.py). The frontmatter key
   set and both regexes derive from these, so one edit covers all of them.
3. For an image generator, also add the literal spelling to `_AI_VENDOR_LITERALS`.
4. Add the name to `GENERATOR_VENDORS` in
   [`tests/test_vendor_coverage.py`](../tests/test_vendor_coverage.py). If it is a loose
   token, add a sentence using the word innocently to `INNOCENT_PROSE`.
5. Run `make sync-skill` so the bundled skill copies pick up the change, then `make test`.

Step 5 matters: `tests/test_skill_bundle.py` fails if you skip it.

## What a hit means

A metadata hit means the tool wrote its name into the file. It is not evidence of how much
of the content that tool produced, and its absence is not evidence that no tool was used.
Stripping a mark does not make content human-written, and this project does not claim
otherwise. See [ethics](../skills/remove-claude-marks/references/ethics.md).
