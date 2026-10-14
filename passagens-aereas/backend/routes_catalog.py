"""
Catálogo abrangente de Rotas Estratégicas, Aeroportos, Sazonalidade e Benchmarks de Preço.
Foco nas origens: Rio de Janeiro (GIG, SDU, RIO) e São Paulo (GRU, CGH, VCP, SAO)
Destinos: Europa, EUA, Nordeste, Sul e América do Sul.
"""

ORIGINS = {
    "RIO": {
        "code": "RIO",
        "name": "Rio de Janeiro (Todos: GIG + SDU)",
        "city": "Rio de Janeiro",
        "state": "RJ",
        "airports": ["GIG", "SDU"],
        "is_metropolitan": True,
        "description": "Busca conjunta nos dois aeroportos do Rio para maximizar economia."
    },
    "GIG": {
        "code": "GIG",
        "name": "Galeão Intl (Antônio Carlos Jobim)",
        "city": "Rio de Janeiro",
        "state": "RJ",
        "airports": ["GIG"],
        "is_metropolitan": False,
        "transfer_info": "Uber/Táxi Centro: R$ 60-110 (40-75 min). BRT TransCarioca + VLT: R$ 8,60.",
        "description": "Hub principal de voos internacionais e conexões longas no Rio."
    },
    "SDU": {
        "code": "SDU",
        "name": "Santos Dumont (Central)",
        "city": "Rio de Janeiro",
        "state": "RJ",
        "airports": ["SDU"],
        "is_metropolitan": False,
        "transfer_info": "Uber/Táxi Centro/Zona Sul: R$ 15-40 (10-25 min). VLT integrado na porta.",
        "description": "Aeroporto central, ultraconveniente para ponte aérea e voos domésticos."
    },
    "SAO": {
        "code": "SAO",
        "name": "São Paulo (Todos: GRU + CGH + VCP)",
        "city": "São Paulo",
        "state": "SP",
        "airports": ["GRU", "CGH", "VCP"],
        "is_metropolitan": True,
        "description": "Pesquisa unificada em Guarulhos, Congonhas e Viracopos."
    },
    "GRU": {
        "code": "GRU",
        "name": "Guarulhos Intl (Governador André Franco Montoro)",
        "city": "Guarulhos / São Paulo",
        "state": "SP",
        "airports": ["GRU"],
        "is_metropolitan": False,
        "transfer_info": "Uber/Táxi: R$ 90-160 (45-90 min). Trem Expresso Aeroporto (Luz-GRU): R$ 5,00 (35 min).",
        "description": "Maior hub internacional da América Latina com o maior número de rotas diretas."
    },
    "CGH": {
        "code": "CGH",
        "name": "Congonhas (Central)",
        "city": "São Paulo",
        "state": "SP",
        "airports": ["CGH"],
        "is_metropolitan": False,
        "transfer_info": "Uber/Táxi Paulista/Faria Lima: R$ 25-50 (15-35 min). Ônibus SPTrans.",
        "description": "No coração da capital paulista. Foco doméstico e viagens executivas rápidas."
    },
    "VCP": {
        "code": "VCP",
        "name": "Viracopos (Campinas)",
        "city": "Campinas / SP",
        "state": "SP",
        "airports": ["VCP"],
        "is_metropolitan": False,
        "transfer_info": "Ônibus Executivo Gratuito Azul (Barra Funda, Congonhas, Eldorado). Cometa/Lira: R$ 45.",
        "description": "Mega-hub da Azul Linhas Aéreas. Frequentemente tem passagens R$ 250 a R$ 600 mais baratas!"
    }
}

