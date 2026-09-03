"use client";

import { useState } from "react";

/** Link de indicação usa o próprio id da pessoa como código (?ref=<id>)
 * em vez de gerar um código à parte — todo mundo que já existe já tem um
 * "código" válido, sem precisar de migração/backfill (ver
 * criarCadastroPortal, src/app/portal/cadastro/actions.ts, que resolve e
 * revalida esse id antes de creditar a indicação). Montado com
 * window.location.origin (não uma URL fixa) pra funcionar igual em
 * produção e em qualquer preview. */
export default function IndicacaoCard({
  pessoaId,
  totalIndicacoes,
}: {
  pessoaId: number;
  totalIndicacoes: number;
}) {
  const [copiado, setCopiado] = useState(false);
  const link =
    typeof window !== "undefined" ? `${window.location.origin}/portal/cadastro?ref=${pessoaId}` : "";

  async function copiar() {
    try {
      await navigator.clipboard.writeText(link);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch {
      // Sem permissão de clipboard (raro) — a pessoa sempre pode
      // selecionar o texto do campo abaixo na mão.
    }
  }

  return (
    <div className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm flex flex-col gap-2">
      <h2 className="font-semibold text-navy-900 text-sm">📢 Indique o iFREE</h2>
      <p className="text-xs text-stone-500">
        Compartilhe seu link — quando alguém se cadastra por ele, conta
        como uma indicação sua.
      </p>
      <div className="flex gap-2">
        <input
          readOnly
          value={link}
          onFocus={(e) => e.target.select()}
          className="flex-1 min-w-0 border border-stone-300 rounded-lg px-3 py-2 text-xs text-stone-600 bg-stone-50 focus:outline-none"
        />
        <button
          type="button"
          onClick={copiar}
          className="rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-xs font-medium px-3 py-2 transition-colors shrink-0"
        >
          {copiado ? "Copiado!" : "Copiar"}
        </button>
      </div>
      <p className="text-xs text-stone-600">
        🎯 Você já indicou{" "}
        <strong>
          {totalIndicacoes} pessoa{totalIndicacoes === 1 ? "" : "s"}
        </strong>
        .
      </p>
    </div>
  );
}
