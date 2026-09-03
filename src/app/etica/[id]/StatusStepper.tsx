"use client";

import { useState, useTransition } from "react";
import { avancarStatusDenuncia } from "../actions";
import { STATUS_DENUNCIA_ORDEM, LABEL_STATUS_DENUNCIA } from "@/lib/etica-constantes";
import type { StatusDenuncia } from "@/generated/prisma/enums";

/** Mostra as 7 etapas em ordem (destacando a atual) e deixa a empresa
 * escolher QUALQUER etapa como próximo estado — não só "avançar", porque
 * tratativa real às vezes precisa voltar (ex.: pedir mais informação de
 * novo depois de já ter avançado). Toda mudança fica na linha do tempo,
 * com observação opcional. */
export default function StatusStepper({
  denunciaId,
  statusAtual,
}: {
  denunciaId: number;
  statusAtual: StatusDenuncia;
}) {
  const [selecionado, setSelecionado] = useState<StatusDenuncia>(statusAtual);
  const [observacao, setObservacao] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  // Resincroniza durante a renderização se a etapa real mudar por outro
  // caminho (ex.: outra aba, ou a página se atualizar sozinha após salvar
  // a gravidade nesta mesma tela) — sem isso o stepper podia continuar
  // destacando uma etapa antiga.
  const [statusAnterior, setStatusAnterior] = useState(statusAtual);
  if (statusAtual !== statusAnterior) {
    setStatusAnterior(statusAtual);
    setSelecionado(statusAtual);
  }

  function confirmar() {
    if (selecionado === statusAtual) return;
    setErro(null);
    startTransition(async () => {
      const resultado = await avancarStatusDenuncia(denunciaId, selecionado, observacao);
      if (resultado?.erro) {
        setErro(resultado.erro);
        return;
      }
      setObservacao("");
    });
  }

  return (
    <div className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm flex flex-col gap-3">
      <h2 className="font-semibold text-navy-900 text-sm">Etapa</h2>

      <div className="flex flex-wrap gap-2">
        {STATUS_DENUNCIA_ORDEM.map((s, i) => {
          const indiceAtual = STATUS_DENUNCIA_ORDEM.indexOf(statusAtual);
          const concluida = i < indiceAtual;
          const atual = s === statusAtual;
          return (
            <button
              key={s}
              type="button"
              onClick={() => setSelecionado(s)}
              className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                selecionado === s
                  ? "bg-navy-900 border-navy-900 text-white"
                  : atual
                    ? "bg-brand-50 border-brand-300 text-brand-700"
                    : concluida
                      ? "bg-stone-100 border-stone-200 text-stone-500"
                      : "border-stone-300 text-stone-500 hover:bg-stone-50"
              }`}
            >
              {i + 1}. {LABEL_STATUS_DENUNCIA[s]}
            </button>
          );
        })}
      </div>

      {selecionado !== statusAtual && (
        <div className="flex flex-col gap-2 border-t border-stone-100 pt-3">
          <label className="text-xs text-stone-500">
            Observação (opcional) — fica registrada na linha do tempo
          </label>
          <textarea
            value={observacao}
            onChange={(e) => setObservacao(e.target.value)}
            rows={2}
            maxLength={2000}
            className="border border-stone-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
          {erro && <p className="text-xs text-red-600">{erro}</p>}
          <div className="flex gap-2">
            <button
              type="button"
              disabled={pending}
              onClick={confirmar}
              className="rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium px-4 py-2 disabled:opacity-50 transition-colors"
            >
              {pending ? "Salvando..." : `Mover para "${LABEL_STATUS_DENUNCIA[selecionado]}"`}
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={() => setSelecionado(statusAtual)}
              className="rounded-lg border border-stone-300 text-sm px-4 py-2 hover:bg-stone-50 disabled:opacity-50"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
