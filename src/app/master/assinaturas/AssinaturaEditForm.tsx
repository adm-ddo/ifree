"use client";

import { useActionState } from "react";
import { atualizarAssinaturaEmpresa } from "../actions";
import type { StatusAssinatura, StatusCobranca } from "@/generated/prisma/enums";

const STATUS_LABEL: Record<StatusAssinatura, string> = {
  TRIAL: "Trial",
  ATIVA: "Ativa",
  ATRASADA: "Atrasada",
  CANCELADA: "Cancelada",
};

const STATUS_CLASSE: Record<StatusAssinatura, string> = {
  TRIAL: "bg-indigo-50 text-indigo-700 border-indigo-200",
  ATIVA: "bg-brand-50 text-brand-700 border-brand-200",
  ATRASADA: "bg-red-50 text-red-700 border-red-200",
  CANCELADA: "bg-stone-100 text-stone-600 border-stone-200",
};

const COBRANCA_LABEL: Record<StatusCobranca, string> = {
  PENDENTE: "pendente",
  PAGA: "paga",
  EXPIRADA: "expirada",
  CANCELADA: "cancelada",
};

type Empresa = {
  id: number;
  nome: string;
  cnpj: string;
  statusAssinatura: StatusAssinatura;
  assinaturaVenceEm: string;
  valorMensalidade: number | null;
};

export default function AssinaturaEditForm({
  empresa,
  ultimaCobranca,
}: {
  empresa: Empresa;
  ultimaCobranca: { status: StatusCobranca; valor: number; dataLabel: string } | null;
}) {
  const [state, formAction, pending] = useActionState(atualizarAssinaturaEmpresa, undefined);

  return (
    <li className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="font-medium text-navy-900">{empresa.nome}</p>
          <p className="text-xs text-stone-500">{empresa.cnpj}</p>
        </div>
        <span
          className={`text-xs rounded-full border px-3 py-1.5 shrink-0 ${STATUS_CLASSE[empresa.statusAssinatura]}`}
        >
          {STATUS_LABEL[empresa.statusAssinatura]}
        </span>
      </div>

      {ultimaCobranca && (
        <p className="text-xs text-stone-500">
          Última cobrança: R$ {ultimaCobranca.valor.toFixed(2)} ·{" "}
          {COBRANCA_LABEL[ultimaCobranca.status]} em {ultimaCobranca.dataLabel}
        </p>
      )}

      <form action={formAction} className="flex flex-wrap items-end gap-2">
        <input type="hidden" name="empresaId" value={empresa.id} />

        <label className="flex flex-col gap-1 text-xs text-stone-500">
          Status
          <select
            name="statusAssinatura"
            defaultValue={empresa.statusAssinatura}
            className="border border-stone-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          >
            {Object.entries(STATUS_LABEL).map(([valor, label]) => (
              <option key={valor} value={valor}>
                {label}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1 text-xs text-stone-500">
          Vencimento
          <input
            type="date"
            name="assinaturaVenceEm"
            defaultValue={empresa.assinaturaVenceEm}
            className="border border-stone-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </label>

        <label className="flex flex-col gap-1 text-xs text-stone-500">
          Mensalidade (R$)
          <input
            type="number"
            name="valorMensalidade"
            step="0.01"
            min="0.01"
            placeholder="padrão"
            defaultValue={empresa.valorMensalidade ?? ""}
            className="border border-stone-300 rounded-lg px-2 py-1.5 text-sm w-28 focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </label>

        <button
          type="submit"
          disabled={pending}
          className="rounded-lg border border-stone-300 text-sm px-3 py-1.5 hover:bg-stone-50 disabled:opacity-50"
        >
          {pending ? "Salvando..." : "Salvar"}
        </button>

        {state?.erro && <p className="text-xs text-red-600 w-full">{state.erro}</p>}
        {state?.sucesso && <p className="text-xs text-brand-700 w-full">Atualizado.</p>}
      </form>
    </li>
  );
}
