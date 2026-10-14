#!/usr/bin/env python3
"""
Extrator e Estruturador de Artigos Científicos (.docx e .pdf)
Converte documentos externos em Markdown estruturado para o pipeline do sistema.
"""
import sys
import os
import re
import json

def agrupar_runs(p_obj):
    """
    Agrupa runs adjacentes com o mesmo formato (bold, italic) para evitar
    fragmentação de palavras com acentos (ex: **hipertens****ã****o**).
    """
    grupos = []
    for r in p_obj.runs:
        txt = r.text
        if not txt:
            continue
        b = bool(r.bold)
        it = bool(r.italic)
        if grupos and grupos[-1]['b'] == b and grupos[-1]['it'] == it:
            grupos[-1]['txt'] += txt
        else:
            grupos.append({'txt': txt, 'b': b, 'it': it})
            
    partes = []
    for g in grupos:
        t = g['txt']
        if g['b'] and g['it']:
            partes.append(f"***{t}***")
        elif g['b']:
            partes.append(f"**{t}**")
        elif g['it']:
            partes.append(f"*{t}*")
        else:
            partes.append(t)
    return "".join(partes).strip()

def extrair_docx(caminho):
    import docx
    doc = docx.Document(caminho)
    
    linhas = []
    tabelas_md = []
    
    for elem in doc.element.body:
        tag = elem.tag.split('}')[-1] if '}' in elem.tag else elem.tag
        if tag == 'p':
            p_obj = None
            for p in doc.paragraphs:
                if p._p == elem:
                    p_obj = p
                    break
            if not p_obj:
                continue
            
            texto_puro = p_obj.text.strip()
            if not texto_puro:
                continue
            
            estilo = (p_obj.style.name or '').lower()
            
            # Formata runs com negrito/itálico agrupados
            p_formatado = agrupar_runs(p_obj) or texto_puro
            
            # Detecta se é título ou heading pelo estilo Word
            re_rotulo_rascunho = r'^(?:[A-Za-z0-9_-]+[\s_]+)?(?:v\d+|draft\d*|rascunho\d*|teste\d*)$'
            if 'title' in estilo or 'título' == estilo:
                if re.match(re_rotulo_rascunho, texto_puro, re.I):
                    # Rótulo de rascunho/versão interno detectado (ex: Esther v0, Akyla v0).
                    # Não adiciona como H1 para evitar contaminação do título científico.
                    pass
                else:
                    linhas.append(f"# {texto_puro}")
            elif 'heading 1' in estilo or 'título 1' in estilo:
                linhas.append(f"## {texto_puro}")
            elif 'heading 2' in estilo or 'título 2' in estilo:
                linhas.append(f"### {texto_puro}")
            elif 'heading 3' in estilo or 'título 3' in estilo:
                linhas.append(f"#### {texto_puro}")
            else:
                # Se o parágrafo inteiro é curto (<100 caracteres) e todo em negrito,
                # ou se o texto puro corresponde a um título de seção clássico
                limpo = re.sub(r"^[\s#\*]+|[\s#\*]+$", "", p_formatado)
                if len(limpo) < 90 and any(re.match(pad, limpo, re.I) for pad in [
                    r"^(?:1\s*[-.]?\s*)?(?:introdu[cç][aã]o|introduction)$",
                    r"^(?:2\s*[-.]?\s*)?(?:m[eé]todos|metodologia|materiais\s+e\s+m[eé]todos|methods)$",
                    r"^(?:3\s*[-.]?\s*)?(?:resultados|results)$",
                    r"^(?:4\s*[-.]?\s*)?(?:discuss[aã]o|discussion)$",
                    r"^(?:5\s*[-.]?\s*)?(?:conclus[aã]o|conclus[oõ]es|considera[cç][oõ]es\s+finais|conclusion)$",
                    r"^(?:refer[eê]ncias(?:\s+bibliogr[aá]ficas)?|references|bibliografia)$",
                    r"^(?:resumo|abstract|resumen)$"
                ]):
                    linhas.append(f"## {limpo}")
                else:
                    linhas.append(p_formatado)
                
        elif tag == 'tbl':
            tbl_obj = None
            for t in doc.tables:
                if t._tbl == elem:
                    tbl_obj = t
                    break
            if not tbl_obj:
                continue
            
            t_linhas = []
            max_cols = 0
            matriz = []
            for row in tbl_obj.rows:
                celulas = [c.text.replace('\n', ' ').strip() for c in row.cells]
                matriz.append(celulas)
                if len(celulas) > max_cols:
                    max_cols = len(celulas)
            
            if matriz:
                cab = matriz[0]
                t_linhas.append("| " + " | ".join(cab) + " |")
                t_linhas.append("| " + " | ".join(["---"] * len(cab)) + " |")
                for r in matriz[1:]:
                    while len(r) < len(cab):
                        r.append("")
                    t_linhas.append("| " + " | ".join(r[:len(cab)]) + " |")
                
                tabela_str = "\n".join(t_linhas)
                linhas.append("\n" + tabela_str + "\n")
                tabelas_md.append(tabela_str)
                
    texto_bruto = "\n\n".join(linhas)
    return texto_bruto, tabelas_md

