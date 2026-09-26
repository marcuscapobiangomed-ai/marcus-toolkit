"""Exporta o artigo final (artigo.json) para .docx e .md.

Chamado automaticamente na última etapa do pipeline; também disponível via
`python -m artigos_v2 exportar <id>` para reexportar sem gastar IA.
"""

from __future__ import annotations

import re
from datetime import date
from pathlib import Path

from docx import Document
from docx.enum.section import WD_ORIENT, WD_SECTION
from docx.enum.table import WD_TABLE_ALIGNMENT
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.oxml import OxmlElement
from docx.oxml.ns import qn
from docx.shared import Cm, Pt, RGBColor

from .referencias import renderizar_citacoes, texto_plano

TITULOS = [("introducao", "Introdução"), ("metodos", "Métodos"), ("resultados", "Resultados"),
           ("discussao", "Discussão"), ("conclusao", "Conclusão")]
FONTE = "Times New Roman"
IDIOMA = "pt-BR"
A4 = (Cm(21), Cm(29.7))
NBSP = "\u00a0"
TITULO_DECLARACAO_IA = "DECLARAÇÃO DE USO DE INTELIGÊNCIA ARTIFICIAL"

# Colunas dos quadros como (largura mínima em cm, peso na sobra): as estreitas (Nº, Data, Registros)
# têm peso 0 e nunca encolhem; a sobra da largura útil vai para as colunas de texto.
COLUNAS_QUADRO1 = [(2.4, 0.5), (5.0, 6.0), (2.3, 0.0), (2.1, 0.0)]
COLUNAS_QUADRO2 = [(1.0, 0.0), (2.8, 1.0), (2.8, 1.0), (3.2, 1.5), (5.0, 4.0)]
COLUNAS_PRISMA = [2.6, 6.2, 0.8, 6.4]

# Elementos que o esquema do settings.xml põe antes de w:autoHyphenation (a ordem importa para o Word).
ANTES_DA_HIFENIZACAO = ("w:defaultTabStop", "w:proofState", "w:zoom", "w:view", "w:writeProtection")


def _configurar(documento: Document) -> None:
    secao = documento.sections[0]
    secao.orientation = WD_ORIENT.PORTRAIT
    secao.page_width, secao.page_height = A4
    secao.top_margin = secao.left_margin = Cm(3)
    secao.bottom_margin = secao.right_margin = Cm(2)

    normal = documento.styles["Normal"]
    _fonte(normal)
    normal.font.size = Pt(12)
    formato = normal.paragraph_format
    formato.line_spacing = 1.5
    formato.space_after = Pt(6)

    titulo = documento.styles["Heading 1"]
    _fonte(titulo)
    titulo.font.color.rgb = RGBColor(0, 0, 0)
    documento.styles["Heading 1"].font.size = Pt(12)
    documento.styles["Heading 1"].font.bold = True
    documento.styles["Heading 1"].paragraph_format.space_before = Pt(18)
    documento.styles["Heading 1"].paragraph_format.space_after = Pt(6)

    _idioma(documento, normal)
    _hifenizacao(documento)

    # Numeração de página no rodapé (as seções seguintes herdam o rodapé)
    rodape = secao.footer.paragraphs[0]
    rodape.alignment = WD_ALIGN_PARAGRAPH.RIGHT
    _campo(rodape.add_run(), "PAGE")


def _fonte(estilo) -> None:
    estilo.font.name = FONTE
    fontes = estilo.element.get_or_add_rPr().get_or_add_rFonts()
    # atributos de tema (asciiTheme etc.) têm precedência sobre o nome explícito no Word
    for atributo in ("w:asciiTheme", "w:hAnsiTheme", "w:eastAsiaTheme", "w:cstheme"):
        fontes.attrib.pop(qn(atributo), None)
    fontes.set(qn("w:eastAsia"), FONTE)
    fontes.set(qn("w:cs"), FONTE)


