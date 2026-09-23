"use client";

import { useActionState, useState } from "react";
import { solicitarTrocaEmail } from "./actions";

/** Card separado de MeusDadosForm de propósito — trocar e-mail não é um
 * "salvar direto" como os outros campos (telefone, PIX, etc.), é pedir uma
 * confirmação por link (ver solicitarTrocaEmail em ./actions.ts), então
 * merece o próprio fluxo/estado em vez de compartilhar o form grande. */
export default function TrocarEmailForm({ emailAtual }: { emailAtual: string | null }) {
  const [state, formAction, pending] = useActionState(solicitarTrocaEmail, undefined);
  const [aberto, setAberto] = useState(false);

  return (
    <div className="flex flex-col gap-2 rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
      <h2 className="font-semibold text-navy-900 text-sm">E-mail</h2>
      <p className="text-sm text-stone-600">
        {emailAtual ?? <span className="text-stone-400">Nenhum e-mail cadastrado ainda.</span>}
      </p>
      {!emailAtual && (
        <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
          ⚠️ Sem e-mail (nem data de nascimento) cadastrado, seu perfil pode ficar bloqueado se você
          trabalhar em outra empresa pelo iFREE. Vale completar.
        </p>
      )}

      {!aberto && (
        <button
          type="button"
          onClick={() => setAberto(true)}
          className="text-sm text-brand-700 hover:underline self-start"
        >
          ✏️ {emailAtual ? "Trocar e-mail" : "Cadastrar e-mail"}
        </button>
      )}

      {aberto && !state?.sucesso && (
        <form action={formAction} className="flex flex-col gap-2 mt-1">
          <label className="flex flex-col gap-1 text-sm text-stone-700">
            Novo e-mail
            <input
              name="novoEmail"
              type="email"
              required
              autoFocus
              placeholder="seuemail@exemplo.com"
              className="border border-stone-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </label>

          {state?.erro && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              {state.erro}
            </p>
          )}

          <div className="flex gap-2">
            <button
              type="submit"
              disabled={pending}
              className="rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium px-4 py-2 disabled:opacity-50 transition-colors"
            >
              {pending ? "Enviando..." : "Enviar link de confirmação"}
            </button>
            <button
              type="button"
              onClick={() => setAberto(false)}
              className="rounded-lg border border-stone-300 text-sm px-4 py-2"
            >
              Cancelar
            </button>
          </div>
        </form>
      )}

      {state?.sucesso && (
        <p className="text-sm text-brand-700 bg-brand-50 border border-brand-200 rounded-lg px-3 py-2 mt-1">
          Enviamos um link de confirmação pro e-mail novo — clique nele pra concluir a troca. O e-mail atual
          continua valendo até você confirmar.
        </p>
      )}
    </div>
  );
}
