"use client";

import { useTransition } from "react";
import { removerEmpresa, selecionarEmpresa, excluirEmpresa } from "./actions";

type Empresa = { id: number; nome: string; cnpj: string; endereco: string | null };

export default function EmpresaRow({ empresa }: { empresa: Empresa }) {
  const [pending, startTransition] = useTransition();

  return (
    <li className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="font-medium text-navy-900">{empresa.nome}</p>
        <p className="text-sm text-stone-500">
          {empresa.cnpj}
          {empresa.endereco ? ` · ${empresa.endereco}` : ""}
        </p>
      </div>
      <div className="flex flex-wrap gap-2 shrink-0">
        <button
          disabled={pending}
          onClick={() => {
            if (
              confirm(
                `Remover "${empresa.nome}" deste login? Os dados dela não serão apagados, só o vínculo com esta conta.`
              )
            ) {
              startTransition(async () => {
                await removerEmpresa(empresa.id);
              });
            }
          }}
          className="text-sm text-stone-600 hover:text-navy-900 disabled:opacity-50 inline-block py-2 px-2 -my-2"
        >
          Remover
        </button>
        <button
          disabled={pending}
          onClick={() => {
            if (
              confirm(
                `Apagar "${empresa.nome}" (${empresa.cnpj}) de verdade? Isso apaga TODAS as funções, totens, turnos e pagamentos dessa empresa, sem volta.`
              )
            ) {
              startTransition(async () => {
                await excluirEmpresa(empresa.id);
              });
            }
          }}
          className="text-sm text-red-600 hover:text-red-800 disabled:opacity-50 inline-block py-2 px-2 -my-2"
        >
          Excluir permanentemente
        </button>
        <button
          disabled={pending}
          onClick={() => {
            startTransition(async () => {
              await selecionarEmpresa(empresa.id);
            });
          }}
          className="rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-sm px-3 py-1.5 font-medium transition-colors disabled:opacity-50"
        >
          Entrar
        </button>
      </div>
    </li>
  );
}
