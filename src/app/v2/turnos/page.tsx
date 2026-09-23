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
import SelecaoTurnosGlobalV2 from "@/components/v2/SelecaoTurnosGlobalV2";
import type { StatusTurno, FrequenciaPagamento } from "@/generated/prisma/enums";
import type { Prisma } from "@/generated/prisma/client";

/** Espelho completo de src/app/turnos/page.tsx (v1, não tocado) no visual
 * da v2 — mesmos filtros (status, frequência, período, nome), mesma
 * query, mesma seleção em massa pra imprimir contrato/recibo. Links de
 * detalhe/corrigir saída apontam pro /v2/turnos/[id] (já com versão v2
 * própria). */
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

function PillFiltro({ href, ativo, children }: { href: string; ativo: boolean; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className={`rounded-full border px-3 py-1.5 text-xs font-bold transition-colors ${
        ativo ? "bg-brand-500 text-white border-brand-500" : "border-stone-200 bg-white text-stone-600"
      }`}
    >
      {children}
    </Link>
  );
}

export default async function V2TurnosPage({
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

  const empresaConfig = await prisma.empresa.findUniqueOrThrow({
    where: { id: sessao.empresaEfetivoId },
    select: { horarioInicioDiaMin: true, horarioInicioNoiteMin: true },
  });
  const vinculos = await prisma.vinculoPessoaEmpresa.findMany({
    where: { empresaId: sessao.empresaEfetivoId, pessoaId: { in: turnos.map((t) => t.pessoaId) } },
    select: { pessoaId: true, turnoPredefinido: true },
  });
  const turnoPredefinidoPorPessoa = new Map(vinculos.map((v) => [v.pessoaId, v.turnoPredefinido]));

  const paramsBase = new URLSearchParams();
  if (statusFiltro) paramsBase.set("status", statusFiltro);
  if (frequenciaFiltro) paramsBase.set("frequencia", frequenciaFiltro);
  if (nomeFiltro) paramsBase.set("nome", nomeFiltro);
  if (de) paramsBase.set("de", de);
  if (ate) paramsBase.set("ate", ate);

  const BASE = "/v2/turnos";

  const hrefStatus = (valor: StatusTurno | "TODOS") => {
    const params = new URLSearchParams(paramsBase);
    if (valor === "TODOS") params.delete("status");
    else params.set("status", valor);
    const query = params.toString();
    return query ? `${BASE}?${query}` : BASE;
  };

  const hrefFrequencia = (valor: FrequenciaPagamento | "TODAS") => {
    const params = new URLSearchParams(paramsBase);
    if (valor === "TODAS") params.delete("frequencia");
    else params.set("frequencia", valor);
    const query = params.toString();
    return query ? `${BASE}?${query}` : BASE;
  };

  const agora = new Date();
  const hojeISO = dataISOBrasil(agora);
  const ontemISO = dataISOBrasil(new Date(agora.getTime() - 24 * 60 * 60 * 1000));
  const inicioSemanaISO = dataISOBrasil(inicioDaSemanaBrasil(agora));
  const inicioMesISO = dataISOBrasil(inicioDoMesBrasil(agora));

  const hrefPeriodoRange = (deISO: string, ateISO: string) => {
    const params = new URLSearchParams();
    if (statusFiltro) params.set("status", statusFiltro);
    if (frequenciaFiltro) params.set("frequencia", frequenciaFiltro);
    if (nomeFiltro) params.set("nome", nomeFiltro);
    params.set("de", deISO);
    params.set("ate", ateISO);
    return `${BASE}?${params.toString()}`;
  };

  const hrefLimparPeriodoEBusca = () => {
    const params = new URLSearchParams();
    if (statusFiltro) params.set("status", statusFiltro);
    if (frequenciaFiltro) params.set("frequencia", frequenciaFiltro);
    const query = params.toString();
    return query ? `${BASE}?${query}` : BASE;
  };

  return (
    <div className="flex flex-col gap-4 max-w-3xl">
      <div>
        <h1 className="text-xl font-extrabold text-navy-900">Turnos</h1>
        <p className="text-stone-500 text-sm mt-0.5">
          Histórico de check-ins/check-outs no totem, com contrato e recibo de cada um.
        </p>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {FILTROS.map((f) => (
          <PillFiltro key={f.valor} href={hrefStatus(f.valor)} ativo={(statusFiltro ?? "TODOS") === f.valor}>
            {f.label}
          </PillFiltro>
        ))}
      </div>

      <div className="flex flex-wrap gap-1.5">
        {FREQUENCIAS.map((f) => (
          <PillFiltro key={f.valor} href={hrefFrequencia(f.valor)} ativo={(frequenciaFiltro ?? "TODAS") === f.valor}>
            {f.label}
          </PillFiltro>
        ))}
      </div>

      <div className="flex flex-wrap gap-1.5">
        <PillFiltro href={hrefPeriodoRange(hojeISO, hojeISO)} ativo={de === hojeISO && ate === hojeISO}>
          Hoje
        </PillFiltro>
        <PillFiltro href={hrefPeriodoRange(ontemISO, ontemISO)} ativo={de === ontemISO && ate === ontemISO}>
          Ontem
        </PillFiltro>
        <PillFiltro href={hrefPeriodoRange(inicioSemanaISO, hojeISO)} ativo={de === inicioSemanaISO && ate === hojeISO}>
          Esta semana
        </PillFiltro>
        <PillFiltro href={hrefPeriodoRange(inicioMesISO, hojeISO)} ativo={de === inicioMesISO && ate === hojeISO}>
          Este mês
        </PillFiltro>
      </div>

      <form className="flex flex-wrap items-end gap-3 rounded-2xl bg-white border border-stone-200 p-3.5">
        {statusFiltro && <input type="hidden" name="status" value={statusFiltro} />}
        {frequenciaFiltro && <input type="hidden" name="frequencia" value={frequenciaFiltro} />}
        <label className="flex flex-col gap-1 text-xs font-semibold text-stone-600">
          Nome
          <input
            type="text"
            name="nome"
            defaultValue={nomeFiltro}
            placeholder="Buscar por nome..."
            className="border border-stone-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </label>
        <label className="flex flex-col gap-1 text-xs font-semibold text-stone-600">
          De
          <input
            type="date"
            name="de"
            defaultValue={de ?? ""}
            className="border border-stone-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </label>
        <label className="flex flex-col gap-1 text-xs font-semibold text-stone-600">
          Até
          <input
            type="date"
            name="ate"
            defaultValue={ate ?? ""}
            className="border border-stone-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </label>
        <button
          type="submit"
          className="rounded-full bg-brand-500 hover:bg-brand-600 text-white text-xs font-bold px-4 py-2.5 transition-colors"
        >
          Filtrar
        </button>
        {(nomeFiltro || de || ate) && (
          <Link href={hrefLimparPeriodoEBusca()} className="text-xs text-stone-500 hover:underline px-2 py-2">
            Limpar
          </Link>
        )}
      </form>

      {turnos.length === 0 ? (
        <p className="text-stone-500 text-sm rounded-2xl border border-stone-200 bg-white p-4">
          Nenhum turno encontrado.
        </p>
      ) : (
        <SelecaoTurnosGlobalV2
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
              turno.status !== "ABERTO" && (turno.fechamentoAutomatico || turno.correcaoSaidaEm !== null),
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
