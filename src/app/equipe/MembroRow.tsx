"use client";

import { useTransition } from "react";
import { alternarAcessoEquipe } from "./actions";

type Empresa = { id: number; nome: string };

type Membro = {
  usuarioId: number;
  nomeCompleto: string | null;
  email: string;
  empresaIdsComAcesso: number[];
};

export default function MembroRow({
  membro,
  empresas,
}: {
  membro: Membro;
  empresas: Empresa[];
}) {
  const [pending, startTransition] = useTransition();
  const acessoIds = new Set(membro.empresaIdsComAcesso);

  return (
    <li className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm flex flex-col gap-2">
      <div>
        <p className="font-medium text-navy-900">{membro.nomeCompleto || membro.email}</p>
        {membro.nomeCompleto && <p className="text-xs text-stone-500">{membro.email}</p>}
      </div>
      <div className="flex flex-wrap gap-2">
        {empresas.map((empresa) => {
          const temAcesso = acessoIds.has(empresa.id);
          return (
            <button
              key={empresa.id}
              type="button"
              disabled={pending}
              onClick={() => {
                startTransition(async () => {
                  await alternarAcessoEquipe(membro.usuarioId, empresa.id, !temAcesso);
                });
              }}
              className={`rounded-full border px-3 py-1.5 text-xs transition-colors disabled:opacity-50 ${
                temAcesso
                  ? "bg-brand-600 border-brand-600 text-white"
                  : "border-stone-300 text-stone-500 hover:bg-stone-50"
              }`}
            >
              {temAcesso ? "✓ " : ""}
              {empresa.nome}
            </button>
          );
        })}
      </div>
    </li>
  );
}
