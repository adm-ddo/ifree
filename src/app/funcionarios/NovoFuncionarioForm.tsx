"use client";

import { useActionState, useState } from "react";
import { criarFuncionario } from "./actions";
import { formatarCpf } from "@/lib/cpf";
import { formatarValorMoeda } from "@/lib/moeda";
import { detectarTipoChavePix, LABEL_TIPO_CHAVE_PIX } from "@/lib/documento";

export default function NovoFuncionarioForm() {
  const [aberto, setAberto] = useState(false);
  const [documento, setDocumento] = useState("");
  const [salario, setSalario] = useState("");
  const [chavePix, setChavePix] = useState("");
  const [state, formAction, pending] = useActionState(criarFuncionario, undefined);

  if (!aberto) {
    return (
      <button
        type="button"
        onClick={() => setAberto(true)}
        className="rounded-lg border border-dashed border-stone-300 text-stone-600 hover:border-brand-400 hover:text-brand-700 text-sm px-4 py-3 text-center transition-colors"
      >
        + Cadastrar funcionário
      </button>
    );
  }

  return (
    <form
      action={formAction}
      className="flex flex-col gap-3 rounded-2xl border border-stone-200 bg-white p-6 shadow-sm max-w-lg"
    >
      <div>
        <h2 className="font-semibold text-navy-900">Novo funcionário</h2>
        <p className="text-xs text-stone-500 mt-1">
          Cadastro manual — diferente do extra, o funcionário CLT não se
          autocadastra no totem. Depois de cadastrado, ele só digita o CPF e
          tira foto pra bater entrada/saída.
        </p>
      </div>

      <label className="flex flex-col gap-1 text-sm text-stone-700">
        Nome completo
        <input
          name="nome"
          required
          autoFocus
          className="border border-stone-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
      </label>

      <label className="flex flex-col gap-1 text-sm text-stone-700">
        CPF
        <input
          name="documento"
          value={documento}
          onChange={(e) => setDocumento(formatarCpf(e.target.value))}
          required
          inputMode="numeric"
          placeholder="000.000.000-00"
          className="border border-stone-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
      </label>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <label className="flex flex-col gap-1 text-sm text-stone-700">
          PIS/PASEP/NIT
          <input
            name="pisPasepNit"
            required
            className="border border-stone-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm text-stone-700">
          Matrícula interna
          <input
            name="matriculaInterna"
            required
            className="border border-stone-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </label>
      </div>

      <label className="flex flex-col gap-1 text-sm text-stone-700">
        Telefone (WhatsApp)
        <input
          name="telefone"
          required
          className="border border-stone-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
      </label>

      <div className="grid grid-cols-1 sm:grid-cols-[2fr_1fr] gap-3">
        <label className="flex flex-col gap-1 text-sm text-stone-700">
          Endereço (rua)
          <input
            name="endereco"
            required
            className="border border-stone-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm text-stone-700">
          Número
          <input
            name="numero"
            required
            className="border border-stone-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </label>
      </div>

      <label className="flex flex-col gap-1 text-sm text-stone-700">
        Complemento (opcional)
        <input
          name="complemento"
          className="border border-stone-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
      </label>

      <label className="flex flex-col gap-1 text-sm text-stone-700">
        Chave PIX (opcional)
        <input
          name="chavePix"
          value={chavePix}
          onChange={(e) => setChavePix(e.target.value)}
          className="border border-stone-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
        <span className="text-xs text-stone-500">
          O sistema não paga salário de CLT — só precisa disso se essa
          pessoa também for fazer &ldquo;turno extra pago no dia&rdquo;.
          {chavePix.trim() && (
            <>
              {" "}Tipo detectado: <span className="font-medium text-stone-700">{LABEL_TIPO_CHAVE_PIX[detectarTipoChavePix(chavePix)]}</span>
            </>
          )}
        </span>
      </label>

      <label className="flex flex-col gap-1 text-sm text-stone-700 border-t border-stone-100 pt-3">
        Data de admissão (opcional)
        <input
          name="dataAdmissao"
          type="date"
          className="border border-stone-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500 max-w-[12rem]"
        />
      </label>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <label className="flex flex-col gap-1 text-sm text-stone-700">
          Salário mensal (R$, opcional)
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
          Carga horária semanal (horas, opcional)
          <input
            name="cargaHorariaSemanalHoras"
            inputMode="decimal"
            placeholder="44"
            className="border border-stone-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </label>
      </div>

      <label className="flex flex-col gap-1 text-sm text-stone-700">
        Escala de trabalho (opcional, informativa)
        <select
          name="escalaTrabalho"
          defaultValue=""
          className="border border-stone-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500"
        >
          <option value="">Não informar</option>
          <option value="CINCO_X_DOIS">5x2</option>
          <option value="SEIS_X_UM">6x1</option>
          <option value="DOZE_X_TRINTA_E_SEIS">12x36</option>
          <option value="OUTRA">Outra</option>
        </select>
        <span className="text-xs text-stone-500">
          Dá pra configurar um horário padrão por escala em Configurações,
          usado depois pra avisar quando essa pessoa bater ponto fora do
          horário.
        </span>
      </label>

      {state?.erro && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          {state.erro}
        </p>
      )}

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium px-4 py-2.5 disabled:opacity-50 transition-colors"
        >
          {pending ? "Cadastrando..." : "Cadastrar"}
        </button>
        <button
          type="button"
          onClick={() => setAberto(false)}
          className="rounded-lg border border-stone-300 text-sm px-4 py-2.5"
        >
          Cancelar
        </button>
      </div>
    </form>
  );
}
