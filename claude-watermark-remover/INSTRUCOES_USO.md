# Instruções de uso — claude-watermark-remover

Auditoria feita em 17/09/2026 antes do primeiro uso: li o código de
`service/scripts/inspect_file.py`, `clean_file.py`, `container_meta.py` e
`common.py`. Resumo da auditoria e do que a ferramenta cobre está no fim
deste arquivo.

Nenhum script de instalação (`make install-claude-skill`, `install_skill.py`)
foi executado — a ferramenta é usada aqui diretamente via `python3`, sem
instalar nada global no sistema.

## Como rodar (sem instalar nada)

Sempre a partir da pasta do repositório:

```bash
cd ~/Documents/Artigos/claude-watermark-remover
```

### 1. Inspecionar um arquivo (não altera nada, só mostra o que teria)

```bash
python3 service/scripts/inspect_file.py "/caminho/para/artigo.docx"
```

### 2. Limpar um arquivo (gera uma CÓPIA nova, nunca sobrescreve o original)

```bash
python3 service/scripts/clean_file.py "/caminho/para/artigo.docx" -o "/caminho/para/artigo.cleaned.docx"
```

Isso cria `artigo.cleaned.docx` do lado do original, que fica intacto.

### 3. (Opcional) Limpar direto no arquivo original

Só use se quiser sobrescrever o próprio arquivo. A ferramenta cria um
`.bak` automaticamente antes de mexer:

```bash
python3 service/scripts/clean_file.py "/caminho/para/artigo.docx" --in-place
```

Isso gera `artigo.docx.bak` (backup do original) e sobrescreve `artigo.docx`
com a versão limpa.

## O que esta ferramenta limpa num .docx

- Tag de gerador (`dc:creator`/`dc:description` = "python-docx" etc.) em
  `docProps/core.xml` e `app.xml` (também `Application`/`AppVersion`)
- Partes `customXml/*` inteiras (usadas por ferramentas para injetar
  metadados de proveniência)
- `docProps/custom.xml` inteiro
- Caracteres Unicode invisíveis (zero-width space etc.) em todo o texto
  visível — corpo, cabeçalhos, rodapés, notas de rodapé
- **RSIDs e `w14:docId`** (fingerprints de sessão de edição do Word) —
  adicionado por nós em 17/09/2026, ver "Melhorias aplicadas" abaixo
- **EXIF/XMP/C2PA de imagens embutidas em `word/media/`** (PNG, JPEG, WebP,
  AVIF, HEIC) — adicionado por nós em 17/09/2026, mesma seção
- Corrige relacionamentos `.rels` que ficariam órfãos após remover partes

## O que ela ainda NÃO limpa

- **Marca d'água visível** (texto WordArt no cabeçalho, tipo "CONFIDENCIAL"):
  decisão deliberada de escopo do projeto original — o README explica que a
  ferramenta trata proveniência invisível, não conteúdo visível. Decidimos
  não mexer nisso (ver conversa de 17/09/2026); se precisar, é a edição
  manual do XML que já fizemos antes.

## Melhorias aplicadas (17/09/2026)

Depois de comparar a saída da ferramenta com a limpeza manual que fizemos no
nosso próprio artigo, adicionamos duas coisas em `container_meta.py` que a
versão original do repositório não cobria:

1. `_scrub_docx_fingerprints()`: remove `w:rsid*` (atributos e elementos
   `<w:rsid w:val="…"/>`), o bloco `<w:rsids>` de `settings.xml` e
   `<w14:docId>`. Roda incondicionalmente em todo `word/*.xml`, independente
   da flag `also_layer_a_text`.
2. `_clean_docx_media()`: para cada arquivo em `word/media/`, detecta o
   formato e reaproveita `strip_png`/`strip_jpeg`/`strip_webp`/
   `strip_isobmff` (as mesmas funções já usadas para limpar imagens
   avulsas) para remover EXIF/XMP/C2PA da imagem embutida. Formato não
   reconhecido (GIF, TIFF, WMF/EMF) é deixado intocado, não é adivinhado.

Testado com: suíte de testes do repositório (`pytest tests/`, todos verdes
após `make sync-skill`) e um `.docx` fabricado com RSID/docId injetados e
uma imagem JPEG com EXIF — confirmado que a saída limpa perde os
fingerprints e o EXIF, mantém o conteúdo visível e a imagem intactos, e
continua uma estrutura XML válida.

Essas mudanças ficam só nesta cópia local do repositório
(`~/Documents/Artigos/claude-watermark-remover`), não foram enviadas para
o GitHub original.

## Auditoria de segurança do código (feita antes do primeiro uso)

- Sem chamadas de rede no caminho de limpeza de `.docx`
  (`clean_file.py` → `container_meta.py`). Rede só existe em
  `rewrite_text.py` (reescrita de texto via LLM externo, recurso à parte)
  e `audit_website.py` (auditoria de site).
- Sem `subprocess`/`eval`/`exec` no caminho de `.docx`. `subprocess` só
  aparece em `image_meta.py` para ferramentas externas opcionais
  (ex. exiftool), com timeout e limite de recursos — não é chamado ao
  limpar um `.docx`.
- Escrita atômica e seguinda contra symlink (`safe_write_bytes` em
  `common.py`): grava em arquivo temporário e substitui via `os.replace()`.
  Nunca sobrescreve o original a menos que você passe `--in-place`
  (e mesmo assim faz backup `.bak` primeiro).
- Limite de 256MB por arquivo de entrada e proteção contra "zip bomb" no
  `.docx` (limite de tamanho descomprimido).
