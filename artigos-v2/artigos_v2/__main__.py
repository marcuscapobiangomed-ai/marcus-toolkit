"""CLI do Artigos v2.

  python -m artigos_v2 exemplo-pedido pedido.json      # gera um pedido de exemplo
  python -m artigos_v2 gerar pedido.json [--auditar]   # roda o pipeline e exporta o .docx
  python -m artigos_v2 retomar <id>                    # continua de onde parou
  python -m artigos_v2 revisar <id> triagem.csv        # decisões de seleção revisadas pelos autores
  python -m artigos_v2 exportar <id>                   # reexporta o .docx sem gastar IA
  python -m artigos_v2 painel [--porta 8765]           # painel de gastos
  python -m artigos_v2 auditar artigo.docx [--com-ia]  # skills rodadas por fora do sistema
  python -m artigos_v2 modelos                         # confere a escada contra o OmniRoute
  python -m artigos_v2 custos                          # resumo de gastos no terminal
"""

from __future__ import annotations

import argparse
import json
import sys
from dataclasses import asdict
from pathlib import Path

from .config import carregar_config
from .ledger import Ledger
from .llm import ClienteOmniRoute


def _contexto(args):
    config = carregar_config(args.escada)
    ledger = Ledger(config.dir_dados / "artigos.db")
    return config, ledger, ClienteOmniRoute(config, ledger)


