"use client";

import { useState } from "react";
import { HABILIDADES_SUGERIDAS } from "@/lib/habilidades";

/** Seletor de chips de habilidades procuradas, usado tanto na criação
 * (NovaVagaForm) quanto na edição (EditarVagaForm) de uma vaga — mesmo
 * vocabulário e mesmo formato de saída (inputs hidden com `nome`) que
 * normalizarTags (src/lib/habilidades.ts) espera do lado do servidor. */
export default function HabilidadesPicker({
  nome,
  valorInicial = [],
}: {
  nome: string;
  valorInicial?: string[];
}) {
  const [selecionadas, setSelecionadas] = useState<string[]>(valorInicial);
  const [novoItem, setNovoItem] = useState("");

  function alternar(item: string) {
    setSelecionadas((atual) =>
      atual.includes(item) ? atual.filter((h) => h !== item) : [...atual, item]
    );
  }

  function adicionarCustom() {
    const item = novoItem.trim();
    if (!item || selecionadas.includes(item)) return;
    setSelecionadas((atual) => [...atual, item]);
    setNovoItem("");
  }

  return (
    <div className="flex flex-col gap-2 rounded-xl border border-brand-100 bg-brand-50/60 p-3">
      <div>
        <span className="text-sm font-bold text-brand-700">🧰 Habilidades procuradas</span>
        <p className="text-xs text-stone-500 mt-0.5">
          Se um candidato tiver 3 ou mais dessas no perfil, vira um match e
          libera um chat entre vocês.
        </p>
      </div>
      {HABILIDADES_SUGERIDAS.map((cat) => (
        <div key={cat.categoria} className="flex flex-col gap-1.5">
          <span className="text-[11px] font-bold uppercase tracking-wide text-brand-700">
            {cat.categoria}
          </span>
          <div className="flex flex-wrap gap-1.5">
            {cat.itens.map((item) => {
              const marcado = selecionadas.includes(item);
              return (
                <button
                  key={item}
                  type="button"
                  onClick={() => alternar(item)}
                  className={`rounded-full border text-xs px-2.5 py-1 transition-colors ${
                    marcado
                      ? "bg-brand-500 border-brand-500 text-navy-900 font-medium"
                      : "border-stone-300 text-stone-600 hover:border-brand-400"
                  }`}
                >
                  {item}
                </button>
              );
            })}
          </div>
        </div>
      ))}
      <div className="flex gap-2">
        <input
          value={novoItem}
          onChange={(e) => setNovoItem(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              adicionarCustom();
            }
          }}
          placeholder="Não está na lista? Digite aqui"
          className="flex-1 border border-stone-300 rounded-lg px-3 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
        <button
          type="button"
          onClick={adicionarCustom}
          className="rounded-lg border border-stone-300 bg-white text-sm px-3 py-1.5 hover:bg-stone-100"
        >
          + Adicionar
        </button>
      </div>
      {selecionadas.map((h) => (
        <input key={h} type="hidden" name={nome} value={h} />
      ))}
    </div>
  );
}
