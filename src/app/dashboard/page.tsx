import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireTenant } from "@/lib/auth";
import { formatarHora, inicioDoDiaBrasil } from "@/lib/data";
import DashboardAutoRefresh from "./DashboardAutoRefresh";
import SeletorEmpresa from "./SeletorEmpresa";
import type { ModoPagamento } from "@/generated/prisma/enums";

export default async function DashboardPage() {
  const sessao = await requireTenant();

  const hoje = inicioDoDiaBrasil(new Date());
  const ontem = new Date(hoje.getTime() - 24 * 60 * 60 * 1000);

  const [
    turnosHoje,
    pendentesPagamento,
    totalFuncoes,
    totalTotens,
    emTurnoAgora,
    turnosDeOntem,
  ] = await Promise.all([
    prisma.turno.count({
      where: { empresaId: sessao.empresaEfetivoId, criadoEm: { gte: hoje } },
    }),
    prisma.pagamento.count({
      where: {
        status: { in: ["PENDENTE", "FALHOU"] },
        turno: { empresaId: sessao.empresaEfetivoId },
      },
    }),
    prisma.funcao.count({ where: { empresaId: sessao.empresaEfetivoId } }),
    prisma.totem.count({ where: { empresaId: sessao.empresaEfetivoId } }),
    prisma.turno.findMany({
      where: { empresaId: sessao.empresaEfetivoId, status: "ABERTO" },
      orderBy: { horaEntrada: "asc" },
      select: {
        id: true,
        horaEntrada: true,
        modoPagamentoAplicado: true,
        pessoa: { select: { id: true, nome: true } },
        funcao: { select: { nome: true } },
      },
    }),
    prisma.turno.findMany({
      where: {
        empresaId: sessao.empresaEfetivoId,
        horaEntrada: { gte: ontem, lt: hoje },
        horaSaida: { not: null },
      },
      select: {
        valorTotal: true,
        horaSaida: true,
        modoPagamentoAplicado: true,
        pessoa: { select: { nome: true } },
      },
    }),
  ]);

  const resumoOntemPorPessoa = new Map<
    string,
    { turnos: number; valorTotal: number; ultimaSaida: Date; modoPagamento: ModoPagamento }
  >();
  for (const turno of turnosDeOntem) {
    if (!turno.horaSaida) continue;
    const atual = resumoOntemPorPessoa.get(turno.pessoa.nome) ?? {
      turnos: 0,
      valorTotal: 0,
      ultimaSaida: turno.horaSaida,
      modoPagamento: turno.modoPagamentoAplicado,
    };
    atual.turnos += 1;
    atual.valorTotal += turno.valorTotal !== null ? Number(turno.valorTotal) : 0;
    if (turno.horaSaida > atual.ultimaSaida) atual.ultimaSaida = turno.horaSaida;
    // Se qualquer turno do dia foi por diária, sinaliza diária — é o caso
    // que mais importa destacar pro financeiro, já que o valor não segue a
    // conta simples de horas x valor/hora.
    if (turno.modoPagamentoAplicado === "DIARIA") atual.modoPagamento = "DIARIA";
    resumoOntemPorPessoa.set(turno.pessoa.nome, atual);
  }
  const resumoOntem = [...resumoOntemPorPessoa.entries()].sort((a, b) =>
    a[0].localeCompare(b[0])
  );
  const valorTotalOntem = resumoOntem.reduce((soma, [, r]) => soma + r.valorTotal, 0);

  return (
    <div className="flex flex-col gap-6">
      <DashboardAutoRefresh />

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-navy-900">
            {sessao.empresaEfetivoNome}
          </h1>
          <p className="text-stone-600 mt-1 text-sm">Painel da empresa.</p>
        </div>
        <SeletorEmpresa empresas={sessao.minhasEmpresas} empresaAtivaId={sessao.empresaEfetivoId} />
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <Card label="Em turno agora" valor={emTurnoAgora.length} />
        <Card label="Turnos hoje" valor={turnosHoje} />
        <Card label="Pagamentos pendentes" valor={pendentesPagamento} />
        <Card label="Funções cadastradas" valor={totalFuncoes} />
        <Card label="Totens ativos" valor={totalTotens} />
      </div>

      {totalFuncoes === 0 && (
        <p className="text-stone-500 text-sm rounded-2xl border border-dashed border-stone-300 p-4">
          Cadastre suas funções (e o valor/hora de cada uma) para poder
          liberar o totem de check-in.
        </p>
      )}

      <div className="rounded-2xl border border-stone-200 bg-white shadow-sm">
        <div className="p-4 border-b border-stone-100 flex items-center justify-between">
          <h2 className="font-semibold text-navy-900">Em turno agora</h2>
          <span className="text-xs text-stone-400">atualiza sozinho</span>
        </div>
        {emTurnoAgora.length === 0 ? (
          <p className="text-stone-500 text-sm p-4">Ninguém em turno neste momento.</p>
        ) : (
          <ul className="divide-y divide-stone-100">
            {emTurnoAgora.map((turno) => (
              <li key={turno.id} className="p-4 flex items-center justify-between gap-3">
                <div>
                  <Link
                    href={`/freelancers/${turno.pessoa.id}`}
                    className="font-medium text-navy-900 hover:text-brand-700 hover:underline"
                  >
                    {turno.pessoa.nome}
                  </Link>
                  <p className="text-xs text-stone-500 flex items-center gap-1.5 mt-0.5">
                    {turno.funcao.nome}
                    <BadgeModoPagamento modo={turno.modoPagamentoAplicado} />
                  </p>
                </div>
                <span className="text-sm text-stone-600 shrink-0 flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-green-500 shrink-0" />
                  chegou {formatarHora(turno.horaEntrada)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="rounded-2xl border border-stone-200 bg-white shadow-sm">
        <div className="p-4 border-b border-stone-100 flex items-center justify-between gap-3">
          <h2 className="font-semibold text-navy-900">Ontem</h2>
          <div className="flex items-center gap-3">
            {resumoOntem.length > 0 && (
              <span className="text-sm font-medium text-stone-700">
                R$ {valorTotalOntem.toFixed(2)}
              </span>
            )}
            <a
              href="/relatorios/pagamentos/pdf"
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-lg border border-stone-300 text-xs px-3 py-1.5 text-stone-600 hover:bg-stone-50 shrink-0"
            >
              🖨️ Imprimir
            </a>
          </div>
        </div>
        {resumoOntem.length === 0 ? (
          <p className="text-stone-500 text-sm p-4">Ninguém encerrou turno ontem.</p>
        ) : (
          <ul className="divide-y divide-stone-100">
            {resumoOntem.map(([nome, r]) => (
              <li key={nome} className="p-4 flex items-center justify-between gap-3">
                <div>
                  <p className="font-medium text-navy-900 flex items-center gap-1.5">
                    {nome}
                    <BadgeModoPagamento modo={r.modoPagamento} />
                  </p>
                  <p className="text-xs text-stone-500 flex items-center gap-1.5 mt-0.5">
                    <span className="h-2 w-2 rounded-full bg-red-500 shrink-0" />
                    saiu {formatarHora(r.ultimaSaida)} ·{" "}
                    {r.turnos} {r.turnos === 1 ? "turno" : "turnos"}
                  </p>
                </div>
                <span className="text-sm font-medium text-stone-700 shrink-0">
                  R$ {r.valorTotal.toFixed(2)}
                </span>
              </li>
            ))}
          </ul>
        )}
        <div className="p-3 border-t border-stone-100">
          <Link href="/turnos" className="text-sm text-brand-700 hover:underline">
            Ver todos os turnos →
          </Link>
        </div>
      </div>
    </div>
  );
}

function Card({ label, valor }: { label: string; valor: number }) {
  return (
    <div className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
      <p className="text-2xl font-semibold text-navy-900">{valor}</p>
      <p className="text-xs text-stone-500 mt-1">{label}</p>
    </div>
  );
}

/** Diferencia quem recebe por diária fixa de quem recebe por hora — o
 * cálculo dos dois é bem diferente (diária não segue horas × valor/hora),
 * então vale destacar isso de cara em toda lista de turnos. */
function BadgeModoPagamento({ modo }: { modo: ModoPagamento }) {
  return modo === "DIARIA" ? (
    <span className="text-[10px] font-medium uppercase tracking-wide rounded-full border border-amber-200 bg-amber-50 text-amber-700 px-1.5 py-0.5 shrink-0">
      Diária
    </span>
  ) : (
    <span className="text-[10px] font-medium uppercase tracking-wide rounded-full border border-stone-200 bg-stone-50 text-stone-500 px-1.5 py-0.5 shrink-0">
      Hora
    </span>
  );
}
