"use client";

import { useActionState, useState } from "react";
import { atualizarSalarioEscala } from "../actions";
import { formatarValorMoeda } from "@/lib/moeda";
import { minutosParaHorario } from "@/lib/ponto";
import type { EscalaTrabalho, TurnoPredefinido } from "@/generated/prisma/enums";

export default function SalarioEscalaForm({
  pessoaId,
  salarioMensalAtual,
  cargoAtual,
  matriculaInternaAtual,
  escalaTrabalhoAtual,
  escalaTurnoAtual,
  cargaHorariaSemanalHorasAtual,
  horarioEntradaMinAtual,
  horarioSaidaMinAtual,
  historicoSalarial,
}: {
  pessoaId: number;
  salarioMensalAtual: number | null;
  cargoAtual: string | null;
  matriculaInternaAtual: string | null;
  escalaTrabalhoAtual: EscalaTrabalho | null;
  escalaTurnoAtual: TurnoPredefinido | null;
  cargaHorariaSemanalHorasAtual: number | null;
  horarioEntradaMinAtual: number | null;
  horarioSaidaMinAtual: number | null;
  historicoSalarial: { valor: number; vigenteDesdeLabel: string }[];
}) {
  const [state, formAction, pending] = useActionState(atualizarSalarioEscala, undefined);
  const [salario, setSalario] = useState(
    salarioMensalAtual !== null ? salarioMensalAtual.toFixed(2).replace(".", ",") : ""
  );

  return (
    <form
      action={formAction}
      className="flex flex-col gap-3 rounded-2xl border border-stone-200 bg-white p-6 shadow-sm max-w-lg"
    >
      <input type="hidden" name="pessoaId" value={pessoaId} />
      <div>
        <h2 className="font-semibold text-navy-900">Salário e escala</h2>
        <p className="text-xs text-stone-500 mt-1">
          Salário e carga horária são informativos — o sistema não calcula
          nem paga nada com base neles, só aparecem como referência no
          relatório de horas. O horário específico logo abaixo já é usado
          de verdade: se preenchido (ou se a escala tiver um padrão
          configurado em Configurações), o histórico de ponto passa a
          avisar quando essa pessoa bate ponto fora do horário. Cada
          reajuste de salário fica registrado no histórico abaixo.
        </p>
      </div>

      {historicoSalarial.length > 0 && (
        <div className="rounded-lg border border-stone-200 bg-stone-50 px-3 py-2">
          <p className="text-xs font-medium text-stone-600 mb-1">Histórico de salário</p>
          <ul className="flex flex-col gap-0.5">
            {historicoSalarial.map((h, i) => (
              <li key={i} className="text-xs text-stone-600 flex justify-between">
                <span>{h.vigenteDesdeLabel}</span>
                <span className="font-medium text-stone-800">
                  R$ {h.valor.toFixed(2)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <label className="flex flex-col gap-1 text-sm text-stone-700">
        Matrícula interna
        <input
          name="matriculaInterna"
          defaultValue={matriculaInternaAtual ?? ""}
          required
          className="border border-stone-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
      </label>

      <label className="flex flex-col gap-1 text-sm text-stone-700">
        Cargo (conforme contrato de trabalho)
        <input
          name="cargo"
          defaultValue={cargoAtual ?? ""}
          placeholder="Ex: Auxiliar de cozinha"
          className="border border-stone-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
      </label>
      <p className="text-xs text-stone-500 -mt-2">
        Junto com a CTPS (em Editar dados), o cargo é exigido pra gerar a
        carta de advertência por falta de registro de ponto.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <label className="flex flex-col gap-1 text-sm text-stone-700">
          Salário mensal (R$)
          <input
            name="salarioMensal"
            value={salario}
            onChange={(e) => setSalario(formatarValorMoeda(e.target.value))}
            inputMode="decimal"
            placeholder="1800,00"
            className="border border-stone-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm text-stone-700">
          Carga horária semanal (horas)
          <input
            name="cargaHorariaSemanalHoras"
            defaultValue={cargaHorariaSemanalHorasAtual ?? ""}
            inputMode="decimal"
            placeholder="44"
            className="border border-stone-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </label>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <label className="flex flex-col gap-1 text-sm text-stone-700">
          Escala de trabalho
          <select
            name="escalaTrabalho"
            defaultValue={escalaTrabalhoAtual ?? ""}
            className="border border-stone-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500"
          >
            <option value="">Não informar</option>
            <option value="CINCO_X_DOIS">5x2</option>
            <option value="SEIS_X_UM">6x1</option>
            <option value="DOZE_X_TRINTA_E_SEIS">12x36</option>
            <option value="OUTRA">Outra</option>
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm text-stone-700">
          Turno
          <select
            name="escalaTurno"
            defaultValue={escalaTurnoAtual ?? ""}
            className="border border-stone-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500"
          >
            <option value="">☀️ Manhã</option>
            <option value="NOITE">🌙 Noite</option>
          </select>
        </label>
      </div>
      <p className="text-xs text-stone-500 -mt-2">
        Decide qual dos dois horários-padrão da escala (configurados em
        Configurações) vale pra essa pessoa.
      </p>

      <div>
        <p className="text-sm text-stone-700">Horário específico desta pessoa</p>
        <p className="text-xs text-stone-500 mt-0.5">
          Opcional — só preencha se essa pessoa entra/sai num horário
          diferente do padrão configurado pra escala dela (ver
          Configurações). Deixe as duas em branco pra usar o padrão da
          escala.
        </p>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <label className="flex flex-col gap-1 text-sm text-stone-700">
          Entrada
          <input
            type="time"
            name="horarioEntrada"
            defaultValue={horarioEntradaMinAtual !== null ? minutosParaHorario(horarioEntradaMinAtual) : ""}
            className="border border-stone-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm text-stone-700">
          Saída
          <input
            type="time"
            name="horarioSaida"
            defaultValue={horarioSaidaMinAtual !== null ? minutosParaHorario(horarioSaidaMinAtual) : ""}
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
