"use client";

import { useState, useTransition } from "react";
import { liberarPagamentoRetido } from "../actions";

/** Confirmação final e separada pra sair do estado retido — mesmo se a
 * correção de entrada já trouxe a duração de volta ao normal, o dono
 * precisa clicar aqui de propósito pra liberar o pagamento (nunca sai
 * sozinho, ver Turno.pagamentoRetidoRevisao). */
export default function LiberarPagamentoRetidoButton({ turnoId }: { turnoId: number }) {
  const [erro, setErro] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function clicar() {
    if (
      !window.confirm(
        "Liberar o pagamento deste turno? Confira o valor e as horas antes de confirmar — depois disso o sistema volta a processar o pagamento normalmente."
      )
    )
      return;
    setErro(null);
    startTransition(async () => {
      const resultado = await liberarPagamentoRetido(turnoId);
      if (resultado?.erro) setErro(resultado.erro);
    });
  }

  return (
    <div className="flex flex-col gap-2 items-start">
      <button
        type="button"
        onClick={clicar}
        disabled={pending}
        className="rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium px-4 py-2.5 disabled:opacity-50 transition-colors"
      >
        {pending ? "Liberando..." : "✅ Liberar pagamento"}
      </button>
      {erro && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          {erro}
        </p>
      )}
    </div>
  );
}
