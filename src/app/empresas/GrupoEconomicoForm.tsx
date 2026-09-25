"use client";

import { useActionState, useState } from "react";
import { salvarGrupoEconomico } from "./actions";

type EmpresaOpcao = { id: number; nome: string; grupoEconomicoId: number | null };

/** Junta empresas do MESMO login num grupo econômico — permite que um
 * funcionário CLT marcado como flutuante (ver FlutuanteGrupoForm em
 * /funcionarios/[id]) bata ponto em qualquer empresa do grupo, sem
 * precisar de vínculo próprio em cada uma. Auto-serviço: só aparece
 * quando o login já tem 2+ empresas (mesmo dono, senão não faz sentido).
 * Compartilhado entre /empresas (v1) e /v2/empresas — sem link nenhum
 * que difira entre as duas, mesmo padrão de EmpresaRow/NovaEmpresaForm. */
export default function GrupoEconomicoForm({
  empresas,
  nomeGrupoAtual,
}: {
  empresas: EmpresaOpcao[];
  nomeGrupoAtual: string | null;
}) {
  const [state, formAction, pending] = useActionState(salvarGrupoEconomico, undefined);
  const grupoAtualId = empresas.find((e) => e.grupoEconomicoId !== null)?.grupoEconomicoId ?? null;
  const [selecionadas, setSelecionadas] = useState<Set<number>>(
    () => new Set(empresas.filter((e) => e.grupoEconomicoId === grupoAtualId && grupoAtualId !== null).map((e) => e.id))
  );

  if (empresas.length < 2) return null;

  return (
    <form
      action={formAction}
      onReset={(e) => e.preventDefault()}
      className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm flex flex-col gap-3"
    >
      <div>
        <h2 className="font-semibold text-navy-900">Grupo econômico</h2>
        <p className="text-sm text-stone-500 mt-1">
          Empresas do mesmo grupo (ex.: matriz + filiais) deixam um funcionário CLT marcado como
          flutuante bater ponto em qualquer uma delas, sem duplicar cadastro. Selecione pelo menos 2
          empresas suas pra formar um grupo.
        </p>
      </div>

      <label className="flex flex-col gap-1 text-sm text-stone-700">
        Nome do grupo
        <input
          type="text"
          name="nome"
          defaultValue={nomeGrupoAtual ?? ""}
          placeholder="Ex.: Restaurantes Kero Sushi"
          className="border border-stone-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
      </label>

      <div className="flex flex-col gap-2">
        {empresas.map((empresa) => (
          <label key={empresa.id} className="flex items-center gap-2 text-sm text-stone-700">
            <input
              type="checkbox"
              name="empresaIds"
              value={empresa.id}
              checked={selecionadas.has(empresa.id)}
              onChange={(e) => {
                const proximo = new Set(selecionadas);
                if (e.target.checked) proximo.add(empresa.id);
                else proximo.delete(empresa.id);
                setSelecionadas(proximo);
              }}
              className="h-4 w-4 accent-brand-600"
            />
            {empresa.nome}
            {empresa.grupoEconomicoId !== null && empresa.grupoEconomicoId !== grupoAtualId && (
              <span className="text-xs text-stone-400">(já está em outro grupo)</span>
            )}
          </label>
        ))}
      </div>

      {state?.erro && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          {state.erro}
        </p>
      )}
      {state?.sucesso && (
        <p className="text-sm text-brand-700 bg-brand-50 border border-brand-200 rounded-lg px-3 py-2">
          Grupo salvo.
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium py-2.5 disabled:opacity-50 transition-colors self-start px-6"
      >
        {pending ? "Salvando..." : "Salvar grupo"}
      </button>
    </form>
  );
}
