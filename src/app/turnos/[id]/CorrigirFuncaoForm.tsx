"use client";

import { useActionState } from "react";
import { corrigirFuncaoTurno } from "../actions";

export default function CorrigirFuncaoForm({
  turnoId,
  funcaoAtualId,
  funcoes,
}: {
  turnoId: number;
  funcaoAtualId: number;
  funcoes: { id: number; nome: string }[];
}) {
  const [state, formAction, pending] = useActionState(corrigirFuncaoTurno, undefined);
  const opcoes = funcoes.filter((f) => f.id !== funcaoAtualId);

  return (
    <form
      action={formAction}
      className="flex flex-col gap-3 rounded-2xl border border-stone-200 bg-white p-4 shadow-sm"
    >
      <input type="hidden" name="turnoId" value={turnoId} />
      <div>
        <h2 className="font-semibold text-navy-900 text-sm">Corrigir função</h2>
        <p className="text-xs text-stone-500 mt-1">
          Use quando a pessoa escolheu a função errada na hora de bater o
          ponto — o valor do turno é recalculado pela função certa.
        </p>
      </div>

      {opcoes.length === 0 ? (
        <p className="text-sm text-stone-500">
          Não há outra função ativa cadastrada nesta empresa.
        </p>
      ) : (
        <div className="flex flex-wrap items-end gap-3">
          <label className="flex flex-col gap-1 text-sm text-stone-700">
            Função correta
            <select
              name="funcaoId"
              required
              defaultValue=""
              className="border border-stone-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              <option value="" disabled>
                Selecione...
              </option>
              {opcoes.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.nome}
                </option>
              ))}
            </select>
          </label>
          <button
            type="submit"
            disabled={pending}
            className="rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium px-4 py-2.5 disabled:opacity-50 transition-colors"
          >
            {pending ? "Corrigindo..." : "Corrigir função"}
          </button>
        </div>
      )}

      {state?.erro && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          {state.erro}
        </p>
      )}
      {state?.sucesso && (
        <p className="text-sm text-brand-700 bg-brand-50 border border-brand-200 rounded-lg px-3 py-2">
          Função corrigida e valor recalculado.
        </p>
      )}
    </form>
  );
}
