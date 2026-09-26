"use client";

import { useState, useTransition } from "react";
import { convidarParaVaga } from "./actions";

/** Botão de convite dentro de MatchesRecentesBanner.tsx — extraído como
 * client component só pra este pedacinho porque o banner em si continua
 * um Server Component (busca os dados direto). Sem reenvio depois de
 * convidado: `jaConvidado` vem do banco (VagaMatchPassivo.convidadoEm),
 * então mesmo recarregando a página o botão continua desabilitado. */
export default function ConvidarParaVagaBotao({
  matchPassivoId,
  jaConvidado,
}: {
  matchPassivoId: number;
  jaConvidado: boolean;
}) {
  const [convidado, setConvidado] = useState(jaConvidado);
  const [erro, setErro] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  if (convidado) {
    return <span className="text-[11px] text-brand-600 font-medium shrink-0">✅ Convite enviado</span>;
  }

  return (
    <span className="flex items-center gap-2 shrink-0">
      <button
        type="button"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            setErro(null);
            const resultado = await convidarParaVaga(matchPassivoId);
            if ("erro" in resultado) setErro(resultado.erro);
            else setConvidado(true);
          })
        }
        className="text-[11px] font-medium text-brand-700 hover:text-brand-800 underline disabled:opacity-50"
      >
        {pending ? "Enviando..." : "🤝 Convidar"}
      </button>
      {erro && <span className="text-[11px] text-red-600">{erro}</span>}
    </span>
  );
}
