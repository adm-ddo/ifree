"use client";

import { useState } from "react";
import AssinaturaEditForm from "./AssinaturaEditForm";
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

/// Tira de cor na lateral do card, no mesmo espírito das linhas com
/// destaque de borda que a v2 usa (ver src/app/v2/dashboard/page.tsx) — em
/// vez do card v1 tradicional com borda uniforme cinza, dá pra bater o
/// olho na cor e já saber o status antes de ler o badge.
const STATUS_BORDA: Record<StatusAssinatura, string> = {
  TRIAL: "border-l-indigo-400",
  ATIVA: "border-l-brand-500",
  ATRASADA: "border-l-red-500",
  CANCELADA: "border-l-stone-300",
};

const COBRANCA_LABEL: Record<StatusCobranca, string> = {
  PENDENTE: "pendente",
  PAGA: "paga",
  EXPIRADA: "expirada",
  CANCELADA: "cancelada",
};

/// Cor da tira de vencimento — calculada no server (page.tsx, junto de
/// diasParaVencer) e só traduzida em classe aqui, pra não duplicar a regra
/// de "quantos dias é urgente" em dois lugares.
const URGENCIA_CLASSE: Record<"atrasado" | "atencao" | "normal", string> = {
  atrasado: "bg-red-50 text-red-700 border-red-200",
  atencao: "bg-amber-50 text-amber-700 border-amber-200",
  normal: "bg-stone-50 text-stone-600 border-stone-200",
};

type Empresa = {
  id: number;
  nome: string;
  cnpj: string;
  statusAssinatura: StatusAssinatura;
  assinaturaVenceEm: string;
  valorMensalidade: number | null;
  splitPercentualAsaas: number | null;
  tabletFornecido: boolean;
  tabletValorTotal: number | null;
  tabletParcelasTotal: number | null;
  tabletParcelasPagas: number;
  email: string | null;
  endereco: string | null;
  numero: string | null;
  bairro: string | null;
  cidade: string | null;
  funcoesCount: number;
  turnosCount: number;
};

/// Estado do saldo Asaas dessa empresa — ausência de conta e falha na
/// consulta são coisas DIFERENTES pro dono ver (ver buscarSaldosAsaas em
/// src/lib/pagamentos/asaas-deposito.ts), nunca viram 0 silenciosamente.
type SaldoAsaas = { tipo: "valor"; valor: number } | { tipo: "semConta" } | { tipo: "indisponivel" };

