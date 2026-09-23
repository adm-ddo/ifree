"use client";

import { useTransition } from "react";
import { removerModeloPapel } from "../actions";

export default function RemoverModeloPapelButton({ modeloId }: { modeloId: number }) {
  const [pending, startTransition] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => {
        if (!confirm("Remover esse modelo?")) return;
        startTransition(async () => {
          await removerModeloPapel(modeloId);
        });
      }}
      className="text-xs text-red-600 hover:underline disabled:opacity-50"
    >
      {pending ? "Removendo..." : "Remover"}
    </button>
  );
}
