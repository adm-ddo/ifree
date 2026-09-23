"use client";

import { useTransition } from "react";
import { selecionarEmpresaV2 } from "@/app/v2/actions";

/** Mesma lógica/UI de src/app/dashboard/SeletorEmpresa.tsx (v1, não
 * tocado), só chamando a action da v2 (selecionarEmpresaV2), que volta
 * pra /v2/dashboard em vez de /dashboard depois de trocar. */
export default function SeletorEmpresaV2({
  empresas,
  empresaAtivaId,
}: {
  empresas: { id: number; nome: string }[];
  empresaAtivaId: number;
}) {
  const [pending, startTransition] = useTransition();

  if (empresas.length <= 1) return null;

  return (
    <select
      value={empresaAtivaId}
      disabled={pending}
      onChange={(e) => {
        const empresaId = Number(e.target.value);
        startTransition(async () => {
          await selecionarEmpresaV2(empresaId);
        });
      }}
      className="rounded-full border border-stone-200 text-xs font-bold px-3 py-2 bg-white disabled:opacity-50 shrink-0"
    >
      {empresas.map((empresa) => (
        <option key={empresa.id} value={empresa.id}>
          {empresa.nome}
        </option>
      ))}
    </select>
  );
}