def extrair_pdf(caminho):
    import pymupdf
    doc = pymupdf.open(caminho)
    
    linhas = []
    tamanhos = []
    tabelas_md = []
    
    for page in doc:
        blocos = page.get_text("dict", flags=pymupdf.TEXTFLAGS_SEARCH).get("blocks", [])
        for b in blocos:
            if "lines" in b:
                for l in b["lines"]:
                    for s in l["spans"]:
                        txt = s["text"].strip()
                        if txt:
                            tamanhos.append(round(s["size"], 1))
                            
    tam_comum = max(set(tamanhos), key=tamanhos.count) if tamanhos else 10.0
    
    for num_pag, page in enumerate(doc):
        # 1. Extração estruturada de tabelas via PyMuPDF TableFinder
        tab_bboxes = []
        try:
            tabs = page.find_tables()
            for tab in tabs:
                matriz = tab.extract()
                if matriz and len(matriz) >= 2:
                    cab = [str(c or '').replace('\n', ' ').strip() for c in matriz[0]]
                    if any(cab):
                        t_linhas = ["| " + " | ".join(cab) + " |", "| " + " | ".join(["---"] * len(cab)) + " |"]
                        for r in matriz[1:]:
                            celulas = [str(c or '').replace('\n', ' ').strip() for c in r]
                            while len(celulas) < len(cab):
                                celulas.append("")
                            t_linhas.append("| " + " | ".join(celulas[:len(cab)]) + " |")
                        t_md = "\n".join(t_linhas)
                        tabelas_md.append(t_md)
                        linhas.append("\n" + t_md + "\n")
                        tab_bboxes.append(pymupdf.Rect(tab.bbox))
        except Exception:
            pass

        # 2. Extração de blocos de texto
        blocos = page.get_text("dict", flags=pymupdf.TEXTFLAGS_SEARCH).get("blocks", [])
        for b in blocos:
            b_rect = pymupdf.Rect(b.get("bbox", (0, 0, 0, 0)))
            # Se o bloco de texto estiver dentro de uma tabela já extraída, ignora para não duplicar
            if any(b_rect.intersects(t_box) and (b_rect in t_box or (b_rect.y0 >= t_box.y0 - 2 and b_rect.y1 <= t_box.y1 + 2)) for t_box in tab_bboxes):
                continue

            if "lines" in b:
                paragrafos_bloco = []
                for l in b["lines"]:
                    linha_partes = []
                    maior_tam = 0
                    eh_negrito = False
                    for s in l["spans"]:
                        txt = s["text"].strip()
                        if not txt:
                            continue
                        tam = round(s["size"], 1)
                        if tam > maior_tam:
                            maior_tam = tam
                        flags = s.get("flags", 0)
                        if flags & 2 or "bold" in s.get("font", "").lower():
                            eh_negrito = True
                        linha_partes.append(s["text"])
                        
                    linha_texto = "".join(linha_partes).strip()
                    if not linha_texto:
                        continue
                    
                    # Filtra números de página isolados
                    if re.match(r'^\d{1,4}$', linha_texto) or re.match(r'^p[aá]gina\s+\d+(\s+de\s+\d+)?$', linha_texto, re.I):
                        continue
                    
                    if maior_tam >= tam_comum + 4:
                        if num_pag == 0 and len(linhas) < 4:
                            paragrafos_bloco.append(f"# {linha_texto}")
                        else:
                            paragrafos_bloco.append(f"## {linha_texto}")
                    elif maior_tam >= tam_comum + 1.5 or (eh_negrito and len(linha_texto) < 90):
                        paragrafos_bloco.append(f"### {linha_texto}")
                    else:
                        paragrafos_bloco.append(linha_texto)
                        
                if paragrafos_bloco:
                    # Separa cabeçalhos, marcadores e listas numeradas em linhas distintas
                    linhas_bloco = []
                    atual = []
                    for p in paragrafos_bloco:
                        if p.startswith('#') or re.match(r'^(?:\[\d+\]|\d+[\.\s\-\)]|\(\d+\))\s+', p) or p.startswith('**'):
                            if atual:
                                linhas_bloco.append(" ".join(atual))
                                atual = []
                            linhas_bloco.append(p)
                        else:
                            atual.append(p)
                    if atual:
                        linhas_bloco.append(" ".join(atual))
                    linhas.extend(linhas_bloco)
                    
    texto_bruto = "\n\n".join(linhas)
    return texto_bruto, tabelas_md

