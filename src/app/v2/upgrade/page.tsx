import { redirect } from "next/navigation";
import { requireTenant } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { IconeV2 } from "@/components/v2/Icons";
import UpgradeButton from "./UpgradeButton";

const MODULOS_EXCLUSIVOS_COMPLETO: { icone: Parameters<typeof IconeV2>[0]["nome"]; titulo: string; desc: string }[] = [
  { icone: "funcionarios", titulo: "Funcionários CLT", desc: "ponto, jornada, intervalo, banco de horas" },
  { icone: "pgr", titulo: "PGR (NR-1)", desc: "inventário de riscos psicossociais assinado" },
  { icone: "etica", titulo: "Central de Ética", desc: "canal de denúncia com acompanhamento" },
  { icone: "ged", titulo: "Documentos (GED)", desc: "contratos, advertência, termo de ciência" },
  { icone: "totens", titulo: "Totem físico", desc: "check-in por CPF, dia a dia sem celular" },
  { icone: "financeiro", titulo: "Financeiro completo", desc: "relatórios, pagamentos, estimativa CLT" },
];

/** Tela de pitch do upgrade Conecta → Completo — chegada tanto pelo modal
 * de módulo travado (NavShell.tsx) quanto pelo banner do dashboard
 * (v2/dashboard/page.tsx) ou pelo link em /v2/assinatura. Só existe pra
 * quem já está no Conecta — quem já é Completo é redirecionado de volta,
 * não tem o que fazer aqui. */
export default async function UpgradePage() {
  const sessao = await requireTenant();

  const empresa = await prisma.empresa.findUniqueOrThrow({
    where: { id: sessao.empresaEfetivoId },
    select: { planoEmpresa: true },
  });
  if (empresa.planoEmpresa === "COMPLETO") {
    redirect("/v2/dashboard");
  }

  return (
    <div className="flex flex-col gap-6 max-w-2xl">
      <div>
        <h1 className="text-xl font-extrabold text-navy-900">iFREE Gestão Completa</h1>
        <p className="text-stone-500 text-sm mt-0.5">
          Hoje seu plano é o Conecta — anuncia vaga e conversa com freelancer. O Completo libera todo o
          resto: ponto CLT, PGR, Central de Ética, documentos e o totem físico.
        </p>
      </div>

      <div className="rounded-2xl border border-stone-200 bg-white p-5 flex flex-col sm:flex-row gap-4 sm:items-center sm:justify-between">
        <div>
          <p className="text-xs text-stone-500">Conecta (hoje)</p>
          <p className="text-2xl font-black text-navy-900">R$ 49,90<span className="text-sm font-medium text-stone-400">/mês</span></p>
        </div>
        <span className="text-stone-300 text-xl hidden sm:block">→</span>
        <div>
          <p className="text-xs text-brand-600 font-semibold">Completo (1º ano promocional)</p>
          <p className="text-2xl font-black text-brand-700">
            R$ 129,90<span className="text-sm font-medium text-stone-400">/mês</span>
          </p>
          <p className="text-[11px] text-stone-400">depois R$ 199,90/mês</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {MODULOS_EXCLUSIVOS_COMPLETO.map((m) => (
          <div key={m.titulo} className="flex items-start gap-3 rounded-xl border border-stone-200 bg-white p-3.5">
            <span className="flex items-center justify-center w-9 h-9 rounded-xl bg-navy-50 text-navy-700 shrink-0">
              <IconeV2 nome={m.icone} className="w-5 h-5" />
            </span>
            <div>
              <p className="text-sm font-semibold text-navy-900">{m.titulo}</p>
              <p className="text-xs text-stone-500">{m.desc}</p>
            </div>
          </div>
        ))}
      </div>

      <UpgradeButton />
    </div>
  );
}
