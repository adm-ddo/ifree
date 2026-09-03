"use client";

import { useActionState, useState } from "react";
import { atualizarExtraDiario } from "../actions";
import type { ModoPagamento, FrequenciaPagamento } from "@/generated/prisma/enums";

/** Liga/desliga a opção de a pessoa escolher, no totem, entre bater
 * ponto CLT normal ou fazer um turno extra pago no dia (Opção A) — os
 * campos de modoPagamento/valorDiaria/frequenciaPagamento abaixo são os
 * mesmos usados pra extras de verdade, só reaproveitados aqui. */
export default function ExtraDiarioForm({
  pessoaId,
  permiteExtraDiarioAtual,
  modoPagamentoAtual,
  valorDiariaAtual,
  frequenciaPagamentoAtual,
  temChavePix,
}: {
  pessoaId: number;
  permiteExtraDiarioAtual: boolean;
  modoPagamentoAtual: ModoPagamento;
  valorDiariaAtual: number | null;
  frequenciaPagamentoAtual: FrequenciaPagamento;
  temChavePix: boolean;
}) {
  const [state, formAction, pending] = useActionState(atualizarExtraDiario, undefined);
  const [permite, setPermite] = useState(permiteExtraDiarioAtual);
  const [modo, setModo] = useState<ModoPagamento>(modoPagamentoAtual);

  // Resincroniza durante a renderização (não num efeito, pra não gastar
  // uma renderização extra à toa) sempre que o dado do banco muda — sem
  // isso, o checkbox só refletia o valor salvo na primeira vez que a tela
  // montava, e ficava desatualizado se o dado real mudasse depois (ex.: a
  // página se atualiza sozinha após salvar outro card desta mesma tela).
  const [permiteAnterior, setPermiteAnterior] = useState(permiteExtraDiarioAtual);
  const [modoAnterior, setModoAnterior] = useState(modoPagamentoAtual);
  if (permiteExtraDiarioAtual !== permiteAnterior || modoPagamentoAtual !== modoAnterior) {
    setPermiteAnterior(permiteExtraDiarioAtual);
    setModoAnterior(modoPagamentoAtual);
    setPermite(permiteExtraDiarioAtual);
    setModo(modoPagamentoAtual);
  }

  return (
    <form
      action={formAction}
      className="flex flex-col gap-3 rounded-2xl border border-stone-200 bg-white p-6 shadow-sm max-w-lg"
    >
      <input type="hidden" name="pessoaId" value={pessoaId} />
      <div>
        <h2 className="font-semibold text-navy-900">Turno extra pago no dia</h2>
        <p className="text-xs text-stone-500 mt-1">
          Quando ligado, ao bater entrada no totem essa pessoa escolhe entre o
          ponto CLT normal ou um turno extra — com função, contrato e
          pagamento próprios, igual a qualquer extra.
        </p>
      </div>

      {!temChavePix && (
        <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
          Esta pessoa ainda não tem chave PIX cadastrada — a opção só aparece
          pra ela no totem depois de completar isso em &quot;Dados
          pessoais&quot;.
        </p>
      )}

      <label className="flex items-center gap-2 text-sm text-stone-700">
        <input
          type="checkbox"
          name="permiteExtraDiario"
          checked={permite}
          onChange={(e) => setPermite(e.target.checked)}
          className="h-4 w-4 accent-brand-600"
        />
        Permitir fazer extra com recebimento diário
      </label>

      {permite && (
        <>
          <div className="flex flex-col gap-2">
            <label className="flex items-start gap-2 rounded-lg border border-stone-200 px-3 py-2.5 has-[:checked]:border-brand-400 has-[:checked]:bg-brand-50 cursor-pointer">
              <input
                type="radio"
                name="modoPagamento"
                value="HORA"
                defaultChecked={modoPagamentoAtual === "HORA"}
                onChange={() => setModo("HORA")}
                className="mt-0.5 h-4 w-4 accent-brand-600"
              />
              <span>
                <span className="block text-sm font-medium text-navy-900">Por hora</span>
                <span className="block text-xs text-stone-500">
                  Valor/hora da função, arredondado por bloco de 5min.
                </span>
              </span>
            </label>
            <label className="flex items-start gap-2 rounded-lg border border-stone-200 px-3 py-2.5 has-[:checked]:border-brand-400 has-[:checked]:bg-brand-50 cursor-pointer">
              <input
                type="radio"
                name="modoPagamento"
                value="DIARIA"
                defaultChecked={modoPagamentoAtual === "DIARIA"}
                onChange={() => setModo("DIARIA")}
                className="mt-0.5 h-4 w-4 accent-brand-600"
              />
              <span>
                <span className="block text-sm font-medium text-navy-900">Diária fixa</span>
                <span className="block text-xs text-stone-500">
                  Valor combinado, escalonado pelas faixas de horas da empresa.
                </span>
              </span>
            </label>
          </div>

          {modo === "DIARIA" && (
            <label className="flex flex-col gap-1 text-sm text-stone-700">
              Valor da diária (R$)
              <input
                type="number"
                name="valorDiaria"
                step="0.01"
                min="0.01"
                defaultValue={valorDiariaAtual ?? ""}
                placeholder="120.00"
                className="border border-stone-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </label>
          )}

          <div className="border-t border-stone-100 pt-3 flex flex-col gap-2">
            <p className="text-sm font-medium text-navy-900">Frequência de recebimento</p>
            <label className="flex items-start gap-2 rounded-lg border border-stone-200 px-3 py-2.5 has-[:checked]:border-brand-400 has-[:checked]:bg-brand-50 cursor-pointer">
              <input
                type="radio"
                name="frequenciaPagamento"
                value="DIARIA"
                defaultChecked={frequenciaPagamentoAtual === "DIARIA"}
                className="mt-0.5 h-4 w-4 accent-brand-600"
              />
              <span>
                <span className="block text-sm font-medium text-navy-900">A cada turno</span>
                <span className="block text-xs text-stone-500">
                  Padrão — o pagamento fica pronto assim que o turno se encerra.
                </span>
              </span>
            </label>
            <label className="flex items-start gap-2 rounded-lg border border-stone-200 px-3 py-2.5 has-[:checked]:border-brand-400 has-[:checked]:bg-brand-50 cursor-pointer">
              <input
                type="radio"
                name="frequenciaPagamento"
                value="SEMANAL"
                defaultChecked={frequenciaPagamentoAtual === "SEMANAL"}
                className="mt-0.5 h-4 w-4 accent-brand-600"
              />
              <span>
                <span className="block text-sm font-medium text-navy-900">Semanal</span>
                <span className="block text-xs text-stone-500">
                  Acumula os turnos extras da semana pra pagar tudo de uma vez.
                </span>
              </span>
            </label>
          </div>
        </>
      )}

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
        className="rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium py-2.5 disabled:opacity-50 transition-colors self-start px-4"
      >
        {pending ? "Salvando..." : "Salvar"}
      </button>
    </form>
  );
}
