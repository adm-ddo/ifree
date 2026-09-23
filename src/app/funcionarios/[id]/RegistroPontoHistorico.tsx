"use client";

import { useActionState, useState } from "react";
import { corrigirRegistroPonto } from "../actions";
import type { StatusRegistroPonto } from "@/generated/prisma/enums";

type RegistroResumo = {
  id: number;
  entradaLabel: string;
  intervaloLabel: string | null;
  saidaLabel: string | null;
  minutosTrabalhados: number | null;
  /// Desconto automático de intervalo já embutido em minutosTrabalhados
  /// (ver src/lib/ponto.ts:calcularMinutosPonto) — null quando não houve
  /// desconto (jornada curta, sem modoPausa configurado, ou intervalo
  /// batido de verdade no totem, que já teve sua duração real subtraída
  /// em minutosTrabalhados sem precisar deste campo).
  minutosDescontadosPausa: number | null;
  status: StatusRegistroPonto;
  encerradoManualmentePorEmail: string | null;
  /// Desvio contra o horário esperado da escala/pessoa (ver
  /// src/lib/ponto.ts:calcularDesvioPontoClt) — null quando não há horário
  /// configurado pra comparar, ou quando o desvio está dentro da
  /// tolerância.
  atrasoEntradaMin: number | null;
  saidaAntecipadaMin: number | null;
  /// Saldo do dia contra a meta esperada (ver
  /// src/lib/ponto.ts:calcularSaldoDiarioClt) — null quando não há
  /// horário configurado pra comparar, ou quando o saldo está dentro da
  /// tolerância.
  horaExtraMin: number | null;
  horasDevidasMin: number | null;
  /// Sugestão de horário de saída pra preencher a correção manual (ver
  /// src/lib/ponto.ts:saidaEsperadaClt) — já formatada pro
  /// datetime-local, no horário esperado da escala/pessoa. Null quando
  /// não há horário configurado, e nesse caso o campo continua em branco.
  saidaSugeridaValue: string | null;
  /// horaSaida atual já formatada pro datetime-local — usada pra
  /// pré-preencher o formulário quando o registro já foi corrigido antes
  /// e o dono quer ajustar de novo (diferente de saidaSugeridaValue, que
  /// só vale pra primeira correção, sem saída nenhuma ainda). Null
  /// enquanto o registro não tem saída (ainda aberto).
  horaSaidaValue: string | null;
};

const STATUS_LABEL: Record<StatusRegistroPonto, string> = {
  ABERTO: "Aberto",
  CONCLUIDO: "Concluído",
  PENDENTE_CORRECAO: "Pendente de correção",
};

const STATUS_CLASSE: Record<StatusRegistroPonto, string> = {
  ABERTO: "bg-blue-50 text-blue-700 border-blue-200",
  CONCLUIDO: "bg-brand-50 text-brand-700 border-brand-200",
  PENDENTE_CORRECAO: "bg-amber-50 text-amber-700 border-amber-200",
};

function formatarHoras(minutos: number): string {
  const h = Math.floor(minutos / 60);
  const m = minutos % 60;
  return `${h}h${String(m).padStart(2, "0")}min`;
}

