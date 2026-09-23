"use client";

import { useActionState, useTransition } from "react";
import { atualizarIntervaloClt } from "./actions";
import type { ModoPausa } from "@/generated/prisma/enums";

const OPCOES: { valor: ModoPausa; label: string; desc: string }[] = [
  {
    valor: "NENHUMA",
    label: "Nenhuma",
    desc: "Não desconta nada quando a pessoa não bate o intervalo real.",
  },
  {
    valor: "AUTOMATICA_30",
    label: "30 min automático",
    desc: "Desconta 30min em jornadas acima de 6h, sem exigir nada da pessoa.",
  },
  {
    valor: "AUTOMATICA_60",
    label: "60 min automático (padrão)",
    desc: "Desconta 1h em jornadas acima de 6h, sem exigir nada da pessoa.",
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

export default function IntervaloCltForm({
  funcionariosBaterIntervaloAtual,
  modoPausaCltDiaAtual,
  modoPausaCltNoiteAtual,
}: {
  funcionariosBaterIntervaloAtual: boolean;
  modoPausaCltDiaAtual: ModoPausa;
  modoPausaCltNoiteAtual: ModoPausa;
}) {
  const [state, formAction, pending] = useActionState(atualizarIntervaloClt, undefined);
  const [, startTransition] = useTransition();

  return (
    <form
      // Nunca `action={formAction}` direto — ver o mesmo comentário em
      // BeneficiosForm.tsx (src/app/funcionarios/[id]/BeneficiosForm.tsx):
      // o React 19 reseta o <form> nativamente pro estado do carregamento
      // da página depois de uma Server Action terminar com sucesso, o que
      // faz a bolinha do rádio/checkbox voltar sozinha mesmo com o valor
      // salvo certo.
      onSubmit={(e) => {
        e.preventDefault();
        startTransition(() => formAction(new FormData(e.currentTarget)));
      }}
      className="flex flex-col gap-4 rounded-2xl border border-stone-200 bg-white p-6 shadow-sm max-w-lg"
    >
      <div>
        <h2 className="font-semibold text-navy-900">Intervalo dos funcionários (CLT)</h2>
        <p className="text-xs text-stone-500 mt-1">
          Configuração própria pros CLT, separada da pausa dos EXTRAS (acima).
          Vale pra todos os funcionários — não dá pra configurar por pessoa.
        </p>
      </div>

      <label className="flex items-start gap-2 rounded-lg border border-stone-200 px-3 py-2.5 has-[:checked]:border-brand-400 has-[:checked]:bg-brand-50 cursor-pointer">
        <input
          type="checkbox"
          name="funcionariosBaterIntervalo"
          defaultChecked={funcionariosBaterIntervaloAtual}
          className="mt-0.5 h-4 w-4 accent-brand-600"
        />
        <span>
          <span className="block text-sm font-medium text-navy-900">
            Exigir intervalo intrajornada no totem
          </span>
          <span className="block text-xs text-stone-500">
            Desligado por padrão — só entrada e saída do dia. O intervalo
            real batido pela pessoa sempre vale mais que o desconto
            automático abaixo.
          </span>
        </span>
      </label>

      <div className="border-t border-stone-100 pt-4 flex flex-col gap-4">
        <p className="text-xs text-stone-500">
          Desconto automático de intervalo quando a pessoa não bate o
          intervalo real no totem (seja porque a exigência acima está
          desligada, seja por algum dia que ela não bateu) — cobre a
          exigência de intervalo intrajornada da CLT mesmo sem punção.
          Padrão já vem em 1h.
        </p>
        <GrupoPausa titulo="Turno do dia" name="modoPausaCltDia" valorAtual={modoPausaCltDiaAtual} />
        <GrupoPausa titulo="Turno da noite" name="modoPausaCltNoite" valorAtual={modoPausaCltNoiteAtual} />
      </div>

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
