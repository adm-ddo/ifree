"use client";

import { useActionState, useState } from "react";
import { atualizarAlertaSaldoBaixo } from "./actions";
import CampoValorReais from "@/components/CampoValorReais";

/** Compartilhado entre /configuracoes (v1) e /v2/configuracoes — sem link
 * nenhum que difira entre as duas versões (diferente de
 * AssinaturaConfigForm/AssinaturaConfigFormV2), então não precisa de
 * cópia v2, mesmo padrão de ContaAsaasForm. */
export default function AlertaSaldoBaixoForm({
  ativoAtual,
  valorMinimoAtual,
}: {
  ativoAtual: boolean;
  valorMinimoAtual: number | null;
}) {
  const [state, formAction, pending] = useActionState(atualizarAlertaSaldoBaixo, undefined);
  const [ativo, setAtivo] = useState(ativoAtual);

  return (
    <div className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm flex flex-col gap-3">
      <div>
        <h2 className="font-semibold text-navy-900">Aviso de saldo baixo</h2>
        <p className="text-sm text-stone-600 mt-1">
          Receba um e-mail automático sempre que o saldo da sua conta de pagamento cair abaixo do
          valor escolhido — inclusive um aviso especial toda sexta-feira, pra você abastecer antes
          do fim de semana.
        </p>
      </div>

      <form action={formAction} className="flex flex-wrap items-end gap-3">
        <label className="flex items-center gap-1.5 text-sm text-stone-700 py-2">
          <input
            type="checkbox"
            name="alertaSaldoBaixoAtivo"
            checked={ativo}
            onChange={(e) => setAtivo(e.target.checked)}
            className="rounded border-stone-300 focus:ring-brand-500"
          />
          Ativar aviso por e-mail
        </label>

        {ativo && (
          <CampoValorReais
            name="alertaSaldoBaixoValorMinimo"
            label="Avisar quando o saldo cair abaixo de (R$)"
            valorInicial={valorMinimoAtual}
          />
        )}

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
