import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireModulo } from "@/lib/requireModulo";
import { inicioDoDiaBrasil, inicioDaSemanaBrasil, inicioDoMesBrasil, dataISOBrasil, instanteBrasil, formatarDataSemHora } from "@/lib/data";
import { LABEL_ESCALA_TRABALHO, horarioEsperadoClt, calcularSaldoDiarioClt, pausaAplicadaEm } from "@/lib/ponto";

/** Espelho completo de src/app/relatorios/horas/page.tsx (v1, não
 * tocado) — mesma query/regra. Link de cada pessoa continua no
 * /funcionarios/[id] do v1 (módulo Funcionários ainda não tem versão
 * v2). */
type Preset = "hoje" | "semana" | "mes";

const PRESETS: { valor: Preset; label: string }[] = [
  { valor: "hoje", label: "Hoje" },
  { valor: "semana", label: "Esta semana" },
  { valor: "mes", label: "Este mês" },
];

function calcularPeriodo(preset: Preset, agora: Date): { inicio: Date; fim: Date } {
  const fim = agora;
  if (preset === "hoje") return { inicio: inicioDoDiaBrasil(agora), fim };
  if (preset === "semana") return { inicio: inicioDaSemanaBrasil(agora), fim };
  return { inicio: inicioDoMesBrasil(agora), fim };
}

function formatarHoras(minutos: number): string {
  return `${Math.floor(minutos / 60)}h${String(minutos % 60).padStart(2, "0")}min`;
}

