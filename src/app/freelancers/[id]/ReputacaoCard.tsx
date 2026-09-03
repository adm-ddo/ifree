import { formatarDataHora } from "@/lib/data";

export type AvaliacaoRecebida = {
  nota: number;
  tags: string[];
  criadoEm: Date;
  empresaNome: string;
};

/** Reputação da pessoa somando avaliações de QUALQUER empresa — de
 * propósito (ver src/lib/avaliacao.ts e /conecta): é o ponto central da
 * ideia de reputação que atravessa empresas, não fica presa a um vínculo
 * só. Ninguém mais vê isso ainda além do dono olhando o cadastro do
 * freelancer — o freelancer não tem onde logar pra ver a própria nota
 * (isso é Fase 2, o Portal).
 *
 * `totalIndicacoes` (opcional) mostra à parte, nunca somado/misturado na
 * média de estrelas — são coisas diferentes (nota de trabalho vs. quantas
 * pessoas essa pessoa trouxe pro iFREE). Card aparece mesmo com 0
 * avaliações se houver indicação pra mostrar. */
export default function ReputacaoCard({
  avaliacoes,
  totalIndicacoes = 0,
}: {
  avaliacoes: AvaliacaoRecebida[];
  totalIndicacoes?: number;
}) {
  if (avaliacoes.length === 0 && totalIndicacoes === 0) return null;

  const media =
    avaliacoes.length > 0 ? avaliacoes.reduce((soma, a) => soma + a.nota, 0) / avaliacoes.length : 0;

  const contagemTags = new Map<string, number>();
  for (const a of avaliacoes) {
    for (const tag of a.tags) {
      contagemTags.set(tag, (contagemTags.get(tag) ?? 0) + 1);
    }
  }
  const tagsMaisFrequentes = [...contagemTags.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3);

  return (
    <div className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm flex flex-col gap-3">
      <h2 className="font-semibold text-navy-900 text-sm">
        Reputação <span className="text-stone-400 font-normal">· todas as empresas</span>
      </h2>

      {avaliacoes.length > 0 && (
        <div className="flex items-center gap-3">
          <span className="text-3xl font-semibold text-navy-900">{media.toFixed(1)}</span>
          <div className="flex flex-col">
            <div className="flex text-lg text-amber-400 leading-none">
              {[1, 2, 3, 4, 5].map((n) => (
                <span key={n} className={n <= Math.round(media) ? "" : "text-stone-300"}>★</span>
              ))}
            </div>
            <span className="text-xs text-stone-500">
              {avaliacoes.length} avaliaç{avaliacoes.length === 1 ? "ão" : "ões"}
            </span>
          </div>
        </div>
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
        {avaliacoes.slice(0, 5).map((a, i) => (
          <li key={i} className="flex items-center justify-between text-xs text-stone-500">
            <span>
              {a.empresaNome} · {formatarDataHora(a.criadoEm)}
            </span>
            <span className="text-amber-400">{"★".repeat(a.nota)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
