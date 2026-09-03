"use client";

import { useState, useTransition } from "react";
import { avaliarExtraPelaEmpresa } from "../actions";
import { TAGS_EMPRESA_AVALIA_EXTRA } from "@/lib/avaliacao";

export type AvaliacaoExistente = { nota: number; tags: string[] } | null;

/** Avaliação do dono sobre o extra, no turno já fechado — lado simétrico
 * da avaliação que o extra já faz no totem ao encerrar o turno. Base da
 * reputação que atravessa empresas, mostrada em /freelancers/[id]. */
export default function AvaliarExtraCard({
  turnoId,
  pessoaNome,
  avaliacaoExistente,
}: {
  turnoId: number;
  pessoaNome: string;
  avaliacaoExistente: AvaliacaoExistente;
}) {
  const [nota, setNota] = useState(0);
  const [tags, setTags] = useState<string[]>([]);
  const [erro, setErro] = useState<string | null>(null);
  const [enviado, setEnviado] = useState(false);
  const [pending, startTransition] = useTransition();

  if (avaliacaoExistente || enviado) {
    const notaFinal = avaliacaoExistente?.nota ?? nota;
    const tagsFinal = avaliacaoExistente?.tags ?? tags;
    return (
      <div className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm flex flex-col gap-2">
        <h2 className="font-semibold text-navy-900 text-sm">Sua avaliação de {pessoaNome}</h2>
        <div className="flex items-center gap-1 text-xl text-amber-400">
          {[1, 2, 3, 4, 5].map((n) => (
            <span key={n} className={n <= notaFinal ? "" : "text-stone-300"}>★</span>
          ))}
        </div>
        {tagsFinal.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {tagsFinal.map((tag) => (
              <span key={tag} className="rounded-full border border-stone-200 bg-stone-50 text-xs text-stone-600 px-2.5 py-1">
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>
    );
  }

  function alternarTag(tag: string) {
    setTags((atuais) => (atuais.includes(tag) ? atuais.filter((t) => t !== tag) : [...atuais, tag]));
  }

  function enviar() {
    setErro(null);
    startTransition(async () => {
      const resultado = await avaliarExtraPelaEmpresa(turnoId, nota, tags);
      if (resultado?.erro) setErro(resultado.erro);
      else setEnviado(true);
    });
  }

  return (
    <div className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm flex flex-col gap-3">
      <h2 className="font-semibold text-navy-900 text-sm">Avalie o trabalho de {pessoaNome}</h2>
      <div className="flex gap-1.5">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => setNota(n)}
            aria-label={`${n} estrela${n > 1 ? "s" : ""}`}
            className="text-3xl leading-none transition-transform active:scale-90"
          >
            <span className={n <= nota ? "text-amber-400" : "text-stone-300"}>★</span>
          </button>
        ))}
      </div>
      {nota > 0 && (
        <div className="flex flex-wrap gap-2">
          {TAGS_EMPRESA_AVALIA_EXTRA.map((tag) => (
            <button
              key={tag.label}
              type="button"
              onClick={() => alternarTag(tag.label)}
              className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                tags.includes(tag.label)
                  ? tag.sentimento === "BOA"
                    ? "border-brand-500 bg-brand-50 text-brand-700"
                    : tag.sentimento === "MEDIA"
                      ? "border-amber-400 bg-amber-50 text-amber-700"
                      : "border-red-400 bg-red-50 text-red-700"
                  : "border-stone-300 text-stone-600 hover:border-stone-400"
              }`}
            >
              {tag.label}
            </button>
          ))}
        </div>
      )}
      {erro && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{erro}</p>
      )}
      <button
        type="button"
        disabled={nota === 0 || pending}
        onClick={enviar}
        className="self-start rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium px-4 py-2 disabled:opacity-40 transition-colors"
      >
        {pending ? "Enviando..." : "Enviar avaliação"}
      </button>
    </div>
  );
}
