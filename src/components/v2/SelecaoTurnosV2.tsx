"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import {
  marcarPagamentoPagoManualmente,
  tentarPagamentoNovamente,
  cancelarPagamentoTurno,
} from "@/app/pagamentos/actions";
import { alternarPagamentoAutomatico } from "@/app/turnos/actions";
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
  /// Motivo da última falha (ex.: "Saldo insuficiente"), vindo direto do
  /// que a Asaas respondeu — null quando nunca falhou ou não é pagamento
  /// automático. Mesmo campo Pagamento.erro já mostrado em
  /// src/app/pagamentos/PagamentoRow.tsx, só que também aqui, sem
  /// precisar ir até /pagamentos pra saber o que aconteceu.
  erroPagamento: string | null;
  /// Pagamento automático (Asaas) falhou — mostra o atalho de tentar de
  /// novo bem aqui, mesma action de PagamentoRow.tsx
  /// (tentarPagamentoNovamente). Diferente de podeMarcarComoPago (que
  /// também aparece pra PENDENTE): esse é só pra FALHOU.
  podeTentarNovamente: boolean;
  /// Não-nulo quando este turno foi pago junto de outros na mesma
  /// transferência PIX — ver GrupoPagamento no schema.
  grupoPagamentoId: number | null;
  /// Ninguém bateu a saída (fechamentoAutomatico) e ainda não foi resolvido
  /// de nenhuma forma — mostra o aviso amarelo bem aqui, igual ao de
  /// /v2/turnos/[id], pra não precisar entrar no turno pra descobrir.
  precisaResolverSaida: boolean;
  /// Elegível pra corrigir o horário de saída (ver corrigirSaidaTurno em
  /// src/app/turnos/actions.ts) — mostra o atalho direto pro formulário na
  /// página de detalhe, sem precisar procurar pelo link genérico
  /// "Detalhes".
  podeCorrigirSaida: boolean;
  /// true quando este turno é de uma pessoa CLT fazendo um extra pago
  /// (ver Turno.origemExtraDiarioClt no schema) — mostra um badge
  /// diferente pra não confundir com turno de freelancer de verdade.
  origemExtraDiarioClt: boolean;
  /// Dono desligou manualmente o pagamento automático deste turno (ver
  /// Turno.pagamentoAutomaticoDesativado) — enquanto ligado, o Pix nunca
  /// sai sozinho, mesmo com automação geral ligada.
  pagamentoAutomaticoDesativado: boolean;
  /// Pagamento ainda não foi processado/concluído/cancelado — só nesse
  /// estado dá pra mexer no interruptor ou cancelar (depois de
  /// PROCESSANDO/CONCLUIDO/CANCELADO não tem mais o que decidir).
  podeAlternarPagamentoAutomatico: boolean;
  /// Motivo registrado quando o dono cancelou esse pagamento manualmente
  /// (ver cancelarPagamentoTurno) — null nos outros casos.
  motivoCancelamento: string | null;
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