def _definir_idioma(rpr, idioma: str) -> None:
    lang = rpr.find(qn("w:lang"))
    if lang is None:
        lang = OxmlElement("w:lang")
        posteriores = [rpr.find(qn(t)) for t in ("w:eastAsianLayout", "w:specVanish", "w:oMath")]
        posterior = next((el for el in posteriores if el is not None), None)
        if posterior is not None:
            posterior.addprevious(lang)
        else:
            rpr.append(lang)
    lang.set(qn("w:val"), idioma)


def _idioma(documento, normal) -> None:
    """pt-BR nos padrões do documento e no estilo Normal: é o que faz o Word hifenizar em português."""
    for rpr in documento.styles.element.xpath("w:docDefaults/w:rPrDefault/w:rPr"):
        _definir_idioma(rpr, IDIOMA)
    _definir_idioma(normal.element.get_or_add_rPr(), IDIOMA)
    tema = documento.settings.element.find(qn("w:themeFontLang"))
    if tema is not None:
        tema.set(qn("w:val"), IDIOMA)


def _hifenizacao(documento) -> None:
    configuracoes = documento.settings.element
    if configuracoes.find(qn("w:autoHyphenation")) is not None:
        return
    hifenizar = OxmlElement("w:autoHyphenation")
    hifenizar.set(qn("w:val"), "true")
    for tag in ANTES_DA_HIFENIZACAO:
        ancora = configuracoes.find(qn(tag))
        if ancora is not None:
            ancora.addnext(hifenizar)
            return
    configuracoes.insert(0, hifenizar)


def _campo(run, instrucao: str) -> None:
    for tipo, texto in (("begin", None), (None, instrucao), ("end", None)):
        if tipo:
            el = OxmlElement("w:fldChar")
            el.set(qn("w:fldCharType"), tipo)
        else:
            el = OxmlElement("w:instrText")
            el.set(qn("xml:space"), "preserve")
            el.text = texto
        run._r.append(el)


def _milhar(valor) -> str:
    """1054 → '1.054' (separador de milhar brasileiro)."""
    try:
        return f"{int(valor):,}".replace(",", ".")
    except (TypeError, ValueError):
        return str(valor)


def _n(valor) -> str:
    """'(n = 1.054)' com espaços não separáveis: a contagem nunca quebra de linha."""
    return f"(n{NBSP}={NBSP}{_milhar(valor)})"


def _secao(documento, paisagem: bool):
    """Nova seção em página nova; margens e rodapé vêm da seção anterior."""
    secao = documento.add_section(WD_SECTION.NEW_PAGE)
    largura, altura = A4
    secao.orientation = WD_ORIENT.LANDSCAPE if paisagem else WD_ORIENT.PORTRAIT
    secao.page_width, secao.page_height = (altura, largura) if paisagem else (largura, altura)
    return secao


def _largura_util(secao) -> float:
    return (secao.page_width - secao.left_margin - secao.right_margin) / Cm(1)


def _larguras(total_cm: float, colunas: list[tuple[float, float]]) -> list[float]:
    """Cada coluna recebe sua largura mínima e a sobra é dividida pelos pesos."""
    sobra = max(total_cm - sum(minimo for minimo, _ in colunas), 0.0)
    pesos = sum(peso for _, peso in colunas) or 1.0
    return [round(minimo + sobra * peso / pesos, 2) for minimo, peso in colunas]


def _fixar_larguras(tabela, larguras_cm: list[float]) -> None:
    """Layout fixo com largura explícita em grade, células e tabela: nenhuma coluna colapsa."""
    tabela.autofit = False  # w:tblLayout w:type="fixed"
    for coluna, largura in zip(tabela._tbl.tblGrid.gridCol_lst, larguras_cm):
        coluna.w = Cm(largura)
    for linha in tabela.rows:
        for celula, largura in zip(linha.cells, larguras_cm):
            celula.width = Cm(largura)
    tbl_pr = tabela._tbl.tblPr
    tbl_w = tbl_pr.find(qn("w:tblW"))
    if tbl_w is None:
        tbl_w = OxmlElement("w:tblW")
        tbl_pr.append(tbl_w)
    tbl_w.set(qn("w:type"), "dxa")
    tbl_w.set(qn("w:w"), str(sum(Cm(largura).twips for largura in larguras_cm)))


