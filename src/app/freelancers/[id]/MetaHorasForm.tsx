"use client";

import { useActionState } from "react";
import { atualizarMetaHorasVinculo } from "../actions";

export default function MetaHorasForm({
  pessoaId,
  cargaHorariaSemanalHorasAtual,
}: {
  pessoaId: number;
  cargaHorariaSemanalHorasAtual: number | null;
}) {
  const [state, formAction, pending] = useActionState(atualizarMetaHorasVinculo, undefined);

  return (
    <form
      action={formAction}
      className="flex flex-col gap-3 rounded-2xl border border-stone-200 bg-white p-6 shadow-sm max-w-lg"
    >
      <input type="hidden" name="pessoaId" value={pessoaId} />
      <div>
        <h2 className="font-semibold text-navy-900">Meta de horas semanais</h2>
        <p className="text-xs text-stone-500 mt-1">
          Opcional — não muda o pagamento (continua pelas horas reais), só
          serve de referência no resumo semanal/mensal em Relatórios, pra
          avisar quando essa pessoa trabalhar bem mais ou bem menos que o
          esperado.
        </p>
      </div>

      <label className="flex flex-col gap-1 text-sm text-stone-700 max-w-[10rem]">
        Horas por semana
        <input
          name="cargaHorariaSemanalHoras"
          defaultValue={cargaHorariaSemanalHorasAtual ?? ""}
          inputMode="decimal"
          placeholder="20"
          className="border border-stone-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
      </label>

      {state?.erro && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          {state.erro}
        </p>
      )}
      {state?.sucesso && (
        <p className="text-sm text-brand-700 bg-brand-50 border border-brand-200 rounded-lg px-3 py-2">
          Configuração salva.
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium py-2.5 disabled:opacity-50 transition-colors self-start px-4"
      >
        {pending ? "Salvando..." : "Salvar"}
      </button>
    </form>
  );
}