/// Twin v2 de src/app/freelancers/[id]/SelecaoTurnos.tsx — único diff real
/// são os dois links de "Detalhes"/"Corrigir saída", que aqui apontam pra
/// /v2/turnos/[id] em vez de /turnos/[id] (a "tela de turnos horrível" da
/// v1). Rotas de PDF (contrato/recibo) não são tela, ficam iguais nas duas
/// versões. Usado por src/app/v2/freelancers/[id]/page.tsx.
export default function SelecaoTurnosV2({ turnos }: { turnos: TurnoResumo[] }) {
  const [selecionados, setSelecionados] = useState<Set<number>>(new Set());
  const [marcandoIds, setMarcandoIds] = useState<Set<number>>(new Set());
  const [tentandoIds, setTentandoIds] = useState<Set<number>>(new Set());
  const [pagosLocal, setPagosLocal] = useState<Set<number>>(new Set());
  const [erroPorId, setErroPorId] = useState<Map<number, string>>(new Map());
  const [alternandoIds, setAlternandoIds] = useState<Set<number>>(new Set());
  const [cancelandoTurnoId, setCancelandoTurnoId] = useState<number | null>(null);
  const [, startTransition] = useTransition();

  function alternarAutomatico(turnoId: number, desativado: boolean) {
    setErroPorId((atual) => {
      const novo = new Map(atual);
      novo.delete(turnoId);
      return novo;
    });
    setAlternandoIds((atual) => new Set(atual).add(turnoId));
    startTransition(async () => {
      try {
        const resultado = await alternarPagamentoAutomatico(turnoId, desativado);
        if (resultado.erro) setErroPorId((atual) => new Map(atual).set(turnoId, resultado.erro!));
      } catch {
        setErroPorId((atual) => new Map(atual).set(turnoId, "Não foi possível mudar agora."));
      } finally {
        setAlternandoIds((atual) => {
          const novo = new Set(atual);
          novo.delete(turnoId);
          return novo;
        });
      }
    });
  }

  function tentarNovamente(turnoId: number) {
    setErroPorId((atual) => {
      const novo = new Map(atual);
      novo.delete(turnoId);
      return novo;
    });
    setTentandoIds((atual) => new Set(atual).add(turnoId));
    startTransition(async () => {
      try {
        await tentarPagamentoNovamente(turnoId);
      } catch {
        setErroPorId((atual) => new Map(atual).set(turnoId, "Não foi possível tentar de novo agora."));
      } finally {
        setTentandoIds((atual) => {
          const novo = new Set(atual);
          novo.delete(turnoId);
          return novo;
        });
      }
    });
  }

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
                {turno.erroPagamento && (
                  <p className="text-xs text-red-600 mt-0.5">⚠️ {turno.erroPagamento}</p>
                )}
                {turno.motivoCancelamento && (
                  <p className="text-xs text-stone-500 mt-0.5">🚫 Cancelado: {turno.motivoCancelamento}</p>
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
              {turno.origemExtraDiarioClt && (
                <span
                  className="text-xs rounded-full border px-2 py-1 bg-violet-50 text-violet-700 border-violet-200"
                  title="Extra pago pra uma pessoa CLT, não freelancer"
                >
                  👔 Extra de CLT
                </span>
              )}
              {turno.grupoPagamentoId !== null && (
                <span
                  className={`text-xs rounded-full border px-2 py-1 ${corGrupoPagamento(turno.grupoPagamentoId)}`}
                  title="Pago junto com outros turnos numa única transferência PIX"
                >
                  🔗 Pago em grupo
                </span>
              )}
              {turno.podeTentarNovamente && (
                <button
                  type="button"
                  onClick={() => tentarNovamente(turno.id)}
                  disabled={tentandoIds.has(turno.id)}
                  className="rounded-lg border border-brand-600 text-brand-700 hover:bg-brand-50 text-xs font-medium px-3 py-1.5 disabled:opacity-50 transition-colors"
                >
                  {tentandoIds.has(turno.id) ? "Tentando..." : "🔁 Tentar de novo"}
                </button>
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
              {turno.podeAlternarPagamentoAutomatico && (
                <label className="flex items-center gap-1.5 text-xs text-stone-600 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={turno.pagamentoAutomaticoDesativado}
                    disabled={alternandoIds.has(turno.id)}
                    onChange={() => alternarAutomatico(turno.id, !turno.pagamentoAutomaticoDesativado)}
                    className="h-3.5 w-3.5 accent-red-600"
                  />
                  🔒 Não pagar automático
                </label>
              )}
              {turno.podeAlternarPagamentoAutomatico && turno.pagamentoAutomaticoDesativado && (
                <button
                  type="button"
                  onClick={() => setCancelandoTurnoId(turno.id)}
                  className="text-xs text-red-600 hover:underline"
                >
                  Cancelar pagamento
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
                  href={`/v2/turnos/${turno.id}#corrigir-saida`}
                  className="text-xs text-amber-700 hover:underline font-medium"
                >
                  🔧 Corrigir horário de saída
                </Link>
              )}
              <Link
                href={`/v2/turnos/${turno.id}`}
                className="text-xs text-stone-500 hover:underline"
              >
                Detalhes
              </Link>
            </div>
          </li>
        ))}
      </ul>

      {cancelandoTurnoId !== null && (
        <CancelarPagamentoModal
          turnoId={cancelandoTurnoId}
          onClose={() => setCancelandoTurnoId(null)}
        />
      )}
    </div>
  );
}

/** Pede um motivo obrigatório antes de cancelar de vez o pagamento de um
 * turno (ver cancelarPagamentoTurno em src/app/pagamentos/actions.ts) —
 * mesmo espírito de exigir explicação por escrito já usado em
 * DesativarEmpresaModal (src/app/master/EmpresaMasterRow.tsx). Twin de
 * CancelarPagamentoModal em src/app/freelancers/[id]/SelecaoTurnos.tsx. */
function CancelarPagamentoModal({ turnoId, onClose }: { turnoId: number; onClose: () => void }) {
  const [motivo, setMotivo] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function confirmar() {
    setErro(null);
    startTransition(async () => {
      const resultado = await cancelarPagamentoTurno(turnoId, motivo);
      if (resultado.erro) {
        setErro(resultado.erro);
        return;
      }
      onClose();
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
      <button type="button" aria-label="Fechar" onClick={onClose} className="absolute inset-0 bg-black/50" />
      <div className="relative w-full max-w-sm bg-white rounded-2xl p-6 flex flex-col gap-3">
        <h2 className="font-bold text-navy-900 text-lg">Cancelar este pagamento?</h2>
        <p className="text-sm text-stone-600">
          O turno continua no histórico normalmente — só o pagamento fica marcado como cancelado, fora da
          fila de cobrança pra sempre. Não tem como desfazer depois.
        </p>
        <label className="text-xs text-stone-500 flex flex-col gap-1">
          Motivo (obrigatório)
          <textarea
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            autoFocus
            rows={3}
            placeholder="Ex.: combinado de pagar por fora, pessoa desistiu, etc."
            className="border border-stone-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
          />
        </label>
        {erro && <p className="text-sm text-red-600">{erro}</p>}
        <div className="flex gap-2 mt-1">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-lg border border-stone-300 text-sm py-2 hover:bg-stone-50"
          >
            Voltar
          </button>
          <button
            type="button"
            disabled={pending || motivo.trim().length < 5}
            onClick={confirmar}
            className="flex-1 rounded-lg bg-red-600 hover:bg-red-700 text-white text-sm font-semibold py-2 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {pending ? "Cancelando..." : "Cancelar pagamento"}
          </button>
        </div>
      </div>
    </div>
  );
}
