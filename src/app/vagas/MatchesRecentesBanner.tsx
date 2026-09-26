import Link from "next/link";
import { prisma } from "@/lib/prisma";
import ConvidarParaVagaBotao from "./ConvidarParaVagaBotao";

const DIAS_JANELA = 14;

/** Mostra os matches "passivos" recentes (perfil compatível, sem
 * candidatura — ver src/lib/match-passivo.ts) pras vagas desta empresa,
 * com um link "Ver perfil" (reputação, habilidades, bio — sem
 * telefone/documento/endereço, já que ela nunca se candidatou e não deu
 * esse consentimento a esta empresa) e um botão de convite de verdade
 * (ConvidarParaVagaBotao). Antes disso era só uma lista de nomes sem
 * nenhuma ação possível (reportado pelo Thiago em 2026-09-26: "fica ali,
 * mas não serve pra nada"). O convite é só pra chamar a atenção dela pra
 * vaga — quem decide se manifestar e procurar a empresa é ELA, o convite
 * não abre conversa nem avisa a empresa de nada (mesma lógica de
 * pedido do Thiago: "a pessoa é que tem que se manifestar").
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
  const desde = new Date(Date.now() - DIAS_JANELA * 24 * 60 * 60 * 1000);

  const matches = await prisma.vagaMatchPassivo.findMany({
    where: { vaga: { empresaId }, criadoEm: { gte: desde } },
    orderBy: { criadoEm: "desc" },
    select: {
      id: true,
      convidadoEm: true,
      pessoa: { select: { id: true, nome: true } },
      vaga: { select: { id: true, cargo: true } },
    },
    take: 20,
  });

  if (matches.length === 0) return null;

  return (
    <div className="rounded-2xl border border-brand-200 bg-brand-50 p-4 flex flex-col gap-2">
      <p className="text-sm font-semibold text-brand-800">
        🎯 {matches.length} candidato{matches.length > 1 ? "s" : ""}{" "}
        {matches.length > 1 ? "compatíveis apareceram" : "compatível apareceu"} nos últimos dias
      </p>
      <ul className="flex flex-col gap-1">
        {matches.map((m) => (
          <li key={m.id} className="flex items-center justify-between gap-2 text-xs">
            <span className="truncate text-brand-700">
              {m.pessoa.nome} — {m.vaga.cargo}
            </span>
            <span className="flex items-center gap-3 shrink-0">
              <Link
                href={`${perfilHrefBase}/${m.vaga.id}/candidatos/${m.pessoa.id}`}
                className="text-[11px] text-brand-700 underline hover:text-brand-800"
              >
                Ver perfil
              </Link>
              <ConvidarParaVagaBotao matchPassivoId={m.id} jaConvidado={m.convidadoEm !== null} />
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
