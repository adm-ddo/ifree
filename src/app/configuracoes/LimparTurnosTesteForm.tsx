"use client";

import { useState, useTransition, useActionState } from "react";
import { contarTurnosAntesDe, limparTurnosAntesDe, type ContagemLimpezaTurnos } from "./actions";

/** "YYYY-MM-DDTHH:mm" no horário local do aparelho — valor inicial do
 * datetime-local, pra já vir preenchido com "agora". */
function agoraLocal(): string {
  const agora = new Date();
  agora.setMinutes(agora.getMinutes() - agora.getTimezoneOffset());
  return agora.toISOString().slice(0, 16);
}

export default function LimparTurnosTesteForm() {
  const [cutoff, setCutoff] = useState(agoraLocal());
  const [contagem, setContagem] = useState<ContagemLimpezaTurnos | null>(null);
  const [pendingContagem, startTransition] = useTransition();
  const [state, formAction, pendingExclusao] = useActionState(limparTurnosAntesDe, undefined);

  function mudarCutoff(valor: string) {
    setCutoff(valor);
    setContagem(null); // invalida a prévia — a data mudou, o número não vale mais
  }

  function verImpacto() {
    // new Date(cutoff) roda aqui no aparelho (fuso certo); só o resultado
    // já convertido em ISO absoluto sai pro servidor — evita o servidor
    // (que roda em UTC) reinterpretar "YYYY-MM-DDTHH:mm" com o fuso errado.
    const cutoffISO = new Date(cutoff).toISOString();
    startTransition(async () => {
      const res = await contarTurnosAntesDe(cutoffISO);
      setContagem(res);
    });
  }

  const totalRegistros =
    contagem && !("erro" in contagem) ? contagem.turnos + contagem.registrosPonto : 0;

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-red-200 bg-red-50/40 p-6 shadow-sm max-w-lg">
      <div>
        <h2 className="font-semibold text-red-900">Zona de risco — limpar turnos de teste</h2>
        <p className="text-xs text-stone-600 mt-1">
          Toda vez que uma empresa nova começa a usar o totem, é comum o
          pessoal se cadastrar e testar antes de valer — isso gera turnos e
          pagamentos que não são trabalho de verdade. Use isto pra apagar
          esse histórico antes de começar a operação oficial. Os
          <strong> cadastros de pessoas continuam intactos</strong> — só o
          histórico de jornada e pagamento é apagado.
        </p>
      </div>

      {!state?.sucesso && (
        <>
          <label className="flex flex-col gap-1 text-sm text-stone-700">
            Apagar tudo que aconteceu antes de:
            <input
              type="datetime-local"
              value={cutoff}
              onChange={(e) => mudarCutoff(e.target.value)}
              className="border border-stone-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-400"
            />
          </label>

          <button
            type="button"
            onClick={verImpacto}
            disabled={pendingContagem}
            className="rounded-lg border border-stone-300 bg-white text-sm font-medium py-2.5 px-4 hover:bg-stone-50 disabled:opacity-50 self-start"
          >
            {pendingContagem ? "Calculando..." : "Ver o que será apagado"}
          </button>
        </>
      )}

      {contagem && "erro" in contagem && (
        <p className="text-sm text-red-600">{contagem.erro}</p>
      )}

      {contagem && !("erro" in contagem) && !state?.sucesso && (
        <div className="text-sm bg-white border border-red-200 rounded-lg px-4 py-3 flex flex-col gap-2">
          {totalRegistros === 0 ? (
            <p className="text-stone-500">Nada pra apagar antes dessa data.</p>
          ) : (
            <>
              <p className="text-stone-800">
                Isso vai apagar <strong>{contagem.turnos} turno(s)</strong>
                {contagem.valorTotal > 0 && (
                  <> (R$ {contagem.valorTotal.toFixed(2)} em pagamentos)</>
                )}
                {contagem.registrosPonto > 0 && (
                  <>
                    {" "}
                    e <strong>{contagem.registrosPonto} registro(s) de ponto CLT</strong>
                  </>
                )}
                .
              </p>
              <form action={formAction}>
                <input type="hidden" name="cutoff" value={new Date(cutoff).toISOString()} />
                <button
                  type="submit"
                  disabled={pendingExclusao}
                  className="rounded-lg bg-red-600 hover:bg-red-700 text-white text-sm font-medium py-2.5 px-4 disabled:opacity-50 transition-colors"
                >
                  {pendingExclusao
                    ? "Apagando..."
                    : `Confirmar exclusão de ${totalRegistros} registro(s)`}
                </button>
              </form>
            </>
          )}
        </div>
      )}

      {state?.erro && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          {state.erro}
        </p>
      )}
      {state?.sucesso && (
        <p className="text-sm text-brand-700 bg-brand-50 border border-brand-200 rounded-lg px-3 py-2">
          Pronto — {state.apagados} turno(s) apagado(s), cadastros mantidos.
        </p>
      )}
    </div>
  );
}
