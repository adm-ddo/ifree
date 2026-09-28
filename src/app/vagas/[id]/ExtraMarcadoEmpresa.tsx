"use client";

import { useActionState, useTransition } from "react";
import { criarExtraMarcado, cancelarExtraMarcadoEmpresa } from "./actions";
import { formatarDataSemHora } from "@/lib/data";

export type StatusExtraMarcado = "AGUARDANDO_PESSOA" | "CONFIRMADO" | "CUMPRIDO" | "NAO_COMPARECEU" | "CANCELADO";

export type ExtraMarcadoItem = {
  id: number;
  data: Date;
  turnoTipo: "DIA" | "NOITE";
  status: StatusExtraMarcado;
};

const LABEL_STATUS: Record<StatusExtraMarcado, string> = {
  AGUARDANDO_PESSOA: "🤝 Esperando ela confirmar",
  CONFIRMADO: "✅ Combinado",
  CUMPRIDO: "✅ Cumprido",
  NAO_COMPARECEU: "🚫 Faltou",
  CANCELADO: "Cancelado",
};

const COR_STATUS: Record<StatusExtraMarcado, string> = {
  AGUARDANDO_PESSOA: "bg-amber-50 text-amber-700 border-amber-200",
  CONFIRMADO: "bg-brand-50 text-brand-700 border-brand-200",
  CUMPRIDO: "bg-brand-50 text-brand-700 border-brand-200",
  NAO_COMPARECEU: "bg-red-50 text-red-700 border-red-200",
  CANCELADO: "bg-stone-100 text-stone-500 border-stone-200",
};

/** Empresa propõe o "aperto de mãos" 🤝 (dia específico + turno) depois de
 * já ter aceitado a candidatura e conversado pelo chat — pedido do Thiago
 * em 2026-09-26: aceitar sozinho não bastava mais pra liberar o totem,
 * precisa do compromisso dos dois lados (ver confirmarExtraMarcado, do
 * lado da pessoa, em src/app/portal/vagas/actions.ts). Compartilhado entre
 * CandidaturaCard (v1) e CandidaturaCardV2, mesmo padrão de reaproveitamento
 * direto já usado nesta tela pra outros componentes. */
export default function ExtraMarcadoEmpresa({
  candidaturaId,
  turnoDiaPermitido,
  turnoNoitePermitido,
  extrasMarcados,
}: {
  candidaturaId: number;
  turnoDiaPermitido: boolean;
  turnoNoitePermitido: boolean;
  extrasMarcados: ExtraMarcadoItem[];
}) {
  const [state, formAction, pending] = useActionState(criarExtraMarcado.bind(null, candidaturaId), undefined);
  const [pendingCancelar, startTransition] = useTransition();

  const ativos = extrasMarcados.filter((e) => e.status !== "CANCELADO");

  return (
    <div className="flex flex-col gap-2 rounded-xl border border-dashed border-stone-300 p-3">
      <p className="text-xs font-bold uppercase tracking-wide text-stone-500">🤝 Free Marcado</p>

      {ativos.length > 0 && (
        <ul className="flex flex-col gap-1.5">
          {ativos.map((e) => (
            <li key={e.id} className="flex items-center justify-between gap-2 flex-wrap text-sm">
              <span className="text-stone-700">
                {formatarDataSemHora(e.data)} · {e.turnoTipo === "DIA" ? "☀️ Dia" : "🌙 Noite"}
              </span>
              <span className="flex items-center gap-2">
                <span className={`rounded-full border text-[11px] font-medium px-2 py-0.5 ${COR_STATUS[e.status]}`}>
                  {LABEL_STATUS[e.status]}
                </span>
                {(e.status === "AGUARDANDO_PESSOA" || e.status === "CONFIRMADO") && (
                  <button
                    type="button"
                    disabled={pendingCancelar}
                    onClick={() => startTransition(() => cancelarExtraMarcadoEmpresa(e.id))}
                    className="text-xs text-stone-400 hover:text-red-600 underline disabled:opacity-50"
                  >
                    desmarcar
                  </button>
                )}
              </span>
            </li>
          ))}
        </ul>
      )}

      {(turnoDiaPermitido || turnoNoitePermitido) && (
        <form action={formAction} className="flex flex-wrap items-end gap-2">
          <label className="flex flex-col gap-1 text-xs text-stone-500">
            Dia
            <input
              type="date"
              name="data"
              required
              className="border border-stone-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </label>
          <label className="flex flex-col gap-1 text-xs text-stone-500">
            Turno
            <select
              name="turnoTipo"
              required
              defaultValue=""
              className="border border-stone-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              <option value="" disabled>
                Escolha
              </option>
              {turnoDiaPermitido && <option value="DIA">☀️ Dia</option>}
              {turnoNoitePermitido && <option value="NOITE">🌙 Noite</option>}
            </select>
          </label>
          <button
            type="submit"
            disabled={pending}
            className="rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium px-3 py-1.5 disabled:opacity-50 transition-colors"
          >
            {pending ? "Marcando..." : "🤝 Marcar Free"}
          </button>
        </form>
      )}
      {state?.erro && <p className="text-xs text-red-600">{state.erro}</p>}
      {state?.sucesso && (
        <p className="text-xs text-brand-700">Free marcado! Agora é só esperar ela confirmar do lado dela.</p>
      )}
    </div>
  );
}
