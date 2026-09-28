"use client";

import { useState, useTransition } from "react";
import { cancelarExtraMarcadoEmpresa } from "./[id]/actions";

/** Botão de desmarcar pro lado da empresa, usado no resumo central
 * (ProximosExtrasMarcadosEmpresa.tsx) — antes só existia dentro da
 * candidatura específica em /vagas/[id] (ExtraMarcadoEmpresa.tsx), a
 * empresa tinha que navegar até lá pra achar o botão (reportado pelo
 * Thiago em 2026-09-28). Mesma action por baixo (cancelarExtraMarcadoEmpresa,
 * grava canceladoPor:"EMPRESA" — conta no contador de confiabilidade
 * mostrado pro freelancer, ver ExtraMarcadoPessoa.tsx). */
export default function DesmarcarFreeEmpresaBotao({ extraMarcadoId }: { extraMarcadoId: number }) {
  const [pending, startTransition] = useTransition();
  const [desmarcado, setDesmarcado] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  if (desmarcado) {
    return <span className="text-[11px] text-stone-400 shrink-0">Desmarcado</span>;
  }

  return (
    <span className="flex items-center gap-2 shrink-0">
      <button
        type="button"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            setErro(null);
            try {
              await cancelarExtraMarcadoEmpresa(extraMarcadoId);
              setDesmarcado(true);
            } catch {
              setErro("Não deu pra desmarcar agora.");
            }
          })
        }
        className="text-[11px] text-stone-500 hover:text-red-600 underline disabled:opacity-50"
      >
        {pending ? "Desmarcando..." : "desmarcar"}
      </button>
      {erro && <span className="text-[11px] text-red-600">{erro}</span>}
    </span>
  );
}
