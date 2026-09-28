"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { candidatarSe } from "./actions";

/** Botão de "chamar a empresa pra conversar" nos cards de Convite
 * (portal/vagas/page.tsx) — pedido do Thiago em 2026-09-28: quando ela
 * recebe um convite (ver ConvidarParaVagaBotao, src/app/vagas/), tem que
 * ter um jeito DIRETO de ela puxar assunto, sem precisar entender que
 * precisa "se candidatar" antes pra desbloquear o chat.
 *
 * Por baixo dos panos continua chamando candidatarSe (mesmo mecanismo
 * de sempre: cria a Candidatura + abre a Conversa quando há match — e
 * como ela já apareceu aqui por já bater no cálculo de compatibilidade,
 * o match praticamente sempre confirma), só que com o foco na conversa,
 * não na candidatura em si — assim que a Conversa existe, leva ela direto
 * pra lá em vez de deixar precisar procurar o link depois. */
export default function ChamarParaConversarBotao({
  vagaId,
  jaCandidatou,
  conversaIdExistente,
}: {
  vagaId: number;
  jaCandidatou: boolean;
  conversaIdExistente: number | null;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [erro, setErro] = useState<string | null>(null);

  if (jaCandidatou && conversaIdExistente) {
    return (
      <Link
        href={`/portal/conversas/${conversaIdExistente}`}
        className="rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium px-4 py-2 self-start transition-colors"
      >
        💬 Conversar com a empresa
      </Link>
    );
  }

  return (
    <div className="flex flex-col gap-1">
      <button
        type="button"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            setErro(null);
            const resultado = await candidatarSe(vagaId);
            if ("erro" in resultado) {
              setErro(resultado.erro);
              return;
            }
            if (resultado.conversaId) {
              router.push(`/portal/conversas/${resultado.conversaId}`);
            } else {
              // Sem match (raro: perfil mudou desde que o convite foi
              // calculado) — a candidatura foi enviada mesmo assim,
              // atualiza a tela pra refletir o novo status.
              router.refresh();
            }
          })
        }
        className="rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium px-4 py-2 self-start disabled:opacity-50 transition-colors"
      >
        {pending ? "Abrindo conversa..." : "💬 Chamar a empresa pra conversar"}
      </button>
      {erro && <p className="text-xs text-red-600">{erro}</p>}
    </div>
  );
}