def normalizar_estrutura(texto_bruto):
    """
    Normaliza a estrutura do manuscrito para o padrão científico:
    # Título
    **RESUMO:** ...
    **Palavras-chave:** ...
    **ABSTRACT:** ...
    **Keywords:** ...
    ## 1 Introdução
    ## 2 Métodos
    ## 3 Resultados
    ## 4 Discussão
    ## 5 Conclusão
    ## Referências
    """
    linhas = texto_bruto.split('\n')
    novas_linhas = []
    
    padroes_secao = [
        (r'^(?:#+\s*|\*+\s*)?(?:1\s*[-.]?\s*)?(?:introdu[cç][aã]o|introduction|fundamenta[cç][aã]o\s+te[oó]rica|marco\s+te[oó]rico|revis[aã]o\s+bibliogr[aá]fica|contexto|background)(?:\s*\*+|\s*#+|\s*:)*\s*$', '## 1 Introdução'),
        (r'^(?:#+\s*|\*+\s*)?(?:2\s*[-.]?\s*)?(?:m[eé]todos|metodologia|materiais\s+e\s+m[eé]todos|methods|m[eé]todo|casu[ií]stica\s+e\s+m[eé]todos|pacientes\s+e\s+m[eé]todos|procedimentos\s+metodol[oó]gicos|material\s+e\s+m[eé]todos|metodolog[ií]a)(?:\s*\*+|\s*#+|\s*:)*\s*$', '## 2 Métodos'),
        (r'^(?:#+\s*|\*+\s*)?(?:3\s*[-.]?\s*)?(?:resultados|results|resultados\s+e\s+an[aá]lise|resultados\s+e\s+discuss[aã]o|achados|findings)(?:\s*\*+|\s*#+|\s*:)*\s*$', '## 3 Resultados'),
        (r'^(?:#+\s*|\*+\s*)?(?:4\s*[-.]?\s*)?(?:discuss[aã]o|discussion|discuss[aã]o\s+dos\s+dados|discuss[aã]o\s+dos\s+resultados)(?:\s*\*+|\s*#+|\s*:)*\s*$', '## 4 Discussão'),
        (r'^(?:#+\s*|\*+\s*)?(?:5\s*[-.]?\s*)?(?:conclus[aã]o|conclus[oõ]es|considera[cç][oõ]es\s+finais|conclusion|conclusiones|concluding\s+remarks)(?:\s*\*+|\s*#+|\s*:)*\s*$', '## 5 Conclusão'),
        (r'^(?:#+\s*|\*+\s*)?(?:refer[eê]ncias(?:\s+bibliogr[aá]ficas)?|references|bibliografia|literatura\s+citada|works\s+cited)(?:\s*\*+|\s*#+|\s*:)*\s*$', '## Referências'),
    ]
    
    for l in linhas:
        l_trim = l.strip()
        if not l_trim:
            novas_linhas.append("")
            continue
            
        substituiu = False
        for pad, subst in padroes_secao:
            if re.match(pad, l_trim, re.IGNORECASE):
                novas_linhas.append(subst)
                substituiu = True
                break
                
        if not substituiu:
            # Normaliza cabeçalho Resumo se for isolado
            if re.match(r'^(?:#+\s*|\*+\s*)?resumo(?:\s*\*+|\s*#+|\s*:)*\s*$', l_trim, re.I):
                novas_linhas.append("**RESUMO:**")
            elif re.match(r'^(?:#+\s*|\*+\s*)?abstract(?:\s*\*+|\s*#+|\s*:)*\s*$', l_trim, re.I):
                novas_linhas.append("**ABSTRACT:**")
            elif re.match(r'^(?:#+\s*|\*+\s*)?resumen(?:\s*\*+|\s*#+|\s*:)*\s*$', l_trim, re.I):
                novas_linhas.append("**RESUMEN:**")
            else:
                novas_linhas.append(l)
                
    md = '\n'.join(novas_linhas)
    
    # Assegura que haja um título # no topo do artigo
    linhas_finais = md.split('\n')
    primeiro_idx = -1
    tem_h1 = False
    re_rotulo_rascunho = r'^(?:[A-Za-z0-9_-]+[\s_]+)?(?:v\d+|draft\d*|rascunho\d*|teste\d*)$'
    
    for idx, l in enumerate(linhas_finais):
        l_s = l.strip()
        if not l_s:
            continue
        if l_s.startswith('# ') and not l_s.startswith('## '):
            conteudo_h1 = l_s[2:].strip()
            if re.match(re_rotulo_rascunho, conteudo_h1, re.I):
                linhas_finais[idx] = ""  # expurga rótulo de rascunho órfão
                continue
            tem_h1 = True
            break
        if primeiro_idx == -1 and not re.match(r'^\*{0,2}(?:resumo|abstract|resumen)', l_s, re.I):
            limpo = re.sub(r"^[\s#\*]+|[\s#\*]+$", "", l_s)
            if not re.match(re_rotulo_rascunho, limpo, re.I) and len(limpo) >= 15:
                primeiro_idx = idx
            
    if not tem_h1 and primeiro_idx != -1:
        linha_original = linhas_finais[primeiro_idx]
        limpo = re.sub(r"^[\s#\*]+|[\s#\*]+$", "", linha_original)
        linhas_finais[primeiro_idx] = f"# {limpo}"
        
    md = '\n'.join(linhas_finais)
        
    # Garante junção de **RESUMO:** com o parágrafo seguinte se estiver isolado
    md = re.sub(r'\*\*RESUMO:\*\*\s*\n\s*\n\s*', '**RESUMO:** ', md)
    md = re.sub(r'\*\*ABSTRACT:\*\*\s*\n\s*\n\s*', '**ABSTRACT:** ', md)
    md = re.sub(r'\*\*RESUMEN:\*\*\s*\n\s*\n\s*', '**RESUMEN:** ', md)
    
    return md

