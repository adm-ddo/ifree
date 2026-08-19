"use client";

import { useActionState } from "react";
import { atualizarMeusDados, trocarSenha } from "./actions";

export default function MeusDadosForm({
  nomeCompleto,
  email,
}: {
  nomeCompleto: string;
  email: string;
}) {
  const [dadosState, dadosAction, dadosPending] = useActionState(atualizarMeusDados, undefined);
  const [senhaState, senhaAction, senhaPending] = useActionState(trocarSenha, undefined);

  return (
    <div className="flex flex-col gap-6 max-w-lg">
      <form
        action={dadosAction}
        className="flex flex-col gap-3 rounded-2xl border border-stone-200 bg-white p-6 shadow-sm"
      >
        <h2 className="font-semibold text-navy-900">Dados pessoais</h2>

        <div className="flex flex-col gap-1">
          <label className="text-xs text-stone-500">Nome completo</label>
          <input
            name="nomeCompleto"
            required
            defaultValue={nomeCompleto}
            className="border border-stone-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs text-stone-500">E-mail</label>
          <input
            name="email"
            type="email"
            required
            defaultValue={email}
            className="border border-stone-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>

        {dadosState?.erro && (
          <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
            {dadosState.erro}
          </p>
        )}
        {dadosState?.sucesso && (
          <p className="text-sm text-brand-700 bg-brand-50 border border-brand-200 rounded-lg px-3 py-2">
            Dados salvos.
          </p>
        )}

        <button
          type="submit"
          disabled={dadosPending}
          className="rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium py-2.5 disabled:opacity-50 transition-colors"
        >
          {dadosPending ? "Salvando..." : "Salvar dados"}
        </button>
      </form>

      <form
        action={senhaAction}
        className="flex flex-col gap-3 rounded-2xl border border-stone-200 bg-white p-6 shadow-sm"
      >
        <h2 className="font-semibold text-navy-900">Trocar senha</h2>

        <div className="flex flex-col gap-1">
          <label className="text-xs text-stone-500">Senha atual</label>
          <input
            name="senhaAtual"
            type="password"
            required
            className="border border-stone-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs text-stone-500">Nova senha (mín. 8 caracteres)</label>
          <input
            name="novaSenha"
            type="password"
            required
            minLength={8}
            className="border border-stone-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs text-stone-500">Confirmar nova senha</label>
          <input
            name="confirmarSenha"
            type="password"
            required
            minLength={8}
            className="border border-stone-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>

        {senhaState?.erro && (
          <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
            {senhaState.erro}
          </p>
        )}
        {senhaState?.sucesso && (
          <p className="text-sm text-brand-700 bg-brand-50 border border-brand-200 rounded-lg px-3 py-2">
            Senha trocada.
          </p>
        )}

        <button
          type="submit"
          disabled={senhaPending}
          className="rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium py-2.5 disabled:opacity-50 transition-colors"
        >
          {senhaPending ? "Trocando..." : "Trocar senha"}
        </button>
      </form>
    </div>
  );
}