export default async function V2RelatorioHorasPage({
  searchParams,
}: {
  searchParams: Promise<{ preset?: string; inicio?: string; fim?: string }>;
}) {
  const sessao = await requireModulo("relatorios");
  const { preset, inicio, fim } = await searchParams;

  const presetValido = PRESETS.some((p) => p.valor === preset) ? (preset as Preset) : "mes";
  const agora = new Date();
  const periodoCustomizado = Boolean(inicio && fim);
  const { inicio: dataInicio, fim: dataFim } = periodoCustomizado
    ? { inicio: new Date(`${inicio}T00:00:00-03:00`), fim: new Date(`${fim}T23:59:59-03:00`) }
    : calcularPeriodo(presetValido, agora);

  const [registros, pendentes, vinculos, empresaConfig] = await Promise.all([
    prisma.registroPonto.findMany({
      where: { empresaId: sessao.empresaEfetivoId, status: "CONCLUIDO", horaEntrada: { gte: dataInicio, lte: dataFim } },
      select: {
        pessoaId: true,
        horaEntrada: true,
        entradaIntervalo: true,
        saidaIntervalo: true,
        minutosTrabalhados: true,
        minutosDescontadosPausa: true,
        correcaoSaidaEm: true,
        pessoa: { select: { nome: true } },
      },
    }),
    prisma.registroPonto.count({ where: { empresaId: sessao.empresaEfetivoId, status: "PENDENTE_CORRECAO" } }),
    prisma.vinculoPessoaEmpresa.findMany({
      where: { empresaId: sessao.empresaEfetivoId, tipoVinculo: "CLT" },
      select: {
        pessoaId: true,
        escalaTrabalho: true,
        salarioMensal: true,
        escalaTurno: true,
        horarioEntradaMin: true,
        horarioSaidaMin: true,
      },
    }),
    prisma.empresa.findUniqueOrThrow({
      where: { id: sessao.empresaEfetivoId },
      select: {
        horarioEntrada5x2Min: true,
        horarioSaida5x2Min: true,
        horarioEntrada5x2NoiteMin: true,
        horarioSaida5x2NoiteMin: true,
        horarioEntrada6x1Min: true,
        horarioSaida6x1Min: true,
        horarioEntrada6x1NoiteMin: true,
        horarioSaida6x1NoiteMin: true,
        horarioEntrada12x36Min: true,
        horarioSaida12x36Min: true,
        horarioEntrada12x36NoiteMin: true,
        horarioSaida12x36NoiteMin: true,
      },
    }),
  ]);

  const vinculoPorPessoa = new Map(vinculos.map((v) => [v.pessoaId, v]));
  const horarioEsperadoPorPessoa = new Map(
    vinculos.map((v) => [
      v.pessoaId,
      horarioEsperadoClt(v.escalaTrabalho, v.escalaTurno, v.horarioEntradaMin, v.horarioSaidaMin, empresaConfig),
    ])
  );

  let totalMinutos = 0;
  const porPessoa = new Map<
    number,
    {
      pessoaNome: string;
      minutos: number;
      registros: number;
      encerradosPelaEmpresa: number;
      porDia: Map<string, { minutos: number; saldoMin: number }>;
    }
  >();
  for (const r of registros) {
    const minutos = r.minutosTrabalhados ?? 0;
    totalMinutos += minutos;
    const atual = porPessoa.get(r.pessoaId) ?? {
      pessoaNome: r.pessoa.nome,
      minutos: 0,
      registros: 0,
      encerradosPelaEmpresa: 0,
      porDia: new Map<string, { minutos: number; saldoMin: number }>(),
    };
    atual.minutos += minutos;
    atual.registros += 1;
    if (r.correcaoSaidaEm) atual.encerradosPelaEmpresa += 1;

    const esperado = horarioEsperadoPorPessoa.get(r.pessoaId) ?? null;
    const saldo = calcularSaldoDiarioClt(r.minutosTrabalhados, esperado, pausaAplicadaEm(r));
    const saldoMin = (saldo.horaExtraMin ?? 0) - (saldo.horasDevidasMin ?? 0);
    const dataISO = dataISOBrasil(r.horaEntrada);
    const dia = atual.porDia.get(dataISO) ?? { minutos: 0, saldoMin: 0 };
    dia.minutos += minutos;
    dia.saldoMin += saldoMin;
    atual.porDia.set(dataISO, dia);

    porPessoa.set(r.pessoaId, atual);
  }
  const lista = [...porPessoa.entries()]
    .map(([pessoaId, dados]) => {
      const porDia = [...dados.porDia.entries()]
        .sort(([a], [b]) => (a < b ? -1 : 1))
        .map(([dataISO, d]) => ({
          dataLabel: formatarDataSemHora(instanteBrasil(dataISO)),
          minutos: d.minutos,
          horaExtraMin: d.saldoMin > 0 ? d.saldoMin : null,
          horasDevidasMin: d.saldoMin < 0 ? -d.saldoMin : null,
        }));
      const horaExtraTotalMin = [...dados.porDia.values()].filter((d) => d.saldoMin > 0).reduce((soma, d) => soma + d.saldoMin, 0);
      const horasDevidasTotalMin = [...dados.porDia.values()].filter((d) => d.saldoMin < 0).reduce((soma, d) => soma - d.saldoMin, 0);
      return {
        pessoaId,
        pessoaNome: dados.pessoaNome,
        minutos: dados.minutos,
        registros: dados.registros,
        encerradosPelaEmpresa: dados.encerradosPelaEmpresa,
        vinculo: vinculoPorPessoa.get(pessoaId),
        porDia,
        horaExtraTotalMin: horaExtraTotalMin || null,
        horasDevidasTotalMin: horasDevidasTotalMin || null,
      };
    })
    .sort((a, b) => b.minutos - a.minutos);

  function linkPeriodo(p: Preset): string {
    return `/v2/relatorios/horas?preset=${p}`;
  }

  const pdfHref = periodoCustomizado ? `/relatorios/horas/pdf?inicio=${inicio}&fim=${fim}` : `/relatorios/horas/pdf?preset=${presetValido}`;

  return (
    <div className="flex flex-col gap-4 max-w-3xl">
      <div>
        <Link href="/v2/relatorios" className="text-xs font-bold text-brand-700">
          ← Relatórios
        </Link>
        <h1 className="text-xl font-extrabold text-navy-900 mt-1">Horas — funcionários CLT</h1>
        <p className="text-stone-500 text-sm mt-0.5">
          Controle interno de jornada, sem valor nem pagamento. Não substitui o registro eletrônico de ponto
          oficial (Portaria MTE 671/2021).
        </p>
      </div>

      {pendentes > 0 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-3 text-xs text-amber-800">
          {pendentes} registro(s) sem saída confirmada, pendente(s) de correção —{" "}
          <Link href="/funcionarios" className="font-bold underline">
            resolver em Funcionários
          </Link>
          .
        </div>
      )}

      <div className="flex flex-wrap items-center gap-1.5">
        {PRESETS.map((p) => (
          <Link
            key={p.valor}
            href={linkPeriodo(p.valor)}
            className={`rounded-full border px-3 py-1.5 text-xs font-bold transition-colors ${
              !periodoCustomizado && presetValido === p.valor ? "bg-navy-900 text-white border-transparent" : "border-stone-200 bg-white text-stone-600"
            }`}
          >
            {p.label}
          </Link>
        ))}
        <form method="GET" action="/v2/relatorios/horas" className="flex flex-wrap items-center gap-1.5">
          <input type="date" name="inicio" defaultValue={inicio ?? ""} className="border border-stone-200 rounded-lg px-2 py-1.5 text-xs" />
          <span className="text-stone-400 text-xs">até</span>
          <input type="date" name="fim" defaultValue={fim ?? ""} className="border border-stone-200 rounded-lg px-2 py-1.5 text-xs" />
          <button type="submit" className={`rounded-full border px-3 py-1.5 text-xs font-bold ${periodoCustomizado ? "bg-navy-900 text-white border-transparent" : "border-stone-200 bg-white text-stone-600"}`}>
            Período
          </button>
        </form>
        <a href={pdfHref} target="_blank" rel="noopener noreferrer" className="ml-auto rounded-full border border-stone-200 text-stone-600 px-3 py-1.5 text-xs font-bold">
          Baixar PDF
        </a>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <div className="bg-navy-900 text-white rounded-2xl p-4 col-span-2 sm:col-span-1">
          <p className="text-xl font-extrabold">{formatarHoras(totalMinutos)}</p>
          <p className="text-xs opacity-70 mt-1">Horas trabalhadas</p>
        </div>
        <div className="bg-white border border-stone-200 rounded-2xl p-4">
          <p className="text-xl font-extrabold text-navy-900">{registros.length}</p>
          <p className="text-xs text-stone-500 mt-1">Registros no período</p>
        </div>
        <div className="bg-white border border-stone-200 rounded-2xl p-4">
          <p className="text-xl font-extrabold text-navy-900">{lista.length}</p>
          <p className="text-xs text-stone-500 mt-1">Funcionários no período</p>
        </div>
      </div>

      <div>
        <h2 className="font-bold text-navy-900 mb-2 text-[13px]">Por pessoa</h2>
        {lista.length === 0 && <p className="text-stone-500 text-sm">Nenhum registro concluído nesse período.</p>}
        <ul className="flex flex-col gap-2">
          {lista.map((p) => (
            <li key={p.pessoaId} className="rounded-xl bg-white border border-stone-200 p-3.5 flex flex-col gap-2">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <Link href={`/v2/funcionarios/${p.pessoaId}`} className="font-bold text-[13px] text-navy-900 hover:underline">
                    {p.pessoaNome}
                  </Link>
                  <p className="text-[11px] text-stone-500">
                    {p.registros} registro(s)
                    {p.vinculo?.escalaTrabalho && ` · Escala ${LABEL_ESCALA_TRABALHO[p.vinculo.escalaTrabalho]} (ref.)`}
                    {p.vinculo?.salarioMensal !== null && p.vinculo?.salarioMensal !== undefined && ` · R$ ${Number(p.vinculo.salarioMensal).toFixed(2)}/mês (ref.)`}
                  </p>
                  {p.encerradosPelaEmpresa > 0 && (
                    <p className="text-[11px] text-amber-700 mt-0.5">⚠️ {p.encerradosPelaEmpresa} registro(s) encerrado(s) manualmente pela empresa</p>
                  )}
                  {(p.horaExtraTotalMin !== null || p.horasDevidasTotalMin !== null) && (
                    <p className="text-[11px] mt-0.5 flex flex-wrap gap-x-3">
                      {p.horaExtraTotalMin !== null && (
                        <span className="text-brand-700">🕐 {formatarHoras(p.horaExtraTotalMin)} de hora extra no período</span>
                      )}
                      {p.horasDevidasTotalMin !== null && (
                        <span className="text-amber-700">⚠️ {formatarHoras(p.horasDevidasTotalMin)} de horas devidas no período</span>
                      )}
                    </p>
                  )}
                </div>
                <span className="text-[13px] font-bold text-navy-900 shrink-0">{formatarHoras(p.minutos)}</span>
              </div>

              {p.porDia.length > 0 && (
                <ul className="flex flex-col gap-1 border-t border-stone-100 pt-2">
                  {p.porDia.map((d, i) => (
                    <li key={i} className="text-[11px] text-stone-600 flex flex-wrap items-center justify-between gap-x-3">
                      <span>{d.dataLabel}</span>
                      <span className="flex flex-wrap items-center gap-x-3">
                        <span>{formatarHoras(d.minutos)}</span>
                        {d.horaExtraMin !== null && <span className="text-brand-700">🕐 +{formatarHoras(d.horaExtraMin)}</span>}
                        {d.horasDevidasMin !== null && <span className="text-amber-700">⚠️ -{formatarHoras(d.horasDevidasMin)}</span>}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
