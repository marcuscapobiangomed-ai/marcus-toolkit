# FAQ

## Does this remove visible watermarks or logos from images?

No. Erasing a visible watermark, logo or text overlay from a picture is image
inpainting, a machine-learning task this project does not attempt. Tools like
[WatermarkRemover-AI](https://github.com/D-Ogi/WatermarkRemover-AI) do that.

This project removes **machine-readable provenance marks**: invisible Unicode
characters in text, and metadata (C2PA, EXIF, XMP, generator tags) in files.
Nothing it does changes how an image looks.

## What is an AI watermark?

Three different things get called a watermark, and they need different treatment.

**Invisible Unicode characters.** Zero-width spaces, soft hyphens, ideographic spaces and
similar codepoints that render as nothing but survive copy-paste. These are edit-based
carriers: deleting them removes the mark completely.

**Provenance metadata.** C2PA Content Credentials, EXIF, XMP, PNG text chunks, HTML
`<meta name="generator">` tags, YAML frontmatter keys. Structured fields naming the tool
that produced the file. Also fully removable.

**Statistical watermarks.** Schemes like Google's SynthID-Text bias which tokens the model
picks, so the signal lives in the word choices themselves. There is nothing to delete. The
only countermeasure is rewriting the text, and it is best-effort.

This project removes the first two completely and offers a rewrite workflow for the third.

## Does ChatGPT put invisible characters in its output?

Sometimes. Reports of zero-width and non-standard space characters in AI chat output are
common, and they also appear from ordinary sources: copy-paste from web pages, word
processors, and PDF extraction all introduce them. Run `inspect_text.py` on a file and it
tells you exactly which codepoints are present and at what offsets, rather than guessing.

Note that invisible characters are not proof of AI authorship, and their absence is not
proof of human authorship.

## Do I need an API key or an account?

No. The core scripts are Python standard library only. Nothing is uploaded, no key is
required, and the tool works offline.

## What Python version do I need?

The project targets 3.10+. In practice the core inspect and clean paths run on 3.9 as well.
If `python3 --version` shows 3.9 or newer, try it.

## Will this make my text undetectable by AI detectors?

No, and be suspicious of anything that claims otherwise. Removing invisible characters and
metadata removes those specific signals. It does not touch statistical watermarks, stylometry,
or whatever heuristics a given detector uses. The rewrite workflow reduces statistical signal
but cannot be verified without the vendor's detector and key.

The project deliberately reports what it *verifiably* removed separately from what it
attempted best-effort.

## Can it remove SynthID from an image?

Not in the default install. Image-pixel watermark removal requires the optional heavy
backends (CtrlRegen, DiffusionPurification), which are large containers under
non-commercial research licenses and are not bundled. They also visibly degrade the image.

Stripping C2PA metadata from an image does **not** remove a pixel-domain watermark, and
C2PA soft binding can re-link a stripped file to a remote manifest. The docs are explicit
about this because the opposite claim is the most common way these tools mislead people.

## Why does my PDF still have metadata?

A real PDF strip needs `qpdf` to rebuild the file structure, and `exiftool` to catch
residual fields. Without them the result is best-effort and the report says so.

```bash
brew install qpdf exiftool        # macOS
sudo apt install qpdf libimage-exiftool-perl   # Debian/Ubuntu
```

## Why did inspect exit with a non-zero code?

That is the design: `inspect_file.py` and `inspect_text.py` exit non-zero when they **find**
marks. It is a finding, not an error, so the tools compose in shell pipelines and CI.

## Does it flag files that are not AI-generated?

It tries hard not to. Vendor names that are also ordinary words (`cursor`, `flux`, `llama`,
`firefly`, `grok`) only match inside a structure that already declares a generator, so a
stylesheet with `cursor: pointer` or an article about the Gemini space program stays clean.
See [vendor coverage](vendor-coverage.md).

Findings also carry a confidence label. `likely_false_positive` means a raw byte scan
matched, which collides with compressed data fairly often. Treat it as noise unless
something corroborates it.

## Does cleaning damage my file?

Images are rewritten chunk by chunk and stay valid. Documents keep their content; only
metadata fields are dropped. Text keeps every visible character.

One real exception: some invisible characters are load-bearing. Emoji zero-width joiners,
CJK variation selectors, script joiners and RTL directional marks are **preserved by
default**, because stripping them corrupts the text. Explicit flags override this, and you
should review before using them.

The tools write `*.cleaned.*` by default rather than overwriting.

## Is removing watermarks legal?

Removing metadata from files you own is ordinary privacy hygiene, and the same operation
every "strip EXIF before posting" guide describes. What you then claim about the content is
a separate question, and disclosure rules vary by jurisdiction and institution.

The project is scoped to content you own or are authorised to process. It does not support
academic fraud or circumventing lawful disclosure requirements. See
[ethics](../skills/remove-claude-marks/references/ethics.md).

## What is C2PA?

Content Credentials: a signed manifest embedded in a file recording how it was made, backed
by the Coalition for Content Provenance and Authenticity. It is hard-bound metadata, so it
strips cleanly. Soft binding, where a watermark in the content itself re-links to a remote
manifest, is a separate mechanism and is out of scope here.

## How do I add a tool that is not detected?

See [adding a vendor](vendor-coverage.md#adding-a-vendor). One edit to a token list covers
the frontmatter keys and both regexes.

## Is this affiliated with Anthropic?

No. It is not affiliated with, endorsed by, or produced by Anthropic, OpenAI, Google, or any
other vendor named in it. "Claude" is in the name because Claude is one of the systems whose
marks it detects.
