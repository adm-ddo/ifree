import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireTenant } from "@/lib/auth";
import { dataISOBrasil, formatarDataHora, instanteBrasil } from "@/lib/data";
import type { StatusTurno } from "@/generated/prisma/enums";
import type { Prisma } from "@/generated/prisma/client";

const STATUS_LABEL: Record<StatusTurno, string> = {
  ABERTO: "Aberto",
  CONCLUIDO: "Concluído",
  PAGO: "Pago",
  ERRO_PAGAMENTO: "Erro no pagamento",
};

const STATUS_CLASSE: Record<StatusTurno, string> = {
  ABERTO: "bg-blue-50 text-blue-700 border-blue-200",
  CONCLUIDO: "bg-amber-50 text-amber-700 border-amber-200",
  PAGO: "bg-brand-50 text-brand-700 border-brand-200",
  ERRO_PAGAMENTO: "bg-red-50 text-red-700 border-red-200",
};

const FILTROS: { valor: StatusTurno | "TODOS"; label: string }[] = [
  { valor: "TODOS", label: "Todos" },
  { valor: "ABERTO", label: "Abertos" },
  { valor: "CONCLUIDO", label: "Concluídos" },
  { valor: "PAGO", label: "Pagos" },
  { valor: "ERRO_PAGAMENTO", label: "Erro no pagamento" },
];

export default async function TurnosPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; nome?: string; de?: string; ate?: string }>;
}) {
  const sessao = await requireTenant();
  const { status, nome, de, ate } = await searchParams;
  const statusFiltro = FILTROS.some((f) => f.valor === status) ? (status as StatusTurno) : null;
  const nomeFiltro = nome?.trim() || "";

  const where: Prisma.TurnoWhereInput = {
    empresaId: sessao.empresaEfetivoId,
    ...(statusFiltro ? { status: statusFiltro } : {}),
    ...(nomeFiltro ? { pessoa: { nome: { contains: nomeFiltro, mode: "insensitive" } } } : {}),
    ...(de || ate
      ? {
          horaEntrada: {
            ...(de ? { gte: instanteBrasil(de) } : {}),
            ...(ate ? { lt: instanteBrasil(ate, 24 * 60) } : {}),
          },
        }
      : {}),
  };

  const turnos = await prisma.turno.findMany({
    where,
    orderBy: { criadoEm: "desc" },
    take: 100,
    select: {
      id: true,
      horaEntrada: true,
      horaSaida: true,
      valorTotal: true,
      status: true,
      fechamentoAutomatico: true,
      modoPagamentoAplicado: true,
      pessoa: { select: { nome: true } },
      funcao: { select: { nome: true } },
    },
  });

  // Preserva status/nome/período ao trocar o filtro de status pelos pills.
  const paramsBase = new URLSearchParams();
  if (nomeFiltro) paramsBase.set("nome", nomeFiltro);
  if (de) paramsBase.set("de", de);
  if (ate) paramsBase.set("ate", ate);

  const hrefStatus = (valor: StatusTurno | "TODOS") => {
    const params = new URLSearchParams(paramsBase);
    if (valor !== "TODOS") params.set("status", valor);
    const query = params.toString();
    return query ? `/turnos?${query}` : "/turnos";
  };

  const agora = new Date();
  const hojeISO = dataISOBrasil(agora);
  const ontemISO = dataISOBrasil(new Date(agora.getTime() - 24 * 60 * 60 * 1000));

  const hrefPeriodo = (dataISO: string) => {
    const params = new URLSearchParams();
    if (statusFiltro) params.set("status", statusFiltro);
    if (nomeFiltro) params.set("nome", nomeFiltro);
    params.set("de", dataISO);
    params.set("ate", dataISO);
    return `/turnos?${params.toString()}`;
  };

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-navy-900">Turnos</h1>
        <p className="text-stone-600 mt-1 text-sm">
          Histórico de check-ins/check-outs no totem, com contrato e recibo
          de cada um.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {FILTROS.map((f) => (
          <Link
            key={f.valor}
            href={hrefStatus(f.valor)}
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

      <div className="flex flex-wrap gap-2">
        <Link
          href={hrefPeriodo(hojeISO)}
          className={`rounded-full border px-3 py-1.5 text-sm transition-colors ${
            de === hojeISO && ate === hojeISO
              ? "bg-brand-600 text-white border-brand-600"
              : "border-stone-300 text-stone-600 hover:bg-stone-50"
          }`}
        >
          Hoje
        </Link>
        <Link
          href={hrefPeriodo(ontemISO)}
          className={`rounded-full border px-3 py-1.5 text-sm transition-colors ${
            de === ontemISO && ate === ontemISO
              ? "bg-brand-600 text-white border-brand-600"
              : "border-stone-300 text-stone-600 hover:bg-stone-50"
          }`}
        >
          Ontem
        </Link>
      </div>

      <form className="flex flex-wrap items-end gap-3 rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
        {statusFiltro && <input type="hidden" name="status" value={statusFiltro} />}
        <label className="flex flex-col gap-1 text-sm text-stone-700">
          Nome
          <input
            type="text"
            name="nome"
            defaultValue={nomeFiltro}
            placeholder="Buscar por nome..."
            className="border border-stone-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm text-stone-700">
          De
          <input
            type="date"
            name="de"
            defaultValue={de ?? ""}
            className="border border-stone-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm text-stone-700">
          Até
          <input
            type="date"
            name="ate"
            defaultValue={ate ?? ""}
            className="border border-stone-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </label>
        <button
          type="submit"
          className="rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium px-4 py-2 transition-colors"
        >
          Filtrar
        </button>
        {(nomeFiltro || de || ate) && (
          <Link
            href={hrefStatus(statusFiltro ?? "TODOS")}
            className="text-sm text-stone-500 hover:underline px-2 py-2"
          >
            Limpar
          </Link>
        )}
      </form>

      {turnos.length === 0 && (
        <p className="text-stone-500 text-sm">Nenhum turno encontrado.</p>
      )}

      <ul className="flex flex-col gap-2">
        {turnos.map((turno) => (
          <li key={turno.id}>
            <Link
              href={`/turnos/${turno.id}`}
              className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between hover:border-brand-300 transition-colors"
            >
              <div>
                <p className="font-medium text-navy-900 flex items-center gap-1.5">
                  {turno.pessoa.nome}
                  {turno.modoPagamentoAplicado === "DIARIA" && (
                    <span className="text-[10px] font-medium uppercase tracking-wide rounded-full border border-amber-200 bg-amber-50 text-amber-700 px-1.5 py-0.5 shrink-0">
                      Diária
                    </span>
                  )}
                </p>
                <p className="text-xs text-stone-500">
                  {turno.funcao.nome} · entrada {formatarDataHora(turno.horaEntrada)}
                  {turno.horaSaida ? ` · saída ${formatarDataHora(turno.horaSaida)}` : ""}
                  {turno.fechamentoAutomatico ? " · encerrado automaticamente" : ""}
                </p>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                {turno.valorTotal !== null && (
                  <span className="text-sm font-medium text-stone-700">
                    R$ {Number(turno.valorTotal).toFixed(2)}
                  </span>
                )}
                <span
                  className={`text-xs rounded-full border px-2 py-1 ${STATUS_CLASSE[turno.status]}`}
                >
                  {STATUS_LABEL[turno.status]}
                </span>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
