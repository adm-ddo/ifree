"use client";

import { useActionState } from "react";
import { adicionarEntradaEpi } from "../../../actions";
import CampoValorReais from "@/components/CampoValorReais";

export default function AdicionarEntradaEpiForm({ pessoaId }: { pessoaId: number }) {
  const [state, formAction, pending] = useActionState(adicionarEntradaEpi.bind(null, pessoaId), undefined);

  return (
    <form
      action={formAction}
      className="flex flex-col gap-3 rounded-2xl border border-stone-200 bg-white p-4 shadow-sm max-w-lg"
    >
      <h2 className="font-semibold text-navy-900 text-sm">+ Registrar entrega</h2>

      <label className="flex flex-col gap-1 text-sm text-stone-700">
        Item
        <input
          type="text"
          name="item"
          required
          placeholder="Ex: Luva de proteção, bota, avental..."
          className="border border-stone-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
      </label>

      <div className="grid grid-cols-2 gap-3">
        <label className="flex flex-col gap-1 text-sm text-stone-700">
          Quantidade
          <input
            type="number"
            name="quantidade"
            min={1}
            defaultValue={1}
            required
            className="border border-stone-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </label>
        <CampoValorReais name="valorUnitario" label="Valor unitário (R$, opcional)" placeholder="0,00" />
        <label className="flex flex-col gap-1 text-sm text-stone-700">
          C.A. (opcional)
          <input
            type="text"
            name="numeroCA"
            placeholder="Certificado de Aprovação"
            className="border border-stone-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm text-stone-700">
          Data de entrega
          <input
            type="date"
            name="dataEntrega"
            required
            defaultValue={new Date().toISOString().slice(0, 10)}
            className="border border-stone-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </label>
      </div>

      <label className="flex flex-col gap-1 text-sm text-stone-700">
        Observação (opcional)
        <input
          type="text"
          name="observacao"
          className="border border-stone-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
      </label>

      {state?.erro && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{state.erro}</p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium py-2.5 disabled:opacity-50 transition-colors self-start px-4"
      >
        {pending ? "Salvando..." : "Adicionar"}
      </button>
    </form>
  );
}
