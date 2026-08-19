import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireTenant } from "@/lib/auth";
import { formatarDataHora } from "@/lib/data";
import PagamentoRow from "./PagamentoRow";
import type { StatusPagamento } from "@/generated/prisma/enums";

const FILTROS: { valor: StatusPagamento | "TODOS"; label: string }[] = [
  { valor: "TODOS", label: "Todos" },
  { valor: "PENDENTE", label: "Aguardando PIX manual" },
  { valor: "FALHOU", label: "Falharam" },
  { valor: "PROCESSANDO", label: "Processando" },
  { valor: "CONCLUIDO", label: "Pagos" },
];

export default async function PagamentosPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const sessao = await requireTenant();
  const { status } = await searchParams;
  const statusFiltro = FILTROS.some((f) => f.valor === status) ? (status as StatusPagamento) : null;

  const pagamentos = await prisma.pagamento.findMany({
    where: {
      turno: { empresaId: sessao.empresaEfetivoId },
      ...(statusFiltro ? { status: statusFiltro } : {}),
    },
    orderBy: { atualizadoEm: "desc" },
    take: 100,
    select: {
      turnoId: true,
      valor: true,
      status: true,
      tentativas: true,
      erro: true,
      chavePixDestino: true,
      tipoChavePixDestino: true,
      atualizadoEm: true,
      turno: { select: { pessoa: { select: { nome: true } }, horaSaida: true } },
    },
  });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-navy-900">Pagamentos</h1>
          <p className="text-stone-600 mt-1 text-sm">
            Ainda não há envio automático de PIX (falta a integração com a
            Stone). Cada turno concluído aparece aqui como &ldquo;aguardando
            PIX manual&rdquo; — faça a transferência pelo seu banco e clique
            em &ldquo;Marcar como pago&rdquo;.
          </p>
        </div>
        <a
          href="/relatorios/pagamentos-semanal/pdf"
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-lg border border-stone-300 text-sm px-4 py-2 text-stone-700 hover:bg-stone-50 shrink-0"
        >
          🖨️ Relatório semanal
        </a>
      </div>

      <div className="flex flex-wrap gap-2">
        {FILTROS.map((f) => (
          <Link
            key={f.valor}
            href={f.valor === "TODOS" ? "/pagamentos" : `/pagamentos?status=${f.valor}`}
            className={`rounded-full border px-3 py-1.5 text-sm transition-colors ${
              (statusFiltro ?? "TODOS") === f.valor
                ? "bg-stone-800 text-white border-stone-800"
                : "border-stone-300 text-stone-600 hover:bg-stone-50"
            }`}
          >
            {f.label}
          </Link>
        ))}
      </div>

      {pagamentos.length === 0 && (
        <p className="text-stone-500 text-sm">Nenhum pagamento encontrado.</p>
      )}

      <ul className="flex flex-col gap-2">
        {pagamentos.map((p) => (
          <PagamentoRow
            key={p.turnoId}
            pagamento={{
              turnoId: p.turnoId,
              pessoaNome: p.turno.pessoa.nome,
              valor: Number(p.valor),
              status: p.status,
              tentativas: p.tentativas,
              erro: p.erro,
              chavePixDestino: p.chavePixDestino,
              tipoChavePixDestino: p.tipoChavePixDestino,
              quando: formatarDataHora(p.turno.horaSaida ?? p.atualizadoEm),
            }}
          />
        ))}
      </ul>
    </div>
  );
}
