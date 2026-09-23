"use client";

import { useState, useTransition } from "react";
import PagamentoRow from "./PagamentoRow";
import { marcarVariosPagosManualmente, agruparEMarcarPagos } from "./actions";
import type { StatusPagamento, TipoChavePix } from "@/generated/prisma/enums";

export type PagamentoItem = {
  turnoId: number;
  pessoaId: number;
  pessoaNome: string;
  valor: number;
  status: StatusPagamento;
  tentativas: number;
  erro: string | null;
  chavePixDestino: string;
  tipoChavePixDestino: TipoChavePix;
  quando: string;
  /// Timestamp bruto (turno.horaSaida ?? atualizadoEm) só pra ordenar por
  /// data dentro de cada grupo de pessoa — `quando` já vem formatado com o
  /// dia da semana por extenso, então não dá pra ordenar por ele direto.
  quandoOrdenacao: number;
  grupoPagamentoId: number | null;
  pagoAutomaticamente: boolean;
};

/** Lista de pagamentos com seleção em lote — quando `agruparPorPessoa` é
 * true (visão "Semanal"), agrupa em JS por pessoa antes de renderizar
 * (mesmo estilo de agregação usado em todo o projeto, ex.: dashboard
 * "Ontem"), mas mantém o turnoId de cada item pra não perder a
 * granularidade da seleção — diferente de pendentesAgrupadosPorPessoa
 * (src/lib/financeiro.ts), que só serve pros cards de resumo. */
