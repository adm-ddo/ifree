"use client";

import { useActionState } from "react";
import { atualizarExperiencia, marcarExperienciaEfetivada, marcarContinuarExperiencia } from "../actions";
import ConverterVinculoButton from "@/components/ConverterVinculoButton";

type StatusLabel = {
  fase: "EFETIVADO" | "EM_ANDAMENTO" | "ATENCAO" | "VENCIDO";
  etapa1Label: string;
  etapa2Label: string | null;
  contratoFimLabel: string;
  textoStatus: string;
  etapaAtual: 1 | 2;
  podeContinuarParaEtapa2: boolean;
};

export default function ExperienciaCard({
  pessoaId,
  temDataAdmissao,
  dias1Atual,
  dias2Atual,
  status,
  jaRescindido,
}: {
  pessoaId: number;
  temDataAdmissao: boolean;
  dias1Atual: number | null;
  dias2Atual: number | null;
  status: StatusLabel | null;
  jaRescindido: boolean;
}) {
  const [state, formAction, pending] = useActionState(atualizarExperiencia, undefined);

  const corStatus =
    status?.fase === "VENCIDO"
      ? "border-red-200 bg-red-50 text-red-800"
      : status?.fase === "ATENCAO"
        ? "border-amber-200 bg-amber-50 text-amber-800"
        : "border-stone-200 bg-stone-50 text-stone-700";

  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-stone-200 bg-white p-6 shadow-sm max-w-lg">
      <div>
        <h2 className="font-semibold text-navy-900">Contrato de experiência</h2>
        <p className="text-xs text-stone-500 mt-1">
          Duração de cada etapa em dias, a partir da data de admissão (ex.:
          30 + 60, ou 45 + 45). Máximo de 90 dias no total.
        </p>
      </div>

      {!temDataAdmissao ? (
        <p className="text-sm text-stone-500">
          Defina a data de admissão acima primeiro.
        </p>
      ) : (
        <>
          <form
            action={formAction}
            // Sem isso, o React 19 reseta o form nativamente após toda
            // submissão bem-sucedida, mesmo em campo controlado — ver
            // explicação completa em SalarioEscalaForm.tsx (mesmo bug,
            // corrigido lá primeiro).
            onReset={(e) => e.preventDefault()}
            className="flex flex-wrap items-end gap-3"
          >
            <input type="hidden" name="pessoaId" value={pessoaId} />
            <label className="flex flex-col gap-1 text-sm text-stone-700">
              1ª etapa (dias)
              <input
                name="experienciaDias1"
                type="number"
                min={1}
                defaultValue={dias1Atual ?? ""}
                placeholder="45"
                className="border border-stone-300 rounded-lg px-3 py-2 w-28 focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm text-stone-700">
              2ª etapa (dias, opcional)
              <input
                name="experienciaDias2"
                type="number"
                min={1}
                defaultValue={dias2Atual ?? ""}
                placeholder="45"
                className="border border-stone-300 rounded-lg px-3 py-2 w-28 focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </label>
            <button
              type="submit"
              disabled={pending}
              className="rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium px-4 py-2.5 disabled:opacity-50 transition-colors"
            >
              {pending ? "Salvando..." : "Salvar"}
            </button>
          </form>

          {state?.erro && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              {state.erro}
            </p>
          )}
          {state?.sucesso && (
            <p className="text-sm text-brand-700 bg-brand-50 border border-brand-200 rounded-lg px-3 py-2">
              Período salvo.
            </p>
          )}

          {status && (
            <div className="flex flex-col gap-2">
              <div className="text-xs text-stone-600 flex flex-col gap-0.5">
                <span className={status.etapaAtual === 1 ? "font-medium text-stone-800" : undefined}>
                  1ª etapa até {status.etapa1Label}
                  {status.etapaAtual === 1 && status.fase !== "EFETIVADO" && " ← decisão em aberto"}
                </span>
                {status.etapa2Label && (
                  <span className={status.etapaAtual === 2 ? "font-medium text-stone-800" : undefined}>
                    2ª etapa até {status.etapa2Label}
                    {status.etapaAtual === 2 && status.fase !== "EFETIVADO" && " ← decisão em aberto"}
                  </span>
                )}
                <span className="font-medium text-stone-800">
                  Fim do período de experiência: {status.contratoFimLabel}
                </span>
              </div>

              <div className={`rounded-lg border px-3 py-2 text-sm ${corStatus}`}>
                {status.textoStatus}
              </div>

              {status.fase !== "EFETIVADO" && !jaRescindido && (
                <div className="flex flex-col gap-2">
                  {status.podeContinuarParaEtapa2 && (
                    <ConverterVinculoButton
                      action={marcarContinuarExperiencia}
                      pessoaId={pessoaId}
                      label="➡️ Prorrogar pro 2º período"
                      confirmText="Confirmar que essa pessoa vai continuar pro 2º período do contrato de experiência? O aviso de vencimento passa a contar o prazo da 2ª etapa a partir de agora."
                    />
                  )}
                  <ConverterVinculoButton
                    action={marcarExperienciaEfetivada}
                    pessoaId={pessoaId}
                    label="✅ Marcar como efetivado"
                    confirmText="Confirmar que essa pessoa foi efetivada? Isso encerra o aviso de vencimento do contrato de experiência."
                  />
                  <p className="text-xs text-stone-500">
                    Não vai efetivar essa pessoa? Registre a rescisão no card
                    &ldquo;Rescisão&rdquo; logo abaixo.
                  </p>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