REGIONS = {
    "europa": {
        "id": "europa",
        "name": "Europa",
        "flag": "🇪🇺",
        "badge_color": "#38bdf8",
        "description": "Destinos clássicos e rotas diretas com stopovers estratégicos em Lisboa, Madri e Paris."
    },
    "eua": {
        "id": "eua",
        "name": "Estados Unidos",
        "flag": "🇺🇸",
        "badge_color": "#818cf8",
        "description": "Flórida, Costa Leste e Oeste com hubs competitivos e opções low-cost (FLL/MCO/JFK)."
    },
    "nordeste": {
        "id": "nordeste",
        "name": "Nordeste (Brasil)",
        "flag": "🏖️",
        "badge_color": "#34d399",
        "description": "Praias paradisíacas, capitais históricas e o arquipélago de Fernando de Noronha."
    },
    "sul": {
        "id": "sul",
        "name": "Sul (Brasil)",
        "flag": "🏔️",
        "badge_color": "#a78bfa",
        "description": "Florianópolis, Serras Gaúchas, Cataratas do Iguaçu e capitais com alta frequência de voos."
    },
    "america_do_sul": {
        "id": "america_do_sul",
        "name": "América do Sul",
        "flag": "🌎",
        "badge_color": "#fbbf24",
        "description": "Buenos Aires, Santiago, Deserto do Atacama, Patagônia, Lima e Bogotá sem necessidade de passaporte."
    }
}

