import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { formatarDataSemHora, inicioDoDiaBrasil } from "@/lib/data";
import DesmarcarFreeEmpresaBotao from "./DesmarcarFreeEmpresaBotao";

const LABEL_STATUS: Record<string, string> = {
  AGUARDANDO_PESSOA: "🤝 Esperando ela confirmar",
  CONFIRMADO: "✅ Combinado",
};

const COR_STATUS: Record<string, string> = {
  AGUARDANDO_PESSOA: "bg-amber-50 text-amber-700 border-amber-200",
  CONFIRMADO: "bg-brand-50 text-brand-700 border-brand-200",
};

/** Lembrete central dos Extras Marcados 🤝 que ainda vão acontecer — pedido
 * do Thiago em 2026-09-28: antes disso só dava pra ver um Extra Marcado
 * entrando na candidatura específica dentro de uma vaga (ExtraMarcadoEmpresa,
 * em ../[id]/), então a empresa esquecia com quem tinha combinado o quê.
 * Só o que ainda vai acontecer aparece aqui (data >= hoje) — o que já
 * passou vira CUMPRIDO/NAO_COMPARECEU (ver iniciarTurno e
 * marcarFaltasExtraMarcado) e some sozinho desta lista, "o que passou
 * passou" nas palavras do Thiago; pra ver o histórico, o jeito é olhar o
 * turno/reputação da pessoa direto.
 *
 * `vagaHrefBase` (/vagas v1, /v2/vagas v2) monta o link do perfil — mesmo
 * padrão de perfilHrefBase em MatchesRecentesBanner.tsx. */
export default async function ProximosExtrasMarcadosEmpresa({
  empresaId,
  vagaHrefBase,
}: {
  empresaId: number;
  vagaHrefBase: string;
}) {
  const hoje = inicioDoDiaBrasil(new Date());

  const extras = await prisma.extraMarcado.findMany({
    where: {
      empresaId,
      status: { in: ["AGUARDANDO_PESSOA", "CONFIRMADO"] },
      data: { gte: hoje },
    },
    orderBy: { data: "asc" },
    select: {
      id: true,
      data: true,
      turnoTipo: true,
      status: true,
      pessoa: { select: { id: true, nome: true } },
      vaga: { select: { id: true, cargo: true } },
    },
  });

  if (extras.length === 0) return null;

  return (
    <div className="rounded-2xl border border-brand-200 bg-brand-50 p-4 flex flex-col gap-2">
      <p className="text-sm font-semibold text-brand-800">
        🤝 {extras.length} Free{extras.length > 1 ? "s" : ""} marcado{extras.length > 1 ? "s" : ""} pra frente
      </p>
      <ul className="flex flex-col">
        {extras.map((e) => (
          <li
            key={e.id}
            className="flex items-center justify-between gap-3 py-2 border-b border-brand-200/60 last:border-0 text-xs"
          >
            <span className="truncate text-brand-700">
              {formatarDataSemHora(e.data)} · {e.turnoTipo === "DIA" ? "☀️" : "🌙"} — {e.pessoa.nome} (
              {e.vaga.cargo})
            </span>
            <span className="flex items-center gap-2 shrink-0">
              <span className={`rounded-full border text-[11px] font-medium px-2 py-0.5 ${COR_STATUS[e.status]}`}>
                {LABEL_STATUS[e.status]}
              </span>
              <Link
                href={`${vagaHrefBase}/${e.vaga.id}/candidatos/${e.pessoa.id}`}
                className="text-[11px] text-brand-700 underline hover:text-brand-800"
              >
                Ver perfil
              </Link>
              <DesmarcarFreeEmpresaBotao extraMarcadoId={e.id} />
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
