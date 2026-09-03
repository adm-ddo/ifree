"use client";

import { useState, useTransition } from "react";

/** Botão genérico pra converterParaClt/converterParaExtra — as duas
 * actions retornam { erro } como dado normal em vez de lançar exceção
 * (mensagens de throw em Server Actions chamadas direto ficam "redacted"
 * em produção — só chega um digest, sem o texto real). Em caso de
 * sucesso elas terminam em redirect(), que ainda lança uma exceção
 * especial do Next (digest começando com NEXT_REDIRECT) — essa aqui
 * precisa passar direto, não é um erro de verdade. */
export default function ConverterVinculoButton({
  action,
  pessoaId,
  label,
  confirmText,
}: {
  action: (pessoaId: number) => Promise<{ erro: string } | undefined>;
  pessoaId: number;
  label: string;
  confirmText: string;
}) {
  const [erro, setErro] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function clicar() {
    if (!window.confirm(confirmText)) return;
    setErro(null);
    startTransition(async () => {
      try {
        const resultado = await action(pessoaId);
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
        setErro("Não foi possível converter.");
      }
    });
  }

  return (
    <div className="flex flex-col gap-2 items-start">
      <button
        type="button"
        onClick={clicar}
        disabled={pending}
        className="rounded-lg border border-stone-300 text-sm px-4 py-2 hover:bg-stone-50 disabled:opacity-50"
      >
        {pending ? "Convertendo..." : label}
      </button>
      {erro && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          {erro}
        </p>
      )}
    </div>
  );
}
