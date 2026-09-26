"use client";

import { useActionState, useState } from "react";
import { criarVaga } from "./actions";
import { TODOS_OS_CARGOS } from "@/lib/habilidades";
import HabilidadesPicker from "./HabilidadesPicker";
import TurnoCheckboxes from "./TurnoCheckboxes";
import type { CategoriaVaga } from "@/generated/prisma/enums";

const CATEGORIAS: { valor: CategoriaVaga; label: string; emoji: string }[] = [
  { valor: "RESTAURANTE", label: "Restaurante", emoji: "🍽️" },
  { valor: "EVENTO", label: "Evento", emoji: "🎉" },
  { valor: "OUTRO", label: "Outro", emoji: "💼" },
];

export default function NovaVagaForm({ localizacaoPadrao }: { localizacaoPadrao: string }) {
  const [aberto, setAberto] = useState(false);
  const [state, formAction, pending] = useActionState(criarVaga, undefined);
  const [categoria, setCategoria] = useState<CategoriaVaga>("OUTRO");

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
        <label className="text-xs text-stone-500">Categoria</label>
        <input type="hidden" name="categoria" value={categoria} />
        <div className="flex gap-2">
          {CATEGORIAS.map((c) => (
            <button
              key={c.valor}
              type="button"
              onClick={() => setCategoria(c.valor)}
              className={`rounded-lg border px-3 py-2 text-sm transition-colors ${
                categoria === c.valor
                  ? "bg-brand-600 border-brand-600 text-white"
                  : "border-stone-300 text-stone-600 hover:bg-stone-50"
              }`}
            >
              {c.emoji} {c.label}
            </button>
          ))}
        </div>
      </div>

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

      <TurnoCheckboxes />

      <HabilidadesPicker nome="habilidadesProcuradas" />

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
