import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireModulo } from "@/lib/requireModulo";
import { inicioDoDiaBrasil, inicioDaSemanaBrasil, inicioDoMesBrasil, dataISOBrasil, instanteBrasil, formatarDataSemHora } from "@/lib/data";
import { LABEL_ESCALA_TRABALHO, horarioEsperadoClt, calcularSaldoDiarioClt, pausaAplicadaEm } from "@/lib/ponto";

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

export default async function RelatorioHorasPage({
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
      where: {
        empresaId: sessao.empresaEfetivoId,
        status: "CONCLUIDO",
        horaEntrada: { gte: dataInicio, lte: dataFim },
      },
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
    prisma.registroPonto.count({
      where: { empresaId: sessao.empresaEfetivoId, status: "PENDENTE_CORRECAO" },
    }),
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
      const horaExtraTotalMin = [...dados.porDia.values()]
        .filter((d) => d.saldoMin > 0)
        .reduce((soma, d) => soma + d.saldoMin, 0);
      const horasDevidasTotalMin = [...dados.porDia.values()]
        .filter((d) => d.saldoMin < 0)
        .reduce((soma, d) => soma - d.saldoMin, 0);
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
    return `/relatorios/horas?preset=${p}`;
  }

  const pdfHref = periodoCustomizado
    ? `/relatorios/horas/pdf?inicio=${inicio}&fim=${fim}`
    : `/relatorios/horas/pdf?preset=${presetValido}`;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link href="/relatorios" className="text-sm text-brand-700 hover:underline">
          ← Relatórios
        </Link>
        <h1 className="text-2xl font-semibold text-navy-900 mt-1">Horas — funcionários CLT</h1>
        <p className="text-stone-600 mt-1 text-sm">
          Controle interno de jornada, sem valor nem pagamento. Não substitui
          o registro eletrônico de ponto oficial (Portaria MTE 671/2021).
        </p>
      </div>

      {pendentes > 0 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          {pendentes} registro(s) sem saída confirmada, pendente(s) de
          correção —{" "}
          <Link href="/funcionarios" className="font-medium hover:underline">
            resolver em Funcionários
          </Link>
          .
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        {PRESETS.map((p) => (
          <Link
            key={p.valor}
            href={linkPeriodo(p.valor)}
            className={`rounded-full border px-3 py-1.5 text-sm transition-colors ${
              !periodoCustomizado && presetValido === p.valor
                ? "bg-stone-800 text-white border-stone-800"
                : "border-stone-300 text-stone-600 hover:bg-stone-50"
            }`}
          >
            {p.label}
          </Link>
        ))}
        <form method="GET" className="flex flex-wrap items-center gap-2">
          <input
            type="date"
            name="inicio"
            defaultValue={inicio ?? ""}
            className="border border-stone-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
          <span className="text-stone-400 text-sm">até</span>
          <input
            type="date"
            name="fim"
            defaultValue={fim ?? ""}
            className="border border-stone-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
          <button
            type="submit"
            className={`rounded-full border px-3 py-1.5 text-sm transition-colors ${
              periodoCustomizado
                ? "bg-stone-800 text-white border-stone-800"
                : "border-stone-300 text-stone-600 hover:bg-stone-50"
            }`}
          >
            Período
          </button>
        </form>
        <a
          href={pdfHref}
          target="_blank"
          rel="noopener noreferrer"
          className="ml-auto rounded-full border border-stone-300 text-stone-600 hover:bg-stone-50 px-3 py-1.5 text-sm"
        >
          Baixar PDF
        </a>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <Card label="Horas trabalhadas" valor={formatarHoras(totalMinutos)} destaque />
        <Card label="Registros no período" valor={String(registros.length)} />
        <Card label="Funcionários no período" valor={String(lista.length)} />
      </div>

      <div>
        <h2 className="font-semibold text-navy-900 mb-2">Por pessoa</h2>
        {lista.length === 0 && (
          <p className="text-stone-500 text-sm">Nenhum registro concluído nesse período.</p>
        )}
        <ul className="flex flex-col gap-2">
          {lista.map((p) => (
            <li
              key={p.pessoaId}
              className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm flex flex-col gap-2"
            >
              <div className="flex items-center justify-between gap-3">
                <div>
                  <Link
                    href={`/funcionarios/${p.pessoaId}`}
                    className="font-medium text-navy-900 hover:underline hover:text-brand-700"
                  >
                    {p.pessoaNome}
                  </Link>
                  <p className="text-xs text-stone-500">
                    {p.registros} registro(s)
                    {p.vinculo?.escalaTrabalho && ` · Escala ${LABEL_ESCALA_TRABALHO[p.vinculo.escalaTrabalho]} (ref.)`}
                    {p.vinculo?.salarioMensal !== null &&
                      p.vinculo?.salarioMensal !== undefined &&
                      ` · R$ ${Number(p.vinculo.salarioMensal).toFixed(2)}/mês (ref.)`}
                  </p>
                  {p.encerradosPelaEmpresa > 0 && (
                    <p className="text-xs text-amber-700 mt-0.5">
                      ⚠️ {p.encerradosPelaEmpresa} registro(s) encerrado(s) manualmente pela empresa
                    </p>
                  )}
                  {(p.horaExtraTotalMin !== null || p.horasDevidasTotalMin !== null) && (
                    <p className="text-xs mt-0.5 flex flex-wrap gap-x-3">
                      {p.horaExtraTotalMin !== null && (
                        <span className="text-brand-700">
                          🕐 {formatarHoras(p.horaExtraTotalMin)} de hora extra no período
                        </span>
                      )}
                      {p.horasDevidasTotalMin !== null && (
                        <span className="text-amber-700">
                          ⚠️ {formatarHoras(p.horasDevidasTotalMin)} de horas devidas no período
                        </span>
                      )}
                    </p>
                  )}
                </div>
                <span className="text-sm font-semibold text-stone-700 shrink-0">{formatarHoras(p.minutos)}</span>
              </div>

              {p.porDia.length > 0 && (
                <ul className="flex flex-col gap-1 border-t border-stone-100 pt-2">
                  {p.porDia.map((d, i) => (
                    <li key={i} className="text-xs text-stone-600 flex flex-wrap items-center justify-between gap-x-3">
                      <span>{d.dataLabel}</span>
                      <span className="flex flex-wrap items-center gap-x-3">
                        <span>{formatarHoras(d.minutos)}</span>
                        {d.horaExtraMin !== null && (
                          <span className="text-brand-700">🕐 +{formatarHoras(d.horaExtraMin)}</span>
                        )}
                        {d.horasDevidasMin !== null && (
                          <span className="text-amber-700">⚠️ -{formatarHoras(d.horasDevidasMin)}</span>
                        )}
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

function Card({ label, valor, destaque }: { label: string; valor: string; destaque?: boolean }) {
  return (
    <div className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
      <p className={`text-2xl font-semibold ${destaque ? "text-brand-700" : "text-navy-900"}`}>
        {valor}
      </p>
      <p className="text-xs text-stone-500 mt-1">{label}</p>
    </div>
  );
}
