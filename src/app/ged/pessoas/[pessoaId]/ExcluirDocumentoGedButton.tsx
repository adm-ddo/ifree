"use client";

import { useTransition, useState } from "react";
import { removerDocumentoGed } from "../../actions";

export default function ExcluirDocumentoGedButton({ documentoId }: { documentoId: number }) {
  const [pending, startTransition] = useTransition();
  const [erro, setErro] = useState<string | null>(null);

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        disabled={pending}
        onClick={() => {
          if (!confirm("Excluir este documento gerado? Não tem volta.")) return;
          setErro(null);
          startTransition(async () => {
            try {
              await removerDocumentoGed(documentoId);
            } catch (e) {
              setErro(e instanceof Error ? e.message : "Falha ao excluir.");
            }
          });
        }}
        className="rounded-lg border border-red-200 text-red-600 text-xs px-3 py-1.5 hover:bg-red-50 disabled:opacity-50 shrink-0"
      >
        {pending ? "Excluindo..." : "🗑️ Excluir"}
      </button>
      {erro && <span className="text-xs text-red-600">{erro}</span>}
    </div>
  );
}
