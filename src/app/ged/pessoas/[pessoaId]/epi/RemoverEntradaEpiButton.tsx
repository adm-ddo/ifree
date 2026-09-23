"use client";

import { useTransition } from "react";
import { removerEntradaEpi } from "../../../actions";

export default function RemoverEntradaEpiButton({ entradaId }: { entradaId: number }) {
  const [pending, startTransition] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => {
        if (!confirm("Remover essa entrada da ficha de EPI?")) return;
        startTransition(async () => {
          await removerEntradaEpi(entradaId);
        });
      }}
      className="text-xs text-red-600 hover:underline disabled:opacity-50"
    >
      {pending ? "Removendo..." : "Remover"}
    </button>
  );
}