def cmd_exemplo(args):
    from .pipeline import Pedido

    pedido = Pedido(
        tema="Rastreamento e manejo da hipertensão arterial na Atenção Primária à Saúde no Brasil",
        autores=["Nome do Aluno"], orientador="Prof(a). Nome do Orientador", instituicao="Universidade",
        observacoes="Foco em estratégias da APS/ESF; população adulta.",
        contribuicao_autores={
            "triagem": "dois autores, de forma independente, revisaram todas as decisões de título e resumo",
            "divergencias": "resolvidas por consenso com o orientador",
            "leitura_integra": "os artigos elegíveis foram lidos na íntegra pelos autores",
            "extracao": "dois autores extraíram os dados, com conferência cruzada",
            "busca_manual": "",
            "redacao": "texto redigido e revisado pelos autores",
        },
        declaracao_ia="nenhuma",
    )
    Path(args.arquivo).write_text(json.dumps(asdict(pedido), ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"Pedido de exemplo salvo em {args.arquivo}. Edite tema, autores, revista, normas e, em "
          "'contribuicao_autores', descreva o que vocês fizeram (apague o que não se aplica).\n"
          "Em 'declaracao_ia': \"nenhuma\" (padrão: o artigo não menciona IA), \"breve\" (uma frase dizendo que "
          "ferramentas de IA apoiaram busca, organização dos dados e redação, e que os autores conduziram a análise, "
          "reescreveram o texto e respondem por ele) ou o texto da declaração exigida pela revista, que entra como está.")


def cmd_revisar(args):
    from .pipeline import Pipeline

    config, ledger, cliente = _contexto(args)
    resultado = Pipeline(config, ledger, cliente).revisar_selecao(args.id, args.planilha)
    p = resultado["prisma"]
    print(f"{len(resultado['alteradas'])} decisão(ões) alterada(s) pelos autores. PRISMA: triados {p['triados']}, "
          f"elegíveis {p['avaliados_elegibilidade']}, incluídos {p['incluidos']}.")
    print(f"Agora rode: python -m artigos_v2 retomar {args.id}")


def _auditar_depois(config, ledger, cliente, artigo_id, docx, com_ia):
    from .auditoria.runner import auditar, salvar

    rel = auditar(docx, ncbi_api_key=config.ncbi_api_key, cliente=cliente if com_ia else None, artigo_id=artigo_id)
    _, md = salvar(rel, Path(docx).parent)
    ledger.evento(artigo_id, f"Auditoria externa: nota estimada {rel['nota_estimada_0a10']}/10")
    print(f"Auditoria: {rel['nota_estimada_0a10']}/10 → {md}")


def cmd_gerar(args):
    from .pipeline import Pedido, Pipeline

    config, ledger, cliente = _contexto(args)
    pipeline = Pipeline(config, ledger, cliente)
    artigo_id = pipeline.iniciar(Pedido.de_arquivo(args.pedido))
    print(f"Artigo {artigo_id} iniciado. Acompanhe no painel: python -m artigos_v2 painel")
    docx = pipeline.executar(artigo_id)
    print(f"DOCX final: {docx}")
    if args.auditar:
        _auditar_depois(config, ledger, cliente, artigo_id, docx, args.com_ia)


def cmd_retomar(args):
    from .pipeline import Pipeline

    config, ledger, cliente = _contexto(args)
    docx = Pipeline(config, ledger, cliente).executar(args.id)
    print(f"DOCX final: {docx}")


def cmd_exportar(args):
    from .docx_export import exportar_docx, exportar_markdown

    config, ledger, _ = _contexto(args)
    pasta = config.dir_dados / "artigos" / args.id
    estado = json.loads((pasta / "estado.json").read_text(encoding="utf-8"))
    if "artigo" not in estado:
        sys.exit("Esse artigo ainda não chegou na etapa de montagem; use `retomar`.")
    exportar_markdown(estado["artigo"], pasta / "artigo.md")
    docx = exportar_docx(estado["artigo"], Path(args.saida) if args.saida else pasta / "artigo.docx")
    ledger.atualizar_artigo(args.id, docx_path=str(docx))
    print(f"DOCX: {docx}")


def cmd_painel(args):
    from .painel.server import servir

    config, ledger, _ = _contexto(args)
    servir(ledger, config, args.host, args.porta)


def cmd_auditar(args):
    from .auditoria.runner import auditar, relatorio_markdown, salvar

    config, ledger, cliente = _contexto(args)
    rel = auditar(args.arquivo, offline=args.offline, ncbi_api_key=config.ncbi_api_key,
                  cliente=cliente if args.com_ia else None, artigo_id=args.artigo_id)
    js, md = salvar(rel, args.saida or Path(args.arquivo).parent)
    print(relatorio_markdown(rel))
    print(f"Relatórios: {md} | {js}")


def cmd_modelos(args):
    config, _, cliente = _contexto(args)
    try:
        disponiveis = set(cliente.listar_modelos())
    except Exception as e:
        sys.exit(f"Não consegui listar modelos em {config.base_url}/models: {e}")
    print(f"{len(disponiveis)} modelos no OmniRoute ({config.base_url})\n")
    for papel, ids in config.escadas.items():
        print(f"[{papel}]")
        for i, m in enumerate(ids, 1):
            print(f"  {i}. {'OK      ' if m in disponiveis else 'AUSENTE '} {m}")
    print("\nModelos AUSENTES precisam ser adicionados no OmniRoute (Providers → Custom Models) "
          "ou trocados em config/escada.json.")


def cmd_custos(args):
    config, ledger, _ = _contexto(args)
    brl = config.cotacao_usd_brl
    print(f"{'artigo':28} {'status':12} {'real R$':>10} {'API R$':>10} chamadas")
    for a in ledger.artigos():
        print(f"{a['id']:28} {a['status']:12} {a['custo_real_usd'] * brl:10.2f} {a['custo_api_usd'] * brl:10.2f} "
              f"{a['chamadas']}")
    print("\nPor modelo:")
    for m in ledger.agregado("modelo_respondeu"):
        print(f"  {m['chave']:40} real R$ {m['custo_real_usd'] * brl:8.2f} | API R$ {m['custo_api_usd'] * brl:8.2f} "
              f"| {m['chamadas_ok']} chamadas")


def main(argv=None):
    parser = argparse.ArgumentParser(prog="artigos_v2", description="Revisões de literatura Qualis A1 via OmniRoute")
    parser.add_argument("--escada", help="caminho alternativo para escada.json")
    sub = parser.add_subparsers(dest="comando", required=True)

    p = sub.add_parser("exemplo-pedido"); p.add_argument("arquivo", nargs="?", default="pedido.json")
    p.set_defaults(func=cmd_exemplo)
    p = sub.add_parser("gerar"); p.add_argument("pedido")
    p.add_argument("--auditar", action="store_true", help="roda a auditoria externa ao terminar")
    p.add_argument("--com-ia", action="store_true", help="inclui parecer por IA na auditoria")
    p.set_defaults(func=cmd_gerar)
    p = sub.add_parser("retomar"); p.add_argument("id"); p.set_defaults(func=cmd_retomar)
    p = sub.add_parser("revisar", help="importa o triagem.csv revisado pelos autores (as decisões deles valem)")
    p.add_argument("id"); p.add_argument("planilha"); p.set_defaults(func=cmd_revisar)
    p = sub.add_parser("exportar"); p.add_argument("id"); p.add_argument("--saida"); p.set_defaults(func=cmd_exportar)
    p = sub.add_parser("painel"); p.add_argument("--host", default="127.0.0.1"); p.add_argument("--porta", type=int, default=8765)
    p.set_defaults(func=cmd_painel)
    p = sub.add_parser("auditar"); p.add_argument("arquivo")
    p.add_argument("--offline", action="store_true", help="não consulta PubMed/Europe PMC")
    p.add_argument("--com-ia", action="store_true", help="parecer por IA em cada skill (escada 'auditoria')")
    p.add_argument("--saida", help="pasta dos relatórios (padrão: ao lado do arquivo)")
    p.add_argument("--artigo-id", help="associa o custo do parecer por IA a um artigo no painel")
    p.set_defaults(func=cmd_auditar)
    p = sub.add_parser("modelos"); p.set_defaults(func=cmd_modelos)
    p = sub.add_parser("custos"); p.set_defaults(func=cmd_custos)

    args = parser.parse_args(argv)
    args.func(args)


if __name__ == "__main__":
    main()
