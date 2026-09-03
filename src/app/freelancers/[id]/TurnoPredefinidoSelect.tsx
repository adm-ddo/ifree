"use client";

import { useState, useTransition } from "react";
import { atualizarTurnoPredefinido } from "../actions";
import type { TurnoPredefinido } from "@/generated/prisma/enums";

export default function TurnoPredefinidoSelect({
  pessoaId,
  valorAtual,
}: {
  pessoaId: number;
  valorAtual: TurnoPredefinido;
}) {
  const [valor, setValor] = useState(valorAtual);
  const [erro, setErro] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  // Resincroniza durante a renderização se o dado real mudar por outro
  // caminho (ex.: página se atualiza sozinha após salvar outro card desta
  // mesma tela) — sem isso o select podia ficar preso no valor de quando
  // a tela abriu.
  const [valorAnterior, setValorAnterior] = useState(valorAtual);
  if (valorAtual !== valorAnterior) {
    setValorAnterior(valorAtual);
    setValor(valorAtual);
  }

  function mudar(novoValor: TurnoPredefinido) {
    setValor(novoValor);
    setErro(null);
    startTransition(async () => {
      const resultado = await atualizarTurnoPredefinido(pessoaId, novoValor);
      if (resultado?.erro) {
        setErro(resultado.erro);
        setValor(valorAtual);
      }
    });
  }

  return (
    <div className="flex flex-col gap-1 rounded-2xl border border-stone-200 bg-white p-4 shadow-sm max-w-lg">
      <label className="flex flex-col gap-1 text-sm text-stone-700">
        <span className="font-semibold text-navy-900">Turno fixo</span>
        <span className="text-xs text-stone-500">
          Ajuda o fechamento automático a saber qual horário de corte usar
          se essa pessoa esquecer de bater saída. Livre deixa o sistema
          inferir pelo horário que ela entrou.
        </span>
        <select
          value={valor}
          onChange={(e) => mudar(e.target.value as TurnoPredefinido)}
          disabled={pending}
          className="border border-stone-300 rounded-lg px-3 py-2 max-w-[10rem] focus:outline-none focus:ring-2 focus:ring-brand-500 disabled:opacity-50"
        >
          <option value="LIVRE">Livre</option>
          <option value="MANHA">☀️ Turno do dia</option>
          <option value="NOITE">🌙 Turno da noite</option>
        </select>
      </label>
      {erro && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2 mt-1">
          {erro}
        </p>
      )}
    </div>
  );
}
