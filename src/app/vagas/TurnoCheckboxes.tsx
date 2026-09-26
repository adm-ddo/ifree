import { minutosParaHorario } from "@/lib/ponto";

export type HorariosTurnoEmpresa = {
  inicioDiaMin: number;
  fechamentoDiaMin: number;
  inicioNoiteMin: number;
  fechamentoNoiteMin: number;
};

/** Dois checkboxes independentes — pode marcar só um ou os dois (vaga
 * flexível pra qualquer horário). Usado tanto na criação (NovaVagaForm)
 * quanto na edição (EditarVagaForm) de uma vaga.
 *
 * `horarios` (opcional) mostra embaixo de cada opção o horário que a
 * própria empresa já configurou em /configuracoes (HorarioFechamentoForm,
 * Empresa.horarioInicioDiaMin/horarioFechamentoDiaMin e os pares da
 * noite) — pedido do Thiago em 2026-09-26: a empresa não devia ter que
 * repetir esse horário na descrição da vaga, já que o sistema já sabe
 * qual é. Puramente informativo aqui (mesmos minutos já usados por
 * classificarTurno, src/lib/turno.ts, pra classificar o turno de quem
 * bate ponto sem escala fixa) — não é um horário exclusivo desta vaga. */
export default function TurnoCheckboxes({
  turnoDiaInicial = true,
  turnoNoiteInicial = true,
  horarios,
}: {
  turnoDiaInicial?: boolean;
  turnoNoiteInicial?: boolean;
  horarios?: HorariosTurnoEmpresa;
}) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs text-stone-500">Turno</label>
      <div className="flex gap-2">
        <label className="flex-1 flex items-center gap-2 rounded-lg border border-stone-200 px-3 py-2 has-[:checked]:border-brand-400 has-[:checked]:bg-brand-50 cursor-pointer">
          <input
            type="checkbox"
            name="turnoDia"
            defaultChecked={turnoDiaInicial}
            className="h-4 w-4 accent-brand-600"
          />
          <span className="text-sm text-navy-900">
            ☀️ Dia
            {horarios && (
              <span className="block text-xs text-stone-500 font-normal">
                {minutosParaHorario(horarios.inicioDiaMin)}–{minutosParaHorario(horarios.fechamentoDiaMin)}
              </span>
            )}
          </span>
        </label>
        <label className="flex-1 flex items-center gap-2 rounded-lg border border-stone-200 px-3 py-2 has-[:checked]:border-brand-400 has-[:checked]:bg-brand-50 cursor-pointer">
          <input
            type="checkbox"
            name="turnoNoite"
            defaultChecked={turnoNoiteInicial}
            className="h-4 w-4 accent-brand-600"
          />
          <span className="text-sm text-navy-900">
            🌙 Noite
            {horarios && (
              <span className="block text-xs text-stone-500 font-normal">
                {minutosParaHorario(horarios.inicioNoiteMin)}–{minutosParaHorario(horarios.fechamentoNoiteMin)}
              </span>
            )}
          </span>
        </label>
      </div>
      {horarios && (
        <p className="text-xs text-stone-400">
          Horários configurados em Configurações — ajuste lá se não forem estes.
        </p>
      )}
    </div>
  );
}
