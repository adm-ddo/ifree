"use client";

import { useState, useTransition } from "react";
import { alternarAtivoFuncao, atualizarValorHoraFuncao, excluirFuncao } from "./actions";
import { formatarValorMoeda } from "@/lib/moeda";

type Funcao = { id: number; nome: string; valorHoraPadrao: number; ativo: boolean };

export default function FuncaoRow({ funcao }: { funcao: Funcao }) {
  const [pending, startTransition] = useTransition();
  const [valor, setValor] = useState(funcao.valorHoraPadrao.toFixed(2));

  return (
    <li className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="font-medium text-navy-900">
          {funcao.nome}{" "}
          {!funcao.ativo && (
            <span className="text-xs text-stone-500 font-normal">(desativada)</span>
          )}
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-2 shrink-0">
        <div className="flex items-center gap-1">
          <span className="text-sm text-stone-500">R$</span>
          <input
            value={valor}
            onChange={(e) => setValor(formatarValorMoeda(e.target.value))}
            onBlur={() => {
              const novoValor = Number(valor.replace(",", "."));
              if (Number.isFinite(novoValor) && novoValor > 0 && novoValor !== funcao.valorHoraPadrao) {
                startTransition(async () => {
                  await atualizarValorHoraFuncao(funcao.id, novoValor);
                });
              } else {
                setValor(funcao.valorHoraPadrao.toFixed(2));
              }
            }}
            className="border border-stone-300 rounded-lg px-2 py-1.5 text-sm w-20 text-right focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
          <span className="text-sm text-stone-500">/hora</span>
        </div>
        <button
          disabled={pending}
          onClick={() => {
            startTransition(async () => {
              await alternarAtivoFuncao(funcao.id, !funcao.ativo);
            });
          }}
          className="rounded-lg border border-stone-300 text-sm px-3 py-1.5 text-stone-700 hover:bg-stone-50 disabled:opacity-50"
        >
          {funcao.ativo ? "Desativar" : "Ativar"}
        </button>
        <button
          disabled={pending}
          onClick={() => {
            if (confirm(`Excluir a função "${funcao.nome}"?`)) {
              startTransition(async () => {
                await excluirFuncao(funcao.id);
              });
            }
          }}
          className="text-sm text-red-600 hover:text-red-800 disabled:opacity-50 inline-block py-1.5 px-2"
        >
          Excluir
        </button>
      </div>
    </li>
  );
}
