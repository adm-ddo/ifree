"use client";

import { useTransition } from "react";
import { acessarEmpresa, excluirEmpresaMaster, vincularEmpresaAoMeuLogin } from "./actions";
import type { StatusAssinatura } from "@/generated/prisma/enums";

type Empresa = {
  id: number;
  nome: string;
  cnpj: string;
  endereco: string | null;
  statusAssinatura: StatusAssinatura;
  assinaturaVenceEm: Date | null;
  counts: { funcoes: number; totens: number; turnos: number };
};

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

export default function EmpresaMasterRow({
  empresa,
  jaMinha,
}: {
  empresa: Empresa;
  jaMinha: boolean;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <li className="rounded-xl border border-stone-200 bg-stone-50 p-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="font-medium text-navy-900 flex items-center gap-1.5 flex-wrap">
          {empresa.nome}
          <span
            className={`text-[10px] font-medium uppercase tracking-wide rounded-full border px-1.5 py-0.5 shrink-0 ${STATUS_CLASSE[empresa.statusAssinatura]}`}
          >
            {STATUS_LABEL[empresa.statusAssinatura]}
          </span>
        </p>
        <p className="text-sm text-stone-500">
          {empresa.cnpj}
          {empresa.endereco ? ` · ${empresa.endereco}` : ""}
        </p>
        <p className="text-sm text-stone-600 mt-1">
          {empresa.counts.funcoes} funções · {empresa.counts.totens} totens ·{" "}
          {empresa.counts.turnos} turnos
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-2 shrink-0">
        {jaMinha ? (
          <span className="text-xs text-brand-700 bg-brand-50 border border-brand-200 rounded-full px-2 py-1">
            ✓ Sua empresa
          </span>
        ) : (
          <button
            disabled={pending}
            onClick={() => {
              startTransition(async () => {
                await vincularEmpresaAoMeuLogin(empresa.id);
              });
            }}
            className="text-sm text-brand-700 hover:text-brand-800 disabled:opacity-50 inline-block py-2 px-2 -my-2"
          >
            🔗 Marcar como minha
          </button>
        )}
        <button
          disabled={pending}
          onClick={() => {
            if (
              confirm(
                `Apagar "${empresa.nome}" (${empresa.cnpj}) de verdade? Isso apaga TODAS as funções, totens, turnos e pagamentos dessa empresa, sem volta.`
              )
            ) {
              startTransition(async () => {
                await excluirEmpresaMaster(empresa.id);
              });
            }
          }}
          className="text-sm text-red-600 hover:text-red-800 disabled:opacity-50 inline-block py-2 px-2 -my-2"
        >
          Excluir permanentemente
        </button>
        <form action={acessarEmpresa.bind(null, empresa.id)}>
          <button
            type="submit"
            className="rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-sm px-3 py-1.5 font-medium transition-colors shrink-0"
          >
            Acessar
          </button>
        </form>
      </div>
    </li>
  );
}
