import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireModulo } from "@/lib/requireModulo";
import {
  dataISOBrasil,
  formatarDataHoraComDiaSemana,
  instanteBrasil,
  inicioDaSemanaBrasil,
  inicioDoMesBrasil,
} from "@/lib/data";
import { classificarTurno } from "@/lib/turno";
import SelecaoTurnosGlobal from "./SelecaoTurnosGlobal";
import type { StatusTurno, FrequenciaPagamento } from "@/generated/prisma/enums";
import type { Prisma } from "@/generated/prisma/client";

const FILTROS: { valor: StatusTurno | "TODOS"; label: string }[] = [
  { valor: "TODOS", label: "Todos" },
  { valor: "ABERTO", label: "Abertos" },
  { valor: "CONCLUIDO", label: "Concluídos" },
  { valor: "PAGO", label: "Pagos" },
  { valor: "ERRO_PAGAMENTO", label: "Erro no pagamento" },
];

const FREQUENCIAS: { valor: FrequenciaPagamento | "TODAS"; label: string }[] = [
  { valor: "TODAS", label: "Todas as frequências" },
  { valor: "DIARIA", label: "Diária" },
  { valor: "SEMANAL", label: "Semanal" },
];

export default async function TurnosPage({
  searchParams,
}: {
  searchParams: Promise<{
    status?: string;
    frequencia?: string;
    nome?: string;
    de?: string;
    ate?: string;
  }>;
}) {
  const sessao = await requireModulo("turnos");
  const { status, frequencia, nome, de, ate } = await searchParams;
  const statusFiltro = FILTROS.some((f) => f.valor === status) ? (status as StatusTurno) : null;
  const frequenciaFiltro = FREQUENCIAS.some((f) => f.valor === frequencia)
    ? (frequencia as FrequenciaPagamento)
    : null;
  const nomeFiltro = nome?.trim() || "";

  const where: Prisma.TurnoWhereInput = {
    empresaId: sessao.empresaEfetivoId,
    ...(statusFiltro ? { status: statusFiltro } : {}),
    ...(frequenciaFiltro ? { frequenciaPagamentoAplicada: frequenciaFiltro } : {}),
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
      pessoaId: true,
      horaEntrada: true,
      horaSaida: true,
      valorTotal: true,
      status: true,
      fechamentoAutomatico: true,
      correcaoSaidaEm: true,
      modoPagamentoAplicado: true,
      frequenciaPagamentoAplicada: true,
      assinaturaContratoUrl: true,
      criadoManualmente: true,
      criadoManualmentePorEmail: true,
      turnoDobrado: true,
      pessoa: { select: { nome: true } },
      funcao: { select: { nome: true } },
    },
  });

  // Classificação ☀️/🌙 de cada turno — busca em lote o corte do dia da
  // empresa e o turno fixo de cada pessoa listada, ao invés de 1 query por
  // linha (ver mesmo padrão em src/lib/fechamento-automatico.ts).
  const empresaConfig = await prisma.empresa.findUniqueOrThrow({
    where: { id: sessao.empresaEfetivoId },
    select: { horarioInicioDiaMin: true, horarioInicioNoiteMin: true },
  });
  const vinculos = await prisma.vinculoPessoaEmpresa.findMany({
    where: { empresaId: sessao.empresaEfetivoId, pessoaId: { in: turnos.map((t) => t.pessoaId) } },
    select: { pessoaId: true, turnoPredefinido: true },
  });
  const turnoPredefinidoPorPessoa = new Map(vinculos.map((v) => [v.pessoaId, v.turnoPredefinido]));

  // Preserva status/frequência/nome/período ao trocar qualquer um dos
  // filtros pelos pills — cada href* abaixo parte de paramsBase e só
  // sobrescreve o próprio filtro que representa.
  const paramsBase = new URLSearchParams();
  if (statusFiltro) paramsBase.set("status", statusFiltro);
  if (frequenciaFiltro) paramsBase.set("frequencia", frequenciaFiltro);
  if (nomeFiltro) paramsBase.set("nome", nomeFiltro);
  if (de) paramsBase.set("de", de);
  if (ate) paramsBase.set("ate", ate);

  const hrefStatus = (valor: StatusTurno | "TODOS") => {
    const params = new URLSearchParams(paramsBase);
    if (valor === "TODOS") params.delete("status");
    else params.set("status", valor);
    const query = params.toString();
    return query ? `/turnos?${query}` : "/turnos";
  };

  const hrefFrequencia = (valor: FrequenciaPagamento | "TODAS") => {
    const params = new URLSearchParams(paramsBase);
    if (valor === "TODAS") params.delete("frequencia");
    else params.set("frequencia", valor);
    const query = params.toString();
    return query ? `/turnos?${query}` : "/turnos";
  };

  const agora = new Date();
  const hojeISO = dataISOBrasil(agora);
  const ontemISO = dataISOBrasil(new Date(agora.getTime() - 24 * 60 * 60 * 1000));
  const inicioSemanaISO = dataISOBrasil(inicioDaSemanaBrasil(agora));
  const inicioMesISO = dataISOBrasil(inicioDoMesBrasil(agora));

  /** Preserva status/frequência/nome ao trocar de atalho de período —
   * mesmo espírito de hrefStatus/hrefFrequencia, só que aqui de/ate vêm
   * sempre do atalho clicado, nunca de paramsBase (senão um atalho preso
   * ficaria "grudado" ao trocar de outro). */
  const hrefPeriodoRange = (deISO: string, ateISO: string) => {
    const params = new URLSearchParams();
    if (statusFiltro) params.set("status", statusFiltro);
    if (frequenciaFiltro) params.set("frequencia", frequenciaFiltro);
    if (nomeFiltro) params.set("nome", nomeFiltro);
    params.set("de", deISO);
    params.set("ate", ateISO);
    return `/turnos?${params.toString()}`;
  };

  const hrefLimparPeriodoEBusca = () => {
    const params = new URLSearchParams();
    if (statusFiltro) params.set("status", statusFiltro);
    if (frequenciaFiltro) params.set("frequencia", frequenciaFiltro);
    const query = params.toString();
    return query ? `/turnos?${query}` : "/turnos";
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
        {FREQUENCIAS.map((f) => (
          <Link
            key={f.valor}
            href={hrefFrequencia(f.valor)}
            className={`rounded-full border px-3 py-1.5 text-sm transition-colors ${
              (frequenciaFiltro ?? "TODAS") === f.valor
                ? "bg-navy-800 text-white border-navy-800"
                : "border-stone-300 text-stone-600 hover:bg-stone-50"
            }`}
          >
            {f.label}
          </Link>
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        <Link
          href={hrefPeriodoRange(hojeISO, hojeISO)}
          className={`rounded-full border px-3 py-1.5 text-sm transition-colors ${
            de === hojeISO && ate === hojeISO
              ? "bg-brand-600 text-white border-brand-600"
              : "border-stone-300 text-stone-600 hover:bg-stone-50"
          }`}
        >
          Hoje
        </Link>
        <Link
          href={hrefPeriodoRange(ontemISO, ontemISO)}
          className={`rounded-full border px-3 py-1.5 text-sm transition-colors ${
            de === ontemISO && ate === ontemISO
              ? "bg-brand-600 text-white border-brand-600"
              : "border-stone-300 text-stone-600 hover:bg-stone-50"
          }`}
        >
          Ontem
        </Link>
        <Link
          href={hrefPeriodoRange(inicioSemanaISO, hojeISO)}
          className={`rounded-full border px-3 py-1.5 text-sm transition-colors ${
            de === inicioSemanaISO && ate === hojeISO
              ? "bg-brand-600 text-white border-brand-600"
              : "border-stone-300 text-stone-600 hover:bg-stone-50"
          }`}
        >
          Esta semana
        </Link>
        <Link
          href={hrefPeriodoRange(inicioMesISO, hojeISO)}
          className={`rounded-full border px-3 py-1.5 text-sm transition-colors ${
            de === inicioMesISO && ate === hojeISO
              ? "bg-brand-600 text-white border-brand-600"
              : "border-stone-300 text-stone-600 hover:bg-stone-50"
          }`}
        >
          Este mês
        </Link>
      </div>

      <form className="flex flex-wrap items-end gap-3 rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
        {statusFiltro && <input type="hidden" name="status" value={statusFiltro} />}
        {frequenciaFiltro && <input type="hidden" name="frequencia" value={frequenciaFiltro} />}
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
            href={hrefLimparPeriodoEBusca()}
            className="text-sm text-stone-500 hover:underline px-2 py-2"
          >
            Limpar
          </Link>
        )}
      </form>

      {turnos.length === 0 ? (
        <p className="text-stone-500 text-sm">Nenhum turno encontrado.</p>
      ) : (
        <SelecaoTurnosGlobal
          turnos={turnos.map((turno) => ({
            id: turno.id,
            pessoaNome: turno.pessoa.nome,
            funcaoNome: turno.funcao.nome,
            entradaLabel: formatarDataHoraComDiaSemana(turno.horaEntrada),
            saidaLabel: turno.horaSaida
              ? formatarDataHoraComDiaSemana(turno.horaSaida, turno.horaEntrada)
              : null,
            valorTotal: turno.valorTotal !== null ? Number(turno.valorTotal) : null,
            status: turno.status,
            fechamentoAutomatico: turno.fechamentoAutomatico,
            podeCorrigirSaida:
              turno.status !== "ABERTO" &&
              (turno.fechamentoAutomatico || turno.correcaoSaidaEm !== null),
            modoDiaria: turno.modoPagamentoAplicado === "DIARIA",
            frequenciaSemanal: turno.frequenciaPagamentoAplicada === "SEMANAL",
            turnoDobrado: turno.turnoDobrado,
            tipoTurno: turno.turnoDobrado
              ? null
              : classificarTurno(
                  turno.horaEntrada,
                  turnoPredefinidoPorPessoa.get(turno.pessoaId) ?? "LIVRE",
                  empresaConfig.horarioInicioDiaMin,
                  empresaConfig.horarioInicioNoiteMin
                ),
            temContrato: turno.assinaturaContratoUrl !== null,
            temRecibo: turno.horaSaida !== null && turno.valorTotal !== null,
            criadoManualmente: turno.criadoManualmente,
            criadoManualmentePorEmail: turno.criadoManualmentePorEmail,
          }))}
        />
      )}
    </div>
  );
}
