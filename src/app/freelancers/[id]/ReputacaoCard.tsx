import { formatarDataHora, formatarDataSemHora } from "@/lib/data";

export type AvaliacaoRecebida = {
  nota: number;
  tags: string[];
  criadoEm: Date;
  empresaNome: string;
};

/** Falta automática 🚫 num Free Marcado confirmado (ver
 * marcarFaltasExtraMarcado, src/lib/fechamento-automatico.ts) — conta como
 * nota 1 na média, mas mostrada com rótulo próprio na linha do tempo em
 * vez de virar uma avaliação de 1 estrela solta sem contexto (pedido do
 * Thiago em 2026-09-26: precisa ficar claro PRA EMPRESA que foi falta a um
 * combinado, não só uma nota ruim qualquer). */
export type FaltaExtraMarcado = {
  data: Date;
  empresaNome: string;
};

/** Reputação da pessoa somando avaliações de QUALQUER empresa — de
 * propósito (ver src/lib/avaliacao.ts e /conecta): é o ponto central da
 * ideia de reputação que atravessa empresas, não fica presa a um vínculo
 * só.
 *
 * `faltas` (opcional) entra na média como nota 1 cada, mas some na
 * timeline com rótulo próprio em vez de estrelas — é o principal sinal de
 * credibilidade do freelancer perante as empresas desde que o Free
 * Marcado existe.
 *
 * `desmarquesDepoisDeAceitar` (opcional, pedido do Thiago em 2026-09-28) —
 * quantas vezes a pessoa confirmou um Free e DEPOIS desmarcou (ver
 * desmarcarFreeConfirmado, src/app/portal/vagas/actions.ts e
 * contarDesmarquesPessoaDepoisDeAceitar, src/lib/confiabilidade-extra.ts).
 * Diferente de falta (ela pelo menos avisou), mas ainda é sinal de
 * confiabilidade — por isso fica visível à parte, sem entrar na média de
 * estrelas (não é uma "nota", é só uma contagem).
 *
 * `totalIndicacoes` (opcional) mostra à parte, nunca somado/misturado na
 * média de estrelas — são coisas diferentes (nota de trabalho vs. quantas
 * pessoas essa pessoa trouxe pro iFREE). Card aparece mesmo com 0
 * avaliações se houver indicação, falta ou desmarque pra mostrar. */
export default function ReputacaoCard({
  avaliacoes,
  faltas = [],
  desmarquesDepoisDeAceitar = 0,
  totalIndicacoes = 0,
}: {
  avaliacoes: AvaliacaoRecebida[];
  faltas?: FaltaExtraMarcado[];
  desmarquesDepoisDeAceitar?: number;
  totalIndicacoes?: number;
}) {
  if (avaliacoes.length === 0 && faltas.length === 0 && desmarquesDepoisDeAceitar === 0 && totalIndicacoes === 0) {
    return null;
  }

  const totalNotas = avaliacoes.length + faltas.length;
  const media =
    totalNotas > 0 ? (avaliacoes.reduce((soma, a) => soma + a.nota, 0) + faltas.length * 1) / totalNotas : 0;

  const contagemTags = new Map<string, number>();
  for (const a of avaliacoes) {
    for (const tag of a.tags) {
      contagemTags.set(tag, (contagemTags.get(tag) ?? 0) + 1);
    }
  }
  const tagsMaisFrequentes = [...contagemTags.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3);

  const linhaDoTempo = [
    ...avaliacoes.map((a) => ({ tipo: "AVALIACAO" as const, criadoEm: a.criadoEm, empresaNome: a.empresaNome, nota: a.nota })),
    ...faltas.map((f) => ({ tipo: "FALTA" as const, criadoEm: f.data, empresaNome: f.empresaNome })),
  ].sort((a, b) => b.criadoEm.getTime() - a.criadoEm.getTime());

  return (
    <div className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm flex flex-col gap-3">
      <h2 className="font-semibold text-navy-900 text-sm">
        Reputação <span className="text-stone-400 font-normal">· todas as empresas</span>
      </h2>

      {totalNotas > 0 && (
        <div className="flex items-center gap-3">
          <span className="text-3xl font-semibold text-navy-900">{media.toFixed(1)}</span>
          <div className="flex flex-col">
            <div className="flex text-lg text-amber-400 leading-none">
              {[1, 2, 3, 4, 5].map((n) => (
                <span key={n} className={n <= Math.round(media) ? "" : "text-stone-300"}>★</span>
              ))}
            </div>
            <span className="text-xs text-stone-500">
              {totalNotas} avaliaç{totalNotas === 1 ? "ão" : "ões"}
              {faltas.length > 0 && ` · ${faltas.length} falta${faltas.length === 1 ? "" : "s"} a combinado`}
            </span>
          </div>
        </div>
      )}

      {desmarquesDepoisDeAceitar > 0 && (
        <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-2.5 py-1.5">
          ↩️ Já confirmou e depois desmarcou um Free {desmarquesDepoisDeAceitar}{" "}
          {desmarquesDepoisDeAceitar === 1 ? "vez" : "vezes"}
        </p>
      )}

      {totalIndicacoes > 0 && (
        <div className="flex items-center gap-2 text-sm text-navy-900">
          <span className="text-lg">🎯</span>
          <span>
            <strong>{totalIndicacoes}</strong> pessoa{totalIndicacoes === 1 ? "" : "s"} indicada
            {totalIndicacoes === 1 ? "" : "s"} pro iFREE
          </span>
        </div>
      )}

      {tagsMaisFrequentes.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {tagsMaisFrequentes.map(([tag, quantidade]) => (
            <span
              key={tag}
              className="rounded-full border border-brand-200 bg-brand-50 text-xs text-brand-700 px-2.5 py-1"
            >
              {tag} · {quantidade}x
            </span>
          ))}
        </div>
      )}

      <ul className="flex flex-col gap-1.5 border-t border-stone-100 pt-2 mt-1">
        {linhaDoTempo.slice(0, 5).map((item, i) =>
          item.tipo === "FALTA" ? (
            <li key={i} className="flex items-center justify-between text-xs">
              <span className="text-stone-500">
                {item.empresaNome} · {formatarDataSemHora(item.criadoEm)}
              </span>
              <span className="rounded-full border border-red-200 bg-red-50 text-red-700 font-medium px-2 py-0.5">
                🚫 Faltou ao combinado
              </span>
            </li>
          ) : (
            <li key={i} className="flex items-center justify-between text-xs text-stone-500">
              <span>
                {item.empresaNome} · {formatarDataHora(item.criadoEm)}
              </span>
              <span className="text-amber-400">{"★".repeat(item.nota)}</span>
            </li>
          )
        )}
      </ul>
    </div>
  );
}
