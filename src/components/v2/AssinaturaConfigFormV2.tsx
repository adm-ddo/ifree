"use client";

import { useActionState } from "react";
import Link from "next/link";
import { atualizarAvisoVencimento } from "@/app/configuracoes/actions";
import type { StatusAssinatura } from "@/generated/prisma/enums";

const OPCOES = [1, 3, 7] as const;

/** Cópia de src/app/configuracoes/AssinaturaConfigForm.tsx (v1, não
 * tocado) só porque o link de "regularizar agora" precisa apontar pro
 * /v2/assinatura em vez do /assinatura do v1 — resto é idêntico. */
export default function AssinaturaConfigFormV2({
  statusAssinatura,
  diaVencimento,
  diasRestantes,
  vencimentoLabel,
  avisoVencimentoDiasAtual,
}: {
  statusAssinatura: StatusAssinatura;
  diaVencimento: number | null;
  diasRestantes: number | null;
  vencimentoLabel: string | null;
  avisoVencimentoDiasAtual: number;
}) {
  const [state, formAction, pending] = useActionState(atualizarAvisoVencimento, undefined);

  return (
    <div className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm flex flex-col gap-3">
      <div>
        <h2 className="font-semibold text-navy-900">Assinatura</h2>

        {statusAssinatura === "TRIAL" && vencimentoLabel && (
          <p className="text-sm text-stone-600 mt-1">
            Você está em teste grátis até {vencimentoLabel}
            {diasRestantes !== null &&
              ` — faltam ${diasRestantes} ${diasRestantes === 1 ? "dia" : "dias"}`}
            .
          </p>
        )}

        {statusAssinatura === "ATIVA" && vencimentoLabel && diaVencimento !== null && (
          <p className="text-sm text-stone-600 mt-1">
            Sua assinatura vence todo dia {diaVencimento} de cada mês — faltam{" "}
            <span className="font-medium text-navy-900">
              {diasRestantes} {diasRestantes === 1 ? "dia" : "dias"}
            </span>{" "}
            pra renovação ({vencimentoLabel}).
          </p>
        )}

        {(statusAssinatura === "ATRASADA" || statusAssinatura === "CANCELADA") && (
          <p className="text-sm text-red-600 mt-1">
            Sua assinatura está {statusAssinatura === "ATRASADA" ? "atrasada" : "cancelada"} —{" "}
            <Link href="/v2/assinatura" className="underline font-medium">
              regularizar agora
            </Link>
            .
          </p>
        )}
      </div>

      <form action={formAction} className="flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1 text-sm text-stone-700">
          Avisar com quantos dias de antecedência
          <select
            key={avisoVencimentoDiasAtual}
            name="avisoVencimentoDias"
            defaultValue={avisoVencimentoDiasAtual}
            className="border border-stone-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500"
          >
            {OPCOES.map((dias) => (
              <option key={dias} value={dias}>
                {dias} {dias === 1 ? "dia" : "dias"} antes
              </option>
            ))}
          </select>
        </label>
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium py-2.5 disabled:opacity-50 transition-colors px-6"
        >
          {pending ? "Salvando..." : "Salvar"}
        </button>
      </form>

      {state?.erro && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          {state.erro}
        </p>
      )}
      {state?.sucesso && (
        <p className="text-sm text-brand-700 bg-brand-50 border border-brand-200 rounded-lg px-3 py-2">
          Preferência salva.
        </p>
      )}
    </div>
  );
}
