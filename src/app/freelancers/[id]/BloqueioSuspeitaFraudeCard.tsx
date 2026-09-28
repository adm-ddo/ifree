"use client";

import { useState, useTransition } from "react";
import { liberarBloqueioSuspeitaFraude } from "../actions";
import { LABEL_TURNO_PREDEFINIDO } from "@/lib/turnoPredefinido";
import { formatarDataHora } from "@/lib/data";
import type { TurnoPredefinido } from "@/generated/prisma/enums";

/** Mostra os turnos que essa pessoa já pode bater entrada sem aviso (ver
 * VinculoPessoaEmpresa.turnosPermitidosEntrada) e, se ela foi bloqueada
 * automaticamente por bater fora deles, um jeito de liberar de novo — só
 * aparece quando turnoPredefinido != LIVRE (checagem desligada pra quem é
 * livre). Pedido do Thiago em 2026-09-28, junto com o retido de
 * pagamento. */
export default function BloqueioSuspeitaFraudeCard({
  pessoaId,
  turnosPermitidos,
  bloqueadoEm,
  motivo,
}: {
  pessoaId: number;
  turnosPermitidos: TurnoPredefinido[];
  bloqueadoEm: Date | null;
  motivo: string | null;
}) {
  const [erro, setErro] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function liberar() {
    if (
      !window.confirm(
        "Liberar essa pessoa? Ela volta a conseguir bater entrada, e o turno que gerou o bloqueio passa a ser permitido pra ela também."
      )
    )
      return;
    setErro(null);
    startTransition(async () => {
      const resultado = await liberarBloqueioSuspeitaFraude(pessoaId);
      if (resultado?.erro) setErro(resultado.erro);
    });
  }

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-stone-200 bg-white p-4 shadow-sm max-w-lg">
      <div>
        <h2 className="font-semibold text-navy-900 text-sm">Turnos permitidos na entrada</h2>
        <p className="text-xs text-stone-500 mt-1">
          Turnos em que essa pessoa já bateu entrada antes e por isso pode
          bater de novo sem aviso. O primeiro turno que ela bater vira
          permitido sozinho; qualquer outro pede confirmação ou bloqueia,
          conforme o horário.
        </p>
      </div>

      {turnosPermitidos.length === 0 ? (
        <p className="text-xs text-stone-500">Ainda nenhum — libera sozinho na primeira entrada.</p>
      ) : (
        <div className="flex flex-wrap gap-1.5">
          {turnosPermitidos.map((t) => (
            <span
              key={t}
              className="text-[11px] font-medium rounded-full border border-stone-200 bg-stone-50 text-stone-700 px-2 py-1"
            >
              {LABEL_TURNO_PREDEFINIDO[t]}
            </span>
          ))}
        </div>
      )}

      {bloqueadoEm && (
        <div className="flex flex-col gap-2 rounded-xl border border-red-300 bg-red-50 px-3 py-3">
          <p className="text-sm text-red-900">
            🚨 <strong>Bloqueada por suspeita de fraude</strong> desde{" "}
            {formatarDataHora(bloqueadoEm)} — não consegue bater entrada até você
            liberar.
          </p>
          {motivo && <p className="text-xs text-red-800">{motivo}</p>}
          <button
            type="button"
            onClick={liberar}
            disabled={pending}
            className="self-start rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium px-4 py-2 disabled:opacity-50 transition-colors"
          >
            {pending ? "Liberando..." : "✅ Liberar"}
          </button>
        </div>
      )}

      {erro && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{erro}</p>
      )}
    </div>
  );
}
