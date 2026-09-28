"use client";

import { useState, useTransition } from "react";
import { reativarMinhaConta } from "../actions";

/** reativarMinhaConta termina em redirect("/portal") quando dá certo —
 * isso lança uma exceção especial do Next (digest começando com
 * NEXT_REDIRECT) que precisa passar direto, não é um erro de verdade.
 * Mesmo padrão de ConverterVinculoButton.tsx. */
export default function ReativarContaBotao() {
  const [erro, setErro] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function clicar() {
    setErro(null);
    startTransition(async () => {
      try {
        const resultado = await reativarMinhaConta();
        if (resultado?.erro) setErro(resultado.erro);
      } catch (e) {
        if (
          e &&
          typeof e === "object" &&
          "digest" in e &&
          typeof (e as { digest?: unknown }).digest === "string" &&
          (e as { digest: string }).digest.startsWith("NEXT_REDIRECT")
        ) {
          throw e;
        }
        setErro("Não foi possível reativar agora — tenta de novo.");
      }
    });
  }

  return (
    <div className="flex flex-col gap-2 items-center">
      <button
        type="button"
        onClick={clicar}
        disabled={pending}
        className="rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium px-5 py-2.5 disabled:opacity-50 transition-colors"
      >
        {pending ? "Reativando..." : "✅ Reativar minha conta"}
      </button>
      {erro && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{erro}</p>
      )}
    </div>
  );
}
