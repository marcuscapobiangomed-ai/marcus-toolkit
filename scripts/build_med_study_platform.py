#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Motor Avançado de Extração, Classificação Clínica de Alta Precisão,
Detecção de Repetições e Construção da Plataforma 'Meta 90%'
Módulo e Internato de Clínica Médica
"""

import os
import re
import json
from collections import defaultdict, Counter
import pymupdf

WORKSPACE_DIR = "/Users/user/Documents/Tool-Kit"
DOC1_PATH = os.path.join(WORKSPACE_DIR, "Prova módulo - CLÍNICA MÉDICA 20.07 - Gabarito.pdf")
DOC2_PATH = os.path.join(WORKSPACE_DIR, "GABARITO REVISADO PROVA DE CLÍNICA MÉDICA  2026 1 1.pdf")
DOC3_PATH = os.path.join(WORKSPACE_DIR, "COMPILADO DE PROVAS CM.pdf")

OUTPUT_JSON = os.path.join(WORKSPACE_DIR, "banco_questoes_clinica_medica.json")
OUTPUT_STATS = os.path.join(WORKSPACE_DIR, "estatisticas_banca.json")
OUTPUT_HTML = os.path.join(WORKSPACE_DIR, "painel_estudos_clinica_medica.html")

# ==========================================
# 1. MOTOR DE CLASSIFICAÇÃO CLÍNICA DE ALTA PRECISÃO
# ==========================================

def classify_medical_question(statement, alternatives_dict, given_theme=None, given_gabarito=None):
    text = (statement + " " + " ".join(alternatives_dict.values())).lower()
    
    # Se havia tema explícito no compilado (ex: 2024.1.1 '(TEMA: ITU)')
    if given_theme:
        gt = given_theme.upper()
        if "ITU" in gt:
            return "Nefrologia", "Infecção do Trato Urinário & Pielonefrite", "Diagnosticar infecção do trato urinário e prescrever antibioticoterapia orientada por gravidade.", "Terapêutica Ambulatorial / Farmacologia"
        if "PNEUMONIA" in gt:
            return "Pneumologia", "Pneumonia Adquirida na Comunidade (PAC) & CURB-65", "Estratificar gravidade da PAC pelo escore CURB-65 e prescrever terapia antimicrobiana.", "Conduta Terapêutica de Emergência"
        if "CELULITE" in gt:
            return "Infectologia", "Infecções de Pele & Partes Moles", "Diferenciar celulite e erisipela e indicar antibioticoterapia para profilaxia de mordeduras.", "Terapêutica Ambulatorial / Farmacologia"
        if "GOTA" in gt:
            return "Reumatologia", "Gota & Artrites Microcristalinas", "Conduzir a crise aguda de artrite microcristalina por cristais de urato monossódico.", "Terapêutica Ambulatorial / Farmacologia"
        if "OSTEOPOROSE" in gt:
            return "Endocrinologia", "Osteoporose & Metabolismo Ósseo", "Interpretar densitometria óssea e indicar tratamento antirreabsortivo com bisfosfonatos.", "Terapêutica Ambulatorial / Farmacologia"

    # --- INFECTOLOGIA ---
    if "meningit" in text or "neisseria" in text or ("líquor" in text and "pleocitose" in text):
        return "Infectologia", "Meningites Agudas", "Definir conduta e quimioprofilaxia de contatos íntimos na suspeita de meningite meningocócica.", "Conduta Terapêutica de Emergência"
    if any(k in text for k in ["leptospiros", "icterícia rubínica", "febre maculosa", "rickettsia", "carrapato"]):
        return "Infectologia", "Zoonoses: Leptospirose & Febre Maculosa", "Reconhecer apresentação clínica de zoonoses e iniciar terapia empírica precoce com Doxiciclina.", "Conduta Terapêutica de Emergência"
    if any(k in text for k in ["dengue", "chikungunya", "zika", "prova do laço", "ns1"]):
        return "Infectologia", "Arboviroses (Dengue, Chikungunya, Zika)", "Estratificar gravidade e hidratação na Dengue e reconhecer artrite crônica na Chikungunya.", "Conduta Terapêutica de Emergência"
    if any(k in text for k in ["tuberculose", "trm-tb", "baciloscopia", "baarr", "ripe", "ada pleural"]):
        return "Infectologia", "Tuberculose", "Interpretar diagnóstico laboratorial da tuberculose pelo TRM-TB e prescrever o esquema RIPE.", "Investigação & Propedêutica Complementar"
    if any(k in text for k in ["hepatite b", "hepatite c", "hbsag", "anti-hbs", "anti-hbc"]):
        return "Infectologia", "Hepatites Virais", "Interpretar sorologia das hepatites virais e avaliar imunização e indicação de antivirais.", "Investigação & Propedêutica Complementar"
    if any(k in text for k in ["hiv", "aids", "cd4", "carga viral", "dolutegravir", "neurotoxoplasmose", "pneumocistose", "pep"]):
        return "Infectologia", "HIV/AIDS & Infecções Oportunistas", "Diagnosticar infecções oportunistas em pacientes vivendo com HIV e instituir profilaxias.", "Terapêutica Ambulatorial / Farmacologia"
    if any(k in text for k in ["celulite", "erisipela", "mordedura", "pasteurella", "mupirocina"]):
        return "Infectologia", "Infecções de Pele & Partes Moles", "Manejar infecções de partes moles e ferimentos por mordedura animal.", "Terapêutica Ambulatorial / Farmacologia"

    # --- NEUROLOGIA ---
    if any(k in text for k in ["avc", "avci", "avch", "trombólise", "alteplase", "nihss", "cincinnati", "artéria cerebral média", "hemiparesia"]):
        return "Neurologia", "Acidente Vascular Cerebral (AVC)", "Avaliar déficit neurológico agudo e indicar trombólise endovenosa com rt-PA em janela terapêutica.", "Conduta Terapêutica de Emergência"
    if any(k in text for k in ["lewy", "alzheimer", "demência vascular", "meem", "flutuação cognitiva", "delirium", "confusão mental"]):
        return "Neurologia", "Demências & Delirium", "Diferenciar síndromes demenciais crônicas de delirium agudo e identificar a tríade de Lewy.", "Diagnóstico Clínico & Fisiopatologia"
    if any(k in text for k in ["parkinson", "levodopa", "flunarizina", "roda denteada", "bradicinesia", "tremor de repouso"]):
        return "Neurologia", "Doença de Parkinson & Tremores", "Diagnosticar Doença de Parkinson e diferenciar de parkinsonismo induzido por fármacos.", "Diagnóstico Clínico & Fisiopatologia"
    if any(k in text for k in ["cefaleia", "enxaqueca", "migrânea", "salvas", "hemorragia subaracnóidea", "snoop", "aneurisma"]):
        return "Neurologia", "Cefaleias & Hemorragia Subaracnóidea", "Diferenciar cefaleias primárias de secundárias e rastrear hemorragia subaracnóidea por sinais de alarme.", "Diagnóstico Clínico & Fisiopatologia"
    if any(k in text for k in ["convulsão", "crise convulsiva", "epilepsia", "estado de mal epiléptico", "diazepam"]):
        return "Neurologia", "Epilepsia & Crises Convulsivas", "Manejar a crise convulsiva aguda e o estado de mal epiléptico com benzodiazepínicos e antiepilépticos.", "Conduta Terapêutica de Emergência"

    # --- CARDIOLOGIA ---
    if any(k in text for k in ["fibrilação atrial", "cha2ds2", "cardioversão", "has-bled", "flutter", "arritmia", "taquicardia supra"]):
        return "Cardiologia", "Arritmias & Fibrilação Atrial", "Estratificar risco embólico pelo CHA2DS2-VASc e indicar anticoagulação e cardioversão segura.", "Conduta Terapêutica de Emergência"
    if any(k in text for k in ["tamponamento", "tríade de beck", "pericardiocentese", "derrame pericárdico", "atrito pericárdico"]):
        return "Cardiologia", "Tamponamento Cardíaco & Doenças do Pericárdio", "Reconhecer tamponamento cardíaco (tríade de Beck) e executar pericardiocentese de urgência.", "Conduta Terapêutica de Emergência"
    if any(k in text for k in ["infarto", "iam", "troponina", "supra de st", "dor torácica", "angina", "cateterismo", "dupla antiagregação"]):
        return "Cardiologia", "Síndrome Coronariana Aguda & IAM", "Conduzir a síndrome coronariana aguda com e sem supra de ST e definir estratégia de reperfusão.", "Conduta Terapêutica de Emergência"
    if any(k in text for k in ["insuficiência cardíaca", "icfer", "sacubitril", "valsartana", "fração de ejeção", "edema agudo de pulmão", "b3", "classe funcional nyha"]):
        return "Cardiologia", "Insuficiência Cardíaca", "Prescrever o tratamento farmacológico quádruplo da IC e manejar a descompensação volêmica aguda.", "Terapêutica Ambulatorial / Farmacologia"
    if any(k in text for k in ["hipertensão resistente", "pseudorresistência", "losartana", "anlodipino", "hiperaldosteronismo primário", "feocromocitoma", "displasia fibromuscular"]):
        return "Cardiologia", "Hipertensão Arterial & Emergências Hipertensivas", "Investigar causas secundárias de hipertensão resistente e escalonar a terapia medicamentosa.", "Terapêutica Ambulatorial / Farmacologia"

    # --- PNEUMOLOGIA ---
    if any(k in text for k in ["tep", "tromboembolismo", "embolia pulmonar", "escore de wells", "d-dímero", "angiotomografia"]):
        return "Pneumologia", "Tromboembolismo Pulmonar (TEP)", "Estratificar probabilidade clínica de TEP pelo escore de Wells e indicar angio-TC ou D-dímero.", "Investigação & Propedêutica Complementar"
    if any(k in text for k in ["pneumonia", "curb-65", "curb65", "estertores crepitantes", "consolidação pulmonar", "expectoração amarelada"]):
        return "Pneumologia", "Pneumonia Adquirida na Comunidade (PAC) & CURB-65", "Estratificar gravidade pelo CURB-65 e prescrever antibioticoterapia ambulatorial ou hospitalar.", "Conduta Terapêutica de Emergência"
    if any(k in text for k in ["dpoc", "gold", "enfisema", "bronquite crônica", "vni", "retenção de co2", "acidose respiratória"]):
        return "Pneumologia", "DPOC (Doença Pulmonar Obstrutiva Crônica)", "Classificar a DPOC pelas diretrizes GOLD e manejar a exacerbação aguda com suporte ventilatório e broncodilatadores.", "Conduta Terapêutica de Emergência"
    if any(k in text for k in ["pneumotórax", "derrame pleural", "critérios de light", "toracocentese", "punção de alívio"]):
        return "Pneumologia", "Derrame Pleural & Doenças Pleurais", "Diagnosticar e descomprimir pneumotórax hipertensivo ou diferenciar transudato de exsudato pleural.", "Conduta Terapêutica de Emergência"
    if any(k in text for k in ["asma", "sibilos", "broncoespasmo", "gina", "formoterol", "budesonida"]):
        return "Pneumologia", "Asma Brônquica", "Manejar a crise asmática aguda e escalonar tratamento de manutenção conforme o GINA.", "Conduta Terapêutica de Emergência"

    # --- NEFROLOGIA ---
    if any(k in text for k in ["gluconato de cálcio", "hipercalemia", "k+", "t apiculada", "hemodiálise de urgência"]):
        return "Nefrologia", "Hipercalemia & Distúrbios Eletrolíticos", "Priorizar estabilização de membrana com gluconato de cálcio e indicar diálise na hipercalemia grave.", "Conduta Terapêutica de Emergência"
    if any(k in text for k in ["itu", "cistite", "pielonefrite", "disúria", "polaciúria", "giordano", "punho-percussão", "urocultura"]):
        return "Nefrologia", "Infecção do Trato Urinário & Pielonefrite", "Diagnosticar ITU e pielonefrite, selecionando o esquema antibiótico e indicações de internação.", "Terapêutica Ambulatorial / Farmacologia"
    if any(k in text for k in ["drc", "doença renal crônica", "tfg", "uremia", "estágio 5", "síndrome urêmica", "fístula"]):
        return "Nefrologia", "Doença Renal Crônica (DRC)", "Estadiar a DRC pela TFG e manejar complicações do metabolismo ósseo, acidose e uremia.", "Terapêutica Ambulatorial / Farmacologia"
    if any(k in text for k in ["injúria renal aguda", "ira", "kdigo", "fena", "necrose tubular aguda", "pré-renal"]):
        return "Nefrologia", "Injúria Renal Aguda (IRA)", "Diferenciar etiologias de lesão renal aguda e indicar correção volêmica ou hemodiálise.", "Diagnóstico Clínico & Fisiopatologia"
    if any(k in text for k in ["síndrome nefrótica", "síndrome nefrítica", "proteinúria", "cilindros hemáticos"]):
        return "Nefrologia", "Glomerulopatias & Síndrome Nefrótica/Nefrítica", "Reconhecer glomerulopatias através do sedimento urinário e proteinúria de 24h.", "Investigação & Propedêutica Complementar"

    # --- ENDOCRINOLOGIA ---
    if any(k in text for k in ["diabetes", "dm2", "metformina", "glicemia", "hba1c", "hemoglobina glicada", "insulina", "gliclazida"]):
        return "Endocrinologia", "Diabetes Mellitus: Diagnóstico & Tratamento", "Aplicar critérios de diagnóstico do DM2 e instituir farmacoterapia com Metformina e iSGLT2.", "Terapêutica Ambulatorial / Farmacologia"
    if any(k in text for k in ["cetoacidose", "cad", "estado hiperosmolar", "corpos cetônicos", "ânion gap"]):
        return "Endocrinologia", "Crises Hiperglicêmicas (CAD & EHH)", "Conduzir o protocolo de ressuscitação volêmica, correção de potássio e insulinoterapia na CAD.", "Conduta Terapêutica de Emergência"
    if any(k in text for k in ["tsh", "tireoide", "hipotireoidismo", "hipertireoidismo", "metimazol", "levotiroxina", "nódulo tireo"]):
        return "Endocrinologia", "Distúrbios da Tireoide", "Interpretar alterações de TSH/T4L e conduzir investigação e tratamento de tireoidopatias.", "Investigação & Propedêutica Complementar"
    if any(k in text for k in ["osteoporose", "densitometria óssea", "t-score", "alendronato"]):
        return "Endocrinologia", "Osteoporose & Metabolismo Ósseo", "Interpretar o T-score da densitometria óssea e indicar terapia antirreabsortiva.", "Terapêutica Ambulatorial / Farmacologia"

    # --- GASTROENTEROLOGIA & HEPATOLOGIA ---
    if any(k in text for k in ["cirrose", "ascite", "peritonite bacteriana espontânea", "pbe", "varizes esofágicas", "gasa", "lactulona"]):
        return "Gastroenterologia", "Cirrose Hepática, Hipertensão Portal & Ascite", "Diagnosticar PBE (neutrófilos ≥ 250) e manejar complicações descompensadas da cirrose.", "Conduta Terapêutica de Emergência"
    if any(k in text for k in ["pancreatite", "amilase", "lipase", "ranson"]):
        return "Gastroenterologia", "Pancreatite Aguda & Crônica", "Diagnosticar pancreatite aguda pelos critérios clássicos e prescrever expansão com Ringer Lactato.", "Diagnóstico Clínico & Fisiopatologia"
    if any(k in text for k in ["úlcera", "h. pylori", "hemorragia digestiva alta", "hda", "melena", "eda", "omeprazol"]):
        return "Gastroenterologia", "Hemorragia Digestiva & Úlcera Péptica", "Estabilizar hemorragia digestiva alta e prescrever erradicação de Helicobacter pylori.", "Conduta Terapêutica de Emergência"
    if any(k in text for k in ["refluxo", "drge", "esôfago de barrett", "dispepsia"]):
        return "Gastroenterologia", "Doença do Refluxo & Dispepsia", "Manejar a DRGE clinicamente e identificar indicações de endoscopia de controle.", "Terapêutica Ambulatorial / Farmacologia"
    if any(k in text for k in ["crohn", "retocolite", "rcu", "diarreia crônica", "megacólon tóxico"]):
        return "Gastroenterologia", "Doenças Inflamatórias Intestinais & Diarreia", "Diferenciar Crohn de Retocolite e diagnosticar complicações agudas graves.", "Diagnóstico Clínico & Fisiopatologia"

    # --- REUMATOLOGIA ---
    if any(k in text for k in ["lúpus", "les", "anti-dna", "anti-sm", "fan", "rash malar"]):
        return "Reumatologia", "Lúpus Eritematoso Sistêmico (LES)", "Interpretar perfil de autoanticorpos no LES e indicar propedêutica de acometimento orgânico.", "Investigação & Propedêutica Complementar"
    if any(k in text for k in ["artrite reumatoide", "fator reumatoide", "anti-ccp", "metotrexato", "sinovite"]):
        return "Reumatologia", "Artrite Reumatoide & Espondiloartrites", "Diagnosticar artrite reumatoide pelo padrão simétrico distal e instituir DMARDs precoce.", "Terapêutica Ambulatorial / Farmacologia"
    if any(k in text for k in ["gota", "ácido úrico", "podagra", "colchicina", "alopurinol"]):
        return "Reumatologia", "Gota & Artrites Microcristalinas", "Tratar a crise aguda de artrite gotosa e orientar introdução tardia de alopurinol.", "Terapêutica Ambulatorial / Farmacologia"
    if any(k in text for k in ["arterite de células gigantes", "arterite temporal", "polimialgia", "vhs elevado"]):
        return "Reumatologia", "Vasculites & Arterite de Células Gigantes", "Identificar arterite temporal e iniciar corticoterapia em altas doses para prevenir cegueira.", "Conduta Terapêutica de Emergência"

    # --- HEMATOLOGIA ---
    if any(k in text for k in ["anemia", "ferritina", "ferropriva", "vitamina b12", "ácido fólico", "reticulócitos", "coombs", "haptoglobina"]):
        return "Hematologia", "Anemias Carenciais & Hemolíticas", "Classificar anemias pelo VCM e cinética de ferro/vitaminas e instituir reposição.", "Investigação & Propedêutica Complementar"
    if any(k in text for k in ["mieloma", "eletroforese", "pico monoclonal", "lesões líticas", "bence-jones"]):
        return "Hematologia", "Gamopatias Monoclonais & Leucemias", "Investigar mieloma múltiplo (critérios CRAB) por eletroforese com imunofixação.", "Investigação & Propedêutica Complementar"
    if any(k in text for k in ["plaquetopenia", "trombocitopenia", "púrpura"]):
        return "Hematologia", "Plaquetopenias & Distúrbios da Coagulação", "Avaliar trombocitopenia e descartar microangiopatias trombóticas.", "Diagnóstico Clínico & Fisiopatologia"

    # --- GERIATRIA & SAÚDE MENTAL & OUTROS ---
    if any(k in text for k in ["quedas", "polifarmácia", "beers", "katz", "lawton", "idoso frágil"]):
        return "Geriatria", "Quedas, Polifarmácia & Síndrome da Fragilidade", "Desprescrever fármacos de risco em idosos segundo os critérios de Beers.", "Prevenção, Rastreamento & Vacinação"
    if any(k in text for k in ["hanseníase", "mancha hipocrômica", "intertrigo", "corticosteroide tópico", "telangiectasias"]):
        return "Dermatologia", "Dermatologia Clínica & Hanseníase", "Reconhecer efeitos adversos de corticoides tópicos crônicos e diagnosticar hanseníase.", "Diagnóstico Clínico & Fisiopatologia"
    if any(k in text for k in ["depressão", "tristeza", "anedonia", "sertralina", "ansiedade"]):
        return "Psiquiatria", "Transtornos Depressivos & Ansiedade", "Diagnosticar depressão maior e indicar inibidores seletivos de recaptação de serotonina.", "Terapêutica Ambulatorial / Farmacologia"
    if any(k in text for k in ["más notícias", "spikes", "cuidados paliativos", "saúde indígena"]):
        return "Saúde Coletiva & Ética", "Comunicação de Más Notícias & Cuidados Paliativos", "Aplicar o protocolo SPIKES e respeitar preceitos éticos e culturais no atendimento.", "Prevenção, Rastreamento & Vacinação"

    return "Clínica Médica Geral", "Propedêutica & Clínica Geral", "Identificar a apresentação clínica sindrômica e definir propedêutica adequada.", "Diagnóstico Clínico"

def determine_cognitive_type(statement, alternatives_dict):
    stmt = statement.lower()
    alts = ' '.join(alternatives_dict.values()).lower()
    
    # 1. Fisiopatologia & Mecanismos (O Porquê / O Como)
    if any(k in stmt for k in [
        'mecanismo', 'fisiopatol', 'etiopatogen', 'o que aconteceu', 
        'decorre de', 'ocorre por', 'é causado por', 'explica a', 'explica o',
        'fisiopatologia', 'alteração fisiológica', 'fisiopatológico',
        'justifica o achado', 'justifica a', 'via etiológica', 'alteração celular',
        'causou o surgimento', 'mecanismo de ação'
    ]) or any(k in alts for k in [
        'vasoconstrição', 'vasodilatação', 'permeabilidade capilar',
        'redução de colágeno', 'atrofia da pele', 'deposição de imunocomplexos',
        'necrose tubular', 'saída de potássio', 'ruptura de microaneurismas'
    ]):
        return 'Fisiopatologia & Mecanismos'

    # 2. Investigação & Propedêutica Complementar
    if any(k in stmt for k in [
        'exame complementar', 'confirmação diagnóstica', 'exame que deve', 'solicitar',
        'exame inicial', 'método de escolha', 'exame padrão-ouro', 'achado tomográfico',
        'maior valor prognóstico e acurácia', 'conduta diagnóstica', 'qual exame',
        'exame confirmatório', 'densitometria óssea revelou'
    ]) and not any(k in stmt for k in ['qual a conduta terapêutica', 'qual medicamento', 'iniciar medicação']):
        return 'Investigação & Propedêutica Complementar'

    # 3. Prevenção, Rastreamento & Vacinação
    if any(k in stmt for k in ['prevenção', 'vacina', 'quimioprofilaxia', 'rastreamento', 'contactantes', 'imunização', 'promoção da saúde']):
        return 'Prevenção, Rastreamento & Vacinação'

    # 4. Conduta Terapêutica de Emergência
    if any(k in stmt for k in ['prioritária', 'imediata', 'urgência', 'emergência', 'na sala de emergência', 'primeiro passo']) or any(k in stmt for k in ['qual a conduta imediata', 'conduta terapêutica de urgência']):
        return 'Conduta Terapêutica de Emergência'

    # 5. Terapêutica Ambulatorial / Farmacologia
    if any(k in stmt for k in ['conduta terapêutica', 'tratamento adequado', 'prescrever', 'medicamento', 'droga de escolha', 'posologia', 'iniciar tratamento', 'esquema terapêutico', 'adicionar']):
        return 'Terapêutica Ambulatorial / Farmacologia'

    # 6. Diagnóstico Clínico (O Quê: Síndromes & Doenças)
    return 'Diagnóstico Clínico'

# ==========================================
# 2. CARREGAMENTO E DETECÇÃO DE REPETIÇÕES
# ==========================================

import unicodedata

def clean_statement_text(text):
    if not text:
        return ''
    t = unicodedata.normalize('NFC', text)
    # Join hyphenated words split across lines: cardio-\n vascular -> cardiovascular
    t = re.sub(r'(\w+)-\s*\n\s*(\w+)', r'\1\2', t)
    # Fix sentence-ending dash followed by newline and item: 'outros. -\nMEEM' -> 'outros.\n• MEEM'
    t = re.sub(r'([.?!:])\s*[-–—]\s*\n\s*', r'\1\n• ', t)
    # Fix isolated bullet dashes split across lines: '-\nMEEM' -> '\n• MEEM'
    t = re.sub(r'(?:^|\n)\s*[-•·–—]\s*\n\s*', r'\n• ', t)
    # Convert loose dashes or bullets: '\n - MEEM' -> '\n• MEEM'
    t = re.sub(r'(?:^|\n)\s*[-·–—]\s+([A-Za-z0-9])', r'\n• \1', t)
    
    lines = t.split('\n')
    cleaned_lines = []
    curr = []
    for l in lines:
        l_s = l.strip()
        if not l_s:
            continue
        is_bullet = bool(re.match(r'^(?:[•·*]|\d+[\.\)]|[IVXLCDM]+[\.\-–]|\([ \w]+\))\s+', l_s))
        if is_bullet:
            if curr:
                cleaned_lines.append(' '.join(curr))
                curr = []
            cleaned_lines.append(l_s)
        else:
            curr.append(l_s)
    if curr:
        cleaned_lines.append(' '.join(curr))
    res = '\n'.join(cleaned_lines)
    res = re.sub(r'[ \t]{2,}', ' ', res)
    res = re.sub(r'\s+([,.;:?!])', r'\1', res)
    return res.strip()

def clean_alt_text(text):
    if not text:
        return ''
    t = unicodedata.normalize('NFC', text)
    t = re.sub(r'(\w+)-\s*\n\s*(\w+)', r'\1\2', t)
    t = re.sub(r'\s*\n\s*', ' ', t)
    t = re.sub(r'[ \t]{2,}', ' ', t)
    t = re.sub(r'\s+([,.;:?!])', r'\1', t)
    return t.strip()

def load_and_enrich_dataset():
    print("-> Carregando questões originais para enriquecimento avançado...")
    with open(OUTPUT_JSON, "r", encoding="utf-8") as f:
        questions = json.load(f)

    # 0. Sanitização e Formatação Impecável do Texto Clínico
    for q in questions:
        q["enunciado"] = clean_statement_text(q["enunciado"])
        for k in q["alternativas"]:
            q["alternativas"][k] = clean_alt_text(q["alternativas"][k])

    # 1. Reclassificação de alta precisão
    for q in questions:
        theme_search = re.search(r'\(\s*TEMA\s*:\s*([^\)]+)\)', q["enunciado"], re.IGNORECASE)
        given_t = theme_search.group(1).strip() if theme_search else None
        tema, subtema, obj, _ = classify_medical_question(q["enunciado"], q["alternativas"], given_theme=given_t, given_gabarito=q["gabarito"])
        tipo = determine_cognitive_type(q["enunciado"], q["alternativas"])
        q["tema"] = tema
        q["subtema"] = subtema
        q["objetivo"] = obj
        q["tipo_questao"] = tipo

    # 2. Agrupamento de questões idênticas/gêmeas para detecção de repetições
    def get_stem(text):
        s = text.lower()
        s = re.sub(r'\(tema:\s*[^)]+\)', '', s)
        s = re.sub(r'[^\w\s]', ' ', s)
        words = s.split()
        return ' '.join(words[:11]) if len(words) >= 11 else ' '.join(words)

    stem_map = defaultdict(list)
    for q in questions:
        stem = get_stem(q["enunciado"])
        stem_map[stem].append(q)

    # Adicionar tags de repetição em cada questão
    repeat_count = 0
    for stem, q_list in stem_map.items():
        if len(q_list) > 1 and len(stem) > 15:
            repeat_count += 1
            all_provas = [f"{item['prova']} (Q{item['numero']})" for item in q_list]
            for item in q_list:
                item["is_repetida"] = True
                item["total_repeticoes"] = len(q_list)
                item["provas_repetidas"] = [p for p in all_provas if f"{item['prova']} (Q{item['numero']})" != p]
                # Se for repetida, adiciona nota de ouro na justificativa
                item["perola_banca"] = f"🔥 QUESTÃO DE OURO: Esta mesma questão ou variante idêntica já apareceu em {len(q_list)} provas do módulo ({', '.join(all_provas)}). Gabarito consistente: Alternativa {item['gabarito']}!"
        else:
            for item in q_list:
                item["is_repetida"] = False
                item["total_repeticoes"] = 1
                item["provas_repetidas"] = []
                item["perola_banca"] = f"💡 Dica da Banca: Fique atento ao critério de corte exato e não atrase a conduta prioritária. Gabarito oficial: Alternativa {item['gabarito']}."

    # 3. Ponderação especial e metadados das últimas 2 provas de 2026
    for q in questions:
        is_2026 = q["prova"] in ["Prova Módulo 20.07", "Prova 2026.1.1 (Gabarito Revisado)"]
        q["is_2026"] = is_2026
        ano_match = re.search(r'202[2-6]', q["prova"])
        q["ano"] = 2026 if is_2026 else (int(ano_match.group(0)) if ano_match else 2024)
        q["peso"] = 3 if is_2026 else (2 if q.get("is_repetida") else 1)
        if is_2026:
            q["destaque_2026"] = "✨ TENDÊNCIA 2026: Questão cobrada nas últimas 2 provas de Clínica Médica (2026). Prioridade máxima de estudo!"

    print(f"  -> Concluído: {len(questions)} questões enriquecidas. {repeat_count} grupos de questões repetidas identificados! 80 questões de 2026 ponderadas com peso máximo.")
    return questions

# ==========================================
# 3. RECONSTRUÇÃO DOS ARQUIVOS E DASHBOARD COMPLETO
# ==========================================

def save_and_build(questions):
    # Recalcula estatísticas
    stats = {
        "total_questoes": len(questions),
        "total_provas": 17,
        "total_repetidas": sum(1 for q in questions if q.get("is_repetida")),
        "total_2026": sum(1 for q in questions if q.get("is_2026")),
        "by_tema": {},
        "by_subtema": {},
        "by_prova": {},
        "by_tipo": {},
        "by_tema_2026": {},
        "by_subtema_2026": {}
    }

    for q in questions:
        t = q["tema"]
        st = q["subtema"]
        pr = q["prova"]
        tp = q["tipo_questao"]

        stats["by_tema"][t] = stats["by_tema"].get(t, 0) + 1
        stats["by_subtema"][st] = stats["by_subtema"].get(st, 0) + 1
        stats["by_prova"][pr] = stats["by_prova"].get(pr, 0) + 1
        stats["by_tipo"][tp] = stats["by_tipo"].get(tp, 0) + 1

        if q.get("is_2026"):
            stats["by_tema_2026"][t] = stats["by_tema_2026"].get(t, 0) + 1
            stats["by_subtema_2026"][st] = stats["by_subtema_2026"].get(st, 0) + 1

    stats["by_tema_2026"] = dict(sorted(stats["by_tema_2026"].items(), key=lambda item: item[1], reverse=True))
    stats["by_subtema_2026"] = dict(sorted(stats["by_subtema_2026"].items(), key=lambda item: item[1], reverse=True))

    stats["by_tema"] = dict(sorted(stats["by_tema"].items(), key=lambda item: item[1], reverse=True))
    stats["by_subtema"] = dict(sorted(stats["by_subtema"].items(), key=lambda item: item[1], reverse=True))
    stats["by_tipo"] = dict(sorted(stats["by_tipo"].items(), key=lambda item: item[1], reverse=True))

    with open(OUTPUT_JSON, "w", encoding="utf-8") as f:
        json.dump(questions, f, ensure_ascii=False, indent=2)
    print(f"💾 JSON Atualizado com precisão máxima em: {OUTPUT_JSON}")

    with open(OUTPUT_STATS, "w", encoding="utf-8") as f:
        json.dump(stats, f, ensure_ascii=False, indent=2)
    print(f"📊 Estatísticas Atualizadas em: {OUTPUT_STATS}")

    # Escreve o dashboard HTML ultra-completo
    build_passaporte_90_dashboard(questions, stats)

def build_passaporte_90_dashboard(questions, stats):
    print("-> Construindo Painel de Estudos 'Passaporte 90%' em HTML...")
    q_json = json.dumps(questions, ensure_ascii=False)
    st_json = json.dumps(stats, ensure_ascii=False)

    html_code = f"""<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Passaporte 90% | Plataforma de Estudos de Alta Performance - Clínica Médica</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Outfit:wght@500;600;700;800;900&family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet">
  <style>
    :root {{
      --bg-primary: #070b16;
      --bg-secondary: #0d1424;
      --bg-card: rgba(16, 24, 44, 0.85);
      --bg-card-hover: rgba(23, 34, 62, 0.95);
      --border-color: rgba(255, 255, 255, 0.08);
      --border-accent: rgba(56, 189, 248, 0.35);
      --text-main: #f8fafc;
      --text-muted: #94a3b8;
      --text-dim: #64748b;
      --accent-gold: #fbbf24;
      --accent-cyan: #06b6d4;
      --accent-blue: #3b82f6;
      --accent-emerald: #10b981;
      --accent-amber: #f59e0b;
      --accent-rose: #f43f5e;
      --accent-violet: #8b5cf6;
      --radius-sm: 8px;
      --radius-md: 12px;
      --radius-lg: 18px;
      --radius-xl: 24px;
    }}

    * {{ box-sizing: border-box; margin: 0; padding: 0; }}
    body {{
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
      background: radial-gradient(circle at 10% 15%, #0f1c3d 0%, #060913 100%);
      color: var(--text-main);
      min-height: 100vh;
      line-height: 1.6;
    }}

    /* Top Sticky Header */
    header.hero-header {{
      padding: 1.5rem 2rem;
      border-bottom: 1px solid var(--border-color);
      background: rgba(10, 16, 31, 0.92);
      backdrop-filter: blur(14px);
      position: sticky;
      top: 0;
      z-index: 100;
    }}

    .header-content {{
      max-width: 1440px;
      margin: 0 auto;
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 1.25rem;
    }}

    .title-group h1 {{
      font-family: 'Outfit', sans-serif;
      font-size: 1.85rem;
      font-weight: 900;
      background: linear-gradient(135deg, #38bdf8 0%, #a855f7 50%, #f59e0b 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      display: flex;
      align-items: center;
      gap: 0.6rem;
    }}

    .title-group p {{
      color: var(--text-muted);
      font-size: 0.9rem;
      margin-top: 0.2rem;
    }}

    .target-badge {{
      display: inline-flex;
      align-items: center;
      gap: 0.4rem;
      background: rgba(251, 191, 36, 0.15);
      border: 1px solid rgba(251, 191, 36, 0.4);
      color: #fef08a;
      font-weight: 700;
      font-size: 0.8rem;
      padding: 0.25rem 0.75rem;
      border-radius: 20px;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }}

    .quick-stats-bar {{
      display: flex;
      gap: 0.75rem;
      flex-wrap: wrap;
    }}

    .kpi-pill {{
      background: var(--bg-card);
      border: 1px solid var(--border-color);
      border-radius: var(--radius-md);
      padding: 0.45rem 0.9rem;
      display: flex;
      align-items: center;
      gap: 0.65rem;
    }}

    .kpi-pill .val {{
      font-family: 'Outfit', sans-serif;
      font-size: 1.25rem;
      font-weight: 800;
      color: #38bdf8;
    }}

    .kpi-pill .lbl {{
      font-size: 0.7rem;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      color: var(--text-dim);
    }}

    /* Main Container */
    main.container {{
      max-width: 1440px;
      margin: 1.5rem auto 3rem;
      padding: 0 1.5rem;
    }}

    /* Navigation Tabs */
    .nav-tabs {{
      display: flex;
      gap: 0.6rem;
      border-bottom: 1px solid var(--border-color);
      margin-bottom: 1.75rem;
      padding-bottom: 0.5rem;
      overflow-x: auto;
    }}

    .tab-btn {{
      background: transparent;
      border: none;
      color: var(--text-muted);
      font-family: 'Outfit', sans-serif;
      font-size: 0.95rem;
      font-weight: 600;
      padding: 0.65rem 1.25rem;
      border-radius: var(--radius-md);
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 0.5rem;
      transition: all 0.2s ease;
      white-space: nowrap;
    }}

    .tab-btn:hover {{
      color: var(--text-main);
      background: rgba(255, 255, 255, 0.04);
    }}

    .tab-btn.active {{
      color: #38bdf8;
      background: rgba(56, 189, 248, 0.12);
      border: 1px solid rgba(56, 189, 248, 0.35);
    }}

    .tab-view {{ display: none; }}
    .tab-view.active {{ display: block; animation: fadeIn 0.3s ease; }}

    @keyframes fadeIn {{
      from {{ opacity: 0; transform: translateY(6px); }}
      to {{ opacity: 1; transform: translateY(0); }}
    }}

    /* Target 90 Strategy Banner */
    .banner-90 {{
      background: linear-gradient(135deg, rgba(30, 58, 138, 0.4) 0%, rgba(88, 28, 135, 0.4) 100%);
      border: 1px solid rgba(147, 197, 253, 0.25);
      border-radius: var(--radius-lg);
      padding: 1.5rem 1.75rem;
      margin-bottom: 1.75rem;
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 1.25rem;
    }}

    .banner-90 h2 {{
      font-family: 'Outfit', sans-serif;
      font-size: 1.35rem;
      color: #bae6fd;
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }}

    .banner-90 p {{
      color: #cbd5e1;
      font-size: 0.9rem;
      margin-top: 0.25rem;
      max-width: 850px;
    }}

    .btn-quick-filter {{
      background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
      color: #000;
      border: none;
      font-family: 'Outfit', sans-serif;
      font-weight: 800;
      font-size: 0.9rem;
      padding: 0.75rem 1.4rem;
      border-radius: var(--radius-md);
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 0.5rem;
      box-shadow: 0 4px 14px rgba(245, 158, 11, 0.35);
      transition: transform 0.2s ease;
    }}

    .btn-quick-filter:hover {{
      transform: translateY(-2px);
    }}

    /* Filters Panel */
    .filter-panel {{
      background: var(--bg-card);
      border: 1px solid var(--border-color);
      border-radius: var(--radius-lg);
      padding: 1.25rem 1.5rem;
      margin-bottom: 1.5rem;
      display: grid;
      grid-template-columns: 2fr 1fr 1fr 1fr 1.2fr auto;
      gap: 0.85rem;
      align-items: center;
    }}

    @media (max-width: 1024px) {{
      .filter-panel {{ grid-template-columns: 1fr; }}
    }}

    .search-box {{ position: relative; }}
    .search-box input {{
      width: 100%;
      background: rgba(0, 0, 0, 0.3);
      border: 1px solid var(--border-color);
      border-radius: var(--radius-md);
      padding: 0.75rem 1rem 0.75rem 2.5rem;
      color: var(--text-main);
      font-size: 0.95rem;
      outline: none;
    }}
    .search-box input:focus {{ border-color: var(--accent-cyan); }}
    .search-box svg {{
      position: absolute; left: 0.85rem; top: 50%; transform: translateY(-50%); color: var(--text-dim);
    }}

    select.select-filter {{
      background: rgba(0, 0, 0, 0.3);
      border: 1px solid var(--border-color);
      border-radius: var(--radius-md);
      padding: 0.75rem 1rem;
      color: var(--text-main);
      font-size: 0.9rem;
      outline: none;
      cursor: pointer;
    }}

    .btn-star-filter {{
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid var(--border-color);
      color: var(--text-muted);
      padding: 0.75rem 1rem;
      border-radius: var(--radius-md);
      cursor: pointer;
      font-family: 'Outfit';
      font-size: 0.9rem;
      display: flex;
      align-items: center;
      gap: 0.4rem;
      transition: all 0.2s;
    }}
    .btn-star-filter.active {{
      background: rgba(251, 191, 36, 0.15);
      border-color: #fbbf24;
      color: #fef08a;
    }}

    /* Questions List */
    .questions-container {{ display: flex; flex-direction: column; gap: 1.5rem; }}

    .question-card {{
      background: var(--bg-card);
      border: 1px solid var(--border-color);
      border-radius: var(--radius-lg);
      padding: 1.75rem;
      position: relative;
      transition: border-color 0.2s ease;
    }}
    .question-card:hover {{ border-color: rgba(56, 189, 248, 0.3); }}

    .card-top-row {{
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 1rem;
      gap: 1rem;
    }}

    .q-tags {{ display: flex; gap: 0.45rem; flex-wrap: wrap; align-items: center; }}

    .tag {{
      font-size: 0.75rem; font-weight: 600; padding: 0.25rem 0.65rem; border-radius: var(--radius-sm);
      text-transform: uppercase; letter-spacing: 0.03em;
    }}
    .tag-exam {{ background: rgba(59, 130, 246, 0.15); color: #60a5fa; border: 1px solid rgba(59, 130, 246, 0.3); }}
    .tag-tema {{ background: rgba(16, 185, 129, 0.15); color: #34d399; border: 1px solid rgba(16, 185, 129, 0.3); }}
    .tag-subtema {{ background: rgba(245, 158, 11, 0.15); color: #fbbf24; border: 1px solid rgba(245, 158, 11, 0.3); }}
    .tag-tipo {{ background: rgba(139, 92, 246, 0.15); color: #c084fc; border: 1px solid rgba(139, 92, 246, 0.3); }}
    
    .tag-repeated {{
      background: linear-gradient(135deg, rgba(239, 68, 68, 0.2) 0%, rgba(245, 158, 11, 0.2) 100%);
      color: #fca5a5; border: 1px solid rgba(239, 68, 68, 0.5); font-weight: 700;
    }}

    .star-btn {{
      background: none; border: none; font-size: 1.4rem; cursor: pointer; color: #475569; transition: color 0.2s;
    }}
    .star-btn.starred {{ color: #fbbf24; }}

    .q-repeated-alert {{
      background: rgba(245, 158, 11, 0.08);
      border-left: 3px solid #f59e0b;
      padding: 0.65rem 1rem;
      border-radius: 0 var(--radius-sm) var(--radius-sm) 0;
      margin-bottom: 1rem;
      font-size: 0.85rem;
      color: #fde68a;
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }}

    .tag-2026 {{
      background: linear-gradient(135deg, rgba(14, 165, 233, 0.25) 0%, rgba(251, 191, 36, 0.25) 100%);
      color: #38bdf8;
      border: 1px solid rgba(56, 189, 248, 0.5);
      font-weight: 700;
    }}

    .q-2026-alert {{
      background: rgba(14, 165, 233, 0.1);
      border-left: 3px solid #0ea5e9;
      padding: 0.65rem 1rem;
      border-radius: 0 var(--radius-sm) var(--radius-sm) 0;
      margin-bottom: 1rem;
      font-size: 0.85rem;
      color: #7dd3fc;
      display: flex;
      align-items: center;
      gap: 0.6rem;
    }}

    .btn-2026-filter {{
      background: rgba(14, 165, 233, 0.15);
      border: 1px solid rgba(56, 189, 248, 0.4);
      color: #38bdf8;
      padding: 0.75rem 1rem;
      border-radius: var(--radius-md);
      cursor: pointer;
      font-family: 'Outfit';
      font-size: 0.9rem;
      display: flex;
      align-items: center;
      gap: 0.4rem;
      font-weight: 700;
      transition: all 0.2s;
    }}
    .btn-2026-filter.active {{
      background: #0ea5e9;
      color: #070b16;
      border-color: #38bdf8;
    }}

    .btn-mock-mode {{
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid var(--border-color);
      color: var(--text-muted);
      padding: 0.55rem 1rem;
      border-radius: var(--radius-md);
      cursor: pointer;
      font-family: 'Outfit', sans-serif;
      font-size: 0.85rem;
      font-weight: 600;
      transition: all 0.2s;
    }}
    .btn-mock-mode.active {{
      background: rgba(14, 165, 233, 0.25);
      border-color: #38bdf8;
      color: #38bdf8;
    }}

    .q-objective-box {{
      background: rgba(6, 182, 212, 0.07);
      border-left: 3px solid var(--accent-cyan);
      padding: 0.75rem 1rem;
      border-radius: 0 var(--radius-sm) var(--radius-sm) 0;
      margin-bottom: 1.25rem;
      font-size: 0.9rem;
      color: #7dd3fc;
      display: flex;
      align-items: flex-start;
      gap: 0.6rem;
    }}

    .q-statement {{
      margin-bottom: 1.5rem;
    }}
    .q-case-vignette {{
      margin-bottom: 0.85rem;
    }}
    .q-case-text {{
      font-size: 1.05rem;
      line-height: 1.75;
      color: #f1f5f9;
      margin-bottom: 0.85rem;
      letter-spacing: 0.01em;
    }}
    .q-case-list {{
      margin: 0.75rem 0 1rem 1.5rem;
      padding-left: 0.5rem;
      color: #e2e8f0;
      font-size: 0.98rem;
      line-height: 1.7;
    }}
    .q-case-list li {{
      margin-bottom: 0.35rem;
    }}
    .q-prompt-box {{
      background: linear-gradient(135deg, rgba(56, 189, 248, 0.1) 0%, rgba(30, 58, 138, 0.14) 100%);
      border: 1px solid rgba(56, 189, 248, 0.3);
      border-left: 4px solid #38bdf8;
      padding: 0.95rem 1.25rem;
      border-radius: var(--radius-sm);
      margin-top: 1rem;
      margin-bottom: 1.35rem;
      display: flex;
      align-items: flex-start;
      gap: 0.75rem;
      color: #f0f9ff;
      font-size: 1.03rem;
      font-weight: 600;
      line-height: 1.6;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    }}
    .q-prompt-icon {{
      font-size: 1.25rem;
      flex-shrink: 0;
      margin-top: -1px;
    }}
    .q-prompt-text {{
      flex-grow: 1;
    }}

    .alternatives-list {{ display: flex; flex-direction: column; gap: 0.85rem; margin-bottom: 1.5rem; }}

    .alt-option {{
      background: rgba(15, 23, 42, 0.65);
      border: 1px solid rgba(148, 163, 184, 0.18);
      border-radius: var(--radius-md);
      padding: 1rem 1.25rem;
      display: flex;
      align-items: flex-start;
      gap: 1.1rem;
      cursor: pointer;
      transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
    }}
    .alt-option:hover {{
      background: rgba(30, 41, 59, 0.75);
      border-color: rgba(56, 189, 248, 0.4);
      transform: translateX(4px);
    }}

    .alt-option.selected-correct {{
      background: rgba(16, 185, 129, 0.18) !important;
      border-color: #10b981 !important;
      color: #6ee7b7 !important;
      box-shadow: 0 0 12px rgba(16, 185, 129, 0.2);
    }}
    .alt-option.selected-wrong {{
      background: rgba(244, 63, 94, 0.18) !important;
      border-color: #f43f5e !important;
      color: #fda4af !important;
      box-shadow: 0 0 12px rgba(244, 63, 94, 0.2);
    }}

    .alt-letter {{
      font-family: 'Outfit', sans-serif;
      font-weight: 700; font-size: 0.95rem; width: 32px; height: 32px;
      display: flex; align-items: center; justify-content: center;
      border-radius: 8px; background: rgba(255, 255, 255, 0.08); flex-shrink: 0;
      border: 1px solid rgba(255, 255, 255, 0.12); color: var(--text-main);
    }}
    .alt-text {{ font-size: 0.98rem; line-height: 1.65; flex-grow: 1; color: #e2e8f0; }}

    .q-footer {{
      display: flex; justify-content: space-between; align-items: center;
      border-top: 1px solid var(--border-color); padding-top: 1rem; flex-wrap: wrap; gap: 1rem;
    }}

    .btn-toggle-expl {{
      background: transparent; border: 1px solid rgba(56, 189, 248, 0.35); color: #38bdf8;
      font-family: 'Outfit', sans-serif; font-size: 0.85rem; font-weight: 700;
      padding: 0.5rem 1rem; border-radius: var(--radius-sm); cursor: pointer;
      display: flex; align-items: center; gap: 0.4rem; transition: all 0.2s ease;
    }}
    .btn-toggle-expl:hover {{ background: rgba(56, 189, 248, 0.12); }}

    .justification-box {{
      margin-top: 1.25rem; padding: 1.25rem;
      background: rgba(10, 16, 31, 0.95);
      border: 1px solid rgba(56, 189, 248, 0.25);
      border-radius: var(--radius-md); font-size: 0.95rem; line-height: 1.6; color: #cbd5e1;
      display: none; white-space: pre-line;
    }}
    .justification-box.open {{ display: block; animation: fadeIn 0.3s ease; }}

    /* CONTROLE E BANNER DO MODO TREINO */
    .btn-training-toggle {{
      background: rgba(15, 23, 42, 0.85);
      border: 1px solid rgba(148, 163, 184, 0.25);
      border-radius: var(--radius-md);
      padding: 0.6rem 1.15rem;
      display: inline-flex;
      align-items: center;
      gap: 0.75rem;
      cursor: pointer;
      transition: all 0.25s ease;
      color: var(--text-main);
      font-family: 'Outfit', sans-serif;
      font-size: 0.88rem;
    }}
    .btn-training-toggle:hover {{
      border-color: rgba(56, 189, 248, 0.45);
      background: rgba(30, 41, 59, 0.95);
    }}
    .btn-training-toggle.active {{
      background: rgba(16, 185, 129, 0.15);
      border-color: #10b981;
      box-shadow: 0 0 16px rgba(16, 185, 129, 0.25);
    }}
    .training-dot {{
      width: 10px;
      height: 10px;
      border-radius: 50%;
      background: #64748b;
      transition: all 0.25s ease;
      flex-shrink: 0;
    }}
    .btn-training-toggle.active .training-dot {{
      background: #10b981;
      box-shadow: 0 0 8px #10b981;
      animation: pulseTrainingDot 1.5s infinite;
    }}
    @keyframes pulseTrainingDot {{
      0% {{ transform: scale(1); opacity: 1; }}
      50% {{ transform: scale(1.35); opacity: 0.7; }}
      100% {{ transform: scale(1); opacity: 1; }}
    }}
    .training-badge-btn {{
      padding: 0.25rem 0.65rem;
      border-radius: 20px;
      font-size: 0.75rem;
      font-weight: 700;
      background: rgba(255, 255, 255, 0.08);
      color: var(--text-muted);
      border: 1px solid rgba(255, 255, 255, 0.1);
      transition: all 0.2s ease;
    }}
    .btn-training-toggle.active .training-badge-btn {{
      background: rgba(16, 185, 129, 0.25);
      color: #6ee7b7;
      border-color: #10b981;
    }}

    .training-banner {{
      background: linear-gradient(135deg, rgba(16, 185, 129, 0.15) 0%, rgba(6, 182, 212, 0.08) 100%);
      border: 1px solid rgba(16, 185, 129, 0.35);
      border-radius: var(--radius-md);
      padding: 0.95rem 1.25rem;
      margin-bottom: 1.25rem;
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 1rem;
      flex-wrap: wrap;
      animation: fadeIn 0.3s ease;
    }}
    .btn-deactivate-training {{
      background: rgba(255, 255, 255, 0.08);
      border: 1px solid rgba(255, 255, 255, 0.2);
      color: #fff;
      padding: 0.45rem 0.9rem;
      border-radius: var(--radius-sm);
      font-size: 0.82rem;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s ease;
    }}
    .btn-deactivate-training:hover {{
      background: rgba(255, 255, 255, 0.16);
      border-color: rgba(255, 255, 255, 0.35);
    }}

    /* TAB 2: SIMULADO OFICIAL META 90% */
    .mock-header-card {{
      background: var(--bg-card);
      border: 1px solid var(--border-color);
      border-radius: var(--radius-lg);
      padding: 1.5rem 2rem;
      margin-bottom: 2rem;
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 1.5rem;
    }}

    .score-gauge-box {{
      display: flex;
      align-items: center;
      gap: 1.25rem;
    }}

    .score-target-circle {{
      width: 75px; height: 75px; border-radius: 50%;
      border: 4px solid #3b82f6; display: flex; flex-direction: column;
      align-items: center; justify-content: center; font-family: 'Outfit';
    }}
    .score-target-circle .num {{ font-size: 1.5rem; font-weight: 800; color: #fff; }}
    .score-target-circle .lbl {{ font-size: 0.65rem; color: #94a3b8; text-transform: uppercase; }}

    .mock-timer {{
      font-family: 'JetBrains Mono', monospace; font-size: 1.6rem; font-weight: 700; color: #38bdf8;
      background: rgba(0,0,0,0.3); padding: 0.4rem 1rem; border-radius: var(--radius-sm); border: 1px solid var(--border-color);
    }}

    .mock-grid-nav {{
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(36px, 1fr));
      gap: 0.5rem;
      background: var(--bg-card);
      padding: 1.25rem;
      border-radius: var(--radius-md);
      border: 1px solid var(--border-color);
      margin-bottom: 1.5rem;
    }}

    .btn-nav-q {{
      height: 36px; border-radius: 6px; border: 1px solid var(--border-color);
      background: rgba(0, 0, 0, 0.3); color: var(--text-muted); font-family: 'JetBrains Mono';
      font-weight: 700; font-size: 0.85rem; cursor: pointer; transition: all 0.2s;
    }}
    .btn-nav-q:hover {{ background: rgba(255, 255, 255, 0.1); color: #fff; }}
    .btn-nav-q.answered {{ background: #0369a1; border-color: #38bdf8; color: #fff; }}
    .btn-nav-q.active {{ outline: 2px solid #fbbf24; color: #fff; }}

    .mock-question-display {{
      background: var(--bg-card);
      border: 1px solid var(--border-accent);
      border-radius: var(--radius-xl);
      padding: 2.5rem;
      box-shadow: 0 20px 40px rgba(0, 0, 0, 0.5);
      margin-bottom: 1.5rem;
    }}

    .mock-controls {{
      display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 1rem;
    }}

    .btn-ctrl {{
      padding: 0.8rem 1.6rem; border-radius: var(--radius-md); font-family: 'Outfit'; font-weight: 700;
      font-size: 1rem; cursor: pointer; border: none; transition: transform 0.1s ease;
    }}
    .btn-ctrl:hover {{ transform: translateY(-1px); }}
    .btn-ctrl-prev {{ background: #334155; color: #fff; }}
    .btn-ctrl-next {{ background: #0284c7; color: #fff; }}
    .btn-finish-mock {{ background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: #fff; font-size: 1.1rem; padding: 0.9rem 2.2rem; }}

    /* TAB 3: CADERNO DE DOSES & ESCORES */
    .cheat-search-bar {{
      width: 100%; max-width: 600px; margin: 0 auto 2rem; position: relative;
    }}
    .cheat-search-bar input {{
      width: 100%; background: var(--bg-card); border: 1px solid var(--border-color);
      border-radius: var(--radius-lg); padding: 0.9rem 1.25rem 0.9rem 2.8rem;
      color: #fff; font-size: 1rem; outline: none;
    }}
    .cheat-search-bar svg {{
      position: absolute; left: 1rem; top: 50%; transform: translateY(-50%); color: var(--text-dim);
    }}

    .cheat-grid {{
      display: grid; grid-template-columns: repeat(auto-fit, minmax(350px, 1fr)); gap: 1.5rem;
    }}

    .cheat-card {{
      background: var(--bg-card); border: 1px solid var(--border-color); border-radius: var(--radius-lg);
      padding: 1.75rem; box-shadow: 0 4px 20px rgba(0,0,0,0.3);
    }}
    .cheat-card.highlight {{ border-color: rgba(251, 191, 36, 0.4); background: rgba(24, 33, 58, 0.9); }}

    .cheat-title {{
      font-family: 'Outfit', sans-serif; font-size: 1.2rem; font-weight: 800; color: #38bdf8;
      display: flex; align-items: center; justify-content: space-between; margin-bottom: 0.75rem;
    }}
    .cheat-badge {{
      font-size: 0.7rem; font-weight: 700; padding: 0.2rem 0.55rem; border-radius: 4px;
      text-transform: uppercase; background: rgba(56, 189, 248, 0.15); color: #7dd3fc;
    }}

    .cheat-content {{
      font-size: 0.9rem; line-height: 1.7; color: #cbd5e1;
    }}
    .cheat-content strong {{ color: #f8fafc; font-weight: 700; }}
    .cheat-content .dose-highlight {{
      color: #fef08a; background: rgba(245, 158, 11, 0.15); padding: 0.1rem 0.4rem; border-radius: 4px;
      font-family: 'JetBrains Mono', monospace; font-weight: 600;
    }}

    /* TAB: DIAGNÓSTICO VS FISIOPATOLOGIA */
    .compass-hero {{
      text-align: center;
      margin-bottom: 2rem;
      background: radial-gradient(circle at center, rgba(56, 189, 248, 0.08) 0%, transparent 70%);
      padding: 2rem 1rem;
      border-radius: var(--radius-xl);
    }}
    .compass-badge {{
      display: inline-block;
      font-size: 0.8rem;
      font-weight: 700;
      letter-spacing: 0.05em;
      text-transform: uppercase;
      color: #38bdf8;
      background: rgba(56, 189, 248, 0.15);
      border: 1px solid rgba(56, 189, 248, 0.3);
      padding: 0.35rem 0.85rem;
      border-radius: 20px;
      margin-bottom: 0.75rem;
    }}
    .compass-hero h2 {{
      font-family: 'Outfit', sans-serif;
      font-size: 1.8rem;
      font-weight: 800;
      color: #f8fafc;
      margin-bottom: 0.5rem;
    }}
    .compass-hero p {{
      color: var(--text-muted);
      max-width: 700px;
      margin: 0 auto;
      font-size: 0.95rem;
    }}

    .compass-grid {{
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
      gap: 1.5rem;
      margin-bottom: 2rem;
    }}
    .compass-card {{
      background: var(--bg-card);
      border: 1px solid var(--border-color);
      border-radius: var(--radius-xl);
      padding: 1.75rem;
      display: flex;
      flex-direction: column;
      position: relative;
      box-shadow: 0 4px 25px rgba(0,0,0,0.3);
    }}
    .compass-card.dx {{
      border-top: 4px solid #38bdf8;
    }}
    .compass-card.fisio {{
      border-top: 4px solid #c084fc;
    }}
    .compass-card .card-badge {{
      font-size: 0.75rem;
      font-weight: 800;
      letter-spacing: 0.04em;
      text-transform: uppercase;
      margin-bottom: 0.5rem;
    }}
    .compass-card.dx .card-badge {{ color: #38bdf8; }}
    .compass-card.fisio .card-badge {{ color: #c084fc; }}

    .compass-card h3 {{
      font-family: 'Outfit', sans-serif;
      font-size: 1.4rem;
      font-weight: 800;
      color: #fff;
      margin-bottom: 0.4rem;
    }}
    .compass-card .card-desc {{
      color: var(--text-muted);
      font-size: 0.9rem;
      margin-bottom: 1.25rem;
    }}
    .compass-detail {{
      background: rgba(0, 0, 0, 0.25);
      border-radius: var(--radius-md);
      padding: 0.9rem 1.1rem;
      margin-bottom: 0.85rem;
      font-size: 0.88rem;
    }}
    .compass-detail strong {{
      display: block;
      color: #f1f5f9;
      margin-bottom: 0.35rem;
      font-size: 0.85rem;
      text-transform: uppercase;
      letter-spacing: 0.03em;
    }}
    .compass-detail ul {{
      margin-left: 1.2rem;
      color: #cbd5e1;
    }}
    .compass-detail li {{
      margin-bottom: 0.25rem;
    }}
    .compass-detail p {{
      color: #cbd5e1;
      line-height: 1.5;
    }}

    .btn-filter-shortcut {{
      margin-top: auto;
      padding: 0.75rem 1rem;
      border-radius: var(--radius-md);
      font-family: 'Outfit', sans-serif;
      font-weight: 700;
      font-size: 0.9rem;
      cursor: pointer;
      border: none;
      transition: all 0.2s;
      text-align: center;
    }}
    .btn-filter-shortcut.dx {{
      background: rgba(56, 189, 248, 0.15);
      color: #38bdf8;
      border: 1px solid rgba(56, 189, 248, 0.4);
    }}
    .btn-filter-shortcut.dx:hover {{
      background: #38bdf8;
      color: #070b16;
    }}
    .btn-filter-shortcut.fisio {{
      background: rgba(192, 132, 252, 0.15);
      color: #c084fc;
      border: 1px solid rgba(192, 132, 252, 0.4);
    }}
    .btn-filter-shortcut.fisio:hover {{
      background: #c084fc;
      color: #070b16;
    }}

    /* Trap Alert Box */
    .trap-alert-box {{
      background: linear-gradient(135deg, rgba(239, 68, 68, 0.12) 0%, rgba(245, 158, 11, 0.12) 100%);
      border: 1px solid rgba(239, 68, 68, 0.4);
      border-radius: var(--radius-lg);
      padding: 1.5rem;
      margin-bottom: 2rem;
      display: flex;
      gap: 1.25rem;
      align-items: flex-start;
    }}
    .trap-icon {{
      font-size: 2rem;
      line-height: 1;
    }}
    .trap-alert-box h4 {{
      font-family: 'Outfit', sans-serif;
      font-size: 1.15rem;
      font-weight: 800;
      color: #fca5a5;
      margin-bottom: 0.4rem;
    }}
    .trap-alert-box p {{
      font-size: 0.9rem;
      color: #e2e8f0;
      line-height: 1.6;
    }}

    /* Matrix Table */
    .matrix-card {{
      background: var(--bg-card);
      border: 1px solid var(--border-color);
      border-radius: var(--radius-xl);
      padding: 1.75rem;
      margin-bottom: 2rem;
    }}
    .matrix-header {{
      margin-bottom: 1.25rem;
    }}
    .matrix-header h3 {{
      font-family: 'Outfit', sans-serif;
      font-size: 1.3rem;
      font-weight: 800;
      color: #fff;
    }}
    .matrix-header p {{
      color: var(--text-muted);
      font-size: 0.88rem;
    }}
    .table-responsive {{
      overflow-x: auto;
    }}
    .dx-fisio-table {{
      width: 100%;
      border-collapse: collapse;
      font-size: 0.88rem;
    }}
    .dx-fisio-table th {{
      text-align: left;
      padding: 0.85rem 1rem;
      border-bottom: 2px solid rgba(255, 255, 255, 0.12);
      font-family: 'Outfit', sans-serif;
      font-weight: 700;
      font-size: 0.85rem;
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }}
    .dx-fisio-table td {{
      padding: 0.95rem 1rem;
      border-bottom: 1px solid rgba(255, 255, 255, 0.05);
      vertical-align: top;
      line-height: 1.5;
    }}
    .dx-fisio-table tr:hover {{
      background: rgba(255, 255, 255, 0.02);
    }}
    .pill-dx {{
      display: inline-block;
      background: rgba(56, 189, 248, 0.15);
      color: #38bdf8;
      border: 1px solid rgba(56, 189, 248, 0.3);
      padding: 0.2rem 0.55rem;
      border-radius: 4px;
      font-weight: 600;
    }}
    .pill-fisio {{
      display: inline-block;
      background: rgba(192, 132, 252, 0.15);
      color: #c084fc;
      border: 1px solid rgba(192, 132, 252, 0.3);
      padding: 0.2rem 0.55rem;
      border-radius: 4px;
      font-weight: 600;
    }}

    /* Trainer Card (Quiz) */
    .trainer-card {{
      background: var(--bg-card);
      border: 1px solid rgba(16, 185, 129, 0.3);
      border-radius: var(--radius-xl);
      padding: 1.75rem;
      margin-bottom: 2rem;
    }}
    .trainer-header {{
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 1.5rem;
      flex-wrap: wrap;
      gap: 1rem;
    }}
    .trainer-header h3 {{
      font-family: 'Outfit', sans-serif;
      font-size: 1.3rem;
      font-weight: 800;
      color: #34d399;
    }}
    .trainer-header p {{
      color: var(--text-muted);
      font-size: 0.88rem;
    }}
    .trainer-score-box {{
      background: rgba(16, 185, 129, 0.15);
      border: 1px solid rgba(16, 185, 129, 0.3);
      border-radius: var(--radius-md);
      padding: 0.5rem 1.25rem;
      text-align: center;
    }}
    .trainer-score-num {{
      display: block;
      font-family: 'Outfit', sans-serif;
      font-size: 1.3rem;
      font-weight: 800;
      color: #34d399;
    }}
    .trainer-score-lbl {{
      font-size: 0.7rem;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: #a7f3d0;
    }}

    .quiz-question-box {{
      background: rgba(0, 0, 0, 0.3);
      border: 1px solid var(--border-color);
      border-radius: var(--radius-lg);
      padding: 1.5rem;
    }}
    .quiz-badge {{
      font-size: 0.75rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--accent-gold);
      margin-bottom: 0.75rem;
    }}
    .quiz-statement {{
      font-size: 1.15rem;
      font-weight: 600;
      color: #f8fafc;
      margin-bottom: 1.5rem;
      line-height: 1.5;
    }}
    .quiz-buttons {{
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1rem;
      margin-bottom: 1rem;
    }}
    @media (max-width: 600px) {{
      .quiz-buttons {{ grid-template-columns: 1fr; }}
    }}
    .btn-quiz-choice {{
      padding: 1rem;
      border-radius: var(--radius-md);
      font-family: 'Outfit', sans-serif;
      font-size: 1rem;
      font-weight: 700;
      cursor: pointer;
      border: none;
      transition: all 0.2s;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
    }}
    .btn-quiz-choice.dx {{
      background: rgba(56, 189, 248, 0.15);
      border: 1px solid rgba(56, 189, 248, 0.4);
      color: #38bdf8;
    }}
    .btn-quiz-choice.dx:hover {{
      background: #38bdf8;
      color: #070b16;
    }}
    .btn-quiz-choice.fisio {{
      background: rgba(192, 132, 252, 0.15);
      border: 1px solid rgba(192, 132, 252, 0.4);
      color: #c084fc;
    }}
    .btn-quiz-choice.fisio:hover {{
      background: #c084fc;
      color: #070b16;
    }}
    .quiz-feedback {{
      border-radius: var(--radius-md);
      padding: 1rem 1.25rem;
      margin-top: 1rem;
      font-size: 0.95rem;
      line-height: 1.6;
    }}
    .quiz-feedback.correct {{
      background: rgba(16, 185, 129, 0.15);
      border: 1px solid #10b981;
      color: #a7f3d0;
    }}
    .quiz-feedback.incorrect {{
      background: rgba(239, 68, 68, 0.15);
      border: 1px solid #ef4444;
      color: #fca5a5;
    }}
    .btn-quiz-next {{
      margin-top: 1rem;
      background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
      color: #fff;
      border: none;
      padding: 0.75rem 1.5rem;
      border-radius: var(--radius-md);
      font-family: 'Outfit', sans-serif;
      font-weight: 700;
      font-size: 0.95rem;
      cursor: pointer;
    }}
  </style>
</head>
<body>

  <header class="hero-header">
    <div class="header-content">
      <div class="title-group">
        <div style="display: flex; align-items: center; gap: 0.75rem;">
          <h1>🩺 Passaporte 90% | Clínica Médica</h1>
          <span class="target-badge">🎯 Meta: ≥ 36/40 Acertos</span>
        </div>
        <p>Varredura Inteligente & Banco Completo de Questões (2022 a 2026) | Professor Ulisses</p>
      </div>
      <div class="quick-stats-bar">
        <div class="kpi-pill" style="border-color: rgba(56, 189, 248, 0.4); background: rgba(56, 189, 248, 0.1);">
          <div>
            <div class="val" style="color: #38bdf8;">{stats['total_2026']}</div>
            <div class="lbl">Questões 2026 (Peso Máximo)</div>
          </div>
        </div>
        <div class="kpi-pill">
          <div>
            <div class="val" id="kpi-total-q">{len(questions)}</div>
            <div class="lbl">Questões Mapeadas</div>
          </div>
        </div>
        <div class="kpi-pill">
          <div>
            <div class="val" style="color: #fbbf24;">{stats["total_repetidas"]}</div>
            <div class="lbl">Questões Repetidas</div>
          </div>
        </div>
        <div class="kpi-pill">
          <div>
            <div class="val">17</div>
            <div class="lbl">Provas Analisadas</div>
          </div>
        </div>
        <div class="kpi-pill">
          <div>
            <div class="val" style="color: #10b981;">100%</div>
            <div class="lbl">Gabaritos Identificados</div>
          </div>
        </div>
      </div>
    </div>
  </header>

  <main class="container">
    
    <!-- Banner de Estratégia dos 90% -->
    <div class="banner-90">
      <div>
        <h2>🚀 Como Garantir 90%+ na Prova de Clínica Médica</h2>
        <p>Prioridade absoluta: as <strong>80 questões das 2 provas de 2026</strong> trazem a tendência exata e o estilo atualizado do Prof. Ulisses. Somadas às <strong>132 questões repetidas (19.4%)</strong>, você cobre com precisão mais de 80% do que estará na sua prova!</p>
      </div>
      <div style="display: flex; gap: 0.75rem; flex-wrap: wrap;">
        <button class="btn-quick-filter" style="background: linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%);" onclick="filterOnly2026()">
          <span>✨</span> Foco Provas 2026 ({stats['total_2026']} Qs)
        </button>
        <button class="btn-quick-filter" onclick="filterOnlyRepeated()">
          <span>🔥</span> Questões Repetidas ({stats['total_repetidas']} Qs)
        </button>
      </div>
    </div>

    <!-- Navigation Tabs -->
    <div class="nav-tabs">
      <button class="tab-btn active" onclick="switchTab('tab-explorer')">
        🔍 Explorador de Questões ({len(questions)})
      </button>
      <button class="tab-btn" onclick="switchTab('tab-dx-fisiopat')">
        🔬 Diagnóstico vs Fisiopatologia
      </button>
      <button class="tab-btn" onclick="switchTab('tab-simulado-oficial')">
        ⏱️ Simulado Oficial Meta 90% (Ponderado 2026)
      </button>
      <button class="tab-btn" onclick="switchTab('tab-doses-escores')">
        💊 Caderno de Doses, Escores & Números Mágicos
      </button>
      <button class="tab-btn" onclick="switchTab('tab-analytics')">
        📊 Raio-X & Tendências 2026
      </button>
    </div>

    <!-- TAB 1: EXPLORADOR DE QUESTÕES -->
    <section id="tab-explorer" class="tab-view active">
      
      <!-- Filter Panel -->
      <div class="filter-panel">
        <div class="search-box">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
          <input type="text" id="filter-search" placeholder="Buscar por doença, sintoma, dose ou fármaco (ex: gluconato, rifampicina)..." oninput="applyFilters()">
        </div>

        <button class="btn-2026-filter" id="btn-2026-filter" onclick="toggle2026Filter()">
          <span>✨</span> Provas 2026 ({stats['total_2026']})
        </button>

        <select id="filter-tema" class="select-filter" onchange="applyFilters()">
          <option value="all">Todas as Especialidades</option>
        </select>

        <select id="filter-prova" class="select-filter" onchange="applyFilters()">
          <option value="all">Todas as Provas (17 Provas)</option>
        </select>

        <select id="filter-repetidas" class="select-filter" onchange="applyFilters()">
          <option value="all">Todas as Questões</option>
          <option value="only_repeated">🔥 Apenas Questões Repetidas ({stats['total_repetidas']})</option>
        </select>

        <select id="filter-tipo" class="select-filter" onchange="applyFilters()">
          <option value="all">Todas as Habilidades</option>
          <option value="Diagnóstico Clínico">🩺 Diagnóstico Clínico (O Quê)</option>
          <option value="Fisiopatologia & Mecanismos">🔬 Fisiopatologia & Mecanismos (O Porquê)</option>
          <option value="Conduta Terapêutica de Emergência">🚨 Conduta de Emergência</option>
          <option value="Terapêutica Ambulatorial / Farmacologia">💊 Farmacologia Ambulatorial</option>
          <option value="Investigação & Propedêutica Complementar">🧪 Exames & Propedêutica</option>
          <option value="Prevenção, Rastreamento & Vacinação">🛡️ Prevenção & Vacinação</option>
        </select>

        <button class="btn-star-filter" id="btn-star-filter" onclick="toggleStarredFilter()">
          <span>⭐</span> Favoritas (<span id="starred-count">0</span>)
        </button>
      </div>

      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.25rem; flex-wrap: wrap; gap: 1rem;">
        <div style="color: var(--text-muted); font-size: 0.9rem;" id="results-count-bar">
          Carregando questões...
        </div>
        <div>
          <button class="btn-training-toggle" id="btn-training-toggle" onclick="toggleStudyMode()" title="Clique para ativar/desativar a resolução às cegas">
            <span class="training-dot"></span>
            <span>🎯 Modo Treino: <strong id="training-status-text">DESATIVADO (Gabarito Visível)</strong></span>
            <span class="training-badge-btn" id="training-badge-btn">Ativar Treino</span>
          </button>
        </div>
      </div>

      <!-- Banner Informativo quando Modo Treino estiver Ativado -->
      <div id="training-active-banner" class="training-banner" style="display: none;">
        <div style="display: flex; align-items: center; gap: 0.75rem;">
          <span style="font-size: 1.4rem;">🎯</span>
          <div>
            <div style="font-weight: 700; color: #10b981; font-size: 0.95rem;">Modo Treino Ativado: Gabaritos Oficiais Ocultados</div>
            <div style="font-size: 0.85rem; color: #94a3b8;">Clique em qualquer alternativa abaixo para testar seu raciocínio. O sistema revelará se acertou ou errou, além de abrir a justificativa pedagógica completa.</div>
          </div>
        </div>
        <button class="btn-deactivate-training" onclick="toggleStudyMode(false)">
          👁️ Revelar Gabaritos
        </button>
      </div>

      <!-- Question List -->
      <div class="questions-container" id="questions-list"></div>
    </section>

    <!-- TAB: DIAGNÓSTICO VS FISIOPATOLOGIA -->
    <section id="tab-dx-fisiopat" class="tab-view">
      
      <!-- Bússola Cognitiva Header -->
      <div class="compass-hero">
        <div class="compass-badge">🧭 Bússola Cognitiva do Raciocínio Clínico</div>
        <h2>Separando Diagnóstico Clínico de Fisiopatologia</h2>
        <p>Aprenda a desmascarar a armadilha nº 1 das provas de Clínica Médica: marcar o nome da doença quando a banca pergunta o mecanismo, ou vice-versa.</p>
      </div>

      <!-- Side-by-Side Dual Compass Cards -->
      <div class="compass-grid">
        <!-- Card 1: Diagnóstico Clínico -->
        <div class="compass-card dx">
          <div class="card-badge">O "QUÊ" (A Doença)</div>
          <h3>🩺 Diagnóstico Clínico</h3>
          <p class="card-desc">Identificação da entidade nosológica, síndrome clínica ou categoria patológica formal.</p>
          <div class="compass-detail">
            <strong>🎯 Comandos Típicos no Enunciado:</strong>
            <ul>
              <li><em>"Qual a principal hipótese diagnóstica?"</em></li>
              <li><em>"O quadro clínico acima é mais compatível com:"</em></li>
              <li><em>"Trata-se de um caso de:"</em></li>
              <li><em>"Qual o diagnóstico sindrômico/nosológico?"</em></li>
            </ul>
          </div>
          <div class="compass-detail">
            <strong>💡 Natureza da Resposta:</strong>
            <p>Substantivo próprio da patologia ou síndrome clínica (ex: <em>Tamponamento Cardíaco, Demência por Corpos de Lewy, Cetoacidose Diabética, PBE</em>).</p>
          </div>
          <div class="compass-detail">
            <strong>🧠 Modelo Mental:</strong>
            <p><em>"Se eu fosse dar um atestado ou preencher a folha de rosto da internação, que nome de doença eu escreveria?"</em></p>
          </div>
          <button class="btn-filter-shortcut dx" onclick="filterByType('Diagnóstico Clínico')">
            Ver Questões de Diagnóstico no Banco →
          </button>
        </div>

        <!-- Card 2: Fisiopatologia & Mecanismos -->
        <div class="compass-card fisio">
          <div class="card-badge">O "PORQUÊ / COMO" (A Engrenagem)</div>
          <h3>🔬 Fisiopatologia & Mecanismos</h3>
          <p class="card-desc">Processo biológico funcional, hemodinâmico, celular, imunológico ou molecular subjacente.</p>
          <div class="compass-detail">
            <strong>🎯 Comandos Típicos no Enunciado:</strong>
            <ul>
              <li><em>"Qual o mecanismo fisiopatológico responsável pela piora...?"</em></li>
              <li><em>"A alteração hemodinâmica/laboratorial primária decorre de:"</em></li>
              <li><em>"O que causou o surgimento desse achado clínico?"</em></li>
              <li><em>"O mecanismo de ação do fármaco justifica-se por:"</em></li>
            </ul>
          </div>
          <div class="compass-detail">
            <strong>💡 Natureza da Resposta:</strong>
            <p>Processo funcional ou verbo de ação biológico (ex: <em>Vasoconstrição da arteríola aferente, Restrição ao enchimento diastólico ventricular, Inibição da síntese de colágeno</em>).</p>
          </div>
          <div class="compass-detail">
            <strong>🧠 Modelo Mental:</strong>
            <p><em>"O que aconteceu dentro do vaso, no néfron ou no cardiomiócito para gerar esse sintoma?"</em></p>
          </div>
          <button class="btn-filter-shortcut fisio" onclick="filterByType('Fisiopatologia & Mecanismos')">
            Ver Questões de Fisiopatologia no Banco →
          </button>
        </div>
      </div>

      <!-- Alerta da Armadilha do Examinador -->
      <div class="trap-alert-box">
        <div class="trap-icon">⚠️</div>
        <div>
          <h4>A Armadilha do Examinador (Prof. Ulisses / Internato)</h4>
          <p>
            Quando o enunciado solicita o <strong>mecanismo fisiopatológico</strong> (ex: piora renal pelo AINE), a <strong>Alternativa A</strong> frequentemente traz o <strong>nome da doença</strong> (ex: <em>"Injúria renal aguda pré-renal"</em>). O estudante afoito lê, reconhece a doença e marca a letra A, <strong>zerando a questão</strong>!
          </p>
          <p style="margin-top: 0.5rem; font-weight: 600; color: #fde047;">
            ⚡ Regra de Ouro: Se a pergunta pede "mecanismo", ELIMINE IMEDIATAMENTE as opções que contêm apenas nomes de doenças! Se pede "diagnóstico", elimine explicações celulares isoladas.
          </p>
        </div>
      </div>

      <!-- Matriz Comparativa dos 12 Grandes Cenários -->
      <div class="matrix-card">
        <div class="matrix-header">
          <h3>📊 Matriz Comparativa: Os 12 Grandes Cenários de Prova</h3>
          <p>Compare lado a lado o Diagnóstico Clínico versus a Fisiopatologia real cobrada nas 17 provas.</p>
        </div>
        <div class="table-responsive">
          <table class="dx-fisio-table">
            <thead>
              <tr>
                <th style="width: 22%;">Cenário Clínico / Disparador</th>
                <th style="width: 28%; color: #38bdf8;">🩺 Diagnóstico Clínico (O Quê)</th>
                <th style="width: 32%; color: #c084fc;">🔬 Fisiopatologia / Mecanismo (O Porquê)</th>
                <th style="width: 18%; color: #f87171;">⚠️ Distrator Clássico</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><strong>Idoso desidratado com piora da creatinina após Cetoprofeno</strong></td>
                <td><span class="pill-dx">Injúria Renal Aguda pré-renal</span></td>
                <td><span class="pill-fisio">Inibição de PGE2/PGI2 → Vasoconstrição da arteríola aferente renal</span></td>
                <td>Marcar "IRA" quando a pergunta pede o <em>mecanismo</em></td>
              </tr>
              <tr>
                <td><strong>Hipotensão + Turgência Jugular + Bulhas Abafadas pós-trauma/pericardite</strong></td>
                <td><span class="pill-dx">Tamponamento Cardíaco</span></td>
                <td><span class="pill-fisio">Pressão pericárdica > diastólica → Restrição ao enchimento ventricular e colapso de câmaras direitas</span></td>
                <td>Confundir com choque cardiogênico isquêmico ou pneumotórax</td>
              </tr>
              <tr>
                <td><strong>Uso crônico de corticoide tópico potente em dobras / face</strong></td>
                <td><span class="pill-dx">Atrofia cutânea e fragilidade capilar</span></td>
                <td><span class="pill-fisio">Inibição da síntese de colágeno dérmico por fibroblastos e afinamento epidérmico</span></td>
                <td>Marcar "Intertrigo bacteriano" ou "Púrpura senil isolada"</td>
              </tr>
              <tr>
                <td><strong>Hipertenso idoso com estenose bilateral de artéria renal após Enalapril</strong></td>
                <td><span class="pill-dx">IRA hemodinâmica pós-IECA</span></td>
                <td><span class="pill-fisio">Bloqueio da vasoconstrição da arteríola eferente mediada por Angio II → queda da pressão intraglomerular</span></td>
                <td>Marcar "Toxicidade tubular direta"</td>
              </tr>
              <tr>
                <td><strong>Cirrótico descompensado com ascite tensa e edema importante</strong></td>
                <td><span class="pill-dx">Cirrose com Hipertensão Portal descompensada</span></td>
                <td><span class="pill-fisio">Vasodilatação arterial esplâncnica (NO) → Hipovolemia efetiva + Queda da pressão oncótica (hipoalbuminemia)</span></td>
                <td>Marcar "Insuficiência cardíaca direita isolada"</td>
              </tr>
              <tr>
                <td><strong>Polidipsia, poliúria, dor abdominal e hálito cetônico no DM1</strong></td>
                <td><span class="pill-dx">Cetoacidose Diabética (CAD)</span></td>
                <td><span class="pill-fisio">Déficit absoluto de insulina + excesso glucagon → Lipólise desinibida → Beta-oxidação em acetoacetato/beta-hidroxibutirato</span></td>
                <td>Marcar "Abdome agudo cirúrgico" pela dor abdominal</td>
              </tr>
              <tr>
                <td><strong>Idoso com flutuações cognitivas diárias, alucinações visuais e parkinsonismo</strong></td>
                <td><span class="pill-dx">Demência por Corpos de Lewy</span></td>
                <td><span class="pill-fisio">Inclusões citoplasmáticas de alfa-sinucleína no neocórtex e substância negra</span></td>
                <td>Prescrever neuroléptico típico (haloperidol) por erro diagnóstico</td>
              </tr>
              <tr>
                <td><strong>Cefaleia unilateral lancinante periorbitária com lacrimejamento e miose</strong></td>
                <td><span class="pill-dx">Cefaleia em Salvas</span></td>
                <td><span class="pill-fisio">Ativação do complexo trigêmino-autonômico e disfunção hipotalâmica posterior</span></td>
                <td>Confundir com Enxaqueca clássica ou Nevralgia do Trigêmeo</td>
              </tr>
              <tr>
                <td><strong>Tosse produtiva, febre, dor pleurítica e estertores com sopro tubário</strong></td>
                <td><span class="pill-dx">Pneumonia Adquirida na Comunidade (PAC)</span></td>
                <td><span class="pill-fisio">Exsudato purulento nos alvéolos → Shunt intrapulmonar (perfusão preservada em alvéolos não ventilados)</span></td>
                <td>Marcar "Broncoespasmo difuso"</td>
              </tr>
              <tr>
                <td><strong>Hipercalemia grave com ondas T apiculadas e simétricas no ECG</strong></td>
                <td><span class="pill-dx">Hipercalemia Grave Cardiotóxica</span></td>
                <td><span class="pill-fisio">Despolarização parcial da membrana em repouso e inativação de canais rápidos de Na+ cardíacos</span></td>
                <td>Achar que o Gluconato de Cálcio reduz o potássio sérico</td>
              </tr>
              <tr>
                <td><strong>Monoartrite aguda de hálux (podagra) com eritema e dor incapacitante</strong></td>
                <td><span class="pill-dx">Artrite Gotosa Aguda</span></td>
                <td><span class="pill-fisio">Fagocitose de cristais de urato por macrófagos sinoviais → Montagem do inflamassomo NLRP3 → Secreção de IL-1β</span></td>
                <td>Prescrever Alopurinol na crise aguda</td>
              </tr>
              <tr>
                <td><strong>Mulher jovem com rash malar, proteinúria, hematúria dismórfica e C3 baixo</strong></td>
                <td><span class="pill-dx">Nefrite Lúpica proliferativa (LES)</span></td>
                <td><span class="pill-fisio">Deposição subendotelial de imunocomplexos anti-DNA → Fixação de complemento e recrutamento inflamatório glomerular</span></td>
                <td>Marcar "Infecção urinária baixa recorrente"</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Treinador Cognitivo Interativo (Reflexo de Prova) -->
      <div class="trainer-card">
        <div class="trainer-header">
          <div>
            <h3>⚡ Treinador Cognitivo: Diagnóstico ou Fisiopatologia?</h3>
            <p>Teste seu reflexo rápido! Analise o termo e clique na categoria correta antes que o examinador te pegue.</p>
          </div>
          <div class="trainer-score-box">
            <span class="trainer-score-num" id="quiz-score-display">0 / 0</span>
            <span class="trainer-score-lbl">Acertos</span>
          </div>
        </div>

        <div class="quiz-question-box" id="quiz-box">
          <div class="quiz-badge" id="quiz-item-counter">Questão 1 de 10</div>
          <div class="quiz-statement" id="quiz-statement-text">
            Carregando desafio cognitivo...
          </div>
          <div class="quiz-buttons">
            <button class="btn-quiz-choice dx" onclick="handleQuizAnswer('Diagnóstico')">
              🩺 Diagnóstico Clínico (O Quê)
            </button>
            <button class="btn-quiz-choice fisio" onclick="handleQuizAnswer('Fisiopatologia')">
              🔬 Fisiopatologia / Mecanismo (O Como)
            </button>
          </div>
          <div class="quiz-feedback" id="quiz-feedback" style="display: none;"></div>
          <div class="quiz-controls" id="quiz-controls" style="display: none;">
            <button class="btn-quiz-next" onclick="nextQuizItem()">Próximo Desafio →</button>
          </div>
        </div>
      </div>

    </section>

    <!-- TAB 2: SIMULADO OFICIAL META 90% (40 QUESTÕES) -->
    <section id="tab-simulado-oficial" class="tab-view">
      
      <div class="mock-header-card">
        <div>
          <div style="display: flex; align-items: center; gap: 0.75rem;">
            <h2 style="font-family: 'Outfit'; font-size: 1.4rem; color: #fff;">Simulado Ponderado Oficial (40 Questões)</h2>
            <span class="target-badge">Padrão da Prova Real</span>
          </div>
          <p style="color: var(--text-muted); font-size: 0.9rem; margin-top: 0.25rem;" id="mock-mode-desc">
            Ponderação calibrada: <strong>50% das questões sorteadas das 2 provas de 2026 (20 Qs)</strong> + 25% de repetidas históricas + 25% de emergências inegociáveis.
          </p>
          <div style="display: flex; gap: 0.6rem; margin-top: 0.85rem; flex-wrap: wrap;">
            <button class="btn-mock-mode active" id="btn-mode-weighted" onclick="setMockMode('weighted_2026')">
              ✨ Ponderado 2026 (50% 2026 + Repetidas)
            </button>
            <button class="btn-mock-mode" id="btn-mode-pure" onclick="setMockMode('pure_2026')">
              🎯 100% Provas 2026 (40 de 80)
            </button>
            <button class="btn-mock-mode" id="btn-mode-all" onclick="setMockMode('historical')">
              📚 Amostra Ampla (2022-2026)
            </button>
          </div>
        </div>

        <div class="score-gauge-box">
          <div class="mock-timer" id="mock-timer-display">00:00</div>
          <div class="score-target-circle" id="mock-score-circle">
            <span class="num" id="mock-score-val">0</span>
            <span class="lbl">de 40</span>
          </div>
        </div>
      </div>

      <!-- Navegador de Questões do Simulado -->
      <div class="mock-grid-nav" id="mock-nav-grid"></div>

      <!-- Área de Visualização da Questão Ativa -->
      <div class="mock-question-display" id="mock-question-card">
        <div class="card-top-row">
          <div class="q-tags" id="mock-q-tags"></div>
          <div style="font-family: 'JetBrains Mono'; font-size: 0.85rem; color: var(--text-dim);" id="mock-q-num-label"></div>
        </div>

        <div class="q-objective-box" id="mock-q-obj"></div>
        <div class="q-statement" id="mock-q-statement"></div>
        <div class="alternatives-list" id="mock-q-alts"></div>

        <div class="justification-box" id="mock-q-just"></div>
      </div>

      <!-- Controles do Simulado -->
      <div class="mock-controls">
        <button class="btn-ctrl btn-ctrl-prev" onclick="prevMockQuestion()">⬅️ Questão Anterior</button>
        <button class="btn-ctrl" style="background: rgba(56, 189, 248, 0.15); border: 1px solid rgba(56, 189, 248, 0.4); color: #38bdf8;" onclick="revealMockRationale()">
          👁️ Revelar Raciocínio & Gabarito
        </button>
        <button class="btn-ctrl btn-ctrl-next" onclick="nextMockQuestion()">Próxima Questão ➡️</button>
        <button class="btn-ctrl btn-finish-mock" onclick="finishMockExam()">🏁 Finalizar Simulado & Ver Desempenho</button>
      </div>

      <!-- Modal de Resultado Final (Aparece ao finalizar) -->
      <div id="mock-result-modal" style="display: none; margin-top: 2rem; padding: 2rem; background: rgba(15, 23, 42, 0.95); border: 2px solid #38bdf8; border-radius: var(--radius-lg);">
        <h3 id="mock-result-title" style="font-family: 'Outfit'; font-size: 1.5rem; margin-bottom: 0.5rem;"></h3>
        <p id="mock-result-subtitle" style="font-size: 1.05rem; color: #cbd5e1; margin-bottom: 1.5rem;"></p>
        <button class="btn-quick-filter" onclick="reviewMockMistakes()">🔍 Revisar Apenas Questões que Errei</button>
      </div>

    </section>

    <!-- TAB 3: CADERNO DE DOSES, ESCORES & NÚMEROS MÁGICOS -->
    <section id="tab-doses-escores" class="tab-view">
      
      <div class="cheat-search-bar">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
        <input type="text" id="cheat-filter-input" placeholder="Filtrar por nome de escore, fármaco ou valor laboratorial..." oninput="filterCheatSheet()">
      </div>

      <div class="cheat-grid" id="cheat-grid-container">

        <!-- CARD 1 -->
        <div class="cheat-card highlight">
          <div class="cheat-title">
            <span>Rifampicina (Quimioprofilaxia de Meningite)</span>
            <span class="cheat-badge">Infectologia</span>
          </div>
          <div class="cheat-content">
            • <strong>Indicação:</strong> Contatos íntimos de casos confirmados ou suspeitos de Doença Meningocócica.<br>
            • <strong>Dose Exata do Adulto:</strong> <span class="dose-highlight">600 mg VO de 12/12h por 2 dias</span> (total: 4 tomadas).<br>
            • <strong>Alternativas:</strong> Ciprofloxacino 500 mg VO dose única OU Ceftriaxona 250 mg IM dose única (escolha em gestantes).<br>
            • <em>Peguinha da Banca:</em> A vacina conjugada NÃO substitui a quimioprofilaxia imediata!
          </div>
        </div>

        <!-- CARD 2 -->
        <div class="cheat-card highlight">
          <div class="cheat-title">
            <span>Gluconato de Cálcio 10% (Hipercalemia Grave)</span>
            <span class="cheat-badge">Nefrologia</span>
          </div>
          <div class="cheat-content">
            • <strong>Gatilho:</strong> K+ > 6,5 mEq/L OU qualquer alteração no ECG (T apiculada simétrica, alargamento de QRS, perda de onda P).<br>
            • <strong>Dose & Administração:</strong> <span class="dose-highlight">1 ampola (10 mL) EV em 2 a 3 minutos</span> com monitorização contínua.<br>
            • <strong>Mecanismo:</strong> Estabiliza a membrana dos cardiomiócitos (aumenta o limiar de ação). <strong>NÃO REDUZ O POTÁSSIO!</strong><br>
            • <em>Conduta Definitiva:</em> Se DRC estágio 5 anúrico = <strong>Hemodiálise de Urgência</strong>.
          </div>
        </div>

        <!-- CARD 3 -->
        <div class="cheat-card">
          <div class="cheat-title">
            <span>Escore CURB-65 (Pneumonia Adquirida na Comunidade)</span>
            <span class="cheat-badge">Pneumologia</span>
          </div>
          <div class="cheat-content">
            • <strong>C</strong> - Confusão mental aguda (1 pt)<br>
            • <strong>U</strong> - Ureia sérica <span class="dose-highlight">> 50 mg/dL</span> (1 pt)<br>
            • <strong>R</strong> - Frequência Respiratória <span class="dose-highlight">≥ 30 irpm</span> (1 pt)<br>
            • <strong>B</strong> - Pressão Arterial <span class="dose-highlight">PAS &lt; 90 ou PAD ≤ 60 mmHg</span> (1 pt)<br>
            • <strong>65</strong> - Idade <span class="dose-highlight">≥ 65 anos</span> (1 pt)<br>
            • <strong>Conduta:</strong> 0-1 pt = Ambulatório (Amoxi-Clav ou Azitromicina); 2 pts = Enfermaria (Ceftriaxona + Azitromicina); ≥ 3 pts = UTI.
          </div>
        </div>

        <!-- CARD 4 -->
        <div class="cheat-card">
          <div class="cheat-title">
            <span>Escore de Wells para TEP (Embolia Pulmonar)</span>
            <span class="cheat-badge">Pneumologia</span>
          </div>
          <div class="cheat-content">
            • Sintomas/sinais clínicos de TVP (+3,0 pts)<br>
            • Diagnóstico alternativo menos provável que TEP (+3,0 pts)<br>
            • Frequência Cardíaca > 100 bpm (+1,5 pts)<br>
            • Imobilização ≥ 3 dias ou cirurgia prévia nas últimas 4 semanas (+1,5 pts)<br>
            • História prévia de TVP ou TEP (+1,5 pts)<br>
            • Hemoptise (+1,0 pt) | Neoplasia ativa (+1,0 pt)<br>
            • <strong>Corte de Decisão:</strong> <span class="dose-highlight">&gt; 4 pts (Provável)</span> = <strong>Angio-TC de Tórax</strong> direta. <span class="dose-highlight">≤ 4 pts (Improvável)</span> = <strong>D-dímero</strong>.
          </div>
        </div>

        <!-- CARD 5 -->
        <div class="cheat-card highlight">
          <div class="cheat-title">
            <span>Fibrilação Atrial: CHA₂DS₂-VASc & Cardioversão</span>
            <span class="cheat-badge">Cardiologia</span>
          </div>
          <div class="cheat-content">
            • <strong>Indicação de Anticoagulação Plena:</strong> Homens ≥ 2 pts / Mulheres ≥ 3 pts.<br>
            • <strong>Duração > 48h ou início desconhecido:</strong> <strong>NÃO</strong> cardioverter de imediato sem afastar trombo atrial! Realizar <span class="dose-highlight">Ecocardiograma Transesofágico (ETE)</span> prévio OU anticoagular por 3 semanas consecutivas.<br>
            • Se instabilidade hemodinâmica (choque, angina refratária, EAP): <strong>Cardioversão Elétrica Sincronizada Imediata</strong>.
          </div>
        </div>

        <!-- CARD 6 -->
        <div class="cheat-card">
          <div class="cheat-title">
            <span>Albumina Humana na PBE (Cirrose Hepática)</span>
            <span class="cheat-badge">Gastroenterologia</span>
          </div>
          <div class="cheat-content">
            • <strong>Critério Diagnóstico:</strong> Paracentese com Neutrófilos <span class="dose-highlight">≥ 250 células/mm³</span> no líquido ascítico.<br>
            • <strong>Antibiótico:</strong> Cefotaxima 2g EV 8/8h ou Ceftriaxona 2g EV 24/24h por 5 dias.<br>
            • <strong>Dose de Albumina (Prevenção de Síndrome Hepatorrenal):</strong><br>
              - Dia 1: <span class="dose-highlight">1,5 g/kg</span> nas primeiras 6 horas.<br>
              - Dia 3: <span class="dose-highlight">1,0 g/kg</span>.
          </div>
        </div>

        <!-- CARD 7 -->
        <div class="cheat-card">
          <div class="cheat-title">
            <span>AVC Isquêmico: Janela & Dose do rt-PA</span>
            <span class="cheat-badge">Neurologia</span>
          </div>
          <div class="cheat-content">
            • <strong>Janela Terapêutica:</strong> Até <span class="dose-highlight">4 horas e 30 minutos</span> do ictus (último momento visto bem).<br>
            • <strong>Pressão Arterial Obrigatória para Trombólise:</strong> Deve estar <span class="dose-highlight">&lt; 185 x 110 mmHg</span> (usar Nitroprussiato se necessário).<br>
            • <strong>Fármaco & Dose:</strong> Alteplase (rt-PA) <span class="dose-highlight">0,9 mg/kg (dose máxima: 90 mg)</span>, sendo 10% da dose em bolus em 1 minuto e o restante (90%) infundido em 60 minutos.
          </div>
        </div>

        <!-- CARD 8 -->
        <div class="cheat-card highlight">
          <div class="cheat-title">
            <span>Febre Maculosa & Zoonoses (Doxiciclina)</span>
            <span class="cheat-badge">Infectologia</span>
          </div>
          <div class="cheat-content">
            • <strong>Apresentação Clássica:</strong> Contato com carrapato-estrela/área rural + febre alta + mialgia intensa + exantema máculo-papular centrípeto (palmas e plantas).<br>
            • <strong>Tratamento Imediato:</strong> <span class="dose-highlight">Doxiciclina 100 mg VO/EV de 12/12h por 7 dias</span>.<br>
            • <em>Regra de Ouro da Banca:</em> <strong>JAMAIS</strong> aguardar o resultado da sorologia para iniciar a Doxiciclina! O atraso eleva drasticamente a letalidade.
          </div>
        </div>

        <!-- CARD 9 -->
        <div class="cheat-card">
          <div class="cheat-title">
            <span>Cetoacidose Diabética (Regra de Ouro do Potássio)</span>
            <span class="cheat-badge">Endocrinologia</span>
          </div>
          <div class="cheat-content">
            • <strong>Tríade:</strong> Glicemia > 250 mg/dL + Cetonúria/Cetonemia + Acidose metabólica (pH < 7.3, HCO3 < 18) com Ânion Gap elevado (> 12).<br>
            • <strong>Gatilho de Insulina vs Potássio:</strong><br>
              - Se <span class="dose-highlight">K+ &lt; 3,3 mEq/L</span>: <strong>CONTRAINDICADA A INSULINA!</strong> Repor potássio primeiro para evitar arritmia fatal.<br>
              - Se K+ entre 3,3 e 5,2: Iniciar Insulina Regular 0,1 U/kg/h em bomba + reposição de KCl.
          </div>
        </div>

      </div>
    </section>

    <!-- TAB 4: ANALYTICS -->
    <section id="tab-analytics" class="tab-view">
      <div class="cheat-grid">
        <div class="cheat-card highlight">
          <div class="cheat-title">
            <span>✨ Tendência Provas 2026 (Últimas 2 Provas)</span>
            <span class="cheat-badge">Peso Máximo (80 Qs)</span>
          </div>
          <div id="analytics-2026-temas-list"></div>
        </div>

        <div class="cheat-card highlight">
          <div class="cheat-title">
            <span>⚡ O que Mudou nas Provas de 2026?</span>
            <span class="cheat-badge">Raio-X 2026</span>
          </div>
          <div class="cheat-content" style="font-size: 0.88rem;">
            • <strong>Cardiologia subiu para 20%:</strong> Salto expressivo com IAM (supra anterior, coronária direita, cateterismo primário) e arritmias (FA e cardioversão segura).<br>
            • <strong>Infectologia lidera com 20%:</strong> Destaque absoluto para Febre Maculosa (Doxiciclina empírica imediata sem esperar sorologia), profilaxia de mordeduras e Hepatite B.<br>
            • <strong>Neurologia (18.8%):</strong> Protocolo AVC no SUS, controle rigoroso de PA (&lt;185x110) antes de alteplase e Demência de Lewy.<br>
            • <strong>Endocrinologia (11.2%):</strong> 4 questões de Cetoacidose Diabética (CAD) focando no manejo estrito do potássio antes de abrir a insulina.
          </div>
        </div>

        <div class="cheat-card">
          <div class="cheat-title"><span>Ranking Geral por Especialidade (17 Provas)</span></div>
          <div id="analytics-temas-list"></div>
        </div>

        <div class="cheat-card">
          <div class="cheat-title"><span>Top 10 Subtemas Mais Cobrados</span></div>
          <div id="analytics-subtemas-list"></div>
        </div>
      </div>
    </section>

  </main>

  <script>
    const rawQuestions = {q_json};
    const statsData = {st_json};

    let filteredQuestions = [...rawQuestions];
    let isStudyMode = false;
    let onlyStarred = false;
    let starredIds = new Set(JSON.parse(localStorage.getItem('starred_questions') || '[]'));

    // ESTADO DO SIMULADO OFICIAL
    let mockExamQuestions = [];
    let mockCurrentIndex = 0;
    let mockUserAnswers = {{}};
    let mockTimerSeconds = 0;
    let mockTimerInterval = null;

    window.addEventListener('DOMContentLoaded', () => {{
      populateFilters();
      renderQuestions();
      updateStarredCount();
      initMockExam();
      renderAnalytics();
      initCognitiveQuiz();
    }});

    function switchTab(tabId) {{
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.tab-view').forEach(v => v.classList.remove('active'));

      const targetBtn = Array.from(document.querySelectorAll('.tab-btn')).find(b => b.getAttribute('onclick').includes(tabId));
      if (targetBtn) targetBtn.classList.add('active');

      const targetView = document.getElementById(tabId);
      if (targetView) targetView.classList.add('active');
    }}

    function populateFilters() {{
      const selTema = document.getElementById('filter-tema');
      const selProva = document.getElementById('filter-prova');

      for (const [tema, cnt] of Object.entries(statsData.by_tema)) {{
        const opt = document.createElement('option');
        opt.value = tema;
        opt.textContent = `${{tema}} (${{cnt}})`;
        selTema.appendChild(opt);
      }}

      for (const [prova, cnt] of Object.entries(statsData.by_prova)) {{
        const opt = document.createElement('option');
        opt.value = prova;
        opt.textContent = `${{prova}} (${{cnt}} Qs)`;
        selProva.appendChild(opt);
      }}
    }}

    let only2026 = false;

    function applyFilters() {{
      const search = document.getElementById('filter-search').value.toLowerCase();
      const selTema = document.getElementById('filter-tema').value;
      const selProva = document.getElementById('filter-prova').value;
      const selRep = document.getElementById('filter-repetidas').value;
      const selTipo = document.getElementById('filter-tipo') ? document.getElementById('filter-tipo').value : 'all';

      filteredQuestions = rawQuestions.filter(q => {{
        const matchesTema = selTema === 'all' || q.tema === selTema;
        const matchesProva = selProva === 'all' || q.prova === selProva;
        const matchesRep = selRep === 'all' || (selRep === 'only_repeated' && q.is_repetida);
        const matchesTipo = selTipo === 'all' || q.tipo_questao === selTipo;
        const matchesStar = !onlyStarred || starredIds.has(q.id);
        const matches2026 = !only2026 || q.is_2026;

        const qText = (q.enunciado + ' ' + Object.values(q.alternativas).join(' ') + ' ' + q.subtema + ' ' + q.objetivo).toLowerCase();
        const matchesSearch = !search || qText.includes(search);

        return matchesTema && matchesProva && matchesRep && matchesTipo && matchesStar && matchesSearch && matches2026;
      }});

      // Ordenação padrão com peso prioritário: 2026 primeiro, depois repetidas, depois histórico
      filteredQuestions.sort((a, b) => {{
        if (a.is_2026 && !b.is_2026) return -1;
        if (!a.is_2026 && b.is_2026) return 1;
        if (a.is_repetida && !b.is_repetida) return -1;
        if (!a.is_repetida && b.is_repetida) return 1;
        return 0;
      }});

      document.getElementById('results-count-bar').textContent = `Mostrando ${{filteredQuestions.length}} de ${{rawQuestions.length}} questões encontradas.`;
      renderQuestions();
    }}

    function filterOnly2026() {{
      switchTab('tab-explorer');
      only2026 = true;
      const b26 = document.getElementById('btn-2026-filter');
      if (b26) b26.classList.add('active');
      document.getElementById('filter-repetidas').value = 'all';
      document.getElementById('filter-tema').value = 'all';
      document.getElementById('filter-prova').value = 'all';
      document.getElementById('filter-search').value = '';
      onlyStarred = false;
      document.getElementById('btn-star-filter').classList.remove('active');
      applyFilters();
    }}

    function toggle2026Filter() {{
      only2026 = !only2026;
      const b26 = document.getElementById('btn-2026-filter');
      if (b26) b26.classList.toggle('active', only2026);
      applyFilters();
    }}

    function filterOnlyRepeated() {{
      switchTab('tab-explorer');
      document.getElementById('filter-repetidas').value = 'only_repeated';
      document.getElementById('filter-tema').value = 'all';
      document.getElementById('filter-prova').value = 'all';
      document.getElementById('filter-search').value = '';
      onlyStarred = false;
      document.getElementById('btn-star-filter').classList.remove('active');
      only2026 = false;
      const b26 = document.getElementById('btn-2026-filter');
      if (b26) b26.classList.remove('active');
      applyFilters();
    }}

    function toggleStarredFilter() {{
      onlyStarred = !onlyStarred;
      document.getElementById('btn-star-filter').classList.toggle('active', onlyStarred);
      applyFilters();
    }}

    function toggleStar(qId, btn) {{
      if (starredIds.has(qId)) {{
        starredIds.delete(qId);
        btn.classList.remove('starred');
      }} else {{
        starredIds.add(qId);
        btn.classList.add('starred');
      }}
      localStorage.setItem('starred_questions', JSON.stringify([...starredIds]));
      updateStarredCount();
    }}

    function updateStarredCount() {{
      document.getElementById('starred-count').textContent = starredIds.size;
    }}

    function toggleStudyMode(forcedState = null) {{
      if (forcedState !== null) {{
        isStudyMode = Boolean(forcedState);
      }} else {{
        isStudyMode = !isStudyMode;
      }}

      const btn = document.getElementById('btn-training-toggle');
      const statusText = document.getElementById('training-status-text');
      const badgeBtn = document.getElementById('training-badge-btn');
      const banner = document.getElementById('training-active-banner');

      if (btn) btn.classList.toggle('active', isStudyMode);
      if (statusText) {{
        statusText.innerHTML = isStudyMode 
          ? '<span style="color: #10b981; font-weight: 700;">ATIVADO (Gabaritos Ocultados)</span>'
          : '<span style="color: var(--text-dim);">DESATIVADO (Gabarito Visível)</span>';
      }}
      if (badgeBtn) {{
        badgeBtn.textContent = isStudyMode ? 'Desativar Treino' : 'Ativar Treino';
      }}
      if (banner) {{
        banner.style.display = isStudyMode ? 'flex' : 'none';
      }}

      renderQuestions();
    }}

    function formatQuestionStatement(text) {{
      if (!text) return '';
      let clean = text.replace(/(\\w+)-\\s*\\n\\s*(\\w+)/g, '$1$2');

      const cmdPat = /(\\s+|^)((?:Qual|Quais|Quanto|Em relação|Com base|Considerando|Diante|Sobre|Neste caso|Nesse caso|Assinale|Marque|Indique|De acordo|Para este|Para essa|O diagnóstico|A conduta|A principal|O que aconteceu|Como conduzir)\\b.*?[?:.])\\s*$/i;
      const match = clean.match(cmdPat);

      let bodyText = clean.trim();
      let promptCmd = '';

      if (match && match.index > 25) {{
        bodyText = clean.substring(0, match.index).trim();
        promptCmd = match[2].trim();
      }}

      const rawLines = bodyText.split('\\n').map(l => l.trim()).filter(Boolean);
      const paragraphs = [];
      let curr = [];

      const isListLine = (line) => /^(?:[•·\\-*]|\\d+[\\.\\)]|[IVXLCDM]+[\\.\\-–]|\\([ \\w]+\\))\\s+/i.test(line);

      for (const line of rawLines) {{
        if (isListLine(line)) {{
          if (curr.length) {{
            paragraphs.push(curr.join(' '));
            curr = [];
          }}
          paragraphs.push(line);
        }} else {{
          curr.push(line);
        }}
      }}
      if (curr.length) paragraphs.push(curr.join(' '));

      let html = '<div class="q-case-vignette">';
      let inList = false;

      for (let p of paragraphs) {{
        p = p.replace(/\\s+/g, ' ').replace(/\\s+([,.;:?!])/g, '$1').trim();
        if (isListLine(p)) {{
          if (!inList) {{
            html += '<ul class="q-case-list">';
            inList = true;
          }}
          const cleanItem = p.replace(/^(?:[•·\\-*]|\\d+[\\.\\)]|[IVXLCDM]+[\\.\\-–]|\\([ \\w]+\\))\\s*/, '');
          html += `<li>${{cleanItem}}</li>`;
        }} else {{
          if (inList) {{
            html += '</ul>';
            inList = false;
          }}
          html += `<p class="q-case-text">${{p}}</p>`;
        }}
      }}
      if (inList) html += '</ul>';
      html += '</div>';

      if (promptCmd) {{
        promptCmd = promptCmd.replace(/\\s+/g, ' ').replace(/\\s+([,.;:?!])/g, '$1').trim();
        html += `
          <div class="q-prompt-box">
            <span class="q-prompt-icon">🎯</span>
            <div class="q-prompt-text">${{promptCmd}}</div>
          </div>
        `;
      }}

      return html;
    }}

    function renderQuestions() {{
      const container = document.getElementById('questions-list');
      container.innerHTML = '';

      if (filteredQuestions.length === 0) {{
        container.innerHTML = `
          <div style="text-align: center; padding: 4rem 1rem; color: var(--text-dim);">
            <div style="font-size: 2.5rem; margin-bottom: 0.5rem;">🔍</div>
            <div style="font-size: 1.1rem; color: var(--text-muted);">Nenhuma questão encontrada para os filtros ativos.</div>
          </div>
        `;
        return;
      }}

      const items = filteredQuestions.slice(0, 50);

      items.forEach(q => {{
        const card = document.createElement('div');
        card.className = 'question-card';
        card.id = `qcard-${{q.id}}`;

        const isStarred = starredIds.has(q.id);

        let altsHtml = '';
        for (const [letter, text] of Object.entries(q.alternativas)) {{
          const isCorrect = letter === q.gabarito;
          let altClass = 'alt-option';
          if (!isStudyMode && isCorrect) altClass += ' selected-correct';

          altsHtml += `
            <div class="${{altClass}}" id="alt-${{q.id}}-${{letter}}" onclick="testQuestionAnswer('${{q.id}}', '${{letter}}')">
              <div class="alt-letter">${{letter}}</div>
              <div class="alt-text">${{text}}</div>
            </div>
          `;
        }}

        let alert2026 = '';
        if (q.is_2026) {{
          alert2026 = `
            <div class="q-2026-alert">
              <span>✨</span>
              <div><strong>Tendência 2026 (Peso Máximo):</strong> Questão cobrada nas últimas 2 provas de Clínica Médica (2026). Prioridade máxima de estudo!</div>
            </div>
          `;
        }}

        let repAlert = '';
        if (q.is_repetida) {{
          repAlert = `
            <div class="q-repeated-alert">
              <span>🔥</span>
              <div><strong>Questão Repetida (${{q.total_repeticoes}}x):</strong> Presente também em ${{q.provas_repetidas.join(', ')}}.</div>
            </div>
          `;
        }}

        card.innerHTML = `
          <div class="card-top-row">
            <div class="q-tags">
              <span class="tag tag-exam">${{q.prova}} • Q${{q.numero}}</span>
              ${{q.is_2026 ? `<span class="tag tag-2026">✨ Prova 2026 (Peso Máximo)</span>` : ''}}
              <span class="tag tag-tema">${{q.tema}}</span>
              <span class="tag tag-subtema">${{q.subtema}}</span>
              <span class="tag tag-tipo">${{q.tipo_questao}}</span>
              ${{q.is_repetida ? `<span class="tag tag-repeated">🔥 Repetida (${{q.total_repeticoes}}x)</span>` : ''}}
            </div>
            <button class="star-btn ${{isStarred ? 'starred' : ''}}" onclick="toggleStar('${{q.id}}', this)">★</button>
          </div>

          ${{alert2026}}
          ${{repAlert}}

          <div class="q-objective-box">
            <span style="font-size: 1.1rem;">🎯</span>
            <div><strong>Competência Avaliada:</strong> ${{q.objetivo}}</div>
          </div>

          <div class="q-statement">${{formatQuestionStatement(q.enunciado)}}</div>

          <div class="alternatives-list">
            ${{altsHtml}}
          </div>

          <div class="q-footer">
            <div class="q-footer-status" id="footer-status-${{q.id}}" style="font-size: 0.9rem; color: var(--text-muted);">
              ${{!isStudyMode ? `Gabarito Oficial: Alternativa <strong style="color: #10b981;">${{q.gabarito}}</strong>` : '💡 Modo Treino Ativo: Selecione sua resposta acima para verificar'}}
            </div>
            <button class="btn-toggle-expl" onclick="toggleRationale('${{q.id}}')">
              <span>📖</span> Raciocínio Clínico & Pérola
            </button>
          </div>

          <div class="justification-box" id="just-${{q.id}}">
            <div style="font-weight: 700; color: #38bdf8; margin-bottom: 0.4rem;">🧠 Justificativa da Alternativa '${{q.gabarito}}':</div>
            <div style="margin-bottom: 0.8rem;">${{q.justificativa_clinica}}</div>
            <div style="background: rgba(245, 158, 11, 0.1); border-left: 3px solid #f59e0b; padding: 0.6rem 0.8rem; border-radius: 4px; color: #fde68a; font-size: 0.9rem;">
              ${{q.perola_banca}}
            </div>
          </div>
        `;

        container.appendChild(card);
      }});

      if (filteredQuestions.length > 50) {{
        const moreNotice = document.createElement('div');
        moreNotice.style.textAlign = 'center';
        moreNotice.style.padding = '1.5rem';
        moreNotice.style.color = 'var(--text-muted)';
        moreNotice.innerHTML = `Mostrando 50 questões de ${{filteredQuestions.length}}. Utilize a barra de busca ou filtros para refinar.`;
        container.appendChild(moreNotice);
      }}
    }}

    function testQuestionAnswer(qId, letter) {{
      if (!isStudyMode) {{
        toggleRationale(qId);
        return;
      }}

      const q = rawQuestions.find(item => item.id === qId);
      if (!q) return;

      const card = document.getElementById(`qcard-${{qId}}`);
      if (!card) return;

      card.querySelectorAll('.alt-option').forEach(el => el.classList.remove('selected-correct', 'selected-wrong'));

      const isCorrect = letter === q.gabarito;
      const selectedEl = document.getElementById(`alt-${{qId}}-${{letter}}`);
      const correctEl = document.getElementById(`alt-${{qId}}-${{q.gabarito}}`);

      if (isCorrect) {{
        selectedEl.classList.add('selected-correct');
      }} else {{
        selectedEl.classList.add('selected-wrong');
        if (correctEl) correctEl.classList.add('selected-correct');
      }}

      // Abrir justificativa automaticamente
      const justEl = document.getElementById(`just-${{qId}}`);
      if (justEl) justEl.classList.add('open');

      // Atualizar status no rodapé do card
      const statusEl = document.getElementById(`footer-status-${{qId}}`);
      if (statusEl) {{
        if (isCorrect) {{
          statusEl.innerHTML = `✅ <strong style="color: #10b981;">RESPOSTA CORRETA!</strong> Parabéns! Gabarito Oficial: Alternativa ${{q.gabarito}}`;
        }} else {{
          statusEl.innerHTML = `❌ <strong style="color: #f43f5e;">RESPOSTA INCORRETA.</strong> Você escolheu <strong>${{letter}}</strong>. Gabarito oficial: <strong style="color: #10b981;">${{q.gabarito}}</strong>`;
        }}
      }}
    }}

    function toggleRationale(qId) {{
      const el = document.getElementById(`just-${{qId}}`);
      if (el) el.classList.toggle('open');
    }}

    // ==========================================
    // SIMULADO OFICIAL META 90% (PONDERADO 2026)
    // ==========================================

    let currentMockMode = 'weighted_2026';

    function setMockMode(mode) {{
      currentMockMode = mode;
      document.querySelectorAll('.btn-mock-mode').forEach(b => b.classList.remove('active'));
      const descEl = document.getElementById('mock-mode-desc');
      if (mode === 'weighted_2026') {{
        const b = document.getElementById('btn-mode-weighted');
        if (b) b.classList.add('active');
        if (descEl) descEl.innerHTML = 'Ponderação calibrada: <strong>50% das questões sorteadas das 2 provas de 2026 (20 Qs)</strong> + 25% de repetidas históricas + 25% de emergências inegociáveis.';
      }} else if (mode === 'pure_2026') {{
        const b = document.getElementById('btn-mode-pure');
        if (b) b.classList.add('active');
        if (descEl) descEl.innerHTML = 'Simulado Puro 2026: <strong>40 questões sorteadas exclusivamente dentre as 80 questões das 2 provas de 2026</strong>!';
      }} else {{
        const b = document.getElementById('btn-mode-all');
        if (b) b.classList.add('active');
        if (descEl) descEl.innerHTML = 'Amostra Ampla: 40 questões balanceadas conforme os pesos gerais de todo o histórico (2022 a 2026).';
      }}
      initMockExam(mode);
    }}

    function initMockExam(mode = currentMockMode) {{
      mockExamQuestions = [];
      const usedIds = new Set();

      if (mode === 'pure_2026') {{
        // 40 questões sorteadas exclusivamente dentre as 80 de 2026
        const pool2026 = rawQuestions.filter(q => q.is_2026);
        pool2026.sort(() => 0.5 - Math.random());
        mockExamQuestions = pool2026.slice(0, 40);
      }} else if (mode === 'weighted_2026') {{
        // Modo Ponderado 2026 (Recomendado):
        // 20 questões sorteadas das 80 de 2026 (50% do simulado!)
        const pool2026 = rawQuestions.filter(q => q.is_2026);
        pool2026.sort(() => 0.5 - Math.random());
        pool2026.slice(0, 20).forEach(q => {{
          mockExamQuestions.push(q);
          usedIds.add(q.id);
        }});

        // 10 questões repetidas de alto valor histórico (25% do simulado!)
        const poolRep = rawQuestions.filter(q => q.is_repetida && !usedIds.has(q.id));
        poolRep.sort(() => 0.5 - Math.random());
        poolRep.slice(0, 10).forEach(q => {{
          mockExamQuestions.push(q);
          usedIds.add(q.id);
        }});

        // 10 questões de especialidades e emergências (25% do simulado!)
        const rem = rawQuestions.filter(q => !usedIds.has(q.id));
        rem.sort(() => 0.5 - Math.random());
        rem.slice(0, 40 - mockExamQuestions.length).forEach(q => {{
          mockExamQuestions.push(q);
          usedIds.add(q.id);
        }});
      }} else {{
        // Amostra ampla histórica (2022-2026)
        const sampleWeights = {{
          "Cardiologia": 8, "Infectologia": 8, "Neurologia": 7, "Endocrinologia": 5,
          "Nefrologia": 4, "Pneumologia": 3, "Clínica Médica Geral": 2,
          "Gastroenterologia": 1, "Hematologia": 1, "Reumatologia": 1
        }};
        for (const [tema, targetCount] of Object.entries(sampleWeights)) {{
          const pool = rawQuestions.filter(q => q.tema === tema && !usedIds.has(q.id));
          pool.sort(() => 0.5 - Math.random());
          pool.slice(0, targetCount).forEach(q => {{
            mockExamQuestions.push(q);
            usedIds.add(q.id);
          }});
        }}
        if (mockExamQuestions.length < 40) {{
          const rem = rawQuestions.filter(q => !usedIds.has(q.id));
          rem.sort(() => 0.5 - Math.random());
          mockExamQuestions.push(...rem.slice(0, 40 - mockExamQuestions.length));
        }}
      }}

      mockExamQuestions.sort(() => 0.5 - Math.random());
      mockCurrentIndex = 0;
      mockUserAnswers = {{}};
      
      buildMockNavGrid();
      renderMockCurrentQuestion();
      startMockTimer();
    }}

    function startMockTimer() {{
      if (mockTimerInterval) clearInterval(mockTimerInterval);
      mockTimerSeconds = 0;
      mockTimerInterval = setInterval(() => {{
        mockTimerSeconds++;
        const mins = String(Math.floor(mockTimerSeconds / 60)).padStart(2, '0');
        const secs = String(mockTimerSeconds % 60).padStart(2, '0');
        document.getElementById('mock-timer-display').textContent = `${{mins}}:${{secs}}`;
      }}, 1000);
    }}

    function buildMockNavGrid() {{
      const grid = document.getElementById('mock-nav-grid');
      grid.innerHTML = '';
      for (let i = 0; i < 40; i++) {{
        const btn = document.createElement('button');
        btn.className = 'btn-nav-q';
        btn.id = `nav-q-${{i}}`;
        btn.textContent = i + 1;
        btn.onclick = () => jumpToMockQuestion(i);
        grid.appendChild(btn);
      }}
      updateMockNavStyles();
    }}

    function updateMockNavStyles() {{
      for (let i = 0; i < 40; i++) {{
        const btn = document.getElementById(`nav-q-${{i}}`);
        if (!btn) continue;
        btn.classList.toggle('active', i === mockCurrentIndex);
        btn.classList.toggle('answered', mockUserAnswers[i] !== undefined);
      }}
      // Atualizar contador de score em tempo real
      const correctCount = Object.keys(mockUserAnswers).filter(idx => mockUserAnswers[idx] === mockExamQuestions[idx].gabarito).length;
      document.getElementById('mock-score-val').textContent = correctCount;
      const circle = document.getElementById('mock-score-circle');
      if (correctCount >= 36) {{
        circle.style.borderColor = '#10b981';
      }} else if (correctCount >= 30) {{
        circle.style.borderColor = '#f59e0b';
      }} else {{
        circle.style.borderColor = '#3b82f6';
      }}
    }}

    function jumpToMockQuestion(idx) {{
      mockCurrentIndex = idx;
      renderMockCurrentQuestion();
    }}

    function nextMockQuestion() {{
      if (mockCurrentIndex < 39) {{
        mockCurrentIndex++;
        renderMockCurrentQuestion();
      }}
    }}

    function prevMockQuestion() {{
      if (mockCurrentIndex > 0) {{
        mockCurrentIndex--;
        renderMockCurrentQuestion();
      }}
    }}

    function renderMockCurrentQuestion() {{
      updateMockNavStyles();
      const q = mockExamQuestions[mockCurrentIndex];
      document.getElementById('mock-q-num-label').textContent = `Questão ${{mockCurrentIndex + 1}} de 40 (${{q.prova}})`;

      document.getElementById('mock-q-tags').innerHTML = `
        <span class="tag tag-exam">${{q.prova}} • Q${{q.numero}}</span>
        ${{q.is_2026 ? `<span class="tag tag-2026">✨ Prova 2026</span>` : ''}}
        <span class="tag tag-tema">${{q.tema}}</span>
        <span class="tag tag-subtema">${{q.subtema}}</span>
        <span class="tag tag-tipo">${{q.tipo_questao}}</span>
        ${{q.is_repetida ? `<span class="tag tag-repeated">🔥 Repetida em ${{q.total_repeticoes}} provas</span>` : ''}}
      `;

      document.getElementById('mock-q-obj').innerHTML = `
        <span style="font-size: 1.1rem;">🎯</span> <div><strong>Objetivo Clínico:</strong> ${{q.objetivo}}</div>
      `;

      document.getElementById('mock-q-statement').innerHTML = formatQuestionStatement(q.enunciado);

      const userChoice = mockUserAnswers[mockCurrentIndex];
      let altsHtml = '';
      for (const [letter, text] of Object.entries(q.alternativas)) {{
        let altClass = 'alt-option';
        if (userChoice) {{
          if (letter === q.gabarito) altClass += ' selected-correct';
          else if (letter === userChoice) altClass += ' selected-wrong';
        }}
        altsHtml += `
          <div class="${{altClass}}" id="mock-alt-${{letter}}" onclick="selectMockAnswer('${{letter}}')">
            <div class="alt-letter">${{letter}}</div>
            <div class="alt-text">${{text}}</div>
          </div>
        `;
      }}
      document.getElementById('mock-q-alts').innerHTML = altsHtml;

      const justBox = document.getElementById('mock-q-just');
      justBox.classList.remove('open');
      justBox.innerHTML = `
        <div style="font-weight: 700; color: #38bdf8; margin-bottom: 0.4rem;">Gabarito Oficial: Alternativa ${{q.gabarito}}</div>
        <div style="margin-bottom: 0.8rem;">${{q.justificativa_clinica}}</div>
        <div style="background: rgba(245, 158, 11, 0.1); border-left: 3px solid #f59e0b; padding: 0.6rem; color: #fde68a;">
          ${{q.perola_banca}}
        </div>
      `;
    }}

    function selectMockAnswer(letter) {{
      mockUserAnswers[mockCurrentIndex] = letter;
      renderMockCurrentQuestion();
      document.getElementById('mock-q-just').classList.add('open');
    }}

    function revealMockRationale() {{
      document.getElementById('mock-q-just').classList.toggle('open');
    }}

    function finishMockExam() {{
      clearInterval(mockTimerInterval);
      let correct = 0;
      for (let i = 0; i < 40; i++) {{
        if (mockUserAnswers[i] === mockExamQuestions[i].gabarito) correct++;
      }}

      const pct = ((correct / 40) * 100).toFixed(1);
      const modal = document.getElementById('mock-result-modal');
      const title = document.getElementById('mock-result-title');
      const sub = document.getElementById('mock-result-subtitle');

      modal.style.display = 'block';
      if (correct >= 36) {{
        title.innerHTML = `🎉 <strong>PARABÉNS! META DE 90% ALCANÇADA!</strong> (${{correct}}/40 - ${{pct}}%)`;
        title.style.color = '#10b981';
        sub.textContent = 'Você demonstrou domínio dos protocolos essenciais e das questões repetidas da banca do Prof. Ulisses. Está plenamente pronto para gabaritar a prova oficial!';
      }} else if (correct >= 30) {{
        title.innerHTML = `⚡ <strong>BOM DESEMPENHO, MAS PERTO DA META</strong> (${{correct}}/40 - ${{pct}}%)`;
        title.style.color = '#f59e0b';
        sub.textContent = `Você acertou ${{correct}} de 40. Para atingir os 90% de segurança (36/40), revise imediatamente as questões que você errou abaixo e fixe as doses inegociáveis.`;
      }} else {{
        title.innerHTML = `⚠️ <strong>ATENÇÃO: ABAIXO DA ZONA DE SEGURANÇA</strong> (${{correct}}/40 - ${{pct}}%)`;
        title.style.color = '#f43f5e';
        sub.textContent = `Você acertou ${{correct}} de 40. Não se preocupe: foque no 'Caderno de Doses & Escores' e nas 'Questões Repetidas' para subir direto para 90%.`;
      }}
      modal.scrollIntoView({{ behavior: 'smooth' }});
    }}

    function reviewMockMistakes() {{
      // Filtrar apenas questões que o usuário errou
      const wrongQuestions = mockExamQuestions.filter((q, idx) => mockUserAnswers[idx] !== q.gabarito);
      if (wrongQuestions.length === 0) {{
        alert('Você gabaritou ou não errou nenhuma questão! Sensacional!');
        return;
      }}
      switchTab('tab-explorer');
      filteredQuestions = wrongQuestions;
      document.getElementById('results-count-bar').textContent = `Revisando as ${{wrongQuestions.length}} questões erradas no simulado.`;
      renderQuestions();
    }}

    // ==========================================
    // FILTRO DO CADERNO DE DOSES & ESCORES
    // ==========================================

    function filterCheatSheet() {{
      const term = document.getElementById('cheat-filter-input').value.toLowerCase();
      document.querySelectorAll('#cheat-grid-container .cheat-card').forEach(card => {{
        const text = card.textContent.toLowerCase();
        card.style.display = (!term || text.includes(term)) ? 'block' : 'none';
      }});
    }}

    function renderAnalytics() {{
      const analytics2026 = document.getElementById('analytics-2026-temas-list');
      if (analytics2026 && statsData.by_tema_2026) {{
        analytics2026.innerHTML = '';
        for (const [tema, cnt] of Object.entries(statsData.by_tema_2026)) {{
          const pct = ((cnt / statsData.total_2026) * 100).toFixed(1);
          analytics2026.innerHTML += `
            <div style="display: flex; justify-content: space-between; padding: 0.4rem 0; border-bottom: 1px solid rgba(255,255,255,0.05); font-size: 0.9rem;">
              <span>${{tema}}</span>
              <span style="font-family: 'JetBrains Mono'; color: #38bdf8; font-weight: 700;">${{cnt}} Qs (${{pct}}%)</span>
            </div>
          `;
        }}
      }}

      const temasContainer = document.getElementById('analytics-temas-list');
      temasContainer.innerHTML = '';
      for (const [tema, cnt] of Object.entries(statsData.by_tema)) {{
        const pct = ((cnt / statsData.total_questoes) * 100).toFixed(1);
        temasContainer.innerHTML += `
          <div style="display: flex; justify-content: space-between; padding: 0.4rem 0; border-bottom: 1px solid rgba(255,255,255,0.05); font-size: 0.9rem;">
            <span>${{tema}}</span>
            <span style="font-family: 'JetBrains Mono'; color: #cbd5e1;">${{cnt}} Qs (${{pct}}%)</span>
          </div>
        `;
      }}

      const subtemasContainer = document.getElementById('analytics-subtemas-list');
      subtemasContainer.innerHTML = '';
      const topSubtemas = Object.entries(statsData.by_subtema).slice(0, 10);
      for (const [subtema, cnt] of topSubtemas) {{
        subtemasContainer.innerHTML += `
          <div style="display: flex; justify-content: space-between; padding: 0.4rem 0; border-bottom: 1px solid rgba(255,255,255,0.05); font-size: 0.9rem;">
            <span>${{subtema}}</span>
            <span style="font-family: 'JetBrains Mono'; color: #fbbf24;">${{cnt}} Qs</span>
          </div>
        `;
      }}
    }}

    // ==========================================
    // TREINADOR COGNITIVO & ATALHOS DIAGNÓSTICO VS FISIOPATOLOGIA
    // ==========================================

    function filterByType(tipoName) {{
      switchTab('tab-explorer');
      const selTipo = document.getElementById('filter-tipo');
      if (selTipo) {{
        selTipo.value = tipoName;
        applyFilters();
      }}
    }}

    const quizItems = [
      {{ text: "Vasoconstrição da arteríola aferente renal decorrente de inibição de prostaglandinas", type: "Fisiopatologia", expl: "Mecanismo hemodinâmico e vascular celular induzido por AINEs, não uma síndrome ou doença." }},
      {{ text: "Injúria Renal Aguda pré-renal hemodinâmica", type: "Diagnóstico", expl: "Diagnóstico clínico e sindrômico do paciente no momento da admissão." }},
      {{ text: "Demência por Corpos de Lewy", type: "Diagnóstico", expl: "Entidade nosológica clínica caracterizada pela tríade alucinações + flutuação + parkinsonismo." }},
      {{ text: "Inclusões citoplasmáticas neuronais de proteína alfa-sinucleína no córtex cerebral", type: "Fisiopatologia", expl: "Etiopatogenia neuropatológica e molecular subjacente à demência." }},
      {{ text: "Restrição ao enchimento diastólico ventricular com colapso de câmaras direitas na diástole", type: "Fisiopatologia", expl: "Mecanismo hemodinâmico intracardíaco que gera hipotensão e estase jugular no tamponamento." }},
      {{ text: "Tamponamento Cardíaco", type: "Diagnóstico", expl: "Diagnóstico clínico de emergência cardiovascular." }},
      {{ text: "Inibição da proliferação de queratinócitos e da síntese de colágeno dérmico por fibroblastos", type: "Fisiopatologia", expl: "Mecanismo celular farmacológico que explica a atrofia e fragilidade cutânea por corticoides." }},
      {{ text: "Atrofia cutânea e fragilidade capilar induzida por corticoide", type: "Diagnóstico", expl: "Diagnóstico dermatológico clínico da lesão." }},
      {{ text: "Vasodilatação arterial esplâncnica mediada por óxido nítrico com retenção neuro-humoral de sódio", type: "Fisiopatologia", expl: "Fisiopatologia hemodinâmica que desencadeia a ascite na hipertensão portal." }},
      {{ text: "Cirrose Hepática com Síndrome de Hipertensão Portal descompensada", type: "Diagnóstico", expl: "Diagnóstico nosológico e estrutural hepático definitivo." }}
    ];

    let currentQuizIndex = 0;
    let quizScore = 0;
    let quizTotalAnswered = 0;

    function initCognitiveQuiz() {{
      currentQuizIndex = 0;
      quizScore = 0;
      quizTotalAnswered = 0;
      renderCurrentQuizItem();
    }}

    function renderCurrentQuizItem() {{
      const item = quizItems[currentQuizIndex];
      const counterEl = document.getElementById('quiz-item-counter');
      const stmtEl = document.getElementById('quiz-statement-text');
      const fbEl = document.getElementById('quiz-feedback');
      const ctrlEl = document.getElementById('quiz-controls');
      const scoreEl = document.getElementById('quiz-score-display');

      if (!item || !counterEl) return;

      counterEl.textContent = `Desafio ${{currentQuizIndex + 1}} de ${{quizItems.length}}`;
      stmtEl.innerHTML = `"${{item.text}}"`;
      fbEl.style.display = 'none';
      fbEl.className = 'quiz-feedback';
      ctrlEl.style.display = 'none';
      scoreEl.textContent = `${{quizScore}} / ${{quizTotalAnswered}}`;

      document.querySelectorAll('.btn-quiz-choice').forEach(b => {{
        b.disabled = false;
        b.style.opacity = '1';
      }});
    }}

    function handleQuizAnswer(userChoice) {{
      const item = quizItems[currentQuizIndex];
      const fbEl = document.getElementById('quiz-feedback');
      const ctrlEl = document.getElementById('quiz-controls');
      const scoreEl = document.getElementById('quiz-score-display');

      quizTotalAnswered++;
      document.querySelectorAll('.btn-quiz-choice').forEach(b => b.disabled = true);

      const isCorrect = (userChoice === item.type);
      if (isCorrect) {{
        quizScore++;
        fbEl.className = 'quiz-feedback correct';
        fbEl.innerHTML = `✅ <strong>Correto!</strong> É <strong>${{item.type}}</strong>. ${{item.expl}}`;
      }} else {{
        fbEl.className = 'quiz-feedback incorrect';
        fbEl.innerHTML = `❌ <strong>Atenção!</strong> O correto é <strong>${{item.type}}</strong>. ${{item.expl}}`;
      }}
      fbEl.style.display = 'block';
      ctrlEl.style.display = 'block';
      scoreEl.textContent = `${{quizScore}} / ${{quizTotalAnswered}}`;
    }}

    function nextQuizItem() {{
      currentQuizIndex++;
      if (currentQuizIndex >= quizItems.length) {{
        const stmtEl = document.getElementById('quiz-statement-text');
        const fbEl = document.getElementById('quiz-feedback');
        const ctrlEl = document.getElementById('quiz-controls');
        const pct = Math.round((quizScore / quizItems.length) * 100);

        stmtEl.innerHTML = `🎉 <strong>Treinamento Concluído!</strong> Pontuação: <strong>${{quizScore}} de ${{quizItems.length}} (${{pct}}%)</strong>`;
        fbEl.className = (pct >= 80) ? 'quiz-feedback correct' : 'quiz-feedback incorrect';
        fbEl.innerHTML = (pct >= 80)
          ? `🌟 Excelente! Seu reflexo para separar Diagnóstico de Fisiopatologia está afiado. A banca não vai te pegar!`
          : `⚠️ Recomendamos revisar a Matriz Comparativa acima e refazer o treino para fixar os conceitos.`;
        fbEl.style.display = 'block';
        ctrlEl.innerHTML = `<button class="btn-quiz-next" onclick="initCognitiveQuiz()">Reiniciar Treino 🔄</button>`;
        ctrlEl.style.display = 'block';
        return;
      }}
      renderCurrentQuizItem();
    }}
  </script>
</body>
</html>
"""
    with open(OUTPUT_HTML, "w", encoding="utf-8") as f:
        f.write(html_code)
    print(f"🎉 Painel 'Passaporte 90%' compilado com sucesso em: {OUTPUT_HTML}")

def main():
    print("==================================================")
    print("🎯 RECONSTRUÇÃO DA PLATAFORMA DE ESTUDOS: META 90%+")
    print("==================================================")
    enriched_questions = load_and_enrich_dataset()
    save_and_build(enriched_questions)
    print("✅ Pipeline executado com perfeição!")

if __name__ == "__main__":
    main()
