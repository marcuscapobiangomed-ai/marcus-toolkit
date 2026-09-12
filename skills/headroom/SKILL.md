# Headroom: Token Compression for LLMs

## O que é

**Headroom** é um compressor inteligente de outputs, logs, arquivos e chunks RAG **antes** de enviar pro LLM. Reduz 47–92% de tokens mantendo >97% de acurácia através de compressão semântica (não truncagem cega).

Repo: https://github.com/headroomlabs-ai/headroom

---

## Para que serve

| Caso | Economia | Quando usar |
|------|----------|-------------|
| **Busca de código** | 92% tokens | RAG retorna código-fonte grande |
| **Depuração/Logs** | 92% tokens | Enviar stack traces, logs completos pro LLM |
| **Exploração de repo** | 47% tokens | LLM navega estrutura de projeto |
| **JSON arrays** | 70–95% tokens | APIs retornam dados estruturados grandes |

---

## Como funciona

### Mecanismo
1. **ContentRouter** detecta tipo automaticamente (JSON, código, logs, texto)
2. **Compressor específico** é aplicado:
   - `SmartCrusher` → JSON (preserva chaves, estrutura)
   - `CodeAwareCompressor` → Código (preserva assinaturas, imports)
   - `LogCompressor` → Logs (preserva timestamps, traces)
   - `Kompress` (ML-based) → Fallback para conteúdo diverso

3. **Envio ao LLM** com overhead mínimo (~1–10ms)

### Modo Cache (Padrão)
- Comprime apenas **delta novo** (turnos recentes)
- Mantém **prefixo anterior congelado** → preserva prefix-cache do Anthropic
- **Protege investimento** em cache custoso

---

## Compatibilidade

✅ **Multi-provider agnóstico:**
- Anthropic (`/v1/messages`)
- OpenAI (`/v1/chat/completions`)
- Google Gemini
- AWS Bedrock
- Azure OpenAI
- Vertex AI
- OpenRouter (400+ modelos)

---

## Quando usar no PROJETO ALINE

### ✅ Faz sentido SE:
- [ ] Painel envia **RAG com código-fonte** grandes pro LLM (agents/search)
- [ ] Custo mensal de tokens > $500
- [ ] Latência de requisição > 1.5s
- [ ] Context window está perto do limite

### ❌ Não faz sentido SE:
- Painel está rápido e custo é aceitável
- Não há gargalo de tokens identificado
- RAG retorna resultados pequenos (<5k tokens)

---

## Trade-offs

| Aspecto | Status |
|--------|--------|
| **Acurácia** | ✅ 87.6% economia, 4/4 respostas corretas (caso real) |
| **Latência** | ✅ Mínima: 1–10ms overhead |
| **Cache** | ✅ Modo cache preserva prefix-cache do provider |
| **Configuração** | ✅ Automática (detecta tipo de conteúdo) |
| **Custo** | ⚠️ Processamento local (ou offload remoto se necessário) |

---

## Como avaliar se precisa

### Checklist
```
1. Profile o painel:
   - Custo mensal em tokens? _____ USD
   - Latência média de requisição? _____ ms
   - Tamanho médio de RAG chunk? _____ tokens
   
2. Tem gargalo?
   - Se custo > $500/mês → investigar compressão
   - Se latência > 1.5s → pode ajudar
   - Se RAG > 50k tokens → candidato forte
   
3. Vale o POC?
   - Setup: ~1 dia
   - Benchmark: 1–2 dias
   - Decisão: com dados reais
```

---

## Próximos passos (se decidir investigar)

1. **Perfil** → Coleta dados de custo e latência atuais
2. **POC** → Setup headroom em ambiente staging
3. **Benchmark** → Compara economia vs latência
4. **Deploy** → Se ROI positivo, leva pra produção (modo cache, Anthropic preferencial)

---

## Links

- **GitHub:** https://github.com/headroomlabs-ai/headroom
- **Docs:** https://headroom.sh/docs
- **Python package:** `pip install headroom-sdk`
- **Node.js package:** `npm install @headroomlabs/headroom`

---

## Referência: Parecer Lazy (Ponytail)

**Não instale produção até ter dados reais.** Headroom é uma otimização — só faz sentido com problema comprovado (custo alto, latência ruim, ou context window apertado).

Quando tiver esses dados, POC é rápido e a decisão fica óbvia.