def _paragrafo(documento, texto: str, formato_citacao: str, recuo: bool = True, tamanho: int | None = None,
               alinhamento=WD_ALIGN_PARAGRAPH.JUSTIFY):
    p = documento.add_paragraph()
    p.alignment = alinhamento
    if recuo:
        p.paragraph_format.first_line_indent = Cm(1.25)
    for trecho, sobrescrito in renderizar_citacoes(texto, formato_citacao):
        run = p.add_run(trecho)
        run.font.superscript = sobrescrito
        if tamanho:
            run.font.size = Pt(tamanho)
    return p


def _titulo_centralizado(documento, texto: str):
    """Título sem número (RESUMO, ABSTRACT, REFERÊNCIAS...), centralizado."""
    titulo = documento.add_heading(texto, level=1)
    titulo.alignment = WD_ALIGN_PARAGRAPH.CENTER
    return titulo


def _texto_em_celula(celula, texto: str, formato_citacao: str = "sobrescrito", negrito=False, tamanho=10,
                     alinhamento=WD_ALIGN_PARAGRAPH.LEFT, manter_com_proximo=False):
    celula.text = ""
    linhas = texto.split("\n")
    for i, linha in enumerate(linhas):
        p = celula.paragraphs[0] if i == 0 else celula.add_paragraph()
        p.alignment = alinhamento
        p.paragraph_format.line_spacing = 1.0
        p.paragraph_format.space_after = Pt(0)
        p.paragraph_format.first_line_indent = Cm(0)
        p.paragraph_format.keep_with_next = manter_com_proximo
        for trecho, sobrescrito in renderizar_citacoes(linha, formato_citacao):
            run = p.add_run(trecho)
            run.font.size = Pt(tamanho)
            run.font.bold = negrito
            run.font.superscript = sobrescrito


def _bordas(celula, visivel: bool = True) -> None:
    tc_pr = celula._tc.get_or_add_tcPr()
    bordas = OxmlElement("w:tcBorders")
    for lado in ("top", "left", "bottom", "right"):
        el = OxmlElement(f"w:{lado}")
        el.set(qn("w:val"), "single" if visivel else "nil")
        if visivel:
            el.set(qn("w:sz"), "8")
            el.set(qn("w:color"), "000000")
        bordas.append(el)
    tc_pr.append(bordas)


def _sombrear(celula, cor: str) -> None:
    sombra = OxmlElement("w:shd")
    sombra.set(qn("w:val"), "clear")
    sombra.set(qn("w:fill"), cor)
    celula._tc.get_or_add_tcPr().append(sombra)


def _legenda(documento, texto: str, antes: bool = True, formato_citacao: str = "sobrescrito"):
    """Título (acima, negrito, centralizado, preso ao objeto) ou "Fonte:" (abaixo); ambos em 10 pt."""
    p = documento.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER if antes else WD_ALIGN_PARAGRAPH.LEFT
    formato = p.paragraph_format
    formato.line_spacing = 1.0
    formato.first_line_indent = Cm(0)
    formato.keep_with_next = antes
    formato.space_before = Pt(12) if antes else Pt(4)
    formato.space_after = Pt(4) if antes else Pt(12)
    for trecho, sobrescrito in renderizar_citacoes(texto, formato_citacao):
        run = p.add_run(trecho)
        run.font.size = Pt(10)
        run.font.bold = antes
        run.font.superscript = sobrescrito
    return p


