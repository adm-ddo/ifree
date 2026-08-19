"use client";

import { useState } from "react";
import Link from "next/link";
import type { StatusTurno } from "@/generated/prisma/enums";

type TurnoResumo = {
  id: number;
  funcaoNome: string;
  dataLabel: string;
  horaSaidaLabel: string | null;
  valorTotal: number | null;
  status: StatusTurno;
  temRecibo: boolean;
};

const STATUS_LABEL: Record<StatusTurno, string> = {
  ABERTO: "Aberto",
  CONCLUIDO: "Concluído",
  PAGO: "Pago",
  ERRO_PAGAMENTO: "Erro no pagamento",
};

const STATUS_CLASSE: Record<StatusTurno, string> = {
  ABERTO: "bg-blue-50 text-blue-700 border-blue-200",
  CONCLUIDO: "bg-amber-50 text-amber-700 border-amber-200",
  PAGO: "bg-brand-50 text-brand-700 border-brand-200",
  ERRO_PAGAMENTO: "bg-red-50 text-red-700 border-red-200",
};

export default function SelecaoTurnos({ turnos }: { turnos: TurnoResumo[] }) {
  const [selecionados, setSelecionados] = useState<Set<number>>(new Set());

  function alternar(id: number) {
    setSelecionados((atual) => {
      const novo = new Set(atual);
      if (novo.has(id)) novo.delete(id);
      else novo.add(id);
      return novo;
    });
  }

  const idsSelecionados = [...selecionados];
  const idsComRecibo = turnos
    .filter((t) => selecionados.has(t.id) && t.temRecibo)
    .map((t) => t.id);

  function abrirPdf(caminho: string, ids: number[]) {
    window.open(`${caminho}?ids=${ids.join(",")}`, "_blank");
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
        <p className="text-sm text-stone-600">
          {idsSelecionados.length === 0
            ? "Selecione um ou mais turnos abaixo pra imprimir em lote."
            : `${idsSelecionados.length} turno(s) selecionado(s).`}
        </p>
        <div className="flex flex-wrap gap-2 ml-auto">
          <button
            type="button"
            disabled={idsSelecionados.length === 0}
            onClick={() => abrirPdf("/turnos/imprimir/contrato/pdf", idsSelecionados)}
            className="rounded-lg border border-stone-300 text-sm px-4 py-2 text-stone-700 hover:bg-stone-50 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Imprimir termos selecionados ({idsSelecionados.length})
          </button>
          <button
            type="button"
            disabled={idsComRecibo.length === 0}
            onClick={() => abrirPdf("/turnos/imprimir/recibo/pdf", idsComRecibo)}
            className="rounded-lg border border-stone-300 text-sm px-4 py-2 text-stone-700 hover:bg-stone-50 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Imprimir recibos selecionados ({idsComRecibo.length})
          </button>
        </div>
      </div>

      <ul className="flex flex-col gap-2">
        {turnos.map((turno) => (
          <li
            key={turno.id}
            className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between"
          >
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={selecionados.has(turno.id)}
                onChange={() => alternar(turno.id)}
                className="mt-1 h-4 w-4 accent-brand-600"
              />
              <div>
                <p className="font-medium text-navy-900">{turno.funcaoNome}</p>
                <p className="text-xs text-stone-500">
                  entrada {turno.dataLabel}
                  {turno.horaSaidaLabel ? ` · saída ${turno.horaSaidaLabel}` : ""}
                </p>
              </div>
            </label>

            <div className="flex items-center gap-3 shrink-0 flex-wrap">
              {turno.valorTotal !== null && (
                <span className="text-sm font-medium text-stone-700">
                  R$ {turno.valorTotal.toFixed(2)}
                </span>
              )}
              <span
                className={`text-xs rounded-full border px-2 py-1 ${STATUS_CLASSE[turno.status]}`}
              >
                {STATUS_LABEL[turno.status]}
              </span>
              <Link
                href={`/turnos/${turno.id}/contrato/pdf`}
                target="_blank"
                className="text-xs text-brand-700 hover:underline"
              >
                Ver termo
              </Link>
              {turno.temRecibo && (
                <Link
                  href={`/turnos/${turno.id}/recibo/pdf`}
                  target="_blank"
                  className="text-xs text-brand-700 hover:underline"
                >
                  Ver recibo
                </Link>
              )}
              <Link
                href={`/turnos/${turno.id}`}
                className="text-xs text-stone-500 hover:underline"
              >
                Detalhes
              </Link>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
