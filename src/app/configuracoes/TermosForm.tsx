"use client";

import { useActionState, useState, useTransition } from "react";
import { atualizarTermosContrato, restaurarTermosPadrao } from "./actions";

export default function TermosForm({
  textoInicial,
  personalizado,
}: {
  textoInicial: string;
  personalizado: boolean;
}) {
  const [state, formAction, pending] = useActionState(atualizarTermosContrato, undefined);
  const [texto, setTexto] = useState(textoInicial);
  const [restaurando, startTransition] = useTransition();

  return (
    <form
      action={formAction}
      // Sem isso, o React 19 reseta o form nativamente após toda submissão
      // bem-sucedida, mesmo em campo controlado — o texto inteiro do
      // contrato parecia sumir depois de salvar. Ver explicação completa
      // em SalarioEscalaForm.tsx (mesmo bug, corrigido lá primeiro).
      onReset={(e) => e.preventDefault()}
      className="flex flex-col gap-3 rounded-2xl border border-stone-200 bg-white p-6 shadow-sm max-w-lg"
    >
      <div>
        <h2 className="font-semibold text-navy-900">Termos do contrato</h2>
        <p className="text-xs text-stone-500 mt-1">
          Esse é o texto que a pessoa lê e aceita no totem antes de assinar,
          e que sai no PDF do contrato. Separe os parágrafos com uma linha em
          branco.{" "}
          {personalizado ? (
            <span className="text-brand-700">Você já personalizou esse texto.</span>
          ) : (
            <span>Ainda usando o texto padrão do sistema.</span>
          )}
        </p>
      </div>

      <textarea
        name="termos"
        value={texto}
        onChange={(e) => setTexto(e.target.value)}
        rows={12}
        className="border border-stone-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 font-mono"
      />

      {state?.erro && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          {state.erro}
        </p>
      )}
      {state?.sucesso && (
        <p className="text-sm text-brand-700 bg-brand-50 border border-brand-200 rounded-lg px-3 py-2">
          Termos salvos.
        </p>
      )}

      <p className="text-xs text-stone-400">
        Texto padrão gerado pelo sistema — recomendamos revisão jurídica
        antes de usar em produção.
      </p>

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium py-2.5 px-4 disabled:opacity-50 transition-colors"
        >
          {pending ? "Salvando..." : "Salvar termos"}
        </button>
        <button
          type="button"
          disabled={restaurando}
          onClick={() => {
            if (!confirm("Apagar o texto personalizado e voltar pro padrão do sistema?")) return;
            startTransition(async () => {
              await restaurarTermosPadrao();
              window.location.reload();
            });
          }}
          className="rounded-lg border border-stone-300 text-sm px-4 py-2.5 text-stone-600 hover:bg-stone-50 disabled:opacity-50"
        >
          {restaurando ? "Restaurando..." : "Restaurar padrão"}
        </button>
      </div>
    </form>
  );
}
