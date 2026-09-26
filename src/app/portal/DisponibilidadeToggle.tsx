"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { atualizarDisponibilidade } from "./actions";

/** O convite mais importante da home do Portal — é daqui que sai quem vê
 * o quadro de vagas ou não. Antes era um card branco discreto com um link
 * sublinhado pequeno; agora o botão de "ver vagas" é o elemento mais
 * chamativo da tela (pedido do Thiago: "deixa óbvio que é aqui que a
 * pessoa vê as vagas anunciadas"). */
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
    <div className="rounded-3xl bg-gradient-to-br from-brand-500 to-brand-600 p-5 sm:p-6 flex flex-col gap-4 shadow-xl shadow-brand-900/20">
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
          className="h-5 w-5 accent-navy-900 shrink-0"
        />
        <span className="font-bold text-navy-900 text-sm sm:text-base">
          🔎 Disponível para novas oportunidades
        </span>
      </label>

      {disponivel ? (
        <Link
          href="/portal/vagas"
          className="group flex items-center justify-between gap-3 rounded-2xl bg-navy-900 hover:bg-navy-800 p-4 sm:p-5 transition-colors"
        >
          <span className="flex flex-col">
            <span className="text-white font-black text-base sm:text-lg leading-tight">
              👉 É aqui que você vê as vagas anunciadas!
            </span>
            <span className="text-navy-300 text-xs sm:text-sm mt-0.5">
              Empresas publicando vaga agora — dá uma olhada
            </span>
          </span>
          <span className="shrink-0 rounded-full bg-brand-500 group-hover:bg-brand-400 text-navy-900 font-bold text-sm sm:text-base px-4 py-2.5 transition-colors whitespace-nowrap">
            Ver vagas →
          </span>
        </Link>
      ) : (
        <p className="text-navy-900/80 text-sm">
          Ative pra ver e se candidatar às vagas publicadas por empresas no iFREE.
        </p>
      )}
    </div>
  );
}
