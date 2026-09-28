import { prisma } from "@/lib/prisma";
import { JANELA_RECENTE_HORAS, JANELA_MAXIMA_HORAS } from "./candidatosCompativeis";
import LinhaCandidatoCompativel from "./LinhaCandidatoCompativel";
import CandidatosCompativeisExpandido from "./CandidatosCompativeisExpandido";

/** Mostra os matches "passivos" recentes (perfil compatível, sem
 * candidatura — ver src/lib/match-passivo.ts) pras vagas desta empresa,
 * com um link "Ver perfil" (reputação, habilidades, bio — sem
 * telefone/documento/endereço, já que ela nunca se candidatou e não deu
 * esse consentimento a esta empresa) e um botão de convite de verdade
 * (ConvidarParaVagaBotao, via LinhaCandidatoCompativel.tsx). Antes disso
 * era só uma lista de nomes sem nenhuma ação possível (reportado pelo
 * Thiago em 2026-09-26: "fica ali, mas não serve pra nada"). O convite é
 * só pra chamar a atenção dela pra vaga — quem decide se manifestar e
 * procurar a empresa é ELA, o convite não abre conversa nem avisa a
 * empresa de nada.
 *
 * Janela padrão de só {JANELA_RECENTE_HORAS}h (pedido do Thiago em
 * 2026-09-28: antes eram 14 dias corridos, virando uma lista grande com
 * gente que já não era tão "recente" assim) — quem quiser ver mais clica
 * em "Buscar mais pessoas compatíveis" (CandidatosCompativeisExpandido.tsx,
 * paginado, até 72h de idade).
 *
 * `perfilHrefBase` (/vagas v1, /v2/vagas v2) monta o link do perfil —
 * mesmo padrão de funcoesHref em NovaVagaForm.tsx pra componente
 * compartilhado entre as duas versões. */
export default async function MatchesRecentesBanner({
  empresaId,
  perfilHrefBase,
}: {
  empresaId: number;
  perfilHrefBase: string;
}) {
  const agora = Date.now();
  const desdeRecente = new Date(agora - JANELA_RECENTE_HORAS * 60 * 60 * 1000);
  const desdeMaxima = new Date(agora - JANELA_MAXIMA_HORAS * 60 * 60 * 1000);

  // pessoa.disponivelParaOportunidades:true em toda consulta desta tela —
  // pedido do Thiago em 2026-09-28: quem já combinou um Extra Marcado (e
  // por isso teve a disponibilidade desligada automaticamente, ver
  // confirmarExtraMarcado em src/app/portal/vagas/actions.ts) some das
  // buscas de OUTRAS empresas até reativar manualmente, mesmo que o
  // perfil continue tecnicamente compatível.
  const [matches, temMaisAlgum] = await Promise.all([
    prisma.vagaMatchPassivo.findMany({
      where: {
        vaga: { empresaId },
        criadoEm: { gte: desdeRecente },
        pessoa: { disponivelParaOportunidades: true },
      },
      orderBy: { criadoEm: "desc" },
      select: {
        id: true,
        convidadoEm: true,
        pessoa: { select: { id: true, nome: true } },
        vaga: { select: { id: true, cargo: true } },
      },
    }),
    // Só pra decidir se vale a pena mostrar o card TODO — sem isso, uma
    // empresa que nunca teve nenhum match compatível veria um card vazio
    // com "buscar mais" que nunca acha nada (dentro da janela máxima de
    // JANELA_MAXIMA_HORAS; match mais velho que isso já não conta mais
    // aqui, mesmo critério de buscarMaisCandidatosCompativeis).
    prisma.vagaMatchPassivo.findFirst({
      where: {
        vaga: { empresaId },
        criadoEm: { gte: desdeMaxima },
        pessoa: { disponivelParaOportunidades: true },
      },
      select: { id: true },
    }),
  ]);

  if (matches.length === 0 && !temMaisAlgum) return null;

  return (
    <div className="rounded-2xl border border-brand-200 bg-brand-50 p-4 flex flex-col gap-2">
      {matches.length > 0 ? (
        <>
          <p className="text-sm font-semibold text-brand-800">
            🎯 {matches.length} candidato{matches.length > 1 ? "s" : ""}{" "}
            {matches.length > 1 ? "compatíveis apareceram" : "compatível apareceu"} nas últimas 24 horas
          </p>
          <ul className="flex flex-col">
            {matches.map((m) => (
              <LinhaCandidatoCompativel
                key={m.id}
                item={{
                  id: m.id,
                  pessoaId: m.pessoa.id,
                  pessoaNome: m.pessoa.nome,
                  vagaId: m.vaga.id,
                  vagaCargo: m.vaga.cargo,
                  convidadoEm: m.convidadoEm ? m.convidadoEm.toISOString() : null,
                }}
                perfilHrefBase={perfilHrefBase}
              />
            ))}
          </ul>
        </>
      ) : (
        <p className="text-sm text-brand-800">Nenhum candidato compatível novo nas últimas 24 horas.</p>
      )}

      <CandidatosCompativeisExpandido perfilHrefBase={perfilHrefBase} />
    </div>
  );
}
