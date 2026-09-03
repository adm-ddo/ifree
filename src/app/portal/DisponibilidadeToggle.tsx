"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { atualizarDisponibilidade } from "./actions";

export default function DisponibilidadeToggle({ inicial }: { inicial: boolean }) {
  const [disponivel, setDisponivel] = useState(inicial);
  const [pending, startTransition] = useTransition();

  // Resincroniza durante a renderização se o dado real mudar por outro
  // caminho (ex.: página se atualiza sozinha após salvar outro card do
  // Portal) — sem isso o toggle podia ficar preso no valor de quando a
  // tela abriu.
  const [inicialAnterior, setInicialAnterior] = useState(inicial);
  if (inicial !== inicialAnterior) {
    setInicialAnterior(inicial);
    setDisponivel(inicial);
  }

  return (
    <div className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm flex flex-col gap-2">
      <label className="flex items-center gap-3 cursor-pointer">
        <input
          type="checkbox"
          checked={disponivel}
          disabled={pending}
          onChange={(e) => {
            const novoValor = e.target.checked;
            setDisponivel(novoValor);
            startTransition(() => atualizarDisponibilidade(novoValor));
          }}
          className="h-5 w-5 accent-brand-500"
        />
        <span className="font-medium text-navy-900 text-sm">
          🔎 Disponível para novas oportunidades
        </span>
      </label>
      <p className="text-xs text-stone-500">
        Quando ativado, você vê e pode se candidatar às vagas publicadas
        por empresas no iFREE.
      </p>
      {disponivel && (
        <Link href="/portal/vagas" className="text-sm text-brand-700 underline self-start">
          Ver vagas disponíveis →
        </Link>
      )}
    </div>
  );
}