def _tabela(documento, cabecalho: list[str], linhas: list[list[str]], larguras_cm: list[float],
            formato_citacao: str):
    tabela = documento.add_table(rows=1, cols=len(cabecalho))
    tabela.style = "Table Grid"
    tabela.alignment = WD_TABLE_ALIGNMENT.CENTER
    for i, titulo in enumerate(cabecalho):
        _texto_em_celula(tabela.rows[0].cells[i], titulo, negrito=True, alinhamento=WD_ALIGN_PARAGRAPH.CENTER)
        _sombrear(tabela.rows[0].cells[i], "D9D9D9")
    for linha in linhas:
        celulas = tabela.add_row().cells
        for i, valor in enumerate(linha):
            _texto_em_celula(celulas[i], valor, formato_citacao)
    _fixar_larguras(tabela, larguras_cm)
    # repete o cabeçalho em quebras de página
    tr_pr = tabela.rows[0]._tr.get_or_add_trPr()
    repetir = OxmlElement("w:tblHeader")
    repetir.set(qn("w:val"), "true")
    tr_pr.append(repetir)
    return tabela


def _fluxograma_prisma(documento, prisma: dict) -> None:
    """Fluxograma PRISMA como tabela com caixas — editável no Word e sem dependência gráfica."""
    por_base = "; ".join(f"{base} {_n(n)}" for base, n in prisma["por_base"].items())
    motivos = lambda m: "\n".join(f"• {motivo} {_n(n)}" for motivo, n in sorted(m.items(), key=lambda x: -x[1]))
    linhas = [
        ("Identificação", f"Registros identificados nas bases de dados {_n(prisma['identificados'])}\n{por_base}",
         f"Duplicatas removidas {_n(prisma['duplicatas'])}"),
        ("Triagem", f"Registros triados por título e resumo {_n(prisma['triados'])}",
         f"Registros excluídos {_n(prisma['excluidos_triagem'])}\n{motivos(prisma['motivos_triagem'])}".strip()),
        ("Elegibilidade", f"Artigos avaliados para elegibilidade {_n(prisma['avaliados_elegibilidade'])}",
         f"Artigos excluídos {_n(prisma['excluidos_elegibilidade'])}\n"
         f"{motivos(prisma['motivos_elegibilidade'])}".strip()),
        ("Inclusão", f"Estudos incluídos na revisão {_n(prisma['incluidos'])}", ""),
    ]
    tabela = documento.add_table(rows=0, cols=4)
    tabela.alignment = WD_TABLE_ALIGNMENT.CENTER
    for i, (etapa, principal, lateral) in enumerate(linhas):
        junto = i < len(linhas) - 1  # a figura não se parte entre páginas
        c = tabela.add_row().cells
        _texto_em_celula(c[0], etapa, negrito=True, tamanho=9, alinhamento=WD_ALIGN_PARAGRAPH.CENTER,
                         manter_com_proximo=junto)
        _sombrear(c[0], "D9E2F3")
        _bordas(c[0])
        _texto_em_celula(c[1], principal, tamanho=9, alinhamento=WD_ALIGN_PARAGRAPH.CENTER, manter_com_proximo=junto)
        _bordas(c[1])
        _texto_em_celula(c[2], "→" if lateral else "", tamanho=12, alinhamento=WD_ALIGN_PARAGRAPH.CENTER,
                         manter_com_proximo=junto)
        _bordas(c[2], visivel=False)
        _texto_em_celula(c[3], lateral, tamanho=9, manter_com_proximo=junto)
        _bordas(c[3], visivel=bool(lateral))
        if junto:
            seta = tabela.add_row().cells
            for j, celula in enumerate(seta):
                _texto_em_celula(celula, "↓" if j == 1 else "", tamanho=12, alinhamento=WD_ALIGN_PARAGRAPH.CENTER,
                                 manter_com_proximo=True)
                _bordas(celula, visivel=False)
    _fixar_larguras(tabela, COLUNAS_PRISMA)


def _fonte_prisma(artigo: dict, ano: int) -> str:
    if artigo.get("prisma_citacao"):
        return f"Fonte: adaptado de Page et al.{artigo['prisma_citacao']} (modelo PRISMA 2020)."
    return f"Fonte: elaborado pelos autores com base no modelo PRISMA 2020 ({ano})."