DESTINATIONS = [
    # ================= EUROPA =================
    {
        "code": "LIS",
        "name": "Lisboa",
        "country": "Portugal",
        "region": "europa",
        "direct_flights": True,
        "airlines": ["TAP Air Portugal", "LATAM", "Azul (via VCP)"],
        "benchmarks": {"opportunity": 3200, "fair": 4300, "expensive": 6200},
        "alternative_airports": ["OPO"],
        "travel_hack": "A TAP oferece até 10 dias de Stopover gratuito em Lisboa ou Porto na ida ou na volta sem custo adicional de tarifa."
    },
    {
        "code": "OPO",
        "name": "Porto",
        "country": "Portugal",
        "region": "europa",
        "direct_flights": True,
        "airlines": ["TAP Air Portugal"],
        "benchmarks": {"opportunity": 3150, "fair": 4200, "expensive": 6100},
        "alternative_airports": ["LIS"],
        "travel_hack": "Tente voo de ida para o Porto e volta por Lisboa (Open-Jaw) com trem Alfa Pendular entre as cidades por €15-€25."
    },
    {
        "code": "MAD",
        "name": "Madri",
        "country": "Espanha",
        "region": "europa",
        "direct_flights": True,
        "airlines": ["Iberia", "Air Europa", "LATAM"],
        "benchmarks": {"opportunity": 3100, "fair": 4100, "expensive": 5900},
        "alternative_airports": ["BCN"],
        "travel_hack": "A Iberia costuma ter resgates excelentes pelo programa Iberia Plus (Avios) com emissão a partir de 21.250 Avios o trecho."
    },
    {
        "code": "BCN",
        "name": "Barcelona",
        "country": "Espanha",
        "region": "europa",
        "direct_flights": True,
        "airlines": ["LATAM", "Iberia", "Air Europa"],
        "benchmarks": {"opportunity": 3300, "fair": 4400, "expensive": 6400},
        "alternative_airports": ["MAD"],
        "travel_hack": "Voar para Madri e pegar o trem de alta velocidade (Iryo / Ouigo / Renfe) por apenas €9 a €25 frequentemente economiza mais de R$ 900 na passagem."
    },
    {
        "code": "CDG",
        "name": "Paris (Charles de Gaulle)",
        "country": "França",
        "region": "europa",
        "direct_flights": True,
        "airlines": ["Air France", "LATAM"],
        "benchmarks": {"opportunity": 3500, "fair": 4800, "expensive": 6900},
        "alternative_airports": ["ORY", "BVA"],
        "travel_hack": "Confira voos da Air France com conexão ou conexões via Lisboa/Madri. Aeroporto Orly (ORY) costuma ser mais rápido para chegar ao centro via metrô Linha 14."
    },
    {
        "code": "LHR",
        "name": "Londres (Heathrow)",
        "country": "Reino Unido",
        "region": "europa",
        "direct_flights": True,
        "airlines": ["British Airways", "LATAM", "Virgin Atlantic"],
        "benchmarks": {"opportunity": 3600, "fair": 4900, "expensive": 7100},
        "alternative_airports": ["LGW", "STN"],
        "travel_hack": "As taxas de embarque de Heathrow (LHR) são as mais caras da Europa. Emitir a volta saindo de Paris, Amsterdã ou Dublin reduz até R$ 800 em taxas."
    },
    {
        "code": "FCO",
        "name": "Roma (Fiumicino)",
        "country": "Itália",
        "region": "europa",
        "direct_flights": True,
        "airlines": ["ITA Airways", "LATAM"],
        "benchmarks": {"opportunity": 3400, "fair": 4600, "expensive": 6600},
        "alternative_airports": ["MXP"],
        "travel_hack": "Verifique se a tarifa para Milão (MXP) está mais barata: o trem Frecciarossa liga Milão a Roma em apenas 3h por cerca de €30."
    },
    {
        "code": "FRA",
        "name": "Frankfurt",
        "country": "Alemanha",
        "region": "europa",
        "direct_flights": True,
        "airlines": ["Lufthansa", "LATAM"],
        "benchmarks": {"opportunity": 3800, "fair": 5100, "expensive": 7300},
        "alternative_airports": ["MUC", "BER"],
        "travel_hack": "Lufthansa oferece o 'Rail&Fly' que inclui passagem de trem ICE por toda a Alemanha integrada ao bilhete aéreo por taxa mínima."
    },
    {
        "code": "AMS",
        "name": "Amsterdã",
        "country": "Holanda",
        "region": "europa",
        "direct_flights": True,
        "airlines": ["KLM"],
        "benchmarks": {"opportunity": 3700, "fair": 5000, "expensive": 7200},
        "alternative_airports": ["BRU", "DUS"],
        "travel_hack": "O aeroporto de Bruxelas (BRU) fica a apenas 1h45 de trem de Amsterdã e frequentemente tem voos até 25% mais em conta."
    },

    # ================= ESTADOS UNIDOS =================
    {
        "code": "MIA",
        "name": "Miami",
        "country": "EUA",
        "region": "eua",
        "direct_flights": True,
        "airlines": ["American Airlines", "LATAM", "GOL", "Avianca", "Copa"],
        "benchmarks": {"opportunity": 2500, "fair": 3600, "expensive": 5300},
        "alternative_airports": ["FLL", "PBI"],
        "travel_hack": "Fort Lauderdale (FLL) fica a apenas 35 minutos de Miami via trem Brightline ou Uber e as taxas aeroportuárias são menores."
    },
    {
        "code": "FLL",
        "name": "Fort Lauderdale (Flórida)",
        "country": "EUA",
        "region": "eua",
        "direct_flights": True,
        "airlines": ["Azul (via VCP/CNF)", "Copa", "Avianca"],
        "benchmarks": {"opportunity": 2350, "fair": 3300, "expensive": 4900},
        "alternative_airports": ["MIA"],
        "travel_hack": "A Azul opera voo direto de Viracopos (VCP) para FLL com excelente pontualidade e imigração muito mais rápida do que em Miami."
    },
    {
        "code": "MCO",
        "name": "Orlando",
        "country": "EUA",
        "region": "eua",
        "direct_flights": True,
        "airlines": ["LATAM", "GOL", "Azul", "Delta", "Copa"],
        "benchmarks": {"opportunity": 2600, "fair": 3800, "expensive": 5500},
        "alternative_airports": ["TPA", "MIA"],
        "travel_hack": "Para quem vai alugar carro na Flórida, chegue por Miami (MIA) e volte por Orlando (MCO). Não há taxa de devolução de carro entre as duas cidades na maioria das locadoras."
    },
    {
        "code": "JFK",
        "name": "Nova York (JFK)",
        "country": "EUA",
        "region": "eua",
        "direct_flights": True,
        "airlines": ["Delta", "American Airlines", "LATAM", "United"],
        "benchmarks": {"opportunity": 2900, "fair": 4200, "expensive": 6200},
        "alternative_airports": ["EWR", "LGA"],
        "travel_hack": "Busque por NYC (All Airports). Newark (EWR) tem voos da United com trem direto até a Penn Station em Manhattan em 25 minutos."
    },
    {
        "code": "BOS",
        "name": "Boston",
        "country": "EUA",
        "region": "eua",
        "direct_flights": True,
        "airlines": ["LATAM", "Delta", "Copa", "Avianca"],
        "benchmarks": {"opportunity": 2800, "fair": 3950, "expensive": 5800},
        "alternative_airports": ["JFK", "PVD"],
        "travel_hack": "O aeroporto de Boston (Logan) tem ônibus gratuito (Silver Line) diretamente para o metrô central de Boston."
    },
    {
        "code": "LAX",
        "name": "Los Angeles",
        "country": "EUA",
        "region": "eua",
        "direct_flights": True,
        "airlines": ["LATAM", "American", "United", "Delta", "Copa"],
        "benchmarks": {"opportunity": 3100, "fair": 4400, "expensive": 6400},
        "alternative_airports": ["BUR", "ONT", "SNA"],
        "travel_hack": "A LATAM opera voo direto GRU-LAX. Compare também com escala na Cidade do Panamá (Copa) que inclui 2 bagagens despachadas em certas tarifas."
    },

    # ================= NORDESTE =================
    {
        "code": "SSA",
        "name": "Salvador",
        "country": "Brasil",
        "region": "nordeste",
        "direct_flights": True,
        "airlines": ["GOL", "LATAM", "Azul"],
        "benchmarks": {"opportunity": 490, "fair": 820, "expensive": 1350},
        "alternative_airports": ["BPS", "IOS", "AJU"],
        "travel_hack": "Voos de terça e quarta-feira à noite costumam ter as tarifas promocionais mais agressivas das 3 grandes companhias."
    },
    {
        "code": "REC",
        "name": "Recife",
        "country": "Brasil",
        "region": "nordeste",
        "direct_flights": True,
        "airlines": ["Azul (Hub)", "GOL", "LATAM"],
        "benchmarks": {"opportunity": 550, "fair": 890, "expensive": 1450},
        "alternative_airports": ["JPA", "MCZ"],
        "travel_hack": "Recife é o principal hub da Azul no Nordeste. Fique atento a promoções relâmpago de pontos Azul nos finais de semana."
    },
    {
        "code": "FOR",
        "name": "Fortaleza",
        "country": "Brasil",
        "region": "nordeste",
        "direct_flights": True,
        "airlines": ["LATAM (Hub)", "GOL", "Azul"],
        "benchmarks": {"opportunity": 590, "fair": 950, "expensive": 1550},
        "alternative_airports": ["NAT", "JJD"],
        "travel_hack": "Fortaleza é hub da LATAM. Voos de madrugada têm até 40% de desconto. Jericoacoara (JJD) às vezes sai mais barato via conexão em FOR."
    },
    {
        "code": "NAT",
        "name": "Natal",
        "country": "Brasil",
        "region": "nordeste",
        "direct_flights": True,
        "airlines": ["GOL", "LATAM", "Azul"],
        "benchmarks": {"opportunity": 580, "fair": 920, "expensive": 1500},
        "alternative_airports": ["JPA", "REC"],
        "travel_hack": "João Pessoa (JPA) fica a apenas 2h de carro/transfer de Natal e muitas vezes tem tarifas R$ 200 a R$ 350 mais baratas."
    },
    {
        "code": "MCZ",
        "name": "Maceió",
        "country": "Brasil",
        "region": "nordeste",
        "direct_flights": True,
        "airlines": ["GOL", "LATAM", "Azul"],
        "benchmarks": {"opportunity": 540, "fair": 880, "expensive": 1400},
        "alternative_airports": ["REC", "AJU"],
        "travel_hack": "Para conhecer Maragogi, vale comparar voos para Recife e Maceió. Recife costuma ter tarifas mais baratas e fica à mesma distância de Maragogi."
    },
    {
        "code": "BPS",
        "name": "Porto Seguro / Arraial d'Ajuda",
        "country": "Brasil",
        "region": "nordeste",
        "direct_flights": True,
        "airlines": ["GOL", "LATAM", "Azul"],
        "benchmarks": {"opportunity": 520, "fair": 850, "expensive": 1450},
        "alternative_airports": ["IOS", "SSA"],
        "travel_hack": "Saindo de SP, confira voos saindo de Viracopos (VCP) pela Azul e de Congonhas (CGH) pela GOL para evitar trânsito de GRU."
    },
    {
        "code": "FEN",
        "name": "Fernando de Noronha",
        "country": "Brasil",
        "region": "nordeste",
        "direct_flights": False,
        "airlines": ["Azul", "GOL (via REC/FOR)"],
        "benchmarks": {"opportunity": 1300, "fair": 1950, "expensive": 2900},
        "alternative_airports": ["REC", "NAT"],
        "travel_hack": "Compre o trecho SP/Rio -> Recife separado em promoção e emita o trecho Recife -> Noronha com milhas Smiles ou TudoAzul para economizar até 50%."
    },

    # ================= SUL =================
    {
        "code": "FLN",
        "name": "Florianópolis",
        "country": "Brasil",
        "region": "sul",
        "direct_flights": True,
        "airlines": ["GOL", "LATAM", "Azul"],
        "benchmarks": {"opportunity": 380, "fair": 620, "expensive": 1100},
        "alternative_airports": ["NVT", "JJG"],
        "travel_hack": "Se o seu destino for o norte da ilha ou Balneário Camboriú, compare com o aeroporto de Navegantes (NVT)."
    },
    {
        "code": "NVT",
        "name": "Navegantes (Balneário Camboriú / Beto Carrero)",
        "country": "Brasil",
        "region": "sul",
        "direct_flights": True,
        "airlines": ["GOL", "LATAM", "Azul"],
        "benchmarks": {"opportunity": 360, "fair": 590, "expensive": 1050},
        "alternative_airports": ["FLN", "JOI"],
        "travel_hack": "Navegantes fica a 20 minutos do Beto Carrero World e 30 minutos de Balneário Camboriú. Uber custa cerca de R$ 40-60."
    },
    {
        "code": "CWB",
        "name": "Curitiba",
        "country": "Brasil",
        "region": "sul",
        "direct_flights": True,
        "airlines": ["GOL", "LATAM", "Azul"],
        "benchmarks": {"opportunity": 310, "fair": 520, "expensive": 920},
        "alternative_airports": ["JOI"],
        "travel_hack": "Ponte aérea rápida de Congonhas (CGH) e Santos Dumont (SDU). Reserve com 21 a 35 dias de antecedência para as melhores tarifas."
    },
    {
        "code": "POA",
        "name": "Porto Alegre",
        "country": "Brasil",
        "region": "sul",
        "direct_flights": True,
        "airlines": ["GOL", "LATAM", "Azul"],
        "benchmarks": {"opportunity": 420, "fair": 690, "expensive": 1200},
        "alternative_airports": ["CXJ"],
        "travel_hack": "Para Gramado e Canela, confira o aeroporto de Caxias do Sul (CXJ), que fica a apenas 1h15 da Serra Gaúcha."
    },
    {
        "code": "IGU",
        "name": "Foz do Iguaçu",
        "country": "Brasil",
        "region": "sul",
        "direct_flights": True,
        "airlines": ["GOL", "LATAM", "Azul"],
        "benchmarks": {"opportunity": 450, "fair": 720, "expensive": 1280},
        "alternative_airports": ["AGT"],
        "travel_hack": "Foz do Iguaçu tem voos diretos de GIG, SDU, GRU, CGH e VCP. Alta concorrência gera promoções frequentes de 'madrugadão'."
    },

    # ================= AMÉRICA DO SUL =================
    {
        "code": "AEP",
        "name": "Buenos Aires (Aeroparque - Central)",
        "country": "Argentina",
        "region": "america_do_sul",
        "direct_flights": True,
        "airlines": ["Aerolíneas Argentinas", "GOL", "LATAM", "Flybondi"],
        "benchmarks": {"opportunity": 1150, "fair": 1750, "expensive": 2600},
        "alternative_airports": ["EZE"],
        "travel_hack": "PRIORIZE O AEROPARQUE (AEP): fica dentro de Palermo, táxi custa R$ 25-40 (15 min). Ezeiza (EZE) fica a 1h30 e o táxi custa R$ 140+."
    },
    {
        "code": "EZE",
        "name": "Buenos Aires (Ezeiza Intl)",
        "country": "Argentina",
        "region": "america_do_sul",
        "direct_flights": True,
        "airlines": ["GOL", "LATAM", "Flybondi", "JetSMART"],
        "benchmarks": {"opportunity": 1050, "fair": 1600, "expensive": 2400},
        "alternative_airports": ["AEP"],
        "travel_hack": "Flybondi e JetSMART costumam ter tarifas ultrabaixas para Ezeiza. Se a economia for superior a R$ 250, compensa pegar o transfer."
    },
    {
        "code": "SCL",
        "name": "Santiago",
        "country": "Chile",
        "region": "america_do_sul",
        "direct_flights": True,
        "airlines": ["LATAM", "SKY Airline", "JetSMART"],
        "benchmarks": {"opportunity": 1100, "fair": 1650, "expensive": 2500},
        "alternative_airports": [],
        "travel_hack": "As ultra low-costs SKY e JetSMART operam voos diretos saindo de GIG e GRU. Fique atento às taxas de bagagem de mão se optar pela tarifa básica."
    },
    {
        "code": "MVD",
        "name": "Montevidéu",
        "country": "Uruguai",
        "region": "america_do_sul",
        "direct_flights": True,
        "airlines": ["GOL", "LATAM", "Azul"],
        "benchmarks": {"opportunity": 1250, "fair": 1850, "expensive": 2700},
        "alternative_airports": ["PDP"],
        "travel_hack": "No verão, a Azul opera voos diretos para Punta del Este (PDP) de Campinas (VCP) e Congonhas."
    },
    {
        "code": "LIM",
        "name": "Lima",
        "country": "Peru",
        "region": "america_do_sul",
        "direct_flights": True,
        "airlines": ["LATAM", "SKY Airline"],
        "benchmarks": {"opportunity": 1400, "fair": 2100, "expensive": 3200},
        "alternative_airports": [],
        "travel_hack": "Para ir a Machu Picchu, compre bilhete com destino final Cusco (CUZ) pela LATAM com conexão em Lima, sai mais barato do que comprar trechos separados."
    },
    {
        "code": "BOG",
        "name": "Bogotá",
        "country": "Colômbia",
        "region": "america_do_sul",
        "direct_flights": True,
        "airlines": ["Avianca", "GOL", "LATAM"],
        "benchmarks": {"opportunity": 1500, "fair": 2300, "expensive": 3400},
        "alternative_airports": ["MDE"],
        "travel_hack": "A Avianca oferece conexões baratas para Cartagena e San Andrés a partir de Bogotá, com opção de stopover na capital."
    },
    {
        "code": "BRC",
        "name": "Bariloche (Patagônia)",
        "country": "Argentina",
        "region": "america_do_sul",
        "direct_flights": True,
        "airlines": ["Aerolíneas Argentinas", "GOL", "LATAM (via AEP)"],
        "benchmarks": {"opportunity": 1800, "fair": 2600, "expensive": 3900},
        "alternative_airports": ["MDZ"],
        "travel_hack": "Na temporada de neve (julho/agosto) há voos charters diretos de SP e Rio. Fora da alta temporada, a conexão em AEP tem preços excelentes."
    }
]

