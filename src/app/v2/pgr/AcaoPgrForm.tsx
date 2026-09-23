"use client";

import { useActionState, useState } from "react";
import { criarAcaoPgr } from "./actions";
import { ORDEM_DIMENSOES_PGR, LABEL_DIMENSAO_PGR } from "@/lib/pgr-questionario";

export default function AcaoPgrForm() {
  const [aberto, setAberto] = useState(false);
  const [state, formAction, pending] = useActionState(criarAcaoPgr, undefined);

  if (!aberto) {
    return (
      <button
        type="button"
        onClick={() => setAberto(true)}
        className="rounded-lg border border-dashed border-stone-300 text-stone-600 hover:border-brand-400 hover:text-brand-700 text-sm px-4 py-3 text-center transition-colors"
      >
        + Adicionar ação ao plano
      </button>
    );
  }

  if (state?.sucesso) {
    return (
      <p className="text-sm text-brand-700 bg-brand-50 border border-brand-200 rounded-lg px-3 py-2">
        Ação adicionada.{" "}
        <button type="button" onClick={() => setAberto(false)} className="underline font-medium">
          Fechar
        </button>
      </p>
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-3 rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
      <h2 className="font-semibold text-navy-900 text-sm">Nova ação do plano</h2>

      <label className="flex flex-col gap-1 text-sm text-stone-700">
        Dimensão do risco
        <select
          name="dimensao"
          required
          defaultValue=""
          className="border border-stone-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500"
        >
          <option value="" disabled>
            Selecione...
          </option>
          {ORDEM_DIMENSOES_PGR.map((d) => (
            <option key={d} value={d}>
              {LABEL_DIMENSAO_PGR[d]}
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-1 text-sm text-stone-700">
        Risco identificado
        <textarea
          name="descricaoRisco"
          required
          rows={2}
          placeholder="Ex: equipe da cozinha relatou sobrecarga nos horários de pico, sem apoio suficiente."
          className="border border-stone-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
      </label>

      <label className="flex flex-col gap-1 text-sm text-stone-700">
        Medida planejada
        <textarea
          name="medida"
          required
          rows={2}
          placeholder="Ex: reforçar a escala nos horários de pico e revisar a divisão de tarefas."
          className="border border-stone-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
      </label>

      <div className="grid grid-cols-2 gap-3">
        <label className="flex flex-col gap-1 text-sm text-stone-700">
          Responsável (opcional)
          <input
            name="responsavel"
            className="border border-stone-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm text-stone-700">
          Prazo (opcional)
          <input
            type="date"
            name="prazo"
            className="border border-stone-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </label>
      </div>

      {state?.erro && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{state.erro}</p>
      )}

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium px-4 py-2 disabled:opacity-50 transition-colors"
        >
          {pending ? "Salvando..." : "Salvar ação"}
        </button>
        <button
          type="button"
          onClick={() => setAberto(false)}
          className="rounded-lg border border-stone-300 text-sm px-4 py-2"
        >
          Cancelar
        </button>
      </div>
    </form>
  );
}
