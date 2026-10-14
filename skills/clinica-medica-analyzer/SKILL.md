---
name: clinica-medica-analyzer
description: Pipeline multi-agente completo para extração, classificação nosológica, análise pedagógica e geração de painel interativo de estudos para provas de Clínica Médica (PDFs com gabaritos em cores, chaves finais e gabaritos comentados).
license: Apache-2.0
metadata:
  version: v1
  author: Antigravity & Tool-Kit
---

# Clínica Médica Analyzer - Guia Operacional do Pipeline

Esta skill orquestra o time de agentes médicos especializados para processar provas de Clínica Médica (graduação/internato), extrair enunciados e alternativas, cruzar gabaritos (inclusive por formatação cromática em vermelho), classificar cada questão em **Tema, Subtema, Objetivo de Aprendizagem e Tipo de Conduta**, e gerar um painel interativo de estudos de alta performance.

---

## 👥 Agentes Envolvidos

1. **Medical Exam Parser (`agents/med-exam-parser.md`)**:
   - Extrai texto e spans cromáticos dos PDFs com PyMuPDF.
   - Detecta texto vermelho (`#EE0000` / `#FF0000`) nas alternativas assinaladas.
   - Extrai chaves de gabarito tabulares ou ao final da prova.
   - Mantém 100% de integridade dos enunciados e alternativas A-D.

2. **Clinical Taxonomy Classifier (`agents/med-clinical-classifier.md`)**:
   - Mapeia a Grande Área (Cardiologia, Pneumologia, Nefrologia, etc.).
   - Atribui o Subtema clínico específico (ex: *Fibrilação Atrial*, *TEP*, *Hipercalemia*).
   - Redige o **Objetivo Educacional / Competência Clínica** testada na questão.
   - Classifica o tipo cognitivo: *Conduta de Urgência*, *Diagnóstico*, *Exame Complementar*, *Manejo Ambulatorial*, *Prevenção*.

3. **Clinical Preceptor & Reasoning Tutor (`agents/med-pedagogical-explainer.md`)**:
   - Sintetiza a justificativa clínica oficial.
   - Detalha por que a alternativa correta é a conduta padrão.
   - Explica o erro de cada um dos distratores.
   - Adiciona a "Pérola do Plantão" e alerta contra pegadinhas de prova.

4. **Medical Study Synthesizer (`agents/med-study-synthesizer.md`)**:
   - Agrega estatísticas e calcula matriz de incidência (Princípio de Pareto).
   - Identifica tendências temporais entre as provas (2022 a 2026).
   - Constrói o banco de dados `banco_questoes_clinica_medica.json`.
   - Gera a interface web do painel interativo de estudos (`painel_estudos_clinica_medica.html`).

---

## 🔄 Fluxo de Execução

1. **Execução do Script Extrator & Classificador**:
   ```bash
   .venv/bin/python3 scripts/build_med_study_platform.py
   ```
2. **Entradas Suportadas**:
   - `COMPILADO DE PROVAS CM.pdf`: Provas históricas de 2022.1.1 a 2025.2.1 com gabarito no final de cada módulo.
   - `GABARITO REVISADO PROVA DE CLÍNICA MÉDICA  2026 1 1.pdf`: Prova com gabarito comentado e justificativas completas no corpo do texto.
   - `Prova módulo - CLÍNICA MÉDICA 20.07 - Gabarito.pdf`: Prova com alternativas corretas sinalizadas com fonte vermelha.
3. **Saídas Geradas**:
   - `banco_questoes_clinica_medica.json`: Dataset consolidado de todas as questões estruturadas.
   - `estatisticas_banca.json`: Métricas e frequências agregadas.
   - `painel_estudos_clinica_medica.html`: Dashboard interativo pronto para estudo em qualquer navegador.