SEASONALITY_GUIDE = {
    "europa": {
        "best_booking_advance": "60 a 120 dias antes da viagem",
        "cheapest_days": "Terças, Quartas e Sábados",
        "expensive_days": "Sextas e Domingos",
        "low_season": "Novembro a Março (exceto Natal/Réveillon)",
        "shoulder_season": "Abril a Maio / Setembro a Outubro (Melhor época: clima ótimo e preços justos)",
        "high_season": "Fim de Junho a Agosto (Verão europeu) e Dezembro",
        "tips": "Para voar em julho, compre obrigatoriamente entre janeiro e março. Monitore stopovers gratuitos na TAP (Lisboa) e Iberia (Madri)."
    },
    "eua": {
        "best_booking_advance": "45 a 90 dias antes da viagem",
        "cheapest_days": "Terças, Quartas e Quintas",
        "expensive_days": "Sextas, Domingos e Segundas de manhã",
        "low_season": "Fevereiro a Maio (exceto Spring Break) e Setembro a Novembro (exceto Thanksgiving)",
        "shoulder_season": "Abril e Outubro",
        "high_season": "Julho, Dezembro e primeira quinzena de Janeiro",
        "tips": "Fort Lauderdale (FLL) é consistentemente 15-25% mais barato que Miami (MIA). Verifique Newark (EWR) para Nova York."
    },
    "nordeste": {
        "best_booking_advance": "25 a 45 dias antes da viagem",
        "cheapest_days": "Terças e Quartas à noite / Sábado à tarde",
        "expensive_days": "Quinta à noite, Sexta o dia todo e Domingo à noite",
        "low_season": "Março a Junho (exceto Semana Santa/Tiradentes) e Agosto a Outubro",
        "shoulder_season": "Setembro a Novembro (Excelente clima e mar cristalino)",
        "high_season": "Réveillon, Janeiro e Carnaval",
        "tips": "Madrugadões das companhias (GOL e LATAM das 20h de sexta até 08h de segunda) frequentemente queimam assentos para o Nordeste."
    },
    "sul": {
        "best_booking_advance": "20 a 40 dias antes da viagem",
        "cheapest_days": "Terças, Quartas e Sábados",
        "expensive_days": "Sexta final de tarde e Domingo à noite",
        "low_season": "Março a Junho e Setembro a Novembro (para litoral)",
        "shoulder_season": "Primavera e Outono",
        "high_season": "Verão (praias em Floripa/Balneário) e Inverno (Julho na Serra Gaúcha)",
        "tips": "Para Gramado, monitore tanto Porto Alegre (POA) quanto Caxias do Sul (CXJ). Para praias, compare Florianópolis (FLN) com Navegantes (NVT)."
    },
    "america_do_sul": {
        "best_booking_advance": "30 a 60 dias antes da viagem",
        "cheapest_days": "Terças, Quartas e Quintas",
        "expensive_days": "Sextas e Domingos",
        "low_season": "Março a Junho (exceto feriados) e Agosto a Novembro",
        "shoulder_season": "Abril a Maio e Outubro a Novembro",
        "high_season": "Julho/Agosto (Neve em Bariloche/Valle Nevado) e Réveillon/Janeiro",
        "tips": "Entrada permitida apenas com RG recente em bom estado (menos de 10 anos). Aeroparque (AEP) em Buenos Aires economiza horas e dinheiro de táxi."
    }
}

