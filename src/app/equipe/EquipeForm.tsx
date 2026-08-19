"use client";

import { useActionState } from "react";
import { criarAcessoSecundario } from "./actions";

type Empresa = { id: number; nome: string };

export default function EquipeForm({ empresas }: { empresas: Empresa[] }) {
  const [state, formAction, pending] = useActionState(criarAcessoSecundario, undefined);

  return (
    <form
      action={formAction}
      className="flex flex-col gap-3 rounded-2xl border border-stone-200 bg-white p-6 shadow-sm max-w-lg"
    >
      <div>
        <h2 className="font-semibold text-navy-900">Criar novo acesso</h2>
        <p className="text-xs text-stone-500 mt-1">
          Cria um login separado (com acesso total, igual ao seu) pras
          empresas que você marcar abaixo.
        </p>
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-xs text-stone-500">Nome completo</label>
        <input
          name="nomeCompleto"
          required
          className="border border-stone-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-xs text-stone-500">E-mail</label>
        <input
          name="email"
          type="email"
          required
          className="border border-stone-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-xs text-stone-500">Senha (mín. 8 caracteres)</label>
        <input
          name="senha"
          type="password"
          required
          minLength={8}
          className="border border-stone-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-xs text-stone-500">Acesso às empresas</label>
        <div className="flex flex-col gap-1 rounded-lg border border-stone-200 p-2">
          {empresas.map((empresa) => (
            <label key={empresa.id} className="flex items-center gap-2 text-sm px-1 py-1">
              <input
                type="checkbox"
                name="empresaIds"
                value={empresa.id}
                className="h-4 w-4 accent-brand-600"
              />
              {empresa.nome}
            </label>
          ))}
        </div>
      </div>

      {state?.erro && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          {state.erro}
        </p>
      )}
      {state?.sucesso && (
        <p className="text-sm text-brand-700 bg-brand-50 border border-brand-200 rounded-lg px-3 py-2">
          Acesso criado.
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium py-2.5 disabled:opacity-50 transition-colors"
      >
        {pending ? "Criando..." : "Criar acesso"}
      </button>
    </form>
  );
}
