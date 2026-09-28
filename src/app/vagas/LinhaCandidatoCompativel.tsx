import Link from "next/link";
import ConvidarParaVagaBotao from "./ConvidarParaVagaBotao";
import type { CandidatoCompativelItem } from "./candidatosCompativeis";

/** Uma linha da lista de candidatos compatíveis (MatchesRecentesBanner.tsx
 * e CandidatosCompativeisExpandido.tsx) — separada num componente próprio
 * pra reaproveitar entre as duas (a recente, renderizada no servidor, e a
 * "buscar mais", paginada no cliente). Borda embaixo de cada linha (`py-2
 * border-b`) de propósito — pedido do Thiago em 2026-09-28: numa lista
 * comprida, sem uma linha de marcação separando cada nome do seu par de
 * botões, é fácil clicar no "Ver perfil" da linha errada por causa da
 * distância entre o nome (esquerda) e os botões (direita). Sem "use
 * client": não usa hook nenhum, só passa ConvidarParaVagaBotao adiante —
 * funciona tanto de dentro de um Server Component quanto de um Client
 * Component. */
export default function LinhaCandidatoCompativel({
  item,
  perfilHrefBase,
}: {
  item: CandidatoCompativelItem;
  perfilHrefBase: string;
}) {
  return (
    <li className="flex items-center justify-between gap-3 py-2 border-b border-brand-200/60 last:border-0 text-xs">
      <span className="truncate text-brand-700">
        {item.pessoaNome} — {item.vagaCargo}
      </span>
      <span className="flex items-center gap-3 shrink-0">
        <Link
          href={`${perfilHrefBase}/${item.vagaId}/candidatos/${item.pessoaId}`}
          className="text-[11px] text-brand-700 underline hover:text-brand-800"
        >
          Ver perfil
        </Link>
        <ConvidarParaVagaBotao matchPassivoId={item.id} jaConvidado={item.convidadoEm !== null} />
      </span>
    </li>
  );
}
