"use client";

import { useActionState, useState } from "react";
import { criarFuncao } from "./actions";
import { formatarValorMoeda } from "@/lib/moeda";

export default function NovaFuncaoForm() {
  const [aberto, setAberto] = useState(false);
  const [valor, setValor] = useState("");
  const [state, formAction, pending] = useActionState(criarFuncao, undefined);

  if (!aberto) {
    return (
      <button
        type="button"
        onClick={() => setAberto(true)}
        className="rounded-lg border border-dashed border-stone-300 text-stone-600 hover:border-brand-400 hover:text-brand-700 text-sm px-4 py-3 text-center transition-colors"
      >
        + Cadastrar nova função
      </button>
    );
  }

  return (
    <form
      action={formAction}
      className="flex flex-col gap-3 rounded-2xl border border-stone-200 bg-white p-4 shadow-sm"
    >
      <h2 className="font-semibold text-navy-900">Nova função</h2>

      <div className="flex flex-col gap-1">
        <label className="text-xs text-stone-500">Nome da função</label>
        <input
          name="nome"
          required
          autoFocus
          placeholder="Ex: Garçom, Cozinha, Bar"
          className="border border-stone-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-xs text-stone-500">Valor por hora (R$)</label>
        <input
          name="valorHoraPadrao"
          value={valor}
          onChange={(e) => setValor(formatarValorMoeda(e.target.value))}
          required
          inputMode="decimal"
          placeholder="Ex: 20,00"
          className="border border-stone-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
      </div>

      {state?.erro && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          {state.erro}
        </p>
      )}

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium px-4 py-2 disabled:opacity-50 transition-colors"
        >
          {pending ? "Cadastrando..." : "Cadastrar"}
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
