"use client";

import { useTransition } from "react";
import Link from "next/link";
import { marcarPagamentoPagoManualmente } from "./actions";
import { LABEL_TIPO_CHAVE_PIX } from "@/lib/documento";
import type { TipoChavePix } from "@/generated/prisma/enums";

type Pagamento = {
  turnoId: number;
  pessoaNome: string;
  valor: number;
  status: "PENDENTE" | "PROCESSANDO" | "CONCLUIDO" | "FALHOU";
  tentativas: number;
  erro: string | null;
  chavePixDestino: string;
  tipoChavePixDestino: TipoChavePix;
  quando: string;
};

const STATUS_CLASSE: Record<Pagamento["status"], string> = {
  PENDENTE: "bg-amber-50 text-amber-700 border-amber-200",
  PROCESSANDO: "bg-blue-50 text-blue-700 border-blue-200",
  CONCLUIDO: "bg-brand-50 text-brand-700 border-brand-200",
  FALHOU: "bg-red-50 text-red-700 border-red-200",
};

const STATUS_LABEL: Record<Pagamento["status"], string> = {
  PENDENTE: "Aguardando PIX manual",
  PROCESSANDO: "Processando",
  CONCLUIDO: "Pago",
  FALHOU: "Falhou",
};

export default function PagamentoRow({ pagamento }: { pagamento: Pagamento }) {
  const [pending, startTransition] = useTransition();

  return (
    <li className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <Link href={`/turnos/${pagamento.turnoId}`} className="font-medium text-navy-900 hover:underline">
          {pagamento.pessoaNome}
        </Link>
        <p className="text-xs text-stone-500">
          Chave PIX ({LABEL_TIPO_CHAVE_PIX[pagamento.tipoChavePixDestino]}):{" "}
          <span className="font-medium">{pagamento.chavePixDestino}</span> · saída em{" "}
          {pagamento.quando}
        </p>
        {pagamento.erro && <p className="text-xs text-red-600 mt-1">{pagamento.erro}</p>}
      </div>
      <div className="flex items-center gap-3 shrink-0">
        <span className="text-sm font-medium text-stone-700">R$ {pagamento.valor.toFixed(2)}</span>
        <span className={`text-xs rounded-full border px-2 py-1 ${STATUS_CLASSE[pagamento.status]}`}>
          {STATUS_LABEL[pagamento.status]}
        </span>
        {pagamento.status !== "CONCLUIDO" && (
          <button
            disabled={pending}
            onClick={() => {
              if (
                confirm(
                  `Confirmar que você já enviou R$ ${pagamento.valor.toFixed(2)} via PIX pra ${pagamento.chavePixDestino}?`
                )
              ) {
                startTransition(async () => {
                  await marcarPagamentoPagoManualmente(pagamento.turnoId);
                });
              }
            }}
            className="rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium px-3 py-1.5 disabled:opacity-50"
          >
            {pending ? "Confirmando..." : "Marcar como pago"}
          </button>
        )}
      </div>
    </li>
  );
}
