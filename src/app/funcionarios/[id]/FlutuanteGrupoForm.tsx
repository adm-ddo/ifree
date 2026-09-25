"use client";

import { useActionState, useState } from "react";
import { atualizarFlutuanteGrupo } from "../actions";

/** Liga/desliga a permissão de esta pessoa CLT bater ponto em qualquer
 * outra empresa do mesmo grupo econômico (ver GrupoEconomicoForm em
 * /empresas) — cópia enxuta de ExtraDiarioForm.tsx, um único checkbox. Só
 * renderizado pela página quando a empresa atual está num grupo (ver
 * empresaTemGrupo). */
export default function FlutuanteGrupoForm({
  pessoaId,
  podeBaterPontoNoGrupoAtual,
}: {
  pessoaId: number;
  podeBaterPontoNoGrupoAtual: boolean;
}) {
  const [state, formAction, pending] = useActionState(atualizarFlutuanteGrupo, undefined);
  const [pode, setPode] = useState(podeBaterPontoNoGrupoAtual);

  return (
    <form
      action={formAction}
      onReset={(e) => e.preventDefault()}
      className="flex flex-col gap-3 rounded-2xl border border-stone-200 bg-white p-6 shadow-sm max-w-lg"
    >
      <input type="hidden" name="pessoaId" value={pessoaId} />
      <div>
        <h2 className="font-semibold text-navy-900">Ponto no grupo econômico</h2>
        <p className="text-xs text-stone-500 mt-1">
          Quando ligado, essa pessoa pode bater ponto CLT em qualquer outra empresa do mesmo grupo
          econômico desta — usando a escala e horário combinados aqui, só mudando o lugar onde
          trabalha.
        </p>
      </div>

      <label className="flex items-center gap-2 text-sm text-stone-700">
        <input
          type="checkbox"
          name="podeBaterPontoNoGrupo"
          checked={pode}
          onChange={(e) => setPode(e.target.checked)}
          className="h-4 w-4 accent-brand-600"
        />
        Pode bater ponto em outras empresas do grupo
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
