import Link from "next/link";
import { requireModulo } from "@/lib/requireModulo";
import { inicioDaSemanaBrasil, inicioDoMesBrasil } from "@/lib/data";
import { calcularResumoHoras, semanaPassadaFechada, mesPassadoFechado, TOLERANCIA_MIN, type ResumoPessoa } from "@/lib/resumo-horas";

/** Espelho completo de src/app/relatorios/resumo/page.tsx (v1, não
 * tocado) — mesma query/regra. Link de pessoa EXTRA vai pro
 * /v2/freelancers/[id] (já existe); CLT continua no /funcionarios/[id]
 * do v1 (módulo Funcionários ainda não tem versão v2). */
type Periodo = "semana" | "mes";

function formatarHoras(minutos: number): string {
  const sinal = minutos < 0 ? "-" : "";
  const abs = Math.abs(minutos);
  return `${sinal}${Math.floor(abs / 60)}h${String(abs % 60).padStart(2, "0")}min`;
}

function formatarData(data: Date): string {
  return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", timeZone: "America/Sao_Paulo" }).format(data);
}

export default async function V2ResumoHorasPage({ searchParams }: { searchParams: Promise<{ periodo?: string }> }) {
  const sessao = await requireModulo("relatorios");
  const { periodo } = await searchParams;
  const periodoValido: Periodo = periodo === "mes" ? "mes" : "semana";

  const agora = new Date();
  const janela = periodoValido === "mes" ? mesPassadoFechado(agora, inicioDoMesBrasil) : semanaPassadaFechada(agora, inicioDaSemanaBrasil);

  const resumo = await calcularResumoHoras(sessao.empresaEfetivoId, janela);

  const fimInclusivo = new Date(janela.fim.getTime() - 1);
  const periodoLabel = `${formatarData(janela.inicio)} a ${formatarData(fimInclusivo)}`;

  const possivelFalta = resumo.filter((p) => p.possivelFalta === true);
  const semFalta = resumo.filter((p) => !p.possivelFalta);
  const horaExtra = semFalta.filter((p) => p.diferencaMinutos !== null && p.diferencaMinutos > TOLERANCIA_MIN);
  const horaAMenos = semFalta.filter((p) => p.diferencaMinutos !== null && p.diferencaMinutos < -TOLERANCIA_MIN);
  const dentroOuSemMeta = semFalta.filter((p) => p.diferencaMinutos === null || Math.abs(p.diferencaMinutos) <= TOLERANCIA_MIN);

  return (
    <div className="flex flex-col gap-4 max-w-3xl">
      <div>
        <Link href="/v2/relatorios" className="text-xs font-bold text-brand-700">
          ← Relatórios
        </Link>
        <h1 className="text-xl font-extrabold text-navy-900 mt-1">Resumo de horas</h1>
        <p className="text-stone-500 text-sm mt-0.5">
          Extra e CLT juntos, sempre num período já fechado — nunca a semana ou o mês ainda em andamento.
          Compara contra a meta de horas semanais configurada em cada pessoa (opcional, em{" "}
          <Link href="/v2/freelancers" className="underline">
            Freelancers
          </Link>{" "}
          ou{" "}
          <Link href="/funcionarios" className="underline">
            Funcionários
          </Link>
          ).
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        <Link
          href="/v2/relatorios/resumo?periodo=semana"
          className={`rounded-full border px-3 py-1.5 text-xs font-bold transition-colors ${periodoValido === "semana" ? "bg-navy-900 text-white border-transparent" : "border-stone-200 bg-white text-stone-600"}`}
        >
          Semana passada
        </Link>
        <Link
          href="/v2/relatorios/resumo?periodo=mes"
          className={`rounded-full border px-3 py-1.5 text-xs font-bold transition-colors ${periodoValido === "mes" ? "bg-navy-900 text-white border-transparent" : "border-stone-200 bg-white text-stone-600"}`}
        >
          Mês passado
        </Link>
        <span className="text-xs text-stone-500 ml-1">{periodoLabel}</span>
      </div>

      {resumo.length === 0 && <p className="text-stone-500 text-sm">Ninguém trabalhou nesse período.</p>}

      {possivelFalta.length > 0 && <Secao titulo="⚠️ Possível falta" corTitulo="text-red-700" pessoas={possivelFalta} />}
      {horaExtra.length > 0 && <Secao titulo="🔺 Hora extra" corTitulo="text-amber-700" pessoas={horaExtra} />}
      {horaAMenos.length > 0 && <Secao titulo="🔻 Horas a menos" corTitulo="text-red-700" pessoas={horaAMenos} />}
      {dentroOuSemMeta.length > 0 && <Secao titulo="Dentro da meta (ou sem meta configurada)" corTitulo="text-stone-700" pessoas={dentroOuSemMeta} />}
    </div>
  );
}

function Secao({ titulo, corTitulo, pessoas }: { titulo: string; corTitulo: string; pessoas: ResumoPessoa[] }) {
  return (
    <div>
      <h2 className={`font-bold text-[13px] mb-2 ${corTitulo}`}>{titulo}</h2>
      <ul className="flex flex-col gap-2">
        {pessoas.map((p) => (
          <li key={p.pessoaId} className="rounded-xl bg-white border border-stone-200 p-3.5 flex items-center justify-between gap-3 flex-wrap">
            <div>
              <Link
                href={p.tipoVinculo === "CLT" ? `/v2/funcionarios/${p.pessoaId}` : `/v2/freelancers/${p.pessoaId}`}
                className="font-bold text-[13px] text-navy-900 hover:underline"
              >
                {p.nome}
              </Link>
              <p className="text-[11px] text-stone-500 flex items-center gap-1.5 mt-0.5 flex-wrap">
                <span
                  className={`text-[9px] font-bold uppercase tracking-wide rounded-full px-1.5 py-0.5 shrink-0 ${
                    p.tipoVinculo === "CLT" ? "bg-indigo-100 text-indigo-700" : "bg-stone-100 text-stone-600"
                  }`}
                >
                  {p.tipoVinculo === "CLT" ? "CLT" : "Extra"}
                </span>
                {p.metaMinutos !== null && <span>meta {formatarHoras(p.metaMinutos)}</span>}
                {p.semAtrasoNoPeriodo === true && <span className="text-brand-700">🎯 sem atraso no período</span>}
              </p>
              {p.possivelFalta && (
                <p className="text-[11px] text-red-700 mt-0.5">
                  ⚠️ {p.diasSemBaterPonto} dia(s) sem bater ponto — possível falta (a empresa decide se conta e se afeta bonificação)
                </p>
              )}
            </div>
            <div className="text-right shrink-0">
              <p className="text-[13px] font-bold text-navy-900">{formatarHoras(p.minutosTrabalhados)}</p>
              {p.diferencaMinutos !== null && (
                <p className={`text-[11px] font-bold ${p.diferencaMinutos >= 0 ? "text-amber-700" : "text-red-700"}`}>
                  {p.diferencaMinutos >= 0 ? "+" : ""}
                  {formatarHoras(p.diferencaMinutos)}
                </p>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
