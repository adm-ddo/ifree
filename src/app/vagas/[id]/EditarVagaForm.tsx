"use client";

import { useActionState, useState } from "react";
import { atualizarVaga } from "../actions";
import { TODOS_OS_CARGOS } from "@/lib/habilidades";
import HabilidadesPicker from "../HabilidadesPicker";
import TurnoCheckboxes from "../TurnoCheckboxes";

type Vaga = {
  id: number;
  cargo: string;
  descricao: string;
  localizacao: string | null;
  nomeFantasia: string | null;
  habilidadesProcuradas: string[];
  turnoDia: boolean;
  turnoNoite: boolean;
};

/** Mostra a vaga completa (todos os campos que a empresa preencheu na
 * criação, incluindo os que a tela de detalhe não exibia antes:
 * nomeFantasia e habilidadesProcuradas) e deixa editar tudo — mesmos
 * campos e mesmas regras de NovaVagaForm, agora reaproveitados via
 * HabilidadesPicker. Funciona com a vaga aberta, pausada ou encerrada. */
export default function EditarVagaForm({ vaga }: { vaga: Vaga }) {
  const [editando, setEditando] = useState(false);
  const [state, formAction, pending] = useActionState(atualizarVaga.bind(null, vaga.id), undefined);

  if (!editando) {
    return (
      <div className="flex flex-col gap-2">
        <div className="flex items-start justify-between gap-3">
          <h1 className="text-2xl font-semibold text-navy-900">{vaga.cargo}</h1>
          <button
            type="button"
            onClick={() => setEditando(true)}
            className="shrink-0 rounded-lg border border-stone-300 text-sm px-3 py-1.5 text-stone-700 hover:bg-stone-50"
          >
            ✏️ Editar
          </button>
        </div>
        {vaga.nomeFantasia && (
          <p className="text-stone-600 text-sm">
            Exibida pro candidato como <span className="font-medium">{vaga.nomeFantasia}</span>
          </p>
        )}
        <div className="flex gap-1.5">
          {vaga.turnoDia && (
            <span className="rounded-full bg-amber-50 border border-amber-200 text-amber-700 text-xs px-2.5 py-1">
              ☀️ Dia
            </span>
          )}
          {vaga.turnoNoite && (
            <span className="rounded-full bg-navy-50 border border-navy-200 text-navy-700 text-xs px-2.5 py-1">
              🌙 Noite
            </span>
          )}
        </div>
        <p className="text-stone-600 text-sm whitespace-pre-line">{vaga.descricao}</p>
        {vaga.localizacao && <p className="text-stone-500 text-sm">📍 {vaga.localizacao}</p>}
        {vaga.habilidadesProcuradas.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-1">
            {vaga.habilidadesProcuradas.map((h) => (
              <span
                key={h}
                className="rounded-full bg-brand-50 border border-brand-200 text-brand-700 text-xs px-2.5 py-1"
              >
                {h}
              </span>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <form
      action={formAction}
      // Sem isso, o React 19 reseta o form nativamente após toda submissão
      // bem-sucedida, mesmo em campo controlado — ver explicação completa
      // em SalarioEscalaForm.tsx (mesmo bug, corrigido lá primeiro).
      onReset={(e) => e.preventDefault()}
      className="flex flex-col gap-3 rounded-2xl border border-stone-200 bg-white p-4 shadow-sm"
    >
      <h2 className="font-semibold text-navy-900">Editar vaga</h2>

      <div className="flex flex-col gap-1">
        <label className="text-xs text-stone-500">Cargo</label>
        <input
          name="cargo"
          list="cargos-sugeridos"
          required
          defaultValue={vaga.cargo}
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
          defaultValue={vaga.descricao}
          className="border border-stone-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-xs text-stone-500">Localização (opcional)</label>
        <input
          name="localizacao"
          defaultValue={vaga.localizacao ?? ""}
          className="border border-stone-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-xs text-stone-500">Nome fantasia pra essa vaga (opcional)</label>
        <input
          name="nomeFantasia"
          defaultValue={vaga.nomeFantasia ?? ""}
          placeholder="Ex: Bar do Zé — se vazio, mostra a razão social da empresa"
          className="border border-stone-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
      </div>

      <TurnoCheckboxes turnoDiaInicial={vaga.turnoDia} turnoNoiteInicial={vaga.turnoNoite} />

      <HabilidadesPicker nome="habilidadesProcuradas" valorInicial={vaga.habilidadesProcuradas} />

      {state?.erro && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          {state.erro}
        </p>
      )}
      {state?.sucesso && (
        <p className="text-sm text-brand-700 bg-brand-50 border border-brand-200 rounded-lg px-3 py-2">
          Alterações salvas.
        </p>
      )}

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium px-4 py-2 disabled:opacity-50 transition-colors"
        >
          {pending ? "Salvando..." : "Salvar alterações"}
        </button>
        <button
          type="button"
          onClick={() => setEditando(false)}
          className="rounded-lg border border-stone-300 text-sm px-4 py-2"
        >
          {state?.sucesso ? "Fechar" : "Cancelar"}
        </button>
      </div>
    </form>
  );
}
