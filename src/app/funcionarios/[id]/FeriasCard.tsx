"use client";

import { useActionState, useState } from "react";
import { atualizarAdmissao, registrarFeriasGozadas } from "../actions";

type StatusFeriasLabel =
  | { fase: "AQUISITIVO"; texto: string }
  | { fase: "CONCESSIVO"; texto: string; urgente: boolean }
  | { fase: "VENCIDA"; texto: string };

export default function FeriasCard({
  pessoaId,
  dataAdmissaoValue,
  status,
  emAndamento,
}: {
  pessoaId: number;
  dataAdmissaoValue: string;
  status: StatusFeriasLabel | null;
  /// Não-null enquanto a pessoa está de fato de férias hoje (ver
  /// calcularFeriasEmAndamento, src/lib/ferias.ts) — mostra o aviso de
  /// quando ela deve voltar.
  emAndamento: { retornoLabel: string; diasRestantes: number } | null;
}) {
  const [admissaoState, admissaoAction, admissaoPending] = useActionState(atualizarAdmissao, undefined);
  const [feriasState, feriasAction, feriasPending] = useActionState(registrarFeriasGozadas, undefined);
  const [mostrarRegistrar, setMostrarRegistrar] = useState(false);

  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-stone-200 bg-white p-6 shadow-sm max-w-lg">
      <div>
        <h2 className="font-semibold text-navy-900">Admissão e férias</h2>
      </div>

      <form action={admissaoAction} className="flex flex-col gap-2">
        <input type="hidden" name="pessoaId" value={pessoaId} />
        <label className="flex flex-col gap-1 text-sm text-stone-700">
          Data de admissão
          <input
            name="dataAdmissao"
            type="date"
            defaultValue={dataAdmissaoValue}
            className="border border-stone-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500 max-w-[12rem]"
          />
        </label>
        {admissaoState?.erro && (
          <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
            {admissaoState.erro}
          </p>
        )}
        {admissaoState?.sucesso && (
          <p className="text-sm text-brand-700 bg-brand-50 border border-brand-200 rounded-lg px-3 py-2">
            Data salva.
          </p>
        )}
        <button
          type="submit"
          disabled={admissaoPending}
          className="rounded-lg border border-stone-300 text-sm px-4 py-2 hover:bg-stone-50 disabled:opacity-50 self-start"
        >
          {admissaoPending ? "Salvando..." : "Salvar data"}
        </button>
      </form>

      {emAndamento && (
        <div className="rounded-lg border border-brand-200 bg-brand-50 px-3 py-2 text-sm text-brand-800">
          🏖️ De férias — deve retornar em {emAndamento.retornoLabel} ({emAndamento.diasRestantes} dia(s)
          restantes).
        </div>
      )}

      {status && (
        <div
          className={`rounded-lg border px-3 py-2 text-sm ${
            status.fase === "VENCIDA"
              ? "border-red-200 bg-red-50 text-red-800"
              : status.fase === "CONCESSIVO" && status.urgente
                ? "border-amber-200 bg-amber-50 text-amber-800"
                : "border-stone-200 bg-stone-50 text-stone-700"
          }`}
        >
          {status.texto}
        </div>
      )}

      {status && (status.fase === "CONCESSIVO" || status.fase === "VENCIDA") && (
        <div className="flex flex-col gap-2">
          {!mostrarRegistrar ? (
            <button
              type="button"
              onClick={() => setMostrarRegistrar(true)}
              className="text-sm text-brand-700 hover:underline self-start"
            >
              🏖️ Registrar férias tiradas
            </button>
          ) : (
            <form action={feriasAction} className="flex flex-wrap items-end gap-2">
              <input type="hidden" name="pessoaId" value={pessoaId} />
              <label className="flex flex-col gap-1 text-sm text-stone-700">
                Data em que saiu de férias
                <input
                  name="dataFerias"
                  type="date"
                  defaultValue={new Date().toISOString().slice(0, 10)}
                  className="border border-stone-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </label>
              <label className="flex flex-col gap-1 text-sm text-stone-700">
                Quantos dias?
                <input
                  name="quantidadeDias"
                  type="number"
                  min={1}
                  max={30}
                  defaultValue={30}
                  required
                  className="border border-stone-300 rounded-lg px-3 py-2 w-24 focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </label>
              <button
                type="submit"
                disabled={feriasPending}
                className="rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium px-4 py-2.5 disabled:opacity-50 transition-colors"
              >
                {feriasPending ? "Registrando..." : "Confirmar"}
              </button>
            </form>
          )}
          {feriasState?.erro && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              {feriasState.erro}
            </p>
          )}
          {feriasState?.sucesso && (
            <p className="text-sm text-brand-700 bg-brand-50 border border-brand-200 rounded-lg px-3 py-2">
              Férias registradas — deve retornar em {feriasState.dataRetornoLabel}.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