ALTERNATIVE_AIRPORTS_MATRIX = [
    {
        "cluster": "São Paulo (Metrópole)",
        "airports": [
            {
                "code": "CGH",
                "name": "Congonhas",
                "location": "Zona Sul de SP (Central)",
                "transfer_cost_estimate": "R$ 25 - R$ 50 (Uber) / R$ 5,00 (Metrô/Ônibus)",
                "transfer_time": "15 a 35 min",
                "convenience_score": 10,
                "notes": "Máxima conveniência executiva, sem voos internacionais."
            },
            {
                "code": "GRU",
                "name": "Guarulhos Intl",
                "location": "Guarulhos (28 km do centro)",
                "transfer_cost_estimate": "R$ 90 - R$ 160 (Uber) / R$ 5,00 (Trem Expresso Luz)",
                "transfer_time": "45 a 90 min (trânsito pesado na Marginal)",
                "convenience_score": 7,
                "notes": "Maior oferta de voos e companhias internacionais."
            },
            {
                "code": "VCP",
                "name": "Viracopos (Campinas)",
                "location": "Campinas (95 km de SP)",
                "transfer_cost_estimate": "R$ 0,00 (Ônibus gratuito da Azul) / R$ 45 (Lira Bus)",
                "transfer_time": "1h20 a 2h00",
                "convenience_score": 6,
                "notes": "Passagens frequentemente R$ 250 a R$ 600 mais baratas! A Azul oferece ônibus gratuito com Wi-Fi saindo de Congonhas, Barra Funda e Shopping Eldorado."
            }
        ]
    },
    {
        "cluster": "Rio de Janeiro (Metrópole)",
        "airports": [
            {
                "code": "SDU",
                "name": "Santos Dumont",
                "location": "Centro / Baía de Guanabara",
                "transfer_cost_estimate": "R$ 15 - R$ 35 (Uber) / R$ 4,30 (VLT Carioca)",
                "transfer_time": "10 a 25 min da Zona Sul/Centro",
                "convenience_score": 10,
                "notes": "Visual deslumbrante e embarque rápido. Foco na ponte aérea e rotas nacionais."
            },
            {
                "code": "GIG",
                "name": "Galeão Intl",
                "location": "Ilha do Governador (20 km do centro)",
                "transfer_cost_estimate": "R$ 60 - R$ 110 (Uber) / R$ 8,60 (BRT + VLT)",
                "transfer_time": "40 a 75 min (Linha Vermelha)",
                "convenience_score": 7,
                "notes": "Todos os voos de longo curso (Europa/EUA) e forte presença da GOL e LATAM."
            }
        ]
    },
    {
        "cluster": "Buenos Aires (Argentina)",
        "airports": [
            {
                "code": "AEP",
                "name": "Aeroparque Jorge Newbery",
                "location": "Costanera Norte / Palermo (Central)",
                "transfer_cost_estimate": "R$ 25 - R$ 40 (Táxi/Uber) / R$ 3,00 (Colectivo)",
                "transfer_time": "15 a 25 min",
                "convenience_score": 10,
                "notes": "RECOMENDADO: você desembarca quase dentro do seu hotel em Palermo ou Recoleta."
            },
            {
                "code": "EZE",
                "name": "Ezeiza Intl",
                "location": "Ezeiza (35 km da capital)",
                "transfer_cost_estimate": "R$ 130 - R$ 180 (Remis/Uber) / R$ 45 (Tienda León)",
                "transfer_time": "50 a 100 min",
                "convenience_score": 6,
                "notes": "Só vale a pena se a passagem for no mínimo R$ 250 mais barata que para o Aeroparque."
            }
        ]
    },
    {
        "cluster": "Sul da Flórida (EUA)",
        "airports": [
            {
                "code": "MIA",
                "name": "Miami Intl",
                "location": "Miami-Dade",
                "transfer_cost_estimate": "R$ 110 - R$ 180 (Uber US$ 20-35)",
                "transfer_time": "20 a 35 min para South Beach / Brickell",
                "convenience_score": 8,
                "notes": "Imigração pode ser demorada em horários de pico de voos latinos."
            },
            {
                "code": "FLL",
                "name": "Fort Lauderdale-Hollywood",
                "location": "Broward County (35 km ao norte de Miami)",
                "transfer_cost_estimate": "R$ 180 - R$ 250 (Uber US$ 35-48) ou Trem Brightline",
                "transfer_time": "35 a 55 min",
                "convenience_score": 8,
                "notes": "Aeroporto mais calmo, imigração ágil e passagens da Azul / Copa frequentemente R$ 400 a R$ 800 mais baratas."
            }
        ]
    },
    {
        "cluster": "Nova York (EUA)",
        "airports": [
            {
                "code": "JFK",
                "name": "John F. Kennedy Intl",
                "location": "Queens (26 km de Manhattan)",
                "transfer_cost_estimate": "AirTrain + Metrô: US$ 11 (R$ 60) | Uber: US$ 75-110",
                "transfer_time": "50 a 80 min",
                "convenience_score": 8,
                "notes": "Mais voos diretos do Brasil (Delta, American, LATAM)."
            },
            {
                "code": "EWR",
                "name": "Newark Liberty Intl",
                "location": "New Jersey (24 km de Manhattan)",
                "transfer_cost_estimate": "AirTrain + NJ Transit: US$ 15 (R$ 82) direto para Penn Station",
                "transfer_time": "35 a 55 min",
                "convenience_score": 8,
                "notes": "Hub da United. Acesso de trem à Penn Station em Manhattan é mais rápido do que de JFK!"
            },
            {
                "code": "LGA",
                "name": "LaGuardia",
                "location": "Queens (13 km de Midtown)",
                "transfer_cost_estimate": "Ônibus Q70 SBS gratuito + Metrô US$ 2.90 | Uber: US$ 45-70",
                "transfer_time": "30 a 50 min",
                "convenience_score": 9,
                "notes": "Aeroporto reformado e ultra moderno. Apenas voos domésticos e conexões internas nos EUA."
            }
        ]
    }
]
