"use client";

import { useActionState, useState } from "react";
import { criarDenunciaAnonimaPublica } from "./actions";
import { CATEGORIAS_DENUNCIA } from "@/lib/etica-constantes";

export default function DenunciaForm({ token }: { token: string }) {
  const [state, formAction, pending] = useActionState(
    criarDenunciaAnonimaPublica.bind(null, token),
    undefined
  );
  const [confirmouAnotacao, setConfirmouAnotacao] = useState(false);

  if (state?.protocolo && state?.senha) {
    return (
      <div className="rounded-2xl border-2 border-brand-300 bg-brand-50 p-6 shadow-sm flex flex-col gap-4">
        <h2 className="text-lg font-semibold text-navy-900">
          Denúncia registrada
        </h2>
        <p className="text-sm text-stone-700">
          Anote (ou tire um print da tela) o protocolo e a senha abaixo —{" "}
          <strong>não vão aparecer de novo</strong>. Use os dois pra
          acompanhar sua denúncia em &ldquo;Já denunciei, quero
          acompanhar&rdquo;.
        </p>

        <div className="flex flex-col gap-3">
          <div className="rounded-lg bg-white border border-stone-200 p-4">
            <p className="text-xs text-stone-500 uppercase tracking-wide">Protocolo</p>
            <p className="text-2xl font-mono font-semibold text-navy-900">{state.protocolo}</p>
          </div>
          <div className="rounded-lg bg-white border border-stone-200 p-4">
            <p className="text-xs text-stone-500 uppercase tracking-wide">Senha</p>
            <p className="text-2xl font-mono font-semibold text-navy-900">{state.senha}</p>
          </div>
        </div>

        <label className="flex items-start gap-2 text-sm text-stone-700">
          <input
            type="checkbox"
            checked={confirmouAnotacao}
            onChange={(e) => setConfirmouAnotacao(e.target.checked)}
            className="mt-0.5 h-4 w-4 accent-brand-600"
          />
          Já anotei ou tirei um print do protocolo e da senha.
        </label>

        {confirmouAnotacao && (
          <a
            href={`/denuncia/${token}`}
            className="rounded-lg bg-navy-900 hover:bg-navy-800 text-white text-sm font-medium px-4 py-2.5 text-center transition-colors"
          >
            Concluir
          </a>
        )}
      </div>
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-4 rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
      <div>
        <label className="text-sm font-medium text-navy-900 block mb-1">Tipo de denúncia</label>
        <select
          name="categoria"
          required
          defaultValue=""
          className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
        >
          <option value="" disabled>
            Selecione...
          </option>
          {CATEGORIAS_DENUNCIA.map((c) => (
            <option key={c.valor} value={c.valor}>
              {c.label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="text-sm font-medium text-navy-900 block mb-1">Descrição</label>
        <textarea
          name="descricao"
          required
          rows={8}
          maxLength={5000}
          placeholder="Descreva o que aconteceu, com o máximo de detalhes possível (datas, pessoas envolvidas, local)..."
          className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
      </div>

      {state?.erro && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          {state.erro}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="rounded-lg bg-navy-900 hover:bg-navy-800 text-white text-sm font-medium py-2.5 disabled:opacity-50 transition-colors"
      >
        {pending ? "Enviando..." : "Registrar denúncia anônima"}
      </button>
    </form>
  );
}