def exportar_docx(artigo: dict, destino: str | Path) -> Path:
    destino = Path(destino)
    destino.parent.mkdir(parents=True, exist_ok=True)
    fc = artigo.get("formato_citacao", "sobrescrito")
    ano = date.today().year
    documento = Document()
    _configurar(documento)

    titulo = documento.add_paragraph()
    titulo.alignment = WD_ALIGN_PARAGRAPH.CENTER
    run = titulo.add_run(artigo["titulo"].upper())
    run.bold = True
    if artigo.get("title"):
        t = documento.add_paragraph()
        t.alignment = WD_ALIGN_PARAGRAPH.CENTER
        t.add_run(artigo["title"]).italic = True

    if artigo.get("autores"):
        _paragrafo(documento, ", ".join(artigo["autores"]), fc, recuo=False, alinhamento=WD_ALIGN_PARAGRAPH.CENTER)
    if artigo.get("orientador"):
        _paragrafo(documento, f"Orientador(a): {artigo['orientador']}", fc, recuo=False,
                   alinhamento=WD_ALIGN_PARAGRAPH.CENTER)
    if artigo.get("instituicao"):
        _paragrafo(documento, artigo["instituicao"], fc, recuo=False, alinhamento=WD_ALIGN_PARAGRAPH.CENTER)

    for rotulo, texto, rotulo_chave, chaves in (
        ("RESUMO", artigo.get("resumo"), "Palavras-chave", artigo.get("palavras_chave")),
        ("ABSTRACT", artigo.get("abstract"), "Keywords", artigo.get("keywords")),
    ):
        if not texto:
            continue
        _titulo_centralizado(documento, rotulo)
        p = _paragrafo(documento, texto, fc, recuo=False)
        p.paragraph_format.line_spacing = 1.0
        if chaves:
            p = documento.add_paragraph()
            p.add_run(f"{rotulo_chave}: ").bold = True
            p.add_run("; ".join(chaves) + ".")

    numero = 0
    for chave, rotulo in TITULOS:
        texto = artigo["secoes"].get(chave, "")
        if not texto:
            continue
        numero += 1
        documento.add_heading(f"{numero} {rotulo.upper()}", level=1)
        for bloco in [b.strip() for b in texto.split("\n\n") if b.strip()]:
            _paragrafo(documento, " ".join(bloco.splitlines()), fc)

        if chave == "metodos":
            _legenda(documento, "Quadro 1 – Estratégias de busca utilizadas em cada base de dados")
            _tabela(documento, ["Base de dados", "Estratégia de busca", "Data da busca", "Registros (n)"],
                    [[e["base"], e["estrategia"], artigo.get("data_busca", ""), _milhar(e["registros"])]
                     for e in artigo["estrategias"]],
                    _larguras(_largura_util(documento.sections[-1]), COLUNAS_QUADRO1), fc)
            _legenda(documento, f"Fonte: elaborado pelos autores ({ano}).", antes=False)

        if chave == "resultados":
            _legenda(documento, "Figura 1 – Fluxograma do processo de identificação, triagem e inclusão dos "
                                "estudos (modelo PRISMA)")
            _fluxograma_prisma(documento, artigo["prisma"])
            _legenda(documento, _fonte_prisma(artigo, ano), antes=False, formato_citacao=fc)

            # Quadro 2 (5 colunas) em seção paisagem própria; o documento volta a retrato logo depois
            paisagem = _secao(documento, paisagem=True)
            _legenda(documento, "Quadro 2 – Síntese dos estudos incluídos na revisão")
            _tabela(documento, ["Nº", "Autor/ano", "Desenho do estudo", "População/amostra", "Principais achados"],
                    [[str(i + 1), f"{s['autor_ano']}{s['citacao']}", s["desenho"], s["populacao"], s["achados"]]
                     for i, s in enumerate(artigo["sintese"])],
                    _larguras(_largura_util(paisagem), COLUNAS_QUADRO2), fc)
            _legenda(documento, f"Fonte: elaborado pelos autores ({ano}).", antes=False)
            _secao(documento, paisagem=False)

    if artigo.get("declaracao_ia"):
        _titulo_centralizado(documento, TITULO_DECLARACAO_IA)
        _paragrafo(documento, artigo["declaracao_ia"], fc)

    _titulo_centralizado(documento, "REFERÊNCIAS")
    for i, referencia in enumerate(artigo["referencias"], start=1):
        p = documento.add_paragraph()
        p.alignment = WD_ALIGN_PARAGRAPH.LEFT
        p.paragraph_format.line_spacing = 1.0
        p.paragraph_format.space_after = Pt(8)
        prefixo = f"{i}. " if artigo.get("formato_referencias", "vancouver") == "vancouver" else ""
        p.add_run(prefixo + referencia)

    documento.core_properties.title = artigo["titulo"]
    documento.core_properties.author = ", ".join(artigo.get("autores") or [])
    documento.core_properties.language = IDIOMA
    documento.save(destino)
    return destino


