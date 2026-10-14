# ✈️ AERO-HUNTER: Radar Soberano de Passagens & Travel Hacking

Sistema inteligente de busca, monitoramento e precificação estratégica de voos com saídas do **Rio de Janeiro** (GIG, SDU) e **São Paulo** (GRU, CGH, VCP) para:
- 🇪🇺 **Europa** (Lisboa, Porto, Madri, Barcelona, Paris, Londres, Roma, Frankfurt, Amsterdã...)
- 🇺🇸 **Estados Unidos** (Miami, Fort Lauderdale, Orlando, Nova York JFK, Newark, Boston, Los Angeles...)
- 🏖️ **Nordeste (Brasil)** (Salvador, Recife, Fortaleza, Natal, Maceió, Porto Seguro, Fernando de Noronha...)
- 🏔️ **Sul (Brasil)** (Florianópolis, Navegantes, Curitiba, Porto Alegre, Foz do Iguaçu...)
- 🌎 **América do Sul** (Buenos Aires Aeroparque/Ezeiza, Santiago, Montevidéu, Lima, Bogotá, Bariloche...)

---

## 🌟 Principais Recursos

1. **Geração Instantânea de Deep Links com 1 Clique:**
   - **Google Flights:** URL pré-configurada em Reais (BRL), português, datas e aeroportos exatos.
   - **Skyscanner:** deep links com aeroportos próximos ativados para capturar quedas repentinas.
   - **Kayak:** ordenação automática por melhor custo-benefício.
   - **Google Flights Explore:** mapa geral de preços para o continente/região inteira.

2. **Central Travel Hacker Integrada (Os 5 Prompts Estratégicos):**
   - **Prompt #1: Ofertas Ocultas** (Tarifas escondidas, skiplagging, conexões táticas e open-jaw).
   - **Prompt #2: Alertas Inteligentes** (Gatilhos de compra BUG FARE vs Alerta vs Espera).
   - **Prompt #3: Datas Estratégicas** (Matriz de dias mais baratos: terças/quartas vs finais de semana).
   - **Prompt #4: Insider Secrets** (Truques de ex-funcionário: stopover gratuito, emissões em milhas de alianças internacionais e moeda local).
   - **Prompt #5: Aeroportos Alternativos** (Comparativo de tarifas + custo do transporte terrestre + tempo extra).
   - *Cópia instantânea dos prompts em Português e Inglês para usar com qualquer IA.*

3. **Matriz de Aeroportos Alternativos & Calculadora de Viabilidade Financeira:**
   - Simulação de voar por Viracopos (VCP) vs Guarulhos (GRU) vs Congonhas (CGH).
   - Galeão (GIG) vs Santos Dumont (SDU).
   - Aeroparque (AEP) vs Ezeiza (EZE).
   - Miami (MIA) vs Fort Lauderdale (FLL).
   - Calculadora que subtrai o custo do Uber/ônibus e tempo para dar o **Saldo Líquido Real**.

4. **Monitoramento e Persistência com SQLite:**
   - Salva rotas monitoradas no banco local `passagens.db`.
   - Background worker que atualiza cotações periodicamente.
   - Histórico de preços e detecção de promoções relâmpago.

---

## 🚀 Como Executar

O servidor roda localmente via Flask na porta **5055**:

```bash
# 1. Ativar o ambiente virtual (já configurado no Tool-Kit)
source ../.venv/bin/activate

# 2. Iniciar o servidor
python backend/app.py
```

Acesse no seu navegador: **`http://localhost:5055`**
