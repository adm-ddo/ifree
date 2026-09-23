"use client";

import { useActionState, useTransition } from "react";
import { atualizarModoPausa } from "./actions";
import type { ModoPausa } from "@/generated/prisma/enums";

const OPCOES: { valor: ModoPausa; label: string; desc: string }[] = [
  {
    valor: "NENHUMA",
    label: "Nenhuma",
    desc: "Paga o turno inteiro, sem descontar intervalo.",
  },
  {
    valor: "AUTOMATICA_30",
    label: "30 min automático",
    desc: "Desconta 30min do cálculo em turnos acima de 6h, sem exigir nada da pessoa.",
  },
  {
    valor: "AUTOMATICA_60",
    label: "60 min automático",
    desc: "Desconta 1h do cálculo em turnos acima de 6h, sem exigir nada da pessoa.",
  },
];

function GrupoPausa({
  titulo,
  name,
  valorAtual,
}: {
  titulo: string;
  name: string;
  valorAtual: ModoPausa;
}) {
  return (
    <div className="flex flex-col gap-2">
      <p className="text-sm font-medium text-navy-900">{titulo}</p>
      {OPCOES.map((op) => (
        <label
          key={op.valor}
          className="flex items-start gap-2 rounded-lg border border-stone-200 px-3 py-2.5 has-[:checked]:border-brand-400 has-[:checked]:bg-brand-50 cursor-pointer"
        >
          <input
            type="radio"
            name={name}
            value={op.valor}
            defaultChecked={valorAtual === op.valor}
            className="mt-0.5 h-4 w-4 accent-brand-600"
          />
          <span>
            <span className="block text-sm font-medium text-navy-900">{op.label}</span>
            <span className="block text-xs text-stone-500">{op.desc}</span>
          </span>
        </label>
      ))}
    </div>
  );
}

export default function PausaForm({
  modoPausaDiaAtual,
  modoPausaNoiteAtual,
}: {
  modoPausaDiaAtual: ModoPausa;
  modoPausaNoiteAtual: ModoPausa;
}) {
  const [state, formAction, pending] = useActionState(atualizarModoPausa, undefined);
  const [, startTransition] = useTransition();

  return (
    <form
      // Nunca `action={formAction}` direto — ver o mesmo comentário em
      // BeneficiosForm.tsx (src/app/funcionarios/[id]/BeneficiosForm.tsx):
      // o React 19 reseta o <form> nativamente pro estado do carregamento
      // da página depois de uma Server Action terminar com sucesso, o que
      // faz a bolinha do rádio voltar sozinha mesmo com o valor salvo certo.
      onSubmit={(e) => {
        e.preventDefault();
        startTransition(() => formAction(new FormData(e.currentTarget)));
      }}
      className="flex flex-col gap-4 rounded-2xl border border-stone-200 bg-white p-6 shadow-sm max-w-lg"
    >
      <div>
        <h2 className="font-semibold text-navy-900">Intervalo / pausa dos EXTRAS</h2>
        <p className="text-xs text-stone-500 mt-1">
          Como descontar o tempo de pausa (banheiro, cigarro, refeição) do
          cálculo de turnos longos dos freelancers avulsos — configurável
          separado pro turno do dia e da noite, já que costumam ter
          durações bem diferentes. Funcionários CLT têm configuração
          própria, mais abaixo. Recomendamos avisar isso nos{" "}
          <span className="font-medium">termos do contrato</span> acima, pra
          não virar surpresa no recibo.
        </p>
      </div>

      <GrupoPausa titulo="Turno do dia" name="modoPausaDia" valorAtual={modoPausaDiaAtual} />
      <GrupoPausa titulo="Turno da noite" name="modoPausaNoite" valorAtual={modoPausaNoiteAtual} />

      {state?.erro && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          {state.erro}
        </p>
      )}
      {state?.sucesso && (
        <p className="text-sm text-brand-700 bg-brand-50 border border-brand-200 rounded-lg px-3 py-2">
          Configuração salva.
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium py-2.5 disabled:opacity-50 transition-colors"
      >
        {pending ? "Salvando..." : "Salvar"}
      </button>
    </form>
  );
}
