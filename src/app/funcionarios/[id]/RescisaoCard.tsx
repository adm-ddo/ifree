"use client";

import { useActionState, useState } from "react";
import { registrarRescisao, cancelarRescisao } from "../actions";
import { calcularPrazoLimiteRescisao } from "@/lib/rescisao";

function formatarDataUTC(data: Date): string {
  return data.toLocaleDateString("pt-BR", { timeZone: "UTC" });
}

/** Mesma leitura de "YYYY-MM-DD" pro meio-dia UTC usada só aqui, no
 * preview client-side — evita depender de instanteBrasil (server-only por
 * convenção de import, embora a função em si não seja) só pra uma conta
 * que não precisa ir ao banco. Meio-dia (não meia-noite) pra nunca vazar
 * pro dia anterior/seguinte por causa de fuso do navegador do usuário. */
function paraDataUTC(valorInput: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(valorInput);
  if (!m) return null;
  return new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]), 12));
}

export default function RescisaoCard({
  pessoaId,
  pessoaNome,
  jaRescindido,
  dataRescisaoValue,
  registradaPorEmail,
  registradaEmLabel,
  emPeriodoExperiencia,
  contratoFimLabel,
}: {
  pessoaId: number;
  pessoaNome: string;
  jaRescindido: boolean;
  /// "YYYY-MM-DD" da rescisão já registrada, ou "" se nunca registrada —
  /// também usado como valor inicial do input quando ainda não registrada
  /// (sugestão = hoje, decidida na page).
  dataRescisaoValue: string;
  registradaPorEmail: string | null;
  registradaEmLabel: string | null;
  /// true quando a pessoa ainda não foi efetivada — muda o texto de apoio
  /// pra deixar claro que essa rescisão conta como "não efetivação".
  emPeriodoExperiencia: boolean;
  contratoFimLabel: string | null;
}) {
  const [state, formAction, pending] = useActionState(registrarRescisao, undefined);
  const [dataEscolhida, setDataEscolhida] = useState(dataRescisaoValue);
  const [cancelando, setCancelando] = useState(false);
  const [erroCancelar, setErroCancelar] = useState<string | null>(null);

  const dataParaPreview = paraDataUTC(dataEscolhida);
  const preview = dataParaPreview ? calcularPrazoLimiteRescisao(dataParaPreview) : null;

  if (jaRescindido) {
    return (
      <div className="flex flex-col gap-3 rounded-2xl border border-red-200 bg-red-50 p-6 shadow-sm max-w-lg">
        <div>
          <h2 className="font-semibold text-navy-900">Contrato rescindido</h2>
          <p className="text-xs text-stone-600 mt-1">
            Último dia de trabalho: <strong>{dataRescisaoValue.split("-").reverse().join("/")}</strong>
            {emPeriodoExperiencia && " — não efetivado (durante o período de experiência)"}.
          </p>
          {registradaPorEmail && registradaEmLabel && (
            <p className="text-xs text-stone-500 mt-1">
              Registrado por {registradaPorEmail} em {registradaEmLabel}.
            </p>
          )}
        </div>

        {preview && (
          <div className="rounded-lg border border-red-200 bg-white px-3 py-2 text-sm text-red-800">
            <strong>Prazo limite pra assinatura/pagamento da rescisão: {formatarDataUTC(preview.prazoLimite)}</strong>
            {preview.antecipado && (
              <span className="block text-xs text-red-700 mt-0.5">
                Antecipado — os 10 dias corridos {preview.motivoAntecipacao} ({formatarDataUTC(preview.prazoBrutoDezDias)}).
              </span>
            )}
          </div>
        )}

        <button
          type="button"
          onClick={() => {
            if (!confirm(`Cancelar o registro de rescisão de ${pessoaNome}? O vínculo volta a ficar ativo.`)) return;
            setErroCancelar(null);
            setCancelando(true);
            cancelarRescisao(pessoaId)
              .then((r) => {
                if (r?.erro) setErroCancelar(r.erro);
              })
              .finally(() => setCancelando(false));
          }}
          disabled={cancelando}
          className="text-xs text-stone-500 hover:underline self-start disabled:opacity-50"
        >
          {cancelando ? "Cancelando..." : "Cancelar rescisão (foi engano)"}
        </button>
        {erroCancelar && <p className="text-xs text-red-600">{erroCancelar}</p>}
      </div>
    );
  }

  return (
    <form
      action={formAction}
      className="flex flex-col gap-3 rounded-2xl border border-stone-200 bg-white p-6 shadow-sm max-w-lg"
    >
      <input type="hidden" name="pessoaId" value={pessoaId} />
      <div>
        <h2 className="font-semibold text-navy-900">Rescisão</h2>
        <p className="text-xs text-stone-500 mt-1">
          {emPeriodoExperiencia
            ? `Pra não efetivar essa pessoa (ela não passou no período de experiência${contratoFimLabel ? `, que vai até ${contratoFimLabel}` : ""}), registre aqui o último dia de trabalho — pode ser antes do fim previsto (antecipar) ou na própria data.`
            : "Registre o último dia de trabalho pra calcular o prazo legal de pagamento/assinatura."}
        </p>
      </div>

      <label className="flex flex-col gap-1 text-sm text-stone-700 max-w-[12rem]">
        Data da rescisão
        <input
          type="date"
          name="dataRescisao"
          value={dataEscolhida}
          onChange={(e) => setDataEscolhida(e.target.value)}
          required
          className="border border-stone-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
      </label>

      {preview && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
          <strong>Prazo limite pra assinatura/pagamento: {formatarDataUTC(preview.prazoLimite)}</strong>
          {preview.antecipado && (
            <span className="block text-xs text-amber-700 mt-0.5">
              Antecipado — 10 dias corridos {preview.motivoAntecipacao} ({formatarDataUTC(preview.prazoBrutoDezDias)}).
            </span>
          )}
        </div>
      )}

      {state?.erro && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          {state.erro}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        onClick={(e) => {
          if (
            !confirm(
              `Confirmar a rescisão de ${pessoaNome} em ${dataEscolhida.split("-").reverse().join("/")}? Ela deixa de conseguir bater ponto nesta empresa.`
            )
          ) {
            e.preventDefault();
          }
        }}
        className="rounded-lg bg-red-600 hover:bg-red-700 text-white text-sm font-medium py-2.5 disabled:opacity-50 transition-colors self-start px-4"
      >
        {pending ? "Registrando..." : "Registrar rescisão"}
      </button>
    </form>
  );
}