export default function PagamentosSelecionaveis({
  pagamentos,
  agruparPorPessoa,
}: {
  pagamentos: PagamentoItem[];
  agruparPorPessoa: boolean;
}) {
  const [selecionados, setSelecionados] = useState<Set<number>>(new Set());
  const [erro, setErro] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [agrupando, startAgrupamento] = useTransition();

  function alternar(turnoId: number) {
    setSelecionados((atual) => {
      const novo = new Set(atual);
      if (novo.has(turnoId)) novo.delete(turnoId);
      else novo.add(turnoId);
      return novo;
    });
  }

  const selecionaveis = pagamentos.filter((p) => p.status !== "CONCLUIDO" && p.status !== "CANCELADO");
  const idsSelecionados = [...selecionados];
  const itensSelecionados = pagamentos.filter((p) => selecionados.has(p.turnoId));
  const totalSelecionado = itensSelecionados.reduce((soma, p) => soma + p.valor, 0);
  // Só faz sentido oferecer "Agrupar pagamentos" quando dá pra somar tudo
  // numa única transferência PIX pra uma mesma pessoa — com gente diferente
  // misturada na seleção, cada uma continua recebendo o próprio PIX, então
  // agrupar não se aplica (usa o botão "Pagar selecionados" de sempre).
  const pessoasSelecionadas = new Set(itensSelecionados.map((p) => p.pessoaId));
  const podeAgrupar = idsSelecionados.length > 1 && pessoasSelecionadas.size === 1;

  function selecionarTodos() {
    setSelecionados(new Set(selecionaveis.map((p) => p.turnoId)));
  }

  function limparSelecao() {
    setSelecionados(new Set());
  }

  function pagarSelecionados() {
    if (
      !confirm(
        `Confirmar que você já enviou R$ ${totalSelecionado.toFixed(2)} via PIX pra ${idsSelecionados.length} pagamento(s)?`
      )
    ) {
      return;
    }
    setErro(null);
    startTransition(async () => {
      const resultado = await marcarVariosPagosManualmente(idsSelecionados);
      if ("erro" in resultado) setErro(resultado.erro);
      else limparSelecao();
    });
  }

  function agruparSelecionados() {
    const nomePessoa = itensSelecionados[0]?.pessoaNome ?? "";
    if (
      !confirm(
        `Confirmar que você já enviou R$ ${totalSelecionado.toFixed(2)} via PIX (um único envio) pra ${nomePessoa}, referente a ${idsSelecionados.length} turnos?`
      )
    ) {
      return;
    }
    setErro(null);
    startAgrupamento(async () => {
      const resultado = await agruparEMarcarPagos(idsSelecionados);
      if ("erro" in resultado) {
        setErro(resultado.erro);
      } else {
        limparSelecao();
        window.open(`/pagamentos/grupo/${resultado.grupoId}/recibo/pdf`, "_blank");
      }
    });
  }

  const grupos = agruparPorPessoa
    ? agruparPorPessoaFn(pagamentos)
    : [{ pessoaId: 0, pessoaNome: "", itens: pagamentos }];

  return (
    <div className="flex flex-col gap-4">
      {selecionaveis.length > 0 && (
        <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
          <p className="text-sm text-stone-600">
            {idsSelecionados.length === 0
              ? "Selecione um ou mais pagamentos abaixo pra pagar de uma vez."
              : podeAgrupar
                ? `${idsSelecionados.length} turnos de ${itensSelecionados[0].pessoaNome} · total agrupado R$ ${totalSelecionado.toFixed(2)}`
                : `${idsSelecionados.length} selecionado(s) · R$ ${totalSelecionado.toFixed(2)}`}
          </p>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={selecionarTodos} className="text-xs text-brand-700 hover:underline">
              Selecionar todos ({selecionaveis.length})
            </button>
            {idsSelecionados.length > 0 && (
              <button type="button" onClick={limparSelecao} className="text-xs text-stone-500 hover:underline">
                Limpar seleção
              </button>
            )}
          </div>
          <div className="flex flex-wrap gap-2 ml-auto">
            {podeAgrupar && (
              <button
                type="button"
                disabled={agrupando}
                onClick={agruparSelecionados}
                className="rounded-lg bg-violet-600 hover:bg-violet-700 text-white text-sm font-medium px-4 py-2 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {agrupando
                  ? "Agrupando..."
                  : `🔗 Agrupar e marcar como pago — R$ ${totalSelecionado.toFixed(2)}`}
              </button>
            )}
            <button
              type="button"
              disabled={idsSelecionados.length === 0 || pending}
              onClick={pagarSelecionados}
              className="rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium px-4 py-2 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {pending
                ? "Confirmando..."
                : podeAgrupar
                  ? "Pagar sem agrupar"
                  : `Pagar selecionados (${idsSelecionados.length})`}
            </button>
          </div>
        </div>
      )}
      {erro && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{erro}</p>
      )}

      {agruparPorPessoa
        ? grupos.map((grupo) => (
            <div key={grupo.pessoaId} className="flex flex-col gap-2">
              <div className="flex items-center justify-between px-1">
                <h3 className="text-sm font-semibold text-navy-900">{grupo.pessoaNome}</h3>
                <span className="text-xs text-stone-500">
                  {grupo.itens.length} pagamento(s) · R${" "}
                  {grupo.itens.reduce((soma, p) => soma + p.valor, 0).toFixed(2)}
                </span>
              </div>
              <ul className="flex flex-col gap-2">
                {grupo.itens.map((p) => (
                  <PagamentoRow
                    key={p.turnoId}
                    pagamento={p}
                    selecionavel
                    selecionado={selecionados.has(p.turnoId)}
                    aoAlternarSelecao={() => alternar(p.turnoId)}
                  />
                ))}
              </ul>
            </div>
          ))
        : (
          <ul className="flex flex-col gap-2">
            {pagamentos.map((p) => (
              <PagamentoRow
                key={p.turnoId}
                pagamento={p}
                selecionavel
                selecionado={selecionados.has(p.turnoId)}
                aoAlternarSelecao={() => alternar(p.turnoId)}
              />
            ))}
          </ul>
        )}
    </div>
  );
}

function agruparPorPessoaFn(
  pagamentos: PagamentoItem[]
): { pessoaId: number; pessoaNome: string; itens: PagamentoItem[] }[] {
  const grupos = new Map<number, { pessoaId: number; pessoaNome: string; itens: PagamentoItem[] }>();
  for (const p of pagamentos) {
    const atual = grupos.get(p.pessoaId) ?? { pessoaId: p.pessoaId, pessoaNome: p.pessoaNome, itens: [] };
    atual.itens.push(p);
    grupos.set(p.pessoaId, atual);
  }
  // Dentro de cada pessoa, mais antigo primeiro — facilita conferir a
  // semana em ordem antes de selecionar tudo pra agrupar o pagamento.
  for (const grupo of grupos.values()) {
    grupo.itens.sort((a, b) => a.quandoOrdenacao - b.quandoOrdenacao);
  }
  return [...grupos.values()].sort((a, b) => a.pessoaNome.localeCompare(b.pessoaNome));
}
