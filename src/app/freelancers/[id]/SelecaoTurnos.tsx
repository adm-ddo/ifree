"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { marcarPagamentoPagoManualmente } from "@/app/pagamentos/actions";
import { corGrupoPagamento } from "@/lib/grupo-pagamento";
import type { StatusTurno } from "@/generated/prisma/enums";

type TurnoResumo = {
  id: number;
  funcaoNome: string;
  dataLabel: string;
  horaSaidaLabel: string | null;
  valorTotal: number | null;
  status: StatusTurno;
  temRecibo: boolean;
  /// PIX ainda não confirmado (Pagamento em PENDENTE ou FALHOU) — mostra o
  /// atalho de marcar como pago bem aqui, junto do termo/recibo, pra não
  /// precisar ir até /pagamentos só pra isso.
  podeMarcarComoPago: boolean;
  /// Não-nulo quando este turno foi pago junto de outros na mesma
  /// transferência PIX — ver GrupoPagamento no schema.
  grupoPagamentoId: number | null;
  /// Ninguém bateu a saída (fechamentoAutomatico) e ainda não foi resolvido
  /// de nenhuma forma — mostra o aviso amarelo bem aqui, igual ao de
  /// /turnos/[id], pra não precisar entrar no turno pra descobrir.
  precisaResolverSaida: boolean;
  /// Elegível pra corrigir o horário de saída (ver corrigirSaidaTurno em
  /// src/app/turnos/actions.ts) — mostra o atalho direto pro formulário na
  /// página de detalhe, sem precisar procurar pelo link genérico
  /// "Detalhes".
  podeCorrigirSaida: boolean;
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
  const [marcandoIds, setMarcandoIds] = useState<Set<number>>(new Set());
  const [pagosLocal, setPagosLocal] = useState<Set<number>>(new Set());
  const [erroPorId, setErroPorId] = useState<Map<number, string>>(new Map());
  const [, startTransition] = useTransition();

  function marcarComoPago(turnoId: number) {
    setErroPorId((atual) => {
      const novo = new Map(atual);
      novo.delete(turnoId);
      return novo;
    });
    setMarcandoIds((atual) => new Set(atual).add(turnoId));
    startTransition(async () => {
      try {
        await marcarPagamentoPagoManualmente(turnoId);
        setPagosLocal((atual) => new Set(atual).add(turnoId));
      } catch {
        setErroPorId((atual) => new Map(atual).set(turnoId, "Não foi possível marcar como pago."));
      } finally {
        setMarcandoIds((atual) => {
          const novo = new Set(atual);
          novo.delete(turnoId);
          return novo;
        });
      }
    });
  }

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
                {turno.precisaResolverSaida && (
                  <p className="text-xs text-amber-700 mt-0.5">
                    ⏱️ Ninguém bateu a saída — o sistema encerrou sozinho
                  </p>
                )}
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
              {turno.grupoPagamentoId !== null && (
                <span
                  className={`text-xs rounded-full border px-2 py-1 ${corGrupoPagamento(turno.grupoPagamentoId)}`}
                  title="Pago junto com outros turnos numa única transferência PIX"
                >
                  🔗 Pago em grupo
                </span>
              )}
              {turno.podeMarcarComoPago && !pagosLocal.has(turno.id) && (
                <button
                  type="button"
                  onClick={() => marcarComoPago(turno.id)}
                  disabled={marcandoIds.has(turno.id)}
                  className="rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-xs font-medium px-3 py-1.5 disabled:opacity-50 transition-colors"
                >
                  {marcandoIds.has(turno.id) ? "Marcando..." : "💰 Marcar como pago"}
                </button>
              )}
              {erroPorId.has(turno.id) && (
                <span className="text-xs text-red-600">{erroPorId.get(turno.id)}</span>
              )}
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
              {turno.grupoPagamentoId !== null && (
                <Link
                  href={`/pagamentos/grupo/${turno.grupoPagamentoId}/recibo/pdf`}
                  target="_blank"
                  className="text-xs text-brand-700 hover:underline"
                >
                  Recibo agrupado
                </Link>
              )}
              {turno.podeCorrigirSaida && (
                <Link
                  href={`/turnos/${turno.id}#corrigir-saida`}
                  className="text-xs text-amber-700 hover:underline font-medium"
                >
                  🔧 Corrigir horário de saída
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