def extrair_referencias_individuais(md):
    """
    Extrai lista de referências individuais da seção ## Referências.
    Suporta padrões numerados (1. ... ou [1] ...) e autor-data (ex: SILVA, J. A. ...).
    """
    m = re.search(r'## Referências\s*([\s\S]*)$', md, flags=re.IGNORECASE)
    if not m:
        return []
    
    bloco_refs = m.group(1).strip()
    # Se o bloco contiver múltiplos itens numerados concatenados na mesma linha, insere quebras
    bloco_refs = re.sub(r'(?<=[.;\d])\s+(?=(?:\[\d+\]|\d+\.\s+|\(\d+\)\s+))', r'\n', bloco_refs)
    linhas_refs = bloco_refs.split('\n')
    
    refs = []
    atual = []
    
    re_inicio_num = re.compile(r'^(?:\[(\d+)\]|(\d+)[\.\s\-\)]|\((\d+)\))\s*(.+)')
    re_inicio_autor = re.compile(r'^(?:[A-ZÀ-Ú]{2,}|[A-ZÀ-Ú][a-zà-ú]+),\s+[A-ZÀ-Ú]')
    
    for l in linhas_refs:
        l_strip = l.strip()
        if not l_strip:
            if atual:
                refs.append(" ".join(atual))
                atual = []
            continue
        
        m_ini = re_inicio_num.match(l_strip)
        eh_autor = re_inicio_autor.match(l_strip) and len(atual) > 0 and len(" ".join(atual)) > 40
        
        if m_ini:
            if atual:
                refs.append(" ".join(atual))
                atual = []
            texto = m_ini.group(4) or l_strip
            atual.append(texto.strip())
        elif eh_autor:
            if atual:
                refs.append(" ".join(atual))
                atual = []
            atual.append(l_strip)
        else:
            atual.append(l_strip)
                
    if atual:
        refs.append(" ".join(atual))
        
    refs = [r.strip() for r in refs if len(r.strip()) > 15]
    return refs

