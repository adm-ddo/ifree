"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { solicitarLiberacaoConfianca } from "./actions";

/** Botão da liberação de confiança (1x por mês por empresa, ver
 * solicitarLiberacaoConfianca em ./actions.ts) — só aparece quando a
 * empresa está bloqueada E ainda não usou este mês. Depois de usar, o
 * próprio router.refresh() troca esta seção pela mensagem "liberado por
 * confiança"/"já usou este mês", já que page.tsx recalcula tudo a partir
 * do banco. */
export default function LiberacaoConfiancaButton({ empresaId }: { empresaId: number }) {
  const [pending, startTransition] = useTransition();
  const [erro, setErro] = useState<string | null>(null);
  const router = useRouter();

  function liberar() {
    if (
      !confirm(
        "Usar a liberação de confiança agora? Isso libera o painel por 24h sem pagar — só pode ser usado UMA VEZ POR MÊS. Se não pagar dentro desse prazo, o painel bloqueia de novo e só libera de novo daqui a 1 mês (ou pagando)."
      )
    ) {
      return;
    }
    setErro(null);
    startTransition(async () => {
      const resultado = await solicitarLiberacaoConfianca(empresaId);
      if (!resultado) return;
      if ("erro" in resultado) {
        setErro(resultado.erro);
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-2">
      {erro && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{erro}</p>
      )}
      <button
        type="button"
        onClick={liberar}
        disabled={pending}
        className="rounded-lg border border-indigo-300 text-indigo-700 text-sm font-medium py-2.5 hover:bg-indigo-50 disabled:opacity-50 transition-colors"
      >
        {pending ? "Liberando..." : "🔓 Usar liberação de confiança (1x, libera por 24h)"}
      </button>
    </div>
  );
}
