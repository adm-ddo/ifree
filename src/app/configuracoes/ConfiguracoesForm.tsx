"use client";

import { useActionState } from "react";
import { atualizarConfiguracoes } from "./actions";

export default function ConfiguracoesForm({
  nome,
  cnpj,
  endereco,
}: {
  nome: string;
  cnpj: string;
  endereco: string;
}) {
  const [state, formAction, pending] = useActionState(atualizarConfiguracoes, undefined);

  return (
    <form
      action={formAction}
      className="flex flex-col gap-3 rounded-2xl border border-stone-200 bg-white p-6 shadow-sm max-w-lg"
    >
      <h2 className="font-semibold text-navy-900">Dados da empresa</h2>

      <div className="flex flex-col gap-1">
        <label className="text-xs text-stone-500">Nome</label>
        <input
          name="nome"
          required
          defaultValue={nome}
          className="border border-stone-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-xs text-stone-500">CNPJ</label>
        <input
          name="cnpj"
          required
          defaultValue={cnpj}
          className="border border-stone-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-xs text-stone-500">Endereço (opcional)</label>
        <input
          name="endereco"
          defaultValue={endereco}
          className="border border-stone-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
      </div>

      {state?.erro && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          {state.erro}
        </p>
      )}
      {state?.sucesso && (
        <p className="text-sm text-brand-700 bg-brand-50 border border-brand-200 rounded-lg px-3 py-2">
          Dados salvos.
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium py-2.5 disabled:opacity-50 transition-colors"
      >
        {pending ? "Salvando..." : "Salvar"}
      </button>
    </form>
  );
}
