"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { fazerUpgradeParaCompleto } from "./actions";

/** Botão de confirmação do upgrade Conecta → Completo — mesmo padrão de
 * LiberacaoConfiancaButton.tsx (useTransition + confirm + router.refresh,
 * sem useActionState porque não tem campo de formulário nenhum). */
export default function UpgradeButton() {
  const [pending, startTransition] = useTransition();
  const [erro, setErro] = useState<string | null>(null);
  const [sucesso, setSucesso] = useState(false);
  const router = useRouter();

  function confirmarUpgrade() {
    if (
      !confirm(
        "Confirmar upgrade pro plano Completo? A mensalidade passa a ser R$129,90 (promocional no 1º ano) e todos os módulos são liberados na hora."
      )
    ) {
      return;
    }
    setErro(null);
    startTransition(async () => {
      const resultado = await fazerUpgradeParaCompleto();
      if (resultado?.erro) {
        setErro(resultado.erro);
        return;
      }
      setSucesso(true);
      router.refresh();
    });
  }

  if (sucesso) {
    return (
      <p className="rounded-xl bg-brand-50 border border-brand-200 text-brand-700 text-sm font-medium px-4 py-3 text-center">
        ✅ Upgrade feito! Todos os módulos já estão liberados.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {erro && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{erro}</p>
      )}
      <button
        type="button"
        onClick={confirmarUpgrade}
        disabled={pending}
        className="w-full rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-semibold py-3 disabled:opacity-50 transition-colors"
      >
        {pending ? "Migrando..." : "🚀 Fazer upgrade agora"}
      </button>
    </div>
  );
}
