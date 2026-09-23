import Link from "next/link";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import {
  requireResponsavelPgr,
  buscarCicloAbertoPgr,
  buscarUltimoCicloEncerradoPgr,
  calcularMatrizPgr,
} from "@/lib/pgr";
import { gerarLinkPublicoPgr, abrirNovoCicloPgr, encerrarCicloAtualPgr } from "./actions";
import {
  LABEL_DIMENSAO_PGR,
  LABEL_NIVEL_RISCO_PGR,
  COR_NIVEL_RISCO_PGR,
  MINIMO_RESPOSTAS_RECORTE_PGR,
} from "@/lib/pgr-questionario";
import LinkPublicoBox from "@/app/etica/LinkPublicoBox";
import AcaoPgrForm from "./AcaoPgrForm";
import AcaoPgrRow from "./AcaoPgrRow";

function formatarData(data: Date): string {
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "long", timeZone: "America/Sao_Paulo" }).format(data);
}

export default async function V2PgrPage() {
  const sessao = await requireResponsavelPgr();

  const [token, hdrs, cicloAberto, ultimoEncerrado, acoes] = await Promise.all([
    gerarLinkPublicoPgr(),
    headers(),
    buscarCicloAbertoPgr(sessao.empresaEfetivoId),
    buscarUltimoCicloEncerradoPgr(sessao.empresaEfetivoId),
    prisma.acaoPgr.findMany({
      where: { empresaId: sessao.empresaEfetivoId },
      orderBy: [{ status: "asc" }, { criadoEm: "desc" }],
    }),
  ]);
  const host = hdrs.get("host") ?? "localhost:3000";
  const proto = host.startsWith("localhost") ? "http" : "https";
  const linkPublico = `${proto}://${host}/pgr/${token}`;

  const respostasNoCicloAberto = cicloAberto
    ? await prisma.respostaPgr.count({ where: { cicloId: cicloAberto.id } })
    : 0;

  const matriz = ultimoEncerrado ? await calcularMatrizPgr(ultimoEncerrado.id) : null;

  return (
    <div className="flex flex-col gap-4 max-w-3xl">
      <div>
        <h1 className="text-xl font-extrabold text-navy-900">PGR — Riscos psicossociais</h1>
        <p className="text-stone-500 text-sm mt-0.5">
          Gestão de riscos psicossociais (NR-1) — pesquisa anônima, matriz de risco e plano de ação.
        </p>
      </div>

      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-xs text-amber-800">
        O questionário padrão é inspirado nas dimensões usadas por
        instrumentos validados de avaliação de risco psicossocial
        (Karasek, HSE-IT, COPSOQ), mas isso não substitui a revisão de um
        profissional de segurança do trabalho antes de assinar o
        documento final como PGR oficial da empresa.
      </div>

      <div className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm flex flex-col gap-3">
        <h2 className="font-semibold text-navy-900 text-sm">Ciclo atual</h2>
        {cicloAberto ? (
          <>
            <p className="text-sm text-stone-600">
              Aberto em {formatarData(cicloAberto.abertoEm)} · {respostasNoCicloAberto} resposta(s) recebida(s).
            </p>
            <LinkPublicoBox url={linkPublico} />
            <form action={encerrarCicloAtualPgr}>
              <button
                type="submit"
                className="rounded-lg bg-navy-900 hover:bg-navy-800 text-white text-sm font-medium px-4 py-2 transition-colors"
              >
                Encerrar ciclo e calcular matriz
              </button>
            </form>
          </>
        ) : (
          <>
            <p className="text-sm text-stone-600">
              Nenhum ciclo aberto no momento. A NR-1 exige reavaliação
              completa no mínimo uma vez por ano.
            </p>
            <form action={abrirNovoCicloPgr}>
              <button
                type="submit"
                className="rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium px-4 py-2 transition-colors"
              >
                Abrir novo ciclo de avaliação
              </button>
            </form>
          </>
        )}
      </div>

      {ultimoEncerrado && matriz && (
        <div className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm flex flex-col gap-4">
          <div>
            <h2 className="font-semibold text-navy-900 text-sm">
              Matriz de risco — ciclo encerrado em {formatarData(ultimoEncerrado.encerradoEm!)}
            </h2>
            <p className="text-xs text-stone-500 mt-0.5">
              {matriz.totalRespostas} resposta(s) no total
              {matriz.totalRespostas < MINIMO_RESPOSTAS_RECORTE_PGR &&
                " — amostra pequena, resultado pode não ser representativo."}
            </p>
          </div>

          <div className="flex flex-col gap-1.5">
            {matriz.geral.map((linha) => (
              <div key={linha.dimensao} className="flex items-center justify-between gap-3 text-sm">
                <span className="text-stone-700">{LABEL_DIMENSAO_PGR[linha.dimensao]}</span>
                <span className={`text-xs rounded-full border px-2.5 py-1 shrink-0 ${COR_NIVEL_RISCO_PGR[linha.nivel]}`}>
                  {LABEL_NIVEL_RISCO_PGR[linha.nivel]}
                </span>
              </div>
            ))}
          </div>

          {matriz.porCargo.length > 0 && (
            <div className="flex flex-col gap-3 border-t border-stone-100 pt-3">
              <p className="text-xs font-medium text-stone-500">Por cargo (com respostas suficientes)</p>
              {matriz.porCargo.map((bloco) => (
                <div key={bloco.cargo} className="flex flex-col gap-1">
                  <p className="text-xs font-semibold text-navy-900">
                    {bloco.cargo} <span className="text-stone-400 font-normal">({bloco.totalRespostas} respostas)</span>
                  </p>
                  {bloco.linhas.map((linha) => (
                    <div key={linha.dimensao} className="flex items-center justify-between gap-3 text-xs pl-2">
                      <span className="text-stone-600">{LABEL_DIMENSAO_PGR[linha.dimensao]}</span>
                      <span className={`rounded-full border px-2 py-0.5 shrink-0 ${COR_NIVEL_RISCO_PGR[linha.nivel]}`}>
                        {LABEL_NIVEL_RISCO_PGR[linha.nivel]}
                      </span>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}

          <a
            href="/v2/pgr/pdf"
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-lg border border-stone-300 text-stone-700 hover:bg-stone-50 text-sm font-medium px-4 py-2 text-center transition-colors"
          >
            📄 Baixar PDF do PGR
          </a>
        </div>
      )}

      <div className="flex flex-col gap-2">
        <h2 className="font-semibold text-navy-900 text-sm">Plano de ação</h2>
        {acoes.length === 0 ? (
          <p className="text-stone-500 text-sm">Nenhuma ação cadastrada ainda.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {acoes.map((acao) => (
              <AcaoPgrRow
                key={acao.id}
                acao={{
                  id: acao.id,
                  dimensao: acao.dimensao,
                  descricaoRisco: acao.descricaoRisco,
                  medida: acao.medida,
                  responsavel: acao.responsavel,
                  prazoLabel: acao.prazo ? formatarData(acao.prazo) : null,
                  status: acao.status,
                }}
              />
            ))}
          </ul>
        )}
        <AcaoPgrForm />
      </div>

      <Link href="/v2/equipe" className="text-xs text-brand-700 hover:underline">
        Gerenciar quem tem acesso ao PGR →
      </Link>
    </div>
  );
}
