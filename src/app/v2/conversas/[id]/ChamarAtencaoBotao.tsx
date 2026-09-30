"use client";

import { useState, useTransition } from "react";
import { chamarAtencaoConversa } from "@/app/conversas/[id]/actions";

/** Manda uma notificação push pro freelancer avisando que a empresa está
 * esperando resposta nessa conversa (ver src/lib/push.ts) — mesmo
 * padrão de botão solto com useTransition já usado em RescisaoCard.tsx
 * (marcar documentos assinados). Mostra o resultado (sucesso, limite de
 * frequência, ou "pessoa sem notificação ativada") direto na tela, sem
 * confirm() — não é uma ação destrutiva. */
export default function ChamarAtencaoBotao({ conversaId }: { conversaId: number }) {
  const [pending, startTransition] = useTransition();
  const [mensagem, setMensagem] = useState<{ texto: string; erro: boolean } | null>(null);

  function chamar() {
    setMensagem(null);
    startTransition(async () => {
      const resultado = await chamarAtencaoConversa(conversaId);
      if (resultado.erro) {
        setMensagem({ texto: resultado.erro, erro: true });
      } else {
        setMensagem({ texto: "Notificação enviada!", erro: false });
      }
    });
  }

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <button
        type="button"
        onClick={chamar}
        disabled={pending}
        className="rounded-lg border border-amber-300 bg-amber-50 text-amber-800 text-xs font-bold px-3 py-1.5 hover:bg-amber-100 transition-colors disabled:opacity-50"
      >
        {pending ? "Chamando..." : "🔔 Chamar atenção"}
      </button>
      {mensagem && (
        <span className={`text-xs ${mensagem.erro ? "text-red-600" : "text-brand-700"}`}>{mensagem.texto}</span>
      )}
    </div>
  );
}