export default function RegistroPontoHistorico({
  registros,
  podeGerarAdvertencia,
}: {
  registros: RegistroResumo[];
  /// Se CTPS (número + série/UF) e cargo já estão preenchidos no cadastro
  /// dessa pessoa — sem isso o modelo da carta ficaria com campo em
  /// branco, então o botão de gerar advertência não aparece.
  podeGerarAdvertencia: boolean;
}) {
  return (
    <ul className="flex flex-col gap-2">
      {registros.map((registro) => (
        <li
          key={registro.id}
          className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm flex flex-col gap-2"
        >
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm text-navy-900">
                entrada {registro.entradaLabel}
                {registro.intervaloLabel ? ` · intervalo ${registro.intervaloLabel}` : ""}
                {registro.saidaLabel ? ` · saída ${registro.saidaLabel}` : ""}
              </p>
              {registro.minutosTrabalhados !== null && (
                <p className="text-xs text-stone-500 mt-0.5">
                  {formatarHoras(registro.minutosTrabalhados)} trabalhadas
                  {registro.minutosDescontadosPausa !== null &&
                    ` (já com ${registro.minutosDescontadosPausa}min de intervalo descontados)`}
                </p>
              )}
              {registro.encerradoManualmentePorEmail && (
                <p className="text-xs text-amber-700 mt-0.5 flex flex-wrap items-center gap-x-2">
                  <span>Encerrado manualmente pela empresa ({registro.encerradoManualmentePorEmail})</span>
                  {podeGerarAdvertencia ? (
                    <a
                      href={`/funcionarios/advertencia/${registro.id}/pdf`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-red-700 hover:underline font-medium"
                    >
                      📄 Gerar advertência
                    </a>
                  ) : (
                    <span className="text-stone-400">
                      (preencha CTPS e cargo no cadastro pra gerar advertência)
                    </span>
                  )}
                </p>
              )}
              {(registro.atrasoEntradaMin !== null || registro.saidaAntecipadaMin !== null) && (
                <p className="text-xs text-amber-700 mt-0.5 flex flex-wrap gap-x-3">
                  {registro.atrasoEntradaMin !== null && (
                    <span>⏰ Chegou {registro.atrasoEntradaMin} min atrasado</span>
                  )}
                  {registro.saidaAntecipadaMin !== null && (
                    <span>🏃 Saiu {registro.saidaAntecipadaMin} min antes da hora</span>
                  )}
                </p>
              )}
              {(registro.horaExtraMin !== null || registro.horasDevidasMin !== null) && (
                <p className="text-xs mt-0.5 flex flex-wrap gap-x-3">
                  {registro.horaExtraMin !== null && (
                    <span className="text-brand-700">
                      🕐 {formatarHoras(registro.horaExtraMin)} de hora extra
                    </span>
                  )}
                  {registro.horasDevidasMin !== null && (
                    <span className="text-amber-700">
                      ⚠️ {formatarHoras(registro.horasDevidasMin)} de horas devidas
                    </span>
                  )}
                </p>
              )}
            </div>
            <span
              className={`text-xs rounded-full border px-2 py-1 self-start shrink-0 ${STATUS_CLASSE[registro.status]}`}
            >
              {STATUS_LABEL[registro.status]}
            </span>
          </div>

          {registro.status === "PENDENTE_CORRECAO" && (
            <CorrecaoInline
              registroId={registro.id}
              valorPadrao={registro.saidaSugeridaValue}
              rotuloAbrir="Ninguém bateu a saída — corrigir manualmente"
              dica={
                registro.saidaSugeridaValue
                  ? "Sugestão com base no horário configurado — confira se bate com o que aconteceu de verdade."
                  : null
              }
            />
          )}
          {registro.status === "CONCLUIDO" && registro.encerradoManualmentePorEmail && (
            <CorrecaoInline
              registroId={registro.id}
              valorPadrao={registro.horaSaidaValue}
              rotuloAbrir="Corrigir horário de saída de novo"
              dica={null}
            />
          )}
        </li>
      ))}
    </ul>
  );
}

function CorrecaoInline({
  registroId,
  valorPadrao,
  rotuloAbrir,
  dica,
}: {
  registroId: number;
  valorPadrao: string | null;
  rotuloAbrir: string;
  dica: string | null;
}) {
  const [aberto, setAberto] = useState(false);
  const [state, formAction, pending] = useActionState(corrigirRegistroPonto, undefined);

  if (state?.sucesso) {
    return (
      <p className="text-xs text-brand-700 bg-brand-50 border border-brand-200 rounded-lg px-3 py-2">
        Corrigido.
      </p>
    );
  }

  if (!aberto) {
    return (
      <button
        type="button"
        onClick={() => setAberto(true)}
        className="text-xs text-amber-800 hover:underline self-start"
      >
        {rotuloAbrir}
      </button>
    );
  }

  return (
    <form action={formAction} className="flex flex-wrap items-end gap-2 border-t border-stone-100 pt-2">
      <input type="hidden" name="registroId" value={registroId} />
      <label className="flex flex-col gap-1 text-xs text-stone-700">
        Horário de saída
        <input
          type="datetime-local"
          name="horaSaida"
          defaultValue={valorPadrao ?? undefined}
          required
          className="border border-stone-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
        {dica && <span className="text-[11px] text-stone-500">{dica}</span>}
      </label>
      <button
        type="submit"
        disabled={pending}
        className="rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-xs font-medium px-3 py-1.5 disabled:opacity-50 transition-colors"
      >
        {pending ? "Salvando..." : "Salvar"}
      </button>
      {state?.erro && <p className="text-xs text-red-600 w-full">{state.erro}</p>}
    </form>
  );
}
