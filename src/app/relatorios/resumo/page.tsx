import Link from "next/link";
import { requireModulo } from "@/lib/requireModulo";
import { inicioDaSemanaBrasil, inicioDoMesBrasil } from "@/lib/data";
import {
  calcularResumoHoras,
  semanaPassadaFechada,
  mesPassadoFechado,
  TOLERANCIA_MIN,
  type ResumoPessoa,
} from "@/lib/resumo-horas";

type Periodo = "semana" | "mes";

function formatarHoras(minutos: number): string {
  const sinal = minutos < 0 ? "-" : "";
  const abs = Math.abs(minutos);
  return `${sinal}${Math.floor(abs / 60)}h${String(abs % 60).padStart(2, "0")}min`;
}

function formatarData(data: Date): string {
  return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", timeZone: "America/Sao_Paulo" }).format(data);
}

export default async function ResumoHorasPage({
  searchParams,
}: {
  searchParams: Promise<{ periodo?: string }>;
}) {
  const sessao = await requireModulo("relatorios");
  const { periodo } = await searchParams;
  const periodoValido: Periodo = periodo === "mes" ? "mes" : "semana";

  const agora = new Date();
  const janela =
    periodoValido === "mes"
      ? mesPassadoFechado(agora, inicioDoMesBrasil)
      : semanaPassadaFechada(agora, inicioDaSemanaBrasil);

  const resumo = await calcularResumoHoras(sessao.empresaEfetivoId, janela);

  const fimInclusivo = new Date(janela.fim.getTime() - 1);
  const periodoLabel = `${formatarData(janela.inicio)} a ${formatarData(fimInclusivo)}`;

  const possivelFalta = resumo.filter((p) => p.possivelFalta === true);
  const semFalta = resumo.filter((p) => !p.possivelFalta);
  const horaExtra = semFalta.filter((p) => p.diferencaMinutos !== null && p.diferencaMinutos > TOLERANCIA_MIN);
  const horaAMenos = semFalta.filter((p) => p.diferencaMinutos !== null && p.diferencaMinutos < -TOLERANCIA_MIN);
  const dentroOuSemMeta = semFalta.filter(
    (p) => p.diferencaMinutos === null || Math.abs(p.diferencaMinutos) <= TOLERANCIA_MIN
  );

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link href="/relatorios" className="text-sm text-brand-700 hover:underline">
          ← Relatórios
        </Link>
        <h1 className="text-2xl font-semibold text-navy-900 mt-1">Resumo de horas</h1>
        <p className="text-stone-600 mt-1 text-sm">
          Extra e CLT juntos, sempre num período já fechado — nunca a
          semana ou o mês ainda em andamento. Compara contra a meta de
          horas semanais configurada em cada pessoa (opcional, em{" "}
          <Link href="/freelancers" className="underline">Freelancers</Link>{" "}
          ou <Link href="/funcionarios" className="underline">Funcionários</Link>).
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Link
          href="/relatorios/resumo?periodo=semana"
          className={`rounded-full border px-3 py-1.5 text-sm transition-colors ${
            periodoValido === "semana"
              ? "bg-stone-800 text-white border-stone-800"
              : "border-stone-300 text-stone-600 hover:bg-stone-50"
          }`}
        >
          Semana passada
        </Link>
        <Link
          href="/relatorios/resumo?periodo=mes"
          className={`rounded-full border px-3 py-1.5 text-sm transition-colors ${
            periodoValido === "mes"
              ? "bg-stone-800 text-white border-stone-800"
              : "border-stone-300 text-stone-600 hover:bg-stone-50"
          }`}
        >
          Mês passado
        </Link>
        <span className="text-sm text-stone-500 ml-1">{periodoLabel}</span>
      </div>

      {resumo.length === 0 && (
        <p className="text-stone-500 text-sm">Ninguém trabalhou nesse período.</p>
      )}

      {possivelFalta.length > 0 && (
        <Secao titulo="⚠️ Possível falta" corTitulo="text-red-700" pessoas={possivelFalta} />
      )}
      {horaExtra.length > 0 && (
        <Secao titulo="🔺 Hora extra" corTitulo="text-amber-700" pessoas={horaExtra} />
      )}
      {horaAMenos.length > 0 && (
        <Secao titulo="🔻 Horas a menos" corTitulo="text-red-700" pessoas={horaAMenos} />
      )}
      {dentroOuSemMeta.length > 0 && (
        <Secao titulo="Dentro da meta (ou sem meta configurada)" corTitulo="text-stone-700" pessoas={dentroOuSemMeta} />
      )}
    </div>
  );
}

function Secao({
  titulo,
  corTitulo,
  pessoas,
}: {
  titulo: string;
  corTitulo: string;
  pessoas: ResumoPessoa[];
}) {
  return (
    <div>
      <h2 className={`font-semibold mb-2 ${corTitulo}`}>{titulo}</h2>
      <ul className="flex flex-col gap-2">
        {pessoas.map((p) => (
          <li
            key={p.pessoaId}
            className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm flex items-center justify-between gap-3 flex-wrap"
          >
            <div>
              <Link
                href={p.tipoVinculo === "CLT" ? `/funcionarios/${p.pessoaId}` : `/freelancers/${p.pessoaId}`}
                className="font-medium text-navy-900 hover:text-brand-700 hover:underline"
              >
                {p.nome}
              </Link>
              <p className="text-xs text-stone-500 flex items-center gap-1.5 mt-0.5 flex-wrap">
                <span
                  className={`text-[10px] font-medium uppercase tracking-wide rounded-full border px-1.5 py-0.5 shrink-0 ${
                    p.tipoVinculo === "CLT"
                      ? "border-indigo-200 bg-indigo-50 text-indigo-700"
                      : "border-stone-200 bg-stone-50 text-stone-500"
                  }`}
                >
                  {p.tipoVinculo === "CLT" ? "CLT" : "Extra"}
                </span>
                {p.metaMinutos !== null && <span>meta {formatarHoras(p.metaMinutos)}</span>}
                {p.semAtrasoNoPeriodo === true && <span className="text-brand-700">🎯 sem atraso no período</span>}
              </p>
              {p.possivelFalta && (
                <p className="text-xs text-red-700 mt-0.5">
                  ⚠️ {p.diasSemBaterPonto} dia(s) sem bater ponto — possível falta (a empresa decide se
                  conta e se afeta bonificação)
                </p>
              )}
            </div>
            <div className="text-right shrink-0">
              <p className="text-sm font-semibold text-stone-800">{formatarHoras(p.minutosTrabalhados)}</p>
              {p.diferencaMinutos !== null && (
                <p className={`text-xs ${p.diferencaMinutos >= 0 ? "text-amber-700" : "text-red-700"}`}>
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
