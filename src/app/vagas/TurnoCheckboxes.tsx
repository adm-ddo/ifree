/** Dois checkboxes independentes — pode marcar só um ou os dois (vaga
 * flexível pra qualquer horário). Usado tanto na criação (NovaVagaForm)
 * quanto na edição (EditarVagaForm) de uma vaga. */
export default function TurnoCheckboxes({
  turnoDiaInicial = true,
  turnoNoiteInicial = true,
}: {
  turnoDiaInicial?: boolean;
  turnoNoiteInicial?: boolean;
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
          <span className="text-sm text-navy-900">☀️ Dia</span>
        </label>
        <label className="flex-1 flex items-center gap-2 rounded-lg border border-stone-200 px-3 py-2 has-[:checked]:border-brand-400 has-[:checked]:bg-brand-50 cursor-pointer">
          <input
            type="checkbox"
            name="turnoNoite"
            defaultChecked={turnoNoiteInicial}
            className="h-4 w-4 accent-brand-600"
          />
          <span className="text-sm text-navy-900">🌙 Noite</span>
        </label>
      </div>
    </div>
  );
}