export default function AssinaturaCard({
  empresa,
  valorMensalidadePadrao,
  vencimentoLabel,
  urgencia,
  saldoAsaas,
  totalTransacionadoAsaas,
  totalCreditadoAsaas,
  ultimaCobranca,
}: {
  empresa: Empresa;
  valorMensalidadePadrao: number;
  vencimentoLabel: string;
  urgencia: "atrasado" | "atencao" | "normal";
  saldoAsaas: SaldoAsaas;
  /// Soma de tudo que já foi pago de verdade pra extras dessa empresa via
  /// Pix automático (ver comentário em page.tsx) — só curiosidade/
  /// referência, não é usado em filtro nem cálculo nenhum.
  totalTransacionadoAsaas: number;
  /// Soma de tudo que já foi CREDITADO (depósito confirmado) na subconta
  /// Asaas dessa empresa — bruto, histórico, diferente do saldo atual (que
  /// já desconta o que saiu pra pagar extra).
  totalCreditadoAsaas: number;
  ultimaCobranca: { status: StatusCobranca; valor: number; dataLabel: string } | null;
}) {
  const [editando, setEditando] = useState(false);

  const endereco = [empresa.endereco, empresa.numero, empresa.bairro, empresa.cidade]
    .filter(Boolean)
    .join(", ");

  const saldoLabel =
    saldoAsaas.tipo === "valor"
      ? `R$ ${saldoAsaas.valor.toFixed(2)}`
      : saldoAsaas.tipo === "semConta"
        ? "Sem conta Asaas"
        : "Saldo indisponível";

  const tabletLabel = empresa.tabletFornecido
    ? `Sim · ${empresa.tabletParcelasPagas}/${empresa.tabletParcelasTotal ?? "?"} parcelas`
    : "Não";

  return (
    <li
      className={`rounded-2xl border border-l-4 border-stone-200 ${STATUS_BORDA[empresa.statusAssinatura]} bg-white p-4 shadow-sm flex flex-col gap-3 transition-shadow hover:shadow-md`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-medium text-navy-900 truncate">{empresa.nome}</p>
          <p className="text-xs text-stone-500">{empresa.cnpj}</p>
        </div>
        <span
          className={`text-xs rounded-full border px-3 py-1.5 shrink-0 ${STATUS_CLASSE[empresa.statusAssinatura]}`}
        >
          {STATUS_LABEL[empresa.statusAssinatura]}
        </span>
      </div>

      <p className={`text-xs rounded-lg border px-3 py-1.5 ${URGENCIA_CLASSE[urgencia]}`}>{vencimentoLabel}</p>

      <div className="flex flex-col gap-1.5 text-sm">
        <MiniDado
          label="Mensalidade"
          valor={`R$ ${(empresa.valorMensalidade ?? valorMensalidadePadrao).toFixed(2)}`}
        />
        <MiniDado
          label="Split Pix"
          valor={empresa.splitPercentualAsaas !== null ? `${empresa.splitPercentualAsaas}%` : "—"}
        />
        <MiniDado label="Saldo Asaas" valor={saldoLabel} destaque={saldoAsaas.tipo === "valor"} />
        <MiniDado label="Já creditado (depósitos)" valor={`R$ ${totalCreditadoAsaas.toFixed(2)}`} />
        <MiniDado label="Já pago aos extras" valor={`R$ ${totalTransacionadoAsaas.toFixed(2)}`} />
        <MiniDado label="Funções" valor={String(empresa.funcoesCount)} />
        <MiniDado label="Turnos" valor={String(empresa.turnosCount)} />
        <MiniDado label="Tablet" valor={tabletLabel} />
      </div>

      <div className="border-t border-stone-200 pt-2 flex flex-col gap-0.5 text-xs text-stone-500">
        <p>{endereco || "Endereço não informado"}</p>
        {empresa.email && <p>{empresa.email}</p>}
        {ultimaCobranca && (
          <p>
            Última cobrança: R$ {ultimaCobranca.valor.toFixed(2)} · {COBRANCA_LABEL[ultimaCobranca.status]} em{" "}
            {ultimaCobranca.dataLabel}
          </p>
        )}
      </div>

      <button
        type="button"
        onClick={() => setEditando((v) => !v)}
        className="text-sm text-brand-700 hover:underline self-start"
      >
        {editando ? "Fechar edição" : "Editar"}
      </button>

      {editando && (
        <div className="border-t border-stone-200 pt-3">
          <AssinaturaEditForm
            empresa={{
              id: empresa.id,
              nome: empresa.nome,
              cnpj: empresa.cnpj,
              statusAssinatura: empresa.statusAssinatura,
              assinaturaVenceEm: empresa.assinaturaVenceEm,
              valorMensalidade: empresa.valorMensalidade,
              splitPercentualAsaas: empresa.splitPercentualAsaas,
              tabletFornecido: empresa.tabletFornecido,
              tabletValorTotal: empresa.tabletValorTotal,
              tabletParcelasTotal: empresa.tabletParcelasTotal,
              tabletParcelasPagas: empresa.tabletParcelasPagas,
            }}
            valorMensalidadePadrao={valorMensalidadePadrao}
          />
        </div>
      )}
    </li>
  );
}

function MiniDado({ label, valor, destaque }: { label: string; valor: string; destaque?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg bg-brand-50 px-3 py-2">
      <p className="text-stone-600 text-xs">{label}</p>
      <p className={`font-medium text-right ${destaque ? "text-brand-700" : "text-navy-900"}`}>{valor}</p>
    </div>
  );
}