def avaliar_confianca_extracao(secoes_presentes, referencias, palavras_total, titulo, md):
    """
    Avalia a integridade estrutural da extração (0 a 100%) e emite alertas
    para que o autor possa revisar a estrutura antes de aplicar reescritas.
    """
    score = 0
    alertas = []
    
    # 1. Seções essenciais IMRaD (até 50 pts)
    pontos_secoes = {
        'introducao': 10,
        'metodos': 10,
        'resultados': 10,
        'discussao': 10,
        'conclusao': 5,
    }
    for sec, pts in pontos_secoes.items():
        if sec in secoes_presentes:
            score += pts
        else:
            alertas.append(f"Seção '{sec.capitalize()}' não foi detectada como cabeçalho canônico.")
            
    # Resumo / Abstract (5 pts)
    if '**RESUMO:**' in md or '**ABSTRACT:**' in md:
        score += 5
    else:
        alertas.append("Resumo/Abstract estruturado não foi identificado no início do texto.")
        
    # 2. Referências bibliográficas (até 25 pts)
    n_refs = len(referencias)
    if n_refs >= 15:
        score += 25
    elif n_refs >= 10:
        score += 20
    elif n_refs >= 5:
        score += 15
    elif n_refs >= 1:
        score += 8
        alertas.append(f"Número reduzido de referências segmentadas ({n_refs}). Verifique a formatação da bibliografia.")
    else:
        alertas.append("Nenhuma referência individual pôde ser segmentada automaticamente.")
        
    # 3. Volume e densidade textual (até 15 pts)
    if palavras_total >= 1200:
        score += 15
    elif palavras_total >= 700:
        score += 10
    elif palavras_total >= 300:
        score += 5
        alertas.append(f"Volume textual baixo ({palavras_total} palavras). Verifique se o documento foi extraído integralmente.")
    else:
        alertas.append(f"Volume textual crítico ({palavras_total} palavras). Risco de extração incompleta.")
        
    # 4. Título não genérico (até 10 pts)
    if titulo and titulo != "Artigo Científico Importado" and len(titulo) >= 15:
        score += 10
    else:
        score += 3
        alertas.append("Título principal do artigo não identificado com certeza (usando título padrão ou curto).")
        
    if score < 70:
        alertas.insert(0, "Confiança estrutural moderada/baixa. Recomendada inspeção prévia no Raio-X antes de aplicar aprimoramentos.")
        
    return min(max(score, 0), 100), alertas

def processar_documento(caminho):
    ext = os.path.splitext(caminho)[-1].lower()
    if ext == '.docx':
        texto_bruto, tabelas = extrair_docx(caminho)
    elif ext == '.pdf':
        texto_bruto, tabelas = extrair_pdf(caminho)
    else:
        raise ValueError(f"Extensão não suportada: {ext}. Envie arquivo .docx ou .pdf")
        
    md_normalizado = normalizar_estrutura(texto_bruto)
    referencias = extrair_referencias_individuais(md_normalizado)
    
    m_tit = re.search(r'^#\s+([^\n]+)', md_normalizado, flags=re.MULTILINE)
    titulo = m_tit.group(1).strip() if m_tit else "Artigo Científico Importado"
    
    secoes_presentes = []
    if '## 1 Introdução' in md_normalizado:
        secoes_presentes.append('introducao')
    if '## 2 Métodos' in md_normalizado:
        secoes_presentes.append('metodos')
    if '## 3 Resultados' in md_normalizado:
        secoes_presentes.append('resultados')
    if '## 4 Discussão' in md_normalizado:
        secoes_presentes.append('discussao')
    if '## 5 Conclusão' in md_normalizado:
        secoes_presentes.append('conclusao')
    if '## Referências' in md_normalizado:
        secoes_presentes.append('referencias')
        
    palavras_total = len(md_normalizado.split())
    confianca, alertas = avaliar_confianca_extracao(
        secoes_presentes, referencias, palavras_total, titulo, md_normalizado
    )
    
    resultado = {
        "titulo": titulo,
        "markdown": md_normalizado,
        "referencias": referencias,
        "tabelas_count": len(tabelas),
        "secoes_detectadas": secoes_presentes,
        "palavras_total": palavras_total,
        "confianca_extracao": confianca,
        "alertas_extracao": alertas,
    }
    return resultado

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(json.dumps({"erro": "Informe o caminho do arquivo"}))
        sys.exit(1)
        
    arq = sys.argv[1]
    try:
        dados = processar_documento(arq)
        print(json.dumps(dados, ensure_ascii=False, indent=2))
    except Exception as e:
        print(json.dumps({"erro": str(e)}))
        sys.exit(1)
