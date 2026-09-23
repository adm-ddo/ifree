"use client";

import { useState } from "react";
import Link from "next/link";
import type { StatusTurno } from "@/generated/prisma/enums";

type TurnoResumoGlobal = {
  id: number;
  pessoaNome: string;
  funcaoNome: string;
  entradaLabel: string;
  saidaLabel: string | null;
  valorTotal: number | null;
  status: StatusTurno;
  fechamentoAutomatico: boolean;
  podeCorrigirSaida: boolean;
  modoDiaria: boolean;
  frequenciaSemanal: boolean;
  turnoDobrado: boolean;
  tipoTurno: "DIA" | "NOITE" | null;
  temContrato: boolean;
  temRecibo: boolean;
  criadoManualmente: boolean;
  criadoManualmentePorEmail: string | null;
};

const STATUS_LABEL: Record<StatusTurno, string> = {
  ABERTO: "Aberto",
  CONCLUIDO: "Concluído",
  PAGO: "Pago",
  ERRO_PAGAMENTO: "Erro no pagamento",
};

const STATUS_CLASSE: Record<StatusTurno, string> = {
  ABERTO: "bg-sky-100 text-sky-700",
  CONCLUIDO: "bg-amber-100 text-amber-700",
  PAGO: "bg-brand-100 text-brand-700",
  ERRO_PAGAMENTO: "bg-red-100 text-red-700",
};

const STATUS_STRIPE: Record<StatusTurno, string> = {
  ABERTO: "border-l-sky-400",
  CONCLUIDO: "border-l-amber-400",
  PAGO: "border-l-brand-500",
  ERRO_PAGAMENTO: "border-l-red-400",
};

/** Mesma lógica/props de src/app/turnos/SelecaoTurnosGlobal.tsx (v1, não
 * tocado) — só o visual muda (cartões arredondados com risca de cor por
 * status, botões em pílula, no idioma visual da v2). Links de
 * detalhe/corrigir saída apontam pro /v2/turnos/[id] (já com versão v2
 * própria). */
export default function SelecaoTurnosGlobalV2({ turnos }: { turnos: TurnoResumoGlobal[] }) {
  const [selecionados, setSelecionados] = useState<Set<number>>(new Set());

  function alternar(id: number) {
    setSelecionados((atual) => {
      const novo = new Set(atual);
      if (novo.has(id)) novo.delete(id);
      else novo.add(id);
      return novo;
    });
  }

  function selecionarTodosVisiveis() {
    setSelecionados(new Set(turnos.map((t) => t.id)));
  }

  function limparSelecao() {
    setSelecionados(new Set());
  }

  const idsSelecionados = [...selecionados];
  const idsComContrato = turnos.filter((t) => selecionados.has(t.id) && t.temContrato).map((t) => t.id);
  const idsComRecibo = turnos.filter((t) => selecionados.has(t.id) && t.temRecibo).map((t) => t.id);

  function abrirPdf(caminho: string, ids: number[]) {
    window.open(`${caminho}?ids=${ids.join(",")}`, "_blank");
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-3 rounded-2xl bg-white border border-stone-200 p-3.5">
        <p className="text-xs font-semibold text-stone-600">
          {idsSelecionados.length === 0
            ? "Selecione um ou mais turnos abaixo pra imprimir em lote."
            : `${idsSelecionados.length} turno(s) selecionado(s).`}
        </p>
        <div className="flex flex-wrap gap-3">
          <button type="button" onClick={selecionarTodosVisiveis} className="text-xs font-bold text-brand-700">
            Selecionar todos ({turnos.length})
          </button>
          {idsSelecionados.length > 0 && (
            <button type="button" onClick={limparSelecao} className="text-xs font-bold text-stone-500">
              Limpar seleção
            </button>
          )}
        </div>
        <div className="flex flex-wrap gap-2 ml-auto">
          <button
            type="button"
            disabled={idsComContrato.length === 0}
            onClick={() => abrirPdf("/turnos/imprimir/contrato/pdf", idsComContrato)}
            className="rounded-full border border-stone-200 text-xs font-bold px-4 py-2 text-stone-700 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Termos selecionados ({idsComContrato.length})
          </button>
          <button
            type="button"
            disabled={idsComRecibo.length === 0}
            onClick={() => abrirPdf("/turnos/imprimir/recibo/pdf", idsComRecibo)}
            className="rounded-full border border-stone-200 text-xs font-bold px-4 py-2 text-stone-700 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Recibos selecionados ({idsComRecibo.length})
          </button>
        </div>
      </div>

      <ul className="flex flex-col gap-2">
        {turnos.map((turno) => (
          <li
            key={turno.id}
            className={`rounded-xl bg-white border-l-4 ${STATUS_STRIPE[turno.status]} p-3.5 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between`}
          >
            <label className="flex items-start gap-3 cursor-pointer min-w-0">
              <input
                type="checkbox"
                checked={selecionados.has(turno.id)}
                onChange={() => alternar(turno.id)}
                className="mt-1 h-4 w-4 accent-brand-500 shrink-0"
              />
              <div className="min-w-0">
                <p className="font-bold text-[13px] text-navy-900 flex items-center gap-1.5 flex-wrap">
                  {turno.pessoaNome}
                  {turno.modoDiaria && (
                    <span className="text-[9px] font-bold uppercase tracking-wide rounded-full bg-amber-100 text-amber-700 px-1.5 py-0.5 shrink-0">
                      Diária
                    </span>
                  )}
                  {turno.frequenciaSemanal && (
                    <span className="text-[9px] font-bold uppercase tracking-wide rounded-full bg-indigo-100 text-indigo-700 px-1.5 py-0.5 shrink-0">
                      Semanal
                    </span>
                  )}
                  {turno.turnoDobrado ? (
                    <span className="text-[9px] font-bold uppercase tracking-wide rounded-full bg-purple-100 text-purple-700 px-1.5 py-0.5 shrink-0">
                      🔁 Dobrado
                    </span>
                  ) : (
                    <span className="text-[9px] font-bold uppercase tracking-wide rounded-full bg-stone-100 text-stone-600 px-1.5 py-0.5 shrink-0">
                      {turno.tipoTurno === "DIA" ? "☀️ Dia" : "🌙 Noite"}
                    </span>
                  )}
                </p>
                <p className="text-[11px] text-stone-500 truncate">
                  {turno.funcaoNome} · entrada {turno.entradaLabel}
                  {turno.saidaLabel ? ` · saída ${turno.saidaLabel}` : ""}
                  {turno.fechamentoAutomatico ? " · encerrado automaticamente" : ""}
                  {turno.criadoManualmente ? ` · lançado manualmente por ${turno.criadoManualmentePorEmail}` : ""}
                </p>
              </div>
            </label>

            <div className="flex items-center gap-2.5 shrink-0">
              {turno.valorTotal !== null && (
                <span className="text-[13px] font-bold text-navy-900">R$ {turno.valorTotal.toFixed(2)}</span>
              )}
              <span className={`text-[10px] font-bold rounded-full px-2.5 py-1 ${STATUS_CLASSE[turno.status]}`}>
                {STATUS_LABEL[turno.status]}
              </span>
              {turno.podeCorrigirSaida && (
                <Link href={`/v2/turnos/${turno.id}#corrigir-saida`} className="text-[11px] font-bold text-amber-700">
                  🔧 Corrigir
                </Link>
              )}
              <Link href={`/v2/turnos/${turno.id}`} className="text-[11px] font-bold text-stone-500">
                Detalhes
              </Link>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
