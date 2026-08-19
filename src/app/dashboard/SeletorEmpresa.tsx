"use client";

import { useTransition } from "react";
import { selecionarEmpresa } from "@/app/empresas/actions";

/** Troca rápida de empresa direto do dashboard, sem passar por /empresas —
 * só aparece pra quem tem mais de uma empresa vinculada ao login. Reusa a
 * mesma action de /empresas (já confere posse e atualiza a sessão). */
export default function SeletorEmpresa({
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
          await selecionarEmpresa(empresaId);
        });
      }}
      className="rounded-lg border border-stone-300 text-sm px-3 py-2 bg-white disabled:opacity-50 shrink-0"
    >
      {empresas.map((empresa) => (
        <option key={empresa.id} value={empresa.id}>
          {empresa.nome}
        </option>
      ))}
    </select>
  );
}
