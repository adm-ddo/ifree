"use client";

import { useActionState, useState } from "react";
import { criarTurnoManualClt } from "../actions";

/** Lança manualmente um turno extra pago pra essa pessoa CLT, sem passar
 * pelo totem (Opção B) — disponível independente do toggle de "extra
 * diário" (Opção A), pra quando o dono já sabe exatamente o que
 * aconteceu e quer registrar direto. Sem foto/assinatura: vira um
 * registro administrativo, mas entra no fluxo de pagamento normal. */
export default function CriarTurnoManualForm({
  pessoaId,
  funcoes,
  temChavePix,
}: {
  pessoaId: number;
  funcoes: { id: number; nome: string }[];
  temChavePix: boolean;
}) {
  const [aberto, setAberto] = useState(false);
  const [state, formAction, pending] = useActionState(criarTurnoManualClt, undefined);

  if (!aberto) {
    return (
      <button
        type="button"
        onClick={() => setAberto(true)}
        className="rounded-lg border border-dashed border-stone-300 text-stone-600 hover:border-brand-400 hover:text-brand-700 text-sm px-4 py-3 text-center transition-colors self-start"
      >
        + Lançar turno extra manualmente
      </button>
    );
  }

  return (
    <form
      action={formAction}
      className="flex flex-col gap-3 rounded-2xl border border-stone-200 bg-white p-6 shadow-sm max-w-lg"
    >
      <input type="hidden" name="pessoaId" value={pessoaId} />
      <div>
        <h2 className="font-semibold text-navy-900">Lançar turno extra manualmente</h2>
        <p className="text-xs text-stone-500 mt-1">
          Cria um turno já concluído, sem passar pelo totem — sem foto nem
          assinatura, só o registro administrativo. Entra normalmente em
          /turnos, /pagamentos e /relatórios.
        </p>
      </div>

      {!temChavePix && (
        <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
          Esta pessoa não tem chave PIX cadastrada — complete isso em
          &quot;Dados pessoais&quot; antes de lançar um turno extra.
        </p>
      )}

      <label className="flex flex-col gap-1 text-sm text-stone-700">
        Função
        <select
          name="funcaoId"
          required
          defaultValue=""
          className="border border-stone-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500"
        >
          <option value="" disabled>
            Selecione...
          </option>
          {funcoes.map((f) => (
            <option key={f.id} value={f.id}>
              {f.nome}
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-1 text-sm text-stone-700">
        Data
        <input
          type="date"
          name="data"
          required
          defaultValue={new Date().toISOString().slice(0, 10)}
          className="border border-stone-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500 max-w-[12rem]"
        />
      </label>

      <div className="flex gap-3">
        <label className="flex flex-col gap-1 text-sm text-stone-700">
          Hora de entrada
          <input
            type="time"
            name="horaEntrada"
            required
            className="border border-stone-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm text-stone-700">
          Hora de saída
          <input
            type="time"
            name="horaSaida"
            required
            className="border border-stone-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </label>
      </div>

      {state?.erro && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          {state.erro}
        </p>
      )}
      {state?.sucesso && (
        <p className="text-sm text-brand-700 bg-brand-50 border border-brand-200 rounded-lg px-3 py-2">
          Turno lançado — R$ {state.valorTotal?.toFixed(2)}.
        </p>
      )}

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium px-4 py-2.5 disabled:opacity-50 transition-colors"
        >
          {pending ? "Lançando..." : "Lançar turno"}
        </button>
        <button
          type="button"
          onClick={() => setAberto(false)}
          disabled={pending}
          className="rounded-lg border border-stone-300 text-sm px-4 py-2 hover:bg-stone-50 disabled:opacity-50"
        >
          Cancelar
        </button>
      </div>
    </form>
  );
}