def _md(texto) -> str:
    """Escapa \\, *, _ e | para que curingas de busca (predictor*, "risk factor*") saiam literais no Markdown."""
    return re.sub(r"([\\*_|])", r"\\\1", " ".join(str(texto).split()))


def exportar_markdown(artigo: dict, destino: str | Path) -> Path:
    destino = Path(destino)
    ano = date.today().year
    linhas = [f"# {artigo['titulo']}", ""]
    if artigo.get("resumo"):
        linhas += ["## Resumo", artigo["resumo"], "", "**Palavras-chave:** " + "; ".join(artigo.get("palavras_chave", [])), ""]
    for chave, rotulo in TITULOS:
        if artigo["secoes"].get(chave):
            linhas += [f"## {rotulo}", texto_plano(artigo["secoes"][chave], "colchetes"), ""]
        if chave == "metodos" and artigo.get("estrategias"):
            linhas += ["Quadro 1 – Estratégias de busca utilizadas em cada base de dados", "",
                       "| Base de dados | Estratégia de busca | Data da busca | Registros (n) |", "|---|---|---|---|"]
            linhas += [f"| {_md(e['base'])} | {_md(e['estrategia'])} | {_md(artigo.get('data_busca', ''))} | "
                       f"{_md(e['registros'])} |" for e in artigo["estrategias"]]
            linhas += ["", f"Fonte: elaborado pelos autores ({ano}).", ""]
        if chave == "resultados":
            p = artigo["prisma"]
            linhas += ["**Fluxograma PRISMA:** " + ", ".join(f"{_md(b)}: {n}" for b, n in p["por_base"].items())
                       + f" → identificados {p['identificados']} → duplicatas {p['duplicatas']} → triados "
                         f"{p['triados']} (excluídos {p['excluidos_triagem']}) → elegibilidade "
                         f"{p['avaliados_elegibilidade']} (excluídos {p['excluidos_elegibilidade']}) → incluídos "
                         f"{p['incluidos']}", ""]
            linhas += ["Quadro 2 – Síntese dos estudos incluídos na revisão", ""]
            linhas += ["| Nº | Autor/ano | Desenho | População | Achados |", "|---|---|---|---|---|"]
            linhas += [f"| {i + 1} | {_md(s['autor_ano'])} {texto_plano(s['citacao'])} | {_md(s['desenho'])} | "
                       f"{_md(s['populacao'])} | {_md(s['achados'])} |" for i, s in enumerate(artigo["sintese"])]
            linhas += ["", f"Fonte: elaborado pelos autores ({ano}).", ""]
    if artigo.get("declaracao_ia"):
        linhas += ["## Declaração de uso de inteligência artificial",
                   texto_plano(artigo["declaracao_ia"], "colchetes"), ""]
    linhas += ["## Referências"] + [f"{i}. {r}" for i, r in enumerate(artigo["referencias"], 1)]
    destino.write_text("\n".join(linhas) + "\n", encoding="utf-8")
    return destino
