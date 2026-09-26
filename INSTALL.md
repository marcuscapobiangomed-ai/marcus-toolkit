# Marcus Toolkit - Installation Guide

Este toolkit contém agentes, skills e ferramentas customizadas para Claude Code.

## 📦 O que está incluído

- **agents/** - Agentes especializados para diferentes roles (marketing, design, engineering, etc)
- **skills/** - Skills personalizadas com funcionalidades estendidas
- **claude-skills/** - Skills integradas com Claude

## 🚀 Instalação Rápida

### Método 1: Usar o script de instalação

```bash
bash /Users/user/Documents/Tool-Kit/install.sh /caminho/para/seu/projeto
```

**Exemplos:**
```bash
# Instalar em um projeto local
bash install.sh ~/projects/meu-app

# Instalar no diretório atual
bash install.sh .

# Instalar em um projeto específico
bash install.sh /Users/user/Documents/meu-projeto
```

### Método 2: Instalação manual

```bash
cd seu-projeto

# Criar estrutura de diretórios
mkdir -p .claude/{agents,skills,claude-skills}

# Copiar arquivos
cp -r /Users/user/Documents/Tool-Kit/agents/* .claude/agents/
cp -r /Users/user/Documents/Tool-Kit/skills/* .claude/skills/
cp -r /Users/user/Documents/Tool-Kit/claude-skills/* .claude/claude-skills/
```

## 📋 Agentes Disponíveis

O toolkit inclui os seguintes agentes:

- **Design**: Brand Guardian, UI Designer, UX Architect, Visual Storyteller, Inclusive Visuals
- **Marketing**: Social Media Strategist, SEO Specialist, Content Creator, Email Strategist, Growth Hacker, PR Manager
- **Sales**: Outbound Strategist, Offer Lead-Gen, Sales Coach
- **Product**: Feedback Synthesizer, Trend Researcher
- **Engineering**: Rapid Prototyper
- **Paid Media**: PPC Strategist, Creative Strategist

## 💡 Como usar

Após instalar, você pode usar os agentes no Claude Code digitando:

```
/agent Brand Guardian
/agent SEO Specialist
/agent UI Designer
```

Ou usando o comando slash para invocar skills:

```
/impeccable
/ponytail
/headroom
```

## 📁 Estrutura do Projeto

Após a instalação, seu projeto terá:

```
seu-projeto/
├── .claude/
│   ├── agents/
│   │   ├── design-brand-guardian.md
│   │   ├── marketing-seo-specialist.md
│   │   └── ... (outros agentes)
│   ├── skills/
│   │   ├── impeccable/
│   │   ├── ponytail/
│   │   └── ... (outras skills)
│   └── claude-skills/
│       ├── build.md
│       ├── review.md
│       └── spec.md
├── src/
├── package.json
└── ... (resto do projeto)
```

## ⚙️ Configuração

Para customizar ou ver mais detalhes sobre cada skill, abra:

- `.claude/skills/[skill-name]/SKILL.md` - Documentação completa da skill
- `.claude/agents/[agent-name].md` - Definição e comportamento do agente

## ✅ Verificação de Instalação

Para verificar se a instalação funcionou:

```bash
cd seu-projeto
ls -la .claude/agents/ | head -5
ls -la .claude/skills/
```

Você deve ver os arquivos do toolkit listados.

## 🤝 Suporte

Para mais informações, consulte o repositório:
https://github.com/marcuscapobiangomed-ai/marcus-toolkit

---

Desenvolvido com ❤️ por Marcus Capobianco
