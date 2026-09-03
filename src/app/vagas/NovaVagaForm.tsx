"use client";

import { useActionState, useState } from "react";
import { criarVaga } from "./actions";
import { TODOS_OS_CARGOS, HABILIDADES_SUGERIDAS } from "@/lib/habilidades";

export default function NovaVagaForm({ localizacaoPadrao }: { localizacaoPadrao: string }) {
  const [aberto, setAberto] = useState(false);
  const [state, formAction, pending] = useActionState(criarVaga, undefined);
  const [habilidadesProcuradas, setHabilidadesProcuradas] = useState<string[]>([]);
  const [novoItem, setNovoItem] = useState("");

  function alternar(item: string) {
    setHabilidadesProcuradas((atual) =>
      atual.includes(item) ? atual.filter((h) => h !== item) : [...atual, item]
    );
  }

  function adicionarCustom() {
    const item = novoItem.trim();
    if (!item || habilidadesProcuradas.includes(item)) return;
    setHabilidadesProcuradas((atual) => [...atual, item]);
    setNovoItem("");
  }

  if (!aberto) {
    return (
      <button
        type="button"
        onClick={() => setAberto(true)}
        className="rounded-lg border border-dashed border-stone-300 text-stone-600 hover:border-brand-400 hover:text-brand-700 text-sm px-4 py-3 text-center transition-colors"
      >
        + Publicar nova vaga
      </button>
    );
  }

  return (
    <form
      action={formAction}
      className="flex flex-col gap-3 rounded-2xl border border-stone-200 bg-white p-4 shadow-sm"
    >
      <h2 className="font-semibold text-navy-900">Nova vaga</h2>

      <div className="flex flex-col gap-1">
        <label className="text-xs text-stone-500">Cargo</label>
        <input
          name="cargo"
          list="cargos-sugeridos"
          required
          autoFocus
          placeholder="Ex: Garçom/Garçonete, Cozinheiro(a)..."
          className="border border-stone-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
        <datalist id="cargos-sugeridos">
          {TODOS_OS_CARGOS.map((cargo) => (
            <option key={cargo} value={cargo} />
          ))}
        </datalist>
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-xs text-stone-500">Descrição da vaga</label>
        <textarea
          name="descricao"
          required
          rows={4}
          placeholder="Turno, dias, o que a pessoa vai fazer, requisitos..."
          className="border border-stone-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-xs text-stone-500">Localização (opcional)</label>
        <input
          name="localizacao"
          defaultValue={localizacaoPadrao}
          className="border border-stone-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-xs text-stone-500">Nome fantasia pra essa vaga (opcional)</label>
        <input
          name="nomeFantasia"
          placeholder="Ex: Bar do Zé — se vazio, mostra a razão social da empresa"
          className="border border-stone-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
        <p className="text-xs text-stone-500">
          É o nome que o candidato vai ver, no lugar da razão social — útil
          se ela não for reconhecível pra quem procura vaga.
        </p>
      </div>

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
                const marcado = habilidadesProcuradas.includes(item);
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
        {habilidadesProcuradas.map((h) => (
          <input key={h} type="hidden" name="habilidadesProcuradas" value={h} />
        ))}
      </div>

      {state?.erro && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          {state.erro}
        </p>
      )}

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium px-4 py-2 disabled:opacity-50 transition-colors"
        >
          {pending ? "Publicando..." : "Publicar vaga"}
        </button>
        <button
          type="button"
          onClick={() => setAberto(false)}
          className="rounded-lg border border-stone-300 text-sm px-4 py-2"
        >
          Cancelar
        </button>
      </div>
    </form>
  );
}
