import { prisma } from "@/lib/prisma";

const DIAS_JANELA = 14;

/** Mostra os matches "passivos" recentes (perfil compatível, sem
 * candidatura — ver src/lib/match-passivo.ts) pras vagas desta empresa.
 * Sem link específico de página (é só um aviso informativo), por isso é
 * importado direto tanto em src/app/vagas/page.tsx (v1) quanto em
 * src/app/v2/vagas/page.tsx, sem precisar de versão V2 separada. */
export default async function MatchesRecentesBanner({ empresaId }: { empresaId: number }) {
  const desde = new Date(Date.now() - DIAS_JANELA * 24 * 60 * 60 * 1000);

  const matches = await prisma.vagaMatchPassivo.findMany({
    where: { vaga: { empresaId }, criadoEm: { gte: desde } },
    orderBy: { criadoEm: "desc" },
    select: {
      pessoa: { select: { nome: true } },
      vaga: { select: { cargo: true } },
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
      <ul className="flex flex-col gap-0.5">
        {matches.map((m, i) => (
          <li key={i} className="text-xs text-brand-700">
            {m.pessoa.nome} — {m.vaga.cargo}
          </li>
        ))}
      </ul>
    </div>
  );
}
